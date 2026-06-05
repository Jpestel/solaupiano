import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendConcertValidationReminder, sendConcertCancelled } from '@/lib/email'
import { parseRequired, confirmDeadline } from '@/lib/concert-status'

export const dynamic = 'force-dynamic'

// Cron quotidien : rappelle les musiciens obligatoires non confirmés à l'approche
// de la date limite, et annule les concerts dont la confirmation n'est pas complète
// passé ce délai.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
  const now = new Date()
  const REMIND_WINDOW_DAYS = 3 // rappel envoyé dans les 3 jours avant la deadline

  const concerts = await prisma.concert.findMany({
    where: { status: 'PENDING', group: { archivedAt: null } },
    include: {
      group: {
        select: {
          name: true,
          members: { include: { user: { select: { id: true, email: true, name: true } } } },
        },
      },
      attendances: { select: { userId: true, status: true } },
    },
  })

  let reminded = 0, cancelled = 0, confirmed = 0

  for (const c of concerts) {
    const required = parseRequired(c.requiredUserIds)
    if (required.length === 0) {
      await prisma.concert.update({ where: { id: c.id }, data: { status: 'CONFIRMED' } })
      confirmed++
      continue
    }

    const statusByUser = new Map(c.attendances.map((a) => [a.userId, a.status]))
    const presentRequired = required.filter((uid) => statusByUser.get(uid) === 'PRESENT')

    // Tous confirmés → CONFIRMED
    if (presentRequired.length >= required.length) {
      await prisma.concert.update({ where: { id: c.id }, data: { status: 'CONFIRMED' } })
      confirmed++
      continue
    }

    const deadline = confirmDeadline(c.date, c.confirmDaysBefore)
    const allMembers = c.group.members.map((m) => ({ email: m.user.email, name: m.user.name, userId: m.user.id }))

    // Délai dépassé → annulation + email à tous
    if (now > deadline) {
      await prisma.concert.update({ where: { id: c.id }, data: { status: 'CANCELLED', cancelledAt: now } })
      try {
        await sendConcertCancelled(allMembers, c.group.name, { name: c.name, date: c.date, location: c.location }, baseUrl)
      } catch (e) { console.error('concert cancelled mail', e) }
      cancelled++
      continue
    }

    // Approche de la deadline → rappel aux obligatoires non confirmés (une fois)
    const remindFrom = new Date(deadline); remindFrom.setDate(remindFrom.getDate() - REMIND_WINDOW_DAYS)
    if (now >= remindFrom && !c.validationReminderSentAt) {
      const toRemind = allMembers.filter((m) => required.includes(m.userId) && statusByUser.get(m.userId) !== 'PRESENT')
      if (toRemind.length > 0) {
        const deadlineStr = deadline.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        try {
          await sendConcertValidationReminder(toRemind, c.group.name, c.groupId, { id: c.id, name: c.name, date: c.date, location: c.location }, deadlineStr, baseUrl)
        } catch (e) { console.error('concert validation reminder', e) }
        await prisma.concert.update({ where: { id: c.id }, data: { validationReminderSentAt: now } })
        reminded += toRemind.length
      }
    }
  }

  return NextResponse.json({ ok: true, reminded, cancelled, confirmed, considered: concerts.length })
}

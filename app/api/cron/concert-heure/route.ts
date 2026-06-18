import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendConcertTimeReminder } from '@/lib/email'
import { getEmailSchedule, isScheduledHour } from '@/lib/email-schedules'

export const dynamic = 'force-dynamic'

// Cron horaire : relance le(s) chef(s) d'un groupe quand un concert approche
// sans heure de début renseignée. Première relance dès que la date est à <= N
// jours (défaut 10), puis tous les `repeatDays` jours (défaut 2) tant que
// l'heure n'est pas saisie et que la date n'est pas passée.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
  const force = req.nextUrl.searchParams.get('force') === 'true'
  const now = new Date()

  // Planification configurable (admin) : jours, heure, on/off, intervalle de relance.
  const sched = await getEmailSchedule('concert_time_reminder')
  if (!force && sched && !sched.enabled) return NextResponse.json({ ok: true, skipped: 'disabled' })
  if (!force && sched && !isScheduledHour(now, sched)) return NextResponse.json({ ok: true, skipped: 'not-the-hour' })

  const dayMs = 24 * 60 * 60 * 1000
  const leadDays = sched?.days ?? 10
  const repeatDays = sched?.repeatDays ?? 2
  const leadEnd = new Date(now.getTime() + leadDays * dayMs)

  // Concerts à venir, non annulés, sans heure de début, dans la fenêtre de relance.
  const concerts = await prisma.concert.findMany({
    where: {
      startTime: null,
      status: { not: 'CANCELLED' },
      group: { archivedAt: null },
      date: { gte: now, lte: leadEnd },
    },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          members: {
            where: { groupRole: 'CHEF' },
            include: { user: { select: { email: true, name: true, emailVerified: true, concertTimeReminderOptOut: true } } },
          },
        },
      },
    },
  })

  let reminded = 0
  let concertsTouched = 0
  let skipped = 0

  for (const c of concerts) {
    // Cadence : pas de relance si la dernière date de moins de `repeatDays` jours.
    if (!force && c.timeReminderSentAt && now.getTime() - new Date(c.timeReminderSentAt).getTime() < repeatDays * dayMs) {
      skipped++
      continue
    }

    const chiefs = c.group.members
      .map((m) => m.user)
      .filter((u) => u.emailVerified && !u.concertTimeReminderOptOut)
      .map((u) => ({ email: u.email, name: u.name }))

    if (chiefs.length === 0) { skipped++; continue }

    try {
      await sendConcertTimeReminder(chiefs, c.group.name, c.group.id, { id: c.id, name: c.name, date: c.date, location: c.location }, baseUrl)
      if (!force) {
        await prisma.concert.update({ where: { id: c.id }, data: { timeReminderSentAt: now } })
      }
      reminded += chiefs.length
      concertsTouched++
    } catch (e) {
      console.error('concert time reminder', c.id, e)
      skipped++
    }
  }

  return NextResponse.json({ ok: true, reminded, concerts: concertsTouched, skipped, considered: concerts.length })
}

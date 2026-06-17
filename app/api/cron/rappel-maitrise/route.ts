import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMasteryReminderEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

// Relance « dernière mise à jour du niveau de maîtrise » la veille d'une répétition,
// aux membres conviés dont tous les morceaux ne sont pas à 100 %.
// Planifié quotidiennement (le soir) ; cible les répétitions de « demain ».
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
  const force = req.nextUrl.searchParams.get('force') === 'true'

  const now = new Date()
  // Répétitions de « demain » : entre +6h et +30h (veille au soir).
  const targetStart = new Date(now.getTime() + 6 * 60 * 60 * 1000)
  const targetEnd = new Date(now.getTime() + 30 * 60 * 60 * 1000)

  const rehearsals = await prisma.rehearsal.findMany({
    where: {
      group: { archivedAt: null },
      date: force ? { gte: now } : { gte: targetStart, lt: targetEnd },
      songs: { some: {} },
    },
    include: {
      group: { select: { id: true, name: true } },
      songs: { select: { songId: true } },
      attendances: {
        include: {
          user: { select: { id: true, email: true, name: true, rehearsalReminderOptOut: true, emailVerified: true } },
        },
      },
    },
  })

  let sent = 0
  let skipped = 0

  for (const rehearsal of rehearsals) {
    const songIds = rehearsal.songs.map((s) => s.songId)
    if (songIds.length === 0) continue

    const userIds = rehearsal.attendances.map((a) => a.user.id)
    const progress = await prisma.userSongProgress.findMany({
      where: { userId: { in: userIds }, songId: { in: songIds } },
      select: { userId: true, songId: true, percent: true },
    })
    // userId → nb de morceaux maîtrisés (100 %) parmi ceux de la répétition
    const masteredCount = new Map<number, number>()
    for (const p of progress) {
      if (p.percent >= 100) masteredCount.set(p.userId, (masteredCount.get(p.userId) ?? 0) + 1)
    }

    const already = await prisma.masteryReminderLog.findMany({
      where: { rehearsalId: rehearsal.id },
      select: { userId: true },
    })
    const alreadySet = new Set(already.map((r) => r.userId))

    for (const att of rehearsal.attendances) {
      const u = att.user
      if (u.rehearsalReminderOptOut) { skipped++; continue }
      if (!u.emailVerified) { skipped++; continue }
      if (!force && alreadySet.has(u.id)) { skipped++; continue }

      const remaining = songIds.length - (masteredCount.get(u.id) ?? 0)
      if (remaining <= 0) { skipped++; continue } // tout est à 100 % → pas de relance

      try {
        await sendMasteryReminderEmail(
          { email: u.email, name: u.name },
          rehearsal.group.name,
          rehearsal.group.id,
          { id: rehearsal.id, date: rehearsal.date, startTime: rehearsal.startTime, endTime: rehearsal.endTime, location: rehearsal.location },
          remaining,
          baseUrl,
        )
        if (!force) {
          await prisma.masteryReminderLog.upsert({
            where: { rehearsalId_userId: { rehearsalId: rehearsal.id, userId: u.id } },
            update: { sentAt: new Date() },
            create: { rehearsalId: rehearsal.id, userId: u.id },
          })
        }
        sent++
      } catch (e) {
        console.error('mastery reminder', u.email, e)
        skipped++
      }
    }
  }

  return NextResponse.json({ ok: true, sent, skipped })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendRehearsalAutoReminderEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Protect with CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
  const force = req.nextUrl.searchParams.get('force') === 'true'

  // Target: rehearsals happening in exactly 5 days (window: today+4d23h to today+5d23h)
  const now = new Date()
  const targetStart = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000)
  const targetEnd = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000)

  // In force mode, fetch all future rehearsals (for testing)
  const rehearsals = await prisma.rehearsal.findMany({
    where: {
      date: force
        ? { gte: now }
        : { gte: targetStart, lt: targetEnd },
    },
    include: {
      group: { select: { id: true, name: true } },
      attendances: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              rehearsalReminderOptOut: true,
              emailVerified: true,
            },
          },
        },
      },
      autoReminders: { select: { userId: true } },
    },
  })

  let sent = 0
  let skipped = 0

  for (const rehearsal of rehearsals) {
    // Users already notified for this rehearsal
    const alreadyNotified = new Set(rehearsal.autoReminders.map((r) => r.userId))

    for (const attendance of rehearsal.attendances) {
      const user = attendance.user

      // Skip if opted out, email not verified, or already sent
      if (user.rehearsalReminderOptOut) { skipped++; continue }
      if (!user.emailVerified) { skipped++; continue }
      if (!force && alreadyNotified.has(user.id)) { skipped++; continue }

      try {
        await sendRehearsalAutoReminderEmail(
          { email: user.email, name: user.name },
          rehearsal.group.name,
          rehearsal.group.id,
          {
            id: rehearsal.id,
            date: rehearsal.date,
            startTime: rehearsal.startTime,
            endTime: rehearsal.endTime,
            location: rehearsal.location,
            notes: rehearsal.notes,
          },
          baseUrl
        )

        // Record that we sent this reminder (skip in force mode to avoid blocking re-runs)
        if (!force) {
          await prisma.rehearsalAutoReminder.upsert({
            where: { rehearsalId_userId: { rehearsalId: rehearsal.id, userId: user.id } },
            update: { sentAt: new Date() },
            create: { rehearsalId: rehearsal.id, userId: user.id },
          })
        }

        sent++
      } catch {
        // Don't let one failure block others
        skipped++
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    rehearsalsChecked: rehearsals.length,
  })
}

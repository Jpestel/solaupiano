import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEvaluationReminder, sendConcertEvaluationReminder } from '@/lib/email'

export const dynamic = 'force-dynamic'

function rehearsalEnd(date: Date, startTime: string, endTime?: string | null): Date {
  const end = new Date(date)
  const t = (endTime || startTime || '23:59').split(':')
  end.setHours(Number(t[0]) || 23, Number(t[1]) || 59, 0, 0)
  return end
}

// Le lendemain d'une répétition : relance les musiciens présents qui n'ont pas évalué.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
  const force = req.nextUrl.searchParams.get('force') === 'true'

  const now = new Date()
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0)
  const windowStart = new Date(startToday.getTime() - (force ? 60 : 3) * 24 * 60 * 60 * 1000)

  // Répétitions récentes (on filtre la fin en JS car endTime est une chaîne)
  const rehearsals = await prisma.rehearsal.findMany({
    where: { date: { gte: windowStart, lt: new Date(now.getTime() + 24 * 60 * 60 * 1000) } },
    include: {
      group: { select: { id: true, name: true, plan: true } },
      attendances: { where: { status: 'PRESENT' }, include: { user: { select: { id: true, email: true, name: true, evaluationReminderOptOut: true, emailVerified: true } } } },
      evaluations: { select: { evaluatorId: true } },
    },
  })

  // Map des plans → module activé ?
  const plans = await prisma.plan.findMany({ select: { key: true, hasEvaluations: true } })
  const evalOn = new Map(plans.map((p) => [p.key, p.hasEvaluations]))

  let sent = 0, skipped = 0, rehearsalsConsidered = 0

  for (const r of rehearsals) {
    const end = rehearsalEnd(r.date, r.startTime, r.endTime)
    // Terminée ET sur un jour précédent (le « lendemain » au plus tôt)
    if (!force) {
      if (now < end) { continue }
      if (end >= startToday) { continue } // terminée aujourd'hui → on attend demain
    }
    // Module d'auto-évaluation actif pour ce groupe ?
    if ((evalOn.get(r.group.plan) ?? true) === false) { continue }

    rehearsalsConsidered++
    const evaluatedBy = new Set(r.evaluations.map((e) => e.evaluatorId))

    for (const att of r.attendances) {
      const user = att.user
      if (evaluatedBy.has(user.id)) { skipped++; continue }        // a déjà évalué
      if (user.evaluationReminderOptOut) { skipped++; continue }   // désabonné de ces rappels
      if (!user.emailVerified) { skipped++; continue }

      if (!force) {
        const already = await prisma.evaluationReminderLog.findUnique({
          where: { rehearsalId_userId: { rehearsalId: r.id, userId: user.id } },
        })
        if (already) { skipped++; continue }
      }

      try {
        await sendEvaluationReminder(user.email, user.name, r.group.name, r.group.id, r.id, user.id,
          { date: r.date, startTime: r.startTime, endTime: r.endTime, location: r.location }, baseUrl)
        if (!force) {
          await prisma.evaluationReminderLog.upsert({
            where: { rehearsalId_userId: { rehearsalId: r.id, userId: user.id } },
            update: { sentAt: new Date() },
            create: { rehearsalId: r.id, userId: user.id },
          })
        }
        sent++
      } catch {
        skipped++
      }
    }
  }

  // ── Concerts (mêmes règles : la veille, présents non évalués) ──────────────
  const concerts = await prisma.concert.findMany({
    where: { date: { gte: windowStart, lt: new Date(now.getTime() + 24 * 60 * 60 * 1000) } },
    include: {
      group: { select: { id: true, name: true, plan: true } },
      attendances: { where: { status: 'PRESENT' }, include: { user: { select: { id: true, email: true, name: true, evaluationReminderOptOut: true, emailVerified: true } } } },
      evaluations: { select: { evaluatorId: true } },
    },
  })

  let concertsConsidered = 0
  for (const c of concerts) {
    const end = new Date(c.date); end.setHours(23, 59, 59, 999)
    if (!force) {
      if (now <= end) { continue }      // pas encore passé
      if (end >= startToday) { continue } // terminé aujourd'hui → on attend demain
    }
    if ((evalOn.get(c.group.plan) ?? true) === false) { continue }

    concertsConsidered++
    const evaluatedBy = new Set(c.evaluations.map((e) => e.evaluatorId))

    for (const att of c.attendances) {
      const user = att.user
      if (evaluatedBy.has(user.id)) { skipped++; continue }
      if (user.evaluationReminderOptOut) { skipped++; continue }
      if (!user.emailVerified) { skipped++; continue }
      if (!force) {
        const already = await prisma.concertEvaluationReminderLog.findUnique({
          where: { concertId_userId: { concertId: c.id, userId: user.id } },
        })
        if (already) { skipped++; continue }
      }
      try {
        await sendConcertEvaluationReminder(user.email, user.name, c.group.name, c.group.id, c.id, user.id,
          { name: c.name, date: c.date, location: c.location }, baseUrl)
        if (!force) {
          await prisma.concertEvaluationReminderLog.upsert({
            where: { concertId_userId: { concertId: c.id, userId: user.id } },
            update: { sentAt: new Date() },
            create: { concertId: c.id, userId: user.id },
          })
        }
        sent++
      } catch { skipped++ }
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, rehearsalsConsidered, concertsConsidered, fetched: rehearsals.length + concerts.length })
}

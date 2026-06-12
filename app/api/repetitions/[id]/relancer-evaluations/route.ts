import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEvaluationReminder } from '@/lib/email'

export const dynamic = 'force-dynamic'

function rehearsalEnd(date: Date, startTime: string, endTime?: string | null): Date {
  const end = new Date(date)
  const t = (endTime || startTime || '23:59').split(':')
  end.setHours(Number(t[0]) || 23, Number(t[1]) || 59, 0, 0)
  return end
}

// POST — relance manuelle (chef/admin) : rappelle aux membres présents qui n'ont pas
// encore évalué cette répétition de le faire.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const rehearsalId = Number(params.id)
  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const rehearsal = await prisma.rehearsal.findUnique({
    where: { id: rehearsalId },
    include: {
      group: { select: { id: true, name: true, plan: true } },
      attendances: {
        where: { status: 'PRESENT' },
        include: { user: { select: { id: true, name: true, email: true, evaluationReminderOptOut: true, emailVerified: true } } },
      },
      evaluations: { select: { evaluatorId: true } },
    },
  })
  if (!rehearsal) return NextResponse.json({ error: 'Répétition introuvable.' }, { status: 404 })

  // Chef ou admin
  if (!isAdmin) {
    const membership = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId: rehearsal.groupId } } })
    if (!membership || membership.groupRole !== 'CHEF') {
      return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
    }
  }

  // Module d'évaluation actif ?
  const plan = await prisma.plan.findUnique({ where: { key: rehearsal.group.plan }, select: { hasEvaluations: true } })
  if ((plan?.hasEvaluations ?? true) === false) {
    return NextResponse.json({ error: "L'auto-évaluation n'est pas incluse dans l'offre de ce groupe." }, { status: 403 })
  }

  // Répétition terminée ?
  if (new Date() < rehearsalEnd(rehearsal.date, rehearsal.startTime, rehearsal.endTime)) {
    return NextResponse.json({ error: "La répétition n'est pas encore terminée." }, { status: 400 })
  }

  const evaluatedBy = new Set(rehearsal.evaluations.map((e) => e.evaluatorId))
  const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'

  let sent = 0
  let alreadyEvaluated = 0
  let optedOut = 0
  let noEmail = 0

  for (const att of rehearsal.attendances) {
    const u = att.user
    if (evaluatedBy.has(u.id)) { alreadyEvaluated++; continue }
    if (u.evaluationReminderOptOut) { optedOut++; continue }
    if (!u.email || !u.emailVerified) { noEmail++; continue }
    try {
      await sendEvaluationReminder(u.email, u.name, rehearsal.group.name, rehearsal.group.id, rehearsal.id, u.id,
        { date: rehearsal.date, startTime: rehearsal.startTime, endTime: rehearsal.endTime, location: rehearsal.location }, baseUrl)
      await prisma.evaluationReminderLog.upsert({
        where: { rehearsalId_userId: { rehearsalId, userId: u.id } },
        update: { sentAt: new Date() },
        create: { rehearsalId, userId: u.id },
      })
      sent++
    } catch {
      // on continue
    }
  }

  return NextResponse.json({ ok: true, sent, alreadyEvaluated, optedOut, noEmail })
}

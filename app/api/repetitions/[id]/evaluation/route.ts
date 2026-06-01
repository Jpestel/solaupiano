import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Calcule l'horodatage de fin de répétition (date du jour + heure de fin, ou de début à défaut)
function rehearsalEnd(date: Date, startTime: string, endTime?: string | null): Date {
  const end = new Date(date)
  const t = (endTime || startTime || '23:59').split(':')
  end.setHours(Number(t[0]) || 23, Number(t[1]) || 59, 0, 0)
  return end
}

const clampRating = (n: any) => Math.max(1, Math.min(5, Math.round(Number(n) || 0)))

async function loadContext(rehearsalId: number, userId: number, isAdmin: boolean) {
  const rehearsal = await prisma.rehearsal.findUnique({
    where: { id: rehearsalId },
    include: { attendances: { include: { user: { select: { id: true, name: true } } } } },
  })
  if (!rehearsal) return { error: 'Introuvable.' as string, status: 404 as number }

  const membership = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId: rehearsal.groupId } } })
  if (!isAdmin && !membership) return { error: 'Accès refusé.', status: 403 }

  const plan = await prisma.plan.findUnique({ where: { key: (await prisma.group.findUnique({ where: { id: rehearsal.groupId }, select: { plan: true } }))!.plan }, select: { hasEvaluations: true } })
  const moduleOn = plan?.hasEvaluations ?? true

  const ended = new Date() >= rehearsalEnd(rehearsal.date, rehearsal.startTime, rehearsal.endTime)
  const myAtt = rehearsal.attendances.find((a) => a.userId === userId)
  const isPresent = myAtt?.status === 'PRESENT'
  const presentMembers = rehearsal.attendances.filter((a) => a.status === 'PRESENT').map((a) => ({ userId: a.userId, name: a.user.name }))

  return { rehearsal, moduleOn, ended, isPresent, presentMembers }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const rehearsalId = Number(params.id)

  const ctx = await loadContext(rehearsalId, userId, isAdmin)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const myEval = await prisma.rehearsalEvaluation.findUnique({
    where: { rehearsalId_evaluatorId: { rehearsalId, evaluatorId: userId } },
    include: { memberRatings: true },
  })

  return NextResponse.json({
    moduleOn: ctx.moduleOn,
    ended: ctx.ended,
    isPresent: ctx.isPresent,
    canEvaluate: ctx.moduleOn && ctx.ended && ctx.isPresent,
    presentMembers: ctx.presentMembers,
    myEvaluation: myEval ? {
      selfRating: myEval.selfRating,
      groupRating: myEval.groupRating,
      suggestion: myEval.suggestion,
      memberRatings: Object.fromEntries(myEval.memberRatings.map((r) => [r.ratedUserId, r.rating])),
    } : null,
  })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const rehearsalId = Number(params.id)

  const ctx = await loadContext(rehearsalId, userId, isAdmin)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  if (!ctx.moduleOn) return NextResponse.json({ error: "L'auto-évaluation n'est pas incluse dans l'offre de ce groupe." }, { status: 403 })
  if (!ctx.ended) return NextResponse.json({ error: 'La répétition n\'est pas encore terminée.' }, { status: 403 })
  if (!ctx.isPresent) return NextResponse.json({ error: 'Seuls les musiciens présents peuvent évaluer.' }, { status: 403 })

  const { selfRating, groupRating, suggestion, ratings } = await req.json()
  const presentIds = new Set(ctx.presentMembers.map((m) => m.userId))
  const cleanRatings: { ratedUserId: number; rating: number }[] = Array.isArray(ratings)
    ? ratings
        .map((r: any) => ({ ratedUserId: Number(r.ratedUserId), rating: clampRating(r.rating) }))
        .filter((r) => presentIds.has(r.ratedUserId) && r.ratedUserId !== userId)
    : []

  const evaluation = await prisma.rehearsalEvaluation.upsert({
    where: { rehearsalId_evaluatorId: { rehearsalId, evaluatorId: userId } },
    create: {
      rehearsalId, evaluatorId: userId,
      selfRating: clampRating(selfRating), groupRating: clampRating(groupRating),
      suggestion: suggestion?.trim()?.slice(0, 1000) || null,
    },
    update: {
      selfRating: clampRating(selfRating), groupRating: clampRating(groupRating),
      suggestion: suggestion?.trim()?.slice(0, 1000) || null,
    },
  })

  // Remplace les notes par musicien
  await prisma.rehearsalMemberRating.deleteMany({ where: { evaluationId: evaluation.id } })
  if (cleanRatings.length > 0) {
    await prisma.rehearsalMemberRating.createMany({
      data: cleanRatings.map((r) => ({ evaluationId: evaluation.id, ratedUserId: r.ratedUserId, rating: r.rating })),
    })
  }

  return NextResponse.json({ ok: true })
}

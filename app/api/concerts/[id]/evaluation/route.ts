import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Concert « terminé » = la journée du concert est passée (pas d'heure sur les concerts)
function concertEnded(date: Date): boolean {
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return new Date() > end
}

const clampRating = (n: any) => Math.max(1, Math.min(5, Math.round(Number(n) || 0)))

async function loadContext(concertId: number, userId: number, isAdmin: boolean) {
  const concert = await prisma.concert.findUnique({
    where: { id: concertId },
    include: {
      attendances: { include: { user: { select: { id: true, name: true } } } },
      setlist: { include: { songs: { include: { song: { select: { id: true, title: true, artist: true } } }, orderBy: { position: 'asc' } } } },
    },
  })
  if (!concert) return { error: 'Introuvable.' as string, status: 404 as number }

  const membership = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId: concert.groupId } } })
  if (!isAdmin && !membership) return { error: 'Accès refusé.', status: 403 }

  const plan = await prisma.plan.findUnique({ where: { key: (await prisma.group.findUnique({ where: { id: concert.groupId }, select: { plan: true } }))!.plan }, select: { hasEvaluations: true } })
  const moduleOn = plan?.hasEvaluations ?? true

  const ended = concertEnded(concert.date)
  const myAtt = concert.attendances.find((a) => a.userId === userId)
  const isPresent = myAtt?.status === 'PRESENT'
  const presentMembers = concert.attendances.filter((a) => a.status === 'PRESENT').map((a) => ({ userId: a.userId, name: a.user.name }))
  const plannedSongs = (concert.setlist?.songs || []).map((s) => ({ songId: s.songId, title: s.song.title, artist: s.song.artist }))

  return { concert, moduleOn, ended, isPresent, presentMembers, plannedSongs }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const concertId = Number(params.id)

  const ctx = await loadContext(concertId, userId, isAdmin)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const myEval = await prisma.concertEvaluation.findUnique({
    where: { concertId_evaluatorId: { concertId, evaluatorId: userId } },
    include: { memberRatings: true, songRatings: true },
  })

  return NextResponse.json({
    moduleOn: ctx.moduleOn,
    ended: ctx.ended,
    isPresent: ctx.isPresent,
    canEvaluate: ctx.moduleOn && ctx.ended && ctx.isPresent,
    presentMembers: ctx.presentMembers,
    plannedSongs: ctx.plannedSongs,
    myEvaluation: myEval ? {
      selfRating: myEval.selfRating,
      groupRating: myEval.groupRating,
      suggestion: myEval.suggestion,
      memberRatings: Object.fromEntries(myEval.memberRatings.map((r) => [r.ratedUserId, r.rating])),
      songRatings: Object.fromEntries(myEval.songRatings.map((r) => [r.songId, r.rating])),
    } : null,
  })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const concertId = Number(params.id)

  const ctx = await loadContext(concertId, userId, isAdmin)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  if (!ctx.moduleOn) return NextResponse.json({ error: "L'auto-évaluation n'est pas incluse dans l'offre de ce groupe." }, { status: 403 })
  if (!ctx.ended) return NextResponse.json({ error: 'Le concert n\'est pas encore passé.' }, { status: 403 })
  if (!ctx.isPresent) return NextResponse.json({ error: 'Seuls les musiciens présents peuvent évaluer.' }, { status: 403 })

  const { selfRating, groupRating, suggestion, ratings, songRatings } = await req.json()
  const presentIds = new Set(ctx.presentMembers.map((m) => m.userId))
  const cleanRatings: { ratedUserId: number; rating: number }[] = Array.isArray(ratings)
    ? ratings.map((r: any) => ({ ratedUserId: Number(r.ratedUserId), rating: clampRating(r.rating) })).filter((r) => presentIds.has(r.ratedUserId) && r.ratedUserId !== userId)
    : []
  const plannedIds = new Set(ctx.plannedSongs.map((s) => s.songId))
  const cleanSongRatings: { songId: number; rating: number }[] = Array.isArray(songRatings)
    ? songRatings.map((r: any) => ({ songId: Number(r.songId), rating: clampRating(r.rating) })).filter((r) => plannedIds.has(r.songId))
    : []

  const evaluation = await prisma.concertEvaluation.upsert({
    where: { concertId_evaluatorId: { concertId, evaluatorId: userId } },
    create: { concertId, evaluatorId: userId, selfRating: clampRating(selfRating), groupRating: clampRating(groupRating), suggestion: suggestion?.trim()?.slice(0, 1000) || null },
    update: { selfRating: clampRating(selfRating), groupRating: clampRating(groupRating), suggestion: suggestion?.trim()?.slice(0, 1000) || null },
  })

  await prisma.concertMemberRating.deleteMany({ where: { evaluationId: evaluation.id } })
  if (cleanRatings.length > 0) {
    await prisma.concertMemberRating.createMany({ data: cleanRatings.map((r) => ({ evaluationId: evaluation.id, ratedUserId: r.ratedUserId, rating: r.rating })) })
  }
  await prisma.concertSongRating.deleteMany({ where: { evaluationId: evaluation.id } })
  if (cleanSongRatings.length > 0) {
    await prisma.concertSongRating.createMany({ data: cleanSongRatings.map((r) => ({ evaluationId: evaluation.id, songId: r.songId, rating: r.rating })) })
  }

  return NextResponse.json({ ok: true })
}

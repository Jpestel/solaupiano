import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { groupContext, groupHasModuleAccess } from '@/lib/group-access'
import { coChefCanDo } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

const MODULE_KEY = 'feature_partitions_carrees'

function emptyCells(total: number) {
  return Array.from({ length: total }, (_, index) => ({
    section: index === 0 ? 'A' : '',
    chord: '',
    melody: '',
    rhythm: '',
    lyric: '',
    note: '',
  }))
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const groupId = Number(params.id)
  const ctx = await groupContext(groupId)
  if (!ctx) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  if (!(await groupHasModuleAccess(ctx, groupId, MODULE_KEY))) {
    return NextResponse.json({ error: 'MODULE_LOCKED' }, { status: 403 })
  }

  const scores = await prisma.squareScore.findMany({
    where: { groupId },
    select: {
      id: true,
      title: true,
      tempo: true,
      keySignature: true,
      timeSignature: true,
      squaresPerRow: true,
      totalSquares: true,
      beatsPerSquare: true,
      songId: true,
      song: { select: { id: true, title: true } },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ isChef: ctx.isChef, scores })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const groupId = Number(params.id)
  const ctx = await groupContext(groupId)
  if (!ctx) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  if (!(await groupHasModuleAccess(ctx, groupId, MODULE_KEY))) {
    return NextResponse.json({ error: 'MODULE_LOCKED' }, { status: 403 })
  }
  if (!ctx.isChef) return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { createdBy: true, chefPermissions: true },
  })
  if (group && !coChefCanDo(group, ctx.userId, ctx.isAdmin, 'partitionsCarrees', 'create')) {
    return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const title = String(body.title ?? '').trim()
  if (!title) return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 })

  const totalSquares = Math.max(4, Math.min(128, Number(body.totalSquares) || 32))
  const squaresPerRow = Math.max(2, Math.min(8, Number(body.squaresPerRow) || 4))
  const beatsPerSquare = Math.max(1, Math.min(8, Number(body.beatsPerSquare) || 4))

  let tempo = String(body.tempo ?? '').trim() || null
  const songId = body.songId ? Number(body.songId) : null
  if (songId && !tempo) {
    const song = await prisma.song.findFirst({
      where: { id: songId, groupId },
      select: { tempo: true },
    })
    if (song?.tempo) tempo = String(song.tempo)
  }

  const score = await prisma.squareScore.create({
    data: {
      groupId,
      songId,
      title,
      tempo,
      keySignature: String(body.keySignature ?? '').trim() || null,
      timeSignature: String(body.timeSignature ?? '4/4'),
      squaresPerRow,
      totalSquares,
      beatsPerSquare,
      cells: emptyCells(totalSquares),
      notes: String(body.notes ?? '').trim() || null,
    },
  })

  return NextResponse.json(score, { status: 201 })
}

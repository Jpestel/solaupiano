import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { groupContext, groupHasModuleAccess } from '@/lib/group-access'
import { coChefCanDo } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

const MODULE_KEY = 'feature_partitions_carrees'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const source = await prisma.squareScore.findUnique({ where: { id: Number(params.id) } })
  if (!source) return NextResponse.json({ error: 'Partition introuvable.' }, { status: 404 })

  const ctx = await groupContext(source.groupId)
  if (!ctx) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  if (!(await groupHasModuleAccess(ctx, source.groupId, MODULE_KEY))) {
    return NextResponse.json({ error: 'MODULE_LOCKED' }, { status: 403 })
  }
  if (!ctx.isChef) return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })

  const group = await prisma.group.findUnique({
    where: { id: source.groupId },
    select: { createdBy: true, chefPermissions: true },
  })
  if (group && !coChefCanDo(group, ctx.userId, ctx.isAdmin, 'partitionsCarrees', 'create')) {
    return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const title = String(body.title ?? '').trim()
  if (!title) return NextResponse.json({ error: 'Titre requis.' }, { status: 400 })

  const copy = await prisma.squareScore.create({
    data: {
      groupId: source.groupId,
      songId: source.songId,
      title,
      tempo: source.tempo,
      keySignature: source.keySignature,
      timeSignature: source.timeSignature,
      squaresPerRow: source.squaresPerRow,
      totalSquares: source.totalSquares,
      beatsPerSquare: source.beatsPerSquare,
      cells: source.cells as any,
      notes: source.notes,
    },
  })

  return NextResponse.json(copy, { status: 201 })
}

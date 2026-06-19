import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { groupContext, groupHasModuleAccess } from '@/lib/group-access'
import { coChefCanDo } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

const MODULE_KEY = 'feature_partitions_carrees'

function normalizeCells(value: unknown, total: number) {
  const base = Array.isArray(value) ? value : []
  const cells = base.map((cell) => {
    const c = cell && typeof cell === 'object' ? cell as Record<string, unknown> : {}
    return {
      section: String(c.section ?? '').slice(0, 12),
      chord: String(c.chord ?? '').slice(0, 80),
      melody: String(c.melody ?? '').slice(0, 160),
      rhythm: String(c.rhythm ?? '').slice(0, 120),
      lyric: String(c.lyric ?? '').slice(0, 160),
      note: String(c.note ?? '').slice(0, 240),
    }
  })

  while (cells.length < total) {
    cells.push({ section: '', chord: '', melody: '', rhythm: '', lyric: '', note: '' })
  }
  return cells.slice(0, total)
}

async function scoreContext(scoreId: number) {
  const score = await prisma.squareScore.findUnique({
    where: { id: scoreId },
    include: { song: { select: { id: true, title: true } } },
  })
  if (!score) return null

  const ctx = await groupContext(score.groupId)
  if (!ctx) return null
  if (!(await groupHasModuleAccess(ctx, score.groupId, MODULE_KEY))) return null

  return { score, ctx }
}

async function canWrite(groupId: number, userId: number, isAdmin: boolean, action: 'update' | 'delete') {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { createdBy: true, chefPermissions: true },
  })
  return !group || coChefCanDo(group, userId, isAdmin, 'partitionsCarrees', action)
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await scoreContext(Number(params.id))
  if (!result) return NextResponse.json({ error: 'Partition introuvable ou accès refusé.' }, { status: 404 })

  return NextResponse.json({
    ...result.score,
    isChef: result.ctx.isChef,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await scoreContext(Number(params.id))
  if (!result) return NextResponse.json({ error: 'Partition introuvable ou accès refusé.' }, { status: 404 })
  if (!result.ctx.isChef) return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
  if (!(await canWrite(result.score.groupId, result.ctx.userId, result.ctx.isAdmin, 'update'))) {
    return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const updateData: Record<string, unknown> = {}

  if (body.title !== undefined) {
    const title = String(body.title ?? '').trim()
    if (!title) return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 })
    updateData.title = title
  }
  if (body.pulsation !== undefined) updateData.pulsation = String(body.pulsation ?? '').trim() || null
  if (body.measureDescription !== undefined) updateData.measureDescription = String(body.measureDescription ?? '').trim() || null
  if (body.debit !== undefined) updateData.debit = String(body.debit ?? '').trim() || null
  if (body.tempo !== undefined) updateData.tempo = String(body.tempo ?? '').trim() || null
  if (body.keySignature !== undefined) updateData.keySignature = String(body.keySignature ?? '').trim() || null
  if (body.timeSignature !== undefined) updateData.timeSignature = String(body.timeSignature ?? '4/4')
  if (body.squaresPerRow !== undefined) updateData.squaresPerRow = Math.max(2, Math.min(8, Number(body.squaresPerRow) || 4))
  if (body.beatsPerSquare !== undefined) updateData.beatsPerSquare = Math.max(1, Math.min(8, Number(body.beatsPerSquare) || 4))
  if (body.notes !== undefined) updateData.notes = String(body.notes ?? '').trim() || null
  if (body.songId !== undefined) updateData.songId = body.songId ? Number(body.songId) : null

  const nextTotal = body.totalSquares !== undefined
    ? Math.max(4, Math.min(128, Number(body.totalSquares) || result.score.totalSquares))
    : result.score.totalSquares
  if (body.totalSquares !== undefined) updateData.totalSquares = nextTotal
  if (body.cells !== undefined || body.totalSquares !== undefined) {
    updateData.cells = normalizeCells(body.cells ?? result.score.cells, nextTotal)
  }

  const updated = await prisma.squareScore.update({
    where: { id: result.score.id },
    data: updateData,
    include: { song: { select: { id: true, title: true } } },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await scoreContext(Number(params.id))
  if (!result) return NextResponse.json({ error: 'Partition introuvable ou accès refusé.' }, { status: 404 })
  if (!result.ctx.isChef) return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
  if (!(await canWrite(result.score.groupId, result.ctx.userId, result.ctx.isAdmin, 'delete'))) {
    return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
  }

  await prisma.squareScore.delete({ where: { id: result.score.id } })
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { groupContext, groupHasModuleAccess } from '@/lib/group-access'
import { coChefCanDo } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

const MODULE_KEY = 'feature_partitions_carrees'

// Le « cells » stocke désormais une grille de points libre :
// { rows, cols, h[], v[], labels[] }. h/v = segments tracés à la main entre 2 points
// voisins (clé "r:c"). labels = annotations (accord, section…) posées sur un point.
function clampInt(n: unknown, lo: number, hi: number, dflt: number) {
  const x = Math.round(Number(n))
  return Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : dflt
}

function normalizeCanvas(value: unknown) {
  const v = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  const rows = clampInt(v.rows, 2, 16, 5)
  const cols = clampInt(v.cols, 2, 48, 17)

  const edges = (arr: unknown, rMax: number, cMax: number) => {
    const set = new Set<string>()
    if (Array.isArray(arr)) {
      for (const k of arr) {
        if (typeof k !== 'string') continue
        const [r, c] = k.split(':').map(Number)
        if (Number.isInteger(r) && Number.isInteger(c) && r >= 0 && r <= rMax && c >= 0 && c <= cMax) set.add(`${r}:${c}`)
      }
    }
    return Array.from(set)
  }

  const h = edges(v.h, rows - 1, cols - 2) // horizontal : (r,c)→(r,c+1)
  const vv = edges(v.v, rows - 2, cols - 1) // vertical : (r,c)→(r+1,c)

  const labels = Array.isArray(v.labels)
    ? v.labels.slice(0, 300).map((l, i) => {
        const o = l && typeof l === 'object' ? (l as Record<string, unknown>) : {}
        return {
          id: typeof o.id === 'string' ? o.id.slice(0, 40) : `l${i}`,
          r: clampInt(o.r, 0, rows - 1, 0),
          c: clampInt(o.c, 0, cols - 1, 0),
          text: String(o.text ?? '').slice(0, 40),
        }
      }).filter((l) => l.text)
    : []

  return { rows, cols, h, v: vv, labels }
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

  if (body.totalSquares !== undefined) {
    updateData.totalSquares = Math.max(4, Math.min(128, Number(body.totalSquares) || result.score.totalSquares))
  }
  if (body.cells !== undefined) {
    updateData.cells = normalizeCanvas(body.cells)
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

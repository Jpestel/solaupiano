import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'

async function getChartAndCheckAccess(
  chartId: number, userId: number, isAdmin: boolean, chefOnly = false
) {
  const chart = await prisma.chordChart.findUnique({ where: { id: chartId } })
  if (!chart) return { ok: false as const, status: 404, error: 'Grille introuvable.' }

  if (!isAdmin) {
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: chart.groupId } },
    })
    if (!membership) return { ok: false as const, status: 403, error: 'Accès refusé.' }
    if (chefOnly && membership.groupRole !== 'CHEF') return { ok: false as const, status: 403, error: 'Réservé au chef.' }
  }

  return { ok: true as const, chart }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const chartId = Number(params.id)

  const result = await getChartAndCheckAccess(chartId, userId, isAdmin)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  const chart = await prisma.chordChart.findUnique({
    where: { id: chartId },
    include: { song: { select: { id: true, title: true } } },
  })

  return NextResponse.json(chart)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const chartId = Number(params.id)

  const result = await getChartAndCheckAccess(chartId, userId, isAdmin, true)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  if (!isAdmin) {
    const grp = await prisma.group.findUnique({ where: { id: result.chart.groupId }, select: { createdBy: true, chefPermissions: true } })
    if (grp && !coChefCanDo(grp, userId, isAdmin, 'grilles', 'update')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }

  const body = await req.json()
  const { title, tempo, keySignature, timeSignature, barsPerRow, totalBars, cells, sons, songId } = body

  const updateData: Record<string, unknown> = {}
  if (title !== undefined) updateData.title = title.trim()
  if (tempo !== undefined) updateData.tempo = tempo?.trim() || null
  if (keySignature !== undefined) updateData.keySignature = keySignature?.trim() || null
  if (timeSignature !== undefined) updateData.timeSignature = timeSignature
  if (barsPerRow !== undefined) updateData.barsPerRow = Number(barsPerRow)
  if (sons !== undefined) updateData.sons = sons?.trim() || null
  if (songId !== undefined) updateData.songId = songId ? Number(songId) : null

  if (cells !== undefined || totalBars !== undefined) {
    const currentCells = (result.chart.cells as string[]) ?? []
    const newTotal = totalBars !== undefined ? Number(totalBars) : result.chart.totalBars
    const base = Array.isArray(cells) ? cells : currentCells

    if (base.length < newTotal) {
      updateData.cells = [...base, ...Array(newTotal - base.length).fill('')]
    } else {
      updateData.cells = base.slice(0, newTotal)
    }
    if (totalBars !== undefined) updateData.totalBars = newTotal
  }

  const updated = await prisma.chordChart.update({
    where: { id: chartId },
    data: updateData,
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const chartId = Number(params.id)

  const result = await getChartAndCheckAccess(chartId, userId, isAdmin, true)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  if (!isAdmin) {
    const grp = await prisma.group.findUnique({ where: { id: result.chart.groupId }, select: { createdBy: true, chefPermissions: true } })
    if (grp && !coChefCanDo(grp, userId, isAdmin, 'grilles', 'delete')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }

  await prisma.chordChart.delete({ where: { id: chartId } })
  return NextResponse.json({ ok: true })
}

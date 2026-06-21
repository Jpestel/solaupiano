import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'
import { AccidentalPreference, semitonesBetween, transposeChartCells, transposeText } from '@/lib/transposition'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const chartId = Number(params.id)
  if (!Number.isInteger(chartId)) return NextResponse.json({ error: 'Grille introuvable.' }, { status: 404 })

  const chart = await prisma.chordChart.findUnique({
    where: { id: chartId },
    include: { group: { select: { id: true, createdBy: true, chefPermissions: true } } },
  })
  if (!chart) return NextResponse.json({ error: 'Grille introuvable.' }, { status: 404 })

  if (!isAdmin) {
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: chart.groupId } },
    })
    if (!membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    if (membership.groupRole !== 'CHEF') return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
    if (!coChefCanDo(chart.group, userId, isAdmin, 'grilles', 'create')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }

  const body = await req.json().catch(() => ({}))
  const preference: AccidentalPreference = body.preference === 'flat' ? 'flat' : body.preference === 'sharp' ? 'sharp' : 'auto'
  const semitones = Number.isFinite(Number(body.semitones))
    ? Number(body.semitones)
    : (body.fromKey && body.toKey ? semitonesBetween(String(body.fromKey), String(body.toKey)) : null)
  if (semitones === null || !Number.isFinite(semitones)) {
    return NextResponse.json({ error: 'Transposition invalide.' }, { status: 400 })
  }

  const newKey = typeof body.toKey === 'string' && body.toKey.trim()
    ? body.toKey.trim()
    : (chart.keySignature ? transposeText(chart.keySignature, semitones, preference) : chart.keySignature)
  const titleSuffix = semitones > 0 ? `+${semitones}` : String(semitones)
  const title = typeof body.title === 'string' && body.title.trim()
    ? body.title.trim()
    : `${chart.title} (${newKey || titleSuffix})`

  const copy = await prisma.chordChart.create({
    data: {
      groupId: chart.groupId,
      songId: chart.songId,
      title,
      tempo: chart.tempo,
      keySignature: newKey || null,
      timeSignature: chart.timeSignature,
      barsPerRow: chart.barsPerRow,
      totalBars: chart.totalBars,
      cells: transposeChartCells(chart.cells, semitones, preference) as object,
      sons: chart.sons,
    },
  })

  return NextResponse.json(copy, { status: 201 })
}

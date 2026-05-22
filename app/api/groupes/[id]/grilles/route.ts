import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function checkAccess(userId: number, groupId: number, isAdmin: boolean, chefOnly = false) {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (isAdmin) return { ok: true, membership }
  if (!membership) return { ok: false, status: 403, error: 'Accès refusé.' }
  if (chefOnly && membership.groupRole !== 'CHEF') return { ok: false, status: 403, error: 'Réservé au chef du groupe.' }
  return { ok: true, membership }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const { ok, status, error } = await checkAccess(userId, groupId, isAdmin)
  if (!ok) return NextResponse.json({ error }, { status })

  const charts = await prisma.chordChart.findMany({
    where: { groupId },
    select: {
      id: true, title: true, tempo: true, keySignature: true,
      timeSignature: true, barsPerRow: true, totalBars: true,
      songId: true, song: { select: { id: true, title: true } },
      createdAt: true, updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(charts)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const { ok, status, error } = await checkAccess(userId, groupId, isAdmin, true)
  if (!ok) return NextResponse.json({ error }, { status })

  const { title, tempo, keySignature, timeSignature, barsPerRow, totalBars, songId } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 })

  const bars = Math.max(8, Math.min(80, Number(totalBars) || 32))
  const cells = Array(bars).fill('')

  const chart = await prisma.chordChart.create({
    data: {
      groupId,
      title: title.trim(),
      tempo: tempo?.trim() || null,
      keySignature: keySignature?.trim() || null,
      timeSignature: timeSignature || '4/4',
      barsPerRow: Number(barsPerRow) || 4,
      totalBars: bars,
      cells,
      songId: songId ? Number(songId) : null,
    },
  })

  return NextResponse.json(chart, { status: 201 })
}

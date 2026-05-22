import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const chartId = Number(params.id)

  // Récupérer la grille source
  const source = await prisma.chordChart.findUnique({ where: { id: chartId } })
  if (!source) return NextResponse.json({ error: 'Grille introuvable.' }, { status: 404 })

  // Vérifier que l'utilisateur est membre CHEF du groupe (ou admin)
  if (!isAdmin) {
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: source.groupId } },
    })
    if (!membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    if (membership.groupRole !== 'CHEF') return NextResponse.json({ error: 'Réservé au chef.' }, { status: 403 })
  }

  const body = await req.json()
  const title = body.title?.trim()
  if (!title) return NextResponse.json({ error: 'Titre requis.' }, { status: 400 })

  // Créer la copie
  const copy = await prisma.chordChart.create({
    data: {
      groupId: source.groupId,
      songId: source.songId,
      title,
      tempo: source.tempo,
      keySignature: source.keySignature,
      timeSignature: source.timeSignature,
      barsPerRow: source.barsPerRow,
      totalBars: source.totalBars,
      cells: source.cells,
      sons: source.sons,
    },
  })

  return NextResponse.json(copy, { status: 201 })
}

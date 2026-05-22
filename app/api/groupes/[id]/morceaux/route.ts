import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)

  const isAdmin = session.user.siteRole === 'ADMIN'
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!isAdmin && !membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const songs = await prisma.song.findMany({
    where: { groupId },
    include: {
      resources: {
        include: { uploadedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      lyrics: { select: { id: true } },
      tab: { select: { id: true } },
    },
    orderBy: { title: 'asc' },
  })

  return NextResponse.json(songs)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)

  const isAdmin = session.user.siteRole === 'ADMIN'
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!isAdmin && (!membership || membership.groupRole !== 'CHEF')) {
    return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
  }

  const body = await req.json()
  const { title, artist, notes, durationSeconds } = body

  if (!title) return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 })

  const song = await prisma.song.create({
    data: {
      groupId,
      title,
      artist: artist || null,
      notes: notes || null,
      durationSeconds: durationSeconds != null ? Number(durationSeconds) : null,
    },
  })

  return NextResponse.json(song, { status: 201 })
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const rehearsalId = Number(params.id)

  const rehearsal = await prisma.rehearsal.findUnique({
    where: { id: rehearsalId },
    include: {
      songs: {
        include: {
          song: {
            include: { resources: { orderBy: { createdAt: 'asc' } } },
          },
        },
        orderBy: [{ position: 'asc' }, { songId: 'asc' }],
      },
      attendances: { include: { user: { select: { id: true, name: true } } } },
    },
  })

  if (!rehearsal) return NextResponse.json({ error: 'Répétition introuvable.' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: rehearsal.groupId } },
  })
  if (!isAdmin && !membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const songIds = rehearsal.songs.map((rs) => rs.songId)
  const progress = await prisma.userSongProgress.findMany({
    where: { userId, songId: { in: songIds } },
  })
  const progressMap = Object.fromEntries(progress.map((p) => [p.songId, p.done]))

  return NextResponse.json({
    ...rehearsal,
    songs: rehearsal.songs.map((rs) => ({ ...rs, userDone: progressMap[rs.songId] ?? false })),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const rehearsalId = Number(params.id)

  const rehearsal = await prisma.rehearsal.findUnique({ where: { id: rehearsalId } })
  if (!rehearsal) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: rehearsal.groupId } },
  })
  if (!isAdmin && (!membership || membership.groupRole !== 'CHEF')) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const body = await req.json()
  const updated = await prisma.rehearsal.update({
    where: { id: rehearsalId },
    data: {
      date: body.date ? new Date(body.date) : undefined,
      location: body.location,
      startTime: body.startTime,
      endTime: body.endTime,
      notes: body.notes,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const rehearsalId = Number(params.id)

  const rehearsal = await prisma.rehearsal.findUnique({ where: { id: rehearsalId } })
  if (!rehearsal) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: rehearsal.groupId } },
  })
  if (!isAdmin && (!membership || membership.groupRole !== 'CHEF')) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  await prisma.rehearsal.delete({ where: { id: rehearsalId } })
  return NextResponse.json({ success: true })
}

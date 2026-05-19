import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const rehearsalId = Number(params.id)

  const rehearsal = await prisma.rehearsal.findUnique({ where: { id: rehearsalId } })
  if (!rehearsal) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: rehearsal.groupId } },
  })
  if (!membership || membership.groupRole !== 'CHEF') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { songId } = await req.json()

  const link = await prisma.rehearsalSong.upsert({
    where: { rehearsalId_songId: { rehearsalId, songId: Number(songId) } },
    update: {},
    create: { rehearsalId, songId: Number(songId) },
  })

  return NextResponse.json(link, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const rehearsalId = Number(params.id)

  const rehearsal = await prisma.rehearsal.findUnique({ where: { id: rehearsalId } })
  if (!rehearsal) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: rehearsal.groupId } },
  })
  if (!membership || membership.groupRole !== 'CHEF') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { songId } = await req.json()
  await prisma.rehearsalSong.delete({
    where: { rehearsalId_songId: { rehearsalId, songId: Number(songId) } },
  })

  return NextResponse.json({ success: true })
}

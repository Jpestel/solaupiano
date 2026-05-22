import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function checkSongAccess(songId: number, userId: number, isAdmin: boolean, chefOnly = false) {
  const song = await prisma.song.findUnique({ where: { id: songId }, select: { groupId: true } })
  if (!song) return { ok: false as const, status: 404, error: 'Morceau introuvable.' }

  if (!isAdmin) {
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: song.groupId } },
    })
    if (!membership) return { ok: false as const, status: 403, error: 'Accès refusé.' }
    if (chefOnly && membership.groupRole !== 'CHEF') return { ok: false as const, status: 403, error: 'Réservé au chef.' }
  }

  return { ok: true as const, groupId: song.groupId }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const songId = Number(params.id)
  const result = await checkSongAccess(songId, Number(session.user.id), session.user.siteRole === 'ADMIN')
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  const lyrics = await prisma.songLyrics.findUnique({ where: { songId } })
  return NextResponse.json(lyrics ?? { content: '' })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const songId = Number(params.id)
  const result = await checkSongAccess(songId, Number(session.user.id), session.user.siteRole === 'ADMIN', true)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  const { content } = await req.json()

  const lyrics = await prisma.songLyrics.upsert({
    where: { songId },
    update: { content: content ?? '' },
    create: { songId, content: content ?? '' },
  })

  return NextResponse.json(lyrics)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const songId = Number(params.id)
  const result = await checkSongAccess(songId, Number(session.user.id), session.user.siteRole === 'ADMIN', true)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  await prisma.songLyrics.deleteMany({ where: { songId } })
  return NextResponse.json({ ok: true })
}

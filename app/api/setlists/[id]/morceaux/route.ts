import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function checkChef(setlistId: number, userId: number, isAdmin: boolean) {
  const setlist = await prisma.setlist.findUnique({ where: { id: setlistId } })
  if (!setlist) return { ok: false, status: 404, error: 'Setlist introuvable.' }
  if (!isAdmin) {
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: setlist.groupId } },
    })
    if (!membership || membership.groupRole !== 'CHEF') return { ok: false, status: 403, error: 'Réservé au chef.' }
  }
  return { ok: true, setlist }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const setlistId = Number(params.id)

  const check = await checkChef(setlistId, userId, isAdmin)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const { songId } = await req.json()

  // Get max position
  const last = await prisma.setlistSong.findFirst({
    where: { setlistId },
    orderBy: { position: 'desc' },
  })
  const position = (last?.position ?? -1) + 1

  await prisma.setlistSong.create({ data: { setlistId, songId: Number(songId), position } })

  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const setlistId = Number(params.id)

  const check = await checkChef(setlistId, userId, isAdmin)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const { songId } = await req.json()

  await prisma.setlistSong.delete({
    where: { setlistId_songId: { setlistId, songId: Number(songId) } },
  })

  return NextResponse.json({ ok: true })
}

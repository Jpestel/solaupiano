import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const setlistId = Number(params.id)

  const setlist = await prisma.setlist.findUnique({ where: { id: setlistId } })
  if (!setlist) return NextResponse.json({ error: 'Setlist introuvable.' }, { status: 404 })

  if (!isAdmin) {
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: setlist.groupId } },
    })
    if (!membership || membership.groupRole !== 'CHEF') {
      return NextResponse.json({ error: 'Réservé au chef.' }, { status: 403 })
    }
  }

  const { songIds } = await req.json() as { songIds: number[] }

  await prisma.$transaction(
    songIds.map((songId, index) =>
      prisma.setlistSong.update({
        where: { setlistId_songId: { setlistId, songId } },
        data: { position: index },
      })
    )
  )

  return NextResponse.json({ ok: true })
}

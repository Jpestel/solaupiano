import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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

  const { songIds } = await req.json() // ordered array of songIds
  if (!Array.isArray(songIds)) return NextResponse.json({ error: 'Format invalide.' }, { status: 400 })

  await prisma.$transaction(
    songIds.map((songId: number, index: number) =>
      prisma.rehearsalSong.update({
        where: { rehearsalId_songId: { rehearsalId, songId } },
        data: { position: index },
      })
    )
  )

  return NextResponse.json({ ok: true })
}

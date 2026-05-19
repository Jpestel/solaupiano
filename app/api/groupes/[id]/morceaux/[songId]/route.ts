import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireChef(session: Awaited<ReturnType<typeof getServerSession>>, groupId: number) {
  if (!session) return false
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: Number(session.user.id), groupId } },
  })
  return membership?.groupRole === 'CHEF'
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; songId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const groupId = Number(params.id)
  const songId = Number(params.songId)

  if (!await requireChef(session, groupId)) {
    return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
  }

  const { title, artist, notes } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 })

  const song = await prisma.song.update({
    where: { id: songId },
    data: {
      title: title.trim(),
      artist: artist?.trim() || null,
      notes: notes?.trim() || null,
    },
  })

  return NextResponse.json(song)
}

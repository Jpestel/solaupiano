import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const songId = Number(params.id)
  const { done } = await req.json()

  const result = await prisma.userSongProgress.upsert({
    where: { userId_songId: { userId, songId } },
    update: { done },
    create: { userId, songId, done },
  })

  return NextResponse.json(result)
}

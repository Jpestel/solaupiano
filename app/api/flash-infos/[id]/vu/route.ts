import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Enregistre qu'un utilisateur a vu (et fermé) un flash info.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const flashInfoId = Number(params.id)

  const flash = await prisma.flashInfo.findUnique({ where: { id: flashInfoId }, select: { id: true } })
  if (!flash) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  await prisma.flashInfoView.upsert({
    where: { flashInfoId_userId: { flashInfoId, userId } },
    create: { flashInfoId, userId, count: 1, lastSeenAt: new Date() },
    update: { count: { increment: 1 }, lastSeenAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}

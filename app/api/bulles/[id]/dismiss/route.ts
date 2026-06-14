import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/bulles/[id]/dismiss — l'utilisateur masque cette bulle pour lui-même.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const bubbleId = Number(params.id)
  const userId = Number(session.user.id)

  await prisma.helpBubbleDismissal.upsert({
    where: { bubbleId_userId: { bubbleId, userId } },
    update: {},
    create: { bubbleId, userId },
  })
  return NextResponse.json({ success: true })
}

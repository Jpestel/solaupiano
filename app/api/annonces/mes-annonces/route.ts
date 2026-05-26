import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const annonces = await prisma.annonce.findMany({
    where: { userId: Number(session.user.id) },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(annonces)
}

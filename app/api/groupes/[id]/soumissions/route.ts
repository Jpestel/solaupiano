import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!isAdmin && membership?.groupRole !== 'CHEF') {
    return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
  }

  const pending = await prisma.pendingResource.findMany({
    where: { groupId },
    include: {
      song: { select: { id: true, title: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(pending)
}

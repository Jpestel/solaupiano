import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  // Fetch all groups the user belongs to (or all groups if admin)
  let groupIds: number[]
  if (isAdmin) {
    const groups = await prisma.group.findMany({ select: { id: true } })
    groupIds = groups.map((g) => g.id)
  } else {
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    })
    groupIds = memberships.map((m) => m.groupId)
  }

  if (groupIds.length === 0) return NextResponse.json({ rehearsals: [], concerts: [] })

  // Fetch rehearsals + concerts in parallel
  const [rehearsals, concerts] = await Promise.all([
    prisma.rehearsal.findMany({
      where: { groupId: { in: groupIds } },
      include: { group: { select: { id: true, name: true } } },
      orderBy: { date: 'asc' },
    }),
    prisma.concert.findMany({
      where: { groupId: { in: groupIds } },
      include: { group: { select: { id: true, name: true } } },
      orderBy: { date: 'asc' },
    }),
  ])

  return NextResponse.json({ rehearsals, concerts })
}

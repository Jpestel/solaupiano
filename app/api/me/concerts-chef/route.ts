import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — liste les concerts à venir des groupes où l'utilisateur est chef
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  // Groupes où l'utilisateur est chef
  const memberships = await prisma.groupMember.findMany({
    where: {
      userId,
      groupRole: isAdmin ? undefined : 'CHEF',
    },
    select: { groupId: true, group: { select: { name: true } } },
  })

  const groupIds = memberships.map(m => m.groupId)
  const groupNames = Object.fromEntries(memberships.map(m => [m.groupId, m.group.name]))

  if (!groupIds.length) return NextResponse.json([])

  const concerts = await prisma.concert.findMany({
    where: { groupId: { in: groupIds }, date: { gte: new Date() } },
    orderBy: { date: 'asc' },
    take: 50,
    select: { id: true, name: true, date: true, groupId: true },
  })

  return NextResponse.json(concerts.map(c => ({
    id: c.id,
    name: c.name,
    date: c.date.toISOString(),
    groupId: c.groupId,
    groupName: groupNames[c.groupId] ?? '',
  })))
}

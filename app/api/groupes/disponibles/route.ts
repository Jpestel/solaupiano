import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Groups the user is NOT a member of, with their pending request status
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)

  const memberGroupIds = (
    await prisma.groupMember.findMany({ where: { userId }, select: { groupId: true } })
  ).map((m) => m.groupId)

  const groups = await prisma.group.findMany({
    where: { id: { notIn: memberGroupIds }, isPublic: true },
    select: {
      id: true,
      name: true,
      description: true,
      joinRequests: {
        where: { userId },
        select: { id: true, status: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(groups)
}

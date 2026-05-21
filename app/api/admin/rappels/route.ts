import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const groupId = searchParams.get('groupId') ? Number(searchParams.get('groupId')) : undefined
  const userId = searchParams.get('userId') ? Number(searchParams.get('userId')) : undefined
  const page = Math.max(1, Number(searchParams.get('page') || '1'))
  const limit = 50

  const where = {
    ...(groupId && { rehearsal: { groupId } }),
    ...(userId && { userId }),
  }

  const [logs, total] = await Promise.all([
    prisma.reminderLog.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
        sentBy: { select: { id: true, name: true } },
        rehearsal: {
          select: {
            id: true,
            date: true,
            location: true,
            startTime: true,
            group: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.reminderLog.count({ where }),
  ])

  return NextResponse.json({ logs, total, page, pages: Math.ceil(total / limit) })
}

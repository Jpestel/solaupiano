import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)

  const [user, groupCount, masterCount, nextRehearsal] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { instruments: { include: { instrument: true } } },
    }),
    prisma.groupMember.count({ where: { userId } }),
    prisma.userSongProgress.count({ where: { userId, status: 'MAITRISE' } }),
    prisma.rehearsal.findFirst({
      where: {
        date: { gte: new Date() },
        group: { members: { some: { userId } } },
      },
      orderBy: { date: 'asc' },
      select: { id: true, date: true, location: true, groupId: true, group: { select: { name: true } } },
    }),
  ])

  if (!user) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const { password, ...safeUser } = user
  return NextResponse.json({
    ...safeUser,
    stats: {
      groupCount,
      masterCount,
      nextRehearsal: nextRehearsal
        ? { ...nextRehearsal, date: nextRehearsal.date.toISOString() }
        : null,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const { name, instrumentIds, userPlan, weeklyDigestOptOut } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 })
  }

  const validPlans = ['MUSICIEN', 'CREATEUR']
  const planData = userPlan && validPlans.includes(userPlan) ? { userPlan } : {}
  const digestData = typeof weeklyDigestOptOut === 'boolean' ? { weeklyDigestOptOut } : {}

  // Update user and instruments in a transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { name: name.trim(), ...planData, ...digestData },
    }),
    prisma.userInstrument.deleteMany({ where: { userId } }),
    ...(Array.isArray(instrumentIds) && instrumentIds.length > 0
      ? [
          prisma.userInstrument.createMany({
            data: instrumentIds.map((id: number) => ({ userId, instrumentId: id })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ])

  const updated = await prisma.user.findUnique({
    where: { id: userId },
    include: { instruments: { include: { instrument: true } } },
  })

  const { password, ...safeUser } = updated!
  return NextResponse.json(safeUser)
}

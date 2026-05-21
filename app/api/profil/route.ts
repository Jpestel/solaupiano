import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      instruments: { include: { instrument: true } },
    },
  })

  if (!user) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const { password, ...safeUser } = user
  return NextResponse.json(safeUser)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const { name, instrumentIds, userPlan } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 })
  }

  const validPlans = ['MUSICIEN', 'CREATEUR']
  const planData = userPlan && validPlans.includes(userPlan) ? { userPlan } : {}

  // Update user and instruments in a transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { name: name.trim(), ...planData },
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

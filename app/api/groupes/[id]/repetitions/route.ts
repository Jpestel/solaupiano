import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const rehearsals = await prisma.rehearsal.findMany({
    where: { groupId },
    orderBy: { date: 'asc' },
  })

  return NextResponse.json(rehearsals)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!membership || membership.groupRole !== 'CHEF') {
    return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
  }

  const body = await req.json()
  const { date, location, startTime, endTime, notes } = body

  if (!date || !location || !startTime) {
    return NextResponse.json({ error: 'Date, lieu et heure de début sont requis.' }, { status: 400 })
  }

  const rehearsal = await prisma.rehearsal.create({
    data: {
      groupId,
      date: new Date(date),
      location,
      startTime,
      endTime: endTime || null,
      notes: notes || null,
    },
  })

  // Create attendance entries for all group members
  const members = await prisma.groupMember.findMany({ where: { groupId } })
  await prisma.attendance.createMany({
    data: members.map((m) => ({
      userId: m.userId,
      rehearsalId: rehearsal.id,
      status: 'INCERTAIN' as const,
    })),
    skipDuplicates: true,
  })

  return NextResponse.json(rehearsal, { status: 201 })
}

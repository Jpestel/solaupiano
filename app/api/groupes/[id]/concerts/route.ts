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

  const concerts = await prisma.concert.findMany({
    where: { groupId },
    orderBy: { date: 'asc' },
  })

  return NextResponse.json(concerts)
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
  const { name, date, location, notes } = body

  if (!name || !date || !location) {
    return NextResponse.json({ error: 'Nom, date et lieu sont requis.' }, { status: 400 })
  }

  const concert = await prisma.concert.create({
    data: {
      groupId,
      name,
      date: new Date(date),
      location,
      notes: notes || null,
    },
  })

  return NextResponse.json(concert, { status: 201 })
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const concertId = Number(params.id)
  const concert = await prisma.concert.findUnique({ where: { id: concertId } })
  if (!concert) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: Number(session.user.id), groupId: concert.groupId } },
  })
  if (!membership && session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const attendances = await prisma.concertAttendance.findMany({
    where: { concertId },
    include: { user: { select: { id: true, name: true } } },
  })
  return NextResponse.json(attendances)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const concertId = Number(params.id)
  const concert = await prisma.concert.findUnique({ where: { id: concertId } })
  if (!concert) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: concert.groupId } },
  })
  if (!membership && session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const { status } = await req.json()
  if (!['PRESENT', 'ABSENT', 'INCERTAIN'].includes(status)) {
    return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 })
  }

  const attendance = await prisma.concertAttendance.upsert({
    where: { userId_concertId: { userId, concertId } },
    update: { status },
    create: { userId, concertId, status },
  })

  // Plus présent → on retire l'éventuelle évaluation pour ne pas fausser les résultats
  if (status !== 'PRESENT') {
    await prisma.concertEvaluation.deleteMany({ where: { concertId, evaluatorId: userId } })
  }

  return NextResponse.json(attendance)
}

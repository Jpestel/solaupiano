import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const rehearsalId = Number(params.id)
  const rehearsal = await prisma.rehearsal.findUnique({ where: { id: rehearsalId } })
  if (!rehearsal) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: Number(session.user.id), groupId: rehearsal.groupId } },
  })
  if (!membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const attendances = await prisma.attendance.findMany({
    where: { rehearsalId },
    include: { user: { select: { id: true, name: true } } },
  })

  return NextResponse.json(attendances)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const rehearsalId = Number(params.id)

  const rehearsal = await prisma.rehearsal.findUnique({ where: { id: rehearsalId } })
  if (!rehearsal) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: rehearsal.groupId } },
  })
  if (!membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const { status } = await req.json()
  const validStatuses = ['PRESENT', 'ABSENT', 'INCERTAIN']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 })
  }

  const attendance = await prisma.attendance.upsert({
    where: { userId_rehearsalId: { userId, rehearsalId } },
    update: { status },
    create: { userId, rehearsalId, status },
  })

  // Si le musicien n'est plus présent, son auto-évaluation ne doit pas fausser
  // les résultats → on la supprime (cascade sur notes membres/morceaux).
  if (status !== 'PRESENT') {
    await prisma.rehearsalEvaluation.deleteMany({ where: { rehearsalId, evaluatorId: userId } })
  }

  return NextResponse.json(attendance)
}

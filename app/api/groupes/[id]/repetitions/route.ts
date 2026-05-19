import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendRehearsalNotification } from '@/lib/email'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)

  const isAdmin = session.user.siteRole === 'ADMIN'
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!isAdmin && !membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

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

  const isAdmin = session.user.siteRole === 'ADMIN'
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!isAdmin && (!membership || membership.groupRole !== 'CHEF')) {
    return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
  }

  const body = await req.json()
  const { date, location, startTime, endTime, notes, invitedMemberIds } = body

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

  const allMembers = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { email: true, name: true } } },
  })

  // Invited members = selected ones + always the creator
  const invitedIds: number[] = Array.isArray(invitedMemberIds) && invitedMemberIds.length > 0
    ? [...new Set([...invitedMemberIds.map(Number), userId])]
    : allMembers.map((m) => m.userId)

  const invitedMembers = allMembers.filter((m) => invitedIds.includes(m.userId))

  await prisma.attendance.createMany({
    data: invitedMembers.map((m) => ({
      userId: m.userId,
      rehearsalId: rehearsal.id,
      status: 'INCERTAIN' as const,
    })),
    skipDuplicates: true,
  })

  // Send email notifications to invited members (excluding creator)
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } })
  if (group) {
    const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
    sendRehearsalNotification(
      invitedMembers.filter((m) => m.userId !== userId).map((m) => ({ email: m.user.email, name: m.user.name })),
      group.name,
      groupId,
      rehearsal,
      baseUrl
    ).catch(console.error)
  }

  return NextResponse.json(rehearsal, { status: 201 })
}

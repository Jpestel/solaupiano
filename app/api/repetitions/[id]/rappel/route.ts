import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendAttendanceReminder } from '@/lib/email'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const rehearsalId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const rehearsal = await prisma.rehearsal.findUnique({
    where: { id: rehearsalId },
    include: { group: { select: { id: true, name: true } } },
  })
  if (!rehearsal) return NextResponse.json({ error: 'Répétition introuvable.' }, { status: 404 })

  // Vérifier que l'appelant est chef ou admin
  if (!isAdmin) {
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: Number(session.user.id), groupId: rehearsal.groupId } },
    })
    if (!membership || membership.groupRole !== 'CHEF') {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    }
  }

  // Récupérer tous les membres du groupe avec leur email
  const groupMembers = await prisma.groupMember.findMany({
    where: { groupId: rehearsal.groupId },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  // Récupérer les présences déjà enregistrées
  const existingAttendances = await prisma.attendance.findMany({
    where: { rehearsalId, status: { in: ['PRESENT', 'ABSENT'] } },
    select: { userId: true },
  })
  const respondedUserIds = new Set(existingAttendances.map((a) => a.userId))

  // Garder uniquement les membres qui n'ont pas encore répondu (INCERTAIN ou sans enregistrement)
  const membersToRemind = groupMembers
    .filter((m) => !respondedUserIds.has(m.userId))
    .map((m) => ({ email: m.user.email, name: m.user.name }))

  if (membersToRemind.length === 0) {
    return NextResponse.json({ sent: 0, message: 'Tous les membres ont déjà répondu.' })
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'

  await sendAttendanceReminder(
    membersToRemind,
    rehearsal.group.name,
    {
      id: rehearsal.id,
      groupId: rehearsal.groupId,
      date: rehearsal.date,
      startTime: rehearsal.startTime,
      endTime: rehearsal.endTime,
      location: rehearsal.location,
    },
    baseUrl
  )

  return NextResponse.json({ sent: membersToRemind.length })
}

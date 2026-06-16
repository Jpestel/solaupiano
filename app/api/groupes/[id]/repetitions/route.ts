import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendRehearsalNotification } from '@/lib/email'
import { coChefCanDo } from '@/lib/permissions'

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

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { peerRatingVisibility: true, type: true } })
  const visibility = group?.peerRatingVisibility ?? 'PRIVATE'
  const isChef = isAdmin || membership?.groupRole === 'CHEF'
  // Confidentialité école : un élève ne voit que les cours qui le concernent.
  const isSchoolStudent = group?.type === 'SCHOOL' && !isChef

  const rehearsals = await prisma.rehearsal.findMany({
    where: { groupId },
    orderBy: { date: 'asc' },
    include: {
      attendances: { where: { status: 'PRESENT' }, select: { userId: true, user: { select: { id: true, name: true } } } },
      evaluations: {
        include: {
          evaluator: { select: { id: true, name: true } },
          memberRatings: { include: { ratedUser: { select: { id: true, name: true } } } },
          songRatings: { include: { song: { select: { id: true, title: true } } } },
        },
      },
    },
  })

  // Statut de présence de l'utilisateur courant pour chaque répétition
  const myAttendances = await prisma.attendance.findMany({
    where: { userId, rehearsalId: { in: rehearsals.map((r) => r.id) } },
    select: { rehearsalId: true, status: true },
  })
  const myStatusByRehearsal = new Map(myAttendances.map((a) => [a.rehearsalId, a.status]))
  const myRehearsalIds = new Set(myAttendances.map((a) => a.rehearsalId))

  // Modèle prudent : on n'expose JAMAIS le détail nominatif des notes entre
  // musiciens, sauf en mode PUBLIC. On calcule des agrégats côté serveur.
  const result = rehearsals.map((r) => {
    // Agrégat des notes reçues par chaque musicien sur cette répétition
    const received = new Map<number, { name: string; sum: number; count: number }>()
    for (const ev of r.evaluations) {
      for (const mr of ev.memberRatings) {
        const cur = received.get(mr.ratedUserId) || { name: mr.ratedUser.name, sum: 0, count: 0 }
        cur.sum += mr.rating; cur.count += 1
        received.set(mr.ratedUserId, cur)
      }
    }
    const myReceived = received.get(userId)
    const myAvgReceived = myReceived && myReceived.count > 0 ? myReceived.sum / myReceived.count : null

    // Pour le chef (hors mode HIDDEN) : moyennes reçues par musicien (sans « qui a noté qui »)
    const avgReceivedByUser = (isChef && visibility !== 'HIDDEN')
      ? Array.from(received.entries()).map(([uid, v]) => ({ userId: uid, name: v.name, avg: v.sum / v.count, count: v.count }))
      : []

    const evaluations = r.evaluations.map((ev) => ({
      id: ev.id,
      evaluator: ev.evaluator,
      groupRating: ev.groupRating,
      selfRating: ev.selfRating,
      suggestion: ev.suggestion,
      songRatings: ev.songRatings,
      // détail nominatif uniquement en mode PUBLIC
      memberRatings: visibility === 'PUBLIC' ? ev.memberRatings : [],
    }))

    return {
      id: r.id, date: r.date, location: r.location, startTime: r.startTime, endTime: r.endTime, notes: r.notes,
      attendances: r.attendances,
      evaluations,
      peerVisibility: visibility,
      myAvgReceived: visibility === 'HIDDEN' ? null : myAvgReceived,
      avgReceivedByUser,
      // EN_ATTENTE (défaut) = pas encore répondu → null pour le sélecteur
      myAttendanceStatus: (() => { const s = myStatusByRehearsal.get(r.id); return s && s !== 'EN_ATTENTE' ? s : null })(),
    }
  })

  // Élève d'une école : on ne renvoie que les cours auxquels il est convié.
  const visible = isSchoolStudent ? result.filter((r) => myRehearsalIds.has(r.id)) : result

  return NextResponse.json(visible)
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

  if (!isAdmin) {
    const grp = await prisma.group.findUnique({ where: { id: groupId }, select: { createdBy: true, chefPermissions: true } })
    if (grp && !coChefCanDo(grp, userId, isAdmin, 'repetitions', 'create')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
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
    ? Array.from(new Set([...invitedMemberIds.map(Number), userId]))
    : allMembers.map((m) => m.userId)

  const invitedMembers = allMembers.filter((m) => invitedIds.includes(m.userId))

  await prisma.attendance.createMany({
    data: invitedMembers.map((m) => ({
      userId: m.userId,
      rehearsalId: rehearsal.id,
      status: 'EN_ATTENTE' as const,
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

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'
import { sendConcertNotification } from '@/lib/email'

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

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { peerRatingVisibility: true } })
  const visibility = group?.peerRatingVisibility ?? 'PRIVATE'
  const isChef = isAdmin || membership?.groupRole === 'CHEF'

  const concerts = await prisma.concert.findMany({
    where: { groupId },
    include: {
      setlist: { select: { id: true, name: true, _count: { select: { songs: true } } } },
      attendances: { where: { status: 'PRESENT' }, select: { userId: true, user: { select: { id: true, name: true } } } },
      evaluations: {
        include: {
          evaluator: { select: { id: true, name: true } },
          memberRatings: { include: { ratedUser: { select: { id: true, name: true } } } },
          songRatings: { include: { song: { select: { id: true, title: true } } } },
        },
      },
    },
    orderBy: { date: 'asc' },
  })

  const myAttendances = await prisma.concertAttendance.findMany({
    where: { userId, concertId: { in: concerts.map((c) => c.id) } },
    select: { concertId: true, status: true },
  })
  const myStatusByConcert = new Map(myAttendances.map((a) => [a.concertId, a.status]))

  const result = concerts.map((c) => {
    const received = new Map<number, { name: string; sum: number; count: number }>()
    for (const ev of c.evaluations) {
      for (const mr of ev.memberRatings) {
        const cur = received.get(mr.ratedUserId) || { name: mr.ratedUser.name, sum: 0, count: 0 }
        cur.sum += mr.rating; cur.count += 1
        received.set(mr.ratedUserId, cur)
      }
    }
    const myReceived = received.get(userId)
    const myAvgReceived = myReceived && myReceived.count > 0 ? myReceived.sum / myReceived.count : null
    const avgReceivedByUser = (isChef && visibility !== 'HIDDEN')
      ? Array.from(received.entries()).map(([uid, v]) => ({ userId: uid, name: v.name, avg: v.sum / v.count, count: v.count }))
      : []

    const evaluations = c.evaluations.map((ev) => ({
      id: ev.id, evaluator: ev.evaluator, groupRating: ev.groupRating, selfRating: ev.selfRating,
      suggestion: ev.suggestion, songRatings: ev.songRatings,
      memberRatings: visibility === 'PUBLIC' ? ev.memberRatings : [],
    }))

    return {
      id: c.id, name: c.name, date: c.date, location: c.location, notes: c.notes, isPublic: c.isPublic, setlist: c.setlist,
      address: c.address, postalCode: c.postalCode, city: c.city,
      startTime: c.startTime, soundcheckTime: c.soundcheckTime, arrivalTime: c.arrivalTime, arrivalInfo: c.arrivalInfo,
      guestsPerPerson: c.guestsPerPerson, contactName: c.contactName, contactPhone: c.contactPhone,
      attendances: c.attendances,
      evaluations,
      peerVisibility: visibility,
      myAvgReceived: visibility === 'HIDDEN' ? null : myAvgReceived,
      avgReceivedByUser,
      myAttendanceStatus: (() => { const s = myStatusByConcert.get(c.id); return s && s !== 'EN_ATTENTE' ? s : null })(),
    }
  })

  return NextResponse.json(result)
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
    if (grp && !coChefCanDo(grp, userId, isAdmin, 'concerts', 'create')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }

  const body = await req.json()
  const { name, date, location, address, postalCode, city, startTime, soundcheckTime, arrivalTime, arrivalInfo, guestsPerPerson, contactName, contactPhone, notes, setlistId, isPublic } = body

  if (!name || !date || !location) {
    return NextResponse.json({ error: 'Nom, date et lieu sont requis.' }, { status: 400 })
  }
  if (!address?.trim() || !postalCode?.trim() || !city?.trim()) {
    return NextResponse.json({ error: 'Adresse, code postal et ville sont requis.' }, { status: 400 })
  }

  const concert = await prisma.concert.create({
    data: {
      groupId,
      name,
      date: new Date(date),
      location,
      address: address.trim(),
      postalCode: postalCode.trim(),
      city: city.trim(),
      startTime: startTime?.trim() || null,
      soundcheckTime: soundcheckTime?.trim() || null,
      arrivalTime: arrivalTime?.trim() || null,
      arrivalInfo: arrivalInfo?.trim() || null,
      guestsPerPerson: (guestsPerPerson !== undefined && guestsPerPerson !== '' && guestsPerPerson !== null) ? Number(guestsPerPerson) : null,
      contactName: contactName?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
      notes: notes || null,
      setlistId: setlistId ? Number(setlistId) : null,
      isPublic: isPublic !== false,
    },
    include: { setlist: { select: { id: true, name: true, _count: { select: { songs: true } } } } },
  })

  // Email à tous les membres (sauf le créateur) pour recueillir leur présence
  try {
    const [group, members] = await Promise.all([
      prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
      prisma.groupMember.findMany({ where: { groupId }, include: { user: { select: { id: true, email: true, name: true } } } }),
    ])
    const recipients = members
      .filter((m) => m.userId !== userId)
      .map((m) => ({ email: m.user.email, name: m.user.name, userId: m.userId }))
    if (recipients.length > 0) {
      const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
      await sendConcertNotification(recipients, group?.name ?? 'Votre groupe', groupId, concert, baseUrl)
    }
  } catch (e) {
    console.error('Erreur envoi email concert:', e)
  }

  return NextResponse.json(concert, { status: 201 })
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'
import { recomputeConcertStatus } from '@/lib/concert-status'
import { geocodeConcertAddress } from '@/lib/geocode'

export async function PATCH(req: NextRequest, { params }: { params: { id: string; concertId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const concertId = Number(params.concertId)
  const isAdmin = session.user.siteRole === 'ADMIN'

  if (!isAdmin) {
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    })
    if (!membership || membership.groupRole !== 'CHEF') {
      return NextResponse.json({ error: 'Réservé au chef.' }, { status: 403 })
    }
    const grp = await prisma.group.findUnique({ where: { id: groupId }, select: { createdBy: true, chefPermissions: true } })
    if (grp && !coChefCanDo(grp, userId, isAdmin, 'concerts', 'update')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }

  const body = await req.json()
  const { name, date, location, address, postalCode, city, startTime, soundcheckTime, arrivalTime, arrivalInfo, guestsPerPerson, contactName, contactPhone, notes, setlistId, isPublic, requiredUserIds, confirmDaysBefore } = body
  const strOrNull = (v: unknown) => (typeof v === 'string' && v.trim()) ? v.trim() : null

  const locationFieldsChanged = location !== undefined || address !== undefined || postalCode !== undefined || city !== undefined
  let geocoded: Awaited<ReturnType<typeof geocodeConcertAddress>> | undefined

  if (locationFieldsChanged) {
    const current = await prisma.concert.findUnique({
      where: { id: concertId },
      select: { location: true, address: true, postalCode: true, city: true },
    })
    if (!current) return NextResponse.json({ error: 'Concert introuvable.' }, { status: 404 })
    geocoded = await geocodeConcertAddress({
      location: typeof location === 'string' ? location : current.location,
      address: address !== undefined ? strOrNull(address) : current.address,
      postalCode: postalCode !== undefined ? strOrNull(postalCode) : current.postalCode,
      city: city !== undefined ? strOrNull(city) : current.city,
    })
  }

  const concert = await prisma.concert.update({
    where: { id: concertId },
    data: {
      ...(name && { name }),
      ...(date && { date: new Date(date) }),
      ...(location && { location }),
      ...(requiredUserIds !== undefined && { requiredUserIds: (Array.isArray(requiredUserIds) && requiredUserIds.length > 0) ? JSON.stringify(requiredUserIds.map(Number).filter(Number.isFinite)) : null }),
      ...(confirmDaysBefore !== undefined && { confirmDaysBefore: (confirmDaysBefore !== '' && confirmDaysBefore !== null) ? Number(confirmDaysBefore) : null }),
      ...(address !== undefined && { address: strOrNull(address) }),
      ...(postalCode !== undefined && { postalCode: strOrNull(postalCode) }),
      ...(city !== undefined && { city: strOrNull(city) }),
      ...(locationFieldsChanged && {
        latitude: geocoded?.latitude ?? null,
        longitude: geocoded?.longitude ?? null,
        geocodedAddress: geocoded?.label ?? null,
      }),
      ...(startTime !== undefined && { startTime: strOrNull(startTime) }),
      ...(soundcheckTime !== undefined && { soundcheckTime: strOrNull(soundcheckTime) }),
      ...(arrivalTime !== undefined && { arrivalTime: strOrNull(arrivalTime) }),
      ...(arrivalInfo !== undefined && { arrivalInfo: strOrNull(arrivalInfo) }),
      ...(guestsPerPerson !== undefined && { guestsPerPerson: (guestsPerPerson !== '' && guestsPerPerson !== null) ? Number(guestsPerPerson) : null }),
      ...(contactName !== undefined && { contactName: strOrNull(contactName) }),
      ...(contactPhone !== undefined && { contactPhone: strOrNull(contactPhone) }),
      notes: notes !== undefined ? (notes || null) : undefined,
      setlistId: setlistId !== undefined ? (setlistId ? Number(setlistId) : null) : undefined,
      ...(isPublic !== undefined && { isPublic }),
    },
    include: {
      setlist: { select: { id: true, name: true, _count: { select: { songs: true } } } },
    },
  })

  // Recalcul du statut de validation si la liste des obligatoires a changé
  if (requiredUserIds !== undefined) {
    const ids = (Array.isArray(requiredUserIds) ? requiredUserIds.map(Number).filter(Number.isFinite) : [])
    if (ids.length === 0) {
      await prisma.concert.update({ where: { id: concertId }, data: { status: 'CONFIRMED', cancelledAt: null, validationReminderSentAt: null } })
    } else {
      await recomputeConcertStatus(concertId)
    }
  }

  return NextResponse.json(concert)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; concertId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const concertId = Number(params.concertId)
  const isAdmin = session.user.siteRole === 'ADMIN'

  if (!isAdmin) {
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    })
    if (!membership || membership.groupRole !== 'CHEF') {
      return NextResponse.json({ error: 'Réservé au chef.' }, { status: 403 })
    }
    const grp = await prisma.group.findUnique({ where: { id: groupId }, select: { createdBy: true, chefPermissions: true } })
    if (grp && !coChefCanDo(grp, userId, isAdmin, 'concerts', 'delete')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }

  await prisma.concert.delete({ where: { id: concertId } })

  return NextResponse.json({ ok: true })
}

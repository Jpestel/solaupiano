import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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

  const concerts = await prisma.concert.findMany({
    where: { groupId },
    include: { setlist: { select: { id: true, name: true, _count: { select: { songs: true } } } } },
    orderBy: { date: 'asc' },
  })

  return NextResponse.json(concerts)
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
  const { name, date, location, notes, setlistId, isPublic } = body

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
      setlistId: setlistId ? Number(setlistId) : null,
      isPublic: isPublic !== false,
    },
    include: { setlist: { select: { id: true, name: true, _count: { select: { songs: true } } } } },
  })

  return NextResponse.json(concert, { status: 201 })
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'

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
  const { name, date, location, notes, setlistId, isPublic } = body

  const concert = await prisma.concert.update({
    where: { id: concertId },
    data: {
      ...(name && { name }),
      ...(date && { date: new Date(date) }),
      ...(location && { location }),
      notes: notes !== undefined ? (notes || null) : undefined,
      setlistId: setlistId !== undefined ? (setlistId ? Number(setlistId) : null) : undefined,
      ...(isPublic !== undefined && { isPublic }),
    },
    include: {
      setlist: { select: { id: true, name: true, _count: { select: { songs: true } } } },
    },
  })

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

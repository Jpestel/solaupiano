import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function loadPoll(pollId: number) {
  return prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      options: {
        orderBy: [{ date: 'asc' }, { order: 'asc' }],
        include: { votes: { include: { user: { select: { id: true, name: true } } } } },
      },
    },
  })
}

export async function GET(_req: NextRequest, { params }: { params: { pollId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const pollId = Number(params.pollId)

  const poll = await loadPoll(pollId)
  if (!poll) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId: poll.groupId } } })
  if (!isAdmin && !membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const members = await prisma.groupMember.findMany({
    where: { groupId: poll.groupId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { joinedAt: 'asc' },
  })

  return NextResponse.json({
    poll: { id: poll.id, groupId: poll.groupId, title: poll.title, description: poll.description, closed: poll.closed, createdById: poll.createdById, createdAt: poll.createdAt },
    options: poll.options.map((o) => ({ id: o.id, date: o.date, note: o.note, votes: o.votes.map((v) => ({ userId: v.userId, name: v.user.name, status: v.status })) })),
    members: members.map((m) => ({ userId: m.userId, name: m.user.name, role: m.groupRole })),
    isChef: isAdmin || membership?.groupRole === 'CHEF',
  })
}

async function requireChef(session: any, groupId: number) {
  if (session.user.siteRole === 'ADMIN') return true
  const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId: Number(session.user.id), groupId } } })
  return m?.groupRole === 'CHEF'
}

export async function PATCH(req: NextRequest, { params }: { params: { pollId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const pollId = Number(params.pollId)
  const poll = await prisma.poll.findUnique({ where: { id: pollId }, select: { groupId: true } })
  if (!poll) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  if (!await requireChef(session, poll.groupId)) return NextResponse.json({ error: 'Réservé au chef.' }, { status: 403 })

  const { title, description, closed } = await req.json()
  const data: Record<string, unknown> = {}
  if (typeof title === 'string' && title.trim()) data.title = title.trim().slice(0, 191)
  if (description !== undefined) data.description = description?.trim() || null
  if (typeof closed === 'boolean') data.closed = closed

  const updated = await prisma.poll.update({ where: { id: pollId }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { pollId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const pollId = Number(params.pollId)
  const poll = await prisma.poll.findUnique({ where: { id: pollId }, select: { groupId: true } })
  if (!poll) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  if (!await requireChef(session, poll.groupId)) return NextResponse.json({ error: 'Réservé au chef.' }, { status: 403 })

  await prisma.poll.delete({ where: { id: pollId } })
  return NextResponse.json({ success: true })
}

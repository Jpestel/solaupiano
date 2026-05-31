import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendPollCreatedEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

function toDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T00:00:00.000Z`)
  return isNaN(d.getTime()) ? null : d
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  if (!isAdmin) {
    const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
    if (!m) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const polls = await prisma.poll.findMany({
    where: { groupId },
    orderBy: [{ closed: 'asc' }, { createdAt: 'desc' }],
    include: { _count: { select: { options: true } }, options: { select: { _count: { select: { votes: true } } } } },
  })
  const result = polls.map((p) => ({
    id: p.id, title: p.title, description: p.description, closed: p.closed, createdAt: p.createdAt,
    optionCount: p._count.options,
    voteCount: p.options.reduce((a, o) => a + o._count.votes, 0),
  }))
  return NextResponse.json(result)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  if (!isAdmin) {
    const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
    if (!m || m.groupRole !== 'CHEF') return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
  }

  const { title, description, options } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 })
  if (!Array.isArray(options) || options.length === 0) return NextResponse.json({ error: 'Ajoutez au moins une date.' }, { status: 400 })

  const parsed = options
    .map((o: any, i: number) => ({ date: toDate(String(o.date || '')), note: o.note?.trim()?.slice(0, 120) || null, order: i }))
    .filter((o) => o.date) as { date: Date; note: string | null; order: number }[]
  if (parsed.length === 0) return NextResponse.json({ error: 'Aucune date valide.' }, { status: 400 })

  const poll = await prisma.poll.create({
    data: {
      groupId, title: title.trim().slice(0, 191), description: description?.trim() || null, createdById: userId,
      options: { create: parsed },
    },
  })

  // Notifie par e-mail les membres du groupe (sauf le créateur)
  const [group, members] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
    prisma.groupMember.findMany({
      where: { groupId, userId: { not: userId } },
      include: { user: { select: { email: true, name: true } } },
    }),
  ])
  if (group && members.length > 0) {
    const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
    sendPollCreatedEmail(
      members.map((m) => ({ email: m.user.email, name: m.user.name })),
      group.name,
      groupId,
      { id: poll.id, title: poll.title, options: parsed.map((p) => ({ date: p.date, note: p.note })) },
      baseUrl
    ).catch(console.error)
  }

  return NextResponse.json(poll, { status: 201 })
}

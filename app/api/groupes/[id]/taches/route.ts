import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { groupContext } from '@/lib/group-access'

export const dynamic = 'force-dynamic'

// GET : listes de tâches du groupe (avec tâches + assignés). Pour le sélecteur de
// date, renvoie aussi les répétitions et concerts à venir. Les membres voient tout
// (utile pour savoir qui fait quoi) ; seul le chef peut créer/modifier.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const groupId = Number(params.id)
  const ctx = await groupContext(groupId)
  if (!ctx) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const now = new Date()
  const [lists, rehearsals, concerts, members] = await Promise.all([
    prisma.taskList.findMany({
      where: { groupId },
      orderBy: [{ dueDate: 'asc' }],
      include: {
        tasks: {
          orderBy: { createdAt: 'asc' },
          include: { assignees: { select: { userId: true } } },
        },
      },
    }),
    prisma.rehearsal.findMany({
      where: { groupId, date: { gte: now } },
      orderBy: { date: 'asc' },
      take: 30,
      select: { id: true, date: true, startTime: true, location: true },
    }),
    prisma.concert.findMany({
      where: { groupId, date: { gte: now }, status: { not: 'CANCELLED' } },
      orderBy: { date: 'asc' },
      take: 30,
      select: { id: true, date: true, name: true, location: true },
    }),
    prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { user: { name: 'asc' } },
    }),
  ])

  return NextResponse.json({
    isChef: ctx.isChef,
    currentUserId: ctx.userId,
    lists,
    rehearsals,
    concerts,
    members: members.map((m) => ({ id: m.user.id, name: m.user.name, role: m.groupRole })),
  })
}

// POST : le chef crée une nouvelle liste de tâches.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const groupId = Number(params.id)
  const ctx = await groupContext(groupId)
  if (!ctx) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  if (!ctx.isChef) return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { title, eventType, rehearsalId, concertId } = body
  if (!title?.trim()) return NextResponse.json({ error: 'Un titre est requis.' }, { status: 400 })

  // Détermine la date cible : depuis l'événement lié, sinon depuis dueDate fournie.
  let dueDate: Date | null = null
  const type = ['rehearsal', 'concert', 'other'].includes(eventType) ? eventType : 'other'
  if (type === 'rehearsal' && rehearsalId) {
    const r = await prisma.rehearsal.findFirst({ where: { id: Number(rehearsalId), groupId }, select: { date: true } })
    dueDate = r?.date ?? null
  } else if (type === 'concert' && concertId) {
    const c = await prisma.concert.findFirst({ where: { id: Number(concertId), groupId }, select: { date: true } })
    dueDate = c?.date ?? null
  } else if (body.dueDate) {
    const d = new Date(body.dueDate)
    if (!isNaN(d.getTime())) dueDate = d
  }
  if (!dueDate) return NextResponse.json({ error: 'Une date est requise.' }, { status: 400 })

  const list = await prisma.taskList.create({
    data: {
      groupId,
      title: title.trim(),
      dueDate,
      eventType: type,
      rehearsalId: type === 'rehearsal' && rehearsalId ? Number(rehearsalId) : null,
      concertId: type === 'concert' && concertId ? Number(concertId) : null,
      createdBy: ctx.userId,
    },
  })
  return NextResponse.json(list, { status: 201 })
}

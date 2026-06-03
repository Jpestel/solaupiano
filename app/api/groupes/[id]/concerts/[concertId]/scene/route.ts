import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: { id: string; concertId: string } }

async function checkAccess(userId: number, groupId: number, isAdmin: boolean) {
  if (isAdmin) return 'CHEF'
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!membership) return null
  return membership.groupRole
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const concertId = Number(params.concertId)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const role = await checkAccess(userId, groupId, isAdmin)
  if (!role) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const [concert, stageLayout, members] = await Promise.all([
    prisma.concert.findFirst({ where: { id: concertId, groupId }, select: { id: true, name: true, date: true, location: true } }),
    prisma.stageLayout.findUnique({ where: { concertId } }),
    prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            stageFigure: true,
            instruments: { include: { instrument: { select: { name: true } } } },
          },
        },
      },
    }),
  ])

  if (!concert) return NextResponse.json({ error: 'Concert introuvable.' }, { status: 404 })

  const memberList = members.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    avatarUrl: m.user.avatarUrl,
    figure: m.user.stageFigure || 'MAN',
    groupRole: m.groupRole,
    instruments: m.user.instruments.map((ui) => ui.instrument.name),
  }))

  return NextResponse.json({
    concert,
    members: memberList,
    layout: stageLayout?.content ?? null,
    role,
  })
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const concertId = Number(params.concertId)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const role = await checkAccess(userId, groupId, isAdmin)
  if (role !== 'CHEF') return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })

  const concert = await prisma.concert.findFirst({ where: { id: concertId, groupId }, select: { id: true } })
  if (!concert) return NextResponse.json({ error: 'Concert introuvable.' }, { status: 404 })

  const { content } = await req.json()

  const layout = await prisma.stageLayout.upsert({
    where: { concertId },
    update: { content },
    create: { concertId, content },
  })

  return NextResponse.json(layout)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const concertId = Number(params.concertId)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const role = await checkAccess(userId, groupId, isAdmin)
  if (role !== 'CHEF') return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })

  await prisma.stageLayout.deleteMany({ where: { concertId } })
  return NextResponse.json({ ok: true })
}

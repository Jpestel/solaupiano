import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function checkAccess(userId: number, groupId: number, isAdmin: boolean) {
  if (isAdmin) return 'CHEF'
  const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
  return m?.groupRole ?? null
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const role = await checkAccess(userId, groupId, isAdmin)
  if (!role) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const [group, rider, members] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
    prisma.techRider.findUnique({ where: { groupId } }),
    prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true, name: true,
            instruments: { include: { instrument: { select: { name: true } } } },
          },
        },
      },
    }),
  ])

  if (!group) return NextResponse.json({ error: 'Groupe introuvable.' }, { status: 404 })

  return NextResponse.json({
    groupName: group.name,
    role,
    rider: rider ?? null,
    shareToken: rider?.shareToken ?? null,
    members: members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      groupRole: m.groupRole,
      instruments: m.user.instruments.map((ui) => ui.instrument.name),
    })),
  })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const role = await checkAccess(userId, groupId, isAdmin)
  if (role !== 'CHEF') return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })

  const { content } = await req.json()

  const rider = await prisma.techRider.upsert({
    where: { groupId },
    update: { content },
    create: { groupId, content },
  })

  return NextResponse.json(rider)
}

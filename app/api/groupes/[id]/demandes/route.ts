import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — chef lists pending join requests for this group
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)

  const isAdmin = session.user.siteRole === 'ADMIN'
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!isAdmin && (!membership || membership.groupRole !== 'CHEF')) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const requests = await prisma.joinRequest.findMany({
    where: { groupId, status: 'PENDING' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          instruments: { include: { instrument: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(requests)
}

// POST — user sends a join request
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)

  const alreadyMember = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (alreadyMember) {
    return NextResponse.json({ error: 'Vous êtes déjà membre de ce groupe.' }, { status: 409 })
  }

  const existing = await prisma.joinRequest.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (existing) {
    if (existing.status === 'PENDING') {
      return NextResponse.json({ error: 'Une demande est déjà en attente.' }, { status: 409 })
    }
    // Allow re-request if previously rejected
    const updated = await prisma.joinRequest.update({
      where: { userId_groupId: { userId, groupId } },
      data: { status: 'PENDING', message: (await req.json()).message || null },
    })
    return NextResponse.json(updated, { status: 200 })
  }

  const body = await req.json().catch(() => ({}))
  const request = await prisma.joinRequest.create({
    data: { userId, groupId, message: body.message || null },
  })

  return NextResponse.json(request, { status: 201 })
}

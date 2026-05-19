import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function checkAccess(session: Awaited<ReturnType<typeof getServerSession>>, groupId: number) {
  if (!session) return false
  if (session.user.siteRole === 'ADMIN') return true
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: Number(session.user.id), groupId } },
  })
  return membership?.groupRole === 'CHEF'
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const groupId = Number(params.id)
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: Number(session.user.id), groupId } },
  })
  if (!membership && session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: {
      user: {
        include: { instruments: { include: { instrument: true } } },
      },
    },
  })

  return NextResponse.json(members)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!await checkAccess(session, Number(params.id))) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { userId, groupRole = 'MEMBRE' } = await req.json()
  const groupId = Number(params.id)

  const member = await prisma.groupMember.upsert({
    where: { userId_groupId: { userId: Number(userId), groupId } },
    update: { groupRole },
    create: { userId: Number(userId), groupId, groupRole },
  })

  return NextResponse.json(member, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!await checkAccess(session, Number(params.id))) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { userId } = await req.json()
  const groupId = Number(params.id)

  await prisma.groupMember.delete({
    where: { userId_groupId: { userId: Number(userId), groupId } },
  })

  return NextResponse.json({ success: true })
}

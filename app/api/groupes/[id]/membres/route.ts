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

  const targetUser = await prisma.user.findUnique({ where: { id: Number(userId) } })
  if (targetUser?.siteRole === 'ADMIN') {
    return NextResponse.json({ error: 'L\'administrateur du site ne peut pas être membre d\'un groupe.' }, { status: 400 })
  }

  const member = await prisma.groupMember.upsert({
    where: { userId_groupId: { userId: Number(userId), groupId } },
    update: { groupRole },
    create: { userId: Number(userId), groupId, groupRole },
  })

  return NextResponse.json(member, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const groupId = Number(params.id)
  const { userId } = await req.json()
  const targetUserId = Number(userId)
  const requesterId = Number(session.user.id)

  // Allow self-removal OR chef/admin removing someone else
  const isSelf = targetUserId === requesterId
  if (!isSelf && !await checkAccess(session, groupId)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } })

  // A CHEF cannot leave while other members still exist
  if (isSelf) {
    const targetMembership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    })
    if (targetMembership?.groupRole === 'CHEF') {
      const otherMembersCount = await prisma.groupMember.count({
        where: { groupId, userId: { not: targetUserId } },
      })
      if (otherMembersCount > 0) {
        return NextResponse.json(
          { error: 'En tant que chef d\'orchestre, vous ne pouvez pas quitter ce groupe tant qu\'il y a d\'autres membres.' },
          { status: 403 }
        )
      }
    }
  }

  let groupDeleted = false

  await prisma.$transaction(async (tx) => {
    await tx.groupMember.delete({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    })

    const remaining = await tx.groupMember.count({ where: { groupId } })

    if (remaining === 0) {
      // Explicitly remove child records before deleting the group
      const songIds = (await tx.song.findMany({ where: { groupId }, select: { id: true } })).map((s) => s.id)
      const rehearsalIds = (await tx.rehearsal.findMany({ where: { groupId }, select: { id: true } })).map((r) => r.id)

      await tx.resource.deleteMany({ where: { songId: { in: songIds } } })
      await tx.rehearsalSong.deleteMany({ where: { rehearsalId: { in: rehearsalIds } } })
      await tx.attendance.deleteMany({ where: { rehearsalId: { in: rehearsalIds } } })
      await tx.rehearsal.deleteMany({ where: { groupId } })
      await tx.song.deleteMany({ where: { groupId } })
      await tx.concert.deleteMany({ where: { groupId } })
      await tx.joinRequest.deleteMany({ where: { groupId } })
      await tx.group.delete({ where: { id: groupId } })
      groupDeleted = true
    } else if (isSelf && group) {
      await tx.groupMemberHistory.create({
        data: { userId: targetUserId, groupId, groupName: group.name },
      })
      await tx.joinRequest.deleteMany({ where: { userId: targetUserId, groupId } })
    }
  })

  return NextResponse.json({ success: true, groupDeleted })
}

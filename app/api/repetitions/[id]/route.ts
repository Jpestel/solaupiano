import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const rehearsalId = Number(params.id)

  const rehearsal = await prisma.rehearsal.findUnique({
    where: { id: rehearsalId },
    include: {
      songs: {
        include: {
          song: {
            include: { resources: { orderBy: { createdAt: 'asc' } } },
          },
        },
        orderBy: [{ position: 'asc' }, { songId: 'asc' }],
      },
      attendances: { include: { user: { select: { id: true, name: true } } } },
      setlist: { select: { id: true, name: true } },
    },
  })

  if (!rehearsal) return NextResponse.json({ error: 'Répétition introuvable.' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: rehearsal.groupId } },
  })
  if (!isAdmin && !membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const isChef = isAdmin || membership?.groupRole === 'CHEF'
  const songIds = rehearsal.songs.map((rs) => rs.songId)

  // My own progress
  const progress = await prisma.userSongProgress.findMany({
    where: { userId, songId: { in: songIds } },
  })
  const progressMap = Object.fromEntries(progress.map((p) => [p.songId, p.status]))
  const percentMap = Object.fromEntries(progress.map((p) => [p.songId, p.percent]))

  // Chef: also fetch all members' progress for each song
  let memberProgressBySong: Record<number, { userId: number; userName: string; status: string; percent: number }[]> = {}
  if (isChef && songIds.length > 0) {
    const [members, allProgress] = await Promise.all([
      prisma.groupMember.findMany({
        where: { groupId: rehearsal.groupId },
        include: { user: { select: { id: true, name: true } } },
      }),
      prisma.userSongProgress.findMany({
        where: { songId: { in: songIds } },
        select: { userId: true, songId: true, status: true, percent: true },
      }),
    ])
    // Build progress map by song
    const progressBySong: Record<number, Record<number, { status: string; percent: number }>> = {}
    for (const p of allProgress) {
      if (!progressBySong[p.songId]) progressBySong[p.songId] = {}
      progressBySong[p.songId][p.userId] = { status: p.status, percent: p.percent }
    }
    // For each song, combine all members with their status (default A_TRAVAILLER)
    for (const songId of songIds) {
      memberProgressBySong[songId] = members.map((m) => ({
        userId: m.userId,
        userName: m.user.name,
        status: progressBySong[songId]?.[m.userId]?.status ?? 'A_TRAVAILLER',
        percent: progressBySong[songId]?.[m.userId]?.percent ?? 0,
      }))
    }
  }

  return NextResponse.json({
    ...rehearsal,
    songs: rehearsal.songs.map((rs) => ({
      ...rs,
      userProgress: progressMap[rs.songId] ?? 'A_TRAVAILLER',
      userProgressPercent: percentMap[rs.songId] ?? 0,
      membersProgress: memberProgressBySong[rs.songId] ?? null,
    })),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const rehearsalId = Number(params.id)

  const rehearsal = await prisma.rehearsal.findUnique({ where: { id: rehearsalId } })
  if (!rehearsal) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: rehearsal.groupId } },
  })
  if (!isAdmin && (!membership || membership.groupRole !== 'CHEF')) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  if (!isAdmin) {
    const grp = await prisma.group.findUnique({ where: { id: rehearsal.groupId }, select: { createdBy: true, chefPermissions: true } })
    if (grp && !coChefCanDo(grp, userId, isAdmin, 'repetitions', 'update')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }

  const body = await req.json()
  const updated = await prisma.rehearsal.update({
    where: { id: rehearsalId },
    data: {
      date: body.date ? new Date(body.date) : undefined,
      location: body.location,
      startTime: body.startTime,
      endTime: body.endTime,
      notes: body.notes,
      setlistId: body.setlistId !== undefined ? (body.setlistId ? Number(body.setlistId) : null) : undefined,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const rehearsalId = Number(params.id)

  const rehearsal = await prisma.rehearsal.findUnique({ where: { id: rehearsalId } })
  if (!rehearsal) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: rehearsal.groupId } },
  })
  if (!isAdmin && (!membership || membership.groupRole !== 'CHEF')) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  if (!isAdmin) {
    const grp = await prisma.group.findUnique({ where: { id: rehearsal.groupId }, select: { createdBy: true, chefPermissions: true } })
    if (grp && !coChefCanDo(grp, userId, isAdmin, 'repetitions', 'delete')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }

  await prisma.rehearsal.delete({ where: { id: rehearsalId } })
  return NextResponse.json({ success: true })
}

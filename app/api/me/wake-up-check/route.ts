import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const now    = new Date()

  // ── Groupes de l'utilisateur ──────────────────────────────────────────────
  const memberships = await prisma.groupMember.findMany({
    where:  { userId },
    select: { groupId: true },
  })
  const groupIds = memberships.map(m => m.groupId)
  if (!groupIds.length) return NextResponse.json({ missingPresences: [], nextRehearsal: null, groupsLatestMessage: [] })

  // ── 1. Présences manquantes ───────────────────────────────────────────────
  // Répétitions à venir où l'utilisateur n'a pas de record Attendance
  const upcomingRehearsals = await prisma.rehearsal.findMany({
    where:   { groupId: { in: groupIds }, date: { gte: now } },
    include: {
      attendances: { where: { userId } },
      group:       { select: { id: true, name: true } },
    },
    orderBy: { date: 'asc' },
    take:    20,
  })

  const missingPresences = upcomingRehearsals
    .filter(r => r.attendances.length === 0)
    .slice(0, 5)
    .map(r => ({
      rehearsalId: r.id,
      groupId:     r.groupId,
      groupName:   r.group.name,
      date:        r.date.toISOString(),
      location:    r.location,
    }))

  // ── 2. Prochaine répétition avec morceaux sans progression ────────────────
  const nextWithSongs = await prisma.rehearsal.findFirst({
    where: {
      groupId: { in: groupIds },
      date:    { gte: now },
      songs:   { some: {} },
    },
    include: {
      group: { select: { id: true, name: true } },
      songs: {
        include: {
          song: {
            include: {
              userProgress: { where: { userId } },
            },
          },
        },
      },
    },
    orderBy: { date: 'asc' },
  })

  let nextRehearsal: {
    rehearsalId: number; groupId: number; groupName: string
    date: string; location: string; totalSongs: number; pendingSongs: number
  } | null = null

  if (nextWithSongs) {
    const pending = nextWithSongs.songs.filter(
      rs => rs.song.userProgress.length === 0
    ).length
    nextRehearsal = {
      rehearsalId: nextWithSongs.id,
      groupId:     nextWithSongs.groupId,
      groupName:   nextWithSongs.group.name,
      date:        nextWithSongs.date.toISOString(),
      location:    nextWithSongs.location,
      totalSongs:  nextWithSongs.songs.length,
      pendingSongs: pending,
    }
  }

  // ── 3. Dernier message dans chaque groupe (pour comparaison côté client) ──
  // On récupère le dernier message par groupe pour que le client compare
  // avec son localStorage tchat_last_read_xxx
  const latestMessages = await prisma.groupMessage.findMany({
    where:    { groupId: { in: groupIds } },
    distinct: ['groupId'],
    orderBy:  { createdAt: 'desc' },
    select: {
      id:        true,
      groupId:   true,
      createdAt: true,
      group:     { select: { name: true } },
    },
  })

  const groupsLatestMessage = latestMessages.map(m => ({
    groupId:       m.groupId,
    groupName:     m.group.name,
    lastMessageId: m.id,
    lastMessageAt: m.createdAt.toISOString(),
  }))

  return NextResponse.json({ missingPresences, nextRehearsal, groupsLatestMessage })
}

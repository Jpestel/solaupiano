import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendAdminLoginNotification } from '@/lib/email'

export const dynamic = 'force-dynamic'

const PLAN_LABELS: Record<string, string> = { MUSICIEN: 'Musicien', CREATEUR: "Chef d'orchestre" }
const ACTIVITY_ALERT_COOLDOWN_MS = 12 * 60 * 60 * 1000

async function auditMemberActivity(userId: number, now: Date) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        siteRole: true,
        userPlan: true,
        adminLoginAlertEnabled: true,
        adminLastActivityAlertAt: true,
        groups: { select: { group: { select: { name: true } } } },
      },
    })

    if (!user || user.siteRole === 'ADMIN') return

    await prisma.user.update({ where: { id: userId }, data: { lastActiveAt: now } })

    if (!user.email || !user.adminLoginAlertEnabled) return

    const lastAlertAt = user.adminLastActivityAlertAt?.getTime() ?? 0
    if (now.getTime() - lastAlertAt < ACTIVITY_ALERT_COOLDOWN_MS) return

    const admins = await prisma.user.findMany({ where: { siteRole: 'ADMIN' }, select: { email: true } })
    const adminEmails = admins.map((a) => a.email).filter((email): email is string => !!email)
    if (!adminEmails.length) return

    await sendAdminLoginNotification(
      adminEmails,
      {
        name: user.name || user.email,
        email: user.email,
        role: user.siteRole,
        plan: PLAN_LABELS[user.userPlan] || user.userPlan,
        groups: user.groups.map((g) => g.group.name),
      },
      now,
      process.env.NEXTAUTH_URL || 'https://solaupiano.fr',
    )

    await prisma.user.update({ where: { id: userId }, data: { adminLastActivityAlertAt: now } })
  } catch (error) {
    console.error('admin activity notification', error)
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  // L'admin du site n'est pas un participant : pas de nudges « Bon retour »
  // (présence, progression, sondages, tchat) — notamment pour les groupes de test.
  if (session.user.siteRole === 'ADMIN') {
    return NextResponse.json({ missingPresences: [], nextRehearsal: null, groupsLatestMessage: [], pendingPolls: [] })
  }

  const userId = Number(session.user.id)
  const now    = new Date()
  await auditMemberActivity(userId, now)

  // ── Groupes de l'utilisateur ──────────────────────────────────────────────
  const memberships = await prisma.groupMember.findMany({
    where:  { userId },
    select: { groupId: true },
  })
  const groupIds = memberships.map(m => m.groupId)
  if (!groupIds.length) return NextResponse.json({ missingPresences: [], nextRehearsal: null, groupsLatestMessage: [], pendingPolls: [] })

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
    // EN_ATTENTE = statut par défaut à la création → pas encore répondu.
    // PRESENT / ABSENT / INCERTAIN sont des réponses actives.
    .filter(r => r.attendances.length === 0 || r.attendances[0]?.status === 'EN_ATTENTE')
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
      rs =>
        rs.song.userProgress.length === 0 ||
        rs.song.userProgress[0]?.status === 'A_TRAVAILLER'
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

  // ── 4. Sondages ouverts non (entièrement) répondus ────────────────────────
  const openPolls = await prisma.poll.findMany({
    where: { groupId: { in: groupIds }, closed: false },
    include: {
      group:   { select: { name: true } },
      _count:  { select: { options: true } },
      options: { select: { votes: { where: { userId }, select: { id: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const pendingPolls = openPolls
    .map(p => ({
      id:        p.id,
      groupId:   p.groupId,
      groupName: p.group.name,
      title:     p.title,
      total:     p._count.options,
      answered:  p.options.filter(o => o.votes.length > 0).length,
    }))
    .filter(p => p.answered < p.total)
    .slice(0, 5)

  return NextResponse.json({ missingPresences, nextRehearsal, groupsLatestMessage, pendingPolls })
}

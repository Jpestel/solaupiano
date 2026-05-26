import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolvePermissions } from '@/lib/permissions'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const groupId = Number(params.id)

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!isAdmin && !membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { plan: true, createdBy: true, chefPermissions: true },
  })
  if (!group) return NextResponse.json({ error: 'Groupe introuvable.' }, { status: 404 })

  // Vérifier accès aux stats
  const isChef = isAdmin || membership?.groupRole === 'CHEF'
  if (!isChef) {
    // Membres simples : vérifier permissions co-chef (non applicable ici, stats = chef only)
    return NextResponse.json({ error: 'Accès réservé aux chefs.' }, { status: 403 })
  }

  // Vérifier si le plan inclut les stats
  const plan = await prisma.plan.findUnique({ where: { key: group.plan } })
  const isFounder = isAdmin || group.createdBy === userId
  if (!isFounder) {
    const perms = resolvePermissions(group.chefPermissions)
    if (!perms.stats.view) {
      return NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 })
    }
  }
  if (!isAdmin && plan && !plan.hasStats) {
    return NextResponse.json({ error: 'MODULE_LOCKED', planLabel: plan.label }, { status: 403 })
  }

  // ── Fetch all data in parallel ──────────────────────────────────────────
  const [rehearsals, members, songs, resources] = await Promise.all([
    prisma.rehearsal.findMany({
      where: { groupId },
      include: {
        attendances: { select: { userId: true, status: true } },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    }),
    prisma.song.findMany({
      where: { groupId },
      include: {
        userProgress: { select: { userId: true, status: true } },
      },
    }),
    prisma.resource.findMany({
      where: { song: { groupId } },
      select: { type: true, fileSize: true },
    }),
  ])

  const memberIds = members.map((m) => m.userId)
  const pastRehearsals = rehearsals.filter((r) => r.date <= new Date())

  // ── KPIs ────────────────────────────────────────────────────────────────
  const totalRehearsals = pastRehearsals.length
  const totalMembers = members.length
  const totalSongs = songs.length

  // Taux de présence global
  let totalPresent = 0, totalInvites = 0
  for (const r of pastRehearsals) {
    for (const a of r.attendances) {
      if (memberIds.includes(a.userId)) {
        totalInvites++
        if (a.status === 'PRESENT') totalPresent++
      }
    }
  }
  const globalAttendanceRate = totalInvites > 0 ? Math.round((totalPresent / totalInvites) * 100) : 0

  // ── Présence par répétition (12 dernières) ──────────────────────────────
  const attendanceByRehearsal = pastRehearsals.slice(0, 12).map((r) => {
    const relevant = r.attendances.filter((a) => memberIds.includes(a.userId))
    const present = relevant.filter((a) => a.status === 'PRESENT').length
    const absent = relevant.filter((a) => a.status === 'ABSENT').length
    const incertain = relevant.filter((a) => a.status === 'INCERTAIN').length
    const total = relevant.length || totalMembers
    return {
      id: r.id,
      date: r.date.toISOString(),
      title: r.title || format(r.date, 'd MMM', { locale: fr }),
      label: format(r.date, 'd MMM yy', { locale: fr }),
      presentCount: present,
      absentCount: absent,
      incertainCount: incertain,
      totalMembers: total,
      rate: total > 0 ? Math.round((present / total) * 100) : 0,
    }
  }).reverse()

  // ── Présence par membre ─────────────────────────────────────────────────
  const attendanceByMember = members.map((m) => {
    let present = 0, absent = 0, incertain = 0, total = 0
    for (const r of pastRehearsals) {
      const a = r.attendances.find((att) => att.userId === m.userId)
      if (a) {
        total++
        if (a.status === 'PRESENT') present++
        else if (a.status === 'ABSENT') absent++
        else incertain++
      }
    }
    return {
      userId: m.userId,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      groupRole: m.groupRole,
      present,
      absent,
      incertain,
      total,
      rate: total > 0 ? Math.round((present / total) * 100) : null,
    }
  }).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1))

  // ── Répertoire par niveau de maîtrise ───────────────────────────────────
  const levelCounts = { A_TRAVAILLER: 0, EN_COURS: 0, MAITRISE: 0, NON_EVALUE: 0 }
  for (const song of songs) {
    if (song.userProgress.length === 0) {
      levelCounts.NON_EVALUE++
    } else {
      // Niveau moyen du groupe pour ce morceau
      const hasM = song.userProgress.some((p) => p.status === 'MAITRISE')
      const hasEC = song.userProgress.some((p) => p.status === 'EN_COURS')
      if (hasM && !hasEC && !song.userProgress.some((p) => p.status === 'A_TRAVAILLER')) {
        levelCounts.MAITRISE++
      } else if (hasEC || hasM) {
        levelCounts.EN_COURS++
      } else {
        levelCounts.A_TRAVAILLER++
      }
    }
  }
  const songsByLevel = [
    { level: 'MAITRISE',     label: 'Maîtrisé',        count: levelCounts.MAITRISE,     color: '#22c55e' },
    { level: 'EN_COURS',     label: 'En cours',         count: levelCounts.EN_COURS,     color: '#f59e0b' },
    { level: 'A_TRAVAILLER', label: 'À travailler',     count: levelCounts.A_TRAVAILLER, color: '#ef4444' },
    { level: 'NON_EVALUE',   label: 'Non évalué',       count: levelCounts.NON_EVALUE,   color: '#d1d5db' },
  ]

  // ── Répétitions par mois (6 derniers) ───────────────────────────────────
  const rehearsalsByMonth = []
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(new Date(), i)
    const start = startOfMonth(date)
    const end = endOfMonth(date)
    const count = pastRehearsals.filter((r) => r.date >= start && r.date <= end).length
    rehearsalsByMonth.push({
      month: format(date, 'MMM yy', { locale: fr }),
      count,
    })
  }

  // ── Ressources par type ──────────────────────────────────────────────────
  const typeMap: Record<string, { count: number; totalSize: number }> = {}
  for (const r of resources) {
    if (!typeMap[r.type]) typeMap[r.type] = { count: 0, totalSize: 0 }
    typeMap[r.type].count++
    typeMap[r.type].totalSize += Number(r.fileSize ?? 0)
  }
  const resourcesByType = Object.entries(typeMap).map(([type, v]) => ({ type, ...v }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({
    // KPIs
    totalRehearsals,
    globalAttendanceRate,
    totalSongs,
    totalMembers,
    // Charts
    attendanceByRehearsal,
    attendanceByMember,
    songsByLevel,
    rehearsalsByMonth,
    resourcesByType,
  })
}

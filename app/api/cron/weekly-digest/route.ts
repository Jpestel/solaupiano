import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWeeklyDigestEmail, DigestGroup } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Protect with CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Members who haven't logged in for 7+ days AND haven't opted out
  const members = await prisma.user.findMany({
    where: {
      weeklyDigestOptOut: false,
      emailVerified: { not: null },
      OR: [
        { lastLoginAt: null },
        { lastLoginAt: { lt: sevenDaysAgo } },
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      groups: {
        select: {
          groupId: true,
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

  let sent = 0
  let skipped = 0

  for (const member of members) {
    const digestGroups: DigestGroup[] = []

    for (const membership of member.groups) {
      const groupId = membership.groupId
      const groupName = membership.group.name

      const [newGrilles, newResources, newSongs, upcomingRehearsals] = await Promise.all([
        // New chord charts created this week
        prisma.chordChart.findMany({
          where: { groupId, createdAt: { gte: sevenDaysAgo } },
          select: { id: true, title: true },
          orderBy: { createdAt: 'desc' },
        }),
        // New resources (files, links) added this week
        prisma.resource.findMany({
          where: {
            song: { groupId },
            createdAt: { gte: sevenDaysAgo },
          },
          select: {
            id: true,
            name: true,
            type: true,
            song: { select: { title: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        // New songs added to repertoire this week
        prisma.song.findMany({
          where: { groupId, createdAt: { gte: sevenDaysAgo } },
          select: { id: true, title: true, artist: true },
          orderBy: { createdAt: 'desc' },
        }),
        // Upcoming rehearsals in the next 14 days
        prisma.rehearsal.findMany({
          where: {
            groupId,
            date: { gte: new Date(), lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
            attendances: { some: { userId: member.id } },
          },
          select: { id: true, date: true, location: true, startTime: true },
          orderBy: { date: 'asc' },
          take: 3,
        }),
      ])

      digestGroups.push({
        id: groupId,
        name: groupName,
        newGrilles,
        newResources: newResources.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          songTitle: r.song.title,
        })),
        newSongs,
        upcomingRehearsals,
      })
    }

    // Only send if there's at least something to show in any group
    const hasActivity = digestGroups.some(
      (g) => g.newGrilles.length > 0 || g.newResources.length > 0 || g.newSongs.length > 0 || g.upcomingRehearsals.length > 0
    )

    if (hasActivity) {
      try {
        await sendWeeklyDigestEmail(member.email, member.name, digestGroups, baseUrl)
        sent++
      } catch {
        // Don't let one failure block others
      }
    } else {
      skipped++
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, total: members.length })
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function toICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function escapeIcal(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function parseTime(dateObj: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(dateObj)
  d.setUTCHours(h, m, 0, 0)
  return d
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse('Non authentifié.', { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  let groupIds: number[]
  if (isAdmin) {
    const groups = await prisma.group.findMany({ select: { id: true } })
    groupIds = groups.map((g) => g.id)
  } else {
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    })
    groupIds = memberships.map((m) => m.groupId)
  }

  const [rehearsals, concerts] = groupIds.length
    ? await Promise.all([
        prisma.rehearsal.findMany({
          where: { groupId: { in: groupIds } },
          include: { group: { select: { name: true } } },
          orderBy: { date: 'asc' },
        }),
        prisma.concert.findMany({
          where: { groupId: { in: groupIds } },
          include: { group: { select: { name: true } } },
          orderBy: { date: 'asc' },
        }),
      ])
    : [[], []]

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sol au piano//Calendrier//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Sol au piano',
    'X-WR-TIMEZONE:Europe/Paris',
  ]

  for (const r of rehearsals) {
    const dtStart = parseTime(r.date, r.startTime)
    const dtEnd = r.endTime ? parseTime(r.date, r.endTime) : new Date(dtStart.getTime() + 2 * 60 * 60 * 1000)
    lines.push(
      'BEGIN:VEVENT',
      `UID:rehearsal-${r.id}@solaupiano.fr`,
      `DTSTART:${toICalDate(dtStart)}`,
      `DTEND:${toICalDate(dtEnd)}`,
      `SUMMARY:${escapeIcal(`🎸 Répétition – ${r.group.name}`)}`,
      `LOCATION:${escapeIcal(r.location)}`,
      r.notes ? `DESCRIPTION:${escapeIcal(r.notes)}` : 'DESCRIPTION:',
      'END:VEVENT',
    )
  }

  for (const c of concerts) {
    const dtStart = new Date(c.date)
    const dtEnd = new Date(dtStart.getTime() + 2 * 60 * 60 * 1000)
    lines.push(
      'BEGIN:VEVENT',
      `UID:concert-${c.id}@solaupiano.fr`,
      `DTSTART:${toICalDate(dtStart)}`,
      `DTEND:${toICalDate(dtEnd)}`,
      `SUMMARY:${escapeIcal(`🎵 Concert – ${c.group.name} – ${c.name}`)}`,
      `LOCATION:${escapeIcal(c.location)}`,
      c.notes ? `DESCRIPTION:${escapeIcal(c.notes)}` : 'DESCRIPTION:',
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')

  const ics = lines.join('\r\n') + '\r\n'

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="solaupiano.ics"',
    },
  })
}

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDateWithDay } from '@/lib/utils'
import Link from 'next/link'
import { Card, CardHeader } from '@/components/ui/Card'
import { DashboardCards } from './DashboardCards'

export default async function TableauDeBordPage() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const now = new Date()
  const in30Days = new Date()
  in30Days.setDate(in30Days.getDate() + 30)

  let upcomingRehearsals: Array<{ id: number; date: Date; startTime: string; endTime?: string | null; location: string; groupId: number; group: { name: string }; songs: { song: { title: string; artist?: string | null } }[] }> = []
  let upcomingConcerts: Array<{ id: number; name: string; date: Date; groupId: number; group: { id: number; name: string } }> = []
  let memberships: Array<{ groupId: number; groupRole: string; group: { name: string } }> = []

  if (isAdmin) {
    upcomingConcerts = await prisma.concert.findMany({
      where: { date: { gte: now } },
      orderBy: { date: 'asc' },
      take: 10,
      include: { group: { select: { id: true, name: true } } },
    })
  } else {
    const data = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            rehearsals: {
              where: { date: { gte: now, lte: in30Days } },
              orderBy: { date: 'asc' },
              take: 3,
              include: {
                songs: { include: { song: { select: { title: true, artist: true } } } },
              },
            },
            concerts: {
              where: { date: { gte: now } },
              orderBy: { date: 'asc' },
              take: 2,
            },
          },
        },
      },
    })
    memberships = data.map((m) => ({ groupId: m.groupId, groupRole: m.groupRole, group: { name: m.group.name } }))
    upcomingRehearsals = data
      .flatMap((m) => m.group.rehearsals.map((r) => ({ ...r, group: m.group })))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5)
    upcomingConcerts = data
      .flatMap((m) => m.group.concerts.map((c) => ({ ...c, group: m.group })))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 3)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {session.user.name} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {isAdmin ? 'Vue d\'ensemble des concerts à venir sur la plateforme.' : 'Voici un résumé de vos prochaines activités musicales.'}
        </p>
      </div>

      {isAdmin ? (
        /* Admin: concerts only, full width */
        <div className="max-w-2xl">
          <Card>
            <CardHeader title="Concerts à venir" subtitle="Tous les groupes" />
            {upcomingConcerts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">Aucun concert prévu.</p>
            ) : (
              <div className="space-y-3">
                {upcomingConcerts.map((concert) => (
                  <div
                    key={concert.id}
                    className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                  >
                    <p className="font-medium text-gray-900 text-sm">{concert.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{concert.group.name}</p>
                    <p className="text-xs text-indigo-600 capitalize mt-0.5">
                      {formatDateWithDay(concert.date)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : (
        <DashboardCards
          rehearsals={upcomingRehearsals.map((r) => ({ ...r, date: r.date.toISOString() }))}
          concerts={upcomingConcerts.map((c) => ({ ...c, date: c.date.toISOString() }))}
          memberships={memberships}
        />
      )}
    </div>
  )
}

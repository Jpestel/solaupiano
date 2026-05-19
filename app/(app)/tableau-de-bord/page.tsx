import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDateWithDay } from '@/lib/utils'
import Link from 'next/link'
import { Card, CardHeader } from '@/components/ui/Card'

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
        <p className="text-gray-500 mt-1">Voici un résumé de vos prochaines activités musicales.</p>
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
        /* Members: rehearsals + concerts + groups */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader
                title="Prochaines répétitions"
                subtitle="Dans les 30 prochains jours"
              />
              {upcomingRehearsals.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  Aucune répétition prévue dans les 30 prochains jours.
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingRehearsals.map((rep) => (
                    <Link
                      key={rep.id}
                      href={`/groupes/${rep.groupId}/repetitions/${rep.id}`}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{rep.group.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 capitalize">
                          {formatDateWithDay(rep.date)} · {rep.startTime}{rep.endTime ? ` - ${rep.endTime}` : ''}
                        </p>
                        <p className="text-xs text-gray-400">{rep.location}</p>
                        {rep.songs.length > 0 && (
                          <p className="text-xs text-indigo-500 mt-1">
                            Morceaux : {rep.songs.map((s) => s.song.title).join(', ')}
                          </p>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader title="Concerts à venir" />
              {upcomingConcerts.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Aucun concert prévu.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingConcerts.map((concert) => (
                    <Link
                      key={concert.id}
                      href={`/groupes/${concert.groupId}/concerts`}
                      className="block rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors"
                    >
                      <p className="font-medium text-gray-900 text-sm">{concert.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{concert.group.name}</p>
                      <p className="text-xs text-indigo-600 capitalize mt-0.5">
                        {formatDateWithDay(concert.date)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Mes groupes" />
              {memberships.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Vous n&apos;êtes membre d&apos;aucun groupe.
                </p>
              ) : (
                <div className="space-y-2">
                  {memberships.map((m) => (
                    <Link
                      key={m.groupId}
                      href={`/groupes/${m.groupId}`}
                      className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-semibold">
                          {m.group.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{m.group.name}</span>
                      </div>
                      <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                        m.groupRole === 'CHEF' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {m.groupRole === 'CHEF' ? 'Chef' : 'Membre'}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { InviteButton } from './InviteButton'
import { GroupsLookingSection } from './GroupsLookingSection'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

function ConcertDateBox({ date }: { date: Date }) {
  const day = format(date, 'd', { locale: fr })
  const month = format(date, 'MMM', { locale: fr })
  return (
    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-600 flex flex-col items-center justify-center text-white">
      <span className="text-xs font-medium uppercase leading-none">{month}</span>
      <span className="text-lg font-bold leading-tight">{day}</span>
    </div>
  )
}

export default async function TableauDeBordPage() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const now = new Date()
  const in30Days = new Date()
  in30Days.setDate(in30Days.getDate() + 30)

  if (isAdmin) {
    const upcomingConcerts = await prisma.concert.findMany({
      where: { date: { gte: now } },
      orderBy: { date: 'asc' },
      take: 20,
      include: { group: { select: { id: true, name: true } } },
    })

    return (
      <div>
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bonjour, {session.user.name} 👋</h1>
            <p className="text-gray-500 mt-1 text-sm">Vue d&apos;ensemble des concerts à venir sur la plateforme.</p>
          </div>
          <InviteButton />
        </div>
        <div className="max-w-2xl space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Concerts à venir</h2>
          {upcomingConcerts.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Aucun concert prévu.</p>
          ) : (
            upcomingConcerts.map((concert) => (
              <div key={concert.id} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
                <ConcertDateBox date={concert.date} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{concert.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{concert.group.name} · {concert.location}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  // Regular user
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
              songs: { include: { song: { select: { title: true } } } },
            },
          },
          concerts: {
            where: { date: { gte: now } },
            orderBy: { date: 'asc' },
          },
        },
      },
    },
  })

  const memberGroupIds = data.map((m) => m.groupId)

  const upcomingRehearsals = data
    .flatMap((m) => m.group.rehearsals.map((r) => ({ ...r, group: { name: m.group.name, id: m.groupId } })))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5)

  const upcomingConcerts = data
    .flatMap((m) => m.group.concerts.map((c) => ({ ...c, group: { name: m.group.name, id: m.groupId } })))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  const groupsLooking = await prisma.group.findMany({
    where: {
      isPublic: true,
      lookingFor: { not: null },
    },
    select: {
      id: true,
      name: true,
      description: true,
      lookingFor: true,
      lookingForSince: true,
      _count: { select: { members: true } },
      joinRequests: {
        where: { userId },
        select: { id: true, status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 8,
  })

  const memberGroupIdSet = new Set(memberGroupIds)
  const validGroupsLooking = groupsLooking
    .filter((g) => g.lookingFor !== null)
    .map((g) => ({ ...g, lookingFor: g.lookingFor as string, isMember: memberGroupIdSet.has(g.id) }))

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {session.user.name} 👋</h1>
          <p className="text-gray-500 mt-1 text-sm">Voici vos prochaines activités musicales.</p>
        </div>
        <InviteButton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main column: concerts + rehearsals */}
        <div className="lg:col-span-2 space-y-8">

          {/* Concerts */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-sm">🎭</span>
              Concerts à venir
            </h2>
            {upcomingConcerts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-6 py-8 text-center">
                <p className="text-2xl mb-2">🎭</p>
                <p className="text-sm text-gray-500">Aucun concert prévu pour l&apos;instant.</p>
                <p className="text-xs text-gray-400 mt-1">Les concerts ajoutés dans vos groupes apparaîtront ici.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingConcerts.map((concert) => (
                  <Link
                    key={concert.id}
                    href={`/groupes/${concert.group.id}/concerts`}
                    className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-indigo-300 hover:shadow-sm transition-all"
                  >
                    <ConcertDateBox date={concert.date} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{concert.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{concert.group.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{concert.location}</p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Rehearsals */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-sm">🎵</span>
              Prochaines répétitions
              <span className="text-xs font-normal text-gray-400">(30 jours)</span>
            </h2>
            {upcomingRehearsals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-6 py-8 text-center">
                <p className="text-2xl mb-2">🎵</p>
                <p className="text-sm text-gray-500">Aucune répétition prévue dans les 30 prochains jours.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingRehearsals.map((rep) => {
                  const dateLabel = format(rep.date, 'EEEE d MMMM', { locale: fr })
                  return (
                    <Link
                      key={rep.id}
                      href={`/groupes/${rep.group.id}/repetitions/${rep.id}`}
                      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-indigo-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex flex-col items-center justify-center text-blue-600">
                        <span className="text-xs font-medium leading-none capitalize">{format(rep.date, 'MMM', { locale: fr })}</span>
                        <span className="text-lg font-bold leading-tight">{format(rep.date, 'd', { locale: fr })}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{rep.group.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 capitalize">{dateLabel} · {rep.startTime}{rep.endTime ? ` – ${rep.endTime}` : ''}</p>
                        <p className="text-xs text-gray-400">{rep.location}</p>
                        {rep.songs.length > 0 && (
                          <p className="text-xs text-indigo-500 mt-1 truncate">
                            {rep.songs.map((s) => s.song.title).join(' · ')}
                          </p>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar: groups looking for musicians */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-sm">🔍</span>
            Groupes qui cherchent
          </h2>
          <GroupsLookingSection groups={validGroupsLooking} />
          {validGroupsLooking.length > 0 && (
            <Link
              href="/groupes"
              className="mt-4 block text-center text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Voir tous les groupes disponibles →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

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

export default async function TableauDeBordPage({
  searchParams,
}: {
  searchParams?: { module_bloque?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const moduleBloque = searchParams?.module_bloque

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
    where: { userId, group: { archivedAt: null } },
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
          _count: {
            select: { members: true, songs: true, setlists: true },
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
      archivedAt: null,
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
      {/* Module access blocked banner */}
      {moduleBloque && (
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">Fonctionnalité non incluse dans votre plan</p>
            <p className="text-sm text-amber-700 mt-0.5">
              <strong>{moduleBloque}</strong> n'est pas disponible avec votre plan actuel.{' '}
              <a href="/tarifs" className="font-semibold underline hover:text-amber-900">Découvrir les plans qui l'incluent →</a>
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {session.user.name} 👋</h1>
          <p className="text-gray-500 mt-1 text-sm">Voici vos prochaines activités musicales.</p>
        </div>
        <InviteButton />
      </div>

      {/* My groups quick access */}
      {data.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center text-sm">👥</span>
            Mes groupes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.map((m) => {
              const g = m.group
              const isChef = m.groupRole === 'CHEF'
              const nextRep = g.rehearsals[0]
              const nextConcert = g.concerts[0]
              const links = [
                { href: `/groupes/${g.id}/repetitions`, icon: '🎵', label: 'Répétitions' },
                { href: `/groupes/${g.id}/morceaux`,    icon: '🎼', label: 'Répertoire' },
                { href: `/groupes/${g.id}/setlists`,    icon: '🎶', label: 'Setlists' },
                { href: `/groupes/${g.id}/grilles`,     icon: '🎸', label: 'Grilles' },
                { href: `/groupes/${g.id}/concerts`,    icon: '🎭', label: 'Concerts' },
              ]
              return (
                <div key={g.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Group header */}
                  <Link href={`/groupes/${g.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0 overflow-hidden">
                      {g.coverUrl
                        ? <img src={g.coverUrl} alt={g.name} className="w-full h-full object-cover" />
                        : g.name.charAt(0).toUpperCase()
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 text-sm truncate">{g.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {isChef ? '🎼 Chef d\'orchestre' : '🎵 Membre'} · {g._count.members} membre{g._count.members > 1 ? 's' : ''}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  {/* Next event pill */}
                  {(nextRep || nextConcert) && (
                    <div className="px-4 pb-2">
                      {nextRep && (
                        <Link href={`/groupes/${g.id}/repetitions/${nextRep.id}`}
                          className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-2.5 py-1.5 text-xs text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          <span className="font-semibold flex-shrink-0">🎵</span>
                          <span className="truncate">
                            Prochaine rép. — {format(nextRep.date, 'd MMM', { locale: fr })} à {nextRep.startTime}
                          </span>
                        </Link>
                      )}
                      {nextConcert && (
                        <Link href={`/groupes/${g.id}/concerts`}
                          className="flex items-center gap-2 rounded-lg bg-purple-50 border border-purple-100 px-2.5 py-1.5 text-xs text-purple-700 hover:bg-purple-100 transition-colors mt-1.5"
                        >
                          <span className="font-semibold flex-shrink-0">🎭</span>
                          <span className="truncate">
                            Prochain concert — {format(nextConcert.date, 'd MMM', { locale: fr })}
                          </span>
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Quick nav */}
                  <div className="grid grid-cols-5 border-t border-gray-100">
                    {links.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        title={l.label}
                        className="flex flex-col items-center gap-0.5 py-2.5 text-center hover:bg-indigo-50 transition-colors group"
                      >
                        <span className="text-base leading-none">{l.icon}</span>
                        <span className="text-[9px] font-medium text-gray-400 group-hover:text-indigo-600 transition-colors leading-tight">{l.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

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
                    className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-indigo-300 hover:shadow-sm transition-all"
                  >
                    <ConcertDateBox date={concert.date} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{concert.name}</p>
                      <p className="text-xs font-semibold text-gray-700 mt-0.5">🎸 {concert.group.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{concert.location}</p>
                    </div>
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                      <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
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
                      className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-indigo-300 hover:shadow-sm transition-all"
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
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                        <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
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

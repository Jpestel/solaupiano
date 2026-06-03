import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { InviteButton } from './InviteButton'
import { GroupsLookingSection } from './GroupsLookingSection'
import { AdminCharts } from '@/components/admin/AdminCharts'
import { UNSPECIFIED_GENRE } from '@/lib/genres'
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

function StatCard({ icon, label, value, sub, href }: { icon: string; label: string; value: number | string; sub?: string; href?: string }) {
  const inner = (
    <div className="rounded-xl border border-gray-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all h-full">
      <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium"><span className="text-base">{icon}</span>{label}</div>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
  return href ? <Link href={href} className="block">{inner}</Link> : inner
}

function Panel({ title, icon, count, href, linkLabel = 'Gérer →', children }: { title: string; icon: string; count?: number; href?: string; linkLabel?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          <span>{icon}</span>{title}
          {count !== undefined && <span className="text-xs font-normal text-gray-400">({count})</span>}
        </h2>
        {href && <Link href={href} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 shrink-0">{linkLabel}</Link>}
      </div>
      <div className="max-h-[360px] overflow-y-auto">{children}</div>
    </div>
  )
}

const PLAN_BADGE: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-600',
  PRO: 'bg-blue-100 text-blue-700',
  PREMIUM: 'bg-violet-100 text-violet-700',
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
    const [
      userCount, adminCount, groupCount, archivedGroupCount,
      concertUpcomingCount, rehearsalUpcomingCount, instrumentCount, songCount,
      upcomingConcerts, upcomingRehearsals, groups, users, instruments, allSongs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { siteRole: 'ADMIN' } }),
      prisma.group.count({ where: { archivedAt: null } }),
      prisma.group.count({ where: { archivedAt: { not: null } } }),
      prisma.concert.count({ where: { date: { gte: now } } }),
      prisma.rehearsal.count({ where: { date: { gte: now } } }),
      prisma.instrument.count(),
      prisma.song.count(),
      prisma.concert.findMany({
        where: { date: { gte: now } }, orderBy: { date: 'asc' }, take: 30,
        include: { group: { select: { name: true } } },
      }),
      prisma.rehearsal.findMany({
        where: { date: { gte: now } }, orderBy: { date: 'asc' }, take: 30,
        include: { group: { select: { name: true } } },
      }),
      prisma.group.findMany({
        orderBy: [{ archivedAt: 'asc' }, { name: 'asc' }],
        include: {
          _count: { select: { members: true, songs: true, concerts: true, rehearsals: true } },
          members: { where: { groupRole: 'CHEF' }, include: { user: { select: { name: true } } } },
        },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { groups: true } },
          instruments: { include: { instrument: { select: { name: true } } } },
        },
      }),
      prisma.instrument.findMany({ include: { _count: { select: { users: true } } } }),
      prisma.song.findMany({
        select: { id: true, title: true, artist: true, group: { select: { id: true, name: true } } },
        orderBy: [{ group: { name: 'asc' } }, { title: 'asc' }],
      }),
    ])

    const instrumentsByUsage = [...instruments].sort((a, b) => b._count.users - a._count.users || a.name.localeCompare(b.name))

    // Données graphiques
    const styleCounts = new Map<string, number>()
    for (const g of groups) {
      if (g.archivedAt) continue
      const s = ((g as any).style as string | null)?.trim() || UNSPECIFIED_GENRE
      styleCounts.set(s, (styleCounts.get(s) ?? 0) + 1)
    }
    const styleData = Array.from(styleCounts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
    const instrumentData = instrumentsByUsage
      .filter((i) => i._count.users > 0)
      .slice(0, 15)
      .map((i) => ({ name: i.name, value: i._count.users }))

    // Répertoires : morceaux regroupés par groupe
    const songsByGroup = new Map<number, { name: string; songs: { id: number; title: string; artist: string | null }[] }>()
    for (const s of allSongs) {
      if (!s.group) continue
      let entry = songsByGroup.get(s.group.id)
      if (!entry) { entry = { name: s.group.name, songs: [] }; songsByGroup.set(s.group.id, entry) }
      entry.songs.push({ id: s.id, title: s.title, artist: s.artist })
    }
    const repertoires = Array.from(songsByGroup.values()).sort((a, b) => a.name.localeCompare(b.name))

    const kpis = [
      { icon: '👥', label: 'Utilisateurs', value: userCount, sub: `${adminCount} admin${adminCount > 1 ? 's' : ''}`, href: '/admin/utilisateurs' },
      { icon: '🎵', label: 'Groupes actifs', value: groupCount, sub: archivedGroupCount > 0 ? `${archivedGroupCount} archivé${archivedGroupCount > 1 ? 's' : ''}` : 'aucun archivé', href: '/admin/groupes' },
      { icon: '🎭', label: 'Concerts à venir', value: concertUpcomingCount, href: undefined },
      { icon: '🗓', label: 'Répétitions à venir', value: rehearsalUpcomingCount, href: undefined },
      { icon: '🎻', label: 'Instruments', value: instrumentCount, href: '/admin/instruments' },
      { icon: '🎼', label: 'Morceaux', value: songCount, href: undefined },
    ]

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bonjour, {session.user.name} 👋</h1>
            <p className="text-gray-500 mt-1 text-sm">Vue d&apos;ensemble de la plateforme.</p>
          </div>
          <InviteButton />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((k) => <StatCard key={k.label} {...k} />)}
        </div>

        {/* Graphiques */}
        <AdminCharts styleData={styleData} instrumentData={instrumentData} />

        {/* Concerts + Répétitions à venir */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Concerts à venir" icon="🎭" count={upcomingConcerts.length}>
            {upcomingConcerts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucun concert prévu.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {upcomingConcerts.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                    <ConcertDateBox date={c.date} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">{c.name}</p>
                      <p className="text-xs text-gray-500 truncate">{c.group.name} · {c.location}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Répétitions à venir" icon="🗓" count={upcomingRehearsals.length}>
            {upcomingRehearsals.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucune répétition prévue.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {upcomingRehearsals.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                    <ConcertDateBox date={r.date} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">{r.group.name}</p>
                      <p className="text-xs text-gray-500 truncate">{r.startTime} · {r.location}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Groupes */}
        <Panel title="Groupes" icon="🎵" count={groups.length} href="/admin/groupes">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left font-medium px-4 py-2">Groupe</th>
                <th className="text-left font-medium px-2 py-2">Plan</th>
                <th className="text-right font-medium px-2 py-2">Membres</th>
                <th className="text-right font-medium px-2 py-2 hidden sm:table-cell">Morceaux</th>
                <th className="text-right font-medium px-2 py-2 hidden sm:table-cell">Concerts</th>
                <th className="text-right font-medium px-2 py-2 hidden sm:table-cell">Répét.</th>
                <th className="text-left font-medium px-2 py-2 hidden md:table-cell">Chef(s)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {groups.map((g) => (
                <tr key={g.id} className={g.archivedAt ? 'opacity-50' : ''}>
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {g.name}
                    {g.archivedAt && <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">archivé</span>}
                  </td>
                  <td className="px-2 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PLAN_BADGE[g.plan] ?? 'bg-gray-100 text-gray-600'}`}>{g.plan}</span></td>
                  <td className="px-2 py-2 text-right text-gray-700">{g._count.members}</td>
                  <td className="px-2 py-2 text-right text-gray-700 hidden sm:table-cell">{g._count.songs}</td>
                  <td className="px-2 py-2 text-right text-gray-700 hidden sm:table-cell">{g._count.concerts}</td>
                  <td className="px-2 py-2 text-right text-gray-700 hidden sm:table-cell">{g._count.rehearsals}</td>
                  <td className="px-2 py-2 text-gray-500 text-xs hidden md:table-cell truncate max-w-[160px]">
                    {g.members.map((m) => m.user.name).join(', ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {/* Répertoires : tous les morceaux par groupe */}
        <Panel title="Répertoires — tous les morceaux" icon="🎼" count={allSongs.length}>
          {repertoires.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucun morceau dans les répertoires.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {repertoires.map((r) => (
                <div key={r.name} className="px-4 py-3">
                  <p className="text-sm font-semibold text-gray-900 mb-1.5">
                    {r.name} <span className="text-xs font-normal text-gray-400">· {r.songs.length} morceau{r.songs.length > 1 ? 'x' : ''}</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {r.songs.map((s) => (
                      <span key={s.id} className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-2.5 py-0.5 text-xs text-gray-700" title={s.artist || undefined}>
                        {s.title}
                        {s.artist && <span className="ml-1 text-gray-400">· {s.artist}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Utilisateurs + Instruments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Utilisateurs" icon="👥" count={users.length} href="/admin/utilisateurs">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-left font-medium px-4 py-2">Nom</th>
                  <th className="text-left font-medium px-2 py-2">Rôle</th>
                  <th className="text-right font-medium px-2 py-2">Groupes</th>
                  <th className="text-left font-medium px-2 py-2 hidden sm:table-cell">Instruments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => {
                  const instrNames = u.instruments.map((ui) => ui.instrument.name)
                  return (
                    <tr key={u.id}>
                      <td className="px-4 py-2">
                        <p className="font-medium text-gray-900 truncate max-w-[140px]">{u.name}</p>
                        <p className="text-[11px] text-gray-400 truncate max-w-[140px]">{u.email}</p>
                      </td>
                      <td className="px-2 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.siteRole === 'ADMIN' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>
                          {u.siteRole === 'ADMIN' ? 'Admin' : 'Membre'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right text-gray-700">{u._count.groups}</td>
                      <td className="px-2 py-2 text-gray-500 text-xs hidden sm:table-cell truncate max-w-[180px]">
                        {instrNames.slice(0, 3).join(', ')}{instrNames.length > 3 ? ` +${instrNames.length - 3}` : ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Panel>

          <Panel title="Instruments (par usage)" icon="🎻" count={instruments.length} href="/admin/instruments">
            <ul className="divide-y divide-gray-50">
              {instrumentsByUsage.map((i) => (
                <li key={i.id} className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm text-gray-700">{i.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${i._count.users > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                    {i._count.users} musicien{i._count.users > 1 ? 's' : ''}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
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

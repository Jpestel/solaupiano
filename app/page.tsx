import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { PublicJoinButton } from './PublicJoinButton'
import { PublicNav } from './PublicNav'
import { NewsletterSignup } from '@/components/NewsletterSignup'
import { PublicConcerts } from '@/components/PublicConcerts'
import { ConcertMap } from '@/components/ConcertMap'
import { Reveal } from '@/components/Reveal'
import { getSiteSettings } from '@/lib/site-settings'

function parseLookingFor(raw?: string | null): string[] {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

export default async function PublicHomePage() {
  const session = await getServerSession(authOptions)
  // La page d'accueil est désormais accessible à tous ; on l'adapte selon que la
  // personne est connectée ou non (CTA, nav…).
  const isLoggedIn = !!session
  const firstName = session?.user?.name?.split(' ')[0] ?? null

  const now = new Date()

  const [concerts, groupsLooking, musicianCount, groupCount, concertUpcomingCount, instrumentsUsed, styleGroups, userInstrumentGroups, siteSettings] = await Promise.all([
    prisma.concert.findMany({
      where: { date: { gte: now }, isPublic: true, group: { isTest: false } },
      orderBy: { date: 'asc' },
      take: 100,
      include: { group: { select: { name: true, coverUrl: true, groupPage: { select: { slug: true, published: true } } } } },
    }),
    prisma.group.findMany({
      where: { isHidden: false, archivedAt: null, isTest: false },
      select: {
        id: true,
        name: true,
        description: true,
        style: true,
        isPublic: true,
        lookingFor: true,
        lookingForSince: true,
        _count: { select: { members: true } },
      },
      orderBy: [{ isPublic: 'desc' }, { lookingForSince: 'desc' }, { createdAt: 'desc' }],
      take: 12,
    }),
    prisma.user.count({ where: { siteRole: { not: 'ADMIN' }, isTest: false } }),
    prisma.group.count({ where: { archivedAt: null, isTest: false } }),
    prisma.concert.count({ where: { date: { gte: now }, group: { isTest: false } } }),
    prisma.instrument.findMany({
      where: { users: { some: { user: { siteRole: { not: 'ADMIN' }, isTest: false } } } },
      include: { _count: { select: { users: { where: { user: { siteRole: { not: 'ADMIN' }, isTest: false } } } } } },
    }),
    prisma.group.groupBy({
      by: ['style'],
      where: { archivedAt: null, style: { not: null }, isTest: false },
      _count: { _all: true },
    }),
    prisma.userInstrument.groupBy({
      by: ['userId'],
      where: { user: { siteRole: { not: 'ADMIN' }, isTest: false } },
      _count: { instrumentId: true },
    }),
    getSiteSettings(),
  ])

  // Groupes visibles sur l'accueil = publics + privés (les masqués sont exclus par la requête)
  const discoverGroups = groupsLooking

  // Concerts sérialisés pour le composant client (regroupement Mois / Groupe)
  const concertsForList = concerts.map((c) => ({
    id: c.id,
    name: c.name,
    date: c.date.toISOString(),
    location: c.location,
    address: c.address,
    postalCode: c.postalCode,
    city: c.city,
    latitude: c.latitude,
    longitude: c.longitude,
    startTime: c.startTime,
    groupName: c.group.name,
    groupCoverUrl: c.group.coverUrl,
    groupSlug: c.group.groupPage?.published && c.group.groupPage?.slug ? c.group.groupPage.slug : null,
  }))

  // Communauté : instruments les plus représentés + styles des groupes
  const topInstruments = [...instrumentsUsed]
    .sort((a, b) => b._count.users - a._count.users || a.name.localeCompare(b.name))
    .slice(0, 20)
  const styles = styleGroups
    .map((s) => ({ name: (s.style ?? '').trim(), count: s._count._all }))
    .filter((s) => s.name && s.name !== 'Non renseigné')
    .sort((a, b) => b.count - a.count)
  const instrumentCount = instrumentsUsed.length
  // Musiciens distincts ayant déclaré ≥1 instrument + multi-instrumentistes
  const distinctInstrumentists = userInstrumentGroups.length
  const multiInstrumentists = userInstrumentGroups.filter((u) => u._count.instrumentId > 1).length

  const STATS = [
    { icon: '🎙️', value: musicianCount, label: musicianCount > 1 ? 'musiciens inscrits' : 'musicien inscrit' },
    { icon: '🎵', value: groupCount, label: groupCount > 1 ? 'groupes actifs' : 'groupe actif' },
    { icon: '🎭', value: concertUpcomingCount, label: concertUpcomingCount > 1 ? 'concerts à venir' : 'concert à venir' },
    { icon: '🎻', value: instrumentCount, label: 'instruments joués' },
  ]

  const FEATURES = [
    { icon: '🗓️', title: 'Répétitions', desc: 'Planifiez, suivez les présences, envoyez des rappels.' },
    { icon: '🎼', title: 'Répertoire & accords', desc: 'Morceaux, paroles, accords au-dessus des mots, prompteur.' },
    { icon: '🎶', title: 'Setlists', desc: 'Composez vos programmes et calculez leur durée.' },
    { icon: '🎭', title: 'Concerts', desc: 'Dates, plan de scène, fiche technique, page publique.' },
    { icon: '🎚️', title: 'Séquences', desc: 'Backing tracks audio et MIDI, click séparé.' },
    { icon: '💶', title: 'Comptabilité', desc: 'Partagez les frais et suivez qui a payé quoi.' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-base">🎹</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-indigo-900 text-lg">Sol au piano</span>
              <span className="text-[10px] text-indigo-400 italic font-normal">du solo à l&apos;orchestre</span>
            </div>
          </div>
          <PublicNav isLoggedIn={isLoggedIn} />
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 text-white">
        {/* Décor : notes & instruments translucides */}
        <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
          <span className="sp-float absolute -top-4 right-6 text-[140px] opacity-10" style={{ '--sp-rot': '12deg', animationDelay: '0s' } as React.CSSProperties}>🎵</span>
          <span className="sp-float absolute top-20 right-1/3 text-[90px] opacity-10" style={{ '--sp-rot': '-6deg', animationDelay: '1.2s' } as React.CSSProperties}>🎸</span>
          <span className="sp-float absolute bottom-2 left-1/4 text-[100px] opacity-10" style={{ '--sp-rot': '0deg', animationDelay: '2.1s' } as React.CSSProperties}>🎹</span>
          <span className="sp-float absolute bottom-8 right-12 text-[80px] opacity-10" style={{ '--sp-rot': '6deg', animationDelay: '0.6s' } as React.CSSProperties}>🥁</span>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)] gap-8 lg:gap-10 items-start">
            <div className="min-w-0">
              <span className="sp-fade-up inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur" style={{ animationDelay: '0.05s' }}>
                {isLoggedIn
                  ? `👋 Bonjour ${firstName ?? ''}`.trim() + ' — content de vous revoir'
                  : '🎵 La plateforme des musiciens — du solo à l’orchestre'}
              </span>
              <h1 className="sp-fade-up mt-4 text-3xl sm:text-5xl font-bold leading-tight" style={{ animationDelay: '0.15s' }}>
                Jouez, répétez,{' '}
                <span className="text-amber-300">progressez</span>
              </h1>
              <p className="sp-fade-up mt-4 text-white/80 text-base sm:text-lg leading-relaxed" style={{ animationDelay: '0.25s' }}>
                Que vous jouiez seul, en groupe, que vous donniez des cours ou que vous en suiviez :
                gérez votre répertoire et vos accords, organisez vos répétitions et vos concerts,
                suivez la progression de chacun. Le tout au même endroit.
              </p>
              {isLoggedIn ? (
                <div className="sp-fade-up mt-6 flex flex-wrap items-center gap-3" style={{ animationDelay: '0.35s' }}>
                  <Link
                    href="/tableau-de-bord"
                    className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-indigo-700 hover:bg-gray-100 transition-colors shadow-lg shadow-black/10"
                  >
                    Aller à mon tableau de bord →
                  </Link>
                  <Link
                    href="/groupes"
                    className="rounded-xl bg-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/25 backdrop-blur transition-colors"
                  >
                    Mes groupes
                  </Link>
                </div>
              ) : (
                <>
                  <div className="sp-fade-up mt-6 flex flex-wrap items-center gap-3" style={{ animationDelay: '0.35s' }}>
                    <Link
                      href="/inscription"
                      className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-indigo-700 hover:bg-gray-100 transition-colors shadow-lg shadow-black/10"
                    >
                      Créer mon compte gratuitement
                    </Link>
                    <Link
                      href="/tarifs"
                      className="rounded-xl bg-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/25 backdrop-blur transition-colors"
                    >
                      Voir les tarifs →
                    </Link>
                    <Link
                      href="/connexion"
                      className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                    >
                      Déjà inscrit ? →
                    </Link>
                  </div>
                  <p className="mt-3 text-xs text-white/60">✓ Gratuit, sans carte bancaire · ✓ Prêt en 2 minutes</p>

                  {/* Un seul compte, toutes les casquettes : pas besoin de choisir un « type » */}
                  <div className="mt-8">
                    <p className="text-sm font-semibold text-white/90 mb-1">Un seul compte, et vous pouvez…</p>
                    <p className="text-xs text-white/60 mb-3">Inutile de choisir maintenant : votre compte sait tout faire, vous décidez au fil de l&apos;eau.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                      <Link
                        href="/inscription"
                        className="group rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 p-4 backdrop-blur transition-all duration-200 hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-2 text-white font-semibold">
                          <span className="text-xl">🎵</span> Jouer, seul ou en groupe
                        </div>
                        <p className="mt-1 text-sm text-white/70">Votre répertoire et vos accords ; rejoignez un groupe sur invitation ou candidatez.</p>
                      </Link>
                      <Link
                        href="/inscription"
                        className="group rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 p-4 backdrop-blur transition-all duration-200 hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-2 text-white font-semibold">
                          <span className="text-xl">🎼</span> Créer & gérer un groupe
                        </div>
                        <p className="mt-1 text-sm text-white/70">Organisez répétitions et concerts, recrutez les musiciens qui manquent.</p>
                      </Link>
                      <Link
                        href="/inscription"
                        className="group rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 p-4 backdrop-blur transition-all duration-200 hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-2 text-white font-semibold">
                          <span className="text-xl">🎓</span> Enseigner
                        </div>
                        <p className="mt-1 text-sm text-white/70">Ouvrez une classe, suivez vos élèves, leurs devoirs et leur progression — en privé.</p>
                      </Link>
                      <Link
                        href="/inscription"
                        className="group rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 p-4 backdrop-blur transition-all duration-200 hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-2 text-white font-semibold">
                          <span className="text-xl">🎒</span> Apprendre
                        </div>
                        <p className="mt-1 text-sm text-white/70">Rejoignez la classe de votre professeur, accédez à vos morceaux et à votre suivi.</p>
                      </Link>
                    </div>
                    <Link href="/inscription" className="mt-4 inline-block text-sm font-semibold text-amber-300 hover:text-amber-200 transition-colors">
                      Créer mon compte gratuitement →
                    </Link>
                  </div>
                </>
              )}
            </div>

            <ConcertMap concerts={concertsForList} popupSettings={siteSettings} />
          </div>

          {/* Compteurs */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
            {STATS.map((s, i) => (
              <div key={s.label} className="sp-fade-up rounded-2xl bg-white/10 backdrop-blur px-4 py-3 border border-white/15 transition-all duration-200 hover:bg-white/15 hover:-translate-y-0.5" style={{ animationDelay: `${0.4 + i * 0.1}s` }}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-2xl sm:text-3xl font-bold leading-none">{s.value}</span>
                </div>
                <p className="mt-1 text-xs text-white/70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Concerts à venir */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <Reveal className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-sm">🎭</span>
              Concerts à venir
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Les prochaines dates publiques des groupes et musiciens inscrits.
            </p>
          </div>
          {concerts.length > 0 && (
            <span className="text-xs font-medium text-gray-400">
              {concerts.length} événement{concerts.length > 1 ? 's' : ''}
            </span>
          )}
        </Reveal>

        <PublicConcerts concerts={concertsForList} />

        <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-900">Votre groupe a un concert ?</p>
            <p className="text-xs text-indigo-600 mt-0.5">
              {isLoggedIn
                ? 'Ajoutez vos concerts et passez-les en « Public » pour les rendre visibles ici.'
                : 'Inscrivez-vous et ajoutez vos événements pour les rendre visibles ici.'}
            </p>
          </div>
          <Link
            href={isLoggedIn ? '/groupes' : '/inscription'}
            className="flex-shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            {isLoggedIn ? 'Mes groupes' : 'S’inscrire'}
          </Link>
        </div>
      </div>

      {/* Fonctionnalités */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <Reveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-sm">
                <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-xl">{f.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{f.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{f.desc}</p>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </div>

      {/* Communauté : styles & instruments */}
      {(styles.length > 0 || topInstruments.length > 0) && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
          {styles.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-sm">🎼</span>
                Des groupes de tous les styles
              </h2>
              <div className="flex flex-wrap gap-2">
                {styles.map((s) => (
                  <span key={s.name} className="inline-flex items-center gap-1.5 rounded-full bg-white border border-gray-200 px-3 py-1 text-sm text-gray-700">
                    {s.name}
                    <span className="text-xs font-semibold text-purple-600">{s.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {topInstruments.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-sm">🎻</span>
                Tous les instruments sont représentés
              </h2>
              <div className="flex flex-wrap gap-2">
                {topInstruments.map((i) => (
                  <span key={i.id} className="inline-flex items-center gap-1.5 rounded-full bg-white border border-gray-200 px-3 py-1 text-sm text-gray-700">
                    {i.name}
                    <span className="text-xs font-semibold text-indigo-600">{i._count.users}</span>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                🎙️ Joué{distinctInstrumentists > 1 ? 's' : ''} par <strong className="text-gray-700">{distinctInstrumentists}</strong> musicien{distinctInstrumentists > 1 ? 's' : ''}
                {multiInstrumentists > 0 && (
                  <> — dont <strong className="text-gray-700">{multiInstrumentists}</strong> multi-instrumentiste{multiInstrumentists > 1 ? 's' : ''}</>
                )}.
              </p>
              <p className="text-xs text-gray-400 mt-1">Vous jouez d&apos;un instrument qui n&apos;est pas là ? Ajoutez-le à votre inscription en quelques secondes.</p>
            </div>
          )}
        </div>
      )}

      {/* Groupes inscrits */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-sm">🔍</span>
          Groupes inscrits
        </h2>

        {discoverGroups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-5 py-10 text-center bg-white">
            <p className="text-3xl mb-3">🎸</p>
            <p className="text-sm text-gray-500">Aucun groupe à afficher pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {discoverGroups.map((group) => {
              const instruments = parseLookingFor(group.lookingFor)
              return (
                <div key={group.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-200">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                      {group.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm leading-tight">{group.name}</p>
                        {!group.isPublic && (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">🔒 Privé</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {group._count.members} membre{group._count.members > 1 ? 's' : ''}
                        {group.style ? ` · ${group.style}` : ''}
                      </p>
                      {group.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{group.description}</p>
                      )}
                    </div>
                  </div>

                  {instruments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs text-amber-600 font-medium self-center">Cherche :</span>
                      {instruments.map((inst) => (
                        <span key={inst} className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {inst}
                        </span>
                      ))}
                    </div>
                  )}

                  {group.isPublic ? (
                    <PublicJoinButton groupId={group.id} groupName={group.name} />
                  ) : (
                    <p className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-center text-xs text-gray-500">
                      🔒 Sur invitation du chef uniquement
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Petites annonces CTA */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-8">
        <Reveal className="rounded-2xl bg-white border border-gray-200 px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-2xl flex-shrink-0">📢</div>
            <div>
              <h2 className="font-bold text-gray-900">Petites annonces</h2>
              <p className="text-sm text-gray-500 mt-0.5">Vendez du matériel, cherchez un musicien ou rejoignez un groupe.</p>
            </div>
          </div>
          <Link
            href="/annonces"
            className="flex-shrink-0 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Voir les annonces →
          </Link>
        </Reveal>
      </div>

      {/* Newsletter */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-8">
        <Reveal className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white px-6 py-7 sm:flex items-center justify-between gap-6">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-lg font-bold flex items-center gap-2">📬 Restez informé·e</h2>
            <p className="text-sm text-white/80 mt-1">Nouveautés, astuces et conseils pour les groupes. Sans compte, désinscription en 1 clic.</p>
          </div>
          <NewsletterSignup variant="dark" />
        </Reveal>
      </div>

      {/* Footer */}
      <footer className="mt-4 border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center sm:justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
              <span className="text-xs">🎹</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold text-indigo-900">Sol au piano</span>
              <span className="text-[10px] text-indigo-400 italic">du solo à l&apos;orchestre</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gray-500">
            <Link href="/connexion" className="hover:text-indigo-600 transition-colors">Connexion</Link>
            <Link href="/inscription" className="hover:text-indigo-600 transition-colors">Inscription</Link>
            <Link href="/annonces" className="hover:text-indigo-600 transition-colors">Annonces</Link>
            <Link href="/blog" className="hover:text-indigo-600 transition-colors">Blog</Link>
            <Link href="/tarifs" className="hover:text-indigo-600 transition-colors">Tarifs</Link>
            <Link href="/aide" className="hover:text-indigo-600 transition-colors">Aide</Link>
            <Link href="/newsletter" className="hover:text-indigo-600 transition-colors">Newsletter</Link>
            <Link href="/mentions-legales" className="hover:text-indigo-600 transition-colors">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { PublicJoinButton } from './PublicJoinButton'
import { PublicNav } from './PublicNav'
import { HomeCarousel } from '@/components/HomeCarousel'
import { NewsletterSignup } from '@/components/NewsletterSignup'

function parseLookingFor(raw?: string | null): string[] {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

function DateBox({ date, color = 'indigo' }: { date: Date; color?: 'indigo' | 'purple' }) {
  const bg = color === 'purple' ? 'bg-purple-600' : 'bg-indigo-600'
  return (
    <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${bg} flex flex-col items-center justify-center text-white`}>
      <span className="text-[10px] font-medium uppercase leading-none">{format(date, 'MMM', { locale: fr })}</span>
      <span className="text-base font-bold leading-tight">{format(date, 'd', { locale: fr })}</span>
    </div>
  )
}

export default async function PublicHomePage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/tableau-de-bord')

  const now = new Date()

  const [concerts, groupsLooking, musicianCount, groupCount, concertUpcomingCount, instrumentsUsed, styleGroups, userInstrumentGroups, homeSlides] = await Promise.all([
    prisma.concert.findMany({
      where: { date: { gte: now }, isPublic: true },
      orderBy: { date: 'asc' },
      take: 15,
      include: { group: { select: { name: true, groupPage: { select: { slug: true, published: true } } } } },
    }),
    prisma.group.findMany({
      where: { isHidden: false, archivedAt: null },
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
    prisma.user.count({ where: { siteRole: { not: 'ADMIN' } } }),
    prisma.group.count({ where: { archivedAt: null } }),
    prisma.concert.count({ where: { date: { gte: now } } }),
    prisma.instrument.findMany({
      where: { users: { some: { user: { siteRole: { not: 'ADMIN' } } } } },
      include: { _count: { select: { users: { where: { user: { siteRole: { not: 'ADMIN' } } } } } } },
    }),
    prisma.group.groupBy({
      by: ['style'],
      where: { archivedAt: null, style: { not: null } },
      _count: { _all: true },
    }),
    prisma.userInstrument.groupBy({
      by: ['userId'],
      where: { user: { siteRole: { not: 'ADMIN' } } },
      _count: { instrumentId: true },
    }),
    prisma.homeSlide.findMany({
      where: { published: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, title: true, subtitle: true, imageUrl: true, linkUrl: true },
    }),
  ])

  // Groupes visibles sur l'accueil = publics + privés (les masqués sont exclus par la requête)
  const discoverGroups = groupsLooking

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
          <PublicNav />
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 text-white">
        {/* Décor : notes & instruments translucides */}
        <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
          <span className="absolute -top-4 right-6 text-[140px] opacity-10 rotate-12">🎵</span>
          <span className="absolute top-20 right-1/3 text-[90px] opacity-10 -rotate-6">🎸</span>
          <span className="absolute bottom-2 left-1/4 text-[100px] opacity-10">🎹</span>
          <span className="absolute bottom-8 right-12 text-[80px] opacity-10 rotate-6">🥁</span>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              🎵 La plateforme des musiciens en groupe
            </span>
            <h1 className="mt-4 text-3xl sm:text-5xl font-bold leading-tight">
              Répétez, jouez,{' '}
              <span className="text-amber-300">progressez ensemble</span>
            </h1>
            <p className="mt-4 text-white/80 text-base sm:text-lg leading-relaxed">
              Organisez vos répétitions, gérez votre répertoire et vos accords, suivez vos concerts.
              Rejoignez un groupe ou trouvez les musiciens qui vous manquent.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
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

            {/* Deux portes : groupe ou école */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              <Link
                href="/inscription"
                className="group rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 p-4 backdrop-blur transition-colors"
              >
                <div className="flex items-center gap-2 text-white font-semibold">
                  <span className="text-xl">🎵</span> Vous êtes un groupe
                </div>
                <p className="mt-1 text-sm text-white/70">Répétitions, concerts, répertoire et accords partagés.</p>
                <span className="mt-2 inline-block text-sm font-medium text-amber-300">Démarrer →</span>
              </Link>
              <Link
                href="/inscription?profil=ecole"
                className="group rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 p-4 backdrop-blur transition-colors"
              >
                <div className="flex items-center gap-2 text-white font-semibold">
                  <span className="text-xl">🎓</span> Vous êtes prof ou école
                </div>
                <p className="mt-1 text-sm text-white/70">Gérez vos cours, vos élèves et leur progression.</p>
                <span className="mt-2 inline-block text-sm font-medium text-amber-300">Démarrer →</span>
              </Link>
            </div>
          </div>

          {/* Compteurs */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/10 backdrop-blur px-4 py-3 border border-white/15">
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

      {/* Aperçu (carrousel) */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <h2 className="text-center text-xl font-bold text-gray-900 mb-1">Découvrez la plateforme</h2>
        <p className="text-center text-sm text-gray-500 mb-6">Un aperçu de ce que vous pourrez faire avec votre groupe.</p>
        <HomeCarousel dbSlides={homeSlides} />
      </div>

      {/* Fonctionnalités */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-xl">{f.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{f.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
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

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Concerts — 2/3 */}
          <div className="lg:col-span-2">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-sm">🎭</span>
              Concerts à venir
              <span className="text-xs font-normal text-gray-400 ml-1">{concerts.length > 0 ? `${concerts.length} événement${concerts.length > 1 ? 's' : ''}` : ''}</span>
            </h2>

            {concerts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-6 py-12 text-center bg-white">
                <p className="text-3xl mb-3">🎭</p>
                <p className="text-sm text-gray-500">Aucun concert annoncé pour l&apos;instant.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {concerts.map((concert) => (
                  <div
                    key={concert.id}
                    className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3"
                  >
                    <DateBox date={concert.date} color="purple" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{concert.name}</p>
                      {concert.group.groupPage?.published && concert.group.groupPage?.slug ? (
                        <Link href={`/${concert.group.groupPage.slug}`} className="text-xs text-indigo-600 hover:underline mt-0.5 inline-block">
                          {concert.group.name} →
                        </Link>
                      ) : (
                        <p className="text-xs text-gray-500 mt-0.5">{concert.group.name}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">{concert.location}</p>
                    </div>
                    <p className="flex-shrink-0 text-xs text-purple-600 font-medium capitalize hidden sm:block">
                      {format(concert.date, 'EEEE d MMMM', { locale: fr })}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-indigo-900">Votre groupe a un concert ?</p>
                <p className="text-xs text-indigo-600 mt-0.5">Inscrivez-vous et ajoutez vos événements pour les rendre visibles ici.</p>
              </div>
              <Link
                href="/inscription"
                className="flex-shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                S&apos;inscrire
              </Link>
            </div>
          </div>

          {/* Groupes inscrits — 1/3 */}
          <div>
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
              <div className="space-y-3">
                {discoverGroups.map((group) => {
                  const instruments = parseLookingFor(group.lookingFor)
                  return (
                    <div key={group.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
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
        </div>
      </div>

      {/* Petites annonces CTA */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-8">
        <div className="rounded-2xl bg-white border border-gray-200 px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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
        </div>
      </div>

      {/* Newsletter */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-8">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white px-6 py-7 sm:flex items-center justify-between gap-6">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-lg font-bold flex items-center gap-2">📬 Restez informé·e</h2>
            <p className="text-sm text-white/80 mt-1">Nouveautés, astuces et conseils pour les groupes. Sans compte, désinscription en 1 clic.</p>
          </div>
          <NewsletterSignup variant="dark" />
        </div>
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

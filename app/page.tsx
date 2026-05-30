import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { PublicJoinButton } from './PublicJoinButton'

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

  const [concerts, groupsLooking] = await Promise.all([
    prisma.concert.findMany({
      where: { date: { gte: now }, isPublic: true, group: { isPublic: true, isHidden: false } },
      orderBy: { date: 'asc' },
      take: 15,
      include: { group: { select: { name: true, groupPage: { select: { slug: true, published: true } } } } },
    }),
    prisma.group.findMany({
      where: { isPublic: true, lookingFor: { not: null } },
      select: {
        id: true,
        name: true,
        description: true,
        lookingFor: true,
        lookingForSince: true,
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 9,
    }),
  ])

  const validGroupsLooking = groupsLooking.filter((g) => {
    const lf = parseLookingFor(g.lookingFor)
    return lf.length > 0
  })

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
          <div className="flex items-center gap-3">
            <Link
              href="/annonces"
              className="hidden sm:block text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
            >
              Annonces
            </Link>
            <Link
              href="/tarifs"
              className="hidden sm:block text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
            >
              Tarifs
            </Link>
            <Link
              href="/aide"
              className="hidden sm:block text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
            >
              Aide
            </Link>
            <Link
              href="/connexion"
              className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
            >
              Se connecter
            </Link>
            <Link
              href="/inscription"
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              S&apos;inscrire
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
              La plateforme pour les{' '}
              <span className="text-indigo-600">musiciens en groupe</span>
            </h1>
            <p className="mt-4 text-gray-500 text-base sm:text-lg leading-relaxed">
              Organisez vos répétitions, gérez votre répertoire, suivez vos concerts.
              Rejoignez un groupe ou trouvez des musiciens pour compléter le vôtre.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <Link
                href="/inscription"
                className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
              >
                Créer mon compte gratuitement
              </Link>
              <Link
                href="/tarifs"
                className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
              >
                Voir les tarifs →
              </Link>
              <Link
                href="/connexion"
                className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
              >
                Déjà inscrit ? →
              </Link>
            </div>
          </div>
        </div>
      </div>

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

          {/* Groups looking — 1/3 */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-sm">🔍</span>
              Groupes qui cherchent
            </h2>

            {validGroupsLooking.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-5 py-10 text-center bg-white">
                <p className="text-3xl mb-3">🎸</p>
                <p className="text-sm text-gray-500">Aucun groupe ne cherche de musicien pour l&apos;instant.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {validGroupsLooking.map((group) => {
                  const instruments = parseLookingFor(group.lookingFor)
                  return (
                    <div key={group.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                          {group.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 text-sm leading-tight">{group.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{group._count.members} membre{group._count.members > 1 ? 's' : ''}</p>
                          {group.lookingForSince && (
                            <p className="text-xs text-gray-400 mt-0.5">Depuis le {format(group.lookingForSince, 'd MMM yyyy', { locale: fr })}</p>
                          )}
                          {group.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{group.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs text-amber-600 font-medium self-center">Cherche :</span>
                        {instruments.map((inst) => (
                          <span key={inst} className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">
                            {inst}
                          </span>
                        ))}
                      </div>
                      <PublicJoinButton groupId={group.id} groupName={group.name} />
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

      {/* Footer */}
      <footer className="mt-4 border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
              <span className="text-xs">🎹</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold text-indigo-900">Sol au piano</span>
              <span className="text-[10px] text-indigo-400 italic">du solo à l&apos;orchestre</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 hidden sm:block">La plateforme pour les musiciens en groupe</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <Link href="/connexion" className="hover:text-indigo-600 transition-colors">Connexion</Link>
            <Link href="/inscription" className="hover:text-indigo-600 transition-colors">Inscription</Link>
            <Link href="/annonces" className="hover:text-indigo-600 transition-colors">Annonces</Link>
            <Link href="/tarifs" className="hover:text-indigo-600 transition-colors">Tarifs</Link>
            <Link href="/aide" className="hover:text-indigo-600 transition-colors">Aide</Link>
            <Link href="/mentions-legales" className="hover:text-indigo-600 transition-colors">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

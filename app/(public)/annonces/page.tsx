import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Petites annonces — Sol au piano',
  description: 'Achetez, vendez du matériel musical, trouvez un groupe ou un musicien.',
}

export default async function AnnoncesPage({ searchParams }: { searchParams: { category?: string } }) {
  const session = await getServerSession(authOptions)
  const category = searchParams.category || 'TOUS'

  const [dbCategories, annonces] = await Promise.all([
    prisma.annonceCategorie.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.annonce.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gte: new Date() },
        ...(category !== 'TOUS' ? { category } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    }),
  ])

  const catMap = Object.fromEntries(dbCategories.map(c => [c.key, c]))
  const CATEGORIES = [{ key: 'TOUS', label: 'Toutes', emoji: '🎵' }, ...dbCategories]

  function categoryLabel(key: string) {
    return catMap[key] ?? { label: key, emoji: '📌' }
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-base">🎹</span>
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-bold text-indigo-900 text-base">Sol au piano</span>
              <span className="text-[10px] text-indigo-400 italic">du solo à l&apos;orchestre</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {session ? (
              <>
                <Link href="/tableau-de-bord" className="hidden sm:block text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">Mon espace</Link>
                <Link href="/annonces/nouvelle" className="rounded-lg bg-indigo-600 px-3 sm:px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors whitespace-nowrap">
                  + Déposer
                </Link>
              </>
            ) : (
              <>
                <Link href="/connexion" className="hidden sm:block text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">Se connecter</Link>
                <Link href="/inscription" className="rounded-lg bg-indigo-600 px-3 sm:px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors whitespace-nowrap">
                  S&apos;inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Petites annonces</h1>
          <p className="text-sm text-gray-500 mt-1">Matériel, musiciens, groupes… la communauté Sol au piano</p>
        </div>

        {/* Filtres catégories */}
        <div className="flex gap-2 flex-wrap mb-6">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.key}
              href={cat.key === 'TOUS' ? '/annonces' : `/annonces?category=${cat.key}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                category === cat.key
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              <span>{cat.emoji}</span> {cat.label}
            </Link>
          ))}
        </div>

        {/* Bannière connexion pour voir les contacts */}
        {!session && (
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
            <span className="text-xl">🔒</span>
            <p className="text-sm text-amber-800">
              <strong>Connectez-vous</strong> pour voir les coordonnées des annonceurs.{' '}
              <Link href="/connexion" className="underline hover:text-amber-900">Se connecter →</Link>
            </p>
          </div>
        )}

        {/* Grille annonces */}
        {annonces.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-500 font-medium">Aucune annonce dans cette catégorie</p>
            {session && (
              <Link href="/annonces/nouvelle" className="inline-block mt-4 rounded-xl bg-indigo-600 text-white px-5 py-2 text-sm font-semibold hover:bg-indigo-500 transition-colors">
                Soyez le premier à déposer une annonce
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {annonces.map(annonce => {
              const cat = categoryLabel(annonce.category)
              return (
                <Link
                  key={annonce.id}
                  href={`/annonces/${annonce.id}`}
                  className="group rounded-2xl border border-gray-200 bg-white hover:border-indigo-200 hover:shadow-md transition-all overflow-hidden"
                >
                  {/* Photo */}
                  {annonce.photoPath ? (
                    <div className="h-40 overflow-hidden bg-gray-100">
                      <img
                        src={annonce.photoPath}
                        alt={annonce.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="h-24 bg-gradient-to-br from-indigo-50 to-gray-100 flex items-center justify-center">
                      <span className="text-4xl opacity-60">{cat.emoji}</span>
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5">
                        {cat.emoji} {cat.label}
                      </span>
                      {annonce.price != null && (
                        <span className="text-sm font-bold text-indigo-600 whitespace-nowrap">
                          {annonce.price.toFixed(0)} €
                        </span>
                      )}
                    </div>
                    <h2 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">
                      {annonce.title}
                    </h2>
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2">{annonce.description}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-[10px] font-bold overflow-hidden">
                          {annonce.user.avatarUrl
                            ? <img src={annonce.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            : annonce.user.name.charAt(0).toUpperCase()
                          }
                        </div>
                        <span className="text-xs text-gray-500 truncate max-w-[80px]">{annonce.user.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {annonce.location && <span>📍 {annonce.location}</span>}
                        <span>{format(new Date(annonce.createdAt), 'd MMM', { locale: fr })}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center"><span className="text-[10px]">🎹</span></div>
            <span className="font-semibold text-indigo-900">Sol au piano</span>
          </Link>
          <div className="flex gap-3 flex-wrap">
            <Link href="/" className="hover:text-indigo-600">Accueil</Link>
            <Link href="/tarifs" className="hover:text-indigo-600">Tarifs</Link>
            <Link href="/aide" className="hover:text-indigo-600">Aide</Link>
            <Link href="/mentions-legales" className="hover:text-indigo-600">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

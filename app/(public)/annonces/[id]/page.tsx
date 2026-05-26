import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MarkSoldButton, DeleteButton } from './AnnonceActions'

export const dynamic = 'force-dynamic'

export default async function AnnonceDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const [annonce, dbCats] = await Promise.all([
    prisma.annonce.findUnique({
      where: { id: Number(params.id) },
      include: { user: { select: { id: true, name: true, avatarUrl: true, createdAt: true } } },
    }),
    prisma.annonceCategorie.findMany(),
  ])

  const isOwner = session && Number(session.user.id) === annonce.userId
  const isAdmin = session?.user.siteRole === 'ADMIN'

  // MASQUEE → 404 pour tout le monde
  // PENDING → 404 sauf pour le propriétaire et l'admin
  if (!annonce) notFound()
  if (annonce.status === 'MASQUEE' && !isAdmin) notFound()
  if (annonce.status === 'PENDING' && !isOwner && !isAdmin) notFound()
  const catMap = Object.fromEntries(dbCats.map(c => [c.key, c]))
  const cat = catMap[annonce.category] ?? { label: annonce.category, emoji: '📌' }
  const isLoggedIn = !!session

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
            <Link href="/annonces" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
              ← Annonces
            </Link>
            {session ? (
              <Link href="/annonces/nouvelle" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors whitespace-nowrap">
                + Déposer
              </Link>
            ) : (
              <Link href="/inscription" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors whitespace-nowrap">
                S&apos;inscrire
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-4">
          <Link href="/annonces" className="hover:text-indigo-600">Annonces</Link>
          <span>›</span>
          <span>{cat.emoji} {cat.label}</span>
        </nav>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Photo */}
          {annonce.photoPath && (
            <div className="h-56 sm:h-72 overflow-hidden bg-gray-100">
              <img src={annonce.photoPath} alt={annonce.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-5 sm:p-6">
            {/* Bandeau statut non-public */}
            {annonce.status === 'PENDING' && (
              <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
                <span className="text-xl mt-0.5">⏳</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Annonce en attente de validation</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {isAdmin
                      ? 'Cette annonce attend votre validation avant d\'être visible publiquement.'
                      : 'Votre annonce sera visible dès qu\'elle aura été validée par l\'administrateur. Vous seul pouvez la voir pour l\'instant.'}
                  </p>
                  {(isOwner && !isAdmin) && (
                    <Link href={`/annonces/${annonce.id}/modifier`} className="inline-block mt-2 text-xs font-semibold text-amber-800 underline hover:text-amber-900">
                      Modifier l&apos;annonce →
                    </Link>
                  )}
                  {isAdmin && (
                    <Link href="/admin/annonces" className="inline-block mt-2 text-xs font-semibold text-amber-800 underline hover:text-amber-900">
                      Valider depuis l&apos;admin →
                    </Link>
                  )}
                </div>
              </div>
            )}
            {annonce.status === 'MASQUEE' && (isOwner || isAdmin) && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
                <span className="text-xl mt-0.5">🚫</span>
                <div>
                  <p className="text-sm font-semibold text-red-700">Annonce refusée / masquée</p>
                  {(annonce as any).adminComment ? (
                    <>
                      <p className="text-xs font-semibold text-red-600 mt-1">Message de l&apos;administrateur :</p>
                      <p className="text-xs text-red-600 italic mt-0.5">{(annonce as any).adminComment}</p>
                    </>
                  ) : (
                    <p className="text-xs text-red-600 mt-0.5">Aucun commentaire laissé par l&apos;administrateur.</p>
                  )}
                  {isOwner && !isAdmin && (
                    <Link href={`/annonces/${annonce.id}/modifier`} className="inline-block mt-2 text-xs font-semibold text-red-700 underline hover:text-red-800">
                      Modifier et resoumettre →
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1">
                {cat.emoji} {cat.label}
              </span>
              {annonce.status === 'VENDUE' && (
                <span className="rounded-full bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1">Vendu / Pourvu</span>
              )}
              {annonce.status === 'EXPIREE' && (
                <span className="rounded-full bg-gray-100 text-gray-500 text-xs font-bold px-2.5 py-1">Expirée</span>
              )}
            </div>

            {/* Titre + prix */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{annonce.title}</h1>
              {annonce.price != null && (
                <span className="text-2xl font-extrabold text-indigo-600 whitespace-nowrap flex-shrink-0">
                  {annonce.price.toFixed(0)} €
                </span>
              )}
            </div>

            {/* Méta */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-5 pb-5 border-b border-gray-100">
              {annonce.location && <span className="flex items-center gap-1">📍 {annonce.location}</span>}
              <span className="flex items-center gap-1">📅 {format(new Date(annonce.createdAt), "d MMMM yyyy", { locale: fr })}</span>
              <span className="flex items-center gap-1">⏳ Expire le {format(new Date(annonce.expiresAt), "d MMMM yyyy", { locale: fr })}</span>
            </div>

            {/* Description */}
            <div className="prose prose-sm max-w-none text-gray-700 mb-6">
              <p className="whitespace-pre-wrap leading-relaxed">{annonce.description}</p>
            </div>

            {/* Contact */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden flex-shrink-0">
                  {annonce.user.avatarUrl
                    ? <img src={annonce.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : annonce.user.name.charAt(0).toUpperCase()
                  }
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{annonce.user.name}</p>
                  <p className="text-xs text-gray-400">Membre depuis {format(new Date(annonce.user.createdAt), "MMMM yyyy", { locale: fr })}</p>
                </div>
              </div>

              {isLoggedIn ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Coordonnées</p>
                  {annonce.contactEmail && (
                    <a href={`mailto:${annonce.contactEmail}`} className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                      <span>✉️</span> {annonce.contactEmail}
                    </a>
                  )}
                  {annonce.contactPhone && (
                    <a href={`tel:${annonce.contactPhone}`} className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                      <span>📞</span> {annonce.contactPhone}
                    </a>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-center">
                  <p className="text-sm text-amber-800 font-medium mb-2">🔒 Connectez-vous pour voir les coordonnées</p>
                  <div className="flex gap-2 justify-center">
                    <Link href={`/connexion?callbackUrl=/annonces/${annonce.id}`} className="rounded-lg bg-indigo-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-indigo-500 transition-colors">
                      Se connecter
                    </Link>
                    <Link href="/inscription" className="rounded-lg border border-gray-300 text-gray-700 px-4 py-1.5 text-sm font-semibold hover:bg-gray-50 transition-colors">
                      S&apos;inscrire
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Actions propriétaire */}
            {(isOwner || isAdmin) && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                {isOwner && annonce.status === 'ACTIVE' && (
                  <MarkSoldButton id={annonce.id} />
                )}
                {(isOwner || isAdmin) && (
                  <DeleteButton id={annonce.id} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Autres annonces */}
        <div className="mt-6 text-center">
          <Link href="/annonces" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            ← Voir toutes les annonces
          </Link>
        </div>
      </div>
    </div>
  )
}


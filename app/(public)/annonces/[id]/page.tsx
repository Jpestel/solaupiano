import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

const CATEGORIES: Record<string, { label: string; emoji: string }> = {
  MATERIEL: { label: 'Matériel à vendre', emoji: '🎸' },
  MUSICIEN: { label: 'Recherche musicien', emoji: '👤' },
  GROUPE:   { label: 'Recherche groupe',   emoji: '🎼' },
  COURS:    { label: 'Cours de musique',   emoji: '📚' },
  AUTRE:    { label: 'Autre',              emoji: '📌' },
}

export default async function AnnonceDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const annonce = await prisma.annonce.findUnique({
    where: { id: Number(params.id) },
    include: { user: { select: { id: true, name: true, avatarUrl: true, createdAt: true } } },
  })

  if (!annonce || annonce.status === 'MASQUEE') notFound()

  const isOwner = session && Number(session.user.id) === annonce.userId
  const isAdmin = session?.user.siteRole === 'ADMIN'
  const cat = CATEGORIES[annonce.category] ?? { label: annonce.category, emoji: '📌' }
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

// ── Client components pour les actions ─────────────────────────────────────
'use client'

function MarkSoldButton({ id }: { id: number }) {
  return (
    <form action={`/api/annonces/${id}`} method="post" onSubmit={async (e) => {
      e.preventDefault()
      if (!confirm('Marquer cette annonce comme vendue / pourvue ?')) return
      await fetch(`/api/annonces/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'VENDUE' }) })
      window.location.reload()
    }}>
      <button type="submit" className="rounded-lg border border-gray-300 text-gray-700 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 transition-colors">
        ✓ Marquer vendu / pourvu
      </button>
    </form>
  )
}

function DeleteButton({ id }: { id: number }) {
  return (
    <button
      onClick={async () => {
        if (!confirm('Supprimer définitivement cette annonce ?')) return
        await fetch(`/api/annonces/${id}`, { method: 'DELETE' })
        window.location.href = '/annonces'
      }}
      className="rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-sm font-medium hover:bg-red-50 transition-colors"
    >
      🗑 Supprimer
    </button>
  )
}

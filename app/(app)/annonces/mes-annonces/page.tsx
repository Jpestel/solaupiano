'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const CATEGORIES: Record<string, { label: string; emoji: string }> = {
  MATERIEL: { label: 'Matériel à vendre', emoji: '🎸' },
  MUSICIEN: { label: 'Recherche musicien', emoji: '👤' },
  GROUPE:   { label: 'Recherche groupe',   emoji: '🎼' },
  COURS:    { label: 'Cours de musique',   emoji: '📚' },
  AUTRE:    { label: 'Autre',              emoji: '📌' },
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE:   { label: 'Active',           color: 'bg-green-100 text-green-700' },
  VENDUE:   { label: 'Vendu / Pourvu',   color: 'bg-red-100 text-red-600' },
  EXPIREE:  { label: 'Expirée',          color: 'bg-gray-100 text-gray-500' },
  MASQUEE:  { label: 'Masquée (admin)',  color: 'bg-orange-100 text-orange-600' },
}

interface Annonce {
  id: number
  title: string
  category: string
  status: string
  price: number | null
  location: string | null
  photoPath: string | null
  createdAt: string
  expiresAt: string
}

export default function MesAnnoncesPage() {
  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/annonces/mes-annonces')
      .then(r => r.json())
      .then(data => { setAnnonces(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const markSold = async (id: number) => {
    if (!confirm('Marquer cette annonce comme vendue / pourvue ?')) return
    await fetch(`/api/annonces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'VENDUE' }),
    })
    setAnnonces(prev => prev.map(a => a.id === id ? { ...a, status: 'VENDUE' } : a))
  }

  const deleteAnnonce = async (id: number) => {
    if (!confirm('Supprimer définitivement cette annonce ?')) return
    setDeleting(id)
    await fetch(`/api/annonces/${id}`, { method: 'DELETE' })
    setAnnonces(prev => prev.filter(a => a.id !== id))
    setDeleting(null)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/annonces" className="text-sm text-gray-500 hover:text-indigo-600">← Annonces</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">Mes annonces</h1>
        </div>
        <Link
          href="/annonces/nouvelle"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          + Nouvelle annonce
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400">Chargement…</div>
      ) : annonces.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500 font-medium mb-4">Vous n&apos;avez pas encore d&apos;annonce</p>
          <Link
            href="/annonces/nouvelle"
            className="inline-block rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Déposer ma première annonce
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {annonces.map(annonce => {
            const cat = CATEGORIES[annonce.category] ?? { label: annonce.category, emoji: '📌' }
            const st = STATUS_LABELS[annonce.status] ?? { label: annonce.status, color: 'bg-gray-100 text-gray-500' }
            const isExpired = annonce.status === 'EXPIREE' || new Date(annonce.expiresAt) < new Date()

            return (
              <div key={annonce.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4">
                {/* Miniature photo */}
                <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                  {annonce.photoPath
                    ? <img src={annonce.photoPath} alt="" className="w-full h-full object-cover" />
                    : <span className="text-2xl opacity-40">{cat.emoji}</span>
                  }
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start gap-2 mb-1">
                    <Link href={`/annonces/${annonce.id}`} className="font-semibold text-gray-900 text-sm hover:text-indigo-600 transition-colors truncate">
                      {annonce.title}
                    </Link>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    <span>{cat.emoji} {cat.label}</span>
                    {annonce.price != null && <span className="font-semibold text-indigo-600">{annonce.price.toFixed(0)} €</span>}
                    {annonce.location && <span>📍 {annonce.location}</span>}
                    <span>Publiée le {format(new Date(annonce.createdAt), 'd MMM yyyy', { locale: fr })}</span>
                    {!isExpired && <span className="text-orange-500">Expire le {format(new Date(annonce.expiresAt), 'd MMM yyyy', { locale: fr })}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <Link
                    href={`/annonces/${annonce.id}`}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium text-right"
                  >
                    Voir →
                  </Link>
                  {annonce.status === 'ACTIVE' && (
                    <button
                      onClick={() => markSold(annonce.id)}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                    >
                      ✓ Marquer vendu
                    </button>
                  )}
                  <button
                    onClick={() => deleteAnnonce(annonce.id)}
                    disabled={deleting === annonce.id}
                    className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                  >
                    {deleting === annonce.id ? '…' : '🗑 Supprimer'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

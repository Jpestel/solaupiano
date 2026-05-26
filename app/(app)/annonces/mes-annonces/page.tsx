'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string; hint: string }> = {
  PENDING: {
    label: 'En attente',
    color: 'bg-amber-100 text-amber-700',
    icon: '⏳',
    hint: 'En attente de validation par l\'administrateur.',
  },
  ACTIVE: {
    label: 'Active',
    color: 'bg-green-100 text-green-700',
    icon: '✅',
    hint: 'Visible par tous les membres.',
  },
  VENDUE: {
    label: 'Vendu / Pourvu',
    color: 'bg-gray-100 text-gray-500',
    icon: '🏁',
    hint: 'Annonce clôturée.',
  },
  EXPIREE: {
    label: 'Expirée',
    color: 'bg-gray-100 text-gray-400',
    icon: '⌛',
    hint: 'Annonce arrivée à échéance (60 jours).',
  },
  MASQUEE: {
    label: 'Refusée',
    color: 'bg-red-100 text-red-600',
    icon: '🚫',
    hint: 'Refusée ou masquée par l\'administrateur. Modifiez-la et resoumettez.',
  },
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

interface CatMap {
  [key: string]: { label: string; emoji: string }
}

export default function MesAnnoncesPage() {
  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [catMap, setCatMap] = useState<CatMap>({})
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/annonces/mes-annonces').then(r => r.json()),
      fetch('/api/annonces/categories').then(r => r.json()),
    ]).then(([data, cats]) => {
      setAnnonces(data)
      setCatMap(Object.fromEntries(cats.map((c: any) => [c.key, c])))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const markSold = async (id: number) => {
    if (!confirm('Marquer cette annonce comme vendue / pourvue ?')) return
    setActing(id)
    await fetch(`/api/annonces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'VENDUE' }),
    })
    setAnnonces(prev => prev.map(a => a.id === id ? { ...a, status: 'VENDUE' } : a))
    setActing(null)
  }

  const deleteAnnonce = async (id: number) => {
    if (!confirm('Supprimer définitivement cette annonce ?')) return
    setActing(id)
    await fetch(`/api/annonces/${id}`, { method: 'DELETE' })
    setAnnonces(prev => prev.filter(a => a.id !== id))
    setActing(null)
  }

  const pendingCount = annonces.filter(a => a.status === 'PENDING').length
  const refusedCount = annonces.filter(a => a.status === 'MASQUEE').length

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

      {/* Alertes */}
      {refusedCount > 0 && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-center gap-3">
          <span className="text-xl">🚫</span>
          <p className="text-sm text-red-700">
            <strong>{refusedCount} annonce{refusedCount > 1 ? 's' : ''} refusée{refusedCount > 1 ? 's' : ''}</strong> par l&apos;administrateur. Modifiez-la{refusedCount > 1 ? '-les' : ''} et resoumettez.
          </p>
        </div>
      )}
      {pendingCount > 0 && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
          <span className="text-xl">⏳</span>
          <p className="text-sm text-amber-800">
            <strong>{pendingCount} annonce{pendingCount > 1 ? 's' : ''}</strong> en attente de validation.
          </p>
        </div>
      )}

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
            const cat = catMap[annonce.category] ?? { label: annonce.category, emoji: '📌' }
            const st = STATUS_CONFIG[annonce.status] ?? { label: annonce.status, color: 'bg-gray-100 text-gray-500', icon: '•', hint: '' }
            const isExpired = annonce.status === 'EXPIREE' || new Date(annonce.expiresAt) < new Date()
            const canEdit = ['PENDING', 'ACTIVE', 'MASQUEE'].includes(annonce.status)
            const canMarkSold = annonce.status === 'ACTIVE'
            const isActing = acting === annonce.id

            return (
              <div
                key={annonce.id}
                className={`bg-white rounded-2xl border p-4 flex gap-4 transition-colors ${
                  annonce.status === 'MASQUEE' ? 'border-red-200 bg-red-50/30' :
                  annonce.status === 'PENDING' ? 'border-amber-200 bg-amber-50/20' :
                  'border-gray-200'
                }`}
              >
                {/* Miniature */}
                <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                  {annonce.photoPath
                    ? <img src={annonce.photoPath} alt="" className="w-full h-full object-cover" />
                    : <span className="text-2xl opacity-40">{cat.emoji}</span>
                  }
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm truncate">{annonce.title}</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                      {st.icon} {st.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-1">{st.hint}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    <span>{cat.emoji} {cat.label}</span>
                    {annonce.price != null && <span className="font-semibold text-indigo-600">{annonce.price.toFixed(0)} €</span>}
                    {annonce.location && <span>📍 {annonce.location}</span>}
                    <span>Déposée le {format(new Date(annonce.createdAt), 'd MMM yyyy', { locale: fr })}</span>
                    {!isExpired && annonce.status === 'ACTIVE' && (
                      <span className="text-orange-500">Expire le {format(new Date(annonce.expiresAt), 'd MMM yyyy', { locale: fr })}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 flex-shrink-0 items-end">
                  {annonce.status === 'ACTIVE' && (
                    <Link href={`/annonces/${annonce.id}`} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                      Voir →
                    </Link>
                  )}
                  {canEdit && (
                    <Link
                      href={`/annonces/${annonce.id}/modifier`}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      ✏️ Modifier
                    </Link>
                  )}
                  {canMarkSold && (
                    <button
                      onClick={() => markSold(annonce.id)}
                      disabled={isActing}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium disabled:opacity-50"
                    >
                      ✓ Vendu / Pourvu
                    </button>
                  )}
                  <button
                    onClick={() => deleteAnnonce(annonce.id)}
                    disabled={isActing}
                    className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                  >
                    {isActing ? '…' : '🗑 Supprimer'}
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

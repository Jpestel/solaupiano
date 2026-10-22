'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AUDIT_ENTITIES } from '@/lib/audit-labels'

interface Item {
  id: number
  createdAt: string
  userId: number | null
  actorName: string
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  entityType: string
  summary: string
}
interface Author { userId: number | null; name: string }

const ICON: Record<Item['action'], { icon: string; tone: string }> = {
  CREATE: { icon: '➕', tone: 'bg-emerald-50 text-emerald-700' },
  UPDATE: { icon: '✏️', tone: 'bg-indigo-50 text-indigo-700' },
  DELETE: { icon: '🗑', tone: 'bg-red-50 text-red-600' },
}

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })

export default function HistoriquePage({ params }: { params: { id: string } }) {
  const [items, setItems] = useState<Item[]>([])
  const [authors, setAuthors] = useState<Author[]>([])
  const [cursor, setCursor] = useState<number | null>(null)
  const [retentionDays, setRetentionDays] = useState(365)
  const [authorId, setAuthorId] = useState('')
  const [entity, setEntity] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (before?: number) => {
    setLoading(true)
    const q = new URLSearchParams()
    if (authorId) q.set('userId', authorId)
    if (entity) q.set('entity', entity)
    if (before) q.set('before', String(before))
    const res = await fetch(`/api/groupes/${params.id}/historique?${q.toString()}`)
    setLoading(false)
    if (res.status === 403) { setError('Le journal est réservé aux chefs du groupe.'); return }
    if (!res.ok) { setError('Impossible de charger le journal.'); return }
    setError('')
    const data = await res.json()
    setItems((prev) => (before ? [...prev, ...data.items] : data.items))
    setCursor(data.nextCursor)
    setAuthors(data.authors)
    setRetentionDays(data.retentionDays)
  }, [params.id, authorId, entity])

  useEffect(() => { load() }, [load])

  // Regroupement par jour, dans l'ordre d'arrivée (déjà du plus récent au plus ancien)
  const days: { label: string; items: Item[] }[] = []
  for (const it of items) {
    const label = dayLabel(it.createdAt)
    const last = days[days.length - 1]
    if (last && last.label === label) last.items.push(it)
    else days.push({ label, items: [it] })
  }

  const select = 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200'

  return (
    <div className="pb-16">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${params.id}`} className="hover:text-indigo-600">Groupe</Link>
        <span>/</span>
        <span className="font-medium text-gray-700">Historique</span>
      </div>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">🕓 Historique des actions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Qui a fait quoi, et quand, dans ce groupe. Visible des chefs uniquement.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <select value={authorId} onChange={(e) => setAuthorId(e.target.value)} className={select} aria-label="Filtrer par personne">
          <option value="">Toutes les personnes</option>
          {authors.filter((a) => a.userId !== null).map((a) => (
            <option key={a.userId} value={a.userId!}>{a.name}</option>
          ))}
        </select>
        <select value={entity} onChange={(e) => setEntity(e.target.value)} className={select} aria-label="Filtrer par type">
          <option value="">Tous les éléments</option>
          {AUDIT_ENTITIES.map((e) => (
            <option key={e.key} value={e.key}>{e.filter}</option>
          ))}
        </select>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {!error && !loading && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
          <p className="text-3xl">🕓</p>
          <p className="mt-2 text-sm font-medium text-gray-700">Rien à afficher pour l&apos;instant</p>
          <p className="mt-1 text-xs text-gray-400">
            Les actions des membres apparaîtront ici à partir de maintenant.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {days.map((day) => (
          <section key={day.label}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 first-letter:uppercase">{day.label}</h2>
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {day.items.map((it) => (
                <li key={it.id} className="flex items-start gap-3 px-4 py-3">
                  <span className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs ${ICON[it.action].tone}`}>
                    {ICON[it.action].icon}
                  </span>
                  <p className="min-w-0 flex-1 text-sm leading-relaxed text-gray-700">
                    <strong className="font-semibold text-gray-900">{it.actorName}</strong> {it.summary}
                  </p>
                  <time className="flex-shrink-0 pt-0.5 text-xs tabular-nums text-gray-400" dateTime={it.createdAt}>
                    {timeLabel(it.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {cursor && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => load(cursor)}
            disabled={loading}
            className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? 'Chargement…' : 'Voir plus ancien'}
          </button>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-gray-400">
        Le journal est conservé {retentionDays >= 365 ? '12 mois' : `${retentionDays} jours`}. Les modifications répétées d&apos;un même élément
        par la même personne sont regroupées en une seule ligne.
      </p>
    </div>
  )
}

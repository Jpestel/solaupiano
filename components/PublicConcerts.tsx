'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

export interface PublicConcert {
  id: number
  name: string
  date: string // ISO
  location: string
  address: string | null
  postalCode: string | null
  city: string | null
  startTime: string | null
  groupName: string
  groupSlug: string | null
}

type Mode = 'month' | 'group'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function DateBadge({ iso }: { iso: string }) {
  const d = new Date(iso)
  return (
    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-purple-600 flex flex-col items-center justify-center text-white">
      <span className="text-[10px] font-medium uppercase leading-none">
        {d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}
      </span>
      <span className="text-base font-bold leading-tight">{d.getDate()}</span>
    </div>
  )
}

function ConcertRow({ c, showGroup = true }: { c: PublicConcert; showGroup?: boolean }) {
  const d = new Date(c.date)
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <DateBadge iso={c.date} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
        {showGroup && (
          c.groupSlug ? (
            <Link href={`/${c.groupSlug}`} className="text-xs text-indigo-600 hover:underline mt-0.5 inline-block">
              {c.groupName} →
            </Link>
          ) : (
            <p className="text-xs text-gray-500 mt-0.5">{c.groupName}</p>
          )
        )}
        <div className="text-xs text-gray-400 mt-0.5 leading-snug">
          {c.startTime && <p className="text-purple-600 font-medium">Début {c.startTime}</p>}
          <p className="text-gray-500">📍 {c.location}</p>
          {c.address && <p>{c.address}</p>}
          {(c.postalCode || c.city) && <p>{[c.postalCode, c.city].filter(Boolean).join(' ')}</p>}
        </div>
      </div>
      <p className="flex-shrink-0 text-xs text-purple-600 font-medium capitalize hidden sm:block">
        {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
    </div>
  )
}

export function PublicConcerts({ concerts }: { concerts: PublicConcert[] }) {
  const [mode, setMode] = useState<Mode>('month')

  // Groupes ordonnés selon le mode choisi (les concerts arrivent déjà triés par date).
  const sections = useMemo(() => {
    if (mode === 'group') {
      const map = new Map<string, PublicConcert[]>()
      for (const c of concerts) {
        const arr = map.get(c.groupName) ?? []
        arr.push(c)
        map.set(c.groupName, arr)
      }
      return [...map.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], 'fr'))
        .map(([key, items]) => ({ key, label: key, items }))
    }
    // Par mois
    const map = new Map<string, { label: string; items: PublicConcert[] }>()
    for (const c of concerts) {
      const d = new Date(c.date)
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
      const label = cap(d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))
      const entry = map.get(key) ?? { label, items: [] }
      entry.items.push(c)
      map.set(key, entry)
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, v]) => ({ key, label: v.label, items: v.items }))
  }, [concerts, mode])

  if (concerts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 px-6 py-12 text-center bg-white">
        <p className="text-3xl mb-3">🎭</p>
        <p className="text-sm text-gray-500">Aucun concert annoncé pour l&apos;instant.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Sélecteur de regroupement (utile quand il y a beaucoup de concerts) */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-xs text-gray-400 mr-1">Trier par</span>
        {([
          { id: 'month', label: '📅 Mois' },
          { id: 'group', label: '🎵 Groupe' },
        ] as const).map((opt) => (
          <button
            key={opt.id}
            onClick={() => setMode(opt.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              mode === opt.id
                ? 'bg-purple-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {sections.map((section) => (
          <div key={section.key}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-gray-700 capitalize">{section.label}</h3>
              <span className="text-xs text-gray-400">
                {section.items.length} concert{section.items.length > 1 ? 's' : ''}
              </span>
              <div className="flex-1 border-t border-gray-100" />
            </div>
            <div className="space-y-3">
              {section.items.map((c) => (
                <ConcertRow key={c.id} c={c} showGroup={mode === 'month'} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'

interface GroupRepertoire {
  id: number
  name: string
  songs: { id: number; title: string }[]
}

export function RepertoiresPanel({ data }: { data: GroupRepertoire[] }) {
  const [groupId, setGroupId] = useState<'all' | number>('all')
  const [q, setQ] = useState('')

  const total = data.reduce((n, g) => n + g.songs.length, 0)
  const ql = q.trim().toLowerCase()

  const filtered = data
    .filter((g) => groupId === 'all' || g.id === groupId)
    .map((g) => ({ ...g, songs: ql ? g.songs.filter((s) => s.title.toLowerCase().includes(ql)) : g.songs }))
    .filter((g) => g.songs.length > 0)

  const shown = filtered.reduce((n, g) => n + g.songs.length, 0)
  const filtering = ql !== '' || groupId !== 'all'

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          <span>🎼</span> Répertoires — titres des morceaux
          <span className="text-xs font-normal text-gray-400">({filtering ? `${shown} / ${total}` : total})</span>
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={String(groupId)}
            onChange={(e) => setGroupId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 max-w-[160px]"
          >
            <option value="all">Tous les groupes</option>
            {data.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 Titre…"
            className="rounded-lg border border-gray-300 px-2 py-1 text-xs w-28 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Aucun morceau.</p>
        ) : (
          filtered.map((g) => (
            <div key={g.id} className="px-4 py-3">
              <p className="text-sm font-semibold text-gray-900 mb-1.5">
                {g.name} <span className="text-xs font-normal text-gray-400">· {g.songs.length} titre{g.songs.length > 1 ? 's' : ''}</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {g.songs.map((s) => (
                  <span key={s.id} className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-2.5 py-0.5 text-xs text-gray-700">
                    {s.title}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

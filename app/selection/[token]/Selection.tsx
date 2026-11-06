'use client'

import { useState } from 'react'
import type { PublicScore } from '@/lib/reprises-partage'
import { Viewer } from '../../partition/Viewer'

export function Selection({ token, name, scores }: { token: string; name: string | null; scores: PublicScore[] }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <main className="mx-auto min-h-screen max-w-xl bg-white px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900">{name || 'Partitions partagées'}</h1>
      <p className="mb-4 text-sm text-gray-500">{scores.length} partition{scores.length > 1 ? 's' : ''} — touchez un titre pour l&apos;afficher.</p>
      <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200">
        {scores.map((s, i) => (
          <li key={s.id}>
            <button onClick={() => setOpen(i)} className="w-full px-4 py-3 text-left">
              <div className="font-medium text-gray-900">{s.title}</div>
              <div className="text-xs text-gray-500">{[s.performer, s.composer && `de ${s.composer}`, s.style].filter(Boolean).join(' · ')}</div>
            </button>
          </li>
        ))}
      </ul>
      {open !== null && <Viewer key={open} token={token} scores={scores} start={open} onClose={() => setOpen(null)} />}
    </main>
  )
}

'use client'

import { useState, useEffect } from 'react'

interface YtResult { videoId: string; title: string; channel: string; thumbnail: string; url: string }

export function YouTubeSuggestModal({ songId, title, artist, onClose, onAdded }: {
  songId: number
  title: string
  artist?: string
  onClose: () => void
  onAdded?: () => void
}) {
  const [results, setResults] = useState<YtResult[]>([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    const q = `${title} ${artist || ''} clip officiel`.trim()
    fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => setResults(d.results || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [title, artist])

  const add = async (r: YtResult) => {
    setAddingId(r.videoId)
    await fetch(`/api/morceaux/${songId}/ressources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: r.url, name: `Vidéo — ${r.title}`.slice(0, 120) }),
    })
    setAddingId(null)
    setAdded(true)
    onAdded?.()
    setTimeout(onClose, 700)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/40 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl my-4 max-h-[calc(100vh-2rem)] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">🎬 Vidéo YouTube ?</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">Suggestions pour « {title}{artist ? ` — ${artist}` : ''} »</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 -mr-1 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          {added ? (
            <p className="text-sm text-green-700 text-center py-6">✓ Lien ajouté aux ressources du morceau !</p>
          ) : loading ? (
            <p className="text-sm text-gray-400 text-center py-8">🔎 Recherche sur YouTube…</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucune vidéo trouvée. Vous pourrez ajouter un lien manuellement plus tard.</p>
          ) : (
            <ul className="space-y-2">
              {results.map((r) => (
                <li key={r.videoId} className="flex items-center gap-3 rounded-xl border border-gray-200 p-2 hover:border-indigo-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.thumbnail} alt="" className="w-24 h-14 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{r.title}</p>
                    {r.channel && <p className="text-xs text-gray-400 truncate">{r.channel}</p>}
                  </div>
                  <button onClick={() => add(r)} disabled={!!addingId}
                    className="flex-shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
                    {addingId === r.videoId ? '…' : 'Ajouter'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            {added ? 'Fermer' : 'Ignorer'}
          </button>
        </div>
      </div>
    </div>
  )
}

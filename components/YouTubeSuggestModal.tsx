'use client'

import { useState, useEffect, useCallback } from 'react'

interface YtResult { videoId: string; title: string; channel: string; thumbnail: string; url: string }

export function YouTubeSuggestModal({ songId, title, artist, onClose, onAdded }: {
  songId: number
  title: string
  artist?: string
  onClose: () => void
  onAdded?: () => void
}) {
  const [videos, setVideos] = useState<YtResult[]>([])
  const [loadingV, setLoadingV] = useState(true)
  const [addingUrl, setAddingUrl] = useState<string | null>(null)
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set())

  const q = `${title} ${artist || ''}`.trim()
  const enc = encodeURIComponent(q)

  useEffect(() => {
    fetch(`/api/youtube/search?q=${encodeURIComponent(q + ' clip officiel')}`)
      .then((r) => r.json()).then((d) => setVideos(d.results || [])).catch(() => {}).finally(() => setLoadingV(false))
  }, [q])

  const addLink = useCallback(async (url: string, name: string) => {
    setAddingUrl(url)
    await fetch(`/api/morceaux/${songId}/ressources`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, name: name.slice(0, 120) }),
    })
    setAddingUrl(null)
    setAddedUrls((s) => new Set(s).add(url))
    onAdded?.()
  }, [songId, onAdded])

  // Partitions à télécharger
  const SHEETS = [
    { label: 'Free-scores', icon: '🎼', url: `https://www.free-scores.com/search.php?search=${enc}` },
    { label: 'MuseScore', icon: '🎼', url: `https://musescore.com/sheetmusic?text=${enc}` },
  ]
  // Sites pour travailler le morceau (accords, paroles, play-along, tabs)
  const PRACTICE = [
    { label: 'Chordify', icon: '🎸', desc: 'Accords synchronisés / play-along', url: `https://chordify.net/search/${enc}` },
    { label: 'Ultimate Guitar', icon: '🎸', desc: 'Tablatures & accords', url: `https://www.ultimate-guitar.com/search.php?search_type=title&value=${enc}` },
    { label: 'Songsterr', icon: '🎸', desc: 'Tablatures interactives', url: `https://www.songsterr.com/?pattern=${enc}` },
    { label: 'Lyrics (Genius)', icon: '📝', desc: 'Paroles', url: `https://genius.com/search?q=${enc}` },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/40 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl my-4 max-h-[calc(100vh-2rem)] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">🔎 Ressources pour ce morceau</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">« {title}{artist ? ` — ${artist}` : ''} »</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 -mr-1 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-5">
          {/* Vidéos */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">🎬 Vidéos (YouTube)</h4>
            {loadingV ? (
              <p className="text-sm text-gray-400 py-3">Recherche…</p>
            ) : videos.length === 0 ? (
              <p className="text-sm text-gray-400 py-3">Aucune vidéo trouvée.</p>
            ) : (
              <ul className="space-y-2">
                {videos.slice(0, 4).map((r) => {
                  const isAdded = addedUrls.has(r.url)
                  return (
                    <li key={r.videoId} className="flex items-center gap-3 rounded-xl border border-gray-200 p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.thumbnail} alt="" className="w-20 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{r.title}</p>
                        {r.channel && <p className="text-xs text-gray-400 truncate">{r.channel}</p>}
                      </div>
                      <button onClick={() => addLink(r.url, `Vidéo — ${r.title}`)} disabled={!!addingUrl || isAdded}
                        className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${isAdded ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>
                        {isAdded ? '✓ Ajouté' : addingUrl === r.url ? '…' : 'Ajouter'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Partitions */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">🎼 Partitions à télécharger</h4>
            <div className="grid grid-cols-2 gap-2">
              {SHEETS.map((s) => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors">
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-sm font-medium text-gray-800">{s.label}</span>
                  <span className="ml-auto text-gray-300 text-xs">↗</span>
                </a>
              ))}
            </div>
          </div>

          {/* Travailler le morceau */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">🎸 Travailler le morceau</h4>
            <div className="space-y-1.5">
              {PRACTICE.map((s) => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors">
                  <span className="text-lg flex-shrink-0">{s.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 leading-tight">{s.label}</p>
                    <p className="text-[11px] text-gray-400">{s.desc}</p>
                  </div>
                  <span className="ml-auto text-gray-300 text-xs">↗</span>
                </a>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Les recherches sont pré-remplies avec le titre et l&apos;artiste. Pensez à vérifier les droits des partitions (privilégiez le domaine public ou les contenus gratuits).</p>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Fermer</button>
        </div>
      </div>
    </div>
  )
}

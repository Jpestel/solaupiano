'use client'

import { useState, useEffect, useCallback } from 'react'

interface YtResult { videoId: string; title: string; channel: string; thumbnail: string; url: string }
interface ScoreResult { title: string; url: string; domain: string; isPdf: boolean; free: boolean }

export function YouTubeSuggestModal({ songId, title, artist, onClose, onAdded }: {
  songId: number
  title: string
  artist?: string
  onClose: () => void
  onAdded?: () => void
}) {
  const [videos, setVideos] = useState<YtResult[]>([])
  const [scores, setScores] = useState<ScoreResult[]>([])
  const [loadingV, setLoadingV] = useState(true)
  const [loadingS, setLoadingS] = useState(true)
  const [addingUrl, setAddingUrl] = useState<string | null>(null)
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set())

  const q = `${title} ${artist || ''}`.trim()

  useEffect(() => {
    fetch(`/api/youtube/search?q=${encodeURIComponent(q + ' clip officiel')}`)
      .then((r) => r.json()).then((d) => setVideos(d.results || [])).catch(() => {}).finally(() => setLoadingV(false))
    fetch(`/api/web/scores-search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json()).then((d) => setScores(d.results || [])).catch(() => {}).finally(() => setLoadingS(false))
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

  const quick = [
    { label: 'IMSLP', url: `https://imslp.org/index.php?title=Special:Search&search=${encodeURIComponent(q)}` },
    { label: 'Mutopia', url: `https://www.mutopiaproject.org/cgibin/make-table.cgi?searchingfor=${encodeURIComponent(q)}` },
    { label: 'Free-scores', url: `https://www.free-scores.com/search.php?search=${encodeURIComponent(q)}` },
    { label: 'MuseScore (libre)', url: `https://musescore.com/sheetmusic?text=${encodeURIComponent(q)}&license=to_share` },
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

          {/* Partitions & fichiers */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">🎼 Partitions & fichiers</h4>
            {loadingS ? (
              <p className="text-sm text-gray-400 py-3">Recherche…</p>
            ) : scores.length === 0 ? (
              <p className="text-sm text-gray-400 py-3">Aucun fichier trouvé automatiquement.</p>
            ) : (
              <ul className="space-y-2">
                {scores.map((r) => {
                  const isAdded = addedUrls.has(r.url)
                  return (
                    <li key={r.url} className="flex items-center gap-3 rounded-xl border border-gray-200 p-2.5">
                      <span className="text-lg flex-shrink-0">{r.isPdf ? '📄' : '🎼'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{r.title || r.domain}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {r.domain}{r.isPdf ? ' · PDF' : ''}{r.free ? ' · gratuit' : ''}
                        </p>
                      </div>
                      <button onClick={() => addLink(r.url, `Partition — ${r.title || r.domain}`)} disabled={!!addingUrl || isAdded}
                        className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${isAdded ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>
                        {isAdded ? '✓ Ajouté' : addingUrl === r.url ? '…' : 'Ajouter'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-gray-400">Chercher aussi sur :</span>
              {quick.map((s) => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-indigo-600 hover:bg-indigo-50">
                  {s.label} ↗
                </a>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Vérifiez toujours les droits : privilégiez les partitions du domaine public ou explicitement gratuites.</p>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Fermer</button>
        </div>
      </div>
    </div>
  )
}

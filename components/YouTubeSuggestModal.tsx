'use client'

import { useState, useEffect, useCallback } from 'react'
import { buildUrl } from '@/lib/resource-links'

interface YtResult { videoId: string; title: string; channel: string; thumbnail: string; url: string }
interface RLink { id: number; label: string; icon: string; category: string; urlTemplate: string; description: string | null; active: boolean }

export function YouTubeSuggestModal({ songId, groupId, title, artist, onClose, onAdded }: {
  songId: number
  groupId: number | string
  title: string
  artist?: string
  onClose: () => void
  onAdded?: () => void
}) {
  const [videos, setVideos] = useState<YtResult[]>([])
  const [links, setLinks] = useState<RLink[]>([])
  const [loadingV, setLoadingV] = useState(true)
  const [addingUrl, setAddingUrl] = useState<string | null>(null)
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set())

  // Demande de gestion des liens
  const [manage, setManage] = useState(false)
  const [activateIds, setActivateIds] = useState<Set<number>>(new Set())
  const [deactivateIds, setDeactivateIds] = useState<Set<number>>(new Set())
  const [reqMsg, setReqMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [reqDone, setReqDone] = useState(false)

  const q = `${title} ${artist || ''}`.trim()

  useEffect(() => {
    fetch(`/api/youtube/search?q=${encodeURIComponent(q + ' clip officiel')}`)
      .then((r) => r.json()).then((d) => setVideos(d.results || [])).catch(() => {}).finally(() => setLoadingV(false))
    fetch(`/api/groupes/${groupId}/resource-links`)
      .then((r) => r.json()).then((d) => setLinks(Array.isArray(d) ? d : [])).catch(() => {})
  }, [q, groupId])

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

  const toggle = (set: Set<number>, setter: (s: Set<number>) => void, id: number) => {
    const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); setter(n)
  }

  const sendRequest = async () => {
    if (activateIds.size === 0 && deactivateIds.size === 0) return
    setSending(true)
    const res = await fetch(`/api/groupes/${groupId}/resource-links/request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activateIds: [...activateIds], deactivateIds: [...deactivateIds], message: reqMsg }),
    })
    setSending(false)
    if (res.ok) { setReqDone(true); setActivateIds(new Set()); setDeactivateIds(new Set()); setReqMsg('') }
  }

  const active = links.filter((l) => l.active)
  const inactive = links.filter((l) => !l.active)

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

          {/* Liens actifs */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">🔗 Ressources & outils</h4>
            {active.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">Aucun lien actif.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {active.map((l) => (
                  <a key={l.id} href={buildUrl(l.urlTemplate, q)} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors">
                    <span className="text-lg">{l.icon}</span>
                    <span className="text-sm font-medium text-gray-800 truncate">{l.label}</span>
                    <span className="ml-auto text-gray-300 text-xs">↗</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Gestion des liens (demande admin) */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <button onClick={() => setManage((v) => !v)} className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <span>{manage ? '▾' : '▸'}</span>
              ⚙️ Besoin d&apos;activer ou désactiver des liens ?
            </button>
            {manage && (
              reqDone ? (
                <p className="mt-2 text-sm text-green-700">✓ Demande envoyée à l&apos;administrateur. Vous serez notifié dès la mise à jour.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  <p className="text-[11px] text-gray-500">Cochez les liens souhaités, puis envoyez la demande à l&apos;administrateur du site qui les activera/désactivera pour votre groupe.</p>
                  {inactive.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-green-700 mb-1">À activer</p>
                      <div className="flex flex-wrap gap-1.5">
                        {inactive.map((l) => (
                          <label key={l.id} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs cursor-pointer ${activateIds.has(l.id) ? 'bg-green-100 border-green-300 text-green-800' : 'bg-white border-gray-200 text-gray-600'}`}>
                            <input type="checkbox" className="hidden" checked={activateIds.has(l.id)} onChange={() => toggle(activateIds, setActivateIds, l.id)} />
                            {l.icon} {l.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {active.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-red-600 mb-1">À désactiver</p>
                      <div className="flex flex-wrap gap-1.5">
                        {active.map((l) => (
                          <label key={l.id} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs cursor-pointer ${deactivateIds.has(l.id) ? 'bg-red-100 border-red-300 text-red-800' : 'bg-white border-gray-200 text-gray-600'}`}>
                            <input type="checkbox" className="hidden" checked={deactivateIds.has(l.id)} onChange={() => toggle(deactivateIds, setDeactivateIds, l.id)} />
                            {l.icon} {l.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <textarea value={reqMsg} onChange={(e) => setReqMsg(e.target.value)} rows={2} placeholder="Message (optionnel)…" className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
                  <button onClick={sendRequest} disabled={sending || (activateIds.size === 0 && deactivateIds.size === 0)}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
                    {sending ? 'Envoi…' : 'Envoyer la demande à l\'admin'}
                  </button>
                </div>
              )
            )}
          </div>
          <p className="text-[11px] text-gray-400">Vérifiez toujours les droits des partitions (privilégiez le domaine public ou les contenus gratuits).</p>
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Fermer</button>
        </div>
      </div>
    </div>
  )
}

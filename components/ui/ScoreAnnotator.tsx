'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

interface Marker { id: number; page: number; xPct: number; yPct: number; startSec: number; label: string | null; sequenceId: number }
interface Seq { id: number; title: string; filePath: string }

function fmt(t: number) {
  if (!isFinite(t)) return '0:00'
  const m = Math.floor(t / 60); const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
function parseClock(s: string): number | null {
  const t = s.trim(); if (!t) return null
  if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t)
  const parts = t.split(':').map((p) => p.trim())
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => p === '' || isNaN(Number(p)))) return null
  return parts.reduce((a, p) => a * 60 + Number(p), 0)
}

export function ScoreAnnotator({ resource, onClose }: {
  resource: { id: number; name: string; type: string; filePath: string }
  onClose: () => void
}) {
  const isPdf = resource.type === 'PDF' || /\.pdf($|\?)/i.test(resource.filePath)
  const fileUrl = `/api/ressources/${resource.id}`

  const [markers, setMarkers] = useState<Marker[]>([])
  const [sequences, setSequences] = useState<Seq[]>([])
  const [selSeqId, setSelSeqId] = useState<number | null>(null)
  const [mode, setMode] = useState<'listen' | 'edit'>('listen')
  const [page, setPage] = useState(1)
  const [numPages, setNumPages] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [selMarker, setSelMarker] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const selSeq = sequences.find((s) => s.id === selSeqId) || null

  useEffect(() => {
    fetch(`/api/ressources/${resource.id}/markers`)
      .then((r) => (r.ok ? r.json() : { markers: [], sequences: [] }))
      .then((d) => {
        setMarkers(d.markers || [])
        setSequences(d.sequences || [])
        if (d.sequences?.[0]) setSelSeqId(d.sequences[0].id)
        if (!(d.markers || []).length) setShowHelp(true) // aide au premier usage
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [resource.id])

  useEffect(() => {
    const a = audioRef.current as (HTMLAudioElement & { preservesPitch?: boolean; mozPreservesPitch?: boolean; webkitPreservesPitch?: boolean }) | null
    if (!a) return
    a.preservesPitch = true; a.mozPreservesPitch = true; a.webkitPreservesPitch = true
    a.playbackRate = speed
  }, [speed, selSeqId])

  const playFrom = useCallback((t: number, seqId?: number) => {
    const a = audioRef.current
    if (!a) return
    if (seqId && seqId !== selSeqId) { setSelSeqId(seqId); setTimeout(() => { if (audioRef.current) { audioRef.current.currentTime = t; audioRef.current.play().then(() => setPlaying(true)).catch(() => {}) } }, 60); return }
    a.currentTime = t
    a.play().then(() => setPlaying(true)).catch(() => {})
  }, [selSeqId])

  const togglePlay = () => {
    const a = audioRef.current; if (!a) return
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {})
    else { a.pause(); setPlaying(false) }
  }

  const addMarkerAt = async (xPct: number, yPct: number) => {
    if (!selSeqId) return
    const startSec = audioRef.current?.currentTime || 0
    const res = await fetch(`/api/ressources/${resource.id}/markers`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequenceId: selSeqId, page, xPct, yPct, startSec }),
    })
    if (res.ok) { const m = await res.json(); setMarkers((ms) => [...ms, m]); setSelMarker(m.id) }
  }

  const patchMarker = async (id: number, data: Partial<Marker>) => {
    const res = await fetch(`/api/ressources/${resource.id}/markers/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    })
    if (res.ok) { const upd = await res.json(); setMarkers((ms) => ms.map((m) => (m.id === id ? upd : m))) }
  }

  const deleteMarker = async (id: number) => {
    const res = await fetch(`/api/ressources/${resource.id}/markers/${id}`, { method: 'DELETE' })
    if (res.ok) { setMarkers((ms) => ms.filter((m) => m.id !== id)); if (selMarker === id) setSelMarker(null) }
  }

  const onScoreClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'edit') return
    const rect = e.currentTarget.getBoundingClientRect()
    const xPct = (e.clientX - rect.left) / rect.width
    const yPct = (e.clientY - rect.top) / rect.height
    if (xPct < 0 || xPct > 1 || yPct < 0 || yPct > 1) return
    addMarkerAt(xPct, yPct)
  }

  const pageMarkers = markers.filter((m) => (isPdf ? m.page === page : true))
  const selectedMarkerObj = markers.find((m) => m.id === selMarker) || null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900/95" onClick={onClose}>
      {/* Barre du haut */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gray-800 text-white flex-wrap" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-medium truncate flex-1 min-w-0">🔊 {resource.name}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode */}
          <div className="inline-flex rounded-lg bg-gray-700 p-0.5 text-xs">
            <button onClick={() => { setMode('listen'); setSelMarker(null) }} className={`rounded-md px-2.5 py-1 font-semibold ${mode === 'listen' ? 'bg-white text-gray-900' : 'text-gray-200'}`}>▶ Écouter</button>
            <button onClick={() => setMode('edit')} className={`rounded-md px-2.5 py-1 font-semibold ${mode === 'edit' ? 'bg-white text-gray-900' : 'text-gray-200'}`}>✎ Éditer</button>
          </div>
          {/* Zoom */}
          <button onClick={() => setScale((s) => Math.max(0.5, s - 0.2))} className="w-7 h-7 rounded bg-gray-700">−</button>
          <span className="text-xs tabular-nums w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((s) => Math.min(3, s + 0.2))} className="w-7 h-7 rounded bg-gray-700">+</button>
          <button onClick={() => setShowHelp(true)} title="Aide" className="w-7 h-7 rounded bg-gray-700 font-bold">?</button>
          <button onClick={onClose} className="w-7 h-7 rounded bg-gray-700">✕</button>
        </div>
      </div>

      {/* Bandeau d'aide / pas de séquence */}
      {sequences.length === 0 && !loading && (
        <div className="bg-amber-100 text-amber-800 text-sm px-4 py-2" onClick={(e) => e.stopPropagation()}>
          ⚠️ Ce morceau n’a pas encore de backing track (🎚 Séquences). Ajoutez-en un pour associer un audio aux marqueurs.
        </div>
      )}
      {mode === 'edit' && sequences.length > 0 && (
        <div className="bg-indigo-100 text-indigo-800 text-xs px-4 py-1.5" onClick={(e) => e.stopPropagation()}>
          ✎ Lecture l’audio jusqu’au passage voulu, puis <strong>cliquez sur la partition</strong> pour y poser un 🔊 (au timecode actuel : {fmt(cur)}).
        </div>
      )}

      {/* Zone partition (scroll) */}
      <div className="flex-1 overflow-auto p-4 flex justify-center" onClick={onClose}>
        <div className="relative inline-block bg-white" onClick={(e) => { e.stopPropagation(); onScoreClick(e) }} style={{ cursor: mode === 'edit' ? 'crosshair' : 'default' }}>
          {loading ? (
            <div className="w-[400px] h-[300px] flex items-center justify-center text-gray-400 text-sm">Chargement…</div>
          ) : isPdf ? (
            <Document file={fileUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)} loading={<div className="w-[400px] h-[300px] flex items-center justify-center text-gray-400 text-sm">Chargement du PDF…</div>}>
              <Page pageNumber={page} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} />
            </Document>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl} alt={resource.name} style={{ width: `${scale * 100}%`, maxWidth: 'none' }} className="block" />
          )}

          {/* Marqueurs */}
          {pageMarkers.map((m) => {
            const isSel = selMarker === m.id
            return (
              <button
                key={m.id}
                onClick={(e) => { e.stopPropagation(); if (mode === 'listen') playFrom(m.startSec, m.sequenceId); else setSelMarker(m.id) }}
                title={`${fmt(m.startSec)}${m.label ? ' · ' + m.label : ''}`}
                style={{ left: `${m.xPct * 100}%`, top: `${m.yPct * 100}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md border-2 ${isSel ? 'bg-indigo-600 border-white scale-110' : 'bg-white border-indigo-500 hover:bg-indigo-50'}`}
              >
                🔊
              </button>
            )
          })}
        </div>
      </div>

      {/* Pagination PDF */}
      {isPdf && numPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-1.5 bg-gray-800 text-white text-sm" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 rounded bg-gray-700 disabled:opacity-40">‹</button>
          <span className="tabular-nums">Page {page} / {numPages}</span>
          <button onClick={() => setPage((p) => Math.min(numPages, p + 1))} disabled={page >= numPages} className="px-3 py-1 rounded bg-gray-700 disabled:opacity-40">›</button>
        </div>
      )}

      {/* Lecteur audio + sélection séquence */}
      <div className="bg-gray-800 text-white px-4 py-2.5 space-y-2" onClick={(e) => e.stopPropagation()}>
        {selSeq && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio
            ref={audioRef}
            src={encodeURI(selSeq.filePath)}
            onLoadedMetadata={(e) => setDur((e.target as HTMLAudioElement).duration)}
            onTimeUpdate={(e) => setCur((e.target as HTMLAudioElement).currentTime)}
            onEnded={() => setPlaying(false)}
          />
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={togglePlay} disabled={!selSeq} className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40">{playing ? '⏸' : '▶'}</button>
          <span className="text-xs tabular-nums w-10 text-right">{fmt(cur)}</span>
          <input type="range" min={0} max={dur || 0} step={0.1} value={cur} onChange={(e) => { if (audioRef.current) { audioRef.current.currentTime = Number(e.target.value); setCur(Number(e.target.value)) } }} className="flex-1 accent-indigo-500 h-1 min-w-[120px]" />
          <span className="text-xs tabular-nums w-10">{fmt(dur)}</span>
          {/* Vitesse */}
          <div className="flex items-center gap-1">
            {[0.5, 0.75, 1].map((s) => (
              <button key={s} onClick={() => setSpeed(s)} className={`rounded px-1.5 py-0.5 text-xs ${speed === s ? 'bg-white text-gray-900' : 'bg-gray-700'}`}>{s === 1 ? '1×' : `${s}×`}</button>
            ))}
          </div>
          {sequences.length > 1 && (
            <select value={selSeqId ?? ''} onChange={(e) => setSelSeqId(Number(e.target.value))} className="rounded bg-gray-700 text-white text-xs px-2 py-1 max-w-[160px]">
              {sequences.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          )}
        </div>

        {/* Panneau du marqueur sélectionné (mode édition) */}
        {mode === 'edit' && selectedMarkerObj && (
          <div className="flex items-center gap-2 flex-wrap border-t border-gray-700 pt-2 text-xs">
            <span className="font-semibold">Marqueur sélectionné</span>
            <span className="tabular-nums text-indigo-300">⏱ {fmt(selectedMarkerObj.startSec)}</span>
            <button onClick={() => patchMarker(selectedMarkerObj.id, { startSec: audioRef.current?.currentTime || 0 })} className="rounded bg-indigo-600 px-2 py-0.5 hover:bg-indigo-500">⏱ Caler sur l’audio ({fmt(cur)})</button>
            <button onClick={() => playFrom(selectedMarkerObj.startSec, selectedMarkerObj.sequenceId)} className="rounded bg-gray-700 px-2 py-0.5">🔊 Tester</button>
            <input
              defaultValue={fmt(selectedMarkerObj.startSec)}
              onKeyDown={(e) => { if (e.key === 'Enter') { const v = parseClock((e.target as HTMLInputElement).value); if (v !== null) patchMarker(selectedMarkerObj.id, { startSec: v }) } }}
              placeholder="m:ss"
              className="w-16 rounded bg-gray-700 px-1.5 py-0.5 tabular-nums"
            />
            <button onClick={() => deleteMarker(selectedMarkerObj.id)} className="rounded bg-red-600/80 px-2 py-0.5 hover:bg-red-600">🗑 Supprimer</button>
            <button onClick={() => setSelMarker(null)} className="text-gray-400">Fermer</button>
          </div>
        )}
      </div>

      {/* Aide */}
      {showHelp && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4" onClick={(e) => { e.stopPropagation(); setShowHelp(false) }}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl text-gray-700" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-1">🔊 Points d’écoute sur la partition</h3>
            <p className="text-sm text-gray-500 mb-3">Pose des repères sur la partition pour lancer l’audio à l’endroit voulu — idéal pour travailler un passage précis.</p>
            <ol className="space-y-2 text-sm">
              <li><span className="font-semibold text-fuchsia-700">1.</span> En bas, choisis l’<strong>audio</strong> (le backing track du morceau) et lance la lecture ▶.</li>
              <li><span className="font-semibold text-fuchsia-700">2.</span> Passe en mode <strong>✎ Éditer</strong> (en haut).</li>
              <li><span className="font-semibold text-fuchsia-700">3.</span> Mets la lecture sur le passage voulu, puis <strong>clique sur la partition</strong> à l’endroit correspondant : un <strong>🔊</strong> s’y pose, calé sur le <strong>temps actuel</strong> de l’audio.</li>
              <li><span className="font-semibold text-fuchsia-700">4.</span> Repasse en <strong>▶ Écouter</strong> et <strong>clique un 🔊</strong> : l’audio démarre pile à ce moment.</li>
            </ol>
            <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 p-2.5 text-xs text-gray-500 space-y-1">
              <p>• En mode Éditer, <strong>clique un 🔊</strong> pour le régler : <strong>⏱ caler sur l’audio</strong>, saisir un temps (<code>3:03</code>), <strong>🔊 tester</strong> ou <strong>🗑 supprimer</strong>.</p>
              <p>• <strong>Zoom</strong> (− / +), <strong>vitesse</strong> de l’audio, et pour les <strong>PDF</strong> : navigation par <strong>page</strong> (les 🔊 sont mémorisés par page).</p>
              <p>• Tes 🔊 sont <strong>personnels</strong> (visibles par toi seul).</p>
            </div>
            <button onClick={() => setShowHelp(false)} className="mt-4 w-full rounded-lg bg-fuchsia-600 text-white py-2 text-sm font-semibold hover:bg-fuchsia-500">J’ai compris</button>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface ViewerPage { id: number; fileType: string; src: string }
export interface ViewerScore { id: number; title: string; performer?: string | null; composer?: string | null; pages: ViewerPage[] }

/**
 * Affichage plein écran d'une partition, page par page. Sert au propriétaire
 * (fichiers directs) comme aux visiteurs d'un lien (fichiers servis par jeton) :
 * l'appelant fournit l'adresse de chaque page.
 *
 * Navigation : ‹ › et touches ← → pour les pages (balayage sur téléphone) ; une
 * partition d'une seule page utilise ← → pour passer à la partition voisine.
 * Une rangée de numéros (ou un menu au-delà de 8 pages) permet d'aller directement
 * à n'importe quelle page, « 1 » compris.
 */
export function ScoreViewer({ scores, start = 0, onClose }: { scores: ViewerScore[]; start?: number; onClose?: () => void }) {
  const [si, setSi] = useState(start)
  const [pi, setPi] = useState(0)
  const [zoom, setZoom] = useState(false)
  const score = scores[si]
  const pageCount = score?.pages.length ?? 0
  const page = score?.pages[pi]
  const touch = useRef<{ x: number; y: number } | null>(null)

  const goScore = useCallback((d: number) => {
    setSi((i) => { const n = i + d; return n < 0 || n >= scores.length ? i : n })
    setPi(0); setZoom(false)
  }, [scores.length])
  const goPage = useCallback((n: number) => { setPi(Math.min(pageCount - 1, Math.max(0, n))); setZoom(false) }, [pageCount])
  const step = useCallback((d: number) => { if (pageCount > 1) goPage(pi + d); else goScore(d) }, [pageCount, pi, goPage, goScore])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [step, onClose])

  if (!score || !page) return null
  const sub = [score.performer, score.composer && `de ${score.composer}`].filter(Boolean).join(' · ')
  const btn = 'rounded px-2.5 py-1 disabled:opacity-30 sm:px-3'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center gap-1 bg-black/90 p-2 text-sm sm:gap-2">
        {scores.length > 1 && <>
          <button onClick={() => goScore(-1)} disabled={si === 0} className={btn} title="Partition précédente" aria-label="Partition précédente">«</button>
          <button onClick={() => goScore(1)} disabled={si === scores.length - 1} className={btn} title="Partition suivante" aria-label="Partition suivante">»</button>
        </>}
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate font-medium">{score.title}</div>
          {sub && <div className="truncate text-xs text-white/60">{sub}</div>}
        </div>
        {page.fileType === 'image'
          ? <button onClick={() => setZoom((z) => !z)} className="shrink-0 rounded bg-white/15 px-2.5 py-1 sm:px-3" aria-label={zoom ? 'Ajuster à l’écran' : 'Agrandir'}>{zoom ? '⤢' : '🔍'}<span className="hidden sm:inline">{zoom ? ' Ajuster' : ' Agrandir'}</span></button>
          : <a href={page.src} target="_blank" rel="noreferrer" className="shrink-0 rounded bg-white/15 px-2.5 py-1 sm:px-3">Ouvrir</a>}
        {onClose && <button onClick={onClose} className="shrink-0 rounded bg-white/15 px-2.5 py-1 sm:px-3" aria-label="Fermer">✕<span className="hidden sm:inline"> Fermer</span></button>}
      </div>

      <div
        className="min-h-0 flex-1 overflow-auto"
        onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
        onTouchEnd={(e) => {
          const t = touch.current; touch.current = null
          if (!t || zoom || pageCount < 2) return
          const dx = e.changedTouches[0].clientX - t.x, dy = e.changedTouches[0].clientY - t.y
          if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) goPage(pi + (dx < 0 ? 1 : -1))
        }}
      >
        {page.fileType === 'pdf'
          ? <iframe key={page.src} src={page.src} title={`${score.title} — page ${pi + 1}`} className="h-full w-full bg-white" />
          // eslint-disable-next-line @next/next/no-img-element
          : <img key={page.src} src={page.src} alt={`${score.title} — page ${pi + 1}`} onClick={() => setZoom((z) => !z)}
              className={zoom ? 'mx-auto w-[220%] max-w-none' : 'mx-auto max-h-full max-w-full object-contain'} />}
      </div>

      {pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-black/90 p-2 text-sm">
          <button onClick={() => goPage(pi - 1)} disabled={pi === 0} className={btn + ' bg-white/15'} aria-label="Page précédente">‹</button>
          {pageCount <= 8 ? (
            <div className="flex flex-wrap justify-center gap-1">
              {score.pages.map((_, i) => (
                <button key={i} onClick={() => goPage(i)} aria-label={`Page ${i + 1}`} aria-current={i === pi}
                  className={`h-8 min-w-[1.75rem] rounded-md px-1 font-semibold ${i === pi ? 'bg-white text-black' : 'bg-white/15'}`}>{i + 1}</button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => goPage(0)} disabled={pi === 0} className={btn + ' bg-white/15'}>1</button>
              <select value={pi} onChange={(e) => goPage(Number(e.target.value))} className="rounded bg-white px-2 py-1 text-black" aria-label="Aller à la page">
                {score.pages.map((_, i) => <option key={i} value={i}>Page {i + 1} / {pageCount}</option>)}
              </select>
            </div>
          )}
          <button onClick={() => goPage(pi + 1)} disabled={pi === pageCount - 1} className={btn + ' bg-white/15'} aria-label="Page suivante">›</button>
          <span className="ml-1 text-white/60">{pi + 1} / {pageCount}</span>
        </div>
      )}
    </div>
  )
}

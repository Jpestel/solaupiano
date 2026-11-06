'use client'

import { useCallback, useEffect, useState } from 'react'
import type { PublicScore } from '@/lib/reprises-partage'

/**
 * Affichage plein écran d'une partition partagée. Le fichier passe par
 * /api/partage/<jeton>, jamais par son chemin réel : arrêter le partage coupe l'accès.
 */
export function Viewer({ token, scores, start = 0, onClose }: { token: string; scores: PublicScore[]; start?: number; onClose?: () => void }) {
  const [index, setIndex] = useState(start)
  const [zoom, setZoom] = useState(false)
  const cur = scores[index]
  const go = useCallback((d: number) => { setIndex((i) => Math.min(scores.length - 1, Math.max(0, i + d))); setZoom(false) }, [scores.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose])

  if (!cur) return null
  const src = `/api/partage/${token}?s=${cur.id}`
  const sub = [cur.performer, cur.composer && `de ${cur.composer}`].filter(Boolean).join(' · ')

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center gap-2 bg-black/90 p-2 text-sm text-white">
        {onClose && <button onClick={onClose} className="rounded bg-white/15 px-3 py-1">← Liste</button>}
        {scores.length > 1 && <>
          <button onClick={() => go(-1)} disabled={index === 0} className="rounded px-3 py-1 disabled:opacity-30" aria-label="Précédente">‹</button>
          <button onClick={() => go(1)} disabled={index === scores.length - 1} className="rounded px-3 py-1 disabled:opacity-30" aria-label="Suivante">›</button>
        </>}
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate font-medium">{cur.title}</div>
          {sub && <div className="truncate text-xs text-white/60">{sub}</div>}
        </div>
        {cur.fileType === 'image'
          ? <button onClick={() => setZoom((z) => !z)} className="rounded bg-white/15 px-3 py-1">{zoom ? 'Ajuster' : 'Agrandir'}</button>
          : <a href={src} target="_blank" rel="noreferrer" className="rounded bg-white/15 px-3 py-1">Ouvrir</a>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {cur.fileType === 'pdf'
          ? <iframe key={cur.id} src={src} title={cur.title} className="h-full w-full bg-white" />
          // eslint-disable-next-line @next/next/no-img-element
          : <img key={cur.id} src={src} alt={cur.title} onClick={() => setZoom((z) => !z)}
              className={zoom ? 'mx-auto w-[220%] max-w-none' : 'mx-auto max-h-full max-w-full object-contain'} />}
      </div>
    </div>
  )
}

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

/**
 * Prompteur (téléprompteur) pour les paroles d'un morceau.
 *  - Défilement automatique vertical dont la vitesse découle du BPM du titre,
 *    ajustable en direct (− / +).
 *  - Délai de démarrage configurable : laisse passer une intro musicale, ou
 *    le temps de lire la première phrase si le chant entre directement.
 *  - Taille de police ajustable, pause/reprise, redémarrage, molette pour
 *    nudger manuellement.
 */

const MARKER_HEX: Record<string, string> = {
  'Intro': '#818cf8', 'Couplet 1': '#60a5fa', 'Couplet 2': '#60a5fa', 'Couplet 3': '#60a5fa',
  'Pré-refrain': '#fbbf24', 'Refrain': '#fb7185', 'Bridge': '#c084fc',
  'Outro': '#9ca3af', 'Spoken': '#2dd4bf', '×2': '#4ade80', '×3': '#4ade80',
}

function parseLyrics(content: string) {
  return content.split('\n').map((line) => {
    const m = line.match(/^\[(.+?)\]$/)
    if (m) return { type: 'marker' as const, value: m[1] }
    if (line.trim() === '') return { type: 'empty' as const, value: '' }
    return { type: 'text' as const, value: line }
  })
}

interface Props {
  content: string
  title: string
  artist?: string
  bpm: number | null
  onClose: () => void
}

export function LyricsPrompter({ content, title, artist, bpm, onClose }: Props) {
  const effectiveBpm = bpm && bpm > 0 ? bpm : 100

  const [phase, setPhase] = useState<'config' | 'countdown' | 'play'>('config')
  const [paused, setPaused] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Réglages
  const [startDelay, setStartDelay] = useState(4) // secondes
  const [speedMult, setSpeedMult] = useState(1)   // multiplicateur
  const [fontPx, setFontPx] = useState(34)

  const scrollerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const offsetRef = useRef(0)
  const lastRef = useRef(0)
  const pxPerSecRef = useRef(0)

  // Vitesse de base déduite du BPM (px/s) × multiplicateur.
  // ≈ bpm × 0.4 → 107 BPM ≈ 43 px/s à vitesse normale (ajustable en direct).
  useEffect(() => {
    pxPerSecRef.current = effectiveBpm * 0.4 * speedMult
  }, [effectiveBpm, speedMult])

  const parsed = parseLyrics(content)

  // ── Boucle de défilement ────────────────────────────────────────────────────
  const stopLoop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }

  const runLoop = useCallback(() => {
    lastRef.current = performance.now()
    const loop = (t: number) => {
      const dt = (t - lastRef.current) / 1000
      lastRef.current = t
      const el = scrollerRef.current
      if (el) {
        const max = el.scrollHeight - el.clientHeight
        offsetRef.current = Math.min(offsetRef.current + pxPerSecRef.current * dt, max)
        el.scrollTop = offsetRef.current
        if (offsetRef.current >= max) {
          stopLoop()
          setPaused(true)
          return
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  // ── Démarrage : décompte puis défilement ─────────────────────────────────────
  const begin = () => {
    offsetRef.current = 0
    if (scrollerRef.current) scrollerRef.current.scrollTop = 0
    setPaused(false)
    if (startDelay > 0) {
      setCountdown(startDelay)
      setPhase('countdown')
    } else {
      setPhase('play')
    }
  }

  // Gère le décompte
  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) { setPhase('play'); return }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [phase, countdown])

  // Lance / arrête la boucle selon la phase + pause
  useEffect(() => {
    if (phase === 'play' && !paused) runLoop()
    else stopLoop()
    return stopLoop
  }, [phase, paused, runLoop])

  const restart = () => { stopLoop(); begin() }

  // Molette = nudge manuel
  const onWheel = (e: React.WheelEvent) => {
    const el = scrollerRef.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    offsetRef.current = Math.max(0, Math.min(offsetRef.current + e.deltaY, max))
    el.scrollTop = offsetRef.current
  }

  // Échap pour quitter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === ' ' && phase === 'play') { e.preventDefault(); setPaused((p) => !p) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, phase])

  const btn = 'rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors'

  const overlay = (
    <div className="fixed inset-0 bg-gray-950 text-white flex flex-col" style={{ zIndex: 2147483647 }}>
      {/* En-tête */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0">
        <div className="min-w-0">
          <p className="text-lg font-bold truncate">📜 {title}</p>
          {artist && <p className="text-sm text-gray-400 truncate">{artist}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400">🥁 {effectiveBpm} BPM{!bpm ? ' (défaut)' : ''}</span>
          <button onClick={onClose} className={`${btn} px-3 py-1.5 text-sm`}>✕ Quitter</button>
        </div>
      </div>

      {/* Zone défilante */}
      <div className="relative flex-1 min-h-0">
        {/* Dégradés haut / bas pour la lisibilité */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-gray-950 to-transparent z-10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-gray-950 to-transparent z-10" />
        {/* Ligne de lecture (repère central) */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-indigo-500/30 z-10" />

        <div
          ref={scrollerRef}
          onWheel={onWheel}
          className="absolute inset-0 overflow-y-auto px-6"
          style={{ scrollbarWidth: 'none' }}
        >
          {/* Espace pour démarrer/finir au centre */}
          <div style={{ height: '45vh' }} />
          <div className="max-w-3xl mx-auto space-y-1 text-center">
            {parsed.map((item, i) => {
              if (item.type === 'marker') {
                const c = MARKER_HEX[item.value] || '#9ca3af'
                return (
                  <div key={i} className="pt-6 pb-2">
                    <span className="inline-flex items-center rounded-full px-4 py-1 font-bold uppercase tracking-wider"
                      style={{ color: c, border: `1px solid ${c}66`, backgroundColor: `${c}1a`, fontSize: Math.max(13, fontPx * 0.45) }}>
                      {item.value}
                    </span>
                  </div>
                )
              }
              if (item.type === 'empty') return <div key={i} style={{ height: fontPx * 0.6 }} />
              return (
                <p key={i} className="font-semibold leading-snug" style={{ fontSize: fontPx }}>
                  {item.value}
                </p>
              )
            })}
          </div>
          <div style={{ height: '55vh' }} />
        </div>

        {/* Voile de configuration / décompte */}
        {phase === 'config' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-950/85 backdrop-blur-sm px-6">
            <div className="w-full max-w-sm space-y-6">
              <div className="text-center">
                <p className="text-2xl font-bold">📜 Prompteur</p>
                <p className="text-sm text-gray-400 mt-1">Réglez le démarrage puis lancez le défilement.</p>
              </div>

              {/* Délai de démarrage */}
              <div>
                <label className="flex items-center justify-between text-sm font-medium mb-1.5">
                  <span>Délai avant défilement</span>
                  <span className="text-indigo-300 font-bold">{startDelay}s</span>
                </label>
                <input type="range" min={0} max={30} value={startDelay}
                  onChange={(e) => setStartDelay(Number(e.target.value))}
                  className="w-full accent-indigo-500" />
                <div className="flex gap-1.5 mt-2">
                  {[0, 2, 4, 8, 12].map((s) => (
                    <button key={s} onClick={() => setStartDelay(s)}
                      className={`flex-1 rounded-md py-1 text-xs font-semibold transition-colors ${startDelay === s ? 'bg-indigo-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                      {s}s
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Laissez du temps pour une intro musicale, ou quelques secondes pour lire la première phrase.
                </p>
              </div>

              {/* Vitesse */}
              <div>
                <label className="flex items-center justify-between text-sm font-medium mb-1.5">
                  <span>Vitesse (basée sur {effectiveBpm} BPM)</span>
                  <span className="text-indigo-300 font-bold">×{speedMult.toFixed(2)}</span>
                </label>
                <input type="range" min={0.3} max={3} step={0.05} value={speedMult}
                  onChange={(e) => setSpeedMult(Number(e.target.value))}
                  className="w-full accent-indigo-500" />
              </div>

              <button onClick={begin}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-3 text-base font-bold transition-colors">
                ▶ Démarrer
              </button>
            </div>
          </div>
        )}

        {phase === 'countdown' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-950/70 backdrop-blur-sm">
            <p className="text-gray-400 text-sm mb-3">Le défilement démarre dans…</p>
            <p className="font-black text-indigo-400" style={{ fontSize: 'min(40vw, 200px)', lineHeight: 1 }}>
              {countdown}
            </p>
            <button onClick={() => setPhase('play')} className={`${btn} px-4 py-2 text-sm mt-6`}>
              Passer →
            </button>
          </div>
        )}
      </div>

      {/* Barre de contrôle (en lecture) */}
      {phase === 'play' && (
        <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-3 border-t border-white/10 flex-shrink-0 bg-gray-900">
          <button onClick={() => setPaused((p) => !p)} className={`${btn} px-4 py-2 text-sm`}>
            {paused ? '▶ Reprendre' : '⏸ Pause'}
          </button>
          <button onClick={restart} className={`${btn} px-3 py-2 text-sm`} title="Recommencer du début">⟲ Début</button>

          <span className="mx-1 h-6 w-px bg-white/15" />

          {/* Vitesse en direct */}
          <span className="text-xs text-gray-400">Vitesse</span>
          <button onClick={() => setSpeedMult((s) => Math.max(0.3, +(s - 0.1).toFixed(2)))} className={`${btn} px-3 py-2 text-sm`}>−</button>
          <span className="text-sm font-bold text-indigo-300 w-12 text-center">×{speedMult.toFixed(2)}</span>
          <button onClick={() => setSpeedMult((s) => Math.min(3, +(s + 0.1).toFixed(2)))} className={`${btn} px-3 py-2 text-sm`}>+</button>

          <span className="mx-1 h-6 w-px bg-white/15" />

          {/* Police */}
          <span className="text-xs text-gray-400">Taille</span>
          <button onClick={() => setFontPx((f) => Math.max(18, f - 3))} className={`${btn} px-3 py-2 text-sm`}>A−</button>
          <button onClick={() => setFontPx((f) => Math.min(80, f + 3))} className={`${btn} px-3 py-2 text-sm`}>A+</button>
        </div>
      )}
    </div>
  )

  return createPortal(overlay, document.body)
}

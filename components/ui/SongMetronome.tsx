'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Métronome par morceau :
 *  - mode plein écran (grand repère pour jouer en le regardant)
 *  - mode fenêtre flottante déplaçable & redimensionnable (reste visible
 *    dans un coin pendant la lecture d'une partition par ex.)
 *  - son coupable AVANT et pendant la lecture.
 *
 * IMPORTANT : la fenêtre / l'overlay sont rendus via un portail dont la cible
 * suit l'élément en plein écran natif (Fullscreen API). Quand une partition PDF
 * passe en plein écran natif, le navigateur ne rend QUE cet élément (« top
 * layer ») — un simple position:fixed disparaîtrait derrière. En se reparentant
 * dans l'élément plein écran, le métronome reste TOUJOURS au premier plan.
 */
export function SongMetronome({ bpm, enabled = true }: { bpm: number; enabled?: boolean }) {
  const [running, setRunning] = useState(false)
  const [muted, setMuted] = useState(false)
  const [windowed, setWindowed] = useState(false)
  const [beat, setBeat] = useState(-1)
  const [pos, setPos] = useState({ x: 24, y: 24 })
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const beatRef = useRef(0)
  const mutedRef = useRef(false)
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)

  useEffect(() => { mutedRef.current = muted }, [muted])

  // ── Cible du portail : suit l'élément en plein écran natif ──────────────────
  useEffect(() => {
    const update = () => setPortalTarget(document.fullscreenElement as HTMLElement || document.body)
    update()
    document.addEventListener('fullscreenchange', update)
    document.addEventListener('webkitfullscreenchange', update as any)
    return () => {
      document.removeEventListener('fullscreenchange', update)
      document.removeEventListener('webkitfullscreenchange', update as any)
    }
  }, [])

  const click = (accent: boolean) => {
    if (mutedRef.current) return
    const ctx = audioCtxRef.current
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = accent ? 1500 : 1000
    gain.gain.setValueAtTime(accent ? 0.6 : 0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
    osc.connect(gain); gain.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + 0.05)
  }

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    setRunning(false)
    setBeat(-1)
    beatRef.current = 0
  }

  const start = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    audioCtxRef.current.resume()
    beatRef.current = 0
    setRunning(true)
    const interval = 60000 / bpm
    const tick = () => {
      click(beatRef.current % 4 === 0)
      setBeat(beatRef.current % 4)
      beatRef.current++
    }
    tick()
    timerRef.current = setInterval(tick, interval)
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  // ── Déplacement de la fenêtre flottante ────────────────────────────────────
  const onDragStart = (e: React.PointerEvent) => {
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
    const move = (ev: PointerEvent) => {
      if (!dragRef.current) return
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 80, ev.clientX - dragRef.current.dx)),
        y: Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - dragRef.current.dy)),
      })
    }
    const up = () => {
      dragRef.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const isAccent = beat === 0
  const circleColor = beat < 0 ? '#374151' : isAccent ? '#f59e0b' : '#6366f1'

  // ── Overlays (portés dans l'élément plein écran courant) ────────────────────
  const overlays = (
    <>
      {/* ── Mode plein écran ── */}
      {running && !windowed && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-sm"
          style={{ zIndex: 2147483647 }}
          onClick={stop}
        >
          <div className="flex flex-col items-center gap-8" onClick={(e) => e.stopPropagation()}>
            <div
              className="rounded-full flex items-center justify-center transition-all duration-75 ease-out"
              style={{
                width: 'min(60vw, 320px)', height: 'min(60vw, 320px)',
                backgroundColor: circleColor,
                transform: beat < 0 ? 'scale(0.85)' : 'scale(1)',
                boxShadow: beat < 0 ? 'none' : `0 0 80px ${isAccent ? '#f59e0b88' : '#6366f188'}`,
              }}
            >
              <span className="text-white font-black" style={{ fontSize: 'min(20vw, 110px)', lineHeight: 1 }}>
                {beat < 0 ? '' : beat + 1}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {[0, 1, 2, 3].map(b => (
                <span key={b} className="rounded-full transition-all" style={{
                  width: beat === b ? 22 : 14, height: beat === b ? 22 : 14,
                  backgroundColor: beat === b ? (b === 0 ? '#f59e0b' : '#818cf8') : '#4b5563',
                }} />
              ))}
            </div>
            <p className="text-white text-2xl font-bold">{bpm} <span className="text-gray-400 text-lg font-normal">BPM</span></p>
            <div className="flex items-center gap-3">
              <button onClick={() => setMuted(m => !m)} className="rounded-xl bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 text-sm font-semibold transition-colors">
                {muted ? '🔇 Son coupé' : '🔊 Son activé'}
              </button>
              <button onClick={() => setWindowed(true)} className="rounded-xl bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 text-sm font-semibold transition-colors">
                🗗 Réduire en fenêtre
              </button>
              <button onClick={stop} className="rounded-xl bg-white text-gray-900 px-6 py-2.5 text-sm font-bold hover:bg-gray-100 transition-colors">
                ⏹ Arrêter
              </button>
            </div>
            <p className="text-gray-400 text-xs">Cliquez en dehors pour arrêter</p>
          </div>
        </div>
      )}

      {/* ── Mode fenêtre flottante (déplaçable + redimensionnable) ── */}
      {running && windowed && (
        <div
          className="fixed rounded-xl shadow-2xl border border-gray-700 bg-gray-900 overflow-hidden flex flex-col"
          style={{ left: pos.x, top: pos.y, width: 200, height: 240, minWidth: 150, minHeight: 180, resize: 'both', zIndex: 2147483647 }}
        >
          {/* Barre de titre (poignée de déplacement) */}
          <div
            onPointerDown={onDragStart}
            className="flex items-center justify-between px-2 py-1.5 bg-gray-800 cursor-move select-none flex-shrink-0"
          >
            <span className="text-[11px] font-semibold text-gray-300">🥁 {bpm} BPM</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setMuted(m => !m)} className="text-xs px-1 hover:opacity-80" title={muted ? 'Activer le son' : 'Couper le son'}>
                {muted ? '🔇' : '🔊'}
              </button>
              <button onClick={() => setWindowed(false)} className="text-xs px-1 hover:opacity-80 text-gray-300" title="Plein écran">⛶</button>
              <button onClick={stop} className="text-xs px-1 hover:opacity-80 text-gray-300" title="Arrêter">✕</button>
            </div>
          </div>
          {/* Corps : cercle pulsant */}
          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-2">
            <div
              className="rounded-full flex items-center justify-center transition-all duration-75 ease-out"
              style={{
                width: '62%', aspectRatio: '1 / 1',
                backgroundColor: circleColor,
                transform: beat < 0 ? 'scale(0.85)' : 'scale(1)',
                boxShadow: beat < 0 ? 'none' : `0 0 28px ${isAccent ? '#f59e0b88' : '#6366f188'}`,
              }}
            >
              <span className="text-white font-black text-4xl leading-none">{beat < 0 ? '' : beat + 1}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3].map(b => (
                <span key={b} className="rounded-full transition-all" style={{
                  width: beat === b ? 9 : 6, height: beat === b ? 9 : 6,
                  backgroundColor: beat === b ? (b === 0 ? '#f59e0b' : '#818cf8') : '#4b5563',
                }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )

  // Métronome non inclus dans l'offre du groupe → badge grisé non cliquable
  if (!enabled) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-300 cursor-not-allowed"
        title="Le métronome n'est pas inclus dans l'offre de ce groupe"
      >
        🥁 {bpm} BPM 🔒
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      {/* Badge déclencheur */}
      <button
        type="button"
        onClick={() => (running ? stop() : start())}
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
        title="Lancer le métronome"
      >
        🥁 {bpm} BPM
      </button>
      <button
        type="button"
        onClick={() => setMuted(m => !m)}
        className={`rounded-full border px-1.5 py-1 text-xs transition-colors ${muted ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
        title={muted ? 'Son coupé (cliquez pour réactiver)' : 'Couper le son (garder le visuel)'}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      {portalTarget && createPortal(overlays, portalTarget)}
    </span>
  )
}

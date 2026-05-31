'use client'

import { useState, useRef, useEffect } from 'react'

/**
 * Métronome par morceau : repère visuel GRAND (pour jouer en le regardant)
 * + sonore (clic), avec coupure du son possible AVANT et pendant la lecture.
 */
export function SongMetronome({ bpm }: { bpm: number }) {
  const [running, setRunning] = useState(false)
  const [muted, setMuted] = useState(false)
  const [beat, setBeat] = useState(-1)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const beatRef = useRef(0)
  const mutedRef = useRef(false)

  useEffect(() => { mutedRef.current = muted }, [muted])

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
      const accent = beatRef.current % 4 === 0
      click(accent)
      setBeat(beatRef.current % 4)
      beatRef.current++
    }
    tick()
    timerRef.current = setInterval(tick, interval)
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const isAccent = beat === 0

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
      {/* Mute disponible AVANT le lancement */}
      <button
        type="button"
        onClick={() => setMuted(m => !m)}
        className={`rounded-full border px-1.5 py-1 text-xs transition-colors ${muted ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
        title={muted ? 'Son coupé (cliquez pour réactiver)' : 'Couper le son (garder le visuel)'}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      {/* Grand visuel plein écran pendant la lecture */}
      {running && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-sm" onClick={stop}>
          <div className="flex flex-col items-center gap-8" onClick={(e) => e.stopPropagation()}>
            {/* Gros cercle pulsant */}
            <div
              className="rounded-full flex items-center justify-center transition-all duration-75 ease-out"
              style={{
                width: 'min(60vw, 320px)',
                height: 'min(60vw, 320px)',
                backgroundColor: beat < 0 ? '#374151' : isAccent ? '#f59e0b' : '#6366f1',
                transform: beat < 0 ? 'scale(0.85)' : 'scale(1)',
                boxShadow: beat < 0 ? 'none' : `0 0 80px ${isAccent ? '#f59e0b88' : '#6366f188'}`,
              }}
            >
              <span className="text-white font-black" style={{ fontSize: 'min(20vw, 110px)', lineHeight: 1 }}>
                {beat < 0 ? '' : beat + 1}
              </span>
            </div>

            {/* Indicateurs de temps 1-2-3-4 */}
            <div className="flex items-center gap-3">
              {[0, 1, 2, 3].map(b => (
                <span key={b}
                  className="rounded-full transition-all"
                  style={{
                    width: beat === b ? 22 : 14,
                    height: beat === b ? 22 : 14,
                    backgroundColor: beat === b ? (b === 0 ? '#f59e0b' : '#818cf8') : '#4b5563',
                  }}
                />
              ))}
            </div>

            <p className="text-white text-2xl font-bold">{bpm} <span className="text-gray-400 text-lg font-normal">BPM</span></p>

            {/* Contrôles */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMuted(m => !m)}
                className="rounded-xl bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                {muted ? '🔇 Son coupé' : '🔊 Son activé'}
              </button>
              <button
                onClick={stop}
                className="rounded-xl bg-white text-gray-900 px-6 py-2.5 text-sm font-bold hover:bg-gray-100 transition-colors"
              >
                ⏹ Arrêter
              </button>
            </div>
            <p className="text-gray-400 text-xs">Cliquez n&apos;importe où pour arrêter</p>
          </div>
        </div>
      )}
    </span>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'

/**
 * Métronome compact par morceau : repère visuel (pulsation) + sonore (clic),
 * avec coupure du son (mute). Démarre/arrête au clic.
 */
export function SongMetronome({ bpm }: { bpm: number }) {
  const [running, setRunning] = useState(false)
  const [muted, setMuted] = useState(false)
  const [beat, setBeat] = useState(0)
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
    gain.gain.setValueAtTime(accent ? 0.5 : 0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
    osc.connect(gain); gain.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + 0.05)
  }

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    setRunning(false)
    setBeat(0)
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
    // premier temps immédiat
    const tick = () => {
      const accent = beatRef.current % 4 === 0
      click(accent)
      setBeat(beatRef.current % 4)
      beatRef.current++
    }
    tick()
    timerRef.current = setInterval(tick, interval)
  }

  // Nettoyage
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])
  // Si le BPM change pendant la lecture, on relance au bon tempo
  useEffect(() => {
    if (running) { stop(); /* relance laissée à l'utilisateur */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm])

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => (running ? stop() : start())}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
          running
            ? 'border-indigo-400 bg-indigo-600 text-white'
            : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
        }`}
        title={running ? 'Arrêter le métronome' : 'Lancer le métronome'}
      >
        {/* Pulsation visuelle */}
        <span
          className={`w-2.5 h-2.5 rounded-full transition-transform duration-75 ${
            running ? (beat === 0 ? 'bg-amber-300 scale-150' : 'bg-white scale-100') : 'bg-gray-400'
          }`}
        />
        🥁 {bpm} BPM
      </button>
      {running && (
        <button
          type="button"
          onClick={() => setMuted(m => !m)}
          className="rounded-full border border-gray-200 bg-white px-1.5 py-1 text-xs hover:bg-gray-50 transition-colors"
          title={muted ? 'Activer le son' : 'Couper le son (garder le visuel)'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      )}
    </div>
  )
}

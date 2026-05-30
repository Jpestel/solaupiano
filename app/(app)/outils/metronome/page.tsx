'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { TutorialButton } from '@/components/ui/TutorialButton'

// ─── Audio engine ─────────────────────────────────────────────────────────────
// Uses Web Audio API look-ahead scheduler (Chris Wilson pattern)
// → precise timing, immune to JS event loop jitter

const LOOK_AHEAD   = 0.12  // seconds — how far ahead to schedule
const SCHEDULE_INT = 25    // ms — scheduler polling interval

function scheduleClick(
  ctx: AudioContext,
  time: number,
  accent: boolean,
  volume: number,
  subdivision: boolean
) {
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.type = 'sine'
  osc.frequency.value = accent ? 1100 : subdivision ? 660 : 880

  const vol = accent ? volume : subdivision ? volume * 0.4 : volume * 0.75
  gain.gain.setValueAtTime(vol, time)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + (accent ? 0.08 : 0.05))

  osc.start(time)
  osc.stop(time + 0.1)
}

// ─── Tempo presets ────────────────────────────────────────────────────────────

const PRESETS = [
  { name: 'Largo',       bpm: 50  },
  { name: 'Andante',     bpm: 80  },
  { name: 'Moderato',    bpm: 108 },
  { name: 'Allegro',     bpm: 132 },
  { name: 'Presto',      bpm: 180 },
]

const TIME_SIGS: { label: string; beats: number; div: number }[] = [
  { label: '2/4', beats: 2, div: 4 },
  { label: '3/4', beats: 3, div: 4 },
  { label: '4/4', beats: 4, div: 4 },
  { label: '6/8', beats: 6, div: 8 },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function MetronomePage() {
  const [bpm,        setBpm]        = useState(120)
  const [running,    setRunning]    = useState(false)
  const [timeSig,    setTimeSig]    = useState(2)        // index into TIME_SIGS
  const [beatIdx,    setBeatIdx]    = useState(-1)       // currently lit beat (0-based)
  const [volume,     setVolume]     = useState(0.8)
  const [subdiv,     setSubdiv]     = useState(false)    // 8th-note subdivisions
  const [tapTimes,   setTapTimes]   = useState<number[]>([])
  const [tapLabel,   setTapLabel]   = useState('Tap')

  // Refs for scheduler (avoid stale closures)
  const bpmRef      = useRef(bpm)
  const timeSigRef  = useRef(timeSig)
  const subdivRef   = useRef(subdiv)
  const volumeRef   = useRef(volume)
  const runningRef  = useRef(false)

  const audioCtxRef  = useRef<AudioContext | null>(null)
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef       = useRef<number>(0)

  // Scheduler state (mutable, not React state)
  const nextNoteTime = useRef(0)
  const currentBeat  = useRef(0)      // beat counter (includes subdivisions)
  const notesQueue   = useRef<{ beat: number; time: number }[]>([])

  // Keep refs in sync
  useEffect(() => { bpmRef.current     = bpm    }, [bpm])
  useEffect(() => { timeSigRef.current = timeSig }, [timeSig])
  useEffect(() => { subdivRef.current  = subdiv  }, [subdiv])
  useEffect(() => { volumeRef.current  = volume  }, [volume])

  // ─── Draw loop — syncs visual beat indicator with audio ──────────────────
  const draw = useCallback(() => {
    const ctx = audioCtxRef.current
    if (!ctx || !runningRef.current) return
    const now = ctx.currentTime
    while (notesQueue.current.length && notesQueue.current[0].time <= now + 0.01) {
      const { beat } = notesQueue.current.shift()!
      setBeatIdx(beat)
    }
    rafRef.current = requestAnimationFrame(draw)
  }, [])

  // ─── Scheduler ────────────────────────────────────────────────────────────
  const scheduler = useCallback(() => {
    const ctx = audioCtxRef.current
    if (!ctx) return
    const sig    = TIME_SIGS[timeSigRef.current]
    const steps  = subdivRef.current ? sig.beats * 2 : sig.beats
    const secPer = (60 / bpmRef.current) / (subdivRef.current ? 2 : 1)

    while (nextNoteTime.current < ctx.currentTime + LOOK_AHEAD) {
      const step   = currentBeat.current % steps
      const beat   = subdivRef.current ? Math.floor(step / 2) : step
      const isSub  = subdivRef.current && step % 2 === 1
      const accent = step === 0

      scheduleClick(ctx, nextNoteTime.current, accent, volumeRef.current, isSub)
      notesQueue.current.push({ beat, time: nextNoteTime.current })

      nextNoteTime.current  += secPer
      currentBeat.current    = (currentBeat.current + 1) % steps
    }
    timerRef.current = setTimeout(scheduler, SCHEDULE_INT)
  }, [])

  // ─── Start / stop ─────────────────────────────────────────────────────────
  const start = useCallback(() => {
    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    nextNoteTime.current = ctx.currentTime + 0.05
    currentBeat.current = 0
    notesQueue.current = []
    runningRef.current = true
    setRunning(true)
    setBeatIdx(0)
    scheduler()
    rafRef.current = requestAnimationFrame(draw)
  }, [scheduler, draw])

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    cancelAnimationFrame(rafRef.current)
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    runningRef.current = false
    setRunning(false)
    setBeatIdx(-1)
    notesQueue.current = []
  }, [])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    cancelAnimationFrame(rafRef.current)
    audioCtxRef.current?.close()
  }, [])

  // ─── Tap tempo ────────────────────────────────────────────────────────────
  const handleTap = useCallback(() => {
    const now = performance.now()
    setTapTimes(prev => {
      const updated = [...prev, now].filter(t => now - t < 3000).slice(-8)
      if (updated.length >= 2) {
        const intervals = updated.slice(1).map((t, i) => t - updated[i])
        const avg = intervals.reduce((a, b) => a + b) / intervals.length
        const newBpm = Math.round(60000 / avg)
        const clamped = Math.max(20, Math.min(300, newBpm))
        setBpm(clamped)
        setTapLabel(`${clamped} BPM`)
        setTimeout(() => setTapLabel('Tap'), 1500)
      }
      return updated
    })
  }, [])

  // ─── BPM change ───────────────────────────────────────────────────────────
  const changeBpm = (delta: number) => setBpm(b => Math.max(20, Math.min(300, b + delta)))

  const sig = TIME_SIGS[timeSig]

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/tableau-de-bord" className="hover:text-indigo-600">Accueil</Link>
        <span>/</span>
        <span className="text-gray-900">Métronome</span>
      </div>
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Métronome</h1>
          <p className="text-sm text-gray-500 mt-0.5">Battez la mesure — de 20 à 300 BPM</p>
        </div>
        <TutorialButton moduleKey="tool_metronome" />
      </div>

      {/* ── Main display ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-xl mb-6" style={{ background: '#0f0f1a' }}>
        <div className="px-6 pt-10 pb-8 flex flex-col items-center gap-6">

          {/* BPM counter */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => changeBpm(-1)}
              onPointerDown={e => { e.preventDefault(); const id = setInterval(() => changeBpm(-1), 120); (e.target as any)._iv = id }}
              onPointerUp={e  => clearInterval((e.target as any)._iv)}
              onPointerLeave={e => clearInterval((e.target as any)._iv)}
              className="w-12 h-12 rounded-full text-2xl font-bold text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors select-none"
            >−</button>

            <div className="text-center w-32">
              <div className="text-7xl font-black tabular-nums leading-none" style={{ color: '#e0e7ff' }}>
                {bpm}
              </div>
              <div className="text-sm font-semibold mt-1" style={{ color: '#6366f1' }}>BPM</div>
            </div>

            <button
              onClick={() => changeBpm(+1)}
              onPointerDown={e => { e.preventDefault(); const id = setInterval(() => changeBpm(+1), 120); (e.target as any)._iv = id }}
              onPointerUp={e  => clearInterval((e.target as any)._iv)}
              onPointerLeave={e => clearInterval((e.target as any)._iv)}
              className="w-12 h-12 rounded-full text-2xl font-bold text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors select-none"
            >+</button>
          </div>

          {/* Slider */}
          <input
            type="range" min={20} max={300} value={bpm}
            onChange={e => setBpm(Number(e.target.value))}
            className="w-full max-w-xs accent-indigo-500"
            style={{ accentColor: '#6366f1' }}
          />

          {/* Beat indicators */}
          <div className="flex gap-3">
            {Array.from({ length: sig.beats }).map((_, i) => {
              const isActive = running && beatIdx === i
              const isAccent = i === 0
              return (
                <div
                  key={i}
                  className="rounded-full transition-all duration-75"
                  style={{
                    width:  isAccent ? 22 : 18,
                    height: isAccent ? 22 : 18,
                    background: isActive
                      ? (isAccent ? '#f59e0b' : '#6366f1')
                      : '#2d2d45',
                    boxShadow: isActive
                      ? `0 0 16px ${isAccent ? '#f59e0b' : '#6366f1'}`
                      : 'none',
                    transform: isActive ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              )
            })}
          </div>

          {/* Start/Stop */}
          <button
            onClick={running ? stop : start}
            className="w-20 h-20 rounded-full text-3xl shadow-2xl transition-all active:scale-95 flex items-center justify-center"
            style={{
              background: running
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              boxShadow: running
                ? '0 0 30px #ef444466'
                : '0 0 30px #6366f166',
            }}
          >
            {running ? '⏹' : '▶'}
          </button>
        </div>
      </div>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">

        {/* Time signature */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Mesure</p>
          <div className="grid grid-cols-2 gap-2">
            {TIME_SIGS.map((s, i) => (
              <button
                key={s.label}
                onClick={() => { setTimeSig(i); setBeatIdx(-1) }}
                className={`py-2 rounded-xl text-sm font-bold transition-all ${timeSig === i ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Volume + Subdivisions */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Volume</p>
          <input
            type="range" min={0} max={1} step={0.05} value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            className="w-full mb-4"
            style={{ accentColor: '#6366f1' }}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox" checked={subdiv}
              onChange={e => setSubdiv(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Sous-divisions (croches)</span>
          </label>
        </div>

        {/* Tap tempo */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tap Tempo</p>
          <button
            onClick={handleTap}
            className="flex-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold hover:bg-indigo-100 active:scale-[0.97] transition-all text-sm"
          >
            {tapLabel}
          </button>
          <p className="text-xs text-gray-400 mt-2 text-center">Tapez au rythme pour détecter le BPM</p>
        </div>
      </div>

      {/* ── Tempo presets ────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tempos de référence</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.name}
              onClick={() => setBpm(p.bpm)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${bpm === p.bpm ? 'bg-indigo-600 text-white border-indigo-600' : 'text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'}`}
            >
              {p.name} <span className="opacity-70">· {p.bpm}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

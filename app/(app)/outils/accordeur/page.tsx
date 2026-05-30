'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { TutorialButton } from '@/components/ui/TutorialButton'

// ─── Pitch detection ──────────────────────────────────────────────────────────

function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  const SIZE = buf.length

  // RMS check — silence
  let rms = 0
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i]
  rms = Math.sqrt(rms / SIZE)
  if (rms < 0.012) return -1

  // Trim silence at edges
  let r1 = 0, r2 = SIZE - 1
  for (let i = 0; i < SIZE / 2; i++) { if (Math.abs(buf[i]) < 0.2) { r1 = i; break } }
  for (let i = 1; i < SIZE / 2; i++) { if (Math.abs(buf[SIZE - i]) < 0.2) { r2 = SIZE - i; break } }
  const trimmed = buf.slice(r1, r2 + 1)
  const len = trimmed.length

  // Autocorrelation
  const c = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < len - i; j++) c[i] += trimmed[j] * trimmed[j + i]
  }

  // First dip, then find max
  let d = 0
  while (d < len - 1 && c[d] > c[d + 1]) d++

  let maxVal = -1, maxPos = -1
  for (let i = d; i < len; i++) {
    if (c[i] > maxVal) { maxVal = c[i]; maxPos = i }
  }
  if (maxPos <= 0 || maxPos >= len - 1) return -1

  // Parabolic interpolation for sub-sample precision
  const x1 = c[maxPos - 1], x2 = c[maxPos], x3 = c[maxPos + 1]
  const T0 = maxPos + (x3 - x1) / (2 * (2 * x2 - x1 - x3))
  return sampleRate / T0
}

function noteFromFreq(freq: number) {
  const A4 = 440
  const semitones = 12 * Math.log2(freq / A4)
  const rounded = Math.round(semitones)
  const cents = Math.round((semitones - rounded) * 100)
  const midi  = rounded + 69
  const octave = Math.floor(midi / 12) - 1
  const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
  const note  = names[((midi % 12) + 12) % 12]
  const targetFreq = A4 * Math.pow(2, rounded / 12)
  return { note, octave, cents, targetFreq }
}

// ─── Instruments & tunings ────────────────────────────────────────────────────

const INSTRUMENTS = {
  guitar: {
    label: 'Guitare',
    strings: [
      { name: 'E4', note: 'E', octave: 4, freq: 329.63 },
      { name: 'B3', note: 'B', octave: 3, freq: 246.94 },
      { name: 'G3', note: 'G', octave: 3, freq: 196.00 },
      { name: 'D3', note: 'D', octave: 3, freq: 146.83 },
      { name: 'A2', note: 'A', octave: 2, freq: 110.00 },
      { name: 'E2', note: 'E', octave: 2, freq:  82.41 },
    ],
  },
  bass4: {
    label: 'Basse 4',
    strings: [
      { name: 'G2', note: 'G', octave: 2, freq:  98.00 },
      { name: 'D2', note: 'D', octave: 2, freq:  73.42 },
      { name: 'A1', note: 'A', octave: 1, freq:  55.00 },
      { name: 'E1', note: 'E', octave: 1, freq:  41.20 },
    ],
  },
  bass5: {
    label: 'Basse 5',
    strings: [
      { name: 'G2', note: 'G', octave: 2, freq:  98.00 },
      { name: 'D2', note: 'D', octave: 2, freq:  73.42 },
      { name: 'A1', note: 'A', octave: 1, freq:  55.00 },
      { name: 'E1', note: 'E', octave: 1, freq:  41.20 },
      { name: 'B0', note: 'B', octave: 0, freq:  30.87 },
    ],
  },
} as const

type InstrumentKey = keyof typeof INSTRUMENTS

function closestString(freq: number, instr: InstrumentKey) {
  const strings = INSTRUMENTS[instr].strings
  let best = strings[0], bestDist = Infinity
  for (const s of strings) {
    const dist = Math.abs(1200 * Math.log2(freq / s.freq)) // cents distance
    if (dist < bestDist) { bestDist = dist; best = s }
  }
  return best
}

// ─── Smoothing buffer ─────────────────────────────────────────────────────────

function useSmoother(size = 5) {
  const buf = useRef<number[]>([])
  return (val: number) => {
    buf.current.push(val)
    if (buf.current.length > size) buf.current.shift()
    return buf.current.reduce((a, b) => a + b, 0) / buf.current.length
  }
}

// ─── Tuner colour logic ───────────────────────────────────────────────────────

function centsColor(cents: number) {
  const abs = Math.abs(cents)
  if (abs <= 5)  return '#22c55e'  // green — in tune
  if (abs <= 15) return '#f59e0b'  // amber — close
  return '#ef4444'                  // red — off
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AccordeurPage() {
  const [instrument, setInstrument] = useState<InstrumentKey>('guitar')
  const [running, setRunning]       = useState(false)
  const [note, setNote]             = useState<string | null>(null)
  const [octave, setOctave]         = useState<number | null>(null)
  const [cents, setCents]           = useState<number>(0)
  const [freq, setFreq]             = useState<number | null>(null)
  const [targetFreq, setTargetFreq] = useState<number | null>(null)
  const [noSignal, setNoSignal]     = useState(false)
  const [permError, setPermError]   = useState('')

  const audioCtxRef   = useRef<AudioContext | null>(null)
  const analyserRef   = useRef<AnalyserNode | null>(null)
  const streamRef     = useRef<MediaStream | null>(null)
  const rafRef        = useRef<number>(0)
  const smoothCents   = useSmoother(6)

  // ─── Analysis loop ──────────────────────────────────────────────────────────
  const analyse = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return

    const buf = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(buf)

    const detectedFreq = autoCorrelate(buf, audioCtxRef.current!.sampleRate)

    if (detectedFreq < 20 || detectedFreq > 1400) {
      setNoSignal(true)
      setNote(null)
    } else {
      setNoSignal(false)
      const result = noteFromFreq(detectedFreq)
      const smoothed = smoothCents(result.cents)
      setNote(result.note)
      setOctave(result.octave)
      setCents(Math.round(smoothed))
      setFreq(Math.round(detectedFreq * 10) / 10)
      setTargetFreq(Math.round(result.targetFreq * 100) / 100)
    }

    rafRef.current = requestAnimationFrame(analyse)
  }, [smoothCents])

  // ─── Start / stop ────────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    try {
      setPermError('')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      const ctx    = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 4096
      analyser.smoothingTimeConstant = 0
      source.connect(analyser)

      audioCtxRef.current = ctx
      analyserRef.current = analyser
      streamRef.current   = stream

      setRunning(true)
      rafRef.current = requestAnimationFrame(analyse)
    } catch (e: any) {
      if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
        setPermError('🔒 Microphone bloqué — cliquez sur l\'icône 🔒 dans la barre d\'adresse, puis sur "Paramètres du site" → Microphone → Autoriser, et rechargez la page.')
      } else if (e?.name === 'NotFoundError') {
        setPermError('Aucun microphone détecté. Branchez un micro ou vérifiez les paramètres audio de votre appareil.')
      } else {
        setPermError('Impossible d\'accéder au microphone. Vérifiez les permissions dans votre navigateur.')
      }
    }
  }, [analyse])

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    analyserRef.current = null
    streamRef.current   = null
    setRunning(false)
    setNote(null)
    setFreq(null)
    setNoSignal(false)
  }, [])

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); streamRef.current?.getTracks().forEach(t => t.stop()); audioCtxRef.current?.close() }, [])

  // ─── Derived ─────────────────────────────────────────────────────────────────
  const color = note && !noSignal ? centsColor(cents) : '#6b7280'
  const closest = freq ? closestString(freq, instrument) : null

  // Needle position: cents goes from -50 to +50 → 0% to 100%
  const needlePos = Math.max(2, Math.min(98, ((cents + 50) / 100) * 100))
  const inTune    = note && !noSignal && Math.abs(cents) <= 5

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/tableau-de-bord" className="hover:text-indigo-600">Accueil</Link>
        <span>/</span>
        <span className="text-gray-900">Accordeur</span>
      </div>

      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accordeur</h1>
          <p className="text-sm text-gray-500 mt-0.5">Guitare · Basse — utilise votre microphone</p>
        </div>
        <TutorialButton moduleKey="tool_accordeur" />
      </div>

      {/* Instrument selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(Object.keys(INSTRUMENTS) as InstrumentKey[]).map(k => (
          <button
            key={k}
            onClick={() => setInstrument(k)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${instrument === k ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'}`}
          >
            {INSTRUMENTS[k].label}
          </button>
        ))}
      </div>

      {/* ── Main display ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-xl mb-6" style={{ background: '#0f0f1a' }}>

        {/* Note display */}
        <div className="px-6 pt-10 pb-6 text-center">
          <div
            className="text-[96px] font-black leading-none tracking-tight transition-colors duration-150 select-none"
            style={{ color, textShadow: inTune ? `0 0 40px ${color}88` : 'none' }}
          >
            {note ?? (running ? '—' : '—')}
          </div>
          <div className="mt-1 text-sm font-medium" style={{ color: '#9ca3af' }}>
            {note && !noSignal
              ? <>{octave !== null ? <span>{note}{octave}</span> : null} · <span>{freq} Hz</span> → <span>{targetFreq} Hz</span></>
              : running ? (noSignal ? 'Signal trop faible — jouez une note' : '…') : 'Appuyez sur Démarrer'
            }
          </div>

          {/* In-tune badge */}
          <div className="mt-3 h-7 flex items-center justify-center">
            {inTune && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
                style={{ background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44' }}>
                ✓ Accordé
              </span>
            )}
            {note && !noSignal && !inTune && (
              <span className="text-sm font-semibold" style={{ color }}>
                {cents > 0 ? `+${cents}¢ (trop haut)` : `${cents}¢ (trop bas)`}
              </span>
            )}
          </div>
        </div>

        {/* ── Meter ────────────────────────────────────────────────────────── */}
        <div className="px-6 pb-8">
          {/* Labels */}
          <div className="flex justify-between text-xs font-medium mb-2" style={{ color: '#6b7280' }}>
            <span>♭ −50¢</span>
            <span>−25¢</span>
            <span className="font-bold" style={{ color: '#22c55e' }}>0</span>
            <span>+25¢</span>
            <span>+50¢ ♯</span>
          </div>

          {/* Track */}
          <div className="relative h-4 rounded-full overflow-hidden" style={{ background: '#1e1e30' }}>
            {/* Gradient track */}
            <div className="absolute inset-0 rounded-full"
              style={{ background: 'linear-gradient(to right, #ef4444 0%, #f59e0b 30%, #22c55e 45%, #22c55e 55%, #f59e0b 70%, #ef4444 100%)', opacity: 0.25 }} />
            {/* Green center zone */}
            <div className="absolute top-0 bottom-0 rounded-full"
              style={{ left: '45%', width: '10%', background: '#22c55e33' }} />
            {/* Center mark */}
            <div className="absolute top-0 bottom-0 w-0.5" style={{ left: '50%', background: '#22c55e55' }} />
            {/* Needle */}
            {note && !noSignal && (
              <div
                className="absolute top-0 bottom-0 w-1 rounded-full transition-all duration-75"
                style={{ left: `calc(${needlePos}% - 2px)`, background: color, boxShadow: `0 0 8px ${color}` }}
              />
            )}
          </div>

          {/* Tick marks */}
          <div className="flex justify-between mt-1">
            {[-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50].map(v => (
              <div key={v} className="w-px h-1.5 rounded-full" style={{ background: v === 0 ? '#22c55e88' : '#2d2d45' }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Reference strings ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Cordes de référence</p>
        <div className="flex gap-2 flex-wrap">
          {INSTRUMENTS[instrument].strings.map(s => {
            const isClosest = closest?.name === s.name && running && note && !noSignal
            return (
              <div
                key={s.name}
                className="flex flex-col items-center rounded-xl px-3 py-2.5 border transition-all"
                style={{
                  background: isClosest ? `${centsColor(cents)}22` : '#f9fafb',
                  borderColor: isClosest ? centsColor(cents) : '#e5e7eb',
                  minWidth: '52px',
                }}
              >
                <span className="text-lg font-black leading-none" style={{ color: isClosest ? centsColor(cents) : '#374151' }}>
                  {s.note}
                </span>
                <span className="text-[10px] font-medium mt-0.5" style={{ color: isClosest ? centsColor(cents) + 'cc' : '#9ca3af' }}>
                  {s.name}
                </span>
                <span className="text-[10px]" style={{ color: '#9ca3af' }}>{s.freq} Hz</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Start / stop ──────────────────────────────────────────────────── */}
      {permError && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{permError}</div>
      )}

      <button
        onClick={running ? stop : start}
        className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl text-base font-bold shadow-lg transition-all active:scale-[0.98] ${
          running
            ? 'bg-red-500 hover:bg-red-400 text-white'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
        }`}
      >
        {running ? (
          <><span className="w-4 h-4 rounded-sm bg-white/80 inline-block" /> Arrêter</>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 1 0 4 0V5a2 2 0 0 0-2-2zm-7 8h2a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V20h3v2H8v-2h3v-2.08A7 7 0 0 1 5 11z"/>
            </svg>
            Démarrer l'accordeur
          </>
        )}
      </button>

      <p className="text-xs text-gray-400 mt-3">
        L'accordeur utilise le microphone de votre appareil. Pour une meilleure précision, jouez dans un endroit calme et tenez la note.
      </p>
    </div>
  )
}

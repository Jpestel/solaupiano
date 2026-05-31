'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export interface Sequence {
  id: number
  kind: 'AUDIO' | 'MIDI'
  title: string
  filePath: string
  channelMode: 'STEREO' | 'SPLIT_LR'
}

function fmt(t: number) {
  if (!isFinite(t)) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Lecteur AUDIO (Web Audio : séparation click / backing en mode SPLIT_LR)
// ─────────────────────────────────────────────────────────────────────────────
function AudioSeqPlayer({ seq, compact }: { seq: Sequence; compact?: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const leftGainRef = useRef<GainNode | null>(null)
  const rightGainRef = useRef<GainNode | null>(null)
  const wiredRef = useRef(false)

  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(0)

  const split = seq.channelMode === 'SPLIT_LR'
  const [master, setMaster] = useState(1)
  const [clickVol, setClickVol] = useState(1)
  const [backingVol, setBackingVol] = useState(1)
  const [clickMute, setClickMute] = useState(false)
  const [backingMute, setBackingMute] = useState(false)

  // Construit le graphe Web Audio (une seule fois)
  const ensureGraph = useCallback(() => {
    if (wiredRef.current || !audioRef.current) return
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new Ctx()
    ctxRef.current = ctx
    const source = ctx.createMediaElementSource(audioRef.current)
    const splitter = ctx.createChannelSplitter(2)
    const merger = ctx.createChannelMerger(2)
    const lg = ctx.createGain()
    const rg = ctx.createGain()
    leftGainRef.current = lg
    rightGainRef.current = rg
    source.connect(splitter)
    splitter.connect(lg, 0) // canal gauche
    splitter.connect(rg, 1) // canal droit
    lg.connect(merger, 0, 0)
    rg.connect(merger, 0, 1)
    merger.connect(ctx.destination)
    wiredRef.current = true
  }, [])

  // Applique les volumes
  useEffect(() => {
    const lg = leftGainRef.current, rg = rightGainRef.current
    if (!lg || !rg) return
    if (split) {
      lg.gain.value = clickMute ? 0 : clickVol
      rg.gain.value = backingMute ? 0 : backingVol
    } else {
      lg.gain.value = master
      rg.gain.value = master
    }
  }, [split, master, clickVol, backingVol, clickMute, backingMute, playing])

  const toggle = async () => {
    const a = audioRef.current
    if (!a) return
    ensureGraph()
    if (ctxRef.current?.state === 'suspended') await ctxRef.current.resume()
    if (a.paused) { await a.play(); setPlaying(true) }
    else { a.pause(); setPlaying(false) }
  }

  const seek = (v: number) => { if (audioRef.current) { audioRef.current.currentTime = v; setCur(v) } }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <audio
        ref={audioRef}
        src={encodeURI(seq.filePath)}
        preload="metadata"
        onLoadedMetadata={(e) => setDur((e.target as HTMLAudioElement).duration)}
        onTimeUpdate={(e) => setCur((e.target as HTMLAudioElement).currentTime)}
        onEnded={() => setPlaying(false)}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors"
          title={playing ? 'Pause' : 'Lecture'}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800 truncate">{seq.title}</span>
            {split && <span className="text-[10px] font-semibold rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-1.5 py-0.5">Click G / Backing D</span>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400 tabular-nums w-9">{fmt(cur)}</span>
            <input
              type="range" min={0} max={dur || 0} step={0.1} value={cur}
              onChange={(e) => seek(Number(e.target.value))}
              className="flex-1 accent-indigo-500 h-1"
            />
            <span className="text-xs text-gray-400 tabular-nums w-9">{fmt(dur)}</span>
          </div>
        </div>
      </div>

      {/* Faders */}
      {!compact && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {split ? (
            <div className="grid grid-cols-2 gap-3">
              <Fader label="🥁 Click (G)" vol={clickVol} setVol={setClickVol} muted={clickMute} setMuted={setClickMute} color="amber" />
              <Fader label="🎶 Backing (D)" vol={backingVol} setVol={setBackingVol} muted={backingMute} setMuted={setBackingMute} color="indigo" />
            </div>
          ) : (
            <Fader label="🔊 Volume" vol={master} setVol={setMaster} muted={false} setMuted={() => {}} color="indigo" hideMute />
          )}
        </div>
      )}
    </div>
  )
}

function Fader({ label, vol, setVol, muted, setMuted, color, hideMute }: {
  label: string; vol: number; setVol: (n: number) => void; muted: boolean; setMuted: (b: boolean) => void; color: 'amber' | 'indigo'; hideMute?: boolean
}) {
  const accent = color === 'amber' ? 'accent-amber-500' : 'accent-indigo-500'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        {!hideMute && (
          <button
            onClick={() => setMuted(!muted)}
            className={`text-xs rounded px-1.5 py-0.5 border ${muted ? 'border-red-200 bg-red-50 text-red-600' : 'border-gray-200 bg-white text-gray-500'}`}
            title={muted ? 'Réactiver' : 'Couper'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        )}
      </div>
      <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : vol}
        onChange={(e) => setVol(Number(e.target.value))}
        disabled={muted}
        className={`w-full h-1 ${accent} ${muted ? 'opacity-40' : ''}`} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Lecteur MIDI (Tone.js — synthé navigateur, pour pré-écoute)
// ─────────────────────────────────────────────────────────────────────────────
function MidiSeqPlayer({ seq }: { seq: Sequence }) {
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const partRef = useRef<any>(null)
  const synthRef = useRef<any>(null)
  const toneRef = useRef<any>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = null
    try {
      const Tone = toneRef.current
      const tr = Tone ? (Tone.Transport ?? Tone.getTransport?.()) : null
      if (tr) { tr.stop(); tr.cancel() }
      if (partRef.current) { partRef.current.dispose(); partRef.current = null }
      if (synthRef.current) { synthRef.current.releaseAll?.(); }
    } catch {}
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  const stop = () => { cleanup(); setPlaying(false); setProgress(0) }

  const play = async () => {
    if (playing) { stop(); return }
    setLoading(true); setErr('')
    try {
      const midiMod: any = await import('@tonejs/midi')
      const toneMod: any = await import('tone')
      const Midi = midiMod.Midi ?? midiMod.default?.Midi ?? midiMod.default
      const Tone = toneMod.Transport || toneMod.start ? toneMod : (toneMod.default ?? toneMod)
      toneRef.current = Tone
      if (!Midi) throw new Error('@tonejs/midi non chargé')
      if (!Tone?.start) throw new Error('Tone.js non chargé')

      const res = await fetch(encodeURI(seq.filePath))
      if (!res.ok) throw new Error(`Fichier inaccessible (HTTP ${res.status})`)
      const buf = await res.arrayBuffer()
      const midi = new Midi(buf)
      setDuration(midi.duration)

      await Tone.start()
      const transport = Tone.Transport ?? Tone.getTransport?.()
      if (!transport) throw new Error('Transport Tone indisponible')
      transport.stop(); transport.cancel(); transport.position = 0

      if (!synthRef.current) {
        synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination()
        synthRef.current.volume.value = -6
      }
      const synth = synthRef.current

      const events: { time: number; name: string; duration: number; velocity: number }[] = []
      midi.tracks.forEach((track: any) => {
        track.notes.forEach((n: any) => events.push({ time: n.time, name: n.name, duration: n.duration, velocity: n.velocity }))
      })

      const part = new Tone.Part((time: number, ev: any) => {
        synth.triggerAttackRelease(ev.name, ev.duration, time, ev.velocity)
      }, events as any)
      part.start(0)
      partRef.current = part

      transport.start()
      setPlaying(true)
      setLoading(false)

      pollRef.current = setInterval(() => {
        const sec = transport.seconds
        setProgress(sec)
        if (sec >= midi.duration) stop()
      }, 200)
    } catch (e: any) {
      console.error('MIDI play error:', e)
      setErr(`Lecture MIDI impossible : ${e?.message || e}`)
      setLoading(false)
      setPlaying(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-3">
        <button
          onClick={play}
          disabled={loading}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-colors disabled:opacity-50"
          title={playing ? 'Arrêter' : 'Lecture MIDI'}
        >
          {loading ? '…' : playing ? '⏹' : '▶'}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800 truncate">{seq.title}</span>
            <span className="text-[10px] font-semibold rounded-full bg-purple-50 border border-purple-200 text-purple-700 px-1.5 py-0.5">MIDI</span>
          </div>
          {duration > 0 ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400 tabular-nums w-9">{fmt(progress)}</span>
              <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: `${duration ? Math.min(100, (progress / duration) * 100) : 0}%` }} />
              </div>
              <span className="text-xs text-gray-400 tabular-nums w-9">{fmt(duration)}</span>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">Synthé navigateur — pré-écoute</p>
          )}
          {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
        </div>
      </div>
    </div>
  )
}

export function SequencePlayer({ seq, compact }: { seq: Sequence; compact?: boolean }) {
  return seq.kind === 'MIDI' ? <MidiSeqPlayer seq={seq} /> : <AudioSeqPlayer seq={seq} compact={compact} />
}

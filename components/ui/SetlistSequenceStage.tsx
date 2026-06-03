'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface StageSong {
  id: number
  title: string
  artist?: string | null
  tempo?: number | null
}

interface SeqItem {
  id: number
  kind: 'AUDIO' | 'MIDI'
  title: string
  filePath: string
  channelMode: 'STEREO' | 'SPLIT_LR'
}

function fmt(t: number) {
  if (!isFinite(t)) return '0:00'
  const m = Math.floor(t / 60), s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Mode scène : enchaîne les séquences AUDIO des morceaux d'une setlist.
 * Décompte basé sur le BPM, lecture, prev/suivant, enchaînement auto,
 * séparation click(G)/backing(D).
 */
export function SetlistSequenceStage({ songs, onClose }: { songs: StageSong[]; onClose: () => void }) {
  const [seqBySong, setSeqBySong] = useState<Record<number, SeqItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [seqPick, setSeqPick] = useState<Record<number, number>>({}) // song.id -> sequence index

  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(0)

  const [countIn, setCountIn] = useState(true)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [countBeat, setCountBeat] = useState(-1)

  const [clickVol, setClickVol] = useState(1)
  const [backingVol, setBackingVol] = useState(1)
  const [master, setMaster] = useState(1)
  const [clickMute, setClickMute] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const lgRef = useRef<GainNode | null>(null)
  const rgRef = useRef<GainNode | null>(null)
  const wiredRef = useRef(false)
  const countTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoPlayNextRef = useRef(false)

  // ── Charge les séquences de tous les morceaux ──
  useEffect(() => {
    let cancel = false
    Promise.all(songs.map(s => fetch(`/api/morceaux/${s.id}/sequences`).then(r => r.ok ? r.json() : []).catch(() => [])))
      .then(results => {
        if (cancel) return
        const map: Record<number, SeqItem[]> = {}
        songs.forEach((s, i) => { map[s.id] = results[i] || [] })
        setSeqBySong(map)
        // démarre sur le 1er morceau qui a une séquence audio
        const first = songs.findIndex(s => (map[s.id] || []).some(q => q.kind === 'AUDIO'))
        setIndex(first >= 0 ? first : 0)
        setLoading(false)
      })
    return () => { cancel = true }
  }, [songs])

  const song = songs[index]
  const seqs = (song ? seqBySong[song.id] : []) || []
  const audioSeqs = seqs.filter(s => s.kind === 'AUDIO')
  const pick = song ? (seqPick[song.id] ?? 0) : 0
  const seq = audioSeqs[pick] || audioSeqs[0] || null

  const ensureGraph = useCallback(() => {
    if (wiredRef.current || !audioRef.current) return
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new Ctx()
    ctxRef.current = ctx
    const source = ctx.createMediaElementSource(audioRef.current)
    const splitter = ctx.createChannelSplitter(2)
    const merger = ctx.createChannelMerger(2)
    const lg = ctx.createGain(), rg = ctx.createGain()
    lgRef.current = lg; rgRef.current = rg
    source.connect(splitter)
    splitter.connect(lg, 0); splitter.connect(rg, 1)
    lg.connect(merger, 0, 0); rg.connect(merger, 0, 1)
    merger.connect(ctx.destination)
    wiredRef.current = true
  }, [])

  // Volumes
  useEffect(() => {
    const lg = lgRef.current, rg = rgRef.current
    if (!lg || !rg) return
    if (seq?.channelMode === 'SPLIT_LR') {
      lg.gain.value = clickMute ? 0 : clickVol
      rg.gain.value = backingVol
    } else {
      lg.gain.value = master; rg.gain.value = master
    }
  }, [seq, clickVol, backingVol, clickMute, master, playing, cur])

  // Changement de morceau → recharge la source
  useEffect(() => {
    const a = audioRef.current
    if (!a || !seq) return
    a.pause(); setPlaying(false); setCur(0); setDur(0)
    a.src = encodeURI(seq.filePath)
    a.load()
    if (autoPlayNextRef.current) {
      autoPlayNextRef.current = false
      // petit délai pour laisser charger les métadonnées
      setTimeout(() => { startPlayback() }, 300)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, seq?.id])

  const clearCount = () => { if (countTimerRef.current) clearTimeout(countTimerRef.current); countTimerRef.current = null; setCountBeat(-1) }

  const playClick = (accent: boolean) => {
    const ctx = ctxRef.current
    if (!ctx) return
    const osc = ctx.createOscillator(), g = ctx.createGain()
    osc.frequency.value = accent ? 1500 : 1000
    g.gain.setValueAtTime(accent ? 0.5 : 0.3, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
    osc.connect(g); g.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + 0.05)
  }

  const startPlayback = async () => {
    const a = audioRef.current
    if (!a) return
    ensureGraph()
    if (ctxRef.current?.state === 'suspended') await ctxRef.current.resume()
    try { await a.play(); setPlaying(true) } catch {}
  }

  const doCountInThenPlay = async () => {
    const a = audioRef.current
    if (!a) return
    ensureGraph()
    if (ctxRef.current?.state === 'suspended') await ctxRef.current.resume()
    const bpm = song?.tempo && song.tempo > 0 ? song.tempo : 0
    if (!countIn || !bpm) { startPlayback(); return }
    const interval = 60000 / bpm
    let beat = 0
    const tick = () => {
      if (beat >= 4) { clearCount(); startPlayback(); return }
      playClick(beat === 0)
      setCountBeat(beat)
      beat++
      countTimerRef.current = setTimeout(tick, interval)
    }
    tick()
  }

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (countTimerRef.current) { clearCount(); return } // annule un décompte en cours
    if (a.paused) doCountInThenPlay()
    else { a.pause(); setPlaying(false) }
  }

  const go = (dir: number, autoplay = false) => {
    clearCount()
    if (autoplay) {
      // Enchaînement auto : saute au prochain morceau ayant une séquence audio
      let i = index + dir
      while (i >= 0 && i < songs.length) {
        const s = songs[i]
        if ((seqBySong[s.id] || []).some(q => q.kind === 'AUDIO')) break
        i += dir
      }
      if (i < 0 || i >= songs.length) { setPlaying(false); return }
      autoPlayNextRef.current = true
      setIndex(i)
      return
    }
    // Navigation manuelle : morceau adjacent (même sans séquence audio)
    const i = Math.max(0, Math.min(songs.length - 1, index + dir))
    if (i === index) return
    autoPlayNextRef.current = false
    setIndex(i)
  }

  const onEnded = () => {
    setPlaying(false)
    if (autoAdvance) go(1, true)
  }

  // Cleanup
  useEffect(() => () => { clearCount(); audioRef.current?.pause() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === ' ') { e.preventDefault(); toggle() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, seq?.id, playing])

  const nextSong = songs.slice(index + 1).find(s => (seqBySong[s.id] || []).some(q => q.kind === 'AUDIO'))
  const split = seq?.channelMode === 'SPLIT_LR'

  const overlay = (
    <div className="fixed inset-0 bg-gray-950 text-white flex flex-col" style={{ zIndex: 2147483647 }}>
      <audio
        ref={audioRef}
        onLoadedMetadata={(e) => setDur((e.target as HTMLAudioElement).duration)}
        onTimeUpdate={(e) => setCur((e.target as HTMLAudioElement).currentTime)}
        onEnded={onEnded}
      />
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <p className="text-lg font-bold">🎚 Mode séquences</p>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} /> Décompte
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={autoAdvance} onChange={(e) => setAutoAdvance(e.target.checked)} /> Enchaînement auto
          </label>
          <button onClick={onClose} className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 font-semibold">✕ Quitter</button>
        </div>
      </div>

      {/* Corps */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
        {loading ? (
          <p className="text-gray-400">Chargement des séquences…</p>
        ) : !seq ? (
          <div className="text-center">
            <p className="text-2xl font-bold mb-2">{song?.title || '—'}</p>
            <p className="text-gray-400">Aucune séquence audio pour ce morceau.</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button onClick={() => go(-1)} className="rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2">← Précédent</button>
              <button onClick={() => go(1)} className="rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2">Suivant →</button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-xl text-center">
            <p className="text-sm text-gray-400">Morceau {index + 1} / {songs.length}</p>
            <h2 className="text-3xl sm:text-4xl font-black mt-1">{song?.title}</h2>
            {song?.artist && <p className="text-gray-400 mt-1">{song.artist}</p>}
            <p className="text-sm text-gray-500 mt-2">
              {seq.title}{song?.tempo ? ` · ${song.tempo} BPM` : ''}{split ? ' · Click G / Backing D' : ''}
            </p>

            {/* Décompte visuel */}
            {countBeat >= 0 && (
              <div className="my-6">
                <span className="inline-flex items-center justify-center rounded-full bg-indigo-600 text-white font-black"
                  style={{ width: 120, height: 120, fontSize: 64 }}>
                  {countBeat + 1}
                </span>
              </div>
            )}

            {/* Sélecteur de séquence si plusieurs */}
            {audioSeqs.length > 1 && (
              <select
                value={pick}
                onChange={(e) => { clearCount(); audioRef.current?.pause(); setPlaying(false); setSeqPick(p => ({ ...p, [song!.id]: Number(e.target.value) })) }}
                className="mt-3 rounded-lg bg-white/10 text-white text-sm px-3 py-1.5 border border-white/10"
              >
                {audioSeqs.map((q, i) => <option key={q.id} value={i} className="text-black">{q.title}</option>)}
              </select>
            )}

            {/* Transport */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <button onClick={() => go(-1)} className="rounded-full bg-white/10 hover:bg-white/20 w-12 h-12 flex items-center justify-center text-xl" title="Précédent">⏮</button>
              <button onClick={toggle} className="rounded-full bg-indigo-600 hover:bg-indigo-500 w-16 h-16 flex items-center justify-center text-2xl" title="Lecture/Pause">
                {countTimerRef.current ? '⏳' : playing ? '⏸' : '▶'}
              </button>
              <button onClick={() => go(1)} className="rounded-full bg-white/10 hover:bg-white/20 w-12 h-12 flex items-center justify-center text-xl" title="Suivant">⏭</button>
            </div>

            {/* Progression */}
            <div className="flex items-center gap-2 mt-5">
              <span className="text-xs text-gray-400 tabular-nums w-10">{fmt(cur)}</span>
              <input type="range" min={0} max={dur || 0} step={0.1} value={cur}
                onChange={(e) => { if (audioRef.current) { audioRef.current.currentTime = Number(e.target.value); setCur(Number(e.target.value)) } }}
                className="flex-1 accent-indigo-500" />
              <span className="text-xs text-gray-400 tabular-nums w-10">{fmt(dur)}</span>
            </div>

            {/* Faders */}
            <div className="mt-5 grid grid-cols-2 gap-4 text-left">
              {split ? (
                <>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>🥁 Click (G)</span>
                      <button onClick={() => setClickMute(m => !m)} className={`rounded px-1.5 ${clickMute ? 'bg-red-500/30 text-red-300' : 'bg-white/10'}`}>{clickMute ? '🔇' : '🔊'}</button>
                    </div>
                    <input type="range" min={0} max={1} step={0.01} value={clickMute ? 0 : clickVol} disabled={clickMute}
                      onChange={(e) => setClickVol(Number(e.target.value))} className="w-full accent-amber-500" />
                  </div>
                  <div>
                    <div className="text-xs mb-1">🎶 Backing (D)</div>
                    <input type="range" min={0} max={1} step={0.01} value={backingVol}
                      onChange={(e) => setBackingVol(Number(e.target.value))} className="w-full accent-indigo-500" />
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <div className="text-xs mb-1">🔊 Volume</div>
                  <input type="range" min={0} max={1} step={0.01} value={master}
                    onChange={(e) => setMaster(Number(e.target.value))} className="w-full accent-indigo-500" />
                </div>
              )}
            </div>

            {/* À suivre */}
            <p className="text-xs text-gray-500 mt-6">
              {nextSong ? <>À suivre : <span className="text-gray-300">{nextSong.title}</span></> : 'Dernier morceau de la setlist.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}

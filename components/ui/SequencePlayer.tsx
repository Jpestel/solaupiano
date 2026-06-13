'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export interface Sequence {
  id?: number               // absent en mode local (fichier non sauvegardé) → pas de boucles persistées
  kind: 'AUDIO' | 'MIDI'
  title: string
  filePath: string
  channelMode?: 'STEREO' | 'SPLIT_LR'
}

function fmt(t: number) {
  if (!isFinite(t)) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Parse "3:03" (M:SS), "1:02:30" (H:MM:SS) ou un nombre de secondes en secondes. null si invalide.
function parseClock(s: string): number | null {
  const t = s.trim()
  if (!t) return null
  if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t)
  const parts = t.split(':').map((p) => p.trim())
  if (parts.length < 2 || parts.length > 3) return null
  if (parts.some((p) => p === '' || isNaN(Number(p)))) return null
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0)
}

const WAVE_COLORS = [
  { wave: '#6366f1', head: '#4338ca', label: 'Indigo' },
  { wave: '#8b5cf6', head: '#6d28d9', label: 'Violet' },
  { wave: '#0ea5e9', head: '#0369a1', label: 'Ciel' },
  { wave: '#14b8a6', head: '#0f766e', label: 'Teal' },
  { wave: '#22c55e', head: '#15803d', label: 'Vert' },
  { wave: '#f97316', head: '#c2410c', label: 'Orange' },
  { wave: '#f43f5e', head: '#be123c', label: 'Rose' },
]

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

  // ── Travail : vitesse (tonalité conservée) + boucle A–B ──
  const [speed, setSpeed] = useState(1)
  const [aPt, setAPt] = useState<number | null>(null)
  const [bPt, setBPt] = useState<number | null>(null)
  const [loopOn, setLoopOn] = useState(false)

  // Départ différé (compte à rebours avant lecture)
  const [delaySec, setDelaySec] = useState(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current) }, [])
  // Champs éditables (saisie manuelle ex. "3:03")
  const [aStr, setAStr] = useState('')
  const [bStr, setBStr] = useState('')
  useEffect(() => { setAStr(aPt !== null ? fmt(aPt) : '') }, [aPt])
  useEffect(() => { setBStr(bPt !== null ? fmt(bPt) : '') }, [bPt])
  const commitPt = (raw: string, setter: (n: number | null) => void) => {
    const v = parseClock(raw)
    if (v === null) return false
    setter(dur > 0 ? Math.max(0, Math.min(dur, v)) : Math.max(0, v))
    return true
  }

  // ── Boucles sauvegardées (par membre) ──
  interface SavedLoop { id: number; label: string | null; startSec: number; endSec: number; speed: number }
  const [savedLoops, setSavedLoops] = useState<SavedLoop[]>([])
  const [savingLoop, setSavingLoop] = useState(false)

  const canPersist = !!seq.id // mode local (sans id) : pas de sauvegarde de boucles

  useEffect(() => {
    if (compact || !seq.id) return
    fetch(`/api/sequences/${seq.id}/loops`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setSavedLoops(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [seq.id, compact])

  // ── Forme d'onde (waveform) ──
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [peaks, setPeaks] = useState<Float32Array | null>(null)
  const [wfLoading, setWfLoading] = useState(false)
  const PEAKS_N = 560

  const [colorIdx, setColorIdx] = useState(0)
  const waveColor = WAVE_COLORS[colorIdx]

  // Décode le fichier et calcule les pics d'amplitude (une fois)
  useEffect(() => {
    if (compact) return
    let cancelled = false
    setWfLoading(true)
    setPeaks(null)
    ;(async () => {
      try {
        const res = await fetch(encodeURI(seq.filePath))
        if (!res.ok) throw new Error('fetch')
        const buf = await res.arrayBuffer()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Ctx = window.AudioContext || (window as any).webkitAudioContext
        const ac = new Ctx()
        const audioBuf = await ac.decodeAudioData(buf)
        try { await ac.close() } catch { /* ignore */ }
        const ch0 = audioBuf.getChannelData(0)
        const ch1 = audioBuf.numberOfChannels > 1 ? audioBuf.getChannelData(1) : null
        const block = Math.max(1, Math.floor(ch0.length / PEAKS_N))
        const out = new Float32Array(PEAKS_N)
        for (let i = 0; i < PEAKS_N; i++) {
          let peak = 0
          const start = i * block
          const end = Math.min(ch0.length, start + block)
          for (let j = start; j < end; j++) {
            const v = ch1 ? Math.max(Math.abs(ch0[j]), Math.abs(ch1[j])) : Math.abs(ch0[j])
            if (v > peak) peak = v
          }
          out[i] = peak
        }
        // Normalisation douce pour bien voir les nuances
        let max = 0
        for (let i = 0; i < PEAKS_N; i++) if (out[i] > max) max = out[i]
        if (max > 0) for (let i = 0; i < PEAKS_N; i++) out[i] = out[i] / max
        if (!cancelled) setPeaks(out)
      } catch {
        if (!cancelled) setPeaks(null)
      } finally {
        if (!cancelled) setWfLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [seq.filePath, compact])

  // Conserve la tonalité quand on change la vitesse
  useEffect(() => {
    const a = audioRef.current as (HTMLAudioElement & { preservesPitch?: boolean; mozPreservesPitch?: boolean; webkitPreservesPitch?: boolean }) | null
    if (!a) return
    a.preservesPitch = true
    a.mozPreservesPitch = true
    a.webkitPreservesPitch = true
    a.playbackRate = speed
  }, [speed])

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

  const beginPlay = async () => {
    const a = audioRef.current
    if (!a) return
    try { await a.play(); setPlaying(true) } catch { /* autoplay bloqué */ }
  }

  const cancelCountdown = () => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
    setCountdown(null)
  }

  const toggle = async () => {
    const a = audioRef.current
    if (!a) return
    // Un clic pendant le compte à rebours = annulation
    if (countdown !== null) { cancelCountdown(); return }
    ensureGraph()
    if (ctxRef.current?.state === 'suspended') await ctxRef.current.resume()
    if (!a.paused) { a.pause(); setPlaying(false); return }
    // Lecture : départ différé éventuel
    if (delaySec > 0) {
      setCountdown(delaySec)
      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c === null) return null
          if (c <= 1) { cancelCountdown(); beginPlay(); return null }
          return c - 1
        })
      }, 1000)
    } else {
      beginPlay()
    }
  }

  const seek = (v: number) => { if (audioRef.current) { audioRef.current.currentTime = v; setCur(v) } }

  // La boucle n'est valide que si B > A (sinon t >= bPt serait toujours vrai → blocage sur une note)
  const loopValid = loopOn && aPt !== null && bPt !== null && bPt > aPt
  const onTime = (t: number) => {
    setCur(t)
    if (loopValid && t >= (bPt as number)) seek(aPt as number)
  }
  const onEnded = async () => {
    if (loopValid) { seek(aPt as number); try { await audioRef.current?.play() } catch { /* ignore */ } }
    else setPlaying(false)
  }
  const clearLoop = () => { setLoopOn(false); setAPt(null); setBPt(null) }

  const saveLoop = async () => {
    if (aPt === null || bPt === null || bPt <= aPt) return
    const label = window.prompt('Nom de la boucle (optionnel) :', '')
    if (label === null) return // annulé
    setSavingLoop(true)
    try {
      const res = await fetch(`/api/sequences/${seq.id}/loops`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim() || null, startSec: aPt, endSec: bPt, speed }),
      })
      if (res.ok) {
        const loop = await res.json()
        setSavedLoops((ls) => [...ls, loop].sort((a, b) => a.startSec - b.startSec))
      }
    } finally {
      setSavingLoop(false)
    }
  }

  const applyLoop = (l: SavedLoop) => {
    setAPt(l.startSec); setBPt(l.endSec); setSpeed(l.speed); setLoopOn(true)
    seek(l.startSec)
  }

  const deleteLoop = async (id: number) => {
    const res = await fetch(`/api/sequences/${seq.id}/loops/${id}`, { method: 'DELETE' })
    if (res.ok) setSavedLoops((ls) => ls.filter((l) => l.id !== id))
  }

  // Dessine la forme d'onde (joué = couleur choisie, à venir = gris, boucle A–B = ambre)
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv || !peaks) return
    const W = cv.width, H = cv.height
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, W, H)
    const mid = H / 2
    const n = peaks.length
    const barW = W / n
    const progX = dur > 0 ? (cur / dur) * W : 0

    // Zone de boucle A–B
    if (aPt !== null && bPt !== null && dur > 0) {
      const x1 = (aPt / dur) * W, x2 = (bPt / dur) * W
      ctx.fillStyle = loopOn ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.10)'
      ctx.fillRect(x1, 0, x2 - x1, H)
    }

    for (let i = 0; i < n; i++) {
      const x = i * barW
      const h = Math.max(1, peaks[i] * (mid - 1))
      ctx.fillStyle = x <= progX ? waveColor.wave : '#d1d5db'
      ctx.fillRect(x, mid - h, Math.max(1, barW - 0.5), h * 2)
    }
    // Tête de lecture
    if (dur > 0) {
      ctx.fillStyle = waveColor.head
      ctx.fillRect(progX, 0, 1.5, H)
    }
  }, [peaks, cur, dur, aPt, bPt, loopOn, waveColor])

  const seekFromCanvas = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dur) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seek(ratio * dur)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <audio
        ref={audioRef}
        src={encodeURI(seq.filePath)}
        preload="metadata"
        onLoadedMetadata={(e) => setDur((e.target as HTMLAudioElement).duration)}
        onTimeUpdate={(e) => onTime((e.target as HTMLAudioElement).currentTime)}
        onEnded={onEnded}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className={`flex-shrink-0 w-10 h-10 rounded-full text-white flex items-center justify-center transition-colors ${countdown !== null ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-500'}`}
          title={countdown !== null ? 'Annuler le départ différé' : playing ? 'Pause' : 'Lecture'}
        >
          {countdown !== null ? <span className="text-sm font-bold tabular-nums">{countdown}</span> : playing ? '⏸' : '▶'}
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

      {/* Forme d’onde — cliquer pour se positionner */}
      {!compact && (
        <div className="mt-2.5">
          {peaks ? (
            <>
              <canvas
                ref={canvasRef}
                width={PEAKS_N}
                height={72}
                onClick={seekFromCanvas}
                className="w-full h-12 cursor-pointer rounded-md bg-gray-50"
                title="Cliquez pour vous positionner"
              />
              <div className="flex items-center gap-1 mt-1.5">
                {WAVE_COLORS.map((c, i) => (
                  <button
                    key={c.label}
                    onClick={() => setColorIdx(i)}
                    title={c.label}
                    className={`w-4 h-4 rounded-full transition-transform ${colorIdx === i ? "scale-125 ring-2 ring-offset-1 ring-gray-400" : "opacity-60 hover:opacity-100"}`}
                    style={{ backgroundColor: c.wave }}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="h-12 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center">
              <span className="text-[11px] text-gray-400">{wfLoading ? "🌊 Analyse de la forme d’onde…" : "Forme d’onde indisponible"}</span>
            </div>
          )}
        </div>
      )}

      {/* Travail : vitesse (tonalité conservée) + boucle A–B */}
      {!compact && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5">
          {/* Vitesse */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500 mr-0.5">🐢 Vitesse</span>
            {[0.5, 0.75, 0.9, 1, 1.1, 1.25].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${speed === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {s === 1 ? '1×' : `${s}×`}
              </button>
            ))}
            <span className="text-[10px] text-gray-400">tonalité conservée</span>
          </div>
          {/* Départ différé */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500 mr-0.5">⏳ Départ différé</span>
            {[0, 3, 5, 10].map((s) => (
              <button
                key={s}
                onClick={() => setDelaySec(s)}
                className={`rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${delaySec === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {s === 0 ? 'Aucun' : `${s} s`}
              </button>
            ))}
            <span className="inline-flex items-center gap-1">
              <input
                type="number" min={0} max={60} value={delaySec}
                onChange={(e) => setDelaySec(Math.max(0, Math.min(60, Math.round(Number(e.target.value) || 0))))}
                className="w-12 rounded-md border border-gray-300 px-1.5 py-0.5 text-xs tabular-nums"
              />
              <span className="text-[10px] text-gray-400">s</span>
            </span>
          </div>
          {/* Boucle A–B */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500 mr-0.5">🔁 Boucle</span>
            {/* A : saisie manuelle (ex. 3:03) + capture position */}
            <span className="inline-flex items-center gap-1">
              <span className="text-xs font-semibold text-amber-700">A</span>
              <input
                value={aStr}
                onChange={(e) => setAStr(e.target.value)}
                onBlur={() => { if (!commitPt(aStr, setAPt)) setAStr(aPt !== null ? fmt(aPt) : '') }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                placeholder="m:ss"
                className="w-14 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800 tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-300"
              />
              <button onClick={() => setAPt(cur)} title="Insérer le temps de lecture actuel dans A" className="inline-flex items-center gap-0.5 rounded-md bg-amber-100 text-amber-700 px-1.5 py-0.5 text-xs font-medium hover:bg-amber-200">⏱ ici</button>
            </span>
            {/* B : saisie manuelle + capture position */}
            <span className="inline-flex items-center gap-1">
              <span className="text-xs font-semibold text-amber-700">B</span>
              <input
                value={bStr}
                onChange={(e) => setBStr(e.target.value)}
                onBlur={() => { if (!commitPt(bStr, setBPt)) setBStr(bPt !== null ? fmt(bPt) : '') }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                placeholder="m:ss"
                className="w-14 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800 tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-300"
              />
              <button onClick={() => setBPt(cur)} title="Insérer le temps de lecture actuel dans B" className="inline-flex items-center gap-0.5 rounded-md bg-amber-100 text-amber-700 px-1.5 py-0.5 text-xs font-medium hover:bg-amber-200">⏱ ici</button>
            </span>
            <button
              onClick={() => setLoopOn((v) => !v)}
              disabled={!loopOn && (aPt === null || bPt === null || bPt <= aPt)}
              title={aPt !== null && bPt !== null && bPt <= aPt ? 'B doit être après A' : undefined}
              className={`rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors disabled:opacity-40 ${loopOn ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {loopOn ? 'Boucle active' : 'Activer'}
            </button>
            {canPersist && (
              <button
                onClick={saveLoop}
                disabled={aPt === null || bPt === null || bPt <= (aPt ?? 0) || savingLoop}
                title="Enregistrer cet intervalle pour le retrouver plus tard"
                className="rounded-md bg-indigo-600 text-white px-2.5 py-0.5 text-xs font-semibold hover:bg-indigo-500 disabled:opacity-40"
              >
                💾 Enregistrer
              </button>
            )}
            {(aPt !== null || bPt !== null) && (
              <button onClick={clearLoop} className="text-xs text-gray-400 hover:text-red-500">Effacer</button>
            )}
          </div>

          {/* Boucles sauvegardées (par membre) */}
          {canPersist && savedLoops.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium text-gray-500 mr-0.5">⭐ Mes boucles</span>
              {savedLoops.map((l) => {
                const isActive = loopOn && aPt === l.startSec && bPt === l.endSec
                return (
                  <span key={l.id} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${isActive ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600'}`}>
                    <button onClick={() => applyLoop(l)} title={`${fmt(l.startSec)} → ${fmt(l.endSec)} · ${l.speed}×`} className="font-medium hover:text-indigo-600">
                      {l.label || `${fmt(l.startSec)}–${fmt(l.endSec)}`}{l.speed !== 1 ? ` ${l.speed}×` : ''}
                    </button>
                    <button onClick={() => deleteLoop(l.id)} title="Supprimer" className="text-gray-300 hover:text-red-500 leading-none">×</button>
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}

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
// Lecteur MIDI (Web Audio natif — synthé oscillateurs, pour pré-écoute)
// Parsing via @tonejs/midi, restitution sans dépendance audio externe.
// ─────────────────────────────────────────────────────────────────────────────
function MidiSeqPlayer({ seq }: { seq: Sequence }) {
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const ctxRef = useRef<AudioContext | null>(null)
  const oscsRef = useRef<OscillatorNode[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = null
    oscsRef.current.forEach((o) => { try { o.stop() } catch {} })
    oscsRef.current = []
  }, [])

  useEffect(() => () => { cleanup(); try { ctxRef.current?.close() } catch {} }, [cleanup])

  const stop = () => { cleanup(); setPlaying(false); setProgress(0) }

  const play = async () => {
    if (playing) { stop(); return }
    setLoading(true); setErr('')
    try {
      const midiMod: any = await import('@tonejs/midi')
      const Midi = midiMod.Midi ?? midiMod.default?.Midi ?? midiMod.default
      if (!Midi) throw new Error('@tonejs/midi non chargé')

      const res = await fetch(encodeURI(seq.filePath))
      if (!res.ok) throw new Error(`Fichier inaccessible (HTTP ${res.status})`)
      const buf = await res.arrayBuffer()
      const midi = new Midi(buf)
      setDuration(midi.duration)

      if (!ctxRef.current) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext
        ctxRef.current = new Ctx()
      }
      const ctx = ctxRef.current!
      await ctx.resume()

      const master = ctx.createGain()
      master.gain.value = 0.8
      master.connect(ctx.destination)

      const startAt = ctx.currentTime + 0.15
      const oscs: OscillatorNode[] = []
      midi.tracks.forEach((track: any) => {
        const isDrum = track.channel === 9
        track.notes.forEach((n: any) => {
          if (isDrum) return // on ignore la batterie (canal 10) pour la pré-écoute mélodique
          const t0 = startAt + n.time
          const t1 = t0 + Math.max(0.08, n.duration)
          const freq = 440 * Math.pow(2, (n.midi - 69) / 12)
          const osc = ctx.createOscillator()
          const g = ctx.createGain()
          osc.type = 'triangle'
          osc.frequency.value = freq
          const peak = Math.max(0.04, (n.velocity ?? 0.7) * 0.16)
          g.gain.setValueAtTime(0.0001, t0)
          g.gain.linearRampToValueAtTime(peak, t0 + 0.012)
          g.gain.setValueAtTime(peak, Math.max(t0 + 0.012, t1 - 0.06))
          g.gain.exponentialRampToValueAtTime(0.0001, t1)
          osc.connect(g); g.connect(master)
          osc.start(t0); osc.stop(t1 + 0.05)
          oscs.push(osc)
        })
      })
      oscsRef.current = oscs

      if (oscs.length === 0) throw new Error('Aucune note mélodique à jouer dans ce fichier.')

      setPlaying(true)
      setLoading(false)

      pollRef.current = setInterval(() => {
        const sec = ctx.currentTime - startAt
        setProgress(Math.max(0, sec))
        if (sec >= midi.duration) stop()
      }, 150)
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

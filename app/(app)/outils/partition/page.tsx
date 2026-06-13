'use client'

import { useEffect, useRef, useState } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Exemple intégré (domaine public) pour tester l'outil sans chercher de fichier.
const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>Au clair de la lune</work-title></work>
  <part-list><score-part id="P1"><part-name>Mélodie</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <direction placement="above"><sound tempo="100"/></direction>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note>
    </measure>
    <measure number="3">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
    <measure number="4">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure>
  </part>
</score-partwise>`

export default function PartitionPage() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const osmdRef = useRef<any>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const playingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [playing, setPlaying] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [transpose, setTranspose] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [canTranspose, setCanTranspose] = useState(false)

  useEffect(() => () => { stopPlayback(); try { audioCtxRef.current?.close() } catch {} }, [])

  // ── Synthé simple (Web Audio) ──
  function ensureCtx(): AudioContext {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext
      audioCtxRef.current = new Ctx()
    }
    return audioCtxRef.current
  }
  function playFreqs(freqs: number[], seconds: number) {
    if (freqs.length === 0) return
    const ctx = ensureCtx()
    const t0 = ctx.currentTime
    const dur = Math.max(0.1, seconds * 0.92)
    const master = ctx.createGain()
    const peak = 0.5 / Math.max(1, freqs.length)
    master.gain.setValueAtTime(0.0001, t0)
    master.gain.linearRampToValueAtTime(peak, t0 + 0.012)
    master.gain.setValueAtTime(peak, Math.max(t0 + 0.02, t0 + dur - 0.06))
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    master.connect(ctx.destination)
    for (const f of freqs) {
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.value = f
      o.connect(master)
      o.start(t0)
      o.stop(t0 + dur + 0.03)
    }
  }

  function notesUnderCursor(): { freqs: number[]; maxLen: number } {
    const osmd = osmdRef.current
    const freqs: number[] = []
    let maxLen = 0.25
    try {
      const ves = osmd.cursor.VoicesUnderCursor() as any[]
      for (const ve of ves) {
        for (const n of ve.Notes || []) {
          if (n.Length?.RealValue > maxLen) maxLen = n.Length.RealValue
          if (n.Pitch && !n.isRest?.()) freqs.push(n.Pitch.Frequency)
        }
      }
    } catch { /* ignore */ }
    return { freqs, maxLen }
  }

  function stepSeconds(maxLen: number): number {
    const osmd = osmdRef.current
    const it = osmd.cursor.iterator
    let stepWhole = maxLen
    try {
      const tsNow = it.currentTimeStamp.RealValue
      const peek = it.clone()
      peek.moveToNext()
      stepWhole = peek.EndReached ? maxLen : Math.max(0.03, peek.currentTimeStamp.RealValue - tsNow)
    } catch { /* fallback maxLen */ }
    const bpm = it.CurrentBpm || 90
    return Math.max(0.12, stepWhole * (60 / bpm) * 4 / speed)
  }

  function autoStep() {
    const osmd = osmdRef.current
    if (!osmd || !playingRef.current) return
    if (osmd.cursor.iterator.EndReached) { stopPlayback(); return }
    const { freqs, maxLen } = notesUnderCursor()
    const seconds = stepSeconds(maxLen)
    playFreqs(freqs, seconds)
    timerRef.current = setTimeout(() => {
      if (!playingRef.current) return
      try { osmd.cursor.next() } catch {}
      autoStep()
    }, seconds * 1000)
  }

  function startPlayback() {
    const osmd = osmdRef.current
    if (!osmd) return
    ensureCtx().resume?.()
    if (osmd.cursor.iterator?.EndReached) { try { osmd.cursor.reset() } catch {} }
    playingRef.current = true
    setPlaying(true)
    autoStep()
  }
  function stopPlayback() {
    playingRef.current = false
    setPlaying(false)
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }
  function restart() {
    stopPlayback()
    try { osmdRef.current?.cursor.reset() } catch {}
  }
  function nextNote() {
    const osmd = osmdRef.current
    if (!osmd) return
    if (osmd.cursor.iterator.EndReached) return
    const { freqs, maxLen } = notesUnderCursor()
    playFreqs(freqs, Math.min(0.6, stepSeconds(maxLen)))
    try { osmd.cursor.next() } catch {}
  }

  // ── Chargement du fichier ──
  async function loadFile(file: File) {
    stopPlayback()
    setError(''); setLoaded(false); setFileName(file.name)
    const lower = file.name.toLowerCase()
    if (lower.endsWith('.mid') || lower.endsWith('.midi')) {
      setError("Le MIDI ne contient pas de partition gravée. Importez un MusicXML (.musicxml / .mxl, export MuseScore) pour la vue partition. Pour écouter un MIDI, utilisez l’onglet 🎚 Séquences d’un morceau.")
      return
    }
    setLoading(true)
    try {
      const mod: any = await import('opensheetmusicdisplay')
      const OSMD = mod.OpenSheetMusicDisplay
      if (!containerRef.current) return
      containerRef.current.innerHTML = ''
      const osmd = new OSMD(containerRef.current, { autoResize: true, backend: 'svg', drawTitle: true, followCursor: true })
      osmdRef.current = osmd
      // Transposition (optionnelle)
      try {
        if (mod.TransposeCalculator) { osmd.TransposeCalculator = new mod.TransposeCalculator(); setCanTranspose(true) }
        else setCanTranspose(false)
      } catch { setCanTranspose(false) }

      await osmd.load(file)
      setTranspose(0)
      osmd.Zoom = zoom
      osmd.render()
      try { osmd.cursor.show(); osmd.cursor.reset() } catch {}
      setLoaded(true)
    } catch (e) {
      console.error(e)
      setError("Impossible de lire ce fichier. Vérifiez qu’il s’agit bien d’un MusicXML valide (.musicxml ou .mxl).")
    } finally {
      setLoading(false)
    }
  }

  function applyZoom(z: number) {
    const osmd = osmdRef.current
    const clamped = Math.max(0.4, Math.min(2, z))
    setZoom(clamped)
    if (!osmd) return
    osmd.Zoom = clamped
    osmd.render()
    try { osmd.cursor.show() } catch {}
  }
  function applyTranspose(n: number) {
    const osmd = osmdRef.current
    if (!osmd || !canTranspose) return
    const clamped = Math.max(-12, Math.min(12, n))
    setTranspose(clamped)
    stopPlayback()
    try {
      osmd.Sheet.Transpose = clamped
      osmd.updateGraphic()
      osmd.render()
      osmd.cursor.show(); osmd.cursor.reset()
    } catch (e) { console.error(e) }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">🎼 Lecteur de partition</h1>
      <p className="text-gray-500 text-sm mt-1">
        Importez une partition <strong>MusicXML</strong> (<code>.musicxml</code> / <code>.mxl</code> — export MuseScore, Free-scores…),
        affichez-la et jouez-la avec un <strong>curseur qui suit les notes</strong>. Tout se passe dans votre navigateur.
      </p>

      {/* Import */}
      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <input ref={inputRef} type="file" accept=".xml,.musicxml,.mxl,.mid,.midi" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f) }} />
        <button onClick={() => inputRef.current?.click()} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-500">
          {loaded ? 'Changer de partition' : 'Choisir une partition'}
        </button>
        <button
          onClick={() => loadFile(new File([SAMPLE_XML], 'Exemple — Au clair de la lune.musicxml', { type: 'application/xml' }))}
          className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
        >
          ▶ Charger un exemple
        </button>
        {fileName && <span className="text-sm text-gray-500 truncate max-w-[240px]">🎼 {fileName}</span>}
      </div>

      {error && <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">{error}</div>}
      {loading && <p className="mt-4 text-sm text-gray-400">⏳ Lecture de la partition…</p>}

      {/* Contrôles */}
      {loaded && (
        <div className="mt-5 rounded-xl border border-gray-200 bg-white p-3 flex flex-wrap items-center gap-x-5 gap-y-3 sticky top-2 z-10">
          {/* Transport */}
          <div className="flex items-center gap-2">
            <button onClick={restart} title="Revenir au début" className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700">⏮</button>
            <button onClick={() => (playing ? stopPlayback() : startPlayback())}
              className="w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-lg">{playing ? '⏸' : '▶'}</button>
            <button onClick={nextNote} disabled={playing} title="Note suivante" className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-40">⏭</button>
          </div>
          {/* Vitesse */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500">🐢 Vitesse</span>
            {[0.5, 0.75, 1, 1.25].map((s) => (
              <button key={s} onClick={() => setSpeed(s)} className={`rounded-md px-2 py-0.5 text-xs font-semibold ${speed === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s === 1 ? '1×' : `${s}×`}</button>
            ))}
          </div>
          {/* Transpose */}
          {canTranspose && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500">🎚 Ton</span>
              <button onClick={() => applyTranspose(transpose - 1)} className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700">−</button>
              <span className="text-xs tabular-nums w-8 text-center text-gray-700">{transpose > 0 ? `+${transpose}` : transpose}</span>
              <button onClick={() => applyTranspose(transpose + 1)} className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700">+</button>
            </div>
          )}
          {/* Zoom */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500">🔍 Zoom</span>
            <button onClick={() => applyZoom(zoom - 0.15)} className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700">−</button>
            <span className="text-xs tabular-nums w-10 text-center text-gray-700">{Math.round(zoom * 100)}%</span>
            <button onClick={() => applyZoom(zoom + 0.15)} className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700">+</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loaded && !loading && (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center text-gray-400">
          <p className="text-4xl mb-2">🎼</p>
          <p className="font-medium text-gray-500">Aucune partition chargée.</p>
          <p className="text-sm">Exportez un <strong>MusicXML</strong> depuis MuseScore (Fichier → Exporter → MusicXML) ou téléchargez-en un sur Free-scores, puis importez-le ici.</p>
        </div>
      )}

      {/* Rendu OSMD */}
      <div className="mt-4 overflow-x-auto">
        <div ref={containerRef} className="bg-white rounded-xl" />
      </div>

      {loaded && (
        <p className="mt-3 text-[11px] text-gray-400">
          💡 La lecture utilise un synthé simple pour suivre les notes. Le rythme suit le tempo de la partition (ajustable avec la vitesse). Idéal pour <strong>déchiffrer</strong> et <strong>repérer les passages</strong>.
        </p>
      )}
    </div>
  )
}

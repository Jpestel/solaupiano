'use client'

import { useState } from 'react'

/* ─── Types ──────────────────────────────────────────────────────────────────── */
type Accidental = 'double-flat' | 'flat' | 'natural' | 'sharp' | 'double-sharp' | null
type Clef = 'treble' | 'bass'
type Mode = 'single' | 'chord'
interface NoteInfo { nameFr: string; letter: string; octave: number }
interface ChordNote { slot: number; accidental: Accidental }

/* ─── Note maps — slot 0 = top staff line, increases going DOWN ──────────────── */
const TREBLE: Record<string, NoteInfo> = {
  '-5': { nameFr: 'Ré',  letter: 'D', octave: 6 },
  '-4': { nameFr: 'Do',  letter: 'C', octave: 6 },
  '-3': { nameFr: 'Si',  letter: 'B', octave: 5 },
  '-2': { nameFr: 'La',  letter: 'A', octave: 5 },
  '-1': { nameFr: 'Sol', letter: 'G', octave: 5 },
  '0':  { nameFr: 'Fa',  letter: 'F', octave: 5 },
  '1':  { nameFr: 'Mi',  letter: 'E', octave: 5 },
  '2':  { nameFr: 'Ré',  letter: 'D', octave: 5 },
  '3':  { nameFr: 'Do',  letter: 'C', octave: 5 },
  '4':  { nameFr: 'Si',  letter: 'B', octave: 4 },
  '5':  { nameFr: 'La',  letter: 'A', octave: 4 },
  '6':  { nameFr: 'Sol', letter: 'G', octave: 4 },
  '7':  { nameFr: 'Fa',  letter: 'F', octave: 4 },
  '8':  { nameFr: 'Mi',  letter: 'E', octave: 4 },
  '9':  { nameFr: 'Ré',  letter: 'D', octave: 4 },
  '10': { nameFr: 'Do',  letter: 'C', octave: 4 },
  '11': { nameFr: 'Si',  letter: 'B', octave: 3 },
  '12': { nameFr: 'La',  letter: 'A', octave: 3 },
  '13': { nameFr: 'Sol', letter: 'G', octave: 3 },
}
const BASS: Record<string, NoteInfo> = {
  '-5': { nameFr: 'Fa',  letter: 'F', octave: 4 },
  '-4': { nameFr: 'Mi',  letter: 'E', octave: 4 },
  '-3': { nameFr: 'Ré',  letter: 'D', octave: 4 },
  '-2': { nameFr: 'Do',  letter: 'C', octave: 4 },
  '-1': { nameFr: 'Si',  letter: 'B', octave: 3 },
  '0':  { nameFr: 'La',  letter: 'A', octave: 3 },
  '1':  { nameFr: 'Sol', letter: 'G', octave: 3 },
  '2':  { nameFr: 'Fa',  letter: 'F', octave: 3 },
  '3':  { nameFr: 'Mi',  letter: 'E', octave: 3 },
  '4':  { nameFr: 'Ré',  letter: 'D', octave: 3 },
  '5':  { nameFr: 'Do',  letter: 'C', octave: 3 },
  '6':  { nameFr: 'Si',  letter: 'B', octave: 2 },
  '7':  { nameFr: 'La',  letter: 'A', octave: 2 },
  '8':  { nameFr: 'Sol', letter: 'G', octave: 2 },
  '9':  { nameFr: 'Fa',  letter: 'F', octave: 2 },
  '10': { nameFr: 'Mi',  letter: 'E', octave: 2 },
  '11': { nameFr: 'Ré',  letter: 'D', octave: 2 },
  '12': { nameFr: 'Do',  letter: 'C', octave: 2 },
  '13': { nameFr: 'Si',  letter: 'B', octave: 1 },
}

/* ─── Accidental helpers ─────────────────────────────────────────────────────── */
const ACC_SYMBOL: Record<NonNullable<Accidental>, string> = {
  'double-flat': '𝄫', 'flat': '♭', 'natural': '♮', 'sharp': '♯', 'double-sharp': '𝄪',
}
const ACC_NAME: Record<NonNullable<Accidental>, string> = {
  'double-flat': 'double bémol', 'flat': 'bémol', 'natural': 'bécarre',
  'sharp': 'dièse', 'double-sharp': 'double dièse',
}
const ACC_FS: Record<NonNullable<Accidental>, number> = {
  'double-flat': 17, 'flat': 22, 'natural': 20, 'sharp': 20, 'double-sharp': 17,
}

function accStr(acc: Accidental): string {
  return acc && acc !== 'natural' ? ACC_SYMBOL[acc] : ''
}
function noteNameFr(info: NoteInfo, acc: Accidental): string {
  return info.nameFr + accStr(acc)
}
function noteNameEn(info: NoteInfo, acc: Accidental): string {
  const a = acc === 'sharp' ? '♯' : acc === 'flat' ? '♭'
    : acc === 'double-sharp' ? '×' : acc === 'double-flat' ? '♭♭'
    : acc === 'natural' ? '♮' : ''
  return info.letter + a
}

function getEnharmonic(letter: string, acc: Accidental): string | null {
  if (!acc || acc === 'natural' || acc === 'double-sharp' || acc === 'double-flat') return null
  const map: Record<string, string> = {
    'C#': 'Ré♭', 'Db': 'Do♯', 'D#': 'Mi♭', 'Eb': 'Ré♯',
    'F#': 'Sol♭', 'Gb': 'Fa♯', 'G#': 'La♭', 'Ab': 'Sol♯',
    'A#': 'Si♭', 'Bb': 'La♯', 'E#': 'Fa', 'Fb': 'Mi', 'B#': 'Do', 'Cb': 'Si',
  }
  return map[letter + (acc === 'sharp' ? '#' : 'b')] ?? null
}

/* ─── Chord recognition ──────────────────────────────────────────────────────── */
const SEMITONE: Record<string, number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 }

function pc(letter: string, acc: Accidental): number {
  const d = acc==='sharp'?1:acc==='flat'?-1:acc==='double-sharp'?2:acc==='double-flat'?-2:0
  return ((SEMITONE[letter] + d) % 12 + 12) % 12
}

const CHORD_PATTERNS = [
  // Triads
  { i:[4,7],        fr:'majeur',          en:''      },
  { i:[3,7],        fr:'mineur',          en:'m'     },
  { i:[3,6],        fr:'diminué',         en:'dim'   },
  { i:[4,8],        fr:'augmenté',        en:'+'     },
  { i:[2,7],        fr:'sus2',            en:'sus2'  },
  { i:[5,7],        fr:'sus4',            en:'sus4'  },
  // 7th chords
  { i:[4,7,11],     fr:'majeur 7',        en:'maj7'  },
  { i:[4,7,10],     fr:'dominante 7',     en:'7'     },
  { i:[3,7,10],     fr:'mineur 7',        en:'m7'    },
  { i:[3,6,10],     fr:'mineur 7♭5',      en:'m7b5'  },
  { i:[3,6,9],      fr:'dim7',            en:'dim7'  },
  { i:[3,7,11],     fr:'mineur maj7',     en:'mM7'   },
  { i:[4,8,10],     fr:'augmenté 7',      en:'aug7'  },
  { i:[4,8,11],     fr:'augmenté maj7',   en:'augM7' },
  // 6th chords
  { i:[4,7,9],      fr:'majeur 6',        en:'6'     },
  { i:[3,7,9],      fr:'mineur 6',        en:'m6'    },
  // Add9
  { i:[2,4,7],      fr:'add9',            en:'add9'  },
  { i:[2,3,7],      fr:'mineur add9',     en:'madd9' },
  // 9th chords
  { i:[2,4,7,10],   fr:'9',               en:'9'     },
  { i:[2,4,7,11],   fr:'majeur 9',        en:'maj9'  },
  { i:[2,3,7,10],   fr:'mineur 9',        en:'m9'    },
  // 7sus
  { i:[5,7,10],     fr:'7sus4',           en:'7sus4' },
  { i:[2,7,10],     fr:'7sus2',           en:'7sus2' },
]

interface RecognizedChord {
  rootFr: string; rootEn: string
  chordFr: string; chordEn: string
  noteNames: string[]
  inversionLabel?: string
  unknown?: boolean
}

function recognizeChord(notes: ChordNote[], noteMap: Record<string, NoteInfo>): RecognizedChord | null {
  const infos = notes.map(n => ({ ...n, info: noteMap[n.slot.toString()] })).filter(n => n.info)
  if (infos.length < 2) return null

  const pcs = [...new Set(infos.map(n => pc(n.info.letter, n.accidental)))]
  if (pcs.length < 2) return null

  // Note names bass→treble (high slot = low pitch first)
  const noteNames = [...infos].sort((a, b) => b.slot - a.slot)
    .map(n => noteNameFr(n.info, n.accidental))

  // Bass = highest slot
  const bass = infos.reduce((m, n) => n.slot > m.slot ? n : m)
  const bassPc = pc(bass.info.letter, bass.accidental)

  for (const rootPc of pcs) {
    const intervals = pcs.filter(p => p !== rootPc)
      .map(p => ((p - rootPc + 12) % 12)).sort((a, b) => a - b)

    const match = CHORD_PATTERNS.find(c =>
      c.i.length === intervals.length && c.i.every((v, i) => v === intervals[i])
    )
    if (!match) continue

    const rootInfo = infos.find(n => pc(n.info.letter, n.accidental) === rootPc)
    if (!rootInfo) continue

    const intervalFromRoot = ((bassPc - rootPc + 12) % 12)
    let inversionLabel: string | undefined
    if (intervalFromRoot !== 0) {
      const bName = noteNameFr(bass.info, bass.accidental)
      const idx = match.i.indexOf(intervalFromRoot)
      inversionLabel = idx === 0 ? `1er renversement — ${bName} à la basse`
        : idx === 1 ? `2e renversement — ${bName} à la basse`
        : idx === 2 ? `3e renversement — ${bName} à la basse`
        : `${bName} à la basse`
    }

    return {
      rootFr: noteNameFr(rootInfo.info, rootInfo.accidental),
      rootEn: noteNameEn(rootInfo.info, rootInfo.accidental),
      chordFr: match.fr, chordEn: match.en,
      noteNames, inversionLabel,
    }
  }

  return { rootFr: '', rootEn: '?', chordFr: 'Accord non identifié', chordEn: '?', noteNames, unknown: true }
}

/* ─── SVG constants ───────────────────────────────────────────────────────────── */
const VBW = 640, VBH = 290, ST = 88, LS = 24, SH = 12
const NX = 370, SL = 84, SR = 610
const LINES_Y = [0,1,2,3,4].map(i => ST + i * LS)
const sy = (s: number) => ST + s * SH

function ledgers(s: number): number[] {
  const r: number[] = []
  if (s < 0) { for (let l = -2; l >= s; l -= 2) r.push(l) }
  if (s > 8) { for (let l = 10; l <= s; l += 2) r.push(l) }
  return r
}

/* ─── Page ────────────────────────────────────────────────────────────────────── */
export default function PorteePage() {
  const [mode,       setMode]       = useState<Mode>('single')
  const [clef,       setClef]       = useState<Clef>('treble')
  const [accidental, setAccidental] = useState<Accidental>(null)
  const [noteSlot,   setNoteSlot]   = useState<number | null>(null)
  const [chordNotes, setChordNotes] = useState<ChordNote[]>([])
  const [hoverSlot,  setHoverSlot]  = useState<number | null>(null)

  const noteMap = clef === 'treble' ? TREBLE : BASS

  // ─ Derived values ──────────────────────────────────────────────────────────
  const displaySlot  = noteSlot ?? hoverSlot
  const displayNote  = displaySlot !== null ? (noteMap[displaySlot.toString()] ?? null) : null
  const isPlaced     = noteSlot !== null
  const isMiddleC    = (noteSlot === 10 && clef === 'treble') || (noteSlot === -2 && clef === 'bass')
  const chord        = mode === 'chord' && chordNotes.length >= 2
    ? recognizeChord(chordNotes, noteMap) : null
  const hoverOccupied = mode === 'chord' && hoverSlot !== null
    && chordNotes.some(n => n.slot === hoverSlot)

  // ─ Event helpers ───────────────────────────────────────────────────────────
  const toSvg = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX-r.left)/r.width)*VBW, y: ((e.clientY-r.top)/r.height)*VBH }
  }
  const evSlot = (e: React.MouseEvent<SVGSVGElement>): number | null => {
    const { x, y } = toSvg(e)
    if (x < SL - 8) return null
    const s = Math.round((y - ST) / SH)
    return s >= -5 && s <= 13 ? s : null
  }
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const s = evSlot(e)
    if (s === null) return
    if (mode === 'single') {
      setNoteSlot(prev => prev === s ? null : s)
    } else {
      setChordNotes(prev => {
        if (prev.some(n => n.slot === s)) return prev.filter(n => n.slot !== s)
        return [...prev, { slot: s, accidental }]
      })
    }
  }
  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => setHoverSlot(evSlot(e))

  const switchMode = (m: Mode) => { setMode(m); setNoteSlot(null); setChordNotes([]); setHoverSlot(null) }
  const switchClef = (c: Clef) => { setClef(c); setNoteSlot(null); setChordNotes([]); setHoverSlot(null) }
  const toggleAcc  = (a: NonNullable<Accidental>) => setAccidental(p => p === a ? null : a)

  // ─ SVG rendering ───────────────────────────────────────────────────────────

  // Single note element
  const renderNote = (s: number, ghost = false, remove = false) => {
    const y = sy(s)
    const col = remove ? '#ef4444' : ghost ? '#6366f1' : '#1e1b4b'
    const op  = ghost || remove ? 0.3 : 1
    const up  = s >= 4
    const sx_ = up ? NX + 8 : NX - 8
    return (
      <g key={`sn${s}${ghost}${remove}`} opacity={op} style={{ pointerEvents:'none' }}>
        {ledgers(s).map(ls => (
          <line key={ls} x1={NX-20} x2={NX+20} y1={sy(ls)} y2={sy(ls)} stroke={col} strokeWidth="1.5"/>
        ))}
        <line x1={sx_} x2={sx_} y1={up ? y-6 : y+6} y2={up ? y-56 : y+56} stroke={col} strokeWidth="1.5"/>
        <ellipse cx={NX} cy={y} rx={10} ry={7.5} fill={col} transform={`rotate(-12 ${NX} ${y})`}/>
        {!ghost && !remove && accidental && (
          <text x={NX-27} y={y+6} fontSize={ACC_FS[accidental]} fill={col} fontFamily="serif" textAnchor="middle">
            {ACC_SYMBOL[accidental]}
          </text>
        )}
      </g>
    )
  }

  // Chord notes group
  const renderChord = () => {
    if (!chordNotes.length) return null
    const slots = chordNotes.map(n => n.slot)
    const minS = Math.min(...slots), maxS = Math.max(...slots)
    const stemUp = (minS + maxS) / 2 >= 4
    const stemX = stemUp ? NX + 8 : NX - 8
    const stemY1 = stemUp ? sy(maxS) : sy(minS)
    const stemY2 = stemUp ? sy(minS) - 52 : sy(maxS) + 52

    // Deduplicated ledger lines
    const allLedgers = new Set<number>()
    chordNotes.forEach(cn => ledgers(cn.slot).forEach(l => allLedgers.add(l)))

    return (
      <g style={{ pointerEvents:'none' }}>
        {[...allLedgers].map(ls => (
          <line key={`cl${ls}`} x1={NX-22} x2={NX+28} y1={sy(ls)} y2={sy(ls)} stroke="#1e1b4b" strokeWidth="1.5"/>
        ))}
        <line x1={stemX} x2={stemX} y1={stemY1} y2={stemY2} stroke="#1e1b4b" strokeWidth="1.5"/>
        {chordNotes.map(cn => {
          const y = sy(cn.slot)
          // Adjacent stagger: if note one step above exists, offset this note right
          const xOff = slots.includes(cn.slot - 1) ? 19 : 0
          const nx = NX + xOff
          return (
            <g key={`cn${cn.slot}`}>
              <ellipse cx={nx} cy={y} rx={10} ry={7.5} fill="#1e1b4b" transform={`rotate(-12 ${nx} ${y})`}/>
              {cn.accidental && cn.accidental !== 'natural' && (
                <text x={nx-27} y={y+6} fontSize={ACC_FS[cn.accidental]} fill="#1e1b4b" fontFamily="serif" textAnchor="middle">
                  {ACC_SYMBOL[cn.accidental]}
                </text>
              )}
            </g>
          )
        })}
      </g>
    )
  }

  // ─ Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Saisie sur portée</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Placez des notes sur la portée pour identifier leur nom ou reconnaître un accord.
        </p>
      </div>

      <div className="space-y-4">

        {/* ── Mode + clef selectors ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode tabs */}
          <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-0.5 gap-0.5">
            {([['single','🎵 Note seule'],['chord','🎸 Accord']] as const).map(([m, label]) => (
              <button key={m} onClick={() => switchMode(m)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  mode === m ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Clef */}
          <div className="flex gap-2 items-center">
            <span className="text-xs font-medium text-gray-400">Clé :</span>
            {(['treble','bass'] as const).map(c => (
              <button key={c} onClick={() => switchClef(c)}
                className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
                  clef === c
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}>
                {c === 'treble' ? '𝄞 Sol' : '𝄢 Fa'}
              </button>
            ))}
          </div>

          {/* Clear all (chord mode) */}
          {mode === 'chord' && chordNotes.length > 0 && (
            <button onClick={() => setChordNotes([])}
              className="ml-auto px-3 py-1.5 rounded-xl text-xs text-gray-400 border border-gray-200 hover:text-red-500 hover:border-red-200 transition-colors">
              Effacer tout
            </button>
          )}
        </div>

        {/* ── Staff SVG ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden select-none">
          <svg viewBox={`0 0 ${VBW} ${VBH}`} className="w-full block cursor-crosshair" style={{ maxHeight: 265 }}
            onClick={handleClick} onMouseMove={handleMove} onMouseLeave={() => setHoverSlot(null)}>
            <rect width={VBW} height={VBH} fill="white"/>

            {/* Clef */}
            {clef === 'treble'
              ? <text x="4"  y="200" fontSize="118" fontFamily="serif" fill="#1e1b4b">𝄞</text>
              : <text x="14" y="148" fontSize="54"  fontFamily="serif" fill="#1e1b4b">𝄢</text>
            }

            {/* Staff lines */}
            {LINES_Y.map(y => (
              <line key={y} x1={SL} x2={SR} y1={y} y2={y} stroke="#1e1b4b" strokeWidth="1.5"/>
            ))}

            {/* Single mode */}
            {mode === 'single' && (
              <>
                {hoverSlot !== null && hoverSlot !== noteSlot && renderNote(hoverSlot, true)}
                {noteSlot !== null && renderNote(noteSlot)}
              </>
            )}

            {/* Chord mode */}
            {mode === 'chord' && (
              <>
                {renderChord()}
                {hoverSlot !== null && !chordNotes.some(n => n.slot === hoverSlot) && renderNote(hoverSlot, true)}
                {/* Remove hint: red overlay on hover over existing note */}
                {hoverOccupied && hoverSlot !== null && (() => {
                  const y = sy(hoverSlot)
                  return (
                    <ellipse cx={NX} cy={y} rx={12} ry={9} fill="#ef4444" opacity={0.25}
                      style={{ pointerEvents:'none' }} transform={`rotate(-12 ${NX} ${y})`}/>
                  )
                })()}
              </>
            )}

            {/* Placeholder */}
            {((mode === 'single' && noteSlot === null && hoverSlot === null) ||
              (mode === 'chord' && chordNotes.length === 0 && hoverSlot === null)) && (
              <text x={(SL+SR)/2+20} y={ST+4*SH} fontSize="13" fill="#d1d5db"
                textAnchor="middle" dominantBaseline="middle">
                {mode === 'single' ? 'Cliquez pour placer une note' : 'Cliquez pour ajouter des notes à l\'accord'}
              </text>
            )}
          </svg>
        </div>

        {/* ── Accidental selector + quick reference ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Altérations</p>
            <div className="flex items-center gap-2 flex-wrap">
              {(['double-flat','flat','natural','sharp','double-sharp'] as NonNullable<Accidental>[]).map(a => (
                <button key={a} onClick={() => toggleAcc(a)} title={ACC_NAME[a]}
                  className={`h-11 min-w-[44px] px-3 rounded-xl text-xl border transition-all ${
                    accidental === a
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                  style={{ fontFamily: 'Georgia, serif' }}>
                  {ACC_SYMBOL[a]}
                </button>
              ))}
              {accidental && (
                <button onClick={() => setAccidental(null)}
                  className="h-11 px-3 rounded-xl text-xs text-gray-400 border border-gray-100 hover:text-red-500 hover:border-red-200 transition-colors ml-1">
                  Effacer
                </button>
              )}
            </div>
            {accidental && <p className="text-xs text-indigo-500 mt-2 font-medium">{ACC_NAME[accidental]}</p>}
            {mode === 'chord' && (
              <p className="text-xs text-gray-400 mt-2">
                L'altération sélectionnée sera appliquée à la prochaine note ajoutée.
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Solfège → notation</p>
            <div className="grid grid-cols-7 gap-1 text-center">
              {[['Do','C'],['Ré','D'],['Mi','E'],['Fa','F'],['Sol','G'],['La','A'],['Si','B']].map(([fr,en]) => (
                <div key={fr} className="rounded-lg bg-gray-50 py-2 px-0.5">
                  <div className="text-xs font-bold text-gray-800">{fr}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{en}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Result card ── */}

        {/* SINGLE MODE */}
        {mode === 'single' && (
          <div className={`rounded-2xl border p-6 text-center transition-all duration-150 ${
            isPlaced ? 'bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200'
            : displayNote ? 'bg-gray-50 border-gray-200'
            : 'bg-gray-50 border-gray-100'
          }`}>
            {displayNote ? (
              <div className="space-y-2">
                <div className={`text-5xl font-bold tracking-tight ${isPlaced ? 'text-indigo-900' : 'text-gray-400'}`}>
                  {noteNameFr(displayNote, accidental)}
                </div>
                <div className={`flex items-center justify-center gap-2 text-sm font-medium ${isPlaced ? 'text-indigo-500' : 'text-gray-400'}`}>
                  <span className="font-mono text-base">{noteNameEn(displayNote, accidental)}{displayNote.octave}</span>
                  {accidental && <><span className="opacity-30">·</span><span className="text-xs opacity-80">{ACC_NAME[accidental]}</span></>}
                </div>
                {isPlaced && (() => { const enh = getEnharmonic(displayNote.letter, accidental); return enh ? (
                  <div className="text-sm text-indigo-400">Enharmonique : <span className="font-semibold text-indigo-600">{enh}</span></div>
                ) : null })()}
                {isMiddleC && !accidental && isPlaced && (
                  <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                    ⭐ Do central — C4
                  </div>
                )}
                {!isPlaced && <p className="text-xs text-gray-300 mt-1">Cliquez pour ancrer cette note</p>}
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3">🎼</div>
                <p className="text-sm text-gray-400">Survolez ou cliquez la portée pour voir le nom d'une note</p>
                <p className="text-xs text-gray-300 mt-1.5">Lignes : Mi · Sol · Si · Ré · Fa  ·  Interlignes : Fa · La · Do · Mi</p>
              </div>
            )}
          </div>
        )}

        {/* CHORD MODE */}
        {mode === 'chord' && (
          <div className={`rounded-2xl border p-5 transition-all duration-150 ${
            chord && !chord.unknown ? 'bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200'
            : chord?.unknown ? 'bg-amber-50 border-amber-200'
            : 'bg-gray-50 border-gray-100'
          }`}>
            {chordNotes.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">🎸</div>
                <p className="text-sm text-gray-400">Ajoutez au moins 2 notes pour identifier un accord</p>
                <p className="text-xs text-gray-300 mt-1">Cliquez à nouveau sur une note pour la supprimer</p>
              </div>
            ) : chordNotes.length === 1 ? (
              <div className="text-center py-2">
                <p className="text-sm text-gray-400">Ajoutez au moins une note de plus…</p>
                {(() => {
                  const info = noteMap[chordNotes[0].slot.toString()]
                  return info ? (
                    <p className="text-base font-semibold text-gray-500 mt-1">
                      {noteNameFr(info, chordNotes[0].accidental)}
                    </p>
                  ) : null
                })()}
              </div>
            ) : chord ? (
              <div>
                {/* Notes used */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {chord.noteNames.map((n, i) => (
                      <span key={i} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        chord.unknown ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>{n}</span>
                    ))}
                  </div>
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">basse → soprano</span>
                </div>

                {chord.unknown ? (
                  <div className="text-center py-2">
                    <p className="text-lg font-semibold text-amber-700">Accord non identifié</p>
                    <p className="text-xs text-amber-500 mt-1">Essayez une autre combinaison ou vérifiez les altérations.</p>
                  </div>
                ) : (
                  <>
                    {/* Main chord name */}
                    <div className="text-center mb-3">
                      <div className="text-4xl font-bold text-indigo-900 tracking-tight">
                        {chord.rootFr}{' '}
                        <span className="text-2xl font-semibold text-indigo-600">{chord.chordFr}</span>
                      </div>
                      <div className="mt-1 text-base font-mono text-indigo-400">
                        {chord.rootEn}{chord.chordEn}
                      </div>
                    </div>

                    {/* Inversion */}
                    {chord.inversionLabel && (
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <span className="px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
                          ↕ {chord.inversionLabel}
                        </span>
                      </div>
                    )}
                    {!chord.inversionLabel && (
                      <p className="text-center text-xs text-indigo-300 mt-1">Position fondamentale</p>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* ── Chord mode hint ── */}
        {mode === 'chord' && (
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-xs text-indigo-500 leading-relaxed">
            <strong>Mode accord :</strong> Cliquez sur plusieurs positions pour construire un accord.
            Les <strong>renversements</strong> sont détectés automatiquement selon la note la plus grave.
            Accords reconnus : triades, 7èmes, 6èmes, 9èmes, sus2/sus4.
          </div>
        )}

        {mode === 'single' && (
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-xs text-indigo-500 leading-relaxed">
            <strong>Astuce :</strong> Les lignes supplémentaires (ledger lines) au-dessus/dessous de la portée permettent d'écrire des notes hors de la portée.
            La note sous la portée (clé de sol) est le <strong>Do central (C4)</strong>.
          </div>
        )}

      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { TutorialButton } from '@/components/ui/TutorialButton'

// ─── Music theory data ────────────────────────────────────────────────────────

const NOTES_SHARP   = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
const NOTES_FLAT    = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']
const SOLFEGE_SHARP = ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si']
const SOLFEGE_FLAT  = ['Do', 'Ré♭', 'Ré', 'Mi♭', 'Mi', 'Fa', 'Sol♭', 'Sol', 'La♭', 'La', 'Si♭', 'Si']

// Black key semitone positions (within an octave)
const BLACK_SEMITONES = new Set([1, 3, 6, 8, 10])

const ROOTS = [
  { label: 'C',  semitone: 0,  flat: false },
  { label: 'C♯', semitone: 1,  flat: false },
  { label: 'D',  semitone: 2,  flat: false },
  { label: 'E♭', semitone: 3,  flat: true  },
  { label: 'E',  semitone: 4,  flat: false },
  { label: 'F',  semitone: 5,  flat: true  },
  { label: 'F♯', semitone: 6,  flat: false },
  { label: 'G',  semitone: 7,  flat: false },
  { label: 'A♭', semitone: 8,  flat: true  },
  { label: 'A',  semitone: 9,  flat: false },
  { label: 'B♭', semitone: 10, flat: true  },
  { label: 'B',  semitone: 11, flat: false },
]

interface ChordType {
  id: string
  label: string
  symbol: string
  intervals: number[]
  formula: string
}

const CHORD_GROUPS: { name: string; types: ChordType[] }[] = [
  {
    name: 'Triades',
    types: [
      { id: 'maj',  label: 'Majeur',   symbol: '',    intervals: [0, 4, 7],  formula: '1 – 3 – 5' },
      { id: 'min',  label: 'Mineur',   symbol: 'm',   intervals: [0, 3, 7],  formula: '1 – ♭3 – 5' },
      { id: 'dim',  label: 'Diminué',  symbol: 'dim', intervals: [0, 3, 6],  formula: '1 – ♭3 – ♭5' },
      { id: 'aug',  label: 'Augmenté', symbol: 'aug', intervals: [0, 4, 8],  formula: '1 – 3 – ♯5' },
    ],
  },
  {
    name: 'Suspendus & Power',
    types: [
      { id: 'sus2', label: 'Sus2',      symbol: 'sus2', intervals: [0, 2, 7],  formula: '1 – 2 – 5' },
      { id: 'sus4', label: 'Sus4',      symbol: 'sus4', intervals: [0, 5, 7],  formula: '1 – 4 – 5' },
      { id: 'pow',  label: 'Power (5)', symbol: '5',    intervals: [0, 7],     formula: '1 – 5' },
    ],
  },
  {
    name: 'Septièmes',
    types: [
      { id: 'dom7',    label: 'Dominante 7',  symbol: '7',     intervals: [0, 4, 7, 10], formula: '1 – 3 – 5 – ♭7' },
      { id: 'maj7',    label: 'Majeur 7',     symbol: 'maj7',  intervals: [0, 4, 7, 11], formula: '1 – 3 – 5 – 7' },
      { id: 'min7',    label: 'Mineur 7',     symbol: 'm7',    intervals: [0, 3, 7, 10], formula: '1 – ♭3 – 5 – ♭7' },
      { id: 'minmaj7', label: 'Mineur/Maj 7', symbol: 'mM7',   intervals: [0, 3, 7, 11], formula: '1 – ♭3 – 5 – 7' },
      { id: 'dim7',    label: 'Diminué 7',    symbol: 'dim7',  intervals: [0, 3, 6, 9],  formula: '1 – ♭3 – ♭5 – ♭♭7' },
      { id: 'hdim7',   label: 'Semi-diminué', symbol: 'm7♭5',  intervals: [0, 3, 6, 10], formula: '1 – ♭3 – ♭5 – ♭7' },
      { id: 'aug7',    label: 'Augmenté 7',   symbol: '7♯5',   intervals: [0, 4, 8, 10], formula: '1 – 3 – ♯5 – ♭7' },
    ],
  },
  {
    name: 'Sixtes & Add',
    types: [
      { id: 'maj6', label: 'Majeur 6', symbol: '6',    intervals: [0, 4, 7, 9],  formula: '1 – 3 – 5 – 6' },
      { id: 'min6', label: 'Mineur 6', symbol: 'm6',   intervals: [0, 3, 7, 9],  formula: '1 – ♭3 – 5 – 6' },
      { id: 'add9', label: 'Add9',     symbol: 'add9', intervals: [0, 4, 7, 14], formula: '1 – 3 – 5 – 9' },
    ],
  },
  {
    name: 'Extensions',
    types: [
      { id: 'dom9',  label: '9',     symbol: '9',    intervals: [0, 4, 7, 10, 14],     formula: '1 – 3 – 5 – ♭7 – 9' },
      { id: 'maj9',  label: 'Maj9',  symbol: 'maj9', intervals: [0, 4, 7, 11, 14],     formula: '1 – 3 – 5 – 7 – 9' },
      { id: 'min9',  label: 'Min9',  symbol: 'm9',   intervals: [0, 3, 7, 10, 14],     formula: '1 – ♭3 – 5 – ♭7 – 9' },
      { id: 'dom11', label: '11',    symbol: '11',   intervals: [0, 4, 7, 10, 14, 17], formula: '1 – 3 – 5 – ♭7 – 9 – 11' },
      { id: 'dom13', label: '13',    symbol: '13',   intervals: [0, 4, 7, 10, 14, 17, 21], formula: '1 – 3 – 5 – ♭7 – 9 – 11 – 13' },
    ],
  },
]

// ─── Piano keyboard ────────────────────────────────────────────────────────────
const W = 28  // white key width
const H = 76  // white key height
const BW = 17 // black key width
const BH = 48 // black key height

// White key order within an octave: semitone index
const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11] // C D E F G A B

// Black key positions per octave: semitone → x offset within octave
const BLACK_KEY_OFFSETS: Record<number, number> = {
  1:  Math.round(W * 0.63 - BW / 2),   // C#
  3:  Math.round(W * 1.63 - BW / 2),   // D#
  6:  Math.round(W * 3.63 - BW / 2),   // F#
  8:  Math.round(W * 4.57 - BW / 2),   // G#
  10: Math.round(W * 5.57 - BW / 2),   // A#
}

const OCTAVE_W = WHITE_KEYS.length * W // 196px per octave
const NUM_OCTAVES = 2
const TOTAL_W = NUM_OCTAVES * OCTAVE_W + 1

interface PianoProps {
  highlightedSemitones: Set<number>
}

function PianoKeyboard({ highlightedSemitones }: PianoProps) {
  // Build white and black key data for 2 octaves (C3, C4)
  const whiteKeys: { x: number; semitone: number; label: string; useFlat: boolean }[] = []
  const blackKeys: { x: number; semitone: number }[] = []

  for (let oct = 0; oct < NUM_OCTAVES; oct++) {
    const octX = oct * OCTAVE_W
    WHITE_KEYS.forEach((semitone, wIdx) => {
      whiteKeys.push({ x: octX + wIdx * W, semitone, label: '', useFlat: false })
    })
    Object.entries(BLACK_KEY_OFFSETS).forEach(([st, offset]) => {
      blackKeys.push({ x: octX + offset, semitone: Number(st) })
    })
  }

  return (
    <svg
      width={TOTAL_W}
      height={H + 2}
      viewBox={`0 0 ${TOTAL_W} ${H + 2}`}
      className="overflow-visible"
    >
      {/* White keys */}
      {whiteKeys.map((k, i) => {
        const highlighted = highlightedSemitones.has(k.semitone)
        return (
          <rect
            key={`w-${i}`}
            x={k.x + 0.5}
            y={0.5}
            width={W - 1}
            height={H}
            rx={3}
            fill={highlighted ? '#6366f1' : '#fff'}
            stroke={highlighted ? '#4338ca' : '#d1d5db'}
            strokeWidth={1}
          />
        )
      })}

      {/* Black keys */}
      {blackKeys.map((k, i) => {
        const highlighted = highlightedSemitones.has(k.semitone)
        return (
          <rect
            key={`b-${i}`}
            x={k.x}
            y={0}
            width={BW}
            height={BH}
            rx={2}
            fill={highlighted ? '#818cf8' : '#1f2937'}
            stroke={highlighted ? '#4338ca' : '#111827'}
            strokeWidth={1}
          />
        )
      })}

      {/* Note labels on highlighted white keys */}
      {whiteKeys.map((k, i) => {
        if (!highlightedSemitones.has(k.semitone)) return null
        return (
          <text
            key={`lw-${i}`}
            x={k.x + W / 2}
            y={H - 10}
            textAnchor="middle"
            fontSize={9}
            fontWeight="bold"
            fill="white"
          >
            ♪
          </text>
        )
      })}

      {/* Octave separator line */}
      <line x1={OCTAVE_W} y1={0} x2={OCTAVE_W} y2={H} stroke="#e5e7eb" strokeWidth={1} strokeDasharray="2,2" />
    </svg>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AccordsPage() {
  const [rootIdx, setRootIdx] = useState(0)    // index in ROOTS
  const [chordId, setChordId] = useState('maj') // chord type id

  const root = ROOTS[rootIdx]
  const useFlats = root.flat

  const notes      = useFlats ? NOTES_FLAT    : NOTES_SHARP
  const solfegeArr = useFlats ? SOLFEGE_FLAT  : SOLFEGE_SHARP

  const allChordTypes = CHORD_GROUPS.flatMap((g) => g.types)
  const chordType = allChordTypes.find((c) => c.id === chordId) ?? allChordTypes[0]

  // Compute chord notes
  const chordNotes = chordType.intervals.map((interval) => {
    const semitone = (root.semitone + interval) % 12
    return {
      semitone,
      letter:  notes[semitone],
      solfege: solfegeArr[semitone],
      isBlack: BLACK_SEMITONES.has(semitone),
    }
  })

  const highlightedSemitones = new Set(chordNotes.map((n) => n.semitone))

  const chordName = `${root.label}${chordType.symbol}`

  // Note bubble colors by position in chord
  const NOTE_COLORS = [
    'bg-indigo-500 text-white',
    'bg-blue-500 text-white',
    'bg-violet-500 text-white',
    'bg-sky-500 text-white',
    'bg-teal-500 text-white',
    'bg-purple-500 text-white',
    'bg-cyan-500 text-white',
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🎹 Dictionnaire d&apos;accords
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sélectionne une fondamentale et une qualité d&apos;accord pour voir les notes qui le composent.
          </p>
        </div>
        <TutorialButton moduleKey="tool_accords" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── LEFT PANEL : selectors ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Root note selector */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Fondamentale</p>
            <div className="grid grid-cols-4 gap-1.5">
              {ROOTS.map((r, i) => (
                <button
                  key={r.label}
                  onClick={() => setRootIdx(i)}
                  className={`rounded-lg py-2 text-sm font-bold transition-all ${
                    rootIdx === i
                      ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                      : r.flat
                      ? 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                      : 'bg-white border border-gray-200 text-gray-800 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chord type selector */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Qualité de l&apos;accord</p>
            <div className="space-y-3">
              {CHORD_GROUPS.map((group) => (
                <div key={group.name}>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{group.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {group.types.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setChordId(type.id)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                          chordId === type.id
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                        }`}
                      >
                        {type.label}
                        {type.symbol && (
                          <span className={`ml-1 font-mono text-[10px] ${chordId === type.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                            ({type.symbol})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL : result ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Chord name */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-5xl font-black text-indigo-700 tracking-tight font-mono">
                {chordName}
              </span>
              <div className="text-sm text-indigo-500">
                <span className="font-medium">{chordType.label}</span>
                <span className="mx-2 text-indigo-300">·</span>
                <span className="font-mono text-xs bg-indigo-100 px-2 py-0.5 rounded-md">{chordType.formula}</span>
              </div>
            </div>
            <p className="text-xs text-indigo-400 mt-2">{chordNotes.length} note{chordNotes.length > 1 ? 's' : ''}</p>
          </div>

          {/* Notes breakdown */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Composition</p>
            <div className="flex flex-wrap gap-3">
              {chordNotes.map((note, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shadow-sm ${NOTE_COLORS[i % NOTE_COLORS.length]}`}>
                    <span className="text-lg font-black leading-none">{note.letter}</span>
                    <span className="text-[10px] font-medium opacity-80 mt-0.5">{note.solfege}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {i === 0 ? 'Fond.' : i === 1 ? '2ᵉ' : i === 2 ? '3ᵉ' : i === 3 ? '4ᵉ' : `${i + 1}ᵉ`}
                  </span>
                </div>
              ))}
            </div>

            {/* Text summary */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-gray-900">{chordName}</span>{' '}
                <span className="text-gray-400">=</span>{' '}
                <span className="font-medium">{chordNotes.map((n) => n.letter).join(' – ')}</span>
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                <span className="text-gray-400">Solfège :</span>{' '}
                {chordNotes.map((n) => n.solfege).join(' – ')}
              </p>
            </div>
          </div>

          {/* Piano keyboard */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Clavier de piano</p>
            <div className="overflow-x-auto">
              <div className="min-w-max pb-1">
                <PianoKeyboard highlightedSemitones={highlightedSemitones} />
                <div className="flex mt-2 text-[10px] text-gray-400 font-mono" style={{ width: TOTAL_W }}>
                  <span style={{ width: OCTAVE_W }} className="text-center">Octave 1 (C – B)</span>
                  <span style={{ width: OCTAVE_W }} className="text-center">Octave 2 (C – B)</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-indigo-500" />
                <span className="text-xs text-gray-500">Note dans l&apos;accord</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-white border border-gray-300" />
                <span className="text-xs text-gray-500">Note non utilisée</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Quick reference table */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Référence rapide — tous les accords de <span className="text-indigo-700 font-black font-mono">{root.label}</span>
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 bg-gray-50/50">Accord</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 bg-gray-50/50">Qualité</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 bg-gray-50/50">Notes (lettres)</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 bg-gray-50/50 hidden sm:table-cell">Notes (solfège)</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 bg-gray-50/50 hidden md:table-cell">Formule</th>
              </tr>
            </thead>
            <tbody>
              {allChordTypes.map((type, i) => {
                const notesList = type.intervals.map((iv) => {
                  const st = (root.semitone + iv) % 12
                  return { letter: notes[st], solfege: solfegeArr[st] }
                })
                const isActive = chordId === type.id
                return (
                  <tr
                    key={type.id}
                    onClick={() => setChordId(type.id)}
                    className={`border-b border-gray-50 cursor-pointer transition-colors ${
                      isActive ? 'bg-indigo-50' : i % 2 === 0 ? 'hover:bg-gray-50' : 'bg-gray-50/30 hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <span className={`font-black font-mono ${isActive ? 'text-indigo-700' : 'text-gray-900'}`}>
                        {root.label}{type.symbol}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">{type.label}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-gray-800">{notesList.map((n) => n.letter).join(' – ')}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs hidden sm:table-cell">
                      {notesList.map((n) => n.solfege).join(' – ')}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400 hidden md:table-cell">
                      {type.formula}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'

/* ─── Types ──────────────────────────────────────────────────────────────── */
type Accidental = 'double-flat' | 'flat' | 'natural' | 'sharp' | 'double-sharp' | null
type Clef = 'treble' | 'bass'

interface NoteInfo { nameFr: string; letter: string; octave: number }

/* ─── Note maps ──────────────────────────────────────────────────────────────
 * slot 0 = top staff line, increases by 1 going DOWN (each diatonic step)
 * staff lines at even slots 0,2,4,6,8 — spaces at odd slots 1,3,5,7
 * ledger lines needed at even slots outside [0,8]
 * ─────────────────────────────────────────────────────────────────────────── */

// Clé de Sol — top line = F5
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
  '10': { nameFr: 'Do',  letter: 'C', octave: 4 }, // Do central
  '11': { nameFr: 'Si',  letter: 'B', octave: 3 },
  '12': { nameFr: 'La',  letter: 'A', octave: 3 },
  '13': { nameFr: 'Sol', letter: 'G', octave: 3 },
}

// Clé de Fa — top line = A3
const BASS: Record<string, NoteInfo> = {
  '-5': { nameFr: 'Fa',  letter: 'F', octave: 4 },
  '-4': { nameFr: 'Mi',  letter: 'E', octave: 4 },
  '-3': { nameFr: 'Ré',  letter: 'D', octave: 4 },
  '-2': { nameFr: 'Do',  letter: 'C', octave: 4 }, // Do central
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

/* ─── Altération symbols & labels ─────────────────────────────────────────── */
const ACC_SYMBOL: Record<NonNullable<Accidental>, string> = {
  'double-flat':  '𝄫',
  'flat':         '♭',
  'natural':      '♮',
  'sharp':        '♯',
  'double-sharp': '𝄪',
}
const ACC_NAME: Record<NonNullable<Accidental>, string> = {
  'double-flat':  'double bémol',
  'flat':         'bémol',
  'natural':      'bécarre',
  'sharp':        'dièse',
  'double-sharp': 'double dièse',
}

// SVG font-size for each accidental symbol
const ACC_FONTSIZE: Record<NonNullable<Accidental>, number> = {
  'double-flat':  17,
  'flat':         22,
  'natural':      20,
  'sharp':        20,
  'double-sharp': 17,
}

function getEnharmonic(letter: string, acc: Accidental): string | null {
  if (!acc || acc === 'natural' || acc === 'double-sharp' || acc === 'double-flat') return null
  const map: Record<string, string> = {
    'C#': 'Ré♭',  'Db': 'Do♯',
    'D#': 'Mi♭',  'Eb': 'Ré♯',
    'F#': 'Sol♭', 'Gb': 'Fa♯',
    'G#': 'La♭',  'Ab': 'Sol♯',
    'A#': 'Si♭',  'Bb': 'La♯',
    'E#': 'Fa',   'Fb': 'Mi',
    'B#': 'Do',   'Cb': 'Si',
  }
  return map[letter + (acc === 'sharp' ? '#' : 'b')] ?? null
}

/* ─── SVG layout ─────────────────────────────────────────────────────────── */
const VBW = 640          // viewBox width
const VBH = 290          // viewBox height
const STAFF_TOP = 88     // y of top staff line (slot 0)
const LS = 24            // line spacing in px
const SH = 12            // slot height = LS/2 (one diatonic step)
const NX = 370           // x of note center
const SL = 84            // x where staff starts (right of clef)
const SR = 610           // x where staff ends
const STAFF_LINE_Y = [0, 1, 2, 3, 4].map(i => STAFF_TOP + i * LS)

const slotToY = (s: number) => STAFF_TOP + s * SH

/** Returns the slot indices that need a ledger line for a note at slot `s` */
function ledgerSlots(s: number): number[] {
  const r: number[] = []
  if (s < 0)   { for (let l = -2; l >= s; l -= 2) r.push(l) }
  if (s > 8)   { for (let l = 10; l <= s; l += 2) r.push(l) }
  return r
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function PorteePage() {
  const [noteSlot,   setNoteSlot]   = useState<number | null>(null)
  const [accidental, setAccidental] = useState<Accidental>(null)
  const [clef,       setClef]       = useState<Clef>('treble')
  const [hoverSlot,  setHoverSlot]  = useState<number | null>(null)

  const noteMap = clef === 'treble' ? TREBLE : BASS

  // The slot to *display* in the info card (placed note > hover > none)
  const displaySlot = noteSlot ?? hoverSlot
  const displayNote = displaySlot !== null ? (noteMap[displaySlot.toString()] ?? null) : null
  const isPlaced    = noteSlot !== null
  const isMiddleC   = (noteSlot === 10 && clef === 'treble') || (noteSlot === -2 && clef === 'bass')

  // Convert mouse event to SVG coordinates
  const toSvgCoords = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width)  * VBW,
      y: ((e.clientY - r.top)  / r.height) * VBH,
    }
  }

  const eventSlot = (e: React.MouseEvent<SVGSVGElement>): number | null => {
    const { x, y } = toSvgCoords(e)
    if (x < SL - 8) return null
    const s = Math.round((y - STAFF_TOP) / SH)
    return s >= -5 && s <= 13 ? s : null
  }

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const s = eventSlot(e)
    if (s === null) return
    setNoteSlot(prev => prev === s ? null : s)
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    setHoverSlot(eventSlot(e))
  }

  const toggleAcc = (a: NonNullable<Accidental>) =>
    setAccidental(prev => prev === a ? null : a)

  /* ─ Render a note in the SVG ─────────────────────────────────────────────── */
  const renderNoteEl = (s: number, ghost = false) => {
    const y   = slotToY(s)
    const col = ghost ? '#6366f1' : '#1e1b4b'
    const op  = ghost ? 0.25 : 1
    // Stem UP when note is on or below the middle line (slot 4 = B4 treble / D3 bass)
    const stemUp = s >= 4
    const sx  = stemUp ? NX + 8 : NX - 8
    const sy1 = stemUp ? y - 6  : y + 6
    const sy2 = stemUp ? y - 56 : y + 56

    return (
      <g key={`n${s}${ghost}`} opacity={op} style={{ pointerEvents: 'none' }}>
        {/* Ledger lines */}
        {ledgerSlots(s).map(ls => (
          <line key={ls}
            x1={NX - 20} x2={NX + 20}
            y1={slotToY(ls)} y2={slotToY(ls)}
            stroke={col} strokeWidth="1.5"
          />
        ))}
        {/* Stem */}
        <line x1={sx} x2={sx} y1={sy1} y2={sy2} stroke={col} strokeWidth="1.5" />
        {/* Note head — slightly elliptical & rotated, classic engraving style */}
        <ellipse cx={NX} cy={y} rx={10} ry={7.5}
          fill={col} transform={`rotate(-12 ${NX} ${y})`}
        />
        {/* Accidental (real note only) */}
        {!ghost && accidental && (
          <text
            x={NX - 27} y={y + 6}
            fontSize={ACC_FONTSIZE[accidental]}
            fill={col}
            fontFamily="serif"
            textAnchor="middle"
          >
            {ACC_SYMBOL[accidental]}
          </text>
        )}
      </g>
    )
  }

  /* ─ Info card content ─────────────────────────────────────────────────────── */
  const accSym  = accidental ? ACC_SYMBOL[accidental] : ''
  const noteStr = displayNote ? `${displayNote.nameFr}${accSym ? ' ' + accSym : ''}` : ''

  const letterStr = displayNote
    ? displayNote.letter
      + (accidental === 'sharp'        ? '♯'
       : accidental === 'flat'         ? '♭'
       : accidental === 'double-sharp' ? '×'
       : accidental === 'double-flat'  ? '♭♭'
       : accidental === 'natural'      ? '♮'
       : '') + displayNote.octave
    : ''

  const enharmonic = displayNote ? getEnharmonic(displayNote.letter, accidental) : null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Saisie sur portée</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Cliquez sur la portée pour placer une note — son nom s'affiche instantanément, avec toutes les altérations.
        </p>
      </div>

      <div className="space-y-4">

        {/* ── Clef selector ── */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500">Clé :</span>
          <div className="flex gap-2">
            {(['treble', 'bass'] as const).map(c => (
              <button
                key={c}
                onClick={() => { setClef(c); setNoteSlot(null); setHoverSlot(null) }}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all border ${
                  clef === c
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-700'
                }`}
              >
                {c === 'treble' ? '𝄞 Clé de Sol' : '𝄢 Clé de Fa'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Staff SVG ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden select-none">
          <svg
            viewBox={`0 0 ${VBW} ${VBH}`}
            className="w-full block cursor-crosshair"
            style={{ maxHeight: 265 }}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverSlot(null)}
          >
            <rect width={VBW} height={VBH} fill="white" />

            {/* Clef symbol — positioning calibrated for the staff */}
            {clef === 'treble'
              ? <text x="4" y="200" fontSize="118" fontFamily="serif" fill="#1e1b4b">𝄞</text>
              : <text x="14" y="148" fontSize="54" fontFamily="serif" fill="#1e1b4b">𝄢</text>
            }

            {/* Staff lines */}
            {STAFF_LINE_Y.map(y => (
              <line key={y} x1={SL} x2={SR} y1={y} y2={y}
                stroke="#1e1b4b" strokeWidth="1.5" />
            ))}

            {/* Ghost note (hover) */}
            {hoverSlot !== null && hoverSlot !== noteSlot && renderNoteEl(hoverSlot, true)}

            {/* Placed note */}
            {noteSlot !== null && renderNoteEl(noteSlot, false)}

            {/* Placeholder text when empty */}
            {noteSlot === null && hoverSlot === null && (
              <text
                x={(SL + SR) / 2 + 20}
                y={STAFF_TOP + 4 * SH}
                fontSize="13" fill="#d1d5db"
                textAnchor="middle" dominantBaseline="middle"
              >
                Cliquez pour placer une note
              </text>
            )}
          </svg>
        </div>

        {/* ── Accidentals + Reference ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Accidental buttons */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Altérations</p>
            <div className="flex items-center gap-2 flex-wrap">
              {([
                ['double-flat',  '𝄫'],
                ['flat',         '♭'],
                ['natural',      '♮'],
                ['sharp',        '♯'],
                ['double-sharp', '𝄪'],
              ] as [NonNullable<Accidental>, string][]).map(([key, sym]) => (
                <button
                  key={key}
                  onClick={() => toggleAcc(key)}
                  title={ACC_NAME[key]}
                  className={`h-11 min-w-[44px] px-3 rounded-xl text-xl border transition-all ${
                    accidental === key
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {sym}
                </button>
              ))}
              {accidental && (
                <button
                  onClick={() => setAccidental(null)}
                  className="h-11 px-3 rounded-xl text-xs text-gray-400 border border-gray-100 hover:text-red-500 hover:border-red-200 transition-colors ml-1"
                >
                  Effacer
                </button>
              )}
            </div>
            {accidental && (
              <p className="text-xs text-indigo-500 mt-2 font-medium capitalize">
                {ACC_NAME[accidental]} sélectionné
              </p>
            )}
          </div>

          {/* Quick reference */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Solfège → notation</p>
            <div className="grid grid-cols-7 gap-1 text-center">
              {(['Do','C'],['Ré','D'],['Mi','E'],['Fa','F'],['Sol','G'],['La','A'],['Si','B']).map(([fr, en]) => (
                <div key={fr} className="rounded-lg bg-gray-50 py-2 px-0.5">
                  <div className="text-xs font-bold text-gray-800">{fr}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{en}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Note name result card ── */}
        <div className={`rounded-2xl border p-6 text-center transition-all duration-150 ${
          isPlaced
            ? 'bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200'
            : displayNote
            ? 'bg-gray-50 border-gray-200'   // hover preview
            : 'bg-gray-50 border-gray-100'
        }`}>
          {displayNote ? (
            <div className="space-y-2">
              {/* Main note name */}
              <div className={`text-5xl font-bold tracking-tight transition-colors ${
                isPlaced ? 'text-indigo-900' : 'text-gray-400'
              }`}>
                {noteStr}
              </div>

              {/* English notation + octave */}
              <div className={`flex items-center justify-center gap-2 text-sm font-medium ${
                isPlaced ? 'text-indigo-500' : 'text-gray-400'
              }`}>
                <span className="font-mono text-base">{letterStr}</span>
                {accidental && (
                  <>
                    <span className="opacity-30">·</span>
                    <span className="text-xs opacity-80">{ACC_NAME[accidental]}</span>
                  </>
                )}
              </div>

              {/* Enharmonic */}
              {enharmonic && isPlaced && (
                <div className="text-sm text-indigo-400 pt-1">
                  Enharmonique :{' '}
                  <span className="font-semibold text-indigo-600">{enharmonic}</span>
                </div>
              )}

              {/* Middle C badge */}
              {isMiddleC && !accidental && isPlaced && (
                <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                  ⭐ Do central — C4, milieu du clavier
                </div>
              )}

              {/* Hover hint */}
              {!isPlaced && (
                <p className="text-xs text-gray-300 mt-1">Cliquez pour ancrer cette note</p>
              )}
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-3">🎼</div>
              <p className="text-sm text-gray-400">Survolez ou cliquez la portée pour voir le nom d'une note</p>
              <p className="text-xs text-gray-300 mt-1.5">
                Lignes : Mi · Sol · Si · Ré · Fa &nbsp;·&nbsp; Interlignes : Fa · La · Do · Mi
              </p>
            </div>
          )}
        </div>

        {/* ── Reminder about ledger lines ── */}
        <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-xs text-indigo-500 leading-relaxed">
          <strong>Astuce :</strong> Les petites lignes supplémentaires qui apparaissent au-dessus ou en dessous de la portée s'appellent des <em>lignes de rappel</em> (ou lignes supplémentaires).
          La note en dessous de la portée (clé de sol) est le <strong>Do central (C4)</strong>.
        </div>

      </div>
    </div>
  )
}

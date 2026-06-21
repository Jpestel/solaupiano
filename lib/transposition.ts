export const CHROMATIC_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
export const CHROMATIC_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

const NOTE_TO_INDEX: Record<string, number> = {
  C: 0, 'B#': 0,
  'C#': 1, Db: 1,
  D: 2,
  'D#': 3, Eb: 3,
  E: 4, Fb: 4,
  F: 5, 'E#': 5,
  'F#': 6, Gb: 6,
  G: 7,
  'G#': 8, Ab: 8,
  A: 9,
  'A#': 10, Bb: 10,
  B: 11, Cb: 11,
}

const NOTE_PATTERN = '(?:[A-G](?:#|b)?|Do|Ré|Re|Mi|Fa|Sol|La|Si)'
const CHORD_QUALITY_PATTERN = '(?:m(?!aj)|maj|min|dim|aug|sus|add|M|Δ|ø|°|\\+|-|[0-9]|[#b()])*(?:\\/\\s*' + NOTE_PATTERN + ')?'
const CHORD_RE = new RegExp(`(^|[^A-Za-zÀ-ÿ0-9#b])(${NOTE_PATTERN})(${CHORD_QUALITY_PATTERN})(?=$|[^A-Za-zÀ-ÿ0-9#b])`, 'g')

const LATIN_TO_EN: Record<string, string> = {
  Do: 'C',
  Re: 'D',
  'Ré': 'D',
  Mi: 'E',
  Fa: 'F',
  Sol: 'G',
  La: 'A',
  Si: 'B',
}

export type AccidentalPreference = 'auto' | 'sharp' | 'flat'

export function normalizeNoteName(note: string): string {
  return LATIN_TO_EN[note] ?? note
}

export function transposeNote(note: string, semitones: number, preference: AccidentalPreference = 'auto'): string {
  const normalized = normalizeNoteName(note)
  const index = NOTE_TO_INDEX[normalized]
  if (index === undefined) return note

  const next = (index + semitones + 1200) % 12
  const useFlats = preference === 'flat' || (preference === 'auto' && normalized.includes('b') && !normalized.includes('#'))
  return useFlats ? CHROMATIC_FLAT[next] : CHROMATIC_SHARP[next]
}

export function semitonesBetween(from: string, to: string): number | null {
  const fromIndex = NOTE_TO_INDEX[normalizeNoteName(from)]
  const toIndex = NOTE_TO_INDEX[normalizeNoteName(to)]
  if (fromIndex === undefined || toIndex === undefined) return null
  let diff = toIndex - fromIndex
  if (diff > 6) diff -= 12
  if (diff < -6) diff += 12
  return diff
}

export function transposeChordToken(token: string, semitones: number, preference: AccidentalPreference = 'auto'): string {
  const match = token.match(new RegExp(`^(${NOTE_PATTERN})([\\s\\S]*)$`))
  if (!match) return token
  const [, root, rest] = match
  const transposedRoot = transposeNote(root, semitones, preference)
  const transposedRest = rest.replace(new RegExp(`\\/\\s*(${NOTE_PATTERN})`, 'g'), (_m, bass: string) => `/${transposeNote(bass, semitones, preference)}`)
  return `${transposedRoot}${transposedRest}`
}

export function transposeText(text: string, semitones: number, preference: AccidentalPreference = 'auto'): string {
  if (!text || semitones === 0) return text
  return text.replace(CHORD_RE, (full, prefix: string, root: string, quality: string) => {
    const token = `${root}${quality || ''}`.trimEnd()
    return `${prefix}${transposeChordToken(token, semitones, preference)}`
  })
}

export type ChartBarLike = { l?: unknown; b?: unknown; r?: unknown }

export function transposeChartCells(cells: unknown, semitones: number, preference: AccidentalPreference = 'auto'): unknown {
  if (!Array.isArray(cells)) return cells
  return cells.map((item) => {
    if (typeof item === 'string') return transposeText(item, semitones, preference)
    if (Array.isArray(item)) return item.map((beat) => typeof beat === 'string' ? transposeText(beat, semitones, preference) : beat)
    if (item && typeof item === 'object' && 'b' in item) {
      const bar = item as ChartBarLike
      const beats = Array.isArray(bar.b)
        ? bar.b.map((beat) => typeof beat === 'string' ? transposeText(beat, semitones, preference) : beat)
        : bar.b
      return { ...item, b: beats }
    }
    if (item && typeof item === 'object' && 'chord' in item) {
      const legacy = item as { chord?: unknown }
      return {
        ...item,
        chord: typeof legacy.chord === 'string' ? transposeText(legacy.chord, semitones, preference) : legacy.chord,
      }
    }
    return item
  })
}

// Logique partagée pour les paroles + accords (format type ChordPro).
//
// Format :
//  - Une ligne entièrement entre crochets = marqueur de structure, ex : [Refrain]
//  - Un crochet AU MILIEU d'une ligne = accord placé au-dessus de la syllabe
//    qui suit, ex : [C]Au [G]clair de la [Am]lune
//  - Un accord seul sur sa ligne (ex : [Am]) est reconnu comme accord, pas marqueur.

export type LyricToken = { type: 'marker' | 'text' | 'empty'; value: string }
export type ChordSeg = { chord: string | null; text: string }
export type DisplayMode = 'both' | 'lyrics' | 'chords'

// Reconnaît un libellé d'accord (C, Am, F#m7, Csus4, Cmaj7, C/G, Bb, C#m7b5…)
const CHORD_RE =
  /^[A-G][#b♯♭]?(?:maj|min|m|dim|aug|sus|add|M|°|\+)*\d{0,2}(?:[#b]\d{1,2})?(?:sus\d|add\d)?(?:\/[A-G][#b♯♭]?)?$/

export function isChord(token: string): boolean {
  return CHORD_RE.test(token.trim())
}

export function parseLyrics(content: string): LyricToken[] {
  return content.split('\n').map((line) => {
    const m = line.match(/^\[(.+?)\]$/)
    // Ligne entièrement entre crochets : marqueur, sauf si c'est un accord seul
    if (m && !isChord(m[1])) return { type: 'marker' as const, value: m[1] }
    if (line.trim() === '') return { type: 'empty' as const, value: '' }
    return { type: 'text' as const, value: line }
  })
}

// Découpe une ligne de texte en segments { accord, texte }.
export function segmentLine(line: string): ChordSeg[] {
  const re = /\[([^\]]+)\]/g
  const firstIdx = line.search(/\[[^\]]+\]/)
  if (firstIdx === -1) return [{ chord: null, text: line }]

  const segs: ChordSeg[] = []
  if (firstIdx > 0) segs.push({ chord: null, text: line.slice(0, firstIdx) })

  re.lastIndex = firstIdx
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) {
    const chord = m[1]
    const textStart = re.lastIndex
    const rest = line.slice(textStart)
    const nextRel = rest.search(/\[[^\]]+\]/)
    const textEnd = nextRel === -1 ? line.length : textStart + nextRel
    segs.push({ chord, text: line.slice(textStart, textEnd) })
    re.lastIndex = textEnd
  }
  return segs
}

// Texte sans les accords (mode « Paroles seules »).
export function stripChords(line: string): string {
  return line.replace(/\[[^\]]+\]/g, '')
}

// Liste des accords d'une ligne, dans l'ordre (mode « Accords seuls »).
export function lineChords(line: string): string[] {
  return Array.from(line.matchAll(/\[([^\]]+)\]/g)).map((m) => m[1])
}

// Le contenu contient-il au moins un accord ?
export function contentHasChords(content: string): boolean {
  return parseLyrics(content).some((t) => t.type === 'text' && /\[[^\]]+\]/.test(t.value))
}

// ── Modèle « par caractère » pour le placement visuel des accords ─────────────
// Chaque unité = un caractère affiché, avec l'accord éventuel qui le précède
// (et donc qui s'affiche au-dessus de lui). Un accord en fin de ligne donne une
// unité au caractère vide.
export type CharUnit = { chord: string | null; ch: string }

export function lineToUnits(line: string): CharUnit[] {
  const units: CharUnit[] = []
  let pending: string | null = null
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '[') {
      const close = line.indexOf(']', i)
      if (close !== -1) {
        pending = line.slice(i + 1, close)
        i = close
        continue
      }
    }
    units.push({ chord: pending, ch: line[i] })
    pending = null
  }
  if (pending !== null) units.push({ chord: pending, ch: '' })
  return units
}

export function unitsToLine(units: CharUnit[]): string {
  return units.map((u) => (u.chord !== null ? `[${u.chord}]` : '') + u.ch).join('')
}

// Accords usuels proposés dans la palette de l'éditeur.
export const COMMON_CHORDS: { group: string; chords: string[] }[] = [
  { group: 'Majeurs', chords: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
  { group: 'Mineurs', chords: ['Am', 'Bm', 'Cm', 'Dm', 'Em', 'Fm', 'Gm'] },
  { group: '7e', chords: ['C7', 'D7', 'E7', 'G7', 'A7', 'B7', 'Dm7', 'Em7', 'Am7'] },
  { group: 'Autres', chords: ['Cmaj7', 'Fmaj7', 'Csus4', 'Dsus4', 'F#m', 'Bb', 'Eb'] },
]

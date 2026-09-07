/**
 * Condensé d'une grille écrite « au kilomètre ».
 *
 * Principe : on ne touche JAMAIS aux mesures enregistrées. On calcule seulement
 * une lecture repliée de la grille, dans laquelle les sections déjà écrites plus
 * haut sont remplacées par un renvoi numéroté. L'affichage complet reste
 * disponible à tout moment (c'est un simple basculement).
 *
 * La numérotation d'origine des mesures est conservée partout : « mesure 57 »
 * désigne la même mesure sur la grille complète et sur la grille condensée.
 */
import type { BarData } from './grille'

export type CondensedSegment =
  /** Section réellement écrite, porteuse d'un repère (A, B, C…) */
  | { kind: 'written'; start: number; len: number; label: string }
  /** Reprise d'une section écrite plus haut (même harmonie) */
  | {
      kind: 'repeat'
      start: number
      len: number
      refStart: number
      labels: string[]
      color: string
      /** Annotations propres à cette reprise (« Couplet 2 », « Rif orgue »…) :
       *  replier la section ne doit jamais les faire disparaître de l'écran. */
      notes: { bar: number; text: string }[]
    }
  /** Suite de mesures vides (fin de grille, réserve…) */
  | { kind: 'empty'; start: number; len: number }

export type CondensedGrille = {
  segments: CondensedSegment[]
  /** Suite des repères, pour le bandeau « forme du morceau » */
  form: string[]
  /** Nombre de mesures qu'il reste à écrire une fois les reprises repliées */
  writtenBars: number
  totalBars: number
}

/**
 * Deux mesures sont « identiques » si elles ont la même harmonie.
 *
 * Les marqueurs de début et de fin ne comptent pas : dans les grilles réelles
 * ils servent surtout d'annotations de jeu (« Couplet 1 - Entrée CHANT »,
 * « Rif Orgue », « (X3) »), qui changent d'un passage à l'autre alors que les
 * accords sont les mêmes — les inclure empêcherait tout regroupement. Ces
 * annotations ne sont pas perdues : elles sont reportées sur le renvoi.
 */
function barSignature(bar: BarData): string {
  return bar.b.map((x) => x.trim()).join('')
}

/**
 * Annotations portées par une mesure : marqueurs de début et de fin, et texte
 * posé au-dessus de chaque temps. Toutes doivent ressortir sur un renvoi, sinon
 * replier une section les ferait disparaître de l'écran.
 */
function barNotes(bar: BarData): string[] {
  const perBeat = Array.isArray(bar.n) ? bar.n.map((v) => (typeof v === 'string' ? v.trim() : '')) : []
  return [bar.l.trim(), ...perBeat, bar.r.trim()].filter(Boolean)
}

function isBarEmpty(bar: BarData): boolean {
  return !bar.l.trim() && !bar.r.trim() && bar.b.every((x) => !x.trim())
}

/** A, B, … Z, puis A2, B2… (les grilles très longues restent lisibles) */
function labelAt(index: number): string {
  const letter = String.fromCharCode(65 + (index % 26))
  const cycle = Math.floor(index / 26)
  return cycle === 0 ? letter : `${letter}${cycle + 1}`
}

/** Longueur minimale d'une section : en dessous, on ne repère que du bruit. */
export const DEFAULT_MIN_SECTION = 4
/** Au-delà, on découpe : une « section » de 40 mesures n'aide personne à se repérer. */
const MAX_SECTION = 32
/** Nombre de mesures vides à partir duquel on replie en une seule bande. */
const MIN_EMPTY_RUN = 4

export function condenseGrille(
  cells: BarData[],
  options: { minSectionLen?: number } = {},
): CondensedGrille {
  const n = cells.length
  const minLen = Math.max(2, Math.min(MAX_SECTION, options.minSectionLen ?? DEFAULT_MIN_SECTION))
  const sigs = cells.map(barSignature)
  const empties = cells.map(isBarEmpty)

  const keyOf = (start: number, len: number) => `${len}${sigs.slice(start, start + len).join('')}`
  const runIsEmpty = (start: number, len: number) => {
    for (let k = 0; k < len; k++) if (!empties[start + k]) return false
    return true
  }
  // Sans accord, une « section » n'en est pas une : deux plages muettes ne
  // doivent pas se répondre en renvoi (elles peuvent porter des annotations
  // différentes, qui elles ne sont pas comparées).
  const blanks = cells.map((bar) => bar.b.every((x) => !x.trim()))
  const runIsBlank = (start: number, len: number) => {
    for (let k = 0; k < len; k++) if (!blanks[start + k]) return false
    return true
  }

  /* ─── 1. Repérage glouton des reprises ───
     Pour chaque position, la plus longue section déjà rencontrée intégralement
     avant elle (jamais de chevauchement : une reprise renvoie à du déjà écrit). */
  const firstOccurrence = new Map<string, number>()
  let registeredUpTo = 0
  const registerBlocksEndingBefore = (limit: number) => {
    for (let end = registeredUpTo; end <= limit; end++) {
      for (let len = minLen; len <= MAX_SECTION; len++) {
        const start = end - len
        if (start < 0) break
        const key = keyOf(start, len)
        if (!firstOccurrence.has(key)) firstOccurrence.set(key, start)
      }
    }
    registeredUpTo = Math.max(registeredUpTo, limit + 1)
  }

  const repeats: { start: number; len: number; refStart: number }[] = []
  let i = 0
  while (i < n) {
    registerBlocksEndingBefore(i)
    let found: { len: number; refStart: number } | null = null
    for (let len = Math.min(MAX_SECTION, n - i); len >= minLen; len--) {
      if (runIsBlank(i, len)) continue
      const refStart = firstOccurrence.get(keyOf(i, len))
      if (refStart !== undefined) { found = { len, refStart }; break }
    }
    if (found) { repeats.push({ start: i, len: found.len, refStart: found.refStart }); i += found.len }
    else i++
  }

  /* ─── 2. Points de coupe ───
     On coupe aux bornes des reprises ET des sections citées, pour que toute
     section citée soit exactement une suite de segments entiers. */
  const cuts = new Set<number>([0, n])
  const referencedBoundaries = new Set<number>()
  for (const r of repeats) {
    cuts.add(r.start); cuts.add(r.start + r.len)
    cuts.add(r.refStart); cuts.add(r.refStart + r.len)
    referencedBoundaries.add(r.refStart); referencedBoundaries.add(r.refStart + r.len)
  }
  // Bornes des longues plages vides, pour les replier proprement.
  for (let k = 0; k < n; ) {
    if (!empties[k]) { k++; continue }
    let end = k
    while (end < n && empties[end]) end++
    if (end - k >= MIN_EMPTY_RUN) { cuts.add(k); cuts.add(end) }
    k = end
  }

  const bounds = Array.from(cuts).sort((a, b) => a - b)
  const repeatAt = (start: number) => repeats.find((r) => start >= r.start && start < r.start + r.len)

  /* ─── 3. Segments bruts ─── */
  type Raw = { kind: 'written' | 'repeat' | 'empty'; start: number; len: number; refStart?: number }
  const raw: Raw[] = []
  for (let b = 0; b < bounds.length - 1; b++) {
    const start = bounds[b]
    const len = bounds[b + 1] - start
    if (len <= 0) continue
    const rep = repeatAt(start)
    if (rep) { raw.push({ kind: 'repeat', start, len, refStart: rep.refStart + (start - rep.start) }); continue }
    if (len >= MIN_EMPTY_RUN && runIsEmpty(start, len)) { raw.push({ kind: 'empty', start, len }); continue }
    raw.push({ kind: 'written', start, len })
  }

  // Deux sections écrites qui se suivent sans qu'aucune reprise ne cite leur
  // frontière n'ont pas de raison d'être séparées : on les refusionne.
  const merged: Raw[] = []
  for (const seg of raw) {
    const prev = merged[merged.length - 1]
    if (prev && prev.kind === 'written' && seg.kind === 'written' && !referencedBoundaries.has(seg.start)) {
      prev.len += seg.len
    } else merged.push({ ...seg })
  }

  /* ─── 4. Repères et renvois ─── */
  const labelOfBar = new Map<number, string>()
  let labelIndex = 0
  for (const seg of merged) {
    if (seg.kind !== 'written') continue
    const label = labelAt(labelIndex++)
    for (let k = 0; k < seg.len; k++) labelOfBar.set(seg.start + k, label)
  }

  // Une reprise peut citer un passage qui est lui-même une reprise. On propage
  // les repères de proche en proche (les segments sont dans l'ordre et une
  // reprise cite toujours plus haut) pour qu'aucun renvoi ne reste anonyme.
  for (const seg of merged) {
    if (seg.kind !== 'repeat') continue
    const refStart = seg.refStart ?? 0
    for (let k = 0; k < seg.len; k++) {
      const inherited = labelOfBar.get(refStart + k)
      if (inherited) labelOfBar.set(seg.start + k, inherited)
    }
  }

  const segments: CondensedSegment[] = merged.map((seg) => {
    if (seg.kind === 'written') {
      return { kind: 'written', start: seg.start, len: seg.len, label: labelOfBar.get(seg.start) ?? '?' }
    }
    if (seg.kind === 'empty') return { kind: 'empty', start: seg.start, len: seg.len }
    const refStart = seg.refStart ?? 0
    const labels: string[] = []
    for (let k = 0; k < seg.len; k++) {
      const l = labelOfBar.get(refStart + k)
      if (l && labels[labels.length - 1] !== l) labels.push(l)
    }
    const notes: { bar: number; text: string }[] = []
    for (let k = 0; k < seg.len; k++) {
      for (const text of barNotes(cells[seg.start + k])) notes.push({ bar: seg.start + k, text })
    }
    return {
      kind: 'repeat', start: seg.start, len: seg.len, refStart, labels, notes,
      color: cells[seg.start]?.c || cells[refStart]?.c || '',
    }
  })

  const form = segments.map((s) =>
    s.kind === 'written' ? s.label : s.kind === 'repeat' ? (s.labels.join(' ') || '↺') : '·',
  )
  const writtenBars = segments.reduce((sum, s) => sum + (s.kind === 'written' ? s.len : 0), 0)

  return { segments, form, writtenBars, totalBars: n }
}

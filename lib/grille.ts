/**
 * Logique partagée des grilles d'accords (éditeur + visionneuse).
 * Centralisée ici pour qu'un nouveau champ de mesure (ex. la couleur `c`)
 * ne soit pas oublié d'un côté et perdu silencieusement.
 *
 * Structure d'une mesure :
 *   l = symbole de début de mesure (||:, Segno…)
 *   b = tableau de temps (un accord/contenu par temps)
 *   r = symbole de fin de mesure (:||, Coda, Fine…)
 *   c = couleur de fond facultative (repérer couplet / refrain / pont…)
 *   n = annotation facultative au-dessus de chaque temps (« Solo », « cresc. »)
 *
 * `n` n'est présent que s'il porte quelque chose : une grille sans annotation
 * de temps ne traîne pas un tableau de chaînes vides à chaque mesure.
 */
export type BarData = { l: string; b: string[]; r: string; c?: string; n?: string[] }

/** Annotations par temps, ramenées à la longueur de la mesure. */
export function beatNotes(bar: BarData, bpb: number): string[] {
  const src = Array.isArray(bar.n) ? bar.n : []
  return Array.from({ length: bpb }, (_, i) => (typeof src[i] === 'string' ? src[i] : ''))
}

export function hasBeatNotes(bar: BarData): boolean {
  return Array.isArray(bar.n) && bar.n.some((v) => typeof v === 'string' && v.trim() !== '')
}

/** Range `n` dans la mesure, ou l'enlève si plus rien n'y est écrit. */
export function withBeatNotes(bar: BarData, notes: string[]): BarData {
  const next = { ...bar }
  if (notes.some((v) => v.trim() !== '')) next.n = notes
  else delete next.n
  return next
}

/**
 * Nombre de mesures : saisie libre, avec une seule garde haute technique.
 * (Au-delà, l'affichage et le JSON stocké deviendraient déraisonnables ;
 *  1000 mesures dépassent très largement n'importe quel morceau.)
 */
export const MAX_BARS = 1000

export function clampTotalBars(value: unknown, fallback = 32): number {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return fallback
  return Math.max(1, Math.min(MAX_BARS, n))
}

export function beatsPerBar(timeSig: string): number {
  const map: Record<string, number> = {
    '4/4': 4, '3/4': 3, '6/8': 2, '2/4': 2, '5/4': 5, '12/8': 4, '2/2': 2,
  }
  return map[timeSig] ?? 4
}

/** Couleur de mesure : on n'accepte qu'un hex #rrggbb (sécurise aussi les exports HTML). */
export function safeBarColor(value: unknown): string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : ''
}

/** Convertit n'importe quel format historique (string[], string[][], BarData[]) → BarData[] */
export function normalizeCells(raw: unknown, totalBars: number, bpb: number): BarData[] {
  const src = Array.isArray(raw) ? raw : []
  const result: BarData[] = []

  const pad = (beats: string[]) =>
    beats.length < bpb ? [...beats, ...Array(bpb - beats.length).fill('')] : beats.slice(0, bpb)

  for (let i = 0; i < totalBars; i++) {
    const item = src[i]

    if (item && typeof item === 'object' && !Array.isArray(item) && 'b' in item) {
      // Format courant BarData { l, b, r, c }
      const bar = item as any
      const beats = (Array.isArray(bar.b) ? bar.b : []).map((v: any) => (typeof v === 'string' ? v : ''))
      const notes = (Array.isArray(bar.n) ? bar.n : []).map((v: any) => (typeof v === 'string' ? v : ''))
      result.push(withBeatNotes(
        { l: bar.l || '', b: pad(beats), r: bar.r || '', c: safeBarColor(bar.c) },
        pad(notes),
      ))

    } else if (item && typeof item === 'object' && !Array.isArray(item) && 'chord' in item) {
      // Ancien format de démo { chord, section }
      const legacy = item as any
      const beats = Array(bpb).fill('')
      beats[0] = typeof legacy.chord === 'string' ? legacy.chord : ''
      const section = typeof legacy.section === 'string' ? legacy.section.trim() : ''
      result.push({ l: section, b: beats, r: '', c: '' })

    } else if (Array.isArray(item)) {
      // Ancien format string[]
      const beats = item.map((v: any) => (typeof v === 'string' ? v : ''))
      result.push({ l: '', b: pad(beats), r: '', c: '' })

    } else if (typeof item === 'string') {
      // Très ancien format (une chaîne par mesure)
      const beats = Array(bpb).fill('')
      beats[0] = item
      result.push({ l: '', b: beats, r: '', c: '' })

    } else {
      result.push({ l: '', b: Array(bpb).fill(''), r: '', c: '' })
    }
  }
  return result
}

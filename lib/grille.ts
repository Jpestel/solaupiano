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
 *   n = texte facultatif AU-DESSUS de chaque temps (« Solo », « cresc. »)
 *   s = texte facultatif EN DESSOUS de chaque temps (doigté, parole, nuance…)
 *
 * `n` et `s` ne sont présents que s'ils portent quelque chose : une grille qui
 * ne s'en sert pas ne traîne pas un tableau de chaînes vides à chaque mesure.
 */
export type BarData = {
  l: string; b: string[]; r: string; c?: string; n?: string[]; s?: string[]
}

/** Les deux lignes de texte alignées sur les temps, de part et d'autre de l'accord. */
export type BeatTextField = 'n' | 's'
export const BEAT_TEXT_FIELDS: BeatTextField[] = ['n', 's']

/** Textes d'un côté, ramenés à la longueur de la mesure. */
export function beatTexts(bar: BarData, bpb: number, field: BeatTextField): string[] {
  const src = Array.isArray(bar[field]) ? (bar[field] as string[]) : []
  return Array.from({ length: bpb }, (_, i) => (typeof src[i] === 'string' ? src[i] : ''))
}

export function hasBeatTexts(bar: BarData, field: BeatTextField): boolean {
  const src = bar[field]
  return Array.isArray(src) && src.some((v) => typeof v === 'string' && v.trim() !== '')
}

/** Range les textes dans la mesure, ou enlève le champ si plus rien n'y est écrit. */
export function withBeatTexts(bar: BarData, texts: string[], field: BeatTextField): BarData {
  const next = { ...bar }
  if (texts.some((v) => v.trim() !== '')) next[field] = texts
  else delete next[field]
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
      let normalized: BarData = { l: bar.l || '', b: pad(beats), r: bar.r || '', c: safeBarColor(bar.c) }
      for (const field of BEAT_TEXT_FIELDS) {
        const texts = (Array.isArray(bar[field]) ? bar[field] : []).map((v: any) => (typeof v === 'string' ? v : ''))
        normalized = withBeatTexts(normalized, pad(texts), field)
      }
      result.push(normalized)

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

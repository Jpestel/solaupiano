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
 */
export type BarData = { l: string; b: string[]; r: string; c?: string }

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
      result.push({ l: bar.l || '', b: pad(beats), r: bar.r || '', c: safeBarColor(bar.c) })

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

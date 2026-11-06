/**
 * Détection des titres identiques ou voisins (pur : utilisé par le navigateur
 * pour prévenir pendant la saisie, et par le serveur pour garder la décision).
 */

const ARTICLES = new Set(['the', 'a', 'an', 'le', 'la', 'les', 'l', 'un', 'une', 'de', 'des', 'du', 'el', 'los', 'las'])

/** Minuscules, sans accents ni ponctuation, sans articles : « The Rain-bow! » → « rain bow ». */
export function normaliserTitre(t: string): string {
  const mots = t
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
  const sans = mots.filter((m) => !ARTICLES.has(m))
  return (sans.length > 0 ? sans : mots).join(' ')
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

export type Ressemblance = 'identique' | 'proche' | null

/**
 * « identique » : même titre une fois normalisé (casse, accents, ponctuation, articles).
 * « proche » : une faute de frappe ou deux, ou un titre contenu dans l'autre
 * (« Satisfaction » / « (I Can't Get No) Satisfaction »).
 */
export function comparerTitres(a: string, b: string): Ressemblance {
  const x = normaliserTitre(a), y = normaliserTitre(b)
  if (!x || !y) return null
  if (x === y) return 'identique'
  const court = x.length <= y.length ? x : y
  const long = x.length <= y.length ? y : x
  // Titre contenu dans l'autre, en mots entiers, et assez long pour être significatif.
  if (court.length >= 5 && (` ${long} `).includes(` ${court} `)) return 'proche'
  const dist = levenshtein(x, y)
  const seuil = Math.max(x.length, y.length) <= 5 ? 1 : Math.max(x.length, y.length) <= 12 ? 2 : 3
  return dist <= seuil ? 'proche' : null
}

export interface Candidat { id: number; title: string; performer?: string | null }
export interface Similaire extends Candidat { niveau: 'identique' | 'proche' }

/** Partitions déjà présentes dont le titre est identique ou voisin, les identiques d'abord. */
export function titresSimilaires(titre: string, existants: Candidat[], ignorerId?: number): Similaire[] {
  const res: Similaire[] = []
  for (const e of existants) {
    if (e.id === ignorerId) continue
    const n = comparerTitres(titre, e.title)
    if (n) res.push({ id: e.id, title: e.title, performer: e.performer ?? null, niveau: n })
  }
  return res.sort((p, q) => (p.niveau === q.niveau ? 0 : p.niveau === 'identique' ? -1 : 1))
}

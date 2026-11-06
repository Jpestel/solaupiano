/**
 * Lecture du titre d'une partition à partir des lignes de texte reconnues (OCR).
 * Pur (aucune dépendance) : utilisé par le navigateur et testable seul.
 *
 * Hypothèse, vraie pour la plupart des partitions : le titre est la ligne la plus
 * grande tout en haut de la page, et l'interprète figure juste en dessous.
 */

export interface LigneOcr { text: string; y0: number; y1: number; confidence: number }
export interface Detection { title: string; performer: string; composer: string }

const BRUIT = /^[\s.,;:!?'"`´’‘“”«»|_~=*+\-–—()[\]{}<>\\/]+|[\s.,;:!?'"`´‘“”«»|_~=*+\-–—()[\]{}<>\\/]+$/g
const METADONNEES = /\b(tuning|accordage|capo|key|tonalit[eé]|tempo|bpm|written by|composed|paroles|lyrics)\b/i

const ACCORD = /^[A-G][#b♯♭]?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-G][#b]?)?$/
/** Ligne d'accords (« D Gsus2 D Asus4 ») : à ne jamais prendre pour un titre ou un interprète. */
const ligneAccords = (t: string) => {
  const mots = t.trim().split(/\s+/).filter(Boolean)
  return mots.length >= 2 && mots.filter((m) => ACCORD.test(m)).length / mots.length >= 0.5
}
/** Retire en fin de texte les parasites de lecture (« HHH », « LS », « I »). */
const sansParasites = (t: string) => t.replace(/(?:\s+(?:[A-Z]{2,4}|[A-Za-z]|\|+))+$/, '').trim()

const lettres = (t: string) => t.replace(/[^A-Za-zÀ-ÖØ-öø-ÿŒœ]/g, '').length

/** Retire le bruit autour d'un texte et une éventuelle année finale : « Tom Petty (1989) » → « Tom Petty ». */
export function nettoyer(t: string): string {
  return t
    .replace(/\s*[([]\s*(19|20)\d{2}\s*[)\]]\s*$/, '')
    .replace(/\s+/g, ' ')
    .replace(BRUIT, '')
    .trim()
}

/**
 * @param lignes     lignes reconnues dans la partie haute de la page (ordre quelconque)
 * @param bas        lignes reconnues dans la partie basse (pour « Written by : … »)
 */
export function extraireInfos(lignes: LigneOcr[], bas: LigneOcr[] = []): Detection | null {
  const hauteur = (l: LigneOcr) => l.y1 - l.y0
  const candidates = lignes
    .filter((l) => l.confidence >= 35 && lettres(l.text) >= 3 && !METADONNEES.test(l.text) && !ligneAccords(l.text))
    .sort((a, b) => a.y0 - b.y0)

  // Compositeur : « Written by : Tom Petty and Jeff Lynne », « Compositeur : … ».
  let composer = ''
  for (const l of [...bas, ...lignes]) {
    const m = l.text.match(/(?:written by|composed by|music by|compos[ée]+\s*(?:par)?|compositeur)\s*[:\-]?\s*(.{3,})/i)
    if (m) { composer = sansParasites(nettoyer(m[1])); break }
  }
  if (candidates.length === 0) return composer ? { title: '', performer: '', composer } : null

  // Cas le plus sûr : une ligne « Interprète (année) » marque l'interprète ; le titre est la ligne au-dessus.
  const avecAnnee = candidates.find((l) => /[([]\s*(19|20)\d{2}\s*[)\]]\s*$/.test(l.text.trim()))
  if (avecAnnee) {
    const dessus = candidates.filter((l) => l !== avecAnnee && l.y1 <= avecAnnee.y0 + hauteur(avecAnnee) * 0.3)
    const t = dessus.length ? dessus.reduce((b, l) => (hauteur(l) > hauteur(b) ? l : b)) : null
    return { title: t ? nettoyer(t.text) : '', performer: sansParasites(nettoyer(avecAnnee.text)), composer }
  }

  // Sinon : le titre est la ligne la plus grande en haut de page, l'interprète la suivante.
  const titre = candidates.reduce((best, l) => (hauteur(l) > hauteur(best) * 1.08 ? l : best), candidates[0])
  const title = nettoyer(titre.text)
  if (lettres(title) < 2) return composer ? { title: '', performer: '', composer } : null
  const suivante = candidates.find((l) => l !== titre && l.y0 >= titre.y1 - hauteur(titre) * 0.3 && l.y0 - titre.y1 < hauteur(titre) * 2.5)
  const performer = suivante && hauteur(suivante) >= hauteur(titre) * 0.35 ? sansParasites(nettoyer(suivante.text)) : ''
  return { title, performer: lettres(performer) >= 3 ? performer : '', composer }
}

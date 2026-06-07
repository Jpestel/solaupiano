// Catalogue par défaut des liens de ressources (semés au 1er accès admin).
// {q} est remplacé par « titre artiste » encodé.

export interface ResourceLinkSeed {
  label: string
  icon: string
  category: string // VIDEO | AUDIO | TUTO | SCORE | TAB | LYRICS | OTHER
  urlTemplate: string
  description?: string
  defaultActive: boolean
  sortOrder: number
}

export const CATEGORIES: { key: string; label: string }[] = [
  { key: 'VIDEO', label: '🎬 Vidéos' },
  { key: 'TUTO', label: '🎓 Tutoriels' },
  { key: 'AUDIO', label: '🎧 Audio / streaming' },
  { key: 'SCORE', label: '🎼 Partitions' },
  { key: 'TAB', label: '🎸 Accords / tablatures' },
  { key: 'LYRICS', label: '📝 Paroles' },
  { key: 'OTHER', label: '🔗 Autres' },
]

export const DEFAULT_RESOURCE_LINKS: ResourceLinkSeed[] = [
  // ── Actifs par défaut (les « quelques liens » de base) ──
  { label: 'Free-scores', icon: '🎼', category: 'SCORE', urlTemplate: 'https://www.free-scores.com/search.php?search={q}', description: 'Partitions gratuites', defaultActive: true, sortOrder: 10 },
  { label: 'MuseScore', icon: '🎼', category: 'SCORE', urlTemplate: 'https://musescore.com/sheetmusic?text={q}', description: 'Partitions communautaires', defaultActive: true, sortOrder: 11 },
  { label: 'Chordify', icon: '🎸', category: 'TAB', urlTemplate: 'https://chordify.net/search/{q}', description: 'Accords synchronisés / play-along', defaultActive: true, sortOrder: 12 },
  { label: 'Ultimate Guitar', icon: '🎸', category: 'TAB', urlTemplate: 'https://www.ultimate-guitar.com/search.php?search_type=title&value={q}', description: 'Tablatures & accords', defaultActive: true, sortOrder: 13 },
  { label: 'Songsterr', icon: '🎸', category: 'TAB', urlTemplate: 'https://www.songsterr.com/?pattern={q}', description: 'Tablatures interactives', defaultActive: true, sortOrder: 14 },
  { label: 'Genius', icon: '📝', category: 'LYRICS', urlTemplate: 'https://genius.com/search?q={q}', description: 'Paroles', defaultActive: true, sortOrder: 15 },

  // ── Désactivés par défaut (activables à la demande) ──
  // Vidéos / tutos
  { label: 'YouTube — tutoriels', icon: '🎓', category: 'TUTO', urlTemplate: 'https://www.youtube.com/results?search_query={q}+tutoriel', description: 'Tutos pour apprendre le morceau', defaultActive: false, sortOrder: 20 },
  { label: 'YouTube — reprises (covers)', icon: '🎬', category: 'VIDEO', urlTemplate: 'https://www.youtube.com/results?search_query={q}+cover', description: 'Versions reprises', defaultActive: false, sortOrder: 21 },
  { label: 'YouTube — karaoké', icon: '🎤', category: 'VIDEO', urlTemplate: 'https://www.youtube.com/results?search_query={q}+karaoké', description: 'Versions karaoké', defaultActive: false, sortOrder: 22 },
  { label: 'YouTube — live', icon: '🎬', category: 'VIDEO', urlTemplate: 'https://www.youtube.com/results?search_query={q}+live', description: 'Versions live', defaultActive: false, sortOrder: 23 },

  // Audio / streaming
  { label: 'Spotify', icon: '🎧', category: 'AUDIO', urlTemplate: 'https://open.spotify.com/search/{q}', description: 'Écoute en streaming', defaultActive: false, sortOrder: 30 },
  { label: 'Deezer', icon: '🎧', category: 'AUDIO', urlTemplate: 'https://www.deezer.com/search/{q}', description: 'Écoute en streaming', defaultActive: false, sortOrder: 31 },
  { label: 'SoundCloud', icon: '🎧', category: 'AUDIO', urlTemplate: 'https://soundcloud.com/search?q={q}', description: 'Versions, remixes', defaultActive: false, sortOrder: 32 },
  { label: 'Apple Music', icon: '🎧', category: 'AUDIO', urlTemplate: 'https://music.apple.com/fr/search?term={q}', description: 'Écoute en streaming', defaultActive: false, sortOrder: 33 },
  { label: 'Bandcamp', icon: '🎧', category: 'AUDIO', urlTemplate: 'https://bandcamp.com/search?q={q}', description: 'Artistes indépendants', defaultActive: false, sortOrder: 34 },
  { label: 'Karaoke-Version', icon: '🎤', category: 'AUDIO', urlTemplate: 'https://www.karaoke-version.fr/search.html?query={q}', description: 'Playbacks / pistes séparées', defaultActive: false, sortOrder: 35 },

  // Partitions
  { label: '8notes', icon: '🎼', category: 'SCORE', urlTemplate: 'https://www.8notes.com/search/?s={q}', description: 'Partitions par instrument', defaultActive: false, sortOrder: 40 },
  { label: 'Cantorion', icon: '🎼', category: 'SCORE', urlTemplate: 'https://cantorion.org/search?q={q}', description: 'Partitions gratuites', defaultActive: false, sortOrder: 41 },
  { label: 'IMSLP', icon: '🎼', category: 'SCORE', urlTemplate: 'https://imslp.org/index.php?title=Special:Search&search={q}', description: 'Domaine public (classique)', defaultActive: false, sortOrder: 42 },
  { label: 'Musopen', icon: '🎼', category: 'SCORE', urlTemplate: 'https://musopen.org/fr/music/?q={q}', description: 'Partitions & enregistrements libres', defaultActive: false, sortOrder: 43 },

  // Accords / tablatures
  { label: 'Yalp', icon: '🎸', category: 'TAB', urlTemplate: 'https://www.yalp.io/search?q={q}', description: 'Accords & play-along (IA)', defaultActive: false, sortOrder: 50 },
  { label: 'Tabs4Acoustic', icon: '🎸', category: 'TAB', urlTemplate: 'https://www.tabs4acoustic.com/fr/recherche?q={q}', description: 'Tablatures guitare (FR)', defaultActive: false, sortOrder: 51 },
  { label: 'e-chords', icon: '🎸', category: 'TAB', urlTemplate: 'https://www.e-chords.com/search-all/{q}', description: 'Accords & tablatures', defaultActive: false, sortOrder: 52 },

  // Paroles
  { label: 'Paroles.net', icon: '📝', category: 'LYRICS', urlTemplate: 'https://www.paroles.net/recherche?q={q}', description: 'Paroles (FR)', defaultActive: false, sortOrder: 60 },
  { label: 'AZLyrics', icon: '📝', category: 'LYRICS', urlTemplate: 'https://search.azlyrics.com/search.php?q={q}', description: 'Paroles', defaultActive: false, sortOrder: 61 },

  // Autres
  { label: 'Hooktheory', icon: '🎹', category: 'OTHER', urlTemplate: 'https://www.hooktheory.com/theorytab/search?q={q}', description: 'Analyse harmonique / théorie', defaultActive: false, sortOrder: 70 },
  { label: 'Moises', icon: '🎚️', category: 'OTHER', urlTemplate: 'https://moises.ai/', description: 'Séparation de pistes (stems) par IA', defaultActive: false, sortOrder: 71 },
]

export function buildUrl(urlTemplate: string, query: string): string {
  return urlTemplate.includes('{q}') ? urlTemplate.replace('{q}', encodeURIComponent(query)) : urlTemplate
}

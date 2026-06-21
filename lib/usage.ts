// Résout un chemin (pathname) en module lisible pour l'audit d'usage.
// Renvoie null pour les chemins qu'on ne trace pas (admin, auth, etc.).

const TOP_LABELS: Record<string, string> = {
  'tableau-de-bord': 'Tableau de bord',
  'profil': 'Mon profil',
  'calendrier': 'Calendrier',
  'assistance': 'Assistance',
  'aide': 'Aide',
}

const TOOL_LABELS: Record<string, string> = {
  accordeur: 'Accordeur',
  metronome: 'Métronome',
  accords: 'Accords',
  portee: 'Portée',
  cachet: 'Cachet GUSO',
  kilometrique: 'Estimation cachet',
  'images-pdf': 'Photos → PDF',
  'video-audio': 'Vidéo → MP3/WAV',
  'wav-mp3': 'WAV → MP3',
}

const SECTION_LABELS: Record<string, string> = {
  morceaux: 'Répertoire',
  concerts: 'Concerts',
  repetitions: 'Répétitions',
  disponibilites: 'Disponibilités',
  sondages: 'Sondages',
  setlists: 'Setlists',
  grilles: 'Grilles d\'accords',
  comptabilite: 'Comptabilité',
  'fiche-technique': 'Fiche technique',
  'ma-page': 'Page publique',
  'ressources-partagees': 'Ressources partagées',
  tchat: 'Tchat',
  stats: 'Statistiques',
  galerie: 'Galerie',
  taches: 'Tâches de groupe',
  'partitions-carrees': 'Méthode carrée',
}

export function resolveModule(path: string): { key: string; label: string } | null {
  const clean = path.split('?')[0].split('#')[0]
  const seg = clean.split('/').filter(Boolean)
  if (seg.length === 0) return { key: 'home', label: 'Accueil' }

  const top = seg[0]

  // Non tracé
  if (['admin', 'connexion', 'inscription', 'api', '_next'].includes(top)) return null
  if (['mot-de-passe-oublie', 'reinitialiser-mot-de-passe', 'desinscription', 'presence', 'newsletter'].includes(top)) return null

  if (TOP_LABELS[top]) return { key: top, label: TOP_LABELS[top] }
  if (top === 'annonces') return { key: 'annonces', label: 'Annonces' }

  if (top === 'outils') {
    const tool = seg[1] || ''
    const label = TOOL_LABELS[tool] || tool
    return { key: `tool_${tool}`, label: `Outil : ${label}` }
  }

  if (top === 'groupes') {
    if (seg.length === 1) return { key: 'groupes', label: 'Mes groupes' }
    if (seg.length === 2) return { key: 'group_home', label: 'Groupe (accueil)' }
    const section = seg[2]
    if (section === 'morceaux') {
      const sub = seg[4] // /groupes/:id/morceaux/:songId/<sub>
      if (sub === 'paroles') return { key: 'paroles', label: 'Paroles' }
      if (sub === 'tablature') return { key: 'tablature', label: 'Tablature' }
      if (sub === 'sequences') return { key: 'sequences', label: 'Séquences' }
      return { key: 'repertoire', label: 'Répertoire' }
    }
    if (SECTION_LABELS[section]) return { key: section, label: SECTION_LABELS[section] }
    return { key: `group_${section}`, label: section }
  }

  return null
}

export interface ModuleDef {
  key: string
  label: string
  description: string
  href: string
  icon: string
  category: 'outil' | 'feature'
}

export const MODULES: ModuleDef[] = [
  {
    key: 'tool_accordeur',
    label: 'Accordeur',
    description: 'Accordeur chromatique en temps réel via le microphone.',
    href: '/outils/accordeur',
    icon: '🎤',
    category: 'outil',
  },
  {
    key: 'tool_metronome',
    label: 'Métronome (outil)',
    description: 'Outil autonome : métronome réglable avec différentes signatures rythmiques. Distinct du métronome intégré au répertoire (réglé par plan).',
    href: '/outils/metronome',
    icon: '🎵',
    category: 'outil',
  },
  {
    key: 'tool_accords',
    label: "Créateur d'accords",
    description: "Visualisation et création d'accords de guitare/piano.",
    href: '/outils/accords',
    icon: '🎸',
    category: 'outil',
  },
  {
    key: 'tool_portee',
    label: 'Portée musicale',
    description: 'Portée interactive pour placer des notes et reconnaître des accords.',
    href: '/outils/portee',
    icon: '🎼',
    category: 'outil',
  },
  {
    key: 'feature_annonces',
    label: 'Annonces',
    description: "Petites annonces entre musiciens (instruments, matériel, sessions…).",
    href: '/annonces',
    icon: '📢',
    category: 'feature',
  },
  {
    key: 'feature_tasks',
    label: 'Tâches de groupe',
    description: "Listes de tâches à préparer avant une répétition, un concert ou une autre date, avec assignation aux membres et envoi par e-mail.",
    href: '/groupes/[id]/taches',
    icon: '✅',
    category: 'feature',
  },
  {
    key: 'feature_partitions_carrees',
    label: 'Méthode carrée',
    description: "Relevé de structure d'un morceau avec PMD, carrés de mesures et abréviations de parties.",
    href: '/groupes/[id]/partitions-carrees',
    icon: '▦',
    category: 'feature',
  },
  {
    key: 'tool_cachet',
    label: 'Simulateur cachet GUSO',
    description: "Estimez le coût employeur et le net artiste pour un cachet de spectacle vivant.",
    href: '/outils/cachet',
    icon: '💶',
    category: 'outil',
  },
  {
    key: 'tool_kilometrique',
    label: 'Estimation de cachet',
    description: "Estimez le cachet, les charges GUSO et les frais de déplacement pour un concert.",
    href: '/outils/kilometrique',
    icon: '🎭',
    category: 'outil',
  },
  {
    key: 'tool_img2pdf',
    label: 'Photos → PDF (ressources)',
    description: "Permet de convertir des photos (JPG, JPEG, PNG, BMP, TIFF…) en PDF lors de l'ajout d'une ressource à un morceau du répertoire. Conversion locale dans le navigateur.",
    href: '/outils/images-pdf',
    icon: '🖼️',
    category: 'outil',
  },
  {
    key: 'tool_video2audio',
    label: 'Vidéo → MP3 / WAV',
    description: "Extrait la piste audio d'un fichier vidéo (MP4, MOV, WEBM…) en MP3 ou WAV. Conversion locale dans le navigateur — rien n'est envoyé au serveur. Réservé aux contenus dont l'utilisateur détient les droits.",
    href: '/outils/video-audio',
    icon: '🎬',
    category: 'outil',
  },
  {
    key: 'tool_wav2mp3',
    label: 'WAV → MP3',
    description: "Compresse un fichier WAV en MP3 pour réduire fortement sa taille avant partage ou import. Conversion locale dans le navigateur — rien n'est envoyé au serveur.",
    href: '/outils/wav-mp3',
    icon: '🎧',
    category: 'outil',
  },
  {
    key: 'tool_transposition',
    label: 'Transposition',
    description: "Transpose automatiquement une grille d'accords, un texte ou un PDF texte, avec création possible d'une copie de grille.",
    href: '/outils/transposition',
    icon: '🎼',
    category: 'outil',
  },
  {
    key: 'tool_partition',
    label: 'Lecteur de partition',
    description: "Affiche une vraie partition à partir d'un fichier MusicXML (.musicxml, .mxl — export MuseScore/Free-scores) et la joue avec un curseur qui suit les notes (lecture, vitesse, transposition, zoom). 100% navigateur.",
    href: '/outils/partition',
    icon: '🎼',
    category: 'outil',
  },
]

export function getModuleDef(key: string): ModuleDef | undefined {
  return MODULES.find(m => m.key === key)
}

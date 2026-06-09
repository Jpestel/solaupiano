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
]

export function getModuleDef(key: string): ModuleDef | undefined {
  return MODULES.find(m => m.key === key)
}

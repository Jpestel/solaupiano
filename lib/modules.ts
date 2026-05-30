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
    label: 'Métronome',
    description: 'Métronome réglable avec différentes signatures rythmiques.',
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
    label: 'Frais kilométriques',
    description: "Calculez le coût de déplacement pour un concert avec un ou plusieurs véhicules.",
    href: '/outils/kilometrique',
    icon: '🚗',
    category: 'outil',
  },
]

export function getModuleDef(key: string): ModuleDef | undefined {
  return MODULES.find(m => m.key === key)
}

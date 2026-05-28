export interface ModuleDef {
  key: string
  label: string
  description: string
  href: string
  icon: string
}

export const MODULES: ModuleDef[] = [
  {
    key: 'tool_accordeur',
    label: 'Accordeur',
    description: 'Accordeur chromatique en temps réel via le microphone.',
    href: '/outils/accordeur',
    icon: '🎤',
  },
  {
    key: 'tool_metronome',
    label: 'Métronome',
    description: 'Métronome réglable avec différentes signatures rythmiques.',
    href: '/outils/metronome',
    icon: '🎵',
  },
  {
    key: 'tool_accords',
    label: 'Créateur d\'accords',
    description: 'Visualisation et création d\'accords de guitare/piano.',
    href: '/outils/accords',
    icon: '🎸',
  },
  {
    key: 'tool_portee',
    label: 'Portée musicale',
    description: 'Portée interactive pour placer des notes et reconnaître des accords.',
    href: '/outils/portee',
    icon: '🎼',
  },
]

export function getModuleDef(key: string): ModuleDef | undefined {
  return MODULES.find(m => m.key === key)
}

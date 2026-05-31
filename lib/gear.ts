export interface GearCategory {
  key: string
  icon: string
  label: string
}

// Catégories de matériel — pensées pour tout type de musicien
export const GEAR_CATEGORIES: GearCategory[] = [
  { key: 'INSTRUMENT', icon: '🎸', label: 'Instrument' },
  { key: 'KEYS',       icon: '🎹', label: 'Clavier / Synthé' },
  { key: 'DRUMS',      icon: '🥁', label: 'Batterie / Percussions' },
  { key: 'AMP',        icon: '🔊', label: 'Amplification' },
  { key: 'MIC',        icon: '🎤', label: 'Micro' },
  { key: 'EFFECT',     icon: '🎛️', label: 'Effets / Pédales' },
  { key: 'AUDIO',      icon: '💻', label: 'Audio / MAO' },
  { key: 'CABLE',      icon: '🔌', label: 'Câbles & connectique' },
  { key: 'ACCESSORY',  icon: '🧰', label: 'Accessoires' },
  { key: 'OTHER',      icon: '📦', label: 'Autre' },
]

export function getGearCategory(key: string): GearCategory {
  return GEAR_CATEGORIES.find(c => c.key === key) ?? GEAR_CATEGORIES[GEAR_CATEGORIES.length - 1]
}

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

// Suggestions de matériel par catégorie (autocomplétion, saisie libre conservée).
// Mélange de types génériques et de modèles/marques courants.
export const GEAR_SUGGESTIONS: Record<string, string[]> = {
  INSTRUMENT: [
    'Guitare électrique', 'Guitare acoustique', 'Guitare classique', 'Guitare folk',
    'Basse électrique', 'Contrebasse', 'Violon', 'Alto', 'Violoncelle',
    'Banjo', 'Mandoline', 'Ukulélé', 'Harpe',
    'Saxophone alto', 'Saxophone ténor', 'Trompette', 'Trombone', 'Clarinette',
    'Flûte traversière', 'Harmonica',
    'Fender Stratocaster', 'Fender Telecaster', 'Gibson Les Paul', 'Ibanez RG',
    'Fender Jazz Bass', 'Fender Precision Bass', 'Music Man StingRay',
  ],
  KEYS: [
    'Piano numérique', 'Piano de scène', 'Synthétiseur', 'Clavier maître',
    'Orgue', 'Clavier arrangeur', 'Workstation', 'Synthé modulaire',
    'Nord Stage', 'Nord Electro', 'Yamaha PSR', 'Yamaha Montage', 'Yamaha CP',
    'Roland Fantom', 'Roland Juno', 'Roland RD', 'Korg Kronos', 'Korg Minilogue',
    'Moog', 'Hammond', 'Fender Rhodes', 'Arturia KeyLab', 'Novation Launchkey',
  ],
  DRUMS: [
    'Batterie acoustique', 'Batterie électronique', 'Caisse claire', 'Grosse caisse',
    'Charleston', 'Cymbales', 'Pad de percussion', 'Cajón', 'Djembé', 'Congas',
    'Bongos', 'Darbouka', 'Timbales', 'Octobans',
    'Pearl', 'Tama', 'Yamaha', 'DW', 'Sonor', 'Roland TD', 'Alesis',
    'Zildjian', 'Sabian', 'Meinl',
  ],
  AMP: [
    'Ampli guitare', 'Ampli basse', 'Ampli clavier', 'Combo', "Tête d'ampli",
    'Baffle / Cabinet', 'Enceinte active', 'Caisson de basse', 'Retour de scène',
    'Système de sonorisation',
    'Fender', 'Marshall', 'Vox', 'Orange', 'Roland JC-120', 'Ampeg',
    'Hartke', 'Markbass', 'Mesa Boogie', 'HK Audio', 'QSC', 'Yamaha DXR',
  ],
  MIC: [
    'Micro dynamique', 'Micro statique', 'Micro à condensateur', 'Micro chant',
    'Micro instrument', 'Micro HF (sans fil)', 'Micro serre-tête', 'Micro cravate',
    'Micro grosse caisse', 'Système HF',
    'Shure SM58', 'Shure SM57', 'Shure Beta 58', 'Sennheiser e935', 'Sennheiser MD421',
    'Neumann', 'AKG', 'Rode NT1', 'DPA', 'Audio-Technica',
  ],
  EFFECT: [
    "Pédale d'overdrive", 'Pédale de distorsion', 'Pédale de delay', 'Pédale de reverb',
    'Pédale de chorus', 'Pédale wah-wah', 'Pédale de boost', 'Pédale de compression',
    'Looper', 'Multi-effets', 'Pédalier', 'Préampli', 'DI / Boîte de direct',
    'BOSS', 'Strymon', 'Electro-Harmonix', 'TC Electronic', 'Line 6 Helix',
    'Kemper', 'Eventide', 'MXR', 'Ibanez Tube Screamer',
  ],
  AUDIO: [
    'Carte son / Interface audio', 'Table de mixage', 'Console numérique', 'Enregistreur',
    'Contrôleur MIDI', 'Pad MIDI / Launchpad', 'Boîte à rythmes', 'Groovebox', 'Sampleur',
    'Ordinateur portable', 'Logiciel (DAW)', 'Moniteurs de studio', 'Casque de studio',
    'Focusrite Scarlett', 'Universal Audio Apollo', 'RME', 'Behringer', 'Presonus',
    'Ableton Push', 'Akai MPC', 'Native Instruments Maschine', 'Elgato Stream Deck',
  ],
  CABLE: [
    'Câble jack', 'Câble XLR', 'Câble instrument', 'Câble HP', 'Câble MIDI',
    'Câble USB', 'Câble RCA', 'Jack 3.5 mm', 'Multipaire', 'Patch',
    'Rallonge secteur', 'Multiprise', 'Adaptateur', 'DI / Boîte de direct',
  ],
  ACCESSORY: [
    'Pied de micro', 'Pied de clavier', 'Pupitre', 'Tabouret', 'Housse / Étui',
    'Flight case', 'Sangle', 'Capodastre', 'Médiators', 'Jeu de cordes',
    'Accordeur', 'Métronome', 'Diapason', "Bouchons d'oreille", 'Sourdine',
    'Stand guitare', 'Repose-pied', 'Lampe de pupitre', 'Piles / batteries',
    "Pédale de sustain", "Pédale d'expression",
  ],
  OTHER: [
    'Onduleur', 'Câble d\'alimentation', 'Gaffer', 'Étiquettes', 'Sangles de transport',
    'Chariot de transport', 'Housse de transport', 'Divers',
  ],
}

export function getGearSuggestions(key: string): string[] {
  return GEAR_SUGGESTIONS[key] ?? []
}

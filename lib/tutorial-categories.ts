export interface TutorialCategory {
  key: string
  label: string
  icon: string
  group: 'Fonctionnalités' | 'Outils'
}

export const TUTORIAL_CATEGORIES: TutorialCategory[] = [
  // ─── Fonctionnalités ────────────────────────────────────────────────────
  { key: 'feature_profil',          label: 'Mon profil',          icon: '👤', group: 'Fonctionnalités' },
  { key: 'feature_groupes',         label: 'Groupes',             icon: '👥', group: 'Fonctionnalités' },
  { key: 'feature_repetitions',     label: 'Répétitions',         icon: '🎵', group: 'Fonctionnalités' },
  { key: 'feature_concerts',        label: 'Concerts',            icon: '🎭', group: 'Fonctionnalités' },
  { key: 'feature_plan_scene',      label: 'Plan de scène',       icon: '🗺️', group: 'Fonctionnalités' },
  { key: 'feature_fiche_technique', label: 'Fiche technique',     icon: '📋', group: 'Fonctionnalités' },
  { key: 'feature_ma_page',         label: 'Page publique',       icon: '🌐', group: 'Fonctionnalités' },
  { key: 'feature_repertoire',      label: 'Répertoire',          icon: '🎼', group: 'Fonctionnalités' },
  { key: 'feature_setlists',        label: 'Setlists',            icon: '🎶', group: 'Fonctionnalités' },
  { key: 'feature_grilles',         label: 'Grilles d\'accords',  icon: '🎸', group: 'Fonctionnalités' },
  { key: 'feature_paroles',         label: 'Paroles',             icon: '🎤', group: 'Fonctionnalités' },
  { key: 'feature_tablatures',      label: 'Tablatures',          icon: '🎸', group: 'Fonctionnalités' },
  { key: 'feature_stats',           label: 'Statistiques',        icon: '📊', group: 'Fonctionnalités' },
  { key: 'feature_annonces',        label: 'Annonces',            icon: '📢', group: 'Fonctionnalités' },
  { key: 'feature_calendrier',      label: 'Calendrier',          icon: '📅', group: 'Fonctionnalités' },
  // ─── Outils ─────────────────────────────────────────────────────────────
  { key: 'tool_accordeur',          label: 'Accordeur',           icon: '🎙️', group: 'Outils' },
  { key: 'tool_metronome',          label: 'Métronome',           icon: '🥁', group: 'Outils' },
  { key: 'tool_accords',            label: 'Dictionnaire d\'accords', icon: '🎹', group: 'Outils' },
  { key: 'tool_portee',             label: 'Portée musicale',     icon: '🎼', group: 'Outils' },
]

export function getCategoryDef(key: string): TutorialCategory | undefined {
  return TUTORIAL_CATEGORIES.find(c => c.key === key)
}

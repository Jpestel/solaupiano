/**
 * Fonctionnalités de groupe : registre unique et règle de résolution.
 *
 * Sol au piano est un projet gratuit : les « plans » ne sont plus montrés aux
 * utilisateurs, qui ne voient que des fonctionnalités actives ou non. Les
 * indicateurs `hasXxx` du plan servent de RÉGLAGE DE BASE, et l'administrateur
 * peut le surcharger pour un groupe précis ou pour une personne précise, à
 * partir de l'écran « Gestion des modules ».
 *
 * Priorité, la même que pour les modules du registre (lib/module-access.ts) :
 *   1. dérogation par utilisateur   (la plus forte)
 *   2. dérogation par groupe
 *   3. réglage de base (indicateur du plan du groupe)
 *   4. ouvert par défaut si rien n'est configuré
 *
 * Les dérogations réutilisent les tables ModuleUserOverride / ModuleGroupOverride
 * avec une clé `group_<nom>` : aucune migration de base de données.
 *
 * Fichier sans dépendance serveur : il est aussi lu par des composants client.
 */

import type { ModuleDef } from './modules'

export type GroupFeature =
  | 'hasGrilles' | 'hasSetlists' | 'hasConcerts'
  | 'hasFicheTechnique' | 'hasMaPage' | 'hasStats'
  | 'hasParoles' | 'hasMetronome' | 'hasSequences' | 'hasEvaluations' | 'hasAccounting'
  | 'hasChat' | 'hasSharedResources' | 'hasUnavailabilities' | 'hasPolls' | 'hasGalerie' | 'hasSocial'

export interface FeatureDef {
  flag: GroupFeature
  /** Clé stockée dans les tables de dérogation */
  key: string
  label: string
  icon: string
  description: string
}

export const GROUP_FEATURES: FeatureDef[] = [
  { flag: 'hasParoles', key: 'group_paroles', icon: '🎤', label: 'Paroles & prompteur',
    description: 'Saisir les paroles d’un morceau et les faire défiler à l’écran.' },
  { flag: 'hasMetronome', key: 'group_metronome', icon: '🥁', label: 'Métronome du répertoire',
    description: 'Un tempo enregistré pour chaque morceau, avec métronome intégré.' },
  { flag: 'hasSequences', key: 'group_sequences', icon: '🎚', label: 'Lecteur de séquences',
    description: 'Jouer les pistes d’accompagnement d’un morceau pendant la répétition.' },
  { flag: 'hasEvaluations', key: 'group_evaluations', icon: '⭐', label: 'Auto-évaluation',
    description: 'Chacun note sa maîtrise des morceaux après une répétition.' },
  { flag: 'hasGrilles', key: 'group_grilles', icon: '🎸', label: 'Grilles d’accords',
    description: 'Créer et lire des grilles d’accords colorées, avec reprises et annotations.' },
  { flag: 'hasSetlists', key: 'group_setlists', icon: '🎶', label: 'Setlists',
    description: 'Préparer l’ordre des morceaux d’un concert.' },
  { flag: 'hasConcerts', key: 'group_concerts', icon: '🎭', label: 'Concerts',
    description: 'Planifier les concerts, suivre qui est présent, jouer en mode concert.' },
  { flag: 'hasFicheTechnique', key: 'group_fiche_technique', icon: '📋', label: 'Fiche technique',
    description: 'Plan de scène et besoins techniques, prêts à envoyer à la salle.' },
  { flag: 'hasUnavailabilities', key: 'group_indisponibilites', icon: '🗓', label: 'Disponibilités',
    description: 'Chacun indique ses indisponibilités pour caler les dates.' },
  { flag: 'hasPolls', key: 'group_sondages', icon: '🗳', label: 'Sondages',
    description: 'Proposer des dates ou des choix et recueillir les réponses.' },
  { flag: 'hasChat', key: 'group_chat', icon: '💬', label: 'Tchat du groupe',
    description: 'Discuter avec les membres sans quitter la plateforme.' },
  { flag: 'hasSharedResources', key: 'group_ressources', icon: '📒', label: 'Ressources partagées',
    description: 'Une bibliothèque de fichiers et de liens commune au groupe.' },
  { flag: 'hasGalerie', key: 'group_galerie', icon: '📸', label: 'Galerie photos',
    description: 'Partager les photos des répétitions et des concerts.' },
  { flag: 'hasAccounting', key: 'group_comptabilite', icon: '💶', label: 'Comptabilité',
    description: 'Suivre la caisse du groupe : recettes, dépenses, répartition.' },
  { flag: 'hasMaPage', key: 'group_ma_page', icon: '🌐', label: 'Page publique du groupe',
    description: 'Une page de présentation visible de tous, avec vos prochains concerts.' },
  { flag: 'hasSocial', key: 'group_social', icon: '📣', label: 'Atelier réseaux sociaux',
    description: 'Préparer les publications du groupe.' },
  { flag: 'hasStats', key: 'group_stats', icon: '📊', label: 'Statistiques',
    description: 'Présences, progression et activité du groupe.' },
]

export type FeatureFlags = Record<GroupFeature, boolean>

export const GROUP_FEATURE_KEYS: ReadonlySet<string> = new Set(GROUP_FEATURES.map((f) => f.key))

export const GROUP_FEATURE_PREFIX = 'group_'

export function featureKey(flag: GroupFeature): string {
  const def = GROUP_FEATURES.find((f) => f.flag === flag)
  if (!def) throw new Error(`Fonctionnalité inconnue : ${flag}`)
  return def.key
}

/** Les fonctionnalités de groupe, sous la forme attendue par l'écran d'administration. */
export function groupFeaturesAsModules(): ModuleDef[] {
  return GROUP_FEATURES.map((f) => ({
    key: f.key, label: f.label, description: f.description, icon: f.icon,
    href: '', category: 'groupe' as const,
  }))
}

/** Tout ouvert : valeur de départ quand aucun réglage de base n'est connu. */
export function allFeaturesOpen(): FeatureFlags {
  return Object.fromEntries(GROUP_FEATURES.map((f) => [f.flag, true])) as FeatureFlags
}

/**
 * Applique les dérogations au réglage de base.
 * Fonction pure, pour que la règle de priorité soit testable sans base de données.
 */
export function applyFeatureOverrides(
  base: Partial<FeatureFlags>,
  groupOverrides: Record<string, boolean> = {},
  userOverrides: Record<string, boolean> = {},
): FeatureFlags {
  const result = allFeaturesOpen()
  for (const f of GROUP_FEATURES) {
    let value = base[f.flag] ?? true
    if (f.key in groupOverrides) value = groupOverrides[f.key]
    if (f.key in userOverrides) value = userOverrides[f.key]
    result[f.flag] = value
  }
  return result
}

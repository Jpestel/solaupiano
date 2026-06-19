export type StandardPermissions = {
  create: boolean
  update: boolean
  delete: boolean
}

export type MembresPermissions = {
  add: boolean
  remove: boolean
  promote: boolean
}

export type StatsPermissions = {
  view: boolean
}

export type EstimationPermissions = {
  create: boolean
  save: boolean
  update: boolean
  delete: boolean
}

export type SocialPermissions = {
  post: boolean
}

export type ModulesPermissions = {
  reorder: boolean
}

export type ChefPermissions = {
  repetitions: StandardPermissions
  repertoire: StandardPermissions
  ressources: StandardPermissions
  setlists: StandardPermissions
  concerts: StandardPermissions
  grilles: StandardPermissions
  partitionsCarrees: StandardPermissions
  membres: MembresPermissions
  stats: StatsPermissions
  estimations: EstimationPermissions
  social: SocialPermissions
  modules: ModulesPermissions
}

export const DEFAULT_PERMISSIONS: ChefPermissions = {
  repetitions: { create: true, update: true, delete: true },
  repertoire:  { create: true, update: true, delete: true },
  ressources:  { create: true, update: true, delete: true },
  setlists:    { create: true, update: true, delete: true },
  concerts:    { create: true, update: true, delete: true },
  grilles:     { create: true, update: true, delete: true },
  partitionsCarrees: { create: true, update: true, delete: true },
  membres:     { add: true,    remove: true, promote: true },
  stats:       { view: true },
  estimations: { create: true, save: true, update: true, delete: true },
  social:      { post: true },
  modules:     { reorder: true },
}

/** Merge saved JSON over defaults (unknown fields are ignored, missing fields get defaults). */
export function resolvePermissions(saved: unknown): ChefPermissions {
  const result: ChefPermissions = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS))
  if (!saved || typeof saved !== 'object') return result
  const s = saved as Record<string, Record<string, boolean>>
  for (const mod of Object.keys(result) as (keyof ChefPermissions)[]) {
    if (s[mod] && typeof s[mod] === 'object') {
      for (const key of Object.keys(result[mod])) {
        if (typeof s[mod][key] === 'boolean') {
          ;(result[mod] as Record<string, boolean>)[key] = s[mod][key]
        }
      }
    }
  }
  return result
}

/**
 * Returns true if this user can perform the action:
 *  - site admins always can
 *  - the group founder always can
 *  - co-chefs depend on the stored chefPermissions (default: all true)
 */
export function coChefCanDo(
  group: { createdBy: number | null; chefPermissions: unknown },
  userId: number,
  isAdmin: boolean,
  module: keyof ChefPermissions,
  action: string
): boolean {
  if (isAdmin) return true
  if (group.createdBy === userId) return true
  const perms = resolvePermissions(group.chefPermissions)
  return (perms[module] as Record<string, boolean>)[action] ?? true
}

// Human-readable labels for the permission matrix
export const MODULE_LABELS: Record<keyof ChefPermissions, string> = {
  repetitions: 'Répétitions',
  repertoire:  'Répertoire',
  ressources:  'Ressources',
  setlists:    'Setlists',
  concerts:    'Concerts',
  grilles:     "Grilles d'accords",
  partitionsCarrees: 'Partitions carrées',
  membres:     'Membres',
  stats:       'Statistiques',
  estimations: 'Estimation de cachet',
  social:      'Réseaux sociaux',
  modules:     'Modules',
}

export const MODULE_ICONS: Record<keyof ChefPermissions, string> = {
  repetitions: '🎵',
  repertoire:  '🎼',
  ressources:  '📎',
  setlists:    '🎶',
  concerts:    '🎭',
  grilles:     '🎸',
  partitionsCarrees: '▦',
  membres:     '👥',
  stats:       '📊',
  estimations: '💰',
  social:      '📣',
  modules:     '🧩',
}

export const ACTION_LABELS: Record<string, string> = {
  create:  'Créer',
  save:    'Sauvegarder',
  update:  'Modifier',
  delete:  'Supprimer',
  add:     'Ajouter',
  remove:  'Retirer',
  promote: 'Promouvoir',
  view:    'Consulter',
  post:    'Publier',
  reorder: 'Réordonner',
}

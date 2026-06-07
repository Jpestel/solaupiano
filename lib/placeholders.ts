// Système de personnalisation des placeholders (textes d'exemple des formulaires).
// Les valeurs par défaut sont générées depuis le code (placeholders-registry).
// L'admin peut les surcharger ; les surcharges sont injectées au chargement via setPlaceholders().

import { PLACEHOLDER_REGISTRY as AUTO_REGISTRY, type PlaceholderEntry } from './placeholders-registry'
import { MANUAL_PLACEHOLDERS } from './placeholders-manual'

export type { PlaceholderEntry }

// Registre complet : placeholders auto-détectés + placeholders dynamiques manuels
export const PLACEHOLDER_REGISTRY: PlaceholderEntry[] = [...AUTO_REGISTRY, ...MANUAL_PLACEHOLDERS]

// Map clé -> texte par défaut (issu du code)
export const PLACEHOLDER_DEFAULTS: Record<string, string> = Object.fromEntries(
  PLACEHOLDER_REGISTRY.map((e) => [e.key, e.default])
)

// Registre groupé par formulaire (pour l'admin)
export interface PlaceholderGroup {
  group: string
  items: PlaceholderEntry[]
}
export const PLACEHOLDER_GROUPS: PlaceholderGroup[] = (() => {
  const order: string[] = []
  const byGroup: Record<string, PlaceholderEntry[]> = {}
  for (const e of PLACEHOLDER_REGISTRY) {
    if (!byGroup[e.group]) { byGroup[e.group] = []; order.push(e.group) }
    byGroup[e.group].push(e)
  }
  return order.map((group) => ({ group, items: byGroup[group] }))
})()

// Cache module : démarre avec les valeurs par défaut (zéro régression si les
// surcharges ne sont pas chargées). setPlaceholders() applique les surcharges admin.
let CURRENT: Record<string, string> = { ...PLACEHOLDER_DEFAULTS }

/** Applique les surcharges (clé nue -> valeur). Conserve les défauts pour le reste. */
export function setPlaceholders(overrides: Record<string, string> | null | undefined) {
  CURRENT = { ...PLACEHOLDER_DEFAULTS }
  if (overrides) {
    for (const [k, v] of Object.entries(overrides)) {
      if (typeof v === 'string' && v.length > 0) CURRENT[k] = v
    }
  }
}

/** Retourne le placeholder personnalisé pour cette clé (ou la valeur par défaut). */
export function ph(key: string): string {
  return CURRENT[key] ?? PLACEHOLDER_DEFAULTS[key] ?? ''
}

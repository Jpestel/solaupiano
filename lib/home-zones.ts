// Zones réordonnables de la page d'accueil (sous le hero). L'admin règle l'ordre
// (haut → bas) et la visibilité de chaque zone. Stocké en siteSetting `home_zones`
// = JSON [{ key, visible }] dans l'ordre voulu. Le hero (en-tête) et le pied de
// page ne sont pas concernés : ils restent respectivement en haut et en bas.

export interface HomeZoneDef {
  key: string
  label: string
  description: string
}

export const HOME_ZONES: HomeZoneDef[] = [
  { key: 'concerts', label: 'Concerts à venir', description: 'Carte et liste des concerts publics + encart « ajoutez vos concerts ».' },
  { key: 'features', label: 'Fonctionnalités', description: 'Grille des fonctionnalités de la plateforme.' },
  { key: 'community', label: 'Communauté', description: 'Styles et instruments représentés (masqué si vide).' },
  { key: 'groups', label: 'Groupes inscrits', description: 'Cartes de découverte des groupes.' },
  { key: 'annonces', label: 'Petites annonces', description: 'Encart vers les petites annonces.' },
  { key: 'newsletter', label: 'Newsletter', description: 'Encart d’inscription à la newsletter.' },
]

export interface HomeZone {
  key: string
  visible: boolean
}

export function defaultHomeZones(): HomeZone[] {
  return HOME_ZONES.map((z) => ({ key: z.key, visible: true }))
}

// Parse la config sauvegardée en conservant un ordre robuste : on ne garde que les
// clés connues, on dédoublonne, et on ajoute en fin les zones absentes (nouveautés).
export function parseHomeZones(raw: string | null | undefined): HomeZone[] {
  if (!raw) return defaultHomeZones()
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return defaultHomeZones()
    const known = new Set(HOME_ZONES.map((z) => z.key))
    const seen = new Set<string>()
    const ordered: HomeZone[] = []
    for (const item of arr) {
      const key = item?.key
      if (typeof key === 'string' && known.has(key) && !seen.has(key)) {
        ordered.push({ key, visible: item.visible !== false })
        seen.add(key)
      }
    }
    for (const z of HOME_ZONES) if (!seen.has(z.key)) ordered.push({ key: z.key, visible: true })
    return ordered
  } catch {
    return defaultHomeZones()
  }
}

'use client'

import { setPlaceholders } from '@/lib/placeholders'

// Applique les surcharges de placeholders dès le rendu (avant les enfants),
// côté serveur (SSR) comme côté client. Ne rend rien.
// setPlaceholders est idempotent et peu coûteux : on l'applique à chaque rendu
// pour rester à jour après une modification admin.
export function PlaceholderInit({ values }: { values: Record<string, string> }) {
  setPlaceholders(values)
  return null
}

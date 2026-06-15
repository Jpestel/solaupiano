import { cookies } from 'next/headers'

// Contexte d'« aperçu par rôle » : un admin choisit de voir un groupe comme
// le verrait un Chef ou un Musicien (lecture seule). Stocké en cookie.
export const PREVIEW_COOKIE = 'preview_as'

export type PreviewContext = {
  groupId: number
  groupName: string
  role: 'CHEF' | 'MEMBRE'
}

// Lit le contexte d'aperçu depuis le cookie. Renvoie null si absent/invalide.
export function getPreviewContext(): PreviewContext | null {
  const raw = cookies().get(PREVIEW_COOKIE)?.value
  if (!raw) return null
  try {
    const p = JSON.parse(raw)
    if (
      typeof p?.groupId === 'number' &&
      typeof p?.groupName === 'string' &&
      (p.role === 'CHEF' || p.role === 'MEMBRE')
    ) {
      return { groupId: p.groupId, groupName: p.groupName, role: p.role }
    }
  } catch {}
  return null
}

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasModuleAccess } from '@/lib/module-access'

/** Utilisateur autorisé à se servir du module « reprises », ou null. */
export async function reprisesUser(): Promise<{ userId: number } | null> {
  const session = await getServerSession(authOptions)
  if (!session) return null
  const userId = Number(session.user.id)
  if (session.user.siteRole === 'ADMIN' || await hasModuleAccess(userId, 'tool_reprises')) return { userId }
  return null
}

export const REPRISES_MAX_BYTES = 25 * 1024 * 1024
export const REPRISES_TYPES: Record<string, 'image' | 'pdf'> = {
  'application/pdf': 'pdf', 'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image', 'image/gif': 'image',
}

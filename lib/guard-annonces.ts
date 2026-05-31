import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from './auth'
import { hasModuleAccess } from './module-access'

/**
 * Garde l'accès aux petites annonces.
 * - Visiteur non connecté : accès libre (vitrine publique).
 * - Utilisateur connecté : nécessite le module feature_annonces (selon son plan).
 */
export async function guardAnnonces() {
  const session = await getServerSession(authOptions)
  if (!session) return // visiteur public

  const userId = Number(session.user.id)
  const ok = await hasModuleAccess(userId, 'feature_annonces')
  if (!ok) redirect('/tableau-de-bord?module_bloque=Petites annonces')
}

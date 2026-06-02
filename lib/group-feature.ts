import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from './auth'
import { prisma } from './prisma'

export type GroupFeature =
  | 'hasGrilles' | 'hasSetlists' | 'hasConcerts'
  | 'hasFicheTechnique' | 'hasMaPage' | 'hasStats'
  | 'hasParoles' | 'hasMetronome' | 'hasSequences' | 'hasEvaluations' | 'hasAccounting'
  | 'hasChat' | 'hasSharedResources' | 'hasUnavailabilities' | 'hasPolls'

/**
 * Garde serveur pour une fonctionnalité de groupe.
 * Redirige vers la page du groupe si le plan ne l'inclut pas (sauf admin).
 */
export async function guardGroupFeature(groupId: number, feature: GroupFeature) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/connexion')
  if (session.user.siteRole === 'ADMIN') return

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { plan: true } })
  if (!group) redirect('/groupes')

  const plan = await prisma.plan.findUnique({
    where: { key: group.plan },
    select: { hasGrilles: true, hasSetlists: true, hasConcerts: true, hasFicheTechnique: true, hasMaPage: true, hasStats: true, hasParoles: true, hasMetronome: true, hasSequences: true, hasEvaluations: true, hasAccounting: true, hasChat: true, hasSharedResources: true, hasUnavailabilities: true, hasPolls: true },
  })
  // Pas de plan trouvé → on laisse passer (défaut permissif)
  if (!plan) return

  if (plan[feature] === false) {
    redirect(`/groupes/${groupId}?feature_bloquee=1`)
  }
}

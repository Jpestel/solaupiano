import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from './auth'
import { prisma } from './prisma'
import {
  GROUP_FEATURES, GROUP_FEATURE_PREFIX, applyFeatureOverrides,
  type FeatureFlags, type GroupFeature,
} from './features'

export type { GroupFeature } from './features'

const toMap = (rows: { moduleKey: string; allowed: boolean }[]) =>
  Object.fromEntries(rows.map((r) => [r.moduleKey, r.allowed])) as Record<string, boolean>

/**
 * Fonctionnalités effectivement actives pour un groupe, et pour une personne si
 * `userId` est fourni. Règle de priorité : voir lib/features.ts.
 *
 * Toute vérification de fonctionnalité de groupe doit passer par ici : lire
 * directement les indicateurs du plan contournerait les dérogations de
 * l'administrateur.
 */
export async function resolveGroupFeatures(groupId: number, userId?: number | null): Promise<FeatureFlags> {
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { plan: true } })
  const select = Object.fromEntries(GROUP_FEATURES.map((f) => [f.flag, true])) as Record<GroupFeature, true>
  const plan = group ? await prisma.plan.findUnique({ where: { key: group.plan }, select }) : null

  const [groupRows, userRows] = await Promise.all([
    prisma.moduleGroupOverride.findMany({
      where: { groupId, moduleKey: { startsWith: GROUP_FEATURE_PREFIX } },
      select: { moduleKey: true, allowed: true },
    }),
    userId
      ? prisma.moduleUserOverride.findMany({
          where: { userId, moduleKey: { startsWith: GROUP_FEATURE_PREFIX } },
          select: { moduleKey: true, allowed: true },
        })
      : Promise.resolve([]),
  ])

  // Pas de plan trouvé → ouvert par défaut (comportement historique).
  return applyFeatureOverrides(plan ?? {}, toMap(groupRows), toMap(userRows))
}

/**
 * Garde serveur pour une fonctionnalité de groupe.
 * Redirige vers la page du groupe si elle n'est pas activée (sauf admin).
 */
export async function guardGroupFeature(groupId: number, feature: GroupFeature) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/connexion')
  if (session.user.siteRole === 'ADMIN') return

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { id: true } })
  if (!group) redirect('/groupes')

  const features = await resolveGroupFeatures(groupId, Number(session.user.id))
  if (features[feature] === false) {
    redirect(`/groupes/${groupId}?feature_bloquee=1`)
  }
}

import { prisma } from './prisma'
import { resolvePermissions } from './permissions'

export type EstimationAction = 'create' | 'save' | 'update' | 'delete'

export interface EstimationAccess {
  storage: boolean   // accès au stockage (plan perso OU groupe)
  create: boolean
  save: boolean
  update: boolean
  delete: boolean
}

const FULL: EstimationAccess = { storage: true, create: true, save: true, update: true, delete: true }
const NONE: EstimationAccess = { storage: false, create: false, save: false, update: false, delete: false }

/**
 * Détermine les droits d'un utilisateur sur les estimations de cachet.
 *
 * Règles :
 *  - Admin site : accès total
 *  - Plan personnel avec stockage : accès total (ce sont SES données)
 *  - Sinon, accès via les groupes où il est chef/co-chef et dont le plan
 *    inclut du stockage :
 *      • fondateur du groupe → accès total
 *      • co-chef → permissions définies par le fondateur (union sur tous
 *        les groupes éligibles)
 */
export async function getEstimationAccess(
  userId: number,
  userPlan: string,
  isAdmin: boolean
): Promise<EstimationAccess> {
  if (isAdmin) return { ...FULL }

  // 1. Plan personnel avec stockage
  const personalPlan = await prisma.plan.findUnique({
    where: { key: userPlan },
    select: { storageGb: true },
  })
  if (personalPlan && Number(personalPlan.storageGb) > 0) return { ...FULL }

  // 2. Groupes où l'utilisateur est chef
  const chefMemberships = await prisma.groupMember.findMany({
    where: { userId, groupRole: 'CHEF' },
    select: { group: { select: { plan: true, createdBy: true, chefPermissions: true } } },
  })
  if (chefMemberships.length === 0) return { ...NONE }

  const planKeys = [...new Set(chefMemberships.map(m => m.group.plan))]
  const plans = await prisma.plan.findMany({
    where: { key: { in: planKeys } },
    select: { key: true, storageGb: true },
  })
  const hasStorage = Object.fromEntries(plans.map(p => [p.key, Number(p.storageGb) > 0]))

  const acc: EstimationAccess = { ...NONE }
  for (const m of chefMemberships) {
    if (!hasStorage[m.group.plan]) continue
    acc.storage = true
    if (m.group.createdBy === userId) return { ...FULL }   // fondateur
    const e = resolvePermissions(m.group.chefPermissions).estimations
    if (e.create) acc.create = true
    if (e.save)   acc.save   = true
    if (e.update) acc.update = true
    if (e.delete) acc.delete = true
  }
  return acc
}

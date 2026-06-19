import { prisma } from './prisma'

export async function isModuleEnabledForPlan(planKey: string, moduleKey: string): Promise<boolean> {
  const record = await prisma.moduleAccess.findUnique({
    where: { moduleKey_planKey: { moduleKey, planKey } },
    select: { enabled: true },
  })
  return record?.enabled ?? true
}

export async function isModuleEnabledForGroup(groupId: number, moduleKey: string): Promise<boolean> {
  const groupOverride = await prisma.moduleGroupOverride.findUnique({
    where: { moduleKey_groupId: { moduleKey, groupId } },
    select: { allowed: true },
  })
  if (groupOverride !== null) return groupOverride.allowed

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { plan: true },
  })
  if (!group) return false

  return isModuleEnabledForPlan(group.plan, moduleKey)
}

/**
 * Check if a user has access to a module.
 *
 * Priority chain:
 * 1. ModuleUserOverride (per-user allow/block) — highest priority
 * 2. ModuleGroupOverride (per-group allow/block) — any group the user belongs to
 * 3. ModuleAccess (per-plan allow/block)
 * 4. Default: open (true) if no rules configured
 */
export async function hasModuleAccess(userId: number, moduleKey: string): Promise<boolean> {
  // 1. User override
  const userOverride = await prisma.moduleUserOverride.findUnique({
    where: { moduleKey_userId: { moduleKey, userId } },
  })
  if (userOverride !== null) return userOverride.allowed

  // 2. Group override — check all groups the user belongs to
  //    If ANY group has an explicit override, use it (allow wins over block at group level)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      groups: {
        select: { groupId: true },
      },
    },
  })
  if (user && user.groups.length > 0) {
    const groupIds = user.groups.map(g => g.groupId)
    const groupOverrides = await prisma.moduleGroupOverride.findMany({
      where: { moduleKey, groupId: { in: groupIds } },
    })
    if (groupOverrides.length > 0) {
      // "allowed" wins: if any group grants access, grant it
      return groupOverrides.some(o => o.allowed)
    }
  }

  // 3. Plan-based access — résolu sur l'ensemble des plans applicables à l'utilisateur :
  //    - le plan de chacun de ses groupes (le plan du groupe paie / débloque)
  //    - son plan utilisateur (MUSICIEN / CREATEUR) en complément
  //    Règle "meilleur plan gagne" : si AU MOINS un plan autorise le module, c'est autorisé.
  //    Pour un plan donné, l'absence d'enregistrement ModuleAccess = ouvert (permissif).
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      userPlan: true,
      groups: { select: { group: { select: { plan: true } } } },
    },
  })
  if (userRecord) {
    // Les plans de groupe priment (c'est l'abonnement du groupe qui débloque).
    // L'utilisateur sans aucun groupe est évalué sur son plan personnel (MUSICIEN).
    const candidatePlans = new Set<string>()
    if (userRecord.groups.length > 0) {
      for (const g of userRecord.groups) candidatePlans.add(g.group.plan)
    } else {
      candidatePlans.add(userRecord.userPlan)
    }

    const records = await prisma.moduleAccess.findMany({
      where: { moduleKey, planKey: { in: [...candidatePlans] } },
    })
    const recordByPlan = new Map(records.map(r => [r.planKey, r.enabled]))

    // Pour chaque plan candidat : autorisé si pas d'enregistrement (ouvert) OU enabled=true
    for (const plan of candidatePlans) {
      const rec = recordByPlan.get(plan)
      if (rec === undefined || rec === true) return true   // meilleur plan gagne
    }
    // Tous les plans candidats ont un enregistrement explicite à false
    return false
  }

  // 4. Default: open to all
  return true
}

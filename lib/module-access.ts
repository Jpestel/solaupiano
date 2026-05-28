import { prisma } from './prisma'

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

  // 3. Plan-based access — check user's plan
  // Get user's plan (userPlan field on User)
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { userPlan: true },
  })
  if (userRecord) {
    const planAccess = await prisma.moduleAccess.findUnique({
      where: { moduleKey_planKey: { moduleKey, planKey: userRecord.userPlan } },
    })
    if (planAccess !== null) return planAccess.enabled
  }

  // 4. Default: open to all
  return true
}

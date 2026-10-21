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
 * Règle de décision, sans accès à la base : une seule source de vérité pour
 * l'accès d'un utilisateur à un module (lecture unitaire comme lecture groupée).
 *
 * Priorité :
 * 1. dérogation par utilisateur (autoriser / bloquer) — la plus forte
 * 2. dérogation par groupe, parmi les groupes de l'utilisateur :
 *    « autorisé » l'emporte si au moins un groupe autorise
 * 3. accès par plan : « meilleur plan gagne » — autorisé si AU MOINS un plan
 *    candidat autorise ; l'absence d'enregistrement pour un plan = ouvert
 * 4. ouvert par défaut
 */
export function decideModuleAccess(input: {
  userOverride: boolean | null
  groupOverrides: boolean[]
  candidatePlans: string[]
  planRules: Map<string, boolean>
}): boolean {
  if (input.userOverride !== null) return input.userOverride
  if (input.groupOverrides.length > 0) return input.groupOverrides.some(Boolean)
  for (const plan of input.candidatePlans) {
    const rule = input.planRules.get(plan)
    if (rule === undefined || rule === true) return true
  }
  return false
}

/**
 * Accès d'un utilisateur à plusieurs modules d'un coup (quelques requêtes au
 * total, quel que soit le nombre de modules). Sert aussi bien à l'accès
 * unitaire qu'au menu, qui doit savoir ce qu'il faut masquer.
 */
export async function moduleAccessMap(userId: number, moduleKeys: string[]): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {}
  if (moduleKeys.length === 0) return result

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { userPlan: true, groups: { select: { groupId: true, group: { select: { plan: true } } } } },
  })
  // Utilisateur introuvable : comportement historique, ouvert.
  if (!user) { for (const k of moduleKeys) result[k] = true; return result }

  const groupIds = user.groups.map((g) => g.groupId)
  // Les plans de groupe priment ; sans groupe, on retombe sur le plan personnel.
  const candidatePlans = user.groups.length > 0
    ? Array.from(new Set(user.groups.map((g) => g.group.plan)))
    : [user.userPlan]

  const [userRows, groupRows, planRows] = await Promise.all([
    prisma.moduleUserOverride.findMany({ where: { userId, moduleKey: { in: moduleKeys } }, select: { moduleKey: true, allowed: true } }),
    groupIds.length > 0
      ? prisma.moduleGroupOverride.findMany({ where: { groupId: { in: groupIds }, moduleKey: { in: moduleKeys } }, select: { moduleKey: true, allowed: true } })
      : Promise.resolve([] as { moduleKey: string; allowed: boolean }[]),
    prisma.moduleAccess.findMany({ where: { planKey: { in: candidatePlans }, moduleKey: { in: moduleKeys } }, select: { moduleKey: true, planKey: true, enabled: true } }),
  ])

  for (const key of moduleKeys) {
    const userOverride = userRows.find((r) => r.moduleKey === key)
    result[key] = decideModuleAccess({
      userOverride: userOverride ? userOverride.allowed : null,
      groupOverrides: groupRows.filter((r) => r.moduleKey === key).map((r) => r.allowed),
      candidatePlans,
      planRules: new Map(planRows.filter((r) => r.moduleKey === key).map((r) => [r.planKey, r.enabled])),
    })
  }
  return result
}

/** Un utilisateur a-t-il accès à un module ? (règle : voir decideModuleAccess) */
export async function hasModuleAccess(userId: number, moduleKey: string): Promise<boolean> {
  return (await moduleAccessMap(userId, [moduleKey]))[moduleKey]
}

/**
 * Un module de GROUPE (tâches, partitions carrées, dictaphone…) est-il ouvert à
 * cette personne dans ce groupe ? La dérogation utilisateur prime sur celle du
 * groupe, qui prime sur le plan — comme pour les autres modules. Sans cela, une
 * dérogation posée sur une personne dans l'administration n'aurait aucun effet.
 */
export async function isModuleEnabledForUserInGroup(userId: number, groupId: number, moduleKey: string): Promise<boolean> {
  const userOverride = await prisma.moduleUserOverride.findUnique({
    where: { moduleKey_userId: { moduleKey, userId } },
    select: { allowed: true },
  })
  if (userOverride) return userOverride.allowed
  return isModuleEnabledForGroup(groupId, moduleKey)
}

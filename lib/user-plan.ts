import { prisma } from './prisma'

// Le plan est porté par l'UTILISATEUR (user.accountPlan). Il gouverne le nombre
// de groupes gérables, le stockage mutualisé et les fonctionnalités. Pour ne pas
// réécrire toute la logique existante (qui lit group.plan), on RÉPERCUTE le plan
// du compte sur tous les groupes fondés par l'utilisateur : group.plan devient
// un simple reflet de user.accountPlan.

/**
 * Plan donné à un NOUVEAU groupe.
 *
 * Sol au piano est gratuit et sur invitation : plus aucun plan n'est montré aux
 * utilisateurs, qui ne peuvent donc ni comprendre ni lever les limites du plan
 * « Gratuit » (peu de membres, de morceaux, ~15 Mo de stockage). Tout nouveau
 * groupe démarre donc avec le plan le plus complet, quel que soit le plan du
 * compte de son fondateur. Le plan du compte, lui, reste inchangé : il continue
 * de gouverner le nombre de groupes qu'une personne peut gérer.
 *
 * Si ce plan n'existe plus (ou est désactivé), on retombe sur celui du fondateur
 * plutôt que d'écrire une clé de plan inconnue.
 */
export const NEW_GROUP_PLAN = 'PREMIUM'

export async function planForNewGroup(founderPlanKey: string): Promise<string> {
  const plan = await prisma.plan.findUnique({ where: { key: NEW_GROUP_PLAN }, select: { isActive: true } })
  return plan?.isActive ? NEW_GROUP_PLAN : founderPlanKey
}

// Renvoie le plan effectif d'un utilisateur (clé du plan, ex. FREE/PRO/PREMIUM).
export async function getUserPlanKey(userId: number): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { accountPlan: true } })
  return u?.accountPlan ?? 'FREE'
}

// Définit le plan d'un utilisateur et le répercute sur tous ses groupes fondés.
// expiresAt (optionnel) est appliqué aux groupes (cohérent avec l'existant).
export async function setUserPlan(userId: number, planKey: string, expiresAt?: Date | null) {
  // Vérifie que le plan existe.
  const plan = await prisma.plan.findUnique({ where: { key: planKey }, select: { key: true } })
  if (!plan) throw new Error('Plan inconnu')

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { accountPlan: planKey } }),
    prisma.group.updateMany({
      where: { createdBy: userId },
      data: { plan: planKey, planExpiresAt: expiresAt ?? null },
    }),
  ])
}

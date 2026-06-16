import { prisma } from './prisma'

// Le plan est porté par l'UTILISATEUR (user.accountPlan). Il gouverne le nombre
// de groupes gérables, le stockage mutualisé et les fonctionnalités. Pour ne pas
// réécrire toute la logique existante (qui lit group.plan), on RÉPERCUTE le plan
// du compte sur tous les groupes fondés par l'utilisateur : group.plan devient
// un simple reflet de user.accountPlan.

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

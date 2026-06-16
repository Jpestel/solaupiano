// Rétro-remplit user.accountPlan = meilleur plan parmi les groupes fondés.
// À lancer une fois après l'ajout du champ accountPlan.
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const TIER = { FREE: 0, PRO: 1, PREMIUM: 2 }

const founded = await prisma.group.findMany({
  where: { createdBy: { not: null } },
  select: { createdBy: true, plan: true },
})

const best = new Map() // userId -> planKey
for (const g of founded) {
  const cur = best.get(g.createdBy) ?? 'FREE'
  if ((TIER[g.plan] ?? 0) > (TIER[cur] ?? 0)) best.set(g.createdBy, g.plan)
  else best.set(g.createdBy, cur)
}

let updated = 0
for (const [userId, plan] of best) {
  if (plan && plan !== 'FREE') {
    await prisma.user.update({ where: { id: userId }, data: { accountPlan: plan } })
    updated++
  }
}

console.log(`Backfill terminé : ${updated} compte(s) mis à jour sur ${best.size} fondateur(s).`)
await prisma.$disconnect()

// Marque le compte testeur existant comme « de test » et répercute sur ses
// groupes fondés. À lancer une fois après l'ajout du champ isTest.
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const TEST_EMAILS = ['testeur@solaupiano.fr']

for (const email of TEST_EMAILS) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) { console.log(`(absent) ${email}`); continue }
  await prisma.user.update({ where: { id: user.id }, data: { isTest: true } })
  const res = await prisma.group.updateMany({ where: { createdBy: user.id }, data: { isTest: true } })
  console.log(`✓ ${email} → isTest=true (+ ${res.count} groupe(s) fondé(s))`)
}

await prisma.$disconnect()

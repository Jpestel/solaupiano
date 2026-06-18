import { prisma } from './prisma'

// Gestion des données de test. Un compte peut être marqué « de test »
// (user.isTest). Ce statut se RÉPERCUTE sur tous les groupes fondés par ce
// compte (group.isTest), si bien que tout leur contenu (concerts, répétitions,
// titres…) est rattaché à un groupe de test. Les données de test sont exclues
// des compteurs admin, des stats d'usage et du site public, et isolées dans
// une section à part dans les listes d'administration.

// Filtre Prisma réutilisable pour ne garder que le réel.
export const NOT_TEST_USER = { isTest: false } as const
export const NOT_TEST_GROUP = { isTest: false } as const

// Marque/démarque un compte comme « de test » et répercute sur ses groupes fondés.
export async function setUserTestFlag(userId: number, isTest: boolean) {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { isTest } }),
    prisma.group.updateMany({ where: { createdBy: userId }, data: { isTest } }),
  ])
}

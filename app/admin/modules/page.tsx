import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MODULES } from '@/lib/modules'
import { ModulesManager } from './ModulesManager'

export const metadata = { title: 'Gestion des modules — Admin' }

export default async function AdminModulesPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') redirect('/tableau-de-bord')

  // Load all plans
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { key: true, label: true, color: true },
  })

  // Load all module-plan access rules
  const planAccess = await prisma.moduleAccess.findMany()

  // Load user overrides with user info
  const userOverrides = await prisma.moduleUserOverride.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { moduleKey: 'asc' },
  })

  // Load group overrides with group info
  const groupOverrides = await prisma.moduleGroupOverride.findMany({
    include: {
      group: { select: { id: true, name: true } },
    },
    orderBy: { moduleKey: 'asc' },
  })

  // Load users for the override picker
  const users = await prisma.user.findMany({
    where: { siteRole: 'USER' },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  // Load groups for the override picker
  const groups = await prisma.group.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <ModulesManager
      modules={MODULES}
      plans={plans}
      planAccess={planAccess}
      userOverrides={userOverrides}
      groupOverrides={groupOverrides}
      users={users}
      groups={groups}
    />
  )
}

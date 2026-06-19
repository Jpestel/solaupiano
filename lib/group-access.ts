import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { prisma } from './prisma'
import { isModuleEnabledForGroup } from './module-access'

export interface GroupContext {
  userId: number
  isAdmin: boolean
  isChef: boolean
}

// Contexte d'accès d'un membre à un groupe (null si non autorisé).
export async function groupContext(groupId: number): Promise<GroupContext | null> {
  const session = await getServerSession(authOptions)
  if (!session) return null
  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!isAdmin && !membership) return null
  return { userId, isAdmin, isChef: isAdmin || membership?.groupRole === 'CHEF' }
}

export async function groupHasModuleAccess(ctx: GroupContext, groupId: number, moduleKey: string): Promise<boolean> {
  if (ctx.isAdmin) return true
  return isModuleEnabledForGroup(groupId, moduleKey)
}

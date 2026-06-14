import { guardGroupFeature } from '@/lib/group-feature'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'

export default async function SocialLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  const groupId = Number(params.id)
  await guardGroupFeature(groupId, 'hasSocial')

  const session = await getServerSession(authOptions)
  if (!session) redirect('/connexion')
  const isAdmin = session.user.siteRole === 'ADMIN'

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { createdBy: true, chefPermissions: true } })
  if (!group) redirect('/groupes')

  if (!coChefCanDo({ createdBy: group.createdBy ?? null, chefPermissions: group.chefPermissions ?? null }, Number(session.user.id), isAdmin, 'social', 'post')) {
    redirect(`/groupes/${groupId}`)
  }
  return <>{children}</>
}

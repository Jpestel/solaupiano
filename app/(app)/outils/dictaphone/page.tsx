import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DictaphonePageClient } from './page-client'

export const dynamic = 'force-dynamic'

export default async function DictaphonePage() {
  const session = await getServerSession(authOptions)
  const userId = Number(session?.user.id)
  const isAdmin = session?.user.siteRole === 'ADMIN'

  const groups = isAdmin
    ? await prisma.group.findMany({
        where: { archivedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : await prisma.groupMember.findMany({
        where: { userId, group: { archivedAt: null } },
        select: { group: { select: { id: true, name: true } } },
        orderBy: { group: { name: 'asc' } },
      }).then((items) => items.map((item) => item.group))

  return <DictaphonePageClient groups={groups} />
}

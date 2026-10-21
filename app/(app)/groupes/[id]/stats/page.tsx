import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { resolvePermissions } from '@/lib/permissions'
import { resolveGroupFeatures } from '@/lib/group-feature'
import { StatsClient } from './StatsClient'

export const dynamic = 'force-dynamic'

export default async function StatsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const groupId = Number(params.id)

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })

  if (!isAdmin && !membership) notFound()

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, name: true, plan: true, createdBy: true, chefPermissions: true },
  })

  if (!group) notFound()

  const isChef = isAdmin || membership?.groupRole === 'CHEF'

  // Only chefs and co-chefs with stats.view can access
  if (!isChef) redirect(`/groupes/${groupId}`)

  const isFounder = isAdmin || group.createdBy === userId
  if (!isFounder) {
    const perms = resolvePermissions(group.chefPermissions)
    if (!perms.stats.view) redirect(`/groupes/${groupId}`)
  }

  // Fonctionnalité activée pour ce groupe et cette personne ? (admin = oui)
  const features = await resolveGroupFeatures(groupId, userId)
  if (!isAdmin && !features.hasStats) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="text-5xl mb-4">📊</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Statistiques</h1>
        <p className="text-gray-500 mb-6">
          Cette fonctionnalité n&apos;est pas activée pour votre groupe.
          Si vous souhaitez l&apos;utiliser, écrivez à l&apos;éditeur du site.
        </p>
        <Link
          href={`/groupes/${groupId}`}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          ← Retour au groupe
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
          <span>/</span>
          <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">{group.name}</Link>
          <span>/</span>
          <span className="text-gray-900">Statistiques</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📊 Statistiques</h1>
            <p className="text-sm text-gray-500 mt-1">Analyses et indicateurs clés de votre groupe</p>
          </div>
          <Link
            href={`/groupes/${groupId}`}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ← Retour
          </Link>
        </div>
      </div>

      <StatsClient groupId={groupId} />
    </div>
  )
}


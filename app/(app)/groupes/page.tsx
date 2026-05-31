import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { RoleBadge } from '@/components/ui/Badge'
import { CreateGroupButton } from './CreateGroupButton'
import { JoinPublicGroupsSection } from './JoinPublicGroupsSection'
import { QuickInvite } from './QuickInvite'

export default async function GroupesPage() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  // Treat missing userPlan (old sessions) as CREATEUR to avoid blocking existing users
  const canCreateGroup = isAdmin || !session.user.userPlan || session.user.userPlan === 'CREATEUR'

  // ── Vue admin : tous les groupes avec droits chef ──────────────────────
  if (isAdmin) {
    const allGroups = await prisma.group.findMany({
      include: {
        _count: { select: { members: true, rehearsals: true, songs: true } },
      },
      orderBy: { name: 'asc' },
    })

    return (
      <div>
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tous les groupes</h1>
            <p className="text-gray-500 mt-1 text-sm">
              En tant qu&apos;administrateur, vous avez les droits chef sur tous les groupes.
            </p>
          </div>
          {canCreateGroup && <CreateGroupButton />}
        </div>

        {allGroups.length === 0 ? (
          <Card>
            <div className="text-center py-10">
              <div className="text-5xl mb-4">🎶</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun groupe pour l&apos;instant</h3>
              <p className="text-gray-500 text-sm">Créez le premier groupe de la plateforme.</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {allGroups.map((group) => (
              <div key={group.id} className="relative">
                <Link href={`/groupes/${group.id}`}>
                  <Card className="h-full hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg flex-shrink-0">
                        {group.coverUrl
                          ? <img src={group.coverUrl} alt={group.name} className="w-full h-full object-cover" />
                          : group.name.charAt(0)
                        }
                      </div>
                      <RoleBadge role="CHEF" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{group.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 pr-20">
                      <span>{group._count.members} membre{group._count.members > 1 ? 's' : ''}</span>
                      <span>{group._count.rehearsals} répétition{group._count.rehearsals > 1 ? 's' : ''}</span>
                      <span>{group._count.songs} morceau{group._count.songs > 1 ? 'x' : ''}</span>
                    </div>
                  </Card>
                </Link>
                <QuickInvite groupId={group.id} groupName={group.name} />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Vue membre normal ──────────────────────────────────────────────────
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          _count: { select: { members: true, rehearsals: true, songs: true } },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })

  const memberGroupIds = memberships.map((m) => m.groupId)

  const formerGroups = await prisma.groupMemberHistory.findMany({
    where: { userId },
    orderBy: { leftAt: 'desc' },
  })

  const availableGroups = await prisma.group.findMany({
    where: { id: { notIn: memberGroupIds }, isHidden: false },
    select: {
      id: true,
      name: true,
      description: true,
      isPublic: true,
      lookingFor: true,
      lookingForSince: true,
      _count: { select: { members: true } },
      joinRequests: {
        where: { userId },
        select: { id: true, status: true },
      },
    },
    orderBy: [{ isPublic: 'desc' }, { name: 'asc' }],
  })

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes groupes</h1>
          <p className="text-gray-500 mt-1 text-sm">Groupes musicaux dont vous êtes membre.</p>
        </div>
        {canCreateGroup && <CreateGroupButton />}
      </div>

      {memberships.length === 0 ? (
        <Card>
          <div className="text-center py-10">
            <div className="text-5xl mb-4">🎶</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun groupe pour l&apos;instant</h3>
            {canCreateGroup ? (
              <p className="text-gray-500 text-sm">
                Créez votre premier groupe ou rejoignez-en un ci-dessous.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-500 text-sm">
                  Vous êtes en plan <strong>Musicien</strong> — vous pouvez rejoindre des groupes existants, mais pas en créer.
                </p>
                <Link
                  href="/profil"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
                >
                  🎼 Passer en plan Chef d&apos;orchestre
                </Link>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {memberships.map(({ group, groupRole }) => (
            <div key={group.id} className="relative">
              <Link href={`/groupes/${group.id}`}>
                <Card className="h-full hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg flex-shrink-0">
                      {group.coverUrl
                        ? <img src={group.coverUrl} alt={group.name} className="w-full h-full object-cover" />
                        : group.name.charAt(0)
                      }
                    </div>
                    <RoleBadge role={groupRole} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{group.name}</h3>
                  {group.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{group.description}</p>
                  )}
                  <div className={`flex items-center gap-4 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 ${groupRole === 'CHEF' ? 'pr-20' : ''}`}>
                    <span>{group._count.members} membre{group._count.members > 1 ? 's' : ''}</span>
                    <span>{group._count.rehearsals} répétition{group._count.rehearsals > 1 ? 's' : ''}</span>
                    <span>{group._count.songs} morceau{group._count.songs > 1 ? 'x' : ''}</span>
                  </div>
                </Card>
              </Link>
              {groupRole === 'CHEF' && <QuickInvite groupId={group.id} groupName={group.name} />}
            </div>
          ))}
        </div>
      )}

      {/* Former groups */}
      {formerGroups.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Anciens groupes</h2>
          <p className="text-sm text-gray-500 mb-4">Groupes que vous avez quittés.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {formerGroups.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center gap-3 opacity-70">
                <div className="w-9 h-9 rounded-xl bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-base flex-shrink-0">
                  {entry.groupName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{entry.groupName}</p>
                  <p className="text-xs text-gray-400">
                    Quitté le {new Date(entry.leftAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All groups not yet joined */}
      {availableGroups.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Groupes disponibles</h2>
          <p className="text-sm text-gray-500 mb-4">Groupes publics ouverts aux demandes, et groupes privés sur invitation uniquement.</p>
          <JoinPublicGroupsSection groups={availableGroups} />
        </div>
      )}
    </div>
  )
}

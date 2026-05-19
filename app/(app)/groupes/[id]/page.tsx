import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDateWithDay } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { RoleBadge } from '@/components/ui/Badge'
import JoinRequestsPanel from './JoinRequestsPanel'
import MembresPanel from './MembresPanel'
import { InvitePanel } from './InvitePanel'
import { GroupSettingsButton } from './GroupSettingsButton'

export default async function GroupePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const userId = Number(session.user.id)
  const groupId = Number(params.id)

  const isAdminUser = session.user.siteRole === 'ADMIN'

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })

  if (!membership && !isAdminUser) notFound()

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    // @ts-ignore isPublic added via db push
    include: {
      members: {
        include: {
          user: {
            include: {
              instruments: { include: { instrument: true } },
            },
          },
        },
        orderBy: { groupRole: 'asc' },
      },
      rehearsals: {
        where: { date: { gte: new Date() } },
        orderBy: { date: 'asc' },
        take: 1,
      },
      concerts: {
        where: { date: { gte: new Date() } },
        orderBy: { date: 'asc' },
        take: 1,
      },
      joinRequests: {
        where: { status: 'PENDING' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              instruments: { include: { instrument: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!group) notFound()

  const isChef = isAdminUser || membership?.groupRole === 'CHEF'
  const canManageMembers = isChef

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
          <span>/</span>
          <span className="text-gray-900">{group.name}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            {group.description && (
              <p className="text-gray-500 mt-1">{group.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
              (group as any).isPublic
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {(group as any).isPublic ? '🌐 Public' : '🔒 Privé'}
            </span>
            <RoleBadge role={membership.groupRole} />
            {isChef && (
              <GroupSettingsButton
                groupId={groupId}
                initialName={group.name}
                initialDescription={group.description ?? null}
                initialIsPublic={(group as any).isPublic}
              />
            )}
          </div>
        </div>
      </div>

      {/* Pending join requests — chef only */}
      {isChef && group.joinRequests.length > 0 && (
        <div className="mb-6">
          <JoinRequestsPanel groupId={groupId} requests={group.joinRequests} />
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { href: 'repetitions', label: 'Répétitions', icon: '🎵', color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { href: 'concerts', label: 'Concerts', icon: '🎭', color: 'bg-purple-50 text-purple-700 border-purple-200' },
          { href: 'morceaux', label: 'Répertoire', icon: '🎼', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
        ].map((link) => (
          <Link
            key={link.href}
            href={`/groupes/${groupId}/${link.href}`}
            className={`flex flex-col items-center justify-center rounded-xl border p-3 sm:p-5 text-center hover:shadow-md transition-all ${link.color}`}
          >
            <span className="text-3xl mb-2">{link.icon}</span>
            <span className="font-semibold text-sm">{link.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next rehearsal */}
        <Card>
          <CardHeader
            title="Prochaine répétition"
            action={
              <Link href={`/groupes/${groupId}/repetitions`} className="text-xs text-indigo-600 hover:text-indigo-500 font-medium">
                Voir tout
              </Link>
            }
          />
          {group.rehearsals[0] ? (
            <Link
              href={`/groupes/${groupId}/repetitions/${group.rehearsals[0].id}`}
              className="block rounded-xl bg-blue-50 border border-blue-100 p-4 hover:border-blue-300 transition-colors"
            >
              <p className="font-medium text-gray-900 capitalize">
                {formatDateWithDay(group.rehearsals[0].date)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {group.rehearsals[0].startTime}{group.rehearsals[0].endTime ? ` - ${group.rehearsals[0].endTime}` : ''}
              </p>
              <p className="text-sm text-gray-600">{group.rehearsals[0].location}</p>
            </Link>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Aucune répétition prévue.</p>
          )}
        </Card>

        {/* Next concert */}
        <Card>
          <CardHeader
            title="Prochain concert"
            action={
              <Link href={`/groupes/${groupId}/concerts`} className="text-xs text-indigo-600 hover:text-indigo-500 font-medium">
                Voir tout
              </Link>
            }
          />
          {group.concerts[0] ? (
            <div className="rounded-xl bg-purple-50 border border-purple-100 p-4">
              <p className="font-medium text-gray-900">{group.concerts[0].name}</p>
              <p className="text-sm text-gray-500 mt-1 capitalize">
                {formatDateWithDay(group.concerts[0].date)}
              </p>
              <p className="text-sm text-gray-600">{group.concerts[0].location}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Aucun concert prévu.</p>
          )}
        </Card>

        {/* Invite by email — private group, chef only */}
        {isChef && !(group as any).isPublic && (
          <Card className="lg:col-span-2">
            <CardHeader title="Inviter un musicien" />
            <p className="text-sm text-gray-500 mb-3">
              Ce groupe est privé. Invitez des musiciens inscrits sur la plateforme par leur adresse email.
            </p>
            <InvitePanel groupId={groupId} />
          </Card>
        )}

        {/* Members */}
        <Card className="lg:col-span-2">
          <CardHeader title={`Membres (${group.members.length})`} />
          <MembresPanel
            groupId={groupId}
            members={group.members.map(({ user, groupRole }) => ({
              userId: user.id,
              groupRole,
              user: {
                id: user.id,
                name: user.name,
                instruments: user.instruments,
              },
            }))}
            canManage={canManageMembers}
            currentUserId={userId}
            currentUserRole={membership?.groupRole ?? 'CHEF'}
          />
        </Card>
      </div>
    </div>
  )
}

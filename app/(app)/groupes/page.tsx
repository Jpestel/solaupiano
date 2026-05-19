import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { RoleBadge } from '@/components/ui/Badge'
import { CreateGroupButton } from './CreateGroupButton'

export default async function GroupesPage() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const userId = Number(session.user.id)

  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          _count: {
            select: { members: true, rehearsals: true, songs: true },
          },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes groupes</h1>
          <p className="text-gray-500 mt-1">Groupes musicaux dont vous êtes membre.</p>
        </div>
        <CreateGroupButton />
      </div>

      {memberships.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🎶</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun groupe pour l&apos;instant</h3>
            <p className="text-gray-500 text-sm">
              Créez votre premier groupe ou rejoignez-en un depuis votre profil.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {memberships.map(({ group, groupRole }) => (
            <Link key={group.id} href={`/groupes/${group.id}`}>
              <Card className="h-full hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                    {group.name.charAt(0)}
                  </div>
                  <RoleBadge role={groupRole} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{group.name}</h3>
                {group.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{group.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                  <span>{group._count.members} membre{group._count.members > 1 ? 's' : ''}</span>
                  <span>{group._count.rehearsals} répétition{group._count.rehearsals > 1 ? 's' : ''}</span>
                  <span>{group._count.songs} morceau{group._count.songs > 1 ? 'x' : ''}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { RoleBadge } from '@/components/ui/Badge'
import JoinRequestsPanel from './JoinRequestsPanel'
import { GroupSettingsButton } from './GroupSettingsButton'
import { GroupCards } from './GroupCards'
import { PlanSection } from './PlanSection'
import { GroupCoverUpload } from './GroupCoverUpload'
import { PermissionsSettings } from './PermissionsSettings'
import { DEFAULT_PLAN_SEEDS, type DbPlan } from '@/lib/plans'

function parseLookingFor(raw?: string | null): string[] {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

export default async function GroupePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const userId = Number(session.user.id)
  const groupId = Number(params.id)

  const isAdminUser = session.user.siteRole === 'ADMIN'

  // Fetch plans from DB (auto-seed if empty)
  let dbPlans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })
  if (dbPlans.length === 0) {
    await prisma.plan.createMany({ data: DEFAULT_PLAN_SEEDS })
    dbPlans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })
  }
  const allPlans: DbPlan[] = dbPlans.map((p) => ({
    ...p,
    storageGb: Number(p.storageGb),
    priceMonthly: p.priceMonthly !== null ? Number(p.priceMonthly) : null,
    description: p.description ?? null,
    maxMembersPerGroup: p.maxMembersPerGroup ?? null,
    maxSongsPerGroup: p.maxSongsPerGroup ?? null,
    maxSetlists: p.maxSetlists ?? null,
    maxConcerts: p.maxConcerts ?? null,
    maxCharts: p.maxCharts ?? null,
    maxFilesPerSong: p.maxFilesPerSong ?? null,
  }))

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
    select: { groupRole: true, cardOrder: true },
  })

  if (!membership && !isAdminUser) notFound()

  // Check plan features (stats + member limit)
  const groupMeta = await prisma.group.findUnique({ where: { id: groupId }, select: { plan: true, maxMembersOverride: true } })
  const planData = groupMeta ? await prisma.plan.findUnique({ where: { key: groupMeta.plan }, select: { hasStats: true, maxMembersPerGroup: true } }) : null
  const planHasStats = isAdminUser || (planData?.hasStats ?? false)
  // Effective member limit: override (if set by admin) > plan limit > null (unlimited)
  const effectiveMemberLimit = groupMeta?.maxMembersOverride ?? planData?.maxMembersPerGroup ?? null

  const group = await prisma.group.findUnique({
    where: { id: groupId },
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

  // Auto-assign founder if missing (done in GET API, but also compute here)
  const isFounder = isAdminUser || group.createdBy === userId

  // Number of co-chefs (chefs other than founder) — used to show settings hint
  const coChefCount = group.members.filter(
    (m) => m.groupRole === 'CHEF' && m.userId !== group.createdBy
  ).length

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
          <div className="flex items-start gap-4 min-w-0">
            <GroupCoverUpload
              groupId={groupId}
              initialCoverUrl={group.coverUrl ?? null}
              canEdit={isChef}
              groupName={group.name}
            />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
              {group.description && (
                <p className="text-gray-500 mt-1">{group.description}</p>
              )}
              {parseLookingFor(group.lookingFor).length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-xs text-amber-600 font-medium">Cherche :</span>
                  {parseLookingFor(group.lookingFor).map((inst) => (
                    <span key={inst} className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {inst}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
              group.isPublic
                ? 'bg-green-100 text-green-700'
                : group.isHidden
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600'
            }`}>
              {group.isPublic ? '🌐 Public' : group.isHidden ? '🙈 Masqué' : '🔒 Privé'}
            </span>
            <RoleBadge role={isAdminUser ? 'CHEF' : membership!.groupRole} />
            {isChef && (
              <GroupSettingsButton
                groupId={groupId}
                initialName={group.name}
                initialDescription={group.description ?? null}
                initialIsPublic={group.isPublic}
                initialIsHidden={group.isHidden}
                initialLookingFor={parseLookingFor(group.lookingFor)}
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

      {/* Navigation sections */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2 mb-2">
        {([
          {
            href: 'repetitions', label: 'Répétitions', icon: '🎵',
            iconBg: 'bg-blue-100',   textColor: 'text-blue-700',   border: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50/60',
            chefDesc: 'Planifier & gérer', memberDesc: 'Voir le planning',
          },
          {
            href: 'concerts',    label: 'Concerts',    icon: '🎭',
            iconBg: 'bg-purple-100', textColor: 'text-purple-700', border: 'border-purple-200 hover:border-purple-400 hover:bg-purple-50/60',
            chefDesc: 'Organiser les dates', memberDesc: 'Voir les dates',
          },
          {
            href: 'morceaux',    label: 'Répertoire',  icon: '🎼',
            iconBg: 'bg-indigo-100', textColor: 'text-indigo-700', border: 'border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/60',
            chefDesc: 'Gérer les morceaux', memberDesc: 'Voir les morceaux',
          },
          {
            href: 'setlists',    label: 'Setlists',    icon: '🎶',
            iconBg: 'bg-green-100',  textColor: 'text-green-700',  border: 'border-green-200 hover:border-green-400 hover:bg-green-50/60',
            chefDesc: 'Créer les setlists', memberDesc: 'Voir les setlists',
          },
          {
            href: 'grilles',     label: 'Grilles',     icon: '🎸',
            iconBg: 'bg-orange-100', textColor: 'text-orange-700', border: 'border-orange-200 hover:border-orange-400 hover:bg-orange-50/60',
            chefDesc: 'Créer les grilles', memberDesc: 'Voir les grilles',
          },
          {
            href: 'fiche-technique', label: 'Fiche tech.', icon: '📋',
            iconBg: 'bg-rose-100',   textColor: 'text-rose-700',   border: 'border-rose-200 hover:border-rose-400 hover:bg-rose-50/60',
            chefDesc: 'Créer la fiche', memberDesc: 'Voir la fiche',
          },
          {
            href: 'ma-page', label: 'Ma page', icon: '🌐',
            iconBg: 'bg-teal-100', textColor: 'text-teal-700', border: 'border-teal-200 hover:border-teal-400 hover:bg-teal-50/60',
            chefDesc: 'Créer la page web', memberDesc: 'Voir la page',
          },
        ] as const).map((link) => (
          <Link
            key={link.href}
            href={`/groupes/${groupId}/${link.href}`}
            className={`relative flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 transition-all group ${link.border}`}
          >
            <div className={`w-8 h-8 rounded-lg ${link.iconBg} flex items-center justify-center text-base flex-shrink-0`}>
              {link.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${link.textColor} leading-tight`}>{link.label}</p>
              <p className="text-[11px] text-gray-400 leading-tight mt-0.5 truncate">
                {isChef ? link.chefDesc : link.memberDesc}
              </p>
            </div>
            <svg className={`w-3.5 h-3.5 flex-shrink-0 opacity-30 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all ${link.textColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {isChef && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">+</span>
            )}
          </Link>
        ))}
      </div>

      {/* Stats link — chef only, shown even if locked (to upsell) */}
      {isChef && (
        <div className="mb-6">
          <Link
            href={`/groupes/${groupId}/stats`}
            className={`relative flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 transition-all group w-full ${
              planHasStats
                ? 'border-violet-200 hover:border-violet-400 hover:bg-violet-50/60'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/60 opacity-70'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-base flex-shrink-0">
              📊
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-violet-700 leading-tight">
                Statistiques
                {!planHasStats && <span className="ml-1.5 text-[9px] font-bold bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 uppercase tracking-wide">Plan supérieur</span>}
              </p>
              <p className="text-[11px] text-gray-400 leading-tight mt-0.5 truncate">
                {planHasStats ? 'Présence, répertoire, fréquence…' : 'Disponible sur les plans payants'}
              </p>
            </div>
            <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-30 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all text-violet-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}

      <PlanSection
        currentPlanKey={group.plan}
        storageUsedBytes={Number(group.storageUsedBytes)}
        isChef={isChef}
        memberCount={group.members.length}
        allPlans={allPlans}
        groupId={groupId}
        stripeSubscriptionId={group.stripeSubscriptionId ?? null}
      />

      <GroupCards
        groupId={groupId}
        rehearsal={group.rehearsals[0]
          ? { ...group.rehearsals[0], date: group.rehearsals[0].date.toISOString() }
          : null}
        concert={group.concerts[0]
          ? { ...group.concerts[0], date: group.concerts[0].date.toISOString() }
          : null}
        members={group.members.map(({ user, groupRole }) => ({
          userId: user.id,
          groupRole,
          user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl ?? null, instruments: user.instruments },
        }))}
        showInvite={isChef && !group.isPublic}
        isChef={isChef}
        canManage={canManageMembers}
        isAdmin={isAdminUser}
        currentUserId={userId}
        currentUserRole={isAdminUser ? 'CHEF' : (membership?.groupRole ?? 'CHEF')}
        savedCardOrder={membership?.cardOrder ?? null}
        createdBy={group.createdBy ?? null}
        chefPermissions={group.chefPermissions ?? null}
        memberLimit={isAdminUser ? null : effectiveMemberLimit}
      />

      {/* Paramètres des permissions — fondateur uniquement */}
      {isFounder && coChefCount > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold text-gray-900">⚙️ Permissions des co-chefs</h2>
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {coChefCount} co-chef{coChefCount > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Contrôlez ce que vos co-chefs peuvent faire dans chaque module.
          </p>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <PermissionsSettings groupId={groupId} initialPermissions={group.chefPermissions} />
          </div>
        </div>
      )}

      {/* Hint pour le fondateur quand il n'y a pas encore de co-chefs */}
      {isFounder && coChefCount === 0 && group.members.length > 1 && (
        <div className="mt-8 rounded-xl border border-dashed border-gray-200 px-5 py-4 text-sm text-gray-500">
          ⚙️ Nommez un co-chef depuis le panneau membres pour configurer ses permissions.
        </div>
      )}
    </div>
  )
}

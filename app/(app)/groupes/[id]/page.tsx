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
import { coChefCanDo } from '@/lib/permissions'
import { getPreviewContext } from '@/lib/preview'
import { GroupCoverUpload } from './GroupCoverUpload'
import { PermissionsSettings } from './PermissionsSettings'
import { DEFAULT_PLAN_SEEDS, type DbPlan } from '@/lib/plans'
import { getGroupStorageInfo } from '@/lib/storage'
import { TchatBadge } from '@/components/ui/TchatBadge'
import ImageConsentBanner from '@/components/ImageConsentBanner'

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

  // Aperçu par rôle : si un admin « voit en tant que » CE groupe, on calcule un
  // rôle effectif (Chef ou Musicien) au lieu du mode admin tout-puissant, et on
  // désactive ses super-pouvoirs (adminPower). La lecture seule est garantie par
  // le middleware.
  const preview = getPreviewContext()
  const previewActive = isAdminUser && preview?.groupId === groupId
  const adminPower = isAdminUser && !previewActive

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

  // Check plan features (stats + member limit + storage)
  const groupMeta = await prisma.group.findUnique({ where: { id: groupId }, select: { plan: true, maxMembersOverride: true, storageQuotaOverrideGb: true } })
  const planData = groupMeta ? await prisma.plan.findUnique({ where: { key: groupMeta.plan }, select: { hasStats: true, hasGrilles: true, hasSetlists: true, hasConcerts: true, hasFicheTechnique: true, hasMaPage: true, hasAccounting: true, hasChat: true, hasSharedResources: true, hasUnavailabilities: true, hasPolls: true, hasGalerie: true, hasSocial: true, maxMembersPerGroup: true } }) : null
  const planHasStats = isAdminUser || (planData?.hasStats ?? false)
  // Fonctionnalités débloquées par le plan (admin = tout)
  const planFeatures = {
    grilles:        isAdminUser || (planData?.hasGrilles ?? true),
    setlists:       isAdminUser || (planData?.hasSetlists ?? true),
    concerts:       isAdminUser || (planData?.hasConcerts ?? true),
    ficheTechnique: isAdminUser || (planData?.hasFicheTechnique ?? true),
    maPage:         isAdminUser || (planData?.hasMaPage ?? true),
    accounting:     isAdminUser || (planData?.hasAccounting ?? true),
    chat:           isAdminUser || (planData?.hasChat ?? true),
    sharedResources: isAdminUser || (planData?.hasSharedResources ?? true),
    unavailabilities: isAdminUser || (planData?.hasUnavailabilities ?? true),
    polls:          isAdminUser || (planData?.hasPolls ?? true),
    galerie:        isAdminUser || (planData?.hasGalerie ?? true),
    social:         isAdminUser || (planData?.hasSocial ?? true),
  }
  // Effective member limit: override (if set by admin) > plan limit > null (unlimited)
  const effectiveMemberLimit = groupMeta?.maxMembersOverride ?? planData?.maxMembersPerGroup ?? null
  // Accès aux modules (outils) par plan — pour l'affichage des cartes
  const allModuleAccess = await prisma.moduleAccess.findMany({
    select: { moduleKey: true, planKey: true, enabled: true },
  })

  // Shared storage info
  const storageInfo = await getGroupStorageInfo(groupId)

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
      groupPage: { select: { slug: true, published: true } },
    },
  })

  if (!group) notFound()

  // Rôle effectif : en aperçu = le rôle choisi ; sinon admin = Chef, ou le rôle réel du membre.
  const effectiveRole: 'CHEF' | 'MEMBRE' = previewActive
    ? preview!.role
    : (adminPower ? 'CHEF' : (membership?.groupRole ?? 'CHEF'))
  const isChef = adminPower || effectiveRole === 'CHEF'
  const canManageMembers = isChef
  const canSocial = coChefCanDo({ createdBy: group.createdBy ?? null, chefPermissions: group.chefPermissions ?? null }, userId, adminPower, 'social', 'post')

  // Auto-assign founder if missing (done in GET API, but also compute here)
  const isFounder = adminPower || group.createdBy === userId

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
            {group.groupPage?.published && group.groupPage?.slug && (
              <a
                href={`/${group.groupPage.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors"
              >
                🌐 Page publique →
              </a>
            )}
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
              group.isPublic
                ? 'bg-green-100 text-green-700'
                : group.isHidden
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600'
            }`}>
              {group.isPublic ? '🌐 Public' : group.isHidden ? '🙈 Masqué' : '🔒 Privé'}
            </span>
            {(group as any).type === 'SCHOOL' && (
              <>
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                  🎓 École
                </span>
                <Link
                  href={`/groupes/${groupId}/devoirs`}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  📒 Devoirs
                </Link>
              </>
            )}
            <RoleBadge role={effectiveRole} groupType={(group as any).type} />
            {isChef && (
              <GroupSettingsButton
                groupId={groupId}
                initialName={group.name}
                initialDescription={group.description ?? null}
                initialStyle={(group as any).style ?? ''}
                initialIsPublic={group.isPublic}
                initialIsHidden={group.isHidden}
                initialLookingFor={parseLookingFor(group.lookingFor)}
                initialPeerRatingVisibility={(group as any).peerRatingVisibility ?? 'PRIVATE'}
                isFounder={isFounder}
                memberCount={group.members.length}
              />
            )}
          </div>
        </div>
      </div>

      {/* Droit à l'image — chaque membre donne/refuse son consentement (si le module Réseaux sociaux est actif) */}
      <ImageConsentBanner groupId={groupId} />

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
          {
            href: 'tchat', label: 'Tchat', icon: '💬',
            iconBg: 'bg-pink-100', textColor: 'text-pink-700', border: 'border-pink-200 hover:border-pink-400 hover:bg-pink-50/60',
            chefDesc: 'Messagerie du groupe', memberDesc: 'Messagerie du groupe',
          },
          {
            href: 'ressources-partagees', label: 'Ressources', icon: '📒',
            iconBg: 'bg-cyan-100', textColor: 'text-cyan-700', border: 'border-cyan-200 hover:border-cyan-400 hover:bg-cyan-50/60',
            chefDesc: 'Liens, contacts, fichiers', memberDesc: 'Liens, contacts, fichiers',
          },
          {
            href: 'disponibilites', label: 'Disponibilités', icon: '🗓',
            iconBg: 'bg-amber-100', textColor: 'text-amber-700', border: 'border-amber-200 hover:border-amber-400 hover:bg-amber-50/60',
            chefDesc: 'Voir qui est dispo', memberDesc: 'Mes indisponibilités',
          },
          {
            href: 'sondages', label: 'Sondages', icon: '📊',
            iconBg: 'bg-violet-100', textColor: 'text-violet-700', border: 'border-violet-200 hover:border-violet-400 hover:bg-violet-50/60',
            chefDesc: 'Créer des sondages de dates', memberDesc: 'Répondre aux sondages',
          },
          {
            href: 'comptabilite', label: 'Comptabilité', icon: '💶',
            iconBg: 'bg-emerald-100', textColor: 'text-emerald-700', border: 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/60',
            chefDesc: 'Dépenses & remboursements', memberDesc: 'Mes parts à payer',
          },
          {
            href: 'galerie', label: 'Galerie', icon: '📸',
            iconBg: 'bg-fuchsia-100', textColor: 'text-fuchsia-700', border: 'border-fuchsia-200 hover:border-fuchsia-400 hover:bg-fuchsia-50/60',
            chefDesc: 'Photos répèts & concerts', memberDesc: 'Partager vos photos',
          },
          {
            href: 'social', label: 'Réseaux', icon: '📣',
            iconBg: 'bg-sky-100', textColor: 'text-sky-700', border: 'border-sky-200 hover:border-sky-400 hover:bg-sky-50/60',
            chefDesc: 'Créer des posts à partager', memberDesc: 'Créer des posts à partager',
          },
        ] as const)
          // Masque les fonctionnalités non incluses dans le plan du groupe
          .filter((link) => {
            if (link.href === 'concerts')        return planFeatures.concerts
            if (link.href === 'setlists')        return planFeatures.setlists
            if (link.href === 'grilles')         return planFeatures.grilles
            if (link.href === 'fiche-technique') return planFeatures.ficheTechnique
            if (link.href === 'ma-page')         return planFeatures.maPage
            if (link.href === 'comptabilite')    return planFeatures.accounting
            if (link.href === 'tchat')           return planFeatures.chat
            if (link.href === 'ressources-partagees') return planFeatures.sharedResources
            if (link.href === 'disponibilites')  return planFeatures.unavailabilities
            if (link.href === 'sondages')        return planFeatures.polls
            if (link.href === 'galerie')         return planFeatures.galerie
            if (link.href === 'social')          return planFeatures.social && canSocial
            return true
          })
          .map((link) => (
          <Link
            key={link.href}
            href={`/groupes/${groupId}/${link.href}`}
            data-bubble={`mod-${link.href}`}
            className={`relative flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 transition-all duration-150 group hover:shadow-md hover:-translate-y-0.5 ${link.border}`}
          >
            <div className={`w-8 h-8 rounded-lg ${link.iconBg} flex items-center justify-center text-base flex-shrink-0 transition-transform group-hover:scale-110`}>
              {link.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${link.textColor} leading-tight`}>{link.label}</p>
              <p className="text-[11px] text-gray-400 leading-tight mt-0.5 truncate">
                {isChef ? link.chefDesc : link.memberDesc}
              </p>
            </div>
            <span className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full transition-all ${link.iconBg} ${link.textColor} opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </span>
            {link.href === 'tchat' && (
              <TchatBadge groupId={String(groupId)} />
            )}
          </Link>
        ))}
      </div>

      {/* Stats link — chef only, shown even if locked (to upsell) */}
      {isChef && (
        <div className="mb-6">
          <Link
            href={`/groupes/${groupId}/stats`}
            data-bubble="mod-stats"
            className={`relative flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 transition-all duration-150 group w-full hover:shadow-md hover:-translate-y-0.5 ${
              planHasStats
                ? 'border-violet-200 hover:border-violet-400 hover:bg-violet-50/60'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/60 opacity-70'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-base flex-shrink-0 transition-transform group-hover:scale-110">
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
            <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-violet-100 text-violet-700 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        </div>
      )}

      <PlanSection
        currentPlanKey={group.plan}
        storageUsedBytes={storageInfo.usedBytes}
        storageLimitGb={storageInfo.limitGb}
        storageGroupCount={storageInfo.groupCount}
        storageHasOverride={storageInfo.hasOverride}
        isChef={isChef}
        memberCount={group.members.length}
        allPlans={allPlans}
        moduleAccess={allModuleAccess}
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
        members={group.members
          .filter((m) => ((group as any).type !== 'SCHOOL' || isChef) ? true : m.user.id === userId)
          .map(({ user, groupRole }) => ({
            userId: user.id,
            groupRole,
            user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl ?? null, instruments: user.instruments },
          }))}
        showInvite={isChef}
        isChef={isChef}
        canManage={canManageMembers}
        groupType={(group as any).type}
        showRoster={(group as any).type !== 'SCHOOL' || isChef}
        isAdmin={adminPower}
        currentUserId={userId}
        currentUserRole={effectiveRole}
        savedCardOrder={membership?.cardOrder ?? null}
        createdBy={group.createdBy ?? null}
        chefPermissions={group.chefPermissions ?? null}
        memberLimit={adminPower ? null : effectiveMemberLimit}
      />

      {/* Paramètres des permissions — fondateur + admin site */}
      {isFounder && (
        <div id="permissions" className="mt-10">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-900">⚙️ Permissions des co-chefs</h2>
            {coChefCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                {coChefCount} co-chef{coChefCount > 1 ? 's' : ''}
              </span>
            )}
            {isAdminUser && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                🛡️ Vue admin
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {coChefCount > 0
              ? 'Contrôlez ce que les co-chefs peuvent faire dans chaque module.'
              : 'Aucun co-chef pour l\'instant — ces permissions s\'appliqueront dès qu\'un co-chef sera nommé.'}
          </p>
          <div className={`rounded-xl border bg-white p-5 ${isAdminUser && !isFounder ? 'border-amber-200' : 'border-gray-200'}`}>
            <PermissionsSettings groupId={groupId} initialPermissions={group.chefPermissions} />
          </div>
        </div>
      )}
    </div>
  )
}

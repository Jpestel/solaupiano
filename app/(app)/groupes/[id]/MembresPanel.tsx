'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { resolvePermissions, type ChefPermissions } from '@/lib/permissions'
import { GroupRoleBadge } from '@/components/ui/Badge'

interface Member {
  userId: number
  groupRole: string
  user: {
    id: number
    name: string
    avatarUrl?: string | null
    instruments: { instrument: { name: string } }[]
  }
}

export default function MembresPanel({
  groupId,
  members: initialMembers,
  canManage,
  isAdmin,
  currentUserId,
  currentUserRole,
  createdBy,
  chefPermissions,
  memberLimit,
  groupType,
}: {
  groupId: number
  members: Member[]
  canManage: boolean
  isAdmin: boolean
  currentUserId: number
  currentUserRole: string
  createdBy?: number | null
  chefPermissions?: unknown
  memberLimit?: number | null
  groupType?: string
}) {
  const isSchool = groupType === 'SCHOOL'
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [processing, setProcessing] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')

  const isChef = currentUserRole === 'CHEF'
  const isFounder = isAdmin || currentUserId === createdBy
  const perms = resolvePermissions(chefPermissions)
  const chefCan = (mod: keyof ChefPermissions, action: string): boolean => {
    if (!isChef) return false
    if (isFounder) return true
    return (perms[mod] as Record<string, boolean>)[action] !== false
  }

  const toggleRole = async (member: Member) => {
    const newRole = member.groupRole === 'CHEF' ? 'MEMBRE' : 'CHEF'
    setProcessing(member.userId)
    const res = await fetch(`/api/groupes/${groupId}/membres/${member.userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupRole: newRole }),
    })
    setProcessing(null)
    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) => (m.userId === member.userId ? { ...m, groupRole: newRole } : m))
      )
      router.refresh()
    }
  }

  const removeMember = async (targetUserId: number, isSelf: boolean) => {
    if (isSelf && currentUserRole === 'CHEF') {
      const otherMembers = members.filter((m) => m.userId !== currentUserId)
      if (otherMembers.length > 0) {
        // Chef cannot leave a group that still has members
        setActionError('En tant que chef d\'orchestre responsable du plan du groupe, vous ne pouvez pas le quitter tant qu\'il y a d\'autres membres. Supprimez le groupe ou transférez le titre de chef à un autre membre avant de partir.')
        return
      }
    }
    const isSoleMember = members.length === 1 && isSelf
    const label = isSoleMember
      ? 'Vous êtes le seul membre. Quitter supprimera définitivement ce groupe. Confirmer ?'
      : isSelf
        ? 'Voulez-vous vraiment quitter ce groupe ?'
        : 'Retirer ce membre du groupe ?'
    if (!confirm(label)) return
    setProcessing(targetUserId)
    const res = await fetch(`/api/groupes/${groupId}/membres`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: targetUserId }),
    })
    setProcessing(null)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setActionError(d.error || 'Une erreur est survenue. Veuillez réessayer.')
      return
    }
    const data = await res.json()
    if (isSelf || data.groupDeleted) {
      router.refresh()
      router.push('/groupes')
    } else {
      setMembers((prev) => prev.filter((m) => m.userId !== targetUserId))
      router.refresh()
    }
  }

  const atLimit = memberLimit != null && members.length >= memberLimit
  const nearLimit = memberLimit != null && members.length >= memberLimit * 0.8 && !atLimit

  return (
    <div className="space-y-4">
    {actionError && (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <div className="flex-1 text-sm text-red-800">{actionError}</div>
        <button onClick={() => setActionError('')} className="text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
      </div>
    )}

    {/* Limite de membres */}
    {memberLimit != null && (
      <div className={`flex items-center justify-between rounded-xl border px-4 py-2.5 ${
        atLimit ? 'border-red-200 bg-red-50' : nearLimit ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-sm">👥</span>
          <span className={`text-xs font-medium ${atLimit ? 'text-red-700' : nearLimit ? 'text-amber-700' : 'text-gray-600'}`}>
            {members.length} / {memberLimit} membres
          </span>
          {atLimit && (
            <span className="text-xs font-semibold bg-red-100 text-red-700 rounded-full px-2 py-0.5">
              Limite atteinte
            </span>
          )}
          {nearLimit && (
            <span className="text-xs font-semibold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
              Bientôt complet
            </span>
          )}
        </div>
        {atLimit && isChef && (
          <p className="text-[11px] text-red-600">Contactez l&apos;admin pour augmenter la limite.</p>
        )}
      </div>
    )}

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {members.map((member) => {
        const isSelf = member.userId === currentUserId
        return (
          <div
            key={member.userId}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm flex-shrink-0">
              {member.user.avatarUrl
                ? <img src={member.user.avatarUrl} alt={member.user.name} className="w-full h-full object-cover" />
                : member.user.name.charAt(0).toUpperCase()
              }
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-900 truncate">{member.user.name}</p>
                <GroupRoleBadge groupRole={member.groupRole} isFounder={member.userId === createdBy} />
                {isSelf && (
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">Moi</span>
                )}
              </div>
              {member.user.instruments.length > 0 && (
                <p className="text-xs text-gray-500 truncate">
                  {member.user.instruments.map((ui) => ui.instrument.name).join(', ')}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Role toggle — chef or admin (pas de co-chef dans une école) */}
              {!isSchool && (isAdmin || isChef) && !isSelf && chefCan('membres', 'promote') && (
                <button
                  onClick={() => toggleRole(member)}
                  disabled={processing === member.userId}
                  title={member.groupRole === 'CHEF' ? 'Rétrograder en membre' : 'Nommer chef de groupe'}
                  className={`rounded-lg border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                    member.groupRole === 'CHEF'
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700'
                  }`}
                >
                  {processing === member.userId ? '...' : member.groupRole === 'CHEF' ? '★ Chef' : '☆ Chef ?'}
                </button>
              )}

              {/* Remove member — chef only, not on self */}
              {isChef && !isSelf && chefCan('membres', 'remove') && (
                <button
                  onClick={() => removeMember(member.userId, false)}
                  disabled={processing === member.userId}
                  title="Retirer du groupe"
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50"
                >
                  {processing === member.userId ? '...' : '✕'}
                </button>
              )}

              {/* Leave group — always visible on own row */}
              {isSelf && (
                <button
                  onClick={() => removeMember(currentUserId, true)}
                  disabled={processing === currentUserId}
                  title="Quitter le groupe"
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {processing === currentUserId ? '...' : 'Quitter'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
    </div>
  )
}

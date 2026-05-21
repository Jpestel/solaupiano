'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Member {
  userId: number
  groupRole: string
  user: {
    id: number
    name: string
    instruments: { instrument: { name: string } }[]
  }
}

export default function MembresPanel({
  groupId,
  members: initialMembers,
  canManage,
  currentUserId,
  currentUserRole,
}: {
  groupId: number
  members: Member[]
  canManage: boolean
  currentUserId: number
  currentUserRole: string
}) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [processing, setProcessing] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')

  const isChef = currentUserRole === 'CHEF'

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

  const stepDown = () => {
    const otherChefs = members.filter((m) => m.groupRole === 'CHEF' && m.userId !== currentUserId)
    if (otherChefs.length === 0) {
      setActionError('Vous êtes le seul chef de ce groupe. Nommez un autre membre chef d\'orchestre avant de pouvoir passer membre simple.')
      return
    }
    toggleRole({ userId: currentUserId, groupRole: 'CHEF', user: members.find((m) => m.userId === currentUserId)!.user })
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

  return (
    <div className="space-y-4">
    {actionError && (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <div className="flex-1 text-sm text-red-800">{actionError}</div>
        <button onClick={() => setActionError('')} className="text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
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
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm flex-shrink-0">
              {member.user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-900 truncate">{member.user.name}</p>
                {member.groupRole === 'CHEF' && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    Chef d&apos;orchestre
                  </span>
                )}
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
              {/* Role toggle — chef only, not on self */}
              {canManage && !isSelf && (
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
              {isChef && !isSelf && (
                <button
                  onClick={() => removeMember(member.userId, false)}
                  disabled={processing === member.userId}
                  title="Retirer du groupe"
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50"
                >
                  {processing === member.userId ? '...' : '✕'}
                </button>
              )}

              {/* Step down from chef — only on own row when chef */}
              {isSelf && isChef && (
                <button
                  onClick={stepDown}
                  disabled={processing === currentUserId}
                  title="Passer membre simple"
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {processing === currentUserId ? '...' : 'Passer membre'}
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

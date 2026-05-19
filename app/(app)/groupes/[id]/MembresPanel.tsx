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
}: {
  groupId: number
  members: Member[]
  canManage: boolean
  currentUserId: number
}) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [processing, setProcessing] = useState<number | null>(null)

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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {members.map((member) => (
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
                  Chef
                </span>
              )}
            </div>
            {member.user.instruments.length > 0 && (
              <p className="text-xs text-gray-500 truncate">
                {member.user.instruments.map((ui) => ui.instrument.name).join(', ')}
              </p>
            )}
          </div>

          {/* Role toggle — visible to admin/chef, not on self */}
          {canManage && member.userId !== currentUserId && (
            <button
              onClick={() => toggleRole(member)}
              disabled={processing === member.userId}
              title={member.groupRole === 'CHEF' ? 'Rétrograder en membre' : 'Nommer chef de groupe'}
              className={`flex-shrink-0 rounded-lg border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                member.groupRole === 'CHEF'
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700'
              }`}
            >
              {processing === member.userId
                ? '...'
                : member.groupRole === 'CHEF'
                ? '★ Chef'
                : '☆ Chef ?'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

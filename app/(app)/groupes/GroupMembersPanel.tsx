'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Member { userId: number; groupRole: string; user: { name: string } }

export function GroupMembersPanel({
  groupId, members, createdBy, currentUserId,
}: {
  groupId: number
  members: Member[]
  createdBy: number | null
  currentUserId: number
}) {
  const [open, setOpen] = useState(false)
  const isFounder = createdBy === currentUserId
  // Co-chefs = membres CHEF qui ne sont pas le fondateur
  const coChefs = members.filter(m => m.groupRole === 'CHEF' && m.userId !== createdBy)
  const hasCoChefs = coChefs.length > 0

  const roleLabel = (m: Member) =>
    m.userId === createdBy ? '👑 Chef d\'orchestre' : m.groupRole === 'CHEF' ? '⭐ Co-chef' : '🎵 Membre'
  const roleCls = (m: Member) =>
    m.userId === createdBy
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : m.groupRole === 'CHEF'
        ? 'bg-blue-100 text-blue-700 border-blue-200'
        : 'bg-white text-gray-600 border-gray-200'

  return (
    <div className="mt-1.5 rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between text-xs font-medium text-gray-600 hover:text-gray-800"
      >
        <span>👥 Membres & rôles ({members.length})</span>
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {members.map(m => (
            <div key={m.userId} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-700 truncate">
                {m.user.name}{m.userId === currentUserId ? ' (vous)' : ''}
              </span>
              <span className={`text-[10px] font-semibold rounded-full border px-2 py-0.5 flex-shrink-0 ${roleCls(m)}`}>
                {roleLabel(m)}
              </span>
            </div>
          ))}

          {/* Accès permissions co-chefs (fondateur uniquement, si co-chefs présents) */}
          {isFounder && hasCoChefs && (
            <Link
              href={`/groupes/${groupId}#permissions`}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              ⚙️ Permissions des {coChefs.length} co-chef{coChefs.length > 1 ? 's' : ''}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

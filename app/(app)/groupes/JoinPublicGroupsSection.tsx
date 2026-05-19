'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PublicGroup {
  id: number
  name: string
  description?: string | null
  isPublic: boolean
  _count: { members: number }
  joinRequests: { id: number; status: string }[]
}

export function JoinPublicGroupsSection({ groups }: { groups: PublicGroup[] }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [requests, setRequests] = useState<Record<number, { id: number; status: string }>>(() => {
    const map: Record<number, { id: number; status: string }> = {}
    groups.forEach((g) => {
      if (g.joinRequests[0]) map[g.id] = g.joinRequests[0]
    })
    return map
  })

  const requestJoin = async (groupId: number) => {
    setLoadingId(groupId)
    const res = await fetch(`/api/groupes/${groupId}/demandes`, { method: 'POST' })
    setLoadingId(null)
    if (res.ok) {
      const data = await res.json()
      setRequests((prev) => ({ ...prev, [groupId]: { id: data.id, status: data.status } }))
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {groups.map((group) => {
        const req = requests[group.id]
        return (
          <div key={group.id} className={`rounded-xl border p-4 flex flex-col gap-3 ${group.isPublic ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0 ${group.isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                {group.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm">{group.name}</p>
                  {!group.isPublic && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">
                      🔒 Privé
                    </span>
                  )}
                </div>
                {group.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{group.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">{group._count.members} membre{group._count.members > 1 ? 's' : ''}</p>
              </div>
            </div>

            {group.isPublic ? (
              <>
                {!req && (
                  <button
                    onClick={() => requestJoin(group.id)}
                    disabled={loadingId === group.id}
                    className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
                  >
                    {loadingId === group.id ? 'Envoi...' : 'Demander à rejoindre'}
                  </button>
                )}
                {req?.status === 'PENDING' && (
                  <p className="text-xs text-center text-amber-600 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3">
                    Demande en attente de validation
                  </p>
                )}
                {req?.status === 'ACCEPTED' && (
                  <p className="text-xs text-center text-green-600 bg-green-50 border border-green-200 rounded-lg py-2 px-3">
                    Demande acceptée ✓
                  </p>
                )}
                {req?.status === 'REJECTED' && (
                  <button
                    onClick={() => requestJoin(group.id)}
                    disabled={loadingId === group.id}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Faire une nouvelle demande
                  </button>
                )}
              </>
            ) : (
              <p className="text-xs text-center text-gray-500 bg-gray-100 border border-gray-200 rounded-lg py-2 px-3">
                Sur invitation uniquement
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

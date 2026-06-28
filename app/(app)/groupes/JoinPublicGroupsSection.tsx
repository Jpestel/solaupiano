'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PublicGroup {
  id: number
  name: string
  description?: string | null
  isPublic: boolean
  lookingFor?: string | null
  lookingForSince?: Date | string | null
  _count: { members: number }
  joinRequests: { id: number; status: string }[]
}

function parseLookingFor(raw?: string | null): string[] {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
      {groups.map((group) => {
        const req = requests[group.id]
        const lookingFor = parseLookingFor(group.lookingFor)
        return (
          <div key={group.id} className={`flex min-h-[190px] flex-col gap-3 rounded-xl border p-3.5 sm:p-4 ${group.isPublic ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-start gap-3">
              <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-base font-bold ${group.isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                {group.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold leading-tight text-gray-900">{group.name}</p>
                  {!group.isPublic && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">
                      🔒 Privé
                    </span>
                  )}
                </div>
                {group.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{group.description}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">{group._count.members} membre{group._count.members > 1 ? 's' : ''}</p>
                {group.lookingForSince && (
                  <p className="text-xs text-gray-400 mt-0.5">Depuis le {new Date(group.lookingForSince).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                )}
              </div>
            </div>

            {lookingFor.length > 0 && (
              <div className="flex flex-wrap gap-1.5 rounded-lg bg-amber-50/60 p-2">
                <span className="mr-0.5 self-center text-xs font-medium text-amber-700">Cherche :</span>
                {lookingFor.map((inst) => (
                  <span key={inst} className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">
                    {inst}
                  </span>
                ))}
              </div>
            )}

            {group.isPublic ? (
              <>
                {!req && (
                  <button
                    onClick={() => requestJoin(group.id)}
                    disabled={loadingId === group.id}
                    className="mt-auto w-full rounded-lg bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
                  >
                    {loadingId === group.id ? 'Envoi...' : 'Demander à rejoindre'}
                  </button>
                )}
                {req?.status === 'PENDING' && (
                  <p className="mt-auto rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-600">
                    Demande en attente de validation
                  </p>
                )}
                {req?.status === 'ACCEPTED' && (
                  <p className="mt-auto rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-center text-xs text-green-600">
                    Demande acceptée ✓
                  </p>
                )}
                {req?.status === 'REJECTED' && (
                  <button
                    onClick={() => requestJoin(group.id)}
                    disabled={loadingId === group.id}
                    className="mt-auto w-full rounded-lg border border-gray-300 px-3 py-2.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    Faire une nouvelle demande
                  </button>
                )}
              </>
            ) : (
              <p className="mt-auto rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-center text-xs text-gray-500">
                Sur invitation uniquement
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Group {
  id: number
  name: string
  description?: string | null
  lookingFor: string
  lookingForSince?: Date | string | null
  _count: { members: number }
  joinRequests: { id: number; status: string }[]
  isMember: boolean
}

function parseLookingFor(raw: string): string[] {
  try { return JSON.parse(raw) } catch { return [] }
}

export function GroupsLookingSection({ groups }: { groups: Group[] }) {
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [requests, setRequests] = useState<Record<number, { id: number; status: string }>>(() => {
    const map: Record<number, { id: number; status: string }> = {}
    groups.forEach((g) => { if (g.joinRequests[0]) map[g.id] = g.joinRequests[0] })
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

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-5 text-center sm:p-6">
        <p className="text-3xl mb-2">🎸</p>
        <p className="text-sm text-gray-500">Aucun groupe ne cherche de musicien pour l&apos;instant.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const instruments = parseLookingFor(group.lookingFor)
        const req = requests[group.id]
        return (
          <div key={group.id} className="space-y-3 rounded-xl border border-gray-200 bg-white p-3.5 sm:p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">
                {group.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 text-sm leading-tight">{group.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{group._count.members} membre{group._count.members > 1 ? 's' : ''}</p>
                {group.lookingForSince && (
                  <p className="text-xs text-gray-400 mt-0.5">Depuis le {new Date(group.lookingForSince).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                )}
                {group.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{group.description}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 rounded-lg bg-amber-50/60 p-2">
              <span className="self-center text-xs font-medium text-amber-700">Cherche :</span>
              {instruments.map((inst) => (
                <span key={inst} className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {inst}
                </span>
              ))}
            </div>

            {group.isMember ? (
              <Link
                href={`/groupes/${group.id}`}
                className="block w-full rounded-lg bg-gray-100 px-3 py-2.5 text-center text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200"
              >
                Vous êtes déjà membre →
              </Link>
            ) : !req ? (
              <button
                onClick={() => requestJoin(group.id)}
                disabled={loadingId === group.id}
                className="w-full rounded-lg bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
              >
                {loadingId === group.id ? 'Envoi...' : 'Demander à rejoindre'}
              </button>
            ) : req.status === 'PENDING' ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-600">
                Demande en attente
              </p>
            ) : req.status === 'ACCEPTED' ? (
              <p className="rounded-lg border border-green-200 bg-green-50 py-2 text-center text-xs text-green-600">
                Demande acceptée ✓
              </p>
            ) : (
              <button
                onClick={() => requestJoin(group.id)}
                disabled={loadingId === group.id}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                Faire une nouvelle demande
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

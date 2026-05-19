'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Request {
  id: number
  user: {
    id: number
    name: string
    email: string
    instruments: { instrument: { name: string } }[]
  }
  message?: string | null
}

export default function JoinRequestsPanel({
  groupId,
  requests: initialRequests,
}: {
  groupId: number
  requests: Request[]
}) {
  const router = useRouter()
  const [requests, setRequests] = useState(initialRequests)
  const [processing, setProcessing] = useState<number | null>(null)

  const handleDecision = async (requestId: number, status: 'ACCEPTED' | 'REJECTED') => {
    setProcessing(requestId)
    const res = await fetch(`/api/groupes/${groupId}/demandes/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setProcessing(null)
    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
      router.refresh()
    }
  }

  if (requests.length === 0) return null

  return (
    <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🔔</span>
        <h2 className="text-base font-semibold text-yellow-900">
          Demandes d&apos;adhésion en attente ({requests.length})
        </h2>
      </div>
      <div className="space-y-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-white border border-yellow-100 px-4 py-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                  {req.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{req.user.name}</p>
                  <p className="text-xs text-gray-500">{req.user.email}</p>
                </div>
              </div>
              {req.user.instruments.length > 0 && (
                <p className="text-xs text-indigo-600 mt-1 ml-10">
                  {req.user.instruments.map((ui) => ui.instrument.name).join(', ')}
                </p>
              )}
              {req.message && (
                <p className="text-xs text-gray-500 italic mt-1 ml-10">&laquo; {req.message} &raquo;</p>
              )}
            </div>
            <div className="flex gap-2 sm:flex-shrink-0">
              <button
                onClick={() => handleDecision(req.id, 'REJECTED')}
                disabled={processing === req.id}
                className="flex-1 sm:flex-none rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 transition-colors"
              >
                Refuser
              </button>
              <button
                onClick={() => handleDecision(req.id, 'ACCEPTED')}
                disabled={processing === req.id}
                className="flex-1 sm:flex-none rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-60 transition-colors"
              >
                {processing === req.id ? '...' : 'Accepter'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

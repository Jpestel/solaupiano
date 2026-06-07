'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDateWithDay } from '@/lib/utils'
import { ph } from '@/lib/placeholders'

interface ReminderLog {
  id: number
  sentAt: string
  user: { id: number; name: string; email: string }
  sentBy: { id: number; name: string }
  rehearsal: {
    id: number
    date: string
    location: string
    startTime: string
    group: { id: number; name: string }
  }
}

interface ApiResponse {
  logs: ReminderLog[]
  total: number
  page: number
  pages: number
}

interface Group { id: number; name: string }

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function AdminRappelsPage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<Group[]>([])

  const [filterGroupId, setFilterGroupId] = useState('')
  const [filterName, setFilterName] = useState('')
  const [page, setPage] = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (filterGroupId) params.set('groupId', filterGroupId)
    const res = await fetch(`/api/admin/rappels?${params}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [page, filterGroupId])

  useEffect(() => {
    fetch('/api/admin/groupes').then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setGroups(d.map((g: any) => ({ id: g.id, name: g.name })))
    })
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredLogs = (data?.logs ?? []).filter((log) =>
    filterName === '' ||
    log.user.name.toLowerCase().includes(filterName.toLowerCase()) ||
    log.user.email.toLowerCase().includes(filterName.toLowerCase())
  )

  // Group logs by rehearsal for better readability
  const grouped = filteredLogs.reduce<Record<number, { rehearsal: ReminderLog['rehearsal']; logs: ReminderLog[] }>>((acc, log) => {
    const key = log.rehearsal.id
    if (!acc[key]) acc[key] = { rehearsal: log.rehearsal, logs: [] }
    acc[key].logs.push(log)
    return acc
  }, {})

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Historique des rappels</h1>
        <p className="text-gray-500 mt-1">
          Consultez quel membre a été relancé pour indiquer sa présence, et à quelle date.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterGroupId}
          onChange={(e) => { setFilterGroupId(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-400 focus:outline-none"
        >
          <option value="">Tous les groupes</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder={ph('admin_rappels_1')}
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-400 focus:outline-none min-w-[200px]"
        />
        {(filterGroupId || filterName) && (
          <button
            onClick={() => { setFilterGroupId(''); setFilterName(''); setPage(1) }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            ✕ Réinitialiser
          </button>
        )}
      </div>

      {/* Stats bar */}
      {data && (
        <div className="mb-4 flex items-center gap-4 text-sm text-gray-500">
          <span>
            <strong className="text-gray-900">{data.total}</strong> rappel{data.total > 1 ? 's' : ''} envoyé{data.total > 1 ? 's' : ''} au total
          </span>
          {filterName && (
            <span className="text-indigo-600">
              {filteredLogs.length} résultat{filteredLogs.length > 1 ? 's' : ''} pour « {filterName} »
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Chargement...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-gray-400">
          <p className="text-4xl mb-3">🔔</p>
          <p className="font-medium">Aucun rappel trouvé</p>
          <p className="text-sm mt-1">Les rappels envoyés depuis la page de répétition apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.values(grouped).map(({ rehearsal, logs }) => (
            <div key={rehearsal.id} className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              {/* Rehearsal header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm">
                    📅
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 capitalize">
                      {formatDateWithDay(rehearsal.date)} — {rehearsal.startTime}
                    </p>
                    <p className="text-xs text-gray-500">{rehearsal.group.name} · {rehearsal.location}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 rounded-full px-2.5 py-0.5">
                  {logs.length} rappel{logs.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Members list */}
              <div className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold flex-shrink-0">
                        {log.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{log.user.name}</p>
                        <p className="text-xs text-gray-400">{log.user.email}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-gray-700">{formatDateTime(log.sentAt)}</p>
                      <p className="text-xs text-gray-400">
                        Envoyé par <span className="font-medium text-gray-600">{log.sentBy.name}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            ← Précédent
          </button>
          <span className="text-sm text-gray-500">Page {page} / {data.pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  )
}

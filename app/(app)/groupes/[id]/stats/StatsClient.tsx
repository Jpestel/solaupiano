'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'

interface StatsData {
  totalRehearsals: number
  globalAttendanceRate: number
  totalSongs: number
  totalMembers: number
  attendanceByRehearsal: {
    id: number
    date: string
    label: string
    presentCount: number
    absentCount: number
    incertainCount: number
    totalMembers: number
    rate: number
  }[]
  attendanceByMember: {
    userId: number
    name: string
    avatarUrl: string | null
    groupRole: string
    present: number
    absent: number
    incertain: number
    total: number
    rate: number | null
  }[]
  songsByLevel: {
    level: string
    label: string
    count: number
    color: string
  }[]
  rehearsalsByMonth: {
    month: string
    count: number
  }[]
  resourcesByType: {
    type: string
    count: number
    totalSize: number
  }[]
}

const TYPE_LABELS: Record<string, string> = {
  PDF: 'PDF', AUDIO: 'Audio', VIDEO: 'Vidéo', IMAGE: 'Image',
  YOUTUBE: 'YouTube', LINK: 'Lien', OTHER: 'Autre',
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 o'
  const k = 1024
  const sizes = ['o', 'Ko', 'Mo', 'Go']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function KpiCard({ icon, label, value, sub }: { icon: string; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-xl flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const TOOLTIP_STYLE = {
  contentStyle: { borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' },
}

export function StatsClient({ groupId }: { groupId: number }) {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/groupes/${groupId}/stats`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('Erreur lors du chargement des statistiques.'))
      .finally(() => setLoading(false))
  }, [groupId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        {error === 'MODULE_LOCKED'
          ? '🔒 Le module statistiques n\'est pas inclus dans votre forfait actuel.'
          : error}
      </div>
    )
  }

  if (!data) return null

  const hasRehearsals = data.totalRehearsals > 0
  const hasSongs = data.totalSongs > 0
  const hasResources = data.resourcesByType.length > 0

  return (
    <div className="space-y-6">
      {/* ── KPIs ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon="🎵"
          label="Répétitions"
          value={data.totalRehearsals}
          sub="passées"
        />
        <KpiCard
          icon="✅"
          label="Taux de présence"
          value={`${data.globalAttendanceRate}%`}
          sub="global"
        />
        <KpiCard
          icon="🎼"
          label="Morceaux"
          value={data.totalSongs}
          sub="au répertoire"
        />
        <KpiCard
          icon="👥"
          label="Membres"
          value={data.totalMembers}
          sub="actifs"
        />
      </div>

      {/* ── Présence par répétition + Répertoire ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Présence par répétition */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Présence par répétition <span className="text-gray-400 font-normal">(12 dernières)</span></h2>
          {!hasRehearsals ? (
            <EmptyState message="Aucune répétition passée." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.attendanceByRehearsal} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value, name) => {
                    const labels: Record<string, string> = { presentCount: 'Présents', absentCount: 'Absents', incertainCount: 'Incertains' }
                    return [value, labels[name as string] ?? name]
                  }}
                />
                <Bar dataKey="presentCount" name="presentCount" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="incertainCount" name="incertainCount" stackId="a" fill="#f59e0b" />
                <Bar dataKey="absentCount" name="absentCount" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Répertoire par niveau */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Répertoire par niveau de maîtrise</h2>
          {!hasSongs ? (
            <EmptyState message="Aucun morceau au répertoire." />
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.songsByLevel.filter(s => s.count > 0)}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {data.songsByLevel.filter(s => s.count > 0).map((entry) => (
                      <Cell key={entry.level} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => [`${v} morceau(x)`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 min-w-[140px]">
                {data.songsByLevel.map((s) => (
                  <div key={s.level} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-xs text-gray-600 flex-1">{s.label}</span>
                    <span className="text-xs font-bold text-gray-900">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Répétitions par mois ───────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Répétitions par mois <span className="text-gray-400 font-normal">(6 derniers mois)</span></h2>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data.rehearsalsByMonth} margin={{ top: 4, right: 16, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} répétition(s)`, 'Répétitions']} />
            <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Présence par membre ────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Présence par membre</h2>
        {!hasRehearsals ? (
          <EmptyState message="Aucune répétition passée." />
        ) : (
          <div className="space-y-2">
            {data.attendanceByMember.map((m) => {
              const rate = m.rate ?? 0
              const hasData = m.total > 0
              return (
                <div key={m.userId} className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 flex-shrink-0 overflow-hidden">
                    {m.avatarUrl
                      ? <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                      : (m.name?.[0] ?? '?').toUpperCase()
                    }
                  </div>
                  {/* Name + role */}
                  <div className="w-36 flex-shrink-0 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{m.name}</p>
                    <p className="text-[10px] text-gray-400">{m.groupRole === 'CHEF' ? 'Chef' : 'Membre'}</p>
                  </div>
                  {/* Bar */}
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      {hasData && (
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${rate}%`,
                            background: rate >= 75 ? '#22c55e' : rate >= 50 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-10 text-right flex-shrink-0">
                      {hasData ? `${rate}%` : '—'}
                    </span>
                  </div>
                  {/* Detail */}
                  <div className="hidden sm:flex items-center gap-3 text-[10px] text-gray-400 w-36 flex-shrink-0">
                    <span className="text-green-600 font-medium">✓ {m.present}</span>
                    <span className="text-red-500">✕ {m.absent}</span>
                    <span className="text-amber-500">? {m.incertain}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Ressources par type ────────────────────────────────────── */}
      {hasResources && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Ressources par type</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {data.resourcesByType.map((r) => (
              <div key={r.type} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 flex flex-col gap-0.5">
                <p className="text-xs font-semibold text-gray-700">{TYPE_LABELS[r.type] ?? r.type}</p>
                <p className="text-lg font-bold text-indigo-600">{r.count}</p>
                {r.totalSize > 0 && (
                  <p className="text-[10px] text-gray-400">{formatBytes(r.totalSize)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-2">
      <span className="text-3xl">📭</span>
      {message}
    </div>
  )
}

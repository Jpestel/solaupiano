import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const fmtDateTime = (d: Date) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(d)

export default async function AdminUsagePage({ searchParams }: { searchParams: { days?: string } }) {
  const daysParam = searchParams.days || '30'
  const days = daysParam === 'all' ? null : Math.max(1, parseInt(daysParam, 10) || 30)
  const since = days ? new Date(Date.now() - days * 86400000) : null
  const where = since ? { createdAt: { gte: since } } : {}

  const [total, byModule, byUser, byUserModule, recent] = await Promise.all([
    prisma.moduleVisit.count({ where }),
    prisma.moduleVisit.groupBy({ by: ['moduleLabel'], where, _count: { _all: true }, orderBy: { _count: { moduleLabel: 'desc' } } }),
    prisma.moduleVisit.groupBy({ by: ['userId'], where, _count: { _all: true }, _max: { createdAt: true }, orderBy: { _count: { userId: 'desc' } } }),
    prisma.moduleVisit.groupBy({ by: ['userId', 'moduleLabel'], where, _count: { _all: true } }),
    prisma.moduleVisit.findMany({ where, orderBy: { createdAt: 'desc' }, take: 40, select: { id: true, moduleLabel: true, createdAt: true, user: { select: { name: true } } } }),
  ])

  // Noms des membres
  const userIds = byUser.map((u) => u.userId)
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
  const userMap = new Map(users.map((u) => [u.id, u]))

  // Module favori par membre
  const topModuleByUser = new Map<number, { label: string; count: number }>()
  for (const row of byUserModule) {
    const cur = topModuleByUser.get(row.userId)
    const c = row._count._all
    if (!cur || c > cur.count) topModuleByUser.set(row.userId, { label: row.moduleLabel, count: c })
  }

  const maxModuleCount = byModule.length ? byModule[0]._count._all : 0
  const activeUsers = byUser.length

  const periods = [
    { key: '7', label: '7 jours' },
    { key: '30', label: '30 jours' },
    { key: 'all', label: 'Tout' },
  ]

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit d&apos;usage</h1>
        <p className="text-gray-500 mt-1">Quels modules vos membres utilisent réellement, et qui les utilise.</p>
      </div>

      {/* Période */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Période :</span>
        {periods.map((p) => (
          <Link
            key={p.key}
            href={`/admin/usage?days=${p.key}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${daysParam === p.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-500 mt-0.5">visites de modules</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-2xl font-bold text-gray-900">{activeUsers}</p>
          <p className="text-xs text-gray-500 mt-0.5">membres actifs</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-2xl font-bold text-gray-900">{byModule.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">modules distincts</p>
        </div>
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center text-gray-400">
          <p className="text-3xl mb-2">📊</p>
          <p className="font-medium text-gray-500">Aucune donnée d&apos;usage sur cette période.</p>
          <p className="text-sm">Les visites seront enregistrées au fur et à mesure que les membres naviguent.</p>
        </div>
      ) : (
        <>
          {/* Modules les plus utilisés */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Modules les plus utilisés</h3></div>
            <ul className="divide-y divide-gray-50">
              {byModule.map((m) => (
                <li key={m.moduleLabel} className="px-5 py-2.5">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-sm font-medium text-gray-800">{m.moduleLabel}</span>
                    <span className="text-xs text-gray-400 tabular-nums">{m._count._all}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${maxModuleCount ? (m._count._all / maxModuleCount) * 100 : 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Activité par membre */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Activité par membre</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="px-5 py-2 font-medium">Membre</th>
                    <th className="px-3 py-2 font-medium text-right">Visites</th>
                    <th className="px-3 py-2 font-medium">Module favori</th>
                    <th className="px-5 py-2 font-medium">Dernier passage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {byUser.map((u) => {
                    const usr = userMap.get(u.userId)
                    const top = topModuleByUser.get(u.userId)
                    return (
                      <tr key={u.userId}>
                        <td className="px-5 py-2.5">
                          <p className="font-medium text-gray-900">{usr?.name || 'Membre'}</p>
                          <p className="text-[11px] text-gray-400">{usr?.email}</p>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{u._count._all}</td>
                        <td className="px-3 py-2.5 text-gray-600">{top ? `${top.label} (${top.count})` : '—'}</td>
                        <td className="px-5 py-2.5 text-gray-500">{u._max.createdAt ? fmtDateTime(u._max.createdAt) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activité récente */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Activité récente</h3></div>
            <ul className="divide-y divide-gray-50">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-2 text-sm">
                  <span className="text-gray-700"><span className="font-medium text-gray-900">{r.user?.name || 'Membre'}</span> → {r.moduleLabel}</span>
                  <span className="text-xs text-gray-400 shrink-0">{fmtDateTime(r.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <p className="text-[11px] text-gray-400">L&apos;audit enregistre chaque ouverture de module par un membre connecté. Les pages d&apos;administration ne sont pas tracées.</p>
    </div>
  )
}

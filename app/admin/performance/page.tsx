'use client'

import { useState, useEffect, useCallback } from 'react'

interface Perf {
  generatedAt: string
  serverComputeMs: number
  system: any
  app: any
  database: any
  disk: any
  history?: any[]
}

function fmtBytes(b: number | undefined | null) {
  if (b == null) return '—'
  if (b < 1024) return `${b} o`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} Mo`
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} Go`
}
function fmtDuration(sec: number) {
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60)
  if (d > 0) return `${d} j ${h} h`
  if (h > 0) return `${h} h ${m} min`
  return `${m} min`
}

function Gauge({ percent, warn = 75, danger = 90 }: { percent: number; warn?: number; danger?: number }) {
  const color = percent >= danger ? 'bg-red-500' : percent >= warn ? 'bg-amber-500' : 'bg-green-500'
  return (
    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
      <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, percent)}%` }} />
    </div>
  )
}

function Sparkline({ points, max = 100, color = '#6366f1', height = 40, unit = '%' }: { points: number[]; max?: number; color?: string; height?: number; unit?: string }) {
  if (points.length < 2) return <p className="text-xs text-gray-400 py-3">Pas encore assez de données (le suivi se remplit toutes les 15 min).</p>
  const w = 300
  const m = Math.max(max, ...points)
  const step = w / (points.length - 1)
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(height - (p / m) * height).toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <path d={`${d} L${w},${height} L0,${height} Z`} fill={color} opacity={0.08} />
        <path d={d} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
      <p className="text-[11px] text-gray-400 mt-0.5">Actuel : <span className="font-semibold text-gray-600">{last}{unit}</span> · max {Math.round(m)}{unit}</p>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right">{value}{sub && <span className="text-xs font-normal text-gray-400 ml-1">{sub}</span>}</span>
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">{icon} {title}</h2>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  )
}

function Badge({ ok, warn, label }: { ok: boolean; warn?: boolean; label: string }) {
  const cls = ok ? 'bg-green-50 text-green-700 border-green-200' : warn ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
}

export default function AdminPerformancePage() {
  const [data, setData] = useState<Perf | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [roundtrip, setRoundtrip] = useState<number | null>(null)
  const [bench, setBench] = useState<{ avg: number; min: number; max: number; n: number } | null>(null)
  const [benching, setBenching] = useState(false)

  const runBench = async () => {
    setBenching(true); setBench(null)
    const N = 12; const times: number[] = []
    for (let i = 0; i < N; i++) {
      const t = performance.now()
      try { await fetch('/api/settings', { cache: 'no-store' }) } catch {}
      times.push(performance.now() - t)
    }
    setBench({ avg: Math.round(times.reduce((a, b) => a + b, 0) / N), min: Math.round(Math.min(...times)), max: Math.round(Math.max(...times)), n: N })
    setBenching(false)
  }

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const t0 = performance.now()
    try {
      const res = await fetch('/api/admin/performance')
      if (!res.ok) { setError('Erreur lors de la mesure.'); setLoading(false); return }
      setData(await res.json())
      setRoundtrip(Math.round(performance.now() - t0))
    } catch { setError('Serveur injoignable.') }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance serveur</h1>
          <p className="text-sm text-gray-500 mt-1">Santé en temps réel du serveur : système, application, base de données et disque.</p>
        </div>
        <button onClick={load} disabled={loading} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50">
          {loading ? 'Mesure…' : '↻ Relancer le test'}
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 mb-4">{error}</div>}

      {!data ? (
        <p className="text-gray-500 py-8">{loading ? 'Mesure en cours…' : 'Aucune donnée.'}</p>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap mb-4 text-xs text-gray-400">
            <span>Mesuré le {new Date(data.generatedAt).toLocaleString('fr-FR')}</span>
            <span>·</span>
            <span>Calcul serveur : {data.serverComputeMs} ms</span>
            {roundtrip != null && <><span>·</span><span>Aller-retour réseau : {roundtrip} ms</span></>}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Système */}
            <Card title="Système" icon="🖥️">
              <Stat label="Hôte" value={data.system.hostname} />
              <Stat label="OS" value={data.system.platform} />
              <Stat label="CPU" value={`${data.system.cpuCount} cœurs`} sub={data.system.cpuModel} />
              <div className="py-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-500">Charge CPU (1 min)</span>
                  <span className="text-sm font-semibold text-gray-900">{data.system.loadPercent}% <span className="text-xs text-gray-400">({data.system.load1} / {data.system.load5} / {data.system.load15})</span></span>
                </div>
                <Gauge percent={data.system.loadPercent} />
              </div>
              <div className="py-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-500">Mémoire</span>
                  <span className="text-sm font-semibold text-gray-900">{data.system.memPercent}% <span className="text-xs text-gray-400">({fmtBytes(data.system.memUsed)} / {fmtBytes(data.system.memTotal)})</span></span>
                </div>
                <Gauge percent={data.system.memPercent} />
              </div>
              <Stat label="Uptime serveur" value={fmtDuration(data.system.uptimeSec)} />
            </Card>

            {/* Application */}
            <Card title="Application (Node)" icon="⚙️">
              <Stat label="Version Node" value={data.app.nodeVersion} />
              <Stat label="Fuseau horaire" value={data.app.tz} />
              <Stat label="Uptime du process" value={fmtDuration(data.app.uptimeSec)} />
              <Stat label="Mémoire (RSS)" value={fmtBytes(data.app.rss)} />
              <Stat label="Heap utilisé" value={`${fmtBytes(data.app.heapUsed)} / ${fmtBytes(data.app.heapTotal)}`} />
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-500">Latence boucle d'événements</span>
                <span className="flex items-center gap-2">
                  <Badge ok={data.app.eventLoopLagMs < 30} warn={data.app.eventLoopLagMs < 100} label={`${data.app.eventLoopLagMs} ms`} />
                </span>
              </div>
            </Card>

            {/* Base de données */}
            <Card title="Base de données" icon="🗄️">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-500">Latence requête</span>
                {data.database.pingError
                  ? <Badge ok={false} label="Erreur" />
                  : <Badge ok={data.database.pingMs < 50} warn={data.database.pingMs < 200} label={`${data.database.pingMs} ms`} />}
              </div>
              <Stat label="Taille de la base" value={fmtBytes(data.database.sizeBytes)} />
              {data.database.counts && (
                <div className="pt-2">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {Object.entries(data.database.counts).map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-gray-50 border border-gray-100 py-1.5">
                        <p className="text-base font-bold text-gray-800">{String(v)}</p>
                        <p className="text-[10px] text-gray-400 capitalize">{k}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Disque */}
            <Card title="Disque & stockage" icon="💾">
              {data.disk.error ? (
                <p className="text-sm text-gray-400 py-2">Espace disque indisponible ({data.disk.error}).</p>
              ) : (
                <div className="py-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500">Espace disque</span>
                    <span className="text-sm font-semibold text-gray-900">{data.disk.percent}% <span className="text-xs text-gray-400">({fmtBytes(data.disk.used)} / {fmtBytes(data.disk.total)})</span></span>
                  </div>
                  <Gauge percent={data.disk.percent} warn={80} danger={92} />
                  <p className="text-xs text-gray-400 mt-1">Libre : {fmtBytes(data.disk.free)}</p>
                </div>
              )}
              <Stat label="Dossier /uploads" value={fmtBytes(data.disk.uploadsBytes)} />
            </Card>
          </div>

          {/* Test de débit */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 mt-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">⚡ Test de débit réseau</h2>
              <button onClick={runBench} disabled={benching} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                {benching ? 'Test…' : 'Lancer 12 requêtes'}
              </button>
            </div>
            {bench ? (
              <div className="grid grid-cols-3 gap-3 mt-3 text-center">
                <div className="rounded-lg bg-gray-50 border border-gray-100 py-2"><p className="text-lg font-bold text-gray-800">{bench.avg} ms</p><p className="text-[10px] text-gray-400">moyenne</p></div>
                <div className="rounded-lg bg-gray-50 border border-gray-100 py-2"><p className="text-lg font-bold text-green-700">{bench.min} ms</p><p className="text-[10px] text-gray-400">min</p></div>
                <div className="rounded-lg bg-gray-50 border border-gray-100 py-2"><p className="text-lg font-bold text-amber-600">{bench.max} ms</p><p className="text-[10px] text-gray-400">max</p></div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-2">Mesure le temps aller-retour réseau depuis votre navigateur (12 requêtes vers le serveur).</p>
            )}
          </div>

          {/* Historique 48 h */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 mt-4">
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">📈 Historique (48 h)</h2>
            <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
              <div><p className="text-xs font-semibold text-gray-500 mb-1">Charge CPU</p><Sparkline points={(data.history || []).map((h: any) => h.loadPercent)} color="#6366f1" /></div>
              <div><p className="text-xs font-semibold text-gray-500 mb-1">Mémoire</p><Sparkline points={(data.history || []).map((h: any) => h.memPercent)} color="#0ea5e9" /></div>
              <div><p className="text-xs font-semibold text-gray-500 mb-1">Disque</p><Sparkline points={(data.history || []).map((h: any) => h.diskPercent)} color="#f59e0b" /></div>
              <div><p className="text-xs font-semibold text-gray-500 mb-1">Latence BDD</p><Sparkline points={(data.history || []).map((h: any) => h.dbPingMs)} color="#10b981" max={50} unit=" ms" /></div>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Seuils indicatifs : 🟢 OK · 🟠 à surveiller · 🔴 critique. Une alerte e-mail est envoyée à l'admin si CPU/mémoire/disque dépasse 90 %. Le suivi historique s'enregistre toutes les 15 min.
          </p>
        </>
      )}
    </div>
  )
}

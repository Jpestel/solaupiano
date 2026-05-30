'use client'

import { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { TutorialButton } from '@/components/ui/TutorialButton'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string
  label: string
  count: number
  consumption: number // L/100km
  fuelPrice: number   // €/L
  passengers: number
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 8)

const DEFAULT_VEHICLE = (): Vehicle => ({
  id: uid(),
  label: 'Véhicule',
  count: 1,
  consumption: 7.0,
  fuelPrice: 1.82,
  passengers: 4,
})

const PRESETS: { label: string; consumption: number; fuelPrice: number }[] = [
  { label: 'Petite voiture essence', consumption: 5.5,  fuelPrice: 1.78 },
  { label: 'Berline diesel',          consumption: 5.0,  fuelPrice: 1.62 },
  { label: 'SUV / break',             consumption: 7.5,  fuelPrice: 1.78 },
  { label: 'Monospace / van 7p',      consumption: 8.5,  fuelPrice: 1.62 },
  { label: 'Grand van 9p',            consumption: 10.5, fuelPrice: 1.62 },
  { label: 'Camionnette',             consumption: 12.0, fuelPrice: 1.62 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt  = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)
const fmtL = (n: number) => n.toFixed(1).replace('.', ',') + ' L'
const fmtKm = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' km'

async function geocode(city: string): Promise<{ lat: number; lon: number; display: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1&accept-language=fr`
  const res = await fetch(url, { headers: { 'User-Agent': 'SolauPiano/1.0 (solaupiano.fr)' } })
  if (!res.ok) return null
  const data = await res.json()
  if (!data.length) return null
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name }
}

async function getRoute(a: { lat: number; lon: number }, b: { lat: number; lon: number }): Promise<number | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  if (data.code !== 'Ok' || !data.routes?.length) return null
  return Math.round(data.routes[0].distance / 1000) // m → km
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function KilometriqueCalculatorPage() {
  const [departure, setDeparture] = useState('')
  const [arrival,   setArrival]   = useState('')
  const [distance,  setDistance]  = useState<number | null>(null)
  const [manualKm,  setManualKm]  = useState('')
  const [manualMode, setManualMode] = useState(false)
  const [roundTrip, setRoundTrip] = useState(true)
  const [vehicles,  setVehicles]  = useState<Vehicle[]>([DEFAULT_VEHICLE()])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [routeNote, setRouteNote] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  // ── Route search ────────────────────────────────────────────────────────────

  const handleSearch = async () => {
    if (!departure.trim() || !arrival.trim()) {
      setError('Veuillez renseigner les deux villes.')
      return
    }
    setLoading(true)
    setError('')
    setDistance(null)
    setManualMode(false)

    const [depGeo, arrGeo] = await Promise.all([
      geocode(departure),
      geocode(arrival),
    ])

    if (!depGeo) { setError(`Ville "${departure}" introuvable. Entrez la distance manuellement.`); setManualMode(true); setLoading(false); return }
    if (!arrGeo) { setError(`Ville "${arrival}" introuvable. Entrez la distance manuellement.`); setManualMode(true); setLoading(false); return }

    const km = await getRoute(depGeo, arrGeo)
    if (!km) { setError('Impossible de calculer l\'itinéraire. Entrez la distance manuellement.'); setManualMode(true); setLoading(false); return }

    setDistance(km)
    setRouteNote(`Itinéraire estimé via OpenStreetMap`)
    setLoading(false)
  }

  // ── Vehicles ────────────────────────────────────────────────────────────────

  const updateVehicle = (id: string, patch: Partial<Vehicle>) =>
    setVehicles(vs => vs.map(v => v.id === id ? { ...v, ...patch } : v))

  const applyPreset = (id: string, preset: typeof PRESETS[0]) =>
    updateVehicle(id, { consumption: preset.consumption, fuelPrice: preset.fuelPrice })

  // ── Calculations ────────────────────────────────────────────────────────────

  const effectiveKm = distance ?? parseFloat(manualKm.replace(',', '.') || '0')

  const results = useMemo(() => {
    const totalKm = effectiveKm * (roundTrip ? 2 : 1)
    if (!totalKm) return null

    const vehicleRows = vehicles.map(v => {
      const litresPerVehicle = totalKm * v.consumption / 100
      const litresTotal      = litresPerVehicle * v.count
      const costPerVehicle   = litresPerVehicle * v.fuelPrice
      const costTotal        = costPerVehicle * v.count
      const passTotal        = v.count * v.passengers
      return { ...v, litresPerVehicle, litresTotal, costPerVehicle, costTotal, passTotal }
    })

    const grandTotal      = vehicleRows.reduce((s, r) => s + r.costTotal, 0)
    const totalPassengers = vehicleRows.reduce((s, r) => s + r.passTotal, 0)
    const perPerson       = totalPassengers > 0 ? grandTotal / totalPassengers : 0

    return { totalKm, vehicleRows, grandTotal, totalPassengers, perPerson }
  }, [effectiveKm, roundTrip, vehicles])

  // ── Print ───────────────────────────────────────────────────────────────────

  const handlePrint = () => {
    if (!results) return
    const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    const tripLabel = roundTrip ? 'Aller-retour' : 'Aller simple'

    const vehicleRows = results.vehicleRows.map(v => `
      <tr>
        <td>${v.count}× ${v.label}</td>
        <td>${v.consumption.toFixed(1).replace('.', ',')} L/100 km</td>
        <td>${v.fuelPrice.toFixed(2).replace('.', ',')} €/L</td>
        <td>${v.passTotal} pers.</td>
        <td>${fmtL(v.litresTotal)}</td>
        <td><strong>${fmt(v.costTotal)}</strong></td>
      </tr>`).join('')

    const pw = window.open('', '_blank', 'width=800,height=960')
    if (!pw) return
    pw.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
      <title>Devis frais kilométriques — ${departure} → ${arrival}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:-apple-system,Arial,sans-serif;padding:40px;color:#111;max-width:740px;margin:0 auto}
        .actions{text-align:center;margin-bottom:28px;display:flex;gap:10px;justify-content:center}
        .actions button{padding:10px 22px;border-radius:8px;border:none;cursor:pointer;font-size:14px;font-weight:600}
        .btn-print{background:#4f46e5;color:white}.btn-close{background:#f3f4f6;color:#374151}
        h1{font-size:22px;font-weight:800;color:#111;margin-bottom:4px}
        .sub{font-size:13px;color:#6b7280;margin-bottom:24px}
        .meta{display:flex;gap:24px;margin-bottom:24px;flex-wrap:wrap}
        .meta-item{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 16px}
        .meta-item .l{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:2px}
        .meta-item .v{font-size:16px;font-weight:700;color:#111}
        table{width:100%;border-collapse:collapse;margin-bottom:20px}
        th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;padding:8px;background:#f9fafb;border-bottom:2px solid #e5e7eb}
        td{padding:10px 8px;border-bottom:1px solid #f3f4f6;font-size:13px}
        .total-row{background:#f0f4ff;font-weight:700}
        .total-row td{font-size:14px;border-bottom:none;padding:12px 8px}
        .footer{margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;display:flex;justify-content:space-between}
        .disclaimer{font-size:11px;color:#9ca3af;margin-top:8px}
        @media print{.actions{display:none!important}body{padding:20px}}
      </style></head><body>
      <div class="actions">
        <button class="btn-print" onclick="window.print()">🖨️&nbsp; Imprimer</button>
        <button class="btn-close" onclick="window.close()">✕ Fermer</button>
      </div>
      <h1>🚗 Devis frais kilométriques</h1>
      <div class="sub">Établi le ${date}</div>
      <div class="meta">
        <div class="meta-item"><div class="l">Départ</div><div class="v">${departure}</div></div>
        <div class="meta-item"><div class="l">Destination</div><div class="v">${arrival}</div></div>
        <div class="meta-item"><div class="l">Type de trajet</div><div class="v">${tripLabel}</div></div>
        <div class="meta-item"><div class="l">Distance</div><div class="v">${fmtKm(results.totalKm)}</div></div>
      </div>
      <table>
        <thead><tr>
          <th>Véhicule</th><th>Conso.</th><th>Carburant</th><th>Passagers</th><th>Litres</th><th>Coût</th>
        </tr></thead>
        <tbody>
          ${vehicleRows}
          <tr class="total-row">
            <td colspan="3">Total (${results.totalPassengers} personnes)</td>
            <td></td>
            <td>${fmtL(results.vehicleRows.reduce((s,v)=>s+v.litresTotal,0))}</td>
            <td>${fmt(results.grandTotal)}</td>
          </tr>
        </tbody>
      </table>
      ${results.totalPassengers > 0 ? `<p style="font-size:14px;font-weight:700;color:#4f46e5;margin-bottom:8px">→ Coût par personne : ${fmt(results.perPerson)}</p>` : ''}
      <div class="disclaimer">⚠️ Estimation basée sur les paramètres saisis. Frais de péage non inclus. Distance via OpenStreetMap.</div>
      <div class="footer">
        <span>Sol au piano · solaupiano.fr</span>
        <span>${date}</span>
      </div>
    </body></html>`)
    pw.document.close()
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/tableau-de-bord" className="hover:text-indigo-600">Accueil</Link>
            <span>/</span>
            <span className="text-gray-900">Frais kilométriques</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">🚗 Frais kilométriques</h1>
          <p className="text-sm text-gray-500 mt-0.5">Estimez le coût de déplacement pour un concert — carburant, véhicules, passagers.</p>
        </div>
        <TutorialButton moduleKey="tool_kilometrique" />
      </div>

      <div className="max-w-2xl space-y-5">

        {/* ── Route ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Itinéraire</p>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ville de départ</label>
              <input
                type="text"
                value={departure}
                onChange={e => setDeparture(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="ex : Paris"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="text-gray-400 text-xl font-light text-center pb-1.5">→</div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ville d&apos;arrivée</label>
              <input
                type="text"
                value={arrival}
                onChange={e => setArrival(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="ex : Lyon"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors flex items-center gap-2"
            >
              {loading ? (
                <><span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />Calcul en cours…</>
              ) : '🗺️ Calculer la distance'}
            </button>
            <button
              onClick={() => { setManualMode(true); setDistance(null); setError('') }}
              className="text-xs text-gray-400 hover:text-indigo-600 underline transition-colors"
            >
              Entrer la distance manuellement
            </button>
          </div>

          {error && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">{error}</div>
          )}

          {/* Distance result */}
          {distance !== null && !manualMode && (
            <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 flex items-center gap-3">
              <span className="text-2xl font-black text-indigo-700">{fmtKm(distance)}</span>
              <div>
                <p className="text-xs font-semibold text-indigo-600">Distance (aller simple)</p>
                {routeNote && <p className="text-[10px] text-indigo-400">{routeNote}</p>}
              </div>
              <button onClick={() => { setDistance(null); setManualMode(true) }} className="ml-auto text-xs text-indigo-400 hover:text-indigo-700 underline">Modifier</button>
            </div>
          )}

          {/* Manual distance input */}
          {manualMode && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Distance aller simple (km)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={manualKm}
                  onChange={e => setManualKm(e.target.value)}
                  placeholder="ex : 450"
                  className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <span className="text-sm text-gray-500">km</span>
              </div>
            </div>
          )}

          {/* Aller / AR toggle */}
          {(distance !== null || (manualMode && parseFloat(manualKm) > 0)) && (
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-gray-600 mr-1">Type de trajet :</p>
              {(['aller', 'aller-retour'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setRoundTrip(t === 'aller-retour')}
                  className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
                    (t === 'aller-retour') === roundTrip
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  {t === 'aller' ? '→ Aller simple' : '↔ Aller-retour'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Vehicles ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Véhicules</p>
            {vehicles.length < 4 && (
              <button
                onClick={() => setVehicles(vs => [...vs, { ...DEFAULT_VEHICLE(), label: `Véhicule ${vs.length + 1}` }])}
                className="text-xs text-indigo-600 hover:text-indigo-500 font-medium"
              >
                + Ajouter un véhicule
              </button>
            )}
          </div>

          {vehicles.map((v, idx) => (
            <div key={v.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  value={v.label}
                  onChange={e => updateVehicle(v.id, { label: e.target.value })}
                  className="text-sm font-semibold text-gray-800 bg-transparent border-0 border-b border-dashed border-gray-300 focus:outline-none focus:border-indigo-400 px-0 py-0.5 w-32"
                />
                {/* Preset picker */}
                <select
                  onChange={e => {
                    const p = PRESETS[Number(e.target.value)]
                    if (p) applyPreset(v.id, p)
                    e.target.value = ''
                  }}
                  defaultValue=""
                  className="text-xs rounded-lg border border-gray-200 px-2 py-1 text-gray-500 focus:outline-none"
                >
                  <option value="" disabled>Appliquer un profil…</option>
                  {PRESETS.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
                </select>
                {vehicles.length > 1 && (
                  <button onClick={() => setVehicles(vs => vs.filter(x => x.id !== v.id))} className="text-xs text-red-400 hover:text-red-600 ml-auto">✕</button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 font-medium mb-1">Nb véhicules</label>
                  <input type="number" min={1} max={20} value={v.count} onChange={e => updateVehicle(v.id, { count: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 font-medium mb-1">Conso. (L/100km)</label>
                  <input type="number" min={1} max={30} step={0.1} value={v.consumption} onChange={e => updateVehicle(v.id, { consumption: parseFloat(e.target.value) || 7 })}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 font-medium mb-1">Prix carburant (€/L)</label>
                  <input type="number" min={0.5} max={5} step={0.01} value={v.fuelPrice} onChange={e => updateVehicle(v.id, { fuelPrice: parseFloat(e.target.value) || 1.82 })}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 font-medium mb-1">Passagers / véh.</label>
                  <input type="number" min={1} max={20} value={v.passengers} onChange={e => updateVehicle(v.id, { passengers: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Results ── */}
        {results && (
          <div ref={printRef} className="rounded-xl border-2 border-indigo-200 bg-indigo-50/40 p-5 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Résultat — {departure && arrival ? `${departure} → ${arrival}` : 'Estimation'}
              {' · '}{roundTrip ? 'Aller-retour' : 'Aller simple'}{' · '}{fmtKm(results.totalKm)}
            </p>

            {/* Per-vehicle breakdown */}
            <div className="space-y-2">
              {results.vehicleRows.map(v => (
                <div key={v.id} className="rounded-xl bg-white border border-indigo-100 px-4 py-3 flex items-center gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800">{v.count}× {v.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{v.consumption.toFixed(1).replace('.', ',')} L/100km · {v.fuelPrice.toFixed(2).replace('.', ',')} €/L · {v.passTotal} passager{v.passTotal > 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-black text-indigo-700">{fmt(v.costTotal)}</p>
                    <p className="text-xs text-gray-400">{fmtL(v.litresTotal)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Grand total */}
            <div className="rounded-xl bg-indigo-600 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wide">Total carburant</p>
                <p className="text-3xl font-black text-white mt-0.5">{fmt(results.grandTotal)}</p>
              </div>
              {results.totalPassengers > 1 && (
                <div className="text-right">
                  <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wide">{results.totalPassengers} personnes</p>
                  <p className="text-xl font-bold text-white mt-0.5">{fmt(results.perPerson)} / pers.</p>
                </div>
              )}
            </div>

            {/* Disclaimer + print */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <p className="text-[10px] text-gray-400 leading-relaxed max-w-xs">
                ⚠️ Frais de péage et de parking non inclus. Distance estimée via OpenStreetMap. Prix carburant à titre indicatif.
              </p>
              <button
                onClick={handlePrint}
                className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
              >
                🖨️ Imprimer / Devis
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

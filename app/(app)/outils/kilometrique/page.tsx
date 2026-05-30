'use client'

import { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { TutorialButton } from '@/components/ui/TutorialButton'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string
  label: string
  consumption: number // L/100km
  fuelPrice: number   // €/L
  passengers: number
  tolls: number       // € péages aller simple
}

interface Expense {
  id: string
  label: string
  unitAmount: number  // € par unité
  qty: number         // nombre d'unités
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 8)

const DEFAULT_VEHICLE = (n = 1): Vehicle => ({
  id: uid(),
  label: `Véhicule ${n}`,
  consumption: 7.0,
  fuelPrice: 1.82,
  passengers: 4,
  tolls: 0,
})

const EXPENSE_SUGGESTIONS = [
  { icon: '🚌', label: 'Location véhicule' },
  { icon: '🚍', label: 'Car de tournée' },
  { icon: '⛴️', label: 'Ferry' },
  { icon: '🚂', label: 'Train' },
  { icon: '✈️', label: 'Avion' },
  { icon: '🅿️', label: 'Parking' },
  { icon: '🏨', label: 'Hébergement' },
  { icon: '🚢', label: 'Bateau / croisière' },
  { icon: '🚕', label: 'Taxi / VTC' },
  { icon: '🎒', label: 'Bagages / excédents' },
  { icon: '🔧', label: 'Assistance routière' },
  { icon: '📦', label: 'Transport matériel' },
]

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
  const [expenses,  setExpenses]  = useState<Expense[]>([])
  const [cachet,    setCachet]    = useState('')
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

    const trips = roundTrip ? 2 : 1

    const vehicleRows = vehicles.map(v => {
      const litres    = totalKm * v.consumption / 100
      const fuelCost  = litres * v.fuelPrice
      const tollCost  = v.tolls * trips
      const costTotal = fuelCost + tollCost
      return { ...v, litres, fuelCost, tollCost, costTotal }
    })

    const totalVehicles   = vehicleRows.reduce((s, r) => s + r.costTotal, 0)
    const totalFuel       = vehicleRows.reduce((s, r) => s + r.fuelCost, 0)
    const totalTolls      = vehicleRows.reduce((s, r) => s + r.tollCost, 0)
    const totalPassengers = vehicleRows.reduce((s, r) => s + r.passengers, 0)

    const expenseRows = expenses.map(e => ({
      ...e,
      total: e.unitAmount * e.qty,
    }))
    const totalExtras = expenseRows.reduce((s, e) => s + e.total, 0)

    const grandTotal  = totalVehicles + totalExtras
    const perPerson   = totalPassengers > 0 ? grandTotal / totalPassengers : 0

    const cachetVal   = parseFloat(cachet.replace(',', '.') || '0') || 0
    const solde       = cachetVal - grandTotal
    const soldePerPerson = totalPassengers > 0 ? solde / totalPassengers : 0

    return { totalKm, vehicleRows, totalVehicles, totalFuel, totalTolls, expenseRows, totalExtras, grandTotal, totalPassengers, perPerson, cachetVal, solde, soldePerPerson }
  }, [effectiveKm, roundTrip, vehicles, expenses, cachet])

  // ── Print ───────────────────────────────────────────────────────────────────

  const handlePrint = () => {
    if (!results) return
    const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    const tripLabel = roundTrip ? 'Aller-retour' : 'Aller simple'

    const vehicleRows = results.vehicleRows.map(v => `
      <tr>
        <td>${v.label}</td>
        <td>${v.consumption.toFixed(1).replace('.', ',')} L/100 km</td>
        <td>${v.fuelPrice.toFixed(2).replace('.', ',')} €/L</td>
        <td>${v.passengers} pers.</td>
        <td>${fmtL(v.litres)}</td>
        <td>${fmt(v.fuelCost)}</td>
        <td>${v.tollCost > 0 ? fmt(v.tollCost) : '—'}</td>
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
          <th>Véhicule</th><th>Conso.</th><th>Carburant</th><th>Passagers</th><th>Litres</th><th>⛽ Carburant</th><th>🛣️ Péages</th><th>Total</th>
        </tr></thead>
        <tbody>
          ${vehicleRows}
          <tr class="total-row">
            <td colspan="4">Total (${results.totalPassengers} personnes)</td>
            <td>${fmtL(results.vehicleRows.reduce((s,v)=>s+v.litres,0))}</td>
            <td>${fmt(results.totalFuel)}</td>
            <td>${results.totalTolls > 0 ? fmt(results.totalTolls) : '—'}</td>
            <td>${fmt(results.grandTotal)}</td>
          </tr>
        </tbody>
      </table>
      ${results.expenseRows.length > 0 ? `
        <h2 style="font-size:14px;font-weight:700;color:#374151;margin:20px 0 8px">Frais supplémentaires</h2>
        <table>
          <thead><tr><th>Poste</th><th>Montant unitaire</th><th>Quantité</th><th>Total</th></tr></thead>
          <tbody>
            ${results.expenseRows.map(e => `
              <tr>
                <td>${e.label || 'Sans libellé'}</td>
                <td>${fmt(e.unitAmount)}</td>
                <td>${e.qty}</td>
                <td><strong>${fmt(e.total)}</strong></td>
              </tr>`).join('')}
            <tr class="total-row">
              <td colspan="3">Sous-total frais supplémentaires</td>
              <td>${fmt(results.totalExtras)}</td>
            </tr>
          </tbody>
        </table>` : ''}
      <table style="margin-top:16px;border:2px solid #e0e7ff;border-radius:10px;overflow:hidden">
        <tbody>
          ${results.cachetVal > 0 ? `
          <tr style="background:#fffbeb">
            <td style="padding:12px 16px;font-weight:700;color:#92400e">💰 Cachet prévu</td>
            <td style="padding:12px 16px;text-align:right;font-size:18px;font-weight:800;color:#92400e">${fmt(results.cachetVal)}</td>
          </tr>` : ''}
          <tr style="background:#4f46e5;color:white">
            <td style="padding:12px 16px;font-weight:700">🚗 Total frais de déplacement</td>
            <td style="padding:12px 16px;text-align:right;font-size:18px;font-weight:800">${fmt(results.grandTotal)}</td>
          </tr>
          ${results.cachetVal > 0 ? `
          <tr style="background:${results.solde >= 0 ? '#f0fdf4' : '#fef2f2'}">
            <td style="padding:12px 16px;font-weight:700;color:${results.solde >= 0 ? '#15803d' : '#dc2626'}">${results.solde >= 0 ? '✅ Solde net après frais' : '⚠️ Déficit'}</td>
            <td style="padding:12px 16px;text-align:right;font-size:20px;font-weight:800;color:${results.solde >= 0 ? '#15803d' : '#dc2626'}">${fmt(results.solde)}</td>
          </tr>` : ''}
          ${results.totalPassengers > 1 ? `
          <tr style="background:#f9fafb">
            <td style="padding:8px 16px;font-size:12px;color:#6b7280">Par personne (${results.totalPassengers} pers.)</td>
            <td style="padding:8px 16px;text-align:right;font-size:13px;font-weight:700;color:#374151">
              ${results.cachetVal > 0 ? `Solde : ${fmt(results.soldePerPerson)} · ` : ''}Frais : ${fmt(results.perPerson)}
            </td>
          </tr>` : ''}
        </tbody>
      </table>
      <div class="disclaimer">⚠️ Estimation basée sur les paramètres saisis. Distance via OpenStreetMap. Prix carburant à titre indicatif.</div>
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
            {vehicles.length < 8 && (
              <button
                onClick={() => setVehicles(vs => [...vs, DEFAULT_VEHICLE(vs.length + 1)])}
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
                  <label className="block text-[10px] text-gray-400 font-medium mb-1">Nb passagers</label>
                  <input type="number" min={1} max={20} value={v.passengers} onChange={e => updateVehicle(v.id, { passengers: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 font-medium mb-1">
                    Péages aller (€)
                    <a href="https://www.autoroutes.fr/index.htm?lang=fr" target="_blank" rel="noreferrer"
                      className="ml-1 text-indigo-400 hover:text-indigo-600" title="Consulter autoroutes.fr">ⓘ</a>
                  </label>
                  <input type="number" min={0} step={0.10} value={v.tolls} onChange={e => updateVehicle(v.id, { tolls: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Frais supplémentaires ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Frais supplémentaires</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Location, ferry, train, hébergement, parking…</p>
            </div>
          </div>

          {/* Suggestions rapides */}
          <div className="flex flex-wrap gap-1.5">
            {EXPENSE_SUGGESTIONS.map(s => (
              <button
                key={s.label}
                onClick={() => setExpenses(es => [...es, { id: uid(), label: `${s.icon} ${s.label}`, unitAmount: 0, qty: 1 }])}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                {s.icon} {s.label}
              </button>
            ))}
            <button
              onClick={() => setExpenses(es => [...es, { id: uid(), label: '', unitAmount: 0, qty: 1 }])}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-600 hover:bg-indigo-100 transition-colors font-medium"
            >
              ✏️ Autre…
            </button>
          </div>

          {/* Lignes de frais */}
          {expenses.length > 0 && (
            <div className="space-y-2">
              {expenses.map(e => (
                <div key={e.id} className="flex items-center gap-2 flex-wrap">
                  {/* Libellé */}
                  <input
                    type="text"
                    value={e.label}
                    onChange={ev => setExpenses(es => es.map(x => x.id === e.id ? { ...x, label: ev.target.value } : x))}
                    placeholder="Libellé"
                    className="flex-1 min-w-[140px] rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  {/* Montant unitaire */}
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={e.unitAmount}
                      onChange={ev => setExpenses(es => es.map(x => x.id === e.id ? { ...x, unitAmount: parseFloat(ev.target.value) || 0 } : x))}
                      placeholder="0"
                      className="w-24 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <span className="text-xs text-gray-400">€</span>
                  </div>
                  {/* Quantité */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">×</span>
                    <input
                      type="number"
                      min={1}
                      value={e.qty}
                      onChange={ev => setExpenses(es => es.map(x => x.id === e.id ? { ...x, qty: parseInt(ev.target.value) || 1 } : x))}
                      className="w-14 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  {/* Sous-total */}
                  <span className="text-sm font-semibold text-indigo-700 w-20 text-right tabular-nums">
                    {fmt(e.unitAmount * e.qty)}
                  </span>
                  {/* Supprimer */}
                  <button
                    onClick={() => setExpenses(es => es.filter(x => x.id !== e.id))}
                    className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Sous-total frais */}
              <div className="flex justify-end pt-1 border-t border-gray-100">
                <span className="text-xs text-gray-500 mr-2">Sous-total frais :</span>
                <span className="text-sm font-bold text-gray-700">
                  {fmt(expenses.reduce((s, e) => s + e.unitAmount * e.qty, 0))}
                </span>
              </div>
            </div>
          )}

          {expenses.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">Cliquez sur un type de frais pour l&apos;ajouter.</p>
          )}
        </div>

        {/* ── Cachet ── */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cachet du concert</p>
          <p className="text-[11px] text-gray-400 mb-3">Montant brut prévu — sera comparé aux frais pour estimer le solde net.</p>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                inputMode="decimal"
                value={cachet}
                onChange={e => setCachet(e.target.value)}
                placeholder="ex : 1200"
                className="w-full rounded-lg border border-amber-300 bg-white pl-4 pr-10 py-2.5 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">€</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed max-w-xs">
              💡 Pour estimer le net artiste après charges sociales, utilisez le{' '}
              <a href="/outils/cachet" className="text-indigo-600 hover:underline font-medium">simulateur GUSO →</a>
            </p>
          </div>
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
                <div key={v.id} className="rounded-xl bg-white border border-indigo-100 px-4 py-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800">{v.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {v.consumption.toFixed(1).replace('.', ',')} L/100km · {v.fuelPrice.toFixed(2).replace('.', ',')} €/L · {v.passengers} passager{v.passengers > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-black text-indigo-700">{fmt(v.costTotal)}</p>
                    </div>
                  </div>
                  {/* Détail carburant + péages */}
                  <div className="mt-2 flex gap-3 flex-wrap">
                    <span className="text-xs text-gray-500">
                      ⛽ Carburant : <strong>{fmt(v.fuelCost)}</strong>
                      <span className="text-gray-400 ml-1">({fmtL(v.litres)})</span>
                    </span>
                    {v.tollCost > 0 && (
                      <span className="text-xs text-gray-500">
                        🛣️ Péages : <strong>{fmt(v.tollCost)}</strong>
                        <span className="text-gray-400 ml-1">({fmt(v.tolls)}{roundTrip ? ' × 2' : ''})</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Frais supplémentaires dans les résultats */}
            {results.expenseRows.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Frais supplémentaires</p>
                {results.expenseRows.map(e => (
                  <div key={e.id} className="flex items-center justify-between rounded-xl bg-white border border-gray-200 px-4 py-2.5">
                    <span className="text-sm text-gray-700">{e.label || 'Sans libellé'}</span>
                    <span className="text-sm font-semibold text-gray-800 tabular-nums">
                      {e.qty > 1 && <span className="text-gray-400 font-normal text-xs mr-1">{fmt(e.unitAmount)} × {e.qty}</span>}
                      {fmt(e.total)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Récapitulatif financier */}
            <div className="rounded-xl overflow-hidden border border-gray-200">

              {/* Cachet (si renseigné) */}
              {results.cachetVal > 0 && (
                <div className="flex items-center justify-between px-5 py-3 bg-amber-50 border-b border-amber-100">
                  <div>
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">💰 Cachet prévu</p>
                  </div>
                  <p className="text-xl font-black text-amber-700">{fmt(results.cachetVal)}</p>
                </div>
              )}

              {/* Total frais */}
              <div className="flex items-center justify-between px-5 py-3 bg-indigo-600">
                <div>
                  <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wide">🚗 Total frais de déplacement</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    <span className="text-indigo-300 text-xs">⛽ {fmt(results.totalFuel)}</span>
                    {results.totalTolls > 0 && <span className="text-indigo-300 text-xs">🛣️ {fmt(results.totalTolls)}</span>}
                    {results.totalExtras > 0 && <span className="text-indigo-300 text-xs">➕ {fmt(results.totalExtras)}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-white">{fmt(results.grandTotal)}</p>
                  {results.totalPassengers > 1 && (
                    <p className="text-indigo-300 text-xs mt-0.5">{fmt(results.perPerson)} / pers.</p>
                  )}
                </div>
              </div>

              {/* Solde net (si cachet renseigné) */}
              {results.cachetVal > 0 && (
                <div className={`flex items-center justify-between px-5 py-4 ${results.solde >= 0 ? 'bg-green-50 border-t border-green-100' : 'bg-red-50 border-t border-red-100'}`}>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${results.solde >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {results.solde >= 0 ? '✅ Solde net après frais' : '⚠️ Déficit'}
                    </p>
                    {results.totalPassengers > 1 && (
                      <p className={`text-xs mt-0.5 ${results.solde >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                        {fmt(results.soldePerPerson)} / personne ({results.totalPassengers} pers.)
                      </p>
                    )}
                  </div>
                  <p className={`text-3xl font-black ${results.solde >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {results.solde >= 0 ? '' : ''}{fmt(results.solde)}
                  </p>
                </div>
              )}
            </div>

            {/* Disclaimer + print */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <p className="text-[10px] text-gray-400 leading-relaxed max-w-xs">
                ⚠️ Distance estimée via OpenStreetMap. Prix carburant à titre indicatif.
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

'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
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

// ─── Taux de charges approchés (spectacle vivant 2025) ────────────────────────
// Charges patronales hors congés spectacles
const TAUX_PAT = 38    // %
// Congés spectacles Audiens (spécifique spectacle vivant)
const TAUX_CONGES = 10.25 // %
// Charges salariales
const TAUX_SAL = 22    // %

// ─── Régimes de paiement du cachet ────────────────────────────────────────────
type Regime = 'guso' | 'licencie' | 'facture'
const REGIMES: { key: Regime; icon: string; label: string; desc: string; salariat: boolean }[] = [
  { key: 'guso',     icon: '🎫', label: 'GUSO',                desc: 'Spectacle occasionnel — employeur non professionnel du spectacle', salariat: true },
  { key: 'licencie', icon: '🏛️', label: 'Employeur licencié', desc: 'Organisateur de spectacle déclaré (régime général / intermittence)', salariat: true },
  { key: 'facture',  icon: '🧾', label: 'Facture / net',       desc: 'Auto-entrepreneur, association, forfait net — sans charges salariales', salariat: false },
]
const isSalariatRegime = (r: Regime) => r !== 'facture'

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
  const [localConcert, setLocalConcert] = useState(false)  // pas de frais de déplacement
  const [roundTrip, setRoundTrip] = useState(true)
  const [vehicles,  setVehicles]  = useState<Vehicle[]>([DEFAULT_VEHICLE()])
  const [expenses,    setExpenses]    = useState<Expense[]>([])
  const [cachet,      setCachet]      = useState('')
  const [regime,      setRegime]      = useState<Regime>('guso')
  const [cachetMode,  setCachetMode]  = useState<'brut' | 'net'>('brut')
  const [congesSpec,  setCongesSpec]  = useState(true)   // inclure congés spectacles
  const [fraisCharge, setFraisCharge] = useState<'employeur' | 'groupe'>('employeur')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [routeNote, setRouteNote] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  // ── Simulations sauvegardées ─────────────────────────────────────────────────
  interface SavedSim { id: number; label: string; updatedAt: string; data: any }
  interface Access { storage: boolean; create: boolean; save: boolean; update: boolean; delete: boolean }
  const [access,     setAccess]     = useState<Access>({ storage: false, create: false, save: false, update: false, delete: false })
  const [savedSims,  setSavedSims]  = useState<SavedSim[]>([])
  const [saveLabel,    setSaveLabel]    = useState('')
  const [saveOpen,     setSaveOpen]     = useState(false)
  const [savingState,  setSavingState]  = useState(false)
  const [saveError,    setSaveError]    = useState('')
  const [simsOpen,     setSimsOpen]     = useState(false)
  const [saveConcertId, setSaveConcertId] = useState<number | ''>('')
  const [userConcerts,  setUserConcerts]  = useState<{id: number; name: string; date: string; groupName: string}[]>([])

  // Charge les capacités + simulations existantes au montage
  useEffect(() => {
    fetch('/api/me/simulations').then(r => r.json()).then(d => {
      if (d.access) setAccess(d.access)
      setSavedSims(d.simulations ?? [])
    }).catch(() => {})
  }, [])

  const currentState = () => ({
    localConcert, departure, arrival,
    distance, manualKm, manualMode, roundTrip,
    vehicles, expenses,
    cachet, regime, cachetMode, congesSpec, fraisCharge,
  })

  const openSaveModal = async () => {
    setSaveLabel(''); setSaveConcertId(''); setSaveOpen(true)
    // Charger les concerts accessibles pour les lier
    if (userConcerts.length === 0) {
      const res = await fetch('/api/me/concerts-chef')
      if (res.ok) setUserConcerts(await res.json())
    }
  }

  const handleSave = async () => {
    if (!saveLabel.trim()) return
    setSavingState(true)
    setSaveError('')
    const res = await fetch('/api/me/simulations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: saveLabel.trim(),
        data: currentState(),
        concertId: saveConcertId ? Number(saveConcertId) : null,
      }),
    })
    setSavingState(false)
    if (res.ok) {
      const sim = await res.json()
      setSavedSims(prev => [sim, ...prev])
      setSaveOpen(false)
      setSaveLabel('')
    } else {
      const d = await res.json().catch(() => ({}))
      setSaveError(d.error || 'Erreur lors de la sauvegarde.')
    }
  }

  const handleLoad = (sim: SavedSim) => {
    const d = sim.data
    if (d.localConcert  !== undefined) setLocalConcert(d.localConcert)
    if (d.departure     !== undefined) setDeparture(d.departure)
    if (d.arrival       !== undefined) setArrival(d.arrival)
    if (d.distance      !== undefined) setDistance(d.distance)
    if (d.manualKm      !== undefined) setManualKm(d.manualKm)
    if (d.manualMode    !== undefined) setManualMode(d.manualMode)
    if (d.roundTrip     !== undefined) setRoundTrip(d.roundTrip)
    if (d.vehicles      !== undefined) setVehicles(d.vehicles)
    if (d.expenses      !== undefined) setExpenses(d.expenses)
    if (d.cachet        !== undefined) setCachet(d.cachet)
    if (d.regime        !== undefined) setRegime(d.regime)
    if (d.cachetMode    !== undefined) setCachetMode(d.cachetMode)
    if (d.congesSpec    !== undefined) setCongesSpec(d.congesSpec)
    if (d.fraisCharge   !== undefined) setFraisCharge(d.fraisCharge)
    setSimsOpen(false)
  }

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/me/simulations/${id}`, { method: 'DELETE' })
    if (res.ok) setSavedSims(prev => prev.filter(s => s.id !== id))
    else { const d = await res.json().catch(() => ({})); alert(d.error || 'Suppression impossible.') }
  }

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

    const totalFrais  = localConcert ? 0 : (totalVehicles + totalExtras)
    const fraisPerPerson = totalPassengers > 0 ? totalFrais / totalPassengers : 0

    // ── Calcul du cachet selon le régime ───────────────────────────────────────
    const cachetRaw = parseFloat(cachet.replace(',', '.') || '0') || 0
    const salariat = isSalariatRegime(regime)
    const totalPatTaux = salariat ? TAUX_PAT + (congesSpec ? TAUX_CONGES : 0) : 0
    const salTaux = salariat ? TAUX_SAL : 0

    let brut = 0, netArtiste = 0, coutCachetEmployeur = 0
    if (cachetRaw > 0) {
      if (!salariat) {
        // Facture / forfait net : montant versé = montant perçu (pas de charges salariales)
        brut = cachetRaw
        netArtiste = cachetRaw
        coutCachetEmployeur = cachetRaw
      } else if (cachetMode === 'brut') {
        brut              = cachetRaw
        netArtiste        = brut * (1 - salTaux / 100)
        coutCachetEmployeur = brut * (1 + totalPatTaux / 100)
      } else {
        // net → brut → coût employeur
        brut              = cachetRaw / (1 - salTaux / 100)
        netArtiste        = cachetRaw
        coutCachetEmployeur = brut * (1 + totalPatTaux / 100)
      }
    }

    // Coût total employeur = cachet (avec charges) + frais si à sa charge
    const totalEmployeur = coutCachetEmployeur + (fraisCharge === 'employeur' ? totalFrais : 0)

    // Net groupe = ce que perçoivent les musiciens - frais si à leur charge
    const netGroupe      = netArtiste - (fraisCharge === 'groupe' ? totalFrais : 0)
    const netPerPerson   = totalPassengers > 0 ? netGroupe / totalPassengers : 0

    return {
      totalKm, vehicleRows, totalVehicles, totalFuel, totalTolls,
      expenseRows, totalExtras, totalFrais, fraisPerPerson, totalPassengers,
      brut, netArtiste, coutCachetEmployeur, totalPatTaux, salariat, salTaux,
      totalEmployeur, netGroupe, netPerPerson,
    }
  }, [effectiveKm, roundTrip, vehicles, expenses, cachet, regime, cachetMode, congesSpec, fraisCharge, localConcert])

  // ── Print ───────────────────────────────────────────────────────────────────

  const handlePrint = () => {
    if (!results) return
    const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    const tripLabel = roundTrip ? 'Aller-retour' : 'Aller simple'
    const regimeLabel = REGIMES.find(r => r.key === regime)?.label ?? ''
    const cachetLineLabel = results.salariat ? 'Cachet brut' : 'Cachet (facture / net)'

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
            <td>${fmt(results.totalFrais)}</td>
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
      ${results.brut > 0 ? `
        <h2 style="font-size:14px;font-weight:700;color:#374151;margin:20px 0 8px">Récapitulatif financier <span style="font-weight:500;color:#9ca3af">· Régime : ${regimeLabel}</span></h2>
        <table style="border:2px solid #e5e7eb;border-radius:10px;overflow:hidden">
          <thead><tr style="background:#f97316;color:white">
            <th style="padding:10px 14px;text-align:left">🏢 Ce que paie l'employeur</th><th></th>
          </tr></thead>
          <tbody>
            <tr><td style="padding:8px 14px">${cachetLineLabel}</td><td style="padding:8px 14px;text-align:right;font-weight:600">${fmt(results.brut)}</td></tr>
            ${results.salariat ? `<tr><td style="padding:8px 14px">+ Charges patronales (${results.totalPatTaux.toFixed(1)} %)</td><td style="padding:8px 14px;text-align:right;font-weight:600;color:#ea580c">+ ${fmt(results.coutCachetEmployeur - results.brut)}</td></tr>` : ''}
            ${fraisCharge === 'employeur' ? `<tr><td style="padding:8px 14px">+ Frais de déplacement (remboursés)</td><td style="padding:8px 14px;text-align:right;font-weight:600;color:#ea580c">+ ${fmt(results.totalFrais)}</td></tr>` : ''}
            <tr style="background:#fff7ed"><td style="padding:10px 14px;font-weight:700;color:#c2410c">= TOTAL employeur</td><td style="padding:10px 14px;text-align:right;font-size:16px;font-weight:800;color:#c2410c">${fmt(results.totalEmployeur)}</td></tr>
          </tbody>
          <thead><tr style="background:#16a34a;color:white">
            <th style="padding:10px 14px;text-align:left">🎵 Ce que perçoivent les musiciens</th><th></th>
          </tr></thead>
          <tbody>
            <tr><td style="padding:8px 14px">${cachetLineLabel}</td><td style="padding:8px 14px;text-align:right;font-weight:600">${fmt(results.brut)}</td></tr>
            ${results.salariat ? `<tr><td style="padding:8px 14px">− Charges salariales (${results.salTaux} %)</td><td style="padding:8px 14px;text-align:right;font-weight:600;color:#dc2626">− ${fmt(results.brut * results.salTaux / 100)}</td></tr>` : ''}
            ${fraisCharge === 'groupe' ? `<tr><td style="padding:8px 14px">− Frais de déplacement (à charge du groupe)</td><td style="padding:8px 14px;text-align:right;font-weight:600;color:#dc2626">− ${fmt(results.totalFrais)}</td></tr>` : ''}
            <tr style="background:${results.netGroupe >= 0 ? '#f0fdf4' : '#fef2f2'}">
              <td style="padding:10px 14px;font-weight:700;color:${results.netGroupe >= 0 ? '#15803d' : '#dc2626'}">${results.netGroupe >= 0 ? '= NET GROUPE' : '= DÉFICIT'}</td>
              <td style="padding:10px 14px;text-align:right;font-size:16px;font-weight:800;color:${results.netGroupe >= 0 ? '#15803d' : '#dc2626'}">${fmt(results.netGroupe)}</td>
            </tr>
            ${results.totalPassengers > 1 ? `<tr style="background:#f9fafb"><td style="padding:8px 14px;font-size:12px;color:#6b7280">Par personne (${results.totalPassengers} pers.)</td><td style="padding:8px 14px;text-align:right;font-weight:700;color:#374151">${fmt(results.netPerPerson)}</td></tr>` : ''}
          </tbody>
        </table>` : `
        <div style="margin:16px 0;padding:14px 16px;background:#eff6ff;border-radius:10px;display:flex;justify-content:space-between">
          <span style="font-weight:700;color:#1e40af">Total frais de déplacement</span>
          <span style="font-size:18px;font-weight:800;color:#1e40af">${fmt(results.totalFrais)}</span>
        </div>`}
      <div class="disclaimer">⚠️ Taux de charges approchés (spectacle vivant, 2025). Distance via OpenStreetMap.</div>
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
            <span className="text-gray-900">Estimation de cachet</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">🎭 Estimation de cachet</h1>
          <p className="text-sm text-gray-500 mt-0.5">Estimez le coût total d&apos;un concert — cachet (GUSO, employeur licencié ou facture), charges et frais de déplacement.</p>
        </div>
        <TutorialButton moduleKey="tool_kilometrique" />
      </div>

      <div className="max-w-2xl space-y-5">

        {/* ── Simulations ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">

          {/* Bouton sauvegarder */}
          {access.storage ? (
            <div className="flex items-center gap-2 flex-wrap">
              {access.create ? (
                <button
                  onClick={openSaveModal}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  💾 Sauvegarder cette simulation
                </button>
              ) : (
                <span className="text-xs text-gray-400">🔒 Le fondateur ne vous autorise pas à créer des estimations.</span>
              )}
              {savedSims.length > 0 && (
                <button
                  onClick={() => setSimsOpen(v => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  📂 Mes simulations ({savedSims.length})
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              💾 Sauvegarde disponible si votre plan personnel ou le plan de votre groupe inclut du stockage.{' '}
              <a href="/tarifs" className="text-indigo-500 hover:underline">Voir les forfaits →</a>
            </p>
          )}
        </div>

        {/* Panneau simulations */}
        {simsOpen && savedSims.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Simulations sauvegardées</p>
            {savedSims.map(s => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.label}</p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(s.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => handleLoad(s)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 flex-shrink-0"
                >
                  Charger
                </button>
                {access.delete && (
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0"
                    title="Supprimer"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Toggle concert local ── */}
        <label className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-colors ${localConcert ? 'border-teal-400 bg-teal-50' : 'border-gray-200 bg-white hover:border-teal-300'}`}>
          <input type="checkbox" checked={localConcert} onChange={e => setLocalConcert(e.target.checked)}
            className="w-4 h-4 text-teal-600 rounded border-gray-300 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-800">📍 Concert local — pas de frais de déplacement</p>
            <p className="text-xs text-gray-400 mt-0.5">Le groupe se déplace par ses propres moyens sans frais supplémentaires (concert dans la ville du groupe, etc.)</p>
          </div>
        </label>

        {/* ── Route ── */}
        {!localConcert && <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
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
        </div>}

        {/* ── Vehicles ── */}
        {!localConcert && <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
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
        </div>}

        {/* ── Frais supplémentaires ── */}
        {!localConcert && <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
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
        </div>}

        {/* ── Cachet ── */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cachet du concert</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Choisissez le régime de paiement, puis saisissez le montant.</p>
          </div>

          {/* Sélecteur de régime */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {REGIMES.map(r => (
              <button key={r.key} onClick={() => setRegime(r.key)}
                className={`text-left rounded-xl border-2 px-3 py-2.5 transition-colors ${regime === r.key ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white hover:border-amber-300'}`}>
                <span className="text-sm font-semibold text-gray-800">{r.icon} {r.label}</span>
                <span className="block text-[10px] text-gray-400 leading-tight mt-0.5">{r.desc}</span>
              </button>
            ))}
          </div>

          {/* Saisie du montant (+ brut/net si salariat) */}
          <div className="flex items-center gap-3 flex-wrap">
            {results?.salariat && (
              <div className="flex rounded-lg border border-amber-300 overflow-hidden text-xs font-semibold">
                <button onClick={() => setCachetMode('brut')}
                  className={`px-3 py-2 transition-colors ${cachetMode === 'brut' ? 'bg-amber-500 text-white' : 'bg-white text-amber-700 hover:bg-amber-50'}`}>
                  Brut déclaré
                </button>
                <button onClick={() => setCachetMode('net')}
                  className={`px-3 py-2 transition-colors ${cachetMode === 'net' ? 'bg-amber-500 text-white' : 'bg-white text-amber-700 hover:bg-amber-50'}`}>
                  Net artiste souhaité
                </button>
              </div>
            )}
            <div className="relative">
              <input
                type="text" inputMode="decimal"
                value={cachet} onChange={e => setCachet(e.target.value)}
                placeholder={regime === 'facture' ? 'ex : 1000' : cachetMode === 'brut' ? 'ex : 1200' : 'ex : 936'}
                className="w-36 rounded-lg border border-amber-300 bg-white pl-3 pr-8 py-2 text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">€</span>
            </div>
            {!results?.salariat && (
              <span className="text-[11px] text-gray-500">Montant facturé = montant perçu (l&apos;artiste déclare lui-même ses cotisations).</span>
            )}
          </div>

          {/* Option congés spectacles (régimes salariat uniquement) */}
          {results?.salariat && (
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600">
              <input type="checkbox" checked={congesSpec} onChange={e => setCongesSpec(e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded border-gray-300" />
              Inclure les congés spectacles ({TAUX_CONGES} % — Audiens, spectacle vivant)
            </label>
          )}

          {/* Preview inline */}
          {results && results.brut > 0 && (
            results.salariat ? (
              <div className="rounded-lg bg-white border border-amber-100 px-4 py-3 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Brut déclaré</p>
                  <p className="text-base font-black text-gray-800">{fmt(results.brut)}</p>
                </div>
                <div className="border-x border-amber-100">
                  <p className="text-[10px] text-orange-400 uppercase tracking-wide mb-0.5">Coût employeur</p>
                  <p className="text-base font-black text-orange-700">{fmt(results.coutCachetEmployeur)}</p>
                  <p className="text-[10px] text-orange-300">+{results.totalPatTaux.toFixed(1)}% charges</p>
                </div>
                <div>
                  <p className="text-[10px] text-green-500 uppercase tracking-wide mb-0.5">Net artiste</p>
                  <p className="text-base font-black text-green-700">{fmt(results.netArtiste)}</p>
                  <p className="text-[10px] text-green-400">−{results.salTaux}% charges</p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-white border border-amber-100 px-4 py-3 grid grid-cols-2 gap-3 text-center">
                <div className="border-r border-amber-100">
                  <p className="text-[10px] text-orange-400 uppercase tracking-wide mb-0.5">Versé par l&apos;employeur</p>
                  <p className="text-base font-black text-orange-700">{fmt(results.coutCachetEmployeur)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-green-500 uppercase tracking-wide mb-0.5">Perçu par l&apos;artiste</p>
                  <p className="text-base font-black text-green-700">{fmt(results.netArtiste)}</p>
                  <p className="text-[10px] text-green-400">sans charge salariale</p>
                </div>
              </div>
            )
          )}

          {/* Qui paie les frais ? (uniquement si déplacement) */}
          {!localConcert && <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Les frais de déplacement sont à la charge de :</p>
            <div className="flex gap-2">
              {(['employeur', 'groupe'] as const).map(v => (
                <button key={v} onClick={() => setFraisCharge(v)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${fraisCharge === v ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 text-gray-600 hover:border-amber-300'}`}>
                  {v === 'employeur' ? '🏢 L\'employeur (remboursés)' : '🎵 Le groupe (déduits du net)'}
                </button>
              ))}
            </div>
          </div>}
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

            {/* ── Récapitulatif financier complet ── */}
            {results.brut > 0 ? (
              <div className="space-y-3">

                {/* Côté employeur */}
                <div className="rounded-xl overflow-hidden border border-orange-200">
                  <div className="bg-orange-500 px-4 py-2">
                    <p className="text-white text-xs font-bold uppercase tracking-wide">🏢 Ce que paie l&apos;employeur</p>
                  </div>
                  <div className="bg-white divide-y divide-orange-50">
                    <div className="flex justify-between px-4 py-2.5 text-sm">
                      <span className="text-gray-600">{results.salariat ? 'Cachet brut' : 'Cachet (facture / net)'}</span>
                      <span className="font-semibold">{fmt(results.brut)}</span>
                    </div>
                    {results.salariat && (
                      <div className="flex justify-between px-4 py-2.5 text-sm">
                        <span className="text-gray-600">+ Charges patronales ({results.totalPatTaux.toFixed(1)} %)</span>
                        <span className="font-semibold text-orange-600">+ {fmt(results.coutCachetEmployeur - results.brut)}</span>
                      </div>
                    )}
                    {fraisCharge === 'employeur' && (
                      <div className="flex justify-between px-4 py-2.5 text-sm">
                        <div>
                          <span className="text-gray-600">+ Frais de déplacement remboursés</span>
                          <div className="text-xs text-gray-400 mt-0.5">⛽ {fmt(results.totalFuel)}{results.totalTolls > 0 ? ` · 🛣️ ${fmt(results.totalTolls)}` : ''}{results.totalExtras > 0 ? ` · ➕ ${fmt(results.totalExtras)}` : ''}</div>
                        </div>
                        <span className="font-semibold text-orange-600">+ {fmt(results.totalFrais)}</span>
                      </div>
                    )}
                    <div className="flex justify-between px-4 py-3 bg-orange-50 font-bold">
                      <span className="text-orange-800">= TOTAL employeur</span>
                      <span className="text-xl text-orange-700">{fmt(results.totalEmployeur)}</span>
                    </div>
                  </div>
                </div>

                {/* Côté musiciens */}
                <div className="rounded-xl overflow-hidden border border-green-200">
                  <div className="bg-green-600 px-4 py-2">
                    <p className="text-white text-xs font-bold uppercase tracking-wide">🎵 Ce que perçoivent les musiciens</p>
                  </div>
                  <div className="bg-white divide-y divide-green-50">
                    <div className="flex justify-between px-4 py-2.5 text-sm">
                      <span className="text-gray-600">{results.salariat ? 'Cachet brut' : 'Cachet (facture / net)'}</span>
                      <span className="font-semibold">{fmt(results.brut)}</span>
                    </div>
                    {results.salariat && (
                      <>
                        <div className="flex justify-between px-4 py-2.5 text-sm">
                          <span className="text-gray-600">− Charges salariales ({results.salTaux} %)</span>
                          <span className="font-semibold text-red-400">− {fmt(results.brut * results.salTaux / 100)}</span>
                        </div>
                        <div className="flex justify-between px-4 py-2.5 text-sm">
                          <span className="text-gray-600">= Cachet net artiste</span>
                          <span className="font-semibold text-green-700">{fmt(results.netArtiste)}</span>
                        </div>
                      </>
                    )}
                    {fraisCharge === 'groupe' && (
                      <div className="flex justify-between px-4 py-2.5 text-sm">
                        <div>
                          <span className="text-gray-600">− Frais de déplacement (à votre charge)</span>
                          <div className="text-xs text-gray-400 mt-0.5">⛽ {fmt(results.totalFuel)}{results.totalTolls > 0 ? ` · 🛣️ ${fmt(results.totalTolls)}` : ''}{results.totalExtras > 0 ? ` · ➕ ${fmt(results.totalExtras)}` : ''}</div>
                        </div>
                        <span className="font-semibold text-red-400">− {fmt(results.totalFrais)}</span>
                      </div>
                    )}
                    <div className={`flex justify-between px-4 py-3 font-bold ${results.netGroupe >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      <div>
                        <span className={results.netGroupe >= 0 ? 'text-green-800' : 'text-red-700'}>
                          = {results.netGroupe >= 0 ? '✅ Net groupe' : '⚠️ Déficit'}
                        </span>
                        {results.totalPassengers > 1 && (
                          <p className={`text-xs font-normal mt-0.5 ${results.netGroupe >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {fmt(results.netPerPerson)} / personne ({results.totalPassengers} pers.)
                          </p>
                        )}
                      </div>
                      <span className={`text-2xl ${results.netGroupe >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {fmt(results.netGroupe)}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-gray-400">
                  {results.salariat
                    ? <>⚠️ Taux de charges approchés (2025, spectacle vivant). Utilisez le <a href="/outils/cachet" className="text-indigo-500 hover:underline">simulateur GUSO</a> pour un calcul exact.</>
                    : <>ℹ️ Régime facture / net : l&apos;artiste perçoit le montant facturé et déclare lui-même ses cotisations (auto-entrepreneur, association, etc.).</>}
                </p>
              </div>

            ) : (
              /* Sans cachet : juste le total frais */
              <div className="rounded-xl overflow-hidden border border-indigo-200">
                <div className="bg-indigo-600 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wide">🚗 Total frais de déplacement</p>
                    <div className="flex flex-wrap gap-x-3 mt-1">
                      <span className="text-indigo-300 text-xs">⛽ {fmt(results.totalFuel)}</span>
                      {results.totalTolls > 0 && <span className="text-indigo-300 text-xs">🛣️ {fmt(results.totalTolls)}</span>}
                      {results.totalExtras > 0 && <span className="text-indigo-300 text-xs">➕ {fmt(results.totalExtras)}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-white">{fmt(results.totalFrais)}</p>
                    {results.totalPassengers > 1 && (
                      <p className="text-indigo-300 text-xs mt-0.5">{fmt(results.fraisPerPerson)} / pers.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

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

      {/* ── Modale sauvegarde ── */}
      {saveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSaveOpen(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-1">💾 Sauvegarder la simulation</h3>
              <p className="text-xs text-gray-500">Donnez un nom et associez éventuellement cette estimation à un concert.</p>
            </div>

            {saveError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{saveError}</div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom de la simulation <span className="text-red-500">*</span></label>
              <input
                type="text"
                autoFocus
                value={saveLabel}
                onChange={e => setSaveLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="ex : Concert Caen — mars 2026"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                maxLength={80}
              />
            </div>

            {/* Lien optionnel avec un concert */}
            {access.save && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  🎭 Lier à un concert <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                {userConcerts.length > 0 ? (
                  <select
                    value={saveConcertId}
                    onChange={e => setSaveConcertId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— Aucun concert —</option>
                    {userConcerts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.groupName} · {new Date(c.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-gray-400 italic">Aucun concert à venir trouvé dans vos groupes.</p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={!saveLabel.trim() || savingState}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {savingState ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
              <button
                onClick={() => setSaveOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

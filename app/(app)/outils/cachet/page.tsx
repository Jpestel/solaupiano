'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { TutorialButton } from '@/components/ui/TutorialButton'

// ─── Taux de cotisations 2025 (spectacle vivant, CDU) ─────────────────────────
// Source : GUSO / Urssaf / AGIRC-ARRCO — valeurs approchées à titre indicatif.
// Les taux exacts varient selon la convention collective, l'effectif et la tranche.

const CHARGES_PATRONALES = [
  { label: 'Assurance maladie-maternité',       taux: 7.00  },
  { label: 'Allocations familiales',             taux: 3.45  },
  { label: 'Accidents du travail / MP',          taux: 2.50  },
  { label: 'Solidarité autonomie + FNAL',        taux: 0.60  },
  { label: 'Retraite de base (CNAV)',            taux: 10.45 },
  { label: 'Retraite complémentaire AGIRC-ARRCO',taux: 7.52  },
  { label: 'Assurance chômage',                  taux: 4.05  },
  { label: 'Formation prof. + CPF-CDD',          taux: 1.55  },
  { label: 'AGS, APEC, dialogue social…',        taux: 0.63  },
]

const TAUX_CONGES_SPECTACLES = 10.25 // Caisse Audiens — spécifique spectacle vivant

const CHARGES_SALARIALES = [
  { label: 'Vieillesse (plafonnée + déplaf.)',   taux: 7.30  },
  { label: 'CSG imposable (sur 98,25 % du brut)',taux: 6.80  },
  { label: 'CSG/CRDS non imposable',             taux: 2.90  },
  { label: 'Retraite compl. AGIRC-ARRCO + CEG', taux: 5.00  },
]

const TOTAL_PAT    = CHARGES_PATRONALES.reduce((s, c) => s + c.taux, 0)
const TOTAL_SAL    = CHARGES_SALARIALES.reduce((s, c) => s + c.taux, 0)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)
}

function pct(n: number) {
  return n.toFixed(2).replace('.', ',') + ' %'
}

type Mode = 'brut' | 'budget' | 'net'

// ─── Component ───────────────────────────────────────────────────────────────

export default function CachetSimulateurPage() {
  const [mode, setMode] = useState<Mode>('brut')
  const [amount, setAmount] = useState('')
  const [congesSpectacles, setCongesSpectacles] = useState(true)
  const [showDetail, setShowDetail] = useState(false)

  const totalPat = congesSpectacles ? TOTAL_PAT + TAUX_CONGES_SPECTACLES : TOTAL_PAT

  const result = useMemo(() => {
    const v = parseFloat(amount.replace(',', '.').replace(/\s/g, ''))
    if (!v || v <= 0) return null

    let brut: number
    if (mode === 'brut') {
      brut = v
    } else if (mode === 'budget') {
      brut = v / (1 + totalPat / 100)
    } else {
      brut = v / (1 - TOTAL_SAL / 100)
    }

    const chargesPatMontant = brut * (TOTAL_PAT / 100)
    const congesMontant     = congesSpectacles ? brut * (TAUX_CONGES_SPECTACLES / 100) : 0
    const chargesSalMontant = brut * (TOTAL_SAL / 100)
    const net               = brut - chargesSalMontant
    const coutEmployeur     = brut + chargesPatMontant + congesMontant

    return {
      brut,
      chargesPatMontant,
      congesMontant,
      chargesSalMontant,
      net,
      coutEmployeur,
      detailPat: CHARGES_PATRONALES.map(c => ({ ...c, montant: brut * c.taux / 100 })),
      detailSal: CHARGES_SALARIALES.map(c => ({ ...c, montant: brut * c.taux / 100 })),
    }
  }, [amount, mode, totalPat, congesSpectacles])

  const modeButtons: { key: Mode; icon: string; label: string; desc: string }[] = [
    { key: 'brut', icon: '📄', label: 'Salaire brut', desc: 'Je connais le montant brut déclaré' },
    { key: 'budget', icon: '🏢', label: 'Budget employeur', desc: 'Je sais combien je peux dépenser au total' },
    { key: 'net', icon: '🎵', label: 'Net artiste souhaité', desc: 'Je veux que l\'artiste touche ce montant' },
  ]

  const inputLabel = {
    brut: 'Salaire brut (€)',
    budget: 'Budget total employeur (€)',
    net: 'Net artiste souhaité (€)',
  }[mode]

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/tableau-de-bord" className="hover:text-indigo-600">Accueil</Link>
        <span>/</span>
        <span className="text-gray-900">Simulateur cachet GUSO</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💶 Simulateur cachet GUSO</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Estimez le coût employeur et le net artiste pour un contrat de spectacle vivant (CDU).
          </p>
        </div>
        <TutorialButton moduleKey="tool_cachet" />
      </div>

      <div className="max-w-2xl space-y-5">

        {/* Mode selector */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Je calcule depuis…</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {modeButtons.map(b => (
              <button
                key={b.key}
                onClick={() => setMode(b.key)}
                className={`flex flex-col items-start gap-1 rounded-xl border-2 px-3 py-2.5 text-left transition-colors ${
                  mode === b.key
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <span className="text-base">{b.icon}</span>
                <span className={`text-xs font-semibold ${mode === b.key ? 'text-indigo-700' : 'text-gray-800'}`}>{b.label}</span>
                <span className="text-[10px] text-gray-400 leading-tight">{b.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">{inputLabel}</label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="ex : 150"
              className="w-full rounded-lg border border-gray-300 pl-4 pr-12 py-3 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-gray-400 font-semibold">€</span>
          </div>

          {/* Option congés spectacles */}
          <label className="flex items-center gap-2.5 mt-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={congesSpectacles}
              onChange={e => setCongesSpectacles(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              Inclure les <strong>congés spectacles</strong>{' '}
              <span className="text-gray-400">({TAUX_CONGES_SPECTACLES} % du brut, Audiens — spécifique spectacle vivant)</span>
            </span>
          </label>
        </div>

        {/* Results */}
        {result && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Brut */}
              <div className={`rounded-xl p-4 border-2 ${mode === 'brut' ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Salaire brut</p>
                <p className="text-2xl font-black text-gray-900">{fmt(result.brut)}</p>
                <p className="text-xs text-gray-400 mt-1">Montant déclaré sur le contrat</p>
              </div>

              {/* Coût employeur */}
              <div className={`rounded-xl p-4 border-2 ${mode === 'budget' ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-white'}`}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Coût employeur</p>
                <p className="text-2xl font-black text-orange-700">{fmt(result.coutEmployeur)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Brut + charges pat. ({pct(TOTAL_PAT)})
                  {congesSpectacles && ` + congés (${pct(TAUX_CONGES_SPECTACLES)})`}
                </p>
              </div>

              {/* Net artiste */}
              <div className={`rounded-xl p-4 border-2 ${mode === 'net' ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'}`}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Net artiste</p>
                <p className="text-2xl font-black text-green-700">{fmt(result.net)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Brut − charges sal. ({pct(TOTAL_SAL)})
                </p>
              </div>
            </div>

            {/* Résumé visuel */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 flex flex-wrap gap-2 items-center">
              <span>Pour {fmt(result.brut)} brut :</span>
              <span className="rounded-full bg-orange-100 text-orange-700 px-2.5 py-1 text-xs font-semibold">
                🏢 Employeur paie {fmt(result.coutEmployeur)}
              </span>
              <span className="text-gray-400">·</span>
              <span className="rounded-full bg-green-100 text-green-700 px-2.5 py-1 text-xs font-semibold">
                🎵 Artiste reçoit {fmt(result.net)}
              </span>
            </div>

            {/* Détail des charges */}
            <div>
              <button
                onClick={() => setShowDetail(v => !v)}
                className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                <svg className={`w-4 h-4 transition-transform ${showDetail ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {showDetail ? 'Masquer' : 'Voir'} le détail des cotisations
              </button>

              {showDetail && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Charges patronales */}
                  <div className="rounded-xl border border-orange-100 bg-orange-50/50 overflow-hidden">
                    <div className="px-4 py-2.5 bg-orange-100 border-b border-orange-200">
                      <p className="text-xs font-bold text-orange-800 uppercase tracking-wide">
                        Charges employeur — {fmt(result.chargesPatMontant + result.congesMontant)} ({pct(totalPat)})
                      </p>
                    </div>
                    <div className="divide-y divide-orange-100">
                      {result.detailPat.map(c => (
                        <div key={c.label} className="flex items-center justify-between px-4 py-2 text-xs">
                          <span className="text-gray-700">{c.label}</span>
                          <span className="font-semibold text-orange-700 tabular-nums text-right">
                            {fmt(c.montant)} <span className="text-orange-400 font-normal">({pct(c.taux)})</span>
                          </span>
                        </div>
                      ))}
                      {congesSpectacles && (
                        <div className="flex items-center justify-between px-4 py-2 text-xs bg-orange-50">
                          <span className="text-gray-700">Congés spectacles (Audiens)</span>
                          <span className="font-semibold text-orange-700 tabular-nums text-right">
                            {fmt(result.congesMontant)} <span className="text-orange-400 font-normal">({pct(TAUX_CONGES_SPECTACLES)})</span>
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-orange-100 text-xs font-bold">
                        <span className="text-orange-800">Total charges employeur</span>
                        <span className="text-orange-800 tabular-nums">{fmt(result.chargesPatMontant + result.congesMontant)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Charges salariales */}
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 overflow-hidden">
                    <div className="px-4 py-2.5 bg-blue-100 border-b border-blue-200">
                      <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">
                        Charges artiste — {fmt(result.chargesSalMontant)} ({pct(TOTAL_SAL)})
                      </p>
                    </div>
                    <div className="divide-y divide-blue-100">
                      {result.detailSal.map(c => (
                        <div key={c.label} className="flex items-center justify-between px-4 py-2 text-xs">
                          <span className="text-gray-700">{c.label}</span>
                          <span className="font-semibold text-blue-700 tabular-nums text-right">
                            {fmt(c.montant)} <span className="text-blue-400 font-normal">({pct(c.taux)})</span>
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-blue-100 text-xs font-bold">
                        <span className="text-blue-800">Total charges artiste</span>
                        <span className="text-blue-800 tabular-nums">{fmt(result.chargesSalMontant)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Disclaimer */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-relaxed">
          <span className="font-semibold">⚠️ Estimation indicative</span> — Les taux utilisés sont approximatifs (spectacle vivant, CDU, 2025).
          Les montants réels peuvent varier selon la convention collective applicable, l'effectif de l'employeur et le régime d'exonération.
          Utilisez{' '}
          <a href="https://www.guso.fr" target="_blank" rel="noreferrer" className="font-semibold underline hover:text-amber-900">
            guso.fr
          </a>{' '}
          pour un calcul officiel et générer les documents GUSO.
        </div>

        {/* GUSO info */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-xs text-indigo-700 space-y-1">
          <p className="font-semibold text-indigo-800">ℹ️ Rappel GUSO</p>
          <p>Le <strong>GUSO</strong> (Guichet Unique du Spectacle Occasionnel) simplifie les démarches pour les employeurs occasionnels de spectacle : une seule déclaration en ligne couvre l'ensemble des cotisations (Urssaf, retraite, chômage, Audiens…).</p>
          <p>L'artiste doit fournir son <strong>numéro GUSO</strong> à l'employeur avant le contrat. Ce numéro est renseignable sur votre{' '}
            <Link href="/profil" className="font-semibold underline hover:text-indigo-900">profil Sol au piano</Link>.
          </p>
          <p>
            <a href="https://www.guso.fr" target="_blank" rel="noreferrer" className="font-semibold underline hover:text-indigo-900">
              Accéder à guso.fr →
            </a>
          </p>
        </div>

      </div>
    </div>
  )
}

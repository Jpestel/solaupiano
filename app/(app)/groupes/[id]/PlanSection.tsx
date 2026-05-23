'use client'

import { useState, useEffect } from 'react'
import { DbPlan, COLOR_MAP, generateFeatureList, formatBytes, storagePercent } from '@/lib/plans'

interface PlanSectionProps {
  currentPlanKey: string
  storageUsedBytes: number
  isChef: boolean
  memberCount?: number
  allPlans: DbPlan[]
}

export function PlanSection({ currentPlanKey, storageUsedBytes, isChef, memberCount = 1, allPlans }: PlanSectionProps) {
  const usedBytes = Number(storageUsedBytes)
  const currentPlan = allPlans.find((p) => p.key === currentPlanKey) ?? allPlans[0]
  const pct = currentPlan ? storagePercent(usedBytes, currentPlan.storageGb) : 0
  const c = currentPlan ? (COLOR_MAP[currentPlan.color] ?? COLOR_MAP.gray) : COLOR_MAP.gray
  const [musicians, setMusicians] = useState(Math.max(1, memberCount))
  const [showPlans, setShowPlans] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('solaupiano:showPlans')
    if (stored !== null) setShowPlans(stored === 'true')
  }, [])

  const togglePlans = () => {
    setShowPlans((v) => {
      localStorage.setItem('solaupiano:showPlans', String(!v))
      return !v
    })
  }

  if (!currentPlan) return null

  return (
    <div className="mb-8">
      {/* Storage gauge */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Stockage</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${c.bg} ${c.text} border ${c.border}`}>
              {currentPlan.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {formatBytes(usedBytes)} / {currentPlan.storageGb} Go
            </span>
            {isChef && allPlans.length > 0 && (
              <button
                onClick={togglePlans}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                title={showPlans ? 'Masquer les plans' : 'Afficher les plans'}
              >
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${showPlans ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span>{showPlans ? 'Masquer' : 'Voir les plans'}</span>
              </button>
            )}
          </div>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-400' : 'bg-indigo-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct > 90 && (
          <p className="text-xs text-red-600 mt-2 font-medium">
            ⚠️ Quota presque atteint — pensez à libérer de l&apos;espace ou à passer à un plan supérieur.
          </p>
        )}
      </div>

      {/* Plan cards */}
      {isChef && allPlans.length > 0 && showPlans && (
        <>
          {/* Musicians stepper */}
          <div className="flex items-center justify-between gap-4 mb-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base">🎵</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-700">Coût partagé entre musiciens</p>
                <p className="text-[11px] text-gray-400 leading-tight">
                  {musicians === memberCount
                    ? musicians === 1
                      ? 'Vous êtes seul dans le groupe — vous assumez seul le coût'
                      : `Votre groupe compte ${memberCount} musicien${memberCount > 1 ? 's' : ''}`
                    : 'Simulation personnalisée'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setMusicians((n) => Math.max(1, n - 1))} disabled={musicians <= 1}
                className="w-7 h-7 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center text-sm font-bold disabled:opacity-40">
                −
              </button>
              <span className="w-6 text-center text-sm font-bold text-gray-800 tabular-nums">{musicians}</span>
              <button onClick={() => setMusicians((n) => Math.min(50, n + 1))}
                className="w-7 h-7 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center text-sm font-bold">
                +
              </button>
              {musicians !== memberCount && (
                <button onClick={() => setMusicians(Math.max(1, memberCount))}
                  className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium border border-indigo-200 rounded-lg px-2 py-1 hover:bg-indigo-50 transition-colors">
                  Réel
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {allPlans.map((p) => {
              const isCurrent = p.key === currentPlanKey
              const pc = COLOR_MAP[p.color] ?? COLOR_MAP.gray
              const isPaid = p.priceMonthly !== null
              const pricePerMusician = p.priceMonthly ? p.priceMonthly / musicians : null
              const features = generateFeatureList(p)
              return (
                <div key={p.key} className={`rounded-xl border-2 p-4 transition-all ${isCurrent ? `${pc.border} ${pc.bg}` : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className={`font-bold text-sm ${isCurrent ? pc.text : 'text-gray-800'}`}>{p.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.storageGb} Go de stockage</p>
                    </div>
                    {isCurrent && (
                      <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${pc.bg} ${pc.text} border ${pc.border}`}>
                        Actuel
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1 mb-4">
                    {features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                        <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="text-center">
                    {!isPaid ? (
                      <p className="text-xs text-gray-500 font-medium">Gratuit</p>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-gray-700">
                          {p.priceMonthly!.toFixed(2).replace('.', ',')} €<span className="font-normal text-gray-500">/mois</span>
                        </p>
                        {pricePerMusician !== null && (
                          <p className={`text-xs font-semibold mt-1 ${isCurrent ? pc.text : 'text-indigo-600'}`}>
                            soit <span className="font-bold">{pricePerMusician.toFixed(2).replace('.', ',')} €</span>
                            <span className="font-normal text-gray-500">/musicien</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

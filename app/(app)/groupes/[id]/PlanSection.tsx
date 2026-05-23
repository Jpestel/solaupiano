'use client'

import { useState } from 'react'
import { PLANS, GroupPlan, formatBytes, storagePercent } from '@/lib/plans'

interface PlanSectionProps {
  plan: GroupPlan
  storageUsedBytes: number
  isChef: boolean
  memberCount?: number
}

export function PlanSection({ plan, storageUsedBytes, isChef, memberCount = 1 }: PlanSectionProps) {
  const usedBytes = Number(storageUsedBytes)
  const pct = storagePercent(usedBytes, plan)
  const planInfo = PLANS[plan]
  const [musicians, setMusicians] = useState(Math.max(1, memberCount))

  return (
    <div className="mb-8">
      {/* Storage gauge */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Stockage</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${planInfo.bgColor} ${planInfo.textColor}`}>
              {planInfo.label}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            {formatBytes(usedBytes)} / {planInfo.storageLabel}
          </span>
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
            ⚠️ Quota presque atteint — pensez à libérer de l'espace ou à passer à un plan supérieur.
          </p>
        )}
      </div>

      {/* Plan cards */}
      {isChef && (
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
              <button
                onClick={() => setMusicians((n) => Math.max(1, n - 1))}
                className="w-7 h-7 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-center text-sm font-bold disabled:opacity-40"
                disabled={musicians <= 1}
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-bold text-gray-800 tabular-nums">{musicians}</span>
              <button
                onClick={() => setMusicians((n) => Math.min(50, n + 1))}
                className="w-7 h-7 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-center text-sm font-bold"
              >
                +
              </button>
              {musicians !== memberCount && (
                <button
                  onClick={() => setMusicians(Math.max(1, memberCount))}
                  className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium border border-indigo-200 rounded-lg px-2 py-1 hover:bg-indigo-50 transition-colors"
                >
                  Réel
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.keys(PLANS) as GroupPlan[]).map((key) => {
              const p = PLANS[key]
              const isCurrent = key === plan
              const isComingSoon = key !== 'FREE'
              const pricePerMusician = p.priceMonthly ? p.priceMonthly / musicians : null
              return (
                <div
                  key={key}
                  className={`rounded-xl border-2 p-4 transition-all ${
                    isCurrent
                      ? `${p.borderColor} ${p.bgColor}`
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className={`font-bold text-sm ${isCurrent ? p.textColor : 'text-gray-800'}`}>{p.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.storageLabel} de stockage</p>
                    </div>
                    {isCurrent && (
                      <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${p.bgColor} ${p.textColor} border ${p.borderColor}`}>
                        Actuel
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1 mb-4">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                        <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="text-center">
                    {key === 'FREE' ? (
                      <p className="text-xs text-gray-500 font-medium">Gratuit</p>
                    ) : isComingSoon ? (
                      <div>
                        <p className="text-xs font-bold text-gray-700">
                          {p.priceMonthly?.toFixed(2).replace('.', ',')} €<span className="font-normal text-gray-500">/mois</span>
                        </p>
                        {pricePerMusician !== null && (
                          <p className={`text-xs font-semibold mt-1 ${isCurrent ? p.textColor : 'text-indigo-600'}`}>
                            soit <span className="font-bold">{pricePerMusician.toFixed(2).replace('.', ',')} €</span>
                            <span className="font-normal text-gray-500">/musicien</span>
                          </p>
                        )}
                        <span className="inline-block mt-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                          Bientôt disponible
                        </span>
                      </div>
                    ) : null}
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

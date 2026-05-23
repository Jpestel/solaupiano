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
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('right')

  const PAGE_SIZE = 3
  const totalPages = Math.ceil(allPlans.length / PAGE_SIZE)
  const currentPage = Math.floor(carouselIndex / PAGE_SIZE)
  const visiblePlans = allPlans.slice(carouselIndex, carouselIndex + PAGE_SIZE)

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

  const slide = (dir: 'prev' | 'next') => {
    if (animating) return
    setAnimating(true)
    setSlideDir(dir === 'next' ? 'left' : 'right')
    setTimeout(() => {
      setCarouselIndex((i) =>
        dir === 'next'
          ? Math.min(i + PAGE_SIZE, allPlans.length - PAGE_SIZE)
          : Math.max(i - PAGE_SIZE, 0)
      )
      setAnimating(false)
    }, 220)
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
          <span className="text-sm text-gray-500">
            {formatBytes(usedBytes)} / {currentPlan.storageGb} Go
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
            ⚠️ Quota presque atteint — pensez à libérer de l&apos;espace ou à passer à un plan supérieur.
          </p>
        )}
      </div>

      {/* Toggle button — chef only */}
      {isChef && allPlans.length > 0 && (
        <button
          onClick={togglePlans}
          className={`group w-full flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 mb-3 transition-all duration-200 ${
            showPlans
              ? 'border-indigo-200 bg-indigo-50'
              : 'border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Animated sparkle dot */}
            {!showPlans && (
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
              </span>
            )}
            <span className={`text-sm font-semibold ${showPlans ? 'text-indigo-700' : 'text-indigo-700'}`}>
              {showPlans ? 'Plans & tarifs' : '✨ Découvrir nos plans'}
            </span>
            {!showPlans && (
              <span className="hidden sm:inline-flex items-center rounded-full bg-indigo-100 border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                Upgrade disponible
              </span>
            )}
          </div>
          <svg
            className={`w-4 h-4 flex-shrink-0 text-indigo-500 transition-transform duration-300 ${showPlans ? 'rotate-180' : 'group-hover:translate-y-0.5'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

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

          {/* Carousel */}
          <div className="relative">
            {/* Prev arrow */}
            {carouselIndex > 0 && (
              <button
                onClick={() => slide('prev')}
                className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-indigo-600 border-2 border-indigo-700 shadow-md flex items-center justify-center text-white hover:bg-indigo-500 hover:scale-110 active:scale-95 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Next arrow */}
            {carouselIndex + PAGE_SIZE < allPlans.length && (
              <button
                onClick={() => slide('next')}
                className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-indigo-600 border-2 border-indigo-700 shadow-md flex items-center justify-center text-white hover:bg-indigo-500 hover:scale-110 active:scale-95 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Cards row */}
            <div
              className="grid gap-3 transition-opacity duration-200"
              style={{
                gridTemplateColumns: `repeat(${Math.min(visiblePlans.length, PAGE_SIZE)}, 1fr)`,
                opacity: animating ? 0 : 1,
              }}
            >
              {visiblePlans.map((p) => {
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

            {/* Pagination dots */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-1.5 mt-3">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setSlideDir(i > currentPage ? 'left' : 'right'); setCarouselIndex(i * PAGE_SIZE) }}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      i === currentPage ? 'w-4 bg-indigo-500' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

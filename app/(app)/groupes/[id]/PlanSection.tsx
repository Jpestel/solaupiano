'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DbPlan, COLOR_MAP, formatBytes, storagePercent, storageLabel } from '@/lib/plans'
import { MODULES } from '@/lib/modules'

interface ModuleAccessRec { moduleKey: string; planKey: string; enabled: boolean }

interface PlanSectionProps {
  currentPlanKey: string
  storageUsedBytes: number
  storageLimitGb: number
  storageGroupCount: number
  storageHasOverride: boolean
  isChef: boolean
  memberCount?: number
  allPlans: DbPlan[]
  moduleAccess?: ModuleAccessRec[]
  groupId: number
  stripeSubscriptionId?: string | null
}

export function PlanSection({
  currentPlanKey,
  storageUsedBytes,
  storageLimitGb,
  storageGroupCount,
  storageHasOverride,
  isChef,
  memberCount = 1,
  allPlans,
  moduleAccess = [],
  groupId,
  stripeSubscriptionId,
}: PlanSectionProps) {
  const router = useRouter()
  // Module (outil) activé pour un plan : enregistrement explicite, sinon ouvert par défaut
  const isModuleEnabled = (planKey: string, moduleKey: string) => {
    const rec = moduleAccess.find(r => r.planKey === planKey && r.moduleKey === moduleKey)
    return rec !== undefined ? rec.enabled : true
  }
  const usedBytes = Number(storageUsedBytes)
  const currentPlan = allPlans.find((p) => p.key === currentPlanKey) ?? allPlans[0]
  // Use shared/override limit instead of plan's own storageGb for the gauge
  const pct = storageLimitGb > 0 ? Math.min(100, (usedBytes / (storageLimitGb * 1024 * 1024 * 1024)) * 100) : 0
  const c = currentPlan ? (COLOR_MAP[currentPlan.color] ?? COLOR_MAP.gray) : COLOR_MAP.gray

  const [musicians, setMusicians] = useState(Math.max(1, memberCount))
  const [showPlans, setShowPlans] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('right')
  const [loadingPlanKey, setLoadingPlanKey] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'cancel'; msg: string } | null>(null)

  const PAGE_SIZE = 3
  const totalPages = Math.ceil(allPlans.length / PAGE_SIZE)
  const currentPage = Math.floor(carouselIndex / PAGE_SIZE)
  const visiblePlans = allPlans.slice(carouselIndex, carouselIndex + PAGE_SIZE)

  useEffect(() => {
    const stored = localStorage.getItem('solaupiano:showPlans')
    if (stored !== null) setShowPlans(stored === 'true')
  }, [])

  // Détecter le retour Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const stripe = params.get('stripe')
    if (stripe === 'success') {
      setToast({ type: 'success', msg: '🎉 Abonnement activé ! Votre plan a été mis à jour.' })
      setShowPlans(false)
      router.replace(window.location.pathname)
    } else if (stripe === 'cancel') {
      setToast({ type: 'cancel', msg: 'Paiement annulé. Vous pouvez réessayer à tout moment.' })
      router.replace(window.location.pathname)
    }
  }, [router])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

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

  const handleSubscribe = useCallback(async (planKey: string) => {
    setLoadingPlanKey(planKey)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, planKey }),
      })
      const data = await res.json()
      if (!res.ok) {
        setToast({ type: 'error', msg: data.error || 'Une erreur est survenue.' })
        return
      }
      window.location.href = data.url
    } catch {
      setToast({ type: 'error', msg: 'Impossible de contacter le serveur de paiement.' })
    } finally {
      setLoadingPlanKey(null)
    }
  }, [groupId])

  const handleManage = useCallback(async () => {
    setLoadingPlanKey('portal')
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setToast({ type: 'error', msg: data.error || 'Une erreur est survenue.' })
        return
      }
      window.location.href = data.url
    } catch {
      setToast({ type: 'error', msg: 'Impossible d\'ouvrir le portail de gestion.' })
    } finally {
      setLoadingPlanKey(null)
    }
  }, [groupId])

  if (!currentPlan) return null

  return (
    <div className="mb-8">
      {/* Toast notification */}
      {toast && (
        <div className={`mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          toast.type === 'error'   ? 'bg-red-50 border-red-200 text-red-800' :
                                     'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <span className="flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Storage gauge */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-700">Stockage</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${c.bg} ${c.text} border ${c.border}`}>
              {currentPlan?.label}
            </span>
            {storageHasOverride ? (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-violet-100 text-violet-700 border border-violet-200">
                🛡️ Quota individuel
              </span>
            ) : storageGroupCount > 1 ? (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                Partagé entre {storageGroupCount} groupes
              </span>
            ) : null}
            {/* Bouton gérer abonnement si abonnement actif */}
            {isChef && stripeSubscriptionId && (
              <button
                onClick={handleManage}
                disabled={loadingPlanKey === 'portal'}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {loadingPlanKey === 'portal' ? (
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                ) : '⚙️'}
                Gérer l&apos;abonnement
              </button>
            )}
          </div>
          <span className="text-sm text-gray-500">
            {formatBytes(usedBytes)} / {formatBytes(storageLimitGb * 1024 * 1024 * 1024)}
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
        {!storageHasOverride && storageGroupCount > 1 && (
          <p className="text-[11px] text-gray-400 mt-2">
            Ce quota est partagé entre tous vos groupes. {formatBytes(usedBytes)} utilisés au total.
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
            {!showPlans && (
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
              </span>
            )}
            <span className="text-sm font-semibold text-indigo-700">
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
                const planLimitBytes = p.storageGb * 1024 * 1024 * 1024
                const exceedsStorage = usedBytes > planLimitBytes  // compares total shared usage vs this plan's quota
                const isGifted = !stripeSubscriptionId && currentPlanKey !== 'FREE'
                const isCurrentGifted = isCurrent && isGifted
                const isLoading = loadingPlanKey === p.key

                // Modules list: icon + label + included/excluded
                const modules = [
                  { icon: '🎵', label: 'Répétitions & présences', ok: true },
                  { icon: '🎼', label: 'Répertoire', ok: true },
                  { icon: '🎸', label: "Grilles d'accords", ok: p.hasGrilles },
                  { icon: '🎶', label: 'Setlists', ok: p.hasSetlists },
                  { icon: '🎭', label: 'Concerts', ok: p.hasConcerts },
                  { icon: '📋', label: 'Fiche technique', ok: p.hasFicheTechnique },
                  { icon: '🌐', label: 'Page publique', ok: p.hasMaPage },
                  { icon: '👥', label: 'Co-chefs', ok: p.hasCoChefs },
                  { icon: '📊', label: 'Statistiques', ok: p.hasStats },
                  { icon: '⚡', label: 'Support prioritaire', ok: p.hasPrioritySupport },
                ]

                return (
                  <div key={p.key} className={`rounded-xl border-2 flex flex-col transition-all ${
                    isCurrentGifted ? 'border-amber-300 bg-amber-50/60' :
                    isCurrent ? `${pc.border} ${pc.bg}` :
                    exceedsStorage && isPaid ? 'border-red-200 bg-red-50/40' :
                    'border-gray-200 bg-white hover:border-gray-300'
                  }`}>

                    {/* Bandeau "Offert" en haut de la card */}
                    {isCurrentGifted && (
                      <div className="flex items-center justify-center gap-1.5 rounded-t-[10px] bg-amber-400 px-3 py-1">
                        <span className="text-xs font-bold text-white tracking-wide">🎁 Plan offert par l&apos;administrateur</span>
                      </div>
                    )}

                    {/* ── Header ── */}
                    <div className={`px-4 pt-4 pb-3 ${isCurrent ? '' : 'border-b border-gray-100'}`}>
                      <div className="flex items-start justify-between mb-1">
                        <p className={`font-bold text-sm ${isCurrentGifted ? 'text-amber-700' : isCurrent ? pc.text : 'text-gray-800'}`}>{p.label}</p>
                        {isCurrent && (
                          <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 border flex-shrink-0 ml-2 ${
                            isCurrentGifted ? 'bg-amber-100 text-amber-700 border-amber-300' : `${pc.bg} ${pc.text} ${pc.border}`
                          }`}>
                            ✓ Actuel
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-[11px] text-gray-500 leading-tight">{p.description}</p>
                      )}
                    </div>

                    {/* ── Quotas chips ── */}
                    <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-1.5">
                      {/* Storage */}
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isCurrent ? `${pc.bg} ${pc.text} border ${pc.border}` : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        💾 {p.storageGb > 0 ? storageLabel(p.storageGb) : 'Aucun stockage'}
                      </span>
                      {/* Groups */}
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isCurrent ? `${pc.bg} ${pc.text} border ${pc.border}` : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        📁 {p.maxGroups === 1 ? '1 groupe' : `${p.maxGroups} groupes`}
                      </span>
                      {/* Members */}
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        p.maxMembersPerGroup
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : isCurrent ? `${pc.bg} ${pc.text} border ${pc.border}` : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        👥 {p.maxMembersPerGroup ? `${p.maxMembersPerGroup} membres max` : 'membres illimités'}
                      </span>
                      {/* Songs */}
                      {p.maxSongsPerGroup && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          🎼 {p.maxSongsPerGroup} titres max
                        </span>
                      )}
                      {/* Setlists */}
                      {p.maxSetlists && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          🎶 {p.maxSetlists} setlists max
                        </span>
                      )}
                      {/* Concerts */}
                      {p.maxConcerts && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          🎭 {p.maxConcerts} concerts max
                        </span>
                      )}
                      {/* Grilles */}
                      {p.maxCharts && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          🎸 {p.maxCharts} grilles max
                        </span>
                      )}
                      {/* Files per song */}
                      {p.maxFilesPerSong && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          📎 {p.maxFilesPerSong} fichiers/morceau
                        </span>
                      )}
                    </div>

                    {/* ── Modules list ── */}
                    <div className="px-4 py-3 flex-1 grid grid-cols-1 gap-0.5">
                      {modules.map((m) => (
                        <div key={m.label} className={`flex items-center gap-1.5 text-[11px] ${m.ok ? 'text-gray-700' : 'text-gray-300'}`}>
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                            m.ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {m.ok ? '✓' : '✕'}
                          </span>
                          <span className="leading-tight">{m.icon} {m.label}</span>
                        </div>
                      ))}

                      {/* Outils & modules (accordeur, métronome, annonces, simulateurs…) */}
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Outils & modules</p>
                        {MODULES.map((mod) => {
                          const ok = isModuleEnabled(p.key, mod.key)
                          return (
                            <div key={mod.key} className={`flex items-center gap-1.5 text-[11px] ${ok ? 'text-gray-700' : 'text-gray-300'}`}>
                              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                                ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                              }`}>
                                {ok ? '✓' : '✕'}
                              </span>
                              <span className="leading-tight">{mod.icon} {mod.label}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* ── Prix + CTA ── */}
                    <div className="px-4 pb-4 pt-3 border-t border-gray-100">
                      {!isPaid ? (
                        <div className="text-center">
                          <p className="text-base font-black text-gray-800">Gratuit</p>
                          <p className="text-[10px] text-gray-400">pour toujours</p>
                          {isChef && currentPlanKey !== 'FREE' && stripeSubscriptionId && (
                            <button
                              onClick={handleManage}
                              disabled={loadingPlanKey === 'portal'}
                              className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-60"
                            >
                              {loadingPlanKey === 'portal' ? (
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                              ) : '↓'}
                              Résilier et passer au Gratuit
                            </button>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="text-center mb-1">
                            <span className="text-base font-black text-gray-800">
                              {p.priceMonthly!.toFixed(2).replace('.', ',')} €
                            </span>
                            <span className="text-xs text-gray-500 font-normal">/mois</span>
                          </div>
                          {pricePerMusician !== null && (
                            <p className={`text-center text-[11px] font-semibold mb-2 ${isCurrent ? pc.text : 'text-indigo-600'}`}>
                              soit <strong>{pricePerMusician.toFixed(2).replace('.', ',')} €</strong>
                              <span className="font-normal text-gray-400">/musicien</span>
                            </p>
                          )}

                          {/* Avertissement stockage insuffisant */}
                          {exceedsStorage && !isCurrent && (
                            <div className="mb-2 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5">
                              <p className="text-[10px] font-semibold text-red-700 flex items-start gap-1">
                                <span className="flex-shrink-0">⚠️</span>
                                <span>
                                  Vous utilisez <strong>{formatBytes(usedBytes)}</strong> — ce plan n&apos;inclut que <strong>{storageLabel(p.storageGb)}</strong>. Libérez de l&apos;espace d&apos;abord.
                                </span>
                              </p>
                            </div>
                          )}

                          {/* Bouton Souscrire */}
                          {isChef && !isCurrent && p.stripePriceId && p.isActive && !isGifted && (
                            <button
                              onClick={() => !exceedsStorage && handleSubscribe(p.key)}
                              disabled={isLoading || !!loadingPlanKey || exceedsStorage}
                              className={`w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                                exceedsStorage
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                  : `bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 shadow-sm hover:shadow-md`
                              } disabled:opacity-60`}
                            >
                              {isLoading ? (
                                <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Redirection…</>
                              ) : exceedsStorage ? (
                                <>⚠ Stockage insuffisant</>
                              ) : (
                                <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>Souscrire</>
                              )}
                            </button>
                          )}

                          {isCurrent && (
                            <p className={`text-center text-[10px] mt-1 ${isCurrentGifted ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>
                              {isCurrentGifted ? '🎁 Offert gratuitement' : 'Plan actif'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Message plan offert — sous toutes les cards, seulement si ce n'est pas le plan le plus élevé */}
            {isChef && currentPlanKey !== 'FREE' && !stripeSubscriptionId && allPlans[allPlans.length - 1]?.key !== currentPlanKey && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                🎁 Votre forfait <strong>{currentPlan.label}</strong> vous est actuellement offert. Veuillez contacter l&apos;administrateur du site pour résilier et passer sur un autre forfait.
              </div>
            )}

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

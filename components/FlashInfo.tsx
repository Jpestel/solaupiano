'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'

interface Flash {
  id: number
  type: 'INFO' | 'ASTUCE' | 'NEWS' | 'ALERTE'
  title: string
  content: string
  ctaLabel: string | null
  ctaUrl: string | null
}

const META: Record<string, { icon: string; grad: string; ring: string }> = {
  INFO: { icon: 'ℹ️', grad: 'from-indigo-600 to-indigo-500', ring: 'text-indigo-200' },
  ASTUCE: { icon: '💡', grad: 'from-amber-500 to-amber-400', ring: 'text-amber-100' },
  NEWS: { icon: '📣', grad: 'from-green-600 to-green-500', ring: 'text-green-100' },
  ALERTE: { icon: '⚠️', grad: 'from-rose-600 to-rose-500', ring: 'text-rose-100' },
}

const CHECK_THROTTLE_MS = 30_000

export function FlashInfo() {
  const [flash, setFlash] = useState<Flash | null>(null)
  const lastCheckRef = useRef(0)
  const pathname = usePathname()
  const router = useRouter()

  const check = useCallback(async (force = false) => {
    if (flash) return // déjà une fenêtre ouverte
    const now = Date.now()
    if (!force && now - lastCheckRef.current < CHECK_THROTTLE_MS) return
    lastCheckRef.current = now
    try {
      const res = await fetch('/api/flash-infos/next')
      if (!res.ok) return
      const d = await res.json()
      if (d.flash) setFlash(d.flash)
    } catch {}
  }, [flash])

  // Au montage (login / chargement / reload) + à chaque navigation (throttlé)
  useEffect(() => { check() }, [check, pathname])

  // Retour d'onglet + reconnexion réseau
  useEffect(() => {
    const onVis = () => { if (!document.hidden) check(true) }
    const onOnline = () => check(true)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('online', onOnline)
    }
  }, [check])

  const close = useCallback(() => {
    if (!flash) return
    fetch(`/api/flash-infos/${flash.id}/vu`, { method: 'POST' }).catch(() => {})
    setFlash(null)
  }, [flash])

  if (!flash) return null
  const m = META[flash.type] || META.INFO

  const onCta = () => {
    const url = flash.ctaUrl
    close()
    if (!url) return
    if (/^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener')
    else router.push(url)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={close}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`bg-gradient-to-r ${m.grad} px-6 py-4 flex items-start justify-between`}>
          <h2 className="text-white font-bold text-lg flex items-center gap-2 pr-3">
            <span>{m.icon}</span> {flash.title}
          </h2>
          <button onClick={close} className={`${m.ring} hover:text-white transition-colors mt-1`} aria-label="Fermer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{flash.content}</p>
        </div>

        <div className="px-6 pb-5 pt-1 flex items-center gap-2">
          {flash.ctaUrl && (
            <button onClick={onCta} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
              {flash.ctaLabel || 'En savoir plus'}
            </button>
          )}
          <button
            onClick={close}
            className={`${flash.ctaUrl ? '' : 'flex-1'} rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors`}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

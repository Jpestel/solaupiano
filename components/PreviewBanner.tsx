'use client'

import { useEffect, useState } from 'react'

type Ctx = { groupId: number; groupName: string; role: 'CHEF' | 'MEMBRE' }

function readPreviewCookie(): Ctx | null {
  const entry = document.cookie.split('; ').find((c) => c.startsWith('preview_as='))
  if (!entry) return null
  try {
    const value = decodeURIComponent(entry.split('=').slice(1).join('='))
    const p = JSON.parse(value)
    if (p && typeof p.groupName === 'string' && (p.role === 'CHEF' || p.role === 'MEMBRE')) return p
  } catch {}
  return null
}

// Bandeau global affiché tant qu'un aperçu admin est actif (lecture seule).
export function PreviewBanner() {
  const [ctx, setCtx] = useState<Ctx | null>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => { setCtx(readPreviewCookie()) }, [])

  if (!ctx) return null

  const exit = async () => {
    setLeaving(true)
    await fetch('/api/admin/preview', { method: 'DELETE' })
    window.location.reload()
  }

  const roleLabel = ctx.role === 'CHEF' ? 'Chef' : 'Musicien'

  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-white shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-center gap-x-3 gap-y-1 flex-wrap px-4 py-2 text-sm">
        <span className="font-medium">
          👁 Aperçu — « {ctx.groupName} » en tant que {roleLabel}
          <span className="hidden sm:inline font-normal text-amber-50"> · lecture seule</span>
        </span>
        <button
          onClick={exit}
          disabled={leaving}
          className="rounded-full bg-white/20 hover:bg-white/30 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-60"
        >
          {leaving ? 'Sortie…' : 'Quitter l’aperçu'}
        </button>
      </div>
    </div>
  )
}

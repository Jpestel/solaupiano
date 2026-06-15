'use client'

import { useState } from 'react'

// Boutons « voir en tant que » Chef / Musicien pour un groupe donné.
// Pose le cookie d'aperçu puis ouvre la page du groupe côté usage.
export function PreviewGroupButtons({ groupId }: { groupId: number }) {
  const [busy, setBusy] = useState(false)

  const go = async (role: 'CHEF' | 'MEMBRE') => {
    setBusy(true)
    const res = await fetch('/api/admin/preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, role }),
    })
    if (res.ok) window.location.href = `/groupes/${groupId}`
    else setBusy(false)
  }

  return (
    <div className="flex items-center gap-1.5 justify-end">
      <button
        onClick={() => go('CHEF')}
        disabled={busy}
        title="Prévisualiser ce groupe en tant que chef (lecture seule)"
        className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors whitespace-nowrap"
      >
        👁 Chef
      </button>
      <button
        onClick={() => go('MEMBRE')}
        disabled={busy}
        title="Prévisualiser ce groupe en tant que musicien (lecture seule)"
        className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors whitespace-nowrap"
      >
        Musicien
      </button>
    </div>
  )
}

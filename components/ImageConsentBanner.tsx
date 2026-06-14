'use client'

import { useEffect, useState } from 'react'

export default function ImageConsentBanner({ groupId }: { groupId: string | number }) {
  const [hasSocial, setHasSocial] = useState(false)
  const [consent, setConsent] = useState<boolean | null | undefined>(undefined) // undefined = pas encore chargé
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    fetch(`/api/groupes/${groupId}/consent`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) { setHasSocial(!!d.hasSocial); setConsent(d.consent ?? null) } })
      .catch(() => {})
    return () => { alive = false }
  }, [groupId])

  const answer = async (value: boolean) => {
    setBusy(true)
    const res = await fetch(`/api/groupes/${groupId}/consent`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consent: value }),
    })
    setBusy(false)
    if (res.ok) { setConsent(value); setEditing(false) }
  }

  // Le module Réseaux sociaux n'est pas actif → rien à demander.
  if (!hasSocial || consent === undefined) return null

  // Déjà répondu et pas en édition → statut compact.
  if (consent !== null && !editing) {
    return (
      <div className={`mb-6 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
        consent ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'
      }`}>
        <span>📸 Droit à l&apos;image (réseaux sociaux) :</span>
        <strong>{consent ? 'vous avez accepté' : 'vous avez refusé'}</strong>
        <button onClick={() => setEditing(true)} className="ml-auto text-xs font-medium underline hover:no-underline">Modifier</button>
      </div>
    )
  }

  // Pas encore répondu (ou en cours de modification) → demande explicite.
  return (
    <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
      <p className="text-sm font-semibold text-sky-900">📸 Droit à l&apos;image</p>
      <p className="mt-0.5 text-sm text-sky-800">
        Le chef de ce groupe peut publier des <strong>photos et vidéos</strong> sur les réseaux sociaux. Acceptez-vous d&apos;y apparaître (diffusion de votre visage) ? Vous pourrez changer d&apos;avis à tout moment.
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button onClick={() => answer(true)} disabled={busy} className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-green-500 disabled:opacity-60">✓ J&apos;accepte</button>
        <button onClick={() => answer(false)} disabled={busy} className="rounded-lg border border-red-300 bg-white px-4 py-1.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60">✗ Je refuse</button>
        {editing && consent !== null && (
          <button onClick={() => setEditing(false)} className="text-xs text-sky-700 underline">Annuler</button>
        )}
      </div>
    </div>
  )
}

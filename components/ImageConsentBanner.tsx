'use client'

import { useEffect, useState } from 'react'

export default function ImageConsentBanner({ groupId }: { groupId: string | number }) {
  const [hasSocial, setHasSocial] = useState(false)
  const [consent, setConsent] = useState<boolean | null | undefined>(undefined) // undefined = pas encore chargé
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState('')

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
    if (res.ok) {
      setConsent(value) // → le bandeau disparaît
      setFlash(`${value ? '✓ Merci, votre accord est enregistré.' : 'Votre choix est enregistré.'} Vous pourrez le modifier à tout moment depuis votre profil.`)
      setTimeout(() => setFlash(''), 8000)
    }
  }

  // Toast flash (affiché même après disparition du bandeau)
  const flashNode = flash ? (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] max-w-md w-[calc(100%-2rem)] rounded-xl bg-gray-900 text-white shadow-2xl px-4 py-3 text-sm flex items-start gap-2">
      <span className="text-lg leading-none">📸</span>
      <span className="flex-1">{flash}</span>
      <button onClick={() => setFlash('')} className="text-gray-400 hover:text-white text-lg leading-none">×</button>
    </div>
  ) : null

  // Pas de module Réseaux, pas encore chargé, ou déjà répondu → aucun bandeau (gestion dans le profil).
  if (!hasSocial || consent === undefined || consent !== null) return flashNode

  // consent === null → on demande explicitement.
  return (
    <>
      {flashNode}
      <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
        <p className="text-sm font-semibold text-sky-900">📸 Droit à l&apos;image</p>
        <p className="mt-0.5 text-sm text-sky-800">
          Le chef de ce groupe peut publier des <strong>photos et vidéos</strong> sur les réseaux sociaux. Acceptez-vous d&apos;y apparaître (diffusion de votre visage) ? Vous pourrez changer d&apos;avis à tout moment depuis votre profil.
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <button onClick={() => answer(true)} disabled={busy} className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-green-500 disabled:opacity-60">✓ J&apos;accepte</button>
          <button onClick={() => answer(false)} disabled={busy} className="rounded-lg border border-red-300 bg-white px-4 py-1.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60">✗ Je refuse</button>
        </div>
      </div>
    </>
  )
}

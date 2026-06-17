'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function JoinConfirm({ token, isSchool }: { token: string; isSchool: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const join = async () => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/groupes/rejoindre', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      router.push(`/groupes/${data.groupId}`)
      router.refresh()
    } else {
      setLoading(false)
      setError(data.error || 'Une erreur est survenue. Réessayez.')
    }
  }

  return (
    <div className="mt-5">
      <button
        onClick={join}
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
      >
        {loading ? 'Connexion…' : `Rejoindre ${isSchool ? 'la classe' : 'le groupe'}`}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}

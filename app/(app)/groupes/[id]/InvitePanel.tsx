'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function InvitePanel({ groupId }: { groupId: number }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setSuccess('')
    setError('')

    const res = await fetch(`/api/groupes/${groupId}/inviter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })

    setLoading(false)
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erreur.')
    } else {
      setSuccess(`${data.name} a été ajouté au groupe.`)
      setEmail('')
      router.refresh()
    }
  }

  return (
    <div>
      <form onSubmit={handleInvite} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="form-input flex-1 text-sm"
          placeholder="email@musicien.fr"
        />
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors flex-shrink-0"
        >
          {loading ? '...' : 'Inviter'}
        </button>
      </form>
      {success && <p className="mt-2 text-sm text-green-600">{success}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}

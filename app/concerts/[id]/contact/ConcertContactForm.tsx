'use client'

import { useState } from 'react'

interface ConcertInfo {
  id: number
  name: string
  groupName: string
  date: string
  startTime: string | null
  address: string
}

export function ConcertContactForm({ concert }: { concert: ConcertInfo }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState(
    `Bonjour,\n\nJe souhaite avoir des informations concernant le concert "${concert.name}" de ${concert.groupName}.\n\n`
  )
  const [hp, setHp] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError('')

    const res = await fetch(`/api/concerts/${concert.id}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message, _hp: hp }),
    })

    setSending(false)
    if (res.ok) {
      setSent(true)
      return
    }

    const data = await res.json().catch(() => ({}))
    setError(data.error || 'Une erreur est survenue.')
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-10 text-center">
        <p className="text-3xl mb-3">✉️</p>
        <h2 className="text-xl font-bold text-emerald-950">Message envoyé</h2>
        <p className="mt-2 text-sm text-emerald-700">Le chef du groupe vous répondra dès que possible.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <input
        type="text"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Votre nom</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Votre email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Votre question</label>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={7}
          maxLength={2000}
          className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <p className="mt-1 text-right text-xs text-gray-400">{message.length}/2000</p>
      </div>

      <button
        type="submit"
        disabled={sending}
        className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {sending ? 'Envoi...' : 'Envoyer au chef du groupe'}
      </button>
    </form>
  )
}

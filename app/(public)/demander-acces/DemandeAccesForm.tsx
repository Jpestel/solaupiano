'use client'

import { useState } from 'react'

export function DemandeAccesForm() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/demander-acces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (res.ok) { setSent(true); return }
    const data = await res.json().catch(() => ({}))
    setError(data.error || "L'envoi a échoué. Réessayez dans un instant.")
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-center">
        <p className="text-2xl">✅</p>
        <p className="mt-1.5 text-sm font-semibold text-emerald-900">Demande envoyée</p>
        <p className="mt-1 text-sm leading-relaxed text-emerald-800">
          Elle a bien été transmise. Vous recevrez une réponse à l&apos;adresse{' '}
          <strong>{form.email}</strong>. Si la demande est acceptée, elle contiendra un lien
          personnel pour créer votre compte.
        </p>
      </div>
    )
  }

  const champ = 'w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200'

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Votre nom</label>
        <input
          type="text" required value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Prénom et nom" className={champ}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Votre email</label>
        <input
          type="email" required value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="vous@exemple.fr" className={champ}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">
          Qui êtes-vous, et pourquoi Sol au piano ?
        </label>
        <textarea
          required rows={4} value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Votre instrument, votre groupe ou votre école, et qui vous a parlé du site…"
          className={champ}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
      >
        {loading ? 'Envoi…' : 'Envoyer ma demande'}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-gray-400">
        Votre nom et votre email ne servent qu&apos;à traiter cette demande. Ils ne sont ni revendus,
        ni transmis à des tiers.
      </p>
    </form>
  )
}

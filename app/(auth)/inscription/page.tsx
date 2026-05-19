'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Instrument {
  id: number
  name: string
}

export default function InscriptionPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    instrumentIds: [] as number[],
    otherInstrument: '',
  })
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/instruments')
      .then((r) => r.json())
      .then((data) => setInstruments(data))
      .catch(() => {})
  }, [])

  const toggleInstrument = (id: number) => {
    setForm((prev) => ({
      ...prev,
      instrumentIds: prev.instrumentIds.includes(id)
        ? prev.instrumentIds.filter((i) => i !== id)
        : [...prev.instrumentIds, id],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setLoading(true)

    const res = await fetch('/api/inscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        instrumentIds: form.instrumentIds,
        otherInstrument: form.otherInstrument.trim() || undefined,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Une erreur est survenue.')
      return
    }

    router.push('/connexion?registered=1')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-2xl">🎹</span>
          </div>
          <h1 className="text-3xl font-bold text-indigo-900">Solaupiano</h1>
          <p className="text-gray-500 mt-1">Créez votre compte musicien</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Créer un compte</h2>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="form-label">Nom complet</label>
              <input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="form-input"
                placeholder="Marie Dupont"
              />
            </div>

            <div>
              <label htmlFor="email" className="form-label">Adresse email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="form-input"
                placeholder="vous@exemple.fr"
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">Mot de passe</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="form-input"
                placeholder="Minimum 8 caractères"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="form-label">Confirmer le mot de passe</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="form-input"
                placeholder="••••••••"
              />
            </div>

            {instruments.length > 0 && (
              <div>
                <label className="form-label">Instrument(s) joué(s)</label>
                <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-3 grid grid-cols-2 gap-y-2 gap-x-4">
                  {instruments.map((instrument) => (
                    <label
                      key={instrument.id}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={form.instrumentIds.includes(instrument.id)}
                        onChange={() => toggleInstrument(instrument.id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-indigo-700 transition-colors">
                        {instrument.name}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="mt-3">
                  <label htmlFor="otherInstrument" className="text-xs font-medium text-gray-500 mb-1 block">
                    Autre instrument (non listé ci-dessus)
                  </label>
                  <input
                    id="otherInstrument"
                    type="text"
                    value={form.otherInstrument}
                    onChange={(e) => setForm({ ...form, otherInstrument: e.target.value })}
                    className="form-input"
                    placeholder="ex: Banjo, Cornemuse..."
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors mt-2"
            >
              {loading ? 'Création en cours...' : 'Créer mon compte'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Déjà un compte ?{' '}
            <Link href="/connexion" className="font-medium text-indigo-600 hover:text-indigo-500">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

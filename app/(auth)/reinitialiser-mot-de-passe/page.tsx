'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ResetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [form, setForm] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">❌</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Lien invalide</h2>
        <p className="text-sm text-gray-500 mb-6">Ce lien de réinitialisation est invalide ou a expiré.</p>
        <Link href="/mot-de-passe-oublie" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
          Faire une nouvelle demande
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/reinitialiser-mot-de-passe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: form.password }),
    })

    setLoading(false)

    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Une erreur est survenue.')
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/connexion'), 3000)
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Mot de passe mis à jour</h2>
        <p className="text-sm text-gray-500">Vous allez être redirigé vers la page de connexion...</p>
      </div>
    )
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Nouveau mot de passe</h2>
      <p className="text-sm text-gray-500 mb-6">Choisissez un mot de passe d&apos;au moins 8 caractères.</p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="form-label">Nouveau mot de passe</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="form-input"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label htmlFor="confirm" className="form-label">Confirmer le mot de passe</label>
          <input
            id="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            className="form-input"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer le nouveau mot de passe'}
        </button>
      </form>
    </>
  )
}

export default function ReinitialisationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-2xl">🎹</span>
          </div>
          <h1 className="text-3xl font-bold text-indigo-900">Sol au piano</h1>
          <p className="text-indigo-400 text-sm italic mt-1">du solo à l&apos;orchestre</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Suspense fallback={<div className="text-center text-gray-400 text-sm">Chargement...</div>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

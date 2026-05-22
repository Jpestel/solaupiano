'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ConnexionForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/tableau-de-bord'
  const justVerified = searchParams.get('verified') === '1'
  const justRegistered = searchParams.get('registered') === '1'

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [unverified, setUnverified] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setUnverified(false)
    setLoading(true)

    const result = await signIn('credentials', {
      redirect: false,
      email: form.email,
      password: form.password,
    })

    if (result?.error) {
      const check = await fetch(`/api/auth/check-email?email=${encodeURIComponent(form.email)}`)
      const data = await check.json()
      if (data.unverified) {
        setUnverified(true)
      } else {
        setError('Email ou mot de passe incorrect.')
      }
      setLoading(false)
      return
    }

    setLoading(false)
    router.push(callbackUrl)
    router.refresh()
  }

  const handleResend = async () => {
    setResendLoading(true)
    await fetch('/api/auth/renvoyer-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email }),
    })
    setResendLoading(false)
    setResendSent(true)
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Connexion</h2>

      {justVerified && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Votre email a été confirmé. Vous pouvez vous connecter.
        </div>
      )}

      {justRegistered && !justVerified && (
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
          Compte créé ! Consultez votre boîte mail pour confirmer votre adresse avant de vous connecter.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {unverified && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium mb-1">Email non confirmé</p>
          <p className="mb-3">Vérifiez votre boîte mail et cliquez sur le lien de confirmation.</p>
          {resendSent ? (
            <p className="text-green-700 font-medium">✓ Un nouveau mail vient d'être envoyé.</p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="text-amber-900 underline font-medium disabled:opacity-60"
            >
              {resendLoading ? 'Envoi...' : 'Renvoyer le mail de confirmation'}
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="form-label mb-0">Mot de passe</label>
            <Link href="/mot-de-passe-oublie" className="text-xs text-indigo-600 hover:text-indigo-500">
              Mot de passe oublié ?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="form-input"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Connexion en cours...' : 'Se connecter'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Pas encore de compte ?{' '}
        <Link href="/inscription" className="font-medium text-indigo-600 hover:text-indigo-500">
          Créer un compte
        </Link>
      </p>
    </div>
  )
}

export default function ConnexionPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-2xl">🎹</span>
          </div>
          <h1 className="text-3xl font-bold text-indigo-900">Sol au piano</h1>
          <p className="text-gray-500 mt-1">Gestion des répétitions musicales</p>
        </div>
        <Suspense fallback={<div className="bg-white rounded-2xl shadow-xl p-8 text-center text-gray-400">Chargement...</div>}>
          <ConnexionForm />
        </Suspense>
      </div>
    </div>
  )
}

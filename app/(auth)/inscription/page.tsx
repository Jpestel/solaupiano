'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ph } from '@/lib/placeholders'

interface Instrument {
  id: number
  name: string
}

export default function InscriptionPage() {
  const router = useRouter()
  const [userPlan, setUserPlan] = useState<'MUSICIEN' | 'CREATEUR'>('MUSICIEN')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    instrumentIds: [] as number[],
    otherInstrument: '',
  })
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [instrumentSearch, setInstrumentSearch] = useState('')
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
        userPlan,
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
          <Link href="/" className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg hover:bg-indigo-500 transition-colors">
            <span className="text-2xl">🎹</span>
          </Link>
          <h1 className="text-3xl font-bold text-indigo-900">Sol au piano</h1>
          <p className="text-indigo-400 text-sm italic mt-0.5">du solo à l&apos;orchestre</p>
          <p className="text-gray-500 text-sm mt-1">Créez votre compte gratuitement</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Créer un compte</h2>

          {/* Plan choice */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Comment souhaitez-vous utiliser Sol au piano ?</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Musicien */}
              <button
                type="button"
                onClick={() => setUserPlan('MUSICIEN')}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                  userPlan === 'MUSICIEN'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-3xl">🎵</span>
                <p className={`text-sm font-bold ${userPlan === 'MUSICIEN' ? 'text-indigo-700' : 'text-gray-800'}`}>
                  Musicien
                </p>
                <ul className="text-[11px] text-gray-500 text-left space-y-0.5 w-full px-1">
                  <li>✓ Rejoindre un ou plusieurs groupes</li>
                  <li>✓ Répétitions, répertoire, concerts</li>
                  <li className="text-red-400">✗ Créer un groupe</li>
                </ul>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  userPlan === 'MUSICIEN' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                }`}>Gratuit</span>
              </button>

              {/* Créateur */}
              <button
                type="button"
                onClick={() => setUserPlan('CREATEUR')}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                  userPlan === 'CREATEUR'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-3xl">🎼</span>
                <p className={`text-sm font-bold ${userPlan === 'CREATEUR' ? 'text-indigo-700' : 'text-gray-800'}`}>
                  Chef d&apos;orchestre
                </p>
                <ul className="text-[11px] text-gray-500 text-left space-y-0.5 w-full px-1">
                  <li>✓ Rejoindre un ou plusieurs groupes</li>
                  <li>✓ Créer et gérer <strong>1 groupe</strong></li>
                  <li>✓ Stockage de fichiers inclus</li>
                  <li className="text-indigo-500 text-[10px]">↑ Pro : 3 groupes, 5 Go · Premium : 5 groupes, 10 Go</li>
                </ul>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  userPlan === 'CREATEUR' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                }`}>Gratuit</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Vous pourrez évoluer vers un plan payant depuis votre profil à tout moment.{' '}
              <Link href="/tarifs" className="text-indigo-500 hover:text-indigo-600 underline underline-offset-2">
                Voir tous les plans →
              </Link>
            </p>
          </div>

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
                placeholder={ph('inscription_1')}
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
                placeholder={ph('inscription_2')}
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
                placeholder={ph('inscription_3')}
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
                placeholder={ph('inscription_4')}
              />
            </div>

            {instruments.length > 0 && (() => {
              const selected = instruments.filter((i) => form.instrumentIds.includes(i.id))
              const q = instrumentSearch.trim().toLowerCase()
              const filtered = instruments.filter((i) => i.name.toLowerCase().includes(q))
              return (
                <div>
                  <label className="form-label">
                    Instrument(s) joué(s)
                    {selected.length > 0 && <span className="ml-1.5 text-xs font-normal text-gray-400">— {selected.length} sélectionné{selected.length > 1 ? 's' : ''}</span>}
                  </label>

                  {/* Puces des instruments sélectionnés */}
                  {selected.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selected.map((i) => (
                        <button
                          key={i.id}
                          type="button"
                          onClick={() => toggleInstrument(i.id)}
                          className="inline-flex items-center gap-1 rounded-full bg-indigo-100 border border-indigo-200 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-200 transition-colors"
                          title="Retirer"
                        >
                          {i.name}
                          <span className="text-indigo-400" aria-hidden>✕</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Recherche */}
                  <input
                    type="text"
                    value={instrumentSearch}
                    onChange={(e) => setInstrumentSearch(e.target.value)}
                    className="form-input mt-2"
                    placeholder={ph('inscription_5')}
                  />

                  {/* Liste filtrée (bornée + défilante) */}
                  <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 max-h-44 overflow-y-auto p-1.5 space-y-0.5">
                    {filtered.length > 0 ? (
                      filtered.map((instrument) => {
                        const checked = form.instrumentIds.includes(instrument.id)
                        return (
                          <button
                            key={instrument.id}
                            type="button"
                            onClick={() => toggleInstrument(instrument.id)}
                            className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                              checked ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <span className={`flex h-4 w-4 items-center justify-center rounded border ${
                              checked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 bg-white'
                            }`}>
                              {checked && (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              )}
                            </span>
                            {instrument.name}
                          </button>
                        )
                      })
                    ) : (
                      <p className="px-2.5 py-3 text-sm text-gray-400">Aucun instrument trouvé. Utilisez le champ « Autre » ci-dessous.</p>
                    )}
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
                      placeholder={ph('inscription_6')}
                    />
                  </div>
                </div>
              )
            })()}

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

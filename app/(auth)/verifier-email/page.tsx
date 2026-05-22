'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function VerifierEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!token) { setStatus('error'); return }
    fetch(`/api/auth/verifier-email?token=${encodeURIComponent(token)}`)
      .then((r) => {
        if (r.redirected && r.url.includes('/connexion?verified=1')) {
          setStatus('success')
        } else if (r.ok) {
          setStatus('success')
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
      {status === 'loading' && (
        <>
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Vérification en cours...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Email confirmé !</h2>
          <p className="text-gray-500 text-sm mb-6">Votre compte est activé. Vous pouvez maintenant vous connecter.</p>
          <Link
            href="/connexion"
            className="inline-block bg-indigo-600 text-white rounded-lg px-6 py-2.5 text-sm font-semibold hover:bg-indigo-500 transition-colors"
          >
            Se connecter
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Lien invalide ou expiré</h2>
          <p className="text-gray-500 text-sm mb-6">Ce lien de vérification est invalide ou a expiré (durée de validité : 24 h).</p>
          <Link
            href="/connexion"
            className="inline-block text-indigo-600 text-sm font-medium hover:text-indigo-500"
          >
            Retour à la connexion
          </Link>
        </>
      )}
    </div>
  )
}

export default function VerifierEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-2xl">🎶</span>
          </div>
          <h1 className="text-3xl font-bold text-indigo-900">Sol au piano</h1>
        </div>
        <Suspense fallback={<div className="bg-white rounded-2xl shadow-xl p-8 text-center text-gray-400">Chargement...</div>}>
          <VerifierEmailContent />
        </Suspense>
      </div>
    </div>
  )
}

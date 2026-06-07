'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ph } from '@/lib/placeholders'

export function InvitePanel({ groupId }: { groupId: number }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  // Email saisi mais sans compte → propose l'invitation à s'inscrire
  const [notRegistered, setNotRegistered] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupSent, setSignupSent] = useState('')

  const reset = () => { setSuccess(''); setError(''); setNotRegistered(''); setSignupSent('') }

  // 1) Invitation directe : ajoute le musicien s'il a déjà un compte
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    reset()

    const res = await fetch(`/api/groupes/${groupId}/inviter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)

    if (res.ok) {
      setSuccess(`${data.name} a été ajouté au groupe ✅`)
      setEmail('')
      router.refresh()
    } else if (res.status === 404) {
      // Pas de compte avec cet email → on propose de l'inviter à s'inscrire
      setNotRegistered(email.trim())
    } else {
      setError(data.error || 'Erreur.')
    }
  }

  // 2) Invitation à s'inscrire : envoie un email d'invitation à créer un compte
  const handleSignupInvite = async () => {
    setSignupLoading(true)
    const res = await fetch('/api/auth/inviter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: notRegistered }),
    })
    setSignupLoading(false)
    if (res.ok) {
      setSignupSent(notRegistered)
      setNotRegistered('')
      setEmail('')
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || "Impossible d'envoyer l'invitation.")
    }
  }

  return (
    <div>
      {/* Explication des 2 cas */}
      <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 mb-3 text-xs text-blue-800 leading-relaxed">
        <p className="font-semibold mb-1">💡 Deux façons d&apos;ajouter un musicien :</p>
        <p>
          <strong>Déjà inscrit ?</strong> Saisissez son e-mail ci-dessous : il est ajouté immédiatement au groupe.
        </p>
        <p className="mt-0.5">
          <strong>Pas encore inscrit ?</strong> On vous proposera de lui envoyer une invitation à créer un compte.
        </p>
      </div>

      <form onSubmit={handleInvite} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (notRegistered || signupSent) reset() }}
          className="form-input flex-1 text-sm"
          placeholder={ph('groupes_id_invitepanel_1')}
        />
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors flex-shrink-0"
        >
          {loading ? '...' : 'Ajouter au groupe'}
        </button>
      </form>

      {success && <p className="mt-2 text-sm text-green-600">{success}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {/* Cas : email sans compte → inviter à s'inscrire */}
      {notRegistered && (
        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-3">
          <p className="text-sm text-amber-800">
            Aucun compte Sol au piano n&apos;est associé à <strong>{notRegistered}</strong>.
          </p>
          <p className="text-xs text-amber-600 mt-0.5 mb-2.5">
            On ne peut ajouter au groupe qu&apos;un musicien déjà inscrit. Envoyez-lui plutôt une invitation à créer son compte :
          </p>
          <button
            onClick={handleSignupInvite}
            disabled={signupLoading}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400 disabled:opacity-60 transition-colors"
          >
            {signupLoading ? 'Envoi…' : `✉️ Inviter ${notRegistered} à s'inscrire`}
          </button>
        </div>
      )}

      {/* Confirmation invitation inscription envoyée */}
      {signupSent && (
        <div className="mt-3 rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 text-sm text-green-700">
          ✅ Invitation envoyée à <strong>{signupSent}</strong>. Une fois inscrit, revenez l&apos;ajouter au groupe avec son e-mail.
        </div>
      )}
    </div>
  )
}

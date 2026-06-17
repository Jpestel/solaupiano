'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ph } from '@/lib/placeholders'

export function InvitePanel({ groupId, groupType }: { groupId: number; groupType?: string }) {
  const router = useRouter()
  const isSchool = groupType === 'SCHOOL'
  const inviteLabel = isSchool ? 'élève' : 'musicien'
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  // Email saisi mais sans compte → propose l'invitation à s'inscrire
  const [notRegistered, setNotRegistered] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupSent, setSignupSent] = useState('')

  // Lien d'invitation partageable (email / SMS / WhatsApp)
  const [link, setLink] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState('')
  const [copied, setCopied] = useState(false)

  const shareMessage = link
    ? `Rejoins ${isSchool ? 'ma classe' : 'mon groupe'} sur Sol au piano : ${link}`
    : ''

  const generateLink = async (regenerate = false) => {
    setLinkLoading(true)
    setLinkError('')
    setCopied(false)
    const res = await fetch(`/api/groupes/${groupId}/invite-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regenerate }),
    })
    const data = await res.json().catch(() => ({}))
    setLinkLoading(false)
    if (res.ok) setLink(data.url)
    else setLinkError(data.error || 'Impossible de générer le lien.')
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setLinkError('Copie impossible — sélectionnez le lien manuellement.')
    }
  }

  const reset = () => { setSuccess(''); setError(''); setNotRegistered(''); setSignupSent('') }

  // 1) Invitation directe : ajoute la personne si elle a déjà un compte
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
      setSuccess(`${data.name} a été ajouté${isSchool ? ' comme élève' : ' au groupe'} ✅`)
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
      {/* ── Inviter par lien (email / SMS / WhatsApp) ── */}
      <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-3 mb-4">
        <p className="text-sm font-semibold text-indigo-900 flex items-center gap-1.5">🔗 Inviter par lien</p>
        <p className="text-xs text-indigo-700/80 mt-0.5 mb-2.5">
          Partagez ce lien : la personne crée un compte (ou se connecte) et rejoint {isSchool ? 'la classe' : 'le groupe'} en un clic.
        </p>

        {!link ? (
          <button
            onClick={() => generateLink(false)}
            disabled={linkLoading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
          >
            {linkLoading ? 'Génération…' : 'Générer le lien d\'invitation'}
          </button>
        ) : (
          <div className="space-y-2.5">
            <div className="flex gap-2">
              <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="form-input flex-1 text-xs bg-white" />
              <button
                onClick={copyLink}
                className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition-colors flex-shrink-0"
              >
                {copied ? '✓ Copié' : 'Copier'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
                target="_blank" rel="noopener noreferrer"
                className="rounded-lg bg-green-500 px-3 py-2 text-sm font-semibold text-white hover:bg-green-400 transition-colors"
              >
                WhatsApp
              </a>
              <a
                href={`sms:?&body=${encodeURIComponent(shareMessage)}`}
                className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-400 transition-colors"
              >
                SMS
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(`Invitation à rejoindre ${isSchool ? 'une classe' : 'un groupe'} sur Sol au piano`)}&body=${encodeURIComponent(shareMessage)}`}
                className="rounded-lg bg-gray-600 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-500 transition-colors"
              >
                E-mail
              </a>
              <button
                onClick={() => generateLink(true)}
                disabled={linkLoading}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-60 transition-colors"
                title="Invalide l'ancien lien et en crée un nouveau"
              >
                {linkLoading ? '…' : '↻ Régénérer'}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">Toute personne disposant de ce lien peut rejoindre. Régénérez-le pour invalider l&apos;ancien.</p>
          </div>
        )}
        {linkError && <p className="mt-2 text-sm text-red-600">{linkError}</p>}
      </div>

      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">ou ajouter directement</div>

      {/* Explication des 2 cas */}
      <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 mb-3 text-xs text-blue-800 leading-relaxed">
        <p className="font-semibold mb-1">💡 Deux façons d&apos;ajouter un {inviteLabel} :</p>
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
            On ne peut ajouter {isSchool ? 'à la classe' : 'au groupe'} qu&apos;un {inviteLabel} déjà inscrit. Envoyez-lui plutôt une invitation à créer son compte :
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

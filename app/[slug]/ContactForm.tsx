'use client'

import { useState } from 'react'
import { ph } from '@/lib/placeholders'

interface Props {
  slug: string
  primaryColor: string
  title?: string | null
  concert?: {
    id: number
    name: string
    date: string
    location: string
    address: string | null
    postalCode: string | null
    city: string | null
    startTime: string | null
  } | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function fullAddress(concert: NonNullable<Props['concert']>) {
  return [
    concert.location,
    concert.address,
    [concert.postalCode, concert.city].filter(Boolean).join(' '),
  ].filter(Boolean).join(', ')
}

function defaultMessage(concert?: Props['concert']) {
  if (!concert) return ''
  return `Bonjour,\n\nJe souhaite avoir des informations concernant le concert "${concert.name}" (${formatDate(concert.date)}${concert.startTime ? ` à partir de ${concert.startTime}` : ''}, ${fullAddress(concert)}).\n\n`
}

export function ContactForm({ slug, primaryColor, title, concert }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState(() => defaultMessage(concert))
  const [hp, setHp] = useState('') // honeypot
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError('')

    const res = await fetch(`/api/groupe-page/${slug}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message, concertId: concert?.id ?? null, _hp: hp }),
    })

    setSending(false)
    if (res.ok) {
      setSent(true)
    } else {
      const d = await res.json()
      setError(d.error || 'Une erreur est survenue.')
    }
  }

  const inp = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow shadow-sm'

  if (sent) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4" style={{ background: primaryColor + '20' }}>
          ✉️
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Message envoyé !</h3>
        <p className="text-gray-500 text-sm">Le groupe vous répondra dès que possible.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">{title || 'Nous contacter'}</h2>
      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {concert && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-950">
          <p className="font-semibold">Question sur le concert : {concert.name}</p>
          <p className="mt-1 text-indigo-700">
            {fullAddress(concert)}
            {concert.startTime ? ` · à partir de ${concert.startTime}` : ''}
          </p>
        </div>
      )}
      {/* Honeypot */}
      <input
        type="text"
        value={hp}
        onChange={e => setHp(e.target.value)}
        style={{ display: 'none' }}
        tabIndex={-1}
        autoComplete="off"
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Votre nom <span className="text-red-500">*</span></label>
          <input
            required value={name} onChange={e => setName(e.target.value)}
            className={inp} placeholder={ph('slug_contactform_1')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Votre email <span className="text-red-500">*</span></label>
          <input
            required type="email" value={email} onChange={e => setEmail(e.target.value)}
            className={inp} placeholder={ph('slug_contactform_2')}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Votre message <span className="text-red-500">*</span></label>
        <textarea
          required value={message} onChange={e => setMessage(e.target.value)}
          className={`${inp} resize-none`} rows={5}
          placeholder={ph('slug_contactform_3')}
          maxLength={2000}
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/2000</p>
      </div>
      <div className="text-center pt-2">
        <button
          type="submit" disabled={sending}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-white font-semibold text-sm shadow-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
          style={{ background: primaryColor }}
        >
          {sending ? (
            <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Envoi…</>
          ) : (
            <>✉️ Envoyer le message</>
          )}
        </button>
      </div>
    </form>
  )
}

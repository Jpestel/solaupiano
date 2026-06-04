'use client'

import { useState } from 'react'

export function NewsletterSignup({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading'); setMsg('')
    const res = await fetch('/api/newsletter/subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })
    if (res.ok) {
      setStatus('ok'); setMsg('Merci ! Vous êtes bien inscrit·e à la newsletter.'); setEmail('')
    } else {
      const d = await res.json().catch(() => ({}))
      setStatus('error'); setMsg(d.error || 'Une erreur est survenue.')
    }
  }

  const dark = variant === 'dark'

  if (status === 'ok') {
    return <p className={`text-sm font-medium ${dark ? 'text-white' : 'text-green-700'}`}>✓ {msg}</p>
  }

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 w-full max-w-md">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Votre adresse email"
        className={`flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${dark ? 'bg-white/15 text-white placeholder-white/60 border border-white/20 focus:ring-white/40' : 'border border-gray-300 focus:ring-indigo-400'}`}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${dark ? 'bg-white text-indigo-700 hover:bg-gray-100' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
      >
        {status === 'loading' ? '…' : "S'inscrire"}
      </button>
      {status === 'error' && <p className="text-xs text-red-500 self-center">{msg}</p>}
    </form>
  )
}

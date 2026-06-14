'use client'

import { useState } from 'react'

export function BlogLikeShare({ postId, initialCount, initialLiked, loggedIn, url, title }: {
  postId: number
  initialCount: number
  initialLiked: boolean
  loggedIn: boolean
  url: string
  title: string
}) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState('')

  const toggleLike = async () => {
    if (!loggedIn) { setMsg('Connectez-vous pour aimer cet article.'); return }
    setBusy(true); setMsg('')
    // optimiste
    const prev = liked
    setLiked(!prev); setCount((c) => c + (prev ? -1 : 1))
    const res = await fetch(`/api/blog/${postId}/like`, { method: 'POST' })
    setBusy(false)
    if (res.ok) { const d = await res.json(); setLiked(d.liked); setCount(d.count) }
    else { setLiked(prev); setCount((c) => c + (prev ? 1 : -1)) }
  }

  const u = encodeURIComponent(url)
  const t = encodeURIComponent(title)
  const shares = [
    { label: 'Facebook', icon: 'f', cls: 'bg-[#1877f2]', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { label: 'X', icon: '𝕏', cls: 'bg-black', href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { label: 'WhatsApp', icon: '🟢', cls: 'bg-[#25d366]', href: `https://wa.me/?text=${t}%20${u}` },
    { label: 'LinkedIn', icon: 'in', cls: 'bg-[#0a66c2]', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
  ]

  const nativeShare = async () => {
    if (navigator.share) { try { await navigator.share({ title, url }) } catch { /* annulé */ } }
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* Like */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleLike}
          disabled={busy}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-colors disabled:opacity-60 ${liked ? 'bg-rose-600 text-white hover:bg-rose-500' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
        >
          <span className="text-base">{liked ? '❤️' : '🤍'}</span>
          J’aime · {count}
        </button>
        {msg && <span className="text-xs text-gray-500">{msg} <a href="/connexion" className="text-indigo-600 underline">Se connecter</a></span>}
      </div>

      {/* Partage */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-400 mr-1">Partager</span>
        {shares.map((s) => (
          <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" title={`Partager sur ${s.label}`}
            className={`w-9 h-9 rounded-full text-white flex items-center justify-center text-sm font-bold hover:opacity-90 ${s.cls}`}>
            {s.icon}
          </a>
        ))}
        <button onClick={copy} title="Copier le lien" className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center text-sm">{copied ? '✓' : '🔗'}</button>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button onClick={nativeShare} title="Partager…" className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center text-sm">⤴</button>
        )}
      </div>
    </div>
  )
}

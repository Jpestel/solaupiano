'use client'

import { useState, useEffect } from 'react'

interface Newsletter {
  id: number
  subject: string
  status: string
  sentAt: string | null
  recipientCount: number
  createdAt: string
}

export default function AdminNewsletterPage() {
  const [activeCount, setActiveCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const res = await fetch('/api/admin/newsletter')
    if (res.ok) {
      const d = await res.json()
      setActiveCount(d.activeCount); setTotalCount(d.totalCount); setNewsletters(d.newsletters)
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const submit = async (send: boolean) => {
    if (!subject.trim() || !content.trim()) { setMsg('Sujet et contenu requis.'); return }
    if (send && !confirm(`Envoyer cette newsletter à ${activeCount} abonné${activeCount > 1 ? 's' : ''} ?`)) return
    setBusy(true); setMsg('')
    const res = await fetch('/api/admin/newsletter', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, content, send }),
    })
    setBusy(false)
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setMsg(d.error || 'Erreur.'); return }
    setMsg(send ? `✓ Envoyée à ${d.sent} abonné(s).` : '✓ Brouillon enregistré.')
    setSubject(''); setContent(''); load()
  }

  if (loading) return <div className="text-gray-500">Chargement...</div>

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Newsletter</h1>
        <p className="text-gray-500 mt-1">
          <strong className="text-gray-700">{activeCount}</strong> abonné{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}
          {totalCount > activeCount && <span className="text-gray-400"> · {totalCount - activeCount} désinscrit{totalCount - activeCount > 1 ? 's' : ''}</span>}
        </p>
      </div>

      {/* Composer */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <h3 className="font-semibold text-gray-900">Composer une newsletter</h3>
        {msg && <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-sm text-indigo-700">{msg}</div>}
        <div>
          <label className="form-label">Sujet</label>
          <input className="form-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="ex : Les nouveautés de l'été 🎶" />
        </div>
        <div>
          <label className="form-label">Contenu</label>
          <textarea className="form-input font-mono text-sm" rows={12} value={content} onChange={(e) => setContent(e.target.value)} placeholder={"Écrivez votre message…\n\nLes retours à la ligne sont conservés. Vous pouvez aussi coller du HTML."} />
          <p className="text-xs text-gray-400 mt-1">En-tête, pied de page et lien de désinscription sont ajoutés automatiquement à chaque email.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => submit(true)} disabled={busy} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
            {busy ? 'Envoi…' : `Envoyer à ${activeCount} abonné${activeCount > 1 ? 's' : ''}`}
          </button>
          <button onClick={() => submit(false)} disabled={busy} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60">
            Enregistrer en brouillon
          </button>
        </div>
      </div>

      {/* Historique */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mt-6">
        <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Historique</h3></div>
        {newsletters.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Aucune newsletter pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {newsletters.map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{n.subject}</p>
                  <p className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                {n.status === 'SENT'
                  ? <span className="text-[10px] font-medium rounded-full bg-green-50 text-green-700 px-2 py-0.5 shrink-0">✓ Envoyée · {n.recipientCount}</span>
                  : <span className="text-[10px] font-medium rounded-full bg-gray-100 text-gray-500 px-2 py-0.5 shrink-0">Brouillon</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

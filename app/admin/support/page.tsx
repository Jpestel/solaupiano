'use client'

import { useState, useEffect } from 'react'
import { ph } from '@/lib/placeholders'

type TicketStatus   = 'OPEN' | 'IN_PROGRESS' | 'CLOSED'
type TicketCategory = 'BUG' | 'QUESTION' | 'FEATURE' | 'OTHER'

interface Ticket {
  id: number
  userId: number
  userName: string
  userEmail: string
  subject: string
  message: string
  category: TicketCategory
  status: TicketStatus
  isPriority: boolean
  adminNote: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; dot: string }> = {
  OPEN:        { label: 'Ouvert',   color: 'bg-blue-50 text-blue-700 border-blue-200',    dot: 'bg-blue-500' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  CLOSED:      { label: 'Résolu',   color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  BUG: '🐛 Bug', QUESTION: '❓ Question', FEATURE: '💡 Suggestion', OTHER: '📩 Autre',
}

export default function AdminSupportPage() {
  const [tickets, setTickets]         = useState<Ticket[]>([])
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState<TicketStatus | 'ALL'>('ALL')
  const [activeId, setActiveId]       = useState<number | null>(null)
  const [noteInput, setNoteInput]     = useState('')
  const [saving, setSaving]           = useState(false)

  useEffect(() => { fetchTickets() }, [])

  async function fetchTickets() {
    setLoading(true)
    const url = filter === 'ALL' ? '/api/admin/support' : `/api/admin/support?status=${filter}`
    const res = await fetch(url)
    if (res.ok) setTickets((await res.json()).tickets)
    setLoading(false)
  }

  // Re-fetch on filter change
  useEffect(() => { fetchTickets() }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function updateTicket(id: number, data: Partial<{ status: TicketStatus; adminNote: string }>) {
    setSaving(true)
    const res = await fetch(`/api/admin/support/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = (await res.json()).ticket
      setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t))
    }
    setSaving(false)
  }

  async function deleteTicket(id: number) {
    if (!confirm('Supprimer ce ticket définitivement ?')) return
    const res = await fetch(`/api/admin/support/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTickets(prev => prev.filter(t => t.id !== id))
      if (activeId === id) setActiveId(null)
    }
  }

  function openTicket(t: Ticket) {
    setActiveId(t.id)
    setNoteInput(t.adminNote ?? '')
  }

  const active = tickets.find(t => t.id === activeId) ?? null
  const counts = {
    ALL:         tickets.length,
    OPEN:        tickets.filter(t => t.status === 'OPEN').length,
    IN_PROGRESS: tickets.filter(t => t.status === 'IN_PROGRESS').length,
    CLOSED:      tickets.filter(t => t.status === 'CLOSED').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support</h1>
          <p className="text-gray-500 mt-1">Demandes et signalements des utilisateurs.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-700 px-2.5 py-1 font-semibold text-xs">
            {counts.OPEN + counts.IN_PROGRESS} actif{counts.OPEN + counts.IN_PROGRESS !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {(['ALL', 'OPEN', 'IN_PROGRESS', 'CLOSED'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors border ${
              filter === s
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}>
            {s === 'ALL' ? 'Tous' : STATUS_CONFIG[s].label}
            <span className="ml-1.5 text-xs opacity-70">
              {s === 'ALL' ? counts.ALL : s === 'OPEN' ? counts.OPEN : s === 'IN_PROGRESS' ? counts.IN_PROGRESS : counts.CLOSED}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Liste */}
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>
          ) : tickets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-sm text-gray-500">Aucun ticket</p>
            </div>
          ) : tickets.map(t => {
            const st = STATUS_CONFIG[t.status]
            const date = new Date(t.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
            return (
              <button key={t.id} onClick={() => openTicket(t)}
                className={`w-full text-left rounded-xl border p-3.5 transition-colors ${
                  activeId === t.id
                    ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${st.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                      {t.isPriority && <span className="text-xs text-amber-600 font-semibold">⭐</span>}
                      <span className="text-xs text-gray-400">{CATEGORY_LABELS[t.category]}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 truncate">{t.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t.userName} · #{t.id} · {date}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Détail */}
        <div className="lg:col-span-3">
          {!active ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center h-48">
              <p className="text-sm text-gray-400">Sélectionnez un ticket pour le gérer</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              {/* En-tête */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_CONFIG[active.status].color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[active.status].dot}`} />
                      {STATUS_CONFIG[active.status].label}
                    </span>
                    <span className="text-xs text-gray-400">{CATEGORY_LABELS[active.category]}</span>
                    {active.isPriority && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 font-semibold">⭐ Prioritaire</span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-gray-900">{active.subject}</h2>
                </div>
                <button onClick={() => deleteTicket(active.id)}
                  className="flex-shrink-0 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 px-2.5 py-1.5 text-xs font-medium transition-colors">
                  Supprimer
                </button>
              </div>

              {/* Infos utilisateur */}
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600 flex items-center gap-4 flex-wrap">
                <span>👤 <strong>{active.userName}</strong></span>
                <a href={`mailto:${active.userEmail}`} className="text-indigo-600 hover:underline">{active.userEmail}</a>
                <span className="text-gray-400">#{active.id} · {new Date(active.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              {/* Message */}
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{active.message}</p>
              </div>

              {/* Changer le statut */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Changer le statut</p>
                <div className="flex gap-2 flex-wrap">
                  {(['OPEN', 'IN_PROGRESS', 'CLOSED'] as TicketStatus[]).map(s => (
                    <button key={s} disabled={active.status === s || saving}
                      onClick={() => updateTicket(active.id, { status: s })}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
                        active.status === s
                          ? `${STATUS_CONFIG[s].color} cursor-default`
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                      }`}>
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note admin */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                  Réponse à l&apos;utilisateur
                  <span className="ml-1 text-gray-400 normal-case font-normal">(visible sur sa page Assistance + envoyée par e-mail)</span>
                </label>
                <textarea
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  rows={3}
                  placeholder={ph('admin_support_1')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    disabled={saving || noteInput === (active.adminNote ?? '')}
                    onClick={() => updateTicket(active.id, { adminNote: noteInput })}
                    className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                    {saving ? 'Envoi…' : '✉️ Envoyer la réponse'}
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}

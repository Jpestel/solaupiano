'use client'

import { useState, useEffect } from 'react'
import { ph } from '@/lib/placeholders'

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED'
type TicketCategory = 'BUG' | 'QUESTION' | 'FEATURE' | 'OTHER'

interface Ticket {
  id: number
  subject: string
  message: string
  category: TicketCategory
  status: TicketStatus
  isPriority: boolean
  adminNote: string | null
  createdAt: string
}

const CATEGORIES: { value: TicketCategory; label: string; icon: string; description: string }[] = [
  { value: 'BUG',      label: 'Bug / Problème',        icon: '🐛', description: 'Quelque chose ne fonctionne pas correctement' },
  { value: 'QUESTION', label: 'Question',               icon: '❓', description: 'Besoin d\'aide pour utiliser une fonctionnalité' },
  { value: 'FEATURE',  label: 'Suggestion',             icon: '💡', description: 'Idée d\'amélioration ou nouvelle fonctionnalité' },
  { value: 'OTHER',    label: 'Autre',                  icon: '📩', description: 'Toute autre demande' },
]

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; dot: string }> = {
  OPEN:        { label: 'Ouvert',       color: 'bg-blue-50 text-blue-700 border-blue-200',    dot: 'bg-blue-500' },
  IN_PROGRESS: { label: 'En cours',     color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  CLOSED:      { label: 'Résolu',       color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  BUG: '🐛 Bug', QUESTION: '❓ Question', FEATURE: '💡 Suggestion', OTHER: '📩 Autre',
}

export default function AssistancePage() {
  const [tickets, setTickets]         = useState<Ticket[]>([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [category, setCategory]       = useState<TicketCategory>('BUG')
  const [subject, setSubject]         = useState('')
  const [message, setMessage]         = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [success, setSuccess]         = useState(false)
  const [error, setError]             = useState('')
  const [expandedId, setExpandedId]   = useState<number | null>(null)

  useEffect(() => { fetchTickets() }, [])

  async function fetchTickets() {
    setLoading(true)
    const res = await fetch('/api/support')
    if (res.ok) {
      const data = await res.json()
      setTickets(data.tickets)
    }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) { setError('Veuillez remplir tous les champs.'); return }
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, message, category }),
    })
    if (res.ok) {
      setSuccess(true)
      setSubject('')
      setMessage('')
      setCategory('BUG')
      setShowForm(false)
      fetchTickets()
    } else {
      setError('Une erreur s\'est produite. Réessayez.')
    }
    setSubmitting(false)
  }

  const openCount = tickets.filter(t => t.status !== 'CLOSED').length

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assistance</h1>
          <p className="text-gray-500 mt-1">Signalez un bug, posez une question ou proposez une amélioration.</p>
        </div>
        {!showForm && (
          <button onClick={() => { setShowForm(true); setSuccess(false) }}
            className="flex-shrink-0 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle demande
          </button>
        )}
      </div>

      {/* Confirmation */}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-green-800">Demande envoyée !</p>
            <p className="text-sm text-green-700 mt-0.5">Nous avons bien reçu votre message. Un email de confirmation vous a été envoyé. Nous vous répondrons dans les meilleurs délais.</p>
          </div>
        </div>
      )}

      {/* Formulaire */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">Nouvelle demande</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Catégorie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de demande</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(c => (
                  <button key={c.value} type="button"
                    onClick={() => setCategory(c.value)}
                    className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors ${
                      category === c.value
                        ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    <span className="text-xl leading-none mt-0.5">{c.icon}</span>
                    <div>
                      <p className={`text-sm font-semibold ${category === c.value ? 'text-indigo-700' : 'text-gray-800'}`}>{c.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sujet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sujet <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder={ph('assistance_1')}
                maxLength={120}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-colors"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Message <span className="text-red-500">*</span></label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={category === 'BUG'
                  ? ph('assistance_msg_bug')
                  : category === 'FEATURE'
                  ? ph('assistance_msg_feature')
                  : ph('assistance_msg_other')}
                rows={5}
                maxLength={2000}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-colors resize-none"
              />
              <p className="text-right text-xs text-gray-400 mt-1">{message.length}/2000</p>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={submitting}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors">
                {submitting ? 'Envoi…' : 'Envoyer la demande'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des tickets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">
            Mes demandes {openCount > 0 && <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">{openCount}</span>}
          </h2>
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">Chargement…</div>
        ) : tickets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
            <p className="text-3xl mb-2">📬</p>
            <p className="text-sm font-medium text-gray-600">Aucune demande pour l&apos;instant</p>
            <p className="text-xs text-gray-400 mt-1">Cliquez sur &laquo; Nouvelle demande &raquo; pour nous contacter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(ticket => {
              const st = STATUS_CONFIG[ticket.status]
              const isExpanded = expandedId === ticket.id
              const date = new Date(ticket.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
              return (
                <div key={ticket.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <button
                    className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                        <span className="text-xs text-gray-400">{CATEGORY_LABELS[ticket.category]}</span>
                        {ticket.isPriority && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 font-medium">⭐ Prioritaire</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900 truncate">{ticket.subject}</p>
                      <p className="text-xs text-gray-400 mt-0.5">#{ticket.id} · {date}</p>
                    </div>
                    <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap mt-3">{ticket.message}</p>
                      {ticket.adminNote && (
                        <div className="mt-3 rounded-lg bg-indigo-50 border border-indigo-200 p-3">
                          <p className="text-xs font-semibold text-indigo-700 mb-1">💬 Réponse de l&apos;équipe</p>
                          <p className="text-sm text-indigo-900 whitespace-pre-wrap">{ticket.adminNote}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Info support prioritaire */}
      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 flex items-start gap-3">
        <span className="text-xl">⭐</span>
        <div>
          <p className="text-sm font-semibold text-amber-800">Support prioritaire</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Les membres d&apos;un groupe avec un plan payant bénéficient d&apos;un traitement prioritaire. Consultez la{' '}
            <a href="/tarifs" className="underline hover:no-underline">page Tarifs</a> pour en savoir plus.
          </p>
        </div>
      </div>
    </div>
  )
}

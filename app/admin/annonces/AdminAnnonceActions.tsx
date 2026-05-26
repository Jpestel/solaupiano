'use client'

import { useState } from 'react'

export function AdminAnnonceActions({ id, status }: { id: number; status: string }) {
  const [showRefuseModal, setShowRefuseModal] = useState(false)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const patch = async (newStatus: string, adminComment?: string) => {
    await fetch(`/api/annonces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        ...(adminComment !== undefined && { adminComment }),
      }),
    })
    window.location.reload()
  }

  const approve = async () => {
    setSaving(true)
    await patch('ACTIVE', '')  // efface l'éventuel commentaire précédent
  }

  const refuse = async () => {
    setSaving(true)
    await patch('MASQUEE', comment)
    setShowRefuseModal(false)
  }

  const del = async () => {
    if (!confirm('Supprimer définitivement ?')) return
    await fetch(`/api/annonces/${id}`, { method: 'DELETE' })
    window.location.reload()
  }

  return (
    <>
      <div className="flex items-center gap-1 justify-end flex-wrap">
        {status === 'PENDING' && (
          <button
            onClick={approve}
            disabled={saving}
            className="rounded px-2 py-1 text-xs font-semibold border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
          >
            ✓ Approuver
          </button>
        )}
        {status === 'PENDING' && (
          <button
            onClick={() => setShowRefuseModal(true)}
            disabled={saving}
            className="rounded px-2 py-1 text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            ✕ Refuser
          </button>
        )}
        {status === 'ACTIVE' && (
          <button
            onClick={() => setShowRefuseModal(true)}
            disabled={saving}
            className="rounded px-2 py-1 text-xs font-medium border border-orange-200 text-orange-600 hover:bg-orange-50 disabled:opacity-50 transition-colors"
          >
            Masquer
          </button>
        )}
        {status === 'MASQUEE' && (
          <button onClick={approve} disabled={saving} className="rounded px-2 py-1 text-xs font-medium border border-green-200 text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors">
            Réactiver
          </button>
        )}
        <button onClick={del} className="rounded px-2 py-1 text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
          Supprimer
        </button>
      </div>

      {/* Modale refus avec commentaire */}
      {showRefuseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {status === 'ACTIVE' ? 'Masquer l\'annonce' : 'Refuser l\'annonce'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Vous pouvez laisser un commentaire au membre pour expliquer votre décision (optionnel).
            </p>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              placeholder="Ex : Annonce trop vague, merci de préciser la marque et l'état du matériel…"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRefuseModal(false); setComment('') }}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={refuse}
                disabled={saving}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {saving ? '…' : status === 'ACTIVE' ? 'Masquer' : 'Refuser'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

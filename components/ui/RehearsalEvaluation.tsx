'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export function StarRating({ value, onChange, readOnly, size = 26 }: {
  value: number; onChange?: (n: number) => void; readOnly?: boolean; size?: number
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          className={readOnly ? 'cursor-default leading-none' : 'cursor-pointer leading-none hover:scale-110 transition-transform'}
          aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
        >
          <span style={{ fontSize: size }} className={n <= value ? 'text-amber-400' : 'text-gray-300'}>★</span>
        </button>
      ))}
    </span>
  )
}

interface EvalData {
  canEvaluate: boolean
  presentMembers: { userId: number; name: string }[]
  plannedSongs: { songId: number; title: string; artist: string | null }[]
  myEvaluation: { selfRating: number; groupRating: number; suggestion: string | null; memberRatings: Record<string, number>; songRatings: Record<string, number> } | null
}

export function EvaluationModal({ rehearsalId, title, onClose, onSaved }: {
  rehearsalId: number; title: string; onClose: () => void; onSaved: () => void
}) {
  const { data: session } = useSession()
  const myId = Number(session?.user?.id)
  const [data, setData] = useState<EvalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [self, setSelf] = useState(0)
  const [group, setGroup] = useState(0)
  const [ratings, setRatings] = useState<Record<number, number>>({})
  const [songRatings, setSongRatings] = useState<Record<number, number>>({})
  const [suggestion, setSuggestion] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/repetitions/${rehearsalId}/evaluation`).then(async (r) => {
      if (r.ok) {
        const d: EvalData = await r.json()
        setData(d)
        if (d.myEvaluation) {
          setSelf(d.myEvaluation.selfRating)
          setGroup(d.myEvaluation.groupRating)
          setSuggestion(d.myEvaluation.suggestion || '')
          setRatings(Object.fromEntries(Object.entries(d.myEvaluation.memberRatings).map(([k, v]) => [Number(k), v])))
          setSongRatings(Object.fromEntries(Object.entries(d.myEvaluation.songRatings || {}).map(([k, v]) => [Number(k), v])))
        }
      }
      setLoading(false)
    })
  }, [rehearsalId])

  const others = (data?.presentMembers || []).filter((m) => m.userId !== myId)
  const ready = self > 0 && group > 0

  const save = async () => {
    if (!ready) { setError('Notez au moins votre performance et celle du groupe.'); return }
    setSaving(true); setError('')
    const res = await fetch(`/api/repetitions/${rehearsalId}/evaluation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selfRating: self, groupRating: group, suggestion,
        ratings: others.map((m) => ({ ratedUserId: m.userId, rating: ratings[m.userId] || 0 })).filter((r) => r.rating > 0),
        songRatings: (data?.plannedSongs || []).map((s) => ({ songId: s.songId, rating: songRatings[s.songId] || 0 })).filter((r) => r.rating > 0),
      }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Erreur.'); return }
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" style={{ backdropFilter: 'blur(2px)' }} onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">⭐ Évaluer la répétition</h2>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">{title}</p>
        </div>

        {loading ? (
          <p className="p-6 text-gray-500">Chargement…</p>
        ) : !data?.canEvaluate ? (
          <p className="p-6 text-gray-500">Vous ne pouvez pas évaluer cette répétition (réservé aux musiciens présents, une fois la répétition terminée).</p>
        ) : (
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-gray-700">Ma performance</span>
              <StarRating value={self} onChange={setSelf} />
            </div>

            {others.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Les autres musiciens</p>
                <div className="space-y-2">
                  {others.map((m) => (
                    <div key={m.userId} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-600 truncate">{m.name}</span>
                      <StarRating value={ratings[m.userId] || 0} onChange={(n) => setRatings((r) => ({ ...r, [m.userId]: n }))} size={22} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(data?.plannedSongs || []).length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Les morceaux travaillés</p>
                <div className="space-y-2">
                  {data!.plannedSongs.map((s) => (
                    <div key={s.songId} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-600 truncate">
                        {s.title}{s.artist ? <span className="text-gray-400"> — {s.artist}</span> : null}
                      </span>
                      <StarRating value={songRatings[s.songId] || 0} onChange={(n) => setSongRatings((r) => ({ ...r, [s.songId]: n }))} size={22} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <span className="text-sm font-semibold text-gray-700">Performance du groupe</span>
              <StarRating value={group} onChange={setGroup} />
            </div>

            <div className="border-t border-gray-100 pt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Suggestions pour la prochaine répétition <span className="text-gray-400 font-normal">(facultatif)</span></label>
              <textarea value={suggestion} onChange={(e) => setSuggestion(e.target.value)} rows={3} maxLength={1000}
                placeholder="ex : retravailler le pont de tel morceau, arriver à l'heure…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button onClick={save} disabled={saving || !ready}
                className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2.5 disabled:opacity-50">
                {saving ? 'Enregistrement…' : 'Valider mon évaluation'}
              </button>
              <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

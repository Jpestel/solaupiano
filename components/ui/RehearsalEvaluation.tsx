'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export function PresencePicker({ value, onSet }: { value: string | null | undefined; onSet: (s: string) => void }) {
  const opts = [
    { v: 'PRESENT', icon: '✅', label: 'Présent', on: 'bg-green-100 text-green-700 border-green-300' },
    { v: 'INCERTAIN', icon: '❓', label: 'Incertain', on: 'bg-amber-100 text-amber-700 border-amber-300' },
    { v: 'ABSENT', icon: '⛔', label: 'Absent', on: 'bg-red-100 text-red-700 border-red-300' },
  ]
  return (
    <span className="inline-flex gap-1">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSet(o.v) }}
          className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${value === o.v ? o.on : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
        >
          {o.icon}<span className="hidden sm:inline ml-1">{o.label}</span>
        </button>
      ))}
    </span>
  )
}

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

export function EvaluationModal({ endpoint, title, onClose, onSaved }: {
  endpoint: string; title: string; onClose: () => void; onSaved: () => void
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
    fetch(endpoint).then(async (r) => {
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
  }, [endpoint])

  const others = (data?.presentMembers || []).filter((m) => m.userId !== myId)
  const ready = self > 0 && group > 0

  const save = async () => {
    if (!ready) { setError('Notez au moins votre performance et celle du groupe.'); return }
    setSaving(true); setError('')
    const res = await fetch(endpoint, {
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
              <div className="min-w-0">
                <span className="text-sm font-semibold text-gray-700">Ma performance</span>
                <p className="text-xs text-gray-400 mt-0.5">Comment jugez-vous votre propre jeu durant cette répétition ?</p>
              </div>
              <StarRating value={self} onChange={setSelf} />
            </div>

            {others.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-gray-700">Les autres musiciens</p>
                <p className="text-xs text-gray-400 mb-2">Notez la prestation de chaque musicien présent (bienveillance &amp; constructif).</p>
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
                <p className="text-sm font-semibold text-gray-700">Les morceaux travaillés</p>
                <p className="text-xs text-gray-400 mb-2">Pour chaque morceau : son niveau de maîtrise / son rendu pendant la répétition.</p>
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
              <div className="min-w-0">
                <span className="text-sm font-semibold text-gray-700">Performance du groupe</span>
                <p className="text-xs text-gray-400 mt-0.5">L'ensemble : cohésion, énergie, rendu global du groupe.</p>
              </div>
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

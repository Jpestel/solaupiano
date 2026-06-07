'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ph } from '@/lib/placeholders'

interface PollRow {
  id: number
  title: string
  description: string | null
  closed: boolean
  createdAt: string
  optionCount: number
  voteCount: number
}

export default function SondagesPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const groupId = params.id

  const [polls, setPolls] = useState<PollRow[]>([])
  const [groupName, setGroupName] = useState('')
  const [isChef, setIsChef] = useState(false)
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [options, setOptions] = useState<{ date: string; note: string }[]>([{ date: '', note: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!session) return
    const [pRes, gRes] = await Promise.all([
      fetch(`/api/groupes/${groupId}/sondages`),
      fetch(`/api/groupes/${groupId}`),
    ])
    if (pRes.ok) setPolls(await pRes.json())
    if (gRes.ok) {
      const g = await gRes.json()
      setGroupName(g.name || '')
      const me = g.members?.find((m: any) => m.userId === Number(session.user.id))
      setIsChef(session.user.siteRole === 'ADMIN' || me?.groupRole === 'CHEF')
    }
    setLoading(false)
  }, [session, groupId])
  useEffect(() => { load() }, [load])

  const addOption = () => setOptions((o) => [...o, { date: '', note: '' }])
  const removeOption = (i: number) => setOptions((o) => o.filter((_, idx) => idx !== i))
  const setOpt = (i: number, k: 'date' | 'note', v: string) => setOptions((o) => o.map((x, idx) => idx === i ? { ...x, [k]: v } : x))

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    const valid = options.filter((o) => o.date)
    if (!title.trim()) { setError('Le titre est requis.'); return }
    if (valid.length === 0) { setError('Ajoutez au moins une date.'); return }
    setSaving(true); setError('')
    const res = await fetch(`/api/groupes/${groupId}/sondages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, options: valid }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Erreur.'); return }
    setOpen(false); setTitle(''); setDescription(''); setOptions([{ date: '', note: '' }])
    load()
  }

  if (loading) return <div className="text-gray-500 p-6">Chargement...</div>

  const open_ = polls.filter((p) => !p.closed)
  const closed = polls.filter((p) => p.closed)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 mb-2">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600 truncate max-w-[160px]">{groupName}</Link>
        <span>/</span><span className="text-gray-900">Sondages</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">📊 Sondages</h1>
          <p className="text-sm text-gray-500 mt-1">Proposez plusieurs dates, chaque membre indique s&apos;il est présent, absent ou incertain.</p>
        </div>
        {isChef && (
          <button onClick={() => setOpen(true)} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2">
            ➕ Nouveau sondage
          </button>
        )}
      </div>

      {polls.length === 0 ? (
        <div className="text-center py-16 text-gray-400 rounded-xl border border-dashed border-gray-200">
          <p className="text-4xl mb-2">📊</p>
          <p className="font-medium text-gray-500">Aucun sondage pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...open_, ...closed].map((p) => (
            <Link key={p.id} href={`/groupes/${groupId}/sondages/${p.id}`}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:border-indigo-300 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{p.title}</span>
                  {p.closed && <span className="text-[11px] rounded-full bg-gray-100 text-gray-500 px-2 py-0.5">clôturé</span>}
                </div>
                {p.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{p.description}</p>}
                <p className="text-[11px] text-gray-400 mt-1">{p.optionCount} date{p.optionCount > 1 ? 's' : ''} · {p.voteCount} réponse{p.voteCount > 1 ? 's' : ''}</p>
              </div>
              <span className="text-indigo-400">→</span>
            </Link>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={create}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto p-5 space-y-3">
            <h2 className="text-lg font-bold text-gray-900">Nouveau sondage</h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Titre *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={ph('groupes_id_sondages_1')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description (optionnel)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dates proposées *</label>
              <div className="space-y-2">
                {options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="date" value={o.date} onChange={(e) => setOpt(i, 'date', e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
                    <input value={o.note} onChange={(e) => setOpt(i, 'note', e.target.value)} placeholder={ph('groupes_id_sondages_2')} className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
                    {options.length > 1 && <button type="button" onClick={() => removeOption(i)} className="text-red-400 hover:text-red-600 text-lg px-1">×</button>}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addOption} className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-800">+ Ajouter une date</button>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2 disabled:opacity-50">
                {saving ? 'Création…' : 'Créer le sondage'}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

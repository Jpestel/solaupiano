'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ph } from '@/lib/placeholders'

interface Unav {
  id: number
  userId: number
  startDate: string
  endDate: string
  note: string | null
  user: { id: number; name: string }
}
interface Member { userId: number; name: string }

const ymd = (iso: string) => iso.slice(0, 10) // 'YYYY-MM-DD'
function fmt(iso: string) {
  const [y, m, d] = ymd(iso).split('-')
  return `${d}/${m}/${y}`
}
function fmtRange(s: string, e: string) {
  return ymd(s) === ymd(e) ? fmt(s) : `du ${fmt(s)} au ${fmt(e)}`
}
const covers = (u: Unav, dayKey: string) => ymd(u.startDate) <= dayKey && dayKey <= ymd(u.endDate)

export default function DisponibilitesPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const groupId = params.id

  const [items, setItems] = useState<Unav[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [groupName, setGroupName] = useState('')
  const [isChef, setIsChef] = useState(false)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({ startDate: '', endDate: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [checkDate, setCheckDate] = useState('')

  const myId = Number(session?.user?.id)

  const load = useCallback(async () => {
    if (!session) return
    const [uRes, gRes] = await Promise.all([
      fetch(`/api/groupes/${groupId}/indisponibilites`),
      fetch(`/api/groupes/${groupId}`),
    ])
    if (uRes.ok) setItems(await uRes.json())
    if (gRes.ok) {
      const g = await gRes.json()
      setGroupName(g.name || '')
      setMembers((g.members || []).map((m: any) => ({ userId: m.userId, name: m.user?.name || 'Membre' })))
      const me = g.members?.find((m: any) => m.userId === myId)
      setIsChef(session.user.siteRole === 'ADMIN' || me?.groupRole === 'CHEF')
    }
    setLoading(false)
  }, [session, groupId, myId])

  useEffect(() => { load() }, [load])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.startDate) { setError('Indiquez au moins une date.'); return }
    setSaving(true); setError('')
    const res = await fetch(`/api/groupes/${groupId}/indisponibilites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Erreur.'); return }
    setForm({ startDate: '', endDate: '', note: '' })
    load()
  }

  const del = async (id: number) => {
    if (!confirm('Supprimer cette indisponibilité ?')) return
    await fetch(`/api/groupes/${groupId}/indisponibilites/${id}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <div className="text-gray-500 p-6">Chargement...</div>

  const mine = items.filter((u) => u.userId === myId)
  const now = ymd(new Date().toISOString())
  const upcoming = items.filter((u) => ymd(u.endDate) >= now)

  // Vérification d'une date
  const checkKey = checkDate ? checkDate : ''
  const unavailableThatDay = checkKey ? items.filter((u) => covers(u, checkKey)) : []
  const unavailableIds = new Set(unavailableThatDay.map((u) => u.userId))
  const availableMembers = members.filter((m) => !unavailableIds.has(m.userId))

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 mb-2">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600 truncate max-w-[160px]">{groupName}</Link>
        <span>/</span>
        <span className="text-gray-900">Disponibilités</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">🗓 Disponibilités</h1>
        <p className="text-sm text-gray-500 mt-1">
          Chaque membre indique ses dates d'<strong>indisponibilité</strong>. Le chef voit ainsi qui est disponible
          avant de planifier une répétition ou un concert.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Colonne gauche : mes indispos + ajout */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h2 className="text-sm font-bold text-gray-700 mb-3">➕ Ajouter une indisponibilité</h2>
            <form onSubmit={add} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Du</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Au (optionnel)</label>
                  <input type="date" value={form.endDate} min={form.startDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Motif (optionnel)</label>
                <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={200}
                  placeholder={ph('groupes_id_disponibilites_1')}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button type="submit" disabled={saving}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50">
                {saving ? 'Ajout…' : 'Ajouter'}
              </button>
              <p className="text-xs text-gray-400">Laissez « Au » vide pour une seule journée.</p>
            </form>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-bold text-gray-700 mb-2">Mes indisponibilités</h2>
            {mine.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune indisponibilité enregistrée.</p>
            ) : (
              <ul className="space-y-1.5">
                {mine.sort((a, b) => a.startDate.localeCompare(b.startDate)).map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-gray-700">
                      <span className="font-medium">{fmtRange(u.startDate, u.endDate)}</span>
                      {u.note && <span className="text-gray-400"> · {u.note}</span>}
                    </span>
                    <button onClick={() => del(u.id)} className="text-xs text-red-400 hover:text-red-600">Supprimer</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Colonne droite : vérif date + vue groupe */}
        <div className="space-y-4">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
            <h2 className="text-sm font-bold text-indigo-800 mb-2">🔎 Vérifier une date</h2>
            <input type="date" value={checkDate} onChange={(e) => setCheckDate(e.target.value)}
              className="w-full rounded-lg border border-indigo-200 px-3 py-2 text-sm" />
            {checkDate && (
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-green-700 mb-1">✅ Disponibles ({availableMembers.length})</p>
                  <ul className="space-y-0.5">
                    {availableMembers.map((m) => <li key={m.userId} className="text-gray-700">{m.name}</li>)}
                    {availableMembers.length === 0 && <li className="text-gray-400">Personne</li>}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-1">⛔ Indisponibles ({unavailableThatDay.length})</p>
                  <ul className="space-y-0.5">
                    {unavailableThatDay.map((u) => (
                      <li key={u.id} className="text-gray-700">{u.user.name}{u.note && <span className="text-gray-400"> ({u.note})</span>}</li>
                    ))}
                    {unavailableThatDay.length === 0 && <li className="text-gray-400">Personne</li>}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-bold text-gray-700 mb-2">Indisponibilités à venir du groupe</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune indisponibilité à venir.</p>
            ) : (
              <ul className="space-y-1.5">
                {upcoming.sort((a, b) => a.startDate.localeCompare(b.startDate)).map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-gray-700">
                      <span className="font-semibold">{u.user.name}</span> — {fmtRange(u.startDate, u.endDate)}
                      {u.note && <span className="text-gray-400"> · {u.note}</span>}
                    </span>
                    {(u.userId === myId || isChef) && (
                      <button onClick={() => del(u.id)} className="text-xs text-red-400 hover:text-red-600 flex-shrink-0">Supprimer</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

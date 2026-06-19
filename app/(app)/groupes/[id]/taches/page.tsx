'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface Member { id: number; name: string; role: string }
interface Task { id: number; label: string; details: string | null; done: boolean; assignees: { userId: number }[] }
interface TaskList {
  id: number
  title: string
  dueDate: string
  eventType: string
  tasks: Task[]
}
interface RehearsalLite { id: number; date: string; startTime: string | null; location: string }
interface ConcertLite { id: number; date: string; name: string; location: string }

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const fmtShort = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

export default function TachesPage({ params }: { params: { id: string } }) {
  const groupId = params.id
  const [isChef, setIsChef] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [lists, setLists] = useState<TaskList[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [rehearsals, setRehearsals] = useState<RehearsalLite[]>([])
  const [concerts, setConcerts] = useState<ConcertLite[]>([])
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Nouvelle liste
  const [form, setForm] = useState({ title: '', source: 'rehearsal' as 'rehearsal' | 'concert' | 'other', rehearsalId: '', concertId: '', dueDate: '' })
  const [creating, setCreating] = useState(false)

  // Ajout de tâche par liste : { [listId]: { label, assigneeIds } }
  const [taskDraft, setTaskDraft] = useState<Record<number, { label: string; assigneeIds: number[] }>>({})
  const [busy, setBusy] = useState(false)
  const [sentMsg, setSentMsg] = useState<Record<number, string>>({})

  const memberName = (id: number) => members.find((m) => m.id === id)?.name ?? '?'

  const load = async () => {
    const [tRes, gRes] = await Promise.all([
      fetch(`/api/groupes/${groupId}/taches`),
      fetch(`/api/groupes/${groupId}`),
    ])
    if (tRes.ok) {
      const d = await tRes.json()
      setIsChef(d.isChef)
      setCurrentUserId(d.currentUserId)
      setLists(d.lists)
      setMembers(d.members)
      setRehearsals(d.rehearsals)
      setConcerts(d.concerts)
    } else {
      const d = await tRes.json().catch(() => ({}))
      setError(d.error === 'MODULE_LOCKED'
        ? "Le module Tâches n'est pas disponible avec le plan actuel de ce groupe."
        : (d.error || 'Impossible de charger les tâches.'))
    }
    if (gRes.ok) { const g = await gRes.json(); setGroupName(g.name) }
    setLoading(false)
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const createList = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) { setError('Un titre est requis.'); return }
    const body: Record<string, unknown> = { title: form.title, eventType: form.source }
    if (form.source === 'rehearsal') { if (!form.rehearsalId) { setError('Choisissez une répétition.'); return } body.rehearsalId = form.rehearsalId }
    else if (form.source === 'concert') { if (!form.concertId) { setError('Choisissez un concert.'); return } body.concertId = form.concertId }
    else { if (!form.dueDate) { setError('Choisissez une date.'); return } body.dueDate = form.dueDate }
    setCreating(true)
    const res = await fetch(`/api/groupes/${groupId}/taches`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setCreating(false)
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Erreur.'); return }
    setForm({ title: '', source: 'rehearsal', rehearsalId: '', concertId: '', dueDate: '' })
    load()
  }

  const deleteList = async (listId: number) => {
    if (!confirm('Supprimer cette liste et toutes ses tâches ?')) return
    await fetch(`/api/groupes/${groupId}/taches/${listId}`, { method: 'DELETE' })
    load()
  }

  const addTask = async (listId: number) => {
    const draft = taskDraft[listId]
    if (!draft?.label.trim()) return
    setBusy(true)
    await fetch(`/api/groupes/${groupId}/taches/${listId}/taches`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: draft.label, assigneeIds: draft.assigneeIds }),
    })
    setBusy(false)
    setTaskDraft((prev) => ({ ...prev, [listId]: { label: '', assigneeIds: [] } }))
    load()
  }

  const toggleDone = async (listId: number, task: Task) => {
    // Optimiste
    setLists((prev) => prev.map((l) => l.id !== listId ? l : { ...l, tasks: l.tasks.map((t) => t.id === task.id ? { ...t, done: !t.done } : t) }))
    await fetch(`/api/groupes/${groupId}/taches/${listId}/taches/${task.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: !task.done }),
    })
  }

  const deleteTask = async (listId: number, taskId: number) => {
    await fetch(`/api/groupes/${groupId}/taches/${listId}/taches/${taskId}`, { method: 'DELETE' })
    load()
  }

  const sendEmail = async (listId: number, onlyPending: boolean) => {
    setBusy(true)
    const res = await fetch(`/api/groupes/${groupId}/taches/${listId}/envoyer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ onlyPending }),
    })
    setBusy(false)
    if (res.ok) {
      const d = await res.json()
      setSentMsg((prev) => ({ ...prev, [listId]: `✓ ${d.sent} e-mail${d.sent > 1 ? 's' : ''} envoyé${d.sent > 1 ? 's' : ''}${d.skipped ? ` (${d.skipped} ignoré·s)` : ''}` }))
      setTimeout(() => setSentMsg((prev) => ({ ...prev, [listId]: '' })), 4000)
    }
  }

  const toggleDraftAssignee = (listId: number, userId: number) => {
    setTaskDraft((prev) => {
      const cur = prev[listId] ?? { label: '', assigneeIds: [] }
      const has = cur.assigneeIds.includes(userId)
      return { ...prev, [listId]: { ...cur, assigneeIds: has ? cur.assigneeIds.filter((i) => i !== userId) : [...cur.assigneeIds, userId] } }
    })
  }

  if (loading) return <div className="text-gray-500">Chargement…</div>

  if (error && lists.length === 0 && !isChef) {
    return (
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
          <span>/</span>
          <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">{groupName || 'Groupe'}</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">Tâches</span>
        </div>
        <Card>
          <p className="text-sm text-gray-500 text-center py-8">{error}</p>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">{groupName || 'Groupe'}</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Tâches</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">✅ Tâches à préparer</h1>
      <p className="text-gray-500 mt-1 mb-6">
        Confiez des tâches (récupérer la sono, amener des pieds de micro…) à un ou plusieurs membres avant une date, et envoyez-les par e-mail.
      </p>

      {/* Création d'une liste (chef) */}
      {isChef && (
        <Card className="mb-6">
          <form onSubmit={createList} className="space-y-4">
            <p className="text-sm font-semibold text-gray-900">Nouvelle liste de tâches</p>
            {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{error}</div>}
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Titre, ex. Concert salle des fêtes — logistique"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <div className="flex flex-wrap items-center gap-2">
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as typeof form.source })}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="rehearsal">Avant une répétition</option>
                <option value="concert">Avant un concert</option>
                <option value="other">Avant une autre date</option>
              </select>
              {form.source === 'rehearsal' && (
                <select value={form.rehearsalId} onChange={(e) => setForm({ ...form, rehearsalId: e.target.value })}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 max-w-xs">
                  <option value="">— choisir une répétition —</option>
                  {rehearsals.map((r) => <option key={r.id} value={r.id}>{fmtDate(r.date)}{r.startTime ? ` · ${r.startTime}` : ''} — {r.location}</option>)}
                </select>
              )}
              {form.source === 'concert' && (
                <select value={form.concertId} onChange={(e) => setForm({ ...form, concertId: e.target.value })}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 max-w-xs">
                  <option value="">— choisir un concert —</option>
                  {concerts.map((c) => <option key={c.id} value={c.id}>{fmtDate(c.date)} — {c.name}</option>)}
                </select>
              )}
              {form.source === 'other' && (
                <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              )}
              <Button type="submit" disabled={creating}>{creating ? 'Création…' : 'Créer la liste'}</Button>
            </div>
            {rehearsals.length === 0 && concerts.length === 0 && form.source !== 'other' && (
              <p className="text-xs text-gray-400">Aucune date à venir — choisissez « Avant une autre date » pour saisir une date libre.</p>
            )}
          </form>
        </Card>
      )}

      {/* Listes */}
      {lists.length === 0 ? (
        <Card><p className="text-sm text-gray-500 text-center py-8">Aucune liste de tâches pour l&apos;instant.</p></Card>
      ) : (
        <div className="space-y-5">
          {lists.map((list) => {
            const total = list.tasks.length
            const doneCount = list.tasks.filter((t) => t.done).length
            const draft = taskDraft[list.id] ?? { label: '', assigneeIds: [] }
            return (
              <Card key={list.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-gray-900">{list.title}</h2>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">⏳ avant le {fmtDate(list.dueDate)}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${doneCount === total && total > 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {doneCount}/{total} fait{doneCount > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-2">
                  {list.tasks.map((task) => {
                    const mine = currentUserId !== null && task.assignees.some((a) => a.userId === currentUserId)
                    const canCheck = isChef || mine
                    return (
                      <div key={task.id} className={`flex items-start gap-3 rounded-xl border p-3 ${task.done ? 'border-green-200 bg-green-50/40' : 'border-gray-200 bg-white'}`}>
                        <button
                          type="button"
                          onClick={() => canCheck && toggleDone(list.id, task)}
                          disabled={!canCheck}
                          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 ${task.done ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300'} ${canCheck ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                          aria-label={task.done ? 'Marquer non fait' : 'Marquer fait'}
                          title={canCheck ? '' : 'Seuls le chef et les membres assignés peuvent cocher'}
                        >
                          {task.done && <span className="text-xs">✓</span>}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${task.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.label}</p>
                          {task.details && <p className="text-xs text-gray-500 mt-0.5">{task.details}</p>}
                          <div className="mt-1 flex flex-wrap gap-1">
                            {task.assignees.length === 0 ? (
                              <span className="text-[11px] text-gray-400">Non assignée</span>
                            ) : task.assignees.map((a) => (
                              <span key={a.userId} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${a.userId === currentUserId ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700'}`}>
                                {memberName(a.userId)}
                              </span>
                            ))}
                          </div>
                        </div>
                        {isChef && (
                          <button onClick={() => deleteTask(list.id, task.id)} className="text-gray-300 hover:text-red-500 text-sm" aria-label="Supprimer">✕</button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Ajout d'une tâche (chef) */}
                {isChef && (
                  <div className="mt-3 rounded-xl border border-dashed border-gray-300 p-3">
                    <input
                      value={draft.label}
                      onChange={(e) => setTaskDraft((prev) => ({ ...prev, [list.id]: { ...draft, label: e.target.value } }))}
                      placeholder="Nouvelle tâche, ex. Récupérer la sono chez Paul"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTask(list.id) } }}
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-gray-500 mr-1">Assigner à :</span>
                      {members.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleDraftAssignee(list.id, m.id)}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${draft.assigneeIds.includes(m.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button type="button" onClick={() => addTask(list.id)} disabled={busy || !draft.label.trim()}>+ Ajouter la tâche</Button>
                    </div>
                  </div>
                )}

                {/* Actions liste (chef) */}
                {isChef && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
                    <Button type="button" variant="secondary" onClick={() => sendEmail(list.id, false)} disabled={busy}>✉️ Envoyer aux membres</Button>
                    <button onClick={() => sendEmail(list.id, true)} disabled={busy} className="text-xs font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50">Relancer seulement les tâches non faites</button>
                    {sentMsg[list.id] && <span className="text-xs font-medium text-green-600">{sentMsg[list.id]}</span>}
                    <div className="flex-1" />
                    <button onClick={() => deleteList(list.id)} className="text-xs font-medium text-red-500 hover:text-red-700">Supprimer la liste</button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

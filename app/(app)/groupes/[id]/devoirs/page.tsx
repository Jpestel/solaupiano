'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface Assignment {
  id: number
  title: string
  instruction: string | null
  dueDate: string | null
  status: 'A_FAIRE' | 'EN_COURS' | 'FAIT'
  student: { id: number; name: string }
  song: { id: number; title: string } | null
}
interface Member { userId: number; groupRole: string; user: { name: string } }
interface SongLite { id: number; title: string }

const STATUS_META: Record<string, { label: string; cls: string }> = {
  A_FAIRE: { label: 'À faire', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  EN_COURS: { label: 'En cours', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  FAIT: { label: 'Fait', cls: 'bg-green-100 text-green-700 border-green-200' },
}

export default function DevoirsPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const groupId = params.id
  const [isChef, setIsChef] = useState(false)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [groupName, setGroupName] = useState('')
  const [students, setStudents] = useState<Member[]>([])
  const [songs, setSongs] = useState<SongLite[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ studentId: '', title: '', instruction: '', songId: '', dueDate: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const [devRes, grpRes, songRes] = await Promise.all([
      fetch(`/api/groupes/${groupId}/devoirs`),
      fetch(`/api/groupes/${groupId}`),
      fetch(`/api/groupes/${groupId}/morceaux`),
    ])
    if (devRes.ok) {
      const d = await devRes.json()
      setIsChef(d.isChef); setAssignments(d.assignments)
    }
    if (grpRes.ok) {
      const g = await grpRes.json()
      setGroupName(g.name)
      setStudents((g.members || []).filter((m: Member) => m.groupRole !== 'CHEF'))
    }
    if (songRes.ok) setSongs(await songRes.json())
    setLoading(false)
  }
  useEffect(() => { if (session) load() }, [session, groupId])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.studentId || !form.title.trim()) { setError('Élève et intitulé requis.'); return }
    setSaving(true); setError('')
    const res = await fetch(`/api/groupes/${groupId}/devoirs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: form.studentId, title: form.title, instruction: form.instruction,
        songId: form.songId || null, dueDate: form.dueDate || null,
      }),
    })
    setSaving(false)
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setError(d.error || 'Erreur.'); return }
    setForm({ studentId: '', title: '', instruction: '', songId: '', dueDate: '' })
    load()
  }

  const setStatus = async (id: number, status: string) => {
    setAssignments((prev) => prev.map((a) => a.id === id ? { ...a, status: status as Assignment['status'] } : a))
    await fetch(`/api/groupes/${groupId}/devoirs/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
  }

  const remove = async (id: number) => {
    if (!confirm('Supprimer ce devoir ?')) return
    await fetch(`/api/groupes/${groupId}/devoirs/${id}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <div className="text-gray-500">Chargement...</div>

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">{groupName}</Link>
        <span>/</span>
        <span className="text-gray-900">Devoirs</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">📒 Devoirs</h1>
      <p className="text-gray-500 text-sm mb-6">
        {isChef ? 'Assignez des devoirs à vos élèves et suivez leur avancement.' : 'Vos devoirs à travailler. Indiquez votre avancement.'}
      </p>

      {/* Prof : formulaire d'assignation */}
      {isChef && (
        <Card className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Nouveau devoir</h3>
          {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
          <form onSubmit={create} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">Élève *</label>
                <select className="form-input" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
                  <option value="">— Choisir un élève —</option>
                  {students.map((s) => <option key={s.userId} value={s.userId}>{s.user.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Échéance <span className="text-gray-400 font-normal">(optionnel)</span></label>
                <input type="date" className="form-input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="form-label">Intitulé *</label>
              <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex : Travailler la gamme de Do majeur, mains séparées" />
            </div>
            <div>
              <label className="form-label">Consigne <span className="text-gray-400 font-normal">(optionnel)</span></label>
              <textarea className="form-input" rows={2} value={form.instruction} onChange={(e) => setForm({ ...form, instruction: e.target.value })} />
            </div>
            {songs.length > 0 && (
              <div>
                <label className="form-label">Morceau lié <span className="text-gray-400 font-normal">(optionnel)</span></label>
                <select className="form-input" value={form.songId} onChange={(e) => setForm({ ...form, songId: e.target.value })}>
                  <option value="">— Aucun —</option>
                  {songs.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>{saving ? 'Envoi…' : 'Assigner le devoir'}</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Liste des devoirs */}
      {assignments.length === 0 ? (
        <Card><p className="text-sm text-gray-500 text-center py-8">{isChef ? 'Aucun devoir assigné pour l’instant.' : 'Aucun devoir pour l’instant. 🎉'}</p></Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const overdue = a.dueDate && a.status !== 'FAIT' && new Date(a.dueDate) < new Date()
            return (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-semibold rounded-full border px-2 py-0.5 ${STATUS_META[a.status].cls}`}>{STATUS_META[a.status].label}</span>
                      {isChef && <span className="text-xs text-indigo-600 font-medium">👤 {a.student.name}</span>}
                      {a.dueDate && (
                        <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                          📅 {new Date(a.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}{overdue ? ' · en retard' : ''}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 mt-1.5">{a.title}</p>
                    {a.instruction && <p className="text-sm text-gray-500 mt-0.5 whitespace-pre-line">{a.instruction}</p>}
                    {a.song && <p className="text-xs text-gray-400 mt-1">🎼 {a.song.title}</p>}
                  </div>
                  {isChef && (
                    <button onClick={() => remove(a.id)} className="text-xs text-red-500 hover:text-red-600 shrink-0">Supprimer</button>
                  )}
                </div>
                {/* Avancement : modifiable par l'élève (et le prof) */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5">
                  <span className="text-xs text-gray-400 mr-1">Avancement :</span>
                  {(['A_FAIRE', 'EN_COURS', 'FAIT'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatus(a.id, st)}
                      className={`text-xs font-medium rounded-full border px-2.5 py-1 transition-colors ${
                        a.status === st ? STATUS_META[st].cls : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {STATUS_META[st].label}
                    </button>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

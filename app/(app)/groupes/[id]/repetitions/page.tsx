'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { formatDateWithDay } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface Rehearsal {
  id: number
  date: string
  location: string
  startTime: string
  endTime?: string
  notes?: string
}

interface GroupInfo {
  name: string
  groupRole: string
}

interface Member {
  userId: number
  user: { name: string }
}

export default function RepetitionsPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const groupId = params.id
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([])
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    date: '',
    location: '',
    startTime: '',
    endTime: '',
    notes: '',
  })
  const [inviteAll, setInviteAll] = useState(true)
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchData = async () => {
    const [repRes, grpRes] = await Promise.all([
      fetch(`/api/groupes/${groupId}/repetitions`),
      fetch(`/api/groupes/${groupId}`),
    ])
    if (repRes.ok) setRehearsals(await repRes.json())
    if (grpRes.ok) {
      const g = await grpRes.json()
      const me = g.members?.find((m: { userId: number; groupRole: string }) => m.userId === Number(session?.user?.id))
      const role = session?.user?.siteRole === 'ADMIN' ? 'CHEF' : (me?.groupRole || 'MEMBRE')
      setGroupInfo({ name: g.name, groupRole: role })
      const otherMembers = (g.members || []).filter((m: { userId: number }) => m.userId !== Number(session?.user?.id))
      setMembers(otherMembers)
      setSelectedMemberIds(otherMembers.map((m: Member) => m.userId))
    }
    setLoading(false)
  }

  useEffect(() => {
    if (session) fetchData()
  }, [session, groupId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch(`/api/groupes/${groupId}/repetitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        invitedMemberIds: inviteAll ? [] : selectedMemberIds,
      }),
    })

    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Erreur lors de la création.')
      return
    }

    setModalOpen(false)
    setForm({ date: '', location: '', startTime: '', endTime: '', notes: '' })
    setInviteAll(true)
    setSelectedMemberIds(members.map((m) => m.userId))
    fetchData()
  }

  const now = new Date()
  const upcoming = rehearsals.filter((r) => new Date(r.date) >= now)
  const past = rehearsals.filter((r) => new Date(r.date) < now)

  if (loading) return <div className="text-gray-500">Chargement...</div>

  const isChef = groupInfo?.groupRole === 'CHEF'

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">{groupInfo?.name}</Link>
        <span>/</span>
        <span className="text-gray-900">Répétitions</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Répétitions</h1>
        {isChef && (
          <Button onClick={() => setModalOpen(true)}>
            + Nouvelle répétition
          </Button>
        )}
      </div>

      {/* Upcoming */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-gray-700 mb-3">À venir ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <Card><p className="text-sm text-gray-500 text-center py-6">Aucune répétition à venir.</p></Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((r) => (
              <Link key={r.id} href={`/groupes/${groupId}/repetitions/${r.id}`}>
                <Card padding={false} className="flex items-center justify-between px-5 py-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer">
                  <div>
                    <p className="font-semibold text-gray-900 capitalize">{formatDateWithDay(r.date)}</p>
                    <p className="text-sm text-gray-500">
                      {r.startTime}{r.endTime ? ` - ${r.endTime}` : ''} · {r.location}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Passées ({past.length})</h2>
          <div className="space-y-3 opacity-70">
            {past.slice().reverse().map((r) => (
              <Link key={r.id} href={`/groupes/${groupId}/repetitions/${r.id}`}>
                <Card padding={false} className="flex items-center justify-between px-5 py-4 hover:border-gray-300 transition-all cursor-pointer">
                  <div>
                    <p className="font-semibold text-gray-700 capitalize">{formatDateWithDay(r.date)}</p>
                    <p className="text-sm text-gray-500">
                      {r.startTime}{r.endTime ? ` - ${r.endTime}` : ''} · {r.location}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle répétition">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="form-label">Date *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Heure de début *</label>
              <input
                type="time"
                required
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Heure de fin</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="col-span-2">
              <label className="form-label">Lieu *</label>
              <input
                type="text"
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="form-input"
                placeholder="Salle de répétition, adresse..."
              />
            </div>
            <div className="col-span-2">
              <label className="form-label">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="form-input"
                rows={3}
                placeholder="Informations complémentaires..."
              />
            </div>
          </div>
          {members.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="form-label mb-0">Membres invités</label>
                <button
                  type="button"
                  onClick={() => {
                    const next = !inviteAll
                    setInviteAll(next)
                    if (next) setSelectedMemberIds(members.map((m) => m.userId))
                    else setSelectedMemberIds([])
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-500 font-medium"
                >
                  {inviteAll ? 'Personnaliser' : 'Tous sélectionner'}
                </button>
              </div>
              {inviteAll ? (
                <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  Tous les membres seront invités ({members.length})
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => {
                    const selected = selectedMemberIds.includes(m.userId)
                    return (
                      <button
                        key={m.userId}
                        type="button"
                        onClick={() => setSelectedMemberIds((prev) =>
                          selected ? prev.filter((id) => id !== m.userId) : [...prev, m.userId]
                        )}
                        className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                          selected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                        }`}
                      >
                        {m.user.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Créer la répétition'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

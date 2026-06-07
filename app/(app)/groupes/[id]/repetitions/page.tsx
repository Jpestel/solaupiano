'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { formatDateWithDay } from '@/lib/utils'
import { resolvePermissions, type ChefPermissions } from '@/lib/permissions'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { StarRating, EvaluationModal, PresencePicker } from '@/components/ui/RehearsalEvaluation'
import { ph } from '@/lib/placeholders'

interface MemberRating { ratedUserId: number; rating: number; ratedUser: { id: number; name: string } }
interface SongRating { songId: number; rating: number; song: { id: number; title: string } }
interface Evaluation { id: number; selfRating: number; groupRating: number; suggestion: string | null; evaluator: { id: number; name: string }; memberRatings: MemberRating[]; songRatings: SongRating[] }

interface Rehearsal {
  id: number
  date: string
  location: string
  startTime: string
  endTime?: string
  notes?: string
  attendances?: { userId: number; user: { id: number; name: string } }[]
  evaluations?: Evaluation[]
  peerVisibility?: 'HIDDEN' | 'PRIVATE' | 'PUBLIC'
  myAvgReceived?: number | null
  avgReceivedByUser?: { userId: number; name: string; avg: number; count: number }[]
  myAttendanceStatus?: 'PRESENT' | 'ABSENT' | 'INCERTAIN' | null
}

interface GroupInfo {
  name: string
  groupRole: string
  createdBy: number | null
  chefPermissions: unknown
  hasEvaluations: boolean
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
  const [unavs, setUnavs] = useState<{ userId: number; startDate: string; endDate: string; note: string | null; user: { name: string } }[]>([])
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
  const [evalRehearsal, setEvalRehearsal] = useState<Rehearsal | null>(null)
  const [expandedEvals, setExpandedEvals] = useState<Set<number>>(new Set())

  const fetchData = async () => {
    const [repRes, grpRes, unavRes] = await Promise.all([
      fetch(`/api/groupes/${groupId}/repetitions`),
      fetch(`/api/groupes/${groupId}`),
      fetch(`/api/groupes/${groupId}/indisponibilites`),
    ])
    if (unavRes.ok) setUnavs(await unavRes.json())
    if (repRes.ok) setRehearsals(await repRes.json())
    if (grpRes.ok) {
      const g = await grpRes.json()
      const me = g.members?.find((m: { userId: number; groupRole: string }) => m.userId === Number(session?.user?.id))
      const role = session?.user?.siteRole === 'ADMIN' ? 'CHEF' : (me?.groupRole || 'MEMBRE')
      setGroupInfo({ name: g.name, groupRole: role, createdBy: g.createdBy ?? null, chefPermissions: g.chefPermissions ?? null, hasEvaluations: g.planFeatures?.hasEvaluations ?? true })
      const otherMembers = (g.members || []).filter((m: { userId: number }) => m.userId !== Number(session?.user?.id))
      setMembers(otherMembers)
      setSelectedMemberIds(otherMembers.map((m: Member) => m.userId))
    }
    setLoading(false)
  }

  useEffect(() => {
    if (session) fetchData()
  }, [session, groupId])

  const setPresence = async (rehearsalId: number, status: string) => {
    await fetch(`/api/repetitions/${rehearsalId}/presences`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    fetchData()
  }

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
  const myId = Number(session?.user?.id)
  // Heures de début / fin de la répétition (jour + heure)
  const rehearsalEnd = (r: Rehearsal) => {
    const end = new Date(r.date)
    const t = (r.endTime || r.startTime || '23:59').split(':')
    end.setHours(Number(t[0]) || 23, Number(t[1]) || 59, 0, 0)
    return end
  }
  const rehearsalStart = (r: Rehearsal) => {
    const s = new Date(r.date)
    const t = (r.startTime || '00:00').split(':')
    s.setHours(Number(t[0]) || 0, Number(t[1]) || 0, 0, 0)
    return s
  }
  const isEnded = (r: Rehearsal) => now >= rehearsalEnd(r)
  const isOngoing = (r: Rehearsal) => now >= rehearsalStart(r) && now < rehearsalEnd(r)
  // Tri basé sur l'heure de FIN : une répét' du jour reste « à venir/en cours » tant qu'elle n'est pas finie
  const upcoming = rehearsals.filter((r) => !isEnded(r))
  const past = rehearsals.filter((r) => isEnded(r))
  const globalNote = (r: Rehearsal) => {
    const evs = r.evaluations || []
    if (evs.length === 0) return null
    return evs.reduce((a, e) => a + e.groupRating, 0) / evs.length
  }

  if (loading) return <div className="text-gray-500">Chargement...</div>

  const isChef = groupInfo?.groupRole === 'CHEF'
  const isFounder = isChef && (session?.user?.siteRole === 'ADMIN' || Number(session?.user?.id) === groupInfo?.createdBy)
  const perms = resolvePermissions(groupInfo?.chefPermissions)
  const chefCan = (mod: keyof ChefPermissions, action: string): boolean => {
    if (!isChef) return false
    if (isFounder) return true
    return (perms[mod] as Record<string, boolean>)[action] !== false
  }

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
        {chefCan('repetitions', 'create') && (
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
            {upcoming.map((r) => {
              const ongoing = isOngoing(r)
              const iAmPresent = (r.attendances || []).some((a) => a.userId === myId)
              const showEvalSoon = ongoing && iAmPresent && (groupInfo?.hasEvaluations ?? true)
              return (
                <Card key={r.id} padding={false} className={`px-5 py-4 transition-all ${ongoing ? 'border-green-300 bg-green-50/40' : ''}`}>
                  <Link href={`/groupes/${groupId}/repetitions/${r.id}`} className="block cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 capitalize flex items-center gap-2">
                          {formatDateWithDay(r.date)}
                          {ongoing && <span className="inline-flex items-center rounded-full bg-green-100 border border-green-300 px-2 py-0.5 text-[10px] font-bold text-green-700">EN COURS</span>}
                        </p>
                        <p className="text-sm text-gray-500">
                          {r.startTime}{r.endTime ? ` - ${r.endTime}` : ''} · {r.location}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    {showEvalSoon && (
                      <p className="mt-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5">
                        ⭐ Évaluation disponible dès la fin de la répétition{r.endTime ? ` (${r.endTime})` : ''}
                      </p>
                    )}
                  </Link>
                  {/* Présence hors du lien (sinon le tap navigue, surtout sur mobile) */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400">Ma présence :</span>
                    <PresencePicker value={r.myAttendanceStatus} onSet={(s) => setPresence(r.id, s)} />
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Passées ({past.length})</h2>
          <div className="space-y-3">
            {past.slice().reverse().map((r) => {
              const note = globalNote(r)
              const evs = r.evaluations || []
              const iAmPresent = (r.attendances || []).some((a) => a.userId === myId)
              const canEvaluate = (groupInfo?.hasEvaluations ?? true) && isEnded(r) && iAmPresent
              const iEvaluated = evs.some((e) => e.evaluator.id === myId)
              const expanded = expandedEvals.has(r.id)
              return (
                <Card key={r.id} padding={false} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/groupes/${groupId}/repetitions/${r.id}`} className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-700 capitalize">{formatDateWithDay(r.date)}</p>
                      <p className="text-sm text-gray-500">{r.startTime}{r.endTime ? ` - ${r.endTime}` : ''} · {r.location}</p>
                    </Link>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {note !== null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700" title="Note globale du groupe">
                          ⭐ {note.toFixed(1)} <span className="text-amber-400 font-normal">({evs.length})</span>
                        </span>
                      )}
                      {typeof r.myAvgReceived === 'number' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700" title="Ta note moyenne reçue (anonyme)">
                          👤 {r.myAvgReceived.toFixed(1)}
                        </span>
                      )}
                      {canEvaluate && (
                        <button onClick={() => setEvalRehearsal(r)}
                          className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5">
                          {iEvaluated ? 'Modifier' : 'Évaluer'}
                        </button>
                      )}
                      {evs.length > 0 && (
                        <button onClick={() => setExpandedEvals((s) => { const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n })}
                          className="rounded-lg border border-gray-200 text-gray-500 text-xs font-medium px-2.5 py-1.5 hover:bg-gray-50">
                          {expanded ? 'Masquer' : 'Détail'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400">Ma présence :</span>
                    <PresencePicker value={r.myAttendanceStatus} onSet={(s) => setPresence(r.id, s)} />
                    {iEvaluated && (
                      <span className="text-[11px] text-amber-600">Vous marquer absent supprimera votre évaluation.</span>
                    )}
                  </div>

                  {expanded && evs.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                      {(r.avgReceivedByUser?.length ?? 0) > 0 && (
                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-2.5">
                          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Moyennes perçues par musicien <span className="font-normal normal-case">(chef · anonyme)</span></p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                            {r.avgReceivedByUser!.map((u) => (
                              <span key={u.userId} className="inline-flex items-center gap-1">{u.name} <StarRating value={Math.round(u.avg)} readOnly size={12} /> <span className="text-gray-400">{u.avg.toFixed(1)}</span></span>
                            ))}
                          </div>
                        </div>
                      )}
                      {evs.map((e) => (
                        <div key={e.id} className="text-sm">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-medium text-gray-700">{e.evaluator.name}{e.evaluator.id === myId ? ' (moi)' : ''}</span>
                            <span className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="inline-flex items-center gap-1">Groupe <StarRating value={e.groupRating} readOnly size={14} /></span>
                              <span className="inline-flex items-center gap-1">Soi <StarRating value={e.selfRating} readOnly size={14} /></span>
                            </span>
                          </div>
                          {e.memberRatings.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                              {e.memberRatings.map((mr) => (
                                <span key={mr.ratedUserId} className="inline-flex items-center gap-1">{mr.ratedUser.name} <StarRating value={mr.rating} readOnly size={12} /></span>
                              ))}
                            </div>
                          )}
                          {e.songRatings.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                              {e.songRatings.map((sr) => (
                                <span key={sr.songId} className="inline-flex items-center gap-1">🎵 {sr.song.title} <StarRating value={sr.rating} readOnly size={12} /></span>
                              ))}
                            </div>
                          )}
                          {e.suggestion && <p className="mt-1 text-xs text-gray-500 italic">💬 {e.suggestion}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Évaluation modal */}
      {evalRehearsal && (
        <EvaluationModal
          endpoint={`/api/repetitions/${evalRehearsal.id}/evaluation`}
          title={formatDateWithDay(evalRehearsal.date)}
          onClose={() => setEvalRehearsal(null)}
          onSaved={fetchData}
        />
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
              {form.date && (() => {
                const day = form.date
                const busy = unavs.filter((u) => u.startDate.slice(0, 10) <= day && day <= u.endDate.slice(0, 10))
                if (busy.length === 0) return (
                  <p className="mt-1.5 text-xs text-green-600">✅ Aucun membre n'a signalé d'indisponibilité ce jour-là.</p>
                )
                return (
                  <div className="mt-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                    ⚠️ <strong>{busy.length} indisponible{busy.length > 1 ? 's' : ''}</strong> ce jour :{' '}
                    {busy.map((u) => u.user.name + (u.note ? ` (${u.note})` : '')).join(', ')}
                  </div>
                )
              })()}
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
                placeholder={ph('groupes_id_repetitions_1')}
              />
            </div>
            <div className="col-span-2">
              <label className="form-label">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="form-input"
                rows={3}
                placeholder={ph('groupes_id_repetitions_2')}
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

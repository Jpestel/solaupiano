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

interface SetlistRef { id: number; name: string; _count: { songs: number } }
interface SimulationRef { id: number; label: string; data: any }
interface CMemberRating { ratedUserId: number; rating: number; ratedUser: { id: number; name: string } }
interface CSongRating { songId: number; rating: number; song: { id: number; title: string } }
interface CEvaluation { id: number; selfRating: number; groupRating: number; suggestion: string | null; evaluator: { id: number; name: string }; memberRatings: CMemberRating[]; songRatings: CSongRating[] }
interface Concert {
  id: number; name: string; date: string; location: string; notes?: string
  address?: string | null; postalCode?: string | null; city?: string | null
  startTime?: string | null; soundcheckTime?: string | null; arrivalTime?: string | null; arrivalInfo?: string | null
  guestsPerPerson?: number | null; contactName?: string | null; contactPhone?: string | null
  requiredUserIds?: string | null; confirmDaysBefore?: number | null; status?: string
  setlist?: SetlistRef | null
  isPublic: boolean
  simulation?: SimulationRef | null
  attendances?: { userId: number; user: { id: number; name: string } }[]
  evaluations?: CEvaluation[]
  myAttendanceStatus?: 'PRESENT' | 'ABSENT' | 'INCERTAIN' | null
  myAvgReceived?: number | null
  avgReceivedByUser?: { userId: number; name: string; avg: number; count: number }[]
}
interface GroupInfo { name: string; groupRole: string; createdBy: number | null; chefPermissions: unknown; hasEvaluations: boolean }

const EMPTY_FORM = {
  name: '', date: '', location: '', notes: '', setlistId: '', isPublic: true as boolean,
  address: '', postalCode: '', city: '',
  startTime: '', soundcheckTime: '', arrivalTime: '', arrivalInfo: '',
  guestsPerPerson: '', contactName: '', contactPhone: '',
  requiredUserIds: [] as number[], confirmDaysBefore: '',
}
type ConcertForm = typeof EMPTY_FORM

// Champs « validation » : musiciens obligatoires + délai de confirmation
function ConcertValidationFields({ form, onChange, members }: { form: ConcertForm; onChange: (p: Partial<ConcertForm>) => void; members: { userId: number; name: string }[] }) {
  const toggle = (id: number) => {
    const cur = form.requiredUserIds
    onChange({ requiredUserIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] })
  }
  let deadlineStr = ''
  if (form.date && form.confirmDaysBefore !== '') {
    const d = new Date(form.date)
    d.setDate(d.getDate() - Number(form.confirmDaysBefore || 0))
    deadlineStr = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2">
      <p className="text-xs font-semibold text-amber-800">🎭 Validation du concert <span className="font-normal text-amber-600">(optionnel)</span></p>
      <p className="text-[11px] text-amber-700 leading-snug">Cochez les musiciens <strong>indispensables</strong>. Tant qu&apos;ils n&apos;ont pas tous confirmé leur présence, le concert reste « en attente ». Passé le délai sans confirmation complète, il est automatiquement annulé.</p>
      {members.length === 0 ? (
        <p className="text-[11px] text-gray-400">Aucun membre.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => {
            const on = form.requiredUserIds.includes(m.userId)
            return (
              <button key={m.userId} type="button" onClick={() => toggle(m.userId)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${on ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-100'}`}>
                {on ? '✓ ' : ''}{m.name}
              </button>
            )
          })}
        </div>
      )}
      {form.requiredUserIds.length > 0 && (
        <div className="pt-1">
          <label className="form-label">Réponse attendue au plus tard</label>
          <div className="flex items-center gap-2">
            <input type="number" min={0} max={365} value={form.confirmDaysBefore} onChange={(e) => onChange({ confirmDaysBefore: e.target.value })} className="form-input w-24" placeholder="ex : 7" />
            <span className="text-sm text-gray-500">jours avant le concert</span>
          </div>
          {deadlineStr && <p className="text-[11px] text-amber-700 mt-1">→ soit le <strong className="capitalize">{deadlineStr}</strong></p>}
        </div>
      )}
    </div>
  )
}

// Champs lieu (adresse structurée) + logistique, partagés création/édition
function ConcertVenueLogistics({ form, onChange }: { form: ConcertForm; onChange: (p: Partial<ConcertForm>) => void }) {
  return (
    <>
      <div>
        <label className="form-label">Salle / nom du lieu <span className="text-red-500">*</span></label>
        <input type="text" required value={form.location} onChange={(e) => onChange({ location: e.target.value })} className="form-input" placeholder="ex : Le Tetris, Salle des fêtes…" />
      </div>
      <div>
        <label className="form-label">Adresse <span className="text-red-500">*</span></label>
        <input type="text" required value={form.address} onChange={(e) => onChange({ address: e.target.value })} className="form-input" placeholder="N° et rue" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="form-label">Code postal <span className="text-red-500">*</span></label>
          <input type="text" required value={form.postalCode} onChange={(e) => onChange({ postalCode: e.target.value })} className="form-input" placeholder="76600" />
        </div>
        <div className="col-span-2">
          <label className="form-label">Ville <span className="text-red-500">*</span></label>
          <input type="text" required value={form.city} onChange={(e) => onChange({ city: e.target.value })} className="form-input" placeholder="Le Havre" />
        </div>
      </div>

      <div className="pt-1 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-3 mb-1">🕒 Logistique <span className="font-normal normal-case text-gray-400">(optionnel)</span></p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Heure des balances</label>
          <input type="time" value={form.soundcheckTime} onChange={(e) => onChange({ soundcheckTime: e.target.value })} className="form-input" />
        </div>
        <div>
          <label className="form-label">Heure de début / passage</label>
          <input type="time" value={form.startTime} onChange={(e) => onChange({ startTime: e.target.value })} className="form-input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Arrivée souhaitée à</label>
          <input type="time" value={form.arrivalTime} onChange={(e) => onChange({ arrivalTime: e.target.value })} className="form-input" />
        </div>
        <div>
          <label className="form-label">Pour qui / précisions</label>
          <input type="text" value={form.arrivalInfo} onChange={(e) => onChange({ arrivalInfo: e.target.value })} className="form-input" placeholder="ex : techniciens, tout le groupe…" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Accompagnants / musicien</label>
          <input type="number" min={0} max={20} value={form.guestsPerPerson} onChange={(e) => onChange({ guestsPerPerson: e.target.value })} className="form-input" placeholder="ex : 2" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Contact sur place</label>
          <input type="text" value={form.contactName} onChange={(e) => onChange({ contactName: e.target.value })} className="form-input" placeholder="Nom" />
        </div>
        <div>
          <label className="form-label">Téléphone</label>
          <input type="tel" value={form.contactPhone} onChange={(e) => onChange({ contactPhone: e.target.value })} className="form-input" placeholder="06…" />
        </div>
      </div>
    </>
  )
}

export default function ConcertsPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const groupId = params.id

  const [concerts, setConcerts] = useState<Concert[]>([])
  const [setlists, setSetlists] = useState<SetlistRef[]>([])
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null)
  const [unavs, setUnavs] = useState<{ userId: number; startDate: string; endDate: string; note: string | null; user: { name: string } }[]>([])
  const [members, setMembers] = useState<{ userId: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)

  // Create
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Edit
  const [editConcert, setEditConcert] = useState<Concert | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Delete
  const [deleteId, setDeleteId] = useState<number | null>(null)

  // Print
  const [printingId, setPrintingId] = useState<number | null>(null)
  const [evalConcert, setEvalConcert] = useState<Concert | null>(null)
  const [expandedEvals, setExpandedEvals] = useState<Set<number>>(new Set())

  const handlePrintSetlist = async (concert: Concert) => {
    if (!concert.setlist) return
    setPrintingId(concert.id)
    const res = await fetch(`/api/setlists/${concert.setlist.id}`)
    setPrintingId(null)
    if (!res.ok) return
    const sl = await res.json()
    openPrintWindow({
      groupName: groupInfo?.name || '',
      setlistName: sl.name,
      description: sl.description,
      concertName: concert.name,
      concertDate: concert.date,
      concertLocation: concert.location,
      songs: sl.songs,
    })
  }

  const openPrintWindow = ({ groupName, setlistName, description, concertName, concertDate, concertLocation, songs }: {
    groupName: string; setlistName: string; description?: string
    concertName: string; concertDate: string; concertLocation: string
    songs: { song: { title: string; artist?: string }; position: number }[]
  }) => {
    const sorted = [...songs].sort((a, b) => a.position - b.position)
    const dateStr = new Date(concertDate).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    const rows = sorted.map((e, i) => `
      <tr>
        <td style="width:36px;text-align:center;font-weight:700;color:#6366f1;padding:10px 8px;font-size:15px;">${i + 1}</td>
        <td style="padding:10px 12px 10px 0;border-bottom:1px solid #f3f4f6;">
          <div style="font-size:14px;font-weight:600;color:#111;">${e.song.title}</div>
          ${e.song.artist ? `<div style="font-size:12px;color:#9ca3af;margin-top:2px;">${e.song.artist}</div>` : ''}
        </td>
      </tr>`).join('')
    const pw = window.open('', '_blank', 'width=720,height=960')
    if (!pw) return
    pw.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
      <title>${setlistName} — ${concertName}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:-apple-system,Arial,sans-serif;padding:40px;color:#111;max-width:640px;margin:0 auto}
        .actions{text-align:center;margin-bottom:28px;display:flex;gap:10px;justify-content:center}
        .actions button{padding:10px 22px;border-radius:8px;border:none;cursor:pointer;font-size:14px;font-weight:600}
        .btn-print{background:#6366f1;color:white}.btn-close{background:#f3f4f6;color:#374151}
        .badge{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6366f1;margin-bottom:6px}
        h1{font-size:26px;font-weight:800;color:#111;margin-bottom:4px}
        .desc{font-size:13px;color:#6b7280;margin-top:4px;margin-bottom:12px}
        .concert-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px;margin:14px 0 24px}
        .concert-box .label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:4px}
        .concert-box .name{font-size:15px;font-weight:700;color:#111}
        .concert-box .meta{font-size:13px;color:#6b7280;margin-top:2px}
        table{width:100%;border-collapse:collapse}
        tr:last-child td{border-bottom:none!important}
        .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:11px;color:#9ca3af}
        @media print{.actions{display:none!important}body{padding:20px}}
      </style></head><body>
      <div class="actions">
        <button class="btn-print" onclick="window.print()">🖨️&nbsp; Imprimer</button>
        <button class="btn-close" onclick="window.close()">✕ Fermer</button>
      </div>
      <div class="badge">${groupName}</div>
      <h1>${setlistName}</h1>
      ${description ? `<div class="desc">${description}</div>` : ''}
      <div class="concert-box">
        <div class="label">🎭 Concert</div>
        <div class="name">${concertName}</div>
        <div class="meta">${dateStr}${concertLocation ? ' · ' + concertLocation : ''}</div>
      </div>
      <table>${rows}</table>
      <div class="footer">
        <span>${sorted.length} morceau${sorted.length > 1 ? 'x' : ''}</span>
        <span>Imprimé le ${new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}</span>
      </div>
    </body></html>`)
    pw.document.close()
  }

  const fetchData = async () => {
    const [concRes, grpRes, slRes, unavRes] = await Promise.all([
      fetch(`/api/groupes/${groupId}/concerts`),
      fetch(`/api/groupes/${groupId}`),
      fetch(`/api/groupes/${groupId}/setlists`),
      fetch(`/api/groupes/${groupId}/indisponibilites`),
    ])
    if (unavRes.ok) setUnavs(await unavRes.json())
    if (concRes.ok) {
      const concerts: Concert[] = await concRes.json()
      // Charger les simulations liées en parallèle
      const sims = await Promise.all(
        concerts.map(c =>
          fetch(`/api/groupes/${groupId}/concerts/${c.id}/simulation`)
            .then(r => r.ok ? r.json() : { simulation: null })
            .then(d => ({ concertId: c.id, simulation: d.simulation }))
            .catch(() => ({ concertId: c.id, simulation: null }))
        )
      )
      const simMap = Object.fromEntries(sims.map(s => [s.concertId, s.simulation]))
      setConcerts(concerts.map(c => ({ ...c, simulation: simMap[c.id] ?? null })))
    }
    if (slRes.ok) setSetlists(await slRes.json())
    if (grpRes.ok) {
      const g = await grpRes.json()
      const me = g.members?.find((m: any) => m.userId === Number(session?.user?.id))
      const role = session?.user?.siteRole === 'ADMIN' ? 'CHEF' : (me?.groupRole || 'MEMBRE')
      setGroupInfo({ name: g.name, groupRole: role, createdBy: g.createdBy ?? null, chefPermissions: g.chefPermissions ?? null, hasEvaluations: g.planFeatures?.hasEvaluations ?? true })
      setMembers((g.members ?? []).map((m: any) => ({ userId: m.userId, name: m.user?.name ?? '—' })))
    }
    setLoading(false)
  }

  useEffect(() => { if (session) fetchData() }, [session, groupId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch(`/api/groupes/${groupId}/concerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, setlistId: form.setlistId ? Number(form.setlistId) : null, isPublic: form.isPublic }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Erreur.'); return }
    setCreateOpen(false)
    setForm(EMPTY_FORM)
    fetchData()
  }

  const openEdit = (concert: Concert) => {
    setEditConcert(concert)
    setEditForm({
      name: concert.name,
      date: concert.date.slice(0, 10),
      location: concert.location,
      notes: concert.notes || '',
      setlistId: concert.setlist?.id ? String(concert.setlist.id) : '',
      isPublic: concert.isPublic !== false,
      address: concert.address || '',
      postalCode: concert.postalCode || '',
      city: concert.city || '',
      startTime: concert.startTime || '',
      soundcheckTime: concert.soundcheckTime || '',
      arrivalTime: concert.arrivalTime || '',
      arrivalInfo: concert.arrivalInfo || '',
      guestsPerPerson: concert.guestsPerPerson != null ? String(concert.guestsPerPerson) : '',
      contactName: concert.contactName || '',
      contactPhone: concert.contactPhone || '',
      requiredUserIds: (() => { try { return concert.requiredUserIds ? JSON.parse(concert.requiredUserIds) : [] } catch { return [] } })(),
      confirmDaysBefore: concert.confirmDaysBefore != null ? String(concert.confirmDaysBefore) : '',
    })
    setEditError('')
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editConcert) return
    setEditSaving(true)
    setEditError('')
    const res = await fetch(`/api/groupes/${groupId}/concerts/${editConcert.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editForm,
        setlistId: editForm.setlistId ? Number(editForm.setlistId) : null,
        isPublic: editForm.isPublic,
      }),
    })
    setEditSaving(false)
    if (!res.ok) { const d = await res.json(); setEditError(d.error || 'Erreur.'); return }
    setEditConcert(null)
    fetchData()
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/groupes/${groupId}/concerts/${id}`, { method: 'DELETE' })
    setDeleteId(null)
    fetchData()
  }

  const now = new Date()
  const myId = Number(session?.user?.id)
  // Concert « passé » = la journée est terminée (pas d'heure sur les concerts)
  const concertEnded = (c: Concert) => { const e = new Date(c.date); e.setHours(23, 59, 59, 999); return now > e }
  const upcoming = concerts.filter((c) => !concertEnded(c))
  const past = concerts.filter((c) => concertEnded(c))
  const globalNote = (c: Concert) => {
    const evs = c.evaluations || []
    return evs.length === 0 ? null : evs.reduce((a, e) => a + e.groupRating, 0) / evs.length
  }
  const setPresence = async (concertId: number, status: string) => {
    await fetch(`/api/concerts/${concertId}/presences`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    fetchData()
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

  const SetlistSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div>
      <label className="form-label">Setlist <span className="text-gray-400 font-normal">(optionnel)</span></label>
      {setlists.length === 0 ? (
        <p className="text-xs text-gray-400 mt-1">
          <Link href={`/groupes/${groupId}/setlists`} className="text-indigo-600 hover:underline">Créez d'abord une setlist</Link> pour l'associer à ce concert.
        </p>
      ) : (
        <select value={value} onChange={(e) => onChange(e.target.value)} className="form-input">
          <option value="">— Aucune setlist —</option>
          {setlists.map((sl) => (
            <option key={sl.id} value={sl.id}>{sl.name} ({sl._count.songs} morceau{sl._count.songs > 1 ? 'x' : ''})</option>
          ))}
        </select>
      )}
    </div>
  )

  const ConcertCard = ({ concert, dim = false }: { concert: Concert; dim?: boolean }) => (
    <Card className={dim ? 'opacity-70' : ''}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className={`font-semibold truncate ${dim ? 'text-gray-600' : 'text-gray-900'}`}>{concert.name}</h3>
          {concert.isPublic === false
            ? <span className="flex-shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">🔒 Privé</span>
            : <span className="flex-shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">🌐 Public</span>
          }
          {concert.status === 'PENDING' && <span className="flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">⏳ En attente</span>}
          {concert.status === 'CONFIRMED' && (concert.requiredUserIds) && <span className="flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">✅ Confirmé</span>}
          {concert.status === 'CANCELLED' && <span className="flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">❌ Annulé</span>}
        </div>
        <span className="text-2xl flex-shrink-0 ml-2">🎭</span>
      </div>
      {groupInfo?.name && (
        <p className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">🎸 {groupInfo.name}</p>
      )}
      <p className={`text-sm font-medium capitalize ${dim ? 'text-gray-400' : 'text-indigo-600'}`}>{formatDateWithDay(concert.date)}</p>
      <p className="text-sm text-gray-700 mt-1">📍 {concert.location}</p>
      {(concert.address || concert.city) && (
        <p className="text-xs text-gray-500 mt-0.5">
          {[concert.address, [concert.postalCode, concert.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
        </p>
      )}
      {(concert.soundcheckTime || concert.startTime || concert.arrivalTime || concert.guestsPerPerson != null || concert.contactName) && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          {concert.soundcheckTime && <span className="rounded-full bg-amber-50 border border-amber-100 px-2 py-0.5 text-amber-700">🎚 Balances {concert.soundcheckTime}</span>}
          {concert.startTime && <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-indigo-700">🎬 Début {concert.startTime}</span>}
          {concert.arrivalTime && <span className="rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-blue-700">🚶 Arrivée {concert.arrivalTime}{concert.arrivalInfo ? ` · ${concert.arrivalInfo}` : ''}</span>}
          {concert.guestsPerPerson != null && <span className="rounded-full bg-green-50 border border-green-100 px-2 py-0.5 text-green-700">👥 {concert.guestsPerPerson} accompagnant{concert.guestsPerPerson > 1 ? 's' : ''}/musicien</span>}
          {concert.contactName && <span className="rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-gray-600">📞 {concert.contactName}{concert.contactPhone ? ` · ${concert.contactPhone}` : ''}</span>}
        </div>
      )}

      {/* Confirmations des musiciens obligatoires */}
      {(() => {
        let required: number[] = []
        try { required = concert.requiredUserIds ? JSON.parse(concert.requiredUserIds) : [] } catch { required = [] }
        if (required.length === 0) return null
        const presentIds = new Set((concert.attendances || []).map((a) => a.userId))
        const confirmed = required.filter((id) => presentIds.has(id)).length
        const ok = confirmed >= required.length
        return (
          <div className={`mt-2 rounded-lg px-3 py-2 text-xs border ${concert.status === 'CANCELLED' ? 'bg-red-50 border-red-100 text-red-700' : ok ? 'bg-green-50 border-green-100 text-green-700' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
            🎭 <strong>{confirmed}/{required.length}</strong> musicien{required.length > 1 ? 's' : ''} indispensable{required.length > 1 ? 's' : ''} {ok ? 'ont confirmé ✓' : 'ont confirmé'}
            {!ok && concert.status !== 'CANCELLED' && concert.confirmDaysBefore != null && (() => {
              const d = new Date(concert.date); d.setDate(d.getDate() - (concert.confirmDaysBefore || 0))
              return <span> · réponse attendue avant le <strong className="capitalize">{d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</strong></span>
            })()}
            {concert.status === 'CANCELLED' && <span> · concert annulé faute de confirmation</span>}
          </div>
        )
      })()}

      {concert.setlist && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Link
            href={`/groupes/${groupId}/setlists/${concert.setlist.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-colors"
          >
            🎵 {concert.setlist.name}
            <span className="text-purple-400">· {concert.setlist._count.songs} morceaux</span>
            <span className="text-purple-400">→</span>
          </Link>
          <button
            onClick={() => handlePrintSetlist(concert)}
            disabled={printingId === concert.id}
            title="Imprimer la setlist"
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {printingId === concert.id
              ? <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
              : '🖨️'
            }
            <span>Imprimer</span>
          </button>
        </div>
      )}

      {concert.notes && <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100">{concert.notes}</p>}

      {/* Plan de scène */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <Link
          href={`/groupes/${groupId}/concerts/${concert.id}/scene`}
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
        >
          🗺️ Plan de scène →
        </Link>
      </div>

      {/* Estimation financière liée */}
      {concert.simulation ? (
        <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-xs font-semibold text-amber-800">📊 {concert.simulation.label}</p>
              {concert.simulation.data?.cachet && (
                <p className="text-[10px] text-amber-600 mt-0.5">
                  Cachet {concert.simulation.data.cachetMode === 'net' ? 'net' : 'brut'} : {concert.simulation.data.cachet} €
                  {concert.simulation.data.localConcert ? ' · Concert local' : concert.simulation.data.departure && concert.simulation.data.arrival ? ` · ${concert.simulation.data.departure} → ${concert.simulation.data.arrival}` : ''}
                </p>
              )}
            </div>
            <Link
              href="/outils/kilometrique"
              className="text-[10px] font-medium text-amber-700 hover:text-amber-900 underline flex-shrink-0"
            >
              Voir →
            </Link>
          </div>
        </div>
      ) : isChef && (
        <Link
          href="/outils/kilometrique"
          className="mt-2 inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-600 transition-colors"
        >
          + Ajouter une estimation financière
        </Link>
      )}

      {(chefCan('concerts', 'update') || chefCan('concerts', 'delete')) && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
          {chefCan('concerts', 'update') && (
            <button onClick={() => openEdit(concert)}
              className="text-xs text-indigo-600 hover:text-indigo-500 font-medium">Modifier</button>
          )}
          {chefCan('concerts', 'delete') && (
            <button onClick={() => setDeleteId(concert.id)}
              className="text-xs text-red-400 hover:text-red-600 font-medium ml-auto">Supprimer</button>
          )}
        </div>
      )}

      {/* Présence + auto-évaluation */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400">Ma présence :</span>
          <PresencePicker value={concert.myAttendanceStatus} onSet={(s) => setPresence(concert.id, s)} />
        </div>
        {concertEnded(concert) && (() => {
          const evs = concert.evaluations || []
          const note = globalNote(concert)
          const iAmPresent = (concert.attendances || []).some((a) => a.userId === myId)
          const canEvaluate = (groupInfo?.hasEvaluations ?? true) && iAmPresent
          const iEvaluated = evs.some((e) => e.evaluator.id === myId)
          const expanded = expandedEvals.has(concert.id)
          return (
            <div className="mt-2">
              <div className="flex items-center gap-2 flex-wrap">
                {note !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700" title="Note globale du concert">⭐ {note.toFixed(1)} <span className="text-amber-400 font-normal">({evs.length})</span></span>
                )}
                {typeof concert.myAvgReceived === 'number' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700" title="Ta note moyenne reçue (anonyme)">👤 {concert.myAvgReceived.toFixed(1)}</span>
                )}
                {canEvaluate && (
                  <button onClick={() => setEvalConcert(concert)} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5">{iEvaluated ? 'Modifier' : 'Évaluer'}</button>
                )}
                {evs.length > 0 && (
                  <button onClick={() => setExpandedEvals((s) => { const n = new Set(s); n.has(concert.id) ? n.delete(concert.id) : n.add(concert.id); return n })} className="rounded-lg border border-gray-200 text-gray-500 text-xs font-medium px-2.5 py-1.5 hover:bg-gray-50">{expanded ? 'Masquer' : 'Détail'}</button>
                )}
              </div>
              {expanded && evs.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  {(concert.avgReceivedByUser?.length ?? 0) > 0 && (
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-2.5">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Moyennes perçues par musicien <span className="font-normal normal-case">(chef · anonyme)</span></p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                        {concert.avgReceivedByUser!.map((u) => (
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
                          {e.memberRatings.map((mr) => <span key={mr.ratedUserId} className="inline-flex items-center gap-1">{mr.ratedUser.name} <StarRating value={mr.rating} readOnly size={12} /></span>)}
                        </div>
                      )}
                      {e.songRatings.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                          {e.songRatings.map((sr) => <span key={sr.songId} className="inline-flex items-center gap-1">🎵 {sr.song.title} <StarRating value={sr.rating} readOnly size={12} /></span>)}
                        </div>
                      )}
                      {e.suggestion && <p className="mt-1 text-xs text-gray-500 italic">💬 {e.suggestion}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </Card>
  )

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">{groupInfo?.name}</Link>
        <span>/</span>
        <span className="text-gray-900">Concerts</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Concerts</h1>
        {chefCan('concerts', 'create') && <Button onClick={() => setCreateOpen(true)}>+ Nouveau concert</Button>}
      </div>

      <div className="mb-8">
        <h2 className="text-base font-semibold text-gray-700 mb-3">À venir ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <Card><p className="text-sm text-gray-500 text-center py-6">Aucun concert à venir.</p></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((c) => <ConcertCard key={c.id} concert={c} />)}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Passés ({past.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {past.slice().reverse().map((c) => <ConcertCard key={c.id} concert={c} dim />)}
          </div>
        </div>
      )}

      {/* Évaluation modal */}
      {evalConcert && (
        <EvaluationModal
          endpoint={`/api/concerts/${evalConcert.id}/evaluation`}
          title={evalConcert.name}
          onClose={() => setEvalConcert(null)}
          onSaved={fetchData}
        />
      )}

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => { setCreateOpen(false); setError('') }} title="Nouveau concert">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="form-label">Nom du concert <span className="text-red-500">*</span></label>
            <input type="text" required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-input" placeholder="ex: Concert de fin d'année" />
          </div>
          <div>
            <label className="form-label">Date <span className="text-red-500">*</span></label>
            <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="form-input" />
            {form.date && (() => {
              const day = form.date
              const busy = unavs.filter((u) => u.startDate.slice(0, 10) <= day && day <= u.endDate.slice(0, 10))
              if (busy.length === 0) return <p className="mt-1.5 text-xs text-green-600">✅ Aucun membre indisponible ce jour-là.</p>
              return (
                <div className="mt-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  ⚠️ <strong>{busy.length} indisponible{busy.length > 1 ? 's' : ''}</strong> ce jour : {busy.map((u) => u.user.name + (u.note ? ` (${u.note})` : '')).join(', ')}
                </div>
              )
            })()}
          </div>
          <ConcertVenueLogistics form={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} />
          <ConcertValidationFields form={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} members={members} />
          <SetlistSelect value={form.setlistId} onChange={(v) => setForm({ ...form, setlistId: v })} />
          <div>
            <label className="form-label">Notes <span className="text-gray-400 font-normal">(optionnel)</span></label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="form-input resize-none" rows={3} />
          </div>
          {/* Visibilité publique */}
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Visible sur la page publique</p>
              <p className="text-xs text-gray-400 mt-0.5">Les visiteurs non connectés pourront voir ce concert</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, isPublic: !f.isPublic }))}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.isPublic ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); setError('') }}>Annuler</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Créer le concert'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editConcert} onClose={() => setEditConcert(null)} title="Modifier le concert">
        <form onSubmit={handleEdit} className="space-y-4">
          {editError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{editError}</div>}
          <div>
            <label className="form-label">Nom <span className="text-red-500">*</span></label>
            <input type="text" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Date <span className="text-red-500">*</span></label>
            <input type="date" required value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="form-input" />
          </div>
          <ConcertVenueLogistics form={editForm} onChange={(p) => setEditForm((f) => ({ ...f, ...p }))} />
          <ConcertValidationFields form={editForm} onChange={(p) => setEditForm((f) => ({ ...f, ...p }))} members={members} />
          <SetlistSelect value={editForm.setlistId} onChange={(v) => setEditForm({ ...editForm, setlistId: v })} />
          <div>
            <label className="form-label">Notes <span className="text-gray-400 font-normal">(optionnel)</span></label>
            <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="form-input resize-none" rows={3} />
          </div>
          {/* Visibilité publique */}
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Visible sur la page publique</p>
              <p className="text-xs text-gray-400 mt-0.5">Les visiteurs non connectés pourront voir ce concert</p>
            </div>
            <button
              type="button"
              onClick={() => setEditForm(f => ({ ...f, isPublic: !f.isPublic }))}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${editForm.isPublic ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editForm.isPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditConcert(null)}>Annuler</Button>
            <Button type="submit" disabled={editSaving}>{editSaving ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteId(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Supprimer ce concert ?</h3>
                <p className="text-sm text-gray-500 mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors">
                Supprimer
              </button>
              <button onClick={() => setDeleteId(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

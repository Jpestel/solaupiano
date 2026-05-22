'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { formatDateWithDay } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface SetlistRef { id: number; name: string; _count: { songs: number } }
interface Concert {
  id: number; name: string; date: string; location: string; notes?: string
  setlist?: SetlistRef | null
}
interface GroupInfo { name: string; groupRole: string }

const EMPTY_FORM = { name: '', date: '', location: '', notes: '', setlistId: '' }

export default function ConcertsPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const groupId = params.id

  const [concerts, setConcerts] = useState<Concert[]>([])
  const [setlists, setSetlists] = useState<SetlistRef[]>([])
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null)
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
    const [concRes, grpRes, slRes] = await Promise.all([
      fetch(`/api/groupes/${groupId}/concerts`),
      fetch(`/api/groupes/${groupId}`),
      fetch(`/api/groupes/${groupId}/setlists`),
    ])
    if (concRes.ok) setConcerts(await concRes.json())
    if (slRes.ok) setSetlists(await slRes.json())
    if (grpRes.ok) {
      const g = await grpRes.json()
      const me = g.members?.find((m: any) => m.userId === Number(session?.user?.id))
      const role = session?.user?.siteRole === 'ADMIN' ? 'CHEF' : (me?.groupRole || 'MEMBRE')
      setGroupInfo({ name: g.name, groupRole: role })
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
      body: JSON.stringify({ ...form, setlistId: form.setlistId ? Number(form.setlistId) : null }),
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
  const upcoming = concerts.filter((c) => new Date(c.date) >= now)
  const past = concerts.filter((c) => new Date(c.date) < now)

  if (loading) return <div className="text-gray-500">Chargement...</div>

  const isChef = groupInfo?.groupRole === 'CHEF'

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
        <h3 className={`font-semibold ${dim ? 'text-gray-600' : 'text-gray-900'}`}>{concert.name}</h3>
        <span className="text-2xl flex-shrink-0">🎭</span>
      </div>
      <p className={`text-sm font-medium capitalize ${dim ? 'text-gray-400' : 'text-indigo-600'}`}>{formatDateWithDay(concert.date)}</p>
      <p className="text-sm text-gray-500 mt-1">{concert.location}</p>

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

      {isChef && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
          <button onClick={() => openEdit(concert)}
            className="text-xs text-indigo-600 hover:text-indigo-500 font-medium">Modifier</button>
          <button onClick={() => setDeleteId(concert.id)}
            className="text-xs text-red-400 hover:text-red-600 font-medium ml-auto">Supprimer</button>
        </div>
      )}
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
        {isChef && <Button onClick={() => setCreateOpen(true)}>+ Nouveau concert</Button>}
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
          </div>
          <div>
            <label className="form-label">Lieu <span className="text-red-500">*</span></label>
            <input type="text" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="form-input" placeholder="Salle des fêtes, adresse..." />
          </div>
          <SetlistSelect value={form.setlistId} onChange={(v) => setForm({ ...form, setlistId: v })} />
          <div>
            <label className="form-label">Notes <span className="text-gray-400 font-normal">(optionnel)</span></label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="form-input resize-none" rows={3} />
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
          <div>
            <label className="form-label">Lieu <span className="text-red-500">*</span></label>
            <input type="text" required value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="form-input" />
          </div>
          <SetlistSelect value={editForm.setlistId} onChange={(v) => setEditForm({ ...editForm, setlistId: v })} />
          <div>
            <label className="form-label">Notes <span className="text-gray-400 font-normal">(optionnel)</span></label>
            <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="form-input resize-none" rows={3} />
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

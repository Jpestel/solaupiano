'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface Song { id: number; title: string; artist?: string }
interface SetlistEntry { song: Song; position: number }
interface Concert { id: number; name: string; date: string }
interface Setlist {
  id: number; name: string; description?: string; groupId: number
  songs: SetlistEntry[]; concerts: Concert[]
}
interface GroupSong { id: number; title: string; artist?: string }

function DragHandle() {
  return (
    <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5" cy="4" r="1.2" /><circle cx="5" cy="8" r="1.2" /><circle cx="5" cy="12" r="1.2" />
      <circle cx="11" cy="4" r="1.2" /><circle cx="11" cy="8" r="1.2" /><circle cx="11" cy="12" r="1.2" />
    </svg>
  )
}

function SortableSongRow({ entry, index, isChef, removingId, onRemove }: {
  entry: SetlistEntry; index: number; isChef: boolean
  removingId: number | null; onRemove: (id: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.song.id, disabled: !isChef,
  })

  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 group ${isDragging ? 'shadow-lg ring-2 ring-indigo-300 z-50 opacity-90' : ''}`}
    >
      {isChef && (
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
          <DragHandle />
        </div>
      )}
      <span className="w-6 text-center text-sm font-bold text-indigo-400 flex-shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{entry.song.title}</p>
        {entry.song.artist && <p className="text-xs text-gray-500">{entry.song.artist}</p>}
      </div>
      {isChef && (
        <button onClick={() => onRemove(entry.song.id)} disabled={removingId === entry.song.id}
          className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 flex-shrink-0"
          title="Retirer de la setlist">
          ✕
        </button>
      )}
    </div>
  )
}

export default function SetlistDetailPage({ params }: { params: { id: string; setlistId: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const groupId = params.id
  const setlistId = params.setlistId

  const [setlist, setSetlist] = useState<Setlist | null>(null)
  const [songs, setSongs] = useState<SetlistEntry[]>([])
  const [groupSongs, setGroupSongs] = useState<GroupSong[]>([])
  const [groupRole, setGroupRole] = useState<string>('MEMBRE')
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [addingId, setAddingId] = useState<number | null>(null)

  // Rename state
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameForm, setRenameForm] = useState({ name: '', description: '' })
  const [renameSaving, setRenameSaving] = useState(false)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    const [slRes, grpRes, songsRes] = await Promise.all([
      fetch(`/api/setlists/${setlistId}`),
      fetch(`/api/groupes/${groupId}`),
      fetch(`/api/groupes/${groupId}/morceaux`),
    ])
    if (slRes.ok) {
      const sl: Setlist = await slRes.json()
      setSetlist(sl)
      setSongs(sl.songs)
    }
    if (grpRes.ok) {
      const g = await grpRes.json()
      const me = g.members?.find((m: any) => m.userId === Number(session?.user?.id))
      const role = session?.user?.siteRole === 'ADMIN' ? 'CHEF' : (me?.groupRole || 'MEMBRE')
      setGroupRole(role)
      setGroupName(g.name)
    }
    if (songsRes.ok) setGroupSongs(await songsRes.json())
    setLoading(false)
  }, [session, setlistId, groupId])

  useEffect(() => { if (session) fetchData() }, [session, fetchData])

  const isChef = groupRole === 'CHEF'

  const addSong = async (songId: number) => {
    setAddingId(songId)
    await fetch(`/api/setlists/${setlistId}/morceaux`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId }),
    })
    setAddingId(null)
    fetchData()
  }

  const removeSong = async (songId: number) => {
    setRemovingId(songId)
    await fetch(`/api/setlists/${setlistId}/morceaux`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId }),
    })
    setRemovingId(null)
    fetchData()
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = songs.findIndex((s) => s.song.id === Number(active.id))
    const newIndex = songs.findIndex((s) => s.song.id === Number(over.id))
    const newSongs = arrayMove(songs, oldIndex, newIndex)
    setSongs(newSongs)
    fetch(`/api/setlists/${setlistId}/morceaux/order`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songIds: newSongs.map((s) => s.song.id) }),
    })
  }

  const openRename = () => {
    setRenameForm({ name: setlist?.name || '', description: setlist?.description || '' })
    setRenameOpen(true)
  }

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault()
    setRenameSaving(true)
    const res = await fetch(`/api/setlists/${setlistId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(renameForm),
    })
    setRenameSaving(false)
    if (res.ok) { setRenameOpen(false); fetchData() }
  }

  const handleDelete = async () => {
    setDeleting(true)
    await fetch(`/api/setlists/${setlistId}`, { method: 'DELETE' })
    router.push(`/groupes/${groupId}/setlists`)
    router.refresh()
  }

  const setlistIds = new Set(songs.map((s) => s.song.id))
  const availableSongs = groupSongs.filter((s) => !setlistIds.has(s.id))

  if (loading) return <div className="text-gray-500">Chargement...</div>
  if (!setlist) return <div className="text-gray-500">Setlist introuvable.</div>

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">{groupName}</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}/setlists`} className="hover:text-indigo-600">Setlists</Link>
        <span>/</span>
        <span className="text-gray-900 truncate max-w-[160px]">{setlist.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{setlist.name}</h1>
          {setlist.description && <p className="text-gray-500 mt-1 text-sm">{setlist.description}</p>}
          <p className="text-sm text-gray-400 mt-1">{songs.length} morceau{songs.length > 1 ? 'x' : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Print button — visible for all members */}
          <button
            onClick={() => {
              const sorted = [...songs].sort((a, b) => a.position - b.position)
              const rows = sorted.map((e, i) => `
                <tr>
                  <td style="width:36px;text-align:center;font-weight:700;color:#6366f1;padding:10px 8px;font-size:15px;">${i + 1}</td>
                  <td style="padding:10px 12px 10px 0;border-bottom:1px solid #f3f4f6;">
                    <div style="font-size:14px;font-weight:600;color:#111;">${e.song.title}</div>
                    ${e.song.artist ? `<div style="font-size:12px;color:#9ca3af;margin-top:2px;">${e.song.artist}</div>` : ''}
                  </td>
                </tr>`).join('')
              const concertsHtml = setlist.concerts.length > 0 ? `
                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px;margin:14px 0 24px">
                  <div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:6px">🎭 Concert${setlist.concerts.length > 1 ? 's' : ''}</div>
                  ${setlist.concerts.map(c => `
                    <div style="margin-bottom:6px">
                      <div style="font-size:15px;font-weight:700;color:#111;">${c.name}</div>
                      <div style="font-size:13px;color:#6b7280;">${new Date(c.date).toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</div>
                    </div>`).join('')}
                </div>` : ''
              const pw = window.open('', '_blank', 'width=720,height=960')
              if (!pw) return
              pw.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
                <title>${setlist.name}</title>
                <style>
                  *{margin:0;padding:0;box-sizing:border-box}
                  body{font-family:-apple-system,Arial,sans-serif;padding:40px;color:#111;max-width:640px;margin:0 auto}
                  .actions{text-align:center;margin-bottom:28px;display:flex;gap:10px;justify-content:center}
                  .actions button{padding:10px 22px;border-radius:8px;border:none;cursor:pointer;font-size:14px;font-weight:600}
                  .btn-print{background:#6366f1;color:white}.btn-close{background:#f3f4f6;color:#374151}
                  .badge{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6366f1;margin-bottom:6px}
                  h1{font-size:26px;font-weight:800;color:#111;margin-bottom:4px}
                  .desc{font-size:13px;color:#6b7280;margin-top:4px;margin-bottom:12px}
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
                <h1>${setlist.name}</h1>
                ${setlist.description ? `<div class="desc">${setlist.description}</div>` : ''}
                ${concertsHtml}
                <table>${rows}</table>
                <div class="footer">
                  <span>${sorted.length} morceau${sorted.length > 1 ? 'x' : ''}</span>
                  <span>Imprimé le ${new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}</span>
                </div>
              </body></html>`)
              pw.document.close()
            }}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            🖨️ Imprimer
          </button>

          {isChef && (
            <>
              <button onClick={openRename}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Renommer
              </button>
              <button onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors">
                Supprimer
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Setlist editor */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title={`Programme (${songs.length} morceau${songs.length > 1 ? 'x' : ''})`} />

            {songs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                {isChef ? 'Ajoutez des morceaux depuis le répertoire ci-dessous.' : 'Aucun morceau dans cette setlist.'}
              </p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={songs.map((s) => s.song.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {songs.map((entry, index) => (
                      <SortableSongRow key={entry.song.id} entry={entry} index={index}
                        isChef={isChef} removingId={removingId} onRemove={removeSong} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {isChef && availableSongs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">Ajouter depuis le répertoire</p>
                <div className="flex flex-wrap gap-2">
                  {availableSongs.map((song) => (
                    <button key={song.id} onClick={() => addSong(song.id)} disabled={addingId === song.id}
                      className="flex items-center gap-1.5 rounded-full border border-dashed border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors">
                      <span>+</span>
                      <span>{song.title}{song.artist ? ` — ${song.artist}` : ''}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isChef && availableSongs.length === 0 && groupSongs.length > 0 && (
              <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100 text-center">
                Tous les morceaux du répertoire sont déjà dans cette setlist.
              </p>
            )}

            {groupSongs.length === 0 && (
              <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100 text-center">
                <Link href={`/groupes/${groupId}/morceaux`} className="text-indigo-600 hover:underline">
                  Ajoutez des morceaux au répertoire
                </Link>{' '}pour les inclure dans cette setlist.
              </p>
            )}
          </Card>
        </div>

        {/* Right column: concerts */}
        <div>
          <Card>
            <CardHeader title="Concerts associés" />
            {setlist.concerts.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-2">Aucun concert associé.</p>
                <Link href={`/groupes/${groupId}/concerts`}
                  className="text-xs text-indigo-600 hover:text-indigo-500 font-medium">
                  Associer depuis les concerts →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {setlist.concerts.map((c) => (
                  <div key={c.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500 capitalize mt-0.5">
                      {new Date(c.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                ))}
                <Link href={`/groupes/${groupId}/concerts`}
                  className="block text-center text-xs text-indigo-600 hover:text-indigo-500 font-medium pt-1">
                  Gérer les concerts →
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Rename modal */}
      <Modal isOpen={renameOpen} onClose={() => setRenameOpen(false)} title="Modifier la setlist">
        <form onSubmit={handleRename} className="space-y-4">
          <div>
            <label className="form-label">Nom <span className="text-red-500">*</span></label>
            <input type="text" required autoFocus value={renameForm.name}
              onChange={(e) => setRenameForm({ ...renameForm, name: e.target.value })}
              className="form-input" />
          </div>
          <div>
            <label className="form-label">Description <span className="text-gray-400 font-normal">(optionnel)</span></label>
            <textarea rows={2} value={renameForm.description}
              onChange={(e) => setRenameForm({ ...renameForm, description: e.target.value })}
              className="form-input resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setRenameOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={renameSaving}>{renameSaving ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteConfirm(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Supprimer « {setlist.name} » ?</h3>
                <p className="text-sm text-gray-500 mt-0.5">Les concerts associés ne seront pas supprimés.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60 transition-colors">
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
              <button onClick={() => setDeleteConfirm(false)}
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

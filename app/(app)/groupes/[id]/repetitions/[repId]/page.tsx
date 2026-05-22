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
import { formatDateWithDay, getResourceIcon, getVideoEmbedUrl } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { AttendanceBadge } from '@/components/ui/Badge'
import { AttendanceButton } from '@/components/AttendanceButton'
import { VideoModal } from '@/components/ui/VideoModal'
import { PdfModal } from '@/components/ui/PdfModal'

interface Resource { id: number; name: string; type: string; filePath: string }
interface Song { id: number; title: string; artist?: string; resources: Resource[] }
type SongProgressStatus = 'A_TRAVAILLER' | 'EN_COURS' | 'MAITRISE'
interface MemberProgress { userId: number; userName: string; status: SongProgressStatus }
interface RehearsalSongEntry { song: Song; position: number; userProgress: SongProgressStatus; membersProgress: MemberProgress[] | null }
interface Attendance { userId: number; status: 'PRESENT' | 'ABSENT' | 'INCERTAIN'; user: { id: number; name: string } }
interface Rehearsal {
  id: number; date: string; location: string; startTime: string; endTime?: string; notes?: string; groupId: number
  songs: RehearsalSongEntry[]; attendances: Attendance[]
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

const STATUS_DOT: Record<SongProgressStatus, { bg: string; border: string; text: string; label: string }> = {
  A_TRAVAILLER: { bg: 'bg-gray-100',   border: 'border-gray-300',  text: 'text-gray-500',  label: 'À travailler' },
  EN_COURS:     { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-600', label: 'En cours...' },
  MAITRISE:     { bg: 'bg-green-100',  border: 'border-green-300',  text: 'text-green-700', label: 'Je maîtrise' },
}

function MembersProgressPanel({ members }: { members: MemberProgress[] }) {
  const total = members.length
  const mastered = members.filter((m) => m.status === 'MAITRISE').length
  const allMastered = mastered === total

  return (
    <div className={`border-t px-4 py-2.5 ${allMastered ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-1.5">
          {members.map((m) => {
            const s = STATUS_DOT[m.status as SongProgressStatus] ?? STATUS_DOT.A_TRAVAILLER
            return (
              <div
                key={m.userId}
                title={`${m.userName} — ${s.label}`}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.bg} ${s.border} ${s.text}`}
              >
                <span className="font-bold">{m.userName.charAt(0).toUpperCase()}</span>
                <span className="hidden sm:inline truncate max-w-[80px]">{m.userName.split(' ')[0]}</span>
              </div>
            )
          })}
        </div>
        <div className={`flex-shrink-0 text-xs font-semibold ${allMastered ? 'text-green-700' : 'text-gray-400'}`}>
          {allMastered ? '✓ Tous maîtrisent' : `${mastered}/${total} maîtrisent`}
        </div>
      </div>
    </div>
  )
}

const PROGRESS_CYCLE: SongProgressStatus[] = ['A_TRAVAILLER', 'EN_COURS', 'MAITRISE']

const PROGRESS_CONFIG: Record<SongProgressStatus, { label: string; className: string; icon: string }> = {
  A_TRAVAILLER: {
    label: 'À travailler',
    className: 'bg-white border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-500',
    icon: '○',
  },
  EN_COURS: {
    label: 'En cours...',
    className: 'bg-orange-50 border-orange-300 text-orange-600',
    icon: '◑',
  },
  MAITRISE: {
    label: 'Je maîtrise',
    className: 'bg-green-100 border-green-300 text-green-700',
    icon: '●',
  },
}

function SortableSongRow({
  entry, index, isChef, expandedSongIds, toggleResources, removingId, removeSong, cycleProgress, onVideoClick, onPdfClick,
}: {
  entry: RehearsalSongEntry
  index: number
  isChef: boolean
  expandedSongIds: Set<number>
  toggleResources: (id: number) => void
  removingId: number | null
  removeSong: (id: number) => void
  cycleProgress: (id: number, current: SongProgressStatus) => void
  onVideoClick: (embedUrl: string, title: string) => void
  onPdfClick: (url: string, title: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.song.id,
    disabled: !isChef,
  })
  const { song } = entry
  const prog = PROGRESS_CONFIG[entry.userProgress]

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl border border-gray-100 bg-gray-50 overflow-hidden ${isDragging ? 'shadow-lg ring-2 ring-indigo-300 z-50 opacity-90' : ''}`}
    >
      <div className="flex items-center gap-3 px-4 py-3 group">
        {isChef && (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
            <DragHandle />
          </div>
        )}
        <span className="text-sm font-semibold text-gray-400 w-5 flex-shrink-0 select-none">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{song.title}</p>
          {song.artist && <p className="text-xs text-gray-500">{song.artist}</p>}
        </div>

        <button
          onClick={() => cycleProgress(song.id, entry.userProgress)}
          title="Changer le statut de travail"
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-all flex-shrink-0 ${prog.className}`}
        >
          <span className="text-sm leading-none">{prog.icon}</span>
          {prog.label}
        </button>

        {isChef && (
          <button
            onClick={() => removeSong(song.id)}
            disabled={removingId === song.id}
            className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 flex-shrink-0"
            title="Retirer de la setlist"
          >
            ✕
          </button>
        )}
      </div>

      {/* Chef: members progress panel */}
      {isChef && entry.membersProgress && entry.membersProgress.length > 0 && (
        <MembersProgressPanel members={entry.membersProgress} />
      )}

      {song.resources.length > 0 && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => toggleResources(song.id)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <span>{song.resources.length} fichier{song.resources.length > 1 ? 's' : ''}</span>
            <svg className={`w-4 h-4 transition-transform ${expandedSongIds.has(song.id) ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSongIds.has(song.id) && (
            <div className="border-t border-gray-100 px-4 py-3 space-y-2">
              {song.resources.map((res) => {
                if (res.type === 'AUDIO') {
                  return (
                    <div key={res.id}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{getResourceIcon(res.type)}</span>
                        <span className="text-xs font-medium text-gray-700">{res.name}</span>
                      </div>
                      <audio controls src={res.filePath} className="w-full" style={{ height: '32px' }} />
                    </div>
                  )
                }
                if (res.type === 'PDF') {
                  return (
                    <div key={res.id}>
                      <button
                        onClick={() => onPdfClick(`/api/ressources/${res.id}`, res.name)}
                        className="w-full flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 hover:border-indigo-400 hover:bg-indigo-50 transition-colors group text-left"
                      >
                        <span className="text-base">📄</span>
                        <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700 flex-1 truncate">{res.name}</span>
                        <span className="text-[10px] font-semibold text-indigo-500 group-hover:text-indigo-700 flex-shrink-0">Lire</span>
                      </button>
                    </div>
                  )
                }
                const embedUrl = res.type === 'LIEN' ? getVideoEmbedUrl(res.filePath) : null
                if (embedUrl) {
                  return (
                    <div key={res.id}>
                      <button
                        onClick={() => onVideoClick(embedUrl, res.name)}
                        className="w-full flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 hover:border-indigo-400 hover:bg-indigo-50 transition-colors group text-left"
                      >
                        <span className="text-base">▶️</span>
                        <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700 flex-1 truncate">{res.name}</span>
                        <span className="text-[10px] font-semibold text-indigo-500 group-hover:text-indigo-700 flex-shrink-0">Lire</span>
                      </button>
                    </div>
                  )
                }
                return (
                  <div key={res.id}>
                    <a
                      href={res.type === 'LIEN' ? res.filePath : `/api/ressources/${res.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
                    >
                      <span className="text-base">{getResourceIcon(res.type)}</span>
                      <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700 flex-1 truncate">{res.name}</span>
                      <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function RepetitionDetailPage({ params }: { params: { id: string; repId: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [rehearsal, setRehearsal] = useState<Rehearsal | null>(null)
  const [songs, setSongs] = useState<RehearsalSongEntry[]>([])
  const [groupInfo, setGroupInfo] = useState<{ name: string; groupRole: string; memberCount: number } | null>(null)
  const [groupSongs, setGroupSongs] = useState<GroupSong[]>([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [expandedSongIds, setExpandedSongIds] = useState<Set<number>>(new Set())
  const [videoModal, setVideoModal] = useState<{ embedUrl: string; title: string } | null>(null)
  const [pdfModal, setPdfModal] = useState<{ url: string; title: string } | null>(null)

  // Edit state
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ date: '', location: '', startTime: '', endTime: '', notes: '' })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Reminder state
  const [reminderSending, setReminderSending] = useState(false)
  const [reminderResult, setReminderResult] = useState<{ sent: number } | { error: string } | null>(null)

  const toggleResources = (songId: number) => {
    setExpandedSongIds((prev) => {
      const next = new Set(prev)
      next.has(songId) ? next.delete(songId) : next.add(songId)
      return next
    })
  }

  const fetchData = useCallback(async () => {
    const [repRes, grpRes, songsRes] = await Promise.all([
      fetch(`/api/repetitions/${params.repId}`),
      fetch(`/api/groupes/${params.id}`),
      fetch(`/api/groupes/${params.id}/morceaux`),
    ])
    if (repRes.ok) {
      const r: Rehearsal = await repRes.json()
      setRehearsal(r)
      setSongs(r.songs)
    }
    if (grpRes.ok) {
      const g = await grpRes.json()
      const me = g.members?.find((m: { userId: number; groupRole: string }) => m.userId === Number(session?.user?.id))
      const role = session?.user?.siteRole === 'ADMIN' ? 'CHEF' : (me?.groupRole || 'MEMBRE')
      setGroupInfo({ name: g.name, groupRole: role, memberCount: g.members?.length ?? 0 })
    }
    if (songsRes.ok) setGroupSongs(await songsRes.json())
    setLoading(false)
  }, [session, params.repId, params.id])

  useEffect(() => { if (session) fetchData() }, [session, fetchData])

  const openEdit = () => {
    if (!rehearsal) return
    setEditForm({
      date: rehearsal.date.slice(0, 10),
      location: rehearsal.location,
      startTime: rehearsal.startTime,
      endTime: rehearsal.endTime || '',
      notes: rehearsal.notes || '',
    })
    setEditError('')
    setEditOpen(true)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditLoading(true)
    setEditError('')
    const res = await fetch(`/api/repetitions/${params.repId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: editForm.date,
        location: editForm.location,
        startTime: editForm.startTime,
        endTime: editForm.endTime || null,
        notes: editForm.notes || null,
      }),
    })
    setEditLoading(false)
    if (!res.ok) { setEditError('Erreur lors de la sauvegarde.'); return }
    setEditOpen(false)
    fetchData()
  }

  const handleDelete = async () => {
    setDeleting(true)
    await fetch(`/api/repetitions/${params.repId}`, { method: 'DELETE' })
    router.push(`/groupes/${params.id}/repetitions`)
    router.refresh()
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = songs.findIndex((s) => s.song.id === Number(active.id))
    const newIndex = songs.findIndex((s) => s.song.id === Number(over.id))
    const newSongs = arrayMove(songs, oldIndex, newIndex)
    setSongs(newSongs)
    fetch(`/api/repetitions/${params.repId}/morceaux/order`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songIds: newSongs.map((s) => s.song.id) }),
    })
  }

  const addSong = async (songId: number) => {
    setAddingId(songId)
    await fetch(`/api/repetitions/${params.repId}/morceaux`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId }),
    })
    setAddingId(null)
    fetchData()
  }

  const removeSong = async (songId: number) => {
    setRemovingId(songId)
    await fetch(`/api/repetitions/${params.repId}/morceaux`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId }),
    })
    setRemovingId(null)
    fetchData()
  }

  const cycleProgress = async (songId: number, current: SongProgressStatus) => {
    const nextIndex = (PROGRESS_CYCLE.indexOf(current) + 1) % PROGRESS_CYCLE.length
    const next = PROGRESS_CYCLE[nextIndex]
    // Optimistic update du bouton
    setSongs((prev) => prev.map((s) => s.song.id === songId ? { ...s, userProgress: next } : s))
    await fetch(`/api/morceaux/${songId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    // Rafraîchir pour mettre à jour membersProgress et les compteurs
    fetchData()
  }

  const sendReminder = async () => {
    setReminderSending(true)
    setReminderResult(null)
    const res = await fetch(`/api/repetitions/${params.repId}/rappel`, { method: 'POST' })
    setReminderSending(false)
    if (res.ok) {
      const data = await res.json()
      setReminderResult({ sent: data.sent })
    } else {
      setReminderResult({ error: 'Erreur lors de l\'envoi.' })
    }
  }

  if (loading) return <div className="text-gray-500">Chargement...</div>
  if (!rehearsal) return <div className="text-gray-500">Répétition introuvable.</div>

  const myUserId = Number(session?.user?.id)
  const myAttendance = rehearsal.attendances.find((a) => a.userId === myUserId)
  const isChef = groupInfo?.groupRole === 'CHEF'

  const setlistIds = new Set(songs.map((s) => s.song.id))
  const availableSongs = groupSongs.filter((s) => !setlistIds.has(s.id))
  const doneCount = songs.filter((s) => s.userProgress === 'MAITRISE').length

  const respondedCount = rehearsal.attendances.filter((a) => a.status === 'PRESENT' || a.status === 'ABSENT').length
  const notRespondedCount = (groupInfo?.memberCount ?? 0) - respondedCount

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${params.id}`} className="hover:text-indigo-600">{groupInfo?.name}</Link>
        <span>/</span>
        <Link href={`/groupes/${params.id}/repetitions`} className="hover:text-indigo-600">Répétitions</Link>
        <span>/</span>
        <span className="text-gray-900">Détail</span>
      </div>

      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 capitalize">{formatDateWithDay(rehearsal.date)}</h1>
          <p className="text-gray-500 mt-1">
            {rehearsal.startTime}{rehearsal.endTime ? ` - ${rehearsal.endTime}` : ''} · {rehearsal.location}
          </p>
        </div>
        {isChef && (
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Reminder button */}
              <button
                onClick={sendReminder}
                disabled={reminderSending || notRespondedCount === 0}
                title={notRespondedCount === 0 ? 'Tous les membres ont répondu' : `Envoyer un rappel aux ${notRespondedCount} membre${notRespondedCount > 1 ? 's' : ''} sans réponse`}
                className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {reminderSending ? 'Envoi...' : `Rappel${notRespondedCount > 0 ? ` (${notRespondedCount})` : ''}`}
              </button>
              <button
                onClick={openEdit}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Modifier
              </button>
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Supprimer
              </button>
            </div>
            {/* Reminder feedback */}
            {reminderResult && (
              <div className={`text-xs px-3 py-1.5 rounded-lg border ${'sent' in reminderResult
                ? reminderResult.sent === 0
                  ? 'bg-gray-50 border-gray-200 text-gray-500'
                  : 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {'sent' in reminderResult
                  ? reminderResult.sent === 0
                    ? 'Tous les membres ont déjà répondu.'
                    : `✓ ${reminderResult.sent} rappel${reminderResult.sent > 1 ? 's' : ''} envoyé${reminderResult.sent > 1 ? 's' : ''}`
                  : reminderResult.error
                }
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Setlist */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader
              title={`Morceaux à préparer (${songs.length})`}
              subtitle={songs.length > 0 ? `${doneCount}/${songs.length} maîtrisé${doneCount > 1 ? 's' : ''}` : undefined}
            />

            {songs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Aucun morceau au programme.</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={songs.map((s) => s.song.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {songs.map((entry, index) => (
                      <SortableSongRow
                        key={entry.song.id}
                        entry={entry}
                        index={index}
                        isChef={isChef}
                        expandedSongIds={expandedSongIds}
                        toggleResources={toggleResources}
                        removingId={removingId}
                        removeSong={removeSong}
                        cycleProgress={cycleProgress}
                        onVideoClick={(embedUrl, title) => setVideoModal({ embedUrl, title })}
                        onPdfClick={(url, title) => setPdfModal({ url, title })}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {isChef && availableSongs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">Ajouter un morceau au programme</p>
                <div className="flex flex-wrap gap-2">
                  {availableSongs.map((song) => (
                    <button
                      key={song.id}
                      onClick={() => addSong(song.id)}
                      disabled={addingId === song.id}
                      className="flex items-center gap-1.5 rounded-full border border-dashed border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                    >
                      <span>+</span>
                      <span>{song.title}{song.artist ? ` — ${song.artist}` : ''}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isChef && availableSongs.length === 0 && groupSongs.length > 0 && (
              <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100 text-center">
                Tous les morceaux du répertoire sont déjà au programme.
              </p>
            )}

            {isChef && groupSongs.length === 0 && (
              <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100 text-center">
                <Link href={`/groupes/${params.id}/morceaux`} className="text-indigo-600 hover:underline">
                  Ajoutez des morceaux au répertoire
                </Link>{' '}pour les programmer ici.
              </p>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className={`rounded-xl border-2 shadow-sm p-6 bg-white ${
            myAttendance?.status === 'PRESENT'
              ? 'border-green-300'
              : myAttendance?.status === 'ABSENT'
                ? 'border-red-300'
                : 'border-amber-300'
          }`}>
            <CardHeader
              title="Serez-vous présent(e) ?"
              subtitle={
                myAttendance?.status === 'PRESENT' ? '✓ Vous avez confirmé votre présence'
                : myAttendance?.status === 'ABSENT' ? 'Vous avez déclaré votre absence'
                : undefined
              }
            />
            <AttendanceButton
              rehearsalId={rehearsal.id}
              currentStatus={myAttendance?.status || 'INCERTAIN'}
              onUpdate={fetchData}
            />
          </div>

          {rehearsal.notes && (
            <Card>
              <CardHeader title="Notes" />
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{rehearsal.notes}</p>
            </Card>
          )}

          <Card>
            <CardHeader title={`Présences (${rehearsal.attendances.length})`} />
            {rehearsal.attendances.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Aucune réponse pour l&apos;instant.</p>
            ) : (
              <div className="space-y-2">
                {rehearsal.attendances.map((att) => (
                  <div key={att.userId} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold">
                        {att.user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-800">{att.user.name}</span>
                    </div>
                    <AttendanceBadge status={att.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setEditOpen(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Modifier la répétition</h3>
            {editError && (
              <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</p>
            )}
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="form-label">Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  value={editForm.date}
                  onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Lieu <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={editForm.location}
                  onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                  className="form-input"
                  placeholder="Salle de répétition..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Début <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    required
                    value={editForm.startTime}
                    onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Fin <span className="text-gray-400 font-normal">(optionnel)</span></label>
                  <input
                    type="time"
                    value={editForm.endTime}
                    onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="form-input"
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Notes <span className="text-gray-400 font-normal">(optionnel)</span></label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  className="form-input resize-none"
                  placeholder="Informations complémentaires..."
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
                >
                  {editLoading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
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
                <h3 className="text-base font-semibold text-gray-900">Supprimer la répétition ?</h3>
                <p className="text-sm text-gray-500 mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60 transition-colors"
              >
                {deleting ? 'Suppression...' : 'Oui, supprimer'}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {videoModal && (
        <VideoModal
          url={videoModal.embedUrl}
          title={videoModal.title}
          onClose={() => setVideoModal(null)}
        />
      )}

      {pdfModal && (
        <PdfModal
          url={pdfModal.url}
          title={pdfModal.title}
          onClose={() => setPdfModal(null)}
        />
      )}
    </div>
  )
}

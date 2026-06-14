'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { getResourceIcon, getResourceTypeLabel, formatFileSize, getVideoEmbedUrl, isVideoFile } from '@/lib/utils'
import { resolvePermissions, type ChefPermissions } from '@/lib/permissions'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ResourceUploader } from '@/components/ResourceUploader'
import { PendingResourceUploader } from '@/components/PendingResourceUploader'
import { YouTubeSuggestModal } from '@/components/YouTubeSuggestModal'
import { FloatingAudioPlayer } from '@/components/FloatingAudioPlayer'
import { VideoModal } from '@/components/ui/VideoModal'
import { SongMetronome } from '@/components/ui/SongMetronome'
import dynamic from 'next/dynamic'
import { ph } from '@/lib/placeholders'
const PdfModal = dynamic(() => import('@/components/ui/PdfModal').then((m) => m.PdfModal), { ssr: false })
const ScoreAnnotator = dynamic(() => import('@/components/ui/ScoreAnnotator').then((m) => m.ScoreAnnotator), { ssr: false })

interface Resource {
  id: number
  name: string
  type: string
  fileSize?: number
  filePath: string
}

interface Song {
  id: number
  title: string
  artist?: string
  notes?: string
  durationSeconds?: number | null
  tempo?: number | null
  resources: Resource[]
  lyrics?: { id: number } | null
  tab?: { id: number } | null
  chordCharts?: { id: number; title: string }[]
  _count?: { sequences: number }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function parseDuration(val: string): number | null {
  const trimmed = val.trim()
  if (!trimmed) return null
  const match = trimmed.match(/^(\d{1,3}):(\d{2})$/)
  if (match) {
    const minutes = parseInt(match[1], 10)
    const seconds = parseInt(match[2], 10)
    if (seconds >= 60) return null
    return minutes * 60 + seconds
  }
  return null
}

interface GroupInfo {
  name: string
  groupRole: string
  createdBy: number | null
  chefPermissions: unknown
  uploadEnabled: boolean
  hasMetronome: boolean
  hasParoles: boolean
  hasSequences: boolean
  hasGrilles: boolean
}

interface PendingResource {
  id: number
  name: string
  type: string
  fileSize?: number
  filePath: string
  createdAt: string
  song: { id: number; title: string }
  user: { id: number; name: string }
}

export default function MorceauxPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const groupId = params.id
  const [songs, setSongs] = useState<Song[]>([])
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [addSongOpen, setAddSongOpen] = useState(false)
  const [editSong, setEditSong] = useState<Song | null>(null)
  const [uploadSongId, setUploadSongId] = useState<number | null>(null)
  const [songForm, setSongForm] = useState({ title: '', artist: '', notes: '', duration: '', tempo: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expandedSongIds, setExpandedSongIds] = useState<Set<number>>(new Set())
  const [editResource, setEditResource] = useState<Resource | null>(null)
  const [resourceForm, setResourceForm] = useState({ name: '', filePath: '' })
  const [resourceError, setResourceError] = useState('')
  const [resourceSaving, setResourceSaving] = useState(false)
  const [videoModal, setVideoModal] = useState<{ embedUrl: string; title: string; local?: boolean } | null>(null)
  const [pdfModal, setPdfModal] = useState<{ url: string; title: string; kind?: 'pdf' | 'image' } | null>(null)
  const [annotate, setAnnotate] = useState<{ id: number; name: string; type: string; filePath: string } | null>(null)
  const [pendingResources, setPendingResources] = useState<PendingResource[]>([])
  const [submitSongId, setSubmitSongId] = useState<number | null>(null)
  const [pendingExpanded, setPendingExpanded] = useState(true)
  const [canImg2Pdf, setCanImg2Pdf] = useState(false)
  const [ytSuggest, setYtSuggest] = useState<{ id: number; title: string; artist: string; hasDuration: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/me/module-access?key=tool_img2pdf')
      .then((r) => r.json())
      .then((d) => setCanImg2Pdf(!!d.allowed))
      .catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    const [songsRes, grpRes] = await Promise.all([
      fetch(`/api/groupes/${groupId}/morceaux`),
      fetch(`/api/groupes/${groupId}`),
    ])
    if (songsRes.ok) setSongs(await songsRes.json())
    if (grpRes.ok) {
      const g = await grpRes.json()
      const me = g.members?.find((m: { userId: number; groupRole: string }) => m.userId === Number(session?.user?.id))
      const role = session?.user?.siteRole === 'ADMIN' ? 'CHEF' : (me?.groupRole || 'MEMBRE')
      setGroupInfo({ name: g.name, groupRole: role, createdBy: g.createdBy ?? null, chefPermissions: g.chefPermissions ?? null, uploadEnabled: g.uploadEnabled ?? false, hasMetronome: g.planFeatures?.hasMetronome ?? true, hasParoles: g.planFeatures?.hasParoles ?? true, hasSequences: g.planFeatures?.hasSequences ?? true, hasGrilles: g.planFeatures?.hasGrilles ?? true })
      if (role === 'CHEF') {
        const pendingRes = await fetch(`/api/groupes/${groupId}/soumissions`)
        if (pendingRes.ok) setPendingResources(await pendingRes.json())
      }
    }
    setLoading(false)
  }, [groupId, session])

  useEffect(() => {
    if (session) fetchData()
  }, [session, fetchData])

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const durationSeconds = parseDuration(songForm.duration)
    const res = await fetch(`/api/groupes/${groupId}/morceaux`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...songForm, durationSeconds }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Erreur.')
      return
    }
    const created = await res.json().catch(() => null)
    setAddSongOpen(false)
    setSongForm({ title: '', artist: '', notes: '', duration: '', tempo: '' })
    fetchData()
    // Propose une vidéo YouTube officielle à ajouter en ressource
    if (created?.id && created.title) {
      setYtSuggest({ id: created.id, title: created.title, artist: created.artist || '', hasDuration: !!durationSeconds })
    }
  }

  // Ouvre les suggestions (YouTube, backing tracks, ressources) pour un morceau existant.
  // N'ajoute que de nouvelles ressources — ne supprime jamais l'existant.
  const openSuggestions = (song: Song) => {
    setYtSuggest({ id: song.id, title: song.title, artist: song.artist || '', hasDuration: !!song.durationSeconds })
  }

  const openEdit = (song: Song) => {
    setEditSong(song)
    setSongForm({
      title: song.title,
      artist: song.artist || '',
      notes: song.notes || '',
      duration: song.durationSeconds ? formatDuration(song.durationSeconds) : '',
      tempo: song.tempo ? String(song.tempo) : '',
    })
    setError('')
  }

  const handleEditSong = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editSong) return
    setSaving(true)
    setError('')
    const durationSeconds = parseDuration(songForm.duration)
    const res = await fetch(`/api/groupes/${groupId}/morceaux/${editSong.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...songForm, durationSeconds }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Erreur.')
      return
    }
    setEditSong(null)
    fetchData()
  }

  const handleDeleteSong = async (song: Song) => {
    if (!confirm(`Supprimer "${song.title}" ? Cette action supprimera aussi toutes ses ressources, paroles et tablature.`)) return
    await fetch(`/api/groupes/${groupId}/morceaux/${song.id}`, { method: 'DELETE' })
    setEditSong(null)
    fetchData()
  }

  const toggleResources = (songId: number) => {
    setExpandedSongIds((prev) => {
      const next = new Set(prev)
      next.has(songId) ? next.delete(songId) : next.add(songId)
      return next
    })
  }

  const openEditResource = (res: Resource) => {
    setEditResource(res)
    setResourceForm({ name: res.name, filePath: res.filePath })
    setResourceError('')
  }

  const handleEditResource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editResource) return
    setResourceSaving(true)
    setResourceError('')
    const res = await fetch(`/api/ressources/${editResource.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resourceForm),
    })
    setResourceSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setResourceError(d.error || 'Erreur.')
      return
    }
    setEditResource(null)
    fetchData()
  }

  const handleDeleteResource = async (resourceId: number) => {
    if (!confirm('Supprimer cette ressource ?')) return
    await fetch(`/api/ressources/${resourceId}`, { method: 'DELETE' })
    fetchData()
  }

  const handleApprovePending = async (pendingId: number) => {
    await fetch(`/api/groupes/${groupId}/soumissions/${pendingId}`, { method: 'POST' })
    fetchData()
  }

  const handleRejectPending = async (pendingId: number, name: string) => {
    if (!confirm(`Refuser et supprimer « ${name} » ?`)) return
    await fetch(`/api/groupes/${groupId}/soumissions/${pendingId}`, { method: 'DELETE' })
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

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">{groupInfo?.name}</Link>
        <span>/</span>
        <span className="text-gray-900">Répertoire</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Répertoire ({songs.length})</h1>
        {chefCan('repertoire', 'create') && (
          <Button onClick={() => setAddSongOpen(true)}>+ Ajouter un morceau</Button>
        )}
      </div>

      {/* Soumissions en attente — chef only */}
      {isChef && pendingResources.length > 0 && (
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
          <button
            onClick={() => setPendingExpanded(!pendingExpanded)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-amber-600 font-semibold text-sm">
                📬 Soumissions en attente
              </span>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">
                {pendingResources.length}
              </span>
            </div>
            <svg
              className={`w-4 h-4 text-amber-600 transition-transform ${pendingExpanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {pendingExpanded && (
            <div className="border-t border-amber-200">
              {pendingResources.map((pr) => (
                <div key={pr.id} className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-amber-100 last:border-0 bg-white/60">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {getResourceIcon(pr.type)} {pr.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      🎵 {pr.song.title} · par <span className="font-medium">{pr.user.name}</span>
                      {pr.fileSize ? ` · ${formatFileSize(pr.fileSize)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApprovePending(pr.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 transition-colors"
                    >
                      ✓ Accepter
                    </button>
                    <button
                      onClick={() => handleRejectPending(pr.id, pr.name)}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 transition-colors"
                    >
                      ✕ Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {songs.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🎼</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Répertoire vide</h3>
            <p className="text-sm text-gray-500">Aucun morceau dans ce groupe pour l&apos;instant.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {songs.map((song) => (
            <Card key={song.id} padding={false} className="overflow-hidden">
              <div className="px-4 sm:px-6 py-4">
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{song.title}</h3>
                      {song.durationSeconds ? (
                        <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-600">
                          ⏱ {formatDuration(song.durationSeconds)}
                        </span>
                      ) : null}
                      {song.tempo ? <SongMetronome bpm={song.tempo} enabled={groupInfo?.hasMetronome ?? true} /> : null}
                    </div>
                    {song.artist && <p className="text-sm text-gray-500 mt-0.5">{song.artist}</p>}
                    {song.notes && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{song.notes}</p>}
                    {/* Boutons déplacés sous le titre/artiste sur mobile */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {(groupInfo?.hasParoles ?? true) ? (
                        <Link
                          href={`/groupes/${groupId}/morceaux/${song.id}/paroles`}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-rose-300 hover:text-rose-600 transition-colors"
                        >
                          🎤 Paroles
                          {song.lyrics && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 ml-0.5" />}
                        </Link>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-300 cursor-not-allowed"
                          title="Les paroles ne sont pas incluses dans l'offre de ce groupe"
                        >
                          🎤 Paroles 🔒
                        </span>
                      )}
                      <Link
                        href={`/groupes/${groupId}/morceaux/${song.id}/tablature`}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                      >
                        🎸 Tablature
                        {song.tab && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 ml-0.5" />}
                      </Link>
                      {(groupInfo?.hasSequences ?? true) ? (
                        <Link
                          href={`/groupes/${groupId}/morceaux/${song.id}/sequences`}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-emerald-300 hover:text-emerald-600 transition-colors"
                        >
                          🎚 Séquences
                          {(song._count?.sequences ?? 0) > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />}
                        </Link>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-300 cursor-not-allowed"
                          title="Le lecteur de séquences n'est pas inclus dans l'offre de ce groupe"
                        >
                          🎚 Séquences 🔒
                        </span>
                      )}
                      {(groupInfo?.hasGrilles ?? true) && song.chordCharts && song.chordCharts.length > 0 && (
                        <Link
                          href={`/groupes/${groupId}/grilles/${song.chordCharts[0].id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-colors"
                          title={song.chordCharts.length > 1 ? `${song.chordCharts.length} grilles associées` : 'Grille d\'accords'}
                        >
                          🎸 Grille
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 ml-0.5" />
                        </Link>
                      )}
                      {isChef && (chefCan('repertoire', 'update') || chefCan('repertoire', 'delete')) && (
                        <Button variant="ghost" size="sm" onClick={() => openEdit(song)}>
                          Éditer
                        </Button>
                      )}
                      {chefCan('ressources', 'create') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUploadSongId(song.id === uploadSongId ? null : song.id)}
                        >
                          + Ressource
                        </Button>
                      )}
                      {!isChef && groupInfo?.uploadEnabled && (
                        <button
                          onClick={() => setSubmitSongId(song.id === submitSongId ? null : song.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700 hover:border-amber-400 hover:bg-amber-50 transition-colors"
                        >
                          📬 Proposer un fichier
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload panel — chef */}
              {isChef && uploadSongId === song.id && (
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                  <ResourceUploader
                    songId={song.id}
                    uploadEnabled={groupInfo?.uploadEnabled ?? false}
                    canImg2Pdf={canImg2Pdf}
                    onUpload={() => { setUploadSongId(null); fetchData() }}
                  />
                </div>
              )}

              {/* Submit panel — member */}
              {!isChef && submitSongId === song.id && (
                <div className="px-6 py-4 border-t border-amber-100 bg-amber-50/40">
                  <PendingResourceUploader
                    groupId={groupId}
                    songId={song.id}
                    onSubmit={() => { setSubmitSongId(null) }}
                  />
                </div>
              )}

              {/* Resources toggle */}
              {song.resources.length > 0 && (
                <div className="border-t border-gray-100">
                  <button
                    onClick={() => toggleResources(song.id)}
                    className="w-full flex items-center justify-between px-6 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    <span>
                      {song.resources.length} fichier{song.resources.length > 1 ? 's' : ''}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform ${expandedSongIds.has(song.id) ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedSongIds.has(song.id) && (
                    <div className="border-t border-gray-100">
                      {song.resources.map((res) => (
                        <div
                          key={res.id}
                          className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{getResourceIcon(res.type)}</span>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{res.name}</p>
                              <p className="text-xs text-gray-500">
                                {getResourceTypeLabel(res.type)}
                                {res.fileSize ? ` · ${formatFileSize(res.fileSize)}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {(res.type === 'PDF' || res.type === 'IMAGE') && (
                              <button
                                onClick={() => setAnnotate({ id: res.id, name: res.name, type: res.type, filePath: res.filePath })}
                                title="Poser des points d'écoute audio sur la partition"
                                className="text-xs text-fuchsia-600 hover:text-fuchsia-500 font-medium flex items-center gap-1"
                              >
                                🔊 Annoter
                              </button>
                            )}
                            {res.type === 'PDF' ? (
                              <button
                                onClick={() => setPdfModal({ url: `/api/ressources/${res.id}`, title: res.name })}
                                className="text-xs text-indigo-600 hover:text-indigo-500 font-medium flex items-center gap-1"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Lire
                              </button>
                            ) : res.type === 'IMAGE' ? (
                              <button
                                onClick={() => setPdfModal({ url: `/api/ressources/${res.id}`, title: res.name, kind: 'image' })}
                                className="text-xs text-indigo-600 hover:text-indigo-500 font-medium flex items-center gap-1"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Lire
                              </button>
                            ) : (res.type === 'VIDEO' || isVideoFile(res.filePath)) ? (
                              <button
                                onClick={() => setVideoModal({ embedUrl: res.filePath, title: res.name, local: true })}
                                className="text-xs text-indigo-600 hover:text-indigo-500 font-medium flex items-center gap-1"
                              >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                                Lire la vidéo
                              </button>
                            ) : res.type === 'LIEN' ? (() => {
                              const embedUrl = getVideoEmbedUrl(res.filePath)
                              return embedUrl ? (
                                <button
                                  onClick={() => setVideoModal({ embedUrl, title: res.name })}
                                  className="text-xs text-indigo-600 hover:text-indigo-500 font-medium flex items-center gap-1"
                                >
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                  Lire
                                </button>
                              ) : (
                                <a href={res.filePath} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-indigo-600 hover:text-indigo-500 font-medium">
                                  Ouvrir
                                </a>
                              )
                            })() : (
                              <a href={`/api/ressources/${res.id}`} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-indigo-600 hover:text-indigo-500 font-medium">
                                Télécharger
                              </a>
                            )}
                            {chefCan('ressources', 'update') && (
                              <button
                                onClick={() => openEditResource(res)}
                                className="text-xs text-gray-500 hover:text-indigo-600 font-medium"
                              >
                                Éditer
                              </button>
                            )}
                            {chefCan('ressources', 'delete') && (
                              <button
                                onClick={() => handleDeleteResource(res.id)}
                                className="text-xs text-red-500 hover:text-red-700 font-medium"
                              >
                                Supprimer
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Edit resource modal */}
      <Modal isOpen={!!editResource} onClose={() => setEditResource(null)} title="Modifier la ressource">
        <form onSubmit={handleEditResource} className="space-y-4">
          {resourceError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{resourceError}</div>}
          <div>
            <label className="form-label">Nom</label>
            <input
              type="text"
              required
              value={resourceForm.name}
              onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })}
              className="form-input"
            />
          </div>
          {editResource?.type === 'LIEN' && (
            <div>
              <label className="form-label">URL</label>
              <input
                type="url"
                required
                value={resourceForm.filePath}
                onChange={(e) => setResourceForm({ ...resourceForm, filePath: e.target.value })}
                className="form-input"
                placeholder={ph('groupes_id_morceaux_1')}
              />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditResource(null)}>Annuler</Button>
            <Button type="submit" disabled={resourceSaving}>{resourceSaving ? 'Enregistrement...' : 'Sauvegarder'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit song modal */}
      <Modal isOpen={!!editSong} onClose={() => setEditSong(null)} title="Modifier le morceau">
        <form onSubmit={handleEditSong} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="form-label">Titre *</label>
            <input type="text" required value={songForm.title} onChange={(e) => setSongForm({ ...songForm, title: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Artiste / Compositeur</label>
            <input type="text" value={songForm.artist} onChange={(e) => setSongForm({ ...songForm, artist: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Durée <span className="text-gray-400 font-normal">(format MM:SS, ex: 3:45)</span></label>
            <input
              type="text"
              value={songForm.duration}
              onChange={(e) => setSongForm({ ...songForm, duration: e.target.value })}
              className="form-input"
              placeholder={ph('groupes_id_morceaux_2')}
              pattern="^\d{1,3}:\d{2}$"
              title="Format MM:SS (ex: 3:45)"
            />
          </div>
          <div>
            <label className="form-label">Tempo <span className="text-gray-400 font-normal">(BPM — métronome avant de jouer)</span></label>
            <input
              type="number" min={20} max={300}
              value={songForm.tempo}
              onChange={(e) => setSongForm({ ...songForm, tempo: e.target.value })}
              className="form-input"
              placeholder={ph('groupes_id_morceaux_3')}
            />
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea value={songForm.notes} onChange={(e) => setSongForm({ ...songForm, notes: e.target.value })} className="form-input" rows={3} />
          </div>

          {/* Suggestions de ressources sur un titre existant (n'efface rien) */}
          <button
            type="button"
            onClick={() => { if (editSong) { const s = editSong; setEditSong(null); openSuggestions(s) } }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            🔎 Trouver des ressources (YouTube, backing tracks, partitions…)
          </button>
          <p className="text-[11px] text-gray-400 -mt-2">Les ressources déjà associées au morceau sont conservées — on ne fait qu&apos;en ajouter.</p>

          <div className="flex items-center justify-between pt-2">
            {chefCan('repertoire', 'delete') && (
              <button
                type="button"
                onClick={() => editSong && handleDeleteSong(editSong)}
                className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
              >
                🗑 Supprimer ce morceau
              </button>
            )}
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setEditSong(null)}>Annuler</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Sauvegarder'}</Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Add song modal */}
      <Modal isOpen={addSongOpen} onClose={() => setAddSongOpen(false)} title="Ajouter un morceau">
        <form onSubmit={handleAddSong} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-xs text-indigo-700">
            🔎 Après l&apos;ajout, on vous proposera des <strong>vidéos YouTube</strong> (à associer en un clic) ainsi que des liens vers des <strong>partitions</strong> et des <strong>sites pour travailler le morceau</strong>. Renseignez le <strong>titre <em>et</em> l&apos;artiste</strong> pour de meilleures suggestions.
          </div>
          <div>
            <label className="form-label">Titre *</label>
            <input type="text" required value={songForm.title} onChange={(e) => setSongForm({ ...songForm, title: e.target.value })} className="form-input" placeholder={ph('groupes_id_morceaux_4')} />
          </div>
          <div>
            <label className="form-label">Artiste / Compositeur</label>
            <input type="text" value={songForm.artist} onChange={(e) => setSongForm({ ...songForm, artist: e.target.value })} className="form-input" placeholder={ph('groupes_id_morceaux_5')} />
          </div>
          <div>
            <label className="form-label">Durée <span className="text-gray-400 font-normal">(format MM:SS, ex: 3:45)</span></label>
            <input
              type="text"
              value={songForm.duration}
              onChange={(e) => setSongForm({ ...songForm, duration: e.target.value })}
              className="form-input"
              placeholder={ph('groupes_id_morceaux_6')}
              pattern="^\d{1,3}:\d{2}$"
              title="Format MM:SS (ex: 3:45)"
            />
          </div>
          <div>
            <label className="form-label">Tempo <span className="text-gray-400 font-normal">(BPM — métronome avant de jouer)</span></label>
            <input
              type="number" min={20} max={300}
              value={songForm.tempo}
              onChange={(e) => setSongForm({ ...songForm, tempo: e.target.value })}
              className="form-input"
              placeholder={ph('groupes_id_morceaux_7')}
            />
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea value={songForm.notes} onChange={(e) => setSongForm({ ...songForm, notes: e.target.value })} className="form-input" rows={3} placeholder={ph('groupes_id_morceaux_8')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAddSongOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Ajouter'}</Button>
          </div>
        </form>
      </Modal>

      {videoModal && (
        <VideoModal
          url={videoModal.embedUrl}
          title={videoModal.title}
          local={videoModal.local}
          onClose={() => setVideoModal(null)}
        />
      )}

      {pdfModal && (
        <PdfModal
          url={pdfModal.url}
          title={pdfModal.title}
          kind={pdfModal.kind}
          onClose={() => setPdfModal(null)}
        />
      )}

      {ytSuggest && (
        <YouTubeSuggestModal
          songId={ytSuggest.id}
          groupId={groupId}
          title={ytSuggest.title}
          artist={ytSuggest.artist}
          hasDuration={ytSuggest.hasDuration}
          onClose={() => setYtSuggest(null)}
          onAdded={fetchData}
        />
      )}

      <FloatingAudioPlayer groupId={groupId} />

      {annotate && <ScoreAnnotator resource={annotate} onClose={() => setAnnotate(null)} />}
    </div>
  )
}

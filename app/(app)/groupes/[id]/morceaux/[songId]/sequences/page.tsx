'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { SequencePlayer, Sequence } from '@/components/ui/SequencePlayer'
import { ph } from '@/lib/placeholders'

interface SeqItem extends Sequence {
  fileSize: number
  createdBy?: { id: number; name: string } | null
}

const ACCEPTED_SEQUENCE_FILES = [
  '.mp3',
  'audio/mpeg',
  'audio/mp3',
  '.wav',
  'audio/wav',
  'audio/x-wav',
  '.ogg',
  'audio/ogg',
  '.m4a',
  'audio/mp4',
  'audio/x-m4a',
  '.aac',
  'audio/aac',
  '.flac',
  'audio/flac',
  '.mid',
  '.midi',
  'audio/midi',
  'audio/x-midi',
].join(',')

const ALLOWED_SEQUENCE_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'mid', 'midi']

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export default function SequencesPage({ params }: { params: { id: string; songId: string } }) {
  const { data: session } = useSession()
  const groupId = params.id
  const songId = params.songId

  const [sequences, setSequences] = useState<SeqItem[]>([])
  const [songTitle, setSongTitle] = useState('')
  const [songArtist, setSongArtist] = useState('')
  const [groupName, setGroupName] = useState('')
  const [isChef, setIsChef] = useState(false)
  const [uploadEnabled, setUploadEnabled] = useState(true)
  const [loading, setLoading] = useState(true)

  // Upload form
  const [title, setTitle] = useState('')
  const [channelMode, setChannelMode] = useState<'STEREO' | 'SPLIT_LR'>('STEREO')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editChannelMode, setEditChannelMode] = useState<'STEREO' | 'SPLIT_LR'>('STEREO')
  const [editFile, setEditFile] = useState<File | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fallbackFileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!session) return
    const [songRes, seqRes, grpRes] = await Promise.all([
      fetch(`/api/groupes/${groupId}/morceaux`),
      fetch(`/api/morceaux/${songId}/sequences`),
      fetch(`/api/groupes/${groupId}`),
    ])
    if (songRes.ok) {
      const songs = await songRes.json()
      const s = songs.find((x: { id: number }) => x.id === Number(songId))
      if (s) { setSongTitle(s.title); setSongArtist(s.artist || '') }
    }
    if (seqRes.ok) setSequences(await seqRes.json())
    if (grpRes.ok) {
      const g = await grpRes.json()
      setGroupName(g.name || '')
      setUploadEnabled(g.uploadEnabled ?? false)
      const me = g.members?.find((m: { userId: number; groupRole: string }) => m.userId === Number(session.user.id))
      const role = session.user.siteRole === 'ADMIN' ? 'CHEF' : (me?.groupRole || 'MEMBRE')
      setIsChef(role === 'CHEF')
    }
    setLoading(false)
  }, [session, groupId, songId])

  useEffect(() => { load() }, [load])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { setError('Choisissez un fichier.'); return }
    setUploading(true); setError('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', title.trim() || file.name.replace(/\.[^.]+$/, ''))
    fd.append('channelMode', channelMode)
    const res = await fetch(`/api/morceaux/${songId}/sequences`, { method: 'POST', body: fd })
    setUploading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Erreur lors du téléversement.')
      return
    }
    setTitle(''); setFile(null); setChannelMode('STEREO')
    if (fileInputRef.current) fileInputRef.current.value = ''
    load()
  }

  const chooseFile = (selected: File | null) => {
    setError('')
    setFile(null)
    if (!selected) return

    const ext = selected.name.split('.').pop()?.toLowerCase() || ''
    const isAllowed = ALLOWED_SEQUENCE_EXTENSIONS.includes(ext) || selected.type.startsWith('audio/')
    if (!isAllowed) {
      setError('Format non reconnu. Choisissez un MP3, WAV, OGG, M4A, AAC, FLAC, MID ou MIDI.')
      return
    }

    setFile(selected)
    if (!title.trim()) setTitle(selected.name.replace(/\.[^.]+$/, ''))
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette séquence ?')) return
    setEditError('')
    const res = await fetch(`/api/sequences/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setEditError(data.error || 'Impossible de supprimer cette séquence.')
      return
    }
    load()
  }

  const beginEdit = (seq: SeqItem) => {
    setEditingId(seq.id!)
    setEditTitle(seq.title)
    setEditChannelMode(seq.channelMode || 'STEREO')
    setEditFile(null)
    setEditError('')
  }

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return
    setEditSaving(true)
    setEditError('')

    let res: Response
    if (editFile) {
      const form = new FormData()
      form.append('file', editFile)
      form.append('title', editTitle.trim())
      form.append('channelMode', editChannelMode)
      res = await fetch(`/api/sequences/${editingId}`, { method: 'PUT', body: form })
    } else {
      res = await fetch(`/api/sequences/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim(), channelMode: editChannelMode }),
      })
    }

    setEditSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setEditError(data.error || 'Impossible de modifier cette séquence.')
      return
    }
    setEditingId(null)
    setEditFile(null)
    load()
  }

  if (loading) return <div className="text-gray-500 p-6">Chargement...</div>

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 mb-2 min-w-0">
        <Link href="/groupes" className="hover:text-indigo-600 shrink-0">Mes groupes</Link>
        <span className="shrink-0">/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600 truncate max-w-[100px] sm:max-w-[160px]">{groupName}</Link>
        <span className="shrink-0">/</span>
        <Link href={`/groupes/${groupId}/morceaux`} className="hover:text-indigo-600 shrink-0">Répertoire</Link>
        <span className="shrink-0">/</span>
        <span className="text-gray-900 truncate max-w-[100px] sm:max-w-[140px]">{songTitle}</span>
        <span className="shrink-0">/</span>
        <span className="text-gray-900 shrink-0">Séquences</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">🎚 {songTitle}</h1>
        {songArtist && <p className="text-gray-500 text-sm mt-0.5">{songArtist}</p>}
        <p className="text-sm text-gray-500 mt-2">
          Backing tracks &amp; séquences MIDI pour ce morceau. Le mode <strong>Click G / Backing D</strong> place le clic dans le
          canal gauche et le playback dans le canal droit, avec volumes indépendants.
        </p>
        <p className="text-sm text-indigo-600 mt-1.5 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
          🎯 <strong>Pour travailler à la maison :</strong> ralentissez un passage (🐢 vitesse, <em>tonalité conservée</em>) et répétez-le en boucle (🔁 placez les repères <strong>A</strong> et <strong>B</strong>).
        </p>
      </div>

      {/* Liste */}
      {sequences.length === 0 ? (
        <div className="text-center py-12 text-gray-400 rounded-xl border border-dashed border-gray-200 mb-6">
          <p className="text-4xl mb-2">🎚</p>
          <p className="font-medium text-gray-500">Aucune séquence pour ce morceau.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {sequences.map((seq) => (
            <div key={seq.id}>
              <SequencePlayer seq={seq} />
              {isChef && (
                <>
                  <div className="flex items-center justify-end gap-2 mt-1 px-1">
                    <button onClick={() => beginEdit(seq)} className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50">
                      Modifier
                    </button>
                    <button onClick={() => handleDelete(seq.id!)} className="rounded-md px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50">
                      Supprimer
                    </button>
                  </div>

                  {editingId === seq.id && (
                    <div className="mt-2 border-t border-gray-200 bg-gray-50 px-3 py-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Titre</label>
                          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={191}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Sortie audio</label>
                          <select value={editChannelMode} onChange={(e) => setEditChannelMode(e.target.value as 'STEREO' | 'SPLIT_LR')}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                            <option value="STEREO">Stéréo normale</option>
                            <option value="SPLIT_LR">Click G / Backing D</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Remplacer le fichier (optionnel)</label>
                        <input type="file" accept={ACCEPTED_SEQUENCE_FILES}
                          onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                          className="block w-full text-xs text-gray-500 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:font-medium file:text-indigo-600 hover:file:bg-indigo-50" />
                        {editFile && <p className="mt-1 text-xs text-gray-500">{editFile.name} · {formatBytes(editFile.size)}</p>}
                      </div>
                      {editError && <p className="mt-2 text-sm text-red-500">{editError}</p>}
                      <div className="mt-3 flex justify-end gap-2">
                        <button type="button" onClick={() => { setEditingId(null); setEditFile(null); setEditError('') }}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
                          Annuler
                        </button>
                        <button type="button" onClick={saveEdit} disabled={editSaving || !editTitle.trim()}
                          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                          {editSaving ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          {editError && editingId === null && <p className="text-sm text-red-500">{editError}</p>}
        </div>
      )}

      {/* Upload (chef) */}
      {isChef && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3">➕ Ajouter une séquence</h2>
          {!uploadEnabled ? (
            <p className="text-sm text-amber-600">
              L'ajout de fichiers nécessite un quota de stockage &gt; 0 sur l'offre de ce groupe.
            </p>
          ) : (
            <form onSubmit={handleUpload} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Titre (optionnel)</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={ph('groupes_id_morceaux_songid_sequences_1')}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sortie audio</label>
                  <select value={channelMode} onChange={(e) => setChannelMode(e.target.value as 'STEREO' | 'SPLIT_LR')}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <option value="STEREO">Stéréo normale</option>
                    <option value="SPLIT_LR">Click G / Backing D (séparé)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fichier (MP3, WAV, OGG… ou .mid / .midi)</label>
                <input ref={fileInputRef} type="file" accept={ACCEPTED_SEQUENCE_FILES}
                  onChange={(e) => chooseFile(e.target.files?.[0] || null)}
                  className="hidden" />
                <input ref={fallbackFileInputRef} type="file"
                  onChange={(e) => chooseFile(e.target.files?.[0] || null)}
                  className="hidden" />
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
                    Choisir un audio
                  </button>
                  <button type="button" onClick={() => fallbackFileInputRef.current?.click()}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50">
                    Mon MP3 n'apparaît pas
                  </button>
                </div>
                {file && (
                  <p className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                    Fichier sélectionné : {file.name} · {formatBytes(file.size)}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Le fichier est décompté du quota de stockage du groupe. Sur téléphone, utilisez “Mon MP3 n'apparaît pas” si le fichier téléchargé est masqué par le sélecteur audio.
                </p>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button type="submit" disabled={uploading || !file}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50">
                {uploading ? 'Téléversement…' : 'Ajouter'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

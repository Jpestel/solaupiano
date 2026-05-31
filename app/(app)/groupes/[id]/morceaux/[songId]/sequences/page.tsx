'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { SequencePlayer, Sequence } from '@/components/ui/SequencePlayer'

interface SeqItem extends Sequence {
  fileSize: number
  createdBy?: { id: number; name: string } | null
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
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette séquence ?')) return
    await fetch(`/api/sequences/${id}`, { method: 'DELETE' })
    load()
  }

  const handleChannelChange = async (id: number, mode: 'STEREO' | 'SPLIT_LR') => {
    await fetch(`/api/sequences/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelMode: mode }),
    })
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
                <div className="flex items-center gap-3 mt-1 px-1">
                  {seq.kind === 'AUDIO' && (
                    <label className="flex items-center gap-1.5 text-xs text-gray-500">
                      Sortie :
                      <select
                        value={seq.channelMode}
                        onChange={(e) => handleChannelChange(seq.id, e.target.value as 'STEREO' | 'SPLIT_LR')}
                        className="rounded border border-gray-200 text-xs px-1.5 py-0.5"
                      >
                        <option value="STEREO">Stéréo normale</option>
                        <option value="SPLIT_LR">Click G / Backing D</option>
                      </select>
                    </label>
                  )}
                  <button onClick={() => handleDelete(seq.id)} className="text-xs text-red-400 hover:text-red-600 ml-auto">
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          ))}
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
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex : Backing + click"
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
                <input ref={fileInputRef} type="file" accept="audio/*,.mid,.midi"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm" />
                <p className="text-xs text-gray-400 mt-1">Le fichier est décompté du quota de stockage du groupe. Les .mid sont lus via un synthé navigateur (pré-écoute).</p>
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

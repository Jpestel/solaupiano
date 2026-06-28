'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SequencePlayer } from '@/components/ui/SequencePlayer'

interface GroupAudio {
  kind: 'sequence' | 'resource'
  id: number
  label: string
  songTitle: string
  filePath: string
}

interface SongOption {
  id: number
  title: string
  artist?: string
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
].join(',')

const ALLOWED_SEQUENCE_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac']

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

// Lecteur audio flottant : charge n'importe quel audio du groupe (séquences + ressources audio)
// et reste par-dessus le contenu (ex. une partition PDF ouverte). Persistant tant qu'on reste sur la page.
export function FloatingAudioPlayer({ groupId, currentSongId }: { groupId: number | string; currentSongId?: number | null }) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [audios, setAudios] = useState<GroupAudio[]>([])
  const [selKey, setSelKey] = useState('')
  const [songs, setSongs] = useState<SongOption[]>([])
  const [songsLoaded, setSongsLoaded] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadSongId, setUploadSongId] = useState('')
  const [title, setTitle] = useState('')
  const [channelMode, setChannelMode] = useState<'STEREO' | 'SPLIT_LR'>('STEREO')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fallbackFileInputRef = useRef<HTMLInputElement>(null)

  const loadAudios = useCallback(async () => {
    setLoaded(false)
    fetch(`/api/groupes/${groupId}/audios`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setAudios(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [groupId])

  const loadSongs = useCallback(async () => {
    if (songsLoaded) return
    fetch(`/api/groupes/${groupId}/morceaux`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        const list = Array.isArray(d) ? d.map((song) => ({ id: song.id, title: song.title, artist: song.artist || '' })) : []
        setSongs(list)
        const preferred = currentSongId && list.some((song) => song.id === currentSongId) ? String(currentSongId) : String(list[0]?.id || '')
        setUploadSongId((value) => value || preferred)
      })
      .catch(() => {})
      .finally(() => setSongsLoaded(true))
  }, [currentSongId, groupId, songsLoaded])

  useEffect(() => {
    if (!open || loaded) return
    loadAudios()
  }, [open, loaded, loadAudios])

  useEffect(() => {
    if (!uploadOpen) return
    loadSongs()
  }, [uploadOpen, loadSongs])

  useEffect(() => {
    if (!currentSongId || uploadSongId) return
    setUploadSongId(String(currentSongId))
  }, [currentSongId, uploadSongId])

  const selected = audios.find((a) => `${a.kind}-${a.id}` === selKey) || null
  const selectedSong = songs.find((song) => String(song.id) === uploadSongId) || null

  const chooseFile = (selectedFile: File | null) => {
    setError('')
    setFile(null)
    if (!selectedFile) return

    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || ''
    const isAllowed = ALLOWED_SEQUENCE_EXTENSIONS.includes(ext) || selectedFile.type.startsWith('audio/')
    if (!isAllowed) {
      setError('Format non reconnu. Choisissez un MP3, WAV, OGG, M4A, AAC ou FLAC.')
      return
    }

    setFile(selectedFile)
    if (!title.trim()) setTitle(selectedFile.name.replace(/\.[^.]+$/, ''))
  }

  const resetUploadForm = () => {
    setTitle('')
    setChannelMode('STEREO')
    setFile(null)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (fallbackFileInputRef.current) fallbackFileInputRef.current.value = ''
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadSongId) { setError('Choisissez le morceau.'); return }
    if (!file) { setError('Choisissez un fichier audio.'); return }

    setUploading(true)
    setError('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', title.trim() || file.name.replace(/\.[^.]+$/, ''))
    fd.append('channelMode', channelMode)

    const res = await fetch(`/api/morceaux/${uploadSongId}/sequences`, { method: 'POST', body: fd })
    setUploading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erreur lors du téléversement.')
      return
    }

    const sequence = await res.json()
    const songTitle = selectedSong?.title || 'Morceau'
    const audio = { kind: 'sequence' as const, id: sequence.id, label: sequence.title, songTitle, filePath: sequence.filePath }
    setAudios((items) => [audio, ...items.filter((item) => !(item.kind === 'sequence' && item.id === sequence.id))])
    setSelKey(`sequence-${sequence.id}`)
    setUploadOpen(false)
    resetUploadForm()
    loadAudios()
  }

  return (
    <>
      {/* Espace réservé en bas du contenu pour que le lecteur flottant ne masque rien */}
      <div aria-hidden className="h-28 lg:h-24" />

      {/* Bouton flottant quand réduit (l'audio continue de jouer en arrière-plan) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Lecteur audio — jouer un audio du groupe par-dessus"
          className="fixed bottom-20 right-4 lg:bottom-6 z-[60] inline-flex items-center gap-2 rounded-full bg-indigo-600 text-white shadow-lg px-4 py-3 text-sm font-semibold hover:bg-indigo-500"
        >
          🎧 Lecteur audio
          {selKey && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Audio chargé" />}
        </button>
      )}

      {/* Panneau — toujours monté (caché quand réduit) pour ne pas couper l'audio */}
      <div className={`fixed bottom-20 right-4 lg:bottom-6 z-[60] w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white shadow-2xl ${open ? '' : 'hidden'}`}>
        {/* En-tête */}
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-100 bg-indigo-50 rounded-t-2xl">
          <span className="text-sm font-bold text-indigo-800">🎧 Lecteur audio</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setOpen(false)} title="Réduire (l’audio continue)" className="w-7 h-7 rounded-md text-indigo-500 hover:bg-indigo-100">▾</button>
          </div>
        </div>

      <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
        {/* Sélecteur */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Choisir un audio du groupe</label>
          <select
            value={selKey}
            onChange={(e) => setSelKey(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">— Sélectionner —</option>
            {audios.length > 0 && (
              <optgroup label="🎚 Séquences (backing tracks)">
                {audios.filter((a) => a.kind === 'sequence').map((a) => (
                  <option key={`sequence-${a.id}`} value={`sequence-${a.id}`}>{a.songTitle} — {a.label}</option>
                ))}
              </optgroup>
            )}
            {audios.some((a) => a.kind === 'resource') && (
              <optgroup label="🎵 Ressources audio">
                {audios.filter((a) => a.kind === 'resource').map((a) => (
                  <option key={`resource-${a.id}`} value={`resource-${a.id}`}>{a.songTitle} — {a.label}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {loaded && audios.length === 0 && (
          <p className="text-xs text-gray-400">Aucun audio dans ce groupe. Ajoutez des backing tracks (🎚 Séquences) ou des ressources audio à vos morceaux.</p>
        )}

        <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/60 p-3">
          <button
            type="button"
            onClick={() => setUploadOpen((value) => !value)}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            {uploadOpen ? 'Masquer l’ajout audio' : 'Ajouter un fichier audio'}
          </button>

          {uploadOpen && (
            <form onSubmit={handleUpload} className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Morceau</label>
                <select
                  value={uploadSongId}
                  onChange={(e) => setUploadSongId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">— Choisir —</option>
                  {songs.map((song) => (
                    <option key={song.id} value={song.id}>{song.title}{song.artist ? ` — ${song.artist}` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Titre (optionnel)</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Sortie audio</label>
                <select
                  value={channelMode}
                  onChange={(e) => setChannelMode(e.target.value as 'STEREO' | 'SPLIT_LR')}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="STEREO">Stéréo normale</option>
                  <option value="SPLIT_LR">Click G / Backing D (séparé)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Fichier audio</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_SEQUENCE_FILES}
                  onChange={(e) => chooseFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <input
                  ref={fallbackFileInputRef}
                  type="file"
                  onChange={(e) => chooseFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                  >
                    Choisir un audio
                  </button>
                  <button
                    type="button"
                    onClick={() => fallbackFileInputRef.current?.click()}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    Mon MP3 n'apparaît pas
                  </button>
                </div>
                {file && (
                  <p className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                    {file.name} · {formatBytes(file.size)}
                  </p>
                )}
              </div>

              {error && <p className="text-xs font-medium text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={uploading || !file || !uploadSongId}
                className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {uploading ? 'Téléversement...' : 'Ajouter et charger'}
              </button>
            </form>
          )}
        </div>

        {/* Lecteur */}
        {selected && (
          <SequencePlayer
            key={selKey}
            seq={{
              id: selected.kind === 'sequence' ? selected.id : undefined,
              kind: 'AUDIO',
              title: `${selected.songTitle} — ${selected.label}`,
              filePath: selected.filePath,
            }}
          />
        )}
      </div>
      </div>
    </>
  )
}

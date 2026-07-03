'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface Recording {
  id: number
  title: string
  note?: string | null
  filePath: string
  mimeType: string
  fileSize: number
  durationSec?: number | null
  source: string
  createdAt: string
  song?: { id: number; title: string; artist?: string | null } | null
  resource?: { id: number; name: string } | null
}

interface VoiceRecorderProps {
  groupId: number | string
  songId?: number | null
  songTitle?: string | null
  resourceId?: number | null
  contextTitle?: string
  source?: 'GENERAL' | 'PDF' | 'GRID' | 'REHEARSAL' | 'SETLIST'
  compact?: boolean
  draggable?: boolean
}

const MAX_RECORDING_MS = 15 * 60 * 1000

function formatDuration(seconds?: number | null) {
  const total = Math.max(0, Math.round(seconds || 0))
  const min = Math.floor(total / 60)
  const sec = total % 60
  return `${min}:${String(sec).padStart(2, '0')}`
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function recordingUrl(groupId: number | string, recordingId: number) {
  return `/api/groupes/${groupId}/recordings/${recordingId}`
}

function formatDateTime(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(':', 'h')
}

function RecordingPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(false)

  const togglePlayback = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (!audio.paused) {
      audio.pause()
      setPlaying(false)
      return
    }

    setLoading(true)
    setPlaying(false)
    document.querySelectorAll<HTMLAudioElement>('audio[data-voice-recording-player="true"]').forEach((item) => {
      if (item !== audio) item.pause()
    })

    try {
      audio.preload = 'auto'
      if (audio.readyState === 0) audio.load()
      await audio.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl bg-gray-100 px-3 py-2">
      <audio
        ref={audioRef}
        data-voice-recording-player="true"
        preload="auto"
        src={src}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlayback}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-rose-600 text-sm font-black text-white shadow-sm transition hover:bg-rose-500 disabled:opacity-60"
          disabled={loading}
          aria-label={playing ? 'Mettre en pause' : 'Lire la prise audio'}
        >
          {loading ? '…' : playing ? 'Ⅱ' : '▶'}
        </button>
        <span className="w-10 text-xs font-semibold tabular-nums text-gray-600">{formatDuration(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || currentTime)}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (audioRef.current) audioRef.current.currentTime = next
            setCurrentTime(next)
          }}
          className="min-w-0 flex-1 accent-rose-600"
          disabled={!duration}
        />
        <span className="w-10 text-right text-xs font-semibold tabular-nums text-gray-600">{formatDuration(duration)}</span>
      </div>
    </div>
  )
}

function preferredMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

export function VoiceRecorder({
  groupId,
  songId,
  songTitle,
  resourceId,
  contextTitle,
  source = 'GENERAL',
  compact = false,
  draggable = false,
}: VoiceRecorderProps) {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [open, setOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [saving, setSaving] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loaded, setLoaded] = useState(false)
  const [note, setNote] = useState('')
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const startedAtRef = useRef<number>(0)
  const timerRef = useRef<number | null>(null)
  const autoStopRef = useRef<number | null>(null)
  const stopReasonRef = useRef('')
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)

  const cleanupTimers = () => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    if (autoStopRef.current) window.clearTimeout(autoStopRef.current)
    timerRef.current = null
    autoStopRef.current = null
  }

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  const loadRecordings = useCallback(async () => {
    const params = new URLSearchParams()
    if (songId) params.set('songId', String(songId))
    if (resourceId) params.set('resourceId', String(resourceId))
    const res = await fetch(`/api/groupes/${groupId}/recordings${params.toString() ? `?${params}` : ''}`)
    if (!res.ok) return
    const data = await res.json()
    setRecordings(Array.isArray(data.recordings) ? data.recordings : [])
    setLoaded(true)
  }, [groupId, resourceId, songId])

  useEffect(() => {
    fetch('/api/me/module-access?key=tool_voice_recorder')
      .then((res) => (res.ok ? res.json() : { allowed: false }))
      .then((data) => setAllowed(!!data.allowed))
      .catch(() => setAllowed(false))
  }, [])

  useEffect(() => {
    if (!open || loaded) return
    loadRecordings().catch(() => {})
  }, [loaded, loadRecordings, open])

  useEffect(() => {
    if (!open || !draggable || panelPos || typeof window === 'undefined') return
    const width = Math.min(420, window.innerWidth - 24)
    setPanelPos({
      x: Math.max(12, window.innerWidth - width - 24),
      y: Math.max(88, Math.min(180, window.innerHeight - 360)),
    })
  }, [draggable, open, panelPos])

  const saveRecording = useCallback(async (blob: Blob, durationSec: number) => {
    setSaving(true)
    setError('')
    const date = new Date()
    const stamp = formatDateTime(date)
    const baseTitle = songId && songTitle?.trim()
      ? songTitle.trim()
      : contextTitle?.trim()
        ? contextTitle.trim()
        : 'Prise audio'
    const title = `${baseTitle} - ${stamp}`

    const fd = new FormData()
    fd.append('file', blob, 'prise-audio.webm')
    fd.append('title', title)
    fd.append('durationSec', String(durationSec))
    fd.append('source', source)
    if (songId) fd.append('songId', String(songId))
    if (resourceId) fd.append('resourceId', String(resourceId))
    if (note.trim()) fd.append('note', note.trim())

    const res = await fetch(`/api/groupes/${groupId}/recordings`, { method: 'POST', body: fd })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error || "Impossible d'enregistrer cette prise.")
      return
    }
    const recording = await res.json()
    setRecordings((items) => [recording, ...items])
    setNote('')
    setNotice(stopReasonRef.current || 'Prise audio sauvegardée.')
  }, [contextTitle, groupId, note, resourceId, songId, songTitle, source])

  const stopRecording = useCallback((reason = 'Prise audio sauvegardée.') => {
    stopReasonRef.current = reason
    cleanupTimers()
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    } else {
      stopStream()
      setRecording(false)
    }
  }, [])

  const startRecording = async () => {
    setError('')
    setNotice('')

    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError("L'enregistrement audio n'est pas supporté par ce navigateur.")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = preferredMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      streamRef.current = stream
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      startedAtRef.current = Date.now()
      stopReasonRef.current = ''

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        const durationSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        mediaRecorderRef.current = null
        chunksRef.current = []
        stopStream()
        setRecording(false)
        setElapsed(0)
        if (blob.size > 0) saveRecording(blob, durationSec)
      }

      recorder.start()
      setRecording(true)
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000))
      }, 500)
      autoStopRef.current = window.setTimeout(() => {
        stopRecording('Enregistrement arrêté automatiquement après 15 minutes pour éviter une prise infinie.')
      }, MAX_RECORDING_MS)
    } catch {
      stopStream()
      setError("Impossible d'accéder au micro. Vérifiez l'autorisation du navigateur.")
    }
  }

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && recording) {
        window.alert("L'enregistrement a été arrêté car la page n'est plus active.")
        stopRecording("Enregistrement arrêté automatiquement car la page n'était plus active.")
      }
    }
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!recording) return
      event.preventDefault()
      event.returnValue = "Un enregistrement est en cours. Il sera arrêté si vous quittez la page."
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [recording, stopRecording])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        window.alert("L'enregistrement a été arrêté car vous avez quitté cette page.")
        stopRecording("Enregistrement arrêté automatiquement lors du changement de page.")
      }
      cleanupTimers()
      stopStream()
    }
  }, [stopRecording])

  const deleteRecording = async (recordingId: number) => {
    if (!window.confirm('Supprimer cette prise audio ?')) return
    const res = await fetch(`/api/groupes/${groupId}/recordings/${recordingId}`, { method: 'DELETE' })
    if (res.ok) setRecordings((items) => items.filter((item) => item.id !== recordingId))
  }

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable || !panelPos) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { dx: event.clientX - panelPos.x, dy: event.clientY - panelPos.y }
  }

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable || !dragRef.current) return
    const width = Math.min(420, window.innerWidth - 24)
    const height = Math.min(560, window.innerHeight - 24)
    setPanelPos({
      x: Math.max(12, Math.min(window.innerWidth - width - 12, event.clientX - dragRef.current.dx)),
      y: Math.max(12, Math.min(window.innerHeight - height - 12, event.clientY - dragRef.current.dy)),
    })
  }

  const stopDrag = () => {
    dragRef.current = null
  }

  if (allowed === false) return null

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Dictaphone - enregistrer une prise audio"
          className={compact
            ? 'rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-rose-500'
            : 'fixed bottom-36 right-4 z-[60] inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-rose-500'}
        >
          {recording ? '● REC' : '🎙️ Dictaphone'}
        </button>
      )}

      {open && (
        <div
          className={draggable
            ? 'fixed z-[80] w-[min(420px,calc(100vw-1.5rem))] rounded-2xl border border-rose-200 bg-white text-gray-900 shadow-2xl'
            : compact
              ? 'absolute right-3 top-14 z-50 w-[min(360px,calc(100vw-1.5rem))] rounded-2xl border border-rose-200 bg-white text-gray-900 shadow-2xl'
              : 'fixed bottom-36 right-4 z-[70] w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-rose-200 bg-white text-gray-900 shadow-2xl'}
          style={draggable && panelPos ? { left: panelPos.x, top: panelPos.y } : undefined}
          onClick={(event) => event.stopPropagation()}
        >
          <div
            className={`flex items-center justify-between gap-2 rounded-t-2xl border-b border-rose-100 bg-rose-50 px-4 py-3 ${draggable ? 'cursor-move touch-none select-none' : ''}`}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
          >
            <div>
              <p className="text-sm font-black text-rose-800">🎙️ Dictaphone</p>
              <p className="text-xs text-rose-600">{draggable ? 'Déplacez ce panneau si besoin' : (contextTitle || 'Prise audio personnelle')}</p>
            </div>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-100"
              aria-label="Fermer le dictaphone"
            >
              ×
            </button>
          </div>

          <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Enregistrement</p>
                  <p className="text-2xl font-black tabular-nums text-gray-950">{recording ? formatDuration(elapsed) : '0:00'}</p>
                </div>
                <button
                  type="button"
                  disabled={saving || allowed === null}
                  onClick={() => recording ? stopRecording('Prise audio sauvegardée.') : startRecording()}
                  className={`flex h-16 w-16 items-center justify-center rounded-full text-sm font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${recording ? 'bg-gray-900 hover:bg-gray-800' : 'bg-rose-600 hover:bg-rose-500'}`}
                >
                  {recording ? 'STOP' : 'REC'}
                </button>
              </div>

              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={recording || saving}
                rows={2}
                className="w-full rounded-lg border border-rose-100 bg-white px-3 py-2 text-sm outline-none focus:border-rose-300"
                placeholder="Note optionnelle avant d'enregistrer..."
              />
              <p className="mt-2 text-xs text-gray-500">Arrêt automatique au changement de page ou après 15 minutes.</p>
            </div>

            {saving && <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">Sauvegarde de la prise...</p>}
            {notice && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{notice}</p>}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900">Mes prises</p>
                <button type="button" onClick={() => loadRecordings()} className="text-xs font-semibold text-rose-600 hover:text-rose-500">Actualiser</button>
              </div>

              {recordings.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-500">
                  Aucune prise sauvegardée ici pour l'instant.
                </p>
              ) : (
                <div className="space-y-2">
                  {recordings.map((item) => (
                    <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-3">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-gray-900">{item.title}</p>
                          <p className="text-xs text-gray-500">
                            {formatDuration(item.durationSec)} · {formatBytes(item.fileSize)} · {formatDateTime(item.createdAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteRecording(item.id)}
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
                        >
                          Suppr.
                        </button>
                      </div>
                      <RecordingPlayer src={recordingUrl(groupId, item.id)} />
                      {item.note && <p className="mt-2 text-xs text-gray-500">{item.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

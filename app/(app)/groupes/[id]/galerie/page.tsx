'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { compressImage } from '@/lib/image-compress'

interface Photo {
  id: number
  filePath: string
  fileSize: number
  caption: string | null
  eventType: string | null
  eventId: number | null
  eventLabel: string | null
  createdAt: string
  uploaderId: number
  uploader: { id: number; name: string }
  mine: boolean
}
interface EventOpt { type: 'REHEARSAL' | 'CONCERT'; id: number; label: string }
interface Storage { usedBytes: number; limitBytes: number; limitGb: number; percent: number }

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} o`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} Mo`
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} Go`
}

const NO_EVENT = 'none'

export default function GaleriePage({ params }: { params: { id: string } }) {
  const groupId = params.id
  const { data: session } = useSession()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [events, setEvents] = useState<EventOpt[]>([])
  const [isChef, setIsChef] = useState(false)
  const [storage, setStorage] = useState<Storage | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<string>(NO_EVENT)
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState<number | null>(null) // index dans photos
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/groupes/${groupId}/galerie`)
    if (res.ok) {
      const d = await res.json()
      setPhotos(d.photos); setEvents(d.events); setIsChef(d.isChef); setStorage(d.storage)
    }
    setLoading(false)
  }, [groupId])

  useEffect(() => { if (session) fetchData() }, [session, fetchData])

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|bmp|tiff?)$/i.test(f.name))
    if (files.length === 0) { setError('Aucune image valide sélectionnée.'); return }
    setError('')
    setUploading({ done: 0, total: files.length })

    let ev: EventOpt | undefined
    if (selectedEvent !== NO_EVENT) {
      const [type, id] = selectedEvent.split(':')
      ev = events.find((e) => e.type === type && String(e.id) === id)
    }

    let okCount = 0
    for (let i = 0; i < files.length; i++) {
      try {
        const { blob, name } = await compressImage(files[i])
        const fd = new FormData()
        fd.append('file', blob, name)
        if (ev) { fd.append('eventType', ev.type); fd.append('eventId', String(ev.id)); fd.append('eventLabel', ev.label) }
        const res = await fetch(`/api/groupes/${groupId}/galerie`, { method: 'POST', body: fd })
        if (res.ok) okCount++
        else {
          const d = await res.json().catch(() => ({}))
          setError(d.error || 'Échec d’envoi d’une photo.')
        }
      } catch {
        setError('Une photo n’a pas pu être traitée.')
      }
      setUploading({ done: i + 1, total: files.length })
    }
    setUploading(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    await fetchData()
    if (okCount > 0) setError('')
  }

  const deletePhoto = async (id: number) => {
    if (!confirm('Supprimer cette photo ?')) return
    const res = await fetch(`/api/groupes/${groupId}/galerie/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setLightbox(null)
      await fetchData()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Suppression impossible.')
    }
  }

  const clearAll = async () => {
    if (!confirm('Vider toute la galerie ? Toutes les photos seront définitivement supprimées et l’espace libéré.')) return
    const res = await fetch(`/api/groupes/${groupId}/galerie?scope=all`, { method: 'DELETE' })
    if (res.ok) await fetchData()
    else alert('Suppression impossible.')
  }

  // Groupement en albums (par événement)
  const albums: { key: string; label: string; photos: Photo[] }[] = []
  const map = new Map<string, { key: string; label: string; photos: Photo[] }>()
  for (const p of photos) {
    const key = p.eventType && p.eventId ? `${p.eventType}:${p.eventId}` : NO_EVENT
    const label = key === NO_EVENT ? '📁 Sans événement' : (p.eventLabel || 'Événement')
    if (!map.has(key)) { const a = { key, label, photos: [] as Photo[] }; map.set(key, a); albums.push(a) }
    map.get(key)!.photos.push(p)
  }

  if (loading) return <div className="px-4 py-8 text-gray-500">Chargement…</div>

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24">
      <Link href={`/groupes/${groupId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Retour au groupe
      </Link>

      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📸 Galerie</h1>
          <p className="text-gray-500 text-sm mt-0.5">Partagez vos photos de répétitions et de concerts. Elles sont automatiquement optimisées (&lt; 500 Ko).</p>
        </div>
      </div>

      {storage && storage.limitBytes > 0 && (
        <p className="text-xs text-gray-400 mb-4">Stockage du groupe : {fmtBytes(storage.usedBytes)} / {storage.limitGb} Go utilisés ({storage.percent.toFixed(0)} %)</p>
      )}

      {/* Zone d'ajout */}
      <div className="rounded-2xl border-2 border-dashed border-fuchsia-200 bg-fuchsia-50/40 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Associer à un événement (optionnel)</label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value={NO_EVENT}>Aucun (général)</option>
              {events.map((e) => <option key={`${e.type}:${e.id}`} value={`${e.type}:${e.id}`}>{e.label}</option>)}
            </select>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!!uploading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-fuchsia-500 disabled:opacity-60"
            >
              📷 Ajouter des photos
            </button>
          </div>
        </div>

        {uploading && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-fuchsia-700 font-medium mb-1">
              <span>Optimisation & envoi… {uploading.done}/{uploading.total}</span>
              <span>{Math.round((uploading.done / uploading.total) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-fuchsia-100 overflow-hidden">
              <div className="h-full bg-fuchsia-500 transition-all" style={{ width: `${(uploading.done / uploading.total) * 100}%` }} />
            </div>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <p className="mt-3 text-[11px] text-gray-400">Depuis votre téléphone : prenez ou choisissez plusieurs photos d’un coup. Elles sont compressées sur l’appareil avant l’envoi pour aller plus vite et économiser le stockage.</p>
      </div>

      {/* Actions chef */}
      {isChef && photos.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">{photos.length} photo{photos.length > 1 ? 's' : ''}</p>
          <button onClick={clearAll} className="text-sm font-medium text-red-600 hover:text-red-700">🗑 Vider la galerie</button>
        </div>
      )}

      {/* Albums */}
      {photos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center text-gray-400">
          <p className="text-4xl mb-2">🖼️</p>
          <p className="font-medium text-gray-500">Aucune photo pour l’instant.</p>
          <p className="text-sm">Soyez le premier à partager les souvenirs du groupe !</p>
        </div>
      ) : (
        <div className="space-y-8">
          {albums.map((album) => (
            <div key={album.key}>
              <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                {album.label}
                <span className="text-xs font-normal text-gray-400">({album.photos.length})</span>
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2">
                {album.photos.map((p) => {
                  const idx = photos.findIndex((x) => x.id === p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => setLightbox(idx)}
                      className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.filePath} alt={p.caption || ''} loading="lazy" className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && photos[lightbox] && (
        <Lightbox
          photo={photos[lightbox]}
          canDelete={isChef || photos[lightbox].mine}
          hasPrev={lightbox > 0}
          hasNext={lightbox < photos.length - 1}
          onPrev={() => setLightbox((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setLightbox((i) => (i !== null && i < photos.length - 1 ? i + 1 : i))}
          onClose={() => setLightbox(null)}
          onDelete={() => deletePhoto(photos[lightbox].id)}
        />
      )}
    </div>
  )
}

function Lightbox({ photo, canDelete, hasPrev, hasNext, onPrev, onNext, onClose, onDelete }: {
  photo: Photo
  canDelete: boolean
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  onClose: () => void
  onDelete: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && hasPrev) onPrev()
      else if (e.key === 'ArrowRight' && hasNext) onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hasPrev, hasNext, onPrev, onNext, onClose])

  const dl = `${photo.filePath.split('/').pop() || 'photo'}`

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 text-white/90" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm truncate">Par {photo.uploader.name}</span>
        <div className="flex items-center gap-3">
          <a href={photo.filePath} download={dl} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 text-sm font-medium">⬇ Télécharger</a>
          {canDelete && <button onClick={onDelete} className="inline-flex items-center gap-1 rounded-lg bg-red-600/80 hover:bg-red-600 px-3 py-1.5 text-sm font-medium">🗑</button>}
          <button onClick={onClose} className="rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 text-sm">✕</button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative min-h-0 px-2" onClick={(e) => e.stopPropagation()}>
        {hasPrev && (
          <button onClick={onPrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white text-xl">‹</button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.filePath} alt={photo.caption || ''} className="max-h-full max-w-full object-contain rounded-lg" />
        {hasNext && (
          <button onClick={onNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white text-xl">›</button>
        )}
      </div>

      <div className="px-4 py-3 text-center text-white/70 text-sm" onClick={(e) => e.stopPropagation()}>
        {photo.caption && <p className="mb-1 text-white/90">{photo.caption}</p>}
        {new Date(photo.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  )
}

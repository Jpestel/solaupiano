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

interface Category { id: number; name: string }

export default function GaleriePage({ params }: { params: { id: string } }) {
  const groupId = params.id
  const { data: session } = useSession()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [events, setEvents] = useState<EventOpt[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isChef, setIsChef] = useState(false)
  const [storage, setStorage] = useState<Storage | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAssoc, setSelectedAssoc] = useState<string>('') // '' = rien ; sinon TYPE:id
  const [newCatOpen, setNewCatOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [creatingCat, setCreatingCat] = useState(false)
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState<number | null>(null) // index dans photos
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/groupes/${groupId}/galerie`)
    if (res.ok) {
      const d = await res.json()
      setPhotos(d.photos); setEvents(d.events); setCategories(d.categories || []); setIsChef(d.isChef); setStorage(d.storage)
    }
    setLoading(false)
  }, [groupId])

  useEffect(() => { if (session) fetchData() }, [session, fetchData])

  // Résout l'association choisie en { type, id, label }
  const resolveAssoc = (): { type: string; id: number; label: string } | null => {
    if (!selectedAssoc) return null
    const [type, idStr] = selectedAssoc.split(':')
    const id = Number(idStr)
    if (type === 'CATEGORY') {
      const c = categories.find((c) => c.id === id)
      return c ? { type, id, label: `📁 ${c.name}` } : null
    }
    const e = events.find((e) => e.type === type && e.id === id)
    return e ? { type: e.type, id: e.id, label: e.label } : null
  }

  const triggerPicker = () => {
    if (!selectedAssoc) { setError('Choisissez d’abord une répétition, un concert ou une catégorie ci-dessus.'); return }
    setError('')
    fileInputRef.current?.click()
  }

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const assoc = resolveAssoc()
    if (!assoc) { setError('Choisissez d’abord une répétition, un concert ou une catégorie.'); return }
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|bmp|tiff?)$/i.test(f.name))
    if (files.length === 0) { setError('Aucune image valide sélectionnée.'); return }
    setError('')
    setUploading({ done: 0, total: files.length })

    let okCount = 0
    for (let i = 0; i < files.length; i++) {
      try {
        const { blob, name } = await compressImage(files[i])
        const fd = new FormData()
        fd.append('file', blob, name)
        fd.append('eventType', assoc.type)
        fd.append('eventId', String(assoc.id))
        fd.append('eventLabel', assoc.label)
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

  const createCategory = async () => {
    const name = newCatName.trim()
    if (!name) return
    setCreatingCat(true)
    const res = await fetch(`/api/groupes/${groupId}/galerie/categories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    })
    setCreatingCat(false)
    if (res.ok) {
      const cat: Category = await res.json()
      setCategories((prev) => (prev.some((c) => c.id === cat.id) ? prev : [...prev, cat].sort((a, b) => a.name.localeCompare(b.name))))
      setSelectedAssoc(`CATEGORY:${cat.id}`)
      setNewCatOpen(false); setNewCatName(''); setError('')
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Création de la catégorie impossible.')
    }
  }

  const deleteCategory = async (catId: number) => {
    if (!confirm('Supprimer cette catégorie et toutes ses photos ?')) return
    const res = await fetch(`/api/groupes/${groupId}/galerie/categories/${catId}`, { method: 'DELETE' })
    if (res.ok) { if (selectedAssoc === `CATEGORY:${catId}`) setSelectedAssoc(''); await fetchData() }
    else alert('Suppression impossible.')
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

  // Groupement en albums (par événement / catégorie)
  const albums: { key: string; label: string; categoryId: number | null; photos: Photo[] }[] = []
  const map = new Map<string, { key: string; label: string; categoryId: number | null; photos: Photo[] }>()
  for (const p of photos) {
    const key = p.eventType && p.eventId ? `${p.eventType}:${p.eventId}` : 'none'
    const label = key === 'none' ? '📁 Sans événement' : (p.eventLabel || 'Album')
    const categoryId = p.eventType === 'CATEGORY' && p.eventId ? p.eventId : null
    if (!map.has(key)) { const a = { key, label, categoryId, photos: [] as Photo[] }; map.set(key, a); albums.push(a) }
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
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Associer à <span className="text-fuchsia-700">(obligatoire)</span>
            </label>
            <select
              value={selectedAssoc}
              onChange={(e) => setSelectedAssoc(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">— Choisir une répétition, un concert ou une catégorie —</option>
              {events.length > 0 && (
                <optgroup label="Répétitions & concerts (du plus proche au plus lointain)">
                  {events.map((e) => <option key={`${e.type}:${e.id}`} value={`${e.type}:${e.id}`}>{e.label}</option>)}
                </optgroup>
              )}
              {categories.length > 0 && (
                <optgroup label="Catégories">
                  {categories.map((c) => <option key={`CATEGORY:${c.id}`} value={`CATEGORY:${c.id}`}>📁 {c.name}</option>)}
                </optgroup>
              )}
            </select>
            <div className="mt-1.5">
              {newCatOpen ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') createCategory() }}
                    placeholder="Nom de la catégorie (ex : Studio, Clip…)"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                    maxLength={60}
                  />
                  <button onClick={createCategory} disabled={creatingCat || !newCatName.trim()} className="rounded-lg bg-fuchsia-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50">{creatingCat ? '…' : 'Créer'}</button>
                  <button onClick={() => { setNewCatOpen(false); setNewCatName('') }} className="text-sm text-gray-400 hover:text-gray-600">Annuler</button>
                </div>
              ) : (
                <button onClick={() => setNewCatOpen(true)} className="text-xs font-medium text-fuchsia-700 hover:text-fuchsia-800">➕ Créer une catégorie (si aucune date ne convient)</button>
              )}
            </div>
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
              onClick={triggerPicker}
              disabled={!!uploading || !selectedAssoc}
              title={!selectedAssoc ? 'Choisissez d’abord une association' : undefined}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed"
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
        <p className="mt-3 text-[11px] text-gray-400">Depuis votre téléphone : choisissez d’abord la répétition/le concert (ou une catégorie), puis prenez ou sélectionnez plusieurs photos d’un coup. Elles sont compressées sur l’appareil avant l’envoi (&lt; 500 Ko) pour aller plus vite et économiser le stockage.</p>
      </div>

      {/* Instructions de téléchargement */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 mb-6">
        <p className="text-sm font-semibold text-blue-800 mb-1">⬇️ Comment récupérer / télécharger les photos ?</p>
        <ol className="text-sm text-blue-800/90 space-y-0.5 list-decimal list-inside">
          <li>Touchez une photo pour l’ouvrir en grand.</li>
          <li>Appuyez sur le bouton <strong>« ⬇ Télécharger »</strong> en haut.</li>
          <li><span className="text-blue-700">Sur mobile :</span> vous pouvez aussi faire un <strong>appui long sur la photo</strong> puis « Enregistrer l’image ».</li>
        </ol>
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
                {isChef && album.categoryId !== null && (
                  <button onClick={() => deleteCategory(album.categoryId!)} className="ml-1 text-[11px] font-medium text-red-500 hover:text-red-600">Supprimer l’album</button>
                )}
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

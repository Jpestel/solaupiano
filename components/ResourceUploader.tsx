'use client'

import { useState, useRef } from 'react'
import { getResourceIcon } from '@/lib/utils'

interface ResourceUploaderProps {
  songId: number
  onUpload?: () => void
  uploadEnabled?: boolean   // false = plan sans stockage (quota 0) → fichiers bloqués
}

export function ResourceUploader({ songId, onUpload, uploadEnabled = true }: ResourceUploaderProps) {
  const [mode, setMode] = useState<'file' | 'url'>(uploadEnabled ? 'file' : 'url')

  // File state
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [name, setName] = useState('')
  const [type, setType] = useState('AUTRE')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // URL state
  const [url, setUrl] = useState('')
  const [urlName, setUrlName] = useState('')
  const [savingUrl, setSavingUrl] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const resetState = () => {
    setError('')
    setSuccess('')
    setSelectedFile(null)
    setName('')
    setType('AUTRE')
    setProgress(0)
    setUrl('')
    setUrlName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleFileSelect = (file: File) => {
    if (file.size > 100 * 1024 * 1024) { setError('Le fichier ne doit pas dépasser 100 Mo.'); return }
    setSelectedFile(file)
    setError('')
    if (!name) setName(file.name.replace(/\.[^/.]+$/, ''))
    const mime = file.type
    if (mime.startsWith('audio/')) setType('AUDIO')
    else if (mime === 'application/pdf') setType('PDF')
    else if (mime.startsWith('image/')) setType('IMAGE')
    else setType('AUTRE')
  }

  const handleUpload = async () => {
    if (!selectedFile || !name) return
    setUploading(true)
    setError('')
    setSuccess('')
    setProgress(0)

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('name', name)
    formData.append('type', type)

    try {
      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
      })
      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(xhr.responseText)))
        xhr.onerror = () => reject(new Error('Erreur réseau'))
        xhr.open('POST', `/api/morceaux/${songId}/ressources`)
        xhr.send(formData)
      })
      setSuccess('Fichier téléversé avec succès !')
      resetState()
      onUpload?.()
    } catch {
      setError('Erreur lors du téléversement. Veuillez réessayer.')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveUrl = async () => {
    if (!url.trim() || !urlName.trim()) return
    setSavingUrl(true)
    setError('')
    setSuccess('')
    const res = await fetch(`/api/morceaux/${songId}/ressources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim(), name: urlName.trim() }),
    })
    setSavingUrl(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Erreur.')
    } else {
      setSuccess('Lien ajouté avec succès !')
      resetState()
      onUpload?.()
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode tabs — l'onglet Fichier disparaît si le plan n'autorise pas le stockage */}
      <div className="flex rounded-lg border border-gray-200 p-1 bg-white w-fit gap-1">
        {[
          ...(uploadEnabled ? [{ key: 'file', label: '📁 Fichier' }] : []),
          { key: 'url', label: '🔗 Lien URL' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setMode(tab.key as 'file' | 'url'); resetState() }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === tab.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!uploadEnabled && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          📁 L&apos;upload de fichiers n&apos;est pas inclus dans le plan de ce groupe (stockage à 0).
          Vous pouvez ajouter des <strong>liens</strong> (YouTube, SoundCloud…) sans limite.{' '}
          <a href="/tarifs" className="font-semibold underline hover:text-amber-900">Voir les forfaits avec stockage →</a>
        </div>
      )}

      {mode === 'file' ? (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f) }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/30'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              accept=".pdf,.mp3,.wav,.flac,.aac,.ogg,.m4a,.jpg,.jpeg,.png,.gif,.webp"
            />
            <div className="text-4xl mb-2">{selectedFile ? getResourceIcon(type) : '📁'}</div>
            {selectedFile ? (
              <p className="text-sm font-medium text-gray-700">{selectedFile.name}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">Glissez un fichier ou cliquez pour sélectionner</p>
                <p className="text-xs text-gray-500 mt-1">PDF, Audio (MP3, WAV…), Image — max 100 Mo</p>
              </>
            )}
          </div>

          {selectedFile && (
            <div className="space-y-3">
              <div>
                <label className="form-label">Nom de la ressource</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="form-input" placeholder="ex: Partition voix soprano" />
              </div>
              <div>
                <label className="form-label">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="form-input">
                  <option value="PDF">📄 PDF</option>
                  <option value="AUDIO">🎵 Audio</option>
                  <option value="IMAGE">🎼 Partition / Image</option>
                  <option value="GRILLE">🎸 Grille d&apos;accords</option>
                  <option value="AUTRE">📎 Autre</option>
                </select>
              </div>
              {uploading && (
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Téléversement…</span><span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
              <button
                onClick={handleUpload}
                disabled={uploading || !name}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Téléversement…' : 'Téléverser'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="form-label">
              URL <span className="text-gray-400 font-normal">(YouTube, SoundCloud, site web…)</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="form-input"
              placeholder="https://www.youtube.com/watch?v=..."
              autoFocus
            />
          </div>
          <div>
            <label className="form-label">Nom du lien</label>
            <input
              type="text"
              value={urlName}
              onChange={(e) => setUrlName(e.target.value)}
              className="form-input"
              placeholder="ex: Vidéo YouTube originale"
            />
          </div>
          <button
            onClick={handleSaveUrl}
            disabled={savingUrl || !url.trim() || !urlName.trim()}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {savingUrl ? 'Enregistrement…' : 'Ajouter le lien'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{success}</p>}
    </div>
  )
}

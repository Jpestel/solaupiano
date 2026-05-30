'use client'

import { useState, useRef } from 'react'
import { getResourceIcon } from '@/lib/utils'

interface PendingResourceUploaderProps {
  groupId: string
  songId: number
  onSubmit?: () => void
}

export function PendingResourceUploader({ groupId, songId, onSubmit }: PendingResourceUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [name, setName] = useState('')
  const [type, setType] = useState('AUTRE')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const resetState = () => {
    setError('')
    setSuccess('')
    setSelectedFile(null)
    setName('')
    setType('AUTRE')
    setProgress(0)
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
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) return resolve()
          let msg = 'Erreur lors de la soumission. Veuillez réessayer.'
          try { const d = JSON.parse(xhr.responseText); if (d?.error) msg = d.error } catch {}
          reject(new Error(msg))
        }
        xhr.onerror = () => reject(new Error('Erreur réseau — vérifiez votre connexion.'))
        xhr.open('POST', `/api/groupes/${groupId}/morceaux/${songId}/soumettre`)
        xhr.send(formData)
      })
      setSuccess('Fichier soumis au chef pour validation !')
      resetState()
      onSubmit?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la soumission. Veuillez réessayer.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
          📬 Ce fichier sera soumis au chef pour validation avant d&apos;être ajouté au répertoire.
        </span>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f) }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-amber-500 bg-amber-50' : 'border-gray-300 bg-gray-50 hover:border-amber-400 hover:bg-amber-50/30'
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
                <span>Envoi en cours…</span><span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          <button
            onClick={handleUpload}
            disabled={uploading || !name}
            className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Envoi en cours…' : 'Soumettre au chef'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{success}</p>}
    </div>
  )
}

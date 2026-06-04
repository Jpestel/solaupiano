'use client'

import { useState, useRef } from 'react'
import { getResourceIcon } from '@/lib/utils'
import { imagesToPdfBlob } from '@/lib/images-to-pdf'

interface ResourceUploaderProps {
  songId: number
  onUpload?: () => void
  uploadEnabled?: boolean   // false = plan sans stockage (quota 0) → fichiers bloqués
  canImg2Pdf?: boolean      // module « Images → PDF » activé pour ce plan
}

const isImageFile = (f: File) => f.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|tiff?)$/i.test(f.name)

export function ResourceUploader({ songId, onUpload, uploadEnabled = true, canImg2Pdf = false }: ResourceUploaderProps) {
  const [mode, setMode] = useState<'file' | 'url'>(uploadEnabled ? 'file' : 'url')

  // File state
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [name, setName] = useState('')
  const [type, setType] = useState('AUTRE')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  // Conversion image → PDF
  const [imageBatch, setImageBatch] = useState<File[] | null>(null) // plusieurs photos → 1 PDF
  const [convertToPdf, setConvertToPdf] = useState(false)
  const [converting, setConverting] = useState(false)
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
    setImageBatch(null)
    setConvertToPdf(false)
    setName('')
    setType('AUTRE')
    setProgress(0)
    setUrl('')
    setUrlName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSingle = (file: File) => {
    if (file.size > 100 * 1024 * 1024) { setError('Le fichier ne doit pas dépasser 100 Mo.'); return }
    setSelectedFile(file)
    setImageBatch(null)
    setConvertToPdf(false)
    setError('')
    if (!name) setName(file.name.replace(/\.[^/.]+$/, ''))
    const mime = file.type
    if (mime.startsWith('video/')) setType('VIDEO')
    else if (mime.startsWith('audio/')) setType('AUDIO')
    else if (mime === 'application/pdf') setType('PDF')
    else if (mime.startsWith('image/')) setType('IMAGE')
    else setType('AUTRE')
  }

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return
    setError('')
    // Plusieurs photos + module actif → regroupement en un seul PDF
    if (files.length > 1 && canImg2Pdf && files.every(isImageFile)) {
      if (files.some((f) => f.size > 100 * 1024 * 1024)) { setError('Chaque image doit faire moins de 100 Mo.'); return }
      setSelectedFile(null)
      setImageBatch(files)
      setConvertToPdf(true)
      setType('PDF')
      if (!name) setName('Partition')
      return
    }
    handleSingle(files[0])
  }

  const uploadToServer = (file: File, fName: string, fType: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', fName)
    formData.append('type', fType)
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
      })
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) return resolve()
        let msg = 'Erreur lors du téléversement. Veuillez réessayer.'
        try { const d = JSON.parse(xhr.responseText); if (d?.error) msg = d.error } catch {}
        reject(new Error(msg))
      }
      xhr.onerror = () => reject(new Error('Erreur réseau — vérifiez votre connexion.'))
      xhr.open('POST', `/api/morceaux/${songId}/ressources`)
      xhr.send(formData)
    })
  }

  const handleUpload = async () => {
    const willConvert = !!imageBatch || (!!selectedFile && convertToPdf && isImageFile(selectedFile))
    if ((!selectedFile && !imageBatch) || !name) return
    setUploading(true); setError(''); setSuccess(''); setProgress(0)

    try {
      let fileToSend: File
      let typeToSend = type
      if (willConvert) {
        setConverting(true)
        const sources = imageBatch ?? [selectedFile!]
        const blob = await imagesToPdfBlob(sources, 'image')
        setConverting(false)
        const baseName = name.replace(/\.pdf$/i, '')
        fileToSend = new File([blob], `${baseName}.pdf`, { type: 'application/pdf' })
        typeToSend = 'PDF'
      } else {
        fileToSend = selectedFile!
      }
      await uploadToServer(fileToSend, name, typeToSend)
      setSuccess(willConvert ? 'Photo(s) converties en PDF et ajoutées !' : 'Fichier téléversé avec succès !')
      resetState()
      onUpload?.()
    } catch (e) {
      setConverting(false)
      setError(e instanceof Error ? e.message : 'Erreur lors du téléversement. Veuillez réessayer.')
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
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(Array.from(e.dataTransfer.files)) }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/30'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
              accept=".pdf,.mp3,.wav,.flac,.aac,.ogg,.m4a,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tif,.tiff,.mp4,.webm,.mov,.m4v,.ogv"
            />
            <div className="text-4xl mb-2">{imageBatch ? '📄' : selectedFile ? getResourceIcon(type) : '📁'}</div>
            {imageBatch ? (
              <p className="text-sm font-medium text-gray-700">{imageBatch.length} photos sélectionnées</p>
            ) : selectedFile ? (
              <p className="text-sm font-medium text-gray-700">{selectedFile.name}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">Glissez un fichier ou cliquez pour sélectionner</p>
                <p className="text-xs text-gray-500 mt-1">PDF, Audio, Image — max 100 Mo{canImg2Pdf ? ' · plusieurs photos = 1 PDF' : ''}</p>
              </>
            )}
          </div>

          {/* Lot de photos → PDF */}
          {imageBatch && (
            <div className="space-y-3">
              <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-700">
                📄 {imageBatch.length} photos seront réunies en <strong>un seul PDF</strong> (idéal pour une partition multi-pages). L&apos;ordre suit votre sélection.
              </div>
              <div>
                <label className="form-label">Nom du PDF</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="form-input" placeholder="ex: Partition — Mistral gagnant" />
              </div>
              {(uploading || converting) && (
                <p className="text-sm text-amber-600">{converting ? '⏳ Conversion en PDF…' : `Téléversement… ${progress}%`}</p>
              )}
              <button onClick={handleUpload} disabled={uploading || !name}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors">
                {converting ? 'Conversion…' : uploading ? 'Téléversement…' : '📄 Convertir en PDF et ajouter'}
              </button>
            </div>
          )}

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
                  <option value="VIDEO">🎬 Vidéo</option>
                  <option value="IMAGE">🎼 Partition / Image</option>
                  <option value="GRILLE">🎸 Grille d&apos;accords</option>
                  <option value="AUTRE">📎 Autre</option>
                </select>
              </div>

              {/* Conversion d'une photo en PDF (si module activé) */}
              {canImg2Pdf && selectedFile && isImageFile(selectedFile) && (
                <label className="flex items-start gap-2.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 cursor-pointer">
                  <input type="checkbox" checked={convertToPdf} onChange={(e) => { setConvertToPdf(e.target.checked); if (e.target.checked) setType('PDF') }} className="mt-0.5 rounded border-gray-300 text-violet-600" />
                  <span className="text-xs text-violet-800">
                    <strong>📄 Convertir cette photo en PDF</strong><br />
                    <span className="text-violet-600">Pratique pour une partition prise en photo au téléphone.</span>
                  </span>
                </label>
              )}

              {uploading && (
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>{converting ? 'Conversion en PDF…' : 'Téléversement…'}</span><span>{converting ? '' : `${progress}%`}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: converting ? '100%' : `${progress}%` }} />
                  </div>
                </div>
              )}
              <button
                onClick={handleUpload}
                disabled={uploading || !name}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {converting ? 'Conversion…' : uploading ? 'Téléversement…' : convertToPdf ? '📄 Convertir en PDF et ajouter' : 'Téléverser'}
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

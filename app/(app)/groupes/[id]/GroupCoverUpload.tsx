'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface GroupCoverUploadProps {
  groupId: number
  initialCoverUrl: string | null
  canEdit: boolean
  groupName: string
}

export function GroupCoverUpload({ groupId, initialCoverUrl, canEdit, groupName }: GroupCoverUploadProps) {
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const initials = groupName.slice(0, 2).toUpperCase()

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Image requise.')
      return
    }
    setUploading(true)
    setError('')
    const formData = new FormData()
    formData.append('cover', file)
    const res = await fetch(`/api/groupes/${groupId}/cover`, { method: 'POST', body: formData })
    setUploading(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || "Erreur lors de l'upload.")
      return
    }
    const { coverUrl: url } = await res.json()
    setCoverUrl(url)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer la photo du groupe ?')) return
    setUploading(true)
    await fetch(`/api/groupes/${groupId}/cover`, { method: 'DELETE' })
    setUploading(false)
    setCoverUrl(null)
    router.refresh()
  }

  return (
    <div className="relative flex-shrink-0 group/cover">
      <div
        className={`w-16 h-16 rounded-2xl overflow-hidden shadow-md ring-2 ring-gray-100 ${canEdit ? 'cursor-pointer' : ''}`}
        onClick={() => canEdit && fileInputRef.current?.click()}
        title={canEdit ? 'Changer la photo du groupe' : undefined}
      >
        {coverUrl ? (
          <img src={coverUrl} alt={groupName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xl select-none">
            {initials}
          </div>
        )}

        {canEdit && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl pointer-events-none">
            {uploading
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            }
          </div>
        )}
      </div>

      {canEdit && coverUrl && !uploading && (
        <button
          onClick={handleDelete}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center shadow hover:bg-red-600 transition-colors z-10"
          title="Supprimer la photo"
        >
          ✕
        </button>
      )}

      {canEdit && (
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      )}

      {error && (
        <p className="absolute top-full mt-1 left-0 text-[10px] text-red-500 whitespace-nowrap bg-white rounded px-1 shadow-sm">
          {error}
        </p>
      )}
    </div>
  )
}

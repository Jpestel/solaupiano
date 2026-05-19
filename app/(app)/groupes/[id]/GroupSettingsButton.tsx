'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LookingForSelector } from '@/components/ui/LookingForSelector'

interface Props {
  groupId: number
  initialName: string
  initialDescription: string | null
  initialIsPublic: boolean
  initialLookingFor: string[]
}

export function GroupSettingsButton({ groupId, initialName, initialDescription, initialIsPublic, initialLookingFor }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription || '')
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [lookingFor, setLookingFor] = useState<string[]>(initialLookingFor)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const res = await fetch(`/api/groupes/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        isPublic,
        lookingFor: lookingFor.length > 0 ? JSON.stringify(lookingFor) : null,
      }),
    })

    setLoading(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Erreur.')
      return
    }
    setOpen(false)
    router.refresh()
  }

  const cancel = () => {
    setOpen(false)
    setName(initialName)
    setDescription(initialDescription || '')
    setIsPublic(initialIsPublic)
    setLookingFor(initialLookingFor)
    setError('')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        title="Paramètres du groupe"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Paramètres
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 my-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Paramètres du groupe</h3>
            {error && (
              <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Nom du groupe</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Description <span className="text-gray-400 font-normal">(optionnel)</span></label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-input"
                  placeholder="Description du groupe..."
                />
              </div>
              <div>
                <label className="form-label">Visibilité</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  {[
                    { value: true, icon: '🌐', label: 'Public', desc: 'Visible par tous les musiciens' },
                    { value: false, icon: '🔒', label: 'Privé', desc: 'Invitation par email uniquement' },
                  ].map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setIsPublic(opt.value)}
                      className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-colors ${
                        isPublic === opt.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className="text-sm font-semibold">{opt.label}</span>
                      <span className="text-xs text-gray-500 leading-tight">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">
                  Musiciens recherchés <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <p className="text-xs text-gray-400 mb-2">Visible par les autres musiciens si le groupe est public.</p>
                <LookingForSelector value={lookingFor} onChange={setLookingFor} />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

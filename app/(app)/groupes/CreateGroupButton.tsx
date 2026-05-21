'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LookingForSelector } from '@/components/ui/LookingForSelector'

export function CreateGroupButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private' | 'hidden'>('public')
  const [lookingFor, setLookingFor] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/groupes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic: visibility === 'public',
        isHidden: visibility === 'hidden',
        lookingFor: lookingFor.length > 0 ? JSON.stringify(lookingFor) : null,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Une erreur est survenue.')
      return
    }

    const group = await res.json()
    router.push(`/groupes/${group.id}`)
    router.refresh()
  }

  const reset = () => { setOpen(false); setName(''); setDescription(''); setVisibility('public'); setLookingFor([]); setError('') }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="hidden sm:inline">Créer un groupe</span>
        <span className="sm:hidden">Créer</span>
      </button>
    )
  }

  return (
    <div className="w-full rounded-xl border border-indigo-200 bg-indigo-50 p-5 mb-6">
      <h3 className="font-semibold text-gray-900 mb-4">Nouveau groupe</h3>
      {error && (
        <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="form-label">Nom du groupe <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
            placeholder="ex: Les Rockeurs du Havre"
          />
        </div>
        <div>
          <label className="form-label">Description <span className="text-gray-400 font-normal">(optionnel)</span></label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-input"
            placeholder="ex: Groupe de reprises rock années 80"
          />
        </div>
        <div>
          <label className="form-label">Visibilité</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {([
              { value: 'public',  icon: '🌐', label: 'Public',  desc: 'Visible et ouvert aux demandes' },
              { value: 'private', icon: '🔒', label: 'Privé',   desc: 'Visible, invitation uniquement' },
              { value: 'hidden',  icon: '🙈', label: 'Masqué',  desc: 'Invisible, invitation uniquement' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVisibility(opt.value)}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-colors ${
                  visibility === opt.value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-xl">{opt.icon}</span>
                <span className="text-xs font-semibold">{opt.label}</span>
                <span className="text-[10px] text-gray-500 leading-tight">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="form-label">
            Musiciens recherchés <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          <p className="text-xs text-gray-400 mb-2">Si votre groupe est public, ces informations seront visibles par les autres musiciens.</p>
          <LookingForSelector value={lookingFor} onChange={setLookingFor} />
        </div>
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Création...' : 'Créer le groupe'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}

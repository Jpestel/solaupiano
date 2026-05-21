'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { LookingForSelector } from '@/components/ui/LookingForSelector'
import { PLANS, GroupPlan } from '@/lib/plans'

export function CreateGroupButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private' | 'hidden'>('public')
  const [lookingFor, setLookingFor] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setName('')
    setDescription('')
    setVisibility('public')
    setLookingFor([])
    setError('')
  }

  const handleClose = () => {
    setOpen(false)
    reset()
  }

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
    handleClose()
    router.push(`/groupes/${group.id}`)
    router.refresh()
  }

  return (
    <>
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

      <Modal isOpen={open} onClose={handleClose} title="Créer un groupe">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
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
          {/* Plan selection */}
          <div>
            <label className="form-label">Plan</label>
            <p className="text-xs text-gray-400 mb-2">Tous les groupes démarrent sur le plan Gratuit. Les plans payants seront bientôt disponibles.</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PLANS) as GroupPlan[]).map((key) => {
                const p = PLANS[key]
                const isFree = key === 'FREE'
                return (
                  <div
                    key={key}
                    className={`rounded-xl border-2 p-3 text-center transition-all ${
                      isFree
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <p className={`text-xs font-bold ${isFree ? 'text-indigo-700' : 'text-gray-500'}`}>{p.label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{p.storageLabel}</p>
                    {isFree ? (
                      <span className="inline-block mt-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">Inclus</span>
                    ) : (
                      <span className="inline-block mt-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-400">Bientôt dispo</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose}>Annuler</Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Création...' : 'Créer le groupe'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

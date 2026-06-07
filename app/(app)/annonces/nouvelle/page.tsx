'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ph } from '@/lib/placeholders'

interface Category {
  id: number
  key: string
  label: string
  emoji: string
  hint: string | null
}

export default function NouvelleAnnoncePage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/annonces/categories')
      .then(r => r.json())
      .then(setCategories)
      .catch(() => {})
  }, [])

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('La photo ne doit pas dépasser 5 Mo.'); return }
    setPhoto(file)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!category) { setError('Choisissez une catégorie.'); return }
    if (!contactEmail && !contactPhone) { setError('Renseignez au moins un moyen de contact.'); return }

    setLoading(true)
    const fd = new FormData()
    fd.append('title', title)
    fd.append('description', description)
    fd.append('category', category)
    if (price) fd.append('price', price)
    if (location) fd.append('location', location)
    if (contactEmail) fd.append('contactEmail', contactEmail)
    if (contactPhone) fd.append('contactPhone', contactPhone)
    if (photo) fd.append('photo', photo)

    const res = await fetch('/api/annonces', { method: 'POST', body: fd })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      if (data.code === 'PLAN_FEATURE_LOCKED') {
        setError('Les petites annonces sont disponibles avec un plan Pro ou Premium. Mettez à niveau votre groupe depuis la page du groupe.')
      } else {
        setError(data.error || 'Erreur lors de la publication.')
      }
      return
    }

    setSubmitted(true)
  }

  // Confirmation après soumission
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-3xl mx-auto mb-4">⏳</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Annonce déposée !</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Votre annonce a bien été reçue. Elle sera visible dès que l&apos;administrateur l&apos;aura validée.
            Vous recevrez une confirmation par email.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/annonces" className="rounded-xl border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              Voir les annonces
            </Link>
            <Link href="/annonces/mes-annonces" className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
              Mes annonces
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const selectedCat = categories.find(c => c.key === category)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/annonces" className="text-sm text-gray-500 hover:text-indigo-600">← Annonces</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Déposer une annonce</h1>
      </div>

      <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2">
        <span className="text-base mt-0.5">ℹ️</span>
        <p className="text-sm text-amber-800">Votre annonce sera visible après validation par l&apos;administrateur.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Catégorie */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Type d&apos;annonce</h2>
          {categories.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Chargement des catégories…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key)}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    category === cat.key
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <div>
                    <p className={`text-sm font-semibold ${category === cat.key ? 'text-indigo-700' : 'text-gray-800'}`}>
                      {cat.label}
                    </p>
                    {cat.hint && <p className="text-xs text-gray-400">{cat.hint}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Infos principales */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Votre annonce</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              maxLength={100}
              placeholder={ph('annonces_nouvelle_1')}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              rows={5}
              placeholder={ph('annonces_nouvelle_2')}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {selectedCat?.key === 'MATERIEL' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix (€)</label>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  min={0}
                  placeholder={ph('annonces_nouvelle_3')}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
            <div className={selectedCat?.key === 'MATERIEL' ? '' : 'col-span-2'}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville / région</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder={ph('annonces_nouvelle_4')}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo (optionnelle, 5 Mo max)</label>
            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200">
                <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => { setPhoto(null); setPhotoPreview(null) }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-sm hover:bg-black/70"
                >✕</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                <span className="text-2xl mb-1">📷</span>
                <span className="text-sm text-gray-500">Cliquez pour ajouter une photo</span>
                <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">Vos coordonnées</h2>
            <p className="text-xs text-gray-400 mt-0.5">Visibles uniquement pour les membres connectés</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email de contact</label>
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder={ph('annonces_nouvelle_5')}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              placeholder={ph('annonces_nouvelle_6')}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <p className="text-xs text-gray-400">Au moins un moyen de contact est obligatoire.</p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/annonces" className="flex-1 text-center rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Envoi…' : 'Soumettre l\'annonce'}
          </button>
        </div>
      </form>
    </div>
  )
}

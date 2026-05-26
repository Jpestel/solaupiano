'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Category {
  id: number
  key: string
  label: string
  emoji: string
  hint: string | null
}

interface Annonce {
  id: number
  title: string
  description: string
  category: string
  price: number | null
  location: string | null
  photoPath: string | null
  contactEmail: string | null
  contactPhone: string | null
  status: string
}

export default function ModifierAnnoncePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [annonce, setAnnonce] = useState<Annonce | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/annonces/${id}`).then(r => r.json()),
      fetch('/api/annonces/categories').then(r => r.json()),
    ]).then(([a, cats]) => {
      if (a.error) { setNotFound(true); setLoading(false); return }
      setAnnonce(a)
      setCategories(cats)
      // Pré-remplir
      setCategory(a.category)
      setTitle(a.title)
      setDescription(a.description)
      setPrice(a.price != null ? String(a.price) : '')
      setLocation(a.location || '')
      setContactEmail(a.contactEmail || '')
      setContactPhone(a.contactPhone || '')
      setPhotoPreview(a.photoPath || null)
      setLoading(false)
    }).catch(() => { setNotFound(true); setLoading(false) })
  }, [id])

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('La photo ne doit pas dépasser 5 Mo.'); return }
    setPhoto(file)
    setRemovePhoto(false)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setPhoto(null)
    setPhotoPreview(null)
    setRemovePhoto(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!category) { setError('Choisissez une catégorie.'); return }
    if (!contactEmail && !contactPhone) { setError('Renseignez au moins un moyen de contact.'); return }

    setSaving(true)
    const fd = new FormData()
    fd.append('title', title)
    fd.append('description', description)
    fd.append('category', category)
    if (price) fd.append('price', price)
    if (location) fd.append('location', location)
    if (contactEmail) fd.append('contactEmail', contactEmail)
    if (contactPhone) fd.append('contactPhone', contactPhone)
    if (photo) fd.append('photo', photo)
    if (removePhoto) fd.append('removePhoto', 'true')

    const res = await fetch(`/api/annonces/${id}`, { method: 'PUT', body: fd })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) { setError(data.error || 'Erreur lors de la modification.'); return }

    setSaved(true)
  }

  if (loading) return <div className="max-w-2xl mx-auto py-20 text-center text-gray-400">Chargement…</div>
  if (notFound) return (
    <div className="max-w-lg mx-auto py-20 text-center">
      <p className="text-4xl mb-3">🔍</p>
      <p className="text-gray-500 mb-4">Annonce introuvable ou accès refusé.</p>
      <Link href="/annonces/mes-annonces" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">← Mes annonces</Link>
    </div>
  )

  if (saved) return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-3xl mx-auto mb-4">⏳</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Modifications envoyées !</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Votre annonce modifiée a été soumise à nouveau. Elle sera visible dès validation par l&apos;administrateur.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/annonces/mes-annonces" className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
            Mes annonces
          </Link>
          <Link href="/annonces" className="rounded-xl border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Voir les annonces
          </Link>
        </div>
      </div>
    </div>
  )

  const selectedCat = categories.find(c => c.key === category)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/annonces/mes-annonces" className="text-sm text-gray-500 hover:text-indigo-600">← Mes annonces</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Modifier l&apos;annonce</h1>
      </div>

      {annonce?.status === 'PENDING' && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2">
          <span className="text-base mt-0.5">⏳</span>
          <p className="text-sm text-amber-800">Cette annonce est actuellement <strong>en attente de validation</strong>. Toute modification la soumettra à nouveau.</p>
        </div>
      )}
      {annonce?.status === 'MASQUEE' && (
        <div className="mb-4 rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 flex items-start gap-2">
          <span className="text-base mt-0.5">⚠️</span>
          <p className="text-sm text-orange-800">Cette annonce a été <strong>refusée ou masquée</strong> par l&apos;administrateur. Modifiez-la et soumettez-la à nouveau.</p>
        </div>
      )}

      <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-start gap-2">
        <span className="text-base mt-0.5">ℹ️</span>
        <p className="text-sm text-blue-800">Après modification, votre annonce sera soumise à nouveau pour validation avant d&apos;être publiée.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Catégorie */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Type d&apos;annonce</h2>
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
        </div>

        {/* Infos */}
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
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo (5 Mo max)</label>
            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200">
                <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
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
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <p className="text-xs text-gray-400">Au moins un moyen de contact est obligatoire.</p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex gap-3">
          <Link href="/annonces/mes-annonces" className="flex-1 text-center rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Envoi…' : 'Enregistrer et resoumettre'}
          </button>
        </div>
      </form>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const CATEGORIES = [
  { key: 'MATERIEL', label: 'Matériel à vendre', emoji: '🎸', hint: 'Instruments, amplis, accessoires…' },
  { key: 'MUSICIEN', label: 'Recherche musicien', emoji: '👤', hint: 'Votre groupe cherche un profil' },
  { key: 'GROUPE',   label: 'Recherche groupe',   emoji: '🎼', hint: 'Vous cherchez un groupe à rejoindre' },
  { key: 'COURS',    label: 'Cours de musique',   emoji: '📚', hint: 'Proposez ou cherchez des cours' },
  { key: 'AUTRE',    label: 'Autre',              emoji: '📌', hint: 'Tout autre annonce' },
]

export default function NouvelleAnnoncePage() {
  const router = useRouter()
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
  const [error, setError] = useState('')

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

    router.push(`/annonces/${data.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/annonces" className="text-sm text-gray-500 hover:text-indigo-600">← Annonces</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Déposer une annonce</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Catégorie */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Type d&apos;annonce</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CATEGORIES.map(cat => (
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
                  <p className="text-xs text-gray-400">{cat.hint}</p>
                </div>
              </button>
            ))}
          </div>
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
              placeholder="Ex: Guitare Gibson Les Paul 2018 — excellent état"
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
              placeholder="Décrivez votre annonce en détail…"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {category === 'MATERIEL' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix (€)</label>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  min={0}
                  placeholder="Ex: 350"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
            <div className={category === 'MATERIEL' ? '' : 'col-span-2'}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville / région</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Ex: Lyon, Rhône-Alpes"
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
              placeholder="votre@email.fr"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              placeholder="06 12 34 56 78"
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
            {loading ? 'Publication…' : 'Publier l\'annonce'}
          </button>
        </div>
      </form>
    </div>
  )
}

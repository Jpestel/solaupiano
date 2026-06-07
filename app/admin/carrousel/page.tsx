'use client'

import { useState, useEffect, useRef } from 'react'
import { ph } from '@/lib/placeholders'

interface Slide {
  id: number
  title: string
  subtitle: string | null
  imageUrl: string | null
  linkUrl: string | null
  sortOrder: number
  published: boolean
}

export default function AdminCarrouselPage() {
  const [slides, setSlides] = useState<Slide[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [published, setPublished] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')

  const load = async () => {
    const res = await fetch('/api/admin/carrousel')
    if (res.ok) setSlides(await res.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const reset = () => {
    setEditingId(null); setTitle(''); setSubtitle(''); setLinkUrl(''); setPublished(true)
    setFileName(''); if (fileRef.current) fileRef.current.value = ''
    setError('')
  }

  const startEdit = (s: Slide) => {
    setEditingId(s.id); setTitle(s.title); setSubtitle(s.subtitle || ''); setLinkUrl(s.linkUrl || '')
    setPublished(s.published); setFileName(''); if (fileRef.current) fileRef.current.value = ''
    setError(''); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Le titre est requis.'); return }
    setSaving(true); setError('')
    const fd = new FormData()
    fd.append('title', title.trim())
    fd.append('subtitle', subtitle.trim())
    fd.append('linkUrl', linkUrl.trim())
    fd.append('published', String(published))
    const f = fileRef.current?.files?.[0]
    if (f) fd.append('image', f)

    const res = await fetch(editingId ? `/api/admin/carrousel/${editingId}` : '/api/admin/carrousel', {
      method: editingId ? 'PATCH' : 'POST',
      body: fd,
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Erreur.'); return }
    reset(); load()
  }

  const togglePublished = async (s: Slide) => {
    const fd = new FormData()
    fd.append('published', String(!s.published))
    await fetch(`/api/admin/carrousel/${s.id}`, { method: 'PATCH', body: fd })
    load()
  }

  const remove = async (s: Slide) => {
    if (!confirm(`Supprimer la slide « ${s.title} » ?`)) return
    await fetch(`/api/admin/carrousel/${s.id}`, { method: 'DELETE' })
    if (editingId === s.id) reset()
    load()
  }

  const move = async (index: number, dir: -1 | 1) => {
    const next = index + dir
    if (next < 0 || next >= slides.length) return
    const arr = [...slides]
    ;[arr[index], arr[next]] = [arr[next], arr[index]]
    setSlides(arr)
    await fetch('/api/admin/carrousel/reorder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: arr.map((s) => s.id) }),
    })
  }

  if (loading) return <div className="text-gray-500">Chargement...</div>

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Carrousel d&apos;accueil</h1>
        <p className="text-gray-500 mt-1">Créez les slides affichées dans le carrousel de la page d&apos;accueil. S&apos;il n&apos;y en a aucune, des aperçus par défaut sont montrés.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Formulaire */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-gray-900 mb-3">{editingId ? 'Modifier la slide' : 'Ajouter une slide'}</h3>
          {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="form-label">Titre *</label>
              <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={ph('admin_carrousel_1')} />
            </div>
            <div>
              <label className="form-label">Sous-titre</label>
              <input className="form-input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder={ph('admin_carrousel_2')} />
            </div>
            <div>
              <label className="form-label">Image {editingId && <span className="text-gray-400 font-normal">(laisser vide pour conserver l&apos;actuelle)</span>}</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100" />
              {fileName && <p className="text-xs text-gray-400 mt-1">{fileName}</p>}
              <p className="text-xs text-gray-400 mt-1">Capture d&apos;écran conseillée. Redimensionnée automatiquement (max 1280px, WebP).</p>
            </div>
            <div>
              <label className="form-label">Lien au clic <span className="text-gray-400 font-normal">(optionnel)</span></label>
              <input className="form-input" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder={ph('admin_carrousel_3')} />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="rounded border-gray-300 text-indigo-600" />
              Publiée (visible sur l&apos;accueil)
            </label>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
                {saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Ajouter la slide'}
              </button>
              {editingId && <button type="button" onClick={reset} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Annuler</button>}
            </div>
          </form>
        </div>

        {/* Liste */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Slides ({slides.length})</h3>
          </div>
          {slides.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Aucune slide. Les aperçus par défaut sont affichés sur l&apos;accueil.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {slides.map((s, idx) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex flex-col">
                    <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-gray-400 hover:text-indigo-600 disabled:opacity-30 leading-none">▲</button>
                    <button onClick={() => move(idx, 1)} disabled={idx === slides.length - 1} className="text-gray-400 hover:text-indigo-600 disabled:opacity-30 leading-none">▼</button>
                  </div>
                  {s.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.imageUrl} alt="" className="w-20 h-12 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-300 text-xs flex-shrink-0">aucune</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                    {s.subtitle && <p className="text-xs text-gray-500 truncate">{s.subtitle}</p>}
                  </div>
                  <button onClick={() => togglePublished(s)}
                    className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${s.published ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.published ? 'Publiée' : 'Masquée'}
                  </button>
                  <button onClick={() => startEdit(s)} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">Modifier</button>
                  <button onClick={() => remove(s)} className="text-xs font-medium text-red-500 hover:text-red-600">Supprimer</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

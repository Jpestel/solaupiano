'use client'

import { useState, useEffect, useCallback } from 'react'
import { toBlogHtml, blogColor, BLOG_COLOR_KEYS } from '@/lib/blog'

interface Cat { id: number; name: string; slug: string; color: string; sortOrder: number; _count?: { posts: number } }
interface PostRow { id: number; title: string; slug: string; status: string; publishedAt: string | null; viewCount: number; createdAt: string; coverImage: string | null; category: { id: number; name: string; color: string } | null; _count: { likes: number } }

const emptyForm = { title: '', excerpt: '', content: '', categoryId: '', status: 'DRAFT' as 'DRAFT' | 'PUBLISHED' }

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<PostRow[]>([])
  const [categories, setCategories] = useState<Cat[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [removeCover, setRemoveCover] = useState(false)
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  // catégories
  const [newCat, setNewCat] = useState({ name: '', color: 'indigo' })

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/blog')
    if (r.ok) { const d = await r.json(); setPosts(d.posts); setCategories(d.categories) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const openNew = () => { setForm(emptyForm); setCoverFile(null); setCoverPreview(null); setRemoveCover(false); setPreview(false); setErr(''); setEditingId('new') }
  const openEdit = async (id: number) => {
    setErr('')
    const r = await fetch(`/api/admin/blog/${id}`)
    if (!r.ok) return
    const p = await r.json()
    setForm({ title: p.title, excerpt: p.excerpt || '', content: p.content || '', categoryId: p.categoryId ? String(p.categoryId) : '', status: p.status })
    setCoverFile(null); setCoverPreview(p.coverImage || null); setRemoveCover(false); setPreview(false); setEditingId(id)
  }
  const closeEditor = () => setEditingId(null)

  const onCover = (f: File | null) => {
    setCoverFile(f); setRemoveCover(false)
    if (f) setCoverPreview(URL.createObjectURL(f))
  }

  const save = async (publish?: boolean) => {
    if (!form.title.trim()) { setErr('Le titre est requis.'); return }
    setSaving(true); setErr('')
    const fd = new FormData()
    fd.append('title', form.title)
    fd.append('excerpt', form.excerpt)
    fd.append('content', form.content)
    fd.append('categoryId', form.categoryId)
    fd.append('status', publish !== undefined ? (publish ? 'PUBLISHED' : 'DRAFT') : form.status)
    if (coverFile) fd.append('cover', coverFile)
    if (removeCover) fd.append('removeCover', 'true')
    if (editingId !== 'new') fd.append('reslug', 'false')

    const res = await fetch(editingId === 'new' ? '/api/admin/blog' : `/api/admin/blog/${editingId}`, {
      method: editingId === 'new' ? 'POST' : 'PATCH', body: fd,
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error || 'Erreur.'); return }
    setEditingId(null); load()
  }

  const del = async (id: number) => {
    if (!confirm('Supprimer cet article définitivement ?')) return
    await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' }); load()
  }
  const quickStatus = async (p: PostRow) => {
    const fd = new FormData(); fd.append('status', p.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')
    await fetch(`/api/admin/blog/${p.id}`, { method: 'PATCH', body: fd }); load()
  }

  // Catégories
  const addCat = async () => {
    if (!newCat.name.trim()) return
    const r = await fetch('/api/admin/blog/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCat) })
    if (r.ok) { setNewCat({ name: '', color: 'indigo' }); load() }
  }
  const patchCat = async (id: number, data: Partial<Cat>) => {
    await fetch(`/api/admin/blog/categories/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); load()
  }
  const delCat = async (id: number) => {
    if (!confirm('Supprimer cette catégorie ? Les articles associés passeront « sans catégorie ».')) return
    await fetch(`/api/admin/blog/categories/${id}`, { method: 'DELETE' }); load()
  }

  if (loading) return <div className="text-gray-500">Chargement…</div>

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
          <p className="text-gray-500 mt-1">Rédigez et publiez des articles, gérez les catégories.</p>
        </div>
        <a href="/blog" target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">Voir le blog ↗</a>
      </div>

      {/* Catégories */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Catégories</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.map((c) => {
            const col = blogColor(c.color)
            return (
              <span key={c.id} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${col.bg} ${col.text} ${col.border}`}>
                {c.name} <span className="text-gray-400">({c._count?.posts ?? 0})</span>
                <select value={c.color} onChange={(e) => patchCat(c.id, { color: e.target.value })} className="bg-transparent text-[10px] outline-none">
                  {BLOG_COLOR_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
                <button onClick={() => delCat(c.id)} className="text-gray-400 hover:text-red-500">×</button>
              </span>
            )
          })}
          {categories.length === 0 && <span className="text-sm text-gray-400">Aucune catégorie.</span>}
        </div>
        <div className="flex items-center gap-2">
          <input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} placeholder="Nouvelle catégorie" className="form-input flex-1" />
          <select value={newCat.color} onChange={(e) => setNewCat({ ...newCat, color: e.target.value })} className="form-input w-28">
            {BLOG_COLOR_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <button onClick={addCat} className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700">Ajouter</button>
        </div>
      </div>

      {/* Éditeur */}
      {editingId !== null ? (
        <div className="rounded-xl border border-indigo-200 bg-white p-5 space-y-3">
          <h3 className="font-semibold text-gray-900">{editingId === 'new' ? 'Nouvel article' : 'Modifier l’article'}</h3>
          {err && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{err}</div>}
          <div><label className="form-label">Titre *</label><input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titre de l’article" /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="form-label">Catégorie</label>
              <select className="form-input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">— Aucune —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="form-label">Image de couverture</label>
              <input type="file" accept="image/*" onChange={(e) => onCover(e.target.files?.[0] || null)} className="text-sm" />
              {coverPreview && (
                <div className="mt-1 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverPreview} alt="" className="h-12 w-20 object-cover rounded" />
                  <button onClick={() => { setCoverFile(null); setCoverPreview(null); setRemoveCover(true) }} className="text-xs text-red-500">Retirer</button>
                </div>
              )}
            </div>
          </div>
          <div><label className="form-label">Résumé <span className="text-gray-400 font-normal">(optionnel, sinon auto)</span></label>
            <textarea className="form-input" rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Court résumé affiché sur les cartes" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="form-label mb-0">Contenu <span className="text-gray-400 font-normal">(HTML accepté)</span></label>
              <div className="inline-flex rounded-lg bg-gray-100 border border-gray-200 p-0.5 text-xs">
                <button type="button" onClick={() => setPreview(false)} className={`rounded-md px-2.5 py-1 font-semibold ${!preview ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>✏️ Éditer</button>
                <button type="button" onClick={() => setPreview(true)} className={`rounded-md px-2.5 py-1 font-semibold ${preview ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>👁 Aperçu</button>
              </div>
            </div>
            {preview
              ? <div className="blog-content rounded-lg border border-gray-200 bg-gray-50 p-4 max-h-[420px] overflow-auto" dangerouslySetInnerHTML={{ __html: toBlogHtml(form.content) }} />
              : <textarea className="form-input font-mono text-sm" rows={14} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder={'Écrivez votre article…\n\nHTML supporté : <h2>Titre</h2>, <p>…</p>, <ul><li>…</li></ul>, <a href="…">lien</a>, <blockquote>…</blockquote>, <img src="…">'} />}
            <p className="text-[11px] text-gray-400 mt-1">Astuce : un saut de ligne double = nouveau paragraphe. Vous pouvez aussi coller du HTML.</p>
          </div>
          <div className="flex items-center justify-between pt-2">
            <button onClick={closeEditor} className="text-sm text-gray-500 hover:text-gray-700">Annuler</button>
            <div className="flex gap-2">
              <button onClick={() => save(false)} disabled={saving} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60">Enregistrer en brouillon</button>
              <button onClick={() => save(true)} disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">{saving ? '…' : 'Publier'}</button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={openNew} className="w-full rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">+ Nouvel article</button>
      )}

      {/* Liste */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Articles ({posts.length})</h3></div>
        {posts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Aucun article.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {posts.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-14 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                  {p.coverImage
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.coverImage} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-sm">🎵</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                  <p className="text-xs text-gray-400">{p.category?.name ? p.category.name + ' · ' : ''}❤️ {p._count.likes} · 👁 {p.viewCount}</p>
                </div>
                <button onClick={() => quickStatus(p)} className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${p.status === 'PUBLISHED' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.status === 'PUBLISHED' ? 'Publié' : 'Brouillon'}
                </button>
                <button onClick={() => openEdit(p.id)} className="text-xs text-indigo-600 hover:text-indigo-700">Modifier</button>
                <button onClick={() => del(p.id)} className="text-xs text-red-500 hover:text-red-600">Suppr.</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

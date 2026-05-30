'use client'

import { useState, useEffect, useRef } from 'react'
import { MODULES } from '@/lib/modules'

interface Tutorial {
  id: number
  title: string
  description: string | null
  moduleKey: string | null
  videoPath: string
  fileName: string
  fileSizeBytes: number
  order: number
  published: boolean
  createdAt: string
}

const MODULE_OPTIONS = [
  { key: '', label: '— Général (pas de module spécifique) —' },
  ...MODULES.map(m => ({ key: m.key, label: `${m.icon} ${m.label}` })),
]

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const EMPTY_FORM = { title: '', description: '', moduleKey: '', order: '0', published: false }

export default function AdminTutorielsPage() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([])
  const [loading, setLoading] = useState(true)

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [createError, setCreateError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit modal
  const [editTutorial, setEditTutorial] = useState<Tutorial | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Preview modal
  const [previewTutorial, setPreviewTutorial] = useState<Tutorial | null>(null)

  // Delete
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/tutoriels')
    if (res.ok) setTutorials(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoFile) { setCreateError('Veuillez sélectionner une vidéo.'); return }
    if (!form.title.trim()) { setCreateError('Le titre est requis.'); return }

    setUploading(true)
    setCreateError('')
    setUploadProgress('Upload en cours…')

    const fd = new FormData()
    fd.append('video', videoFile)
    fd.append('title', form.title.trim())
    fd.append('description', form.description.trim())
    fd.append('moduleKey', form.moduleKey)
    fd.append('order', form.order)
    fd.append('published', String(form.published))

    const res = await fetch('/api/admin/tutoriels', { method: 'POST', body: fd })
    setUploading(false)
    setUploadProgress('')

    if (!res.ok) {
      const d = await res.json()
      setCreateError(d.error || 'Erreur lors de l\'upload.')
      return
    }

    setCreateOpen(false)
    setForm(EMPTY_FORM)
    setVideoFile(null)
    load()
  }

  const openEdit = (t: Tutorial) => {
    setEditTutorial(t)
    setEditForm({
      title: t.title,
      description: t.description || '',
      moduleKey: t.moduleKey || '',
      order: String(t.order),
      published: t.published,
    })
    setEditError('')
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTutorial) return
    setEditSaving(true)
    setEditError('')

    const res = await fetch(`/api/admin/tutoriels/${editTutorial.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        moduleKey: editForm.moduleKey || null,
        order: parseInt(editForm.order, 10) || 0,
        published: editForm.published,
      }),
    })

    setEditSaving(false)
    if (!res.ok) { const d = await res.json(); setEditError(d.error || 'Erreur.'); return }
    setEditTutorial(null)
    load()
  }

  const handleDelete = async (id: number) => {
    setDeleting(true)
    await fetch(`/api/admin/tutoriels/${id}`, { method: 'DELETE' })
    setDeleting(false)
    setDeleteId(null)
    load()
  }

  const labelForModule = (key: string | null) => {
    if (!key) return 'Général'
    return MODULE_OPTIONS.find(m => m.key === key)?.label ?? key
  }

  if (loading) return <div className="text-gray-500">Chargement…</div>

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tutoriels vidéo</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérez les vidéos d&apos;aide affichées sur la page /aide et sur chaque module.</p>
        </div>
        <button
          onClick={() => { setCreateOpen(true); setForm(EMPTY_FORM); setVideoFile(null); setCreateError('') }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          + Ajouter un tutoriel
        </button>
      </div>

      {tutorials.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
          <p className="text-4xl mb-3">🎬</p>
          <p className="text-gray-500 text-sm">Aucun tutoriel pour l&apos;instant.</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Ajouter le premier tutoriel
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tutorials.map((t) => (
            <div key={t.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start gap-4 flex-wrap">
                {/* Video thumbnail / play button */}
                <button
                  onClick={() => setPreviewTutorial(t)}
                  className="w-20 h-14 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0 hover:bg-gray-700 transition-colors group"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">▶️</span>
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{t.title}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.published ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                      {t.published ? '🟢 Publié' : '⚪ Brouillon'}
                    </span>
                    <span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                      {labelForModule(t.moduleKey)}
                    </span>
                  </div>
                  {t.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>📁 {t.fileName}</span>
                    <span>{formatBytes(t.fileSizeBytes)}</span>
                    <span>Ordre : {t.order}</span>
                    <span>{formatDate(t.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <button onClick={() => openEdit(t)} className="text-xs font-medium text-indigo-600 hover:text-indigo-500">Modifier</button>
                  <button onClick={() => setDeleteId(t.id)} className="text-xs font-medium text-red-400 hover:text-red-600">Supprimer</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create modal ── */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setCreateOpen(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-5">Ajouter un tutoriel</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {createError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{createError}</div>}

              {/* Video file */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fichier vidéo <span className="text-red-500">*</span></label>
                <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={e => setVideoFile(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg border-2 border-dashed border-gray-300 hover:border-indigo-400 px-4 py-6 text-center transition-colors">
                  {videoFile ? (
                    <span className="text-sm text-gray-700">🎬 {videoFile.name} <span className="text-gray-400">({formatBytes(videoFile.size)})</span></span>
                  ) : (
                    <span className="text-sm text-gray-400">Cliquez pour sélectionner une vidéo (MP4, WebM… max 500 Mo)</span>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre <span className="text-red-500">*</span></label>
                <input type="text" required autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="ex: Comment utiliser l'accordeur" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optionnel)</span></label>
                <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Brève description du contenu de la vidéo…" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Module associé</label>
                <select value={form.moduleKey} onChange={e => setForm(f => ({ ...f, moduleKey: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {MODULE_OPTIONS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordre</label>
                  <input type="number" min={0} value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300" />
                    <span className="text-sm font-medium text-gray-700">Publié immédiatement</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={uploading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
                  {uploading ? (uploadProgress || 'Upload…') : '⬆️ Uploader'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit modal ── */}
      {editTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setEditTutorial(null)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-5">Modifier le tutoriel</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              {editError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{editError}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre <span className="text-red-500">*</span></label>
                <input type="text" required autoFocus value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optionnel)</span></label>
                <textarea rows={3} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Module associé</label>
                <select value={editForm.moduleKey} onChange={e => setEditForm(f => ({ ...f, moduleKey: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {MODULE_OPTIONS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordre</label>
                  <input type="number" min={0} value={editForm.order} onChange={e => setEditForm(f => ({ ...f, order: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.published} onChange={e => setEditForm(f => ({ ...f, published: e.target.checked }))}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300" />
                    <span className="text-sm font-medium text-gray-700">Publié</span>
                  </label>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500">
                📁 {editTutorial.fileName} · {formatBytes(editTutorial.fileSizeBytes)}
                <br />Pour remplacer la vidéo, supprimez ce tutoriel et créez-en un nouveau.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditTutorial(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={editSaving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
                  {editSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Preview modal ── */}
      {previewTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setPreviewTutorial(null)}>
          <div className="w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">{previewTutorial.title}</h3>
              <button onClick={() => setPreviewTutorial(null)} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
            </div>
            <video
              src={previewTutorial.videoPath}
              controls
              autoPlay
              className="w-full rounded-xl bg-black shadow-2xl max-h-[70vh]"
            />
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteId(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Supprimer ce tutoriel ?</h3>
                <p className="text-sm text-gray-500 mt-0.5">Le fichier vidéo sera supprimé définitivement.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)} disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60">
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
              <button onClick={() => setDeleteId(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

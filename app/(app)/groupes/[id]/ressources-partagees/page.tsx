'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface Res {
  id: number; type: string; title: string
  url: string | null; address: string | null; phone: string | null; email: string | null
  note: string | null; filePath: string | null; fileSize: number | null
  createdAt: string; createdById: number; createdBy: { id: number; name: string }
}

const TYPES = [
  { key: 'LINK',    icon: '🔗', label: 'Lien web' },
  { key: 'SHOP',    icon: '🏪', label: 'Boutique / lieu' },
  { key: 'CONTACT', icon: '👤', label: 'Contact' },
  { key: 'NOTE',    icon: '📝', label: 'Note / info' },
  { key: 'FILE',    icon: '📎', label: 'Fichier' },
]
const typeInfo = (t: string) => TYPES.find(x => x.key === t) ?? TYPES[3]
const inp = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'

function fmtBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`
  return `${(b / 1024 / 1024).toFixed(1)} Mo`
}
const isVideo = (p: string) => ['mp4','webm','mov','m4v','ogv'].includes(p.split('?')[0].split('.').pop()?.toLowerCase() || '')

export default function RessourcesPartageesPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const groupId = params.id
  const userId = Number(session?.user?.id)
  const isAdmin = session?.user?.siteRole === 'ADMIN'

  const [groupName, setGroupName] = useState('')
  const [isChef, setIsChef] = useState(false)
  const [uploadEnabled, setUploadEnabled] = useState(false)
  const [resources, setResources] = useState<Res[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('ALL')

  // Add modal
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ type: 'LINK', title: '', url: '', address: '', phone: '', email: '', note: '' })
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [videoModal, setVideoModal] = useState<{ url: string; title: string } | null>(null)

  const load = useCallback(async () => {
    const [rRes, gRes] = await Promise.all([
      fetch(`/api/groupes/${groupId}/ressources-partagees`),
      fetch(`/api/groupes/${groupId}`),
    ])
    if (rRes.ok) setResources(await rRes.json())
    if (gRes.ok) {
      const g = await gRes.json()
      setGroupName(g.name ?? '')
      setUploadEnabled(g.uploadEnabled ?? false)
      const me = g.members?.find((m: any) => m.userId === userId)
      setIsChef(isAdmin || me?.groupRole === 'CHEF')
    }
    setLoading(false)
  }, [groupId, userId, isAdmin])

  useEffect(() => { if (session) load() }, [session, load])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    let res: Response
    if (form.type === 'FILE') {
      if (!file) { setError('Sélectionnez un fichier.'); setSaving(false); return }
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', form.title || file.name)
      fd.append('note', form.note)
      res = await fetch(`/api/groupes/${groupId}/ressources-partagees`, { method: 'POST', body: fd })
    } else {
      res = await fetch(`/api/groupes/${groupId}/ressources-partagees`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
    }
    setSaving(false)
    if (res.ok) {
      setAddOpen(false)
      setForm({ type: 'LINK', title: '', url: '', address: '', phone: '', email: '', note: '' })
      setFile(null)
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Erreur.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette ressource ?')) return
    const res = await fetch(`/api/groupes/${groupId}/ressources-partagees/${id}`, { method: 'DELETE' })
    if (res.ok) setResources(prev => prev.filter(r => r.id !== id))
    else { const d = await res.json().catch(() => ({})); alert(d.error || 'Suppression impossible.') }
  }

  const shown = filter === 'ALL' ? resources : resources.filter(r => r.type === filter)
  const canDelete = (r: Res) => isAdmin || isChef || r.createdById === userId

  if (loading) return <div className="text-gray-500">Chargement…</div>

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2 flex-wrap">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">{groupName}</Link>
        <span>/</span>
        <span className="text-gray-900">Ressources partagées</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📒 Ressources partagées</h1>
          <p className="text-sm text-gray-500 mt-0.5">Liens, boutiques, contacts, notes et fichiers — partagés entre les membres du groupe.</p>
        </div>
        <button onClick={() => { setAddOpen(true); setError('') }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
          + Ajouter
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-1.5 my-4">
        <button onClick={() => setFilter('ALL')}
          className={`rounded-full px-3 py-1 text-xs font-medium border ${filter === 'ALL' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
          Tout ({resources.length})
        </button>
        {TYPES.map(t => {
          const n = resources.filter(r => r.type === t.key).length
          if (n === 0) return null
          return (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium border ${filter === t.key ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
              {t.icon} {t.label} ({n})
            </button>
          )
        })}
      </div>

      {/* Liste */}
      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
          <p className="text-4xl mb-3">📒</p>
          <p className="text-gray-500 text-sm">Aucune ressource partagée pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shown.map(r => {
            const ti = typeInfo(r.type)
            return (
              <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{ti.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm break-words">{r.title}</p>

                    {r.type === 'LINK' && r.url && (
                      <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline break-all">{r.url} →</a>
                    )}
                    {r.type === 'SHOP' && (
                      <>
                        {r.address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.address)}`} target="_blank" rel="noreferrer" className="block text-xs text-indigo-600 hover:underline">📍 {r.address}</a>}
                        {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="block text-xs text-indigo-600 hover:underline break-all">{r.url} →</a>}
                        {r.phone && <a href={`tel:${r.phone}`} className="block text-xs text-gray-600">📞 {r.phone}</a>}
                      </>
                    )}
                    {r.type === 'CONTACT' && (
                      <>
                        {r.phone && <a href={`tel:${r.phone}`} className="block text-xs text-gray-600">📞 {r.phone}</a>}
                        {r.email && <a href={`mailto:${r.email}`} className="block text-xs text-indigo-600 hover:underline">✉️ {r.email}</a>}
                        {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="block text-xs text-indigo-600 hover:underline break-all">{r.url} →</a>}
                      </>
                    )}
                    {r.type === 'FILE' && r.filePath && (
                      isVideo(r.filePath)
                        ? <button onClick={() => setVideoModal({ url: r.filePath!, title: r.title })} className="text-xs text-indigo-600 hover:underline">▶ Lire la vidéo {r.fileSize ? `(${fmtBytes(r.fileSize)})` : ''}</button>
                        : <a href={r.filePath} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">📥 Télécharger {r.fileSize ? `(${fmtBytes(r.fileSize)})` : ''}</a>
                    )}

                    {r.note && <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap break-words">{r.note}</p>}
                    <p className="text-[10px] text-gray-400 mt-1.5">Ajouté par {r.createdBy.name} · {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  {canDelete(r) && (
                    <button onClick={() => handleDelete(r.id)} className="text-gray-300 hover:text-red-500 text-lg leading-none flex-shrink-0" title="Supprimer">×</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modale ajout */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setAddOpen(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Ajouter une ressource</h3>
            {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
            <form onSubmit={handleAdd} className="space-y-3">
              {/* Type */}
              <div className="grid grid-cols-5 gap-1">
                {TYPES.map(t => (
                  <button key={t.key} type="button"
                    onClick={() => setForm(f => ({ ...f, type: t.key }))}
                    disabled={t.key === 'FILE' && !uploadEnabled}
                    title={t.key === 'FILE' && !uploadEnabled ? 'Stockage non inclus dans ce plan' : t.label}
                    className={`flex flex-col items-center gap-0.5 rounded-lg border-2 py-2 text-[10px] transition-colors ${
                      form.type === t.key ? 'border-indigo-500 bg-indigo-50 text-indigo-700' :
                      (t.key === 'FILE' && !uploadEnabled) ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed' :
                      'border-gray-200 text-gray-600 hover:border-indigo-300'
                    }`}>
                    <span className="text-lg">{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>

              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Titre *" required className={inp} autoFocus />

              {(form.type === 'LINK' || form.type === 'SHOP' || form.type === 'CONTACT') && (
                <input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder={form.type === 'LINK' ? 'https://… *' : 'Site web (optionnel)'} className={inp} required={form.type === 'LINK'} />
              )}
              {form.type === 'SHOP' && (
                <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Adresse physique" className={inp} />
              )}
              {(form.type === 'CONTACT' || form.type === 'SHOP') && (
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Téléphone" className={inp} />
              )}
              {form.type === 'CONTACT' && (
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="E-mail" className={inp} />
              )}
              {form.type === 'FILE' && (
                <div>
                  <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="w-full rounded-lg border-2 border-dashed border-gray-300 hover:border-indigo-400 px-4 py-4 text-center text-sm text-gray-500 transition-colors">
                    {file ? `📎 ${file.name}` : 'Cliquez pour choisir un fichier (max 100 Mo)'}
                  </button>
                </div>
              )}

              <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Note / description (optionnel)" rows={2} className={`${inp} resize-none`} />

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setAddOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
                  {saving ? 'Ajout…' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lecteur vidéo */}
      {videoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setVideoModal(null)}>
          <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold">{videoModal.title}</h3>
              <button onClick={() => setVideoModal(null)} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
            </div>
            <video src={videoModal.url} controls autoPlay className="w-full rounded-xl bg-black max-h-[70vh]" />
          </div>
        </div>
      )}
    </div>
  )
}

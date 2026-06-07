'use client'

import { useState, useEffect, useCallback } from 'react'
import { CATEGORIES } from '@/lib/resource-links'

interface Link {
  id: number
  label: string
  icon: string
  category: string
  urlTemplate: string
  description: string | null
  defaultActive: boolean
  enabled: boolean
  sortOrder: number
}
interface EffLink extends Link { active: boolean }
interface GroupRef { id: number; name: string }

const EMPTY = { label: '', icon: '🔗', category: 'OTHER', urlTemplate: '', description: '', defaultActive: false, enabled: true }

export default function AdminResourceLinksPage() {
  const [links, setLinks] = useState<Link[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<number | null>(null)
  const [error, setError] = useState('')

  // Par groupe
  const [groups, setGroups] = useState<GroupRef[]>([])
  const [groupId, setGroupId] = useState<number | null>(null)
  const [groupLinks, setGroupLinks] = useState<EffLink[]>([])

  const loadCatalog = useCallback(async () => {
    const r = await fetch('/api/admin/resource-links')
    if (r.ok) setLinks(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    loadCatalog()
    fetch('/api/admin/groupes').then((r) => r.json()).then((d) => setGroups(Array.isArray(d) ? d.map((g: { id: number; name: string }) => ({ id: g.id, name: g.name })) : [])).catch(() => {})
  }, [loadCatalog])

  const loadGroupLinks = async (gid: number) => {
    setGroupId(gid)
    const r = await fetch(`/api/admin/resource-links/group/${gid}`)
    if (r.ok) setGroupLinks(await r.json())
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.label.trim() || !form.urlTemplate.trim()) { setError('Libellé et URL requis.'); return }
    setError('')
    const res = await fetch(editId ? `/api/admin/resource-links/${editId}` : '/api/admin/resource-links', {
      method: editId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Erreur.'); return }
    setForm(EMPTY); setEditId(null); loadCatalog()
  }

  const startEdit = (l: Link) => {
    setEditId(l.id)
    setForm({ label: l.label, icon: l.icon, category: l.category, urlTemplate: l.urlTemplate, description: l.description || '', defaultActive: l.defaultActive, enabled: l.enabled })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const patchLink = async (id: number, data: Partial<Link>) => {
    await fetch(`/api/admin/resource-links/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    loadCatalog()
    if (groupId) loadGroupLinks(groupId)
  }
  const removeLink = async (id: number) => {
    if (!confirm('Supprimer ce lien du catalogue ?')) return
    await fetch(`/api/admin/resource-links/${id}`, { method: 'DELETE' })
    loadCatalog(); if (groupId) loadGroupLinks(groupId)
  }

  const setGroupOverride = async (linkId: number, active: boolean | null) => {
    if (!groupId) return
    await fetch(`/api/admin/resource-links/group/${groupId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ linkId, active }) })
    loadGroupLinks(groupId)
  }

  if (loading) return <div className="text-gray-500">Chargement...</div>

  const catLabel = (k: string) => CATEGORIES.find((c) => c.key === k)?.label || k

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Liens de ressources</h1>
        <p className="text-gray-500 mt-1">Catalogue des liens (audio, vidéo, tutos, partitions…) proposés à l&apos;ajout d&apos;un morceau. Activez-les par défaut et/ou par groupe.</p>
      </div>

      {/* Formulaire */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-gray-900 mb-3">{editId ? 'Modifier le lien' : 'Ajouter un lien'}</h3>
        {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div><label className="form-label">Icône</label><input className="form-input" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className="form-label">Libellé *</label><input className="form-input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="ex : Spotify" /></div>
            <div><label className="form-label">Catégorie</label>
              <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div><label className="form-label">URL (utilisez <code className="bg-gray-100 px-1 rounded">{'{q}'}</code> pour le titre+artiste)</label>
            <input className="form-input font-mono text-xs" value={form.urlTemplate} onChange={(e) => setForm({ ...form, urlTemplate: e.target.value })} placeholder="https://open.spotify.com/search/{q}" />
          </div>
          <div><label className="form-label">Description</label><input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="ex : Écoute en streaming" /></div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.defaultActive} onChange={(e) => setForm({ ...form, defaultActive: e.target.checked })} className="rounded border-gray-300 text-indigo-600" /> Actif par défaut (tous les groupes)</label>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="rounded border-gray-300 text-indigo-600" /> Disponible</label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">{editId ? 'Enregistrer' : 'Ajouter'}</button>
            {editId && <button type="button" onClick={() => { setEditId(null); setForm(EMPTY) }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">Annuler</button>}
          </div>
        </form>
      </div>

      {/* Catalogue */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Catalogue ({links.length})</h3></div>
        <ul className="divide-y divide-gray-50">
          {links.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-lg">{l.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{l.label} <span className="text-[10px] text-gray-400">{catLabel(l.category)}</span></p>
                <p className="text-[11px] text-gray-400 truncate font-mono">{l.urlTemplate}</p>
              </div>
              <button onClick={() => patchLink(l.id, { defaultActive: !l.defaultActive })} title="Actif par défaut"
                className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${l.defaultActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{l.defaultActive ? 'Défaut ✓' : 'Défaut'}</button>
              <button onClick={() => patchLink(l.id, { enabled: !l.enabled })} title="Disponible"
                className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${l.enabled ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>{l.enabled ? 'Dispo' : 'Off'}</button>
              <button onClick={() => startEdit(l)} className="text-xs text-indigo-600 hover:text-indigo-700">Modifier</button>
              <button onClick={() => removeLink(l.id)} className="text-xs text-red-500 hover:text-red-600">Suppr.</button>
            </li>
          ))}
        </ul>
      </div>

      {/* Par groupe */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-gray-900 mb-2">Activer / désactiver par groupe</h3>
        <select className="form-input max-w-xs" value={groupId ?? ''} onChange={(e) => e.target.value && loadGroupLinks(Number(e.target.value))}>
          <option value="">— Choisir un groupe —</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        {groupId && (
          <ul className="mt-3 divide-y divide-gray-50">
            {groupLinks.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2">
                <span className="text-lg">{l.icon}</span>
                <span className="text-sm text-gray-800 flex-1 truncate">{l.label}</span>
                <button onClick={() => setGroupOverride(l.id, !l.active)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${l.active ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${l.active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

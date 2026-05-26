'use client'

import { useState } from 'react'

interface Cat {
  id: number
  key: string
  label: string
  emoji: string
  hint: string | null
  isActive: boolean
  sortOrder: number
}

export function CategoriesManager({ initial }: { initial: Cat[] }) {
  const [cats, setCats] = useState<Cat[]>(initial)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ key: '', label: '', emoji: '📌', hint: '', sortOrder: 0 })
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<Cat>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggle = async (cat: Cat) => {
    const res = await fetch(`/api/admin/annonces-categories/${cat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !cat.isActive }),
    })
    if (res.ok) {
      const updated = await res.json()
      setCats(prev => prev.map(c => c.id === cat.id ? updated : c))
    }
  }

  const create = async () => {
    setError('')
    if (!form.key || !form.label) { setError('Clé et libellé requis.'); return }
    setSaving(true)
    const res = await fetch('/api/admin/annonces-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      const cat = await res.json()
      setCats(prev => [...prev, cat])
      setCreating(false)
      setForm({ key: '', label: '', emoji: '📌', hint: '', sortOrder: 0 })
    } else {
      const d = await res.json()
      setError(d.error || 'Erreur')
    }
  }

  const saveEdit = async () => {
    if (!editId) return
    setSaving(true)
    const res = await fetch(`/api/admin/annonces-categories/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    setSaving(false)
    if (res.ok) {
      const updated = await res.json()
      setCats(prev => prev.map(c => c.id === editId ? updated : c))
      setEditId(null)
    }
  }

  const del = async (id: number) => {
    if (!confirm('Supprimer cette catégorie ? Les annonces existantes garderont leur clé.')) return
    const res = await fetch(`/api/admin/annonces-categories/${id}`, { method: 'DELETE' })
    if (res.ok) setCats(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Catégories d&apos;annonces</h2>
        <button
          onClick={() => setCreating(true)}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          + Nouvelle catégorie
        </button>
      </div>

      {/* Formulaire création */}
      {creating && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4 space-y-3">
          <h3 className="text-sm font-semibold text-indigo-900">Nouvelle catégorie</h3>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Clé (ex: VENTE)</label>
              <input
                type="text"
                value={form.key}
                onChange={e => setForm(f => ({ ...f, key: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
                placeholder="MATERIEL"
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Libellé</label>
              <input
                type="text"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="Matériel à vendre"
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Emoji</label>
              <input
                type="text"
                value={form.emoji}
                onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                placeholder="🎸"
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ordre</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Description courte (optionnel)</label>
              <input
                type="text"
                value={form.hint}
                onChange={e => setForm(f => ({ ...f, hint: e.target.value }))}
                placeholder="Instruments, amplis, accessoires…"
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={create} disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {saving ? 'Création…' : 'Créer'}
            </button>
            <button onClick={() => { setCreating(false); setError('') }} className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Catégorie</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Clé</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Ordre</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Active</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cats.map(cat => (
              <tr key={cat.id} className={`hover:bg-gray-50 transition-colors ${!cat.isActive ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  {editId === cat.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editForm.emoji ?? cat.emoji}
                        onChange={e => setEditForm(f => ({ ...f, emoji: e.target.value }))}
                        className="w-12 rounded border border-gray-300 px-2 py-1 text-sm text-center"
                      />
                      <input
                        value={editForm.label ?? cat.label}
                        onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))}
                        className="rounded border border-gray-300 px-2 py-1 text-sm flex-1"
                      />
                    </div>
                  ) : (
                    <span className="font-medium text-gray-800">{cat.emoji} {cat.label}</span>
                  )}
                  {cat.hint && editId !== cat.id && <p className="text-xs text-gray-400 mt-0.5">{cat.hint}</p>}
                  {editId === cat.id && (
                    <input
                      value={editForm.hint ?? cat.hint ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, hint: e.target.value }))}
                      placeholder="Description courte…"
                      className="mt-1.5 w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-500"
                    />
                  )}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5 text-gray-600">{cat.key}</code>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {editId === cat.id ? (
                    <input
                      type="number"
                      value={editForm.sortOrder ?? cat.sortOrder}
                      onChange={e => setEditForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                      className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  ) : (
                    <span className="text-gray-500 text-xs">{cat.sortOrder}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggle(cat)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${cat.isActive ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${cat.isActive ? 'translate-x-4' : 'translate-x-1'}`} />
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  {editId === cat.id ? (
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={saveEdit} disabled={saving} className="rounded px-2 py-1 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                        {saving ? '…' : 'Sauv.'}
                      </button>
                      <button onClick={() => setEditId(null)} className="rounded px-2 py-1 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => { setEditId(cat.id); setEditForm({}) }}
                        className="rounded px-2 py-1 text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => del(cat.id)}
                        className="rounded px-2 py-1 text-xs border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cats.length === 0 && (
          <div className="py-8 text-center text-gray-400 text-sm">Aucune catégorie. Créez-en une !</div>
        )}
      </div>
    </div>
  )
}

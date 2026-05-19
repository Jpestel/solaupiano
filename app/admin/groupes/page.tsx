'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface User {
  id: number
  name: string
  email: string
  siteRole: string
}

interface Group {
  id: number
  name: string
  description?: string
  isPublic: boolean
  createdAt: string
  _count: { members: number; rehearsals: number }
  members: { user: User; groupRole: string }[]
}

export default function AdminGroupesPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', chefId: '', isPublic: true })
  const [editGroup, setEditGroup] = useState<Group | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', isPublic: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchData = async () => {
    const [grpRes, usrRes] = await Promise.all([
      fetch('/api/admin/groupes'),
      fetch('/api/admin/utilisateurs'),
    ])
    if (grpRes.ok) setGroups(await grpRes.json())
    if (usrRes.ok) setUsers(await usrRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch('/api/admin/groupes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        chefId: Number(form.chefId),
        isPublic: form.isPublic,
      }),
    })

    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Erreur.')
      return
    }
    setModalOpen(false)
    setForm({ name: '', description: '', chefId: '', isPublic: true })
    fetchData()
  }

  const openEdit = (group: Group) => {
    setEditGroup(group)
    setEditForm({ name: group.name, description: group.description || '', isPublic: group.isPublic })
    setError('')
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editGroup) return
    setSaving(true)
    setError('')
    const res = await fetch(`/api/groupes/${editGroup.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Erreur.')
      return
    }
    setEditGroup(null)
    fetchData()
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Supprimer le groupe "${name}" et toutes ses données ?`)) return
    await fetch(`/api/admin/groupes/${id}`, { method: 'DELETE' })
    fetchData()
  }

  if (loading) return <div className="text-gray-500">Chargement...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groupes</h1>
          <p className="text-gray-500 mt-1">{groups.length} groupe{groups.length > 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Créer un groupe</Button>
      </div>

      {groups.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500 text-center py-8">Aucun groupe créé.</p>
        </Card>
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Groupe</th>
                  <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Visibilité</th>
                  <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Chef d'orchestre</th>
                  <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Membres</th>
                  <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group: any) => {
                  const chef = group.members.find((m: any) => m.groupRole === 'CHEF')
                  return (
                    <tr key={group.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{group.name}</p>
                        {group.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{group.description}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          group.isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {group.isPublic ? '🌐 Public' : '🔒 Privé'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {chef ? (
                          <span className="text-sm text-gray-700">{chef.user.name}</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{group._count.members}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <a
                            href={`/groupes/${group.id}`}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                          >
                            Voir
                          </a>
                          <button
                            onClick={() => openEdit(group)}
                            className="text-xs font-medium text-gray-600 hover:text-gray-900"
                          >
                            Éditer
                          </button>
                          <button
                            onClick={() => handleDelete(group.id, group.name)}
                            className="text-xs font-medium text-red-600 hover:text-red-500"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit group modal */}
      <Modal isOpen={!!editGroup} onClose={() => setEditGroup(null)} title="Modifier le groupe">
        <form onSubmit={handleEdit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="form-label">Nom du groupe *</label>
            <input type="text" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="form-input" rows={2} />
          </div>
          <div>
            <label className="form-label">Visibilité</label>
            <div className="flex gap-3 mt-1">
              {[{ value: true, label: '🌐 Public' }, { value: false, label: '🔒 Privé' }].map((opt) => (
                <button key={String(opt.value)} type="button" onClick={() => setEditForm({ ...editForm, isPublic: opt.value })}
                  className={`flex-1 rounded-lg border-2 p-2.5 text-sm text-center transition-colors ${
                    editForm.isPublic === opt.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditGroup(null)}>Annuler</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Sauvegarder'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Créer un groupe">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="form-label">Nom du groupe *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="form-input"
              placeholder="ex: Ensemble Vivaldi"
            />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="form-input"
              rows={2}
              placeholder="Description optionnelle..."
            />
          </div>
          <div>
            <label className="form-label">Visibilité</label>
            <div className="flex gap-3 mt-1">
              {[{ value: true, label: '🌐 Public', desc: 'Visible par tous' }, { value: false, label: '🔒 Privé', desc: 'Invitation uniquement' }].map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setForm({ ...form, isPublic: opt.value })}
                  className={`flex-1 rounded-lg border-2 p-2.5 text-sm text-center transition-colors ${
                    form.isPublic === opt.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div>{opt.label}</div>
                  <div className="text-xs text-gray-500 font-normal">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="form-label">Chef d'orchestre *</label>
            <select
              required
              value={form.chefId}
              onChange={(e) => setForm({ ...form, chefId: e.target.value })}
              className="form-input"
            >
              <option value="">Sélectionner un utilisateur...</option>
              {users.filter((u) => u.siteRole !== 'ADMIN').map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Création...' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

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
  createdAt: string
  _count: { members: number; rehearsals: number }
  members: { user: User; groupRole: string }[]
}

export default function AdminGroupesPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', chefId: '' })
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
      }),
    })

    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Erreur.')
      return
    }
    setModalOpen(false)
    setForm({ name: '', description: '', chefId: '' })
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Groupe</th>
                <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Chef</th>
                <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Membres</th>
                <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Répétitions</th>
                <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const chef = group.members.find((m) => m.groupRole === 'CHEF')
                return (
                  <tr key={group.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{group.name}</p>
                      {group.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{group.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {chef ? (
                        <span className="text-sm text-gray-700">{chef.user.name}</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{group._count.members}</td>
                    <td className="px-6 py-4 text-gray-600">{group._count.rehearsals}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(group.id, group.name)}
                        className="text-xs font-medium text-red-600 hover:text-red-500"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

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
            <label className="form-label">Chef du groupe *</label>
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

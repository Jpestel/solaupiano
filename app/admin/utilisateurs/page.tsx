'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ph } from '@/lib/placeholders'

interface Instrument {
  id: number
  name: string
}

interface User {
  id: number
  name: string
  email: string
  avatarUrl?: string | null
  siteRole: string
  createdAt: string
  groups: { group: { id: number; name: string }; groupRole: string }[]
  instruments: { instrument: Instrument }[]
}

export default function AdminUtilisateursPage() {
  const { data: session, update: updateSession } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [allInstruments, setAllInstruments] = useState<Instrument[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', instrumentIds: [] as number[] })
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  // Filtres
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState<'all' | 'none' | number>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | 'ADMIN' | 'USER'>('all')
  const [instrFilter, setInstrFilter] = useState<'all' | number>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchUsers = async () => {
    const [usrRes, instrRes] = await Promise.all([
      fetch('/api/admin/utilisateurs'),
      fetch('/api/instruments'),
    ])
    if (usrRes.ok) setUsers(await usrRes.json())
    if (instrRes.ok) setAllInstruments(await instrRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const openEdit = (user: User) => {
    setEditUser(user)
    setEditForm({
      name: user.name,
      email: user.email,
      instrumentIds: user.instruments.map((ui) => ui.instrument.id),
    })
    setEditError('')
    setAvatarError('')
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editUser) return
    if (!file.type.startsWith('image/')) { setAvatarError('Image requise.'); return }
    setAvatarUploading(true)
    setAvatarError('')
    const formData = new FormData()
    formData.append('avatar', file)
    const res = await fetch(`/api/admin/utilisateurs/${editUser.id}/avatar`, { method: 'POST', body: formData })
    setAvatarUploading(false)
    if (!res.ok) { const d = await res.json(); setAvatarError(d.error || 'Erreur upload.'); return }
    const { avatarUrl } = await res.json()
    setEditUser((prev) => prev ? { ...prev, avatarUrl } : prev)
    setUsers((prev) => prev.map((u) => u.id === editUser.id ? { ...u, avatarUrl } : u))
    if (fileInputRef.current) fileInputRef.current.value = ''
    // Refresh session if admin is editing their own avatar
    if (editUser.id === Number(session?.user?.id)) await updateSession({})
  }

  const handleAvatarDelete = async () => {
    if (!editUser || !confirm('Supprimer la photo de profil ?')) return
    setAvatarUploading(true)
    await fetch(`/api/admin/utilisateurs/${editUser.id}/avatar`, { method: 'DELETE' })
    setAvatarUploading(false)
    setEditUser((prev) => prev ? { ...prev, avatarUrl: null } : prev)
    setUsers((prev) => prev.map((u) => u.id === editUser.id ? { ...u, avatarUrl: null } : u))
    // Refresh session if admin is editing their own avatar
    if (editUser.id === Number(session?.user?.id)) await updateSession({})
  }

  const toggleInstrument = (id: number) => {
    setEditForm((prev) => ({
      ...prev,
      instrumentIds: prev.instrumentIds.includes(id)
        ? prev.instrumentIds.filter((i) => i !== id)
        : [...prev.instrumentIds, id],
    }))
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    setEditSaving(true)
    setEditError('')
    const res = await fetch(`/api/admin/utilisateurs/${editUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editForm.name, email: editForm.email, instrumentIds: editForm.instrumentIds }),
    })
    setEditSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setEditError(d.error || 'Erreur.')
      return
    }
    setEditUser(null)
    fetchUsers()
  }

  const toggleRole = async (user: User) => {
    const newRole = user.siteRole === 'ADMIN' ? 'USER' : 'ADMIN'
    if (!confirm(`Changer le rôle de ${user.name} en ${newRole} ?`)) return
    setUpdatingId(user.id)
    await fetch(`/api/admin/utilisateurs/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteRole: newRole }),
    })
    setUpdatingId(null)
    fetchUsers()
  }

  const deleteUser = async (user: User) => {
    if (!confirm(`Supprimer définitivement le compte de ${user.name} ?`)) return
    setUpdatingId(user.id)
    const res = await fetch(`/api/admin/utilisateurs/${user.id}`, { method: 'DELETE' })
    setUpdatingId(null)
    if (!res.ok) {
      const d = await res.json()
      alert(d.error || 'Erreur.')
      return
    }
    fetchUsers()
  }

  if (loading) return <div className="text-gray-500">Chargement...</div>

  // Groupes distincts présents chez les utilisateurs (pour le filtre)
  const groupMap = new Map<number, string>()
  users.forEach((u) => u.groups.forEach((g) => groupMap.set(g.group.id, g.group.name)))
  const allGroups = Array.from(groupMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))

  const q = search.trim().toLowerCase()
  const filtered = users.filter((u) => {
    if (q && !(u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))) return false
    if (roleFilter !== 'all' && u.siteRole !== roleFilter) return false
    if (groupFilter === 'none' && u.groups.length > 0) return false
    if (typeof groupFilter === 'number' && !u.groups.some((g) => g.group.id === groupFilter)) return false
    if (typeof instrFilter === 'number' && !u.instruments.some((ui) => ui.instrument.id === instrFilter)) return false
    return true
  })
  const filtering = q !== '' || groupFilter !== 'all' || roleFilter !== 'all' || instrFilter !== 'all'
  const resetFilters = () => { setSearch(''); setGroupFilter('all'); setRoleFilter('all'); setInstrFilter('all') }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
        <p className="text-gray-500 mt-1">
          {filtering ? `${filtered.length} / ${users.length}` : users.length} compte{users.length > 1 ? 's' : ''} {filtering ? 'affichés' : 'enregistrés'}.
        </p>
      </div>

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={ph('admin_utilisateurs_1')}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-48"
        />
        <select value={String(groupFilter)} onChange={(e) => setGroupFilter(e.target.value === 'all' || e.target.value === 'none' ? e.target.value : Number(e.target.value))}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 max-w-[180px]">
          <option value="all">Tous les groupes</option>
          <option value="none">Sans groupe</option>
          {allGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={String(instrFilter)} onChange={(e) => setInstrFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 max-w-[180px]">
          <option value="all">Tous les instruments</option>
          {allInstruments.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as 'all' | 'ADMIN' | 'USER')}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="all">Tous les rôles</option>
          <option value="ADMIN">Admin</option>
          <option value="USER">Utilisateur</option>
        </select>
        {filtering && (
          <button onClick={resetFilters} className="text-xs font-medium text-gray-400 hover:text-gray-600">✕ Réinitialiser</button>
        )}
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Utilisateur</th>
                <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Instruments</th>
                <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Groupes</th>
                <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Rôle site</th>
                <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">Aucun utilisateur ne correspond aux filtres.</td></tr>
              )}
              {filtered.map((user) => {
                const hasNoGroups = user.groups.length === 0
                const isAdmin = user.siteRole === 'ADMIN'
                return (
                  <tr key={user.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold flex-shrink-0">
                          {user.avatarUrl
                            ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                            : user.name.charAt(0).toUpperCase()
                          }
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.instruments.length === 0 ? (
                          <span className="text-gray-400 text-xs">—</span>
                        ) : (
                          user.instruments.slice(0, 3).map((ui, i) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-0.5">
                              {ui.instrument.name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.groups.length === 0 ? (
                          <span className="text-gray-400 text-xs">—</span>
                        ) : (
                          user.groups.slice(0, 2).map((gm) => (
                            <span key={gm.group.id} className="text-xs bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5">
                              {gm.group.name}
                            </span>
                          ))
                        )}
                        {user.groups.length > 2 && (
                          <span className="text-xs text-gray-500">+{user.groups.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={isAdmin ? 'admin' : 'default'}>
                        {isAdmin ? 'Admin' : 'Utilisateur'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          onClick={() => openEdit(user)}
                          disabled={updatingId === user.id}
                          className="text-xs font-medium text-gray-600 hover:text-indigo-600 disabled:opacity-50"
                        >
                          Éditer
                        </button>
                        <button
                          onClick={() => toggleRole(user)}
                          disabled={updatingId === user.id}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
                        >
                          {updatingId === user.id ? '...' : isAdmin ? 'Rétrograder' : 'Promouvoir admin'}
                        </button>
                        {!isAdmin && hasNoGroups && (
                          <button
                            onClick={() => deleteUser(user)}
                            disabled={updatingId === user.id}
                            className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit modal */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Modifier le compte">
        <form onSubmit={handleEditSave} className="space-y-4">
          {editError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{editError}</div>
          )}

          {/* Avatar upload */}
          <div>
            <label className="form-label">Photo de profil</label>
            <div className="flex items-center gap-4">
              <div className="relative group/av flex-shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="w-16 h-16 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl ring-2 ring-gray-200 hover:ring-indigo-400 transition-all focus:outline-none"
                  title="Changer la photo"
                >
                  {editUser?.avatarUrl
                    ? <img src={editUser.avatarUrl} alt={editUser.name} className="w-full h-full object-cover" />
                    : <span>{editUser?.name.charAt(0).toUpperCase()}</span>
                  }
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover/av:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    {avatarUploading
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    }
                  </div>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50 text-left"
                >
                  {avatarUploading ? 'Upload en cours...' : 'Choisir une photo'}
                </button>
                {editUser?.avatarUrl && (
                  <button
                    type="button"
                    onClick={handleAvatarDelete}
                    disabled={avatarUploading}
                    className="text-sm font-medium text-red-500 hover:text-red-700 disabled:opacity-50 text-left"
                  >
                    Supprimer la photo
                  </button>
                )}
                {avatarError && <p className="text-xs text-red-500">{avatarError}</p>}
                <p className="text-xs text-gray-400">JPG, PNG, WebP — max 10 Mo</p>
              </div>
            </div>
          </div>

          <div>
            <label className="form-label">Nom complet</label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              required
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="form-input"
            />
          </div>
          {allInstruments.length > 0 && (
            <div>
              <label className="form-label">Instruments</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {allInstruments.map((instr) => (
                  <button
                    key={instr.id}
                    type="button"
                    onClick={() => toggleInstrument(instr.id)}
                    className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                      editForm.instrumentIds.includes(instr.id)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    {instr.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditUser(null)}>Annuler</Button>
            <Button type="submit" disabled={editSaving}>{editSaving ? 'Enregistrement...' : 'Sauvegarder'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

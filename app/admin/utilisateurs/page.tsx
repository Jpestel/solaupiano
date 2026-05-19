'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface User {
  id: number
  name: string
  email: string
  siteRole: string
  createdAt: string
  groups: { group: { id: number; name: string }; groupRole: string }[]
  instruments: { instrument: { name: string } }[]
}

export default function AdminUtilisateursPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/utilisateurs')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

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

  if (loading) return <div className="text-gray-500">Chargement...</div>

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
        <p className="text-gray-500 mt-1">{users.length} compte{users.length > 1 ? 's' : ''} enregistré{users.length > 1 ? 's' : ''}.</p>
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
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold flex-shrink-0">
                        {user.name.charAt(0).toUpperCase()}
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
                    <Badge variant={user.siteRole === 'ADMIN' ? 'admin' : 'default'}>
                      {user.siteRole === 'ADMIN' ? 'Admin' : 'Utilisateur'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleRole(user)}
                      disabled={updatingId === user.id}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
                    >
                      {updatingId === user.id
                        ? '...'
                        : user.siteRole === 'ADMIN'
                        ? 'Rétrograder'
                        : 'Promouvoir admin'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

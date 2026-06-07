'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ph } from '@/lib/placeholders'

interface Instrument {
  id: number
  name: string
  _count?: { users: number }
}

export default function AdminInstrumentsPage() {
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const fetchInstruments = async () => {
    const res = await fetch('/api/admin/instruments')
    if (res.ok) setInstruments(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchInstruments() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    setError('')

    const res = await fetch('/api/admin/instruments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })

    setAdding(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Erreur.')
      return
    }
    setNewName('')
    fetchInstruments()
  }

  const handleEdit = async (id: number) => {
    if (!editName.trim()) return
    const res = await fetch(`/api/admin/instruments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    })
    if (res.ok) {
      setEditId(null)
      setEditName('')
      fetchInstruments()
    }
  }

  const handleDelete = async (instr: Instrument) => {
    const used = instr._count?.users ?? 0
    const msg = used > 0
      ? `Supprimer « ${instr.name} » ? ${used} musicien${used > 1 ? 's l\'ont' : ' l\'a'} sélectionné — il sera retiré de leur profil.`
      : `Supprimer « ${instr.name} » ?`
    if (!confirm(msg)) return
    const res = await fetch(`/api/admin/instruments/${instr.id}`, { method: 'DELETE' })
    if (res.ok) fetchInstruments()
  }

  if (loading) return <div className="text-gray-500">Chargement...</div>

  const q = search.trim().toLowerCase()
  const filtered = instruments.filter((i) => i.name.toLowerCase().includes(q))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Instruments</h1>
        <p className="text-gray-500 mt-1">Gérez la liste des instruments disponibles. Les instruments ajoutés par les musiciens lors de l&apos;inscription apparaissent ici et sont modifiables.</p>
      </div>

      <div className="max-w-lg space-y-6">
        {/* Add form */}
        <Card>
          <CardHeader title="Ajouter un instrument" />
          <form onSubmit={handleAdd} className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="form-input flex-1"
              placeholder={ph('admin_instruments_1')}
            />
            <Button type="submit" disabled={adding || !newName.trim()}>
              {adding ? '...' : 'Ajouter'}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </Card>

        {/* List */}
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Liste</h3>
              <span className="text-xs text-gray-400">
                {q ? `${filtered.length} / ${instruments.length}` : instruments.length} instrument{instruments.length > 1 ? 's' : ''}
              </span>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input w-full"
              placeholder={ph('admin_instruments_2')}
            />
          </div>
          {instruments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Aucun instrument.</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Aucun instrument ne correspond à « {search} ».</p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {filtered.map((instr) => (
                <li key={instr.id} className="flex items-center gap-3 px-6 py-3.5 border-b border-gray-50 last:border-0">
                  {editId === instr.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="form-input flex-1"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleEdit(instr.id)}>
                        Sauvegarder
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                        Annuler
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium text-gray-900">{instr.name}</span>
                      {instr._count && (
                        <span className="text-xs text-gray-400">{instr._count.users} musicien{instr._count.users > 1 ? 's' : ''}</span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setEditId(instr.id); setEditName(instr.name) }}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(instr)}
                      >
                        Supprimer
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

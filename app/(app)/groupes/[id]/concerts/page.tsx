'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { formatDateWithDay } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface Concert {
  id: number
  name: string
  date: string
  location: string
  notes?: string
}

interface GroupInfo {
  name: string
  groupRole: string
}

export default function ConcertsPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const groupId = params.id
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', date: '', location: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchData = async () => {
    const [concRes, grpRes] = await Promise.all([
      fetch(`/api/groupes/${groupId}/concerts`),
      fetch(`/api/groupes/${groupId}`),
    ])
    if (concRes.ok) setConcerts(await concRes.json())
    if (grpRes.ok) {
      const g = await grpRes.json()
      const me = g.members?.find((m: { userId: number; groupRole: string }) => m.userId === Number(session?.user?.id))
      const role = session?.user?.siteRole === 'ADMIN' ? 'CHEF' : (me?.groupRole || 'MEMBRE')
      setGroupInfo({ name: g.name, groupRole: role })
    }
    setLoading(false)
  }

  useEffect(() => {
    if (session) fetchData()
  }, [session, groupId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch(`/api/groupes/${groupId}/concerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Erreur lors de la création.')
      return
    }
    setModalOpen(false)
    setForm({ name: '', date: '', location: '', notes: '' })
    fetchData()
  }

  const now = new Date()
  const upcoming = concerts.filter((c) => new Date(c.date) >= now)
  const past = concerts.filter((c) => new Date(c.date) < now)

  if (loading) return <div className="text-gray-500">Chargement...</div>

  const isChef = groupInfo?.groupRole === 'CHEF'

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">{groupInfo?.name}</Link>
        <span>/</span>
        <span className="text-gray-900">Concerts</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Concerts</h1>
        {isChef && (
          <Button onClick={() => setModalOpen(true)}>+ Nouveau concert</Button>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-base font-semibold text-gray-700 mb-3">À venir ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <Card><p className="text-sm text-gray-500 text-center py-6">Aucun concert à venir.</p></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((c) => (
              <Card key={c.id}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{c.name}</h3>
                  <span className="text-2xl">🎭</span>
                </div>
                <p className="text-sm text-indigo-600 font-medium capitalize">{formatDateWithDay(c.date)}</p>
                <p className="text-sm text-gray-500 mt-1">{c.location}</p>
                {c.notes && <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100">{c.notes}</p>}
              </Card>
            ))}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Passés ({past.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-70">
            {past.slice().reverse().map((c) => (
              <Card key={c.id}>
                <h3 className="font-semibold text-gray-700">{c.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{formatDateWithDay(c.date)}</p>
                <p className="text-sm text-gray-500">{c.location}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau concert">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="form-label">Nom du concert *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-input" placeholder="ex: Concert de fin d'année" />
          </div>
          <div>
            <label className="form-label">Date *</label>
            <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Lieu *</label>
            <input type="text" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="form-input" placeholder="Salle des fêtes, adresse..." />
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="form-input" rows={3} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Créer le concert'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

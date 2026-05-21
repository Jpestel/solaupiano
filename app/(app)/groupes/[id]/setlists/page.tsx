'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { formatDateWithDay } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface Concert { id: number; name: string; date: string }
interface Setlist {
  id: number
  name: string
  description?: string
  createdAt: string
  _count: { songs: number }
  concerts: Concert[]
}
interface GroupInfo { name: string; groupRole: string }

export default function SetlistsPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const groupId = params.id

  const [setlists, setSetlists] = useState<Setlist[]>([])
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const fetchData = async () => {
    const [slRes, grpRes] = await Promise.all([
      fetch(`/api/groupes/${groupId}/setlists`),
      fetch(`/api/groupes/${groupId}`),
    ])
    if (slRes.ok) setSetlists(await slRes.json())
    if (grpRes.ok) {
      const g = await grpRes.json()
      const me = g.members?.find((m: any) => m.userId === Number(session?.user?.id))
      const role = session?.user?.siteRole === 'ADMIN' ? 'CHEF' : (me?.groupRole || 'MEMBRE')
      setGroupInfo({ name: g.name, groupRole: role })
    }
    setLoading(false)
  }

  useEffect(() => { if (session) fetchData() }, [session, groupId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch(`/api/groupes/${groupId}/setlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Erreur.'); return }
    setModalOpen(false)
    setForm({ name: '', description: '' })
    fetchData()
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/setlists/${id}`, { method: 'DELETE' })
    setDeleteId(null)
    fetchData()
  }

  if (loading) return <div className="text-gray-500">Chargement...</div>

  const isChef = groupInfo?.groupRole === 'CHEF'

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">{groupInfo?.name}</Link>
        <span>/</span>
        <span className="text-gray-900">Setlists</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Setlists</h1>
          <p className="text-gray-500 text-sm mt-1">Créez des listes de morceaux à associer à vos concerts.</p>
        </div>
        {isChef && (
          <Button onClick={() => setModalOpen(true)}>+ Nouvelle setlist</Button>
        )}
      </div>

      {setlists.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🎵</p>
            <p className="font-semibold text-gray-700 mb-1">Aucune setlist pour l'instant</p>
            <p className="text-sm text-gray-400">
              {isChef ? 'Créez votre première setlist pour la préparer et l\'associer à un concert.' : 'Le chef du groupe n\'a pas encore créé de setlist.'}
            </p>
            {isChef && (
              <button onClick={() => setModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                + Créer une setlist
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {setlists.map((sl) => (
            <div key={sl.id} className="rounded-xl border border-gray-200 bg-white hover:shadow-md transition-all overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <Link href={`/groupes/${groupId}/setlists/${sl.id}`}
                      className="text-base font-semibold text-gray-900 hover:text-indigo-600 transition-colors line-clamp-1">
                      {sl.name}
                    </Link>
                    {sl.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{sl.description}</p>
                    )}
                  </div>
                  <span className="text-2xl flex-shrink-0">🎶</span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">
                    🎵 {sl._count.songs} morceau{sl._count.songs > 1 ? 'x' : ''}
                  </span>
                  {sl.concerts.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
                      🎭 {sl.concerts.length} concert{sl.concerts.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Associated concerts */}
                {sl.concerts.length > 0 && (
                  <div className="mb-4 space-y-1">
                    {sl.concerts.map((c) => (
                      <p key={c.id} className="text-xs text-gray-500 flex items-center gap-1.5">
                        <span className="text-purple-400">🎭</span>
                        <span className="font-medium text-gray-700">{c.name}</span>
                        <span className="text-gray-400">·</span>
                        <span className="capitalize">{formatDateWithDay(c.date)}</span>
                      </p>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <Link href={`/groupes/${groupId}/setlists/${sl.id}`}
                    className="text-xs text-indigo-600 hover:text-indigo-500 font-medium">
                    {isChef ? 'Éditer →' : 'Voir →'}
                  </Link>
                  {isChef && (
                    <button onClick={() => setDeleteId(sl.id)}
                      className="text-xs text-red-400 hover:text-red-600 font-medium ml-auto">
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setError('') }} title="Nouvelle setlist">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="form-label">Nom de la setlist <span className="text-red-500">*</span></label>
            <input type="text" required autoFocus value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="form-input" placeholder="ex: Set acoustique, Bal du 14 juillet..." />
          </div>
          <div>
            <label className="form-label">Description <span className="text-gray-400 font-normal">(optionnel)</span></label>
            <textarea rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="form-input resize-none" placeholder="Contexte, style musical, durée prévue..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); setError('') }}>Annuler</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Création...' : 'Créer la setlist'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setDeleteId(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Supprimer la setlist ?</h3>
                <p className="text-sm text-gray-500 mt-0.5">Les concerts associés ne seront pas supprimés.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors">
                Supprimer
              </button>
              <button onClick={() => setDeleteId(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

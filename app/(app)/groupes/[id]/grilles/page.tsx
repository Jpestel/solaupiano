'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface Song { id: number; title: string; artist?: string }
interface Chart {
  id: number; title: string; tempo?: string; keySignature?: string
  timeSignature: string; barsPerRow: number; totalBars: number
  songId?: number; song?: { id: number; title: string }
  createdAt: string; updatedAt: string
}
interface GroupInfo { name: string; groupRole: string }

const TIME_SIGS = ['4/4', '3/4', '6/8', '2/4', '5/4', '12/8', '2/2']
const BARS_PER_ROW = [2, 3, 4, 6]
const TOTAL_BARS = [8, 16, 24, 32, 48, 64, 80]

export default function GrillesPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const groupId = params.id

  const [charts, setCharts] = useState<Chart[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '', tempo: '', keySignature: '',
    timeSignature: '4/4', barsPerRow: 4, totalBars: 32, songId: '',
  })

  const fetchData = async () => {
    const [chartsRes, grpRes, songsRes] = await Promise.all([
      fetch(`/api/groupes/${groupId}/grilles`),
      fetch(`/api/groupes/${groupId}`),
      fetch(`/api/groupes/${groupId}/morceaux`),
    ])
    if (chartsRes.ok) setCharts(await chartsRes.json())
    if (grpRes.ok) {
      const g = await grpRes.json()
      const me = g.members?.find((m: any) => m.userId === Number(session?.user?.id))
      const role = session?.user?.siteRole === 'ADMIN' ? 'CHEF' : (me?.groupRole || 'MEMBRE')
      setGroupInfo({ name: g.name, groupRole: role })
    }
    if (songsRes.ok) setSongs(await songsRes.json())
    setLoading(false)
  }

  useEffect(() => { if (session) fetchData() }, [session, groupId])

  const resetForm = () => setForm({ title: '', tempo: '', keySignature: '', timeSignature: '4/4', barsPerRow: 4, totalBars: 32, songId: '' })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch(`/api/groupes/${groupId}/grilles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, songId: form.songId ? Number(form.songId) : null }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Erreur.'); return }
    const chart = await res.json()
    setModalOpen(false); resetForm()
    window.location.href = `/groupes/${groupId}/grilles/${chart.id}`
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/grilles/${id}`, { method: 'DELETE' })
    setDeleteId(null); fetchData()
  }

  if (loading) return <div className="text-gray-500">Chargement...</div>
  const isChef = groupInfo?.groupRole === 'CHEF'

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">{groupInfo?.name}</Link>
        <span>/</span>
        <span className="text-gray-900">Grilles</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grilles d&apos;accords</h1>
          <p className="text-gray-500 text-sm mt-1">Créez et partagez vos grilles d&apos;accords.</p>
        </div>
        {isChef && <Button onClick={() => setModalOpen(true)}>+ Nouvelle grille</Button>}
      </div>

      {charts.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🎸</p>
            <p className="font-semibold text-gray-700 mb-1">Aucune grille pour l&apos;instant</p>
            <p className="text-sm text-gray-400">
              {isChef ? 'Créez votre première grille d\'accords.' : 'Le chef du groupe n\'a pas encore créé de grille.'}
            </p>
            {isChef && (
              <button onClick={() => setModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500 transition-colors">
                + Créer une grille
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {charts.map((chart) => (
            <div key={chart.id} className="rounded-xl border border-gray-200 bg-white hover:shadow-md transition-all overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <Link href={`/groupes/${groupId}/grilles/${chart.id}`}
                      className="text-base font-semibold text-gray-900 hover:text-orange-600 transition-colors line-clamp-1">
                      {chart.title}
                    </Link>
                    {chart.song && (
                      <p className="text-xs text-gray-400 mt-0.5">↳ {chart.song.title}</p>
                    )}
                  </div>
                  <span className="text-2xl flex-shrink-0">🎸</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {chart.tempo && (
                    <span className="inline-flex items-center rounded-full bg-orange-50 border border-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">
                      ♩ {chart.tempo}
                    </span>
                  )}
                  {chart.keySignature && (
                    <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                      🎵 {chart.keySignature}
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {chart.timeSignature}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {chart.totalBars} mesures
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <Link href={`/groupes/${groupId}/grilles/${chart.id}`}
                    className="text-xs text-orange-600 hover:text-orange-500 font-medium">
                    {isChef ? 'Éditer →' : 'Voir →'}
                  </Link>
                  {isChef && (
                    <button onClick={() => setDeleteId(chart.id)}
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
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm(); setError('') }} title="Nouvelle grille d'accords">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="form-label">Titre <span className="text-red-500">*</span></label>
            <input type="text" required autoFocus value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="form-input" placeholder="ex: Autumn Leaves, La Vie en Rose..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Tempo <span className="text-gray-400 font-normal">(optionnel)</span></label>
              <input type="text" value={form.tempo}
                onChange={(e) => setForm({ ...form, tempo: e.target.value })}
                className="form-input" placeholder="♩=120, Swing, Bossa…" />
            </div>
            <div>
              <label className="form-label">Tonalité <span className="text-gray-400 font-normal">(optionnel)</span></label>
              <input type="text" value={form.keySignature}
                onChange={(e) => setForm({ ...form, keySignature: e.target.value })}
                className="form-input" placeholder="La min, Fa maj…" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">Mesure</label>
              <select value={form.timeSignature} onChange={(e) => setForm({ ...form, timeSignature: e.target.value })} className="form-input">
                {TIME_SIGS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Mesures/ligne</label>
              <select value={form.barsPerRow} onChange={(e) => setForm({ ...form, barsPerRow: Number(e.target.value) })} className="form-input">
                {BARS_PER_ROW.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Nb mesures</label>
              <select value={form.totalBars} onChange={(e) => setForm({ ...form, totalBars: Number(e.target.value) })} className="form-input">
                {TOTAL_BARS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          {songs.length > 0 && (
            <div>
              <label className="form-label">Lier à un morceau <span className="text-gray-400 font-normal">(optionnel)</span></label>
              <select value={form.songId} onChange={(e) => setForm({ ...form, songId: e.target.value })} className="form-input">
                <option value="">— Aucun —</option>
                {songs.map((s) => <option key={s.id} value={s.id}>{s.title}{s.artist ? ` — ${s.artist}` : ''}</option>)}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); resetForm(); setError('') }}>Annuler</Button>
            <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-500">
              {saving ? 'Création...' : 'Créer et éditer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteId(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Supprimer la grille ?</h3>
                <p className="text-sm text-gray-500 mt-0.5">Cette action est irréversible.</p>
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

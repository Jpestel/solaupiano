'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { resolvePermissions, type ChefPermissions } from '@/lib/permissions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { DismissibleHelp } from './DismissibleHelp'

interface Song { id: number; title: string; artist?: string; tempo?: number | null }
interface SquareScore {
  id: number
  title: string
  pulsation?: string | null
  measureDescription?: string | null
  debit?: string | null
  tempo?: string | null
  keySignature?: string | null
  timeSignature: string
  squaresPerRow: number
  totalSquares: number
  beatsPerSquare: number
  song?: { id: number; title: string } | null
  updatedAt: string
}
interface GroupInfo { name: string; groupRole: string; createdBy: number | null; chefPermissions: unknown }

const TIME_SIGS = ['4/4', '3/4', '6/8', '2/4', '5/4', '12/8']
const SQUARES_PER_ROW = [2, 3, 4, 6, 8]
const TOTAL_SQUARES = [8, 16, 24, 32, 48, 64, 80, 96]
const BEATS_PER_SQUARE = [1, 2, 3, 4, 6, 8]

export default function PartitionsCarreesPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const groupId = params.id
  const [scores, setScores] = useState<SquareScore[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [duplicateTarget, setDuplicateTarget] = useState<SquareScore | null>(null)
  const [duplicateTitle, setDuplicateTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(false)
  const [form, setForm] = useState({
    title: '',
    pulsation: '',
    measureDescription: '',
    debit: 'binaire',
    tempo: '',
    keySignature: '',
    timeSignature: '4/4',
    squaresPerRow: 4,
    totalSquares: 32,
    beatsPerSquare: 4,
    songId: '',
  })

  const fetchData = async () => {
    const [scoresRes, grpRes, songsRes] = await Promise.all([
      fetch(`/api/groupes/${groupId}/partitions-carrees`),
      fetch(`/api/groupes/${groupId}`),
      fetch(`/api/groupes/${groupId}/morceaux`),
    ])
    if (scoresRes.status === 403) setLocked(true)
    if (scoresRes.ok) {
      const data = await scoresRes.json()
      setScores(data.scores ?? [])
    }
    if (grpRes.ok) {
      const g = await grpRes.json()
      const me = g.members?.find((m: { userId: number }) => m.userId === Number(session?.user?.id))
      const role = session?.user?.siteRole === 'ADMIN' ? 'CHEF' : (me?.groupRole || 'MEMBRE')
      setGroupInfo({ name: g.name, groupRole: role, createdBy: g.createdBy ?? null, chefPermissions: g.chefPermissions ?? null })
    }
    if (songsRes.ok) setSongs(await songsRes.json())
    setLoading(false)
  }

  useEffect(() => { if (session) fetchData() }, [session, groupId])

  const isChef = groupInfo?.groupRole === 'CHEF'
  const isFounder = isChef && (session?.user?.siteRole === 'ADMIN' || Number(session?.user?.id) === groupInfo?.createdBy)
  const perms = resolvePermissions(groupInfo?.chefPermissions)
  const chefCan = (action: string): boolean => {
    if (!isChef) return false
    if (isFounder) return true
    return (perms.partitionsCarrees as Record<string, boolean>)[action] !== false
  }

  const resetForm = () => setForm({
    title: '',
    pulsation: '',
    measureDescription: '',
    debit: 'binaire',
    tempo: '',
    keySignature: '',
    timeSignature: '4/4',
    squaresPerRow: 4,
    totalSquares: 32,
    beatsPerSquare: 4,
    songId: '',
  })

  const selectSong = (value: string) => {
    const song = songs.find((s) => String(s.id) === value)
    setForm((f) => ({
      ...f,
      songId: value,
      title: song?.title && !f.title.trim() ? song.title : f.title,
      tempo: song?.tempo && !f.tempo.trim() ? String(song.tempo) : f.tempo,
    }))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch(`/api/groupes/${groupId}/partitions-carrees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, songId: form.songId ? Number(form.songId) : null }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erreur.')
      return
    }
    const score = await res.json()
    window.location.href = `/groupes/${groupId}/partitions-carrees/${score.id}`
  }

  const handleDuplicate = async () => {
    if (!duplicateTarget || !duplicateTitle.trim()) return
    setSaving(true)
    const res = await fetch(`/api/partitions-carrees/${duplicateTarget.id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: duplicateTitle.trim() }),
    })
    setSaving(false)
    if (!res.ok) return
    const copy = await res.json()
    window.location.href = `/groupes/${groupId}/partitions-carrees/${copy.id}`
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/partitions-carrees/${id}`, { method: 'DELETE' })
    setDeleteId(null)
    fetchData()
  }

  if (loading) return <div className="text-gray-500">Chargement...</div>

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">{groupInfo?.name}</Link>
        <span>/</span>
        <span className="text-gray-900">Partitions carrées</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Méthode carrée</h1>
          <p className="text-gray-500 text-sm mt-1">Relevez la structure d’un morceau avec PMD, carrés de mesures et abréviations de parties.</p>
        </div>
        {chefCan('create') && <Button onClick={() => setModalOpen(true)}>+ Nouvelle partition</Button>}
      </div>

      <div className="mb-6">
        <DismissibleHelp storageKey="square-score-list-help" title="Comment fonctionne la méthode carrée ?">
          <div className="space-y-2">
            <p>Commencez par le PMD : <strong>Pulsation</strong> (tempo ressenti), <strong>Mesure</strong> (nombre de temps), puis <strong>Débit</strong> (binaire, ternaire ou mixte).</p>
            <p>Ensuite, vous tracez des carrés : <strong>chaque côté représente une mesure</strong>. Un carré complet représente donc généralement 4 mesures en 4/4.</p>
            <p>Pour rendre la structure lisible, indiquez les parties avec des abréviations : <strong>I</strong> intro, <strong>C</strong> couplet, <strong>PR</strong> pré-refrain, <strong>R</strong> refrain, <strong>P</strong> pont, <strong>It</strong> interlude, <strong>S</strong> solo, <strong>O</strong> outro.</p>
          </div>
        </DismissibleHelp>
      </div>

      {locked ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🔒</p>
            <p className="font-semibold text-gray-700 mb-1">Module non activé pour ce plan</p>
            <p className="text-sm text-gray-400">Activez “Partitions carrées” depuis l’administration des modules/plans.</p>
          </div>
        </Card>
      ) : scores.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-4xl mb-3">▦</p>
            <p className="font-semibold text-gray-700 mb-1">Aucune partition carrée</p>
            <p className="text-sm text-gray-400">
              {isChef ? 'Créez une première partition en carrés.' : 'Le chef du groupe n\'a pas encore créé de partition carrée.'}
            </p>
            {chefCan('create') && (
              <button onClick={() => setModalOpen(true)} className="mt-4 rounded-lg bg-lime-600 px-4 py-2 text-sm font-semibold text-white hover:bg-lime-500 transition-colors">
                + Créer une partition
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scores.map((score) => (
            <div key={score.id} className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <Link href={`/groupes/${groupId}/partitions-carrees/${score.id}`} className="text-base font-semibold text-gray-900 hover:text-lime-700 transition-colors line-clamp-1">
                    {score.title}
                  </Link>
                  {score.song && <p className="text-xs text-gray-400 mt-0.5">↳ {score.song.title}</p>}
                </div>
                <span className="text-2xl">▦</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {(score.pulsation || score.tempo) && <span className="rounded-full bg-lime-50 border border-lime-100 px-2.5 py-1 text-xs font-medium text-lime-700">P : {score.pulsation || `♩ = ${score.tempo}`}</span>}
                {(score.measureDescription || score.timeSignature) && <span className="rounded-full bg-sky-50 border border-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">M : {score.measureDescription || score.timeSignature}</span>}
                {score.debit && <span className="rounded-full bg-violet-50 border border-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">D : {score.debit}</span>}
                {score.keySignature && <span className="rounded-full bg-amber-50 border border-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">🎵 {score.keySignature}</span>}
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{score.timeSignature}</span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{score.totalSquares} carrés</span>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <Link href={`/groupes/${groupId}/partitions-carrees/${score.id}`} className="text-xs text-lime-700 hover:text-lime-600 font-medium">
                  {isChef ? 'Éditer →' : 'Voir →'}
                </Link>
                {chefCan('create') && (
                  <button onClick={() => { setDuplicateTarget(score); setDuplicateTitle(`${score.title} — copie`) }} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">
                    Dupliquer
                  </button>
                )}
                {chefCan('delete') && (
                  <button onClick={() => setDeleteId(score.id)} className="text-xs text-red-400 hover:text-red-600 font-medium ml-auto">
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm(); setError('') }} title="Nouvelle partition carrée">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="form-label">Titre <span className="text-red-500">*</span></label>
            <input type="text" required autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="form-input" placeholder="Ex. Intro + refrain - version carrée" />
          </div>
          <div className="rounded-lg border border-lime-200 bg-lime-50 p-3">
            <p className="text-sm font-semibold text-lime-900">Travail préparatoire : PMD</p>
            <p className="text-xs text-lime-800 mt-1">Pulsation, Mesure, Débit : ces trois repères structurent le relevé avant de tracer les carrés.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label">P = Pulsation</label>
              <input type="text" value={form.pulsation} onChange={(e) => setForm({ ...form, pulsation: e.target.value })} className="form-input" placeholder="noire = 90" />
            </div>
            <div>
              <label className="form-label">M = Mesure</label>
              <input type="text" value={form.measureDescription} onChange={(e) => setForm({ ...form, measureDescription: e.target.value })} className="form-input" placeholder="4 temps" />
            </div>
            <div>
              <label className="form-label">D = Débit</label>
              <select value={form.debit} onChange={(e) => setForm({ ...form, debit: e.target.value })} className="form-input">
                <option value="binaire">binaire</option>
                <option value="ternaire">ternaire</option>
                <option value="mixte">mixte</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Tempo</label>
              <input type="text" value={form.tempo} onChange={(e) => setForm({ ...form, tempo: e.target.value })} className="form-input" placeholder="92" />
            </div>
            <div>
              <label className="form-label">Tonalité</label>
              <input type="text" value={form.keySignature} onChange={(e) => setForm({ ...form, keySignature: e.target.value })} className="form-input" placeholder="Am" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="form-label">Mesure</label>
              <select value={form.timeSignature} onChange={(e) => setForm({ ...form, timeSignature: e.target.value })} className="form-input">
                {TIME_SIGS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Carrés/ligne</label>
              <select value={form.squaresPerRow} onChange={(e) => setForm({ ...form, squaresPerRow: Number(e.target.value) })} className="form-input">
                {SQUARES_PER_ROW.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Nb carrés</label>
              <select value={form.totalSquares} onChange={(e) => setForm({ ...form, totalSquares: Number(e.target.value) })} className="form-input">
                {TOTAL_SQUARES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Temps par mesure</label>
              <select value={form.beatsPerSquare} onChange={(e) => setForm({ ...form, beatsPerSquare: Number(e.target.value) })} className="form-input">
                {BEATS_PER_SQUARE.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          {songs.length > 0 && (
            <div>
              <label className="form-label">Lier à un morceau</label>
              <select value={form.songId} onChange={(e) => selectSong(e.target.value)} className="form-input">
                <option value="">— Aucun —</option>
                {songs.map((s) => <option key={s.id} value={s.id}>{s.title}{s.artist ? ` — ${s.artist}` : ''}</option>)}
              </select>
            </div>
          )}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
            Abréviations usuelles : I = intro, C = couplet, PR = pré-refrain, R = refrain, P = pont, It = interlude, S = solo, O = outro.
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); resetForm(); setError('') }}>Annuler</Button>
            <Button type="submit" disabled={saving} className="bg-lime-600 hover:bg-lime-500">{saving ? 'Création...' : 'Créer et éditer'}</Button>
          </div>
        </form>
      </Modal>

      {duplicateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDuplicateTarget(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Dupliquer la partition</h3>
            <p className="text-sm text-gray-500 mb-4">Créez une copie indépendante.</p>
            <label className="form-label">Titre de la copie</label>
            <input type="text" autoFocus value={duplicateTitle} onChange={(e) => setDuplicateTitle(e.target.value)} className="form-input mb-4" />
            <div className="flex gap-3">
              <button onClick={handleDuplicate} disabled={saving || !duplicateTitle.trim()} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">Dupliquer</button>
              <button onClick={() => setDuplicateTarget(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteId(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Supprimer cette partition ?</h3>
            <p className="text-sm text-gray-500 mb-4">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">Supprimer</button>
              <button onClick={() => setDeleteId(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

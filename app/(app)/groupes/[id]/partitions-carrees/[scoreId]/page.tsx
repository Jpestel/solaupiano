'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { DismissibleHelp } from '../DismissibleHelp'

interface SquareCell {
  section: string
  chord: string
  melody: string
  rhythm: string
  lyric: string
  note: string
}

interface SquareScore {
  id: number
  groupId: number
  songId?: number | null
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
  cells: SquareCell[]
  notes?: string | null
  isChef: boolean
  song?: { id: number; title: string } | null
}

const EMPTY_CELL: SquareCell = { section: '', chord: '', melody: '', rhythm: '', lyric: '', note: '' }
const TIME_SIGS = ['4/4', '3/4', '6/8', '2/4', '5/4', '12/8']

function normalizeCells(cells: unknown, total: number): SquareCell[] {
  const base = Array.isArray(cells) ? cells : []
  const normalized = base.map((cell) => {
    const c = cell && typeof cell === 'object' ? cell as Partial<SquareCell> : {}
    return {
      section: c.section ?? '',
      chord: c.chord ?? '',
      melody: c.melody ?? '',
      rhythm: c.rhythm ?? '',
      lyric: c.lyric ?? '',
      note: c.note ?? '',
    }
  })
  while (normalized.length < total) normalized.push({ ...EMPTY_CELL })
  return normalized.slice(0, total)
}

export default function PartitionCarreeEditor({ params }: { params: { id: string; scoreId: string } }) {
  const groupId = params.id
  const scoreId = params.scoreId
  const [score, setScore] = useState<SquareScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const loadScore = async () => {
    const res = await fetch(`/api/partitions-carrees/${scoreId}`)
    if (!res.ok) {
      setError('Partition introuvable ou accès refusé.')
      setLoading(false)
      return
    }
    const data = await res.json()
    setScore({ ...data, cells: normalizeCells(data.cells, data.totalSquares) })
    setLoading(false)
  }

  useEffect(() => { loadScore() }, [scoreId])

  const selected = score?.cells[selectedIndex] ?? EMPTY_CELL
  const canEdit = Boolean(score?.isChef)
  const columns = Math.max(2, Math.min(8, score?.squaresPerRow ?? 4))
  const rows = useMemo(() => {
    if (!score) return []
    const result: SquareCell[][] = []
    for (let i = 0; i < score.cells.length; i += columns) {
      result.push(score.cells.slice(i, i + columns))
    }
    return result
  }, [score, columns])

  const patchScore = (patch: Partial<SquareScore>) => {
    if (!score) return
    setScore({ ...score, ...patch })
    setSaved(false)
  }

  const patchCell = (index: number, patch: Partial<SquareCell>) => {
    if (!score || !canEdit) return
    const cells = [...score.cells]
    cells[index] = { ...cells[index], ...patch }
    setScore({ ...score, cells })
    setSaved(false)
  }

  const resizeCells = (total: number) => {
    if (!score || !canEdit) return
    const nextTotal = Math.max(4, Math.min(128, total))
    const cells = normalizeCells(score.cells, nextTotal)
    setSelectedIndex(Math.min(selectedIndex, nextTotal - 1))
    setScore({ ...score, totalSquares: nextTotal, cells })
    setSaved(false)
  }

  const save = async () => {
    if (!score || !canEdit) return
    setSaving(true)
    setError('')
    const res = await fetch(`/api/partitions-carrees/${score.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: score.title,
        tempo: score.tempo,
        pulsation: score.pulsation,
        measureDescription: score.measureDescription,
        debit: score.debit,
        keySignature: score.keySignature,
        timeSignature: score.timeSignature,
        squaresPerRow: score.squaresPerRow,
        totalSquares: score.totalSquares,
        beatsPerSquare: score.beatsPerSquare,
        cells: score.cells,
        notes: score.notes,
        songId: score.songId,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erreur de sauvegarde.')
      return
    }
    const data = await res.json()
    setScore({ ...data, isChef: score.isChef, cells: normalizeCells(data.cells, data.totalSquares) })
    setSaved(true)
  }

  if (loading) return <div className="text-gray-500">Chargement...</div>
  if (!score) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>

  return (
    <div className="print:bg-white">
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-full { max-width: none !important; margin: 0 !important; padding: 0 !important; }
          .square-cell { break-inside: avoid; }
        }
      `}</style>

      <div className="no-print flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">Groupe</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}/partitions-carrees`} className="hover:text-indigo-600">Partitions carrées</Link>
        <span>/</span>
        <span className="text-gray-900">{score.title}</span>
      </div>

      <div className="no-print flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partition carrée</h1>
          <p className="text-sm text-gray-500 mt-1">
            Relevé de structure : PMD en haut de feuille, puis carrés dont chaque côté représente une mesure.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => window.print()}>Imprimer</Button>
          {canEdit && (
            <Button type="button" onClick={save} disabled={saving} className="bg-lime-600 hover:bg-lime-500">
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          )}
        </div>
      </div>

      {error && <div className="no-print rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">{error}</div>}
      {saved && <div className="no-print rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 mb-4">Partition enregistrée.</div>}

      <div className="mb-5">
        <DismissibleHelp storageKey="square-score-editor-help" title="Mode d’emploi rapide">
          <div className="space-y-2">
            <p>Renseignez d’abord le <strong>PMD</strong> : pulsation, mesure et débit. C’est le calibrage du temps avant le relevé.</p>
            <p>Cliquez ensuite sur un carré : les numéros <strong>1, 2, 3, 4</strong> indiquent l’ordre des côtés. Chaque côté correspond à une mesure.</p>
            <p>Dans le panneau de droite, utilisez <strong>Section</strong> pour noter I, C, PR, R, P, It, S ou O. Les champs accord, rythme, paroles et consigne sont optionnels : ils servent à enrichir le relevé si besoin.</p>
          </div>
        </DismissibleHelp>
      </div>

      <div className="print-full grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4 mb-4">
            <div className="min-w-0">
              {canEdit ? (
                <input
                  value={score.title}
                  onChange={(e) => patchScore({ title: e.target.value })}
                  className="no-print w-full border-0 p-0 text-2xl font-bold text-gray-900 focus:ring-0"
                />
              ) : (
                <h1 className="text-2xl font-bold text-gray-900">{score.title}</h1>
              )}
              <h1 className="hidden print:block text-2xl font-bold text-gray-900">{score.title}</h1>
              {score.song && <p className="text-sm text-gray-500 mt-1">Morceau : {score.song.title}</p>}
            </div>
            <div className="text-right text-sm text-gray-600 space-y-1 flex-shrink-0">
              {(score.pulsation || score.tempo) && <p>P : {score.pulsation || `♩ = ${score.tempo}`}</p>}
              {(score.measureDescription || score.timeSignature) && <p>M : {score.measureDescription || score.timeSignature}</p>}
              {score.debit && <p>D : {score.debit}</p>}
              {score.keySignature && <p>{score.keySignature}</p>}
            </div>
          </div>

          <div className="space-y-3">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                {row.map((cell, localIndex) => {
                  const index = rowIndex * columns + localIndex
                  const active = selectedIndex === index
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedIndex(index)}
                      className={`square-cell relative aspect-square min-h-[150px] rounded-lg border bg-white p-2 text-left transition-colors ${active ? 'border-lime-500 ring-2 ring-lime-100' : 'border-gray-300 hover:border-lime-300'}`}
                    >
                      <span className="absolute left-2 top-1 text-[10px] font-semibold text-gray-300">{index + 1}</span>
                      {cell.section && (
                        <span className="absolute right-2 top-2 rounded-full bg-lime-100 px-2 py-0.5 text-[10px] font-bold text-lime-700">
                          {cell.section}
                        </span>
                      )}
                      <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[10px] font-bold text-lime-700">1</span>
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-bold text-lime-700">2</span>
                      <span className="absolute left-1/2 bottom-1 -translate-x-1/2 text-[10px] font-bold text-lime-700">3</span>
                      <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] font-bold text-lime-700">4</span>
                      <div className="absolute inset-5 rounded border-2 border-gray-800" />
                      <div className="relative z-10 flex h-full flex-col items-center justify-center px-5 text-center">
                        <div className="text-2xl font-extrabold text-gray-950">{cell.chord || '·'}</div>
                        <div className="mt-2 text-sm font-semibold text-indigo-700 whitespace-pre-wrap">{cell.melody}</div>
                        <div className="mt-1 text-xs text-gray-500 whitespace-pre-wrap">{cell.rhythm}</div>
                        <div className="mt-2 text-xs italic text-gray-700 whitespace-pre-wrap">{cell.lyric}</div>
                        {cell.note && <div className="mt-2 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-800 whitespace-pre-wrap">{cell.note}</div>}
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {score.notes && (
            <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">
              {score.notes}
            </div>
          )}
        </div>

        <aside className="no-print space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Réglages</h2>
            <div className="mb-3 rounded-lg border border-lime-200 bg-lime-50 p-3 text-xs text-lime-900">
              <strong>PMD</strong> : Pulsation, Mesure, Débit. Dans le relevé, chaque côté du carré représente une mesure ; les chiffres donnent l’ordre de tracé.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="form-label">Pulsation</span>
                <input disabled={!canEdit} value={score.pulsation ?? ''} onChange={(e) => patchScore({ pulsation: e.target.value })} className="form-input" placeholder="noire = 90" />
              </label>
              <label className="block">
                <span className="form-label">Mesure</span>
                <input disabled={!canEdit} value={score.measureDescription ?? ''} onChange={(e) => patchScore({ measureDescription: e.target.value })} className="form-input" placeholder="4 temps" />
              </label>
              <label className="block">
                <span className="form-label">Débit</span>
                <select disabled={!canEdit} value={score.debit ?? ''} onChange={(e) => patchScore({ debit: e.target.value })} className="form-input">
                  <option value="">—</option>
                  <option value="binaire">binaire</option>
                  <option value="ternaire">ternaire</option>
                  <option value="mixte">mixte</option>
                </select>
              </label>
              <label className="block">
                <span className="form-label">Tempo</span>
                <input disabled={!canEdit} value={score.tempo ?? ''} onChange={(e) => patchScore({ tempo: e.target.value })} className="form-input" />
              </label>
              <label className="block">
                <span className="form-label">Tonalité</span>
                <input disabled={!canEdit} value={score.keySignature ?? ''} onChange={(e) => patchScore({ keySignature: e.target.value })} className="form-input" />
              </label>
              <label className="block">
                <span className="form-label">Mesure</span>
                <select disabled={!canEdit} value={score.timeSignature} onChange={(e) => patchScore({ timeSignature: e.target.value })} className="form-input">
                  {TIME_SIGS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="form-label">Carrés/ligne</span>
                <input disabled={!canEdit} type="number" min={2} max={8} value={score.squaresPerRow} onChange={(e) => patchScore({ squaresPerRow: Number(e.target.value) })} className="form-input" />
              </label>
              <label className="block">
                <span className="form-label">Nb carrés</span>
                <input disabled={!canEdit} type="number" min={4} max={128} value={score.totalSquares} onChange={(e) => resizeCells(Number(e.target.value))} className="form-input" />
              </label>
              <label className="block">
                <span className="form-label">Temps par mesure</span>
                <input disabled={!canEdit} type="number" min={1} max={8} value={score.beatsPerSquare} onChange={(e) => patchScore({ beatsPerSquare: Number(e.target.value) })} className="form-input" />
              </label>
            </div>
            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
              Abréviations : I intro, C couplet, PR pré-refrain, R refrain, P pont, It interlude, S solo, O outro.
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Carré {selectedIndex + 1}</h2>
              <span className="text-xs text-gray-400">4 mesures · {score.beatsPerSquare} temps/mesure</span>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="form-label">Section</span>
                <input disabled={!canEdit} value={selected.section} onChange={(e) => patchCell(selectedIndex, { section: e.target.value })} className="form-input" placeholder="A, B, Pont..." />
              </label>
              <label className="block">
                <span className="form-label">Accord</span>
                <input disabled={!canEdit} value={selected.chord} onChange={(e) => patchCell(selectedIndex, { chord: e.target.value })} className="form-input text-lg font-bold" placeholder="Am, F, G..." />
              </label>
              <label className="block">
                <span className="form-label">Mélodie / notes</span>
                <textarea disabled={!canEdit} value={selected.melody} onChange={(e) => patchCell(selectedIndex, { melody: e.target.value })} className="form-input min-h-[70px]" placeholder="Do Ré Mi / riff / motif..." />
              </label>
              <label className="block">
                <span className="form-label">Rythme</span>
                <input disabled={!canEdit} value={selected.rhythm} onChange={(e) => patchCell(selectedIndex, { rhythm: e.target.value })} className="form-input" placeholder="1 & 2 & / noire-croche..." />
              </label>
              <label className="block">
                <span className="form-label">Paroles</span>
                <textarea disabled={!canEdit} value={selected.lyric} onChange={(e) => patchCell(selectedIndex, { lyric: e.target.value })} className="form-input min-h-[60px]" />
              </label>
              <label className="block">
                <span className="form-label">Consigne</span>
                <textarea disabled={!canEdit} value={selected.note} onChange={(e) => patchCell(selectedIndex, { note: e.target.value })} className="form-input min-h-[70px]" placeholder="Entrée batterie, tenir, break..." />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <label className="block">
              <span className="form-label">Notes globales</span>
              <textarea disabled={!canEdit} value={score.notes ?? ''} onChange={(e) => patchScore({ notes: e.target.value })} className="form-input min-h-[100px]" placeholder="Structure, remarques, interprétation..." />
            </label>
          </div>
        </aside>
      </div>
    </div>
  )
}

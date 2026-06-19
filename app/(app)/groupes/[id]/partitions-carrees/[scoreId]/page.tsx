'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { DismissibleHelp } from '../DismissibleHelp'

interface Label { id: string; r: number; c: number; text: string }
interface Canvas { rows: number; cols: number; h: string[]; v: string[]; labels: Label[] }

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
  cells: Canvas
  notes?: string | null
  isChef: boolean
  song?: { id: number; title: string } | null
}

const TIME_SIGS = ['4/4', '3/4', '6/8', '2/4', '5/4', '12/8']
const STEP = 36
const M = 26

function legacyCellText(cell: unknown) {
  const c = cell && typeof cell === 'object' ? (cell as Record<string, unknown>) : {}
  return [
    String(c.section ?? '').trim(),
    String(c.chord ?? '').trim(),
    String(c.melody ?? '').trim(),
    String(c.rhythm ?? '').trim(),
    String(c.lyric ?? '').trim(),
    String(c.note ?? '').trim(),
  ].filter(Boolean).join(' · ').slice(0, 40)
}

function normalizeCanvas(value: unknown, beatsPerMeasure = 4): Canvas {
  if (Array.isArray(value)) {
    const beats = Math.max(1, Math.min(8, Math.round(Number(beatsPerMeasure)) || 4))
    const perRow = 4
    const rows = Math.max(2, Math.min(16, Math.ceil(value.length / perRow) + 1))
    const cols = Math.max(2, Math.min(48, perRow * beats + 1))
    const labels = value.map((cell, i) => ({
      id: `legacy-${i}`,
      r: Math.floor(i / perRow),
      c: (i % perRow) * beats,
      text: legacyCellText(cell),
    })).filter((l) => l.text)
    return { rows, cols, h: [], v: [], labels }
  }

  const v = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  const rows = Math.max(2, Math.min(16, Math.round(Number(v.rows)) || 5))
  const cols = Math.max(2, Math.min(48, Math.round(Number(v.cols)) || 17))
  const arr = (x: unknown) => (Array.isArray(x) ? x.filter((k): k is string => typeof k === 'string') : [])
  const labels = Array.isArray(v.labels)
    ? (v.labels as unknown[]).map((l, i) => {
        const o = l && typeof l === 'object' ? (l as Record<string, unknown>) : {}
        return { id: typeof o.id === 'string' ? o.id : `l${i}`, r: Math.round(Number(o.r)) || 0, c: Math.round(Number(o.c)) || 0, text: String(o.text ?? '') }
      }).filter((l) => l.text)
    : []
  return { rows, cols, h: arr(v.h), v: arr(v.v), labels }
}

export default function PartitionCarreeEditor({ params }: { params: { id: string; scoreId: string } }) {
  const groupId = params.id
  const scoreId = params.scoreId
  const [score, setScore] = useState<SquareScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [placingId, setPlacingId] = useState<string | null>(null)

  const loadScore = async () => {
    const res = await fetch(`/api/partitions-carrees/${scoreId}`)
    if (!res.ok) { setError('Partition introuvable ou accès refusé.'); setLoading(false); return }
    const data = await res.json()
    setScore({ ...data, cells: normalizeCanvas(data.cells, data.beatsPerSquare) })
    setLoading(false)
  }
  useEffect(() => { loadScore() }, [scoreId]) // eslint-disable-line react-hooks/exhaustive-deps

  const canEdit = Boolean(score?.isChef)
  const canvas = score?.cells

  const patchScore = (patch: Partial<SquareScore>) => {
    if (!score) return
    setScore({ ...score, ...patch }); setSaved(false)
  }
  const patchCanvas = (patch: Partial<Canvas>) => {
    if (!score) return
    setScore({ ...score, cells: { ...score.cells, ...patch } }); setSaved(false)
  }

  const toggleEdge = (kind: 'h' | 'v', key: string) => {
    if (!score || !canEdit || placingId) return
    const list = score.cells[kind]
    const next = list.includes(key) ? list.filter((k) => k !== key) : [...list, key]
    patchCanvas({ [kind]: next } as Partial<Canvas>)
  }

  const setGrid = (patch: { rows?: number; cols?: number }) => {
    if (!score || !canEdit) return
    const rows = Math.max(2, Math.min(16, patch.rows ?? score.cells.rows))
    const cols = Math.max(2, Math.min(48, patch.cols ?? score.cells.cols))
    // On purge les segments / annotations devenus hors-grille.
    const h = score.cells.h.filter((k) => { const [r, c] = k.split(':').map(Number); return r <= rows - 1 && c <= cols - 2 })
    const v = score.cells.v.filter((k) => { const [r, c] = k.split(':').map(Number); return r <= rows - 2 && c <= cols - 1 })
    const labels = score.cells.labels.filter((l) => l.r <= rows - 1 && l.c <= cols - 1)
    patchCanvas({ rows, cols, h, v, labels })
  }

  const addLabel = () => {
    if (!score || !canEdit) return
    const id = `l${Date.now()}`
    patchCanvas({ labels: [...score.cells.labels, { id, r: 0, c: 0, text: 'A' }] })
    setPlacingId(id)
  }
  const updateLabel = (id: string, patch: Partial<Label>) => {
    if (!score) return
    patchCanvas({ labels: score.cells.labels.map((l) => (l.id === id ? { ...l, ...patch } : l)) })
  }
  const removeLabel = (id: string) => {
    if (!score) return
    patchCanvas({ labels: score.cells.labels.filter((l) => l.id !== id) })
    if (placingId === id) setPlacingId(null)
  }
  const placeLabelAt = (r: number, c: number) => {
    if (!placingId) return
    updateLabel(placingId, { r, c }); setPlacingId(null)
  }

  const save = async () => {
    if (!score || !canEdit) return
    setSaving(true); setError('')
    const res = await fetch(`/api/partitions-carrees/${score.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: score.title, tempo: score.tempo, pulsation: score.pulsation,
        measureDescription: score.measureDescription, debit: score.debit,
        keySignature: score.keySignature, timeSignature: score.timeSignature,
        beatsPerSquare: score.beatsPerSquare, cells: score.cells,
        notes: score.notes, songId: score.songId,
      }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Erreur de sauvegarde.'); return }
    const data = await res.json()
    setScore({ ...data, isChef: score.isChef, cells: normalizeCanvas(data.cells, data.beatsPerSquare) })
    setSaved(true)
  }

  if (loading) return <div className="text-gray-500">Chargement...</div>
  if (!score || !canvas) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>

  const beats = Math.max(1, Math.min(8, score.beatsPerSquare || 4))
  const width = M * 2 + (canvas.cols - 1) * STEP
  const height = M * 2 + (canvas.rows - 1) * STEP
  const px = (c: number) => M + c * STEP
  const py = (r: number) => M + r * STEP

  return (
    <div className="print:bg-white">
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-full { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="mb-2 flex items-center gap-2 text-sm text-gray-500 no-print">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">Groupe</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}/partitions-carrees`} className="hover:text-indigo-600">Partitions carrées</Link>
      </div>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partition carrée</h1>
          <p className="text-sm text-gray-500 mt-1 no-print">
            Reliez les points vous-même : cliquez entre deux points voisins pour tracer (ou effacer) un segment. Chaque segment = 1 temps, chaque côté de carré = une mesure.
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <Button type="button" variant="secondary" onClick={() => window.print()}>Imprimer</Button>
          {canEdit && (
            <Button type="button" onClick={save} disabled={saving} className="bg-lime-600 hover:bg-lime-500">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          )}
        </div>
      </div>

      {error && <div className="no-print rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">{error}</div>}
      {saved && <div className="no-print rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 mb-4">Partition enregistrée.</div>}

      <div className="mb-5 no-print">
        <DismissibleHelp storageKey="square-score-editor-help" title="Mode d’emploi rapide">
          <div className="space-y-2">
            <p>Renseignez le <strong>PMD</strong> (Pulsation, Mesure, Débit) dans les réglages, puis <strong>reliez les points</strong> sur la grille pour dessiner vos carrés.</p>
            <p>Chaque trait entre deux points = <strong>1 temps</strong> ; un côté de carré = une <strong>mesure</strong>. Une mesure impaire se trace simplement avec un côté plus court.</p>
            <p>Cliquez <strong>« Annotation »</strong> pour poser une lettre (section I, C, R, P…) ou un accord à l’endroit voulu.</p>
          </div>
        </DismissibleHelp>
      </div>

      <div className="print-full grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5">
        {/* Grille de points */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-3 mb-4">
            <div className="min-w-0">
              {canEdit ? (
                <input value={score.title} onChange={(e) => patchScore({ title: e.target.value })}
                  className="no-print w-full border-0 p-0 text-2xl font-bold text-gray-900 focus:ring-0" />
              ) : (
                <h1 className="text-2xl font-bold text-gray-900">{score.title}</h1>
              )}
              <h1 className="hidden print:block text-2xl font-bold text-gray-900">{score.title}</h1>
              {score.song && <p className="text-sm text-gray-500 mt-1">Morceau : {score.song.title}</p>}
            </div>
            <div className="text-right text-sm text-gray-600 space-y-0.5 flex-shrink-0">
              {(score.pulsation || score.tempo) && <p>P : {score.pulsation || `♩ = ${score.tempo}`}</p>}
              {(score.measureDescription || score.timeSignature) && <p>M : {score.measureDescription || score.timeSignature}</p>}
              {score.debit && <p>D : {score.debit}</p>}
              {score.keySignature && <p>{score.keySignature}</p>}
            </div>
          </div>

          {placingId && (
            <div className="no-print mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Cliquez sur un point de la grille pour y placer l’annotation. <button className="underline" onClick={() => setPlacingId(null)}>Annuler</button>
            </div>
          )}

          <div className="overflow-auto">
            <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="max-w-full" style={{ touchAction: 'manipulation' }}>
              {/* Segments tracés */}
              {canvas.h.map((k) => {
                const [r, c] = k.split(':').map(Number)
                return <line key={`h${k}`} x1={px(c)} y1={py(r)} x2={px(c + 1)} y2={py(r)} stroke="#111827" strokeWidth={3} strokeLinecap="round" />
              })}
              {canvas.v.map((k) => {
                const [r, c] = k.split(':').map(Number)
                return <line key={`v${k}`} x1={px(c)} y1={py(r)} x2={px(c)} y2={py(r + 1)} stroke="#111827" strokeWidth={3} strokeLinecap="round" />
              })}

              {/* Points (trame). Plus gros tous les `beats` (repères de mesure) sur la ligne du bas. */}
              {Array.from({ length: canvas.rows }).map((_, r) =>
                Array.from({ length: canvas.cols }).map((_, c) => {
                  const big = r === canvas.rows - 1 && c % beats === 0
                  return <circle key={`d${r}:${c}`} cx={px(c)} cy={py(r)} r={big ? 3.4 : 1.6} fill={big ? '#111827' : '#94a3b8'} />
                })
              )}

              {/* Zones cliquables : segments horizontaux puis verticaux (édition only) */}
              {canEdit && !placingId && Array.from({ length: canvas.rows }).map((_, r) =>
                Array.from({ length: canvas.cols - 1 }).map((_, c) => {
                  const key = `${r}:${c}`
                  return <rect key={`hh${key}`} x={px(c) + 5} y={py(r) - 8} width={STEP - 10} height={16} fill="transparent" className="cursor-pointer" onClick={() => toggleEdge('h', key)} />
                })
              )}
              {canEdit && !placingId && Array.from({ length: canvas.rows - 1 }).map((_, r) =>
                Array.from({ length: canvas.cols }).map((_, c) => {
                  const key = `${r}:${c}`
                  return <rect key={`vv${key}`} x={px(c) - 8} y={py(r) + 5} width={16} height={STEP - 10} fill="transparent" className="cursor-pointer" onClick={() => toggleEdge('v', key)} />
                })
              )}

              {/* Cibles de placement d'annotation (intersections) */}
              {placingId && Array.from({ length: canvas.rows }).map((_, r) =>
                Array.from({ length: canvas.cols }).map((_, c) => (
                  <circle key={`p${r}:${c}`} cx={px(c)} cy={py(r)} r={9} fill="rgba(132,204,22,0.25)" className="cursor-pointer" onClick={() => placeLabelAt(r, c)} />
                ))
              )}

              {/* Annotations */}
              {canvas.labels.map((l) => (
                <text key={l.id} x={px(l.c) + 5} y={py(l.r) - 5} fontSize={14} fontWeight={800} fill="#4d7c0f">{l.text}</text>
              ))}
            </svg>
          </div>

          {score.notes && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">{score.notes}</div>
          )}
        </div>

        {/* Réglages + annotations */}
        <aside className="no-print space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Réglages</h2>
            <div className="mb-3 rounded-lg border border-lime-200 bg-lime-50 p-3 text-xs text-lime-900">
              <strong>PMD</strong> : Pulsation, Mesure, Débit — le calibrage du temps avant le relevé. Les gros points marquent le 1ᵉʳ temps de chaque mesure.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="form-label">Pulsation</span>
                <input disabled={!canEdit} value={score.pulsation ?? ''} onChange={(e) => patchScore({ pulsation: e.target.value })} className="form-input" placeholder="noire = 90" /></label>
              <label className="block"><span className="form-label">Mesure</span>
                <input disabled={!canEdit} value={score.measureDescription ?? ''} onChange={(e) => patchScore({ measureDescription: e.target.value })} className="form-input" placeholder="4 temps" /></label>
              <label className="block"><span className="form-label">Débit</span>
                <select disabled={!canEdit} value={score.debit ?? ''} onChange={(e) => patchScore({ debit: e.target.value })} className="form-input">
                  <option value="">—</option><option value="binaire">binaire</option><option value="ternaire">ternaire</option><option value="mixte">mixte</option>
                </select></label>
              <label className="block"><span className="form-label">Tempo</span>
                <input disabled={!canEdit} value={score.tempo ?? ''} onChange={(e) => patchScore({ tempo: e.target.value })} className="form-input" /></label>
              <label className="block"><span className="form-label">Tonalité</span>
                <input disabled={!canEdit} value={score.keySignature ?? ''} onChange={(e) => patchScore({ keySignature: e.target.value })} className="form-input" /></label>
              <label className="block"><span className="form-label">Signature</span>
                <select disabled={!canEdit} value={score.timeSignature} onChange={(e) => patchScore({ timeSignature: e.target.value })} className="form-input">
                  {TIME_SIGS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select></label>
              <label className="block"><span className="form-label">Temps / mesure</span>
                <input disabled={!canEdit} type="number" min={1} max={8} value={score.beatsPerSquare} onChange={(e) => patchScore({ beatsPerSquare: Math.max(1, Math.min(8, Number(e.target.value) || 4)) })} className="form-input" /></label>
              <div />
              <label className="block"><span className="form-label">Lignes de points</span>
                <input disabled={!canEdit} type="number" min={2} max={16} value={canvas.rows} onChange={(e) => setGrid({ rows: Number(e.target.value) })} className="form-input" /></label>
              <label className="block"><span className="form-label">Colonnes de points</span>
                <input disabled={!canEdit} type="number" min={2} max={48} value={canvas.cols} onChange={(e) => setGrid({ cols: Number(e.target.value) })} className="form-input" /></label>
            </div>
            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
              Abréviations : I intro, C couplet, PR pré-refrain, R refrain, P pont, It interlude, S solo, O outro.
            </div>
          </div>

          {/* Annotations (contenu) */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Annotations</h2>
              {canEdit && <button type="button" onClick={addLabel} className="text-xs font-semibold text-lime-700 hover:text-lime-600">+ Annotation</button>}
            </div>
            {canvas.labels.length === 0 ? (
              <p className="text-xs text-gray-400">Aucune annotation. Ajoutez sections, accords ou consignes et placez-les sur la grille.</p>
            ) : (
              <div className="space-y-2">
                {canvas.labels.map((l) => (
                  <div key={l.id} className="flex items-center gap-2">
                    <input disabled={!canEdit} value={l.text} onChange={(e) => updateLabel(l.id, { text: e.target.value })} className="form-input flex-1" placeholder="Am, R, Pont…" />
                    {canEdit && <button type="button" onClick={() => setPlacingId(l.id)} className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${placingId === l.id ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-lime-400'}`} title="Placer sur la grille">📍</button>}
                    {canEdit && <button type="button" onClick={() => removeLabel(l.id)} className="text-gray-300 hover:text-red-500" aria-label="Supprimer">✕</button>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <label className="block"><span className="form-label">Notes globales</span>
              <textarea disabled={!canEdit} value={score.notes ?? ''} onChange={(e) => patchScore({ notes: e.target.value })} className="form-input min-h-[100px]" placeholder="Structure, remarques, interprétation..." /></label>
          </div>
        </aside>
      </div>
    </div>
  )
}

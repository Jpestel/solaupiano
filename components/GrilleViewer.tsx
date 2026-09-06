'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { beatsPerBar, normalizeCells, type BarData } from '@/lib/grille'
import { GrilleGrid } from './GrilleGrid'
import { GrilleCondensed } from './GrilleCondensed'

interface ChartData {
  id: number
  title: string
  tempo?: string | null
  keySignature?: string | null
  timeSignature: string
  barsPerRow: number
  totalBars: number
  cells: unknown
  song?: { id: number; title: string } | null
}

const MIN_SIZE = 9
const MAX_SIZE = 22
const DEFAULT_SIZE = 14

/**
 * Affiche une grille d'accords en plein écran, par-dessus la page en cours.
 * Utilisée depuis le Répertoire et depuis les setlists (concerts) pour consulter
 * une grille SANS quitter le module où l'on se trouve.
 */
export function GrilleViewer({
  groupId, chartId, onClose, editHref,
}: {
  groupId: string | number
  chartId: number
  onClose: () => void
  /** Si fourni, un bouton « Modifier » mène à l'éditeur (choix explicite de l'utilisateur). */
  editHref?: string
}) {
  const [chart, setChart] = useState<ChartData | null>(null)
  const [cells, setCells] = useState<BarData[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [fontSize, setFontSize] = useState(DEFAULT_SIZE)
  // Affichage seulement : aucune donnée n'est modifiée, le retour est immédiat.
  const [condensed, setCondensed] = useState(false)

  // Taille de texte mémorisée par grille (même clé que l'éditeur)
  useEffect(() => {
    const saved = Number(window.localStorage.getItem(`solaupiano:grid-text-size:${chartId}`))
    if (Number.isFinite(saved) && saved >= MIN_SIZE && saved <= MAX_SIZE) setFontSize(saved)
  }, [chartId])

  const changeSize = useCallback((delta: number) => {
    setFontSize((v) => {
      const next = Math.max(MIN_SIZE, Math.min(MAX_SIZE, v + delta))
      window.localStorage.setItem(`solaupiano:grid-text-size:${chartId}`, String(next))
      return next
    })
  }, [chartId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/grilles/${chartId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Grille indisponible.'))))
      .then((data: ChartData) => {
        if (cancelled) return
        const bpb = beatsPerBar(data.timeSignature)
        setChart(data)
        setCells(normalizeCells(data.cells, data.totalBars, bpb))
        setLoading(false)
      })
      .catch(() => { if (!cancelled) { setError('Impossible de charger la grille.'); setLoading(false) } })
    return () => { cancelled = true }
  }, [chartId])

  // Échap ferme la visionneuse
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const bpb = chart ? beatsPerBar(chart.timeSignature) : 4

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white">
      {/* Barre supérieure */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-gray-900">{chart?.title || 'Grille'}</p>
          {chart && (
            <p className="truncate text-[11px] text-gray-500">
              {chart.song ? `${chart.song.title} · ` : ''}
              {chart.tempo ? `♩ ${chart.tempo} · ` : ''}
              {chart.keySignature ? `${chart.keySignature} · ` : ''}
              {chart.timeSignature}
            </p>
          )}
        </div>

        <button
          type="button" onClick={() => changeSize(-1)} disabled={fontSize <= MIN_SIZE}
          title="Réduire le texte"
          className="h-9 w-9 flex-shrink-0 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        >A</button>
        <button
          type="button" onClick={() => changeSize(1)} disabled={fontSize >= MAX_SIZE}
          title="Agrandir le texte"
          className="h-9 w-9 flex-shrink-0 rounded-lg border border-gray-200 text-base font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >A</button>

        <button
          type="button" onClick={() => setCondensed((v) => !v)}
          title={condensed ? 'Revenir à la grille complète' : 'Replier les sections identiques'}
          className={`hidden h-9 flex-shrink-0 items-center rounded-lg border px-3 text-xs font-semibold sm:flex ${
            condensed
              ? 'border-indigo-300 bg-indigo-600 text-white hover:bg-indigo-700'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {condensed ? '↩ Grille complète' : '🗜 Condenser'}
        </button>

        {editHref && (
          <Link
            href={editHref}
            className="hidden h-9 flex-shrink-0 items-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 sm:flex"
          >
            ✏️ Modifier
          </Link>
        )}

        <button
          type="button" onClick={onClose} title="Fermer (Échap)"
          className="h-9 flex-shrink-0 rounded-lg border border-gray-300 bg-gray-100 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
        >✕</button>
      </div>

      {/* Grille */}
      <div className="flex-1 overflow-auto px-2 py-3 sm:px-4">
        {loading && <p className="py-10 text-center text-sm text-gray-400">Chargement de la grille…</p>}
        {error && !loading && <p className="py-10 text-center text-sm text-red-600">{error}</p>}
        {chart && !loading && !error && (
          condensed ? (
            <GrilleCondensed
              cells={cells} bpr={chart.barsPerRow} bpb={bpb} fontSize={fontSize} barHeight={96}
            />
          ) : (
            <GrilleGrid
              cells={cells} bpr={chart.barsPerRow} bpb={bpb} fontSize={fontSize} barHeight={96}
            />
          )
        )}
      </div>
    </div>
  )
}

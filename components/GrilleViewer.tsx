'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
  groupId, chartId, onClose, editHref, spaceScroll = false,
}: {
  groupId: string | number
  chartId: number
  onClose: () => void
  /** Si fourni, un bouton « Modifier » mène à l'éditeur (choix explicite de l'utilisateur). */
  editHref?: string
  /**
   * Mode concert : la barre d'espace fait défiler la grille d'un écran vers le bas
   * (Maj + Espace pour remonter). Pensé pour jouer sans lâcher son instrument,
   * y compris avec une pédale tourne-pages qui envoie la touche Espace.
   */
  spaceScroll?: boolean
}) {
  const [chart, setChart] = useState<ChartData | null>(null)
  const [cells, setCells] = useState<BarData[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [fontSize, setFontSize] = useState(DEFAULT_SIZE)
  // Affichage seulement : aucune donnée n'est modifiée, le retour est immédiat.
  const [condensed, setCondensed] = useState(false)
  // Conteneur défilant de la grille (la fenêtre, elle, ne défile pas ici).
  const scrollRef = useRef<HTMLDivElement>(null)

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

  // Échap ferme la visionneuse ; en concert, Espace fait défiler la grille.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (!spaceScroll || e.code !== 'Space') return

      // Ne jamais voler la barre d'espace à une saisie en cours.
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return
      // Un appui maintenu ne doit pas faire défiler en continu : un appui = un écran.
      if (e.repeat) return

      const box = scrollRef.current
      if (!box) return
      e.preventDefault()
      // On garde un peu de recouvrement pour ne pas perdre la ligne en cours.
      const step = Math.max(120, box.clientHeight * 0.85)
      // Le défilement animé dépend de la boucle d'animation du navigateur : si
      // l'appareil est réglé sur « réduire les animations », on saute directement,
      // pour qu'un appui déclenche toujours quelque chose en plein morceau.
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      box.scrollBy({ top: e.shiftKey ? -step : step, behavior: reduceMotion ? 'auto' : 'smooth' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, spaceScroll])

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

        {spaceScroll && (
          <span className="hidden flex-shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500 md:flex">
            <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-sans text-[10px]">Espace</kbd>
            défiler
          </span>
        )}

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
      <div ref={scrollRef} className="flex-1 overflow-auto px-2 py-3 sm:px-4">
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

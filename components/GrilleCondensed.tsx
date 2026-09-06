'use client'

import { useMemo } from 'react'
import type { BarData } from '@/lib/grille'
import { condenseGrille, DEFAULT_MIN_SECTION } from '@/lib/grille-condense'
import { GrilleGrid } from './GrilleGrid'

/**
 * Vue condensée d'une grille : les sections déjà écrites plus haut deviennent
 * des renvois numérotés. Lecture seule et sans effet sur les données —
 * revenir à la grille complète suffit à tout retrouver.
 */
export function GrilleCondensed({
  cells, bpr, bpb, fontSize, barHeight = 72, minSectionLen = DEFAULT_MIN_SECTION,
}: {
  cells: BarData[]
  bpr: number
  bpb: number
  fontSize: number
  barHeight?: number
  minSectionLen?: number
}) {
  const result = useMemo(() => condenseGrille(cells, { minSectionLen }), [cells, minSectionLen])
  const { segments, form, writtenBars, totalBars } = result
  const saved = totalBars - writtenBars
  const percent = totalBars ? Math.round((saved / totalBars) * 100) : 0

  return (
    <div className="space-y-3">
      {/* Bandeau : gain + forme du morceau */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-2">
        {saved > 0 ? (
          <p className="text-sm text-indigo-900">
            <span className="font-semibold">{writtenBars} mesures à lire</span> au lieu de {totalBars}
            {' '}({saved} mesures repliées, {percent} % de moins).
          </p>
        ) : (
          <p className="text-sm text-indigo-900">
            Aucune section n'est reprise à l'identique : la grille condensée est identique à la grille complète.
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className="text-[11px] uppercase tracking-wide text-indigo-500 mr-1">Forme</span>
          {form.map((step, i) => (
            <span
              key={i}
              className="rounded bg-white px-1.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200"
            >
              {step}
            </span>
          ))}
        </div>
      </div>

      {segments.map((seg) => {
        if (seg.kind === 'empty') {
          return (
            <div
              key={seg.start}
              className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-400"
            >
              {seg.len} mesures vides — mesures {seg.start + 1} à {seg.start + seg.len}
            </div>
          )
        }

        if (seg.kind === 'repeat') {
          return (
            <div
              key={seg.start}
              className="rounded-lg border border-indigo-200 px-3 py-2.5"
              style={seg.color ? { backgroundColor: seg.color } : { backgroundColor: '#eef2ff' }}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-lg leading-none text-indigo-600">↺</span>
                <span className="text-sm font-semibold text-gray-900">
                  Reprise de {seg.labels.length > 1 ? 'sections' : 'la section'} {seg.labels.join(' + ') || '?'}
                </span>
                <span className="text-xs text-gray-600">
                  mesures {seg.refStart + 1} à {seg.refStart + seg.len}
                </span>
                <span className="ml-auto text-xs font-medium text-gray-500">
                  ici : mesures {seg.start + 1} à {seg.start + seg.len}
                </span>
              </div>
              {/* Les indications propres à ce passage restent visibles :
                  replier la section ne doit rien faire disparaître. */}
              {seg.notes.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {seg.notes.map((note, i) => (
                    <span
                      key={i}
                      className="rounded border border-gray-300 bg-white/80 px-1.5 py-0.5 text-[11px] text-gray-700"
                    >
                      <span className="text-gray-400">m.{note.bar + 1}</span> {note.text}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        }

        return (
          <div key={seg.start}>
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded bg-gray-900 px-1.5 text-xs font-bold text-white">
                {seg.label}
              </span>
              <span className="text-xs text-gray-500">
                mesures {seg.start + 1} à {seg.start + seg.len}
              </span>
            </div>
            <div className="overflow-x-auto">
              <GrilleGrid
                cells={cells.slice(seg.start, seg.start + seg.len)}
                bpr={bpr}
                bpb={bpb}
                fontSize={fontSize}
                barHeight={barHeight}
                numberOffset={seg.start}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

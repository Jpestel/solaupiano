'use client'

import type { BarData } from '@/lib/grille'

/* ─── Rendu d'un temps (accord(s)) ─── */
export function BeatContent({ content, fontSize }: { content: string; fontSize: number }) {
  const tokens = content.trim().split(/\s+/).filter(Boolean)
  if (!tokens.length) return <span className="text-gray-200 text-[10px] select-none">·</span>
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-0.5 w-full">
      {tokens.map((token, i) => (
        <span key={i} className="text-gray-900 font-bold leading-none" style={{ fontSize }}>{token}</span>
      ))}
    </div>
  )
}

/* ─── Rendu d'un marqueur de barre de mesure (gauche ou droite) ─── */
export function MarkerContent({ value, side }: { value: string; side: 'left' | 'right' }) {
  if (!value) return null
  const isRepeat = value === '||:' || value === ':||' || value === ':|:'
  return (
    <span
      className={`text-indigo-700 font-black leading-none select-none ${
        isRepeat ? 'text-sm' : 'text-[9px] font-semibold'
      } ${side === 'right' ? 'text-right' : 'text-left'}`}
      style={isRepeat ? { fontFamily: '"Courier New", Courier, monospace', letterSpacing: '-2px' } : undefined}
    >
      {value}
    </span>
  )
}

/**
 * Grille d'accords en lecture seule (visionneuse, plein écran).
 * L'éditeur garde son propre rendu interactif ; ici on ne fait qu'afficher.
 */
export function GrilleGrid({
  cells, bpr, bpb, fontSize, barHeight = 72,
}: {
  cells: BarData[]
  bpr: number
  bpb: number
  fontSize: number
  barHeight?: number
}) {
  const rows: number[][] = []
  for (let i = 0; i < cells.length; i += bpr) {
    rows.push(Array.from({ length: bpr }, (_, k) => i + k))
  }
  const headerH = 18
  const beatsH = Math.max(24, barHeight - headerH)

  return (
    <table className="min-w-[720px] border-collapse sm:w-full sm:min-w-0">
      <tbody>
        {rows.map((row, rowIdx) => (
          <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/80'}>
            {row.map((barIdx) => {
              if (barIdx >= cells.length) return (
                <td key={barIdx} className="border border-gray-200 bg-gray-50/30"
                  style={{ width: `${(100 / bpr).toFixed(1)}%`, height: `${barHeight}px` }} />
              )
              const bar = cells[barIdx]
              return (
                <td
                  key={barIdx}
                  className="border border-gray-200 relative"
                  style={{
                    width: `${(100 / bpr).toFixed(1)}%`, height: `${barHeight}px`,
                    padding: 0, verticalAlign: 'top',
                    ...(bar.c ? { backgroundColor: bar.c } : {}),
                  }}
                >
                  {/* Bandelette : numéro + marqueurs */}
                  <div className="flex items-center border-b border-gray-100 px-1.5 gap-1" style={{ height: `${headerH}px` }}>
                    <span className="text-[9px] text-gray-300 font-medium leading-none flex-shrink-0 select-none">
                      {barIdx + 1}
                    </span>
                    <div className="flex items-center flex-shrink-0 leading-none" style={{ minWidth: '20px', height: '14px' }}>
                      <MarkerContent value={bar.l} side="left" />
                    </div>
                    <div className="flex-1" />
                    <div className="flex items-center justify-end flex-shrink-0 leading-none" style={{ minWidth: '20px', height: '14px' }}>
                      <MarkerContent value={bar.r} side="right" />
                    </div>
                  </div>

                  {/* Zones de temps */}
                  <div className="flex" style={{ height: `${beatsH}px` }}>
                    {Array.from({ length: bpb }).map((_, beatIdx) => (
                      <div
                        key={beatIdx}
                        className={`flex-1 flex items-center justify-center relative min-w-0 ${
                          beatIdx < bpb - 1 ? 'border-r border-gray-100' : ''
                        }`}
                      >
                        <BeatContent content={bar.b[beatIdx] || ''} fontSize={fontSize} />
                      </div>
                    ))}
                  </div>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

'use client'

import { beatTexts, hasBeatTexts, type BarData, type BeatTextField } from '@/lib/grille'

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

const REPEAT_SYMBOLS = ['||:', ':|:', ':||']

/**
 * Un marqueur peut porter À LA FOIS un signe de reprise et du texte :
 * « ||: Intro » doit donner la barre dessinée ET l'annotation « Intro ».
 * Sans cette séparation, la valeur entière cessait d'être reconnue comme une
 * reprise et retombait en petit texte — la barre disparaissait.
 */
export function splitMarker(value: string): { repeat: string; text: string } {
  const v = (value || '').trim()
  for (const symbol of REPEAT_SYMBOLS) {
    if (v.startsWith(symbol)) return { repeat: symbol, text: v.slice(symbol.length).trim() }
    if (v.endsWith(symbol)) return { repeat: symbol, text: v.slice(0, -symbol.length).trim() }
  }
  return { repeat: '', text: v }
}

export const isRepeatMarker = (value: string) => splitMarker(value).repeat !== ''

/** Pose ou retire le signe de reprise, sans toucher au texte déjà écrit. */
export function toggleMarkerRepeat(current: string, symbol: string): string {
  const { repeat, text } = splitMarker(current)
  return [repeat === symbol ? '' : symbol, text].filter(Boolean).join(' ')
}

/** Remplace le texte, sans toucher au signe de reprise déjà posé. */
export function setMarkerText(current: string, text: string): string {
  const { repeat } = splitMarker(current)
  return [repeat, text.trim()].filter(Boolean).join(' ')
}

/**
 * Les marqueurs suivent la taille de texte choisie (boutons A/A).
 * Auparavant ils étaient figés : agrandir le texte grossissait les accords
 * mais pas les annotations, qui devenaient de plus en plus discrètes.
 */
export const markerFontSize = (fontSize: number) => Math.max(11, Math.round(fontSize * 0.8))

/** Hauteur de la bandelette du haut, pour que l'annotation y tienne. */
export const headerHeight = (fontSize: number) => Math.max(20, Math.round(fontSize * 1.55))

const REPEAT_COLOR = '#1e1b4b'

/* Quadrillage : trait fin entre les temps, trait epais entre les mesures.
   L'oeil retrouve ainsi la mesure d'un coup, sans compter les temps. */
export const BAR_BORDER = 'border-2 border-gray-400'
export const BEAT_BORDER = 'border-r border-gray-300'

/** Largeur occupée par une barre de reprise : le contenu de la mesure doit
 *  s'écarter d'autant de ce bord, sinon la barre passe par-dessus l'accord
 *  ou le numéro de mesure. */
export const REPEAT_INSET = 18

export function repeatInsets(bar: { l: string; r: string }) {
  return {
    paddingLeft: isRepeatMarker(bar.l) ? REPEAT_INSET : undefined,
    paddingRight: isRepeatMarker(bar.r) ? REPEAT_INSET : undefined,
  }
}

/**
 * Barre de reprise dessinée sur le bord de la mesure, comme sur une partition
 * (double barre + les deux points), plutôt qu'un « :|| » écrit en petit dans la
 * bandelette : un musicien la reconnaît d'un coup d'œil, sans avoir à la lire.
 */
export function RepeatBarline({ side }: { side: 'left' | 'right' }) {
  const at = (offset: number | string) => (side === 'left' ? { left: offset } : { right: offset })
  return (
    <div className="pointer-events-none absolute inset-y-0 select-none" style={{ ...at(0), width: '16px' }}>
      <div className="absolute inset-y-0" style={{ ...at(0), width: '4px', background: REPEAT_COLOR }} />
      <div className="absolute inset-y-0" style={{ ...at('6px'), width: '2px', background: REPEAT_COLOR }} />
      <div
        className="absolute top-1/2 flex -translate-y-1/2 flex-col gap-[6px]"
        style={at('11px')}
      >
        <span className="block h-[5px] w-[5px] rounded-full" style={{ background: REPEAT_COLOR }} />
        <span className="block h-[5px] w-[5px] rounded-full" style={{ background: REPEAT_COLOR }} />
      </div>
    </div>
  )
}

/* ─── Annotation portée par une mesure (« X 3 », « Rif Orgue », Coda…) ───
   Les signes de reprise, eux, sont dessinés par RepeatBarline. */
export function MarkerContent({
  value, side, fontSize = 14,
}: {
  value: string
  side: 'left' | 'right'
  fontSize?: number
}) {
  const { text } = splitMarker(value)
  if (!text) return null
  return (
    <span
      className={`select-none truncate font-extrabold leading-none text-indigo-900 ${
        side === 'right' ? 'text-right' : 'text-left'
      }`}
      style={{ fontSize: markerFontSize(fontSize) }}
    >
      {text}
    </span>
  )
}

/** Hauteur d'une bande de texte de temps. */
export const beatTextHeight = (fontSize: number) => markerFontSize(fontSize) + 6

/**
 * Texte libre aligné sur chaque temps, au-dessus de l'accord (« Solo »,
 * « cresc. ») ou en dessous (doigté, parole, nuance). Une bande n'apparaît que
 * sur les lignes qui en portent, pour ne rien changer aux grilles qui ne s'en
 * servent pas.
 */
export function BeatTextStrip({
  bar, bpb, fontSize, field,
}: {
  bar: BarData
  bpb: number
  fontSize: number
  field: BeatTextField
}) {
  const texts = beatTexts(bar, bpb, field)
  return (
    <div
      className={`flex ${field === 'n' ? 'border-b' : 'border-t'} border-gray-100`}
      style={{ height: `${beatTextHeight(fontSize)}px`, ...repeatInsets(bar) }}
    >
      {texts.map((text, i) => (
        <div
          key={i}
          className={`flex min-w-0 flex-1 items-center justify-center px-0.5 ${
            i < bpb - 1 ? BEAT_BORDER : ''
          }`}
        >
          <span
            className={`truncate font-bold leading-none ${
              field === 'n' ? 'text-indigo-800' : 'text-slate-600'
            }`}
            style={{ fontSize: markerFontSize(fontSize) }}
          >
            {text}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * Grille d'accords en lecture seule (visionneuse, plein écran).
 * L'éditeur garde son propre rendu interactif ; ici on ne fait qu'afficher.
 */
export function GrilleGrid({
  cells, bpr, bpb, fontSize, barHeight = 72, numberOffset = 0,
}: {
  cells: BarData[]
  bpr: number
  bpb: number
  fontSize: number
  barHeight?: number
  /** Décalage de numérotation : la vue condensée affiche des extraits qui
   *  doivent garder le numéro de mesure de la grille complète. */
  numberOffset?: number
}) {
  const rows: number[][] = []
  for (let i = 0; i < cells.length; i += bpr) {
    rows.push(Array.from({ length: bpr }, (_, k) => i + k))
  }
  const headerH = headerHeight(fontSize)

  return (
    <table className="min-w-[720px] border-collapse sm:w-full sm:min-w-0">
      <tbody>
        {rows.map((row, rowIdx) => (
          <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/80'}>
            {row.map((barIdx) => {
              // Toute la ligne réserve une bande dès qu'une mesure en porte une,
              // sinon les zones de temps ne seraient plus alignées entre elles.
              const rowAbove = row.some((k) => k < cells.length && hasBeatTexts(cells[k], 'n'))
              const rowBelow = row.some((k) => k < cells.length && hasBeatTexts(cells[k], 's'))
              const stripsH = (rowAbove ? beatTextHeight(fontSize) : 0) + (rowBelow ? beatTextHeight(fontSize) : 0)
              if (barIdx >= cells.length) return (
                <td key={barIdx} className={`${BAR_BORDER} bg-gray-50/30`}
                  style={{ width: `${(100 / bpr).toFixed(1)}%`, height: `${barHeight}px` }} />
              )
              const bar = cells[barIdx]
              return (
                <td
                  key={barIdx}
                  className={`relative ${BAR_BORDER}`}
                  style={{
                    width: `${(100 / bpr).toFixed(1)}%`, height: `${barHeight}px`,
                    padding: 0, verticalAlign: 'top',
                    ...(bar.c ? { backgroundColor: bar.c } : {}),
                  }}
                >
                  {/* Barres de reprise, dessinées sur les bords de la mesure */}
                  {isRepeatMarker(bar.l) && <RepeatBarline side="left" />}
                  {isRepeatMarker(bar.r) && <RepeatBarline side="right" />}

                  {/* Bandelette : numéro + annotations */}
                  <div
                    className="flex items-center border-b border-gray-100 px-1.5 gap-1.5"
                    style={{ height: `${headerH}px`, ...repeatInsets(bar) }}
                  >
                    <span className="text-[9px] text-gray-300 font-medium leading-none flex-shrink-0 select-none">
                      {numberOffset + barIdx + 1}
                    </span>
                    <div className="flex min-w-0 items-center leading-none">
                      <MarkerContent value={bar.l} side="left" fontSize={fontSize} />
                    </div>
                    <div className="flex-1" />
                    <div className="flex min-w-0 items-center justify-end leading-none">
                      <MarkerContent value={bar.r} side="right" fontSize={fontSize} />
                    </div>
                  </div>

                  {rowAbove && <BeatTextStrip bar={bar} bpb={bpb} fontSize={fontSize} field="n" />}

                  {/* Zones de temps */}
                  <div
                    className="flex"
                    style={{ height: `${Math.max(24, barHeight - headerH - stripsH)}px`, ...repeatInsets(bar) }}
                  >
                    {Array.from({ length: bpb }).map((_, beatIdx) => (
                      <div
                        key={beatIdx}
                        className={`flex-1 flex items-center justify-center relative min-w-0 ${
                          beatIdx < bpb - 1 ? BEAT_BORDER : ''
                        }`}
                      >
                        <BeatContent content={bar.b[beatIdx] || ''} fontSize={fontSize} />
                      </div>
                    ))}
                  </div>

                  {rowBelow && <BeatTextStrip bar={bar} bpb={bpb} fontSize={fontSize} field="s" />}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

'use client'

import { segmentLine, stripChords, lineChords, DisplayMode } from '@/lib/lyrics'

interface Props {
  line: string
  mode: DisplayMode
  /** Classes appliquées à la ligne (taille de police, couleur, graisse du texte). */
  className?: string
  /** Couleur des accords (style inline pour contourner le remap de thème). */
  chordColor?: string
  /** Styles inline additionnels (ex : taille de police en px pour le prompteur). */
  style?: React.CSSProperties
}

/**
 * Rend une ligne de paroles selon le mode choisi :
 *  - lyrics : texte seul (accords retirés)
 *  - chords : accords seuls (progression)
 *  - both   : accords positionnés au-dessus des syllabes
 */
export function ChordLine({ line, mode, className = '', chordColor = '#6d28d9', style }: Props) {
  // ── Paroles seules ──
  if (mode === 'lyrics') {
    const text = stripChords(line)
    return <p className={className} style={style}>{text || ' '}</p>
  }

  // ── Accords seuls (progression) ──
  if (mode === 'chords') {
    const chords = lineChords(line)
    if (chords.length === 0) return <p className={className} style={style}>{' '}</p>
    return (
      <p className={className} style={style}>
        {chords.map((c, i) => (
          <span key={i} className="font-bold mr-4" style={{ color: chordColor }}>
            {c}
          </span>
        ))}
      </p>
    )
  }

  // ── Les deux ──
  const segs = segmentLine(line)
  const hasChord = segs.some((s) => s.chord)
  if (!hasChord) {
    // Ligne sans accord : pas de rangée d'accords vide au-dessus
    return <p className={className} style={style}>{stripChords(line) || ' '}</p>
  }

  return (
    <p className={className} style={{ lineHeight: 1.1, ...style }}>
      {segs.map((seg, i) => (
        <span key={i} style={{ display: 'inline-block', verticalAlign: 'bottom' }}>
          <span
            style={{
              display: 'block',
              fontSize: '0.7em',
              fontWeight: 700,
              lineHeight: 1.2,
              color: chordColor,
              whiteSpace: 'pre',
            }}
          >
            {seg.chord || ' '}
          </span>
          <span style={{ whiteSpace: 'pre-wrap' }}>{seg.text || ' '}</span>
        </span>
      ))}
    </p>
  )
}

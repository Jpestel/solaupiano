'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

/* ─── Types ─── */
interface Song { id: number; title: string; artist?: string }
interface ChartData {
  id: number; groupId: number; title: string; tempo?: string | null
  keySignature?: string | null; timeSignature: string
  barsPerRow: number; totalBars: number; cells: unknown
  sons?: string | null; song?: { id: number; title: string } | null
}

/**
 * Structure d'une mesure :
 *   l = symbole de début de mesure (||:, 𝄋…)
 *   b = tableau de temps (un accord/contenu par temps)
 *   r = symbole de fin de mesure (:||, 𝄌, Fine…)
 */
type BarData = { l: string; b: string[]; r: string }

/** Cible active dans la palette */
type ActiveTarget =
  | { bar: number; type: 'beat'; beat: number }
  | { bar: number; type: 'left' }
  | { bar: number; type: 'right' }

/* ─── Helpers ─── */
function beatsPerBar(timeSig: string): number {
  const map: Record<string, number> = {
    '4/4': 4, '3/4': 3, '6/8': 2, '2/4': 2, '5/4': 5, '12/8': 4, '2/2': 2,
  }
  return map[timeSig] ?? 4
}

/** Convertit n'importe quel format de données (string[], string[][], BarData[]) → BarData[] */
function normalizeCells(raw: unknown, totalBars: number, bpb: number): BarData[] {
  const src = Array.isArray(raw) ? raw : []
  const result: BarData[] = []

  for (let i = 0; i < totalBars; i++) {
    const item = src[i]

    if (item && typeof item === 'object' && !Array.isArray(item) && 'b' in item) {
      // Format BarData { l, b, r }
      const bar = item as any
      const beats = (Array.isArray(bar.b) ? bar.b : []).map((v: any) => typeof v === 'string' ? v : '')
      const paddedBeats = beats.length < bpb
        ? [...beats, ...Array(bpb - beats.length).fill('')]
        : beats.slice(0, bpb)
      result.push({ l: bar.l || '', b: paddedBeats, r: bar.r || '' })

    } else if (Array.isArray(item)) {
      // Ancien format string[]
      const beats = item.map((v: any) => typeof v === 'string' ? v : '')
      const paddedBeats = beats.length < bpb
        ? [...beats, ...Array(bpb - beats.length).fill('')]
        : beats.slice(0, bpb)
      result.push({ l: '', b: paddedBeats, r: '' })

    } else if (typeof item === 'string') {
      // Très ancien format (string par mesure)
      const beats = Array(bpb).fill('')
      beats[0] = item
      result.push({ l: '', b: beats, r: '' })

    } else {
      result.push({ l: '', b: Array(bpb).fill(''), r: '' })
    }
  }
  return result
}

/* ─── Palette data ─── */
const ROOT_NOTES = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B']
const QUALITIES = [
  { label: 'M', val: '', title: 'Majeur (rien)' },
  { label: 'm', val: 'm', title: 'Mineur' },
  { label: '7', val: '7', title: 'Dominante 7' },
  { label: 'M7', val: 'M7', title: 'Majeur 7' },
  { label: 'm7', val: 'm7', title: 'Mineur 7' },
  { label: 'mM7', val: 'mM7', title: 'Mineur maj7' },
  { label: 'dim', val: 'dim', title: 'Diminué' },
  { label: '°7', val: '°7', title: 'Dim 7' },
  { label: 'aug', val: 'aug', title: 'Augmenté' },
  { label: '+', val: '+', title: 'Augmenté' },
  { label: 'sus2', val: 'sus2', title: 'Sus2' },
  { label: 'sus4', val: 'sus4', title: 'Sus4' },
  { label: '6', val: '6', title: 'Sixte' },
  { label: 'm6', val: 'm6', title: 'Mineur sixte' },
  { label: '9', val: '9', title: '9e' },
  { label: 'M9', val: 'M9', title: 'Maj 9' },
  { label: 'm9', val: 'm9', title: 'Mineur 9' },
  { label: 'add9', val: 'add9', title: 'Add 9' },
  { label: '11', val: '11', title: '11e' },
  { label: '13', val: '13', title: '13e' },
  { label: '7b5', val: '7b5', title: 'Dom 7b5' },
  { label: '7#5', val: '7#5', title: 'Dom 7#5' },
  { label: '7b9', val: '7b9', title: 'Dom 7b9' },
  { label: '7#9', val: '7#9', title: 'Dom 7#9' },
]
const BEAT_SYMBOLS = [
  { label: '%', val: '%', title: 'Simile (répéter la mesure)' },
  { label: '/', val: '/', title: 'Temps vide' },
  { label: '-', val: '-', title: 'Tenir / prolonger' },
]
const LEFT_MARKERS = [
  { label: '||:', val: '||:', title: 'Début de répétition' },
  { label: 'Segno', val: 'Segno', title: 'Segno (renvoi)' },
]
const RIGHT_MARKERS = [
  { label: ':||', val: ':||', title: 'Fin de répétition' },
  { label: ':|:', val: ':|:', title: 'Double répétition' },
  { label: 'Coda', val: 'Coda', title: 'Coda' },
  { label: 'D.C.', val: 'D.C.', title: 'Da Capo' },
  { label: 'D.S.', val: 'D.S.', title: 'Dal Segno' },
  { label: 'Fine', val: 'Fine', title: 'Fine (fin)' },
  { label: 'al Coda', val: 'al Coda', title: 'al Coda' },
  { label: '⌢', val: '⌢', title: 'Fermate' },
  { label: '(x2)', val: '(x2)', title: 'Répéter 2 fois' },
]
const TIME_SIGS = ['4/4', '3/4', '6/8', '2/4', '5/4', '12/8', '2/2']
const BARS_PER_ROW_OPTIONS = [2, 3, 4, 6]
const TOTAL_BARS_OPTIONS = [8, 16, 24, 32, 48, 64, 80]

/* ─── Beat content renderer ─── */
function BeatContent({ content }: { content: string }) {
  const tokens = content.trim().split(/\s+/).filter(Boolean)
  if (!tokens.length) return <span className="text-gray-200 text-[10px] select-none">·</span>
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-0.5 w-full">
      {tokens.map((token, i) => (
        <span key={i} className="text-gray-900 font-bold text-xs leading-none">{token}</span>
      ))}
    </div>
  )
}

/* ─── Marker renderer (barre de mesure gauche ou droite) ─── */
function MarkerContent({ value, side }: { value: string; side: 'left' | 'right' }) {
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

/* ─── Main editor ─── */
export default function GrilleEditorPage({ params }: { params: { id: string; grilleId: string } }) {
  const { data: session } = useSession()
  const groupId = params.id
  const grilleId = params.grilleId

  const [chart, setChart] = useState<ChartData | null>(null)
  const [cells, setCells] = useState<BarData[]>([])
  const [sons, setSons] = useState('')
  const [groupRole, setGroupRole] = useState('MEMBRE')
  const [groupName, setGroupName] = useState('')
  const [groupSongs, setGroupSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)

  // Active target
  const [active, setActive] = useState<ActiveTarget | null>(null)
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Copy / paste
  const [copiedBar, setCopiedBar] = useState<BarData | null>(null)
  const [copiedFromIdx, setCopiedFromIdx] = useState<number | null>(null)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const copyFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Save state
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingCellsRef = useRef<BarData[]>([])

  // Settings modal
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    title: '', tempo: '', keySignature: '', timeSignature: '4/4',
    barsPerRow: 4, totalBars: 32, songId: '',
  })
  const [settingsSaving, setSettingsSaving] = useState(false)

  /* Fetch */
  const fetchData = useCallback(async () => {
    const [chartRes, grpRes, songsRes] = await Promise.all([
      fetch(`/api/grilles/${grilleId}`),
      fetch(`/api/groupes/${groupId}`),
      fetch(`/api/groupes/${groupId}/morceaux`),
    ])
    if (chartRes.ok) {
      const data: ChartData = await chartRes.json()
      setChart(data)
      const bpb = beatsPerBar(data.timeSignature)
      setCells(normalizeCells(data.cells, data.totalBars, bpb))
      setSons(data.sons ?? '')
    }
    if (grpRes.ok) {
      const g = await grpRes.json()
      const me = g.members?.find((m: any) => m.userId === Number(session?.user?.id))
      const role = session?.user?.siteRole === 'ADMIN' ? 'CHEF' : (me?.groupRole || 'MEMBRE')
      setGroupRole(role)
      setGroupName(g.name)
    }
    if (songsRes.ok) setGroupSongs(await songsRes.json())
    setLoading(false)
  }, [session, grilleId, groupId])

  useEffect(() => { if (session) fetchData() }, [session, fetchData])

  /* Auto-save */
  const scheduleSave = (newCells: BarData[]) => {
    pendingCellsRef.current = newCells
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      await fetch(`/api/grilles/${grilleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cells: pendingCellsRef.current }),
      })
      setSaving(false)
      setSavedAt(new Date())
    }, 800)
  }

  /* Save sons */
  const sonsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSonsChange = (val: string) => {
    setSons(val)
    if (sonsTimerRef.current) clearTimeout(sonsTimerRef.current)
    sonsTimerRef.current = setTimeout(async () => {
      await fetch(`/api/grilles/${grilleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sons: val }),
      })
    }, 800)
  }

  const isChef = groupRole === 'CHEF'

  /* Ouvrir une cible dans la palette */
  const openTarget = (target: ActiveTarget) => {
    setActive(target)
    if (target.type === 'beat') {
      setInputVal(cells[target.bar]?.b[target.beat] || '')
    } else if (target.type === 'left') {
      setInputVal(cells[target.bar]?.l || '')
    } else {
      setInputVal(cells[target.bar]?.r || '')
    }
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const closeCell = () => setActive(null)

  /* Mettre à jour la valeur active */
  const applyValue = (val: string) => {
    if (!active) return
    setInputVal(val)
    const newCells = cells.map((bar, i) => {
      if (i !== active.bar) return bar
      if (active.type === 'left') return { ...bar, l: val }
      if (active.type === 'right') return { ...bar, r: val }
      return { ...bar, b: bar.b.map((beat, j) => j === (active as any).beat ? val : beat) }
    })
    setCells(newCells)
    scheduleSave(newCells)
  }

  /* Palette : ajouter une racine */
  const appendRoot = (root: string) => {
    const cur = inputVal
    applyValue(cur && !cur.endsWith(' ') ? cur + ' ' + root : cur + root)
  }

  /* Palette : ajouter une qualité (sans espace) */
  const appendQuality = (quality: string) => {
    if (!quality) return
    applyValue(inputVal + quality)
  }

  /* Palette : ajouter un symbole de temps */
  const appendBeatSym = (sym: string) => {
    const cur = inputVal
    applyValue(cur && !cur.endsWith(' ') ? cur + ' ' + sym : cur + sym)
  }

  /* Backspace dernier token */
  const backspaceLast = () => {
    const trimmed = inputVal.trimEnd()
    const lastSpace = trimmed.lastIndexOf(' ')
    applyValue(lastSpace >= 0 ? trimmed.slice(0, lastSpace) : '')
  }

  /* Copier la mesure active */
  const copyCurrentBar = () => {
    if (!active) return
    const bar = cells[active.bar]
    setCopiedBar({ l: bar.l, b: [...bar.b], r: bar.r })
    setCopiedFromIdx(active.bar)
    setCopyFeedback(true)
    if (copyFeedbackTimer.current) clearTimeout(copyFeedbackTimer.current)
    copyFeedbackTimer.current = setTimeout(() => setCopyFeedback(false), 1500)
  }

  /* Coller sur la mesure active */
  const pasteToCurrentBar = () => {
    if (!active || !copiedBar || !chart) return
    const bpb = beatsPerBar(chart.timeSignature)
    let beats = [...copiedBar.b]
    if (beats.length < bpb) beats = [...beats, ...Array(bpb - beats.length).fill('')]
    else beats = beats.slice(0, bpb)
    const newBar: BarData = { l: copiedBar.l, b: beats, r: copiedBar.r }
    const newCells = cells.map((bar, i) => i === active.bar ? newBar : bar)
    setCells(newCells)
    scheduleSave(newCells)
    // Mettre à jour l'input si on est sur un temps
    if (active.type === 'beat') setInputVal(beats[(active as any).beat] || '')
    else if (active.type === 'left') setInputVal(newBar.l)
    else setInputVal(newBar.r)
  }

  /* Navigation clavier */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!active || !chart) return
    const bpb = beatsPerBar(chart.timeSignature)

    // Ctrl+C / Cmd+C : copier la mesure active
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault()
      copyCurrentBar()
      return
    }
    // Ctrl+V / Cmd+V : coller sur la mesure active
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault()
      pasteToCurrentBar()
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      if (active.type === 'beat') {
        if (e.shiftKey) {
          // Précédent
          if (active.beat > 0) openTarget({ bar: active.bar, type: 'beat', beat: active.beat - 1 })
          else if (active.bar > 0) openTarget({ bar: active.bar - 1, type: 'beat', beat: bpb - 1 })
        } else {
          // Suivant
          if (active.beat < bpb - 1) openTarget({ bar: active.bar, type: 'beat', beat: active.beat + 1 })
          else if (active.bar < cells.length - 1) openTarget({ bar: active.bar + 1, type: 'beat', beat: 0 })
        }
      }
    } else if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault()
      closeCell()
    }
  }

  /* Sauvegarde paramètres */
  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSettingsSaving(true)
    const newTotal = Number(settingsForm.totalBars)
    const newBpb = beatsPerBar(settingsForm.timeSignature)
    const oldBpb = chart ? beatsPerBar(chart.timeSignature) : newBpb

    let newCells: BarData[] = cells.map((bar) => {
      let newBeats = bar.b
      if (newBpb > oldBpb) newBeats = [...newBeats, ...Array(newBpb - newBeats.length).fill('')]
      else newBeats = newBeats.slice(0, newBpb)
      return { ...bar, b: newBeats }
    })

    if (newTotal > newCells.length) {
      newCells = [...newCells, ...Array(newTotal - newCells.length).fill(null).map(() => ({ l: '', b: Array(newBpb).fill(''), r: '' }))]
    } else if (newTotal < newCells.length) {
      newCells = newCells.slice(0, newTotal)
    }

    await fetch(`/api/grilles/${grilleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: settingsForm.title,
        tempo: settingsForm.tempo || null,
        keySignature: settingsForm.keySignature || null,
        timeSignature: settingsForm.timeSignature,
        barsPerRow: Number(settingsForm.barsPerRow),
        totalBars: newTotal,
        cells: newCells,
        songId: settingsForm.songId ? Number(settingsForm.songId) : null,
      }),
    })
    setSettingsSaving(false)
    setSettingsOpen(false)
    setCells(newCells)
    fetchData()
  }

  const openSettings = () => {
    if (!chart) return
    setSettingsForm({
      title: chart.title,
      tempo: (chart.tempo as string) ?? '',
      keySignature: (chart.keySignature as string) ?? '',
      timeSignature: chart.timeSignature,
      barsPerRow: chart.barsPerRow,
      totalBars: chart.totalBars,
      songId: (chart as any).songId ? String((chart as any).songId) : '',
    })
    setSettingsOpen(true)
  }

  /* Impression */
  const handlePrint = () => {
    if (!chart) return
    const bpr = chart.barsPerRow
    const bpb = beatsPerBar(chart.timeSignature)
    let rowsHtml = ''
    for (let i = 0; i < cells.length; i += bpr) {
      const rowBg = Math.floor(i / bpr) % 2 === 0 ? '#ffffff' : '#f5f5f5'
      let tds = ''
      for (let j = 0; j < bpr; j++) {
        const barIdx = i + j
        const bar = barIdx < cells.length ? cells[barIdx] : { l: '', b: Array(bpb).fill(''), r: '' }
        const barNum = barIdx + 1
        const beatsHtml = bar.b.map((beat, bi) =>
          `<div style="flex:1;padding:3px 4px;${bi < bpb - 1 ? 'border-right:1px solid #ddd;' : ''}font-size:12px;font-weight:700;color:#111;min-height:18px;">${beat || ''}</div>`
        ).join('')
        tds += `<td style="border:1px solid #bbb;padding:0;width:${(100 / bpr).toFixed(1)}%;vertical-align:top;background:${rowBg}">
          <div style="display:flex;align-items:baseline;justify-content:space-between;padding:2px 5px 1px;border-bottom:1px solid #e5e5e5;">
            <span style="font-size:9px;color:#aaa;">${barNum}</span>
            ${bar.l ? `<span style="font-size:13px;font-weight:900;color:#4338ca;">${bar.l}</span>` : ''}
            <span style="flex:1;"></span>
            ${bar.r ? `<span style="font-size:13px;font-weight:900;color:#4338ca;">${bar.r}</span>` : ''}
          </div>
          <div style="display:flex;">${beatsHtml}</div>
        </td>`
      }
      rowsHtml += `<tr>${tds}</tr>`
    }
    const pw = window.open('', '_blank', 'width=900,height=1200')
    if (!pw) return
    pw.document.write(`<!DOCTYPE html><html lang="fr"><head>
      <meta charset="UTF-8"><title>${chart.title}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,Helvetica,sans-serif;padding:20px;background:white}
        table{width:100%;border-collapse:collapse}
        .actions{margin-bottom:16px;display:flex;gap:8px;justify-content:center}
        .actions button{padding:9px 22px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:700}
        .btn-print{background:#ea580c;color:white}.btn-close{background:#f3f4f6;color:#374151}
        @media print{.actions{display:none!important}body{padding:8px}}
      </style>
    </head><body>
      <div class="actions">
        <button class="btn-print" onclick="window.print()">🖨️&nbsp; Imprimer</button>
        <button class="btn-close" onclick="window.close()">✕ Fermer</button>
      </div>
      <table>
        <thead>
          <tr>
            <td style="border:1px solid #bbb;padding:8px 12px;background:#fff;">
              <div style="font-size:9px;color:#aaa;text-transform:uppercase;letter-spacing:.05em">Tempo</div>
              <div style="font-size:14px;font-weight:700;">${chart.tempo || ''}</div>
            </td>
            <td colspan="${bpr - 2}" style="border:1px solid #bbb;padding:8px 12px;text-align:center;background:#fff;">
              <div style="font-size:18px;font-weight:800;">${chart.title}</div>
              ${chart.keySignature ? `<div style="font-size:11px;color:#666;margin-top:2px;">${chart.keySignature}</div>` : ''}
            </td>
            <td style="border:1px solid #bbb;padding:8px 12px;text-align:right;background:#fff;">
              <div style="font-size:9px;color:#aaa;text-transform:uppercase;letter-spacing:.05em">Mesure</div>
              <div style="font-size:14px;font-weight:700;">${chart.timeSignature}</div>
            </td>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
          <tr>
            <td colspan="${bpr}" style="border:1px solid #bbb;padding:8px 12px;background:#fff;">
              <span style="font-size:11px;font-weight:700;color:#333;">SONS : </span>
              <span style="font-size:12px;color:#555;">${sons || ''}</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </body></html>`)
    pw.document.close()
  }

  if (loading) return <div className="text-gray-500">Chargement...</div>
  if (!chart) return <div className="text-gray-500">Grille introuvable.</div>

  const bpr = chart.barsPerRow
  const bpb = beatsPerBar(chart.timeSignature)

  const rows: number[][] = []
  for (let i = 0; i < cells.length; i += bpr) {
    const row: number[] = []
    for (let j = 0; j < bpr; j++) row.push(i + j)
    rows.push(row)
  }

  return (
    <div className="pb-48 lg:pb-32">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2 flex-wrap">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">{groupName}</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}/grilles`} className="hover:text-indigo-600">Grilles</Link>
        <span>/</span>
        <span className="text-gray-900 truncate max-w-[160px]">{chart.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{chart.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {chart.tempo && (
              <span className="inline-flex items-center rounded-full bg-orange-50 border border-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">♩ {chart.tempo}</span>
            )}
            {chart.keySignature && (
              <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">🎵 {chart.keySignature}</span>
            )}
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{chart.timeSignature}</span>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{chart.totalBars} mesures · {bpr}/ligne</span>
            {chart.song && (
              <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">↳ {(chart.song as any).title}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          <span className={`text-xs transition-opacity ${saving ? 'text-orange-500 opacity-100' : savedAt ? 'text-green-600 opacity-100' : 'opacity-0'}`}>
            {saving ? '💾 Sauvegarde...' : '✓ Sauvegardé'}
          </span>
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            🖨️ Imprimer
          </button>
          {isChef && (
            <button onClick={openSettings}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Paramètres
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-xl border border-gray-300 overflow-hidden mb-4 bg-white">
        <table className="w-full border-collapse">
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/80'}>
                {row.map((barIdx) => {
                  const isValidBar = barIdx < cells.length
                  if (!isValidBar) return (
                    <td key={barIdx} className="border border-gray-200 bg-gray-50/30"
                      style={{ width: `${(100 / bpr).toFixed(1)}%`, height: '72px' }} />
                  )
                  const bar = cells[barIdx]
                  const isActiveBar = active?.bar === barIdx
                  const isCopiedBar = copiedFromIdx === barIdx

                  return (
                    <td
                      key={barIdx}
                      className={`border relative transition-colors ${
                        isActiveBar ? 'border-orange-200' :
                        isCopiedBar ? 'border-blue-300 bg-blue-50/30' :
                        'border-gray-200'
                      }`}
                      style={{ width: `${(100 / bpr).toFixed(1)}%`, height: '72px', padding: 0, verticalAlign: 'top' }}
                    >
                      {/* ── Bandelette supérieure : numéro + marqueurs ── */}
                      <div className="flex items-center border-b border-gray-100 px-1.5 gap-1" style={{ height: '18px' }}>
                        {/* Numéro de mesure */}
                        <span className="text-[9px] text-gray-300 font-medium leading-none flex-shrink-0 select-none">
                          {barIdx + 1}
                        </span>

                        {/* Marqueur gauche */}
                        <div
                          onClick={() => isChef && openTarget({ bar: barIdx, type: 'left' })}
                          className={`flex items-center flex-shrink-0 rounded px-0.5 transition-colors leading-none
                            ${isChef ? 'cursor-pointer hover:bg-indigo-50' : ''}
                            ${isActiveBar && active?.type === 'left' ? 'bg-orange-100 ring-1 ring-orange-300' : ''}
                          `}
                          style={{ minWidth: '20px', height: '14px' }}
                          title={isChef ? 'Cliquer pour ajouter un symbole de début' : undefined}
                        >
                          {bar.l
                            ? <MarkerContent value={bar.l} side="left" />
                            : isChef && <span className="text-[8px] text-gray-200 select-none">+</span>
                          }
                        </div>

                        <div className="flex-1" />

                        {/* Marqueur droit */}
                        <div
                          onClick={() => isChef && openTarget({ bar: barIdx, type: 'right' })}
                          className={`flex items-center justify-end flex-shrink-0 rounded px-0.5 transition-colors leading-none
                            ${isChef ? 'cursor-pointer hover:bg-indigo-50' : ''}
                            ${isActiveBar && active?.type === 'right' ? 'bg-orange-100 ring-1 ring-orange-300' : ''}
                          `}
                          style={{ minWidth: '20px', height: '14px' }}
                          title={isChef ? 'Cliquer pour ajouter un symbole de fin' : undefined}
                        >
                          {bar.r
                            ? <MarkerContent value={bar.r} side="right" />
                            : isChef && <span className="text-[8px] text-gray-200 select-none">+</span>
                          }
                        </div>
                      </div>

                      {/* ── Zones de temps ── */}
                      <div className="flex" style={{ height: '54px' }}>
                        {Array.from({ length: bpb }).map((_, beatIdx) => {
                          const isActiveBeat = isActiveBar && active?.type === 'beat' && (active as any).beat === beatIdx
                          return (
                            <div
                              key={beatIdx}
                              onClick={() => isChef && openTarget({ bar: barIdx, type: 'beat', beat: beatIdx })}
                              className={`
                                flex-1 flex items-center justify-center relative min-w-0
                                ${beatIdx < bpb - 1 ? 'border-r border-gray-100' : ''}
                                ${isChef ? 'cursor-pointer hover:bg-orange-50/60' : ''}
                                ${isActiveBeat ? 'bg-orange-50/80 ring-2 ring-inset ring-orange-400' : ''}
                                transition-colors
                              `}
                            >
                              <BeatContent content={bar.b[beatIdx] || ''} />
                            </div>
                          )
                        })}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SONS footer */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 mb-4">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">SONS :</label>
        <textarea
          value={sons}
          onChange={(e) => handleSonsChange(e.target.value)}
          placeholder="Instruments, arrangements, notes…"
          rows={2}
          disabled={!isChef}
          className="w-full text-sm text-gray-700 placeholder:text-gray-300 resize-none focus:outline-none bg-transparent"
        />
      </div>

      {/* ── Palette sticky ── */}
      {isChef && active !== null && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-orange-200 shadow-2xl">
          <div className="max-w-6xl mx-auto px-3 py-2">

            {/* Indicateur + champ + contrôles */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-shrink-0 flex items-center gap-1">
                <span className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-700">
                  {active.bar + 1}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {active.type === 'left' ? 'début' : active.type === 'right' ? 'fin' : `t${(active as any).beat + 1}`}
                </span>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => applyValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  active.type === 'left' ? 'Symbole de début (||:, Segno…)' :
                  active.type === 'right' ? 'Symbole de fin (:||, Fine, Coda…)' :
                  'Accord ou symbole…'
                }
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 font-mono"
              />
              {active.type === 'beat' && (
                <button onClick={backspaceLast} title="Effacer dernier token"
                  className="flex-shrink-0 w-8 h-8 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors text-sm">
                  ⌫
                </button>
              )}
              <button onClick={() => applyValue('')} title="Effacer"
                className="flex-shrink-0 w-8 h-8 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors text-xs font-bold">
                ✕
              </button>
              <button onClick={closeCell} title="Fermer"
                className="flex-shrink-0 w-8 h-8 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors text-xs">
                ↓
              </button>
            </div>

            {/* ── Palette pour temps (accords) ── */}
            {active.type === 'beat' && (
              <div className="overflow-x-auto">
                <div className="min-w-max space-y-1.5 pb-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-semibold text-gray-400 w-14 flex-shrink-0">Racines</span>
                    <div className="flex gap-1">
                      {ROOT_NOTES.map((r) => (
                        <button key={r} onClick={() => appendRoot(r)}
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-800 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors min-w-[30px]">
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-semibold text-gray-400 w-14 flex-shrink-0">Qualités</span>
                    <div className="flex flex-wrap gap-1">
                      {QUALITIES.map((q) => (
                        <button key={q.label} onClick={() => appendQuality(q.val)} title={q.title}
                          className={`rounded-md border px-2 py-1 text-xs font-semibold transition-colors min-w-[30px] ${
                            q.val === '' ? 'border-gray-300 bg-gray-100 text-gray-400 hover:bg-gray-200' :
                            'border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300'
                          }`}>
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-semibold text-gray-400 w-14 flex-shrink-0">Symboles</span>
                    <div className="flex flex-wrap gap-1">
                      {BEAT_SYMBOLS.map((s) => (
                        <button key={s.label} onClick={() => appendBeatSym(s.val)} title={s.title}
                          className="rounded-md border border-orange-100 bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100 hover:border-orange-300 transition-colors min-w-[30px]">
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Palette pour marqueur gauche ── */}
            {active.type === 'left' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold text-gray-400">Début de mesure :</span>
                {LEFT_MARKERS.map((m) => {
                  const isRepeatSymbol = m.val === '||:' || m.val === ':||' || m.val === ':|:'
                  return (
                    <button key={m.val} onClick={() => applyValue(m.val)} title={m.title}
                      className={`rounded-md border px-3 py-1 font-black transition-colors
                        ${inputVal === m.val
                          ? 'border-indigo-400 bg-indigo-100 text-indigo-700'
                          : 'border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300'
                        } ${isRepeatSymbol ? 'text-sm' : 'text-xs'}`}
                      style={isRepeatSymbol ? { fontFamily: '"Courier New", Courier, monospace', letterSpacing: '-2px' } : undefined}>
                      {m.label}
                    </button>
                  )
                })}
                {inputVal && (
                  <button onClick={() => applyValue('')}
                    className="rounded-md border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors">
                    ✕ Supprimer
                  </button>
                )}
              </div>
            )}

            {/* ── Palette pour marqueur droit ── */}
            {active.type === 'right' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold text-gray-400">Fin de mesure :</span>
                {RIGHT_MARKERS.map((m) => {
                  const isRepeatSymbol = m.val === '||:' || m.val === ':||' || m.val === ':|:'
                  return (
                    <button key={m.val} onClick={() => applyValue(m.val)} title={m.title}
                      className={`rounded-md border px-3 py-1 font-semibold transition-colors
                        ${inputVal === m.val
                          ? 'border-indigo-400 bg-indigo-100 text-indigo-700 font-black'
                          : 'border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300'
                        } ${isRepeatSymbol ? 'text-sm font-black' : 'text-xs'}`}
                      style={isRepeatSymbol ? { fontFamily: '"Courier New", Courier, monospace', letterSpacing: '-2px' } : undefined}>
                      {m.label}
                    </button>
                  )
                })}
                {inputVal && (
                  <button onClick={() => applyValue('')}
                    className="rounded-md border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors">
                    ✕ Supprimer
                  </button>
                )}
              </div>
            )}

            {/* ── Copier / Coller ── */}
            <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-gray-100">
              <button
                onClick={copyCurrentBar}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold transition-all ${
                  copyFeedback
                    ? 'border-blue-300 bg-blue-100 text-blue-700'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700'
                }`}
                title="Copier cette mesure (Ctrl+C)">
                {copyFeedback ? '✓ Copié !' : '📋 Copier la mesure'}
              </button>
              {copiedBar && (
                <button
                  onClick={pasteToCurrentBar}
                  className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                  title="Coller ici (Ctrl+V)">
                  📋 Coller
                  {copiedFromIdx !== null && copiedFromIdx !== active.bar && (
                    <span className="text-blue-400 font-normal">mesure {copiedFromIdx + 1}</span>
                  )}
                </button>
              )}
              {active.type === 'beat' && (
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (active.type !== 'beat') return
                      if (active.beat > 0) openTarget({ bar: active.bar, type: 'beat', beat: active.beat - 1 })
                      else if (active.bar > 0) openTarget({ bar: active.bar - 1, type: 'beat', beat: bpb - 1 })
                    }}
                    disabled={active.bar === 0 && (active as any).beat === 0}
                    className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                    ← Préc
                  </button>
                  <button
                    onClick={() => {
                      if (active.type !== 'beat') return
                      if (active.beat < bpb - 1) openTarget({ bar: active.bar, type: 'beat', beat: active.beat + 1 })
                      else if (active.bar < cells.length - 1) openTarget({ bar: active.bar + 1, type: 'beat', beat: 0 })
                    }}
                    disabled={active.bar === cells.length - 1 && (active as any).beat === bpb - 1}
                    className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                    Suiv →
                  </button>
                </div>
              )}
            </div>
            {active.type === 'beat' && (
              <p className="text-[10px] text-gray-400 mt-0.5">Tab → temps suivant · Maj+Tab ← précédent · Ctrl+C copier · Ctrl+V coller</p>
            )}
          </div>
        </div>
      )}

      {/* Settings modal */}
      <Modal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} title="Paramètres de la grille">
        <form onSubmit={handleSettingsSave} className="space-y-4">
          <div>
            <label className="form-label">Titre <span className="text-red-500">*</span></label>
            <input type="text" required value={settingsForm.title}
              onChange={(e) => setSettingsForm({ ...settingsForm, title: e.target.value })}
              className="form-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Tempo</label>
              <input type="text" value={settingsForm.tempo}
                onChange={(e) => setSettingsForm({ ...settingsForm, tempo: e.target.value })}
                className="form-input" placeholder="♩=120, Swing…" />
            </div>
            <div>
              <label className="form-label">Tonalité</label>
              <input type="text" value={settingsForm.keySignature}
                onChange={(e) => setSettingsForm({ ...settingsForm, keySignature: e.target.value })}
                className="form-input" placeholder="La mineur…" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">Mesure</label>
              <select value={settingsForm.timeSignature}
                onChange={(e) => setSettingsForm({ ...settingsForm, timeSignature: e.target.value })}
                className="form-input">
                {TIME_SIGS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Mesures/ligne</label>
              <select value={settingsForm.barsPerRow}
                onChange={(e) => setSettingsForm({ ...settingsForm, barsPerRow: Number(e.target.value) })}
                className="form-input">
                {BARS_PER_ROW_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Nb mesures</label>
              <select value={settingsForm.totalBars}
                onChange={(e) => setSettingsForm({ ...settingsForm, totalBars: Number(e.target.value) })}
                className="form-input">
                {TOTAL_BARS_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          {groupSongs.length > 0 && (
            <div>
              <label className="form-label">Lier à un morceau <span className="text-gray-400 font-normal">(optionnel)</span></label>
              <select value={settingsForm.songId}
                onChange={(e) => setSettingsForm({ ...settingsForm, songId: e.target.value })}
                className="form-input">
                <option value="">— Aucun —</option>
                {groupSongs.map((s) => <option key={s.id} value={s.id}>{s.title}{s.artist ? ` — ${s.artist}` : ''}</option>)}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setSettingsOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={settingsSaving}>{settingsSaving ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

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

/* ─── Helpers ─── */
/** Nombre de temps par mesure selon la signature */
function beatsPerBar(timeSig: string): number {
  const map: Record<string, number> = {
    '4/4': 4, '3/4': 3, '6/8': 2, '2/4': 2, '5/4': 5, '12/8': 4, '2/2': 2,
  }
  return map[timeSig] ?? 4
}

/**
 * Normalise les données de cellules :
 * - Ancien format (string[]) → string[][] en mettant la valeur sur le 1er temps
 * - Nouveau format (string[][]) → ajuste la longueur des sous-tableaux
 */
function normalizeCells(raw: unknown, totalBars: number, bpb: number): string[][] {
  const result: string[][] = []
  const src = Array.isArray(raw) ? raw : []

  for (let i = 0; i < totalBars; i++) {
    const item = src[i]
    if (Array.isArray(item)) {
      // Nouveau format : ajuste la taille au bon nombre de temps
      const bar = item.map((v) => (typeof v === 'string' ? v : ''))
      if (bar.length < bpb) result.push([...bar, ...Array(bpb - bar.length).fill('')])
      else result.push(bar.slice(0, bpb))
    } else if (typeof item === 'string') {
      // Ancien format : place la valeur sur le 1er temps
      const bar = Array(bpb).fill('')
      bar[0] = item
      result.push(bar)
    } else {
      result.push(Array(bpb).fill(''))
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
const MUSICAL_SYMBOLS = [
  { label: '||:', val: '||:', title: 'Début répétition' },
  { label: ':||', val: ':||', title: 'Fin répétition' },
  { label: ':|:', val: ':|:', title: 'Double répétition' },
  { label: '%', val: '%', title: 'Simile (répéter la mesure)' },
  { label: '/', val: '/', title: 'Temps vide' },
  { label: '-', val: '-', title: 'Tenir / prolonger' },
  { label: '𝄌', val: '𝄌', title: 'Coda' },
  { label: '𝄋', val: '𝄋', title: 'Segno' },
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
const SYMBOL_TOKENS = new Set(['||:', ':||', ':|:', '%', '/', '-', '𝄌', '𝄋', 'D.C.', 'D.S.', 'Fine', '⌢', '(x2)'])

/* ─── Beat content renderer ─── */
function BeatContent({ content }: { content: string }) {
  const tokens = content.trim().split(/\s+/).filter(Boolean)
  if (!tokens.length) return <span className="text-gray-200 text-[10px] select-none">·</span>
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-0.5 w-full">
      {tokens.map((token, i) => {
        const isRepeat = token === '||:' || token === ':||' || token === ':|:'
        const isSym = SYMBOL_TOKENS.has(token)
        return (
          <span key={i} className={
            isRepeat ? 'text-indigo-700 font-black text-base leading-none' :
            isSym    ? 'text-orange-600 font-semibold text-[9px] italic leading-none' :
                       'text-gray-900 font-bold text-xs leading-none'
          }>{token}</span>
        )
      })}
    </div>
  )
}

/* ─── Main editor ─── */
export default function GrilleEditorPage({ params }: { params: { id: string; grilleId: string } }) {
  const { data: session } = useSession()
  const groupId = params.id
  const grilleId = params.grilleId

  const [chart, setChart] = useState<ChartData | null>(null)
  const [cells, setCells] = useState<string[][]>([])
  const [sons, setSons] = useState('')
  const [groupRole, setGroupRole] = useState('MEMBRE')
  const [groupName, setGroupName] = useState('')
  const [groupSongs, setGroupSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)

  // Editing state: active bar + beat
  const [activeBar, setActiveBar] = useState<number | null>(null)
  const [activeBeat, setActiveBeat] = useState<number | null>(null)
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Save state
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingCellsRef = useRef<string[][]>([])

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

  /* Auto-save cells */
  const scheduleSave = (newCells: string[][]) => {
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

  /* Open a specific beat */
  const openBeat = (barIdx: number, beatIdx: number) => {
    setActiveBar(barIdx)
    setActiveBeat(beatIdx)
    setInputVal(cells[barIdx]?.[beatIdx] || '')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const closeCell = () => { setActiveBar(null); setActiveBeat(null) }

  /* Update the active beat value */
  const applyValue = (val: string) => {
    if (activeBar === null || activeBeat === null) return
    setInputVal(val)
    const newCells = cells.map((bar, i) =>
      i === activeBar ? bar.map((beat, j) => j === activeBeat ? val : beat) : bar
    )
    setCells(newCells)
    scheduleSave(newCells)
  }

  /* Palette: append root note (with space separator) */
  const appendRoot = (root: string) => {
    const cur = inputVal
    applyValue(cur && !cur.endsWith(' ') ? cur + ' ' + root : cur + root)
  }

  /* Palette: append quality directly (no space) */
  const appendQuality = (quality: string) => {
    if (!quality) return
    applyValue(inputVal + quality)
  }

  /* Palette: append symbol (with space separator) */
  const appendSymbol = (sym: string) => {
    const cur = inputVal
    applyValue(cur && !cur.endsWith(' ') ? cur + ' ' + sym : cur + sym)
  }

  /* Backspace last token */
  const backspaceLast = () => {
    const trimmed = inputVal.trimEnd()
    const lastSpace = trimmed.lastIndexOf(' ')
    applyValue(lastSpace >= 0 ? trimmed.slice(0, lastSpace) : '')
  }

  /* Keyboard navigation */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (activeBar === null || activeBeat === null || !chart) return
    const bpb = beatsPerBar(chart.timeSignature)

    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        // Précédent
        if (activeBeat > 0) openBeat(activeBar, activeBeat - 1)
        else if (activeBar > 0) openBeat(activeBar - 1, bpb - 1)
      } else {
        // Suivant
        if (activeBeat < bpb - 1) openBeat(activeBar, activeBeat + 1)
        else if (activeBar < cells.length - 1) openBeat(activeBar + 1, 0)
      }
    } else if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault()
      closeCell()
    }
  }

  /* Settings save */
  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSettingsSaving(true)
    const newTotal = Number(settingsForm.totalBars)
    const newBpb = beatsPerBar(settingsForm.timeSignature)
    const oldBpb = chart ? beatsPerBar(chart.timeSignature) : newBpb

    // Adapter les temps de chaque mesure si la signature change
    let newCells: string[][] = cells.map((bar) => {
      if (newBpb > oldBpb) return [...bar, ...Array(newBpb - bar.length).fill('')]
      return bar.slice(0, newBpb)
    })

    // Adapter le nombre total de mesures
    if (newTotal > newCells.length) {
      newCells = [...newCells, ...Array(newTotal - newCells.length).fill(null).map(() => Array(newBpb).fill(''))]
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

  /* Print */
  const handlePrint = () => {
    if (!chart) return
    const bpr = chart.barsPerRow
    const bpb = beatsPerBar(chart.timeSignature)
    const totalPrint = cells.length
    let rowsHtml = ''
    for (let i = 0; i < totalPrint; i += bpr) {
      const rowBg = Math.floor(i / bpr) % 2 === 0 ? '#ffffff' : '#f5f5f5'
      let tds = ''
      for (let j = 0; j < bpr; j++) {
        const barIdx = i + j
        const barBeats = barIdx < cells.length ? cells[barIdx] : Array(bpb).fill('')
        const barNum = barIdx + 1
        const beatsHtml = barBeats.map((beat, bi) =>
          `<div style="flex:1;padding:3px 4px;${bi < bpb - 1 ? 'border-right:1px solid #ddd;' : ''}font-size:12px;font-weight:700;color:#111;min-height:18px;">${beat || ''}</div>`
        ).join('')
        tds += `<td style="border:1px solid #bbb;padding:4px 0 0;width:${(100 / bpr).toFixed(1)}%;vertical-align:top;background:${rowBg}">
          <div style="font-size:9px;color:#aaa;line-height:1;padding:0 5px 3px;">${barNum}</div>
          <div style="display:flex;border-top:1px solid #e5e5e5;">${beatsHtml}</div>
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
        .actions{text-align:center;margin-bottom:16px;display:flex;gap:8px;justify-content:center}
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

  // Build rows
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
          <button
            onClick={handlePrint}
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
                      style={{ width: `${(100 / bpr).toFixed(1)}%`, height: '68px' }} />
                  )
                  const isActiveBar = activeBar === barIdx
                  return (
                    <td
                      key={barIdx}
                      className={`border border-gray-200 relative transition-colors ${isActiveBar ? 'border-orange-300' : ''}`}
                      style={{ width: `${(100 / bpr).toFixed(1)}%`, height: '68px', verticalAlign: 'top', padding: 0 }}
                    >
                      {/* Numéro de mesure */}
                      <span className="absolute top-0.5 left-1 text-[9px] text-gray-300 leading-none select-none font-medium z-10">
                        {barIdx + 1}
                      </span>

                      {/* Sous-zones par temps */}
                      <div className="flex h-full pt-3.5">
                        {Array.from({ length: bpb }).map((_, beatIdx) => {
                          const isActiveBeat = isActiveBar && activeBeat === beatIdx
                          return (
                            <div
                              key={beatIdx}
                              onClick={() => isChef && openBeat(barIdx, beatIdx)}
                              className={`
                                flex-1 flex items-center justify-center relative min-w-0
                                ${beatIdx < bpb - 1 ? 'border-r border-gray-100' : ''}
                                ${isChef ? 'cursor-pointer hover:bg-orange-50/60' : ''}
                                ${isActiveBeat ? 'bg-orange-50/80 ring-2 ring-inset ring-orange-400' : ''}
                                transition-colors
                              `}
                            >
                              <BeatContent content={cells[barIdx]?.[beatIdx] || ''} />
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

      {/* Sticky editing palette */}
      {isChef && activeBar !== null && activeBeat !== null && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-orange-200 shadow-2xl">
          <div className="max-w-6xl mx-auto px-3 py-2">
            {/* Top bar: indicator + input + controls */}
            <div className="flex items-center gap-2 mb-2">
              {/* Indicateur mesure / temps */}
              <div className="flex-shrink-0 flex items-center gap-1">
                <span className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-700">
                  {activeBar + 1}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">t{activeBeat + 1}</span>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => applyValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tapez un accord ou utilisez la palette…"
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 font-mono"
              />
              <button onClick={backspaceLast} title="Effacer dernier token"
                className="flex-shrink-0 w-8 h-8 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors text-sm">
                ⌫
              </button>
              <button onClick={() => applyValue('')} title="Effacer tout"
                className="flex-shrink-0 w-8 h-8 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors text-xs font-bold">
                ✕
              </button>
              <button onClick={closeCell} title="Fermer (Échap)"
                className="flex-shrink-0 w-8 h-8 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors text-xs">
                ↓
              </button>
            </div>

            {/* Scrollable palette rows */}
            <div className="overflow-x-auto">
              <div className="min-w-max space-y-1.5 pb-1">
                {/* Root notes */}
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

                {/* Qualities */}
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

                {/* Musical symbols */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold text-gray-400 w-14 flex-shrink-0">Symboles</span>
                  <div className="flex flex-wrap gap-1">
                    {MUSICAL_SYMBOLS.map((s) => (
                      <button key={s.label} onClick={() => appendSymbol(s.val)} title={s.title}
                        className="rounded-md border border-orange-100 bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100 hover:border-orange-300 transition-colors min-w-[30px]">
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Nav hint */}
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-gray-400">Tab → temps suivant · Maj+Tab ← précédent · Entrée / Échap pour fermer</p>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    if (activeBar === null || activeBeat === null) return
                    if (activeBeat > 0) openBeat(activeBar, activeBeat - 1)
                    else if (activeBar > 0) openBeat(activeBar - 1, bpb - 1)
                  }}
                  disabled={activeBar === 0 && activeBeat === 0}
                  className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                  ← Préc
                </button>
                <button
                  onClick={() => {
                    if (activeBar === null || activeBeat === null) return
                    if (activeBeat < bpb - 1) openBeat(activeBar, activeBeat + 1)
                    else if (activeBar < cells.length - 1) openBeat(activeBar + 1, 0)
                  }}
                  disabled={activeBar === cells.length - 1 && activeBeat === bpb - 1}
                  className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                  Suiv →
                </button>
              </div>
            </div>
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

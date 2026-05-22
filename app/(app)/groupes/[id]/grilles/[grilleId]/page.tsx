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
  barsPerRow: number; totalBars: number; cells: string[]
  sons?: string | null; song?: { id: number; title: string } | null
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

/* ─── Cell content renderer ─── */
function CellContent({ content }: { content: string }) {
  const tokens = content.trim().split(/\s+/).filter(Boolean)
  if (!tokens.length) return <span className="text-gray-200 text-xs select-none">·</span>
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 px-1">
      {tokens.map((token, i) => {
        const isRepeat = token === '||:' || token === ':||' || token === ':|:'
        const isSym = SYMBOL_TOKENS.has(token)
        return (
          <span key={i} className={
            isRepeat ? 'text-indigo-700 font-black text-lg leading-none' :
            isSym    ? 'text-orange-600 font-semibold text-xs italic' :
                       'text-gray-900 font-bold text-sm leading-none'
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
  const [cells, setCells] = useState<string[]>([])
  const [sons, setSons] = useState('')
  const [groupRole, setGroupRole] = useState('MEMBRE')
  const [groupName, setGroupName] = useState('')
  const [groupSongs, setGroupSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)

  // Editing state
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Save state
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingCellsRef = useRef<string[]>([])

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
      setCells(Array.isArray(data.cells) ? data.cells : Array(data.totalBars).fill(''))
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
  const scheduleSave = (newCells: string[]) => {
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

  /* Cell selection */
  const openCell = (idx: number) => {
    setActiveIdx(idx)
    setInputVal(cells[idx] || '')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const closeCell = () => setActiveIdx(null)

  /* Update a cell value */
  const applyValue = (val: string) => {
    if (activeIdx === null) return
    setInputVal(val)
    const newCells = [...cells]
    newCells[activeIdx] = val
    setCells(newCells)
    scheduleSave(newCells)
  }

  /* Palette: append root note */
  const appendRoot = (root: string) => {
    const cur = inputVal
    const next = cur && !cur.endsWith(' ') ? cur + ' ' + root : cur + root
    applyValue(next)
  }

  /* Palette: append quality to last chord token (no space) */
  const appendQuality = (quality: string) => {
    if (!quality) return // major = nothing
    applyValue(inputVal + quality)
  }

  /* Palette: append symbol */
  const appendSymbol = (sym: string) => {
    const cur = inputVal
    const next = cur && !cur.endsWith(' ') ? cur + ' ' + sym : cur + sym
    applyValue(next)
  }

  /* Backspace last token */
  const backspaceLast = () => {
    const trimmed = inputVal.trimEnd()
    const lastSpace = trimmed.lastIndexOf(' ')
    const next = lastSpace >= 0 ? trimmed.slice(0, lastSpace) : ''
    applyValue(next)
  }

  /* Keyboard nav */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      if (activeIdx !== null) {
        const next = e.shiftKey
          ? Math.max(0, activeIdx - 1)
          : Math.min(cells.length - 1, activeIdx + 1)
        openCell(next)
      }
    } else if (e.key === 'Escape') {
      closeCell()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      closeCell()
    }
  }

  /* Settings save */
  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSettingsSaving(true)
    const newTotal = Number(settingsForm.totalBars)
    const currentCells = cells
    let newCells = currentCells
    if (newTotal > currentCells.length) {
      newCells = [...currentCells, ...Array(newTotal - currentCells.length).fill('')]
    } else if (newTotal < currentCells.length) {
      newCells = currentCells.slice(0, newTotal)
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
      tempo: chart.tempo ?? '',
      keySignature: chart.keySignature ?? '',
      timeSignature: chart.timeSignature,
      barsPerRow: chart.barsPerRow,
      totalBars: chart.totalBars,
      songId: chart.songId ? String(chart.songId) : '',
    })
    setSettingsOpen(true)
  }

  /* Print */
  const handlePrint = () => {
    if (!chart) return
    const bpr = chart.barsPerRow
    const totalPrint = cells.length
    let rowsHtml = ''
    for (let i = 0; i < totalPrint; i += bpr) {
      const rowBg = Math.floor(i / bpr) % 2 === 0 ? '#ffffff' : '#f5f5f5'
      let tds = ''
      for (let j = 0; j < bpr; j++) {
        const idx = i + j
        const cellContent = idx < cells.length ? cells[idx] : ''
        const barNum = idx + 1
        tds += `<td style="border:1px solid #bbb;padding:5px 8px 22px;width:${(100 / bpr).toFixed(1)}%;vertical-align:top;background:${rowBg}">
          <div style="font-size:9px;color:#aaa;line-height:1;">${barNum}</div>
          <div style="font-size:15px;font-weight:700;color:#111;margin-top:4px;min-height:20px;">${cellContent || ''}</div>
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
  // Build rows
  const rows: { idx: number }[][] = []
  for (let i = 0; i < cells.length; i += bpr) {
    const row: { idx: number }[] = []
    for (let j = 0; j < bpr; j++) row.push({ idx: i + j })
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
              <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">↳ {chart.song.title}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {/* Save indicator */}
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
                {row.map(({ idx }) => {
                  const isActive = activeIdx === idx
                  const isOccupied = idx < cells.length
                  if (!isOccupied) return <td key={idx} className="border border-gray-200 bg-gray-50/30" />
                  return (
                    <td
                      key={idx}
                      onClick={() => isChef && openCell(idx)}
                      className={`
                        border border-gray-200 relative
                        ${isChef ? 'cursor-pointer hover:bg-orange-50/60 hover:border-orange-200' : ''}
                        ${isActive ? 'ring-2 ring-inset ring-orange-400 bg-orange-50/40 border-orange-300' : ''}
                        transition-colors
                      `}
                      style={{ width: `${(100 / bpr).toFixed(1)}%`, height: '60px', verticalAlign: 'top', padding: '4px 4px 2px' }}
                    >
                      {/* Bar number */}
                      <span className="absolute top-1 left-1.5 text-[9px] text-gray-300 leading-none select-none font-medium">
                        {idx + 1}
                      </span>
                      {/* Content */}
                      <div className="flex items-center justify-center h-full pt-3">
                        <CellContent content={cells[idx] || ''} />
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
      {isChef && activeIdx !== null && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-orange-200 shadow-2xl">
          <div className="max-w-6xl mx-auto px-3 py-2">
            {/* Top bar: indicator + input + controls */}
            <div className="flex items-center gap-2 mb-2">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-700">
                {activeIdx + 1}
              </span>
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
              <p className="text-[10px] text-gray-400">Tab → mesure suivante · Maj+Tab ← précédente · Entrée / Échap pour fermer</p>
              <div className="flex gap-1">
                <button
                  onClick={() => activeIdx > 0 && openCell(activeIdx - 1)}
                  disabled={activeIdx <= 0}
                  className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                  ← Préc
                </button>
                <button
                  onClick={() => activeIdx < cells.length - 1 && openCell(activeIdx + 1)}
                  disabled={activeIdx >= cells.length - 1}
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

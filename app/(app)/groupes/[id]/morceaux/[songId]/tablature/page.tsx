'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────
type CellVal = string | null

interface TabData {
  instrument: 'guitar' | 'bass' | 'ukulele'
  colsPerMeasure: number
  measures: CellVal[][][] // [mIdx][colIdx][stringIdx]  — stringIdx 0 = lowest string
}

// ─── Instruments config ───────────────────────────────────────────────────────
const INSTRUMENTS = {
  guitar:  { name: 'Guitare',  strings: ['E', 'A', 'D', 'G', 'B', 'e'] },
  bass:    { name: 'Basse',    strings: ['E', 'A', 'D', 'G'] },
  ukulele: { name: 'Ukulélé', strings: ['G', 'C', 'E', 'A'] },
} as const

type InstrumentKey = keyof typeof INSTRUMENTS

const COLS_OPTIONS = [4, 8, 16]

// Color per string index (0=low, last=high)
const STRING_COLORS = [
  'text-red-500',    // low E
  'text-orange-400', // A
  'text-yellow-600', // D
  'text-green-600',  // G
  'text-blue-500',   // B
  'text-indigo-500', // high e
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function createEmptyMeasure(cols: number, numStrings: number): CellVal[][] {
  return Array.from({ length: cols }, () => Array<CellVal>(numStrings).fill(null))
}

function createDefaultTab(): TabData {
  return { instrument: 'guitar', colsPerMeasure: 8, measures: [createEmptyMeasure(8, 6), createEmptyMeasure(8, 6)] }
}

/** Keep only valid tab characters, max 3 chars */
function cleanInput(raw: string): string {
  return raw.replace(/[^0-9xhpb/\\~]/gi, '').slice(0, 3)
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TablaturePage({
  params,
}: {
  params: { id: string; songId: string }
}) {
  const { data: session } = useSession()
  const groupId = params.id
  const songId = params.songId

  const [tab, setTab] = useState<TabData | null>(null)
  const [savedTab, setSavedTab] = useState('')
  const [songTitle, setSongTitle] = useState('')
  const [songArtist, setSongArtist] = useState('')
  const [groupName, setGroupName] = useState('')
  const [isChef, setIsChef] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [selected, setSelected] = useState<{ m: number; c: number; s: number } | null>(null)

  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Fetch ──
  useEffect(() => {
    if (!session) return
    const load = async () => {
      const [songRes, tabRes, grpRes] = await Promise.all([
        fetch(`/api/groupes/${groupId}/morceaux`),
        fetch(`/api/morceaux/${songId}/tablature`),
        fetch(`/api/groupes/${groupId}`),
      ])
      if (songRes.ok) {
        const songs = await songRes.json()
        const song = songs.find((s: { id: number; title: string; artist?: string }) => s.id === Number(songId))
        if (song) { setSongTitle(song.title); setSongArtist(song.artist || '') }
      }
      let loadedTab: TabData
      if (tabRes.ok) {
        const data = await tabRes.json()
        loadedTab = data.content ?? createDefaultTab()
      } else {
        loadedTab = createDefaultTab()
      }
      setTab(loadedTab)
      setSavedTab(JSON.stringify(loadedTab))
      if (grpRes.ok) {
        const g = await grpRes.json()
        setGroupName(g.name || '')
        const me = g.members?.find((m: { userId: number; groupRole: string }) => m.userId === Number(session.user.id))
        const role = session.user.siteRole === 'ADMIN' ? 'CHEF' : (me?.groupRole || 'MEMBRE')
        setIsChef(role === 'CHEF')
      }
      setLoading(false)
    }
    load()
  }, [session, groupId, songId])

  // ── Focus selected cell ──
  useEffect(() => {
    if (!selected) return
    const key = `${selected.m}-${selected.c}-${selected.s}`
    const el = cellRefs.current.get(key)
    if (el && document.activeElement !== el) el.focus()
  }, [selected])

  // ── Auto-save ──
  const save = useCallback(async (data: TabData) => {
    setSaveStatus('saving')
    await fetch(`/api/morceaux/${songId}/tablature`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: data }),
    })
    setSavedTab(JSON.stringify(data))
    setSaveStatus('saved')
  }, [songId])

  const scheduleSave = (data: TabData) => {
    setSaveStatus('unsaved')
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => save(data), 800)
  }

  const updateCell = (m: number, c: number, s: number, v: CellVal) => {
    if (!tab || !isChef) return
    const newTab: TabData = JSON.parse(JSON.stringify(tab))
    newTab.measures[m][c][s] = v
    setTab(newTab)
    scheduleSave(newTab)
  }

  const addMeasure = () => {
    if (!tab) return
    const ns = INSTRUMENTS[tab.instrument].strings.length
    const newTab = { ...tab, measures: [...tab.measures, createEmptyMeasure(tab.colsPerMeasure, ns)] }
    setTab(newTab)
    scheduleSave(newTab)
  }

  const removeMeasure = () => {
    if (!tab || tab.measures.length <= 1) return
    const newTab = { ...tab, measures: tab.measures.slice(0, -1) }
    setTab(newTab)
    setSelected(null)
    scheduleSave(newTab)
  }

  const changeInstrument = (instrument: InstrumentKey) => {
    if (!tab) return
    if (!confirm(`Changer d'instrument effacera toutes les notes. Continuer ?`)) return
    const ns = INSTRUMENTS[instrument].strings.length
    const newTab: TabData = {
      ...tab, instrument,
      measures: Array.from({ length: tab.measures.length }, () => createEmptyMeasure(tab.colsPerMeasure, ns)),
    }
    setTab(newTab)
    setSelected(null)
    scheduleSave(newTab)
  }

  const changeColsPerMeasure = (cols: number) => {
    if (!tab) return
    if (!confirm(`Changer les cases/mesure effacera toutes les notes. Continuer ?`)) return
    const ns = INSTRUMENTS[tab.instrument].strings.length
    const newTab: TabData = {
      ...tab, colsPerMeasure: cols,
      measures: Array.from({ length: tab.measures.length }, () => createEmptyMeasure(cols, ns)),
    }
    setTab(newTab)
    setSelected(null)
    scheduleSave(newTab)
  }

  // ── Keyboard navigation ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, m: number, c: number, s: number) => {
    if (!tab) return
    const ns = INSTRUMENTS[tab.instrument].strings.length
    const nc = tab.colsPerMeasure
    const nm = tab.measures.length

    const go = (nm_: number, nc_: number, ns_: number) => setSelected({ m: nm_, c: nc_, s: ns_ })

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault()
        if (c < nc - 1) go(m, c + 1, s)
        else if (m < nm - 1) go(m + 1, 0, s)
        break
      case 'Tab':
        e.preventDefault()
        if (!e.shiftKey) {
          if (c < nc - 1) go(m, c + 1, s)
          else if (m < nm - 1) go(m + 1, 0, s)
        } else {
          if (c > 0) go(m, c - 1, s)
          else if (m > 0) go(m - 1, nc - 1, s)
        }
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (c > 0) go(m, c - 1, s)
        else if (m > 0) go(m - 1, nc - 1, s)
        break
      case 'ArrowUp':
        e.preventDefault()
        if (s < ns - 1) go(m, c, s + 1)  // up on screen = higher string = bigger index
        break
      case 'ArrowDown':
        e.preventDefault()
        if (s > 0) go(m, c, s - 1)
        break
      case 'Delete':
      case 'Backspace':
        if (e.currentTarget.value === '') {
          updateCell(m, c, s, null)
        }
        break
    }
  }

  // ── Print ──
  const handlePrint = () => {
    if (!tab) return
    const instrConfig = INSTRUMENTS[tab.instrument]
    const ns = instrConfig.strings.length
    const displayStrings = [...instrConfig.strings].reverse()

    let rows = ''
    displayStrings.forEach((label, di) => {
      const s = ns - 1 - di
      let row = `<tr><td style="padding-right:10px;font-weight:bold;color:#555;">${label}</td>`
      row += `<td style="padding:0 2px;color:#999;">│</td>`
      tab.measures.forEach((measure) => {
        measure.forEach((col) => {
          const val = col[s]
          row += `<td style="width:22px;text-align:center;color:${val ? '#111' : '#ccc'};">${val ?? '─'}</td>`
        })
        row += `<td style="padding:0 2px;color:#999;">│</td>`
      })
      row += '</tr>'
      rows += row
    })

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html><html><head>
        <meta charset="utf-8">
        <title>${songTitle} – Tablature</title>
        <style>
          @page { margin: 20mm 18mm; }
          body { font-family: 'Courier New', monospace; color: #111; }
          header { display:flex; justify-content:space-between; border-bottom:1px solid #ccc; padding-bottom:8px; margin-bottom:20px; }
          h1 { margin:0; font-size:20px; font-weight:700; font-family:Georgia,serif; }
          .meta { font-size:12px; color:#666; font-family:Georgia,serif; }
          table { border-collapse:collapse; }
          @media print { button { display:none; } }
        </style>
      </head><body>
        <header>
          <div>
            <h1>${songTitle}</h1>
            ${songArtist ? `<div class="meta">${songArtist}</div>` : ''}
          </div>
          <div class="meta">${groupName} · ${instrConfig.name}</div>
        </header>
        <table>${rows}</table>
        <script>window.onload=()=>{window.print();window.close();}<\/script>
      </body></html>
    `)
    win.document.close()
  }

  if (loading) return <div className="text-gray-500 p-6">Chargement...</div>
  if (!tab) return null

  const instrConfig = INSTRUMENTS[tab.instrument]
  const numStrings = instrConfig.strings.length
  // Display top→bottom = high→low = reverse of data storage
  const displayStrings = [...instrConfig.strings].reverse()

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2 flex-wrap">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">{groupName}</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}/morceaux`} className="hover:text-indigo-600">Répertoire</Link>
        <span>/</span>
        <span className="text-gray-900 truncate max-w-[140px]">{songTitle}</span>
        <span>/</span>
        <span className="text-gray-900">Tablature</span>
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🎸 {songTitle}
          </h1>
          {songArtist && <p className="text-gray-500 text-sm mt-0.5">{songArtist}</p>}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {isChef && (
            <span className={`text-xs font-medium ${
              saveStatus === 'saved' ? 'text-green-600' :
              saveStatus === 'saving' ? 'text-amber-500' : 'text-gray-400'
            }`}>
              {saveStatus === 'saved' ? '✓ Sauvegardé' : saveStatus === 'saving' ? '⏳ Sauvegarde...' : '● Non sauvegardé'}
            </span>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimer
          </button>
        </div>
      </div>

      {/* Chef controls */}
      {isChef && (
        <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">Instrument</label>
            <select
              value={tab.instrument}
              onChange={(e) => changeInstrument(e.target.value as InstrumentKey)}
              className="text-xs rounded-lg border border-gray-200 px-2 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {(Object.entries(INSTRUMENTS) as [InstrumentKey, { name: string; strings: string[] }][]).map(([k, v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">Cases/mesure</label>
            <select
              value={tab.colsPerMeasure}
              onChange={(e) => changeColsPerMeasure(Number(e.target.value))}
              className="text-xs rounded-lg border border-gray-200 px-2 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {COLS_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="text-xs text-gray-400 font-mono hidden sm:block">
            {instrConfig.strings.join(' – ')}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={removeMeasure}
              disabled={tab.measures.length <= 1}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              − Mesure
            </button>
            <button
              onClick={addMeasure}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              + Mesure
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-[11px] text-gray-400 font-mono">
        <span><span className="text-gray-600 font-semibold">0–24</span> = case</span>
        <span><span className="text-gray-600 font-semibold">x</span> = étouffé</span>
        <span><span className="text-gray-600 font-semibold">h5</span> = hammer-on</span>
        <span><span className="text-gray-600 font-semibold">p5</span> = pull-off</span>
        <span><span className="text-gray-600 font-semibold">/5</span> = slide ↑</span>
        <span><span className="text-gray-600 font-semibold">\5</span> = slide ↓</span>
        <span><span className="text-gray-600 font-semibold">b5</span> = bend</span>
        {isChef && (
          <span className="ml-auto text-gray-300">← → ↑ ↓ pour naviguer · Tab = colonne suivante</span>
        )}
      </div>

      {/* ── TAB GRID ────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="min-w-max p-5 font-mono select-none">

          {/* Measure number header */}
          <div className="flex mb-0.5 pl-9">
            {tab.measures.map((_, m) => (
              <div key={m} className="flex items-center flex-shrink-0">
                <div className="w-px bg-gray-300 h-3 self-end" />
                <div
                  className="text-center text-[10px] text-gray-400 font-sans font-medium"
                  style={{ width: tab.colsPerMeasure * 28 }}
                >
                  {m + 1}
                </div>
              </div>
            ))}
            <div className="w-px bg-gray-400 h-3 self-end" />
          </div>

          {/* String rows */}
          {displayStrings.map((label, displayIdx) => {
            const s = numStrings - 1 - displayIdx
            const colorClass = STRING_COLORS[s] ?? 'text-gray-500'
            const isTopRow = displayIdx === 0
            const isBottomRow = displayIdx === numStrings - 1

            return (
              <div key={s} className="flex items-center" style={{ height: 36 }}>
                {/* String label */}
                <div className={`w-8 text-xs font-bold text-right pr-2 flex-shrink-0 font-mono ${colorClass}`}>
                  {label}
                </div>

                {/* Measures */}
                {tab.measures.map((measure, m) => (
                  <div key={m} className="flex items-center h-full flex-shrink-0">
                    {/* Measure bar */}
                    <div
                      className={`flex-shrink-0 self-stretch ${
                        isTopRow ? 'mt-2' : isBottomRow ? 'mb-2' : ''
                      } ${m === 0 ? 'w-px bg-gray-500' : 'w-px bg-gray-300'}`}
                    />

                    {/* Cells */}
                    {measure.map((col, c) => {
                      const cellKey = `${m}-${c}-${s}`
                      const val = col[s]
                      const isSel = selected?.m === m && selected?.c === c && selected?.s === s

                      return (
                        <div
                          key={c}
                          className="relative flex items-center justify-center flex-shrink-0"
                          style={{ width: 28, height: '100%' }}
                        >
                          {/* Horizontal string line */}
                          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gray-200 pointer-events-none" />

                          {/* Cell */}
                          <input
                            ref={(el) => {
                              if (el) cellRefs.current.set(cellKey, el)
                              else cellRefs.current.delete(cellKey)
                            }}
                            value={val ?? ''}
                            onChange={(e) => {
                              if (!isChef) return
                              const cleaned = cleanInput(e.target.value)
                              updateCell(m, c, s, cleaned || null)
                            }}
                            onFocus={() => setSelected({ m, c, s })}
                            onKeyDown={(e) => handleKeyDown(e, m, c, s)}
                            readOnly={!isChef}
                            maxLength={3}
                            autoComplete="off"
                            spellCheck={false}
                            className={`relative z-10 w-6 h-6 text-center text-[11px] font-mono font-semibold
                              border-0 focus:outline-none rounded transition-all duration-100
                              ${isSel
                                ? 'bg-indigo-500 text-white shadow-md ring-2 ring-indigo-300'
                                : val
                                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                                : 'bg-transparent text-transparent'
                              }
                              ${isChef ? 'cursor-text' : 'cursor-default'}
                            `}
                          />
                        </div>
                      )
                    })}
                  </div>
                ))}

                {/* End double bar */}
                <div
                  className={`flex-shrink-0 flex gap-0.5 self-stretch ${
                    isTopRow ? 'mt-2' : isBottomRow ? 'mb-2' : ''
                  }`}
                >
                  <div className="w-px bg-gray-500" />
                  <div className="w-0.5 bg-gray-500" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chef footer */}
      {isChef && (
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {tab.measures.length} mesure{tab.measures.length > 1 ? 's' : ''} · {instrConfig.name} · {tab.colsPerMeasure} cases/mesure
          </p>
          <button
            onClick={async () => {
              if (!confirm('Réinitialiser la tablature (effacer toutes les notes) ?')) return
              await fetch(`/api/morceaux/${songId}/tablature`, { method: 'DELETE' })
              const t = createDefaultTab()
              setTab(t)
              setSavedTab(JSON.stringify(t))
              setSaveStatus('saved')
              setSelected(null)
            }}
            className="text-xs text-red-400 hover:text-red-600 font-medium"
          >
            Réinitialiser la tablature
          </button>
        </div>
      )}
    </div>
  )
}

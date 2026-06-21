'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AccidentalPreference, semitonesBetween, transposeText } from '@/lib/transposition'

type ChartData = {
  id: number
  groupId: number
  title: string
  keySignature?: string | null
  cells: unknown
}

const NOTES = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B']

function chartCellsToText(cells: unknown): string {
  if (!Array.isArray(cells)) return ''
  return cells.map((item, index) => {
    if (typeof item === 'string') return item
    if (Array.isArray(item)) return item.filter(Boolean).join(' ')
    if (item && typeof item === 'object' && 'b' in item) {
      const bar = item as { l?: unknown; b?: unknown; r?: unknown }
      const left = typeof bar.l === 'string' ? bar.l : ''
      const beats = Array.isArray(bar.b) ? bar.b.filter((v) => typeof v === 'string' && v.trim()).join(' ') : ''
      const right = typeof bar.r === 'string' ? bar.r : ''
      return [left, beats, right].filter(Boolean).join(' ')
    }
    if (item && typeof item === 'object' && 'chord' in item) {
      const legacy = item as { chord?: unknown }
      return typeof legacy.chord === 'string' ? legacy.chord : ''
    }
    return ''
  }).map((line, index) => `${String(index + 1).padStart(2, '0')} | ${line}`).join('\n')
}

export default function TranspositionPage() {
  const searchParams = useSearchParams()
  const chartId = searchParams.get('chartId')
  const groupId = searchParams.get('groupId')

  const [source, setSource] = useState('')
  const [chart, setChart] = useState<ChartData | null>(null)
  const [mode, setMode] = useState<'interval' | 'keys'>('interval')
  const [semitones, setSemitones] = useState(2)
  const [fromKey, setFromKey] = useState('C')
  const [toKey, setToKey] = useState('D')
  const [preference, setPreference] = useState<AccidentalPreference>('auto')
  const [loadingChart, setLoadingChart] = useState(false)
  const [fileMsg, setFileMsg] = useState('')
  const [savingCopy, setSavingCopy] = useState(false)
  const [copyMsg, setCopyMsg] = useState('')

  const effectiveSemitones = useMemo(() => {
    if (mode === 'interval') return semitones
    return semitonesBetween(fromKey, toKey) ?? 0
  }, [fromKey, mode, semitones, toKey])

  const result = useMemo(() => transposeText(source, effectiveSemitones, preference), [effectiveSemitones, preference, source])

  useEffect(() => {
    if (!chartId) return
    setLoadingChart(true)
    fetch(`/api/grilles/${chartId}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data: ChartData | null) => {
        if (!data) return
        setChart(data)
        setSource(chartCellsToText(data.cells))
        if (data.keySignature) {
          setFromKey(data.keySignature)
          setMode('keys')
        }
      })
      .finally(() => setLoadingChart(false))
  }, [chartId])

  const handleFile = async (file?: File | null) => {
    if (!file) return
    setFileMsg('')
    const lower = file.name.toLowerCase()
    if (lower.endsWith('.txt') || lower.endsWith('.cho') || lower.endsWith('.chordpro')) {
      setSource(await file.text())
      setFileMsg('Texte importé.')
      return
    }
    if (lower.endsWith('.pdf')) {
      try {
        const { pdfjs } = await import('react-pdf')
        const buffer = await file.arrayBuffer()
        const pdf = await pdfjs.getDocument({ data: buffer, disableWorker: true }).promise
        const pages: string[] = []
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          pages.push(textContent.items.map((item: any) => typeof item.str === 'string' ? item.str : '').join(' '))
        }
        setSource(pages.join('\n\n'))
        setFileMsg(`PDF importé (${pdf.numPages} page${pdf.numPages > 1 ? 's' : ''}). Relisez vite le texte extrait : certains PDF scannés ne contiennent pas de texte.`)
      } catch {
        setFileMsg("Impossible d'extraire le texte de ce PDF. S'il s'agit d'un scan ou d'une image, copiez/collez la grille dans la zone de texte.")
      }
      return
    }
    setFileMsg('Format non pris en charge. Utilisez un PDF texte ou un fichier .txt/.cho.')
  }

  const createTransposedCopy = async () => {
    if (!chart) return
    setSavingCopy(true)
    setCopyMsg('')
    const res = await fetch(`/api/grilles/${chart.id}/transpose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        semitones: effectiveSemitones,
        fromKey,
        toKey,
        preference,
      }),
    })
    setSavingCopy(false)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setCopyMsg(data.error || 'Impossible de créer la copie transposée.')
      return
    }
    window.location.href = `/groupes/${data.groupId}/grilles/${data.id}`
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/tableau-de-bord" className="hover:text-indigo-600">Tableau de bord</Link>
            <span>/</span>
            <span className="text-gray-900">Transposition</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Transposition automatique</h1>
          <p className="mt-1 text-sm text-gray-500">Transposez une grille, un texte d'accords ou un PDF texte sans modifier l'original.</p>
        </div>
        {chart && groupId && (
          <Link href={`/groupes/${groupId}/grilles/${chart.id}`} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Retour à la grille
          </Link>
        )}
      </div>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-indigo-900">Source</label>
            <div className="text-sm text-indigo-900">
              {loadingChart ? 'Chargement de la grille...' : chart ? <>Grille : <strong>{chart.title}</strong></> : 'Collez une grille ou importez un fichier.'}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-indigo-900">Mode</label>
            <div className="inline-flex rounded-xl border border-indigo-200 bg-white p-1 text-sm">
              <button onClick={() => setMode('interval')} className={`rounded-lg px-3 py-1.5 font-semibold ${mode === 'interval' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>Demi-tons</button>
              <button onClick={() => setMode('keys')} className={`rounded-lg px-3 py-1.5 font-semibold ${mode === 'keys' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>Tonalités</button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-indigo-900">Altérations</label>
            <select value={preference} onChange={(e) => setPreference(e.target.value as AccidentalPreference)} className="form-input bg-white">
              <option value="auto">Auto</option>
              <option value="sharp">Dièses (#)</option>
              <option value="flat">Bémols (b)</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {mode === 'interval' ? (
            <div>
              <label className="form-label">Décalage</label>
              <select value={semitones} onChange={(e) => setSemitones(Number(e.target.value))} className="form-input bg-white">
                {Array.from({ length: 25 }, (_, i) => i - 12).map((n) => (
                  <option key={n} value={n}>{n > 0 ? `+${n}` : n} demi-ton{Math.abs(n) > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="form-label">De</label>
                <select value={fromKey} onChange={(e) => setFromKey(e.target.value)} className="form-input bg-white">
                  {NOTES.map((note) => <option key={note} value={note}>{note}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Vers</label>
                <select value={toKey} onChange={(e) => setToKey(e.target.value)} className="form-input bg-white">
                  {NOTES.map((note) => <option key={note} value={note}>{note}</option>)}
                </select>
              </div>
            </>
          )}
          <div className="flex items-end">
            <div className="rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm text-gray-700">
              Décalage appliqué : <strong>{effectiveSemitones > 0 ? `+${effectiveSemitones}` : effectiveSemitones}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-bold text-gray-900">Original</h2>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100">
              Import PDF / texte
              <input type="file" accept=".pdf,.txt,.cho,.chordpro,text/plain,application/pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
          </div>
          {fileMsg && <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{fileMsg}</div>}
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            rows={18}
            className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 p-3 font-mono text-sm text-gray-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            placeholder={'Ex :\n| Am | F | C | G |\n[Couplet]\nAm             F\nVoici une ligne avec accords'}
          />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-bold text-gray-900">Transposé</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => navigator.clipboard?.writeText(result)} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100">
                Copier
              </button>
              {chart && (
                <button onClick={createTransposedCopy} disabled={savingCopy} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
                  {savingCopy ? 'Création...' : 'Créer une copie grille'}
                </button>
              )}
            </div>
          </div>
          {copyMsg && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{copyMsg}</div>}
          <pre className="min-h-[475px] whitespace-pre-wrap rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 font-mono text-sm leading-relaxed text-gray-900">{result || 'Le résultat apparaîtra ici.'}</pre>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-600">
        <h2 className="mb-2 font-bold text-gray-900">Ce que l'outil reconnaît</h2>
        <p>Accords simples et enrichis : <code className="rounded bg-gray-100 px-1">C</code>, <code className="rounded bg-gray-100 px-1">Am</code>, <code className="rounded bg-gray-100 px-1">F#m7b5</code>, <code className="rounded bg-gray-100 px-1">Bbmaj7</code>, <code className="rounded bg-gray-100 px-1">D/F#</code>. Les notes françaises courantes sont aussi acceptées : Do, Ré, Mi, Fa, Sol, La, Si.</p>
      </section>
    </div>
  )
}

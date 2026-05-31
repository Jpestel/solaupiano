'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { LyricsPrompter } from '@/components/ui/LyricsPrompter'

// ─── Marker config ──────────────────────────────────────────────────────────
const MARKERS = [
  { label: 'Intro',       color: 'indigo' },
  { label: 'Couplet 1',   color: 'blue'   },
  { label: 'Couplet 2',   color: 'blue'   },
  { label: 'Couplet 3',   color: 'blue'   },
  { label: 'Pré-refrain', color: 'amber'  },
  { label: 'Refrain',     color: 'rose'   },
  { label: 'Bridge',      color: 'purple' },
  { label: 'Outro',       color: 'gray'   },
  { label: 'Spoken',      color: 'teal'   },
  { label: '×2',          color: 'green'  },
  { label: '×3',          color: 'green'  },
]

const MARKER_COLORS: Record<string, { bg: string; text: string; border: string; print: string }> = {
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', print: '#4f46e5' },
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   print: '#2563eb' },
  amber:  { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200',  print: '#d97706' },
  rose:   { bg: 'bg-rose-100',   text: 'text-rose-700',   border: 'border-rose-200',   print: '#e11d48' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', print: '#9333ea' },
  gray:   { bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-200',   print: '#6b7280' },
  teal:   { bg: 'bg-teal-100',   text: 'text-teal-700',   border: 'border-teal-200',   print: '#0d9488' },
  green:  { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  print: '#16a34a' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getMarkerColor(label: string) {
  const m = MARKERS.find((mk) => mk.label === label)
  return m ? MARKER_COLORS[m.color] : MARKER_COLORS.gray
}

function parseLyrics(content: string) {
  const lines = content.split('\n')
  const result: { type: 'marker' | 'text' | 'empty'; value: string }[] = []
  for (const line of lines) {
    const markerMatch = line.match(/^\[(.+?)\]$/)
    if (markerMatch) {
      result.push({ type: 'marker', value: markerMatch[1] })
    } else if (line.trim() === '') {
      result.push({ type: 'empty', value: '' })
    } else {
      result.push({ type: 'text', value: line })
    }
  }
  return result
}

// ─── Formatted lyrics renderer ───────────────────────────────────────────────
function LyricsDisplay({ content, large = false }: { content: string; large?: boolean }) {
  const parsed = parseLyrics(content)
  return (
    <div className={`space-y-0.5 ${large ? 'text-2xl leading-relaxed' : 'text-sm leading-relaxed'}`}>
      {parsed.map((item, i) => {
        if (item.type === 'marker') {
          const c = getMarkerColor(item.value)
          return (
            <div key={i} className="pt-4 pb-1">
              <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${c.bg} ${c.text} ${c.border} ${large ? 'text-sm px-4 py-1' : ''}`}>
                {item.value}
              </span>
            </div>
          )
        }
        if (item.type === 'empty') {
          return <div key={i} className="h-3" />
        }
        return (
          <p key={i} className={`text-gray-800 ${large ? 'font-medium' : ''}`}>
            {item.value}
          </p>
        )
      })}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function ParolesPage({
  params,
}: {
  params: { id: string; songId: string }
}) {
  const { data: session } = useSession()
  const groupId = params.id
  const songId = params.songId

  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [songTitle, setSongTitle] = useState('')
  const [songArtist, setSongArtist] = useState('')
  const [songTempo, setSongTempo] = useState<number | null>(null)
  const [groupName, setGroupName] = useState('')
  const [isChef, setIsChef] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const [stageMode, setStageMode] = useState(false)
  const [prompterMode, setPrompterMode] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Fetch ──
  useEffect(() => {
    if (!session) return
    const load = async () => {
      const [songRes, lyricsRes, grpRes] = await Promise.all([
        fetch(`/api/groupes/${groupId}/morceaux`),
        fetch(`/api/morceaux/${songId}/paroles`),
        fetch(`/api/groupes/${groupId}`),
      ])
      if (songRes.ok) {
        const songs = await songRes.json()
        const song = songs.find((s: { id: number; title: string; artist?: string; tempo?: number }) => s.id === Number(songId))
        if (song) { setSongTitle(song.title); setSongArtist(song.artist || ''); setSongTempo(song.tempo ?? null) }
      }
      if (lyricsRes.ok) {
        const data = await lyricsRes.json()
        setContent(data.content || '')
        setSavedContent(data.content || '')
      }
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

  // ── Auto-save ──
  const save = useCallback(async (text: string) => {
    setSaveStatus('saving')
    await fetch(`/api/morceaux/${songId}/paroles`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    })
    setSavedContent(text)
    setSaveStatus('saved')
  }, [songId])

  const handleChange = (val: string) => {
    setContent(val)
    setSaveStatus('unsaved')
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => save(val), 800)
  }

  // ── Insert marker ──
  const insertMarker = (label: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = content.slice(0, start)
    const after = content.slice(end)
    const needsNewlineBefore = before.length > 0 && !before.endsWith('\n')
    const needsNewlineAfter = after.length > 0 && !after.startsWith('\n')
    const insertion = `${needsNewlineBefore ? '\n' : ''}[${label}]\n${needsNewlineAfter ? '\n' : ''}`
    const newContent = before + insertion + after
    handleChange(newContent)
    setTimeout(() => {
      const newPos = start + insertion.length
      ta.selectionStart = ta.selectionEnd = newPos
      ta.focus()
    }, 0)
  }

  // ── Print ──
  const handlePrint = () => {
    const parsed = parseLyrics(content)
    const html = parsed.map((item) => {
      if (item.type === 'marker') {
        const c = getMarkerColor(item.value)
        return `<div class="marker" style="color:${c.print};margin-top:18px;margin-bottom:4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">${item.value}</div>`
      }
      if (item.type === 'empty') return '<div style="height:8px"></div>'
      return `<p style="margin:0;line-height:1.7;font-size:13px;color:#111;">${item.value}</p>`
    }).join('')

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html><html><head>
        <meta charset="utf-8">
        <title>${songTitle}</title>
        <style>
          @page { margin: 20mm 18mm; }
          body { font-family: Georgia, serif; color: #111; }
          header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #ccc; padding-bottom: 8px; margin-bottom: 20px; }
          h1 { margin:0; font-size: 20px; font-weight: 700; }
          .artist { font-size: 13px; color: #666; font-style: italic; }
          .group { font-size: 11px; color: #999; }
          @media print { button { display: none; } }
        </style>
      </head><body>
        <header>
          <div>
            <h1>${songTitle}</h1>
            ${songArtist ? `<div class="artist">${songArtist}</div>` : ''}
          </div>
          <div class="group">${groupName}</div>
        </header>
        ${html}
        <script>window.onload=()=>{window.print();window.close();}<\/script>
      </body></html>
    `)
    win.document.close()
  }

  // ── Stage mode keyboard close ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setStageMode(false) }
    if (stageMode) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stageMode])

  if (loading) return <div className="text-gray-500 p-6">Chargement...</div>

  const isDirty = content !== savedContent

  // ── Prompteur overlay ──
  if (prompterMode) {
    return (
      <LyricsPrompter
        content={content}
        title={songTitle}
        artist={songArtist}
        bpm={songTempo}
        onClose={() => setPrompterMode(false)}
      />
    )
  }

  // ── Stage mode overlay ──
  if (stageMode) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 text-white overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">{songTitle}</h1>
              {songArtist && <p className="text-gray-400 text-lg mt-1">{songArtist}</p>}
            </div>
            <div className="flex-shrink-0 ml-4 flex items-center gap-2">
              <button
                onClick={() => setPrompterMode(true)}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors"
                title="Lancer le défilement automatique selon le tempo"
              >
                📜 Prompteur
              </button>
              <button
                onClick={() => setStageMode(false)}
                className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                ✕ Quitter
              </button>
            </div>
          </div>

          {/* Lyrics */}
          <div className="space-y-0.5">
            {parseLyrics(content).map((item, i) => {
              if (item.type === 'marker') {
                const c = getMarkerColor(item.value)
                return (
                  <div key={i} className="pt-6 pb-2">
                    <span className={`inline-flex items-center rounded-full border px-4 py-1 text-sm font-bold uppercase tracking-wider ${c.bg} ${c.text} ${c.border} opacity-90`}>
                      {item.value}
                    </span>
                  </div>
                )
              }
              if (item.type === 'empty') return <div key={i} className="h-4" />
              return (
                <p key={i} className="text-2xl leading-relaxed text-white font-medium">
                  {item.value}
                </p>
              )
            })}
          </div>

          {/* Bottom close */}
          <div className="mt-16 text-center">
            <button onClick={() => setStageMode(false)} className="text-gray-500 hover:text-gray-300 text-sm">
              Appuyez sur Échap ou cliquez ici pour quitter le mode scène
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Normal page ──
  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 mb-2 min-w-0">
        <Link href="/groupes" className="hover:text-indigo-600 shrink-0">Mes groupes</Link>
        <span className="shrink-0">/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600 truncate max-w-[100px] sm:max-w-[160px]">{groupName}</Link>
        <span className="shrink-0">/</span>
        <Link href={`/groupes/${groupId}/morceaux`} className="hover:text-indigo-600 shrink-0">Répertoire</Link>
        <span className="shrink-0">/</span>
        <span className="text-gray-900 truncate max-w-[100px] sm:max-w-[140px]">{songTitle}</span>
        <span className="shrink-0">/</span>
        <span className="text-gray-900 shrink-0">Paroles</span>
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🎤 {songTitle}
          </h1>
          {songArtist && <p className="text-gray-500 text-sm mt-0.5">{songArtist}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Save status */}
          {isChef && (
            <span className={`text-xs font-medium ${
              saveStatus === 'saved' ? 'text-green-600' :
              saveStatus === 'saving' ? 'text-amber-500' : 'text-gray-400'
            }`}>
              {saveStatus === 'saved' ? '✓ Sauvegardé' : saveStatus === 'saving' ? '⏳ Sauvegarde...' : '● Non sauvegardé'}
            </span>
          )}
          {/* Print */}
          {content.trim() && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimer
            </button>
          )}
          {/* Stage mode */}
          {content.trim() && (
            <button
              onClick={() => setStageMode(true)}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Mode scène
            </button>
          )}
          {/* Prompteur */}
          {content.trim() && (
            <button
              onClick={() => setPrompterMode(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
              title="Défilement automatique des paroles selon le tempo"
            >
              📜 Prompteur
            </button>
          )}
        </div>
      </div>

      {/* Tabs (only if chef — members go straight to preview) */}
      {isChef ? (
        <div className="flex gap-1 mb-4 border-b border-gray-200">
          {(['edit', 'preview'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'edit' ? '✏️ Éditeur' : '👁 Aperçu'}
            </button>
          ))}
        </div>
      ) : null}

      {/* ── EDITOR tab ── */}
      {(isChef && activeTab === 'edit') && (
        <div className="space-y-3">
          {/* Marker toolbar */}
          <div className="flex flex-wrap gap-1.5">
            {MARKERS.map((mk) => {
              const c = MARKER_COLORS[mk.color]
              return (
                <button
                  key={mk.label}
                  onClick={() => insertMarker(mk.label)}
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-opacity hover:opacity-80 ${c.bg} ${c.text} ${c.border}`}
                >
                  + {mk.label}
                </button>
              )
            })}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Saisissez les paroles ici...\n\nAstuce : cliquez sur les boutons ci-dessus pour insérer des marqueurs de structure comme [Refrain], [Couplet 1], etc.`}
            className="w-full min-h-[480px] rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-y placeholder:text-gray-300 placeholder:font-sans"
            spellCheck
          />

          <p className="text-xs text-gray-400">
            Entourez un nom de section de crochets pour créer un marqueur, ex : <code className="bg-gray-100 rounded px-1">[Refrain]</code> <code className="bg-gray-100 rounded px-1">[Couplet 1]</code>
          </p>
        </div>
      )}

      {/* ── PREVIEW / read-only ── */}
      {(!isChef || activeTab === 'preview') && (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
          {content.trim() ? (
            <LyricsDisplay content={content} />
          ) : (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🎤</p>
              <p className="font-medium text-gray-500">Aucune parole saisie pour ce morceau.</p>
              {isChef && (
                <button onClick={() => setActiveTab('edit')} className="mt-3 text-sm text-indigo-600 hover:underline">
                  Commencer à saisir →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete lyrics */}
      {isChef && content.trim() && (
        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={async () => {
              if (!confirm('Supprimer toutes les paroles de ce morceau ?')) return
              await fetch(`/api/morceaux/${songId}/paroles`, { method: 'DELETE' })
              setContent('')
              setSavedContent('')
              setSaveStatus('saved')
            }}
            className="text-xs text-red-400 hover:text-red-600 font-medium"
          >
            Supprimer les paroles
          </button>
        </div>
      )}
    </div>
  )
}

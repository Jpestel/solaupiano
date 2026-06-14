'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Bubble {
  id: number
  path: string
  xPct: number
  yPx: number
  title: string
  content: string
  emoji: string
  color: string
  audience: string
  active: boolean
}

const COLORS: Record<string, { ring: string; dot: string; accent: string; text: string }> = {
  indigo: { ring: 'bg-indigo-400', dot: 'bg-indigo-600', accent: 'border-indigo-200', text: 'text-indigo-700' },
  amber:  { ring: 'bg-amber-400',  dot: 'bg-amber-500',  accent: 'border-amber-200',  text: 'text-amber-700' },
  green:  { ring: 'bg-green-400',  dot: 'bg-green-600',  accent: 'border-green-200',  text: 'text-green-700' },
  sky:    { ring: 'bg-sky-400',    dot: 'bg-sky-600',    accent: 'border-sky-200',    text: 'text-sky-700' },
  rose:   { ring: 'bg-rose-400',   dot: 'bg-rose-600',   accent: 'border-rose-200',   text: 'text-rose-700' },
  purple: { ring: 'bg-purple-400', dot: 'bg-purple-600', accent: 'border-purple-200', text: 'text-purple-700' },
}
const COLOR_KEYS = Object.keys(COLORS)
const AUDIENCES: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Tout le monde' },
  { value: 'MEMBERS', label: 'Membres uniquement' },
  { value: 'CHEFS', label: "Chefs d'orchestre" },
  { value: 'ADMINS', label: 'Admins (test)' },
]
const EMOJIS = ['💡', 'ℹ️', '✨', '👉', '🎯', '⭐', '🔔', '❓', '🎵', '🚀']

export default function HelpBubbleLayer() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.siteRole === 'ADMIN'

  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [openId, setOpenId] = useState<number | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [editor, setEditor] = useState<Partial<Bubble> | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Restaure le mode édition entre les navigations (admin uniquement)
  useEffect(() => {
    if (isAdmin && sessionStorage.getItem('bulles-edit') === '1') setEditMode(true)
  }, [isAdmin])

  const load = useCallback(async () => {
    if (!pathname) return
    const qs = `path=${encodeURIComponent(pathname)}${isAdmin && editMode ? '&edit=1' : ''}`
    try {
      const res = await fetch(`/api/bulles?${qs}`)
      if (res.ok) setBubbles(await res.json())
    } catch { /* ignore */ }
  }, [pathname, isAdmin, editMode])
  useEffect(() => { load() }, [load])

  // Fermeture du popover quand on change de page
  useEffect(() => { setOpenId(null); setPlacing(false); setEditor(null) }, [pathname])

  const toggleEdit = () => {
    setEditMode((v) => {
      const next = !v
      sessionStorage.setItem('bulles-edit', next ? '1' : '0')
      if (!next) { setPlacing(false); setEditor(null) }
      return next
    })
  }

  // Dépose une nouvelle bulle au point cliqué
  const onOverlayClick = (e: React.MouseEvent) => {
    if (!placing || !overlayRef.current) return
    const rect = overlayRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = e.clientY - rect.top
    setPlacing(false)
    setEditor({ xPct: Math.max(0, Math.min(100, x)), yPx: Math.max(0, Math.round(y)), title: '', content: '', emoji: '💡', color: 'indigo', audience: 'ALL', active: true })
  }

  // Glisser-déposer d'une bulle existante (mode édition)
  const dragRef = useRef<{ id: number; moved: boolean } | null>(null)
  const onDotPointerDown = (e: React.PointerEvent, b: Bubble) => {
    if (!editMode) return
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    dragRef.current = { id: b.id, moved: false }
  }
  const onDotPointerMove = (e: React.PointerEvent, b: Bubble) => {
    if (!dragRef.current || dragRef.current.id !== b.id || !overlayRef.current) return
    dragRef.current.moved = true
    const rect = overlayRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.round(e.clientY - rect.top))
    setBubbles((prev) => prev.map((p) => (p.id === b.id ? { ...p, xPct: x, yPx: y } : p)))
  }
  const onDotPointerUp = async (e: React.PointerEvent, b: Bubble) => {
    if (!dragRef.current || dragRef.current.id !== b.id) return
    const moved = dragRef.current.moved
    dragRef.current = null
    if (!moved) { // simple clic
      if (editMode) openEditor(b)
      else setOpenId((id) => (id === b.id ? null : b.id))
      return
    }
    const cur = bubbles.find((p) => p.id === b.id)
    if (cur) {
      await fetch(`/api/bulles/${b.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ xPct: cur.xPct, yPx: cur.yPx }) })
    }
  }

  const openEditor = (b: Bubble) => setEditor({ ...b })

  const saveEditor = async () => {
    if (!editor) return
    const payload = {
      path: pathname,
      xPct: editor.xPct ?? 50,
      yPx: editor.yPx ?? 0,
      title: editor.title ?? '',
      content: editor.content ?? '',
      emoji: editor.emoji ?? '💡',
      color: editor.color ?? 'indigo',
      audience: editor.audience ?? 'ALL',
      active: editor.active !== false,
    }
    if (editor.id) {
      await fetch(`/api/bulles/${editor.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      await fetch('/api/bulles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setEditor(null)
    load()
  }

  const deleteBubble = async (id: number) => {
    if (!confirm('Supprimer cette bulle ?')) return
    await fetch(`/api/bulles/${id}`, { method: 'DELETE' })
    setEditor(null)
    load()
  }

  if (!session) return null

  return (
    <>
      {/* Couche des bulles, superposée au contenu de la page */}
      <div
        ref={overlayRef}
        onClick={onOverlayClick}
        className="absolute inset-0 z-20"
        style={{ pointerEvents: placing ? 'auto' : 'none', cursor: placing ? 'crosshair' : 'default' }}
      >
        {bubbles.map((b) => {
          const c = COLORS[b.color] || COLORS.indigo
          const isOpen = openId === b.id
          return (
            <div key={b.id} className="absolute" style={{ left: `${b.xPct}%`, top: `${b.yPx}px`, pointerEvents: 'auto', transform: 'translate(-50%, -50%)' }}>
              {/* Marqueur pulsant */}
              <button
                onPointerDown={(e) => onDotPointerDown(e, b)}
                onPointerMove={(e) => onDotPointerMove(e, b)}
                onPointerUp={(e) => onDotPointerUp(e, b)}
                title={editMode ? 'Glisser pour déplacer · cliquer pour éditer' : b.title}
                className={`relative flex items-center justify-center w-8 h-8 rounded-full text-white shadow-lg ${c.dot} ${editMode ? 'cursor-move ring-2 ring-white' : 'cursor-pointer'}`}
                style={{ touchAction: 'none' }}
              >
                {!editMode && <span className={`absolute inset-0 rounded-full ${c.ring} opacity-60 animate-ping`} />}
                <span className="relative text-sm leading-none">{b.emoji}</span>
              </button>

              {/* Popover (lecture) */}
              {isOpen && !editMode && (
                <div className={`absolute left-1/2 top-10 -translate-x-1/2 w-64 rounded-xl border bg-white shadow-xl p-3 ${c.accent}`} style={{ zIndex: 30 }}>
                  {b.title && <p className={`text-sm font-bold mb-1 ${c.text}`}>{b.emoji} {b.title}</p>}
                  {b.content && <p className="text-sm text-gray-700 whitespace-pre-wrap">{b.content}</p>}
                  <button onClick={() => setOpenId(null)} className="mt-2 w-full rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200">J&apos;ai compris</button>
                </div>
              )}

              {/* Badge d'audience en mode édition */}
              {editMode && b.audience !== 'ALL' && (
                <span className="absolute left-1/2 top-9 -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-800 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                  {AUDIENCES.find((a) => a.value === b.audience)?.label}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Barre d'outils admin (fixe) */}
      {isAdmin && (
        <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
          {!editMode ? (
            <button onClick={toggleEdit} title="Gérer les bulles d'aide" className="flex items-center gap-1.5 rounded-full bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-lg hover:bg-gray-700">
              💡 Bulles
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-full bg-gray-900 px-2 py-1.5 shadow-lg">
              <span className="pl-1 text-xs font-semibold text-amber-300">Édition</span>
              <button onClick={() => setPlacing((p) => !p)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${placing ? 'bg-amber-400 text-gray-900' : 'bg-white/15 text-white hover:bg-white/25'}`}>
                {placing ? 'Cliquez sur la page…' : '＋ Ajouter ici'}
              </button>
              <button onClick={toggleEdit} className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25">Terminer</button>
            </div>
          )}
        </div>
      )}

      {/* Éditeur de bulle (création / modification) */}
      {editor && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setEditor(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900">{editor.id ? 'Modifier la bulle' : 'Nouvelle bulle'}</h3>
              <button onClick={() => setEditor(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <label className="block text-xs font-semibold text-gray-600 mb-1">Titre</label>
            <input value={editor.title ?? ''} onChange={(e) => setEditor({ ...editor, title: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-3" placeholder="Ex : Créer un groupe" />

            <label className="block text-xs font-semibold text-gray-600 mb-1">Texte de l&apos;astuce</label>
            <textarea value={editor.content ?? ''} onChange={(e) => setEditor({ ...editor, content: e.target.value })} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-3" placeholder="Clique ici pour…" />

            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Icône</label>
                <div className="flex flex-wrap gap-1">
                  {EMOJIS.map((em) => (
                    <button key={em} onClick={() => setEditor({ ...editor, emoji: em })} className={`w-8 h-8 rounded-lg text-base ${editor.emoji === em ? 'bg-indigo-100 ring-2 ring-indigo-400' : 'bg-gray-100 hover:bg-gray-200'}`}>{em}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Couleur</label>
                <div className="flex gap-1.5">
                  {COLOR_KEYS.map((ck) => (
                    <button key={ck} onClick={() => setEditor({ ...editor, color: ck })} className={`w-7 h-7 rounded-full ${COLORS[ck].dot} ${editor.color === ck ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`} title={ck} />
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Qui la voit ?</label>
                <select value={editor.audience ?? 'ALL'} onChange={(e) => setEditor({ ...editor, audience: e.target.value })} className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm">
                  {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 mb-4 cursor-pointer">
              <input type="checkbox" checked={editor.active !== false} onChange={(e) => setEditor({ ...editor, active: e.target.checked })} className="rounded border-gray-300" />
              Active (visible par les utilisateurs)
            </label>

            <div className="flex items-center gap-2">
              <button onClick={saveEditor} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500">{editor.id ? 'Enregistrer' : 'Créer la bulle'}</button>
              {editor.id && <button onClick={() => deleteBubble(editor.id!)} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Supprimer</button>}
            </div>
            <p className="mt-2 text-[11px] text-gray-400">Page : <code>{pathname}</code></p>
          </div>
        </div>
      )}
    </>
  )
}

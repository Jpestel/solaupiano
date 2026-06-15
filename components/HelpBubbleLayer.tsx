'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Bubble {
  id: number
  path: string
  xPct: number
  yPx: number
  anchorSelector?: string | null
  anchorDx?: number | null
  anchorDy?: number | null
  targetUserIds?: string | null
  title: string
  content: string
  emoji: string
  color: string
  audience: string
  active: boolean
}

// ─── Ancrage à un élément visible ───────────────────────────────────────────
function cssEscape(s: string): string {
  const w = window as unknown as { CSS?: { escape?: (v: string) => string } }
  if (w.CSS?.escape) return w.CSS.escape(s)
  return s.replace(/["\\]/g, '\\$&')
}

// Cherche un sélecteur stable (data-bubble, id, lien, data-testid) sur l'élément ou ses parents proches.
function buildSelector(el: Element | null): string | null {
  const uniq = (s: string): string | null => { try { return document.querySelectorAll(s).length === 1 ? s : null } catch { return null } }
  let cur: Element | null = el
  for (let depth = 0; cur && depth < 8; depth++, cur = cur.parentElement) {
    // Ancre dédiée, indépendante du rôle/groupe (prioritaire)
    const db = cur.getAttribute('data-bubble')
    if (db) { const s = uniq(`[data-bubble="${db.replace(/"/g, '\\"')}"]`); if (s) return s }
    const id = (cur as HTMLElement).id
    if (id) { const s = uniq(`#${cssEscape(id)}`); if (s) return s }
    const tag = cur.tagName.toLowerCase()
    const href = cur.getAttribute('href')
    if (tag === 'a' && href) { const s = uniq(`a[href="${href.replace(/"/g, '\\"')}"]`); if (s) return s }
    const testid = cur.getAttribute('data-testid')
    if (testid) { const s = uniq(`[data-testid="${testid.replace(/"/g, '\\"')}"]`); if (s) return s }
  }
  return null
}

function computeAnchor(target: Element | null, clientX: number, clientY: number): { anchorSelector: string | null; anchorDx: number | null; anchorDy: number | null } {
  const sel = buildSelector(target)
  if (!sel) return { anchorSelector: null, anchorDx: null, anchorDy: null }
  const el = document.querySelector(sel)
  if (!el) return { anchorSelector: null, anchorDx: null, anchorDy: null }
  const r = el.getBoundingClientRect()
  const dx = r.width ? (clientX - r.left) / r.width : 0.5
  const dy = r.height ? (clientY - r.top) / r.height : 0.5
  return { anchorSelector: sel, anchorDx: Math.max(0, Math.min(1, dx)), anchorDy: Math.max(0, Math.min(1, dy)) }
}

// Élément réel sous un point, en ignorant TOUTE la couche des bulles (marqueurs inclus).
function elementUnder(overlay: HTMLElement | null, x: number, y: number): Element | null {
  const stack = document.elementsFromPoint(x, y)
  for (const el of stack) {
    if (overlay && overlay.contains(el)) continue // saute la couche + ses marqueurs
    return el
  }
  return null
}

const isGroupPath = (p: string | null) => !!p && /^\/groupes\/\d+/.test(p)

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
  { value: 'USERS', label: 'Utilisateurs précis' },
  { value: 'ADMINS', label: 'Admins (test)' },
]
function parseIdsString(s?: string | null): number[] {
  if (!s) return []
  try { const a = JSON.parse(s); return Array.isArray(a) ? a.filter((x) => Number.isInteger(x)) : [] } catch { return [] }
}
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
  const [hidden, setHidden] = useState(false) // préférence perso : masquer TOUTES les bulles
  const [positions, setPositions] = useState<Record<number, { left: number; top: number }>>({})
  const overlayRef = useRef<HTMLDivElement>(null)

  // Ciblage par utilisateurs (audience USERS)
  const [editorTargets, setEditorTargets] = useState<{ id: number; name: string; email: string }[]>([])
  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState<{ id: number; name: string; email: string }[]>([])

  // Réplication sur d'autres groupes
  const [replicateFor, setReplicateFor] = useState<number | null>(null)
  const [repGroups, setRepGroups] = useState<{ id: number; name: string }[]>([])
  const [repSelected, setRepSelected] = useState<number[]>([])
  const [repMsg, setRepMsg] = useState('')

  // Recalcule la position px des bulles ancrées (relativement à la couche).
  const resolveAnchors = useCallback(() => {
    const overlay = overlayRef.current
    if (!overlay) return
    const orr = overlay.getBoundingClientRect()
    const next: Record<number, { left: number; top: number }> = {}
    for (const b of bubbles) {
      if (!b.anchorSelector) continue
      let el: Element | null = null
      try { el = document.querySelector(b.anchorSelector) } catch { el = null }
      if (!el) continue
      const r = el.getBoundingClientRect()
      next[b.id] = {
        left: r.left - orr.left + (b.anchorDx ?? 0.5) * r.width,
        top: r.top - orr.top + (b.anchorDy ?? 0.5) * r.height,
      }
    }
    setPositions(next)
  }, [bubbles])

  useEffect(() => {
    resolveAnchors()
    const t1 = setTimeout(resolveAnchors, 300)
    const t2 = setTimeout(resolveAnchors, 1200)
    window.addEventListener('resize', resolveAnchors)
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('resize', resolveAnchors) }
  }, [resolveAnchors])

  // Masque cette bulle uniquement, pour cet utilisateur (mémorisé en base → visible par l'admin)
  const dismissOne = async (id: number) => {
    setOpenId(null)
    setBubbles((prev) => prev.filter((b) => b.id !== id)) // retrait immédiat
    await fetch(`/api/bulles/${id}/dismiss`, { method: 'POST' }).catch(() => {})
  }

  // Préférence d'affichage de l'utilisateur (relue à chaque page : le layout persiste,
  // donc on récupère un éventuel changement fait depuis le profil).
  useEffect(() => {
    fetch('/api/me/help-bubbles').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setHidden(!!d.hidden) }).catch(() => {})
  }, [pathname])

  const setHiddenPref = async (value: boolean) => {
    setHidden(value)
    setOpenId(null)
    await fetch('/api/me/help-bubbles', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hidden: value }) })
  }

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

  // Dépose une nouvelle bulle au point cliqué (ancrée à l'élément sous le clic si possible)
  const onOverlayClick = (e: React.MouseEvent) => {
    if (!placing || !overlayRef.current) return
    const overlay = overlayRef.current
    const rect = overlay.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = e.clientY - rect.top
    const target = elementUnder(overlay, e.clientX, e.clientY)
    const anchor = computeAnchor(target, e.clientX, e.clientY)
    setPlacing(false)
    setEditorTargets([]); setUserQuery(''); setUserResults([])
    setEditor({
      xPct: Math.max(0, Math.min(100, x)), yPx: Math.max(0, Math.round(y)),
      anchorSelector: anchor.anchorSelector, anchorDx: anchor.anchorDx, anchorDy: anchor.anchorDy,
      title: '', content: '', emoji: '💡', color: 'indigo', audience: 'ALL', active: true,
    })
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
    const leftPx = e.clientX - rect.left
    const topPx = e.clientY - rect.top
    const x = Math.max(0, Math.min(100, (leftPx / rect.width) * 100))
    setBubbles((prev) => prev.map((p) => (p.id === b.id ? { ...p, xPct: x, yPx: Math.max(0, Math.round(topPx)) } : p)))
    setPositions((prev) => ({ ...prev, [b.id]: { left: leftPx, top: topPx } })) // feedback live
  }
  const onDotPointerUp = async (e: React.PointerEvent, b: Bubble) => {
    if (!dragRef.current || dragRef.current.id !== b.id) return
    const moved = dragRef.current.moved
    dragRef.current = null
    if (!moved) { // simple clic en mode édition → ouvrir l'éditeur (le clic en lecture est géré par onClick)
      if (editMode) openEditor(b)
      return
    }
    const overlay = overlayRef.current
    if (!overlay) return
    const rect = overlay.getBoundingClientRect()
    const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const yPx = Math.max(0, Math.round(e.clientY - rect.top))
    // Ré-ancrage sur l'élément lâché (sinon coordonnées de repli)
    const target = elementUnder(overlay, e.clientX, e.clientY)
    const anchor = computeAnchor(target, e.clientX, e.clientY)
    setBubbles((prev) => prev.map((p) => (p.id === b.id ? { ...p, xPct, yPx, ...anchor } : p)))
    await fetch(`/api/bulles/${b.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ xPct, yPx, ...anchor }) })
    setTimeout(resolveAnchors, 0) // recale exactement sur l'élément
  }

  const openEditor = (b: Bubble) => {
    setEditor({ ...b })
    setUserQuery(''); setUserResults([]); setEditorTargets([])
    const ids = parseIdsString(b.targetUserIds)
    if (b.audience === 'USERS' && ids.length > 0) {
      fetch(`/api/bulles/users?ids=${ids.join(',')}`).then((r) => (r.ok ? r.json() : [])).then(setEditorTargets).catch(() => {})
    }
  }

  // Recherche d'utilisateurs (audience USERS)
  const aud = editor?.audience
  useEffect(() => {
    if (aud !== 'USERS') return
    const q = userQuery.trim()
    if (q.length < 1) { setUserResults([]); return }
    const t = setTimeout(() => {
      fetch(`/api/bulles/users?q=${encodeURIComponent(q)}`).then((r) => (r.ok ? r.json() : [])).then(setUserResults).catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [userQuery, aud])

  const addTarget = (u: { id: number; name: string; email: string }) => {
    setEditorTargets((prev) => (prev.some((x) => x.id === u.id) ? prev : [...prev, u]))
    setUserQuery(''); setUserResults([])
  }
  const removeTarget = (id: number) => setEditorTargets((prev) => prev.filter((x) => x.id !== id))

  // Ancre la bulle en cours d'édition à l'élément situé sous sa position actuelle.
  const anchorHere = () => {
    if (!editor || !overlayRef.current) return
    const overlay = overlayRef.current
    const orr = overlay.getBoundingClientRect()
    const pos = editor.id ? positions[editor.id] : undefined
    const leftPx = pos ? pos.left : ((editor.xPct ?? 50) / 100) * overlay.clientWidth
    const topPx = pos ? pos.top : (editor.yPx ?? 0)
    const target = elementUnder(overlay, orr.left + leftPx, orr.top + topPx)
    const anchor = computeAnchor(target, orr.left + leftPx, orr.top + topPx)
    if (anchor.anchorSelector) setEditor({ ...editor, ...anchor })
    else setEditor({ ...editor, anchorSelector: null, anchorDx: null, anchorDy: null })
  }

  const saveEditor = async () => {
    if (!editor) return
    const payload = {
      path: pathname,
      xPct: editor.xPct ?? 50,
      yPx: editor.yPx ?? 0,
      anchorSelector: editor.anchorSelector ?? null,
      anchorDx: editor.anchorDx ?? null,
      anchorDy: editor.anchorDy ?? null,
      title: editor.title ?? '',
      content: editor.content ?? '',
      emoji: editor.emoji ?? '💡',
      color: editor.color ?? 'indigo',
      audience: editor.audience ?? 'ALL',
      targetUserIds: editor.audience === 'USERS' ? editorTargets.map((u) => u.id) : [],
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

  // ─── Réplication sur d'autres groupes ───
  const openReplicate = async (id: number) => {
    setReplicateFor(id); setRepGroups([]); setRepSelected([]); setRepMsg('')
    const res = await fetch(`/api/bulles/${id}/replicate`)
    if (res.ok) { const d = await res.json(); setRepGroups(d.groups || []) }
  }
  const toggleRepGroup = (gid: number) => setRepSelected((s) => (s.includes(gid) ? s.filter((x) => x !== gid) : [...s, gid]))
  const doReplicate = async () => {
    if (!replicateFor || repSelected.length === 0) return
    const res = await fetch(`/api/bulles/${replicateFor}/replicate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupIds: repSelected }) })
    if (res.ok) { const d = await res.json(); setRepMsg(`✓ ${d.created} bulle(s) créée(s)${d.skipped ? `, ${d.skipped} déjà présente(s)` : ''}.`); setRepSelected([]) }
    else setRepMsg('Erreur lors de la réplication.')
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
        {(editMode || !hidden) && bubbles.map((b) => {
          const c = COLORS[b.color] || COLORS.indigo
          const isOpen = openId === b.id
          const pos = positions[b.id]
          const left = pos ? `${pos.left}px` : `${b.xPct}%`
          const top = pos ? `${pos.top}px` : `${b.yPx}px`
          const overlayW = overlayRef.current?.clientWidth || 1000
          const leftFrac = pos ? (pos.left / overlayW) * 100 : b.xPct
          return (
            <div key={b.id} className="absolute" style={{ left, top, pointerEvents: 'auto', transform: 'translate(-50%, -50%)' }}>
              {/* Marqueur pulsant */}
              <button
                onClick={() => { if (!editMode) setOpenId((id) => (id === b.id ? null : b.id)) }}
                onPointerDown={(e) => onDotPointerDown(e, b)}
                onPointerMove={(e) => onDotPointerMove(e, b)}
                onPointerUp={(e) => onDotPointerUp(e, b)}
                title={editMode ? (b.anchorSelector ? 'Ancrée · glisser pour déplacer · cliquer pour éditer' : 'NON ancrée (position libre) · glisser sur un élément ou « Ancrer ici »') : b.title}
                className={`relative flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-white shadow-lg transition-opacity ${c.dot} ${editMode ? `cursor-move ring-2 ${b.anchorSelector ? 'ring-white' : 'ring-amber-400'}` : 'cursor-pointer opacity-75 hover:opacity-100'}`}
                style={{ touchAction: 'none' }}
              >
                {!editMode && <span className={`absolute inset-0 rounded-full ${c.ring} opacity-50 animate-ping`} />}
                <span className="relative text-[11px] sm:text-sm leading-none">{b.emoji}</span>
              </button>

              {/* Popover (lecture) — ancrage horizontal selon la position pour rester visible */}
              {isOpen && !editMode && (
                <div
                  className={`absolute top-10 w-64 rounded-xl border bg-white shadow-xl p-3 ${c.accent} ${
                    leftFrac > 66 ? 'right-0' : leftFrac < 34 ? 'left-0' : 'left-1/2 -translate-x-1/2'
                  }`}
                  style={{ zIndex: 30 }}
                >
                  {b.title && <p className={`text-sm font-bold mb-1 ${c.text}`}>{b.emoji} {b.title}</p>}
                  {b.content && <p className="text-sm text-gray-700 whitespace-pre-wrap">{b.content}</p>}
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => setOpenId(null)} className="flex-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200">Fermer</button>
                    <button onClick={() => dismissOne(b.id)} className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${c.dot} hover:opacity-90`}>Ne plus afficher</button>
                  </div>
                  <button onClick={() => setHiddenPref(true)} className="mt-1.5 w-full text-[11px] text-gray-400 hover:text-gray-600">🔕 Masquer toutes les astuces</button>
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
        <div className="fixed bottom-4 left-4 lg:left-[17rem] z-40 flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
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

            {editor.audience === 'USERS' && (
              <div className="mb-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Utilisateurs ciblés</label>
                {editorTargets.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {editorTargets.map((u) => (
                      <span key={u.id} className="inline-flex items-center gap-1 rounded-full bg-white border border-indigo-200 px-2 py-0.5 text-xs text-indigo-700">
                        {u.name}
                        <button onClick={() => removeTarget(u.id)} className="text-indigo-400 hover:text-red-500 font-bold">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Rechercher un nom ou un email…" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  {userResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full max-h-44 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      {userResults.filter((u) => !editorTargets.some((t) => t.id === u.id)).map((u) => (
                        <button key={u.id} onClick={() => addTarget(u)} className="block w-full text-left px-3 py-2 text-sm hover:bg-indigo-50">
                          <span className="text-gray-800">{u.name}</span> <span className="text-gray-400 text-xs">· {u.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {editorTargets.length === 0 && <p className="mt-1 text-[11px] text-amber-600">Ajoutez au moins un utilisateur, sinon personne ne verra la bulle.</p>}
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-gray-700 mb-4 cursor-pointer">
              <input type="checkbox" checked={editor.active !== false} onChange={(e) => setEditor({ ...editor, active: e.target.checked })} className="rounded border-gray-300" />
              Active (visible par les utilisateurs)
            </label>

            <div className="flex items-center gap-2">
              <button onClick={saveEditor} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500">{editor.id ? 'Enregistrer' : 'Créer la bulle'}</button>
              {editor.id && <button onClick={() => deleteBubble(editor.id!)} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Supprimer</button>}
            </div>
            {editor.id && isGroupPath(pathname) && (
              <button onClick={() => openReplicate(editor.id!)} className="mt-2 w-full rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100">⧉ Répliquer sur d&apos;autres groupes</button>
            )}
            <div className="mt-2 flex items-center gap-2">
              <p className="text-[11px] text-gray-500 flex-1">
                {editor.anchorSelector
                  ? <>📌 <strong>Ancrée</strong> à un élément (restera alignée pour tous).</>
                  : <>📍 <strong>Position libre</strong> — peut se décaler selon l&apos;écran.</>}
              </p>
              <button onClick={anchorHere} className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50">
                {editor.anchorSelector ? 'Ré-ancrer ici' : '📌 Ancrer ici'}
              </button>
            </div>
            <p className="mt-0.5 text-[11px] text-gray-400">Page : <code>{pathname}</code></p>
          </div>
        </div>
      )}

      {/* Réplication sur d'autres groupes */}
      {replicateFor !== null && isAdmin && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setReplicateFor(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-5 flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-gray-900">⧉ Répliquer sur d&apos;autres groupes</h3>
              <button onClick={() => setReplicateFor(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <p className="text-xs text-gray-500 mb-3">La même bulle sera créée sur la <strong>page équivalente</strong> de chaque groupe choisi (même texte, même emplacement).</p>

            {repGroups.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun autre groupe disponible.</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <button onClick={() => setRepSelected(repGroups.map((g) => g.id))} className="text-xs font-medium text-indigo-600 hover:text-indigo-500">Tout sélectionner</button>
                  <button onClick={() => setRepSelected([])} className="text-xs font-medium text-gray-400 hover:text-gray-600">Tout désélectionner</button>
                </div>
                <div className="flex-1 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-50">
                  {repGroups.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={repSelected.includes(g.id)} onChange={() => toggleRepGroup(g.id)} className="rounded border-gray-300" />
                      <span className="text-gray-700 truncate">{g.name}</span>
                    </label>
                  ))}
                </div>
              </>
            )}

            {repMsg && <p className="mt-2 text-xs font-medium text-green-600">{repMsg}</p>}
            <div className="mt-3 flex items-center gap-2">
              <button onClick={doReplicate} disabled={repSelected.length === 0} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                Répliquer{repSelected.length > 0 ? ` (${repSelected.length})` : ''}
              </button>
              <button onClick={() => setReplicateFor(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

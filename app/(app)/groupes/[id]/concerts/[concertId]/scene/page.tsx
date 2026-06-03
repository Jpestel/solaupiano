'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { getShape, shapeForInstrument, shapeForEquip, resolveLook } from '@/components/ui/StageGraphics'

const SCALE = 1.0 // facteur d'échelle global des objets

// ─── Types ──────────────────────────────────────────────────────────────────

interface Member {
  userId: number
  name: string
  avatarUrl?: string | null
  figure?: string
  color?: string | null
  groupRole: string
  instruments: string[]
}

type ItemKind = 'member' | 'instrument' | 'equip'

interface StageItem {
  id: string
  kind: ItemKind
  label: string
  icon: string
  shape?: string
  figure?: string
  rotation?: number
  x: number // %
  y: number // %
  color?: string
  ownerUserId?: number
  avatarUrl?: string | null
}

// Résout la forme d'un item (rétro-compat si shape absent)
function resolveShape(item: { kind: ItemKind; shape?: string; figure?: string; label: string }): string {
  if (item.kind === 'member') return resolveLook(item.figure)
  if (item.shape) return item.shape
  if (item.kind === 'instrument') return shapeForInstrument(item.label)
  return 'generic'
}

interface Concert { id: number; name: string; date: string; location: string }

// ─── Constants ───────────────────────────────────────────────────────────────

const MEMBER_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#14b8a6']
const getColor = (i: number) => MEMBER_COLORS[i % MEMBER_COLORS.length]

function getInstrumentIcon(name: string): string {
  const l = name.toLowerCase()
  if (l.includes('basse')) return '🎸'
  if (l.includes('guitare') || l.includes('banjo') || l.includes('mandoline') || l.includes('ukulélé') || l.includes('luth')) return '🎸'
  if (l.includes('piano') || l.includes('clavier') || l.includes('synth') || l.includes('orgue') || l.includes('rhodes') || l.includes('clavecin') || l.includes('accordéon') || l.includes('mélodica')) return '🎹'
  if (l.includes('batterie') || l.includes('drums') || l.includes('percus') || l.includes('cajón') || l.includes('djembé') || l.includes('congas') || l.includes('bongos') || l.includes('timbales') || l.includes('darbouka') || l.includes('handpan')) return '🥁'
  if (l.includes('chant') || l.includes('voix') || l.includes('choeur') || l.includes('vocal') || l.includes('beatbox') || l.includes('micro')) return '🎤'
  if (l.includes('trompette') || l.includes('trombone') || l.includes('tuba') || l.includes('bugle') || l.includes('cor') || l.includes('cornet')) return '🎺'
  if (l.includes('saxophone') || l.includes('sax')) return '🎷'
  if (l.includes('violon') || l.includes('alto') || l.includes('violoncelle') || l.includes('contrebasse') || l.includes('harpe')) return '🎻'
  if (l.includes('flûte') || l.includes('clarinette') || l.includes('hautbois') || l.includes('basson')) return '🪈'
  if (l.includes('harmonica')) return '🎵'
  if (l.includes('dj') || l.includes('platine') || l.includes('mao') || l.includes('sampleur') || l.includes('groovebox') || l.includes('séquenceur') || l.includes('boîte à rythmes') || l.includes('launchpad') || l.includes('contrôleur')) return '🎚️'
  return '🎵'
}

// Équipement scène & sono
const EQUIPMENT: { key: string; label: string; icon: string }[] = [
  { key: 'monitor', label: 'Retour', icon: '🔊' },
  { key: 'foh', label: 'Façade (PA)', icon: '📣' },
  { key: 'mixer', label: 'Table de mixage', icon: '🎛️' },
  { key: 'amp', label: 'Ampli', icon: '🔈' },
  { key: 'mic', label: 'Micro', icon: '🎤' },
  { key: 'micstand', label: 'Pied de micro', icon: '🎙️' },
  { key: 'di', label: 'Boîtier DI', icon: '🔌' },
  { key: 'laptop', label: 'Ordi / MAO', icon: '💻' },
  { key: 'riser', label: 'Praticable', icon: '🟫' },
  { key: 'stool', label: 'Tabouret', icon: '🪑' },
  { key: 'power', label: 'Alim. élec.', icon: '⚡' },
  { key: 'inear', label: 'Ears / HF', icon: '🎧' },
]

const LIGHTS: { key: string; label: string; icon: string }[] = [
  { key: 'par', label: 'Projecteur PAR', icon: '💡' },
  { key: 'spot', label: 'Découpe', icon: '🔦' },
  { key: 'moving_head', label: 'Lyre', icon: '🎇' },
  { key: 'wash', label: 'Wash', icon: '🟡' },
  { key: 'beam', label: 'Beam', icon: '🔆' },
  { key: 'led_bar', label: 'Barre LED', icon: '🌈' },
  { key: 'blinder', label: 'Blinder', icon: '🔆' },
  { key: 'strobe', label: 'Stroboscope', icon: '⚡' },
  { key: 'laser', label: 'Laser', icon: '🟢' },
  { key: 'follow_spot', label: 'Poursuite', icon: '🎯' },
  { key: 'uv', label: 'UV / Blacklight', icon: '🟣' },
  { key: 'gobo', label: 'Gobo', icon: '✳️' },
]

const STRUCTURES: { key: string; label: string; icon: string }[] = [
  { key: 'truss_h', label: 'Poutre (truss)', icon: '━' },
  { key: 'truss_v', label: 'Truss vertical', icon: '┃' },
  { key: 'truss_corner', label: 'Angle de truss', icon: '⌐' },
  { key: 'totem', label: 'Totem LED', icon: '🗼' },
  { key: 'led_wall', label: 'Mur LED / écran', icon: '📺' },
  { key: 'backdrop', label: 'Fond de scène', icon: '🎏' },
  { key: 'banner', label: 'Banderole', icon: '🚩' },
  { key: 'drum_riser', label: 'Praticable batterie', icon: '⬛' },
  { key: 'stairs', label: 'Escalier', icon: '📶' },
  { key: 'barrier', label: 'Barrière', icon: '🚧' },
  { key: 'sub', label: 'Caisson de basse', icon: '🔊' },
  { key: 'pupitre', label: 'Pupitre', icon: '🎼' },
  { key: 'chaise', label: 'Chaise', icon: '🪑' },
  { key: 'tapis', label: 'Tapis', icon: '🟪' },
  { key: 'plante', label: 'Plante déco', icon: '🪴' },
  { key: 'smoke', label: 'Machine à fumée', icon: '💨' },
  { key: 'fan', label: 'Ventilateur', icon: '🌀' },
  { key: 'pyro', label: "Jet d'étincelles", icon: '🎆' },
  { key: 'confetti', label: 'Canon à confettis', icon: '🎉' },
]

let _seq = 0
const uid = (p: string) => `${p}-${Date.now()}-${_seq++}`

// ─── Vue d'un item sur la scène ────────────────────────────────────────────────

function StageItemView({ item, isChef, showLabels, onPointerDown, onRemove, onRotate }: {
  item: StageItem
  isChef: boolean
  showLabels: boolean
  onPointerDown: (e: React.PointerEvent, id: string) => void
  onRemove: (id: string) => void
  onRotate: (id: string) => void
}) {
  const common = `absolute -translate-x-1/2 -translate-y-1/2 select-none group ${isChef ? 'cursor-grab active:cursor-grabbing' : ''}`
  const shape = getShape(resolveShape(item))
  const color = item.kind === 'equip' ? '#cbd5e1' : (item.color || '#6366f1')
  const rot = item.rotation || 0
  const isMember = item.kind === 'member'

  return (
    <div className={common} style={{ left: `${item.x}%`, top: `${item.y}%` }}
      onPointerDown={isChef ? (e) => onPointerDown(e, item.id) : undefined}>
      {isChef && (
        <>
          <button
            className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
            onClick={(e) => { e.stopPropagation(); onRemove(item.id) }}
            onPointerDown={(e) => e.stopPropagation()}
          >×</button>
          <button
            className="absolute -top-2 -left-2 z-10 w-5 h-5 rounded-full bg-indigo-500 text-white text-[11px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
            onClick={(e) => { e.stopPropagation(); onRotate(item.id) }}
            onPointerDown={(e) => e.stopPropagation()}
            title="Pivoter de 90°"
          >↻</button>
        </>
      )}

      {/* Nom discret au-dessus (membres) */}
      {isMember && (
        <p className="text-center text-white/75 text-[9px] font-medium leading-none drop-shadow max-w-[70px] truncate mx-auto mb-0.5">{item.label}</p>
      )}

      {/* Graphique (pivote, pas le label) */}
      <div className="mx-auto" style={{ width: shape.w * SCALE, height: shape.h * SCALE, transform: `rotate(${rot}deg)`, transition: 'transform 0.15s', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}>
        {shape.draw(color)}
      </div>

      {/* Label sous instruments / équipement (masquable) */}
      {!isMember && showLabels && (
        <p className="mt-0.5 text-center text-white/85 text-[10px] leading-tight drop-shadow max-w-[90px] truncate mx-auto">{item.label}</p>
      )}
    </div>
  )
}

// ─── Chip déplaçable de la palette ─────────────────────────────────────────────

function PaletteChip({ icon, label, color, dimmed, onPointerDown, isChef }: {
  icon: React.ReactNode; label: string; color?: string; dimmed?: boolean
  onPointerDown?: (e: React.PointerEvent) => void; isChef: boolean
}) {
  return (
    <div
      onPointerDown={isChef ? onPointerDown : undefined}
      className={`inline-flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 text-xs shadow-sm ${isChef ? 'cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow' : ''} ${dimmed ? 'opacity-40' : ''}`}
      style={color ? { borderColor: color } : undefined}
      title={isChef ? 'Glisser sur la scène' : label}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="text-gray-700 truncate max-w-[110px]">{label}</span>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ScenePage({ params }: { params: { id: string; concertId: string } }) {
  const { data: session } = useSession()
  const groupId = params.id
  const concertId = params.concertId

  const [concert, setConcert] = useState<Concert | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [items, setItems] = useState<StageItem[]>([])
  const [groupName, setGroupName] = useState('')
  const [isChef, setIsChef] = useState(false)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'saved' | 'saving'>('saved')
  const loadedRef = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showLabels, setShowLabels] = useState(true)

  useEffect(() => {
    const v = localStorage.getItem('scene:showLabels')
    if (v === 'false') setShowLabels(false)
  }, [])
  const toggleLabels = () => setShowLabels((v) => { localStorage.setItem('scene:showLabels', String(!v)); return !v })

  const [dragging, setDragging] = useState<{ id: string; fromPanel: boolean; draft?: StageItem } | null>(null)
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 })
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!session) return
    Promise.all([
      fetch(`/api/groupes/${groupId}/concerts/${concertId}/scene`).then((r) => r.json()),
      fetch(`/api/groupes/${groupId}`).then((r) => r.json()),
    ]).then(([sceneData, groupData]) => {
      setConcert(sceneData.concert)
      setMembers(sceneData.members || [])
      setIsChef(sceneData.role === 'CHEF')
      setGroupName(groupData.name || '')

      const raw = sceneData.layout
      if (raw?.items) {
        setItems(raw.items)
      } else if (raw?.placements) {
        // Rétro-compat : ancien format (1 jeton par membre)
        setItems(raw.placements.map((p: { userId: number; name: string; icon: string; x: number; y: number; color: string }) => ({
          id: `member-${p.userId}`, kind: 'member' as const, label: p.name, icon: p.icon, x: p.x, y: p.y, color: p.color, ownerUserId: p.userId,
        })))
      }
      setLoading(false)
      // Autorise l'auto-save après le chargement initial (au prochain changement)
      setTimeout(() => { loadedRef.current = true }, 0)
    })
  }, [session, groupId, concertId])

  // ── Auto-save (chef) : sauvegarde différée à chaque changement ──
  useEffect(() => {
    if (!isChef || !loadedRef.current) return
    setStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await fetch(`/api/groupes/${groupId}/concerts/${concertId}/scene`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { items } }),
      })
      setStatus('saved')
    }, 800)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [items, isChef, groupId, concertId])

  const getStagePercent = useCallback((cx: number, cy: number) => {
    const stage = stageRef.current
    if (!stage) return { x: 50, y: 50 }
    const r = stage.getBoundingClientRect()
    return {
      x: Math.max(3, Math.min(97, ((cx - r.left) / r.width) * 100)),
      y: Math.max(5, Math.min(95, ((cy - r.top) / r.height) * 100)),
    }
  }, [])

  const startDragFromPanel = useCallback((e: React.PointerEvent, draft: StageItem) => {
    if (!isChef) return
    e.preventDefault()
    setDragging({ id: draft.id, fromPanel: true, draft })
    setDragPos({ x: e.clientX, y: e.clientY })
  }, [isChef])

  const startDragOnStage = useCallback((e: React.PointerEvent, id: string) => {
    if (!isChef) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging({ id, fromPanel: false })
    setDragPos({ x: e.clientX, y: e.clientY })
  }, [isChef])

  useEffect(() => {
    if (!dragging) return
    const handleMove = (e: PointerEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY })
      if (!dragging.fromPanel) {
        const { x, y } = getStagePercent(e.clientX, e.clientY)
        setItems((prev) => prev.map((it) => (it.id === dragging.id ? { ...it, x, y } : it)))
      }
    }
    const handleUp = (e: PointerEvent) => {
      if (dragging.fromPanel && dragging.draft) {
        const stage = stageRef.current
        if (stage) {
          const r = stage.getBoundingClientRect()
          const over = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
          if (over) {
            const { x, y } = getStagePercent(e.clientX, e.clientY)
            const draft = dragging.draft
            setItems((prev) => {
              // Jeton membre : unique par personne → on déplace si déjà présent
              if (draft.kind === 'member' && prev.some((it) => it.id === draft.id)) {
                return prev.map((it) => (it.id === draft.id ? { ...it, x, y } : it))
              }
              return [...prev, { ...draft, x, y }]
            })
          }
        }
      }
      setDragging(null)
    }
    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
    return () => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
    }
  }, [dragging, getStagePercent])

  const removeItem = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id))
  const rotateItem = (id: string) => setItems((prev) => prev.map((it) => it.id === id ? { ...it, rotation: ((it.rotation || 0) + 90) % 360 } : it))
  const clearAll = () => setItems([])
  const handlePrint = () => window.print()

  // Dispose tous les objets en grille pour qu'ils soient tous visibles (sans chevauchement)
  const autoArrange = () => {
    setItems((prev) => {
      if (prev.length === 0) return prev
      const cols = Math.ceil(Math.sqrt(prev.length))
      const rows = Math.ceil(prev.length / cols)
      return prev.map((it, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        return {
          ...it,
          x: 8 + ((col + 0.5) / cols) * 84,
          y: 12 + ((row + 0.5) / rows) * 78,
        }
      })
    })
  }

  const concertDate = concert ? new Date(concert.date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : ''
  const placedMemberIds = new Set(items.filter((it) => it.kind === 'member').map((it) => it.ownerUserId))

  // Le membre connecté (pour le lien "modifier le profil")
  const myId = session ? Number(session.user.id) : 0

  if (loading) return <div className="text-gray-500 p-8">Chargement...</div>

  return (
    <div className="print:p-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2 print:hidden flex-wrap">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link><span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">{groupName}</Link><span>/</span>
        <Link href={`/groupes/${groupId}/concerts`} className="hover:text-indigo-600">Concerts</Link><span>/</span>
        <span className="text-gray-900 truncate max-w-[120px] sm:max-w-none">{concert?.name}</span><span>/</span>
        <span className="text-gray-900">Plan de scène</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plan de scène</h1>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">{concert?.name} · {concertDate}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none px-2 py-1.5 rounded-lg hover:bg-gray-100">
            <input type="checkbox" checked={showLabels} onChange={toggleLabels} className="rounded border-gray-300 text-indigo-600" />
            Noms des objets
          </label>
          {isChef && (
            <>
              <span className={`text-xs font-medium ${status === 'saving' ? 'text-amber-500' : 'text-green-600'}`}>
                {status === 'saving' ? '⏳ Sauvegarde…' : '✓ Sauvegardé'}
              </span>
              <button onClick={autoArrange} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors border border-indigo-200 flex items-center gap-1.5">⊞ Disposer</button>
              <button onClick={clearAll} className="text-sm text-red-400 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">Tout effacer</button>
              <button onClick={handlePrint} className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 flex items-center gap-1.5">🖨️ Imprimer</button>
            </>
          )}
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">{groupName} — Plan de scène</h1>
        <p className="text-gray-600">{concert?.name} · {concertDate} · {concert?.location}</p>
      </div>

      {/* Info personnalisation */}
      <div className="print:hidden mb-4 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-2.5 text-xs text-indigo-700 flex items-center gap-2">
        <span>🎭</span>
        <span>Votre <strong>personnage</strong> (allure & couleur) et votre <strong>nom de scène</strong> se définissent dans votre <Link href="/profil" className="font-semibold underline hover:text-indigo-900">profil</Link>.</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
        {/* ─── Palette (à côté de la scène, défilement propre) ─── */}
        <div className="lg:w-80 lg:flex-shrink-0 lg:max-h-[80vh] lg:overflow-y-auto lg:pr-1 print:hidden space-y-5">
          {/* Musiciens + instruments */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Musiciens & instruments</h2>
            {members.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Aucun membre dans ce groupe.</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {members.map((m, idx) => {
                  const color = m.color || getColor(idx)
                  const placed = placedMemberIds.has(m.userId)
                  return (
                    <div key={m.userId} className="w-full sm:w-60 lg:w-full rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm">
                      <div className="flex items-center gap-2">
                        <PaletteChip
                          isChef={isChef}
                          dimmed={placed}
                          color={color}
                          icon={
                            <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-white text-[10px] font-bold overflow-hidden" style={{ background: color }}>
                              {m.avatarUrl
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                                : m.name.charAt(0).toUpperCase()}
                            </span>
                          }
                          label={m.name}
                          onPointerDown={(e) => startDragFromPanel(e, { id: `member-${m.userId}`, kind: 'member', label: m.name, icon: '', figure: m.figure, x: 50, y: 50, color, ownerUserId: m.userId })}
                        />
                        {placed && <span className="text-[10px] text-green-600 font-medium">placé</span>}
                      </div>

                      {m.instruments.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {m.instruments.map((instr) => (
                            <PaletteChip
                              key={instr}
                              isChef={isChef}
                              color={color}
                              icon={getInstrumentIcon(instr)}
                              label={instr}
                              onPointerDown={(e) => startDragFromPanel(e, { id: uid('instr'), kind: 'instrument', label: instr, icon: getInstrumentIcon(instr), shape: shapeForInstrument(instr), x: 50, y: 50, color, ownerUserId: m.userId })}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 mt-2">
                          Aucun instrument déclaré
                          {m.userId === myId && <> · <Link href="/profil" className="text-indigo-600 hover:underline">Modifier mon profil →</Link></>}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Catalogues d'objets */}
          {[
            { title: 'Équipement & sono', list: EQUIPMENT },
            { title: 'Lumières', list: LIGHTS },
            { title: 'Structures & déco', list: STRUCTURES },
          ].map((cat) => (
            <div key={cat.title}>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">{cat.title}</h2>
              <div className="flex flex-wrap gap-1.5">
                {cat.list.map((eq) => (
                  <PaletteChip
                    key={eq.key}
                    isChef={isChef}
                    icon={eq.icon}
                    label={eq.label}
                    onPointerDown={(e) => startDragFromPanel(e, { id: uid('equip'), kind: 'equip', label: eq.label, icon: eq.icon, shape: shapeForEquip(eq.key), x: 50, y: 50 })}
                  />
                ))}
              </div>
            </div>
          ))}

          {isChef && (
            <p className="text-xs text-gray-400 italic">Glissez n&apos;importe quel élément sur la scène. Les instruments proviennent du profil de chaque musicien.</p>
          )}
        </div>

        {/* ─── Scène ─── */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <div className="text-center mb-1"><span className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em]">Fond de scène</span></div>
            <div
              ref={stageRef}
              className="relative w-full rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 40%, #1e1b4b 100%)',
                minHeight: '440px', aspectRatio: '16/10',
                boxShadow: '0 8px 40px rgba(79,70,229,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <div className="absolute inset-0 pointer-events-none">
                {[20, 40, 60, 80].map((y) => <div key={y} className="absolute w-full border-t" style={{ top: `${y}%`, borderColor: 'rgba(255,255,255,0.03)' }} />)}
              </div>
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(99,102,241,0.15) 0%, transparent 70%)' }} />

              {dragging?.fromPanel && (
                <div className="absolute inset-0 border-4 border-dashed border-indigo-400/60 rounded-2xl pointer-events-none flex items-center justify-center">
                  <span className="text-indigo-300/70 text-sm font-medium">Déposer ici</span>
                </div>
              )}

              {items.map((it) => (
                <StageItemView key={it.id} item={it} isChef={isChef} showLabels={showLabels} onPointerDown={startDragOnStage} onRemove={removeItem} onRotate={rotateItem} />
              ))}

              {items.length === 0 && !dragging && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl mb-3 opacity-30">🎭</span>
                  <p className="text-white/30 text-sm font-medium">{isChef ? 'Glissez musiciens, instruments et matériel sur la scène' : 'Aucun placement défini'}</p>
                </div>
              )}
            </div>
            <div className="text-center mt-1"><span className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em]">Public ▼</span></div>
          </div>
        </div>
      </div>

      {/* Ghost pendant le drag depuis la palette */}
      {dragging?.fromPanel && dragging.draft && (
        <div className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-1/2 opacity-90" style={{ left: dragPos.x, top: dragPos.y }}>
          {(() => {
            const sh = getShape(resolveShape(dragging.draft!))
            const col = dragging.draft!.kind === 'equip' ? '#cbd5e1' : (dragging.draft!.color || '#6366f1')
            return <div style={{ width: sh.w * SCALE, height: sh.h * SCALE, filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.4))' }}>{sh.draw(col)}</div>
          })()}
        </div>
      )}

      <style jsx global>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Member {
  userId: number
  name: string
  avatarUrl?: string | null
  groupRole: string
  instruments: string[]
}

type ItemKind = 'member' | 'instrument' | 'equip'

interface StageItem {
  id: string
  kind: ItemKind
  label: string
  icon: string
  x: number // %
  y: number // %
  color?: string
  ownerUserId?: number
  avatarUrl?: string | null
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

let _seq = 0
const uid = (p: string) => `${p}-${Date.now()}-${_seq++}`

// ─── Vue d'un item sur la scène ────────────────────────────────────────────────

function StageItemView({ item, isChef, onPointerDown, onRemove }: {
  item: StageItem
  isChef: boolean
  onPointerDown: (e: React.PointerEvent, id: string) => void
  onRemove: (id: string) => void
}) {
  const common = `absolute -translate-x-1/2 -translate-y-1/2 select-none group ${isChef ? 'cursor-grab active:cursor-grabbing' : ''}`
  const removeBtn = isChef && (
    <button
      className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
      onClick={(e) => { e.stopPropagation(); onRemove(item.id) }}
      onPointerDown={(e) => e.stopPropagation()}
    >×</button>
  )

  if (item.kind === 'member') {
    return (
      <div className={common} style={{ left: `${item.x}%`, top: `${item.y}%` }}
        onPointerDown={isChef ? (e) => onPointerDown(e, item.id) : undefined}>
        {removeBtn}
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg border-2 border-white overflow-hidden" style={{ background: item.color }}>
          {item.avatarUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
            : item.label.charAt(0).toUpperCase()}
        </div>
        <p className="mt-1 text-center text-white text-xs font-semibold leading-tight drop-shadow max-w-[84px] truncate mx-auto">{item.label}</p>
      </div>
    )
  }

  if (item.kind === 'instrument') {
    return (
      <div className={common} style={{ left: `${item.x}%`, top: `${item.y}%` }}
        onPointerDown={isChef ? (e) => onPointerDown(e, item.id) : undefined}>
        {removeBtn}
        <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-xl shadow-md mx-auto" style={{ border: `2px solid ${item.color || '#6366f1'}` }}>
          {item.icon}
        </div>
        <p className="mt-0.5 text-center text-white/90 text-[10px] leading-tight drop-shadow max-w-[80px] truncate mx-auto">{item.label}</p>
      </div>
    )
  }

  // equip
  return (
    <div className={common} style={{ left: `${item.x}%`, top: `${item.y}%` }}
      onPointerDown={isChef ? (e) => onPointerDown(e, item.id) : undefined}>
      {removeBtn}
      <div className="w-11 h-11 rounded-md bg-slate-700/90 flex items-center justify-center text-xl shadow-md border border-white/20 mx-auto">
        {item.icon}
      </div>
      <p className="mt-0.5 text-center text-white/80 text-[10px] leading-tight drop-shadow max-w-[80px] truncate mx-auto">{item.label}</p>
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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
    })
  }, [session, groupId, concertId])

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/groupes/${groupId}/concerts/${concertId}/scene`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { items } }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

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
  const clearAll = () => setItems([])
  const handlePrint = () => window.print()

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
        {isChef && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={clearAll} className="text-sm text-red-400 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">Tout effacer</button>
            <button onClick={handlePrint} className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 flex items-center gap-1.5">🖨️ Imprimer</button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé !' : 'Sauvegarder'}</Button>
          </div>
        )}
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">{groupName} — Plan de scène</h1>
        <p className="text-gray-600">{concert?.name} · {concertDate} · {concert?.location}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ─── Palette ─── */}
        <div className="lg:w-64 flex-shrink-0 print:hidden space-y-5">
          {/* Musiciens + instruments */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Musiciens & instruments</h2>
            {members.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Aucun membre dans ce groupe.</p>
            ) : (
              <div className="space-y-2.5">
                {members.map((m, idx) => {
                  const color = getColor(idx)
                  const placed = placedMemberIds.has(m.userId)
                  return (
                    <div key={m.userId} className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm">
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
                          onPointerDown={(e) => startDragFromPanel(e, { id: `member-${m.userId}`, kind: 'member', label: m.name, icon: '', x: 50, y: 50, color, ownerUserId: m.userId, avatarUrl: m.avatarUrl })}
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
                              onPointerDown={(e) => startDragFromPanel(e, { id: uid('instr'), kind: 'instrument', label: instr, icon: getInstrumentIcon(instr), x: 50, y: 50, color, ownerUserId: m.userId })}
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

          {/* Équipement & sono */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Équipement & sono</h2>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT.map((eq) => (
                <PaletteChip
                  key={eq.key}
                  isChef={isChef}
                  icon={eq.icon}
                  label={eq.label}
                  onPointerDown={(e) => startDragFromPanel(e, { id: uid('equip'), kind: 'equip', label: eq.label, icon: eq.icon, x: 50, y: 50 })}
                />
              ))}
            </div>
          </div>

          {isChef && (
            <p className="text-xs text-gray-400 italic">Glissez n&apos;importe quel élément sur la scène. Les instruments proviennent du profil de chaque musicien.</p>
          )}
        </div>

        {/* ─── Scène ─── */}
        <div className="flex-1">
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
                <StageItemView key={it.id} item={it} isChef={isChef} onPointerDown={startDragOnStage} onRemove={removeItem} />
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
          <div className={`flex items-center justify-center text-2xl shadow-2xl border-2 border-white ${dragging.draft.kind === 'member' ? 'w-14 h-14 rounded-full text-white font-bold' : dragging.draft.kind === 'instrument' ? 'w-11 h-11 rounded-xl bg-white' : 'w-11 h-11 rounded-md bg-slate-700 text-white'}`}
            style={dragging.draft.kind === 'member' ? { background: dragging.draft.color } : dragging.draft.kind === 'instrument' ? { border: `2px solid ${dragging.draft.color || '#6366f1'}` } : undefined}>
            {dragging.draft.kind === 'member' ? dragging.draft.label.charAt(0).toUpperCase() : dragging.draft.icon}
          </div>
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

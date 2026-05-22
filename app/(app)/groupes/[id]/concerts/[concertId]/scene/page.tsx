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

interface Placement {
  userId: number
  name: string
  instrumentLabel: string
  icon: string
  x: number // percentage 0-100
  y: number // percentage 0-100
  color: string
}

interface Concert {
  id: number
  name: string
  date: string
  location: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MEMBER_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#3b82f6',
  '#10b981', '#f59e0b', '#ef4444', '#14b8a6',
]

function getColor(index: number) {
  return MEMBER_COLORS[index % MEMBER_COLORS.length]
}

function getInstrumentIcon(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('guitare') || lower.includes('guitar')) return '🎸'
  if (lower.includes('basse') || lower.includes('bass')) return '🎸'
  if (lower.includes('piano') || lower.includes('clavier') || lower.includes('synth') || lower.includes('orgue')) return '🎹'
  if (lower.includes('batterie') || lower.includes('drums') || lower.includes('percus') || lower.includes('cajon')) return '🥁'
  if (lower.includes('voix') || lower.includes('chant') || lower.includes('vocal') || lower.includes('micro')) return '🎤'
  if (lower.includes('trompette') || lower.includes('trumpet') || lower.includes('cuivre')) return '🎺'
  if (lower.includes('saxophone') || lower.includes('sax')) return '🎷'
  if (lower.includes('violon') || lower.includes('violin')) return '🎻'
  if (lower.includes('flûte') || lower.includes('flute')) return '🪈'
  if (lower.includes('harmonica')) return '🎵'
  if (lower.includes('contrebasse') || lower.includes('upright')) return '🎸'
  return '🎵'
}

// ─── Token Component ──────────────────────────────────────────────────────────

function StageToken({
  placement,
  isChef,
  onPointerDown,
  onRemove,
}: {
  placement: Placement
  isChef: boolean
  onPointerDown: (e: React.PointerEvent, userId: number) => void
  onRemove: (userId: number) => void
}) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 select-none group"
      style={{ left: `${placement.x}%`, top: `${placement.y}%` }}
    >
      {/* Remove button */}
      {isChef && (
        <button
          className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
          onClick={(e) => { e.stopPropagation(); onRemove(placement.userId) }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          ×
        </button>
      )}
      {/* Circle */}
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg border-2 border-white cursor-grab active:cursor-grabbing ${isChef ? '' : 'cursor-default'}`}
        style={{ background: placement.color }}
        onPointerDown={isChef ? (e) => onPointerDown(e, placement.userId) : undefined}
      >
        {placement.icon}
      </div>
      {/* Name + instrument */}
      <div className="mt-1.5 text-center">
        <p className="text-white text-xs font-semibold leading-tight drop-shadow px-1 max-w-[80px] truncate mx-auto">{placement.name}</p>
        <p className="text-white/70 text-[10px] leading-tight drop-shadow">{placement.instrumentLabel}</p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ScenePage({ params }: { params: { id: string; concertId: string } }) {
  const { data: session } = useSession()
  const groupId = params.id
  const concertId = params.concertId

  const [concert, setConcert] = useState<Concert | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [placements, setPlacements] = useState<Placement[]>([])
  const [groupName, setGroupName] = useState('')
  const [isChef, setIsChef] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Drag state
  const [dragging, setDragging] = useState<{ userId: number; fromPanel: boolean } | null>(null)
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 })
  const [dragMeta, setDragMeta] = useState<{ name: string; instrumentLabel: string; icon: string; color: string } | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  // ─── Load data ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!session) return
    Promise.all([
      fetch(`/api/groupes/${groupId}/concerts/${concertId}/scene`).then((r) => r.json()),
      fetch(`/api/groupes/${groupId}`).then((r) => r.json()),
    ]).then(([sceneData, groupData]) => {
      setConcert(sceneData.concert)
      setMembers(sceneData.members || [])
      setIsChef(sceneData.role === 'CHEF')

      const gName = groupData.name || ''
      setGroupName(gName)

      if (sceneData.layout?.placements) {
        setPlacements(sceneData.layout.placements)
      }
      setLoading(false)
    })
  }, [session, groupId, concertId])

  // ─── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/groupes/${groupId}/concerts/${concertId}/scene`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { placements } }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ─── Drag & drop ─────────────────────────────────────────────────────────────

  const getStagePercent = useCallback((clientX: number, clientY: number) => {
    const stage = stageRef.current
    if (!stage) return { x: 50, y: 50 }
    const rect = stage.getBoundingClientRect()
    const x = Math.max(3, Math.min(97, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.max(5, Math.min(95, ((clientY - rect.top) / rect.height) * 100))
    return { x, y }
  }, [])

  const startDragFromPanel = useCallback((e: React.PointerEvent, member: Member, memberIndex: number) => {
    if (!isChef) return
    e.preventDefault()
    const instruments = member.instruments
    const instrumentLabel = instruments.length > 0 ? instruments[0] : 'Musicien'
    const icon = instruments.length > 0 ? getInstrumentIcon(instruments[0]) : '🎵'
    const color = getColor(memberIndex)

    setDragging({ userId: member.userId, fromPanel: true })
    setDragPos({ x: e.clientX, y: e.clientY })
    setDragMeta({ name: member.name, instrumentLabel, icon, color })
  }, [isChef])

  const startDragOnStage = useCallback((e: React.PointerEvent, userId: number) => {
    if (!isChef) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)

    const placement = placements.find((p) => p.userId === userId)
    if (!placement) return

    setDragging({ userId, fromPanel: false })
    setDragPos({ x: e.clientX, y: e.clientY })
    setDragMeta({
      name: placement.name,
      instrumentLabel: placement.instrumentLabel,
      icon: placement.icon,
      color: placement.color,
    })
  }, [isChef, placements])

  useEffect(() => {
    if (!dragging) return

    const handleMove = (e: PointerEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY })
      // If dragging an existing token on stage, update its position live
      if (!dragging.fromPanel) {
        const { x, y } = getStagePercent(e.clientX, e.clientY)
        setPlacements((prev) =>
          prev.map((p) => (p.userId === dragging.userId ? { ...p, x, y } : p))
        )
      }
    }

    const handleUp = (e: PointerEvent) => {
      if (dragging.fromPanel && dragMeta) {
        const stage = stageRef.current
        if (stage) {
          const rect = stage.getBoundingClientRect()
          const overStage =
            e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom

          if (overStage) {
            const { x, y } = getStagePercent(e.clientX, e.clientY)
            setPlacements((prev) => {
              const existing = prev.find((p) => p.userId === dragging.userId)
              if (existing) {
                return prev.map((p) => (p.userId === dragging.userId ? { ...p, x, y } : p))
              }
              return [...prev, {
                userId: dragging.userId,
                name: dragMeta.name,
                instrumentLabel: dragMeta.instrumentLabel,
                icon: dragMeta.icon,
                x,
                y,
                color: dragMeta.color,
              }]
            })
          }
        }
      }
      setDragging(null)
      setDragMeta(null)
    }

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
    return () => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
    }
  }, [dragging, dragMeta, getStagePercent])

  const removePlacement = (userId: number) => {
    setPlacements((prev) => prev.filter((p) => p.userId !== userId))
  }

  const clearAll = () => setPlacements([])

  // ─── Print ───────────────────────────────────────────────────────────────────

  const handlePrint = () => {
    window.print()
  }

  // ─── Derived ──────────────────────────────────────────────────────────────────

  const placedIds = new Set(placements.map((p) => p.userId))
  const unplacedMembers = members.filter((m) => !placedIds.has(m.userId))

  const concertDate = concert
    ? new Date(concert.date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : ''

  if (loading) return <div className="text-gray-500 p-8">Chargement...</div>

  return (
    <div className="print:p-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2 print:hidden flex-wrap">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">{groupName}</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}/concerts`} className="hover:text-indigo-600">Concerts</Link>
        <span>/</span>
        <span className="text-gray-900 truncate max-w-[120px] sm:max-w-none">{concert?.name}</span>
        <span>/</span>
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
            <button
              onClick={clearAll}
              className="text-sm text-red-400 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              Tout effacer
            </button>
            <button
              onClick={handlePrint}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 flex items-center gap-1.5"
            >
              🖨️ Imprimer
            </button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé !' : 'Sauvegarder'}
            </Button>
          </div>
        )}
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">{groupName} — Plan de scène</h1>
        <p className="text-gray-600">{concert?.name} · {concertDate} · {concert?.location}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ─── Members panel ─── */}
        <div className="lg:w-56 flex-shrink-0 print:hidden">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Musiciens</h2>

          {unplacedMembers.length === 0 && placements.length === 0 && (
            <p className="text-xs text-gray-400 italic">Aucun membre dans ce groupe.</p>
          )}

          {unplacedMembers.length > 0 && (
            <div className="space-y-2 mb-4">
              {unplacedMembers.map((member, idx) => {
                const globalIdx = members.findIndex((m) => m.userId === member.userId)
                const instruments = member.instruments
                const instrumentLabel = instruments.length > 0 ? instruments[0] : 'Musicien'
                const icon = instruments.length > 0 ? getInstrumentIcon(instruments[0]) : '🎵'
                const color = getColor(globalIdx)

                return (
                  <div
                    key={member.userId}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border bg-white shadow-sm ${isChef ? 'cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-md transition-all' : ''}`}
                    onPointerDown={isChef ? (e) => startDragFromPanel(e, member, globalIdx) : undefined}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0 border-2 border-white shadow"
                      style={{ background: color }}
                    >
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                      <p className="text-xs text-gray-400 truncate">{instrumentLabel}</p>
                    </div>
                    {isChef && (
                      <span className="ml-auto text-gray-300 text-xs flex-shrink-0">⠿</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {placements.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">Sur scène ({placements.length})</p>
              <div className="space-y-1.5">
                {placements.map((p) => (
                  <div key={p.userId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0" style={{ background: p.color }}>
                      {p.icon}
                    </div>
                    <span className="text-xs text-gray-600 truncate">{p.name}</span>
                    {isChef && (
                      <button onClick={() => removePlacement(p.userId)} className="ml-auto text-gray-300 hover:text-red-400 text-xs flex-shrink-0">×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isChef && unplacedMembers.length > 0 && (
            <p className="text-xs text-gray-400 mt-3 italic">
              Glissez les membres sur la scène pour les placer.
            </p>
          )}
        </div>

        {/* ─── Stage ─── */}
        <div className="flex-1">
          {/* Stage wrapper with audience label */}
          <div className="relative">
            {/* Stage label top */}
            <div className="text-center mb-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em]">Scène</span>
            </div>

            {/* Stage area */}
            <div
              ref={stageRef}
              className="relative w-full rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 40%, #1e1b4b 100%)',
                minHeight: '380px',
                aspectRatio: '16/9',
                boxShadow: '0 8px 40px rgba(79,70,229,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              {/* Stage floor lines for depth */}
              <div className="absolute inset-0 pointer-events-none">
                {[20, 40, 60, 80].map((y) => (
                  <div
                    key={y}
                    className="absolute w-full border-t"
                    style={{ top: `${y}%`, borderColor: 'rgba(255,255,255,0.03)' }}
                  />
                ))}
              </div>

              {/* Spotlight glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(99,102,241,0.15) 0%, transparent 70%)',
                }}
              />

              {/* Drop hint when dragging from panel */}
              {dragging?.fromPanel && (
                <div className="absolute inset-0 border-4 border-dashed border-indigo-400/60 rounded-2xl pointer-events-none flex items-center justify-center">
                  <span className="text-indigo-300/70 text-sm font-medium">Déposer ici</span>
                </div>
              )}

              {/* Placed tokens */}
              {placements.map((placement) => (
                <StageToken
                  key={placement.userId}
                  placement={placement}
                  isChef={isChef}
                  onPointerDown={startDragOnStage}
                  onRemove={removePlacement}
                />
              ))}

              {/* Empty hint */}
              {placements.length === 0 && !dragging && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl mb-3 opacity-30">🎭</span>
                  <p className="text-white/30 text-sm font-medium">
                    {isChef ? 'Glissez des musiciens sur la scène' : 'Aucun placement défini'}
                  </p>
                </div>
              )}
            </div>

            {/* Public label */}
            <div className="text-center mt-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em]">Public ▼</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ghost element while dragging */}
      {dragging?.fromPanel && dragMeta && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-1/2 opacity-90"
          style={{ left: dragPos.x, top: dragPos.y }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-2xl border-2 border-white"
            style={{ background: dragMeta.color }}
          >
            {dragMeta.icon}
          </div>
          <p className="text-center text-xs font-semibold text-gray-800 mt-1 drop-shadow-md">{dragMeta.name}</p>
        </div>
      )}

      {/* Print styles */}
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

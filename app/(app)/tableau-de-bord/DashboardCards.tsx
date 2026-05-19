'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatDateWithDay } from '@/lib/utils'

interface Rehearsal {
  id: number
  date: string
  startTime: string
  endTime?: string | null
  location: string
  groupId: number
  group: { name: string }
  songs: { song: { title: string } }[]
}

interface Concert {
  id: number
  name: string
  date: string
  groupId: number
  group: { name: string }
}

interface Membership {
  groupId: number
  groupRole: string
  group: { name: string }
}

interface Props {
  rehearsals: Rehearsal[]
  concerts: Concert[]
  memberships: Membership[]
}

const STORAGE_KEY = 'dashboard-card-order'
const DEFAULT_ORDER = ['rehearsals', 'concerts', 'groups']

function SortableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`transition-shadow ${isDragging ? 'shadow-2xl ring-2 ring-indigo-300 z-50 opacity-90' : ''}`}
    >
      {/* Drag handle strip */}
      <div
        {...attributes}
        {...listeners}
        className="flex justify-center items-center h-5 cursor-grab active:cursor-grabbing rounded-t-xl bg-gray-50 border border-b-0 border-gray-200 hover:bg-indigo-50 transition-colors group"
        title="Déplacer"
      >
        <span className="flex gap-0.5">
          {[0,1,2,3,4,5].map((i) => (
            <span key={i} className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-indigo-400 transition-colors" />
          ))}
        </span>
      </div>
      <div className="rounded-b-xl border border-t-0 border-gray-200 bg-white overflow-hidden">
        {children}
      </div>
    </div>
  )
}

export function DashboardCards({ rehearsals, concerts, memberships }: Props) {
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length === DEFAULT_ORDER.length) {
          setOrder(parsed)
        }
      } catch {}
    }
    setMounted(true)
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = order.indexOf(String(active.id))
    const newIndex = order.indexOf(String(over.id))
    const newOrder = arrayMove(order, oldIndex, newIndex)
    setOrder(newOrder)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder))
  }

  const cardContent: Record<string, React.ReactNode> = {
    rehearsals: (
      <Card className="rounded-none border-0">
        <CardHeader title="Prochaines répétitions" subtitle="Dans les 30 prochains jours" />
        {rehearsals.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">Aucune répétition prévue dans les 30 prochains jours.</p>
        ) : (
          <div className="space-y-3">
            {rehearsals.map((rep) => (
              <Link
                key={rep.id}
                href={`/groupes/${rep.groupId}/repetitions/${rep.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900 text-sm">{rep.group.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">
                    {formatDateWithDay(rep.date)} · {rep.startTime}{rep.endTime ? ` - ${rep.endTime}` : ''}
                  </p>
                  <p className="text-xs text-gray-400">{rep.location}</p>
                  {rep.songs.length > 0 && (
                    <p className="text-xs text-indigo-500 mt-1">
                      Morceaux : {rep.songs.map((s) => s.song.title).join(', ')}
                    </p>
                  )}
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </Card>
    ),

    concerts: (
      <Card className="rounded-none border-0">
        <CardHeader title="Concerts à venir" />
        {concerts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Aucun concert prévu.</p>
        ) : (
          <div className="space-y-3">
            {concerts.map((concert) => (
              <Link
                key={concert.id}
                href={`/groupes/${concert.groupId}/concerts`}
                className="block rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors"
              >
                <p className="font-medium text-gray-900 text-sm">{concert.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{concert.group.name}</p>
                <p className="text-xs text-indigo-600 capitalize mt-0.5">{formatDateWithDay(concert.date)}</p>
              </Link>
            ))}
          </div>
        )}
      </Card>
    ),

    groups: (
      <Card className="rounded-none border-0">
        <CardHeader title="Mes groupes" />
        {memberships.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Vous n&apos;êtes membre d&apos;aucun groupe.</p>
        ) : (
          <div className="space-y-2">
            {memberships.map((m) => (
              <Link
                key={m.groupId}
                href={`/groupes/${m.groupId}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-semibold">
                    {m.group.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-gray-800">{m.group.name}</span>
                </div>
                <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                  m.groupRole === 'CHEF' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {m.groupRole === 'CHEF' ? 'Chef' : 'Membre'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    ),
  }

  if (!mounted) return null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {order.map((id, index) => (
            <SortableCard key={id} id={id}>
              {cardContent[id]}
            </SortableCard>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

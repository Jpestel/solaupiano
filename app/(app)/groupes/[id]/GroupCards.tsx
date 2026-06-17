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
import MembresPanel from './MembresPanel'
import { InvitePanel } from './InvitePanel'

interface Member {
  userId: number
  groupRole: string
  user: {
    id: number
    name: string
    avatarUrl?: string | null
    instruments: { instrument: { name: string } }[]
  }
}

interface Rehearsal {
  id: number
  date: string
  startTime: string
  endTime?: string | null
  location: string
}

interface Concert {
  id: number
  name: string
  date: string
  location: string
}

interface Props {
  groupId: number
  groupType?: string
  showRoster?: boolean
  rehearsal: Rehearsal | null
  concert: Concert | null
  members: Member[]
  showInvite: boolean
  isChef: boolean
  canManage: boolean
  isAdmin: boolean
  currentUserId: number
  currentUserRole: string
  savedCardOrder: string | null
  createdBy?: number | null
  chefPermissions?: unknown
  memberLimit?: number | null
}

function SortableCard({ id, children, spanFull }: { id: string; children: React.ReactNode; spanFull?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${spanFull ? 'lg:col-span-2' : ''} ${isDragging ? 'shadow-2xl ring-2 ring-indigo-300 z-50 opacity-90' : ''}`}
    >
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

export function GroupCards({
  groupId, groupType, showRoster = true, rehearsal, concert, members, showInvite,
  isChef, canManage, isAdmin, currentUserId, currentUserRole, savedCardOrder,
  createdBy, chefPermissions, memberLimit,
}: Props) {
  const isSchool = groupType === 'SCHOOL'
  const defaultOrder = ['rehearsal', 'concert', ...(showRoster ? ['members'] : []), ...(showInvite ? ['invite'] : [])]

  const LS_KEY = `group-card-order-${groupId}`

  const parseOrder = (raw: string | null): string[] => {
    if (!raw) return defaultOrder
    try {
      const parsed: string[] = JSON.parse(raw)
      const valid = parsed.filter((id) => defaultOrder.includes(id))
      return [...valid, ...defaultOrder.filter((id) => !valid.includes(id))]
    } catch {
      return defaultOrder
    }
  }

  // Prefer localStorage (survives router cache), fall back to DB value
  const [order, setOrder] = useState<string[]>(() => parseOrder(savedCardOrder))

  useEffect(() => {
    const local = localStorage.getItem(LS_KEY)
    if (local) setOrder(parseOrder(local))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = order.indexOf(String(active.id))
    const newIndex = order.indexOf(String(over.id))
    const newOrder = arrayMove(order, oldIndex, newIndex)
    setOrder(newOrder)
    localStorage.setItem(LS_KEY, JSON.stringify(newOrder))
    fetch(`/api/groupes/${groupId}/card-order`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: newOrder }),
    })
  }

  const cardContent: Record<string, { node: React.ReactNode; spanFull: boolean }> = {
    rehearsal: {
      spanFull: false,
      node: (
        <Card className="rounded-none border-0">
          <CardHeader
            title={isSchool ? 'Prochain cours' : 'Prochaine répétition'}
            action={
              <Link href={`/groupes/${groupId}/repetitions`} className="text-xs text-indigo-600 hover:text-indigo-500 font-medium">
                Voir tout
              </Link>
            }
          />
          {rehearsal ? (
            <Link
              href={`/groupes/${groupId}/repetitions/${rehearsal.id}`}
              className="block rounded-xl bg-blue-50 border border-blue-100 p-4 hover:border-blue-300 transition-colors"
            >
              <p className="font-medium text-gray-900 capitalize">{formatDateWithDay(rehearsal.date)}</p>
              <p className="text-sm text-gray-500 mt-1">
                {rehearsal.startTime}{rehearsal.endTime ? ` - ${rehearsal.endTime}` : ''}
              </p>
              <p className="text-sm text-gray-600">{rehearsal.location}</p>
            </Link>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">{isSchool ? 'Aucun cours prévu.' : 'Aucune répétition prévue.'}</p>
          )}
        </Card>
      ),
    },

    concert: {
      spanFull: false,
      node: (
        <Card className="rounded-none border-0">
          <CardHeader
            title="Prochain concert"
            action={
              <Link href={`/groupes/${groupId}/concerts`} className="text-xs text-indigo-600 hover:text-indigo-500 font-medium">
                Voir tout
              </Link>
            }
          />
          {concert ? (
            <div className="rounded-xl bg-purple-50 border border-purple-100 p-4">
              <p className="font-medium text-gray-900">{concert.name}</p>
              <p className="text-sm text-gray-500 mt-1 capitalize">{formatDateWithDay(concert.date)}</p>
              <p className="text-sm text-gray-600">{concert.location}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Aucun concert prévu.</p>
          )}
        </Card>
      ),
    },

    members: {
      spanFull: true,
      node: (
        <Card className="rounded-none border-0">
          <CardHeader title={`${isSchool ? 'Élèves' : 'Membres'} (${members.length})`} />
          <MembresPanel
            groupId={groupId}
            groupType={groupType}
            members={members}
            canManage={canManage}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            createdBy={createdBy}
            chefPermissions={chefPermissions}
            memberLimit={memberLimit}
          />
        </Card>
      ),
    },

    invite: {
      spanFull: true,
      node: (
        <Card className="rounded-none border-0">
          <CardHeader title={isSchool ? '➕ Inviter un élève' : '➕ Inviter un musicien'} />
          <InvitePanel groupId={groupId} groupType={groupType} />
        </Card>
      ),
    },
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {order.map((id) => {
            const card = cardContent[id]
            if (!card) return null
            return (
              <SortableCard key={id} id={id} spanFull={card.spanFull}>
                {card.node}
              </SortableCard>
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}

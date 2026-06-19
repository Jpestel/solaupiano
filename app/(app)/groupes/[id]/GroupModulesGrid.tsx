'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TchatBadge } from '@/components/ui/TchatBadge'

export interface GroupModuleLink {
  href: string
  label: string
  icon: string
  iconBg: string
  textColor: string
  border: string
  chefDesc: string
  memberDesc: string
}

function parseOrder(raw: string | null | undefined, defaults: string[]) {
  if (!raw) return defaults
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return defaults
    const valid = parsed.filter((id): id is string => typeof id === 'string' && defaults.includes(id))
    return [...valid, ...defaults.filter((id) => !valid.includes(id))]
  } catch {
    return defaults
  }
}

function SortableModuleCard({
  id,
  disabled,
  children,
}: {
  id: string
  disabled: boolean
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'relative z-50 opacity-90' : ''}
    >
      <div className="relative">
        {!disabled && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-lg bg-white/90 px-1.5 py-1 text-gray-300 shadow-sm ring-1 ring-gray-200 cursor-grab active:cursor-grabbing hover:text-indigo-500"
            title="Déplacer ce module"
            aria-label="Déplacer ce module"
          >
            <span className="block leading-none">⋮⋮</span>
          </button>
        )}
        {children}
      </div>
    </div>
  )
}

export function GroupModulesGrid({
  groupId,
  links,
  isChef,
  canReorder,
  initialOrder,
}: {
  groupId: number
  links: GroupModuleLink[]
  isChef: boolean
  canReorder: boolean
  initialOrder: string | null
}) {
  const defaultOrder = useMemo(() => links.map((l) => l.href), [links])
  const [order, setOrder] = useState<string[]>(() => parseOrder(initialOrder, defaultOrder))
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => {
    setOrder(parseOrder(initialOrder, defaultOrder))
  }, [initialOrder, defaultOrder])

  const linksByHref = useMemo(() => new Map(links.map((link) => [link.href, link])), [links])
  const visibleOrder = order.filter((href) => linksByHref.has(href))

  const saveOrder = async (nextOrder: string[]) => {
    await fetch(`/api/groupes/${groupId}/module-order`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: nextOrder }),
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = visibleOrder.indexOf(String(active.id))
    const newIndex = visibleOrder.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return

    const reorderedVisible = arrayMove(visibleOrder, oldIndex, newIndex)
    const hidden = order.filter((href) => !linksByHref.has(href))
    const nextOrder = [...reorderedVisible, ...hidden]
    setOrder(nextOrder)
    saveOrder(nextOrder)
  }

  const grid = (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2 mb-2">
      {visibleOrder.map((href) => {
        const link = linksByHref.get(href)
        if (!link) return null
        return (
          <SortableModuleCard key={link.href} id={link.href} disabled={!canReorder}>
            <Link
              href={`/groupes/${groupId}/${link.href}`}
              data-bubble={`mod-${link.href}`}
              className={`module-tile relative flex items-center gap-2.5 rounded-xl border px-3 py-2.5 group ${canReorder ? 'pl-9' : ''} ${link.border}`}
            >
              <span className="module-tile-sheen" aria-hidden />
              <div className={`module-tile-icon relative z-10 w-8 h-8 rounded-lg ${link.iconBg} flex items-center justify-center text-base flex-shrink-0 transition-transform group-hover:scale-110`}>
                {link.icon}
              </div>
              <div className="relative z-10 min-w-0 flex-1">
                <p className={`text-sm font-semibold ${link.textColor} leading-tight`}>{link.label}</p>
                <p className="text-[11px] text-gray-400 leading-tight mt-0.5 truncate">
                  {isChef ? link.chefDesc : link.memberDesc}
                </p>
              </div>
              <span className={`relative z-10 flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full transition-all ${link.iconBg} ${link.textColor} opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </span>
              {link.href === 'tchat' && <TchatBadge groupId={String(groupId)} />}
            </Link>
          </SortableModuleCard>
        )
      })}
    </div>
  )

  if (!canReorder) return grid

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={visibleOrder} strategy={rectSortingStrategy}>
        {grid}
      </SortableContext>
    </DndContext>
  )
}

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
            className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-gray-300 shadow-sm ring-1 ring-gray-200 cursor-grab active:cursor-grabbing hover:text-indigo-500 sm:left-2 sm:right-auto sm:top-1/2 sm:-translate-y-1/2"
            title="Déplacer ce module"
            aria-label="Déplacer ce module"
          >
            <span className="block text-sm leading-none">⋮⋮</span>
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
    <div className="mb-2 grid grid-cols-1 gap-2.5 min-[430px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {visibleOrder.map((href) => {
        const link = linksByHref.get(href)
        if (!link) return null
        return (
          <SortableModuleCard key={link.href} id={link.href} disabled={!canReorder}>
            <Link
              href={`/groupes/${groupId}/${link.href}`}
              data-bubble={`mod-${link.href}`}
              className={`module-tile relative flex min-h-[78px] items-center gap-3 rounded-xl border px-3.5 py-3 group sm:min-h-[70px] ${canReorder ? 'pr-11 sm:pl-9 sm:pr-3' : ''} ${link.border}`}
            >
              <span className="module-tile-sheen" aria-hidden />
              <div className={`module-tile-icon relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg transition-transform group-hover:scale-105 sm:h-9 sm:w-9 ${link.iconBg}`}>
                {link.icon}
              </div>
              <div className="relative z-10 min-w-0 flex-1">
                <p className={`text-[15px] font-semibold ${link.textColor} leading-tight sm:text-sm`}>{link.label}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-snug text-gray-500 sm:mt-0.5 sm:text-[11px]">
                  {isChef ? link.chefDesc : link.memberDesc}
                </p>
              </div>
              <span className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all ${link.iconBg} ${link.textColor} opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5`}>
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

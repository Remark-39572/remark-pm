'use client'

/**
 * Wraps a list of rows with dnd-kit sortable context. Children render the
 * actual table/row markup; SortableItem provides the drag handle and
 * applies transform during drag.
 *
 * Designed for table rows but works for any block-level element. The drag
 * handle is rendered by the caller via the render prop; click events outside
 * the handle still fire normally so rows can stay clickable for navigation.
 */

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ReactNode, useState, useTransition } from 'react'

type Identifiable = { id: string }

export function SortableList<T extends Identifiable>({
  items,
  onReorder,
  children,
}: {
  items: T[]
  onReorder: (orderedIds: string[]) => Promise<void> | void
  children: (item: T, dragHandle: ReactNode) => ReactNode
}) {
  const [ordered, setOrdered] = useState(items)
  const [, startTransition] = useTransition()

  // Keep local state in sync when the server returns new data
  if (
    items.length !== ordered.length ||
    items.some((it, i) => it.id !== ordered[i]?.id)
  ) {
    // Only resync when the set of IDs actually changes - reordering inside
    // wouldn't change length but would change the order; we treat the
    // server data as source of truth on prop change.
    const sameSet =
      items.length === ordered.length &&
      items.every((it) => ordered.some((o) => o.id === it.id))
    if (!sameSet) {
      setOrdered(items)
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ordered.findIndex((i) => i.id === active.id)
    const newIndex = ordered.findIndex((i) => i.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(ordered, oldIndex, newIndex)
    setOrdered(next)
    startTransition(() => {
      void onReorder(next.map((i) => i.id))
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={ordered.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        {ordered.map((item) => (
          <SortableItem key={item.id} id={item.id}>
            {(handle) => children(item, handle)}
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  )
}

function SortableItem({
  id,
  children,
}: {
  id: string
  children: (dragHandle: ReactNode) => ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
  }

  const handle = (
    <button
      type="button"
      aria-label="Drag to reorder"
      {...attributes}
      {...listeners}
      onClick={(e) => e.stopPropagation()}
      className="cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="4" cy="3" r="1.2" fill="currentColor" />
        <circle cx="10" cy="3" r="1.2" fill="currentColor" />
        <circle cx="4" cy="7" r="1.2" fill="currentColor" />
        <circle cx="10" cy="7" r="1.2" fill="currentColor" />
        <circle cx="4" cy="11" r="1.2" fill="currentColor" />
        <circle cx="10" cy="11" r="1.2" fill="currentColor" />
      </svg>
    </button>
  )

  return (
    <tr ref={setNodeRef} style={style}>
      {children(handle)}
    </tr>
  )
}

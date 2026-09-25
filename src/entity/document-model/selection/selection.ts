// Selection: the selected items and whether their pick order can be relied on.
// @unit      UF-55   (docs/spec/05-07-design.md, table T-075)
// @component Selection, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-32

import { taskByUid, type Schedule } from '../schedule/schedule'

// see SL-1
export type SelectableKind =
  | 'task'
  | 'dependency'
  | 'highlightBox'
  | 'commentBox'
  | 'statusLine'

export type ItemRef =
  | { readonly kind: 'task'; readonly uid: number }
  | { readonly kind: 'dependency'; readonly successorUid: number; readonly ordinal: number }
  | { readonly kind: 'highlightBox'; readonly id: string }
  | { readonly kind: 'commentBox'; readonly id: string }
  | { readonly kind: 'statusLine' }

export interface Selection {
  readonly items: readonly ItemRef[]
  readonly ordered: boolean
}

const EMPTY: Selection = { items: [], ordered: true }

/** @purity pure */
export function emptySelection(): Selection {
  return EMPTY
}

/** @purity pure */
export function isSameItem(a: ItemRef, b: ItemRef): boolean {
  if (a.kind !== b.kind) return false
  switch (a.kind) {
    case 'task':
      return a.uid === (b as Extract<ItemRef, { kind: 'task' }>).uid
    case 'dependency': {
      const other = b as Extract<ItemRef, { kind: 'dependency' }>
      return a.successorUid === other.successorUid && a.ordinal === other.ordinal
    }
    case 'highlightBox':
    case 'commentBox':
      return a.id === (b as Extract<ItemRef, { kind: 'highlightBox' | 'commentBox' }>).id
    case 'statusLine':
      return true
  }
}

/** @purity pure */
export function isSelected(selection: Selection, item: ItemRef): boolean {
  return selection.items.some((held) => isSameItem(held, item))
}

/** @purity pure */
export function selectionWith(selection: Selection, item: ItemRef): Selection {
  if (isSelected(selection, item)) return selection
  return { items: [...selection.items, item], ordered: selection.ordered }
}

/** @purity pure */
export function selectionOfAll(items: readonly ItemRef[]): Selection {
  return { items: [...items], ordered: false }
}

/** @purity pure */
export function selectionWithout(selection: Selection, item: ItemRef): Selection {
  const items = selection.items.filter((held) => !isSameItem(held, item))
  if (items.length === selection.items.length) return selection
  return { items, ordered: selection.ordered }
}

// see FR-034, SL-7b
/** @purity pure */
export function lastPicked(selection: Selection): ItemRef | null {
  if (!selection.ordered || selection.items.length === 0) return null
  return selection.items[selection.items.length - 1] ?? null
}

// see T-023c
/** @purity pure */
function scheduleHolds(schedule: Schedule, item: ItemRef): boolean {
  switch (item.kind) {
    case 'task':
      return taskByUid(schedule, item.uid) !== null
    case 'dependency': {
      const successor = taskByUid(schedule, item.successorUid)
      return successor !== null && item.ordinal < successor.dependencies.length
    }
    case 'highlightBox':
      return schedule.highlightBoxes.some((box) => box.id === item.id)
    case 'commentBox':
      return schedule.commentBoxes.some((box) => box.id === item.id)
    case 'statusLine':
      return schedule.project.statusDate !== null
  }
}

// see T-023c
/** @purity pure */
export function selectionWithinSchedule(selection: Selection, schedule: Schedule): Selection {
  const items = selection.items.filter((item) => scheduleHolds(schedule, item))
  // TRAP: the shell compares selections by identity; a fresh object here reopens
  // the Properties Panel on every unrelated edit.
  if (items.length === selection.items.length) return selection
  return selection.ordered ? { items, ordered: true } : selectionOfAll(items)
}

// Selection -- public entry of this folder.
//
// @unit      UF-55   (docs/spec/05-07-design.md, table T-075)
// @component Selection, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-32
//
// `ordered` is part of the value rather than left to a caller to remember,
// because FR-034 may only line tasks up against an order that exists (SL-7b of
// table T-023c). Not saved in the document (LY-1 of table T-060).

/** SL-1 of table T-023c. */
export type SelectableKind =
  | 'task'
  | 'dependency'
  | 'highlightBox'
  | 'commentBox'
  | 'statusLine'

/** One selected thing. `statusLine` is the single line, so it carries no id. */
export type ItemRef =
  | { readonly kind: 'task'; readonly uid: number }
  | { readonly kind: 'dependency'; readonly successorUid: number; readonly ordinal: number }
  | { readonly kind: 'highlightBox'; readonly id: string }
  | { readonly kind: 'commentBox'; readonly id: string }
  | { readonly kind: 'statusLine' }

export interface Selection {
  /** In the order they were picked, oldest first. */
  readonly items: readonly ItemRef[]
  /** Whether `items` carries an order a caller may rely on (SL-7b). */
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

/**
 * Adding something already held leaves the selection alone, so the first pick
 * is the one the order remembers (SL-7b).
 *
 * @purity pure
 */
export function selectionWith(selection: Selection, item: ItemRef): Selection {
  if (isSelected(selection, item)) return selection
  return { items: [...selection.items, item], ordered: selection.ordered }
}

/**
 * A marquee (SL-3) or select-all (SL-5): no order, so FR-034 must refuse it.
 *
 * @purity pure
 */
export function selectionOfAll(items: readonly ItemRef[]): Selection {
  return { items: [...items], ordered: false }
}

/** @purity pure */
export function selectionWithout(selection: Selection, item: ItemRef): Selection {
  const items = selection.items.filter((held) => !isSameItem(held, item))
  if (items.length === selection.items.length) return selection
  return { items, ordered: selection.ordered }
}

/**
 * The one FR-034 lines the others up against; null without an order, so a
 * caller cannot reach past SL-7b.
 *
 * @purity pure
 */
export function lastPicked(selection: Selection): ItemRef | null {
  if (!selection.ordered || selection.items.length === 0) return null
  return selection.items[selection.items.length - 1] ?? null
}

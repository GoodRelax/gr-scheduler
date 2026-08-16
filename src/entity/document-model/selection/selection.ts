// Selection -- public entry of this folder.
//
// @unit      UF-55   (docs/spec/05-07-design.md, table T-075)
// @component Selection, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-32
//
// What may be selected is SL-1 of table T-023c. The order a selection carries
// is SL-7b: picking one at a time makes an order, a marquee (SL-3) and select
// all (SL-5) do not, and FR-034 may only line tasks up against an order that
// exists. That is why `ordered` is part of the value and not something a
// caller is trusted to remember.
//
// A selection is not part of the document (table T-027 UN-9), which is why it
// lives here as a value the Framework holds rather than as a saved column.

/** The kinds SL-1 of table T-023c admits. Rows are deliberately not among them. */
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
  /**
   * Whether `items` carries an order a caller may rely on (SL-7b). False for a
   * marquee or a select-all, which pick everything at once.
   */
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
 * Add one thing to a selection, keeping the order it was picked in (SL-7b).
 * Adding something already held leaves the selection alone, so the first pick
 * is the one the order remembers.
 *
 * @purity pure
 */
export function selectionWith(selection: Selection, item: ItemRef): Selection {
  if (isSelected(selection, item)) return selection
  return { items: [...selection.items, item], ordered: selection.ordered }
}

/**
 * Replace a selection with everything picked at once -- a marquee (SL-3) or a
 * select-all (SL-5). The result carries no order, so FR-034 must refuse it.
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
 * The one picked last, which FR-034 lines the others up against. Absent when
 * the selection carries no order, so a caller cannot reach past SL-7b.
 *
 * @purity pure
 */
export function lastPicked(selection: Selection): ItemRef | null {
  if (!selection.ordered || selection.items.length === 0) return null
  return selection.items[selection.items.length - 1] ?? null
}

// DocumentCodec, MSPDI half -- places the children of a written element in the partner schema's order.
// @unit      UF-154  (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    pure

import type { CarryElement } from '../../entity/document-model/schedule/schedule'
import childOrder from './mspdi-child-order.json'
import type { XmlElement } from './mspdi-xml'

interface ParentOrder {
  readonly isAll: boolean
  readonly ranks: ReadonlyMap<string, number>
  readonly pj15Only: ReadonlySet<string>
}

// see EX-1, EX-10, AT-143
export const PARENT_ORDERS: ReadonlyMap<string, ParentOrder> = new Map(
  Object.entries(childOrder.parents).map(([path, row]) => [path, {
    isAll: row.all,
    ranks: new Map(row.children.map((name, rank) => [name, rank])),
    pj15Only: new Set(row.pj15Only),
  }]),
)

export type ParentPath = keyof typeof childOrder.parents

/** @purity pure */
export function writtenCarriedElement(carried: CarryElement, path: string): XmlElement {
  const held = heldInArrivalOrder(path, carried.fields, carried.children)
  return { name: carried.name, text: '', children: placedChildren(path, held, [], 'siblings') }
}

export interface PlacedChild {
  readonly element: XmlElement
}

// WHY: a row GRS holds keeps no place between a carried leaf, a carried element and the children it writes, so
// under such a row an undeclared child is placed among the carried siblings of its own kind (EX-10).
type ChildAnchors = 'kind' | 'siblings'

// see EX-10
/** @purity pure */
export function writtenChildren(
  path: string,
  named: readonly PlacedChild[],
  carry: Readonly<Record<string, string>>,
  carried: readonly CarryElement[],
): readonly XmlElement[] {
  const written = named.map((one) => one.element)
  return placedChildren(path, heldInArrivalOrder(path, carry, carried), written, 'kind')
}

// see EX-10
/** @purity pure */
function placedChildren(
  path: string,
  held: readonly XmlElement[],
  written: readonly XmlElement[],
  anchors: ChildAnchors,
): readonly XmlElement[] {
  const order = PARENT_ORDERS.get(path)
  // WHY: an xsd:all parent takes any order and a parent the table lacks names none, so either keeps
  // the order the file arrived in.
  if (order === undefined || order.isAll) return [...held, ...written]
  return inSchemaOrder(order.ranks, held, written, anchors)
}

/** @purity pure */
function heldInArrivalOrder(
  path: string,
  leaves: Readonly<Record<string, string>>,
  carried: readonly CarryElement[],
): XmlElement[] {
  const elements = [...carried].sort((a, b) => a.ordinal - b.ordinal)
  const texts = Object.entries(leaves)
  const held: XmlElement[] = []
  // TRAP: a leaf keeps no ordinal (AT-125), so leaves fill in order the places the carried ordinals leave free.
  for (let leafAt = 0, elementAt = 0; leafAt < texts.length || elementAt < elements.length;) {
    const element = elements[elementAt]
    const text = texts[leafAt]
    if (element !== undefined && (text === undefined || element.ordinal <= held.length)) {
      held.push(writtenCarriedElement(element, `${path}/${element.name}`))
      elementAt += 1
    } else if (text !== undefined) {
      held.push({ name: text[0], text: text[1], children: [] })
      leafAt += 1
    }
  }
  return held
}

interface RankedChild {
  readonly element: XmlElement
  readonly rank: number
  readonly isWritten: boolean
  readonly arrival: number
}

// see EX-10
/** @purity pure */
function inSchemaOrder(
  ranks: ReadonlyMap<string, number>,
  held: readonly XmlElement[],
  written: readonly XmlElement[],
  anchors: ChildAnchors,
): readonly XmlElement[] {
  const declared: RankedChild[] = []
  const rankOf = (element: XmlElement): number => ranks.get(element.name) ?? ranks.size
  held.forEach((element, arrival) => {
    if (ranks.has(element.name)) declared.push({ element, rank: rankOf(element), isWritten: false, arrival })
  })
  written.forEach((element, arrival) => {
    declared.push({ element, rank: rankOf(element), isWritten: true, arrival })
  })
  // TRAP: at one rank the held come first, so a written fade value follows the carried ones of its name.
  declared.sort((a, b) => a.rank - b.rank
    || Number(a.isWritten) - Number(b.isWritten) || a.arrival - b.arrival)
  const undeclared = undeclaredByNeighbour(ranks, held, anchors)
  const ordered: XmlElement[] = []
  for (const one of declared) {
    ordered.push(...undeclared.before.get(one.element) ?? [], one.element)
    ordered.push(...undeclared.after.get(one.element) ?? [])
  }
  return [...ordered, ...undeclared.unanchored]
}

interface UndeclaredPlaces {
  readonly after: ReadonlyMap<XmlElement, readonly XmlElement[]>
  readonly before: ReadonlyMap<XmlElement, readonly XmlElement[]>
  readonly unanchored: readonly XmlElement[]
}

// see EX-10
/** @purity pure */
function undeclaredByNeighbour(
  ranks: ReadonlyMap<string, number>,
  held: readonly XmlElement[],
  anchors: ChildAnchors,
): UndeclaredPlaces {
  if (anchors === 'siblings') return placesByNeighbour(ranks, held)
  const isLeaf = (element: XmlElement): boolean => element.children.length === 0
  const byLeaves = placesByNeighbour(ranks, held.filter(isLeaf))
  const byElements = placesByNeighbour(ranks, held.filter((element) => !isLeaf(element)))
  return mergedInArrival(held, [byLeaves, byElements])
}

/** @purity pure */
function mergedInArrival(held: readonly XmlElement[], places: readonly UndeclaredPlaces[]): UndeclaredPlaces {
  const arrival = new Map(held.map((element, at) => [element, at]))
  const inArrival = (list: readonly XmlElement[]): readonly XmlElement[] =>
    [...list].sort((a, b) => (arrival.get(a) ?? 0) - (arrival.get(b) ?? 0))
  const joined = (side: 'after' | 'before'): ReadonlyMap<XmlElement, readonly XmlElement[]> => {
    const lists = new Map<XmlElement, XmlElement[]>()
    for (const one of places) {
      for (const [anchor, list] of one[side]) lists.set(anchor, [...lists.get(anchor) ?? [], ...list])
    }
    return new Map([...lists].map(([anchor, list]): [XmlElement, readonly XmlElement[]] => [anchor, inArrival(list)]))
  }
  const unanchored = inArrival(places.flatMap((one) => one.unanchored))
  return { after: joined('after'), before: joined('before'), unanchored }
}

// WHY: a child neither schema declares has no rank, so it rides with the declared child before it, or
// with the one after it when it came first; with no declared neighbour at all it goes last.
/** @purity pure */
function placesByNeighbour(
  ranks: ReadonlyMap<string, number>,
  held: readonly XmlElement[],
): UndeclaredPlaces {
  const after = new Map<XmlElement, XmlElement[]>()
  const before = new Map<XmlElement, XmlElement[]>()
  let leading: XmlElement[] = []
  let anchor: XmlElement | null = null
  for (const element of held) {
    if (ranks.has(element.name)) {
      if (anchor === null && leading.length > 0) before.set(element, leading)
      leading = []
      anchor = element
    } else if (anchor === null) {
      leading.push(element)
    } else {
      after.set(anchor, [...after.get(anchor) ?? [], element])
    }
  }
  return { after, before, unanchored: leading }
}

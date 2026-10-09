// ScheduleGeometry -- the parent task arrows of the drawn families, and the marks of a child whose parent is undecided (FR-135).
// @unit      UF-196  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleGeometry, layer layoutEngine (table T-062)
// @purity    pure
// Generated region at the end: docs/spec/_source/settings.json (table T-206). Do not edit by hand; npm run gen.

import type { ParentTaskResolution } from '../../document-model/schedule/schedule'
import type { ScreenRect } from '../screen-regions/screen-regions'
import { placedEndOf, plannedPlacementsOf, unseenEndStubOf, type LinkEnd } from './dependency-route'
import { point, type GeometryInputs, type Path, type Point } from './schedule-geometry'

// see FR-135, T-351
export interface ParentTaskFamilies {
  readonly resolutions: ReadonlyMap<number, ParentTaskResolution>
  readonly ownerUids: readonly number[]
  readonly pointedUid: number | null
  readonly selectedLinkChildUids: ReadonlySet<number>
}

// see FR-135, S-19, S-300, S-485, S-486
export interface ParentTaskArrowGeometry {
  readonly childUid: number
  readonly parentUid: number
  readonly isStated: boolean
  readonly isSelected: boolean
  readonly points: Path
  readonly head: Path
  readonly hitPoints: Path
  readonly hitWidth: number
  readonly dash: readonly [number, number] | null
  // see FR-135, EL-20, TV-3
  // TRAP: optional so literals compile; absent draws no mark, the same as an empty list.
  readonly continuationDots?: readonly Point[]
  readonly continuationRadius?: number
}

// see FR-135, VO-4, IP-4
export interface ParentTaskCandidateGeometry {
  readonly uid: number
  readonly order: number
  readonly box: ScreenRect
  readonly labelAt: Point
}

export interface ParentTaskQueryGeometry {
  readonly childUid: number
  readonly markAt: Point
  readonly fontSize: number
  readonly candidates: readonly ParentTaskCandidateGeometry[]
  readonly dash: readonly [number, number]
}

export interface ParentTaskGeometry {
  readonly arrows: readonly ParentTaskArrowGeometry[]
  readonly queries: readonly ParentTaskQueryGeometry[]
  readonly highlightedParentUid: number | null
}

// see FR-135
// WHY: three, as the ruling's sample showed; more numbers than that crowd the bars they ring.
const SHOWN_CANDIDATE_COUNT = 3

const NO_PARENT_TASK_GEOMETRY: ParentTaskGeometry = { arrows: [], queries: [], highlightedParentUid: null }

/** @purity pure */
function parentUidOf(resolution: ParentTaskResolution | undefined): number | null {
  if (resolution === undefined) return null
  return resolution.kind === 'stated' || resolution.kind === 'derived' ? resolution.parentUid : null
}

/** @purity pure */
function middleXOf(end: LinkEnd): number {
  return end.x + end.width / 2
}

// see FR-135, S-19, S-300
// WHY: the bend sits one head length above the child, so a bent arrow never runs along the child's own top edge.
/** @purity pure */
function arrowOf(inputs: GeometryInputs, child: LinkEnd, parent: LinkEnd, resolution: ParentTaskResolution,
                 isSelected: boolean): ParentTaskArrowGeometry {
  const length = inputs.settings.dependencyArrowLength
  const half = inputs.settings.dependencyArrowWidth / 2
  const isAbove = parent.bottom <= child.top
  const fromY = isAbove ? child.top : child.bottom
  const tipY = isAbove ? parent.bottom : parent.top
  const toward = isAbove ? -1 : 1
  const baseY = tipY - toward * length
  const childX = middleXOf(child)
  const inset = Math.min(half, parent.width / 2)
  const tipX = Math.min(Math.max(childX, parent.x + inset), parent.x + parent.width - inset)
  const bendY = fromY + toward * length
  const points: Path = tipX === childX
    ? [point(childX, fromY), point(childX, baseY)]
    : [point(childX, fromY), point(childX, bendY), point(tipX, bendY), point(tipX, baseY)]
  const isStated = resolution.kind === 'stated'
  const sizes = NOT_STORED_PARENT_TASK_ARROW_SIZES
  return {
    childUid: child.taskUid,
    parentUid: parent.taskUid,
    isStated,
    isSelected: isStated && isSelected,
    points,
    head: [point(tipX, tipY), point(tipX + half, baseY), point(tipX - half, baseY)],
    hitPoints: [...points, point(tipX, tipY)],
    hitWidth: sizes['S-485'],
    dash: isStated ? null : sizes['S-486'],
  }
}

// see FR-135, EL-20, TV-3
// WHY: the far end is the one the filter leaves undrawn; the stub stands on the seen end, up from a child and down from a parent.
/** @purity pure */
function stubOf(inputs: GeometryInputs, seen: LinkEnd, isChildSeen: boolean, childUid: number, parentUid: number,
                resolution: ParentTaskResolution): ParentTaskArrowGeometry {
  const midX = middleXOf(seen)
  const from = point(midX, isChildSeen ? seen.top : seen.bottom)
  const stub = unseenEndStubOf(from, isChildSeen ? -1 : 1, inputs.settings)
  const half = inputs.settings.dependencyArrowWidth / 2
  const length = inputs.settings.dependencyArrowLength
  const points: Path = isChildSeen ? stub.line : [...stub.line].reverse()
  const head: Path = isChildSeen ? [] : [from, point(midX + half, from.y + length), point(midX - half, from.y + length)]
  const isStated = resolution.kind === 'stated'
  const sizes = NOT_STORED_PARENT_TASK_ARROW_SIZES
  return {
    childUid,
    parentUid,
    isStated,
    isSelected: false,
    points,
    head,
    hitPoints: stub.line,
    hitWidth: sizes['S-485'],
    dash: isStated ? null : sizes['S-486'],
    continuationDots: stub.dots,
    continuationRadius: stub.radius,
  }
}

// see FR-135, VO-4, IP-4
/** @purity pure */
function queryOf(child: LinkEnd, fontSize: number, candidates: readonly number[],
                 endByUid: ReadonlyMap<number, LinkEnd>): ParentTaskQueryGeometry {
  const shown: ParentTaskCandidateGeometry[] = []
  for (const uid of candidates) {
    if (shown.length === SHOWN_CANDIDATE_COUNT) break
    const end = endByUid.get(uid)
    if (end === undefined) continue
    const box = { x: end.x, y: end.top, width: end.width, height: end.bottom - end.top }
    shown.push({ uid, order: shown.length + 1, box, labelAt: point(end.x + end.width + fontSize, (end.top + end.bottom) / 2) })
  }
  return {
    childUid: child.taskUid,
    markAt: point(child.x + child.width + fontSize, (child.top + child.bottom) / 2),
    fontSize,
    candidates: shown,
    dash: NOT_STORED_PARENT_TASK_ARROW_SIZES['S-486'],
  }
}

/** @purity pure */
function childrenByParentOf(resolutions: ReadonlyMap<number, ParentTaskResolution>): ReadonlyMap<number, readonly number[]> {
  const children = new Map<number, number[]>()
  for (const [uid, resolution] of resolutions) {
    const parent = parentUidOf(resolution)
    if (parent === null) continue
    const held = children.get(parent)
    if (held === undefined) children.set(parent, [uid])
    else held.push(uid)
  }
  return children
}

// see FR-135, T-351, JDG-1131
// WHY: only the owners' families, never every pair: one sheet full of arrows reads as nothing (JDG-1131).
/** @purity pure */
export function parentTaskGeometryOf(inputs: GeometryInputs, families: ParentTaskFamilies | null): ParentTaskGeometry {
  if (families === null) return NO_PARENT_TASK_GEOMETRY
  const placements = plannedPlacementsOf(inputs)
  const endByUid = new Map(placements.map((one) => [one.taskUid, placedEndOf(one, inputs.settings)]))
  const fontByUid = new Map(placements.map((one) => [one.taskUid, one.labelFontSize]))
  const childrenOf = childrenByParentOf(families.resolutions)
  const arrows: ParentTaskArrowGeometry[] = []
  const queries: ParentTaskQueryGeometry[] = []
  const drawn = new Set<number>()
  const shown = inputs.layout.shownTaskUids ?? null
  // see TV-3
  const isFiltered = (uid: number): boolean => shown !== null && !shown.has(uid)
  const pairOf = (childUid: number): void => {
    if (drawn.has(childUid)) return
    const resolution = families.resolutions.get(childUid)
    const parentUid = parentUidOf(resolution)
    const child = endByUid.get(childUid)
    const parent = parentUid === null ? undefined : endByUid.get(parentUid)
    if (resolution === undefined || parentUid === null) return
    if (child !== undefined && parent === undefined && isFiltered(parentUid)) {
      drawn.add(childUid)
      return void arrows.push(stubOf(inputs, child, true, childUid, parentUid, resolution))
    }
    if (child === undefined && parent !== undefined && isFiltered(childUid)) {
      drawn.add(childUid)
      return void arrows.push(stubOf(inputs, parent, false, childUid, parentUid, resolution))
    }
    if (child === undefined || parent === undefined) return
    drawn.add(childUid)
    arrows.push(arrowOf(inputs, child, parent, resolution, families.selectedLinkChildUids.has(childUid)))
  }
  for (const owner of families.ownerUids) {
    pairOf(owner)
    for (const child of childrenOf.get(owner) ?? []) pairOf(child)
    const resolution = families.resolutions.get(owner)
    const end = endByUid.get(owner)
    if (resolution?.kind === 'undecided' && end !== undefined && !queries.some((one) => one.childUid === owner)) {
      queries.push(queryOf(end, fontByUid.get(owner) ?? 0, resolution.candidates, endByUid))
    }
  }
  const pointed = families.pointedUid === null ? undefined : families.resolutions.get(families.pointedUid)
  return { arrows, queries, highlightedParentUid: parentUidOf(pointed) }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
const NOT_STORED_PARENT_TASK_ARROW_SIZES: {
  readonly 'S-485': number
  readonly 'S-486': readonly [number, number]
} = {
  'S-485': 12,
  'S-486': [5, 4],
}
// </generated>

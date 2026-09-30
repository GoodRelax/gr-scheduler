// ScheduleGeometry -- the dependency lines: their routes and arrow heads (FR-009).
// @unit      UF-145  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleGeometry, layer layoutEngine (table T-062)
// @purity    pure

import type { DrawnSettings } from '../../document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../document-model/schedule/schedule'
import type { Selection } from '../../document-model/selection/selection'
import type { TaskPlacement } from '../schedule-layout/schedule-layout'
import { displayRatioOf } from '../screen-regions/screen-regions'
import {
  point,
  type ContinuationGeometry,
  type DependencyGeometry,
  type Elision,
  type FarEndGeometry,
  type GeometryInputs,
  type Path,
  type Point,
} from './schedule-geometry'
import { isThinShape, thinTierMiddle } from './task-figures'

export interface LinkEnd {
  readonly taskUid: number
  readonly x: number
  readonly width: number
  readonly top: number
  readonly bottom: number
  readonly middle: number
  readonly drawnBottom: number
}

// see EL-1, EL-2, EL-9
export interface SightedEnd {
  readonly end: LinkEnd
  readonly far: FarEndGeometry
}

// see EL-9
const CONTINUATION_DOT_COUNT = 3

// see DP-1, DP-3
/** @purity pure */
function exitsRight(linkType: number): boolean {
  return linkType === 1 || linkType === 0
}

// see DP-3, DP-4
/** @purity pure */
function sameSide(linkType: number): boolean {
  return linkType === 0 || linkType === 3
}

// see VG-5
// TRAP: shape-cross-sections.ts lays the tier by the same overhang (drawnEdgeOverhangOf); change both together.
/** @purity pure */
function drawnOverhangOf(placed: TaskPlacement, settings: DrawnSettings): number {
  const isLine = placed.shapeKind === 'arrow' || placed.shapeKind === 'endpointSpan'
  return isLine ? 0 : settings.planStroke / 2
}

// see FR-009, EL-1
/** @purity pure */
export function placedEndOf(placed: TaskPlacement, settings: DrawnSettings): LinkEnd {
  const thin = isThinShape(placed.shapeKind)
  const band = thin ? placed.height : placed.planHeight
  return {
    taskUid: placed.taskUid,
    x: placed.x,
    width: placed.width,
    top: placed.y,
    bottom: placed.y + band,
    middle: thin ? thinTierMiddle(placed, settings, false) : placed.y + placed.planHeight / 2,
    drawnBottom: placed.y + band + drawnOverhangOf(placed, settings),
  }
}

// see EL-2
/** @purity pure */
export function standingEndOf(taskUid: number, x: number, width: number, y: number): LinkEnd {
  return { taskUid, x, width, top: y, bottom: y, middle: y, drawnBottom: y }
}

interface Anchored {
  readonly edge: number
  readonly middle: number
  readonly top: number
  readonly bottom: number
  readonly drawnBottom: number
}

// see LF-5, VG-2, VG-5
/** @purity pure */
function corridorY(from: Anchored, to: Anchored, settings: DrawnSettings): number {
  const gap = settings.stackGap + settings.dependencyWidth + settings.stackGap
  if (Math.abs(from.top - to.top) < 0.5) return from.drawnBottom + gap / 2
  return to.top > from.top ? (from.bottom + to.top) / 2 : (to.bottom + from.top) / 2
}

// see T-222
// WHY: argued, NOT measured (JDG-138): an x of 1e9 px, a thousand years of days at the widest S-1 x S-236 x S-98,
// has an ulp near 1.2e-7 px, so a few rounded terms stay under this, and no screen resolves a millionth of a pixel.
const DRAWN_PX_ROUNDING = 1e-6

// see T-222
// TRAP: the spec's at-least is exact; this absorbs rounding only. A gap is a difference of two absolute edges, so once
// S-236 makes a day non-dyadic an equal run falls short by an ulp and RP-1 turned into RP-4 (DFC-616).
/** @purity pure */
export function isAtLeastDrawnPx(value: number, bound: number): boolean {
  return value >= bound - DRAWN_PX_ROUNDING
}

// see T-222
/** @purity pure */
function routeOf(from: Anchored, to: Anchored, linkType: number, settings: DrawnSettings): {
  readonly pattern: DependencyGeometry['pattern']
  readonly points: Path
} {
  const entryRun = settings.dependencyLeadIn
  const exitRun = settings.dependencyLeadOut
  const x1 = from.edge + exitRun
  const sameLane = Math.abs(from.middle - to.middle) < 0.5
  const below = to.middle > from.middle

  if (sameSide(linkType)) {
    const x2 = to.edge + entryRun
    if (sameLane) {
      const outward = isAtLeastDrawnPx(Math.abs(x1 - x2), exitRun) ? x1 : x2 + exitRun
      const corridor = corridorY(from, to, settings)
      return {
        pattern: 'RP-8',
        points: [
          point(from.edge, from.middle),
          point(outward, from.middle),
          point(outward, corridor),
          point(x2, corridor),
          point(x2, to.middle),
          point(to.edge, to.middle),
        ],
      }
    }
    const back = Math.max(x1, x2)
    return {
      pattern: below ? 'RP-6' : 'RP-7',
      points: [
        point(from.edge, from.middle),
        point(back, from.middle),
        point(back, to.middle),
        point(to.edge, to.middle),
      ],
    }
  }

  const x2 = to.edge - entryRun
  if (sameLane && isAtLeastDrawnPx(to.edge - from.edge, entryRun)) {
    return { pattern: 'RP-1', points: [point(from.edge, from.middle), point(to.edge, to.middle)] }
  }
  if (!sameLane && isAtLeastDrawnPx(x2, x1)) {
    const mid = Math.max(x1, Math.min((from.edge + to.edge) / 2, x2))
    return {
      pattern: below ? 'RP-2' : 'RP-3',
      points: [
        point(from.edge, from.middle),
        point(mid, from.middle),
        point(mid, to.middle),
        point(to.edge, to.middle),
      ],
    }
  }
  const corridor = corridorY(from, to, settings)
  return {
    pattern: below || sameLane ? 'RP-4' : 'RP-5',
    points: [
      point(from.edge, from.middle),
      point(x1, from.middle),
      point(x1, corridor),
      point(x2, corridor),
      point(x2, to.middle),
      point(to.edge, to.middle),
    ],
  }
}

// see SL-8, FR-009
/** @purity pure */
export function selectedLinksOf(schedule: Schedule, selection: Selection): ReadonlySet<string> {
  const picked = new Set<string>()
  for (const item of selection.items) {
    if (item.kind === 'dependency') picked.add(`${item.successorUid}#${item.ordinal}`)
  }
  const out = new Set<string>()
  if (picked.size === 0) return out
  for (const successor of schedule.tasks) {
    for (const [ordinal, link] of successor.dependencies.entries()) {
      if (picked.has(`${successor.uid}#${ordinal}`)) out.add(`${link.predecessorUid}>${successor.uid}`)
    }
  }
  return out
}

// see S-19, S-300, GA-19
/** @purity pure */
function headingOf(points: Path): Point {
  for (let index = points.length - 1; index > 0; index -= 1) {
    const before = points[index - 1]!
    const run = Math.hypot(points[index]!.x - before.x, points[index]!.y - before.y)
    if (run !== 0) return point((points[index]!.x - before.x) / run, (points[index]!.y - before.y) / run)
  }
  return point(1, 0)
}

/** @purity pure */
function arrowHeadOf(points: Path, length: number, base: number): Path {
  const tip = points[points.length - 1]
  if (tip === undefined) return []
  const along = headingOf(points)
  const baseX = tip.x - along.x * length
  const baseY = tip.y - along.y * length
  const half = base / 2
  return [
    tip,
    point(baseX - along.y * half, baseY + along.x * half),
    point(baseX + along.y * half, baseY - along.x * half),
  ]
}

/** @purity pure */
function firstRiseOf(route: Path): number {
  for (let index = 1; index < route.length; index += 1) {
    const rise = route[index]!.y - route[index - 1]!.y
    if (rise !== 0) return Math.sign(rise)
  }
  return 0
}

// see EL-7, EL-8
// WHY: route starts at the seen end; outward is the side its run leaves by, never read off the route (S-298 may be 0).
/** @purity pure */
function shortLineOf(route: Path, isLevel: boolean, outward: number, run: number, ratio: number): Path {
  const start = route[0]
  if (start === undefined) return []
  const rise = firstRiseOf(route)
  if (isLevel || rise === 0) {
    return [start, point(start.x + outward * NOT_STORED_DEPENDENCY_SIZES['S-361'] * ratio, start.y)]
  }
  const bend = point(start.x + outward * run, start.y)
  return [start, bend, point(bend.x, bend.y + rise * NOT_STORED_DEPENDENCY_SIZES['S-360'] * ratio)]
}

// see EL-9, EL-10, EL-11, EL-12
/** @purity pure */
function continuationOf(line: Path, farEnd: SightedEnd, ratio: number): ContinuationGeometry {
  const diameter = NOT_STORED_DEPENDENCY_SIZES['S-362'] * ratio
  const tip = line[line.length - 1]
  const along = headingOf(line)
  const dots: Point[] = []
  const mark = { radius: diameter / 2, farUid: farEnd.end.taskUid, far: farEnd.far }
  if (tip === undefined) return { dots, ...mark }
  for (let index = 0; index < CONTINUATION_DOT_COUNT; index += 1) {
    const reach = diameter + diameter / 2 + index * (diameter + diameter)
    dots.push(point(tip.x + along.x * reach, tip.y + along.y * reach))
  }
  return { dots, ...mark }
}

type ElidedParts = Pick<DependencyGeometry, 'drawnPoints' | 'continuation' | 'head'>

// see EL-3, EL-4, EL-5, EL-6
/** @purity pure */
function elidedPartsOf(inputs: GeometryInputs, points: Path, isLevel: boolean, ends: {
  readonly elision: Elision
  readonly exitOutward: number
  readonly entryOutward: number
  readonly predecessor: SightedEnd
  readonly successor: SightedEnd
}): ElidedParts {
  const settings = inputs.settings
  const ratio = displayRatioOf(settings)
  /** @purity pure */
  const headOf = (drawn: Path): Path =>
    arrowHeadOf(drawn, settings.dependencyArrowLength, settings.dependencyArrowWidth)
  if (ends.elision === 'EL-3') return { drawnPoints: points, continuation: null, head: headOf(points) }
  if (ends.elision === 'EL-6') return { drawnPoints: [], continuation: null }
  if (ends.elision === 'EL-4') {
    const line = shortLineOf(points, isLevel, ends.exitOutward, settings.dependencyLeadOut, ratio)
    return { drawnPoints: line, continuation: continuationOf(line, ends.successor, ratio) }
  }
  const backward = shortLineOf([...points].reverse(), isLevel, ends.entryOutward, settings.dependencyLeadIn, ratio)
  const line = [...backward].reverse()
  return {
    drawnPoints: line,
    continuation: continuationOf(backward, ends.predecessor, ratio),
    head: headOf(line),
  }
}

/** @purity pure */
export function routedDependency(inputs: GeometryInputs, predecessor: SightedEnd, successor: SightedEnd,
                          linkType: number, elision: Elision): DependencyGeometry {
  const from = predecessor.end
  const to = successor.end
  const right = exitsRight(linkType)
  const sign = right ? 1 : -1
  const entryRight = sameSide(linkType) ? right : !right
  /** @purity pure */
  const anchor = (end: LinkEnd, edgeRight: boolean): Anchored => ({
    edge: sign * (edgeRight ? end.x + end.width : end.x),
    middle: end.middle,
    top: end.top,
    bottom: end.bottom,
    drawnBottom: end.drawnBottom,
  })
  const route = routeOf(anchor(from, right), anchor(to, entryRight), linkType, inputs.settings)
  const points = route.points.map((vertex) => point(sign * vertex.x, vertex.y))
  const isSelected = inputs.selectedLinks.has(`${from.taskUid}>${to.taskUid}`)
  const ownWidth = inputs.settings.dependencyWidth
  return {
    predecessorUid: from.taskUid,
    successorUid: to.taskUid,
    linkType,
    pattern: route.pattern,
    points,
    elision,
    strokeWidth: isSelected ? ownWidth + NOT_STORED_DEPENDENCY_EMPHASIS_SIZES['S-447'] : ownWidth,
    ...elidedPartsOf(inputs, points, route.pattern === 'RP-1', {
      elision,
      exitOutward: sign,
      entryOutward: entryRight ? 1 : -1,
      predecessor,
      successor,
    }),
  }
}

// see FR-009, RT-4a
/** @purity pure */
export function hasPlanDates(task: Task): boolean {
  return task.start !== null && task.finish !== null
}

// see RT-4a, FR-009
/** @purity pure */
export function plannedPlacementsOf(inputs: GeometryInputs): readonly TaskPlacement[] {
  return inputs.layout.placements.filter((one) => {
    const task = inputs.taskByUid.get(one.taskUid)
    return task !== undefined && hasPlanDates(task)
  })
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
const NOT_STORED_DEPENDENCY_EMPHASIS_SIZES: {
  readonly 'S-447': number
} = {
  'S-447': 2,
}

// see T-206
const NOT_STORED_DEPENDENCY_SIZES: {
  readonly 'S-224': number
  readonly 'S-360': number
  readonly 'S-361': number
  readonly 'S-362': number
} = {
  'S-224': 3,
  'S-360': 9.6,
  'S-361': 19.2,
  'S-362': 3.2,
}
// </generated>

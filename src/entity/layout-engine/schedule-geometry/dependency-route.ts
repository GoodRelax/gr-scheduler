// ScheduleGeometry -- the dependency lines: their routes and arrow heads (FR-009).
// @unit      UF-145  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleGeometry, layer layoutEngine (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../document-model/schedule/schedule'
import type { Selection } from '../../document-model/selection/selection'
import type { TaskPlacement } from '../schedule-layout/schedule-layout'
import { point, type DependencyGeometry, type GeometryInputs, type Path } from './schedule-geometry'
import { isThinShape, thinTierMiddle } from './task-figures'

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
function drawnOverhangOf(placed: TaskPlacement, settings: DocumentSettings): number {
  const isLine = placed.shapeKind === 'arrow' || placed.shapeKind === 'endpointSpan'
  return isLine ? 0 : settings.planStroke / 2
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
function corridorY(from: Anchored, to: Anchored, settings: DocumentSettings): number {
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
function isAtLeastDrawnPx(value: number, bound: number): boolean {
  return value >= bound - DRAWN_PX_ROUNDING
}

// see T-222
/** @purity pure */
function routeOf(from: Anchored, to: Anchored, linkType: number, settings: DocumentSettings): {
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
function arrowHeadOf(points: Path, length: number, base: number): Path {
  const tip = points[points.length - 1]
  if (tip === undefined) return []
  let alongX = 1
  let alongY = 0
  for (let index = points.length - 1; index > 0; index -= 1) {
    const before = points[index - 1]!
    const run = Math.hypot(points[index]!.x - before.x, points[index]!.y - before.y)
    if (run === 0) continue
    alongX = (points[index]!.x - before.x) / run
    alongY = (points[index]!.y - before.y) / run
    break
  }
  const baseX = tip.x - alongX * length
  const baseY = tip.y - alongY * length
  const half = base / 2
  return [
    tip,
    point(baseX - alongY * half, baseY + alongX * half),
    point(baseX + alongY * half, baseY - alongX * half),
  ]
}

/** @purity pure */
export function routedDependency(inputs: GeometryInputs, from: TaskPlacement, to: TaskPlacement,
                          linkType: number): DependencyGeometry {
  const right = exitsRight(linkType)
  const sign = right ? 1 : -1
  const entryRight = sameSide(linkType) ? right : !right
  /** @purity pure */
  const anchor = (placed: TaskPlacement, edgeRight: boolean): Anchored => {
    const thin = isThinShape(placed.shapeKind)
    const band = thin ? placed.height : placed.planHeight
    return {
      edge: sign * (edgeRight ? placed.x + placed.width : placed.x),
      middle: thin
        ? thinTierMiddle(placed, inputs.settings, false)
        : placed.y + placed.planHeight / 2,
      top: placed.y,
      bottom: placed.y + band,
      drawnBottom: placed.y + band + drawnOverhangOf(placed, inputs.settings),
    }
  }
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
    strokeWidth: isSelected ? ownWidth * NOT_STORED_SELECTION_SIZES['S-178'] : ownWidth,
    head: arrowHeadOf(
      points,
      inputs.settings.dependencyArrowLength,
      inputs.settings.dependencyArrowWidth,
    ),
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
const NOT_STORED_SELECTION_SIZES: {
  readonly 'S-174': number
  readonly 'S-175': readonly [number, number]
  readonly 'S-178': number
} = {
  'S-174': 1,
  'S-175': [2, 1],
  'S-178': 2,
}
// </generated>

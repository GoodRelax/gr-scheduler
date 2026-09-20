// CR-430: the spec readers and the grab-area scan the cr-430 cases share.

import type { Hit } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import type {
  BarGeometry,
  Point,
  ScheduleGeometry,
  TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { specTable, type SpecRow } from '../contract/spec-table'

const DEFAULT_COLUMN = '既定'
const DEFAULT_VALUE_COLUMN = '既定値'
const T_266_SIZES = '横'
const T_266_POINTER = 'ポインタ（表 T-269）'

/** @purity pure */
export function specRow(table: string, id: string): SpecRow {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/** @purity pure */
export function numberIn(cell: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  if (found === null) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return Number(found[0])
}

// see T-206
/** @purity pure */
export function sizePx(id: string): number {
  return numberIn(specRow('T-206', id).by[DEFAULT_COLUMN] ?? '')
}

// see T-201
/** @purity pure */
export function drawingDefault(id: string): number {
  return numberIn(specRow('T-201', id).by[DEFAULT_VALUE_COLUMN] ?? '')
}

// see T-266
/** @purity pure */
export function grabSizeRowsOf(grabArea: string): readonly string[] {
  const cell = specRow('T-266', grabArea).by[T_266_SIZES] ?? ''
  return [...cell.matchAll(/`(S-\d+)`/g)].map((one) => one[1] ?? '')
}

// see T-266, T-269
/** @purity pure */
export function pointerRowFor(grabArea: string): string {
  const cell = specRow('T-266', grabArea).by[T_266_POINTER] ?? ''
  const found = /`(PK-\d+)`/.exec(cell)
  if (found === null) throw new Error(`table T-266 row ${grabArea} names no PK row: ${cell}`)
  return found[1] ?? ''
}

// see T-266
/** @purity pure */
export function grabAreaRows(): readonly string[] {
  return specTable('T-266').rows.map((one) => one.id)
}

export interface Box {
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
}

/** @purity pure */
export function boxOfBar(bar: BarGeometry | null, what: string): Box {
  if (bar === null) throw new Error(`${what} is not drawn`)
  const points: readonly Point[] =
    bar.form === 'outline'
      ? bar.points
      : [bar.from, bar.to, ...(bar.head ?? []), ...bar.dots.map((one) => one.at)]
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

/** @purity pure */
export const midY = (box: Box): number => (box.y0 + box.y1) / 2

/** @purity pure */
export const midX = (box: Box): number => (box.x0 + box.x1) / 2

/** @purity pure */
export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
}

// see T-266
/** @purity pure */
export function widestGrabMargin(): number {
  let widest = 0
  for (const row of grabAreaRows()) {
    for (const id of grabSizeRowsOf(row)) {
      const value = sizePx(id)
      if (Number.isFinite(value) && value > widest) widest = value
    }
  }
  return widest
}

// see XS-10, XS-11
// WHY: the seam names ResumeGeometry.box, the tree still draws an arm and a
// WHY: head; reading both keeps this measuring the icon, not a member's name.
/** @purity pure */
export function resumeBoxOf(drawn: TaskGeometry): Box | null {
  const resume = drawn.resume as unknown as Record<string, unknown> | null
  if (resume === null || resume === undefined) return null
  const box = resume['box'] as { x: number; y: number; width: number; height: number } | undefined
  if (box !== undefined && typeof box.x === 'number') {
    return { x0: box.x, x1: box.x + box.width, y0: box.y, y1: box.y + box.height }
  }
  const points: Point[] = []
  for (const key of ['arm', 'head', 'dash']) {
    const path = resume[key] as readonly Point[] | undefined
    if (Array.isArray(path)) points.push(...path)
  }
  if (points.length === 0) return null
  return {
    x0: Math.min(...points.map((one) => one.x)),
    x1: Math.max(...points.map((one) => one.x)),
    y0: Math.min(...points.map((one) => one.y)),
    y1: Math.max(...points.map((one) => one.y)),
  }
}

/** @purity pure */
export function boxOfRect(
  rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number } | null,
): Box | null {
  if (rect === null) return null
  return { x0: rect.x, x1: rect.x + rect.width, y0: rect.y, y1: rect.y + rect.height }
}

/** @purity pure */
export function markerBoxOf(drawn: TaskGeometry): Box | null {
  if (drawn.marker === null) return null
  const { centre, radius } = drawn.marker
  return { x0: centre.x - radius, x1: centre.x + radius, y0: centre.y - radius, y1: centre.y + radius }
}

/** @purity pure */
function bandOfTask(drawn: TaskGeometry): Box | null {
  const parts: Box[] = []
  for (const bar of [drawn.plan, drawn.actual, drawn.milestoneFigure]) {
    if (bar !== null) parts.push(boxOfBar(bar, 'a figure'))
  }
  const marker = markerBoxOf(drawn)
  if (marker !== null) parts.push(marker)
  for (const dummy of drawn.dummies) {
    parts.push({
      x0: dummy.ink.x,
      x1: dummy.ink.x + dummy.ink.width,
      y0: dummy.ink.y,
      y1: dummy.ink.y + dummy.ink.height,
    })
  }
  for (const point of drawn.fadeHandles) parts.push({ x0: point.x, x1: point.x, y0: point.y, y1: point.y })
  const resume = resumeBoxOf(drawn)
  if (resume !== null) parts.push(resume)
  if (parts.length === 0) return null
  return {
    x0: Math.min(...parts.map((one) => one.x0)),
    x1: Math.max(...parts.map((one) => one.x1)),
    y0: Math.min(...parts.map((one) => one.y0)),
    y1: Math.max(...parts.map((one) => one.y1)),
  }
}

// see T-266
/** @purity pure */
export function sizesOrSeam(): ReturnType<typeof grabSizesOf> {
  try {
    return grabSizesOf()
  } catch (cause) {
    throw new Error(
      `seam S3: grabSizesOf() cannot answer the table T-266 sizes yet ` +
        `(${cause instanceof Error ? cause.message : String(cause)})`,
    )
  }
}

export interface GrabScan {
  readonly points: ReadonlyMap<string, Point>
  readonly answered: ReadonlySet<string>
  readonly sampled: number
}

// see T-266, T-267, T-268
// WHY: tables T-267 and T-268 decide which overlapping area answers, so a case
// WHY: asks where an area answers instead of computing a point and pressing it.
/** @purity pure */
export function scanGrabAreas(
  geometry: ScheduleGeometry,
  taskUid: number,
  within: Box | null = null,
  step = 1,
): GrabScan {
  const drawn = geometry.tasks.find((one) => one.taskUid === taskUid)
  const band = drawn === undefined ? null : bandOfTask(drawn)
  const points = new Map<string, Point>()
  const answered = new Set<string>()
  if (band === null) return { points, answered, sampled: 0 }
  const margin = widestGrabMargin() + step
  const sizes = sizesOrSeam()
  const lowX = Math.max(band.x0 - margin, within === null ? -Infinity : within.x0 + step)
  const highX = Math.min(band.x1 + margin, within === null ? Infinity : within.x1 - step)
  const lowY = Math.max(band.y0 - margin, within === null ? -Infinity : within.y0 + step)
  const highY = Math.min(band.y1 + margin, within === null ? Infinity : within.y1 - step)
  const found = new Map<string, Point[]>()
  let sampled = 0
  for (let y = lowY; y <= highY; y += step) {
    for (let x = lowX; x <= highX; x += step) {
      sampled += 1
      const hit: Hit | null = itemAtPointer(geometry, x, y, sizes)
      if (hit === null) continue
      if (hit.item.kind === 'task' && hit.item.taskUid !== taskUid) continue
      answered.add(hit.grab)
      const held = found.get(hit.grab)
      if (held === undefined) found.set(hit.grab, [{ x, y }])
      else held.push({ x, y })
    }
  }
  for (const [grab, all] of found) points.set(grab, middlemost(all))
  return { points, answered, sampled }
}

// WHY: the first answering point sits on the area's outer corner, where a press
// WHY: lands in a neighbouring region; the middlemost one is inside the area.
/** @purity pure */
function middlemost(all: readonly Point[]): Point {
  const cx = all.reduce((sum, one) => sum + one.x, 0) / all.length
  const cy = all.reduce((sum, one) => sum + one.y, 0) / all.length
  let best = all[0]!
  let bestGap = Infinity
  for (const one of all) {
    const gap = (one.x - cx) ** 2 + (one.y - cy) ** 2
    if (gap < bestGap) {
      bestGap = gap
      best = one
    }
  }
  return best
}

/** @purity pure */
export function pointAnswering(scan: GrabScan, grabArea: string): Point {
  const found = scan.points.get(grabArea)
  if (found !== undefined) return found
  const seen = [...scan.answered].sort().join(', ')
  throw new Error(
    `premise: no point in this Task band answers with ${grabArea}. ` +
      `${String(scan.sampled)} points were sampled and these answered: ${seen === '' ? '(nothing)' : seen}`,
  )
}

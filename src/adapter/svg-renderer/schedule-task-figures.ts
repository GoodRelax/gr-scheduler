// SvgRenderer -- the figures drawn for each Task, and the dependency lines between Tasks.
// @unit      UF-81   (docs/spec/05-07-design.md, table T-075)
// @component SvgRenderer, layer Adapter (table T-062)
// @purity    pure

import { SETTINGS_CONSTANTS, type DrawnSettings } from '../../entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../entity/document-model/schedule/schedule'
import type { Hit } from '../../entity/layout-engine/item-hit-area/item-hit-area'
import {
  arrowHeadOf,
  type BarGeometry,
  type MarkerGeometry,
  type Path,
  type Point,
  type ScheduleGeometry,
} from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  NOT_STORED_LABEL_SIZES,
  type ScheduleLayout,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  NOT_STORED_DELAY_MARK_SIZES,
  NOT_STORED_DEPENDENCY_SIZES,
  NOT_STORED_NAME_LABEL_WEIGHT,
  bandBaselineYOf,
  boxOfPoints,
  emphasisedWidthOf,
  escaped,
  figureKey,
  pointsOf,
  rounded,
  selectionFrameSvg,
  typefaceAttribute,
  type ChosenColour,
  type SchedulePicture,
  type ViewerValues,
} from './svg-renderer'

type Placed = ScheduleLayout['placements'][number]

type MarkerStroke = Pick<DrawnSettings, 'markerStroke'>
type PinnedGroupId = ScheduleLayout['rows'][number]['groupId']
type BaselineOutline = ScheduleGeometry['baselineOutlines'][number]
type DeadlineGeometry = NonNullable<ScheduleGeometry['tasks'][number]['deadline']>
type MilestoneLayer = NonNullable<Extract<BarGeometry, { readonly form: 'outline' }>['layers']>[number]
type PathSegment = MilestoneLayer['segments'][number]

export interface TaskFiguresInput {
  readonly geometry: ScheduleGeometry
  readonly settings: DrawnSettings
  readonly picture: SchedulePicture
  readonly themed: (rowId: string) => string
  readonly chosen: ChosenColour
  readonly placedOf: ReadonlyMap<number, Placed>
  readonly visualOf: ReadonlyMap<number, Schedule['taskVisuals'][number]>
  readonly pinnedGroupIds: ReadonlySet<PinnedGroupId>
  readonly selected: ReadonlySet<number>
  readonly selectedLinks: ReadonlySet<string>
  readonly landingLink: string | null
  readonly hover: Hit | null
  readonly hand: Point | null
  readonly skipsOffScreen: boolean
  readonly drawnFrom: number
  readonly drawnTo: number
  readonly drawnLeftOf: number
  readonly drawnRightOf: number
}

export interface TaskFigureParts {
  readonly planParts: readonly string[]
  readonly guideParts: readonly string[]
  readonly actualParts: readonly string[]
  readonly markerParts: readonly string[]
  readonly labelParts: readonly string[]
  readonly planPartsPinned: readonly string[]
  readonly guidePartsPinned: readonly string[]
  readonly actualPartsPinned: readonly string[]
  readonly markerPartsPinned: readonly string[]
  readonly labelPartsPinned: readonly string[]
  readonly deadlineParts: readonly string[]
  readonly deadlinePartsPinned: readonly string[]
  readonly barMaskParts: readonly string[]
  readonly handleParts: readonly string[]
  readonly selectionParts: readonly string[]
  readonly endOutlineParts: readonly string[]
}

export interface BaselineOutlineParts {
  readonly baselineParts: readonly string[]
  readonly baselinePartsPinned: readonly string[]
}

export interface DependencyLinksInput {
  readonly geometry: ScheduleGeometry
  readonly settings: DrawnSettings
  readonly themed: (rowId: string) => string
  readonly selectedLinks: ReadonlySet<string>
  readonly landingLink: string | null
  readonly barMaskParts: readonly string[]
  readonly arrowId: string
  readonly dependencyHaloMaskId: string
  readonly width: number
  readonly height: number
  readonly skipsOffScreen: boolean
  readonly drawnFrom: number
  readonly drawnTo: number
  readonly drawnLeftOf: number
  readonly drawnRightOf: number
}

export interface DependencyLinkParts {
  readonly defsParts: readonly string[]
  readonly depLinkParts: readonly string[]
  readonly depLinkPartsPinned: readonly string[]
}

interface Paint {
  readonly stroke: string
  readonly fill: string
  readonly strokeWidth: number
}

/** @purity pure */
function cornersOfBar(bar: BarGeometry): Path {
  if (bar.form === 'outline') return bar.points
  const out = [bar.from, bar.to, ...(bar.head ?? [])]
  for (const dot of bar.dots) {
    out.push({ x: dot.at.x - dot.radius, y: dot.at.y - dot.radius })
    out.push({ x: dot.at.x + dot.radius, y: dot.at.y + dot.radius })
  }
  return out
}

// see FR-009, HT-1
// WHY: the ink, not the corners: the outline's or the line's stroke reaches half its width past them (CR-684 X-2).
/** @purity pure */
function haloCutOf(bar: BarGeometry | null, outlineWidth: number, key: string): readonly string[] {
  const box = bar === null ? null : boxOfPoints(cornersOfBar(bar))
  if (bar === null || box === null) return []
  const half = (bar.form === 'outline' ? outlineWidth : bar.strokeWidth) / 2
  return [barMaskRectSvg({ x: box.x - half, y: box.y - half, width: box.width + half * 2, height: box.height + half * 2 }, key)]
}

// see FR-009
/** @purity pure */
function barMaskRectSvg(box: ScreenRect, key: string): string {
  return (
    `<rect x="${rounded(box.x)}" y="${rounded(box.y)}"` +
    ` width="${rounded(box.width)}" height="${rounded(box.height)}" fill="black"` +
    `${figureKey(key)}/>`
  )
}

// see FR-007, CV-6
// WHY: the chosen values arrive already drawn for the theme and monochrome (CV-7); null keeps the theme's.
/** @purity pure */
function paintOf(
  chosenStroke: string | null,
  chosenFill: string | null,
  themedStroke: string,
  themedFill: string,
  strokeWidth: number,
): Paint {
  return {
    stroke: chosenStroke ?? themedStroke,
    fill: chosenFill ?? themedFill,
    strokeWidth,
  }
}

// see ZO-13, DA-2, DA-3
/** @purity pure */
function deadlineSvg(deadline: DeadlineGeometry, themed: (rowId: string) => string, key: string): string {
  return (
    `<polygon points="${pointsOf(deadline.outline)}" fill="${themed('S-364')}"` +
    ` stroke="${themed('S-146')}" stroke-width="${rounded(deadline.haloWidth)}"` +
    ` paint-order="stroke"${figureKey(key)}/>`
  )
}

/** @purity pure */
function barBoxOf(placed: Placed): ScreenRect {
  const left = placed.actualX === null ? placed.x : Math.min(placed.x, placed.actualX)
  const right =
    placed.actualX === null
      ? placed.x + placed.width
      : Math.max(placed.x + placed.width, placed.actualX + placed.actualWidth)
  return { x: left, y: placed.y, width: right - left, height: placed.height }
}

// see DA-7
/** @purity pure */
function isCulled(box: ScreenRect | null, input: Pick<TaskFiguresInput,
  'skipsOffScreen' | 'drawnFrom' | 'drawnTo' | 'drawnLeftOf' | 'drawnRightOf'>): boolean {
  if (!input.skipsOffScreen || box === null) return false
  return (
    box.y + box.height < input.drawnFrom ||
    box.y > input.drawnTo ||
    box.x + box.width < input.drawnLeftOf ||
    box.x > input.drawnRightOf
  )
}

// see T-021, T-236, T-315, FR-013, FR-133
/** @purity pure */
function markColoursOf(
  symbol: MarkerGeometry['symbol'],
  themed: (rowId: string) => string,
): { readonly ground: string; readonly ink: string } {
  switch (symbol) {
    case 'PM-4':
      return { ground: themed('S-326'), ink: themed('S-327') }
    case 'DG-1':
      return { ground: themed('S-389'), ink: themed('S-390') }
    case 'DG-2':
      return { ground: themed('S-387'), ink: themed('S-388') }
    case 'DG-3':
      return { ground: themed('S-385'), ink: themed('S-386') }
    default:
      return { ground: themed('S-162'), ink: themed('S-161') }
  }
}

// see FR-013, S-330, S-331, S-341
/** @purity pure */
function markDotSvg(x: number, marker: MarkerGeometry, ink: string, named: string): string {
  const r = marker.radius * NOT_STORED_DELAY_MARK_SIZES['S-341']
  return (
    `<circle cx="${rounded(x)}" cy="${rounded(marker.centre.y + r * NOT_STORED_DELAY_MARK_SIZES['S-330'])}"` +
    ` r="${rounded(marker.radius * NOT_STORED_DELAY_MARK_SIZES['S-331'])}" fill="${ink}"${named}/>`
  )
}

// see FR-013, S-328, S-329, S-341
/** @purity pure */
function bangSvg(x: number, marker: MarkerGeometry, ink: string, settings: MarkerStroke, named: string): string {
  const r = marker.radius * NOT_STORED_DELAY_MARK_SIZES['S-341']
  return (
    `<line x1="${rounded(x)}" y1="${rounded(marker.centre.y - r)}` +
    `" x2="${rounded(x)}" y2="${rounded(marker.centre.y + r * NOT_STORED_DELAY_MARK_SIZES['S-329'])}"` +
    ` stroke="${ink}" stroke-width="${rounded(settings.markerStroke * NOT_STORED_DELAY_MARK_SIZES['S-328'])}"${named}/>` +
    markDotSvg(x, marker, ink, named)
  )
}

// see T-315, S-328, S-392, S-393, S-394
/** @purity pure */
function questionSvg(marker: MarkerGeometry, ink: string, settings: MarkerStroke, named: string): string {
  const { centre, radius } = marker
  const top = centre.y - radius
  const hookY = top + radius * 2 * NOT_STORED_DELAY_MARK_SIZES['S-392']
  const hook = radius * 2 * NOT_STORED_DELAY_MARK_SIZES['S-393']
  const stemBottom = top + radius * 2 * NOT_STORED_DELAY_MARK_SIZES['S-394']
  return (
    `<path d="M${rounded(centre.x - hook)} ${rounded(hookY)}` +
    ` A${rounded(hook)} ${rounded(hook)} 0 1 1 ${rounded(centre.x)} ${rounded(hookY + hook)}` +
    ` L${rounded(centre.x)} ${rounded(stemBottom)}"` +
    ` fill="none" stroke="${ink}" stroke-width="${rounded(settings.markerStroke * NOT_STORED_DELAY_MARK_SIZES['S-328'])}"${named}/>` +
    markDotSvg(centre.x, marker, ink, named)
  )
}

// see T-315, S-395, S-396
/** @purity pure */
function flameSvg(marker: MarkerGeometry, ink: string, named: string): string {
  const side = marker.radius * 2 * NOT_STORED_DELAY_MARK_SIZES['S-396']
  return (
    `<path d="${NOT_STORED_DELAY_MARK_SIZES['S-395']}"` +
    ` transform="translate(${rounded(marker.centre.x - side / 2)} ${rounded(marker.centre.y - side / 2)})` +
    ` scale(${rounded(side)})" fill="${ink}"${named}/>`
  )
}

// see ZO-3, T-021, T-315, FR-013
/** @purity pure */
function markSymbolSvg(marker: MarkerGeometry, ink: string, settings: MarkerStroke, named: string): string {
  const { centre, radius } = marker
  const stroke = rounded(settings.markerStroke)
  const r = radius * NOT_STORED_DELAY_MARK_SIZES['S-341']
  switch (marker.symbol) {
    case 'PM-1':
      return ''
    case 'PM-1a':
      return `<circle cx="${rounded(centre.x)}" cy="${rounded(centre.y)}" r="${rounded(radius * 0.18)}" fill="${ink}"${named}/>`
    case 'PM-2':
      return (
        `<polyline points="${rounded(centre.x - r)},${rounded(centre.y)}` +
        ` ${rounded(centre.x - r * 0.2)},${rounded(centre.y + r * 0.7)}` +
        ` ${rounded(centre.x + r)},${rounded(centre.y - r * 0.7)}"` +
        ` fill="none" stroke="${ink}" stroke-width="${stroke}"${named}/>`
      )
    case 'PM-3':
      return (
        `<line x1="${rounded(centre.x - r)}" y1="${rounded(centre.y)}` +
        `" x2="${rounded(centre.x + r)}" y2="${rounded(centre.y)}"` +
        ` stroke="${ink}" stroke-width="${rounded(settings.markerStroke * NOT_STORED_DELAY_MARK_SIZES['S-328'])}"${named}/>`
      )
    case 'PM-4':
      return bangSvg(centre.x, marker, ink, settings, named)
    case 'DG-1':
      return questionSvg(marker, ink, settings, named)
    case 'DG-2':
      return flameSvg(marker, ink, named)
    case 'DG-3': {
      const half = radius * NOT_STORED_DELAY_MARK_SIZES['S-391']
      return bangSvg(centre.x - half, marker, ink, settings, named) + bangSvg(centre.x + half, marker, ink, settings, named)
    }
  }
}

// see ZO-3, T-021, FR-013
/** @purity pure */
function markerSvg(
  marker: MarkerGeometry,
  themed: (rowId: string) => string,
  faintness: number,
  settings: MarkerStroke,
  key: string,
): string {
  const { centre, radius } = marker
  const named = figureKey(key)
  const { ground, ink } = markColoursOf(marker.symbol, themed)
  const disc =
    `<circle cx="${rounded(centre.x)}" cy="${rounded(centre.y)}" r="${rounded(radius)}"` +
    ` fill="${ground}" stroke="${ink}" stroke-width="${rounded(settings.markerStroke)}"${named}/>`
  const drawn = disc + markSymbolSvg(marker, ink, settings, named)
  // TRAP: one group opacity, not one per shape: overlapping translucent shapes darken the symbol past S-131.
  if (marker.symbol !== 'PM-1a') return drawn
  return `<g opacity="${rounded(faintness)}"${named}>${drawn}</g>`
}

// see FR-133, T-021, T-315, SQ-5, DT-1, RW-4
/** @purity pure */
export function markerGlyphSvg(symbol: MarkerGeometry['symbol'], themed: (rowId: string) => string): string {
  const side = SETTINGS_CONSTANTS.markerSize
  const stroke = SETTINGS_CONSTANTS.markerStroke
  const marker = { symbol, centre: { x: side / 2, y: side / 2 }, radius: (side - stroke) / 2 }
  const drawn = markerSvg(marker, themed, SETTINGS_CONSTANTS.dummyOpacity, { markerStroke: stroke }, `glyph-${symbol}`)
  return `<svg viewBox="0 0 ${rounded(side)} ${rounded(side)}" width="1em" height="1em" aria-hidden="true">${drawn}</svg>`
}

// see FR-044, LF-13, S-308, S-310
// WHY: faint on the same condition the geometry shrinks it by S-25 (LF-13), so size and faintness never part.
/** @purity pure */
function resumeSvg(
  resume: NonNullable<ScheduleGeometry['tasks'][number]['resume']>, ink: string, settings: DrawnSettings, key: string,
): string {
  const named = figureKey(key)
  const drawn =
    `<polyline points="${pointsOf(resume.arm)}" fill="none" stroke="${ink}"` +
    ` stroke-width="${rounded(settings.markerStroke)}"` +
    ` stroke-dasharray="${rounded(settings.resumeDashOn)} ${rounded(settings.resumeDashOff)}"` +
    `${named}/>` +
    `<polygon points="${pointsOf(resume.head)}" fill="${ink}"${named}/>`
  // TRAP: one group opacity, not one per shape: the arrow head overlaps the arm and would darken where they meet.
  if (resume.valid && !resume.undecided) return drawn
  return `<g opacity="${rounded(settings.resumeOpacityInvalid)}"${named}>${drawn}</g>`
}

// see FR-135, S-398, S-399, S-245
/** @purity pure */
function nameLabelInkOf(input: TaskFiguresInput, taskUid: number): { readonly ink: string; readonly weight: number } {
  const isParentShown = input.picture === 'screen' && input.geometry.wbsParents?.highlightedParentUid === taskUid
  if (isParentShown) return { ink: 'S-398', weight: NOT_STORED_DELAY_MARK_SIZES['S-399'] }
  return { ink: 'S-168', weight: NOT_STORED_NAME_LABEL_WEIGHT['S-245'] }
}

// see ZO-5, FR-077, FR-039
/** @purity pure */
function labelSvg(
  box: ScreenRect,
  text: string,
  fontSize: number,
  settings: DrawnSettings,
  ink: string,
  halo: string,
  key: string,
  anchor: 'start' | 'end' = 'start',
  weight: number | null = null,
  dates: string = '',
): string {
  // TRAP: box.x is already the first glyph's x (T-273 adds S-31 or S-32 there); adding a pad here doubles it.
  const x = anchor === 'end' ? box.x + box.width : box.x
  const y = bandBaselineYOf(box, fontSize)
  const haloWidth = fontSize * settings.labelHaloOfFont
  const datesSize = rounded(fontSize * NOT_STORED_LABEL_SIZES['S-325'])
  const datesSpan =
    dates === '' ? '' : `<tspan font-size="${datesSize}">${escaped(dates)}</tspan>`
  return (
    `<text x="${rounded(x)}" y="${rounded(y)}" font-size="${rounded(fontSize)}"` +
    typefaceAttribute() +
    (weight === null ? '' : ` font-weight="${weight}"`) +
    (anchor === 'end' ? ' text-anchor="end"' : '') +
    ` fill="${ink}" stroke="${halo}" stroke-width="${rounded(haloWidth)}"` +
    // TRAP: paint-order="stroke" puts the halo under the glyph; without it the label is painted in its own outline.
    ` stroke-linejoin="round" paint-order="stroke" xml:space="preserve"${figureKey(key)}>` +
    `${escaped(text)}${datesSpan}</text>`
  )
}

// see F-044
const SHADE_FILL_OPACITY = 0.35

/** @purity pure */
function pathDataOf(segments: readonly PathSegment[]): string {
  return segments
    .map((one) => {
      switch (one.command) {
        case 'Z':
          return 'Z'
        case 'Q':
          return `Q${rounded(one.control.x)} ${rounded(one.control.y)} ${rounded(one.to.x)} ${rounded(one.to.y)}`
        case 'A':
          return (
            `A${rounded(one.radiusX)} ${rounded(one.radiusY)} ${rounded(one.rotation)}` +
            ` ${one.largeArc ? 1 : 0} ${one.sweep ? 1 : 0} ${rounded(one.to.x)} ${rounded(one.to.y)}`
          )
        default:
          return `${one.command}${rounded(one.to.x)} ${rounded(one.to.y)}`
      }
    })
    .join(' ')
}

/** @purity pure */
function cornersOfRing(segments: readonly PathSegment[]): Path | null {
  const out: Point[] = []
  for (const [index, one] of segments.entries()) {
    if (one.command === 'Z' && index === segments.length - 1) break
    if (one.command !== (index === 0 ? 'M' : 'L')) return null
    out.push(one.to)
  }
  return out
}

// see LF-18
// WHY: a straight-edged body stays a polygon, as before; the lines and dots take innerInk, never a hole in the fill.
/** @purity pure */
function layerSvg(layer: MilestoneLayer, paint: Paint, innerInk: string, named: string): string {
  const width = rounded(paint.strokeWidth)
  const corners = layer.role === 'body' && !layer.evenOdd ? cornersOfRing(layer.segments) : null
  if (corners !== null) {
    return (
      `<polygon points="${pointsOf(corners)}" data-layer="body" fill="${paint.fill}"` +
      ` stroke="${paint.stroke}" stroke-width="${width}"${named}/>`
    )
  }
  const head = `<path d="${pathDataOf(layer.segments)}" data-layer="${layer.role}"`
  switch (layer.role) {
    case 'body':
      return (
        `${head}${layer.evenOdd ? ' fill-rule="evenodd"' : ''} fill="${paint.fill}"` +
        ` stroke="${paint.stroke}" stroke-width="${width}"${named}/>`
      )
    case 'inner':
      return (
        `${head} fill="none" stroke="${innerInk}" stroke-width="${width}"` +
        ` stroke-linecap="round" stroke-linejoin="round"${named}/>`
      )
    case 'dot':
      return `${head} fill="${innerInk}"${named}/>`
    case 'shade':
      return (
        `${head} fill="${innerInk}" fill-opacity="${SHADE_FILL_OPACITY}"` +
        ` stroke="${innerInk}" stroke-width="${width}" stroke-linejoin="round"${named}/>`
      )
  }
}

/** @purity pure */
function barSvg(bar: BarGeometry, paint: Paint, innerInk: string, key: string): string {
  const named = figureKey(key)
  if (bar.form === 'outline') {
    if (bar.layers !== undefined) {
      return bar.layers.map((layer) => layerSvg(layer, paint, innerInk, named)).join('')
    }
    return (
      `<polygon points="${pointsOf(bar.points)}" fill="${paint.fill}"` +
      ` stroke="${paint.stroke}" stroke-width="${rounded(paint.strokeWidth)}"${named}/>`
    )
  }
  const line =
    `<line x1="${rounded(bar.from.x)}" y1="${rounded(bar.from.y)}"` +
    ` x2="${rounded(bar.to.x)}" y2="${rounded(bar.to.y)}"` +
    ` stroke="${paint.stroke}" stroke-width="${rounded(bar.strokeWidth)}"${named}/>`
  const head =
    bar.head === null
      ? ''
      : `<polygon points="${pointsOf(bar.head)}" fill="${paint.stroke}"${named}/>`
  const dots = bar.dots
    .map(
      (dot) =>
        `<circle cx="${rounded(dot.at.x)}" cy="${rounded(dot.at.y)}"` +
        ` r="${rounded(dot.radius)}" fill="${paint.stroke}"${named}/>`,
    )
    .join('')
  return line + head + dots
}

// see GD-6, S-19, S-300, PI-6
// WHY: the triangle is arrowHeadOf's, the hit test's own head, laid on a rightward line through the marker's box.
/** @purity pure */
export function dependencyArrowSvg(
  id: string,
  settings: Pick<DrawnSettings, 'dependencyArrowLength' | 'dependencyArrowWidth'>,
  colour: string,
): string {
  const length = settings.dependencyArrowLength
  const base = settings.dependencyArrowWidth
  const half = base / 2
  const corners = arrowHeadOf([{ x: 0, y: half }, { x: length, y: half }], length, base)
  return (
    `<defs><marker id="${id}" viewBox="0 0 ${rounded(length)} ${rounded(base)}"` +
    ` refX="${rounded(length)}" refY="${rounded(half)}"` +
    ` markerWidth="${rounded(length)}" markerHeight="${rounded(base)}"` +
    ` markerUnits="userSpaceOnUse" orient="auto">` +
    `<path d="${corners.map((one, index) => `${index === 0 ? 'M' : 'L'}${rounded(one.x)},${rounded(one.y)}`).join(' ')} Z"` +
    ` fill="${colour}"/></marker></defs>`
  )
}

// see FR-013, FR-075
/** @purity pure */
export function taskFigureParts(input: TaskFiguresInput): TaskFigureParts {
  const {
    geometry,
    settings,
    picture,
    themed,
    chosen,
    placedOf,
    visualOf,
    pinnedGroupIds,
    selected,
    hover,
    hand,
  } = input
  /** @purity pure */
  const handOn = (taskUid: number, rows: readonly Hit['grab'][]): boolean =>
    hover !== null &&
    hover.item.kind === 'task' &&
    hover.item.taskUid === taskUid &&
    rows.includes(hover.grab)
  /** @purity pure */
  const handInside = (centre: Point, width: number, height: number): boolean =>
    hand !== null &&
    Math.abs(hand.x - centre.x) <= width / 2 &&
    Math.abs(hand.y - centre.y) <= height / 2

  const planParts: string[] = []
  const guideParts: string[] = []
  const actualParts: string[] = []
  const markerParts: string[] = []
  const labelParts: string[] = []
  const planPartsPinned: string[] = []
  const guidePartsPinned: string[] = []
  const actualPartsPinned: string[] = []
  const markerPartsPinned: string[] = []
  const labelPartsPinned: string[] = []
  const deadlineParts: string[] = []
  const deadlinePartsPinned: string[] = []
  const barMaskParts: string[] = []
  const handleParts: string[] = []
  const selectionParts: string[] = []
  const endOutlineParts: string[] = []
  const ended = endedTasksOf(input)

  for (const task of geometry.tasks) {
    const visual = visualOf.get(task.taskUid)
    const placed = placedOf.get(task.taskUid)
    const isPinnedTask = placed !== undefined && pinnedGroupIds.has(placed.groupId)
    const taskKey = `task-${task.taskUid}`
    const deadline = task.deadline ?? null
    // TRAP: before the bar's cull, and culled by its own box: a far deadline stays on screen when its bar leaves (DA-7).
    if (deadline !== null && !isCulled(boxOfPoints(deadline.outline), input)) {
      ;(isPinnedTask ? deadlinePartsPinned : deadlineParts).push(deadlineSvg(deadline, themed, `${taskKey}-deadline`))
    }
    if (placed !== undefined && isCulled(barBoxOf(placed), input)) continue
    const outline = chosen(visual?.strokeColor ?? null, 'outline')
    // WHY: the width the layout laid the task with (VG-5); a task it did not place draws S-39, as BL-3 does.
    const outlineWidth = placed?.outlineWidth ?? settings.planStroke
    const plan = paintOf(
      outline,
      chosen(visual?.fillColor ?? null, 'fill'),
      themed('S-156'),
      themed('S-155'),
      outlineWidth,
    )
    const actual = paintOf(
      outline,
      chosen(visual?.fillColor ?? null, 'actual'),
      themed('S-158'),
      themed('S-157'),
      outlineWidth,
    )
    if (task.plan !== null) {
      ;(isPinnedTask ? planPartsPinned : planParts).push(
        barSvg(task.plan, plan, plan.stroke, `${taskKey}-plan`),
      )
    }
    for (const guide of task.guides) {
      ;(isPinnedTask ? guidePartsPinned : guideParts).push(
        `<polyline points="${pointsOf(guide)}" fill="none" stroke="${actual.stroke}"` +
          ` stroke-width="${rounded(settings.planActualGuideWeight)}"` +
          ` stroke-dasharray="${rounded(settings.planActualGuidePattern.on)}` +
          ` ${rounded(settings.planActualGuidePattern.off)}"${figureKey(`${taskKey}-guide`)}/>`,
      )
    }
    if (task.actual !== null) {
      ;(isPinnedTask ? actualPartsPinned : actualParts).push(
        barSvg(task.actual, actual, plan.fill, `${taskKey}-actual`),
      )
    }
    const dummy = drawnDummyOf(task, picture)
    // see FR-009
    // WHY: the halo is laid over the faint dummy marks: cutting them out measured no faster (CR-704).
    barMaskParts.push(
      ...haloCutOf(task.plan, outlineWidth, `${taskKey}-plan-mask`),
      ...haloCutOf(task.actual, outlineWidth, `${taskKey}-actual-mask`),
    )
    if (dummy !== null) {
      const ink = dummy.ink
      const marks = barSvg(dummy.figure, actual, plan.fill, `${taskKey}-dummies`)
      const faintness = handInside(
        { x: ink.x + ink.width / 2, y: ink.y + ink.height / 2 },
        ink.width,
        ink.height,
      )
        ? 1
        : settings.dummyOpacity
      ;(isPinnedTask ? actualPartsPinned : actualParts).push(
        `<g opacity="${rounded(faintness)}"${figureKey(`${taskKey}-dummies`)}>${marks}</g>`,
      )
    }
    if (ended.has(task.taskUid)) {
      if (task.plan !== null) {
        endOutlineParts.push(endOutlineSvg(task.plan, themed('S-159'), outlineWidth, `${taskKey}-end-outline`))
      }
    }
    if (selected.has(task.taskUid)) {
      selectionParts.push(...aroundTaskSvg(task, picture, themed('S-151'), `${taskKey}-frame`))

      const half = settings.fadeHandleHalfPx
      for (const foundAt of task.fadeHandles) {
        handleParts.push(
          `<rect x="${rounded(foundAt.x - half)}" y="${rounded(foundAt.y - half)}"` +
            ` width="${rounded(half * 2)}" height="${rounded(half * 2)}"` +
            ` fill="${themed('S-527')}" stroke="${themed('S-528')}"` +
            ` stroke-width="${rounded(settings.fadeHandleStrokePx)}"` +
            `${figureKey(`${taskKey}-fade-handle`)}/>`,
        )
      }
    }
    if (task.marker !== null && settings.progressMarkerVisible) {
      ;(isPinnedTask ? markerPartsPinned : markerParts).push(
        markerSvg(
          task.marker,
          themed,
          handOn(task.taskUid, MARKER_GRAB_ROWS) ? 1 : settings.dummyOpacity,
          settings,
          `${taskKey}-marker`,
        ),
      )
      if (task.resume !== null) {
        ;(isPinnedTask ? markerPartsPinned : markerParts).push(
          // WHY: S-310 is S-161: the resume icon goes in and out with the marker (S-63), one family of signs.
          resumeSvg(task.resume, themed('S-161'), settings, `${taskKey}-resume`),
        )
      }
    }
    if (task.label !== null && placed !== undefined && placed.label !== '') {
      ;(isPinnedTask ? labelPartsPinned : labelParts).push(
        labelSvg(
          task.label,
          placed.label.slice(0, placed.label.length - placed.labelDates.length),
          placed.labelFontSize,
          settings,
          themed(nameLabelInkOf(input, task.taskUid).ink),
          themed('S-169'),
          `${taskKey}-label`,
          'start',
          nameLabelInkOf(input, task.taskUid).weight,
          placed.labelDates,
        ),
      )
    }
    if (placed !== undefined && task.assigneeLabel !== null && placed.outsideLabel !== '') {
      ;(isPinnedTask ? labelPartsPinned : labelParts).push(
        labelSvg(
          task.assigneeLabel,
          placed.outsideLabel,
          placed.labelFontSize,
          settings,
          themed('S-168'),
          themed('S-169'),
          `${taskKey}-oc2-label`,
          'end',
        ),
      )
    }
  }
  return {
    planParts,
    guideParts,
    actualParts,
    markerParts,
    labelParts,
    planPartsPinned,
    guidePartsPinned,
    actualPartsPinned,
    markerPartsPinned,
    labelPartsPinned,
    deadlineParts,
    deadlinePartsPinned,
    barMaskParts,
    handleParts,
    selectionParts,
    endOutlineParts,
  }
}

/** @purity pure */
function baselineOutlineSvg(outline: BaselineOutline, ink: string): string {
  const { box } = outline
  const key = figureKey(`task-${outline.taskUid}-baseline`)
  if (outline.kind === 'rectangle') {
    return (
      `<rect x="${rounded(box.x)}" y="${rounded(box.y)}"` +
      ` width="${rounded(box.width)}" height="${rounded(box.height)}"${ink}${key}/>`
    )
  }
  const middleX = box.x + box.width / 2
  const middleY = box.y + box.height / 2
  const corners = [
    { x: middleX, y: box.y },
    { x: box.x + box.width, y: middleY },
    { x: middleX, y: box.y + box.height },
    { x: box.x, y: middleY },
  ]
  return `<polygon points="${pointsOf(corners)}"${ink}${key}/>`
}

// see FR-015, T-339, ZO-15
/** @purity pure */
export function baselineOutlineParts(input: TaskFiguresInput, dash: readonly [number, number]): BaselineOutlineParts {
  const baselineParts: string[] = []
  const baselinePartsPinned: string[] = []
  const ink =
    ` fill="none" stroke="${input.themed('S-443')}" stroke-width="${rounded(input.settings.planStroke)}"` +
    ` stroke-dasharray="${rounded(dash[0])} ${rounded(dash[1])}"`
  for (const outline of input.geometry.baselineOutlines) {
    if (isCulled(outline.box, input)) continue
    ;(outline.isPinned ? baselinePartsPinned : baselineParts).push(baselineOutlineSvg(outline, ink))
  }
  return { baselineParts, baselinePartsPinned }
}

// see GD-6
// TRAP: the heads are minted before any cull: a <marker> must exist even when the first line is culled.
/** @purity pure */
function dependencyDefsOf(input: DependencyLinksInput): readonly string[] {
  const { settings, themed, barMaskParts, arrowId } = input
  const defs = [dependencyArrowSvg(arrowId, settings, themed('S-159'))]
  if (barMaskParts.length > 0) {
    defs.push(
      `<mask id="${input.dependencyHaloMaskId}" maskUnits="userSpaceOnUse">` +
        `<rect x="0" y="0" width="${rounded(input.width)}" height="${rounded(input.height)}"` +
        ' fill="white"/>' +
        barMaskParts.join('') +
        '</mask>',
    )
  }
  return defs
}

// see FR-009, SL-8, EL-16
type Emphasis = 'none' | 'selected' | 'landing'

// see FR-009
// WHY: drawn back to front, so the landing line (order 0) is drawn last and the selected lines (order 1) just before it.
const EMPHASIS_DRAW_RANK: Readonly<Record<Emphasis, number>> = { none: 0, selected: 1, landing: 2 }

/** @purity pure */
function emphasisOf(link: DependencyLink, input: Pick<DependencyLinksInput, 'selectedLinks' | 'landingLink'>): Emphasis {
  const key = linkKeyOf(link)
  if (key === input.landingLink) return 'landing'
  return input.selectedLinks.has(key) ? 'selected' : 'none'
}

// see SL-8, EL-9, EL-16, EL-19, S-159, S-447
/** @purity pure */
function inkOf(input: DependencyLinksInput, emphasis: Emphasis, halo: string): LinkInk {
  const own = input.settings.dependencyWidth
  const width = emphasis === 'none' ? own : emphasisedWidthOf(own)
  // WHY: one head for every line: the colour is the same, and markerUnits="userSpaceOnUse" keeps it off the width.
  return { halo, colour: input.themed('S-159'), width, arrowId: input.arrowId, isWholeRoute: emphasis === 'landing' }
}

// see GD-6, FR-009, EL-19
/** @purity pure */
export function dependencyLinkParts(input: DependencyLinksInput): DependencyLinkParts {
  const { geometry, settings, themed, barMaskParts } = input
  const depLinkParts: string[] = []
  const depLinkPartsPinned: string[] = []
  if (!settings.dependencyVisible || geometry.dependencies.length === 0) {
    return { defsParts: [], depLinkParts, depLinkPartsPinned }
  }
  const haloWidth = settings.dependencyWidth * NOT_STORED_DEPENDENCY_SIZES['S-224']
  const haloMask = barMaskParts.length > 0 ? ` mask="url(#${input.dependencyHaloMaskId})"` : ''
  const halo = `stroke="${themed('S-146')}" stroke-width="${rounded(haloWidth)}"${haloMask}`
  const ranked = geometry.dependencies.map((link) => ({ link, emphasis: emphasisOf(link, input) }))
  ranked.sort((a, b) => EMPHASIS_DRAW_RANK[a.emphasis] - EMPHASIS_DRAW_RANK[b.emphasis])
  for (const { link, emphasis } of ranked) {
    const ink = inkOf(input, emphasis, halo)
    const drawnBox = boxOfPoints(ink.isWholeRoute ? link.points : link.drawnPoints)
    if (drawnBox === null || isCulled(drawnBox, input)) continue
    ;(geometry.pinnedBand?.holdsLink(link, ink.isWholeRoute) === true ? depLinkPartsPinned : depLinkParts).push(
      dependencyLinkSvg(link, ink),
    )
  }
  return { defsParts: dependencyDefsOf(input), depLinkParts, depLinkPartsPinned }
}

type DependencyLink = ScheduleGeometry['dependencies'][number]

interface LinkInk {
  readonly halo: string
  readonly colour: string
  readonly width: number
  readonly arrowId: string
  readonly isWholeRoute: boolean
}

// see GD-6, EL-9, EL-19
/** @purity pure */
function dependencyLinkSvg(link: DependencyLink, ink: LinkInk): string {
  const points = pointsOf(ink.isWholeRoute ? link.points : link.drawnPoints)
  const linkKey = figureKey(`dep-${link.predecessorUid}-${link.successorUid}`)
  const head = link.head === undefined && !ink.isWholeRoute ? '' : ` marker-end="url(#${ink.arrowId})"`
  const mark = ink.isWholeRoute ? null : link.continuation
  const dots = mark === null ? [] : mark.dots.map(
    (dot) =>
      `<circle cx="${rounded(dot.x)}" cy="${rounded(dot.y)}"` +
      ` r="${rounded(mark.radius)}" fill="${ink.colour}"${linkKey}/>`,
  )
  return (
    `<polyline points="${points}" fill="none" ${ink.halo}${linkKey}/>` +
    `<polyline points="${points}" fill="none"` +
    ` stroke="${ink.colour}" stroke-width="${rounded(ink.width)}"${head}${linkKey}/>` +
    dots.join('')
  )
}

// see FR-009, SL-8, EL-16
// WHY: one spelling of a line's key, so the selected set, the landing mark and the drawing cannot disagree.
/** @purity pure */
export function linkKeyOf(link: { readonly predecessorUid: number; readonly successorUid: number }): string {
  return `${link.predecessorUid}>${link.successorUid}`
}

// see EL-16, EL-17, EP-12, T-280
// WHY: read through ?. -- a caller older than the landing mark passes none, and none reads as hidden.
/** @purity pure */
export function landingLinkOf(viewer: ViewerValues): string | null {
  const mark = viewer.landingMarkDisplayState
  return mark?.kind === 'shown' ? linkKeyOf(mark.landedLink) : null
}

// see EL-1, T-303, SL-8
// WHY: the geometry judged EL-1 once and wrote it as the elision; an end it does not see is not drawn, so not outlined.
const SEEN_ENDS: Readonly<Record<DependencyLink['elision'], { readonly predecessor: boolean; readonly successor: boolean }>> = {
  'EL-3': { predecessor: true, successor: true },
  'EL-4': { predecessor: true, successor: false },
  'EL-5': { predecessor: false, successor: true },
  'EL-6': { predecessor: false, successor: false },
}

// see SL-8, EL-16
// WHY: a set, so a Task ending two such lines is outlined once; a line the geometry no longer holds outlines nothing.
/** @purity pure */
function endedTasksOf(input: TaskFiguresInput): ReadonlySet<number> {
  const out = new Set<number>()
  if (input.selectedLinks.size === 0 && input.landingLink === null) return out
  for (const link of input.geometry.dependencies) {
    if (emphasisOf(link, input) === 'none') continue
    const seen = SEEN_ENDS[link.elision]
    if (seen.predecessor) out.add(link.predecessorUid)
    if (seen.successor) out.add(link.successorUid)
  }
  return out
}

// see SL-8, T-023c, T-240
// WHY: around every drawn figure -- plan, actual and the actual's dummy -- the box SL-8 builds from the seen figures only.
/** @purity pure */
function aroundTaskSvg(
  task: ScheduleGeometry['tasks'][number], picture: SchedulePicture, colour: string, key: string,
): readonly string[] {
  const dummy = drawnDummyOf(task, picture)
  const box = boxOfPoints([
    ...(task.plan === null ? [] : cornersOfBar(task.plan)),
    ...(task.actual === null ? [] : cornersOfBar(task.actual)),
    ...(dummy === null ? [] : cornersOfBar(dummy.figure)),
  ])
  return box === null ? [] : [selectionFrameSvg(box, colour, key)]
}

// see T-240, PI-5, EP-14
// WHY: the one test of whether a task's dummy is drawn, read by the drawing and by the frame around it (SL-8).
// WHY: the export is dropped here, not in the geometry: one geometry answers both pictures, and it has no picture (EP-14).
// TRAP: draw DummyGeometry.figure, never rebuild it here: the shape's formula lives once, in the geometry (PI-5).
/** @purity pure */
function drawnDummyOf(
  task: ScheduleGeometry['tasks'][number], picture: SchedulePicture,
): { readonly ink: ScreenRect; readonly figure: BarGeometry } | null {
  const dummy = task.dummies[0]
  if (picture !== 'screen' || dummy === undefined || dummy.figure === undefined) return null
  return { ink: dummy.ink, figure: dummy.figure }
}

// see SL-8, EL-16, ZO-10
/** @purity pure */
function endOutlineSvg(plan: BarGeometry, colour: string, planStroke: number, key: string): string {
  const ink = ` fill="none" stroke="${colour}"`
  const named = figureKey(key)
  if (plan.form === 'outline') {
    const outline = `${ink} stroke-width="${rounded(emphasisedWidthOf(planStroke))}"${named}/>`
    if (plan.layers === undefined) return `<polygon points="${pointsOf(plan.points)}"${outline}`
    return plan.layers
      .filter((layer) => layer.role === 'body')
      .map((layer) => {
        const corners = cornersOfRing(layer.segments)
        return corners === null ? `<path d="${pathDataOf(layer.segments)}"${outline}` : `<polygon points="${pointsOf(corners)}"${outline}`
      })
      .join('')
  }
  // WHY: a head or a dot has no stroke of its own (width 0), so its edge is the addend alone.
  const edged = `${ink} stroke-width="${rounded(emphasisedWidthOf(0))}"${named}/>`
  const line =
    `<line x1="${rounded(plan.from.x)}" y1="${rounded(plan.from.y)}"` +
    ` x2="${rounded(plan.to.x)}" y2="${rounded(plan.to.y)}"` +
    `${ink} stroke-width="${rounded(emphasisedWidthOf(plan.strokeWidth))}"${named}/>`
  const head = plan.head === null ? '' : `<polygon points="${pointsOf(plan.head)}"${edged}`
  const dots = plan.dots.map((dot) => `<circle cx="${rounded(dot.at.x)}" cy="${rounded(dot.at.y)}" r="${rounded(dot.radius)}"${edged}`)
  return line + head + dots.join('')
}

// see T-266
const MARKER_GRAB_ROWS: readonly Hit['grab'][] = ['GA-18']

// SvgRenderer -- the figures drawn for each Task, and the dependency lines between Tasks.
// @unit      UF-81   (docs/spec/05-07-design.md, table T-075)
// @component SvgRenderer, layer Adapter (table T-062)
// @purity    pure

import type { DrawnSettings } from '../../entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../entity/document-model/schedule/schedule'
import type { Hit } from '../../entity/layout-engine/item-hit-area/item-hit-area'
import type {
  BarGeometry,
  MarkerGeometry,
  Path,
  Point,
  ScheduleGeometry,
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
  boxOfPoints,
  escaped,
  figureKey,
  pointsOf,
  rounded,
  selectedLineWidth,
  selectionFrameSvg,
  typefaceAttribute,
  type ChosenColour,
  type SchedulePicture,
} from './svg-renderer'

type Placed = ScheduleLayout['placements'][number]
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
  readonly placedOf: ReadonlyMap<number, Placed>
  readonly pinnedGroupIds: ReadonlySet<PinnedGroupId>
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

const FADE_HANDLE_FILL_COLOUR = '#ffffff'
const FADE_HANDLE_STROKE_COLOUR = '#374151'

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
function isCulled(box: ScreenRect | null, input: TaskFiguresInput): boolean {
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
function bangSvg(x: number, marker: MarkerGeometry, ink: string, settings: DrawnSettings, named: string): string {
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
function questionSvg(marker: MarkerGeometry, ink: string, settings: DrawnSettings, named: string): string {
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

// see ZO-3, T-021, T-315
/** @purity pure */
function markSymbolSvg(marker: MarkerGeometry, ink: string, settings: DrawnSettings, named: string): string {
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
        `<line x1="${rounded(centre.x - r * 0.6)}" y1="${rounded(centre.y + r)}` +
        `" x2="${rounded(centre.x + r * 0.6)}" y2="${rounded(centre.y - r)}"` +
        ` stroke="${ink}" stroke-width="${stroke}"${named}/>`
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
  settings: DrawnSettings,
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

// see FR-044, LF-13
// STOP: spec does not decide how faint an undated resume icon is, nor its ink. Looked in FR-044, S-25, S-161, T-236
// @provisional PND-476
/** @purity pure */
function resumeSvg(
  arm: Path,
  head: Path,
  ink: string,
  settings: DrawnSettings,
  key: string,
): string {
  const named = figureKey(key)
  return (
    `<polyline points="${pointsOf(arm)}" fill="none" stroke="${ink}"` +
    ` stroke-width="${rounded(settings.markerStroke)}"` +
    ` stroke-dasharray="${rounded(settings.resumeDashOn)} ${rounded(settings.resumeDashOff)}"` +
    `${named}/>` +
    `<polygon points="${pointsOf(head)}" fill="${ink}"${named}/>`
  )
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
  const y = box.y + box.height / 2 + fontSize * settings.labelBaseline
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

// see GD-6
/** @purity pure */
export function dependencyArrowSvg(id: string, length: number, colour: string): string {
  const half = length / 2
  return (
    `<defs><marker id="${id}" viewBox="0 0 ${rounded(length)} ${rounded(length)}"` +
    ` refX="${rounded(length)}" refY="${rounded(half)}"` +
    ` markerWidth="${rounded(length)}" markerHeight="${rounded(length)}"` +
    ` markerUnits="userSpaceOnUse" orient="auto">` +
    `<path d="M0,0 L${rounded(length)},${rounded(half)} L0,${rounded(length)} Z"` +
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
    const plan = paintOf(
      outline,
      chosen(visual?.fillColor ?? null, 'fill'),
      themed('S-156'),
      themed('S-155'),
      settings.planStroke,
    )
    const actual = paintOf(
      outline,
      chosen(visual?.fillColor ?? null, 'actual'),
      themed('S-158'),
      themed('S-157'),
      settings.planStroke,
    )
    if (task.plan !== null) {
      ;(isPinnedTask ? planPartsPinned : planParts).push(
        barSvg(task.plan, plan, plan.stroke, `${taskKey}-plan`),
      )
      const planBarBox = boxOfPoints(cornersOfBar(task.plan))
      if (planBarBox !== null) {
        barMaskParts.push(barMaskRectSvg(planBarBox, `${taskKey}-plan-mask`))
      }
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
      const actualBarBox = boxOfPoints(cornersOfBar(task.actual))
      if (actualBarBox !== null) {
        barMaskParts.push(barMaskRectSvg(actualBarBox, `${taskKey}-actual-mask`))
      }
    }
    // WHY: the export is dropped here, not in the geometry: one geometry answers both pictures, and it has no picture (EP-14).
    const dummy = task.dummies[0]
    if (picture === 'screen' && dummy !== undefined && dummy.figure !== undefined) {
      // TRAP: draw DummyGeometry.figure, never rebuild it here: the shape's formula lives once, in the geometry (PI-5).
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
    if (selected.has(task.taskUid)) {
      const box = boxOfPoints([
        ...(task.plan === null ? [] : cornersOfBar(task.plan)),
        ...(task.actual === null ? [] : cornersOfBar(task.actual)),
      ])
      if (box !== null) {
        selectionParts.push(selectionFrameSvg(box, themed('S-151'), `${taskKey}-frame`))
      }

      const half = settings.fadeHandleHalfPx
      for (const foundAt of task.fadeHandles) {
        handleParts.push(
          `<rect x="${rounded(foundAt.x - half)}" y="${rounded(foundAt.y - half)}"` +
            ` width="${rounded(half * 2)}" height="${rounded(half * 2)}"` +
            ` fill="${FADE_HANDLE_FILL_COLOUR}" stroke="${FADE_HANDLE_STROKE_COLOUR}"` +
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
          resumeSvg(task.resume.arm, task.resume.head, themed('S-161'), settings,
                    `${taskKey}-resume`),
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
          themed('S-168'),
          themed('S-169'),
          `${taskKey}-label`,
          'start',
          NOT_STORED_NAME_LABEL_WEIGHT['S-245'],
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
/** @purity pure */
export function dependencyLinkParts(input: DependencyLinksInput): DependencyLinkParts {
  const {
    geometry,
    settings,
    themed,
    selectedLinks,
    placedOf,
    pinnedGroupIds,
    barMaskParts,
    arrowId,
    dependencyHaloMaskId,
    width,
    height,
    skipsOffScreen,
    drawnFrom,
    drawnTo,
    drawnLeftOf,
    drawnRightOf,
  } = input
  const defsParts: string[] = []
  const depLinkParts: string[] = []
  const depLinkPartsPinned: string[] = []

  const orderedDependencies = [...geometry.dependencies].sort((a, b) => {
    const aFront = selectedLinks.has(`${a.predecessorUid}>${a.successorUid}`) ? 1 : 0
    const bFront = selectedLinks.has(`${b.predecessorUid}>${b.successorUid}`) ? 1 : 0
    return aFront - bFront
  })
  const haloWidth = settings.dependencyWidth * NOT_STORED_DEPENDENCY_SIZES['S-224']
  // TRAP: mint the head once through arrowMinted, never by reading defsParts.length: the list is shared.
  let arrowMinted = false
  for (const link of orderedDependencies) {
    if (!settings.dependencyVisible) break
    if (!arrowMinted) {
      arrowMinted = true
      defsParts.push(
        dependencyArrowSvg(arrowId, settings.dependencyArrowLength, themed('S-159')),
      )
      if (barMaskParts.length > 0) {
        defsParts.push(
          `<mask id="${dependencyHaloMaskId}" maskUnits="userSpaceOnUse">` +
            `<rect x="0" y="0" width="${rounded(width)}" height="${rounded(height)}"` +
            ' fill="white"/>' +
            barMaskParts.join('') +
            '</mask>',
        )
      }
    }
    // TRAP: cull after minting: the <marker> must exist even when the first line is culled.
    const drawnBox = boxOfPoints(link.drawnPoints)
    if (drawnBox === null) continue
    if (skipsOffScreen) {
      if (drawnBox.y + drawnBox.height < drawnFrom || drawnBox.y > drawnTo) continue
      if (drawnBox.x + drawnBox.width < drawnLeftOf || drawnBox.x > drawnRightOf) continue
    }
    /** @purity pure */
    const isPinned = (uid: number): boolean => {
      const placed = placedOf.get(uid)
      return placed !== undefined && pinnedGroupIds.has(placed.groupId)
    }
    const haloMask = barMaskParts.length > 0 ? ` mask="url(#${dependencyHaloMaskId})"` : ''
    ;(isInTheBand(link, isPinned) ? depLinkPartsPinned : depLinkParts).push(
      dependencyLinkSvg(link, {
        halo: `stroke="${themed('S-146')}" stroke-width="${rounded(haloWidth)}"${haloMask}`,
        colour: themed('S-159'),
        width: selectedLineWidth(
          settings.dependencyWidth,
          selectedLinks.has(`${link.predecessorUid}>${link.successorUid}`),
        ),
        arrowId,
      }),
    )
  }
  return { defsParts, depLinkParts, depLinkPartsPinned }
}

type DependencyLink = ScheduleGeometry['dependencies'][number]

// see FR-098, T-303
/** @purity pure */
function isInTheBand(link: DependencyLink, isPinned: (uid: number) => boolean): boolean {
  if (link.elision === 'EL-4') return isPinned(link.predecessorUid)
  if (link.elision === 'EL-5') return isPinned(link.successorUid)
  return isPinned(link.predecessorUid) && isPinned(link.successorUid)
}

// see GD-6, EL-9
/** @purity pure */
function dependencyLinkSvg(link: DependencyLink, ink: {
  readonly halo: string
  readonly colour: string
  readonly width: number
  readonly arrowId: string
}): string {
  const points = pointsOf(link.drawnPoints)
  const linkKey = figureKey(`dep-${link.predecessorUid}-${link.successorUid}`)
  const head = link.head === undefined ? '' : ` marker-end="url(#${ink.arrowId})"`
  const mark = link.continuation
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

// see T-266
const MARKER_GRAB_ROWS: readonly Hit['grab'][] = ['GA-18']

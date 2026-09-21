// SvgRenderer -- the figures drawn for each Task, and the dependency lines between Tasks.
// @unit      UF-81   (docs/spec/05-07-design.md, table T-075)
// @component SvgRenderer, layer Adapter (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../entity/document-model/schedule/schedule'
import type { Hit } from '../../entity/layout-engine/item-hit-area/item-hit-area'
import type {
  BarGeometry,
  MarkerGeometry,
  Path,
  Point,
  ScheduleGeometry,
} from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import type { ScheduleLayout } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import {
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

export interface TaskFiguresInput {
  readonly geometry: ScheduleGeometry
  readonly settings: DocumentSettings
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
  readonly barMaskParts: readonly string[]
  readonly handleParts: readonly string[]
  readonly selectionParts: readonly string[]
}

export interface DependencyLinksInput {
  readonly geometry: ScheduleGeometry
  readonly settings: DocumentSettings
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

// see ZO-3, T-021, FR-013
/** @purity pure */
function markerSvg(
  marker: MarkerGeometry,
  ink: string,
  backing: string,
  faintness: number,
  settings: DocumentSettings,
  key: string,
): string {
  const { centre, radius } = marker
  const named = figureKey(key)
  const stroke = rounded(settings.markerStroke)
  const disc =
    `<circle cx="${rounded(centre.x)}" cy="${rounded(centre.y)}" r="${rounded(radius)}"` +
    ` fill="${backing}" stroke="${ink}" stroke-width="${stroke}"${named}/>`
  const r = radius * 0.5
  const mark =
    marker.symbol === 'PM-1a'
      ? `<circle cx="${rounded(centre.x)}" cy="${rounded(centre.y)}" r="${rounded(radius * 0.18)}" fill="${ink}"${named}/>`
      : marker.symbol === 'PM-2'
        ? `<polyline points="${rounded(centre.x - r)},${rounded(centre.y)}` +
          ` ${rounded(centre.x - r * 0.2)},${rounded(centre.y + r * 0.7)}` +
          ` ${rounded(centre.x + r)},${rounded(centre.y - r * 0.7)}"` +
          ` fill="none" stroke="${ink}" stroke-width="${stroke}"${named}/>`
        : marker.symbol === 'PM-3'
          ? `<line x1="${rounded(centre.x - r * 0.6)}" y1="${rounded(centre.y + r)}` +
            `" x2="${rounded(centre.x + r * 0.6)}" y2="${rounded(centre.y - r)}"` +
            ` stroke="${ink}" stroke-width="${stroke}"${named}/>`
          : marker.symbol === 'PM-4'
            ? `<line x1="${rounded(centre.x)}" y1="${rounded(centre.y - r)}` +
              `" x2="${rounded(centre.x)}" y2="${rounded(centre.y + r * 0.35)}"` +
              ` stroke="${ink}" stroke-width="${stroke}"${named}/>` +
              `<circle cx="${rounded(centre.x)}" cy="${rounded(centre.y + r * 0.8)}"` +
              ` r="${rounded(radius * 0.12)}" fill="${ink}"${named}/>`
            : ''
  const drawn = disc + mark
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
  settings: DocumentSettings,
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
  settings: DocumentSettings,
  ink: string,
  halo: string,
  padLeft: number,
  key: string,
  anchor: 'start' | 'end' = 'start',
  weight: number | null = null,
): string {
  const x = anchor === 'end' ? box.x + box.width : box.x + padLeft
  const y = box.y + box.height / 2 + fontSize * settings.labelBaseline
  const haloWidth = fontSize * settings.labelHaloOfFont
  return (
    `<text x="${rounded(x)}" y="${rounded(y)}" font-size="${rounded(fontSize)}"` +
    typefaceAttribute() +
    (weight === null ? '' : ` font-weight="${weight}"`) +
    (anchor === 'end' ? ' text-anchor="end"' : '') +
    ` fill="${ink}" stroke="${halo}" stroke-width="${rounded(haloWidth)}"` +
    // TRAP: paint-order="stroke" puts the halo under the glyph; without it the label is painted in its own outline.
    ` paint-order="stroke" xml:space="preserve"${figureKey(key)}>${escaped(text)}</text>`
  )
}

/** @purity pure */
function barSvg(bar: BarGeometry, paint: Paint, key: string): string {
  const named = figureKey(key)
  if (bar.form === 'outline') {
    const marks = bar.marks ?? []
    if (marks.length === 0) {
      return (
        `<polygon points="${pointsOf(bar.points)}" fill="${paint.fill}"` +
        ` stroke="${paint.stroke}" stroke-width="${rounded(paint.strokeWidth)}"${named}/>`
      )
    }
    // WHY: one evenodd path, not shapes on top: the marks cut through, so no guessed paint or extra colour row.
    const subpaths = [bar.points, ...marks]
      .map((one) => `M${pointsOf(one).replace(/ /g, 'L')}Z`)
      .join('')
    return (
      `<path d="${subpaths}" fill-rule="evenodd" fill="${paint.fill}"` +
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
    skipsOffScreen,
    drawnFrom,
    drawnTo,
    drawnLeftOf,
    drawnRightOf,
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
  const barMaskParts: string[] = []
  const handleParts: string[] = []
  const selectionParts: string[] = []

  for (const task of geometry.tasks) {
    const visual = visualOf.get(task.taskUid)
    const placed = placedOf.get(task.taskUid)
    const isPinnedTask = placed !== undefined && pinnedGroupIds.has(placed.groupId)
    if (skipsOffScreen && placed !== undefined) {
      const barLeft =
        placed.actualX === null ? placed.x : Math.min(placed.x, placed.actualX)
      const barRight =
        placed.actualX === null
          ? placed.x + placed.width
          : Math.max(placed.x + placed.width, placed.actualX + placed.actualWidth)
      if (
        placed.y + placed.height < drawnFrom ||
        placed.y > drawnTo ||
        barRight < drawnLeftOf ||
        barLeft > drawnRightOf
      ) {
        continue
      }
    }
    const taskKey = `task-${task.taskUid}`
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
        barSvg(task.plan, plan, `${taskKey}-plan`),
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
        barSvg(task.actual, actual, `${taskKey}-actual`),
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
      const marks = barSvg(dummy.figure, actual, `${taskKey}-dummies`)
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
          themed('S-161'),
          themed('S-162'),
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
          placed.label,
          placed.labelFontSize,
          settings,
          themed('S-168'),
          themed('S-169'),
          settings.labelPad,
          `${taskKey}-label`,
          'start',
          NOT_STORED_NAME_LABEL_WEIGHT['S-245'],
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
          0,
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
    barMaskParts,
    handleParts,
    selectionParts,
  }
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
    if (skipsOffScreen) {
      let linkTop = Number.POSITIVE_INFINITY
      let linkBottom = Number.NEGATIVE_INFINITY
      let linkLeft = Number.POSITIVE_INFINITY
      let linkRight = Number.NEGATIVE_INFINITY
      for (const at of link.points) {
        if (at.y < linkTop) linkTop = at.y
        if (at.y > linkBottom) linkBottom = at.y
        if (at.x < linkLeft) linkLeft = at.x
        if (at.x > linkRight) linkRight = at.x
      }
      if (linkBottom < drawnFrom || linkTop > drawnTo) continue
      if (linkRight < drawnLeftOf || linkLeft > drawnRightOf) continue
    }
    const linkWidth = selectedLineWidth(
      settings.dependencyWidth,
      selectedLinks.has(`${link.predecessorUid}>${link.successorUid}`),
    )
    const predecessorPlaced = placedOf.get(link.predecessorUid)
    const successorPlaced = placedOf.get(link.successorUid)
    const predecessorPinned =
      predecessorPlaced !== undefined && pinnedGroupIds.has(predecessorPlaced.groupId)
    const successorPinned =
      successorPlaced !== undefined && pinnedGroupIds.has(successorPlaced.groupId)
    const points = pointsOf(link.points)
    const haloMask = barMaskParts.length > 0 ? ` mask="url(#${dependencyHaloMaskId})"` : ''
    const linkKey = figureKey(`dep-${link.predecessorUid}-${link.successorUid}`)
    ;(predecessorPinned && successorPinned ? depLinkPartsPinned : depLinkParts).push(
      `<polyline points="${points}" fill="none" stroke="${themed('S-146')}"` +
        ` stroke-width="${rounded(haloWidth)}"${haloMask}${linkKey}/>` +
        `<polyline points="${points}" fill="none"` +
        ` stroke="${themed('S-159')}" stroke-width="${rounded(linkWidth)}"` +
        ` marker-end="url(#${arrowId})"${linkKey}/>`,
    )
  }
  return { defsParts, depLinkParts, depLinkPartsPinned }
}

// see T-266
const MARKER_GRAB_ROWS: readonly Hit['grab'][] = ['GA-18']

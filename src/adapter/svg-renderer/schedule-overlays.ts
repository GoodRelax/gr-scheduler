// SvgRenderer -- the overlays that belong to no Task: lines, cursors, annotations, watermark.
// @unit      UF-83   (docs/spec/05-07-design.md, table T-075)
// @component SvgRenderer, layer Adapter (table T-062)
// @purity    pure

import type { DrawnSettings } from '../../entity/document-model/document-settings/document-settings'
import { TRANSPARENT, type Schedule } from '../../entity/document-model/schedule/schedule'
import {
  leaderOf,
  type CommentGeometry,
  type HighlightGeometry,
  type Point,
  type ScheduleGeometry,
} from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  dateAtX,
  landedShapeBoxOf,
  xFromDay,
  type LandedTarget,
  type ScheduleLayout,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionAtPointer,
  type ScreenRect,
  type ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  NOT_STORED_DUAL_CURSOR_SIZES,
  NOT_STORED_JUMP_LANDING_RING_SIZES,
  NOT_STORED_SELECTION_SIZES,
  WATERMARK_MARKS,
  emphasizedWidthOf,
  escaped,
  figureKey,
  pointsOf,
  rounded,
  selectedLineWidth,
  selectionFrameSvg,
  typefaceAttribute,
  type ChosenColor,
  type DualCursorFollow,
  type Watermark,
} from './svg-renderer'

// see S-72, S-66, EL-16, SJ-10, T-280
// WHY: the screen values the picture reads, spelled here so the renderer
// depends on no use case; ScreenValues satisfies it as it stands.
export interface ViewerValues {
  readonly themePreference: 'light' | 'dark'
  readonly guideCursorMode: 'none' | 'crosshair' | 'single-vertical'
  // WHY: optional -- a viewer built before the landing mark carries none, and none reads as hidden.
  readonly landingMarkDisplayState?:
    | { readonly kind: 'hidden' }
    | { readonly kind: 'shown'; readonly landedBy: 'continuationMark' | 'jump'; readonly landedLink: { readonly predecessorUid: number;
        readonly successorUid: number } | null; readonly landedTarget: LandedTarget; readonly landedRelatedTasks?: readonly number[] }
}

// see SJ-10, S-555, S-556
export interface JumpLandingRing {
  readonly inner: ScreenRect
  readonly lineWidth: number
}

export interface OverlaysInput {
  readonly geometry: ScheduleGeometry
  readonly settings: DrawnSettings
  readonly guideCursorMode: ViewerValues['guideCursorMode']
  readonly layout: ScheduleLayout
  readonly regions: ScreenRegions
  readonly themed: (rowId: string) => string
  readonly chosen: ChosenColor
  readonly drawsOperationState: boolean
  readonly pointer: Point | null
  readonly following: DualCursorFollow | null
  readonly selectedStatusLine: boolean
  readonly strokeOfBox: ReadonlyMap<
    Schedule['highlightBoxes'][number]['id'],
    Schedule['highlightBoxes'][number]['strokeColor']
  >
  readonly selectedBoxes: ReadonlySet<Schedule['highlightBoxes'][number]['id']>
  readonly selectedComments: ReadonlySet<Schedule['commentBoxes'][number]['id']>
}

export interface OverlayParts {
  // see ZO-14
  readonly fillParts: readonly string[]
  readonly linkParts: readonly string[]
  // see ZO-16
  readonly progressLineParts: readonly string[]
  readonly annotationParts: readonly string[]
  readonly selectionParts: readonly string[]
}

const WATERMARK_ROLE = 'Watermark'

// see SJ-10
const JUMP_LANDING_RING_ROLE = 'Jump Landing Ring'

// see RW-13, S-573
const RELATED_TASK_RING_ROLE = 'Jump Landing Related Ring'

const UNDECIDED_PARENT_MARK = '?'

// see FR-135, S-398, S-485, S-486, SL-8, VO-4, IP-4
/** @purity pure */
export function parentTaskParts(
  geometry: ScheduleGeometry,
  settings: DrawnSettings,
  themed: (rowId: string) => string,
  drawsOperationState: boolean,
): readonly string[] {
  const drawing = geometry.parentTasks
  if (!drawsOperationState || drawing === undefined) return []
  const parts: string[] = []
  const ink = themed('S-398')
  for (const arrow of drawing.arrows) {
    const width = arrow.isSelected ? emphasizedWidthOf(settings.dependencyWidth) : settings.dependencyWidth
    const dash = arrow.dash === null ? '' : ` stroke-dasharray="${rounded(arrow.dash[0])} ${rounded(arrow.dash[1])}"`
    const key = `parent-task-${arrow.childUid}`
    // see FR-135, EL-20, TV-3
    const radius = arrow.continuationRadius ?? 0
    const dots = (arrow.continuationDots ?? []).map(
      (dot) => `<circle cx="${rounded(dot.x)}" cy="${rounded(dot.y)}" r="${rounded(radius)}" fill="${ink}"${figureKey(key)}/>`,
    )
    const head = arrow.head.length === 0 ? '' : `<polygon points="${pointsOf(arrow.head)}" fill="${ink}"${figureKey(`${key}-head`)}/>`
    parts.push(
      `<polyline points="${pointsOf(arrow.points)}" fill="none" stroke="${ink}"` +
        ` stroke-width="${rounded(width)}"${dash}${figureKey(key)}/>` +
        head +
        dots.join(''),
    )
  }
  const query = themed('S-389')
  for (const one of drawing.queries) {
    const dash = ` stroke-dasharray="${rounded(one.dash[0])} ${rounded(one.dash[1])}"`
    for (const candidate of one.candidates) {
      const { box } = candidate
      parts.push(
        `<rect x="${rounded(box.x)}" y="${rounded(box.y)}" width="${rounded(box.width)}"` +
          ` height="${rounded(box.height)}" fill="none" stroke="${query}"` +
          ` stroke-width="${rounded(settings.dependencyWidth)}"${dash}${figureKey(`wbs-candidate-${candidate.uid}`)}/>` +
          `<text x="${rounded(candidate.labelAt.x)}" y="${rounded(candidate.labelAt.y)}"` +
          ` font-size="${rounded(one.fontSize)}" fill="${query}" text-anchor="middle"` +
          ` dominant-baseline="central"${typefaceAttribute()}>${candidate.order}</text>`,
      )
    }
    parts.push(
      `<text x="${rounded(one.markAt.x)}" y="${rounded(one.markAt.y)}" font-size="${rounded(one.fontSize)}"` +
        ` fill="${query}" text-anchor="middle" dominant-baseline="central"${typefaceAttribute()}` +
        `${figureKey(`wbs-undecided-${one.childUid}`)}>${escaped(UNDECIDED_PARENT_MARK)}</text>`,
    )
  }
  return parts
}

// see FR-020, T-207
/** @purity pure */
export function watermarkSvg(
  area: ScreenRect,
  pictureWidth: number,
  mark: Watermark,
  ink: string,
  clipId: string,
): string {
  const size = Number(WATERMARK_MARKS['S-221']) * pictureWidth
  const step = Number(WATERMARK_MARKS['S-222']) * size
  if (!(size > 0) || !(step > 0) || area.width <= 0 || area.height <= 0) return ''
  const centerX = area.x + area.width / 2
  const centerY = area.y + area.height / 2
  const reach = Math.hypot(area.width, area.height) / 2
  const text = escaped(`${mark.openedBy} ${mark.stampedAt}`)
  const typeface = typefaceAttribute()
  const marks: string[] = []
  for (let y = centerY - reach; y <= centerY + reach; y += step) {
    for (let x = centerX - reach; x <= centerX + reach; x += step) {
      marks.push(
        `<text x="${rounded(x)}" y="${rounded(y)}"${typeface} xml:space="preserve">${text}</text>`,
      )
    }
  }
  // TRAP: the clip sits on the outer, unrotated group; on the rotated one it would turn too.
  return (
    `<g data-role="${WATERMARK_ROLE}" clip-path="url(#${clipId})"` +
    ` opacity="${WATERMARK_MARKS['S-102']}" fill="${ink}"` +
    ` font-size="${rounded(size)}" text-anchor="middle">` +
    `<g transform="rotate(${WATERMARK_MARKS['S-220']} ${rounded(centerX)}` +
    ` ${rounded(centerY)})">` +
    marks.join('') +
    '</g></g>'
  )
}

// see FR-019, HB-8, HB-9, HB-10, HB-11
// WHY: the drawn points must be the ones that answer, so the midpoints follow the geometry's hasSideHandles.
/** @purity pure */
function grabPointsOfBox(box: HighlightGeometry): readonly Point[] {
  const { x, y, width, height } = box.box
  const points: Point[] = [
    { x, y },
    { x: x + width, y: y + height },
    { x: x + width, y },
    { x, y: y + height },
  ]
  if (box.hasSideHandles.leftRight) points.push({ x, y: y + height / 2 }, { x: x + width, y: y + height / 2 })
  if (box.hasSideHandles.topBottom) points.push({ x: x + width / 2, y }, { x: x + width / 2, y: y + height })
  return points
}

// see FR-016, S-372, S-146, S-151, S-174
// WHY: a fixed screen size, never scaled: the reach the square shows (S-230) is in screen px too.
/** @purity pure */
function grabPointSquares(box: HighlightGeometry, ground: string, edge: string): readonly string[] {
  const side = NOT_STORED_SELECTION_SIZES['S-372']
  return grabPointsOfBox(box).map(
    (at, index) =>
      `<rect x="${rounded(at.x - side / 2)}" y="${rounded(at.y - side / 2)}"` +
      ` width="${rounded(side)}" height="${rounded(side)}" fill="${ground}" stroke="${edge}"` +
      ` stroke-width="${rounded(NOT_STORED_SELECTION_SIZES['S-174'])}"` +
      `${figureKey(`box-${box.id}-grab-${index}`)}/>`,
  )
}

// see FR-019, AT-146, AT-147, ZO-14
// STOP: spec names S-155 for the null fill but marks it provisional. Looked in FR-019, AT-146, S-370
// @provisional PND-609
/** @purity pure */
function highlightFillSvg(
  box: HighlightGeometry,
  chosen: ChosenColor,
  themed: (rowId: string) => string,
  rounding: string,
): readonly string[] {
  const fill =
    box.fillColor === null ? themed('S-155') : box.fillColor === TRANSPARENT ? null : chosen(box.fillColor, 'fill')
  if (fill === null) return []
  return [
    `<rect x="${rounded(box.box.x)}" y="${rounded(box.box.y)}"` +
      ` width="${rounded(box.box.width)}" height="${rounded(box.box.height)}"` +
      rounding +
      ` fill="${fill}" fill-opacity="${rounded(box.fillOpacity)}" stroke="none"` +
      `${figureKey(`box-${box.id}-fill`)}/>`,
  ]
}

// see FR-019, ZO-8, ZO-10, ZO-14
/** @purity pure */
function highlightBoxSvg(
  box: HighlightGeometry,
  input: OverlaysInput,
  annotationColor: string,
): { readonly fill: readonly string[]; readonly frame: string; readonly selection: readonly string[] } {
  const { chosen, themed, strokeOfBox } = input
  // see CV-6
  const stroke = chosen(strokeOfBox.get(box.id) ?? null, 'outline') ?? annotationColor
  const radius = box.cornerRadiusPx
  const rounding = radius !== null && radius > 0 ? ` rx="${rounded(radius)}"` : ''
  const frame =
    `<rect x="${rounded(box.box.x)}" y="${rounded(box.box.y)}"` +
    ` width="${rounded(box.box.width)}" height="${rounded(box.box.height)}"` +
    rounding +
    ` fill="none" stroke="${stroke}"` +
    ` stroke-width="${rounded(box.strokeWidthPx)}"${figureKey(`box-${box.id}`)}/>`
  const selection = [
    selectionFrameSvg(box.box, themed('S-151'), `box-${box.id}-frame`),
    ...grabPointSquares(box, themed('S-146'), themed('S-151')),
  ]
  return { fill: highlightFillSvg(box, chosen, themed, rounding), frame, selection }
}

// see FR-019, CV-6, LF-17
// WHY: one color and one width for the frame and the leader, which read as one line from the note to its point;
// transparency is laid on the fill alone.
/** @purity pure */
function commentBoxSvg(box: CommentGeometry, input: OverlaysInput, annotationColor: string): readonly string[] {
  const { chosen, themed, settings } = input
  const stroke = chosen(box.strokeColor, 'outline') ?? annotationColor
  const fill = chosen(box.fillColor, 'fill') ?? themed('S-146')
  const ink = chosen(box.textColor, 'outline') ?? themed('S-147')
  const width = rounded(box.strokeWidthPx)
  const [from, to] = leaderOf(box) ?? []
  const parts: string[] = []
  if (from !== undefined && to !== undefined) {
    parts.push(
      `<line x1="${rounded(from.x)}" y1="${rounded(from.y)}" x2="${rounded(to.x)}" y2="${rounded(to.y)}"` +
        ` stroke="${stroke}" stroke-width="${width}"${figureKey(`comment-${box.id}-leader`)}/>`,
    )
  }
  parts.push(
    `<rect x="${rounded(box.body.x)}" y="${rounded(box.body.y)}"` +
      ` width="${rounded(box.body.width)}" height="${rounded(box.body.height)}"` +
      ` fill="${fill}" fill-opacity="${rounded(box.fillOpacity)}" stroke="${stroke}" stroke-width="${width}"` +
      `${figureKey(`comment-${box.id}`)}/>`,
  )
  for (const [index, line] of box.lines.entries()) {
    parts.push(
      `<text x="${rounded(box.body.x + settings.commentBoxPad)}"` +
        ` y="${rounded(box.body.y + settings.commentBoxPad + (index + 1) * box.fontSize)}"` +
        ` font-size="${rounded(box.fontSize)}"${typefaceAttribute()} fill="${ink}"` +
        ` xml:space="preserve"${figureKey(`comment-${box.id}-line-${index}`)}>` +
        `${escaped(line)}</text>`,
    )
  }
  return parts
}

// see FR-016, S-376, S-146, S-151, S-174
// WHY: a fixed screen size, never scaled: the reach it shows (S-292) is in screen px too.
/** @purity pure */
function commentHandleSvg(box: CommentGeometry, ground: string, edge: string): string {
  const side = NOT_STORED_SELECTION_SIZES['S-376']
  return (
    `<rect x="${rounded(box.anchor.x - side / 2)}" y="${rounded(box.anchor.y - side / 2)}"` +
    ` width="${rounded(side)}" height="${rounded(side)}" fill="${ground}" stroke="${edge}"` +
    ` stroke-width="${rounded(NOT_STORED_SELECTION_SIZES['S-174'])}"${figureKey(`comment-${box.id}-handle`)}/>`
  )
}

// see CU-2, DC-2, DC-8
/** @purity pure */
function dualCursorLines(input: OverlaysInput): readonly string[] {
  const { geometry, layout, themed, following } = input
  const cursors = geometry.dualCursor
  if (cursors === null) return []
  const color = themed('S-195')
  const followedDay =
    following === null || following.x === null ? null : dateAtX(layout, following.x)
  const followedX = followedDay === null ? null : xFromDay(layout, followedDay)
  const lines: string[] = []
  for (const side of ['date1', 'date2'] as const) {
    const isFollowing = following !== null && following.side === side
    const standing = side === 'date1' ? cursors.date1X : cursors.date2X
    const x = isFollowing && followedX !== null ? followedX : standing
    const width = selectedLineWidth(NOT_STORED_DUAL_CURSOR_SIZES['S-194'], isFollowing)
    lines.push(
      `<line x1="${rounded(x)}" y1="${rounded(cursors.top)}"` +
        ` x2="${rounded(x)}" y2="${rounded(cursors.bottom)}"` +
        ` stroke="${color}" stroke-width="${rounded(width)}"` +
        `${figureKey(`dual-cursor-${side}`)}/>`,
    )
  }
  return lines
}

/** @purity pure */
export function overlayParts(input: OverlaysInput): OverlayParts {
  const {
    geometry,
    settings,
    guideCursorMode,
    regions,
    themed,
    drawsOperationState,
    pointer,
    selectedStatusLine,
    selectedBoxes,
    selectedComments,
  } = input
  const fillParts: string[] = []
  const linkParts: string[] = []
  const progressLineParts: string[] = []
  const annotationParts: string[] = []
  const selectionParts: string[] = []
  const annotationColor = themed('S-312')

  // see FR-110, ZO-16
  if (geometry.progressLine.length > 0 && settings.progressLineVisible) {
    progressLineParts.push(
      `<polyline points="${pointsOf(geometry.progressLine)}" fill="none"` +
        ` stroke="${themed('S-160')}" stroke-width="${rounded(settings.progressLineWidth)}"` +
        `${figureKey('progress-line')}/>`,
    )
  }

  const status = geometry.statusLine
  if (status !== null) {
    // see SL-8, S-438
    // WHY: S-438 is the chosen line's own width, not S-333 times S-178: the two are picked apart in px.
    const statusWidth = NOT_STORED_DUAL_CURSOR_SIZES[selectedStatusLine ? 'S-438' : 'S-333']
    linkParts.push(
      `<line x1="${rounded(status.x)}" y1="${rounded(status.top)}"` +
        ` x2="${rounded(status.x)}" y2="${rounded(status.bottom)}"` +
        ` stroke="${themed('S-163')}" stroke-width="${rounded(statusWidth)}"` +
        `${figureKey('status-line')}/>`,
    )
  }

  linkParts.push(...dualCursorLines(input))

  if (drawsOperationState && guideCursorMode !== 'none' && pointer !== null) {
    const area = regions.taskGroupArea
    // see CU-2, DC-3
    // WHY: the reading that owns the point, so the drawn guide and the dual cursor readout agree on the edge (DFC-1053).
    if (regionAtPointer(regions, pointer.x, pointer.y) === 'taskGroupArea') {
      const guideColor = themed('S-195')
      const guideWidth = NOT_STORED_DUAL_CURSOR_SIZES['S-194']
      const vertical = (x: number): string =>
        `<line x1="${rounded(x)}" y1="${rounded(area.y)}"` +
        ` x2="${rounded(x)}" y2="${rounded(area.y + area.height)}"` +
        ` stroke="${guideColor}" stroke-width="${rounded(guideWidth)}"` +
        `${figureKey('guide-cursor-vertical')}/>`
      if (guideCursorMode === 'crosshair') {
        linkParts.push(vertical(pointer.x))
        linkParts.push(
          `<line x1="${rounded(area.x)}" y1="${rounded(pointer.y)}"` +
            ` x2="${rounded(area.x + area.width)}" y2="${rounded(pointer.y)}"` +
            ` stroke="${guideColor}" stroke-width="${rounded(guideWidth)}"` +
            `${figureKey('guide-cursor-horizontal')}/>`,
        )
      } else if (guideCursorMode === 'single-vertical') {
        linkParts.push(vertical(pointer.x))
      }
    }
  }

  for (const box of geometry.highlightBoxes) {
    const drawn = highlightBoxSvg(box, input, annotationColor)
    fillParts.push(...drawn.fill)
    linkParts.push(drawn.frame)
    if (selectedBoxes.has(box.id)) selectionParts.push(...drawn.selection)
  }

  for (const box of geometry.commentBoxes) {
    annotationParts.push(...commentBoxSvg(box, input, annotationColor))
    if (selectedComments.has(box.id)) {
      selectionParts.push(
        selectionFrameSvg(box.body, themed('S-151'), `comment-${box.id}-frame`),
        commentHandleSvg(box, themed('S-146'), themed('S-151')),
      )
    }
  }
  return { fillParts, linkParts, progressLineParts, annotationParts, selectionParts }
}

// see SJ-10, S-555, S-556, S-227
// WHY: the one box the ring is drawn on and the ripple starts from, so the two cannot part; a task whose
// plan figure is not drawn (no plan dates, or the plan hidden) gets none.
/** @purity pure */
export function jumpLandingRingOf(layout: ScheduleLayout, geometry: ScheduleGeometry, target: LandedTarget): JumpLandingRing | null {
  if (target.kind === 'task') {
    const figure = geometry.tasks.find((one) => one.taskUid === target.taskUid)
    if (figure === undefined || figure.plan === null || figure.hasPlanDates === false) return null
  }
  const box = landedShapeBoxOf(layout, geometry, target)
  if (box === null) return null
  const gap = NOT_STORED_JUMP_LANDING_RING_SIZES['S-555']
  return {
    inner: { x: box.x - gap, y: box.y - gap, width: box.width + 2 * gap, height: box.height + 2 * gap },
    lineWidth: NOT_STORED_JUMP_LANDING_RING_SIZES['S-556'],
  }
}

// see SJ-10, ZO-10, EP-12, FR-098
// WHY: a ring around a task below the pinned band scrolls under it, so it is handed back apart from one that stands in the band.
/** @purity pure */
export function jumpLandingRingParts(
  viewer: ViewerValues,
  input: Pick<OverlaysInput, 'geometry' | 'layout' | 'themed' | 'drawsOperationState'>,
): { readonly pinned: readonly string[]; readonly scrolling: readonly string[] } {
  const mark = viewer.landingMarkDisplayState
  if (!input.drawsOperationState || mark?.kind !== 'shown' || mark.landedBy !== 'jump') return { pinned: [], scrolling: [] }
  const ring = jumpLandingRingOf(input.layout, input.geometry, mark.landedTarget)
  const related = relatedTaskRingParts(mark.landedRelatedTasks ?? [], input)
  if (ring === null) return related
  const svg = ringSvg(ring, input.themed('S-151'), JUMP_LANDING_RING_ROLE, 'jump-landing')
  const target = mark.landedTarget
  const isPinned = target.kind === 'task' && isPinnedTask(input, target.taskUid)
  const placed = isPinned || target.kind === 'commentBox' ? { pinned: [svg], scrolling: [] } : { pinned: [], scrolling: [svg] }
  return { pinned: [...related.pinned, ...placed.pinned], scrolling: [...related.scrolling, ...placed.scrolling] }
}

/** @purity pure */
function isPinnedTask(input: Pick<OverlaysInput, 'geometry'>, taskUid: number): boolean {
  return input.geometry.pinnedBand?.pinnedTaskUids.has(taskUid) === true
}

// see SJ-10, S-556
/** @purity pure */
function ringSvg(ring: JumpLandingRing, stroke: string, role: string, key: string): string {
  const half = ring.lineWidth / 2
  return (
    `<rect x="${rounded(ring.inner.x - half)}" y="${rounded(ring.inner.y - half)}"` +
    ` width="${rounded(ring.inner.width + ring.lineWidth)}" height="${rounded(ring.inner.height + ring.lineWidth)}"` +
    ` fill="none" stroke="${stroke}" stroke-width="${rounded(ring.lineWidth)}"` +
    ` data-role="${role}"${figureKey(key)}/>`
  )
}

// see RW-13, SJ-10, S-573, TV-3, EL-17
// WHY: SJ-10's ring in S-573 and with no ripple; a related task the picture does not draw gets none (RW-13).
/** @purity pure */
function relatedTaskRingParts(
  taskUids: readonly number[],
  input: Pick<OverlaysInput, 'geometry' | 'layout' | 'themed'>,
): { readonly pinned: readonly string[]; readonly scrolling: readonly string[] } {
  const pinned: string[] = []
  const scrolling: string[] = []
  for (const taskUid of taskUids) {
    const ring = jumpLandingRingOf(input.layout, input.geometry, { kind: 'task', taskUid })
    if (ring === null) continue
    const svg = ringSvg(ring, input.themed('S-573'), RELATED_TASK_RING_ROLE, `jump-related-${taskUid}`)
    if (isPinnedTask(input, taskUid)) pinned.push(svg)
    else scrolling.push(svg)
  }
  return { pinned, scrolling }
}

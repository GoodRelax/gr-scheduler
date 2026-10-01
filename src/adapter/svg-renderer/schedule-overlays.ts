// SvgRenderer -- the overlays that belong to no Task: lines, cursors, annotations, watermark.
// @unit      UF-83   (docs/spec/05-07-design.md, table T-075)
// @component SvgRenderer, layer Adapter (table T-062)
// @purity    pure

import type { DrawnSettings } from '../../entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../entity/document-model/schedule/schedule'
import {
  leaderOf,
  type CommentGeometry,
  type HighlightGeometry,
  type Point,
  type ScheduleGeometry,
} from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  dateAtX,
  xFromDay,
  type ScheduleLayout,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  NOT_STORED_DUAL_CURSOR_SIZES,
  NOT_STORED_SELECTION_SIZES,
  WATERMARK_MARKS,
  escaped,
  figureKey,
  pointsOf,
  rounded,
  selectedLineWidth,
  selectionFrameSvg,
  typefaceAttribute,
  type ChosenColour,
  type DualCursorFollow,
  type Watermark,
} from './svg-renderer'

// see S-72, S-66, EL-16, T-280
// WHY: the screen values the picture reads, spelled here so the renderer
// depends on no use case; ScreenValues satisfies it as it stands.
export interface ViewerValues {
  readonly themePreference: 'light' | 'dark'
  readonly guideCursorMode: 'none' | 'crosshair' | 'single-vertical'
  // WHY: optional -- a viewer built before the landing mark carries none, and none reads as hidden.
  readonly landingMarkDisplayState?:
    | { readonly kind: 'hidden' }
    | { readonly kind: 'shown'; readonly landedLink: { readonly predecessorUid: number;
        readonly successorUid: number }; readonly landedTaskUid: number }
}

export interface OverlaysInput {
  readonly geometry: ScheduleGeometry
  readonly settings: DrawnSettings
  readonly guideCursorMode: ViewerValues['guideCursorMode']
  readonly layout: ScheduleLayout
  readonly regions: ScreenRegions
  readonly themed: (rowId: string) => string
  readonly chosen: ChosenColour
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
  readonly annotationParts: readonly string[]
  readonly selectionParts: readonly string[]
}

const WATERMARK_ROLE = 'Watermark'

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
  const centreX = area.x + area.width / 2
  const centreY = area.y + area.height / 2
  const reach = Math.hypot(area.width, area.height) / 2
  const text = escaped(`${mark.openedBy} ${mark.stampedAt}`)
  const typeface = typefaceAttribute()
  const marks: string[] = []
  for (let y = centreY - reach; y <= centreY + reach; y += step) {
    for (let x = centreX - reach; x <= centreX + reach; x += step) {
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
    `<g transform="rotate(${WATERMARK_MARKS['S-220']} ${rounded(centreX)}` +
    ` ${rounded(centreY)})">` +
    marks.join('') +
    '</g></g>'
  )
}

const TRANSPARENT = 'transparent'

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
  chosen: ChosenColour,
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
  annotationColour: string,
): { readonly fill: readonly string[]; readonly frame: string; readonly selection: readonly string[] } {
  const { chosen, themed, strokeOfBox } = input
  // see CV-6
  const stroke = chosen(strokeOfBox.get(box.id) ?? null, 'outline') ?? annotationColour
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
// WHY: one colour and one width for the frame and the leader, which read as one line from the note to its point;
// transparency is laid on the fill alone.
/** @purity pure */
function commentBoxSvg(box: CommentGeometry, input: OverlaysInput, annotationColour: string): readonly string[] {
  const { chosen, themed, settings } = input
  const stroke = chosen(box.strokeColor, 'outline') ?? annotationColour
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
  const colour = themed('S-195')
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
        ` stroke="${colour}" stroke-width="${rounded(width)}"` +
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
  const annotationParts: string[] = []
  const selectionParts: string[] = []
  const annotationColour = themed('S-312')

  if (geometry.progressLine.length > 0 && settings.progressLineVisible) {
    linkParts.push(
      `<polyline points="${pointsOf(geometry.progressLine)}" fill="none"` +
        ` stroke="${themed('S-160')}" stroke-width="${rounded(settings.progressLineWidth)}"` +
        `${figureKey('progress-line')}/>`,
    )
  }

  const status = geometry.statusLine
  if (status !== null) {
    const statusWidth = selectedLineWidth(NOT_STORED_DUAL_CURSOR_SIZES['S-333'], selectedStatusLine)
    linkParts.push(
      `<line x1="${rounded(status.x)}" y1="${rounded(status.top)}"` +
        ` x2="${rounded(status.x)}" y2="${rounded(status.bottom)}"` +
        ` stroke="${themed('S-163')}" stroke-width="${rounded(statusWidth)}"` +
        `${figureKey('status-line')}/>`,
    )
  }

  linkParts.push(...dualCursorLines(input))

  if (drawsOperationState && guideCursorMode !== 'none' && pointer !== null) {
    const area = regions.rowArea
    const inside =
      pointer.x >= area.x &&
      pointer.x <= area.x + area.width &&
      pointer.y >= area.y &&
      pointer.y <= area.y + area.height
    if (inside) {
      const guideColour = themed('S-195')
      const guideWidth = NOT_STORED_DUAL_CURSOR_SIZES['S-194']
      const vertical = (x: number): string =>
        `<line x1="${rounded(x)}" y1="${rounded(area.y)}"` +
        ` x2="${rounded(x)}" y2="${rounded(area.y + area.height)}"` +
        ` stroke="${guideColour}" stroke-width="${rounded(guideWidth)}"` +
        `${figureKey('guide-cursor-vertical')}/>`
      if (guideCursorMode === 'crosshair') {
        linkParts.push(vertical(pointer.x))
        linkParts.push(
          `<line x1="${rounded(area.x)}" y1="${rounded(pointer.y)}"` +
            ` x2="${rounded(area.x + area.width)}" y2="${rounded(pointer.y)}"` +
            ` stroke="${guideColour}" stroke-width="${rounded(guideWidth)}"` +
            `${figureKey('guide-cursor-horizontal')}/>`,
        )
      } else if (guideCursorMode === 'single-vertical') {
        linkParts.push(vertical(pointer.x))
      }
    }
  }

  for (const box of geometry.highlightBoxes) {
    const drawn = highlightBoxSvg(box, input, annotationColour)
    fillParts.push(...drawn.fill)
    linkParts.push(drawn.frame)
    if (selectedBoxes.has(box.id)) selectionParts.push(...drawn.selection)
  }

  for (const box of geometry.commentBoxes) {
    annotationParts.push(...commentBoxSvg(box, input, annotationColour))
    if (selectedComments.has(box.id)) {
      selectionParts.push(
        selectionFrameSvg(box.body, themed('S-151'), `comment-${box.id}-frame`),
        commentHandleSvg(box, themed('S-146'), themed('S-151')),
      )
    }
  }
  return { fillParts, linkParts, annotationParts, selectionParts }
}

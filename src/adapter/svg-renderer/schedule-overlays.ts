// SvgRenderer -- the overlays that belong to no Task: lines, cursors, annotations, watermark.
// @unit      UF-83   (docs/spec/05-07-design.md, table T-075)
// @component SvgRenderer, layer Adapter (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../entity/document-model/schedule/schedule'
import type {
  Point,
  ScheduleGeometry,
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

export interface OverlaysInput {
  readonly geometry: ScheduleGeometry
  readonly settings: DocumentSettings
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
    regions,
    themed,
    chosen,
    drawsOperationState,
    pointer,
    selectedStatusLine,
    strokeOfBox,
    selectedBoxes,
    selectedComments,
  } = input
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

  if (drawsOperationState && settings.guideCursorMode !== 'none' && pointer !== null) {
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
      if (settings.guideCursorMode === 'crosshair') {
        linkParts.push(vertical(pointer.x))
        linkParts.push(
          `<line x1="${rounded(area.x)}" y1="${rounded(pointer.y)}"` +
            ` x2="${rounded(area.x + area.width)}" y2="${rounded(pointer.y)}"` +
            ` stroke="${guideColour}" stroke-width="${rounded(guideWidth)}"` +
            `${figureKey('guide-cursor-horizontal')}/>`,
        )
      } else if (settings.guideCursorMode === 'single-vertical') {
        linkParts.push(vertical(pointer.x))
      }
    }
  }

  for (const box of geometry.highlightBoxes) {
    // see CV-6
    const stroke = chosen(strokeOfBox.get(box.id) ?? null, 'outline') ?? annotationColour
    const radius = box.cornerRadiusPx
    const rounding = radius !== null && radius > 0 ? ` rx="${rounded(radius)}"` : ''
    linkParts.push(
      `<rect x="${rounded(box.box.x)}" y="${rounded(box.box.y)}"` +
        ` width="${rounded(box.box.width)}" height="${rounded(box.box.height)}"` +
        rounding +
        ` fill="none" stroke="${stroke}"` +
        ` stroke-width="1"${figureKey(`box-${box.id}`)}/>`,
    )
    if (selectedBoxes.has(box.id)) {
      selectionParts.push(selectionFrameSvg(box.box, themed('S-151'), `box-${box.id}-frame`))
    }
  }

  for (const box of geometry.commentBoxes) {
    annotationParts.push(
      `<line x1="${rounded(box.anchor.x)}" y1="${rounded(box.anchor.y)}"` +
        ` x2="${rounded(box.body.x)}" y2="${rounded(box.body.y + box.body.height)}"` +
        ` stroke="${annotationColour}" stroke-width="1"` +
        `${figureKey(`comment-${box.id}-leader`)}/>`,
    )
    annotationParts.push(
      `<rect x="${rounded(box.body.x)}" y="${rounded(box.body.y)}"` +
        ` width="${rounded(box.body.width)}" height="${rounded(box.body.height)}"` +
        ` fill="${themed('S-146')}" stroke="${annotationColour}" stroke-width="1"` +
        `${figureKey(`comment-${box.id}`)}/>`,
    )
    for (const [index, line] of box.lines.entries()) {
      annotationParts.push(
        `<text x="${rounded(box.body.x + settings.commentBoxPad)}"` +
          ` y="${rounded(box.body.y + settings.commentBoxPad + (index + 1) * box.fontSize)}"` +
          ` font-size="${rounded(box.fontSize)}"${typefaceAttribute()} fill="${themed('S-147')}"` +
          ` xml:space="preserve"${figureKey(`comment-${box.id}-line-${index}`)}>` +
          `${escaped(line)}</text>`,
      )
    }
    if (selectedComments.has(box.id)) {
      selectionParts.push(
        selectionFrameSvg(box.body, themed('S-151'), `comment-${box.id}-frame`),
      )
    }
  }
  return { linkParts, annotationParts, selectionParts }
}

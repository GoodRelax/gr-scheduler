// ScheduleGeometry -- the comment box: its wrapped text, its body box and its leader line (FR-097).
// @unit      UF-148  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleGeometry, layer layoutEngine (table T-062)
// @purity    pure

import type { DrawnSettings } from '../../document-model/document-settings/document-settings'
import { dayOf, type CalendarDay, type Schedule } from '../../document-model/schedule/schedule'
import { xFromDay, type ScheduleLayout } from '../schedule-layout/schedule-layout'
import { drawnAnnotationNumber } from './highlight-box'
import { point, type CommentGeometry, type Path, type Point } from './schedule-geometry'

// see GR-14, T-221 LF-17
// WHY: the nearest of the four corners, chosen per axis against the body's middle (a tie takes left and bottom, the
// offset's own corner); an anchor inside the body, edges included, has no leader -- any corner would cross the text.
/** @purity pure */
export function leaderOf(comment: CommentGeometry): Path | null {
  const { anchor, body } = comment
  const right = body.x + body.width
  const bottom = body.y + body.height
  const isInside = anchor.x >= body.x && anchor.x <= right && anchor.y >= body.y && anchor.y <= bottom
  if (isInside) return null
  const x = anchor.x > body.x + body.width / 2 ? right : body.x
  const y = anchor.y < body.y + body.height / 2 ? body.y : bottom
  return [anchor, point(x, y)]
}

// see LF-15
// WHY: the one formula for where an anchor stands; the drawing and the translator's drag both call it (CR-559 S-1).
/** @purity pure */
export function commentAnchorPointOf(layout: ScheduleLayout, day: CalendarDay, groupId: string): Point | null {
  const row = layout.rows.find((one) => one.groupId === groupId)
  if (row === undefined) return null
  return point(xFromDay(layout, day) + layout.pxPerDay / 2, row.y + row.height / 2)
}

// see FR-093
// TRAP: repeats labelUnits in label-width.ts; change them together.
/** @purity pure */
function charUnits(ch: string): number {
  return ch.charCodeAt(0) < 0x100 ? 1 : 2
}

/** @purity pure */
function labelUnits(text: string): number {
  let units = 0
  for (const character of text) units += charUnits(character)
  return units
}

// see FR-097, S-182
/** @purity pure */
function wrappedLines(text: string, limit: number): readonly string[] {
  const out: string[] = []
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = ''
    let units = 0
    for (const character of paragraph) {
      const width = charUnits(character)
      if (units + width > limit && line !== '') {
        out.push(line)
        line = ''
        units = 0
      }
      line += character
      units += width
    }
    out.push(line)
  }
  return out
}

// see FR-019, FR-097
/** @purity pure */
export function commentGeometry(
  schedule: Schedule,
  settings: DrawnSettings,
  layout: ScheduleLayout,
): readonly CommentGeometry[] {
  const out: CommentGeometry[] = []
  for (const box of schedule.commentBoxes) {
    // see FR-019, UC-008, AT-12
    // WHY: a box with no anchor date stands at the document's start date, or it could not be chosen or deleted.
    const day = dayOf(box.anchorDate) ?? dayOf(schedule.project.startDate)
    const anchor = day === null || box.anchorGroupId === null ? null : commentAnchorPointOf(layout, day, box.anchorGroupId)
    if (anchor === null) continue
    const lines = wrappedLines(box.text ?? '', settings.commentBoxWrapUnits)
    let widest = 0
    for (const line of lines) widest = Math.max(widest, labelUnits(line))
    // DEVIATION: spec says the floor is T-215's font size, not one full-width char (FR-097); here it is (DFC-722)
    if (widest === 0) widest = 2
    const offset = box.bodyOffsetPx ?? { dx: 0, dy: 0 }
    const fontSize = settings.fontScaleSizes[settings.fontScale]
    const pad = settings.commentBoxPad
    const width = widest * fontSize * settings.labelCoef + 2 * pad
    const height = lines.length * fontSize + 2 * pad
    out.push({
      id: box.id,
      anchor,
      body: {
        x: anchor.x + offset.dx,
        y: anchor.y + offset.dy - height,
        width,
        height,
      },
      lines,
      fontSize,
      strokeWidthPx: drawnAnnotationNumber(box.strokeWidthPx, 'S-374'),
      // see AT-151
      fillOpacity: 1 - drawnAnnotationNumber(box.fillTransparencyPercent, 'S-375') / 100,
      // TRAP: '?? null', not the bare column: a document built by hand without the CR-559 columns carries undefined
      strokeColor: box.strokeColor ?? null,
      fillColor: box.fillColor ?? null,
      textColor: box.textColor ?? null,
    })
  }
  return out
}

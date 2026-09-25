// ScheduleGeometry -- the comment box: its wrapped text, its body box and its leader line (FR-097).
// @unit      UF-148  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleGeometry, layer layoutEngine (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import { dayOf, type Schedule } from '../../document-model/schedule/schedule'
import { xFromDay, type ScheduleLayout } from '../schedule-layout/schedule-layout'
import { point, type CommentGeometry, type Path } from './schedule-geometry'

// see GR-14
/** @purity pure */
export function leaderOf(comment: CommentGeometry): Path {
  return [comment.anchor, point(comment.body.x, comment.body.y + comment.body.height)]
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
  settings: DocumentSettings,
  layout: ScheduleLayout,
): readonly CommentGeometry[] {
  const rowById = new Map(layout.rows.map((row) => [row.groupId, row]))
  const out: CommentGeometry[] = []
  // TRAP: read no setting before the loop: fontScaleSizes[fontScale] throws for a document with no comment box.
  for (const box of schedule.commentBoxes) {
    // see FR-019, UC-008, AT-12
    // WHY: a box with no anchor date stands at the document's start date, or it could not be chosen or deleted.
    const day = dayOf(box.anchorDate) ?? dayOf(schedule.project.startDate)
    const row = box.anchorGroupId === null ? undefined : rowById.get(box.anchorGroupId)
    if (day === null || row === undefined) continue
    const lines = wrappedLines(box.text ?? '', settings.commentBoxWrapUnits)
    let widest = 0
    for (const line of lines) widest = Math.max(widest, labelUnits(line))
    // DEVIATION: spec says the floor is T-215's font size, not one full-width char (FR-097); here it is (DFC-722)
    if (widest === 0) widest = 2
    const offset = box.bodyOffsetPx ?? { dx: 0, dy: 0 }
    const anchor = point(xFromDay(layout, day) + layout.pxPerDay / 2, row.y + row.height / 2)
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
    })
  }
  return out
}

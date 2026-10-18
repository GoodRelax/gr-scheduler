// ScheduleGeometry -- the comment box: its wrapped text, its body box and its leader line (FR-097).
// @unit      UF-148  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleGeometry, layer layoutEngine (table T-062)
// @purity    pure

import type { DrawnSettings } from '../../document-model/document-settings/document-settings'
import {
  COLUMN_SHAPES,
  dayOf,
  instantOf,
  textOfDayStart,
  type CommentBox,
  type Schedule,
} from '../../document-model/schedule/schedule'
import { xOfInstant, type ScheduleLayout } from '../schedule-layout/schedule-layout'
import { drawnAnnotationNumber, drawnCommentTextSizePx } from './highlight-box'
import {
  point,
  type BarGeometry,
  type CommentGeometry,
  type HighlightGeometry,
  type Path,
  type Point,
  type TaskGeometry,
} from './schedule-geometry'

// see GR-14, LF-17
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

export type AnchorSnapPoint = NonNullable<CommentBox['anchorSnapPoint']>
export type AnchorTaskFigure = NonNullable<CommentBox['anchorTaskFigure']>

// see LF-15, GR-14
// WHY: read from the generated column shapes, in AT-167's order: a tie between two points takes the earlier one.
// The casts hold because the generator prints each union and its choices from the same erd.json values.
const SNAP_POINTS = (COLUMN_SHAPES.CommentBox['anchorSnapPoint']?.choices ?? []) as readonly AnchorSnapPoint[]
const TASK_FIGURES = (COLUMN_SHAPES.CommentBox['anchorTaskFigure']?.choices ?? []) as readonly AnchorTaskFigure[]

export type AnchorTarget =
  | {
      readonly kind: 'task'
      readonly taskUid: number
      readonly taskFigure: AnchorTaskFigure
      readonly taskGroupId: string | null
      readonly snapPoint: AnchorSnapPoint
    }
  | { readonly kind: 'highlightBox'; readonly highlightBoxId: string; readonly snapPoint: AnchorSnapPoint }

export interface AnchorSnap {
  readonly target: AnchorTarget
  readonly at: Point
}

interface FigureBox {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

/** @purity pure */
function figureBoxOf(figure: BarGeometry): FigureBox | null {
  if (figure.form === 'line') {
    const half = figure.strokeWidth / 2
    return {
      left: Math.min(figure.from.x, figure.to.x),
      right: Math.max(figure.from.x, figure.to.x),
      top: Math.min(figure.from.y, figure.to.y) - half,
      bottom: Math.max(figure.from.y, figure.to.y) + half,
    }
  }
  if (figure.points.length === 0) return null
  const xs = figure.points.map((one) => one.x)
  const ys = figure.points.map((one) => one.y)
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) }
}

// see LF-15
// WHY: a milestone's corners stand halfway between two side midpoints, so on a diamond all eight lie on the shape.
/** @purity pure */
function snapPointOn(box: FigureBox, snapPoint: AnchorSnapPoint, isMilestone: boolean): Point {
  const middleX = (box.left + box.right) / 2
  const middleY = (box.top + box.bottom) / 2
  const inset = isMilestone ? 0.5 : 0
  const leftX = box.left + (middleX - box.left) * inset
  const rightX = box.right - (box.right - middleX) * inset
  const topY = box.top + (middleY - box.top) * inset
  const bottomY = box.bottom - (box.bottom - middleY) * inset
  switch (snapPoint) {
    case 'topLeftCorner':
      return point(leftX, topY)
    case 'topMiddle':
      return point(middleX, box.top)
    case 'topRightCorner':
      return point(rightX, topY)
    case 'rightMiddle':
      return point(box.right, middleY)
    case 'bottomRightCorner':
      return point(rightX, bottomY)
    case 'bottomMiddle':
      return point(middleX, box.bottom)
    case 'bottomLeftCorner':
      return point(leftX, bottomY)
    case 'leftMiddle':
      return point(box.left, middleY)
  }
}

/** @purity pure */
function figureOf(task: TaskGeometry, figure: AnchorTaskFigure): BarGeometry | null {
  if (figure === 'actualBar') return task.actual
  if (figure === 'milestone') return task.milestoneFigure
  return task.shapeKind === 'milestone' ? null : task.plan
}

// see LF-15, GR-14, AR-5
/** @purity pure */
export function anchorSnapsOf(
  tasks: readonly TaskGeometry[],
  highlights: readonly HighlightGeometry[],
): readonly AnchorSnap[] {
  const out: AnchorSnap[] = []
  for (const task of tasks) {
    for (const taskFigure of TASK_FIGURES) {
      const drawn = figureOf(task, taskFigure)
      const box = drawn === null ? null : figureBoxOf(drawn)
      if (box === null) continue
      const taskGroupId = task.taskGroupId ?? null
      for (const snapPoint of SNAP_POINTS) {
        out.push({
          target: { kind: 'task', taskUid: task.taskUid, taskFigure, taskGroupId, snapPoint },
          at: snapPointOn(box, snapPoint, taskFigure === 'milestone'),
        })
      }
    }
  }
  for (const highlight of highlights) {
    const { x, y, width, height } = highlight.box
    const box = { left: x, top: y, right: x + width, bottom: y + height }
    for (const snapPoint of SNAP_POINTS) {
      out.push({
        target: { kind: 'highlightBox', highlightBoxId: highlight.id, snapPoint },
        at: snapPointOn(box, snapPoint, false),
      })
    }
  }
  return out
}

// see LF-15
/** @purity pure */
export function freeAnchorPointOf(
  layout: ScheduleLayout,
  instant: number,
  taskGroupId: string,
  bandFraction: number | null,
): Point | null {
  const taskGroup = layout.taskGroups.find((one) => one.taskGroupId === taskGroupId)
  if (taskGroup === undefined) return null
  const fraction = bandFraction === null || !Number.isFinite(bandFraction) ? 0.5 : Math.min(1, Math.max(0, bandFraction))
  return point(xOfInstant(layout, instant), taskGroup.y + taskGroup.height * fraction)
}

export interface AnchorSurroundings {
  readonly schedule: Schedule
  readonly layout: ScheduleLayout
  readonly snaps: readonly AnchorSnap[]
}

// see LF-15, FR-019, NG-7
// WHY: the one formula for where a tip stands, read by the drawing and the drag; an undrawn target answers null.
/** @purity pure */
export function commentAnchorPointOf(around: AnchorSurroundings, box: CommentBox): Point | null {
  const target = targetOf(box)
  if (target !== null && isHeldTarget(around.schedule, target)) {
    return targetPointOf(around.snaps, target, box.anchorTaskGroupId)
  }
  if (box.anchorTaskGroupId === null) return null
  const instant = freeInstantOf(around.schedule, box)
  return instant === null ? null : freeAnchorPointOf(around.layout, instant, box.anchorTaskGroupId, box.anchorBandFraction ?? null)
}

// see FR-019, UC-008, AT-12
// WHY: a box with no anchor date stands at the document's start date, or it could not be chosen or deleted.
/** @purity pure */
function freeInstantOf(schedule: Schedule, box: CommentBox): number | null {
  if (dayOf(box.anchorDate) !== null) return instantOf(box.anchorDate)
  const start = dayOf(schedule.project.startDate)
  return start === null ? null : instantOf(textOfDayStart(start))
}

type HeldTarget =
  | {
      readonly kind: 'task'
      readonly taskUid: number
      readonly taskFigure: AnchorTaskFigure
      readonly snapPoint: AnchorSnapPoint
    }
  | { readonly kind: 'highlightBox'; readonly highlightBoxId: string; readonly snapPoint: AnchorSnapPoint }

/** @purity pure */
function targetOf(box: CommentBox): HeldTarget | null {
  const snapPoint = box.anchorSnapPoint ?? null
  const taskUid = box.anchorTaskUid ?? null
  const taskFigure = box.anchorTaskFigure ?? null
  const highlightBoxId = box.anchorHighlightBoxId ?? null
  if (snapPoint === null || (taskUid === null) === (highlightBoxId === null)) return null
  if (taskUid !== null) return taskFigure === null ? null : { kind: 'task', taskUid, taskFigure, snapPoint }
  return highlightBoxId === null ? null : { kind: 'highlightBox', highlightBoxId, snapPoint }
}

/** @purity pure */
function isHeldTarget(schedule: Schedule, target: HeldTarget): boolean {
  return target.kind === 'task'
    ? schedule.tasks.some((one) => one.uid === target.taskUid)
    : schedule.highlightBoxes.some((one) => one.id === target.highlightBoxId)
}

// see LF-15
// WHY: a task drawn in several task groups (TaskGroupMember) stands in the band the tip snapped in, else the first drawn.
/** @purity pure */
function targetPointOf(snaps: readonly AnchorSnap[], target: HeldTarget, taskGroupId: string | null): Point | null {
  let first: Point | null = null
  for (const snap of snaps) {
    const one = snap.target
    if (one.snapPoint !== target.snapPoint) continue
    if (one.kind === 'highlightBox') {
      if (target.kind === 'highlightBox' && one.highlightBoxId === target.highlightBoxId) return snap.at
      continue
    }
    if (target.kind !== 'task' || one.taskUid !== target.taskUid || one.taskFigure !== target.taskFigure) continue
    if (one.taskGroupId === taskGroupId) return snap.at
    first ??= snap.at
  }
  return first
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

// see FR-093, FR-097, T-215
// WHY: an empty or null text estimates 0 units, so it takes T-215's font size as its floor, never one full-width
// character: that one is scaled by S-30 and would move the floor with a document setting (FR-097).
/** @purity pure */
function textWidthOf(lines: readonly string[], fontSize: number, labelCoef: number): number {
  let widest = 0
  for (const line of lines) widest = Math.max(widest, labelUnits(line))
  return widest === 0 ? fontSize : widest * fontSize * labelCoef
}

// see FR-019, FR-097
/** @purity pure */
export function commentGeometry(
  schedule: Schedule,
  settings: DrawnSettings,
  layout: ScheduleLayout,
  snaps: readonly AnchorSnap[],
): readonly CommentGeometry[] {
  const out: CommentGeometry[] = []
  const around = { schedule, layout, snaps }
  for (const box of schedule.commentBoxes) {
    const anchor = commentAnchorPointOf(around, box)
    if (anchor === null) continue
    const lines = wrappedLines(box.text ?? '', settings.commentBoxWrapUnits)
    const offset = box.bodyOffsetPx ?? { dx: 0, dy: 0 }
    // see AT-168, S-624
    const fontSize = drawnCommentTextSizePx(box.textSizePx ?? null, settings.fontSizeStepSizes[settings.fontSizeStep])
    const pad = settings.commentBoxPad
    const width = textWidthOf(lines, fontSize, settings.labelCoef) + 2 * pad
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

// CR-777: the document, the frame loop and the reading helpers the cr-777-*.contract.test.ts files share.

import type { Document } from '../../src/entity/document-model/document/document'
import type { CommentBox, Task } from '../../src/entity/document-model/schedule/schedule'
import {
  anchorSnapsOf,
  type AnchorSnap,
  type CommentGeometry,
  type Point,
  type TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import type { FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { boxOfBar, type Box } from '../unit/cr-430-bench'
import { dayUnder } from '../unit/cr-430-stage'
import { april, asDocument, rowIdOf, stage, taskRow, visualOf, type Stage } from '../unit/cr-646-stage'

export { april, rowIdOf, stage, type Stage }

export const BAR_UID = 1
export const MILESTONE_UID = 2
export const FREE_UID = 3
export const SECOND_BAR_UID = 4

export const COMMENT_ID = '77700000-0000-4000-8000-000000000001'
export const OTHER_COMMENT_ID = '77700000-0000-4000-8000-000000000002'
export const HIGHLIGHT_ID = '77700000-0000-4000-8000-0000000000a1'

// see AT-167
export const SNAP_ORDER = [
  'topLeftCorner',
  'topMiddle',
  'topRightCorner',
  'rightMiddle',
  'bottomRightCorner',
  'bottomMiddle',
  'bottomLeftCorner',
  'leftMiddle',
] as const

export const LIMITS = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }

/** @purity pure */
export function groupOf(uid: number): string {
  return rowIdOf(uid - 1)
}

/** @purity pure */
export function tasksOf(): readonly Record<string, unknown>[] {
  return [
    taskRow(BAR_UID, {
      start: april(6, '00:00:00'),
      finish: april(10, '17:00:00'),
      actualStart: april(7, '00:00:00'),
      stop: april(9, '17:00:00'),
      resumeValid: true,
    }),
    taskRow(MILESTONE_UID, { start: april(13, '17:00:00'), finish: april(13, '17:00:00'), milestone: true }),
    taskRow(FREE_UID, { start: april(6, '00:00:00'), finish: april(14, '17:00:00') }),
    taskRow(SECOND_BAR_UID, { start: april(16, '00:00:00'), finish: april(20, '17:00:00') }),
  ]
}

/** @purity pure */
export function commentRow(part: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: COMMENT_ID,
    leaderShapeKind: 'polyline',
    text: 'Note',
    anchorDate: april(15, '12:00:00'),
    anchorTaskGroupId: groupOf(FREE_UID),
    anchorBandFraction: null,
    anchorTaskUid: null,
    anchorTaskFigure: null,
    anchorHighlightBoxId: null,
    anchorSnapPoint: null,
    bodyOffsetPx: { dx: 60, dy: -60 },
    strokeColor: null,
    strokeWidthPx: null,
    fillColor: null,
    fillTransparencyPercent: null,
    textColor: null,
    ...part,
  }
}

/** @purity pure */
export function highlightRow(part: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: HIGHLIGHT_ID,
    start: april(8, '00:00:00'),
    finish: april(11, '23:59:00'),
    topTaskGroupId: groupOf(MILESTONE_UID),
    bottomTaskGroupId: groupOf(SECOND_BAR_UID),
    strokeColor: null,
    cornerRadiusPx: null,
    strokeWidthPx: null,
    fillColor: null,
    fillTransparencyPercent: null,
    ...part,
  }
}

/** @purity pure */
export function documentWith(
  commentBoxes: readonly Record<string, unknown>[],
  highlightBoxes: readonly Record<string, unknown>[] = [],
  settings: Record<string, unknown> = {},
): Document {
  const tasks = tasksOf()
  return asDocument({
    tasks,
    visuals: tasks.map((one) => visualOf(one['uid'] as number, one['milestone'] === true ? { shapeKind: 'milestone' } : {})),
    commentBoxes,
    highlightBoxes,
    settings,
  })
}

/** @purity pure */
export function frameOf(loop: FrameLoop): NonNullable<ReturnType<FrameLoop['current']>> {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

/** @purity pure */
export function commentDrawn(loop: FrameLoop, id: string = COMMENT_ID): CommentGeometry | null {
  return frameOf(loop).geometry.commentBoxes.find((one) => one.id === id) ?? null
}

/** @purity pure */
export function commentStored(loop: FrameLoop, id: string = COMMENT_ID): CommentBox {
  const found = loop.document().schedule.commentBoxes.find((one) => one.id === id)
  if (found === undefined) throw new Error(`the document has no comment box ${id}`)
  return structuredClone(found)
}

/** @purity pure */
export function bandOf(loop: FrameLoop, taskGroupId: string): { y: number; height: number } {
  const found = frameOf(loop).layout.taskGroups.find((one) => one.taskGroupId === taskGroupId)
  if (found === undefined) throw new Error(`the frame drew no band for ${taskGroupId}`)
  return found
}

/** @purity pure */
export function taskDrawn(loop: FrameLoop, uid: number): TaskGeometry | null {
  return frameOf(loop).geometry.tasks.find((one) => one.taskUid === uid) ?? null
}

/** @purity pure */
export function snapsOf(loop: FrameLoop): readonly AnchorSnap[] {
  const { geometry } = frameOf(loop)
  return anchorSnapsOf(geometry.tasks, geometry.highlightBoxes)
}

/** @purity pure */
export function boxOfTask(loop: FrameLoop, uid: number, figure: 'plan' | 'actual' | 'milestoneFigure'): Box {
  const drawn = taskDrawn(loop, uid)
  if (drawn === null) throw new Error(`Task ${uid} is not drawn`)
  return boxOfBar(drawn[figure], `Task ${uid} ${figure}`)
}

// see LF-15
/** @purity pure */
export function eightPointsOf(box: Box, isMilestone: boolean): readonly Point[] {
  const cx = (box.x0 + box.x1) / 2
  const cy = (box.y0 + box.y1) / 2
  const middles = { top: { x: cx, y: box.y0 }, right: { x: box.x1, y: cy }, bottom: { x: cx, y: box.y1 }, left: { x: box.x0, y: cy } }
  const between = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  const corner = (x: number, y: number, a: Point, b: Point): Point => (isMilestone ? between(a, b) : { x, y })
  return [
    corner(box.x0, box.y0, middles.left, middles.top),
    middles.top,
    corner(box.x1, box.y0, middles.top, middles.right),
    middles.right,
    corner(box.x1, box.y1, middles.right, middles.bottom),
    middles.bottom,
    corner(box.x0, box.y1, middles.bottom, middles.left),
    middles.left,
  ]
}

/** @purity pure */
export function snapsOfFigure(
  loop: FrameLoop,
  uid: number,
  figure: 'plannedBar' | 'actualBar' | 'milestone',
): readonly AnchorSnap[] {
  return snapsOf(loop).filter((one) => one.target.kind === 'task' && one.target.taskUid === uid && one.target.taskFigure === figure)
}

// WHY: the left edge of a day's column, found by bisection on the day the axis reads, so no column width is assumed.
/** @purity pure */
export function columnLeft(loop: FrameLoop, isoDay: string): number {
  const { regions, layout } = frameOf(loop)
  const wanted = isoDay.slice(0, 10)
  let high = regions.taskGroupArea.x + regions.taskGroupArea.width
  let low = regions.taskGroupArea.x
  for (let x = low + 1; x < high; x += layout.pxPerDay / 4) {
    if (dayUnder(loop, x) === wanted) {
      high = x
      break
    }
  }
  low = high - layout.pxPerDay
  for (let turn = 0; turn < 50; turn += 1) {
    const middle = (low + high) / 2
    if (dayUnder(loop, middle) === wanted) high = middle
    else low = middle
  }
  return high
}

/** @purity pure */
export function tipOf(loop: FrameLoop, id: string = COMMENT_ID): Point {
  const drawn = commentDrawn(loop, id)
  if (drawn === null) throw new Error(`the frame drew no comment box ${id}`)
  return drawn.anchor
}

/** @purity pure */
export function taskOfDocument(document: Document, uid: number): Task {
  const found = document.schedule.tasks.find((one) => one.uid === uid)
  if (found === undefined) throw new Error(`the document has no Task ${uid}`)
  return found
}

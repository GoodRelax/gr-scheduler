// CR-824 / JDG-3053 / DFC-3411 spec-only tests: a comment box over a name or assignee label answers the double click (MK-13; ZO-9 drawn over ZO-5).

import { afterEach, describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import { grabSizesOf, itemAtPointer, type Hit } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import type { Point, ScheduleGeometry } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { april, documentObject, restoreAnimationFrames, rowIdOf, stage, taskRow } from '../unit/cr-646-stage'
import { commentRow, frameOf } from './cr-777-stage'
import { specTable } from './spec-table'

afterEach(restoreAnimationFrames)

const verticalIn = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// see T-023, MK-13
const MK_13 = verticalIn('T-023', 'MK-13').cells.join(' ')
// see CR-824, JDG-3053, DFC-3411
const MK_13_COMMENT_OVER_LABEL =
  '⭐ コメントボックス（表 T-023d の `GR-14` の本体・引出し線・線先）が名称ラベルか担当ラベル（同表の `GR-10` / `GR-11`）に重なる点では、コメントボックスの宛先を読むこと（MUST） —— コメントボックスはラベルより手前に描く（表 T-020 の `ZO-9` と `ZO-5`）ので、見えているほうに応える'

// see T-020, ZO-5, ZO-9
const drawOrderOf = (id: string): number => Number.parseInt(verticalIn('T-020', id).by['順'] ?? '', 10)

// see T-023d, GR-10, GR-11, GR-14
const GRAB_PLACE_OF = (id: string): string => verticalIn('T-023d', id).by['掴み領域'] ?? ''

const NAMED_UID = 1
const ASSIGNED_UID = 2
const COMMENT_ID = '82400000-0000-4000-8000-000000000001'
// WHY: a one-day bar with a long name, so the name label stands clear of the bar (FR-109) and only the label is under the point.
const LONG_NAME = 'A rather long task name that cannot fit inside a one-day bar'
const ASSIGNEE = 'A very long assignee name'
// WHY: far right of both tasks, so the comment's own anchor never shares the point under test.
const FAR_DATE = april(28, '12:00:00')

interface Wish {
  // WHY: null leaves the comment box out of the document.
  readonly bodyOffsetPx: { readonly dx: number; readonly dy: number } | null
  readonly anchorDate?: string
  readonly anchorBandFraction?: number | null
  readonly anchorTaskGroupIndex?: number
}

function documentOf(wish: Wish): Document {
  const tasks = [
    taskRow(NAMED_UID, { name: LONG_NAME, start: april(6, '08:00:00'), finish: april(6, '17:00:00') }),
    taskRow(ASSIGNED_UID, { name: 'B', start: april(6, '08:00:00'), finish: april(7, '17:00:00') }),
  ]
  const comments =
    wish.bodyOffsetPx === null
      ? []
      : [
          commentRow({
            id: COMMENT_ID,
            text: 'A comment box body that is wide enough',
            anchorDate: wish.anchorDate ?? FAR_DATE,
            anchorTaskGroupId: rowIdOf(wish.anchorTaskGroupIndex ?? 1),
            anchorBandFraction: wish.anchorBandFraction ?? null,
            bodyOffsetPx: wish.bodyOffsetPx,
          }),
        ]
  const document = documentObject({
    tasks,
    commentBoxes: comments,
    settings: { isAssigneeVisible: true, isProgressMarkerVisible: false, isPercentCompleteVisible: false },
  })
  document.schedule.resources = [
    { uid: 500, name: ASSIGNEE, resourceKind: 1, isCostResource: false, calendarUid: null, carry: {}, carryElements: [] },
  ]
  document.schedule.assignments = [
    { uid: 600, taskUid: ASSIGNED_UID, resourceUid: 500, carry: {}, carryElements: [] },
  ]
  return document as unknown as Document
}

const geometryOf = (wish: Wish): ScheduleGeometry => frameOf(stage(documentOf(wish)).loop).geometry

const hitOf = (geometry: ScheduleGeometry, at: Point, resolving: 'press' | 'doubleClick'): Hit | null =>
  itemAtPointer(geometry, at.x, at.y, grabSizesOf(), resolving)

interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

const inside = (at: Point, box: Rect): boolean =>
  at.x >= box.x && at.x <= box.x + box.width && at.y >= box.y && at.y <= box.y + box.height

const centerOf = (box: Rect): Point => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 })

function taskOf(geometry: ScheduleGeometry, uid: number) {
  const found = geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`premise: task ${uid} is drawn`)
  return found
}

function labelOf(geometry: ScheduleGeometry, uid: number, which: 'label' | 'assigneeLabel'): Rect {
  const found = taskOf(geometry, uid)[which]
  if (found === null) throw new Error(`premise: task ${uid} draws its ${which}`)
  return found
}

function bodyOf(geometry: ScheduleGeometry): Rect {
  const found = geometry.commentBoxes.find((one) => one.id === COMMENT_ID)
  if (found === undefined) throw new Error('premise: the comment box is drawn')
  return found.body
}

// WHY: the point under test is the label's middle, which T-023d makes the label's own place.
const labelPoint = (which: 'label' | 'assigneeLabel', uid: number): Point =>
  centerOf(labelOf(geometryOf({ bodyOffsetPx: null }), uid, which))

// WHY: the body is laid from the stored offset (FR-019); shifting the offset by the miss twice lands its middle on the point.
function geometryWithBodyOver(at: Point): ScheduleGeometry {
  let offset = { dx: 60, dy: -60 }
  for (let turn = 0; turn < 3; turn += 1) {
    const middle = centerOf(bodyOf(geometryOf({ bodyOffsetPx: offset })))
    offset = { dx: offset.dx + (at.x - middle.x), dy: offset.dy + (at.y - middle.y) }
  }
  return geometryOf({ bodyOffsetPx: offset })
}

describe('CR-824 premise -- the manuscript these cases read', () => {
  it(`MK-13 holds the sentence: ${MK_13_COMMENT_OVER_LABEL}`, () => {
    expect(MK_13, 'the sentence stands in the MK-13 row of T-023').toContain(MK_13_COMMENT_OVER_LABEL)
  })

  it('T-020 draws the comment box (ZO-9) in front of the name and assignee labels (ZO-5)', () => {
    expect(drawOrderOf('ZO-9')).toBeGreaterThan(drawOrderOf('ZO-5'))
  })

  it('T-023d names GR-10 the name label, GR-11 the assignee label and GR-14 the comment box', () => {
    expect(GRAB_PLACE_OF('GR-10')).toContain('名称ラベル')
    expect(GRAB_PLACE_OF('GR-11')).toContain('担当ラベル')
    expect(GRAB_PLACE_OF('GR-14')).toContain('コメントボックス')
  })
})

describe('CR-824 controls -- the labels answer the double click where no comment box lies', () => {
  it('MK-13: a double click on the name label, with no comment box over it, answers the task on GR-10', () => {
    const geometry = geometryOf({ bodyOffsetPx: null })
    const at = centerOf(labelOf(geometry, NAMED_UID, 'label'))
    expect(hitOf(geometry, at, 'doubleClick')).toMatchObject({ item: { kind: 'task', taskUid: NAMED_UID }, grab: 'GR-10' })
  })

  it('MK-13: a double click on the assignee label, with no comment box over it, answers the task on GR-11', () => {
    const geometry = geometryOf({ bodyOffsetPx: null })
    const at = centerOf(labelOf(geometry, ASSIGNED_UID, 'assigneeLabel'))
    expect(hitOf(geometry, at, 'doubleClick')).toMatchObject({ item: { kind: 'task', taskUid: ASSIGNED_UID }, grab: 'GR-11' })
  })
})

describe(`MK-13 (CR-824) -- ${MK_13_COMMENT_OVER_LABEL}`, () => {
  it('a double click where the comment box body lies over the name label answers the comment box (GR-14), not GR-10', () => {
    const at = labelPoint('label', NAMED_UID)
    const geometry = geometryWithBodyOver(at)
    expect(inside(at, bodyOf(geometry)), 'premise: the point is inside the comment box body').toBe(true)
    expect(inside(at, labelOf(geometry, NAMED_UID, 'label')), 'premise: the point is inside the name label').toBe(true)
    expect(hitOf(geometry, at, 'doubleClick')).toMatchObject({ item: { kind: 'commentBox', id: COMMENT_ID }, grab: 'GR-14' })
  })

  it('a double click where the comment box body lies over the assignee label answers the comment box (GR-14), not GR-11', () => {
    const at = labelPoint('assigneeLabel', ASSIGNED_UID)
    const geometry = geometryWithBodyOver(at)
    expect(inside(at, bodyOf(geometry)), 'premise: the point is inside the comment box body').toBe(true)
    expect(inside(at, labelOf(geometry, ASSIGNED_UID, 'assigneeLabel')), 'premise: the point is inside the assignee label').toBe(true)
    expect(hitOf(geometry, at, 'doubleClick')).toMatchObject({ item: { kind: 'commentBox', id: COMMENT_ID }, grab: 'GR-14' })
  })
})

describe('T-023d closing paragraph (CR-824 control) -- GR-10 / GR-11 never answer a plain press', () => {
  it('a plain press where the comment box body lies over the name label answers the comment box too', () => {
    const at = labelPoint('label', NAMED_UID)
    const geometry = geometryWithBodyOver(at)
    expect(inside(at, bodyOf(geometry)), 'premise: the point is inside the comment box body').toBe(true)
    expect(hitOf(geometry, at, 'press')).toMatchObject({ item: { kind: 'commentBox', id: COMMENT_ID }, grab: 'GR-14' })
  })

  it('a plain press where the comment box body lies over the assignee label answers the comment box too', () => {
    const at = labelPoint('assigneeLabel', ASSIGNED_UID)
    const geometry = geometryWithBodyOver(at)
    expect(inside(at, bodyOf(geometry)), 'premise: the point is inside the comment box body').toBe(true)
    expect(hitOf(geometry, at, 'press')).toMatchObject({ item: { kind: 'commentBox', id: COMMENT_ID }, grab: 'GR-14' })
  })
})

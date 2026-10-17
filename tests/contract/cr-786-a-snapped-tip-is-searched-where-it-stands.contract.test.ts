// CR-786 spec-only tests: SQ-9 and SJ-6 read the date where a snapped tip stands now, not the copy taken at snap time (FR-019).

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import { commentBoxShownDateOf, searchRowsOf, type CommentBox } from '../../src/entity/document-model/schedule/schedule'
import { searchJumpWrites } from '../../src/use-case/edit-document/edit-document'
import {
  COMMENT_ID,
  HIGHLIGHT_ID,
  MILESTONE_UID,
  SECOND_BAR_UID,
  SNAP_ORDER,
  april,
  commentRow,
  documentWith,
  groupOf,
  highlightRow,
  taskOfDocument,
} from './cr-777-stage'
import { FR_019_SHOWN_DATE, REQUIREMENTS, accepted, run } from './cr-786-stage'
import { specTable, unbroken } from './spec-table'

type SnapPoint = (typeof SNAP_ORDER)[number]

// WHY: the stored free point is a copy taken long before the target moved: a reading of it shows here.
const STALE = april(28, '00:00:00')
const MINUTE_TEXT = 16
const MS_PER_MINUTE = 60_000
const ALL_ROWS = ''

const SQ_9_CELL = '線先が立つ日時（`FR-019`） —— 吸着していれば吸着先のその点の日時、そうでなければ `CommentBox.anchorDate`（`AT-113`）'
const SJ_6_CELL = 'コメントボックスは `SQ-9` と同じ線先が立つ日時'

// see LF-15
const LEFT_POINTS: readonly SnapPoint[] = ['topLeftCorner', 'leftMiddle', 'bottomLeftCorner']
const MIDDLE_POINTS: readonly SnapPoint[] = ['topMiddle', 'bottomMiddle']
const RIGHT_POINTS: readonly SnapPoint[] = ['topRightCorner', 'rightMiddle', 'bottomRightCorner']

// see FR-019, AT-118
// WHY: the box is drawn from the start day's column to the right edge of the finish day's column.
const BOX_START = april(8, '00:00:00')
const BOX_FINISH = april(11, '23:59:00')
const BOX_LEFT = '2026-04-08T00:00'
const BOX_RIGHT = '2026-04-12T00:00'
const BOX_MIDDLE = '2026-04-10T00:00'

const minuteOf = (text: string | null | undefined): string | null => (text === null || text === undefined ? null : text.slice(0, MINUTE_TEXT))
const minutesOf = (text: string): number => Date.parse(`${text.slice(0, MINUTE_TEXT)}:00Z`) / MS_PER_MINUTE
const midpointOf = (left: string, right: string): number => (minutesOf(left) + minutesOf(right)) / 2

const toTask = (uid: number, figure: string, point: SnapPoint): Record<string, unknown> => ({
  anchorTaskGroupId: groupOf(uid),
  anchorTaskUid: uid,
  anchorTaskFigure: figure,
  anchorSnapPoint: point,
})
const toBox = (point: SnapPoint): Record<string, unknown> => ({
  anchorTaskGroupId: groupOf(MILESTONE_UID),
  anchorHighlightBoxId: HIGHLIGHT_ID,
  anchorSnapPoint: point,
})

const withTip = (tip: Record<string, unknown>): Document =>
  documentWith([commentRow({ anchorDate: STALE, ...tip })], [highlightRow({ start: BOX_START, finish: BOX_FINISH })])

const boxOf = (document: Document): CommentBox => {
  const found = document.schedule.commentBoxes.find((one) => one.id === COMMENT_ID)
  if (found === undefined) throw new Error('premise: the comment box is in the document')
  return found
}

const searchedDate = (document: Document): string | null => {
  const row = searchRowsOf(document.schedule, ALL_ROWS).commentBoxRows.find((one) => one.commentBoxId === COMMENT_ID)
  if (row === undefined) throw new Error('premise: the comment box has a search row')
  return minuteOf(row.anchorDate)
}

const shownDate = (document: Document): string | null => minuteOf(commentBoxShownDateOf(document.schedule, boxOf(document)))

// WHY: FR-019 says the shown date is found the way the delete command writes the freed point; this is that write.
const freedDate = (document: Document, deletion: Record<string, unknown>): string | null =>
  minuteOf(boxOf(accepted(run(document, deletion))).anchorDate)

const cellOf = (table: string, id: string): string =>
  unbroken((specTable(table).rows.find((one) => one.id === id)?.cells ?? []).join(' '))

describe('CR-786 premise -- FR-019, SQ-9 and SJ-6 hold the clauses these cases quote', () => {
  it('FR-019, T-331 SQ-9 and T-332 SJ-6', () => {
    expect(REQUIREMENTS).toContain(FR_019_SHOWN_DATE)
    expect(cellOf('T-331', 'SQ-9')).toContain(SQ_9_CELL)
    expect(cellOf('T-332', 'SJ-6')).toContain(SJ_6_CELL)
  })
})

describe(`SQ-9 -- a tip not snapped reads its own anchorDate (AT-113)`, () => {
  it('a free tip: the search row and commentBoxShownDateOf read the stored date', () => {
    const document = withTip({})
    expect(searchedDate(document)).toBe(minuteOf(STALE))
    expect(shownDate(document)).toBe(minuteOf(STALE))
  })

  it('a free tip with no date reads null', () => {
    const document = withTip({ anchorDate: null })
    expect(searchedDate(document)).toBeNull()
    expect(shownDate(document)).toBeNull()
  })
})

describe(`SQ-9 -- ${FR_019_SHOWN_DATE}`, () => {
  it.each(SNAP_ORDER)('planned bar %s: the search row reads the date the delete command would write', (point) => {
    const document = withTip(toTask(SECOND_BAR_UID, 'plannedBar', point))
    const expected = freedDate(document, { kind: 'deleteTask', taskUid: SECOND_BAR_UID })
    expect(searchedDate(document)).toBe(expected)
    expect(shownDate(document)).toBe(expected)
  })

  it.each(SNAP_ORDER)('milestone %s: the search row reads the date the delete command would write', (point) => {
    const document = withTip(toTask(MILESTONE_UID, 'milestone', point))
    expect(searchedDate(document)).toBe(freedDate(document, { kind: 'deleteTask', taskUid: MILESTONE_UID }))
  })

  it.each(SNAP_ORDER)('highlight box %s: the search row reads the date the delete command would write', (point) => {
    const document = withTip(toBox(point))
    expect(searchedDate(document)).toBe(freedDate(document, { kind: 'deleteHighlightBox', highlightBoxId: HIGHLIGHT_ID }))
  })

  it.each(LEFT_POINTS)('planned bar %s reads the planned start, not the stale stored copy', (point) => {
    const document = withTip(toTask(SECOND_BAR_UID, 'plannedBar', point))
    expect(searchedDate(document)).toBe(minuteOf(taskOfDocument(document, SECOND_BAR_UID).start))
  })

  it('planned bar: the right points read one date, later than the left; the middle points read their midpoint', () => {
    const left = searchedDate(withTip(toTask(SECOND_BAR_UID, 'plannedBar', 'leftMiddle'))) as string
    const rights = RIGHT_POINTS.map((point) => searchedDate(withTip(toTask(SECOND_BAR_UID, 'plannedBar', point))))
    const right = rights[0] as string
    expect(new Set(rights).size).toBe(1)
    expect(minutesOf(right)).toBeGreaterThan(minutesOf(left))
    for (const point of MIDDLE_POINTS) {
      expect(minutesOf(searchedDate(withTip(toTask(SECOND_BAR_UID, 'plannedBar', point))) as string)).toBe(midpointOf(left, right))
    }
  })

  it.each([
    ...LEFT_POINTS.map((point) => [point, BOX_LEFT] as const),
    ...MIDDLE_POINTS.map((point) => [point, BOX_MIDDLE] as const),
    ...RIGHT_POINTS.map((point) => [point, BOX_RIGHT] as const),
  ])('highlight box %s reads %s (the right edge is 0:00 of the day after the finish day)', (point, expected) => {
    expect(searchedDate(withTip(toBox(point)))).toBe(expected)
  })
})

// WHY: the target moves by a whole week, so every point moves by that much while the stored copy stays.
const SHIFT_DAYS = 7
const MINUTES_PER_DAY = 24 * 60
// WHY: the planned days of SECOND_BAR_UID in the cr-777 stage.
const SECOND_BAR_START_DAY = 16
const SECOND_BAR_FINISH_DAY = 20
const MOVED_START = april(SECOND_BAR_START_DAY + SHIFT_DAYS, '00:00:00')
const MOVED_FINISH = april(SECOND_BAR_FINISH_DAY + SHIFT_DAYS, '17:00:00')
const MOVED_BOX_START = april(1, '00:00:00')
const MOVED_BOX_FINISH = april(2, '23:59:00')
const MOVED_BOX_RIGHT = '2026-04-03T00:00'

describe(`SQ-9 after the target moved -- ${FR_019_SHOWN_DATE}`, () => {
  const movedTask = (point: SnapPoint): Document =>
    accepted(run(withTip(toTask(SECOND_BAR_UID, 'plannedBar', point)), {
      kind: 'setTaskPlanDates',
      taskUid: SECOND_BAR_UID,
      start: MOVED_START,
      finish: MOVED_FINISH,
    }))

  it('the move leaves the stored copy alone (premise: the tip follows by reading, not by writing)', () => {
    expect(boxOf(movedTask('topLeftCorner')).anchorDate).toBe(STALE)
  })

  it.each(LEFT_POINTS)('planned bar %s reads the moved start', (point) => {
    const moved = movedTask(point)
    expect(searchedDate(moved)).toBe(minuteOf(taskOfDocument(moved, SECOND_BAR_UID).start))
  })

  it.each(SNAP_ORDER)('planned bar %s moves by the same days as the task', (point) => {
    const before = searchedDate(withTip(toTask(SECOND_BAR_UID, 'plannedBar', point))) as string
    const after = searchedDate(movedTask(point)) as string
    expect(minutesOf(after) - minutesOf(before)).toBe(SHIFT_DAYS * MINUTES_PER_DAY)
  })

  it('a highlight box right point reads 0:00 of the day after its new finish day', () => {
    const moved = accepted(run(withTip(toBox('rightMiddle')), {
      kind: 'setHighlightBoxRange',
      highlightBoxId: HIGHLIGHT_ID,
      range: { start: MOVED_BOX_START, finish: MOVED_BOX_FINISH, topTaskGroupId: groupOf(MILESTONE_UID), bottomTaskGroupId: groupOf(MILESTONE_UID) },
    }))
    expect(searchedDate(moved)).toBe(MOVED_BOX_RIGHT)
  })
})

// see SJ-6
// WHY: the reach of the cr-571 jump cases: ten pixels a day, nothing left of the date, no picture read.
type SearchJumpReach = Parameters<typeof searchJumpWrites>[3]
const NO_REACH: SearchJumpReach = { pxPerDay: 10, leftReachPx: 0, drawnTaskGroups: [], areaWidth: 800, landing: null }
const TO_BOX = { kind: 'commentBox', commentBoxId: COMMENT_ID } as const

const sideways = (document: Document): unknown => {
  const write = searchJumpWrites(document, TO_BOX, true, NO_REACH).scrollWrite as unknown as Record<string, unknown> | null
  return write === null ? null : { scrollDate: write['scrollDate'], scrollDateFraction: write['scrollDateFraction'] }
}

const freeAt = (date: string | null): Document => withTip({ anchorTaskGroupId: groupOf(SECOND_BAR_UID), anchorDate: date })

describe(`SJ-6 -- ${SJ_6_CELL}`, () => {
  it('premise: a free tip at the stale date and one at the shown date jump to different places', () => {
    const snapped = withTip(toTask(SECOND_BAR_UID, 'plannedBar', 'leftMiddle'))
    expect(sideways(freeAt(STALE))).not.toEqual(sideways(freeAt(`${shownDate(snapped)}:00`)))
  })

  it.each(SNAP_ORDER)('a tip snapped to the planned bar at %s jumps where a free tip at its shown date jumps', (point) => {
    const snapped = withTip(toTask(SECOND_BAR_UID, 'plannedBar', point))
    expect(sideways(snapped)).toEqual(sideways(freeAt(`${searchedDate(snapped)}:00`)))
  })

  it.each(SNAP_ORDER)('a tip snapped to the highlight box at %s jumps where a free tip at its shown date jumps', (point) => {
    const snapped = withTip(toBox(point))
    expect(sideways(snapped)).toEqual(sideways(freeAt(`${searchedDate(snapped)}:00`)))
  })

  it('after the task moved, the jump follows the moved bar', () => {
    const snapped = accepted(run(withTip(toTask(SECOND_BAR_UID, 'plannedBar', 'topLeftCorner')), {
      kind: 'setTaskPlanDates',
      taskUid: SECOND_BAR_UID,
      start: MOVED_START,
      finish: MOVED_FINISH,
    }))
    expect(sideways(snapped)).toEqual(sideways(freeAt(`${minuteOf(taskOfDocument(snapped, SECOND_BAR_UID).start)}:00`)))
  })
})

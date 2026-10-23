// DFC-2968 spec-only cases: for a snapped comment box, the search column SQ-9 (T-331) and the jump SJ-6 (T-332) read the date-time where the tip stands now (FR-019), so moving the target task or highlight box changes what they show.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import { searchRowsOf } from '../../src/entity/document-model/schedule/schedule'
import { searchJumpWrites } from '../../src/use-case/edit-document/edit-document'
import { restoreAnimationFrames } from '../unit/cr-646-stage'
import {
  COMMENT_ID,
  HIGHLIGHT_ID,
  MILESTONE_UID,
  SECOND_BAR_UID,
  april,
  commentRow,
  documentWith,
  groupOf,
  highlightRow,
  stage,
  tipOf,
} from './cr-777-stage'
import { accepted, run } from './cr-786-stage'
import { specTable, unbroken } from './spec-table'

afterEach(restoreAnimationFrames)

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see FR-019
const FR_019_SHOWN_DATE =
  '線先が立つ日時は、吸着していれば吸着先のその点の日時（対象を消したときに ① へ書く日時と同じ求め方）、そうでなければ ① の日時（`AT-113`）とする —— 検索の表の `SQ-9` と飛び先（表 T-332 の `SJ-6`）もこれを読む。'
const FR_019_FOLLOWS = '② の線先は、描くたびに対象の図形から点を求めること（MUST） —— 対象を動かす命令は注記を書かず'
// see T-331, SQ-9
const SQ_9_SOURCE = '線先が立つ日時（`FR-019`） —— 吸着していれば吸着先のその点の日時、そうでなければ `CommentBox.anchorDate`（`AT-113`）'
// see T-332, SJ-6
const SJ_6_DATE = 'コメントボックスは `SQ-9` と同じ線先が立つ日時'

const cellsOf = (table: string, id: string): string =>
  unbroken((specTable(table).rows.find((one) => one.id === id)?.cells ?? []).join(' '))

// WHY: the copy stored at snap time lies a fortnight away from every target, so reading it is told apart at once.
const STALE = april(2, '06:00:00')
const MS_PER_MINUTE = 60_000
const MINUTES_PER_DAY = 24 * 60
const SHIFT_DAYS = 7
// WHY: two free boxes on known dates give the screen's minute-per-pixel map without assuming how the axis is built.
const REF_A = '78600000-0000-4000-8000-0000000000f1'
const REF_B = '78600000-0000-4000-8000-0000000000f2'
const REF_A_DATE = april(3, '00:00:00')
const REF_B_DATE = april(27, '00:00:00')

const minutesOf = (text: string): number => Date.parse(`${text.slice(0, 16)}:00Z`) / MS_PER_MINUTE

const snapped = (tip: Record<string, unknown>, highlight: Record<string, unknown> = {}): Document =>
  documentWith(
    [
      commentRow({ anchorDate: STALE, ...tip }),
      commentRow({ id: REF_A, anchorDate: REF_A_DATE, anchorTaskGroupId: groupOf(SECOND_BAR_UID) }),
      commentRow({ id: REF_B, anchorDate: REF_B_DATE, anchorTaskGroupId: groupOf(SECOND_BAR_UID) }),
    ],
    [highlightRow(highlight)],
  )

const toBar = (point: string): Record<string, unknown> => ({
  anchorTaskGroupId: groupOf(SECOND_BAR_UID),
  anchorTaskUid: SECOND_BAR_UID,
  anchorTaskFigure: 'plannedBar',
  anchorSnapPoint: point,
})
const toMilestone = (point: string): Record<string, unknown> => ({
  anchorTaskGroupId: groupOf(MILESTONE_UID),
  anchorTaskUid: MILESTONE_UID,
  anchorTaskFigure: 'milestone',
  anchorSnapPoint: point,
})
const toHighlight = (point: string): Record<string, unknown> => ({
  anchorTaskGroupId: groupOf(MILESTONE_UID),
  anchorHighlightBoxId: HIGHLIGHT_ID,
  anchorSnapPoint: point,
})

const searched = (document: Document): string => {
  const row = searchRowsOf(document.schedule, '').commentBoxRows.find((one) => one.commentBoxId === COMMENT_ID)
  if (row === undefined) throw new Error('premise: the comment box has a search row')
  if (row.anchorDate === null || row.anchorDate === undefined) throw new Error('premise: the search row has a date')
  return row.anchorDate
}

// WHY: the minute under the drawn tip, read off the two reference tips; one pixel is the tolerance.
const drawnMinutesOf = (document: Document): { minutes: number; minutesPerPx: number } => {
  const { loop } = stage(document)
  const a = tipOf(loop, REF_A).x
  const b = tipOf(loop, REF_B).x
  const minutesPerPx = (minutesOf(REF_B_DATE) - minutesOf(REF_A_DATE)) / (b - a)
  return { minutes: minutesOf(REF_A_DATE) + (tipOf(loop, COMMENT_ID).x - a) * minutesPerPx, minutesPerPx }
}

const expectSearchedWhereDrawn = (document: Document): void => {
  const drawn = drawnMinutesOf(document)
  const gap = Math.abs(minutesOf(searched(document)) - drawn.minutes)
  expect(gap, `searched ${searched(document)}, drawn ${drawn.minutes} min (1 px = ${drawn.minutesPerPx} min)`).toBeLessThanOrEqual(
    drawn.minutesPerPx,
  )
}

// WHY: FR-019 defines the snapped date as the one the delete command writes back to the free point (CM-7, CM-53).
const freedOf = (document: Document, deletion: Record<string, unknown>): string => {
  const box = accepted(run(document, deletion)).schedule.commentBoxes.find((one) => one.id === COMMENT_ID)
  if (box?.anchorDate === null || box?.anchorDate === undefined) throw new Error('premise: the delete wrote a free date')
  return box.anchorDate
}
const DELETE_BAR = { kind: 'deleteTask', taskUid: SECOND_BAR_UID }
const DELETE_MILESTONE = { kind: 'deleteTask', taskUid: MILESTONE_UID }
const DELETE_HIGHLIGHT = { kind: 'deleteHighlightBox', highlightBoxId: HIGHLIGHT_ID }

const tipXOf = (document: Document): number => tipOf(stage(document).loop, COMMENT_ID).x

const movedBar = (document: Document): Document =>
  accepted(
    run(document, {
      kind: 'setTaskPlanDates',
      taskUid: SECOND_BAR_UID,
      start: april(16 + SHIFT_DAYS, '00:00:00'),
      finish: april(20 + SHIFT_DAYS, '17:00:00'),
    }),
  )

// see SJ-6
type Reach = Parameters<typeof searchJumpWrites>[3]
const REACH: Reach = { pxPerDay: 20, leftReachPx: 0, drawnTaskGroups: [], areaWidth: 900, landing: null }
const jumpOf = (document: Document): unknown => {
  const write = searchJumpWrites(document, { kind: 'commentBox', commentBoxId: COMMENT_ID }, true, REACH).scrollWrite as unknown as Record<
    string,
    unknown
  > | null
  return write === null ? null : { scrollDate: write['scrollDate'], scrollDateFraction: write['scrollDateFraction'] }
}
const freeAt = (date: string): Document => snapped({ anchorDate: date, anchorTaskGroupId: groupOf(SECOND_BAR_UID) })

describe('DFC-2968 premise -- the spec still says what these cases check', () => {
  it('FR-019 names the shown date and says SQ-9 and SJ-6 read it', () => {
    expect(REQUIREMENTS).toContain(FR_019_SHOWN_DATE)
    expect(REQUIREMENTS).toContain(FR_019_FOLLOWS)
  })

  it('T-331 SQ-9 reads the date where the tip stands', () => {
    expect(cellsOf('T-331', 'SQ-9')).toContain(SQ_9_SOURCE)
  })

  it('T-332 SJ-6 reads the SQ-9 date for a comment box', () => {
    expect(cellsOf('T-332', 'SJ-6')).toContain(SJ_6_DATE)
  })
})

describe(`SQ-9 (T-331): ${SQ_9_SOURCE}`, () => {
  it('control: a free tip is searched at its stored date and is drawn there', () => {
    const document = freeAt(april(22, '12:00:00'))
    expect(minutesOf(searched(document))).toBe(minutesOf(april(22, '12:00:00')))
    expectSearchedWhereDrawn(document)
  })

  it.each([
    ['planned bar', 'topLeftCorner', toBar, DELETE_BAR],
    ['planned bar', 'rightMiddle', toBar, DELETE_BAR],
    ['planned bar', 'bottomMiddle', toBar, DELETE_BAR],
    ['milestone', 'topMiddle', toMilestone, DELETE_MILESTONE],
    ['milestone', 'leftMiddle', toMilestone, DELETE_MILESTONE],
    ['highlight box', 'topLeftCorner', toHighlight, DELETE_HIGHLIGHT],
    ['highlight box', 'rightMiddle', toHighlight, DELETE_HIGHLIGHT],
  ] as const)('a tip snapped to the %s at %s is searched at the date the delete would free it to, not at the stored copy', (_target, point, to, deletion) => {
    const document = snapped(to(point))
    expect(minutesOf(searched(document))).not.toBe(minutesOf(STALE))
    expect(minutesOf(searched(document))).toBe(minutesOf(freedOf(document, deletion)))
  })

  // WHY: points standing on 0:00 of a day sit on a column edge, so the drawn pixel names the same minute (a time of day is not drawn at this zoom).
  it.each([
    ['planned bar', 'topLeftCorner', toBar],
    ['highlight box', 'topLeftCorner', toHighlight],
    ['highlight box', 'rightMiddle', toHighlight],
  ] as const)('a tip snapped to the %s at %s is searched where it is drawn', (_target, point, to) => {
    expectSearchedWhereDrawn(snapped(to(point)))
  })
})

describe(`SQ-9 after the target moved -- ${FR_019_FOLLOWS}`, () => {
  it.each(['topLeftCorner', 'rightMiddle'])('moving the snapped task a week moves the searched date by that week (%s)', (point) => {
    const before = snapped(toBar(point))
    const after = movedBar(before)
    const box = after.schedule.commentBoxes.find((one) => one.id === COMMENT_ID)
    expect(box?.anchorDate, 'premise: the move does not rewrite the stored copy').toBe(STALE)
    expect(minutesOf(searched(after)) - minutesOf(searched(before))).toBe(SHIFT_DAYS * MINUTES_PER_DAY)
    expect(minutesOf(searched(after))).toBe(minutesOf(freedOf(after, DELETE_BAR)))
    const pxPerMinute = 1 / drawnMinutesOf(before).minutesPerPx
    expect(tipXOf(after) - tipXOf(before), 'premise: the drawn tip followed the task by a week').toBeCloseTo(
      SHIFT_DAYS * MINUTES_PER_DAY * pxPerMinute,
      1,
    )
  })

  it('moving the snapped highlight box moves the searched date to its new right edge', () => {
    const before = snapped(toHighlight('rightMiddle'))
    const after = accepted(
      run(before, {
        kind: 'setHighlightBoxRange',
        highlightBoxId: HIGHLIGHT_ID,
        range: {
          start: april(18, '00:00:00'),
          finish: april(21, '23:59:00'),
          topTaskGroupId: groupOf(MILESTONE_UID),
          bottomTaskGroupId: groupOf(SECOND_BAR_UID),
        },
      }),
    )
    expect(minutesOf(searched(after))).not.toBe(minutesOf(searched(before)))
    expect(minutesOf(searched(after))).toBe(minutesOf(freedOf(after, DELETE_HIGHLIGHT)))
    expectSearchedWhereDrawn(after)
  })
})

describe(`SJ-6 (T-332): ${SJ_6_DATE}`, () => {
  it('premise: a jump to the stored copy and one to the drawn date land in different places', () => {
    const document = snapped(toBar('rightMiddle'))
    expect(jumpOf(freeAt(STALE))).not.toEqual(jumpOf(freeAt(searched(document))))
  })

  it.each(['topLeftCorner', 'rightMiddle'])('a tip snapped to the planned bar at %s jumps where a free tip at its drawn date jumps', (point) => {
    const document = snapped(toBar(point))
    expect(jumpOf(document)).toEqual(jumpOf(freeAt(searched(document))))
  })

  it('a tip snapped to the highlight box jumps where a free tip at its drawn date jumps', () => {
    const document = snapped(toHighlight('rightMiddle'))
    expect(jumpOf(document)).toEqual(jumpOf(freeAt(searched(document))))
  })

  it('after the snapped task moved a week, the jump lands elsewhere, where a free tip at the new date lands', () => {
    const before = snapped(toBar('topLeftCorner'))
    const after = movedBar(before)
    expect(jumpOf(after)).not.toEqual(jumpOf(before))
    expect(jumpOf(after)).toEqual(jumpOf(freeAt(searched(after))))
  })
})

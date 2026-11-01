// CR-757 spec-only cases: CM-99 writes WH-4 to WH-8 in one step, WH-9 writes nothing, WH-10 refuses with IV-14, and one undo brings it back (UN-13).

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  MILESTONE_M,
  NEW_START,
  REQUIREMENTS,
  TASK_A,
  TASK_B,
  TASK_C,
  WORKED,
  documentOf,
  heldOf,
  planned,
  redone,
  shiftTo,
  stepsOf,
  taskIn,
  undone,
  whRow,
  written,
  type Loose,
} from './cr-757-stage'
import { specTable, unbroken } from './spec-table'

const FR_159_ONE_WRITE = '移した結果はまとめて 1 度に書き、取り消しを 1 度押せば全部の日付が元へ戻ること（MUST）'
const FR_159_NOT_THE_CALENDAR = '⛔ 暦（曜日の稼働・時間帯・例外日）を動かしてはならない（MUST NOT）'
const UN_13_NAMES_IT = '全体日程シフト（`FR-159`、1 回の実行を 1 段）'
const WH_6_TIME_KEPT = '日の部分だけを替え、時刻は保つ'
const WH_6_TEXT_FORM = '時刻の無い字は時刻の無いまま、秒の有無も変えない'
const WH_6_MIDNIGHT = '終了の側の `00:00`（前の日の終わり —— `FR-054`）は、その前の日を移し、移した日の翌日の `00:00` と書く'
const WH_7_NOT_EXCEPTIONS = '⛔ ただし `Exception.fromDate`・`toDate`（暦）を除く'
const WH_8_KEPT = '暦（`Calendar`・`WeekDay`・`Exception`・時間帯）、`Project.creationDate`（`WT-9`）、量（`Dependency.linkLag`・フェードの日数・進捗）'
const WH_9_NOTHING = '何も書かず、取り消しの段も残さない'
const WH_10_IV_14 = '何も書かずに `05-07-design.md` の 表 T-220 の `IV-14` を運ぶ'
const CM_99_NAME = 'shiftScheduleToStartDate'

describe('FR-159 / T-379 / UN-13 / CM-99 -- the manuscript still says what these cases press', () => {
  it.each([FR_159_ONE_WRITE, FR_159_NOT_THE_CALENDAR, UN_13_NAMES_IT])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it.each([
    ['WH-6', WH_6_TIME_KEPT],
    ['WH-6', WH_6_TEXT_FORM],
    ['WH-6', WH_6_MIDNIGHT],
    ['WH-7', WH_7_NOT_EXCEPTIONS],
    ['WH-8', WH_8_KEPT],
    ['WH-9', WH_9_NOTHING],
    ['WH-10', WH_10_IV_14],
  ])('%s: %s', (row, clause) => {
    expect(whRow(row)).toContain(clause)
  })

  it(`CM-99 is the command ${CM_99_NAME} of group Project, carrying newStartDate`, () => {
    const row = specTable('T-108').rows.find((one) => one.id === 'CM-99')
    expect(row, 'table T-108 holds CM-99').toBeDefined()
    expect(unbroken(row?.cells.join(' | ') ?? '')).toContain(CM_99_NAME)
    expect(unbroken(row?.cells.join(' | ') ?? '')).toContain('`newStartDate`')
  })
})

const SHIFTED = (): { readonly before: Document; readonly after: Document; readonly steps: number } => {
  const before = WORKED()
  const held = written(heldOf(before), [shiftTo(NEW_START)])
  return { before, after: held.document, steps: stepsOf(held) }
}

const projectOf = (document: Document): Loose => document.schedule.project as unknown as Loose
const settingsOf = (document: Document): Loose => document.documentSettings as unknown as Loose
const oneOf = (rows: unknown, what: string): Loose => {
  const list = rows as readonly Loose[]
  if (list.length !== 1) throw new Error(`expected one ${what}, got ${String(list.length)}`)
  return list[0] as Loose
}

describe('WH-4 / WH-5 / WH-7 -- every column WH-7 names moves by the worked example', () => {
  const { after } = SHIFTED()

  it.each([
    [TASK_A, 'start', '2029-03-05T08:00:00'],
    [TASK_A, 'finish', '2029-03-08T17:00:00'],
    [TASK_A, 'actualStart', '2029-03-05T08:00:00'],
    [TASK_A, 'stop', '2029-03-06T17:00:00'],
    [TASK_A, 'resume', '2029-03-07T08:00:00'],
    [TASK_A, 'actualFinish', '2029-03-08T17:00:00'],
    [MILESTONE_M, 'start', '2029-03-15T17:00:00'],
    [MILESTONE_M, 'finish', '2029-03-15T17:00:00'],
    [TASK_B, 'start', '2029-04-02T08:00:00'],
    [TASK_B, 'finish', '2029-04-03T17:00:00'],
    [TASK_B, 'deadline', '2029-04-06T17:00:00'],
  ])('Task %s %s -> %s', (uid, column, expected) => {
    expect(taskIn(after, uid)[column]).toBe(expected)
  })

  it('Project.startDate (rank -1) and statusDate (rank 4)', () => {
    expect(projectOf(after)['startDate']).toBe('2029-03-02T08:00:00')
    expect(projectOf(after)['statusDate']).toBe('2029-03-09T17:00:00')
  })

  it('the BaselineTask start and finish', () => {
    const baseline = oneOf(after.schedule.baselineTasks, 'baseline task')
    expect([baseline['start'], baseline['finish']]).toEqual(['2029-03-06T08:00:00', '2029-03-12T17:00:00'])
  })

  it(`the weekend highlight box becomes the one Friday 2029-03-30 (WH-5: a whole-day range over non-working days only)`, () => {
    const box = oneOf(after.schedule.highlightBoxes, 'highlight box')
    expect([box['start'], box['finish']]).toEqual(['2029-03-30T00:00:00', '2029-03-30T23:59:00'])
  })

  it('CommentBox.anchorDate (rank -2)', () => {
    expect(oneOf(after.schedule.commentBoxes, 'comment box')['anchorDate']).toBe('2029-03-01T00:00:00')
  })

  it('the settings S-518 fitSpanStart, S-519 fitSpanFinish and S-77 scrollDate', () => {
    const settings = settingsOf(after)
    expect([settings['fitSpanStart'], settings['fitSpanFinish'], settings['scrollDate']]).toEqual([
      '2029-03-05T00:00:00',
      '2029-04-03T23:59:00',
      '2029-03-09T00:00:00',
    ])
  })
})

describe('WH-6 -- only the day part changes', () => {
  it(`${WH_6_TEXT_FORM} -- a start without a time stays without one`, () => {
    expect(taskIn(SHIFTED().after, TASK_C)['start']).toBe('2029-03-06')
  })

  it(`${WH_6_MIDNIGHT} -- 2028-04-08T00:00 ends Friday 2028-04-07 (rank 3), so it is written 2029-03-09T00:00`, () => {
    expect(taskIn(SHIFTED().after, TASK_C)['finish']).toBe('2029-03-09T00:00:00')
  })

  it(`${WH_6_TEXT_FORM} -- a time without seconds stays without them, and written seconds are kept`, () => {
    const before = documentOf({
      tasks: [
        { uid: 1, start: '2028-04-04T08:00:00', finish: '2028-04-04T17:00:00' },
        { uid: 2, start: '2028-04-05T09:30', finish: '2028-04-05T16:45:30' },
      ],
    })
    const after = written(heldOf(before), [shiftTo('2028-04-11')]).document
    expect([taskIn(after, 2)['start'], taskIn(after, 2)['finish']]).toEqual(['2028-04-12T09:30', '2028-04-12T16:45:30'])
  })
})

describe(`WH-8 / FR-159 -- ${FR_159_NOT_THE_CALENDAR}`, () => {
  const { before, after } = SHIFTED()

  it(`${WH_7_NOT_EXCEPTIONS} -- the calendars come out exactly as they went in`, () => {
    expect(after.schedule.calendars).toEqual(before.schedule.calendars)
  })

  it('Project.creationDate is not moved', () => {
    expect(projectOf(after)['creationDate']).toBe(projectOf(before)['creationDate'])
  })

  it('the amounts stay: Dependency.linkLag, the fade days and the progress', () => {
    const was = taskIn(before, TASK_B)
    const now = taskIn(after, TASK_B)
    expect(now['dependencies']).toEqual(was['dependencies'])
    expect([now['fadeInDays'], now['fadeOutDays']]).toEqual([2, 3])
    expect(now['percentComplete']).toBe(was['percentComplete'])
    expect(taskIn(after, TASK_A)['percentComplete'], 'premise: Task A holds progress').toBe(100)
  })

  it('names, rows and the number of everything stay; only dates differ', () => {
    expect(after.schedule.tasks.map((one) => one.name)).toEqual(before.schedule.tasks.map((one) => one.name))
    expect(after.schedule.taskGroups).toEqual(before.schedule.taskGroups)
    expect(after.schedule.taskGroupMembers).toEqual(before.schedule.taskGroupMembers)
  })
})

describe(`UN-13 -- ${FR_159_ONE_WRITE}`, () => {
  it('one run is one step of the history', () => {
    expect(SHIFTED().steps).toBe(1)
  })

  it('one undo gives back every date of the schedule and the settings; one redo moves them again', () => {
    const before = WORKED()
    const moved = written(heldOf(before), [shiftTo(NEW_START)])
    const back = undone(moved)
    expect(back.document.schedule).toEqual(before.schedule)
    expect(back.document.documentSettings).toEqual(before.documentSettings)
    const again = redone(back)
    expect(again.document.schedule).toEqual(moved.document.schedule)
    expect(again.document.documentSettings).toEqual(moved.document.documentSettings)
  })
})

// WHY: WH-9 says nothing is written and no step is left; a write path may land an empty change or turn it away as CM-99's own.
function expectNothingWritten(before: Document, plan: ReturnType<typeof planned>): void {
  if (!plan.ok) {
    expect(JSON.stringify((plan as unknown as Loose)['refusal']), 'a refusal is CM-99 turning the empty shift away').toContain('CM-99')
    return
  }
  expect(plan.history.done, 'no undo step is left').toHaveLength(0)
  expect(plan.document.schedule).toEqual(before.schedule)
  expect(plan.document.documentSettings).toEqual(before.documentSettings)
}

describe(`WH-9 -- the same rank-0 day: ${WH_9_NOTHING}`, () => {
  it.each([
    ['the current start itself', '2028-04-04'],
  ])('%s (%s): no document change and no step', (_what, typed) => {
    const before = WORKED()
    expectNothingWritten(before, planned(heldOf(before), [shiftTo(typed)]))
  })

  it('a current start on Saturday and a typed Sunday share the rank-0 Friday: nothing is written', () => {
    const before = documentOf({ tasks: [{ uid: 1, start: '2028-04-08T08:00:00', finish: '2028-04-12T17:00:00' }] })
    expectNothingWritten(before, planned(heldOf(before), [shiftTo('2028-04-09')]))
  })
})

describe(`WH-10 -- out of table T-214: ${WH_10_IV_14}`, () => {
  it.each([
    ['a later date leaves 2149-12-31', '2149-12-25'],
    ['an earlier date leaves 1984-01-01 (the comment box sits two working days before the start)', '1984-01-03'],
    ['the new start itself is after 2149-12-31', '2150-01-05'],
  ])('%s (%s): refused with IV-14, nothing written', (_what, typed) => {
    const before = WORKED()
    const plan = planned(heldOf(before), [shiftTo(typed)])
    expect(plan.ok).toBe(false)
    expect(JSON.stringify((plan as unknown as Loose)['refusal'])).toContain('IV-14')
    expect((plan as unknown as Loose)['document']).toBeUndefined()
  })
})

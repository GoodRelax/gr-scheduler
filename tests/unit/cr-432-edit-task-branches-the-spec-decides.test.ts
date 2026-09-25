import { describe, expect, it } from 'vitest'

import { MSPDI_NAMESPACE } from '../../src/adapter/document-codec/mspdi-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task, TaskVisual } from '../../src/entity/document-model/schedule/schedule'
import {
  cycleTaskPlanActualState,
  editTask,
  type EditResult,
  type Refusal,
  type TaskCommand,
} from '../../src/use-case/edit-document/edit-document'
import { accepted, templateDocument, writtenText } from './cr-429-mspdi-fixtures'
import { taskOf } from './cr-430-cross-section-scene'

const ROW_NAME = 'Row'
const TEMPLATE = templateDocument()

const sept = (dayOfMonth: number): string => `2026-09-${String(dayOfMonth).padStart(2, '0')}T00:00:00`

const groupIdOf = (index: number): string => `5a000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`
const SPARE_GROUP_INDEX = 9

const groupRow = (index: number): Record<string, unknown> => ({
  id: groupIdOf(index),
  parentId: null,
  label: `row ${index + 1}`,
  derivedFromTaskUid: null,
  order: index,
  treeState: 'auto', editGroup: null,
  color: null,
  height: null,
})

function documentOf(tasks: readonly Task[], visuals: readonly TaskVisual[] = []): Document {
  const template = structuredClone(TEMPLATE)
  const calendars = template.schedule.calendars.map((calendar) => ({ ...calendar, exceptions: [] }))
  const groupIndexes = [...tasks.map((_, index) => index), SPARE_GROUP_INDEX]
  return {
    ...template,
    schedule: {
      ...template.schedule,
      project: { ...template.schedule.project, uidHighWaterMark: 100, statusDate: null },
      calendars,
      tasks,
      resources: [],
      assignments: [],
      taskGroups: groupIndexes.map(groupRow),
      taskGroupMembers: tasks.map((task, index) => ({ taskUid: task.uid, groupId: groupIdOf(index), stackOrder: null })),
      taskVisuals: visuals,
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    changeLog: [],
  } as unknown as Document
}

const planned = (uid: number, start: string, finish: string, part: Record<string, unknown> = {}): Task =>
  taskOf({ uid, wbsOrder: uid - 1, name: `task ${uid}`, start, finish, milestone: false, ...part })

const run = (document: Document, command: TaskCommand): EditResult => editTask(document, command, ROW_NAME)

function acceptedDocument(result: EditResult): Document {
  if (!result.ok) throw new Error(`expected acceptance, refused: ${JSON.stringify(result.refusals)}`)
  return result.document
}

function refusalsOf(result: EditResult): readonly Refusal[] {
  if (result.ok) throw new Error('expected a refusal, the edit was accepted')
  return result.refusals
}

const textOf = (refusal: Refusal): string => `${'at' in refusal ? (refusal.at ?? '') : ''} ${refusal.what}`

const names = (refusal: Refusal, field: string): boolean => new RegExp(`\\b${field}\\b`).test(textOf(refusal))

const taskIn = (document: Document, uid: number): Task => {
  const found = document.schedule.tasks.find((task) => task.uid === uid)
  if (found === undefined) throw new Error(`no task ${uid}`)
  return found
}

const ACTUAL_COLUMNS = ['actualStart', 'stop', 'actualFinish', 'resume', 'resumeValid'] as const

const actualsOf = (task: Task): Record<string, unknown> =>
  Object.fromEntries(ACTUAL_COLUMNS.map((column) => [column, task[column]]))

const UNREADABLE_DAYS = ['2026-02-30T00:00:00', ''] as const
const OUT_OF_RANGE_DAYS = ['1969-12-31T00:00:00', '2201-01-01T00:00:00'] as const
const BAD_DAYS = [...UNREADABLE_DAYS, ...OUT_OF_RANGE_DAYS] as const

const FR_012_NO_REVERSED_PLAN = '`finish` が `start` より前の入力を受け付けてはならない（MUST NOT）'
const FR_012_DIFFERENCE_NOT_INCLUSIVE = '期間は開始日と終了日の差とし、**端を含む日数と取り違えないこと（MUST NOT）'
const FR_011_SAME_DAY_IS_ONE = '⭐ 実績の開始日と終了日が同じ日であるとき、その実績は 1 日とすること（MUST）'
const FR_011_WORKING_DAYS =
  '実績の長さは、`actualStart` から実績の最後の日までの、文書の暦（`FR-054`）の稼働日の数とすること（MUST）'
const NT_1_NAME_THE_FIELD = '入力を受け付けないとき | **どの項目が、なぜ誤りかを文字で示すこと（MUST）'
const HM_3_KEEP_WBS_PARENT = 'タスクバーを別の行へ移す操作では WBS の親を変えてはならない（MUST NOT）'
const PV_4_EMPTY_THE_ACTUAL =
  '実績（`actualStart` ／ `actualFinish` ／ `stop`）と `resume` を空にし、`resumeValid` を `false` にすること（MUST）'
const PV_1_PUT_BACK =
  '覚えている実績があれば戻し、無ければ `actualStart` ＝ `start`、`stop` ＝ `FR-011` の床の日（`actualStart` の後に来る稼働日を `_assets/tbl-settings.md` の 表 T-201 の `S-129` − 1 個数えた日）を置くこと（MUST）'
const T_019_CARRY_WRITES_BACK =
  '取り込んだ原値があり、そのタスクの実績を人が編集していないあいだは、作った値によらず原値をそのまま書き戻すこと（MUST）'
const PV_3_ONE_REPLACEMENT = '`resumeValid` を `false` にする（再開日未定。1 回の置き換えで行うこと（MUST）'

const CARRIED_ACTUAL_DURATION = 'PT37H0M0S'

const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7]
  .map((dayType) => `<WeekDay><DayType>${dayType}</DayType><DayWorking>${dayType === 1 || dayType === 7 ? 0 : 1}</DayWorking></WeekDay>`)
  .join('')

const INTERRUPTED_FILE = `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="${MSPDI_NAMESPACE}">
  <Name>Interrupted</Name>
  <CalendarUID>1</CalendarUID>
  <Calendars>
    <Calendar>
      <UID>1</UID>
      <Name>Standard</Name>
      <IsBaseCalendar>1</IsBaseCalendar>
      <BaseCalendarUID>-1</BaseCalendarUID>
      <WeekDays>${WEEK_DAYS}</WeekDays>
    </Calendar>
  </Calendars>
  <Tasks>
    <Task>
      <UID>1</UID>
      <ID>1</ID>
      <Name>Interrupted</Name>
      <OutlineNumber>1</OutlineNumber>
      <OutlineLevel>1</OutlineLevel>
      <Start>2026-04-06T08:00:00</Start>
      <Finish>2026-04-24T17:00:00</Finish>
      <Milestone>0</Milestone>
      <Summary>0</Summary>
      <ActualStart>2026-04-06T08:00:00</ActualStart>
      <ActualDuration>${CARRIED_ACTUAL_DURATION}</ActualDuration>
      <Stop>2026-04-10T17:00:00</Stop>
      <Resume>2026-05-11T08:00:00</Resume>
      <ResumeValid>1</ResumeValid>
    </Task>
  </Tasks>
</Project>
`

const exportedActualDuration = (document: Document): string | null =>
  /<ActualDuration>([^<]*)<\/ActualDuration>/.exec(writtenText(document))?.[1] ?? null

describe('CR-432 -- editTask branches the specification decides', () => {
  it('CM-12 / IV-14 / AT-31: a deadline that is not a readable day is refused and the deadline stays', () => {
    const before = documentOf([planned(1, sept(7), sept(10), { deadline: sept(11) })])
    for (const deadline of UNREADABLE_DAYS) {
      const result = run(before, { kind: 'setTaskDeadline', uid: 1, deadline })
      expect(result.ok, `deadline ${JSON.stringify(deadline)}`).toBe(false)
      expect(taskIn(before, 1).deadline).toBe(sept(11))
    }
  })

  it('CM-12 / IV-14 / S-119: a deadline before 1970-01-01 is refused, 1970-01-01 itself is accepted', () => {
    const before = documentOf([planned(1, sept(7), sept(10))])
    expect(run(before, { kind: 'setTaskDeadline', uid: 1, deadline: '1969-12-31T00:00:00' }).ok).toBe(false)
    const after = acceptedDocument(run(before, { kind: 'setTaskDeadline', uid: 1, deadline: '1970-01-01T00:00:00' }))
    expect(taskIn(after, 1).deadline).toBe('1970-01-01T00:00:00')
  })

  it('CM-19 / IV-2 / AT-61: moving a task to a groupId no TaskGroup has is refused, the member row unchanged', () => {
    const before = documentOf([planned(1, sept(7), sept(10))])
    const result = run(before, { kind: 'moveTaskToTaskGroup', uid: 1, groupId: '5a000000-0000-4000-8000-0000000000ff' })
    refusalsOf(result)
    expect(before.schedule.taskGroupMembers).toEqual([{ taskUid: 1, groupId: groupIdOf(0), stackOrder: null }])
  })

  it('CM-19 / HM-3: moving a task to the row it already sits on is accepted and changes no value', () => {
    const before = documentOf([planned(1, sept(7), sept(10)), planned(2, sept(7), sept(10), { wbsParentUid: 1 })])
    const after = acceptedDocument(run(before, { kind: 'moveTaskToTaskGroup', uid: 2, groupId: groupIdOf(1) }))
    expect(taskIn(after, 2).wbsParentUid, HM_3_KEEP_WBS_PARENT).toBe(1)
    expect(after.schedule).toEqual(before.schedule)
  })

  it('CM-6 / IV-14 / T-214 / NT-1: only the start is bad -- one reason, naming start; nothing is added', () => {
    const before = documentOf([planned(1, sept(7), sept(10))])
    for (const start of BAD_DAYS) {
      const refusals = refusalsOf(
        run(before, { kind: 'createTask', shapeKind: 'rectangle', start, finish: sept(10), groupId: groupIdOf(SPARE_GROUP_INDEX) }),
      )
      expect(refusals, `start ${JSON.stringify(start)}`).toHaveLength(1)
      expect(names(refusals[0]!, 'start'), NT_1_NAME_THE_FIELD).toBe(true)
    }
    expect(before.schedule.tasks).toHaveLength(1)
    expect(before.schedule.taskGroupMembers).toHaveLength(1)
    expect(before.schedule.project.uidHighWaterMark).toBe(100)
  })

  it('CM-6 / IV-14 / T-214 / NT-1: only the finish is bad (2201-01-01) -- one reason, naming finish', () => {
    const before = documentOf([planned(1, sept(7), sept(10))])
    const refusals = refusalsOf(
      run(before, {
        kind: 'createTask',
        shapeKind: 'rectangle',
        start: sept(7),
        finish: '2201-01-01T00:00:00',
        groupId: groupIdOf(SPARE_GROUP_INDEX),
      }),
    )
    expect(refusals).toHaveLength(1)
    expect(names(refusals[0]!, 'finish'), NT_1_NAME_THE_FIELD).toBe(true)
    expect(before.schedule.tasks).toHaveLength(1)
    expect(before.schedule.project.uidHighWaterMark).toBe(100)
  })

  it('CM-6 / IV-14 / T-214 / NT-1: both dates bad -- two reasons, one naming start and one naming finish', () => {
    const before = documentOf([planned(1, sept(7), sept(10))])
    const refusals = refusalsOf(
      run(before, {
        kind: 'createTask',
        shapeKind: 'rectangle',
        start: '2026-02-30T00:00:00',
        finish: '2201-01-01T00:00:00',
        groupId: groupIdOf(SPARE_GROUP_INDEX),
      }),
    )
    expect(refusals).toHaveLength(2)
    expect(refusals.some((one) => names(one, 'start')), NT_1_NAME_THE_FIELD).toBe(true)
    expect(refusals.some((one) => names(one, 'finish')), NT_1_NAME_THE_FIELD).toBe(true)
    expect(before.schedule.tasks).toHaveLength(1)
    expect(before.schedule.project.uidHighWaterMark).toBe(100)
  })

  it('CM-6 / FR-012 / IV-10 / RS-58: a finish before the start is refused and no task is created', () => {
    const before = documentOf([planned(1, sept(7), sept(10))])
    const result = run(before, {
      kind: 'createTask',
      shapeKind: 'rectangle',
      start: sept(10),
      finish: sept(7),
      groupId: groupIdOf(SPARE_GROUP_INDEX),
    })
    expect(result.ok, FR_012_NO_REVERSED_PLAN).toBe(false)
    expect(before.schedule.tasks).toHaveLength(1)
    expect(before.schedule.project.uidHighWaterMark).toBe(100)
  })

  it('CM-16 / IV-12 / FD-6: fade-in days longer than the plan span is refused and fadeInDays stays', () => {
    const before = documentOf([planned(1, sept(7), sept(10), { fadeInDays: 1, fadeOutDays: null })])
    const refusals = refusalsOf(run(before, { kind: 'setTaskFadeInDays', uid: 1, days: 10 }))
    expect(refusals.map((one) => one.rule)).toContain('IV-12')
    expect(taskIn(before, 1).fadeInDays).toBe(1)
  })

  it('CM-15 / PV-4 then PV-1 / T-019: an imported actual taken off and put back returns whole, with its carried ActualDuration', () => {
    const before = accepted(INTERRUPTED_FILE).document
    const task = taskIn(before, 1)
    expect(exportedActualDuration(before)).toBe(CARRIED_ACTUAL_DURATION)
    // STEP: take the actual off (PV-4) and remember it the way ScreenState would
    const removed = acceptedDocument(run(before, { kind: 'cycleTaskPlanActualState', uid: 1, remembered: null }))
    expect(actualsOf(taskIn(removed, 1)), PV_4_EMPTY_THE_ACTUAL).toEqual({
      actualStart: null,
      stop: null,
      actualFinish: null,
      resume: null,
      resumeValid: false,
    })
    const { remembered } = cycleTaskPlanActualState(task, null)
    // STEP: put it back (PV-1)
    const backDocument = acceptedDocument(run(removed, { kind: 'cycleTaskPlanActualState', uid: 1, remembered }))
    const back = taskIn(backDocument, 1)
    expect([back.actualStart, back.stop, back.actualFinish], PV_1_PUT_BACK).toEqual([
      task.actualStart,
      task.stop,
      task.actualFinish,
    ])
    expect(back.resumeValid).toBe(true)
    expect(exportedActualDuration(backDocument), T_019_CARRY_WRITES_BACK).toBe(CARRIED_ACTUAL_DURATION)
  })

  it('CM-11 / IV-14 / T-214 / NT-1: only the start is bad -- refused naming start; dates and percent complete stay', () => {
    const task = planned(1, sept(7), sept(10), {
      actualStart: sept(7),
      stop: sept(8),
      resumeValid: true,
      percentComplete: 67,
    })
    const before = documentOf([task])
    for (const start of BAD_DAYS) {
      const refusals = refusalsOf(run(before, { kind: 'setTaskPlanDates', uid: 1, start, finish: sept(10) }))
      expect(refusals.some((one) => names(one, 'start')), NT_1_NAME_THE_FIELD).toBe(true)
    }
    expect(taskIn(before, 1)).toEqual(task)
  })

  it('CM-13 / IV-14 / AT-34..AT-38: a PA-2, PA-3 or PA-5 placement with a bad day is refused; the five actual columns stay', () => {
    const task = planned(1, sept(7), sept(10))
    const before = documentOf([task])
    const places = [
      { row: 'PA-2', actualStart: sept(7), stop: '2026-13-01T00:00:00' },
      { row: 'PA-2', actualStart: '1969-12-31T00:00:00', stop: sept(8) },
      { row: 'PA-3', actualStart: sept(7), stop: sept(8), resume: '2201-01-01T00:00:00' },
      { row: 'PA-3', actualStart: sept(7), stop: sept(8), resume: '2026-02-30T00:00:00' },
      { row: 'PA-5', actualStart: sept(7), actualFinish: '2201-01-01T00:00:00' },
      { row: 'PA-5', actualStart: sept(7), actualFinish: '' },
    ] as const
    for (const place of places) {
      const result = run(before, { kind: 'setTaskPlanActualState', uid: 1, place })
      expect(result.ok, JSON.stringify(place)).toBe(false)
    }
    expect(actualsOf(taskIn(before, 1))).toEqual(actualsOf(task))
  })

  it('CM-14 / IV-14 / GO-6 / GO-7: a dropped day that is unreadable or after 2200-12-31 is refused; the task stays not started', () => {
    const before = documentOf([planned(1, sept(7), sept(10))])
    for (const grabbed of ['GA-5', 'GA-6'] as const) {
      for (const droppedDay of ['2201-01-01T00:00:00', '2026-02-30T00:00:00']) {
        const result = run(before, { kind: 'beginTaskActual', uid: 1, grabbed, droppedDay })
        expect(result.ok, `${grabbed} ${droppedDay}`).toBe(false)
      }
    }
    expect(taskIn(before, 1).actualStart).toBeNull()
  })

  it('CM-15 / PV-3: a finished task with no planned start is interrupted with its last day moved to stop', () => {
    const before = documentOf([
      taskOf({ uid: 1, wbsOrder: 0, name: 'done', actualStart: sept(7), actualFinish: sept(9), resumeValid: false }),
    ])
    const after = taskIn(acceptedDocument(run(before, { kind: 'cycleTaskPlanActualState', uid: 1, remembered: null })), 1)
    expect(
      { actualStart: after.actualStart, stop: after.stop, actualFinish: after.actualFinish, resume: after.resume, resumeValid: after.resumeValid },
      PV_3_ONE_REPLACEMENT,
    ).toEqual({ actualStart: sept(7), stop: sept(9), actualFinish: null, resume: null, resumeValid: false })
  })

  it('DFC-682 / FR-012 / FR-011: percent complete is round(actual working days / (finish - start) * 100)', () => {
    const situations = [
      { finish: sept(10), stop: sept(7), expected: 33 },
      { finish: sept(10), stop: sept(8), expected: 67 },
      { finish: sept(17), stop: sept(9), expected: 38 },
    ] as const
    for (const { finish, stop, expected } of situations) {
      const before = documentOf([planned(1, sept(7), finish)])
      const after = acceptedDocument(
        run(before, { kind: 'setTaskPlanActualState', uid: 1, place: { row: 'PA-2', actualStart: sept(7), stop } }),
      )
      expect(
        taskIn(after, 1).percentComplete,
        [FR_011_SAME_DAY_IS_ONE, FR_011_WORKING_DAYS, FR_012_DIFFERENCE_NOT_INCLUSIVE, `plan to ${finish}, stop ${stop}`].join(' / '),
      ).toBe(expected)
    }
  })
})

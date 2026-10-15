// CR-756 spec-only cases: an actual begun from the dummy with time of day shown starts on the instant and runs S-585.

import { afterEach, describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import { editTask, type TaskCommand } from '../../src/use-case/edit-document/edit-task'
import { drawnTask, pointer, restoreAnimationFrames, taskIn, type Stage } from '../unit/cr-430-stage'
import { specTable } from './spec-table'
import {
  MINUTES_PER_DAY,
  REQUIREMENTS,
  S_585_MINUTES,
  TIMED_MILESTONE_UID,
  TIMED_UID,
  documentOf,
  inkOf,
  minuteOf,
  stageOf,
  xOfInstant,
} from './cr-756-stage'

afterEach(restoreAnimationFrames)

const FR_043_THE_TIMED_VALUES =
  '時刻を表示しているとき（`FR-158`）の値は 表 T-245 の `GO-6`・`GO-7` の時刻の段が持つ。⛔ **離した日を稼働日へ寄せてはならない（MUST NOT）'
const FR_043_THE_OTHER_END =
  '開始点を掴んだときは終了点をその既定の日で、終了点を掴んだときは開始点を予定の開始日（時刻を表示しているときは予定の開始の瞬間 —— 表 T-240 の `DM-1`）で確定させること（MUST）'
const GO_6_S_585_WORKING_MINUTES =
  '⭐ 時刻を表示しているとき（`FR-158`）、実績の最後の日に代えて、実績の終わりを `actualStart` から `_assets/tbl-settings.md` の 表 T-206 の `S-585` の稼働時間を進めた瞬間とすること（MUST）'
const GO_6_THE_FLOOR = 'それが `FR-011` の床（そのとき効いている 表 T-378 の寄せの単位）より短いとき（目盛が日の段、`SG-1`）は床とする'
const GO_7_THE_PLAN_START_INSTANT = '`actualStart` ＝ 予定の開始日（時刻を表示しているとき（`FR-158`）は予定の開始の瞬間 —— 表 T-240 の `DM-1` であり、日の既定の開始時刻へ丸めない）'
const GO_8_THE_SAME_DAY = '`actualStart` ＝ 離した所、実績の最後の日 ＝ 同じ日（`S-130`）'
const GO_9_RIGHT_OF_THE_DUMMY =
  '未着手のダミーの右に立つときは、`actualStart` ＝ 予定の開始日（時刻を表示しているときは予定の開始の瞬間 —— 表 T-240 の `DM-1`）、実績の最後の日 ＝ 離した所そのもの。'
const GO_9_LEFT_OF_THE_PLAN_START =
  '⚠️ 予定の開始より左で離したときは、予定の開始に表 T-240 の `DM-2` の長さの実績を置く（時刻を表示しているときは `GO-6` の時刻の段と同じ長さ）'
const PV_1_NOT_ROUNDED =
  '⭐ 時刻を表示しているとき（`FR-158`）、`actualStart` は `start` の瞬間（日付だけの字は 表 T-350 の開始の側 —— `FR-054`）とし、⛔ 日の既定の開始時刻へ丸めてはならない（MUST NOT）'
const PV_1_THE_STOP =
  '`stop` は、表 T-245 の `GO-6` の時刻の段と同じく、`actualStart` から `_assets/tbl-settings.md` の 表 T-206 の `S-585` の稼働時間を進めた瞬間とする（`FR-011` の床より短ければ床）。'
const FR_103_THE_NEAREST_DAY_EDGE =
  '⭐ 寄せの単位が日のとき、その日は、時刻を表示しているとき（`FR-158`）は、離した位置に最も近い日の境（`00:00`）を `FR-054` の側で読んだ日とすること（MUST）'
const FR_011_THE_EARLIEST_INSTANT =
  '⭐ 同じ稼働時間に当たる瞬間が 2 つ以上あるとき（時間帯の終わりと、次の時間帯の始まり）は、最も早い瞬間に置くこと（MUST）'

const cellOf = (table: string, id: string, heading: string): string =>
  specTable(table).rows.find((one) => one.id === id)?.by[heading] ?? ''

const HOUR = 60
const HALF_HOUR = 30
const DAY_UNIT = MINUTES_PER_DAY
const HOUR_TIER = 400
const DAY_TIER = 100

const written = (task: Task): { readonly actualStart: string | null; readonly last: string | null } => ({
  actualStart: minuteOf(task.actualStart),
  last: minuteOf(task.actualFinish ?? task.stop),
})

const taskAfter = (document: Document, command: TaskCommand, uid: number): Task => {
  const result = editTask(document, command, 'fixture default task group name')
  if (!result.ok) throw new Error(`the command was refused: ${JSON.stringify(result.refusals)}`)
  const found = result.document.schedule.tasks.find((one) => one.uid === uid)
  if (found === undefined) throw new Error(`Task ${String(uid)} left the document`)
  return found
}

const begun = (
  isTimeOfDayVisible: boolean,
  grabbed: 'GA-5' | 'GA-6' | 'GA-17',
  released: string,
  snapMinutes: number,
  uid: number = TIMED_UID,
): Task =>
  taskAfter(
    documentOf({ isTimeOfDayVisible, pxPerDay: HOUR_TIER }),
    { kind: 'beginTaskActual', uid, grabbed, released: { start: released, finish: released }, snapMinutes },
    uid,
  )

const pressed = (isTimeOfDayVisible: boolean, snapMinutes: number | undefined, uid: number = TIMED_UID): Task =>
  taskAfter(
    documentOf({ isTimeOfDayVisible, pxPerDay: HOUR_TIER }),
    snapMinutes === undefined
      ? { kind: 'cycleTaskPlanActualState', uid, remembered: null }
      : { kind: 'cycleTaskPlanActualState', uid, remembered: null, snapMinutes },
    uid,
  )

describe('CR-756 -- the manuscript still says what these cases press', () => {
  it.each([
    FR_043_THE_TIMED_VALUES,
    FR_043_THE_OTHER_END,
    GO_6_S_585_WORKING_MINUTES,
    GO_6_THE_FLOOR,
    GO_7_THE_PLAN_START_INSTANT,
    GO_8_THE_SAME_DAY,
    GO_9_RIGHT_OF_THE_DUMMY,
    GO_9_LEFT_OF_THE_PLAN_START,
    PV_1_NOT_ROUNDED,
    PV_1_THE_STOP,
    FR_103_THE_NEAREST_DAY_EDGE,
    FR_011_THE_EARLIEST_INSTANT,
  ])('still says it, word for word: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('the rows the clauses stand in are GO-6, GO-7, GO-9 of table T-245 and PV-1 of table T-021a', () => {
    expect(cellOf('T-245', 'GO-6', '置く値')).toContain(GO_6_S_585_WORKING_MINUTES)
    expect(cellOf('T-245', 'GO-7', '置く値')).toContain(GO_7_THE_PLAN_START_INSTANT)
    expect(cellOf('T-245', 'GO-9', '置く値')).toContain(GO_9_LEFT_OF_THE_PLAN_START)
    expect(cellOf('T-021a', 'PV-1', '置く値')).toContain(PV_1_NOT_ROUNDED)
    expect(S_585_MINUTES).toBe(HOUR)
  })
})

describe(`T-245 GO-6 (beginTaskActual, GA-5): ${GO_6_S_585_WORKING_MINUTES}`, () => {
  it.each([
    { snap: HOUR, released: '2026-04-07T10:00:00', start: '2026-04-07T10:00', last: '2026-04-07T11:00', why: 'one working hour' },
    { snap: HALF_HOUR, released: '2026-04-07T10:00:00', start: '2026-04-07T10:00', last: '2026-04-07T11:00', why: 'S-585, not the 30-minute snap unit' },
    { snap: HOUR, released: '2026-04-07T11:30:00', start: '2026-04-07T11:30', last: '2026-04-07T13:30', why: 'working minutes skip 12:00-13:00' },
    { snap: HOUR, released: '2026-04-07T16:30:00', start: '2026-04-07T16:30', last: '2026-04-08T08:30', why: 'working minutes skip the night' },
    { snap: HOUR, released: '2026-04-07T11:00:00', start: '2026-04-07T11:00', last: '2026-04-07T12:00', why: FR_011_THE_EARLIEST_INSTANT },
  ])('snap $snap min, released $released: $start to $last ($why)', ({ snap, released, start, last }) => {
    const task = begun(true, 'GA-5', released, snap)
    expect(written(task), GO_6_S_585_WORKING_MINUTES).toEqual({ actualStart: start, last })
    expect(task.resumeValid, '⭐ 片端だけが決まった状態を作らないこと（MUST）').toBe(true)
  })

  it(`time shown on the day unit (SG-1): ${GO_6_THE_FLOOR}`, () => {
    const task = begun(true, 'GA-5', '2026-04-07T08:00:00', DAY_UNIT)
    expect(written(task), GO_6_THE_FLOOR).toEqual({ actualStart: '2026-04-07T08:00', last: '2026-04-07T17:00' })
  })

  it('time hidden: the day unit and the floor day, as before CR-756 (JDG-2059)', () => {
    const task = begun(false, 'GA-5', '2026-04-07T08:00:00', DAY_UNIT)
    expect(written(task), FR_043_THE_TIMED_VALUES).toEqual({ actualStart: '2026-04-07T08:00', last: '2026-04-07T17:00' })
  })
})

describe(`T-245 GO-7 (beginTaskActual, GA-6): ${GO_7_THE_PLAN_START_INSTANT}`, () => {
  it(`time shown, released at 15:00: ${FR_043_THE_OTHER_END}`, () => {
    const task = begun(true, 'GA-6', '2026-04-06T15:00:00', HOUR)
    expect(written(task), FR_043_THE_OTHER_END).toEqual({ actualStart: '2026-04-06T10:30', last: '2026-04-06T15:00' })
  })

  it('time hidden: the plan start day at its default start time (JDG-2059)', () => {
    const task = begun(false, 'GA-6', '2026-04-08T00:00:00', DAY_UNIT)
    expect(written(task), GO_7_THE_PLAN_START_INSTANT).toEqual({ actualStart: '2026-04-06T08:00', last: '2026-04-08T17:00' })
  })
})

describe(`T-245 GO-8 (beginTaskActual, GA-17): ${GO_8_THE_SAME_DAY}`, () => {
  it('time shown: a milestone actual starts and ends on the released instant (S-130 is 0)', () => {
    const task = begun(true, 'GA-17', '2026-04-07T15:00:00', HOUR, TIMED_MILESTONE_UID)
    expect(written(task), GO_8_THE_SAME_DAY).toEqual({ actualStart: '2026-04-07T15:00', last: '2026-04-07T15:00' })
  })
})

describe(`T-021a PV-1 (cycleTaskPlanActualState): ${PV_1_NOT_ROUNDED}`, () => {
  it.each([
    { snap: HOUR, last: '2026-04-06T11:30' },
    { snap: HALF_HOUR, last: '2026-04-06T11:30' },
  ])(`snap $snap min: actualStart is the 10:30 start, ${PV_1_THE_STOP}`, ({ snap, last }) => {
    const task = pressed(true, snap)
    expect(written(task), PV_1_THE_STOP).toEqual({ actualStart: '2026-04-06T10:30', last })
    expect(task.resumeValid).toBe(true)
  })

  it('no snap unit given (the day unit): the start instant still, and the floor day', () => {
    const task = pressed(true, undefined)
    expect(written(task), PV_1_NOT_ROUNDED).toEqual({ actualStart: '2026-04-06T10:30', last: '2026-04-06T17:00' })
  })

  it('a milestone: actualStart is the 15:00 start and the last day is actualStart (S-130)', () => {
    const task = pressed(true, HOUR, TIMED_MILESTONE_UID)
    expect(written(task), PV_1_NOT_ROUNDED).toEqual({ actualStart: '2026-04-06T15:00', last: '2026-04-06T15:00' })
  })
})

const dragFrom = (one: Stage, from: { readonly x: number; readonly y: number }, toX: number): void => {
  one.send(pointer('down', from.x, from.y))
  one.send(pointer('move', (from.x + toX) / 2, from.y))
  one.send(pointer('move', toX, from.y))
  one.send(pointer('up', toX, from.y))
}

// see FR-104, GA-5, GA-6
const halfOf = (one: Stage, uid: number, side: 'left' | 'right'): { readonly x: number; readonly y: number } => {
  const ink = inkOf(one, uid)
  const quarter = ink.width / 4
  return { x: side === 'left' ? ink.x + quarter : ink.x + ink.width - quarter, y: ink.y + ink.height / 2 }
}

const markerOf = (one: Stage, uid: number): { readonly x: number; readonly y: number } => {
  const marker = drawnTask(one.loop, uid).marker
  if (marker === null) throw new Error('premise: the progress marker is drawn (S-63)')
  return marker.center
}

const FIVE_PAST = 5

const pastBy = (one: Stage, iso: string): number =>
  xOfInstant(one, iso) + (FIVE_PAST / MINUTES_PER_DAY) * (xOfInstant(one, '2026-04-07T00:00:00') - xOfInstant(one, '2026-04-06T00:00:00'))

describe('the screen: a dummy released or pressed with time of day shown (DFC-2572)', () => {
  it(`hour tier, GA-5 released at 10:05 on 04-07: ${FR_043_THE_TIMED_VALUES}`, () => {
    const one = stageOf({ isTimeOfDayVisible: true, pxPerDay: HOUR_TIER })
    dragFrom(one, halfOf(one, TIMED_UID, 'left'), pastBy(one, '2026-04-07T10:00:00'))
    expect(written(taskIn(one.loop, TIMED_UID)), GO_6_S_585_WORKING_MINUTES).toEqual({
      actualStart: '2026-04-07T10:00',
      last: '2026-04-07T11:00',
    })
  })

  it(`hour tier, GA-6 released at 15:05 on 04-06: ${FR_043_THE_OTHER_END}`, () => {
    const one = stageOf({ isTimeOfDayVisible: true, pxPerDay: HOUR_TIER })
    dragFrom(one, halfOf(one, TIMED_UID, 'right'), pastBy(one, '2026-04-06T15:00:00'))
    expect(written(taskIn(one.loop, TIMED_UID)), GO_7_THE_PLAN_START_INSTANT).toEqual({
      actualStart: '2026-04-06T10:30',
      last: '2026-04-06T15:00',
    })
  })

  it(`day tier with time shown, GA-5 released at 03:00 on 04-07: ${FR_103_THE_NEAREST_DAY_EDGE}`, () => {
    const one = stageOf({ isTimeOfDayVisible: true, pxPerDay: DAY_TIER })
    dragFrom(one, halfOf(one, TIMED_UID, 'left'), xOfInstant(one, '2026-04-07T03:00:00'))
    expect(written(taskIn(one.loop, TIMED_UID)), GO_6_THE_FLOOR).toEqual({
      actualStart: '2026-04-07T08:00',
      last: '2026-04-07T17:00',
    })
  })

  it(`hour tier, the milestone dummy GA-17 released at 15:05 on 04-07: ${GO_8_THE_SAME_DAY}`, () => {
    const one = stageOf({ isTimeOfDayVisible: true, pxPerDay: HOUR_TIER })
    const ink = inkOf(one, TIMED_MILESTONE_UID)
    dragFrom(one, { x: ink.x + ink.width / 2, y: ink.y + ink.height / 2 }, pastBy(one, '2026-04-07T15:00:00'))
    expect(written(taskIn(one.loop, TIMED_MILESTONE_UID)), GO_8_THE_SAME_DAY).toEqual({
      actualStart: '2026-04-07T15:00',
      last: '2026-04-07T15:00',
    })
  })

  it(`hour tier, the progress marker pressed: ${PV_1_NOT_ROUNDED}`, () => {
    const one = stageOf({ isTimeOfDayVisible: true, pxPerDay: HOUR_TIER })
    const at = markerOf(one, TIMED_UID)
    one.send(pointer('down', at.x, at.y))
    one.send(pointer('up', at.x, at.y))
    expect(written(taskIn(one.loop, TIMED_UID)), PV_1_THE_STOP).toEqual({
      actualStart: '2026-04-06T10:30',
      last: '2026-04-06T11:30',
    })
  })

  it(`hour tier, the progress marker pulled to 14:05 on 04-07: ${GO_9_RIGHT_OF_THE_DUMMY}`, () => {
    const one = stageOf({ isTimeOfDayVisible: true, pxPerDay: HOUR_TIER })
    dragFrom(one, markerOf(one, TIMED_UID), pastBy(one, '2026-04-07T14:00:00'))
    expect(written(taskIn(one.loop, TIMED_UID)), GO_9_RIGHT_OF_THE_DUMMY).toEqual({
      actualStart: '2026-04-06T10:30',
      last: '2026-04-07T14:00',
    })
  })

  it(`hour tier, the progress marker pulled to 09:05 on 04-06: ${GO_9_LEFT_OF_THE_PLAN_START}`, () => {
    const one = stageOf({ isTimeOfDayVisible: true, pxPerDay: HOUR_TIER })
    dragFrom(one, markerOf(one, TIMED_UID), pastBy(one, '2026-04-06T09:00:00'))
    expect(written(taskIn(one.loop, TIMED_UID)), GO_9_LEFT_OF_THE_PLAN_START).toEqual({
      actualStart: '2026-04-06T10:30',
      last: '2026-04-06T11:30',
    })
  })
})

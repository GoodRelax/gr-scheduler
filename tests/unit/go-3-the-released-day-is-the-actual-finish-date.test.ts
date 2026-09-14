// GO-3 of table T-245 (FR-103): the day an actual end is released on is the last actual day, rest days included.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  dayOf,
  isWorkingDay,
  textOfDay,
  workingCalendarOf,
  type CalendarDay,
  type Task,
} from '../../src/entity/document-model/schedule/schedule'
import { NOT_STORED_SIZES } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import type {
  BarGeometry,
  Point,
  TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { dateAtX } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { specTable, unbroken } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const GO_3_LAST_DAY_NOT_RIGHT_EDGE =
  '離した日は実績の最後の日として置き、実績バーの右端の位置として数えないこと（MUST）'

const GO_3_SAME_GESTURE_AS_GO_2 = '`GO-2` と同じ所作である。'

const GO_3_WHICH_COLUMN =
  '`actualFinish` を持つとき（表 T-019 の `PA-5`）は `actualFinish`、持たないときは `stop` に置く'

const GO_3_REST_DAY = '離した日が非稼働日であっても、その日を最後の日とすること（MUST）'

const FR_011_SAME_DAY_IS_ONE =
  '⭐ 実績の開始日と終了日が同じ日であるとき、その実績は 1 日とすること（MUST）。'

const FR_011_RIGHT_END_IS_A_POSITION =
  '⭐ **本要求の「実績バーの右端」は位置であって終了日ではない** —— 実績の最後の日の翌暦日の列の左端であり、実績の終了日は最後の日そのものである。'

const FR_011_FLOOR =
  '⭐ 着手しているタスクの実績の最後の日を、床の日より前に置かないこと（MUST）'

const T_245 = specTable('T-245')

const cellOf = (row: string, heading: string): string => {
  const found = T_245.rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-245 has no row ${row}`)
  const cell = found.by[heading]
  if (cell === undefined) throw new Error(`table T-245 has no column ${heading}`)
  return cell
}

const PUTS = '置く値'

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const ROW_A = '5c000000-0000-4000-8000-000000000001'
const ROW_B = '5c000000-0000-4000-8000-000000000002'

const RUNNING_UID = 1
const FINISHED_UID = 2

const day = (d: number): string => `2026-04-${String(d).padStart(2, '0')}T00:00:00`

const dayPart = (value: string | null | undefined): string => {
  if (value === null || value === undefined) throw new Error('the column this case reads holds nothing')
  return value.slice(0, 10)
}

const S_129 = SETTINGS_DEFAULTS['actualInitialDuration'] as number
const S_91 = NOT_STORED_SIZES['S-91']

function task(over: Partial<Task> & { readonly uid: number }): Task {
  return {
    wbsParentUid: null,
    wbsOrder: over.uid,
    name: null,
    start: null,
    finish: null,
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
    ...over,
  } as unknown as Task
}

const group = (id: string, order: number, label: string): unknown => ({
  id,
  parentId: null,
  label,
  derivedFromTaskUid: null,
  order,
  isCollapsed: false,
  isHidden: false,
  color: null,
  height: null,
})

function fixtureDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...structuredClone(template.schedule.project), uidHighWaterMark: 100, statusDate: null },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        task({
          uid: RUNNING_UID,
          name: 'Running',
          start: day(6),
          finish: day(24),
          actualStart: day(9),
          stop: day(14),
          resumeValid: true,
          percentComplete: 29,
        }),
        task({
          uid: FINISHED_UID,
          name: 'Finished',
          start: day(6),
          finish: day(24),
          actualStart: day(9),
          actualFinish: day(14),
          resumeValid: false,
          percentComplete: 29,
        }),
      ],
      resources: [],
      assignments: [],
      taskGroups: [group(ROW_A, 0, 'A'), group(ROW_B, 1, 'B')],
      taskGroupMembers: [
        { taskUid: RUNNING_UID, groupId: ROW_A, stackOrder: null },
        { taskUid: FINISHED_UID, groupId: ROW_B, stackOrder: null },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      pxPerDayAt1x: 20,
      scrollDate: day(1),
      scrollGroupId: ROW_A,
      scrollDayOffset: 0,
      scrollGroupOffset: 0,
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

const CALENDAR = workingCalendarOf(fixtureDocument().schedule)

const dayValue = (text: string): CalendarDay => {
  const value = dayOf(text)
  if (value === null) throw new Error(`${text} is not a day`)
  return value
}

const nextCalendarDay = (text: string): string => {
  const [y, m, d] = text.slice(0, 10).split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

// see FR-011
function lengthFromTo(start: string, last: string): number {
  let count = 0
  for (let at = start; at <= last; at = nextCalendarDay(at)) {
    if (at === start || at === last || isWorkingDay(CALENDAR, dayValue(at))) count += 1
  }
  return count
}

// see FR-011, T-019
function lastDayOf(one: Task): string {
  return dayPart(one.actualFinish ?? one.stop)
}

const SCREEN: FrameEnvironment = { width: 1200, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }

const realRaf = (globalThis as any).requestAnimationFrame

function host(): { readonly surface: { showSvg(svg: string): void }; runAnimationFrames(): void } {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
  }
}

function screenPane(): ScreenWiring {
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  return { surface, language: 'en' }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
}

function stage(): Stage {
  const pen = host()
  const loop = frameLoop(pen.surface as any, fixtureDocument(), SCREEN, screenPane())
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  pen.runAnimationFrames()
  return { loop, send }
}

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

const taskOf = (loop: FrameLoop, uid: number): Task => {
  const found = loop.document().schedule.tasks.find((one) => one.uid === uid)
  if (found === undefined) throw new Error(`the document has no Task ${uid}`)
  return found
}

const pxPerDay = (loop: FrameLoop): number => frameOf(loop).layout.pxPerDay

const drawnTask = (loop: FrameLoop, uid: number): TaskGeometry => {
  const found = frameOf(loop).geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`Task ${uid} is not in this frame`)
  return found
}

interface Box {
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
}

function actualBox(loop: FrameLoop, uid: number): Box {
  const bar: BarGeometry | null = drawnTask(loop, uid).actual
  if (bar === null) throw new Error(`Task ${uid}'s actual figure is not drawn`)
  const points: readonly Point[] =
    bar.form === 'outline'
      ? bar.points
      : [bar.from, bar.to, ...(bar.head ?? []), ...bar.dots.map((one) => one.at)]
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

const midY = (box: Box): number => (box.y0 + box.y1) / 2

const dayUnder = (loop: FrameLoop, x: number): string => {
  const found = dateAtX(frameOf(loop).layout, x)
  if (found === null) throw new Error('the frame drew no time axis under that point')
  return dayPart(textOfDay(found))
}

interface Released {
  readonly released: string
  readonly before: Task
  readonly after: Task
}

// see GR-6
function actualEndReleasedOn(uid: number, target: string): Released {
  const built = stage()
  const before = structuredClone(taskOf(built.loop, uid))
  const actual = actualBox(built.loop, uid)
  const px = pxPerDay(built.loop)
  let releaseX = actual.x1 + px / 2
  while (dayUnder(built.loop, releaseX) > target) releaseX -= px
  while (dayUnder(built.loop, releaseX) < target) releaseX += px
  const released = dayUnder(built.loop, releaseX)
  const at = { x: actual.x1 - S_91 / 2, y: midY(actual) }
  built.send(pointer('down', at.x, at.y))
  built.send(pointer('move', releaseX, at.y))
  built.send(pointer('up', releaseX, at.y))
  return { released, before, after: taskOf(built.loop, uid) }
}

describe('GO-3 -- the manuscript this file is driven by', () => {
  it('GO-3 still says: 離した日は実績の最後の日として置き、実績バーの右端の位置として数えないこと（MUST）', () => {
    const go3 = cellOf('GO-3', PUTS)
    expect(go3).toContain(GO_3_LAST_DAY_NOT_RIGHT_EDGE)
    expect(go3).toContain(GO_3_SAME_GESTURE_AS_GO_2)
    expect(go3).toContain(GO_3_WHICH_COLUMN)
    expect(go3).toContain(GO_3_REST_DAY)
  })

  it('FR-011 still says a same-day actual is one day, the right end is a position, and the floor is a day', () => {
    expect(REQUIREMENTS).toContain(FR_011_SAME_DAY_IS_ONE)
    expect(REQUIREMENTS).toContain(FR_011_RIGHT_END_IS_A_POSITION)
    expect(REQUIREMENTS).toContain(FR_011_FLOOR)
    expect(S_129).toBe(1)
  })
})

describe('the fixture these cases stand on', () => {
  it('is a `GRS JSON` document on a Monday-to-Friday calendar', () => {
    expect(validateDocument(fixtureDocument()).errors).toEqual([])
    expect(isWorkingDay(CALENDAR, dayValue('2026-04-10'))).toBe(true)
    expect(isWorkingDay(CALENDAR, dayValue('2026-04-11'))).toBe(false)
    expect(isWorkingDay(CALENDAR, dayValue('2026-04-12'))).toBe(false)
    expect(isWorkingDay(CALENDAR, dayValue('2026-04-13'))).toBe(true)
    expect(isWorkingDay(CALENDAR, dayValue('2026-04-18'))).toBe(false)
    expect(isWorkingDay(CALENDAR, dayValue('2026-04-20'))).toBe(true)
  })

  it('holds actuals from Thu 9 whose last day is Tue 14', () => {
    const built = stage()
    expect(lastDayOf(taskOf(built.loop, RUNNING_UID))).toBe('2026-04-14')
    expect(dayPart(taskOf(built.loop, FINISHED_UID).actualFinish)).toBe('2026-04-14')
  })
})

describe('GO-3: 離した日は実績の最後の日として置き、実績バーの右端の位置として数えないこと（MUST）', () => {
  const cases: readonly {
    readonly uid: number
    readonly what: string
    readonly target: string
    readonly worked: boolean
  }[] = [
    { uid: RUNNING_UID, what: 'running, lengthened to Wed 15 in the same week', target: '2026-04-15', worked: true },
    { uid: RUNNING_UID, what: 'running, shortened to Fri 10 in the same week', target: '2026-04-10', worked: true },
    { uid: RUNNING_UID, what: 'running, lengthened across a weekend to Mon 20', target: '2026-04-20', worked: true },
    { uid: RUNNING_UID, what: 'running, shortened to Sat 11, a rest day', target: '2026-04-11', worked: false },
    { uid: FINISHED_UID, what: 'finished, lengthened across a weekend to Mon 20', target: '2026-04-20', worked: true },
    { uid: FINISHED_UID, what: 'finished, shortened by one day to Mon 13', target: '2026-04-13', worked: true },
    { uid: FINISHED_UID, what: 'finished, lengthened to Sun 19, a rest day', target: '2026-04-19', worked: false },
  ]

  for (const one of cases) {
    it(`${one.what}: the last actual day is the released day`, () => {
      const { released, before, after } = actualEndReleasedOn(one.uid, one.target)
      expect(released, 'premise: released on the intended day').toBe(one.target)
      expect(isWorkingDay(CALENDAR, dayValue(released)), 'premise: a worked day or a rest day').toBe(one.worked)
      expect(after.actualStart, 'GO-3 keeps `actualStart`').toBe(before.actualStart)
      const held = one.uid === FINISHED_UID ? after.actualFinish : after.stop
      const other = one.uid === FINISHED_UID ? after.stop : after.actualFinish
      expect(dayPart(held), GO_3_WHICH_COLUMN).toBe(released)
      expect(other, GO_3_WHICH_COLUMN).toBeNull()
      expect(lastDayOf(after), GO_3_REST_DAY).toBe(released)
    })
  }

  it('finished, lengthened to Mon 20: `actualFinish` holds the released day and the task stays finished', () => {
    const { released, after } = actualEndReleasedOn(FINISHED_UID, '2026-04-20')
    expect(released, 'premise').toBe('2026-04-20')
    expect(dayPart(after.actualFinish), GO_3_WHICH_COLUMN).toBe(released)
    expect(after.resumeValid).toBe(false)
  })

  it('running, lengthened to Mon 20: `stop` holds the released day and `actualFinish` stays empty', () => {
    const { after, before } = actualEndReleasedOn(RUNNING_UID, '2026-04-20')
    expect(dayPart(after.stop) > dayPart(before.stop), 'premise: the grab did land').toBe(true)
    expect(after.actualFinish).toBeNull()
  })

  for (const uid of [RUNNING_UID, FINISHED_UID]) {
    it(`released on the actual start day (Task ${uid}): 実績の開始日と終了日が同じ日であるとき、その実績は 1 日とすること（MUST）`, () => {
      const { released, before, after } = actualEndReleasedOn(uid, '2026-04-09')
      expect(released, 'premise: the actual start day').toBe(dayPart(before.actualStart))
      expect(lengthFromTo(dayPart(after.actualStart), lastDayOf(after)), FR_011_SAME_DAY_IS_ONE).toBe(S_129)
      expect(lastDayOf(after)).toBe(released)
      if (uid === FINISHED_UID) expect(dayPart(after.actualFinish)).toBe(released)
    })
  }
})

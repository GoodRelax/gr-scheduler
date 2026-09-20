// FR-103 and table T-245 (CR-374): what the four date-moving grabs of T-023d put, and leave standing, on release.

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
const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

const FR_103_STATEMENT =
  '`FR-104` の 表 T-266 の掴み代を掴んで離したとき、`GRS` は、**表 T-245 に従って**値を置き、同表が据え置くとする値を変えないこと。'

const FR_103_REFUSALS =
  '拒むときの規則は既存の条項が持つ —— `finish` が `start` より前になる置き方は `FR-012` の MUST NOT と `05-07-design.md` の 表 T-220 の `IV-10` が、フェードの日数の和が期間を超える置き方は同表の `IV-12` が、受け入れる日付の範囲を外れる置き方は同表の `IV-14` が拒む。'

const FR_012_NOT_BEFORE = '⚠️ `finish` が `start` より前の入力を受け付けてはならない（MUST NOT）'

const FR_012_NO_ROUNDING = '丸めて `finish` = `start` にしてはならない（MUST NOT）'

const FR_103_IV_21 = '実績の長さ（`FR-011` が日付から数える）が 0 を下回る置き方は、同表の `IV-21` が拒む。'

const FR_011_FLOOR =
  '⭐ 着手しているタスクの実績の最後の日を、床の日より前に置かないこと（MUST）'

const FR_011_NOT_ZERO = '掴んで 0 稼働日まで縮められるようにしてはならない（MUST NOT）'

const GO_3_REST_DAY = '離した日が非稼働日であっても、その日を最後の日とすること（MUST）'

const GO_4_LAST_DAY = '持っているほうの最後の日（`actualFinish` または `stop`）も、置き直した `actualStart` と同じ日とする'

const T_245 = specTable('T-245')

const cellOf = (row: string, heading: string): string => {
  const found = T_245.rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-245 has no row ${row}`)
  const cell = found.by[heading]
  if (cell === undefined) throw new Error(`table T-245 has no column ${heading}`)
  return cell
}

const PUTS = '置く値'
const KEEPS = '据え置く値'

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const ROW_A = '5a000000-0000-4000-8000-000000000001'
const ROW_B = '5a000000-0000-4000-8000-000000000002'
const ROW_C = '5a000000-0000-4000-8000-000000000003'

const PLAIN_UID = 1
const MILESTONE_UID = 2
const FADED_UID = 3

const day = (d: number): string => `2026-04-${String(d).padStart(2, '0')}T00:00:00`

const dayPart = (value: string | null | undefined): string => {
  if (value === null || value === undefined) throw new Error('the column this case reads holds nothing')
  return value.slice(0, 10)
}

const S_129 = SETTINGS_DEFAULTS['actualInitialDuration'] as number
const S_130 = SETTINGS_DEFAULTS['milestoneActualDuration'] as number
const S_90 = NOT_STORED_SIZES['S-250']
const S_91 = NOT_STORED_SIZES['S-257']

const PX_PER_DAY_AT_1X = 20

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
  isKeptOpen: false,
  color: null,
  height: null,
})

function documentWith(
  tasks: readonly Task[],
  rows: readonly string[],
  scrollDate: string,
): Document {
  const template = structuredClone(TEMPLATE) as any
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks,
      resources: [],
      assignments: [],
      taskGroups: rows.map((id, index) => group(id, index, String.fromCharCode(65 + index))),
      taskGroupMembers: tasks.map((one, index) => ({
        taskUid: one.uid,
        groupId: rows[index],
        stackOrder: null,
      })),
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      pxPerDayAt1x: PX_PER_DAY_AT_1X,
      scrollDate,
      scrollGroupId: rows[0],
      scrollDayOffset: 0,
      scrollGroupOffset: 0,
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

const aprilDocument = (): Document =>
  documentWith(
    [
      task({
        uid: PLAIN_UID,
        name: 'Alpha',
        start: day(6),
        finish: day(24),
        actualStart: day(9),
        stop: day(14),
        resumeValid: true,
        percentComplete: 29,
      }),
      task({
        uid: MILESTONE_UID,
        name: 'Beta',
        start: day(13),
        finish: day(13),
        milestone: true,
        actualStart: day(17),
        stop: day(17),
        resumeValid: true,
      }),
      task({
        uid: FADED_UID,
        name: 'Gamma',
        start: day(6),
        finish: day(24),
        fadeInDays: 5,
        fadeOutDays: 5,
      }),
    ],
    [ROW_A, ROW_B, ROW_C],
    day(1),
  )

const EDGE_UID = 1
const edgeDocument = (): Document =>
  documentWith(
    [
      task({
        uid: EDGE_UID,
        name: 'Edge',
        start: '2200-12-15T00:00:00',
        finish: '2200-12-26T00:00:00',
      }),
    ],
    [ROW_A],
    '2200-12-01T00:00:00',
  )

const CALENDAR = workingCalendarOf(aprilDocument().schedule)

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
const actualLengthOf = (one: Task): number => {
  const start = dayPart(one.actualStart)
  const last = dayPart(one.actualFinish ?? one.stop)
  let count = 0
  for (let at = start; at <= last; at = nextCalendarDay(at)) {
    if (at === start || at === last || isWorkingDay(CALENDAR, dayValue(at))) count += 1
  }
  return count
}

const SCREEN: FrameEnvironment = {
  width: 1200,
  height: 700,
  appHeaderHeight: 0,
  scrollbarThickness: 0,
}

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

function stage(document: Document): Stage {
  const pen = host()
  const loop = frameLoop(pen.surface as any, document, SCREEN, screenPane())
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

function boxOfBar(bar: BarGeometry | null, what: string): Box {
  if (bar === null) throw new Error(`${what} is not drawn`)
  const points: readonly Point[] =
    bar.form === 'outline'
      ? bar.points
      : [bar.from, bar.to, ...(bar.head ?? []), ...bar.dots.map((one) => one.at)]
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

const midY = (box: Box): number => (box.y0 + box.y1) / 2
const midX = (box: Box): number => (box.x0 + box.x1) / 2

const planBox = (loop: FrameLoop, uid: number): Box =>
  boxOfBar(drawnTask(loop, uid).plan, `Task ${uid}'s plan bar`)
const actualBox = (loop: FrameLoop, uid: number): Box =>
  boxOfBar(drawnTask(loop, uid).actual, `Task ${uid}'s actual figure`)

const dayUnder = (loop: FrameLoop, x: number): string => {
  const found = dateAtX(frameOf(loop).layout, x)
  if (found === null) throw new Error('the frame drew no time axis under that point')
  return dayPart(textOfDay(found))
}

// see IN-1
function grab(built: Stage, at: Point, releaseX: number): void {
  built.send(pointer('down', at.x, at.y))
  built.send(pointer('move', releaseX, at.y))
  built.send(pointer('up', releaseX, at.y))
}

// see GA-1
const planStartPress = (loop: FrameLoop, uid: number): Point => {
  const plan = planBox(loop, uid)
  return { x: plan.x0 - S_90 / 2, y: midY(plan) }
}

// see GA-2
const planEndPress = (loop: FrameLoop, uid: number): Point => {
  const plan = planBox(loop, uid)
  return { x: plan.x1 + S_90 / 2, y: midY(plan) }
}

// see GA-4
const actualEndPress = (loop: FrameLoop, uid: number): Point => {
  const actual = actualBox(loop, uid)
  return { x: actual.x1 - S_91 / 2, y: midY(actual) }
}

const columnFrom = (loop: FrameLoop, edge: number, k: number): number =>
  edge + (k + 0.5) * pxPerDay(loop)

describe('FR-103 -- the manuscript this file is driven by', () => {
  it('FR-103 still says: `FR-104` の 表 T-266 の掴み代を掴んで離したとき、`GRS` は、**表 T-245 に従って**値を置き、同表が据え置くとする値を変えないこと。', () => {
    expect(REQUIREMENTS).toContain(FR_103_STATEMENT)
    expect(REQUIREMENTS).toContain(FR_103_REFUSALS)
    expect(REQUIREMENTS).toContain(FR_012_NOT_BEFORE)
    expect(REQUIREMENTS).toContain(FR_012_NO_ROUNDING)
    expect(REQUIREMENTS).toContain(FR_103_IV_21)
    expect(REQUIREMENTS).toContain(FR_011_FLOOR)
    expect(REQUIREMENTS).toContain(FR_011_NOT_ZERO)
  })

  it('table T-245 still holds GO-1 to GO-4 with the values these cases assert', () => {
    expect(cellOf('GO-1', PUTS)).toContain('`start` ＝ 離した日')
    expect(cellOf('GO-1', KEEPS)).toContain('`finish`')
    expect(cellOf('GO-2', PUTS)).toContain('`finish` ＝ 離した日そのもの')
    expect(cellOf('GO-2', KEEPS)).toContain('`start`')
    expect(cellOf('GO-3', PUTS)).toContain('実績の最後の日 ＝ 離した日そのもの')
    expect(cellOf('GO-3', PUTS)).toContain(GO_3_REST_DAY)
    expect(cellOf('GO-3', KEEPS)).toContain('`actualStart`')
    expect(cellOf('GO-4', PUTS)).toContain('`actualStart` ＝ 離した日')
    expect(cellOf('GO-4', PUTS)).toContain(GO_4_LAST_DAY)
    expect(cellOf('GO-4', KEEPS)).toBe('—')
  })

  it('table T-220 still holds IV-10, IV-12 and IV-14 as the refusals FR-103 points at', () => {
    expect(DESIGN).toContain('| IV-10 | `start` と `finish` がともに非 `null` の `Task` で、`finish` が `start` より前でないこと |')
    expect(DESIGN).toContain('| IV-12 | `fadeInDays` と `fadeOutDays` の和が、その `Task` の期間を超えないこと。')
    expect(DESIGN).toContain('| IV-14 | 日付の列が、日として読め、受け入れる日付の範囲に収まること。')
  })
})

describe('the fixtures these cases stand on', () => {
  it('are both `GRS JSON` documents', () => {
    expect(validateDocument(aprilDocument()).errors).toEqual([])
    expect(validateDocument(edgeDocument()).errors).toEqual([])
  })

  it('run on a Monday-to-Friday calendar through the April days used', () => {
    expect(isWorkingDay(CALENDAR, dayValue(day(17)))).toBe(true)
    expect(isWorkingDay(CALENDAR, dayValue(day(18)))).toBe(false)
    expect(isWorkingDay(CALENDAR, dayValue(day(19)))).toBe(false)
    expect(isWorkingDay(CALENDAR, dayValue(day(20)))).toBe(true)
    expect(isWorkingDay(CALENDAR, dayValue(day(21)))).toBe(true)
  })

  it('keep the plain Task actual ends days away from its plan ends', () => {
    const built = stage(aprilDocument())
    const plan = planBox(built.loop, PLAIN_UID)
    const actual = actualBox(built.loop, PLAIN_UID)
    expect(actual.x0 - plan.x0).toBeGreaterThan(2 * pxPerDay(built.loop))
    expect(plan.x1 - actual.x1).toBeGreaterThan(2 * pxPerDay(built.loop))
  })
})

describe('table T-245 GO-1 -- the plan start', () => {
  it('GO-1: `start` ＝ 離した日, and `finish` stands', () => {
    const built = stage(aprilDocument())
    const before = structuredClone(taskOf(built.loop, PLAIN_UID))
    const releaseX = columnFrom(built.loop, planBox(built.loop, PLAIN_UID).x0, -3)
    const released = dayUnder(built.loop, releaseX)
    expect(released, 'premise: the release lands three days earlier').toBe('2026-04-03')

    grab(built, planStartPress(built.loop, PLAIN_UID), releaseX)

    const after = taskOf(built.loop, PLAIN_UID)
    expect(dayPart(after.start), 'GO-1: `start` ＝ 離した日').toBe(released)
    expect(after.finish, 'GO-1 据え置く値: `finish`').toBe(before.finish)
    expect(after.actualStart).toBe(before.actualStart)
    expect(after.stop).toBe(before.stop)
  })

  it('FR-012 / IV-10: ⚠️ `finish` が `start` より前の入力を受け付けてはならない（MUST NOT） -- a start released past the finish lands nothing', () => {
    const built = stage(aprilDocument())
    const before = structuredClone(taskOf(built.loop, PLAIN_UID))
    const releaseX = columnFrom(built.loop, planBox(built.loop, PLAIN_UID).x0, 20)
    expect(dayUnder(built.loop, releaseX) > dayPart(before.finish), 'premise: released after the finish').toBe(true)

    grab(built, planStartPress(built.loop, PLAIN_UID), releaseX)

    const after = taskOf(built.loop, PLAIN_UID)
    expect(after.start, 'IV-10 refuses the start').toBe(before.start)
    expect(after.finish, 'FR-012: 丸めて `finish` = `start` にしてはならない（MUST NOT）').toBe(before.finish)
  })
})

describe('table T-245 GO-2 -- the plan end', () => {
  it('GO-2: `finish` ＝ 離した日そのもの, and `start` stands', () => {
    const built = stage(aprilDocument())
    const before = structuredClone(taskOf(built.loop, PLAIN_UID))
    const releaseX = columnFrom(built.loop, planBox(built.loop, PLAIN_UID).x1, -3)
    const released = dayUnder(built.loop, releaseX)
    expect(released < dayPart(before.finish), 'premise: the release lands before the finish').toBe(true)
    expect(released > dayPart(before.start), 'premise: and after the start').toBe(true)

    grab(built, planEndPress(built.loop, PLAIN_UID), releaseX)

    const after = taskOf(built.loop, PLAIN_UID)
    expect(dayPart(after.finish), 'GO-2: `finish` ＝ 離した日そのもの').toBe(released)
    expect(after.start, 'GO-2 据え置く値: `start`').toBe(before.start)
    expect(after.actualStart).toBe(before.actualStart)
    expect(after.stop).toBe(before.stop)
  })

  it('GO-2 on a Task with fades, while the fades still fit: `finish` ＝ 離した日そのもの', () => {
    const built = stage(aprilDocument())
    const before = structuredClone(taskOf(built.loop, FADED_UID))
    const releaseX = columnFrom(built.loop, planBox(built.loop, FADED_UID).x1, -5)
    const released = dayUnder(built.loop, releaseX)
    expect(released >= '2026-04-17', 'premise: 11 or more calendar days still hold 5 + 5').toBe(true)

    grab(built, planEndPress(built.loop, FADED_UID), releaseX)

    expect(dayPart(taskOf(built.loop, FADED_UID).finish)).toBe(released)
    expect(taskOf(built.loop, FADED_UID).start).toBe(before.start)
  })

  it('IV-12: `fadeInDays` と `fadeOutDays` の和が、その `Task` の期間を超えないこと -- a finish released inside the fades lands nothing', () => {
    const built = stage(aprilDocument())
    const before = structuredClone(taskOf(built.loop, FADED_UID))
    const releaseX = columnFrom(built.loop, planBox(built.loop, FADED_UID).x1, -12)
    const released = dayUnder(built.loop, releaseX)
    expect(released <= '2026-04-14', 'premise: at most 8 calendar days, under 5 + 5').toBe(true)
    expect(released > dayPart(before.start), 'premise: still after the start, so IV-10 is not what refuses').toBe(true)

    grab(built, planEndPress(built.loop, FADED_UID), releaseX)

    const after = taskOf(built.loop, FADED_UID)
    expect(after.finish, 'IV-12 refuses the finish').toBe(before.finish)
    expect(after.start).toBe(before.start)
    expect(after.fadeInDays).toBe(before.fadeInDays)
    expect(after.fadeOutDays).toBe(before.fadeOutDays)
  })

  it('GO-2 near the last accepted day, inside table T-214: `finish` ＝ 離した日そのもの', () => {
    const built = stage(edgeDocument())
    const releaseX = columnFrom(built.loop, planBox(built.loop, EDGE_UID).x1, 2)
    const released = dayUnder(built.loop, releaseX)
    expect(released <= '2200-12-31', 'premise: on or before S-120').toBe(true)

    grab(built, planEndPress(built.loop, EDGE_UID), releaseX)

    expect(dayPart(taskOf(built.loop, EDGE_UID).finish)).toBe(released)
  })

  it('IV-14: 日付の列が、日として読め、受け入れる日付の範囲に収まること -- a finish released past S-120 lands nothing', () => {
    const built = stage(edgeDocument())
    const before = structuredClone(taskOf(built.loop, EDGE_UID))
    const releaseX = columnFrom(built.loop, planBox(built.loop, EDGE_UID).x1, 12)
    expect(dayUnder(built.loop, releaseX) > '2200-12-31', 'premise: after S-120 importMaxDate').toBe(true)

    grab(built, planEndPress(built.loop, EDGE_UID), releaseX)

    const after = taskOf(built.loop, EDGE_UID)
    expect(after.finish, 'IV-14 refuses the finish').toBe(before.finish)
    expect(after.start).toBe(before.start)
  })
})

// see GO-3
function actualEndReleasedAt(k: number): { readonly released: string; readonly after: Task; readonly before: Task } {
  const built = stage(aprilDocument())
  const before = structuredClone(taskOf(built.loop, PLAIN_UID))
  const releaseX = columnFrom(built.loop, actualBox(built.loop, PLAIN_UID).x1, k)
  const released = dayUnder(built.loop, releaseX)
  grab(built, actualEndPress(built.loop, PLAIN_UID), releaseX)
  return { released, after: taskOf(built.loop, PLAIN_UID), before }
}

describe('table T-245 GO-3 -- the actual end', () => {
  it('GO-3: 実績の最後の日 ＝ 離した日そのもの, and `actualStart` stands', () => {
    const { released, after, before } = actualEndReleasedAt(5)
    expect(released, 'premise').toBe('2026-04-20')
    expect(after.actualStart, 'GO-3 据え置く値: `actualStart`').toBe(before.actualStart)
    expect(dayPart(after.stop), 'GO-3: the running Task holds the released day in `stop`').toBe(released)
    expect(after.start).toBe(before.start)
    expect(after.finish).toBe(before.finish)
  })

  it('FR-011: 稼働日 -- releases one working day apart (Mon 20, Tue 21) differ by exactly one', () => {
    const monday = actualEndReleasedAt(5)
    const tuesday = actualEndReleasedAt(6)
    expect([monday.released, tuesday.released], 'premise').toEqual(['2026-04-20', '2026-04-21'])
    expect(actualLengthOf(tuesday.after) - actualLengthOf(monday.after)).toBe(1)
  })

  it('FR-011: 稼働日 -- a weekend between two releases (Fri 17, Mon 20) still differs by exactly one', () => {
    const friday = actualEndReleasedAt(2)
    const monday = actualEndReleasedAt(5)
    expect([friday.released, monday.released], 'premise').toEqual(['2026-04-17', '2026-04-20'])
    expect(actualLengthOf(monday.after) - actualLengthOf(friday.after)).toBe(1)
  })

  it('GO-3: 離した日が非稼働日であっても、その日を最後の日とすること（MUST） -- released on Sat 18', () => {
    const friday = actualEndReleasedAt(2)
    const saturday = actualEndReleasedAt(3)
    expect([friday.released, saturday.released], 'premise').toEqual(['2026-04-17', '2026-04-18'])
    expect(isWorkingDay(CALENDAR, dayValue(saturday.released)), 'premise: a rest day').toBe(false)
    expect(dayPart(saturday.after.stop), GO_3_REST_DAY).toBe(saturday.released)
    expect(actualLengthOf(saturday.after) - actualLengthOf(friday.after), 'FR-011: the end day counts').toBe(1)
  })

  it('FR-011: ⭐ 着手しているタスクの実績の最後の日を、床の日より前に置かないこと（MUST） -- released on the actual start day', () => {
    const { released, after, before } = actualEndReleasedAt(-6)
    expect(released, 'premise: the actual start day').toBe(dayPart(before.actualStart))
    expect(after.actualStart, 'still started').toBe(before.actualStart)
    expect(dayPart(after.stop), 'FR-011: the floor day').toBe(released)
    expect(
      actualLengthOf(after),
      'FR-011: 掴んで 0 稼働日まで縮められるようにしてはならない（MUST NOT）',
    ).toBe(S_129)
  })

  it('IV-21: released on a worked day before the actual start lands nothing', () => {
    const { released, after, before } = actualEndReleasedAt(-7)
    expect(released < dayPart(before.actualStart), 'premise: released before the actual start').toBe(true)
    expect(isWorkingDay(CALENDAR, dayValue(released)), 'premise: a worked day, so the length is below zero').toBe(true)
    expect(after.actualStart, FR_103_IV_21).toBe(before.actualStart)
    expect(after.stop, FR_103_IV_21).toBe(before.stop)
  })

  it('GO-3: `actualFinish` を持たないときは `stop` に置き, `actualFinish` stays empty', () => {
    const { after } = actualEndReleasedAt(5)
    expect(after.actualFinish).toBeNull()
  })
})

describe('table T-245 GO-4 -- the actual milestone', () => {
  it('GO-4: `actualStart` ＝ 離した日, and the held last day `stop` follows it', () => {
    const built = stage(aprilDocument())
    const before = structuredClone(taskOf(built.loop, MILESTONE_UID))
    const figure = actualBox(built.loop, MILESTONE_UID)
    const releaseX = midX(figure) + 3.25 * pxPerDay(built.loop)
    const released = dayUnder(built.loop, releaseX)
    expect(released, 'premise').toBe('2026-04-20')

    grab(built, { x: midX(figure), y: midY(figure) }, releaseX)

    const after = taskOf(built.loop, MILESTONE_UID)
    expect(dayPart(after.actualStart), 'GO-4: `actualStart` ＝ 離した日').toBe(released)
    expect(dayPart(after.stop), GO_4_LAST_DAY).toBe(dayPart(after.actualStart))
    expect(S_130, 'S-130: a milestone has no length').toBe(0)
    expect(after.start).toBe(before.start)
    expect(after.finish).toBe(before.finish)
  })
})

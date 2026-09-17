// GR-5 of table T-023d: grabbing the actual bar left end moves actualStart only; GR-15 moves a milestone's last day with it.

import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type {
  HumanInput,
  InputModifiers,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  compareDays,
  dayOf,
  isWorkingDay,
  textOfDay,
  workingCalendarOf,
  type CalendarDay,
  type Task,
} from '../../src/entity/document-model/schedule/schedule'
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
import { specTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'
import { DEFAULT_DISPLAY_RATIO } from '../fixtures/display-scale'

const T_023D = specTable('T-023d')

const OPERATION_COLUMN = ((): string => {
  const found = T_023D.headings.find((heading) => heading.includes('操作'))
  if (found === undefined) throw new Error('table T-023d has no 操作 column')
  return found
})()

const operationOf = (row: string): string => {
  const found = T_023D.rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-023d has no row ${row}`)
  return found.by[OPERATION_COLUMN] ?? ''
}

const GR_5 = operationOf('GR-5')
const GR_6 = operationOf('GR-6')
const GR_15 = operationOf('GR-15')

const T_245 = specTable('T-245')

const GO_4_PUTS = ((): string => {
  const found = T_245.rows.find((one) => one.id === 'GO-4')
  if (found === undefined) throw new Error('table T-245 has no row GO-4')
  return found.by['置く値'] ?? ''
})()

const GR_5_LAST_DAY_STANDS = '実績の最後の日（`actualFinish` または `stop`）は据え置くこと（MUST）'

const GR_5_NO_LENGTH_COLUMN = '⭐ 長さは `FR-011` が日付から数え直す —— 本行は長さの列を持たない'

const GO_4_LAST_DAY = '持っているほうの最後の日（`actualFinish` または `stop`）も、置き直した `actualStart` と同じ日とする'

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

const ROW_A = '4a000000-0000-4000-8000-000000000001'
const ROW_B = '4a000000-0000-4000-8000-000000000002'

const PLAIN_UID = 1
const MILESTONE_UID = 2

const day = (d: number): string => `2026-04-${String(d).padStart(2, '0')}T00:00:00`

const dayPart = (value: string | null): string => {
  if (value === null) throw new Error('the column this case reads holds nothing')
  return value.slice(0, 10)
}

const PLAIN_START = day(6)
const PLAIN_FINISH = day(24)
const PLAIN_ACTUAL_START = day(9)
const PLAIN_LAST_DAY = day(14)

const MILESTONE_DAY = day(13)
const MILESTONE_ACTUAL_START = day(17)

const MILESTONE_ACTUAL_DURATION = ((): number => {
  const value = SETTINGS_DEFAULTS['milestoneActualDuration']
  if (typeof value !== 'number') throw new Error('S-130 is not a number')
  return value
})()

const PX_PER_DAY_AT_1X = 20 / DEFAULT_DISPLAY_RATIO

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

function fixtureDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  const draft = {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        task({
          uid: PLAIN_UID,
          name: 'Alpha',
          start: PLAIN_START,
          finish: PLAIN_FINISH,
          actualStart: PLAIN_ACTUAL_START,
          stop: PLAIN_LAST_DAY,
          resumeValid: true,
          percentComplete: 25,
        }),
        task({
          uid: MILESTONE_UID,
          name: 'Beta',
          start: MILESTONE_DAY,
          finish: MILESTONE_DAY,
          milestone: true,
          actualStart: MILESTONE_ACTUAL_START,
          stop: MILESTONE_ACTUAL_START,
          resumeValid: true,
        }),
      ],
      resources: [],
      assignments: [],
      taskGroups: [group(ROW_A, 0, 'A'), group(ROW_B, 1, 'B')],
      taskGroupMembers: [
        { taskUid: PLAIN_UID, groupId: ROW_A, stackOrder: null },
        { taskUid: MILESTONE_UID, groupId: ROW_B, stackOrder: null },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      pxPerDayAt1x: PX_PER_DAY_AT_1X,
      scrollDate: day(1),
      scrollGroupId: ROW_A,
      scrollDayOffset: 0,
      scrollGroupOffset: 0,
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  }
  return draft as unknown as Document
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

// see FR-011, T-019
const lastDayOf = (one: Task): string => dayPart(one.actualFinish ?? one.stop)

// see FR-011
const lengthOf = (one: Task): number => {
  const start = dayPart(one.actualStart)
  const last = lastDayOf(one)
  let count = 0
  for (let at = start; at <= last; at = nextCalendarDay(at)) {
    if (at === start || at === last || isWorkingDay(CALENDAR, dayValue(at))) count += 1
  }
  return count
}

// see FR-012
const planSpanOf = (one: Task): number => {
  let count = 0
  const finish = dayPart(one.finish)
  for (let at = dayPart(one.start); at < finish; at = nextCalendarDay(at)) {
    if (isWorkingDay(CALENDAR, dayValue(at))) count += 1
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

function host(): {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(): void
} {
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
      expect(waiting.length, 'the loop kept asking for animation frames with nothing to draw').toBe(
        0,
      )
    },
  }
}

function screenPane(language: DisplayLanguage = 'en'): ScreenWiring {
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  return { surface, language }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (
  phase: PointerPhase,
  x: number,
  y: number,
  options: { readonly button?: PointerButton } = {},
): PointerInput => ({
  kind: 'pointer',
  phase,
  button: options.button ?? 'left',
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

function boxOfBar(bar: BarGeometry | null, what: string): Box {
  if (bar === null) throw new Error(`${what} is not drawn`)
  const points: readonly Point[] =
    bar.form === 'outline'
      ? bar.points
      : [bar.from, bar.to, ...(bar.head ?? []), ...bar.dots.map((one) => one.at)]
  if (points.length === 0) throw new Error(`${what} came out with no points`)
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

// WHY: the release lands 0.4 day inside a column, away from the edge where a rounding either way changes the day.
function dragBy(built: Stage, at: Point, days: number): void {
  const width = pxPerDay(built.loop)
  const to = at.x + days * width + 0.4 * width
  built.send(pointer('down', at.x, at.y))
  built.send(pointer('move', to, at.y))
  built.send(pointer('up', to, at.y))
}

describe('表 T-023d -- the rows this file is driven by', () => {
  it('GR-5 still says `actualStart` changes and the last day stands still (MUST)', () => {
    expect(GR_5).toContain('`actualStart` を変える')
    expect(GR_5).toContain(GR_5_LAST_DAY_STANDS)
    expect(GR_5).toContain('`FR-011` が両端を動かさない定めを持っており')
  })

  it('GR-5 still forbids moving the actual bar bodily (MUST NOT)', () => {
    expect(GR_5).toContain('実績バーを平行移動させてはならない（MUST NOT）')
  })

  it('GR-5 still holds no length column of its own', () => {
    expect(GR_5).toContain(GR_5_NO_LENGTH_COLUMN)
  })

  it('GR-6 still changes the last day and leaves the values to FR-103', () => {
    expect(GR_6).toContain('実績の最後の日を変える')
    expect(GR_6).toContain('完了していれば `actualFinish`、それ以外は `stop`')
    expect(GR_6).toContain('置く値と据え置く値は `FR-103`')
  })

  it('GR-15 still moves `actualStart` and still says a milestone has no actual bar', () => {
    expect(GR_15).toContain('`actualStart` を動かす')
    expect(GR_15).toContain('マイルストーンは実績バーを持たない')
    expect(GR_15).toContain('`GR-5`')
    expect(GO_4_PUTS).toContain(GO_4_LAST_DAY)
  })
})

describe('the fixture these cases stand on', () => {
  it('is a `GRS JSON` document', () => {
    const report = validateDocument(fixtureDocument())
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
  })

  it('runs on a calendar that works Monday to Friday through the days these cases use', () => {
    const working: Record<string, boolean> = {}
    for (let d = 6; d <= 24; d += 1) working[day(d).slice(0, 10)] = isWorkingDay(CALENDAR, dayValue(day(d)))
    expect(working['2026-04-08']).toBe(true)
    expect(working['2026-04-09']).toBe(true)
    expect(working['2026-04-10']).toBe(true)
    expect(working['2026-04-11']).toBe(false)
    expect(working['2026-04-12']).toBe(false)
    expect(working['2026-04-13']).toBe(true)
    expect(working['2026-04-15']).toBe(true)
  })

  it("puts the plain Task's actual bar three days inside its plan bar, so GR-3 cannot outrank GR-5", () => {
    const built = stage()
    const gap = actualBox(built.loop, PLAIN_UID).x0 - planBox(built.loop, PLAIN_UID).x0
    expect(gap).toBeGreaterThan(2 * pxPerDay(built.loop))
    expect(dayUnder(built.loop, actualBox(built.loop, PLAIN_UID).x0 + 0.4 * pxPerDay(built.loop))).toBe(
      dayPart(PLAIN_ACTUAL_START),
    )
  })

  it('starts the plain Task at 進行中 (PA-2), with its last day in stop', () => {
    const built = stage()
    const before = taskOf(built.loop, PLAIN_UID)
    expect(before.actualFinish).toBeNull()
    expect(before.resume).toBeNull()
    expect(lastDayOf(before)).toBe('2026-04-14')
  })

  it('gives the milestone a last day on its actualStart, because S-130 makes it a point', () => {
    const built = stage()
    const milestone = taskOf(built.loop, MILESTONE_UID)
    expect(lastDayOf(milestone)).toBe(dayPart(milestone.actualStart))
    expect(MILESTONE_ACTUAL_DURATION).toBe(0)
  })
})

describe('表 T-023d GR-5 -- grabbing the actual bar left end', () => {
  it('leaves the last day exactly where it was, dragged to the right', () => {
    const built = stage()
    const before = taskOf(built.loop, PLAIN_UID)
    const endBefore = lastDayOf(before)

    dragBy(built, { x: actualBox(built.loop, PLAIN_UID).x0, y: midY(actualBox(built.loop, PLAIN_UID)) }, 2)

    const after = taskOf(built.loop, PLAIN_UID)
    expect(dayPart(after.actualStart), 'the end this case moved').not.toBe(dayPart(before.actualStart))
    expect(lastDayOf(after), GR_5_LAST_DAY_STANDS).toBe(endBefore)
    expect(lastDayOf(after)).toBe('2026-04-14')
  })

  it('counts the length again from a rest-day start, both end days included, dragged to the right', () => {
    const built = stage()
    const before = taskOf(built.loop, PLAIN_UID)

    dragBy(built, { x: actualBox(built.loop, PLAIN_UID).x0, y: midY(actualBox(built.loop, PLAIN_UID)) }, 2)

    const after = taskOf(built.loop, PLAIN_UID)
    expect(dayPart(after.actualStart)).toBe('2026-04-11')
    expect(dayPart(after.stop), 'GR-5 (MUST NOT): 実績バーを平行移動させてはならない').not.toBe(
      '2026-04-16',
    )
    expect(lengthOf(after), 'FR-011: Sat 11 counts as an end day, then Mon 13 and Tue 14').toBe(3)
    expect(lengthOf(after)).not.toBe(lengthOf(before))
  })

  it('does the same from the other side, dragged to the left', () => {
    const built = stage()
    const before = taskOf(built.loop, PLAIN_UID)
    const endBefore = lastDayOf(before)

    dragBy(built, { x: actualBox(built.loop, PLAIN_UID).x0, y: midY(actualBox(built.loop, PLAIN_UID)) }, -1)

    const after = taskOf(built.loop, PLAIN_UID)
    expect(dayPart(after.actualStart)).toBe('2026-04-08')
    expect(lengthOf(after), 'FR-011: Wed 8 to Tue 14').toBe(5)
    expect(lastDayOf(after), GR_5_LAST_DAY_STANDS).toBe(endBefore)
  })

  it('settles `actualStart` on the day the pointer was let go on, and does not shift it to a working day', () => {
    const built = stage()
    const at = { x: actualBox(built.loop, PLAIN_UID).x0, y: midY(actualBox(built.loop, PLAIN_UID)) }
    const width = pxPerDay(built.loop)
    const released = dayUnder(built.loop, at.x + 2 * width + 0.4 * width)

    dragBy(built, at, 2)

    expect(isWorkingDay(CALENDAR, dayValue(released)), 'the case really lands on a non-working day').toBe(
      false,
    )
    expect(dayPart(taskOf(built.loop, PLAIN_UID).actualStart)).toBe(released)
  })

  it('prices the length FR-011 counts from the new start into percentComplete (FR-012)', () => {
    const built = stage()

    dragBy(built, { x: actualBox(built.loop, PLAIN_UID).x0, y: midY(actualBox(built.loop, PLAIN_UID)) }, 2)

    const after = taskOf(built.loop, PLAIN_UID)
    expect(after.percentComplete).toBe(Math.round((lengthOf(after) / planSpanOf(after)) * 100))
  })

  it('moves no plan date and no other actual column (FR-011)', () => {
    const built = stage()
    const before = structuredClone(taskOf(built.loop, PLAIN_UID))

    dragBy(built, { x: actualBox(built.loop, PLAIN_UID).x0, y: midY(actualBox(built.loop, PLAIN_UID)) }, 2)

    const after = taskOf(built.loop, PLAIN_UID)
    expect(after.start).toBe(before.start)
    expect(after.finish).toBe(before.finish)
    expect(after.stop).toBe(before.stop)
    expect(after.actualFinish).toBe(before.actualFinish)
    expect(after.resume).toBe(before.resume)
  })

  it('draws the right end of the actual bar in the same place afterwards', () => {
    const built = stage()
    const width = pxPerDay(built.loop)
    const before = actualBox(built.loop, PLAIN_UID)

    dragBy(built, { x: before.x0, y: midY(before) }, 2)

    const after = actualBox(built.loop, PLAIN_UID)
    expect(after.x1, GR_5_LAST_DAY_STANDS).toBeCloseTo(before.x1, 6)
    expect(after.x0 - before.x0).toBeCloseTo(2 * width, 6)
  })
})

describe('表 T-023d GR-15 -- grabbing a milestone actual figure', () => {
  it('moves the held last day with `actualStart`, because a milestone is a point (GO-4)', () => {
    const built = stage()
    const before = taskOf(built.loop, MILESTONE_UID)

    dragBy(
      built,
      { x: midX(actualBox(built.loop, MILESTONE_UID)), y: midY(actualBox(built.loop, MILESTONE_UID)) },
      3,
    )

    const after = taskOf(built.loop, MILESTONE_UID)
    expect(dayPart(after.actualStart), 'GR-15: `actualStart` を動かす').not.toBe(
      dayPart(before.actualStart),
    )
    expect(lastDayOf(after), GO_4_LAST_DAY).toBe(
      dayPart(after.actualStart),
    )
  })

  it('moves the whole figure -- its day is the day the pointer was let go on', () => {
    const built = stage()
    const at = {
      x: midX(actualBox(built.loop, MILESTONE_UID)),
      y: midY(actualBox(built.loop, MILESTONE_UID)),
    }
    const width = pxPerDay(built.loop)
    const released = dayUnder(built.loop, at.x + 3 * width + 0.4 * width)

    dragBy(built, at, 3)

    expect(dayPart(taskOf(built.loop, MILESTONE_UID).actualStart)).toBe(released)
  })

  it('leaves the plan milestone where it stands (FR-011)', () => {
    const built = stage()
    const before = structuredClone(taskOf(built.loop, MILESTONE_UID))

    dragBy(
      built,
      { x: midX(actualBox(built.loop, MILESTONE_UID)), y: midY(actualBox(built.loop, MILESTONE_UID)) },
      3,
    )

    const after = taskOf(built.loop, MILESTONE_UID)
    expect(after.start).toBe(before.start)
    expect(after.finish).toBe(before.finish)
    expect(after.milestone).toBe(true)
    expect(compareDays(dayValue(dayPart(after.start)), dayValue(dayPart(after.actualStart)))).toBeLessThan(
      0,
    )
  })
})

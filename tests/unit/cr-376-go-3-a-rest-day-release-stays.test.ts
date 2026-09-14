// CR-376 / GO-3: releasing the actual end on a rest day stores that rest day as the last day.

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
import type { BarGeometry, Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { dateAtX } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { specTable } from '../contract/spec-table'

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const ROW_A = '5c000000-0000-4000-8000-000000000001'
const ROW_B = '5c000000-0000-4000-8000-000000000002'
const RUNNING_UID = 1
const FINISHED_UID = 2

const day = (d: number): string => `2026-04-${String(d).padStart(2, '0')}T00:00:00`
const dayPart = (value: string | null | undefined): string | null =>
  value === null || value === undefined ? null : value.slice(0, 10)

const S_91 = NOT_STORED_SIZES['S-91']

const task = (over: Record<string, unknown> & { readonly uid: number }): Task =>
  ({
    wbsParentUid: null,
    wbsOrder: over.uid,
    name: null,
    start: day(6),
    finish: day(24),
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
  }) as unknown as Task

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
  const template = structuredClone(TEMPLATE)
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...template.schedule.project, uidHighWaterMark: 100, statusDate: null },
      calendars: template.schedule.calendars,
      tasks: [
        task({ uid: RUNNING_UID, name: 'Running', actualStart: day(9), stop: day(14), resumeValid: true }),
        task({ uid: FINISHED_UID, name: 'Finished', actualStart: day(9), actualFinish: day(14), resumeValid: false }),
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
      ...template.documentSettings,
      pxPerDayAt1x: 20,
      scrollDate: day(1),
      scrollGroupId: ROW_A,
      scrollDayOffset: 0,
      scrollGroupOffset: 0,
    },
    documentStamp: template.documentStamp,
    changeLog: [],
  } as unknown as Document
}

const CALENDAR = workingCalendarOf(fixtureDocument().schedule)

const dayValue = (text: string): CalendarDay => {
  const value = dayOf(text)
  if (value === null) throw new Error(`${text} is not a day`)
  return value
}

const SCREEN: FrameEnvironment = { width: 1200, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }
const realRaf = (globalThis as any).requestAnimationFrame

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

function stage(): { readonly loop: FrameLoop; send(input: HumanInput): void } {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  const run = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  const wiring: ScreenWiring = { surface, language: 'en' }
  const loop = frameLoop({ showSvg: () => undefined } as any, fixtureDocument(), SCREEN, wiring)
  run()
  return {
    loop,
    send: (input: HumanInput) => {
      loop.receiveInput(input)
      run()
    },
  }
}

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

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

const taskIn = (loop: FrameLoop, uid: number): Task => {
  const found = loop.document().schedule.tasks.find((one) => one.uid === uid)
  if (found === undefined) throw new Error(`the document has no Task ${uid}`)
  return found
}

const actualBox = (loop: FrameLoop, uid: number): { x1: number; y: number } => {
  const drawn = frameOf(loop).geometry.tasks.find((one) => one.taskUid === uid)
  const bar: BarGeometry | null | undefined = drawn?.actual
  if (bar === null || bar === undefined) throw new Error(`Task ${uid}'s actual figure is not drawn`)
  const points: readonly Point[] =
    bar.form === 'outline' ? bar.points : [bar.from, bar.to, ...(bar.head ?? []), ...bar.dots.map((one) => one.at)]
  const ys = points.map((one) => one.y)
  return { x1: Math.max(...points.map((one) => one.x)), y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

const dayUnder = (loop: FrameLoop, x: number): string => {
  const found = dateAtX(frameOf(loop).layout, x)
  if (found === null) throw new Error('no time axis under that point')
  return textOfDay(found).slice(0, 10)
}

// see GR-6, GO-3
function releasedOn(uid: number, target: string): { readonly released: string; readonly before: Task; readonly after: Task } {
  const built = stage()
  const before = structuredClone(taskIn(built.loop, uid))
  const box = actualBox(built.loop, uid)
  const px = frameOf(built.loop).layout.pxPerDay
  let releaseX = box.x1 + px / 2
  while (dayUnder(built.loop, releaseX) > target) releaseX -= px
  while (dayUnder(built.loop, releaseX) < target) releaseX += px
  const released = dayUnder(built.loop, releaseX)
  built.send(pointer('down', box.x1 - S_91 / 2, box.y))
  built.send(pointer('move', releaseX, box.y))
  built.send(pointer('up', releaseX, box.y))
  return { released, before, after: taskIn(built.loop, uid) }
}

describe('GO-3 premises', () => {
  it('GO-3 names stop and actualFinish, and the fixture calendar rests on Saturday 11 and 18', () => {
    const cell = specTable('T-245').rows.find((one) => one.id === 'GO-3')?.by['置く値'] ?? ''
    expect(cell).toContain('`stop`')
    expect(cell).toContain('`actualFinish`')
    expect(isWorkingDay(CALENDAR, dayValue('2026-04-10'))).toBe(true)
    expect(isWorkingDay(CALENDAR, dayValue('2026-04-11'))).toBe(false)
    expect(isWorkingDay(CALENDAR, dayValue('2026-04-18'))).toBe(false)
  })
})

describe('GO-3: a rest day released as the last day stays that day (JDG-67)', () => {
  it('running, released on Saturday 18: stop is Saturday 18, actualStart kept, still not finished', () => {
    const { released, before, after } = releasedOn(RUNNING_UID, '2026-04-18')
    expect(released).toBe('2026-04-18')
    expect(dayPart(after.stop)).toBe('2026-04-18')
    expect(after.actualFinish).toBeNull()
    expect(after.actualStart).toBe(before.actualStart)
  })

  it('finished, released on Saturday 11: actualFinish is Saturday 11 and stop stays empty', () => {
    const { released, before, after } = releasedOn(FINISHED_UID, '2026-04-11')
    expect(released).toBe('2026-04-11')
    expect(dayPart(after.actualFinish)).toBe('2026-04-11')
    expect(after.stop).toBeNull()
    expect(after.actualStart).toBe(before.actualStart)
  })

  it('running, released on its own start day: stop equals actualStart (one day, not refused)', () => {
    const { after } = releasedOn(RUNNING_UID, '2026-04-09')
    expect(dayPart(after.stop)).toBe('2026-04-09')
    expect(dayPart(after.actualStart)).toBe('2026-04-09')
  })
})

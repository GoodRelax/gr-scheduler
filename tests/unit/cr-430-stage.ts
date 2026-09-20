// CR-430: one document and one frame loop the press-and-drag cases drive.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type {
  HumanInput,
  InputModifiers,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { dayOf, textOfDay, type Task } from '../../src/entity/document-model/schedule/schedule'
import type { Point, ScheduleGeometry, TaskGeometry } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { dateAtX, type ScheduleLayout } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { boxOfBar, midY, type Box } from './cr-430-bench'

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, unknown>

export const BAR_UID = 1
export const MILESTONE_UID = 2
export const FRESH_UID = 3
export const FRESH_MILESTONE_UID = 4
export const PAUSED_UID = 5
export const DONE_UID = 6
export const ARROW_UID = 7
export const FADED_UID = 8
export const WIDE_UID = 9
export const FRESH_ARROW_UID = 10

export const PX_PER_DAY_AT_1X = 20

/** @purity pure */
export function april(dayOfMonth: number): string {
  return `2026-04-${String(dayOfMonth).padStart(2, '0')}T00:00:00`
}

/** @purity pure */
export function dayPart(value: string | null | undefined): string | null {
  return value === null || value === undefined ? null : value.slice(0, 10)
}

/** @purity pure */
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

/** @purity pure */
function group(id: string, order: number): unknown {
  return {
    id,
    parentId: null,
    label: `row ${String(order)}`,
    derivedFromTaskUid: null,
    order,
    isCollapsed: false,
    isHidden: false,
    isKeptOpen: false,
    color: null,
    height: null,
  }
}

const SHAPES: Readonly<Record<number, string>> = {
  [MILESTONE_UID]: 'milestone',
  [FRESH_MILESTONE_UID]: 'milestone',
  [ARROW_UID]: 'arrow',
  [FRESH_ARROW_UID]: 'arrow',
}

const LONG_NAME = 'Alpha that will not fit inside its own actual'

// see T-019
/** @purity pure */
function benchTasks(): readonly Task[] {
  return [
    task({ uid: BAR_UID, name: LONG_NAME, start: april(6), finish: april(24), actualStart: april(8), stop: april(10), resumeValid: true, percentComplete: 29 }),
    task({ uid: MILESTONE_UID, name: 'B', start: april(13), finish: april(13), milestone: true, actualStart: april(17), stop: april(17), resumeValid: true }),
    task({ uid: FRESH_UID, name: LONG_NAME, start: april(6), finish: april(24), dependencies: [{ predecessorUid: BAR_UID, linkType: 1, lag: 0, lagFormat: 7, carry: {}, carryElements: [] }] }),
    task({ uid: FRESH_MILESTONE_UID, name: 'D', start: april(13), finish: april(13), milestone: true }),
    task({ uid: PAUSED_UID, name: LONG_NAME, start: april(6), finish: april(24), actualStart: april(8), stop: april(10), resume: april(20), resumeValid: true }),
    task({ uid: DONE_UID, name: 'F', start: april(6), finish: april(24), actualStart: april(8), actualFinish: april(14), resumeValid: false }),
    task({ uid: ARROW_UID, name: 'G', start: april(6), finish: april(24), actualStart: april(8), stop: april(14), resumeValid: true }),
    task({ uid: FADED_UID, name: 'H', start: april(6), finish: april(24), fadeInDays: 3, fadeOutDays: 3 }),
    task({ uid: WIDE_UID, name: 'I', start: april(2), finish: april(28), actualStart: april(3), stop: april(26), resumeValid: true }),
    task({ uid: FRESH_ARROW_UID, name: 'J', start: april(6), finish: april(24) }),
  ]
}

/** @purity pure */
export function benchDocument(settings: Record<string, unknown> = {}): Document {
  const template = structuredClone(TEMPLATE) as Record<string, any>
  const tasks = benchTasks()
  const rows = tasks.map((one) => `5a000000-0000-4000-8000-${String(one.uid).padStart(12, '0')}`)
  return {
    schemaVersion: template['schemaVersion'],
    schedule: {
      project: { ...structuredClone(template['schedule'].project), uidHighWaterMark: 100, statusDate: null },
      calendars: structuredClone(template['schedule'].calendars),
      tasks,
      resources: [],
      assignments: [],
      taskGroups: rows.map((id, index) => group(id, index)),
      taskGroupMembers: tasks.map((one, index) => ({ taskUid: one.uid, groupId: rows[index], stackOrder: null })),
      taskVisuals: tasks.flatMap((one) =>
        SHAPES[one.uid] === undefined ? [] : [{ taskUid: one.uid, shapeKind: SHAPES[one.uid] }],
      ),
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template['documentSettings']),
      pxPerDayAt1x: PX_PER_DAY_AT_1X,
      scrollDate: april(1),
      scrollGroupId: rows[0],
      scrollDayOffset: 0,
      scrollGroupOffset: 0,
      ...settings,
    },
    documentStamp: structuredClone(template['documentStamp']),
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = { width: 1400, height: 900, appHeaderHeight: 0, scrollbarThickness: 0 }

const REAL_RAF = (globalThis as Record<string, unknown>)['requestAnimationFrame']

/** @purity non-pure */
export function restoreAnimationFrames(): void {
  if (REAL_RAF === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = REAL_RAF
}

export const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

/** @purity pure */
export function pointer(
  phase: PointerPhase,
  x: number,
  y: number,
  modifiers: InputModifiers = NO_MODIFIERS,
  button: PointerButton = 'left',
): PointerInput {
  return { kind: 'pointer', phase, button, x, y, modifiers: { ...modifiers }, clickCount: 1 }
}

export interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  shown(): readonly string[]
}

/** @purity non-pure */
export function stage(document: Document): Stage {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number => {
    waiting.push(callback)
    handle += 1
    return handle
  }
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const shapes: string[] = []
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  const wiring: ScreenWiring = { surface, language: 'en' }
  const loop = frameLoop(
    { showSvg: () => undefined } as never,
    document,
    SCREEN,
    wiring,
    undefined,
    ((shape: unknown) => void shapes.push(typeof shape === 'string' ? shape : String(shape))) as never,
  )
  drain()
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      drain()
    },
    shown: () => shapes,
  }
}

/** @purity pure */
export function frameOf(loop: FrameLoop): { geometry: ScheduleGeometry; pxPerDay: number; rowArea: Box; ruler: Box } {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  const boxOf = (rect: { x: number; y: number; width: number; height: number }): Box => ({
    x0: rect.x,
    x1: rect.x + rect.width,
    y0: rect.y,
    y1: rect.y + rect.height,
  })
  return {
    geometry: values.geometry,
    pxPerDay: values.layout.pxPerDay,
    rowArea: boxOf(values.regions.rowArea),
    ruler: boxOf(values.regions.timeRuler),
  }
}

/** @purity pure */
export function taskIn(loop: FrameLoop, uid: number): Task {
  const found = loop.document().schedule.tasks.find((one) => one.uid === uid)
  if (found === undefined) throw new Error(`the document has no Task ${String(uid)}`)
  return found
}

/** @purity pure */
export function drawnTask(loop: FrameLoop, uid: number): TaskGeometry {
  const found = frameOf(loop).geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`Task ${String(uid)} is not in this frame`)
  return found
}

/** @purity pure */
export function planBox(loop: FrameLoop, uid: number): Box {
  return boxOfBar(drawnTask(loop, uid).plan, `Task ${String(uid)} plan`)
}

/** @purity pure */
export function actualBox(loop: FrameLoop, uid: number): Box {
  return boxOfBar(drawnTask(loop, uid).actual, `Task ${String(uid)} actual`)
}

/** @purity pure */
function layoutOf(loop: FrameLoop): ScheduleLayout {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values.layout
}

/** @purity pure */
export function dayUnder(loop: FrameLoop, x: number): string {
  const found = dateAtX(layoutOf(loop), x)
  if (found === null) throw new Error('the frame drew no time axis under that point')
  const text = dayPart(textOfDay(found))
  if (text === null) throw new Error('the day under that point has no text')
  return text
}

// WHY: the middle of the day column, so a released point cannot fall into the
// WHY: next day when the column edge moves with the zoom.
/** @purity pure */
export function xOfDay(loop: FrameLoop, isoDay: string): number {
  if (dayOf(isoDay) === null) throw new Error(`${isoDay} is not a day`)
  const wanted = isoDay.slice(0, 10)
  const { rowArea, pxPerDay } = frameOf(loop)
  const step = Math.max(pxPerDay / 16, 0.25)
  let first: number | null = null
  let last: number | null = null
  for (let x = rowArea.x0 + step; x <= rowArea.x1; x += step) {
    if (dayUnder(loop, x) !== wanted) continue
    if (first === null) first = x
    last = x
  }
  if (first === null || last === null) throw new Error(`${isoDay} is not on the screen`)
  return (first + last) / 2
}

/** @purity non-pure */
export function pressAndRelease(built: Stage, at: Point): void {
  built.send(pointer('down', at.x, at.y))
  built.send(pointer('up', at.x, at.y))
}

// see IN-1
/** @purity non-pure */
export function dragTo(built: Stage, at: Point, toX: number, toY: number = at.y): void {
  built.send(pointer('down', at.x, at.y))
  built.send(pointer('move', toX, toY))
  built.send(pointer('up', toX, toY))
}

export { midY }

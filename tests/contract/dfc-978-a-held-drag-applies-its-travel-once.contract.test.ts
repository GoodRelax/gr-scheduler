// Guard cases for DFC-978: the picture of a held grab applies the pointer's travel to the held document once.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { IconId, ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type { Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import { frameLoop, type FrameEnvironment, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { specTable } from './spec-table'

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const TASK_UID = 1
const ROW_ID = 'g1'
const PX_PER_DAY = 20
const TOLERANCE_PX = 1
const DAYS_RIGHT_OF_THE_BAR = 6.5
const FIRST_TRAVEL_DAYS = 1
const SECOND_TRAVEL_DAYS = 2

// WHY: the press lands mid-day on a Tuesday after this finish, so both travels
// stay on weekdays and no rest-day rule takes part in the held picture.
const PLAN_START = '2026-04-06'
const PLAN_FINISH = '2026-04-14'

const oneTaskDocument = (): Document =>
  ({
    '$schema': TEMPLATE['$schema'],
    schemaVersion: TEMPLATE.schemaVersion,
    schedule: {
      project: { ...structuredClone(TEMPLATE.schedule.project), uidHighWaterMark: 100, statusDate: null },
      calendars: structuredClone(TEMPLATE.schedule.calendars),
      tasks: [
        {
          uid: TASK_UID, wbsParentUid: null, wbsOrder: 1, name: 'held', start: PLAN_START, finish: PLAN_FINISH,
          milestone: false, deadline: null, notes: null, calendarUid: null, actualStart: null, stop: null,
          actualFinish: null, resume: null, resumeValid: null, percentComplete: 0, fadeInDays: null,
          fadeOutDays: null, dependencies: [], carry: {}, carryElements: [],
        } as unknown as Task,
      ],
      resources: [],
      assignments: [],
      taskGroups: [
        {
          id: ROW_ID, parentId: null, label: 'row', derivedFromTaskUid: null, order: 0,
          treeState: 'auto', editGroup: null, color: null, minHeight: null,
        },
      ],
      taskGroupMembers: [{ taskUid: TASK_UID, groupId: ROW_ID }],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(TEMPLATE.documentSettings),
      scrollDate: '2026-04-01T00:00:00',
      scrollGroupId: ROW_ID,
      zoomX: PX_PER_DAY / SETTINGS_CONSTANTS.pxPerDayAt1x,
    },
    documentStamp: structuredClone(TEMPLATE.documentStamp),
    changeLog: [],
  }) as unknown as Document

const SCREEN: FrameEnvironment = { width: 1200, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }
const PALETTE_BOX: ScreenRect = { x: 8, y: SCREEN.height - 56, width: 120, height: 48 }

// see AR-2, T-109
const TASK_SHAPE_ARMING_ENTRY: IconId = ((): string => {
  const found = specTable('T-109').rows.find((one) => (one.by['構え'] ?? '').includes('AR-2'))
  if (found === undefined) throw new Error('table T-109 has no entry whose arming is AR-2')
  return found.id
})()

const inside = (box: ScreenRect, at: Point): boolean =>
  at.x >= box.x && at.x < box.x + box.width && at.y >= box.y && at.y < box.y + box.height
const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

const pointer = (phase: PointerPhase, at: Point): PointerInput => ({
  kind: 'pointer', phase, button: 'left', x: at.x, y: at.y, modifiers: NO_MODIFIERS, clickCount: 1,
})

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
}

const stage = (): Stage => {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: (x, y): ScreenPart | null =>
      inside(PALETTE_BOX, { x, y })
        ? ({
            part: 'Command Palette', entry: TASK_SHAPE_ARMING_ENTRY, format: null, rowGroupId: null,
            resourceUid: null, dividerPanel: null, noticeDismissKey: null,
          } as ScreenPart)
        : null,
  }
  const loop = frameLoop({ showSvg: () => undefined } as never, oneTaskDocument(), SCREEN, { surface, language: 'en' })
  drain()
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      drain()
    },
  }
}

interface PlanEnds {
  readonly left: number
  readonly right: number
  readonly y: number
}

const planEnds = (loop: FrameLoop): PlanEnds => {
  const plan = loop.current()?.geometry.tasks.find((one) => one.taskUid === TASK_UID)?.plan
  if (plan === null || plan === undefined) throw new Error('the task drew no plan bar')
  const points = plan.form === 'outline' ? plan.points : [plan.from, plan.to]
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  return { left: Math.min(...xs), right: Math.max(...xs), y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

const dayWidthOf = (loop: FrameLoop): number => (loop.current()?.layout as unknown as { pxPerDay: number }).pxPerDay

const armTaskShape = (built: Stage): void => {
  const at = { x: PALETTE_BOX.x + PALETTE_BOX.width / 2, y: PALETTE_BOX.y + PALETTE_BOX.height / 2 }
  built.send(pointer('down', at))
  built.send(pointer('up', at))
}

const newTaskRightEnd = (loop: FrameLoop): number => {
  const plan = loop.current()?.geometry.tasks.find((one) => one.taskUid !== TASK_UID)?.plan
  if (plan === null || plan === undefined) throw new Error('the held picture drew no new Task')
  const points = plan.form === 'outline' ? plan.points : [plan.from, plan.to]
  return Math.max(...points.map((one) => one.x))
}

const drawnTaskCount = (loop: FrameLoop): number => loop.current()?.geometry.tasks.length ?? 0

describe('DFC-978 / T-023d, PTD-4, IN-1 -- every move of one held press draws from the held document', () => {
  it('PTD-4 with AR-2: after two moves the held picture holds one new Task, not one per move', () => {
    const built = stage()
    armTaskShape(built)
    const ends = planEnds(built.loop)
    const day = dayWidthOf(built.loop)
    const pressAt = { x: ends.right + DAYS_RIGHT_OF_THE_BAR * day, y: ends.y }
    const held = built.loop.document().schedule.tasks.length
    // STEP: press on an empty place of the row, then move one day and two days away from the press
    built.send(pointer('down', pressAt))
    built.send(pointer('move', { x: pressAt.x + FIRST_TRAVEL_DAYS * day, y: pressAt.y }))
    expect(drawnTaskCount(built.loop), 'premise: the first move draws the Task a release would make').toBe(held + 1)
    built.send(pointer('move', { x: pressAt.x + SECOND_TRAVEL_DAYS * day, y: pressAt.y }))
    expect(drawnTaskCount(built.loop), 'T-023d: the second move redraws that one Task').toBe(held + 1)
    expect(built.loop.document().schedule.tasks.length, 'IN-1: nothing is written while held').toBe(held)
  })

  it('PTD-4 with AR-2: the held new Task ends at the day of the latest move', () => {
    const built = stage()
    armTaskShape(built)
    const ends = planEnds(built.loop)
    const day = dayWidthOf(built.loop)
    const pressAt = { x: ends.right + DAYS_RIGHT_OF_THE_BAR * day, y: ends.y }
    built.send(pointer('down', pressAt))
    built.send(pointer('move', { x: pressAt.x + FIRST_TRAVEL_DAYS * day, y: pressAt.y }))
    const first = newTaskRightEnd(built.loop)
    built.send(pointer('move', { x: pressAt.x + SECOND_TRAVEL_DAYS * day, y: pressAt.y }))
    const second = newTaskRightEnd(built.loop)
    expect(Math.abs(second - first - (SECOND_TRAVEL_DAYS - FIRST_TRAVEL_DAYS) * day), 'T-023d: travel applied once')
      .toBeLessThanOrEqual(TOLERANCE_PX)
  })
})

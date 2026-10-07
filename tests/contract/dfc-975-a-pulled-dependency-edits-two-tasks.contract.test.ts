// Guard cases for DFC-975: each move of a pulled dependency line edits a two-Task copy, never the whole document.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

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

const edited = vi.hoisted(() => ({ taskCounts: [] as number[] }))

// WHY: NFR-002 is about how much one move edits, which no picture shows;
// the createDependency edits are counted where they are made.
vi.mock('../../src/use-case/edit-document/edit-document', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/use-case/edit-document/edit-document')>()
  return {
    ...real,
    editDocument: (...given: Parameters<typeof real.editDocument>) => {
      if (given[1].kind === 'createDependency') edited.taskCounts.push(given[0].schedule.tasks.length)
      return real.editDocument(...given)
    },
  }
})

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

// see PTD-3, FR-009
const PAIR = 2
const OTHER_TASKS = 12
const UID_A = 1
const UID_B = 2
const PX_PER_DAY = 20
const DAYS_RIGHT_OF_B = 4
// see AT-46
const FINISH_TO_START = 1

const task = (uid: number, start: string, finish: string, dependencies: readonly unknown[] = []): Task =>
  ({
    uid, wbsParentUid: null, wbsOrder: uid, name: `T${uid}`, start, finish, milestone: false, deadline: null,
    notes: null, calendarUid: null, actualStart: null, stop: null, actualFinish: null, resume: null,
    resumeValid: null, percentComplete: 0, fadeInDays: null, fadeOutDays: null, dependencies, carry: {},
    carryElements: [],
  }) as unknown as Task

const rowIdOf = (uid: number): string => `row-${uid}`

// WHY: the other Tasks sit below A and B and hold a dependency of their own,
// so a whole-document edit would carry more than the pair and more than one line.
const fixtureDocument = (): Document => {
  const template = structuredClone(TEMPLATE)
  const others = Array.from({ length: OTHER_TASKS }, (_one, at) => UID_B + 1 + at)
  const firstOther = others[0] as number
  const tasks = [
    task(UID_A, '2026-04-06', '2026-04-10'),
    task(UID_B, '2026-04-20', '2026-04-24'),
    ...others.map((uid) =>
      task(uid, '2026-04-06', '2026-04-10', uid === firstOther + 1 ? [{ predecessorUid: firstOther, linkType: FINISH_TO_START, lag: null, lagFormat: null, carry: {}, carryElements: [] }] : []),
    ),
  ]
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...template.schedule.project, uidHighWaterMark: 100, statusDate: null },
      calendars: template.schedule.calendars,
      tasks,
      resources: [],
      assignments: [],
      taskGroups: tasks.map((one, order) => ({
        id: rowIdOf(one.uid), parentId: null, label: `row ${order}`, derivedFromTaskUid: null, order,
        treeState: 'auto', color: null, minHeight: null,
      })),
      taskGroupMembers: tasks.map((one) => ({ taskUid: one.uid, groupId: rowIdOf(one.uid) })),
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...template.documentSettings,
      zoomX: PX_PER_DAY / SETTINGS_CONSTANTS.pxPerDayAt1x,
      dependencyVisible: true,
      progressLineVisible: false,
    },
    documentStamp: template.documentStamp,
    changeLog: [],
  } as unknown as Document
}

// see AR-4, T-109
const DEPENDENCY_ARMING_ENTRY: IconId = ((): string => {
  const found = specTable('T-109').rows.find((one) => (one.by['構え'] ?? '').includes('AR-4'))
  if (found === undefined) throw new Error('table T-109 has no entry whose arming is AR-4')
  return found.id
})()

const SCREEN: FrameEnvironment = { width: 1200, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }
const PALETTE_BOX: ScreenRect = { x: 8, y: SCREEN.height - 56, width: 120, height: 48 }
const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

const inside = (box: ScreenRect, at: Point): boolean =>
  at.x >= box.x && at.x < box.x + box.width && at.y >= box.y && at.y < box.y + box.height

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
            part: 'Command Palette', entry: DEPENDENCY_ARMING_ENTRY, format: null, rowGroupId: null,
            resourceUid: null, dividerPanel: null, noticeDismissKey: null,
          } as ScreenPart)
        : null,
  }
  const loop = frameLoop({ showSvg: () => undefined } as never, fixtureDocument(), SCREEN, { surface, language: 'en' })
  drain()
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      drain()
    },
  }
}

const planBox = (loop: FrameLoop, uid: number): ScreenRect => {
  const plan = loop.current()?.geometry.tasks.find((one) => one.taskUid === uid)?.plan
  if (plan === null || plan === undefined) throw new Error(`Task ${uid} drew no plan bar`)
  const points = plan.form === 'outline' ? plan.points : [plan.from, plan.to]
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

// see FR-009
const finishHalf = (box: ScreenRect): Point => ({ x: box.x + box.width * 0.75, y: box.y + box.height / 2 })
const startHalf = (box: ScreenRect): Point => ({ x: box.x + box.width * 0.25, y: box.y + box.height / 2 })

const arm = (built: Stage): void => {
  const at = { x: PALETTE_BOX.x + PALETTE_BOX.width / 2, y: PALETTE_BOX.y + PALETTE_BOX.height / 2 }
  built.send(pointer('down', at))
  built.send(pointer('up', at))
}

describe('DFC-975 / NFR-002, FR-009, PTD-3 -- a pulled dependency line is drawn from a copy of two Tasks', () => {
  it('every move, over nothing and over a partner, edits a document of the pulled Task and one other', () => {
    const built = stage()
    arm(built)
    const b = planBox(built.loop, UID_B)
    const overNothing = { x: b.x + b.width + DAYS_RIGHT_OF_B * PX_PER_DAY, y: finishHalf(planBox(built.loop, UID_A)).y }
    // STEP: press A's finish half, then move over nothing and over B's start half
    built.send(pointer('down', finishHalf(planBox(built.loop, UID_A))))
    edited.taskCounts.length = 0
    built.send(pointer('move', overNothing))
    built.send(pointer('move', startHalf(b)))
    expect(edited.taskCounts.length, 'premise: each move drew the draft line FR-009 asks for').toBeGreaterThan(0)
    expect(edited.taskCounts.every((count) => count === PAIR), `NFR-002: counts ${JSON.stringify(edited.taskCounts)}`)
      .toBe(true)
  })

  it('premise: the document behind the draft holds more Tasks than the pair', () => {
    expect(stage().loop.document().schedule.tasks.length).toBeGreaterThan(PAIR)
  })
})

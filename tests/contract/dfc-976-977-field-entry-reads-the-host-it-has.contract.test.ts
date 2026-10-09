// Guard cases for DFC-976 and DFC-977: the field-entry state follows the host's focus seam and its edit notices.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { FieldEditNotice, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type { Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { isFieldFocusWanted } from '../../src/framework/single-html-shell/field-entry'

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const TASK_UID = 1
const ROW_ID = 'g1'
const PX_PER_DAY = 20
// see PR-1
const NAME_FIELD_ROW = 'PR-1'
// see SK-14
const PALETTE_KEY = 'P'

const oneTaskDocument = (): Document =>
  ({
    '$schema': TEMPLATE['$schema'],
    schemaVersion: TEMPLATE.schemaVersion,
    schedule: {
      project: { ...structuredClone(TEMPLATE.schedule.project), uidHighWaterMark: 100, statusDate: null },
      calendars: structuredClone(TEMPLATE.schedule.calendars),
      tasks: [
        {
          uid: TASK_UID, parentTaskUid: null, wbsOrder: 1, name: 'named', start: '2026-04-06', finish: '2026-04-14',
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
const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

const key = (which: string): KeyInput => ({ kind: 'key', key: which, modifiers: NO_MODIFIERS })
const pointer = (phase: PointerPhase, at: Point, clickCount = 1): PointerInput => ({
  kind: 'pointer', phase, button: 'left', x: at.x, y: at.y, modifiers: NO_MODIFIERS, clickCount,
})

interface Bench {
  readonly loop: FrameLoop
  readonly notices: FieldEditNotice[]
  send(input: HumanInput): void
  last(): ScreenView
}

const bench = (focusPropertyField?: ScreenWiring['focusPropertyField']): Bench => {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const views: ScreenView[] = []
  const notices: FieldEditNotice[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => void views.push(view),
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: () => null,
    readFieldEditNotices: () => notices.splice(0, notices.length),
  }
  const wiring: ScreenWiring = focusPropertyField === undefined
    ? { surface, language: 'en' }
    : { surface, language: 'en', focusPropertyField }
  const loop = frameLoop({ showSvg: () => undefined } as never, oneTaskDocument(), SCREEN, wiring)
  drain()
  return {
    loop,
    notices,
    send: (input) => {
      loop.receiveInput(input)
      drain()
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the loop described no screen')
      return view
    },
  }
}

const bodyOfTheBar = (loop: FrameLoop): Point => {
  const plan = loop.current()?.geometry.tasks.find((one) => one.taskUid === TASK_UID)?.plan
  if (plan === null || plan === undefined || plan.form !== 'outline') throw new Error('the task drew no plan outline')
  const xs = plan.points.map((one) => one.x)
  const ys = plan.points.map((one) => one.y)
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

const doubleClickTheTask = (built: Bench): void => {
  const at = bodyOfTheBar(built.loop)
  built.send(pointer('down', at))
  built.send(pointer('up', at))
  built.send(pointer('down', at, 2))
  built.send(pointer('up', at, 2))
}

const paletteIsUp = (built: Bench): boolean => built.last().commandPalette !== null

// WHY: the seam's own hands, cut to the two it reads: the session's field-entry
// state and the host's screen wiring.
const handsWanting = (screen: Partial<ScreenWiring> | undefined): Parameters<typeof isFieldFocusWanted>[0] =>
  ({
    readSession: () => ({ fieldEntry: { fieldEditState: { kind: 'fieldFocusWanted', fieldRow: NAME_FIELD_ROW } } }),
    screen,
  }) as never

describe('DFC-976 / IN-5a, IN-5b, MK-13 -- a host with no focus seam never holds the single-character keys', () => {
  it('isFieldFocusWanted: a want on a host without focusPropertyField is no want', () => {
    expect(isFieldFocusWanted(handsWanting({ surface: {} as ScreenSurface }))).toBe(false)
    expect(isFieldFocusWanted(handsWanting(undefined))).toBe(false)
  })

  it('premise: the same want on a host with focusPropertyField is a want', () => {
    expect(isFieldFocusWanted(handsWanting({ surface: {} as ScreenSurface, focusPropertyField: () => false }))).toBe(true)
  })

  it('MK-13 on a host without the seam: the panel is raised, and P still toggles the palette (SK-14)', () => {
    const built = bench()
    doubleClickTheTask(built)
    expect(built.last().propertiesPanel, 'premise: MK-13 raised the panel').not.toBeNull()
    const before = paletteIsUp(built)
    built.send(key(PALETTE_KEY))
    expect(paletteIsUp(built), 'IN-5a: no field can take the key, so it stays a shortcut').toBe(!before)
  })

  it('premise: MK-13 on a host whose seam never takes the focus holds P back (IN-5a)', () => {
    const built = bench(() => false)
    doubleClickTheTask(built)
    const before = paletteIsUp(built)
    built.send(key(PALETTE_KEY))
    expect(paletteIsUp(built)).toBe(before)
  })
})

describe('DFC-977 / IF-9, T-292, AG-9 -- the edit notices are read before the edit state is', () => {
  it('a began notice the surface holds is in the state the next reading answers, with no input between', () => {
    const built = bench()
    expect(built.loop.agentApiSeams().source.readSnapshot().isEditingInPlace, 'premise: no edit stands').toBe(false)
    built.notices.push({ kind: 'began', row: NAME_FIELD_ROW })
    expect(built.loop.agentApiSeams().source.readSnapshot().isEditingInPlace, 'IF-9: the began notice is read first')
      .toBe(true)
  })

  it('an ended notice the surface holds is in the state the next reading answers', () => {
    const built = bench()
    built.notices.push({ kind: 'began', row: NAME_FIELD_ROW })
    // STEP: an input carries the began notice in, then the field ends with no input after it
    built.send(pointer('move', bodyOfTheBar(built.loop)))
    expect(built.loop.agentApiSeams().source.readSnapshot().isEditingInPlace, 'premise: the edit stands').toBe(true)
    built.notices.push({ kind: 'ended', row: NAME_FIELD_ROW })
    expect(built.loop.agentApiSeams().source.readSnapshot().isEditingInPlace, 'IF-9: the ended notice is read first')
      .toBe(false)
  })
})

// CR-560: a Ctrl-only drag begun on a selected Task's body copies the selection; every copy is unstarted.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  commandFromInput,
  pressRowOf,
  type HumanInput,
  type InputContext,
  type InputModifiers,
  type KeyInput,
  type PointerButton,
  type PointerInput,
  type PointerPhase,
  type PointerPress,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type { Selection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer, type Hit } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import type { BarGeometry, Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import type { RowPlacement } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { frameLoop, type FrameEnvironment, type FrameLoop, type ScreenWiring } from '../../src/framework/single-html-shell/frame-loop'
import { pointerImageOf, type PointerShape } from '../../src/framework/single-html-shell/pointer-shape'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  editDocument,
  NOT_STORED_ZOOM_BOUNDS,
  pastedUidsOf,
  type DocumentCommand,
  type SettingsLimits,
} from '../../src/use-case/edit-document/edit-document'
import { specTable, unbroken } from '../contract/spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const GLOSSARY = readFileSync(join(SPEC, '_assets', 'tbl-glossary.md'), 'utf8')

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const cellsOf = (table: string, id: string): string => rowOf(table, id).cells.join(' ')

const S_208 = ((): number => {
  const numbers = (rowOf('T-206', 'S-208').by['既定'] ?? '').match(/\d+(?:\.\d+)?/g) ?? []
  if (numbers.length !== 1) throw new Error('S-208 does not hold one number')
  return Number(numbers[0])
})()

const keyOf = (id: string): KeyInput => {
  const first = (rowOf('T-036', id).by['割当'] ?? '').split('／')[0] ?? ''
  const parts = [...first.matchAll(/`([^`]+)`/g)].map((one) => one[1] ?? '')
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error(`table T-036 row ${id} states no assignment`)
  const named = (name: string): boolean => parts.slice(0, -1).includes(name)
  return {
    kind: 'key',
    key: last,
    modifiers: { ctrl: named('Ctrl'), shift: named('Shift'), alt: named('Alt'), meta: named('Cmd') },
  }
}

const UNDO = keyOf('SK-6')
const COPY = keyOf('SK-4')
const PASTE = keyOf('SK-5')
const ESC = keyOf('SK-8')

const ARMING_ENTRY = ((): string => {
  const found = specTable('T-109').rows.find((one) => (one.by['構え'] ?? '').includes('AR-2'))
  if (found === undefined) throw new Error('table T-109 has no entry whose arming is AR-2')
  return found.id
})()

describe('CR-560 premises: the clauses read this way', () => {
  it('T-023a: PTD-7 is the first row and PTD-1 the second', () => {
    const rows = specTable('T-023a').rows.map((one) => one.id)
    expect(rows.slice(0, 2)).toEqual(['PTD-7', 'PTD-1'])
    expect(cellsOf('T-023a', 'PTD-7')).toContain('`Dual Cursor` モード中でなく')
    expect(cellsOf('T-023a', 'PTD-7')).toContain('`GA-9` ／ `GA-14` ／ `GA-15`')
  })

  it('T-023: MK-15 sends the Ctrl drag on the selection to PTD-7 and MK-7 leaves it out', () => {
    expect(cellsOf('T-023', 'MK-15')).toContain('表 T-023a の `PTD-7`')
    expect(cellsOf('T-023', 'MK-7')).toContain('`MK-15` の場所から始めるものを除く')
  })

  it('T-308 holds CY-1 .. CY-11', () => {
    expect(specTable('T-308').rows.map((one) => one.id)).toEqual(
      Array.from({ length: 11 }, (_, index) => `CY-${index + 1}`),
    )
  })

  it('T-223 DU-1: a copy is made unstarted on every road', () => {
    const du1 = cellsOf('T-223', 'DU-1')
    expect(du1).toContain('実績は複製してはならない（MUST NOT）')
    expect(du1).toContain('`resumeValid` は `false`')
    expect(du1).toContain('`ActualDuration`')
    expect(du1).toContain('`percentComplete` は 0 とする')
    expect(du1).toContain('`CM-28` は `DU-2` から本行へ連鎖する')
    expect(du1).toContain('`Ctrl` ドラッグ（表 T-308）')
    expect(du1).toContain('マイルストーンも同じである')
  })

  it('T-269 PK-16 is the copy shape and IN-2 gives it to the held copy drag, crosshair to arming', () => {
    expect(cellsOf('T-269', 'PK-16')).toContain('`copy`')
    const in2 = cellsOf('T-028', 'IN-2')
    expect(in2).toContain('`PTD-7`）は `FR-106` の 表 T-269 の `PK-16`')
    expect(in2).toContain('構えているときは作図の合図（閲覧環境の `crosshair`）')
  })

  it('T-108 CM-8 carries the day shift and the rows of a Ctrl drag copy', () => {
    const line = GLOSSARY.split(/\r?\n/).find((one) => one.startsWith('| CM-8 |')) ?? ''
    expect(line).toContain('`pasteTaskSubtree`')
    expect(line).toContain('ずらす日数と、写しを載せる行も運ぶ')
  })

  it('FR-036: the help lists MK-15', () => {
    expect(REQUIREMENTS).toContain('表 T-023 の `MK-2` / `MK-5` / `MK-7` / `MK-15` / `MK-16` と')
  })

  it('S-208 is the distance that tells a copy drag from a press', () => {
    expect(cellsOf('T-206', 'S-208')).toContain('`CY-9`')
    expect(S_208).toBeGreaterThan(0)
  })
})

const ROW_A = '56000000-0000-4000-8000-00000000000a'
const ROW_B = '56000000-0000-4000-8000-00000000000b'
const ROW_C = '56000000-0000-4000-8000-00000000000c'
const ROW_D = '56000000-0000-4000-8000-00000000000d'
const ROW_E = '56000000-0000-4000-8000-00000000000e'
const ROW_F = '56000000-0000-4000-8000-00000000000f'
const ROWS = [ROW_A, ROW_B, ROW_C, ROW_D, ROW_E, ROW_F]

const ROOT = 1
const CHILD = 2
const OTHER = 3
const STONE = 4
const PAUSED = 5
const HALTED = 6

const ACTUAL_DURATION = 'ActualDuration'

const task = (over: Partial<Task> & { readonly uid: number }): Task =>
  ({
    wbsParentUid: null,
    wbsOrder: over.uid,
    name: `task ${over.uid}`,
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
    carry: { [ACTUAL_DURATION]: 'PT16H0M0S' },
    carryElements: [],
    ...over,
  }) as unknown as Task

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, Record<string, unknown>>

const PX_PER_DAY_AT_1X = 20

function fixtureDocument(): Document {
  const template = structuredClone(TEMPLATE)
  const schedule = template['schedule'] as Record<string, unknown>
  const inProgress = { actualStart: '2026-04-06', stop: '2026-04-07', resumeValid: true, percentComplete: 20 }
  return {
    '$schema': template['$schema'],
    schemaVersion: template['schemaVersion'],
    schedule: {
      project: { ...(schedule['project'] as Record<string, unknown>), uidHighWaterMark: 100, statusDate: null },
      calendars: schedule['calendars'],
      tasks: [
        task({ uid: ROOT, name: 'Root', start: '2026-04-06', finish: '2026-04-17', ...inProgress }),
        task({
          uid: CHILD,
          name: 'Child',
          wbsParentUid: ROOT,
          start: '2026-04-08',
          finish: '2026-04-10',
          actualStart: '2026-04-08',
          actualFinish: '2026-04-10',
          resumeValid: false,
          percentComplete: 100,
        }),
        task({ uid: OTHER, name: 'Other', start: '2026-04-06', finish: '2026-04-17', ...inProgress }),
        task({
          uid: STONE,
          name: 'Stone',
          milestone: true,
          start: '2026-04-20',
          finish: '2026-04-20',
          actualStart: '2026-04-20',
          actualFinish: '2026-04-20',
          resumeValid: false,
          percentComplete: 100,
        }),
        task({
          uid: PAUSED,
          name: 'Paused',
          start: '2026-04-21',
          finish: '2026-04-24',
          actualStart: '2026-04-21',
          stop: '2026-04-21',
          resume: '2026-04-23',
          resumeValid: true,
          percentComplete: 25,
        }),
        task({
          uid: HALTED,
          name: 'Halted',
          start: '2026-04-21',
          finish: '2026-04-24',
          actualStart: '2026-04-21',
          stop: '2026-04-22',
          resumeValid: false,
          percentComplete: 50,
        }),
      ],
      resources: [],
      assignments: [],
      taskGroups: ROWS.map((id, order) => ({
        id,
        parentId: null,
        label: `row ${order}`,
        derivedFromTaskUid: null,
        order,
        treeState: 'auto',
        color: null,
        minHeight: null,
      })),
      taskGroupMembers: [
        { taskUid: ROOT, groupId: ROW_A },
        { taskUid: PAUSED, groupId: ROW_B },
        { taskUid: CHILD, groupId: ROW_C },
        { taskUid: STONE, groupId: ROW_D },
        { taskUid: OTHER, groupId: ROW_E },
        { taskUid: HALTED, groupId: ROW_F },
      ],
      taskVisuals: [
        {
          taskUid: STONE,
          shapeKind: 'milestone',
          milestoneGlyph: 'diamond',
          fillColor: null,
          strokeColor: null,
          strokeWidthPx: null,
        },
      ],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...(template['documentSettings'] as Record<string, unknown>),
      // WHY: S-1 is a constant (CR-572); the stored zoomX (S-75) carries the day width this fixture draws at.
      zoomX: PX_PER_DAY_AT_1X / SETTINGS_CONSTANTS.pxPerDayAt1x,
    },
    documentStamp: template['documentStamp'],
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = { width: 1400, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }

const PALETTE_BOX: ScreenRect = { x: 8, y: SCREEN.height - 56, width: 120, height: 48 }

const insideBox = (box: ScreenRect, at: Point): boolean =>
  at.x >= box.x && at.x < box.x + box.width && at.y >= box.y && at.y < box.y + box.height

const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  shape(): PointerShape | null
  selection(): Selection
  tasks(): readonly Task[]
}

function stage(): Stage {
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
      insideBox(PALETTE_BOX, { x, y })
        ? {
            part: 'Command Palette',
            entry: ARMING_ENTRY,
            format: null,
            rowGroupId: null,
            resourceUid: null,
            dividerPanel: null,
            noticeDismissKey: null,
          }
        : null,
  }
  const wiring: ScreenWiring = { surface, language: 'en' }
  const shown: (PointerShape | null)[] = []
  const loop = frameLoop({ showSvg: () => undefined } as never, fixtureDocument(), SCREEN, wiring, undefined, (one) => {
    shown.push(one)
  })
  drain()
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      drain()
    },
    shape: () => (shown.length === 0 ? null : (shown[shown.length - 1] as PointerShape | null)),
    selection: () => loop.agentApiSeams().source.readSnapshot().selection as unknown as Selection,
    tasks: () => loop.document().schedule.tasks,
  }
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const CTRL: Partial<InputModifiers> = { ctrl: true }
const SHIFT: Partial<InputModifiers> = { shift: true }

const pointer = (
  phase: PointerPhase,
  at: Point,
  modifiers: Partial<InputModifiers> = {},
  button: PointerButton = 'left',
): PointerInput => ({
  kind: 'pointer',
  phase,
  button,
  x: at.x,
  y: at.y,
  modifiers: { ...NO_MODIFIERS, ...modifiers },
  clickCount: 1,
})

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

function boxOf(bar: BarGeometry | null, what: string): ScreenRect {
  if (bar === null) throw new Error(`${what} was not drawn`)
  const points: readonly Point[] = bar.form === 'outline' ? bar.points : [bar.from, bar.to]
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

const planBox = (loop: FrameLoop, uid: number): ScreenRect => {
  const found = frameOf(loop).geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`Task ${uid} is not drawn`)
  return boxOf(found.plan, `the plan of Task ${uid}`)
}

const bodyOf = (loop: FrameLoop, uid: number): Point => {
  const box = planBox(loop, uid)
  return { x: box.x + box.width * 0.75, y: box.y + box.height / 2 }
}

const planEndOf = (loop: FrameLoop, uid: number): Point => {
  const box = planBox(loop, uid)
  return { x: box.x + box.width + 2, y: box.y + box.height / 2 }
}

const groundOf = (loop: FrameLoop): Point => {
  const area = frameOf(loop).regions.rowArea
  return { x: area.x + area.width - 4, y: area.y + area.height - 4 }
}

const drawnRow = (loop: FrameLoop, groupId: string): RowPlacement => {
  const found = frameOf(loop).layout.rows.find((one) => one.groupId === groupId)
  if (found === undefined) throw new Error(`the frame drew no row ${groupId}`)
  return found
}

const hitAt = (loop: FrameLoop, at: Point): Hit | null => itemAtPointer(frameOf(loop).geometry, at.x, at.y, grabSizesOf())

const pxPerDay = (loop: FrameLoop): number => frameOf(loop).layout.pxPerDay

const travel = (loop: FrameLoop, days: number, rows: number): Point => ({
  x: days * pxPerDay(loop),
  y: drawnRow(loop, ROWS[rows] as string).y - drawnRow(loop, ROW_A).y,
})

const click = (built: Stage, at: Point, modifiers: Partial<InputModifiers> = {}): void => {
  built.send(pointer('move', at, modifiers))
  built.send(pointer('down', at, modifiers))
  built.send(pointer('up', at, modifiers))
}

function drag(built: Stage, from: Point, by: Point, modifiers: Partial<InputModifiers> = {}, button: PointerButton = 'left'): void {
  const to = { x: from.x + by.x, y: from.y + by.y }
  built.send(pointer('move', from, modifiers, button))
  built.send(pointer('down', from, modifiers, button))
  built.send(pointer('move', to, modifiers, button))
  built.send(pointer('up', to, modifiers, button))
}

const taskRef = (uid: number) => ({ kind: 'task', uid })

const groupOf = (document: Document, uid: number): string | undefined =>
  document.schedule.taskGroupMembers.find((one) => one.taskUid === uid)?.groupId

const byName = (tasks: readonly Task[], name: string): readonly Task[] => tasks.filter((one) => one.name === name)

const newTasks = (before: readonly Task[], after: readonly Task[]): readonly Task[] => {
  const old = new Set(before.map((one) => one.uid))
  return after.filter((one) => !old.has(one.uid))
}

const copyNamed = (before: readonly Task[], after: readonly Task[], name: string): Task => {
  const found = newTasks(before, after).filter((one) => one.name === name)
  if (found.length !== 1) throw new Error(`expected one copy of ${name}; found ${found.length}`)
  return found[0] as Task
}

const day = (value: string | null): string | null => (value === null ? null : value.slice(0, 10))

const UNSTARTED = {
  actualStart: null,
  stop: null,
  actualFinish: null,
  resume: null,
  resumeValid: false,
  percentComplete: 0,
  hasActualDuration: false,
}

const actualsOf = (one: Task) => ({
  actualStart: one.actualStart,
  stop: one.stop,
  actualFinish: one.actualFinish,
  resume: one.resume,
  resumeValid: one.resumeValid,
  percentComplete: one.percentComplete,
  hasActualDuration: Object.prototype.hasOwnProperty.call(one.carry, ACTUAL_DURATION),
})

const selectRoot = (built: Stage): void => {
  click(built, bodyOf(built.loop, ROOT))
  expect(built.selection().items, 'SL-2: a click on the body picks the Task').toEqual([taskRef(ROOT)])
}

// WHY: DU-1 copies only the chosen Tasks (CR-706), so a case about the child's copy chooses the child too.
const selectRootAndChild = (built: Stage): void => {
  selectRoot(built)
  click(built, bodyOf(built.loop, CHILD), SHIFT)
  expect(built.selection().items, 'SL-4 premise').toEqual([taskRef(ROOT), taskRef(CHILD)])
}

describe('CR-560 fixture premises', () => {
  it('draws the bodies and the end this file presses on as GA-9 and GA-2', () => {
    const built = stage()
    expect(hitAt(built.loop, bodyOf(built.loop, ROOT))).toMatchObject({ item: { kind: 'task', taskUid: ROOT }, grab: 'GA-9' })
    expect(hitAt(built.loop, bodyOf(built.loop, OTHER))).toMatchObject({ item: { kind: 'task', taskUid: OTHER }, grab: 'GA-9' })
    expect(hitAt(built.loop, planEndOf(built.loop, ROOT))).toMatchObject({ item: { kind: 'task', taskUid: ROOT }, grab: 'GA-2' })
    expect(hitAt(built.loop, groundOf(built.loop))).toBeNull()
  })
})

const LIMITS: SettingsLimits = {
  zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
  zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
  rowAreaWidthWithoutPanels: 982,
}

const PICKED_ROOT: Selection = { items: [{ kind: 'task', uid: ROOT }], ordered: true } as unknown as Selection
const PICKED_ROOT_AND_CHILD: Selection = {
  items: [{ kind: 'task', uid: ROOT }, { kind: 'task', uid: CHILD }],
  ordered: true,
} as unknown as Selection

function contextOf(built: Stage, selection: Selection, over: Partial<InputContext> = {}): InputContext {
  const values = frameOf(built.loop)
  return {
    document: built.loop.document(),
    layout: values.layout,
    geometry: values.geometry,
    regions: values.regions,
    screen: emptyScreenSession.screen,
    selection,
    zoomStep: 3,
    zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
    zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: '2026-04-01',
    newGroupId: 'row-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
    ...over,
  }
}

function pressAt(built: Stage, context: InputContext, at: Point, modifiers: Partial<InputModifiers>, button: PointerButton = 'left'): PointerPress {
  const down = pointer('down', at, modifiers, button)
  const hit = hitAt(built.loop, at)
  return { at: down, hit, on: null, pressRow: pressRowOf({ at: down, hit }, context) }
}

describe('T-023a PTD-7 / T-308 CY-1, CY-2: which press starts a copy (pressRowOf)', () => {
  it('a Ctrl-only left press on a selected Task body is PTD-7', () => {
    const built = stage()
    const context = contextOf(built, PICKED_ROOT)
    expect(pressAt(built, context, bodyOf(built.loop, ROOT), CTRL).pressRow).toBe('PTD-7')
  })

  it('CY-2: the same press on a Task that is not selected is PTD-1, the pan', () => {
    const built = stage()
    const context = contextOf(built, PICKED_ROOT)
    expect(pressAt(built, context, bodyOf(built.loop, OTHER), CTRL).pressRow).toBe('PTD-1')
  })

  it('PTD-1: the same press on the ground is the pan', () => {
    const built = stage()
    const context = contextOf(built, PICKED_ROOT)
    expect(pressAt(built, context, groundOf(built.loop), CTRL).pressRow).toBe('PTD-1')
  })

  it('CY-1: the same press on an end of the selected Task is the pan', () => {
    const built = stage()
    const context = contextOf(built, PICKED_ROOT)
    expect(pressAt(built, context, planEndOf(built.loop, ROOT), CTRL).pressRow).toBe('PTD-1')
  })

  it('PTD-7: in Dual Cursor mode the press does not copy', () => {
    const built = stage()
    const context = contextOf(built, PICKED_ROOT, { dualCursorFollowing: 'date1' })
    expect(pressAt(built, context, bodyOf(built.loop, ROOT), CTRL).pressRow).not.toBe('PTD-7')
  })

  it('PTD-7 takes Ctrl alone or Ctrl + Shift (CR-656): Alt beside Ctrl on the selected body does not copy', () => {
    const built = stage()
    const context = contextOf(built, PICKED_ROOT)
    const body = bodyOf(built.loop, ROOT)
    expect(pressAt(built, context, body, { ctrl: true, shift: true }).pressRow).toBe('PTD-7')
    expect(pressAt(built, context, body, { ctrl: true, alt: true }).pressRow).not.toBe('PTD-7')
  })

  it('PTD-7 asks for a left drag: the middle button on the selected body pans', () => {
    const built = stage()
    const context = contextOf(built, PICKED_ROOT)
    expect(pressAt(built, context, bodyOf(built.loop, ROOT), {}, 'middle').pressRow).toBe('PTD-1')
  })
})

describe('T-308 CY-3, CY-5, CY-6, CY-8: the release of a PTD-7 press (commandFromInput + editDocument)', () => {
  it('writes one CM-8 carrying the selection, the day shift and the rows, and picks the copies', () => {
    const built = stage()
    const context = contextOf(built, PICKED_ROOT)
    const from = bodyOf(built.loop, ROOT)
    const by = travel(built.loop, 3, 1)
    const pressed = pressAt(built, context, from, CTRL)
    const answer = commandFromInput(pointer('up', { x: from.x + by.x, y: from.y + by.y }, CTRL), { ...context, pressed })
    const action = answer.action as unknown as {
      kind: string
      writes: readonly (readonly DocumentCommand[])[]
      picked?: Selection
    }
    expect(action?.kind).toBe('changeDocument')
    const writes = action.writes.flat()
    expect(writes).toHaveLength(1)
    const paste = writes[0] as unknown as { kind: string; sourceUids: number[]; landing: { dayShift: number; groupIdOf: Record<number, string> } }
    expect(paste.kind).toBe('pasteTaskSubtree')
    expect(paste.sourceUids).toEqual([ROOT])
    expect(paste.landing.dayShift).toBe(3)
    expect(paste.landing.groupIdOf[ROOT]).toBe(ROW_B)
    const copyUid = pastedUidsOf(built.loop.document().schedule, [ROOT]).get(ROOT)
    expect(copyUid).toBeDefined()
    expect((action.picked as unknown as { items: unknown[] }).items).toEqual([taskRef(copyUid as number)])

    const before = built.loop.document()
    const result = editDocument(before, writes[0] as DocumentCommand, LIMITS, 'Row')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const after = result.document
    const rootCopy = copyNamed(before.schedule.tasks, after.schedule.tasks, 'Root')
    expect(rootCopy.uid).toBe(copyUid)
    expect(groupOf(after, rootCopy.uid), 'CY-6: the copy stands one drawn row down').toBe(ROW_B)
    expect(
      newTasks(before.schedule.tasks, after.schedule.tasks).map((one) => one.name),
      'CY-3: the WBS descendant that was not chosen is not copied (DU-1)',
    ).toEqual(['Root'])
    expect(day(rootCopy.start)).toBe('2026-04-09')
    expect(after.schedule.tasks.filter((one) => before.schedule.tasks.some((old) => old.uid === one.uid))).toEqual(before.schedule.tasks)
  })

  it('CY-6: a copy that would leave the last row stops the whole there', () => {
    const built = stage()
    const context = contextOf(built, PICKED_ROOT_AND_CHILD)
    const from = bodyOf(built.loop, ROOT)
    const by = travel(built.loop, 3, 4)
    const pressed = pressAt(built, context, from, CTRL)
    const answer = commandFromInput(pointer('up', { x: from.x + by.x, y: from.y + by.y }, CTRL), { ...context, pressed })
    const writes = (answer.action as unknown as { writes: readonly (readonly DocumentCommand[])[] }).writes.flat()
    const before = built.loop.document()
    const result = editDocument(before, writes[0] as DocumentCommand, LIMITS, 'Row')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const rootCopy = copyNamed(before.schedule.tasks, result.document.schedule.tasks, 'Root')
    const childCopy = copyNamed(before.schedule.tasks, result.document.schedule.tasks, 'Child')
    expect(groupOf(result.document, childCopy.uid), 'the descendant stops on the last row').toBe(ROW_F)
    expect(groupOf(result.document, rootCopy.uid), 'and the root stops the same rows short').toBe(ROW_D)
    expect(childCopy.wbsParentUid, 'DU-1: a chosen child is copied under its chosen parent`s copy').toBe(rootCopy.uid)
  })
})

describe('T-308 through the shell: a Ctrl drag on the selection copies it', () => {
  it('CY-5, CY-6: a drag 3 days right and 1 row down stands the copies there and leaves the source', () => {
    const moved = stage()
    selectRoot(moved)
    const moveBy = travel(moved.loop, 3, 1)
    drag(moved, bodyOf(moved.loop, ROOT), moveBy)
    const movedRoot = moved.tasks().find((one) => one.uid === ROOT) as Task

    const built = stage()
    selectRootAndChild(built)
    const before = built.tasks()
    drag(built, bodyOf(built.loop, ROOT), travel(built.loop, 3, 1), CTRL)
    const after = built.tasks()
    expect(newTasks(before, after).map((one) => one.name).sort()).toEqual(['Child', 'Root'])
    const rootCopy = copyNamed(before, after, 'Root')
    expect(
      { start: day(rootCopy.start), finish: day(rootCopy.finish) },
      'CY-5: the copy lands where the body move of PE-1 puts the source',
    ).toEqual({ start: day(movedRoot.start), finish: day(movedRoot.finish) })
    expect(groupOf(built.loop.document(), rootCopy.uid)).toBe(ROW_B)
    expect(groupOf(built.loop.document(), copyNamed(before, after, 'Child').uid)).toBe(ROW_D)
    expect(after.filter((one) => before.some((old) => old.uid === one.uid)), 'the sources do not move').toEqual(before)
  })

  it('CY-8: the copy is selected; UN: one undo takes every copy away', () => {
    const built = stage()
    selectRoot(built)
    const before = built.tasks()
    drag(built, bodyOf(built.loop, ROOT), travel(built.loop, 3, 1), CTRL)
    const rootCopy = copyNamed(before, built.tasks(), 'Root')
    expect(built.selection().items).toEqual([taskRef(rootCopy.uid)])
    built.send(UNDO)
    expect(built.tasks()).toEqual(before)
  })

  it('CY-3, CY-8: two selected Tasks are both copied and both copies are picked in order', () => {
    const built = stage()
    selectRoot(built)
    click(built, bodyOf(built.loop, OTHER), SHIFT)
    expect(built.selection().items, 'SL-4 premise').toEqual([taskRef(ROOT), taskRef(OTHER)])
    const before = built.tasks()
    drag(built, bodyOf(built.loop, OTHER), travel(built.loop, 3, 0), CTRL)
    const after = built.tasks()
    expect(newTasks(before, after).map((one) => one.name).sort()).toEqual(['Other', 'Root'])
    expect(built.selection().items).toEqual([
      taskRef(copyNamed(before, after, 'Root').uid),
      taskRef(copyNamed(before, after, 'Other').uid),
    ])
  })

  it('CY-11: letting go of Ctrl while the button is held still copies', () => {
    const built = stage()
    selectRoot(built)
    const before = built.tasks()
    const from = bodyOf(built.loop, ROOT)
    const by = travel(built.loop, 3, 1)
    built.send(pointer('down', from, CTRL))
    built.send(pointer('move', { x: from.x + by.x, y: from.y + by.y }))
    built.send(pointer('up', { x: from.x + by.x, y: from.y + by.y }))
    expect(newTasks(before, built.tasks()).map((one) => one.name).sort()).toEqual(['Root'])
  })

  it('CY-2: a Ctrl drag on a Task that is not selected copies nothing and keeps the selection', () => {
    const built = stage()
    selectRoot(built)
    const before = built.tasks()
    drag(built, bodyOf(built.loop, OTHER), travel(built.loop, 3, 1), CTRL)
    expect(built.tasks()).toEqual(before)
    expect(built.selection().items).toEqual([taskRef(ROOT)])
  })

  it('PTD-1: a Ctrl drag on the ground copies nothing', () => {
    const built = stage()
    selectRoot(built)
    const before = built.tasks()
    drag(built, groundOf(built.loop), { x: -3 * pxPerDay(built.loop), y: -10 }, CTRL)
    expect(built.tasks()).toEqual(before)
  })

  it('CY-1: a Ctrl drag on an end of the selected Task copies nothing and resizes nothing', () => {
    const built = stage()
    selectRoot(built)
    const before = built.tasks()
    drag(built, planEndOf(built.loop, ROOT), travel(built.loop, 3, 0), CTRL)
    expect(built.tasks()).toEqual(before)
  })
})

describe('T-308 CY-6 through the shell: a copy drag that moves in steps counts the rows drawn at the press', () => {
  it('premise: CY-6 counts rows on the rows drawn on screen; PTD-7 draws the copy while held', () => {
    expect(cellsOf('T-308', 'CY-6')).toContain('すべての写しを、引いた行数だけ移した行に載せること（MUST）')
    expect(cellsOf('T-308', 'CY-6')).toContain('行数は画面に描いた行で数え')
    expect(cellsOf('T-023a', 'PTD-7')).toContain('押しているあいだ、写しを置くことになる所に写しを描き、写し元はそのまま描くこと（MUST）')
    expect(cellsOf('T-023a', 'PTD-7')).toContain('追従は絵であって編集ではない')
  })

  it('3 days right and half a row down, then on to one row down: the copy lands in the next row, as one move puts it', () => {
    const single = stage()
    selectRoot(single)
    const singleBefore = single.tasks()
    drag(single, bodyOf(single.loop, ROOT), travel(single.loop, 3, 1), CTRL)
    const singleCopy = copyNamed(singleBefore, single.tasks(), 'Root')

    const built = stage()
    selectRoot(built)
    const before = built.tasks()
    const from = bodyOf(built.loop, ROOT)
    const by = travel(built.loop, 3, 1)
    const halfRow = drawnRow(built.loop, ROW_A).height / 2
    built.send(pointer('move', from, CTRL))
    built.send(pointer('down', from, CTRL))
    const fixtureUids = new Set(before.map((one) => one.uid))
    const rowABefore = drawnRow(built.loop, ROW_A)
    built.send(pointer('move', { x: from.x + by.x, y: from.y + halfRow }, CTRL))
    const heldCopies = frameOf(built.loop).geometry.tasks.filter((one) => !fixtureUids.has(one.taskUid))
    const heldRoot = heldCopies.map((one) => boxOf(one.plan, `held copy ${one.taskUid}`)).sort((a, b) => a.y - b.y)[0]
    expect(heldRoot, 'PTD-7: the held copy is drawn while the press is held').toBeDefined()
    expect(
      (heldRoot as ScreenRect).y >= rowABefore.y && (heldRoot as ScreenRect).y < rowABefore.y + rowABefore.height,
      'premise: half a row down is still the source row, so the held copy stands in it',
    ).toBe(true)
    built.send(pointer('move', { x: from.x + by.x, y: from.y + by.y }, CTRL))
    built.send(pointer('up', { x: from.x + by.x, y: from.y + by.y }, CTRL))
    const after = built.tasks()
    expect(newTasks(before, after).map((one) => one.name).sort()).toEqual(['Root'])
    const rootCopy = copyNamed(before, after, 'Root')
    expect(groupOf(built.loop.document(), rootCopy.uid), 'CY-6: one drawn row down, not the source row').toBe(ROW_B)
    expect(
      { start: day(rootCopy.start), finish: day(rootCopy.finish), row: groupOf(built.loop.document(), rootCopy.uid) },
      'the stepped drag lands where the single-move drag lands',
    ).toEqual({
      start: day(singleCopy.start),
      finish: day(singleCopy.finish),
      row: groupOf(single.loop.document(), singleCopy.uid),
    })
    expect(day(rootCopy.start), 'CY-5: 3 days later than the source').toBe('2026-04-09')
    expect(after.filter((one) => before.some((old) => old.uid === one.uid)), 'the sources stay').toEqual(before)
    expect(groupOf(built.loop.document(), ROOT), 'the source stays in its row').toBe(ROW_A)
  })
})

describe('T-308 CY-9: releases that copy nothing', () => {
  const expectNothing = (built: Stage, before: readonly Task[]): void => {
    expect(built.tasks(), 'nothing is written').toEqual(before)
    expect(built.selection().items, 'the selection does not change').toEqual([taskRef(ROOT)])
  }

  it('(1) released before passing S-208', () => {
    const built = stage()
    selectRoot(built)
    const before = built.tasks()
    drag(built, bodyOf(built.loop, ROOT), { x: S_208 / 2, y: 0 }, CTRL)
    expectNothing(built, before)
  })

  it('(2) past S-208 and back: 0 days and 0 rows', () => {
    const built = stage()
    selectRoot(built)
    const before = built.tasks()
    const from = bodyOf(built.loop, ROOT)
    built.send(pointer('down', from, CTRL))
    built.send(pointer('move', { x: from.x + S_208 * 3, y: from.y }, CTRL))
    built.send(pointer('move', from, CTRL))
    built.send(pointer('up', from, CTRL))
    expectNothing(built, before)
  })

  it('(3) Esc while the button is held', () => {
    const built = stage()
    selectRoot(built)
    const before = built.tasks()
    const from = bodyOf(built.loop, ROOT)
    const by = travel(built.loop, 3, 1)
    built.send(pointer('down', from, CTRL))
    built.send(pointer('move', { x: from.x + by.x, y: from.y + by.y }, CTRL))
    built.send(ESC)
    built.send(pointer('up', { x: from.x + by.x, y: from.y + by.y }, CTRL))
    expectNothing(built, before)
  })

  it('(4) the pointer is lost before the release', () => {
    const built = stage()
    selectRoot(built)
    const before = built.tasks()
    const from = bodyOf(built.loop, ROOT)
    const by = travel(built.loop, 3, 1)
    built.send(pointer('down', from, CTRL))
    built.send(pointer('move', { x: from.x + by.x, y: from.y + by.y }, CTRL))
    built.send(pointer('lost', { x: from.x + by.x, y: from.y + by.y }, CTRL))
    expectNothing(built, before)
  })
})

describe('T-308 CY-10: refusals', () => {
  it.todo('refuses to land a copy on a row of another editGroup (waits for FR-111, DFC-730)')
})

describe('T-223 DU-1: every road makes an unstarted copy and leaves the source', () => {
  const STATES = ['Root', 'Child', 'Stone', 'Paused', 'Halted']

  const expectUnstarted = (before: readonly Task[], after: readonly Task[], names: readonly string[]): void => {
    for (const name of names) {
      expect(actualsOf(copyNamed(before, after, name)), `the copy of ${name}`).toEqual(UNSTARTED)
    }
    expect(after.filter((one) => before.some((old) => old.uid === one.uid)), 'the sources keep their actuals').toEqual(before)
  }

  it('the fixture holds every started state and a milestone (T-019a)', () => {
    const tasks = fixtureDocument().schedule.tasks
    for (const name of STATES) expect(byName(tasks, name)[0]?.actualStart, name).not.toBeNull()
    expect(byName(tasks, 'Stone')[0]?.milestone).toBe(true)
  })

  it('CM-8 paste (SK-5)', () => {
    const document = fixtureDocument()
    const result = editDocument(document, { kind: 'pasteTaskSubtree', sourceUids: [ROOT, CHILD, STONE, PAUSED, HALTED] } as DocumentCommand, LIMITS, 'Row')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expectUnstarted(document.schedule.tasks, result.document.schedule.tasks, STATES)
  })

  it('CM-8 paste through the shell (SK-4 then SK-5)', () => {
    const built = stage()
    selectRoot(built)
    const before = built.tasks()
    built.send(COPY)
    built.send(PASTE)
    expectUnstarted(before, built.tasks(), ['Root'])
  })

  it('CM-28 row copy chains to DU-1 through DU-2', () => {
    for (const row of [ROW_B, ROW_C, ROW_D, ROW_E, ROW_F]) {
      const document = fixtureDocument()
      const result = editDocument(
        document,
        { kind: 'pasteTaskGroupSubtree', sourceGroupId: row, targetGroupId: null, newGroupIds: { [row]: 'row-copy' } } as DocumentCommand,
        LIMITS,
        'Row',
      )
      expect(result.ok ? 'ok' : JSON.stringify(result.refusals), `row ${row}`).toBe('ok')
      if (!result.ok) continue
      const copies = newTasks(document.schedule.tasks, result.document.schedule.tasks)
      expect(copies.length, `row ${row} copied a Task`).toBeGreaterThan(0)
      expectUnstarted(document.schedule.tasks, result.document.schedule.tasks, copies.map((one) => one.name ?? ''))
    }
  })

  it('the Ctrl drag (T-308 CY-7), milestone included', () => {
    const document = fixtureDocument()
    const result = editDocument(
      document,
      {
        kind: 'pasteTaskSubtree',
        sourceUids: [ROOT, CHILD, STONE, PAUSED, HALTED],
        landing: { dayShift: 3, groupIdOf: { [ROOT]: ROW_B, [CHILD]: ROW_D, [STONE]: ROW_E, [PAUSED]: ROW_C, [HALTED]: ROW_F } },
      } as DocumentCommand,
      LIMITS,
      'Row',
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expectUnstarted(document.schedule.tasks, result.document.schedule.tasks, STATES)
  })

  it('the Ctrl drag through the shell', () => {
    const built = stage()
    selectRoot(built)
    const before = built.tasks()
    drag(built, bodyOf(built.loop, ROOT), travel(built.loop, 3, 1), CTRL)
    expectUnstarted(before, built.tasks(), ['Root'])
  })
})

describe('T-028 IN-2 / T-269 PK-16: the pointer while copying, and while armed', () => {
  it('PK-16 is the copy shape', () => {
    expect(pointerImageOf('PK-16')).toBe('copy')
  })

  it('shows copy while a PTD-7 press is held, and keeps it when Ctrl is let go (CY-11)', () => {
    const built = stage()
    selectRoot(built)
    const from = bodyOf(built.loop, ROOT)
    const by = travel(built.loop, 3, 1)
    built.send(pointer('move', from, CTRL))
    built.send(pointer('down', from, CTRL))
    expect(built.shape()).toBe('copy')
    built.send(pointer('move', { x: from.x + by.x, y: from.y + by.y }, CTRL))
    expect(built.shape()).toBe('copy')
    built.send(pointer('move', { x: from.x + by.x, y: from.y + by.y + 1 }))
    expect(built.shape()).toBe('copy')
    built.send(pointer('up', { x: from.x + by.x, y: from.y + by.y + 1 }))
    expect(built.shape()).not.toBe('copy')
  })

  it('does not show copy while a Ctrl drag pans', () => {
    const built = stage()
    selectRoot(built)
    const from = groundOf(built.loop)
    built.send(pointer('move', from, CTRL))
    built.send(pointer('down', from, CTRL))
    expect(built.shape()).not.toBe('copy')
    built.send(pointer('up', from, CTRL))
  })

  it('shows crosshair on the ground while a shape is armed', () => {
    const built = stage()
    const entry = { x: PALETTE_BOX.x + PALETTE_BOX.width / 2, y: PALETTE_BOX.y + PALETTE_BOX.height / 2 }
    built.send(pointer('down', entry))
    built.send(pointer('up', entry))
    built.send(pointer('move', groundOf(built.loop)))
    expect(built.shape()).toBe('crosshair')
  })
})

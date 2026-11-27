// Unit tests: the UF-48 frame loop's isBrowserDefaultStopped and receiveInput (FT-1).

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  InputModifiers,
  KeyInput,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { dayOf, type CalendarDay, type Task } from '../../src/entity/document-model/schedule/schedule'
import {
  frameLoop,
  type FrameEnvironment,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// Spec: ED-1
// Why: read out of docs/spec, since no generated constant carries table T-229.
const ED_1_WORD = bare(rowOf('T-229', 'ED-1').by['書く語'] ?? '')

// Spec: U-26, W-4
const U_26_PART = bare(rowOf('T-103', 'U-26').by['確定名（英）'] ?? '')

// Spec: IC-53, GR-19, FR-053
// Why: a row ID, not a button: a press on the band begins the drag rather than running an entry.
const T_109_GRAB_BAND = 'IC-53'

// Summary: sameSpelling reads a fullwidth-plus spelling and a plus spelling of one assignment alike.
const sameSpelling = (cell: string): string =>
  cell.replace(/`/g, '').replace(/＋/g, '+').replace(/\s+/g, '')

// Spec: BT-4, FR-027
// Why: the calendar, project and settings come from the one decided template; the task groups
// and Tasks are written out so that what is drawn can be named group by group.
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readRepoFile(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

const ALPHA = '11111111-1111-4111-8111-111111111111'
const BETA = '22222222-2222-4222-8222-222222222222'

/* eslint-disable @typescript-eslint/no-explicit-any -- the fixture edits untyped template JSON */

// Spec: SK-20, FR-046, PS-1
// Why: statusDate null is a premise: a document already carrying one would drive the clearing
// half of SK-20, not the writing of today these cases are about.
function twoTaskGroupDocument(edit: (draft: any) => void = () => {}): Document {
  const template = structuredClone(TEMPLATE) as any
  const task = (uid: number, start: string, finish: string, name: string): Task => ({
    uid,
    parentTaskUid: null,
    wbsOrder: uid,
    name,
    start,
    finish,
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
  })
  const row = (id: string, parentId: string | null, label: string) => ({
    id,
    parentId,
    name: label,
    derivedFromTaskUid: null,
    order: 0,
    treeState: 'auto', editPermission: null,
    color: null,
    minHeightPx: null,
  })
  const draft = {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        task(1, '2026-04-01T00:00:00', '2026-04-10T00:00:00', 'One'),
        task(2, '2026-05-06T00:00:00', '2026-05-20T00:00:00', 'Two'),
      ],
      resources: [],
      assignments: [],
      taskGroups: [row(ALPHA, null, 'Alpha'), row(BETA, ALPHA, 'Beta')],
      taskGroupMembers: [
        { taskUid: 1, taskGroupId: ALPHA },
        { taskUid: 2, taskGroupId: BETA },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: structuredClone(template.documentSettings),
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  }
  edit(draft)
  return draft as unknown as Document
}

const projectOf = (document: Document): any => (document as any).schedule.project
const stampOf = (document: Document): any => (document as any).documentStamp
const taskOf = (document: Document, uid: number): any =>
  (document as any).schedule.tasks.find((one: any) => one.uid === uid)

// Spec: BO-1, FR-051
// Why: FR-051 keeps the last two values out of the settings, since they differ per machine.
const SCREEN: FrameEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

// Spec: NFR-011, BO-1
const UNSETTLED_SCREEN: FrameEnvironment = {
  width: 0,
  height: 0,
  appHeaderHeight: 0,
  scrollbarThickness: 0,
}

interface Host {
  readonly drawn: string[]
  readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }
  // Summary: runAnimationFrames runs what the loop asked frames for, until it asks for no more.
  runAnimationFrames(): void
  frames(): number
}

const realRaf = (globalThis as any).requestAnimationFrame
const realTz = process.env.TZ

function host(): Host {
  const drawn: string[] = []
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    drawn,
    surface: {
      showMarqueeOverlaySvg: () => undefined,
      showSvg: (svg: string) => {
        drawn.push(svg)
      },
    },
    runAnimationFrames: () => {
      // Why: bounded, so a loop that asks for a frame from inside a frame (NFR-010 forbids it) ends
      // the test instead of hanging it.
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames with nothing to draw').toBe(
        0,
      )
    },
    frames: () => drawn.length,
  }
}

interface ScreenPane {
  readonly views: ScreenView[]
  readonly wiring: ScreenWiring
  // Summary: drawAt sets what readScreenPartAt answers from now on; the case decides, not the fake.
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
  screens(): number
}

function screenPane(language: DisplayLanguage = 'ja'): ScreenPane {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readFieldCommit: () => null,
    readScreenPartAt: () => part,
  }
  return {
    views,
    wiring: { surface, language },
    drawAt: (next) => {
      part = next
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
    screens: () => views.length,
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
  if (realTz === undefined) delete process.env.TZ
  else process.env.TZ = realTz
  vi.useRealTimers()
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const key = (which: string, modifiers: Partial<InputModifiers> = {}): KeyInput => ({
  kind: 'key',
  key: which,
  modifiers: { ...NO_MODIFIERS, ...modifiers },
})

const pointer = (
  phase: PointerPhase,
  x: number,
  y: number,
  options: {
    readonly button?: PointerButton
    readonly modifiers?: Partial<InputModifiers>
    readonly clickCount?: number
  } = {},
): PointerInput => ({
  kind: 'pointer',
  phase,
  button: options.button ?? 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS, ...(options.modifiers ?? {}) },
  clickCount: options.clickCount ?? 1,
})

// Spec: T-036
// Why: not the whole table: SK-1 and SK-1a have no assignment, and SK-8 and SK-19 are assigned
// only in states that cases of their own drive.
const T_036_DRIVEN = [
  { row: 'SK-2', spelled: 'Ctrl+A', input: () => key('A', { ctrl: true }) },
  { row: 'SK-3', spelled: 'Delete', input: () => key('Delete') },
  { row: 'SK-4', spelled: 'Ctrl+C', input: () => key('C', { ctrl: true }) },
  { row: 'SK-5', spelled: 'Ctrl+V', input: () => key('V', { ctrl: true }) },
  { row: 'SK-6', spelled: 'Ctrl+Z', input: () => key('Z', { ctrl: true }) },
  { row: 'SK-7', spelled: 'Ctrl+Y', input: () => key('Y', { ctrl: true }) },
  { row: 'SK-9', spelled: 'F2', input: () => key('F2') },
  { row: 'SK-10', spelled: 'Ctrl+O', input: () => key('O', { ctrl: true }) },
  { row: 'SK-11', spelled: 'Ctrl+S', input: () => key('S', { ctrl: true }) },
  { row: 'SK-12', spelled: 'Ctrl+Shift+E', input: () => key('E', { ctrl: true, shift: true }) },
  { row: 'SK-13', spelled: 'F1', input: () => key('F1') },
  { row: 'SK-14', spelled: 'P', input: () => key('P') },
  { row: 'SK-15', spelled: 'F11', input: () => key('F11') },
  { row: 'SK-16', spelled: 'Shift++', input: () => key('+', { shift: true }) },
  { row: 'SK-16a', spelled: 'Alt++', input: () => key('+', { alt: true }) },
  { row: 'SK-22', spelled: 'Ctrl+Shift++', input: () => key('+', { ctrl: true, shift: true }) },
  { row: 'SK-23', spelled: 'Ctrl+Shift+-', input: () => key('-', { ctrl: true, shift: true }) },
  { row: 'SK-18', spelled: 'F', input: () => key('F') },
  { row: 'SK-24', spelled: 'Ctrl+F', input: () => key('F', { ctrl: true }) },
  { row: 'SK-20', spelled: 'Ctrl+Shift+D', input: () => key('D', { ctrl: true, shift: true }) },
] as const

// Spec: MK-10
const MK_10_CTRL_P = '`Ctrl+P`（印刷）まで奪うと、ブラウザーの機能が使えなくなる'
const MK_10_CTRL_F = '`GRS` は、表 T-036 の `SK-24` に割り当てた `Ctrl+F` のブラウザーの既定動作も止めること。'

const NOT_ASSIGNED = [
  { why: 'MK-10 names it: `Ctrl+P`（印刷）', input: () => key('P', { ctrl: true }) },
  { why: 'JDG-301 took Ctrl+Shift+0 out of table T-036', input: () => key('0', { ctrl: true, shift: true }) },
  {
    why: 'table T-023 gives the right button no row, so the context menu stays the browser’s',
    input: () => pointer('down', 500, 400, { button: 'right' }),
  },
] as const

function planCenter(loop: ReturnType<typeof frameLoop>, uid: number): { x: number; y: number } {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame, so it has drawn no bar')
  const drawn = values.geometry.tasks.find((one) => one.taskUid === uid)
  if (drawn === undefined || drawn.plan === null) {
    throw new Error(`Task ${uid} has no plan bar in this frame`)
  }
  if (drawn.plan.form !== 'outline') {
    throw new Error(`Task ${uid} is drawn as a ${drawn.plan.form}, which has no body to grab`)
  }
  const xs = drawn.plan.points.map((onePoint) => onePoint.x)
  const ys = drawn.plan.points.map((onePoint) => onePoint.y)
  // Why: the marker's square is stepped around: on an unstarted Task GA-18 hangs off the GA-6
  // hold (FR-043's mark) and stands above GA-9, so a press there cycles state, not drags.
  const right = Math.max(...xs)
  const marker = drawn.marker
  const left =
    marker === null
      ? Math.min(...xs)
      : Math.max(Math.min(...xs), marker.center.x + marker.radius)
  if (left >= right) throw new Error(`Task ${uid} has no body the marker leaves free`)
  return { x: (left + right) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

// Why: a drag is stated in bar-widths, not days, since no row fixes how a partial day rounds.
function planWidth(loop: ReturnType<typeof frameLoop>, uid: number): number {
  const values = loop.current()!
  const drawn = values.geometry.tasks.find((one) => one.taskUid === uid)!
  if (drawn.plan === null || drawn.plan.form !== 'outline') throw new Error('no bar body')
  const xs = drawn.plan.points.map((onePoint) => onePoint.x)
  return Math.max(...xs) - Math.min(...xs)
}

const dayText = (value: string | null): CalendarDay | null => dayOf(value)

describe('the document these cases drive', () => {
  it('is a valid GRS JSON document', () => {
    const report = validateDocument(twoTaskGroupDocument())
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
  })

  it('carries no base date line, so SK-20 drives the writing half of FR-046', () => {
    // Spec: FR-046, SK-20, CU-1
    expect(projectOf(twoTaskGroupDocument()).statusDate).toBeNull()
  })
})

describe('BO-1 of table T-077 -- nothing goes up until the size is settled', () => {
  it('BO-1: a 0x0 window draws no first frame at all', () => {
    // Spec: BO-1, NFR-011
    const pane = host()

    frameLoop(pane.surface, twoTaskGroupDocument(), UNSETTLED_SCREEN)
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(0)
  })

  it('BO-1 (MUST NOT): a happening that arrives before BO-1 is through draws nothing either', () => {
    // Spec: BO-1, BO-5, NFR-011
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), UNSETTLED_SCREEN)

    loop.receiveInput(key('P'))
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(0)
  })

  it('NFR-011: once the size is settled the first frame goes up, and it goes up whole', () => {
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), UNSETTLED_SCREEN)

    loop.receiveInput(key('P'))
    loop.resize(SCREEN)
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(1)
    expect(pane.drawn[0]).toContain(`width="${SCREEN.width}"`)
    expect(loop.current()!.regions.scheduleCanvas.width).toBe(SCREEN.width)
  })
})

describe("FT-1 of table T-078 -- a person's input is what owes a frame", () => {
  it('FT-1: an input table T-036 assigns runs exactly one more frame', () => {
    // Spec: FT-1, CA-2
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const before = pane.frames()

    loop.receiveInput(key('P'))
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(before + 1)
  })

  it('NFR-010: asking MK-10 is not a trigger -- isBrowserDefaultStopped draws nothing', () => {
    // Spec: NFR-010, MK-10
    // Why: MK-10 is asked before the watcher hears the happening, so it must change nothing.
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const before = pane.frames()

    for (let turn = 0; turn < 5; turn += 1) {
      loop.isBrowserDefaultStopped(key('P'))
      loop.isBrowserDefaultStopped(pointer('down', 500, 400))
      pane.runAnimationFrames()
    }

    expect(pane.frames()).toBe(before)
  })

  it('FR-048 (MUST NOT): a bare pointer move with no line following it draws nothing', () => {
    // Spec: FR-048
    // Why: the move is over the time ruler, which has no pointer operations, so nothing FR-048
    // exempts is in play; no ScreenWiring is given, so no UI part is drawn either.
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const ruler = loop.current()!.regions.timeRuler
    const before = pane.frames()

    loop.receiveInput(pointer('move', ruler.x + 10, ruler.y + 2))
    loop.receiveInput(pointer('move', ruler.x + 40, ruler.y + 4))
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(before)
  })
})

describe('MK-10 of table T-023 -- the browser is stopped for what this tool assigned', () => {
  it('MK-10 (MUST): every assignment of table T-036 this file drives answers true', () => {
    // Spec: MK-10
    // Why: true says assigned, not that something happened: SK-2's whole effect is a selection.
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)

    for (const row of T_036_DRIVEN) {
      expect(
        loop.isBrowserDefaultStopped(row.input()),
        `${row.row} (${row.spelled}) of table T-036 is an assignment, so MK-10 requires the browser default to be stopped`,
      ).toBe(true)
    }
  })

  it("MK-10 (MUST NOT): a combination this tool assigns nothing keeps the browser's own", () => {
    // Spec: MK-10
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)

    for (const one of NOT_ASSIGNED) {
      expect(loop.isBrowserDefaultStopped(one.input()), one.why).toBe(false)
    }
  })

  it('IN-4a (MUST): `Esc` with nothing to consume reaches the browser', () => {
    // Spec: IN-4a
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)

    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(false)
  })

  it('⛔ asking MK-10 changes nothing: the same question twice gets the same answer', () => {
    // Why: asked before the watcher hears the happening, so it must change nothing; had the first
    // ask consumed IN-4's first level, the second would answer false.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)

    loop.receiveInput(key('F1'))

    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(true)
    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(true)
    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(true)
  })
})

describe('IN-4 of table T-028 -- Esc consumes one level per press', () => {
  it('the loop KEEPS what screenStateFromInput returned: F1 leaves the help shown', () => {
    // Spec: SK-13, S-435
    // Why: UF-30 is pure and remembers nothing between happenings, so only this loop can hold the
    // value it answered with (LY-5).
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)

    loop.receiveInput(key('F1'))
    pane.runAnimationFrames()

    expect(screen.last().helpModal ?? null).not.toBeNull()
  })

  it('IN-4 (MUST): the first Esc interrupts the drag and leaves the normal help open', () => {
    // Why: IN-4 spends one rung per press, and the drag stands above the open-window rung where the help is.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)
    const center = planCenter(loop, 1)

    loop.receiveInput(key('F1'))
    loop.receiveInput(pointer('down', center.x, center.y))
    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(true)

    loop.receiveInput(key('Esc'))
    pane.runAnimationFrames()

    expect(
      screen.last().helpModal ?? null,
      'IN-4 consumes one level per press, so the help opened before the drag must still stand',
    ).not.toBeNull()
    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(true)
    loop.receiveInput(key('Esc'))
    pane.runAnimationFrames()
    expect(screen.last().helpModal ?? null).toBeNull()
  })

  it('IN-4a (MUST): the surface alone is one level -- the Esc after it goes to the browser', () => {
    // Why: the first IN-4 level on its own, so that a failure of the ladder says which level was
    // not consumed.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)

    loop.receiveInput(key('F1'))
    loop.receiveInput(key('Esc'))

    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(false)
  })

  it('IN-4 (MUST): the drag alone is one level -- the Esc after it goes to the browser', () => {
    // Why: screenStateFromInput cannot consume this level, a current value only the Framework holds
    // (LY-5), so dropping the press is UF-48's.
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const center = planCenter(loop, 1)

    loop.receiveInput(pointer('down', center.x, center.y))
    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(true)

    loop.receiveInput(key('Esc'))

    expect(
      loop.isBrowserDefaultStopped(key('Esc')),
      'IN-4 gives the drag in flight its own level, so the Esc that took it leaves nothing behind',
    ).toBe(false)
  })

  it('IN-4a (MUST): with the surface and the drag both consumed the next Esc goes to the browser', () => {
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)
    const center = planCenter(loop, 1)

    loop.receiveInput(key('F1'))
    loop.receiveInput(pointer('down', center.x, center.y))
    loop.receiveInput(key('Esc'))
    loop.receiveInput(key('Esc'))

    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(false)
  })

  it('SK-14: `P` hides the palette and a second `P` brings it back', () => {
    // Spec: SK-14
    // Why: S-99e is held by this loop alone, so a second press undoes the first only if what the
    // first answered was kept.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)

    expect(screen.last().commandPalette).not.toBeNull()

    loop.receiveInput(key('P'))
    pane.runAnimationFrames()
    expect(screen.last().commandPalette).toBeNull()

    loop.receiveInput(key('P'))
    pane.runAnimationFrames()
    expect(screen.last().commandPalette).not.toBeNull()
  })
})

describe('CS-2 of table T-066 -- the gesture is about the press, not about the release', () => {
  it('CS-2: the release is decided from what the surface had drawn AT THE PRESS', () => {
    // Spec: CS-2, IN-1, FR-053
    // Why: the press is read once and kept for the release; the palette is dragged away, so what
    // the surface answers a frame later is not what the gesture is about.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)

    // Step: press on IC-7 (S-99e), the entry SK-14 shares.
    screen.drawAt({ part: 'App Header', entry: 'IC-7', format: null, taskGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null })
    loop.receiveInput(pointer('down', 500, 20))
    // Step: redraw the surface with no entry under the pointer, then release.
    screen.drawAt(null)
    loop.receiveInput(pointer('move', 520, 24))
    loop.receiveInput(pointer('up', 520, 24))
    pane.runAnimationFrames()

    expect(
      screen.last().commandPalette,
      'the press landed on IC-7, so CS-2 makes the release that entry’s however the surface has been redrawn since',
    ).toBeNull()
  })

  it('CS-2: a press the surface answered nothing for stays that way, though it draws one later', () => {
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)

    screen.drawAt(null)
    loop.receiveInput(pointer('down', 500, 20))
    screen.drawAt({ part: 'App Header', entry: 'IC-7', format: null, taskGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null })
    loop.receiveInput(pointer('move', 520, 24))
    loop.receiveInput(pointer('up', 520, 24))
    pane.runAnimationFrames()

    expect(
      screen.last().commandPalette,
      'the press landed on nothing, so an entry drawn there afterwards cannot claim the release',
    ).not.toBeNull()
  })

  it('CS-2: a body drag writes the Task that was under the PRESS', () => {
    // Spec: GA-9, FR-011
    // Why: the release lands off Task 1's bar, so a hit resolved at the release would move nothing;
    // only the direction is asserted, since no row fixes how a partial day rounds.
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const center = planCenter(loop, 1)
    const width = planWidth(loop, 1)
    const before = loop.document()

    loop.receiveInput(pointer('down', center.x, center.y))
    loop.receiveInput(pointer('move', center.x + width, center.y))
    loop.receiveInput(pointer('up', center.x + width, center.y))
    pane.runAnimationFrames()

    const after = loop.document()
    expect(dayText(taskOf(after, 1).start)!.day).not.toBe(dayText(taskOf(before, 1).start)!.day)
    expect(taskOf(after, 1).start > taskOf(before, 1).start).toBe(true)
    expect(
      taskOf(after, 2).start,
      'the press was on Task 1, so no other Task may have been carried by it',
    ).toBe(taskOf(before, 2).start)
  })
})

describe('IN-1a of table T-028 -- a lost pointer ends the gesture as an abort', () => {
  it('IN-1a (MUST): the abort writes nothing', () => {
    // Spec: IN-1a, IN-1, WS-6
    // Why: an abort is not a release, so the drag that writes above writes nothing here; WS-6
    // replaces one reference, so an untouched document is the same value.
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const center = planCenter(loop, 1)
    const width = planWidth(loop, 1)
    const before = loop.document()

    loop.receiveInput(pointer('down', center.x, center.y))
    loop.receiveInput(pointer('move', center.x + width, center.y))
    loop.receiveInput(pointer('lost', center.x + width, center.y))
    pane.runAnimationFrames()

    expect(loop.document()).toBe(before)
    expect(stampOf(loop.document())).toEqual(stampOf(before))
  })

  it('IN-1a (MUST): the press is dropped, so AG-9 stops refusing every later write', () => {
    // Spec: IN-1a, AG-9
    // Why: IN-4's second level is the drag in flight, so an Esc that still finds one to consume is
    // a drag that never ended.
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const center = planCenter(loop, 1)

    loop.receiveInput(pointer('down', center.x, center.y))
    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(true)

    loop.receiveInput(pointer('lost', center.x, center.y))

    expect(
      loop.isBrowserDefaultStopped(key('Esc')),
      'after IN-1a there is no drag left for IN-4 to consume, so IN-4a hands the key to the browser',
    ).toBe(false)
  })

  it('IN-1 (MUST NOT): leaving the drawing area is NOT a lost pointer', () => {
    // Spec: IN-1
    // Why: a move far outside the window keeps the gesture, as IN-4's second level answering shows.
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const center = planCenter(loop, 1)

    loop.receiveInput(pointer('down', center.x, center.y))
    loop.receiveInput(pointer('move', -400, -400))

    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(true)
  })
})

describe('GR-19 of table T-023d -- a drag on the band moves the `Command Palette`', () => {
  // Spec: FR-053, GR-19, MK-7
  // Why: no row holds the palette's corner, so it is read off the surface description; a press
  // may begin anywhere on the band, so the corner moves by the travel, not to the pointer.

  // Summary: paletteCorner answers where the palette floats, as the surface was last told.
  function paletteCorner(screen: ScreenPane): { readonly x: number; readonly y: number } {
    const palette = screen.last().commandPalette
    if (palette === null) throw new Error('S-99e says it is showing, so one is described')
    return palette.at
  }

  // Spec: CS-2
  const aimAtTheBand = (screen: ScreenPane): void => {
    screen.drawAt({ part: U_26_PART, entry: T_109_GRAB_BAND, format: null, taskGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null })
  }

  it('FR-053 (MUST): the palette ends up the distance the pointer traveled away', () => {
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)
    const before = paletteCorner(screen)

    aimAtTheBand(screen)
    loop.receiveInput(pointer('down', 500, 320))
    loop.receiveInput(pointer('move', 440, 360))
    loop.receiveInput(pointer('up', 440, 360))
    pane.runAnimationFrames()

    // Why: the place, not the action: an answered action proves only that the press was read.
    expect(paletteCorner(screen)).toEqual({ x: before.x - 60, y: before.y + 40 })
  })

  it('FR-053: a second drag moves it again, by ITS travel and not to its pointer', () => {
    // Why: the second press begins far from where the first ended, so a loop that put the corner
    // where the finger let go would answer the pointer's own coordinates.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)
    const before = paletteCorner(screen)

    aimAtTheBand(screen)
    loop.receiveInput(pointer('down', 500, 320))
    loop.receiveInput(pointer('move', 440, 360))
    loop.receiveInput(pointer('up', 440, 360))
    pane.runAnimationFrames()

    aimAtTheBand(screen)
    loop.receiveInput(pointer('down', 200, 120))
    loop.receiveInput(pointer('move', 175, 135))
    loop.receiveInput(pointer('up', 175, 135))
    pane.runAnimationFrames()

    expect(paletteCorner(screen)).toEqual({ x: before.x - 60 - 25, y: before.y + 40 + 15 })
  })

  it('IN-1a (MUST): a pointer lost outside the window leaves the palette where it was', () => {
    // Spec: IN-1a, IN-1
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)
    const before = paletteCorner(screen)

    aimAtTheBand(screen)
    loop.receiveInput(pointer('down', 500, 320))
    loop.receiveInput(pointer('move', 560, 360))
    loop.receiveInput(pointer('lost', 560, 360))
    pane.runAnimationFrames()

    expect(paletteCorner(screen)).toEqual(before)
  })

  it('IN-4 (MUST): `Esc` takes the drag in flight, so the palette does not move', () => {
    // Spec: IN-4
    // Why: the release that follows must not settle the drag either: its gesture is already gone.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)
    const before = paletteCorner(screen)

    aimAtTheBand(screen)
    loop.receiveInput(pointer('down', 500, 320))
    loop.receiveInput(pointer('move', 560, 360))
    loop.receiveInput(key('Esc'))
    pane.runAnimationFrames()
    expect(paletteCorner(screen), 'Esc consumed the drag, so nothing moved').toEqual(before)

    loop.receiveInput(pointer('up', 560, 360))
    pane.runAnimationFrames()
    expect(paletteCorner(screen), 'the release of an aborted drag settles nothing').toEqual(before)
  })

  it('CS-2: a press that landed on nothing does not move the palette, however it is redrawn', () => {
    // Spec: CS-2
    // Why: the corner moves because the press was on the band, so the surface is told of the band
    // only after the button is already down.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)
    const before = paletteCorner(screen)

    screen.drawAt(null)
    loop.receiveInput(pointer('down', 500, 320))
    aimAtTheBand(screen)
    loop.receiveInput(pointer('move', 560, 360))
    loop.receiveInput(pointer('up', 560, 360))
    pane.runAnimationFrames()

    expect(paletteCorner(screen)).toEqual(before)
  })
})

describe('FR-046 and SK-20 -- the day written into statusDate is the LOCAL calendar day', () => {
  // Why: the clock is frozen where the reader's day and UTC's differ, both ways (Kiritimati is
  // UTC+14, Niue UTC-11), so a loop that read the UTC day answers the neighbouring day.
  const AHEAD = {
    zone: 'Pacific/Kiritimati',
    instant: '2026-08-21T13:00:00Z',
    localDay: { year: 2026, month: 8, day: 22 },
    utcDay: { year: 2026, month: 8, day: 21 },
  }
  const BEHIND = {
    zone: 'Pacific/Niue',
    instant: '2026-08-22T05:00:00Z',
    localDay: { year: 2026, month: 8, day: 21 },
    utcDay: { year: 2026, month: 8, day: 22 },
  }

  for (const machine of [AHEAD, BEHIND]) {
    it(`FR-046 (MUST NOT): on a machine in ${machine.zone} the line is dated the reader's day, not UTC's`, () => {
      // Spec: FR-046
      process.env.TZ = machine.zone
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(machine.instant))
      // Why: the premise: the two calendars really disagree at this instant on this machine.
      expect(new Date().getDate()).toBe(machine.localDay.day)
      expect(new Date().getUTCDate()).toBe(machine.utcDay.day)

      const pane = host()
      const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)

      loop.receiveInput(key('D', { ctrl: true, shift: true }))
      pane.runAnimationFrames()

      expect(dayText(projectOf(loop.document()).statusDate)).toEqual(machine.localDay)
    })
  }

  it('SK-20: pressing it again clears the line, and FR-046 forbids a second flag for it', () => {
    // Spec: FR-046, SK-20
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)

    loop.receiveInput(key('D', { ctrl: true, shift: true }))
    expect(projectOf(loop.document()).statusDate).not.toBeNull()

    loop.receiveInput(key('D', { ctrl: true, shift: true }))
    pane.runAnimationFrames()

    expect(projectOf(loop.document()).statusDate).toBeNull()
  })
})

describe('FR-063 and ED-1 of table T-229 -- who wrote it, and when', () => {
  const INSTANT = '2026-08-21T13:00:00Z'

  // Summary: frozen gives a host whose clock stands still, so the instant a write stamps is known.
  const frozen = (): Host => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(INSTANT))
    return host()
  }

  it('ED-1 (MUST): a write made from the screen signs itself with table T-229’s word', () => {
    // Spec: ED-1
    const pane = frozen()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)

    loop.receiveInput(key('D', { ctrl: true, shift: true }))

    expect(stampOf(loop.document()).lastEditedBy).toBe(ED_1_WORD)
  })

  it('FR-063 (MUST): the instant is ISO 8601, UTC, to the second -- no milliseconds', () => {
    // Spec: FR-063, AT-129
    const pane = frozen()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)

    loop.receiveInput(key('D', { ctrl: true, shift: true }))

    const stamp = stampOf(loop.document())
    const toTheSecond = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
    expect(stamp.scheduleUpdatedAt).toMatch(toTheSecond)
    expect(stamp.settingsUpdatedAt).toMatch(toTheSecond)
    // Why: the instant is UTC, a different thing from the calendar day the same keystroke wrote
    // (FR-046).
    expect(stamp.settingsUpdatedAt).toBe(INSTANT)
  })

  it('WS-5 / FR-063: a schedule-data write moves the schedule instant', () => {
    // Spec: WS-5, DR-2
    const pane = frozen()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const before = stampOf(loop.document()).scheduleUpdatedAt

    loop.receiveInput(key('D', { ctrl: true, shift: true }))

    expect(stampOf(loop.document()).scheduleUpdatedAt).not.toBe(before)
    expect(stampOf(loop.document()).scheduleUpdatedAt).toBe(INSTANT)
  })

  it('FR-063 (MUST NOT): a presentation-only write leaves the schedule instant where it was', () => {
    // Spec: FR-063, SK-16, UN-8
    const pane = frozen()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const before = stampOf(loop.document())

    loop.receiveInput(key('+', { shift: true }))

    const after = stampOf(loop.document())
    expect(after.scheduleUpdatedAt).toBe(before.scheduleUpdatedAt)
  })

  it('FR-063 (MUST NOT): ... and a zoom alone moves neither the other instant nor the writer (CR-807)', () => {
    // Spec: FR-063, UN-8, AG-2
    const pane = frozen()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const before = stampOf(loop.document())

    loop.receiveInput(key('+', { shift: true }))

    const after = stampOf(loop.document())
    expect(loop.document().documentSettings).not.toEqual(twoTaskGroupDocument().documentSettings)
    expect(after.settingsUpdatedAt).toBe(before.settingsUpdatedAt)
    expect(after.lastEditedBy).toBe(before.lastEditedBy)
  })
})

describe('the specification still says what these cases copy', () => {
  it('table T-036 still spells the assignments this file drives', () => {
    for (const row of T_036_DRIVEN) {
      const cell = rowOf('T-036', row.row).by['割当'] ?? ''
      expect(
        sameSpelling(cell),
        `table T-036 row ${row.row} no longer spells ${row.spelled}`,
      ).toContain(sameSpelling(row.spelled))
    }
  })

  it('table T-036 still calls itself the whole roster of shortcut assignments', () => {
    expect(REQUIREMENTS).toContain('`GRS` は、表 T-036 に無いショートカットキーを持たないこと。')
  })

  it('MK-10 still names Ctrl+P as one this tool must not take, and Ctrl+F as SK-24, so taken', () => {
    const mk10 = rowOf('T-023', 'MK-10').cells.join(' ')
    expect(mk10).toContain('`GRS` は、割り当てていない組合せのブラウザーの既定動作を止めないこと')
    expect(mk10).toContain(MK_10_CTRL_P)
    expect(mk10).toContain(MK_10_CTRL_F)
  })

  it('table T-229 ED-1 still gives the screen the word these cases sign with', () => {
    const ed1 = rowOf('T-229', 'ED-1')
    expect(ed1.by['書き込みの入口']).toContain('画面を操作する人')
    expect(ED_1_WORD).not.toBe('')
    // Spec: ED-2
    // Why: the word is not written down here; what is pinned is that it is one reserved word, not
    // one the Agent API's callers may name themselves with.
    expect(ED_1_WORD).not.toBe(bare(rowOf('T-229', 'ED-3').by['書く語'] ?? ''))
  })

  it('FR-046 still requires the reader’s local calendar day and forbids UTC', () => {
    expect(REQUIREMENTS).toContain('`GRS` は、`IMPS-515` の本日を、読む人の機のローカルの暦の日とすること。')
    expect(REQUIREMENTS).toContain('`GRS` は、`IMPS-515` の本日に UTC の暦の日を用いないこと。')
  })

  it('FR-063 still spells both instants ISO 8601, UTC, to the second', () => {
    expect(REQUIREMENTS).toContain('`GRS` は、2 つの刻を、いずれも `ISO 8601`・UTC・秒までで書くこと')
    expect(REQUIREMENTS).toContain(
      '`GRS` は、見せ方の群だけを変える更新で、スケジュールデータの群の刻を動かさないこと',
    )
  })

  it('IN-4 still fixes the order of the levels, and IN-4a still hands the rest to the browser', () => {
    const in4 = rowOf('T-028', 'IN-4').cells.join(' ')
    expect(in4).toContain('1 階層ぶん消費し')
    expect(in4).toContain('開いている面 → 進行中のドラッグ・引きかけの矢印 → 開いているウィンドウ → プロパティパネル → 構え')
    expect(rowOf('T-028', 'IN-4a').cells.join(' ')).toContain(
      '消費する対象が 1 つも無いときは、必ずブラウザーへ渡すこと（MUST）',
    )
  })

  it('IN-1a still requires a lost pointer to end the drag as an abort', () => {
    expect(rowOf('T-028', 'IN-1a').cells.join(' ')).toContain(
      'ドラッグを中断として終わらせること（MUST）',
    )
    expect(rowOf('T-028', 'IN-1').cells.join(' ')).toContain(
      'ポインターが描画領域の外へ出たことを中断としてはならない（MUST NOT）',
    )
  })

  it('GR-19 still stands FIRST in table T-023d, and still moves the palette', () => {
    // Why: the preamble makes the upper row win, so the drag cases rest on this row being first;
    // a re-ordering of the table lands here.
    const t023d = specTable('T-023d')
    expect(t023d.rows[0]?.id, 'table T-023d no longer opens with the palette band').toBe('GR-19')
    expect(REQUIREMENTS).toContain('`GRS` は、表 T-023d で先に並ぶ `GR` の行ほど優先すること。')

    const gr19 = t023d.rows[0]?.cells.join(' ') ?? ''
    expect(gr19).toContain(U_26_PART)
    expect(gr19).toContain('グリップを掴んだとき、`GRS` はパレットを動かすこと（`FR-053`）。')
    expect(gr19).toContain('FR-053')
  })

  it('FR-053 still makes the palette something the person drags', () => {
    expect(REQUIREMENTS).toContain('`GRS` は、作成者がコマンドパレットをドラッグで動かせるようにすること。')
  })

  it('table T-109 still answers the band by a row that is NOT a button', () => {
    // Why: the row is what a press on the band arrives as; the sentence is why no CommandItem may
    // stand for it.
    const ic53 = rowOf('T-109', T_109_GRAB_BAND)
    expect(bare(ic53.by['面'] ?? '')).toBe(U_26_PART)
    expect(ic53.by['何の入口か']).toContain('ボタンではない')
    expect(ic53.by['正']).toContain('FR-053')
  })

  it('CS-2 of table T-066 still freezes the gesture at the press', () => {
    const cs2 = rowOf('T-066', 'CS-2').cells.join(' ')
    expect(cs2).toContain('身振りを始めた時点の文書')
    expect(cs2).toContain('ポインターを押した時点')
  })

  it('table T-078 still makes a person’s input FT-1, and BO-1 still holds the first frame back', () => {
    expect(rowOf('T-078', 'FT-1').cells.join(' ')).toContain('人の入力（ポインターとキー）')
    expect(rowOf('T-077', 'BO-1').cells.join(' ')).toContain('寸法が確定するまで 1 枚も描かない')
  })
})

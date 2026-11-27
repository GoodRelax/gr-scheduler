// Unit tests: while a surface stands over the schedule, the wheel goes to the browser and the keys stay this tool's.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerInput,
  WheelInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { specTable, unbroken } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

/* eslint-disable @typescript-eslint/no-explicit-any -- the fixture edits the template JSON loosely */

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readRepoFile(join(SPEC, '01-04-requirements.md'), 'utf8')).split('\n')

function closingRuleLine(): string {
  const at = REQUIREMENTS.findIndex((line) =>
    line.startsWith('`Confirmation`（`U-55`）または'))
  if (at < 0) {
    throw new Error('table T-023 no longer states the closing rule this file is about')
  }
  // Why: the rule is broken at every sentence by two trailing spaces where the text had no character,
  // so the pieces join with nothing.
  const said: string[] = []
  for (const line of REQUIREMENTS.slice(at)) {
    if (line.trim() === '') break
    said.push(line.trim())
  }
  return said.join('')
}

function handedOverSegment(): string {
  const rule = closingRuleLine()
  const at = rule.indexOf('を当てず')
  if (at < 0) throw new Error('the closing rule no longer says 「を当てず」')
  return rule.slice(0, at)
}

const T_023 = specTable('T-023')

// Why: not bare(), which answers the first code span of a cell; an operation cell is a sentence, so
// only the emphasis marks come off.
const plain = (cell: string): string => cell.replace(/[`*]/g, '').trim()

// Why: a wheel row is found by its shape, an operation cell that ends by naming the wheel, not by a
// list of IDs; MK-9 names an environment without a wheel, so it is not one.
function wheelRowsOfTable(): readonly string[] {
  return T_023.rows
    .filter((row) => plain(row.by['操作'] ?? '').replace(/（[^）]*）$/, '').endsWith('ホイール'))
    .map((row) => row.id)
}

// Trap: a typed list of row IDs here would keep passing after the rule gained or lost a row, which is
// the regression this file exists to catch.
function handedOverRows(): readonly string[] {
  const named = handedOverSegment().match(/MK-\d+[a-z]?/g) ?? []
  if (named.length !== 2) {
    throw new Error(
      `the closing rule no longer names a range of two rows: ${JSON.stringify(named)}`,
    )
  }
  const ids = T_023.rows.map((row) => row.id)
  const from = ids.indexOf(named[0] as string)
  const to = ids.indexOf(named[1] as string)
  if (from < 0 || to < 0 || to < from) {
    throw new Error(`table T-023 does not run from ${named[0]} to ${named[1]}`)
  }
  return ids.slice(from, to + 1)
}

interface WheelRow {
  readonly row: string
  readonly operation: string
  readonly modifiers: InputModifiers
}

function wheelRows(): readonly WheelRow[] {
  return handedOverRows().map((id) => {
    const row = T_023.rows.find((one) => one.id === id)
    if (row === undefined) throw new Error(`table T-023 has no row ${id}`)
    const operation = plain(row.by['操作'] ?? '')
    return {
      row: id,
      operation,
      modifiers: {
        ctrl: operation.includes('Ctrl'),
        shift: operation.includes('Shift'),
        alt: operation.includes('Alt'),
        meta: false,
      },
    }
  })
}

const HANDED_OVER = wheelRows()

const assignmentOf = (row: string): readonly (readonly string[])[] => {
  const found = specTable('T-036').rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-036 has no row ${row}`)
  return (found.by['割当'] ?? '')
    .split('\uff0f')
    .map((one) => [...one.matchAll(/`([^`]+)`/g)].map((span) => span[1] ?? ''))
    .filter((keys) => keys.length > 0)
}

// Spec: BT-4, FR-027
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

const PARENT = 1
const CHILD = 2

// Why: the WBS edge is the point of the fixture: FR-032 asks before deleting a Task with WBS
// descendants, the only Confirmation these cases can raise without drawing a panel.
function twoTaskGroupDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  const task = (
    uid: number,
    parentTaskUid: number | null,
    start: string,
    finish: string,
    name: string,
  ): Task =>
    ({
      uid,
      parentTaskUid,
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
    }) as unknown as Task
  const row = (id: string, label: string, order: number) => ({
    id,
    parentId: null,
    name: label,
    derivedFromTaskUid: null,
    order,
    treeState: 'auto', editPermission: null,
    color: null,
    minHeightPx: null,
  })
  return {
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
        task(PARENT, null, '2026-04-01T00:00:00', '2026-04-10T00:00:00', 'One'),
        task(CHILD, PARENT, '2026-05-06T00:00:00', '2026-05-20T00:00:00', 'Two'),
      ],
      resources: [],
      assignments: [],
      taskGroups: [row(ALPHA, 'Alpha', 0), row(BETA, 'Beta', 1)],
      taskGroupMembers: [
        { taskUid: PARENT, taskGroupId: ALPHA },
        { taskUid: CHILD, taskGroupId: BETA },
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
  } as unknown as Document
}

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

// Why: node has no requestAnimationFrame, so the host is a fake; nothing in it decides anything about
// a wheel.
function host() {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showMarqueeOverlaySvg: () => undefined, showSvg: () => undefined },
    runAnimationFrames: (): void => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
  }
}

function screenPane(language: DisplayLanguage = 'ja') {
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
    wiring: { surface, language } satisfies ScreenWiring,
    drawAt: (next: ScreenPart | null): void => {
      part = next
    },
    last: (): ScreenView => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const key = (which: string, modifiers: Partial<InputModifiers> = {}): KeyInput => ({
  kind: 'key',
  key: which,
  modifiers: { ...NO_MODIFIERS, ...modifiers },
})

const ESCAPE = (): HumanInput => key('Esc')
const OPEN_HELP = (): HumanInput => key('F1')
const SELECT_ALL = (): HumanInput => key('A', { ctrl: true })
const DELETE = (): HumanInput => key('Delete')
const SAVE = (): HumanInput => key('S', { ctrl: true })

const HELP_MODAL = ((specTable('T-109').rows.find((one) => one.id === 'IC-129')?.by['面'] ?? '').split(' / ')[0] ?? '')
  .replace(/[`*]/g, '')
  .trim()

const HN_1 = '表 T-023 の後の段の「面が立っているあいだ」に当たらない —— 日程表に当てる'

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  wheel(modifiers: InputModifiers, sign?: 1 | -1): WheelInput
  // Summary: stops() answers whether the browser default is stopped for one input, asked before the loop hears it.
  stops(input: HumanInput): boolean
  snapshot(): string
  modalIsUp(): boolean
  helpWindow(): string | null
  pressMinimize(): void
  confirmationIsUp(): boolean
}

function stage(): Stage {
  const pen = host()
  const screen = screenPane()
  const loop = frameLoop(pen.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)
  pen.runAnimationFrames()
  const regions = () => {
    const values = loop.current()
    if (values === null) throw new Error('the loop has run no frame')
    return values.regions
  }
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      pen.runAnimationFrames()
    },
    // Why: scrollPx is how far the host would have scrolled and notches carries the same sign; the
    // magnitude is the caller's, never the specification's.
    wheel: (modifiers, sign = 1) => ({
      kind: 'wheel',
      x: regions().taskGroupArea.x + 40,
      y: regions().taskGroupArea.y + 40,
      modifiers,
      notches: sign,
      scrollPx: { x: 0, y: 120 * sign },
    }),
    stops: (input) => loop.isBrowserDefaultStopped(input),
    snapshot: () => JSON.stringify(loop.document()),
    modalIsUp: () => ['normal', 'maximized'].includes(screen.last().helpModal?.windowState ?? ''),
    helpWindow: () => screen.last().helpModal?.windowState ?? null,
    pressMinimize: () => {
      screen.drawAt({
        part: HELP_MODAL,
        entry: 'IC-129',
        format: null,
        taskGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      } as ScreenPart)
      for (const phase of ['down', 'up'] as const) {
        const press: PointerInput = {
          kind: 'pointer', phase, button: 'left', x: 700, y: 20, modifiers: { ...NO_MODIFIERS }, clickCount: 1,
        }
        loop.receiveInput(press)
        pen.runAnimationFrames()
      }
      screen.drawAt(null)
    },
    confirmationIsUp: () => (screen.last() as any).confirmation !== null,
  }
}

function withTheHelpUp(): Stage {
  const built = stage()
  built.send(OPEN_HELP())
  return built
}

function withTheHelpMinimized(): Stage {
  const built = withTheHelpUp()
  built.pressMinimize()
  return built
}

// Why: the Confirmation is raised the way FR-032 raises one: the selection holds a Task with a WBS
// descendant, so SK-3's Delete has to ask first.
function withAConfirmationUp(): Stage {
  const built = stage()
  built.send(SELECT_ALL())
  built.send(DELETE())
  return built
}

// Spec: T-023, MK-9, T-036
// Why: UF-48 is tested, not the translator, because Confirmation is held beside ScreenState by the
// Framework (LY-5), so only the loop can be asked about both.
describe('the manuscript still says what these cases read', () => {
  it('⭐ table T-023 still closes with the rule this file is about', () => {
    // Why: without this, a rule reworded or withdrawn would leave every case below testing a habit.
    const rule = closingRuleLine()
    expect(rule, 'it still names both things that can stand').toContain('`ScreenState` が持つ面')
    expect(rule, 'the MUST').toContain('ブラウザの既定動作へ渡すこと（MUST）')
    expect(rule, 'the MUST NOT about the keys').toContain(
      'キーの割当は本規則の対象ではない（MUST NOT）',
    )
    expect(rule, 'and IN-4 is still the reason it gives').toContain('表 T-028 の `IN-4`')
  })

  it('the range the rule prints is exactly the wheel rows table T-023 carries', () => {
    // Why: both sides are read, neither typed, so a wheel row added outside the range fails here, and so
    // does a range that reaches past the wheel rows.
    const derived = wheelRowsOfTable()
    expect(derived.length, 'table T-023 still has wheel rows to walk').toBeGreaterThan(0)
    expect(HANDED_OVER.map((one) => one.row)).toEqual(derived)
    for (const one of HANDED_OVER) {
      expect(one.operation, `${one.row} is a wheel row`).toContain('ホイール')
    }
    // Why: MK-9's operation cell also carries the word wheel; a predicate that merely searched for the
    // word would sweep it in and disagree with the rule's own census.
    expect(derived, 'the row that names the ABSENCE of a wheel is not one').not.toContain('MK-9')
    expect(
      plain(T_023.rows.find((one) => one.id === 'MK-9')?.by['操作'] ?? ''),
      'and it is still the row that would have been swept in',
    ).toContain('ホイール')
  })

  it('the turns are told apart by the modifiers their own row spells', () => {
    // Why: each row carries its own modifier combination, else the walk below would press the same turn
    // several times and count it as several rows.
    const spellings = HANDED_OVER.map((one) => JSON.stringify(one.modifiers))
    expect(new Set(spellings).size, 'one turn per row').toBe(HANDED_OVER.length)
    const unmodified = HANDED_OVER.filter(
      (one) => !one.modifiers.ctrl && !one.modifiers.shift && !one.modifiers.alt,
    )
    expect(unmodified.map((one) => one.row), 'exactly one bare turn').toEqual(['MK-1'])
  })

  it('the keys these cases press are still the ones table T-036 assigns', () => {
    expect(assignmentOf('SK-13')).toEqual([['F1']])
    expect(assignmentOf('SK-8')).toEqual([['Esc']])
    expect(assignmentOf('SK-11')).toEqual([['Ctrl', 'S']])
  })

  it('the fixture is a valid GRS JSON document with a parent task on it', () => {
    const made = twoTaskGroupDocument()
    const report = validateDocument(made)
    expect(report.errors).toEqual([])
    expect((made as any).schedule.tasks[1].parentTaskUid).toBe(PARENT)
  })
})

// Spec: SK-13, S-99g, FR-032, U-55, FR-051, FR-016
describe('the two ways a surface can stand, and the state with none', () => {
  it('SK-13: `F1` puts up the help, in the normal state S-99g counts as standing', () => {
    const built = withTheHelpUp()
    expect(built.modalIsUp()).toBe(true)
  })

  it('FR-032: deleting a `Task` with WBS descendants raises a `Confirmation`', () => {
    const built = withAConfirmationUp()
    expect(built.confirmationIsUp()).toBe(true)
    // Why: the deletion has not landed, so a wheel refused below is refused by the rule and not by a
    // schedule with nothing left to scroll.
    expect((built.loop.document() as any).schedule.tasks).toHaveLength(2)
  })

  it('⭐ with nothing standing, every handed-over turn DOES move the document', () => {
    // Why: the control: a build that refused every wheel would pass the cases below; how far a turn moves
    // is in no row, so only that the document moved is asked.
    // Why: T-262 ZE-2 / ZE-3 forbid writing a vertical-axis zoom at its end, so one direction may rightly move
    // nothing; a build refusing every wheel still moves neither.
    for (const one of HANDED_OVER) {
      const moved = ([1, -1] as const).some((sign) => {
        const built = stage()
        const before = built.snapshot()
        built.send(built.wheel(one.modifiers, sign))
        return built.snapshot() !== before
      })
      expect(moved, `${one.row} moved the document in one of its two directions`).toBe(true)
    }
  })
})

const STANDING = [
  { what: 'the normal help (SK-13, counted as standing by S-99g)', raise: withTheHelpUp },
  { what: '`Confirmation`（`U-55`） (FR-032の確認)', raise: withAConfirmationUp },
] as const

// Spec: T-023, MK-1, MK-2, MK-3, MK-4, MK-5, MK-10
// Why: the pointer rows PTD-1 to PTD-5 are outside the rule's subject, so no case presses a button.
describe('表 T-023 の結び -- while a surface stands, every wheel row belongs to the browser', () => {
  for (const surface of STANDING) {
    for (const one of HANDED_OVER) {
      it(`${one.row} is not applied while ${surface.what} stands`, () => {
        const built = surface.raise()
        const before = built.snapshot()
        built.send(built.wheel(one.modifiers))
        expect(built.snapshot(), `${one.row} must not move anything`).toBe(before)
      })

      it(`${one.row} is handed to the browser while ${surface.what} stands`, () => {
        // Why: handing over means preventDefault is not called; the bare turn is asserted too, since this
        // rule names every wheel row though MK-10 says nothing of an unmodified one.
        const built = surface.raise()
        expect(built.stops(built.wheel(one.modifiers)), one.row).toBe(false)
      })
    }
  }

  it('MK-10 (MUST): while NO surface stands, a modified turn is still this tool`s', () => {
    // Why: the other half of the exception, else the cases above are met by a build that never stopped a
    // wheel; the bare turn is left out because no rule says what it answers with nothing standing.
    const modified = HANDED_OVER.filter(
      (one) => one.modifiers.ctrl || one.modifiers.shift || one.modifiers.alt,
    )
    expect(modified.length, 'MK-10 still has rows of this table to reach').toBeGreaterThan(0)
    for (const one of modified) {
      const built = stage()
      expect(built.stops(built.wheel(one.modifiers)), one.row).toBe(true)
    }
  })
})

describe(`HN-1 of table T-336: ${HN_1}`, () => {
  it('the manuscript still says it', () => {
    const row = specTable('T-336').rows.find((one) => one.id === 'HN-1')
    expect(row?.cells.join(' ') ?? '').toContain(HN_1)
  })

  it('with the help minimized, every handed-over turn moves the document as with nothing standing', () => {
    // Why: the same control as above, run with WB-2 up; one of the two directions may rightly move nothing (ZE-2 / ZE-3).
    for (const one of HANDED_OVER) {
      const moved = ([1, -1] as const).some((sign) => {
        const built = withTheHelpMinimized()
        expect(built.helpWindow(), 'premise: IC-129 minimized the help').toBe('minimized')
        const before = built.snapshot()
        built.send(built.wheel(one.modifiers, sign))
        return built.snapshot() !== before
      })
      expect(moved, `${one.row} moved the document in one of its two directions`).toBe(true)
    }
  })
})

// Spec: IN-4, IN-4a, SK-8, SK-11, MK-10
describe('表 T-023 の結び -- the keys are NOT what this rule hands over', () => {
  for (const surface of STANDING) {
    it(`\`Esc\` is still this tool's while ${surface.what} stands`, () => {
      // Why: IN-4 gives an open surface a level of Esc, so there is something to consume and the browser's
      // own behavior is stopped.
      const built = surface.raise()
      expect(built.stops(ESCAPE())).toBe(true)
    })

    it(`\`Ctrl+S\` is still taken from the browser while ${surface.what} stands`, () => {
      // Why: SK-11 assigns Ctrl+S and MK-10 takes it from the browser, as this rule hands over the wheel
      // only; what the save then does is written nowhere, so it is not asserted.
      const built = surface.raise()
      expect(built.stops(SAVE())).toBe(true)
    })
  }

  it('IN-4: the `Esc` that was kept really closes the 面', () => {
    // Why: a build that answered true and did nothing would leave the surface standing for ever.
    const built = withTheHelpUp()
    expect(built.modalIsUp()).toBe(true)
    built.send(ESCAPE())
    expect(built.modalIsUp()).toBe(false)
  })

  it('IN-4a: with nothing standing, that same `Esc` goes to the browser', () => {
    // Why: the control for the cases above: IN-4a sends Esc to the browser when nothing is to be
    // consumed, so isBrowserDefaultStopped is not a constant true for Esc.
    expect(stage().stops(ESCAPE())).toBe(false)
  })
})

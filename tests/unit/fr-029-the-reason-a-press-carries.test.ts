// Unit tests: a press on a spent entrance carries the T-233 row that matches it.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

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
import { bare, specTable, unbroken } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

/* eslint-disable @typescript-eslint/no-explicit-any -- the fakes cast host and screen parts loosely */

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const mannerOf = (reason: string): string => bare(rowOf('T-233', reason).by['作法'] ?? '')

const displayOf = (reason: string): string => bare(rowOf('T-233', reason).by['表示の仕方'] ?? '')

const HIDDEN = '出さない'

// Why: the rule cell is the one thing T-233 and T-109 share, so it holds each
// pair below to the manuscript; a table that moves one fails the premise.
const ruleOf = (table: string, id: string): string => {
  const cell = bare(rowOf(table, id).by['正'] ?? '')
  const found = [...cell.matchAll(/`([^`]+)`/g)]
  const last = found[found.length - 1]?.[1]
  return last ?? cell
}

const TASK_GROUP_PANEL = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')

// Why: the surface column is read, not typed: typing the pairs would make a
// second copy of that column.
function surfaceOf(icon: string): string {
  const cell = bare(rowOf('T-109', icon).by['面'] ?? '')
  const first = cell.split('/')[0]?.trim() ?? ''
  if (first === '') throw new Error(`表 T-109 ${icon} names no 面`)
  return first
}

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const FR_029_ONLY_WHEN_PRESSED = '利用者が薄く描いた入口を押したときに限り、`GRS` は行えない理由を通知の仕組みへ運ぶこと'
const FR_029_THE_MATCHING_ROW =
  '`GRS` は、運ぶ理由を、押された入口の場面に当たる `FR-076` の 表 T-233 の行とすること。'
const FR_029_NOT_THE_FALLBACK = '押された入口の場面に当たる行が 表 T-233 にあるとき、`GRS` は落ち先を運ばないこと。'
// Spec: IMPS-1113
const FR_029_RS_27_IS_THE_FALLBACK = 'もし押された入口の場面に当たる行が 表 T-233 に無い場合、`GRS` は落ち先の `RS-27`（出さない）を運ぶこと。'
const FR_029_NOT_ON_HOVER = '`GRS` は、ポインターが入口に乗っただけで、行えない理由を出さないこと。'
const T_051_ONLY_DRAWN_TASK_GROUPS =
  '`GRS` は、描かれていないタスクグループの折りたたみを数えないこと（`IMPS-1981` の例外を除く）。'
// Spec: IMPS-1980
const T_051_NO_CHANGE_MEANS_SPENT =
  '`IMPS-1979` の操作で、描かれるタスクグループが 1 つも増減しないとき、`GRS` は、対象が 1 つも無いものとして扱うこと（数えるのは配下のタスクグループの数ではなく、操作の前後で描かれるタスクグループの差である）。'

// Why: a Notice carries words but not its reason, so a notice is pinned to a
// row of T-233 by the words the manuscript's dictionary holds for that row.
interface ReasonWords {
  readonly specTableRowId: string
  readonly text: Readonly<Record<DisplayLanguage, string>>
  readonly nextStep: Readonly<Record<DisplayLanguage, string>>
}

const REASON_WORDS: readonly ReasonWords[] = (
  JSON.parse(
    readRepoFile(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
  ) as { reasons: ReasonWords[] }
).reasons

function wordsFor(specTableRowId: string): ReasonWords {
  const found = REASON_WORDS.find((one) => one.specTableRowId === specTableRowId)
  if (found === undefined) throw new Error(`FR-038's dictionary holds no words for ${specTableRowId}`)
  return found
}

const FALLBACK = 'RS-27'

const TEMPLATE = JSON.parse(
  readRepoFile(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const ALPHA = '11111111-1111-4111-8111-111111111111'
const BETA = '22222222-2222-4222-8222-222222222222'
const GAMMA = '33333333-3333-4333-8333-333333333333'

interface Fixture {
  readonly folded?: readonly string[]
  // Why: S-227 and S-228 are independent, so neither IC-8 nor IC-9 is ever spent
  // and both appear only among the armed entrances.
  readonly planActual?: { readonly isPlanVisible: boolean; readonly isActualVisible: boolean }
}

// Why: three deep, since T-051 counts the change in drawn task groups: folding
// a leaf changes no picture, which is what leaves IC-77 spent there.
function documentWith(part: Fixture = {}): Document {
  const template = structuredClone(TEMPLATE) as any
  const folded = new Set(part.folded ?? [])
  const task = (uid: number, start: string, finish: string, name: string): Task =>
    ({
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
    }) as unknown as Task
  const row = (id: string, parentId: string | null, label: string, order: number) => ({
    id,
    parentId,
    name: label,
    derivedFromTaskUid: null,
    order,
    treeState: folded.has(id) ? 'collapsed' : 'auto',
    editPermission: null,
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
        task(1, '2026-04-01T00:00:00', '2026-04-10T00:00:00', 'One'),
        task(2, '2026-05-06T00:00:00', '2026-05-20T00:00:00', 'Two'),
        task(3, '2026-06-01T00:00:00', '2026-06-12T00:00:00', 'Three'),
      ],
      resources: [],
      assignments: [],
      taskGroups: [
        row(ALPHA, null, 'Alpha', 0),
        row(BETA, ALPHA, 'Beta', 0),
        row(GAMMA, BETA, 'Gamma', 0),
      ],
      taskGroupMembers: [
        { taskUid: 1, taskGroupId: ALPHA },
        { taskUid: 2, taskGroupId: BETA },
        { taskUid: 3, taskGroupId: GAMMA },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      ...(part.planActual === undefined ? {} : part.planActual),
    },
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

interface Host {
  readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }
  runAnimationFrames(): void
}

function host(): Host {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showMarqueeOverlaySvg: () => undefined, showSvg: () => undefined },
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

interface ScreenPane {
  readonly wiring: ScreenWiring
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
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
    wiring: { surface, language },
    drawAt: (next) => {
      part = next
    },
    last: () => {
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

const ON_THE_SURFACE = { x: 80, y: 120 }

interface Stage {
  readonly loop: FrameLoop
  readonly screen: ScreenPane
  send(input: HumanInput): void
  aimAt(entry: string, taskGroupId: string): void
  aimAtEntry(part: string, entry: string): void
  aimAtNothing(): void
  notices(): ScreenView['notices']
}

function stage(part: Fixture = {}, language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
  const screen = screenPane(language)
  const loop = frameLoop(pen.surface, documentWith(part), SCREEN, screen.wiring)
  pen.runAnimationFrames()
  const at = (surface: string, entry: string, taskGroupId: string | null) => {
    screen.drawAt({
      part: surface,
      entry: entry as any,
      format: null,
      taskGroupId,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  }
  return {
    loop,
    screen,
    send: (input) => {
      loop.receiveInput(input)
      pen.runAnimationFrames()
    },
    aimAtEntry: (surface, entry) => at(surface, entry, null),
    aimAt: (entry, taskGroupId) => at(TASK_GROUP_PANEL, entry, taskGroupId),
    aimAtNothing: () => screen.drawAt(null),
    notices: () => screen.last().notices,
  }
}

function press(built: Stage): void {
  built.send(pointer('down', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
  built.send(pointer('up', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
}

interface Spent {
  readonly icon: string
  readonly reason: string
  readonly fixture: Fixture
  readonly onTaskGroup: string | null
  readonly because: string
  // Why: primed by a press, not a fixture, since the level-zero fold (S-418) is a
  // document setting reached here through the entrance that writes it.
  readonly primedBy?: readonly { readonly entry: string; readonly onTaskGroup: string | null }[]
}

// Spec: HF-2, HF-10, HF-11, HF-12, HF-13, HR-2, HR-4, HR-7, FR-034
const SPENT: readonly Spent[] = [
  {
    icon: 'IC-58',
    reason: 'RS-28',
    fixture: {},
    onTaskGroup: ALPHA,
    because: 'nothing under ALPHA is folded, so HF-2 has no task group to open',
  },
  {
    icon: 'IC-77',
    reason: 'RS-29',
    fixture: {},
    // Why: on GAMMA, not BETA: HR-4 folds the pressed task group, so a press on BETA
    // takes GAMMA off the screen and acts; only the leaf is spent.
    onTaskGroup: GAMMA,
    because: 'GAMMA is a drawn leaf, so folding it takes no drawn task group away',
  },
  {
    icon: 'IC-90',
    reason: 'RS-30',
    fixture: {},
    onTaskGroup: ALPHA,
    because: 'every direct child of ALPHA is drawn, so HR-7 has nothing to put back',
  },
  {
    icon: 'IC-74',
    reason: 'RS-31',
    fixture: {},
    onTaskGroup: null,
    because: 'every task group is drawn, so HF-10 has nothing to open',
  },
  {
    icon: 'IC-78',
    reason: 'RS-32',
    fixture: {},
    onTaskGroup: null,
    // Why: primed by one press, since HR-2 also folds level 0: while ALPHA alone is
    // folded there is still level 0 to fold, and the press acts.
    primedBy: [{ entry: 'IC-78', onTaskGroup: null }],
    because: 'a first press folded 段 0 itself, so no drawn task group and no level is left open',
  },
  {
    icon: 'IC-37',
    reason: 'RS-34',
    fixture: {},
    onTaskGroup: null,
    because: 'no Task is chosen, so FR-034 has nothing to align',
  },
  {
    icon: 'IC-38',
    reason: 'RS-34',
    fixture: {},
    onTaskGroup: null,
    because: 'no Task is chosen, so FR-034 has nothing to align',
  },
]

function aim(built: Stage, entry: string, onTaskGroup: string | null): void {
  if (onTaskGroup === null) built.aimAtEntry(surfaceOf(entry), entry)
  else built.aimAt(entry, onTaskGroup)
}

function pressed(one: Spent, language: DisplayLanguage = 'ja'): Stage {
  const built = stage(one.fixture, language)
  for (const first of one.primedBy ?? []) {
    aim(built, first.entry, first.onTaskGroup)
    press(built)
  }
  aim(built, one.icon, one.onTaskGroup)
  press(built)
  return built
}

// Spec: FR-029, T-233, T-051, NT-1, U-22
describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // Why: a parse that lost a column would make every case below agree with anything.
    expect(TASK_GROUP_PANEL).toBe('Task Group Panel')
    expect(mannerOf(FALLBACK), '表 T-233 still gives RS-27 its manner').toBe('NT-1')
    expect(ruleOf('T-233', FALLBACK)).toBe('FR-029')
  })

  it('⛔ FR-029 ties the telling to a PRESS, to the MATCHING row, and off a hover', () => {
    expect(REQUIREMENTS).toContain(FR_029_ONLY_WHEN_PRESSED)
    expect(REQUIREMENTS).toContain(FR_029_THE_MATCHING_ROW)
    expect(REQUIREMENTS).toContain(FR_029_NOT_THE_FALLBACK)
    expect(REQUIREMENTS).toContain(FR_029_RS_27_IS_THE_FALLBACK)
    expect(REQUIREMENTS).toContain(FR_029_NOT_ON_HOVER)
  })

  it('⛔ 表 T-051 still counts the DRAWN task groups, and calls a still picture spent', () => {
    // Why: without it, IC-77 on a row whose only child is a leaf would still be
    // armed, and the RS-29 case would assert the opposite of the manuscript.
    expect(REQUIREMENTS).toContain(T_051_ONLY_DRAWN_TASK_GROUPS)
    expect(REQUIREMENTS).toContain(T_051_NO_CHANGE_MEANS_SPENT)
  })

  it('⛔ each pair below is the manuscript’s own: the entrance and the reason name one rule', () => {
    // Why: T-233 has no entrance column, so the rule both rows cite is the only join.
    for (const one of SPENT) {
      expect(
        ruleOf('T-109', one.icon),
        `表 T-109 ${one.icon} and 表 T-233 ${one.reason} no longer name one rule`,
      ).toBe(ruleOf('T-233', one.reason))
    }
  })

  it('every reason these cases expect follows NT-1, and has words in two languages', () => {
    for (const reason of [...new Set(SPENT.map((one) => one.reason)), FALLBACK]) {
      expect(mannerOf(reason), `表 T-233 ${reason}`).toBe('NT-1')
      const words = wordsFor(reason)
      expect(words.text.ja.length, reason).toBeGreaterThan(0)
      expect(words.text.en.length, reason).toBeGreaterThan(0)
      // Why: one word for two languages would pass the language case whatever the loop did.
      expect(words.text.ja, reason).not.toBe(words.text.en)
    }
  })

  it('⭐ the rows CR-307 raised that these cases press say different things', () => {
    // Why: a dictionary that answered alike for every row would let the cases below
    // pass on a loop that carries no matching row at all.
    const said = SPENT.map((one) => wordsFor(one.reason).text.ja)
    expect(new Set([...said, wordsFor(FALLBACK).text.ja]).size).toBe(
      new Set(SPENT.map((one) => one.reason)).size + 1,
    )
  })

  it('the documents these cases drive are valid GRS JSON documents', () => {
    for (const one of SPENT) {
      const made = documentWith(one.fixture)
      const report = validateDocument(made)
      expect(report.errors, one.icon).toEqual([])
      expect(report.valid, one.icon).toBe(true)
    }
  })

  it('nothing is being told before anything is pressed', () => {
    expect(stage().notices()).toEqual([])
  })
})

// Spec: FR-029, FR-076, T-233
describe('FR-029 (MUST) -- a press on a spent entrance carries the row that matches it', () => {
  it('⛔ MUST: every one of them carries a row table T-233 does not show, so no notice stands', () => {
    const shown: string[] = []
    for (const one of SPENT) {
      if (pressed(one).notices().length !== 0) shown.push(`${one.icon} (${one.because})`)
    }
    expect(shown, 'FR-076: a hidden reason put a notice up').toEqual([])
  })

  it('⛔ MUST: the row each carries follows NT-1 and is 「出さない」', () => {
    const wrong = SPENT.filter((one) => mannerOf(one.reason) !== 'NT-1' || displayOf(one.reason) !== HIDDEN)
    expect(wrong.map((one) => one.reason), 'table T-233 moved one of these rows').toEqual([])
  })

  it('⛔ MUST NOT: not one of them falls back to RS-27', () => {
    const fell: string[] = []
    for (const one of SPENT) {
      const told = pressed(one).notices()[0]
      if (told?.text === wordsFor(FALLBACK).text.ja) fell.push(`${one.icon} -> ${one.reason}`)
    }
    expect(fell, 'FR-029 (MUST NOT): 当たる行があるのに落ち先を運んではならない').toEqual([])
  })

  it('⭐ the words are kept in the dictionary for the day a row is shown again (CR-712 X-4)', () => {
    for (const one of SPENT) {
      expect(wordsFor(one.reason).text.en, one.reason).not.toBe('')
    }
  })

  it('⭐ 表 T-233 is the whole roster: no telling carries words the table has no row for', () => {
    const known = new Set(REASON_WORDS.map((one) => one.text.ja))
    const strange: string[] = []
    for (const one of SPENT) {
      for (const told of pressed(one).notices()) {
        if (!known.has(told.text)) strange.push(`${one.icon}: ${told.text}`)
      }
    }
    expect(strange, '表 T-233 (MUST NOT): 同表に無い理由を運んではならない').toEqual([])
  })
})

// Spec: FR-029
describe('FR-029 (MUST NOT) -- resting a pointer on it is not a press', () => {
  it('⛔ MUST NOT: moving onto the entrance tells no reason', () => {
    const built = stage()
    built.aimAt('IC-58', ALPHA)

    built.send(pointer('move', ON_THE_SURFACE.x, ON_THE_SURFACE.y))

    expect(
      built.notices(),
      'FR-029 (MUST NOT): ポインターが乗っただけで理由を出してはならない',
    ).toEqual([])
  })

  it('⛔ MUST NOT: nor does resting there over several frames', () => {
    // Why: several moves over several frames, because EZ-2's explanation rises after
    // a rest, and a reason hung on that clock would need the pointer kept still.
    const built = stage()
    built.aimAt('IC-58', ALPHA)

    for (let turn = 0; turn < 5; turn += 1) {
      built.send(pointer('move', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
    }

    expect(built.notices()).toEqual([])
  })

  it('⭐ and the very same entrance, pressed, carries a row table T-233 does not show', () => {
    const built = stage()
    built.aimAt('IC-58', ALPHA)
    built.send(pointer('move', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
    expect(built.notices()).toEqual([])

    press(built)

    expect(built.notices()).toEqual([])
    expect(displayOf('RS-28')).toBe(HIDDEN)
  })
})

// Spec: FR-029, FR-049
describe('FR-029 -- the telling belongs to an entrance that is spent, and to no other', () => {
  const ARMED: readonly { readonly icon: string; readonly fixture: Fixture; readonly onTaskGroup: string | null; readonly because: string }[] =
    [
      {
        icon: 'IC-58',
        fixture: { folded: [BETA] },
        onTaskGroup: ALPHA,
        because: 'BETA is folded under ALPHA, so opening 配下 draws GAMMA again',
      },
      {
        icon: 'IC-77',
        fixture: {},
        onTaskGroup: ALPHA,
        because: 'folding 配下 of ALPHA folds BETA, which takes GAMMA off the picture',
      },
      {
        icon: 'IC-59',
        fixture: {},
        onTaskGroup: ALPHA,
        because: 'ALPHA is open and folding it takes BETA and GAMMA off the picture',
      },
      {
        icon: 'IC-74',
        fixture: { folded: [BETA] },
        onTaskGroup: null,
        because: 'BETA is folded, so opening every task group draws GAMMA again',
      },
      {
        icon: 'IC-78',
        fixture: {},
        onTaskGroup: null,
        because: 'ALPHA and BETA are open, so folding every task group takes task groups off the picture',
      },
      {
        icon: 'IC-8',
        fixture: { planActual: { isPlanVisible: true, isActualVisible: true } },
        onTaskGroup: null,
        because: 'the plan is showing, so hiding it changes the picture',
      },
      {
        icon: 'IC-9',
        fixture: { planActual: { isPlanVisible: false, isActualVisible: true } },
        onTaskGroup: null,
        because:
          'the actual is showing, so hiding it changes the picture -- and the plan'
          + ' being hidden already does not stand in the way (FR-049)',
      },
    ]

  it('⛔ an entrance that has work raises no reason at all', () => {
    // Why: without this block every case in the spent block above would pass on a
    // loop that told the reason for every press.
    const told: string[] = []
    const reasons = new Set(REASON_WORDS.map((one) => one.text.ja))
    for (const one of ARMED) {
      const built = stage(one.fixture)
      if (one.onTaskGroup === null) built.aimAtEntry(surfaceOf(one.icon), one.icon)
      else built.aimAt(one.icon, one.onTaskGroup)
      press(built)
      for (const notice of built.notices()) {
        if (reasons.has(notice.text)) told.push(`${one.icon}: ${one.because} -- ${notice.text}`)
      }
    }
    expect(told, 'FR-029: an entrance with work to do is not told it has none').toEqual([])
  })

  it('⭐ and pressing nothing at all raises no reason either', () => {
    const built = stage()
    built.aimAtNothing()

    press(built)

    expect(built.notices().filter((one) => one.manner === 'NT-1').length).toBe(0)
  })
})

// Why: one walk, not a case per entrance, since the screen already decided which
// entrances are spent and the faintness is where it said so.
// Spec: FR-029, T-109, T-233
describe('FR-029 -- every entrance the screen drew faint answers a press with a reason', () => {
  it('⛔ MUST: not one of them is silent, and each carries a row of 表 T-233', () => {
    const known = new Set(REASON_WORDS.map((one) => one.text.ja))
    const drawn = stage()
    const view = drawn.screen.last()

    const faint: { readonly icon: string; readonly surface: string }[] = []
    for (const entry of view.appHeaderItems.commands) {
      if (!entry.isEnabled) faint.push({ icon: entry.icon, surface: surfaceOf(entry.icon) })
    }
    for (const group of view.commandPalette?.groups ?? []) {
      for (const entry of group.commands) {
        if (!entry.isEnabled) faint.push({ icon: entry.icon, surface: surfaceOf(entry.icon) })
      }
    }
    // Why: a frame that drew none would pass while asserting nothing; the document
    // opens with nothing selected and nothing folded, so some entrance is faint.
    expect(faint.length, 'no entrance was drawn faint, so this case asked nothing').toBeGreaterThan(
      0,
    )

    const strange: string[] = []
    for (const entrance of faint) {
      const built = stage()
      built.aimAtEntry(entrance.surface, entrance.icon)
      press(built)
      for (const one of built.notices()) {
        if (one.manner !== 'NT-1' || !known.has(one.text)) strange.push(`${entrance.icon}: ${one.text}`)
      }
    }

    expect(strange, 'FR-029: a faint entrance told words no row of 表 T-233 holds').toEqual([])
  })

  it('⛔ MUST NOT: a faint entrance 表 T-233 has a row for does not fall back to RS-27', () => {
    // Why: an entrance no row covers is left alone, since RS-27 is its landing place.
    const fallback = wordsFor(FALLBACK).text.ja
    const wanted = new Map(SPENT.filter((one) => one.onTaskGroup === null).map((one) => [one.icon, one]))
    const drawn = stage()
    const view = drawn.screen.last()

    const faint: string[] = []
    for (const entry of view.appHeaderItems.commands) if (!entry.isEnabled) faint.push(entry.icon)
    for (const group of view.commandPalette?.groups ?? []) {
      for (const entry of group.commands) if (!entry.isEnabled) faint.push(entry.icon)
    }

    const looked = faint.filter((icon) => wanted.has(icon))
    // Why: IC-37 / IC-38 (nothing chosen) are faint in a document that has only just opened.
    expect(
      looked.length,
      'not one entrance 表 T-233 covers was drawn faint, so this case asked nothing',
    ).toBeGreaterThan(0)

    const fell: string[] = []
    for (const icon of looked) {
      const one = wanted.get(icon)
      if (one === undefined) continue
      const built = stage(one.fixture)
      built.aimAtEntry(surfaceOf(icon), icon)
      press(built)
      for (const notice of built.notices()) {
        if (notice.text === fallback) fell.push(`${icon} -- wanted ${one.reason}`)
      }
    }
    expect(fell, 'FR-029 (MUST NOT): 当たる行があるのに落ち先を運んではならない').toEqual([])
  })
})

// The four folding controls of a row, the four of the panel's head, and the
// picture each of them leaves behind -- 表 T-015 の `HR-1a` / `HR-2` / `HR-3` /
// `HR-4` / `HR-5` / `HR-6` / `HR-7`, 表 T-051 の `HF-2` / `HF-3` / `HF-10` /
// `HF-11` / `HF-12` / `HF-13` / `HF-16` / `HF-17` / `HF-18` and the two
// paragraphs printed under that table, all rewritten on 2026-08-31.
//
// WRITTEN WITHOUT READING ONE LINE OF `src/` (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule
// below, and the neighbouring test files for the shape of the published surface
// -- how `frameLoop`, `domScreenSurface` and `ScreenView` are driven. No
// expected value here was taken from how a unit computes its answer.
//
// Chapter 9 admits no Unit as a TEST_LEVEL, so these cases have no node in the
// specification; 表 T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔⛔ WHY THIS FILE EXISTS -- THE OFF-BY-ONE-LEVEL THE MANUSCRIPT MEASURED
// ---------------------------------------------------------------------------
//
// The closing paragraph under 表 T-051 records what the shipping build did:
//
//   ⭐⭐ 「**折り畳みの 4 つの操作子は、どれも押した行そのものの状態を書き換える**
//   （利用者の指示 2026-08-31「サンプルと同じ動作にしろ」）… ⛔ **押した行ではなく、
//   その配下の状態を書き換えてはならない（MUST NOT）** —— ⚠️ **実測で、`HF-11` は
//   直下の子を残し、`HF-13` は孫を開いた。どちらも 1 階層ずれており、頭に置いた同じ
//   入口とは別の絵になっていた。**」
//
// ⇒ every case below asks the SAME question of one control: after the press,
// which rows are drawn, and which row's two columns moved.
//
// ⚠️⚠️ THE ONE PLACE THE MANUSCRIPT ARGUES WITH ITSELF, and the reading these
// cases take. Read on its own, 「押した行ではなく、その配下の状態を書き換えては
// ならない（MUST NOT）」 forbids a press from writing any descendant at all. Three
// other MUSTs require exactly that:
//   `HR-1a` 「⇒ ⭐ **畳む操作は必ず配下ごと状態を書き換えること（MUST）。**」
//   `HR-3`  「**選択した `TaskGroup` と、その配下のすべてから、畳みと隠しを取り除く
//            こと（MUST）。**」
//   `HR-7`  「⭐ **直下の子が `HR-6` で隠されているときは、その隠しも解くこと
//            （MUST）。**」
// ⇒ the only reading that leaves all four standing is 「その配下の状態を書き換え
// てはならない」 = 「the pressed row's own two columns must be the ones that move;
// writing descendants INSTEAD of the row is what is forbidden」, which is also
// what the 実測 sentence describes (a press one level off its target). The cases
// below are written to that reading and the report says so.
//
// ---------------------------------------------------------------------------
// WHERE EACH CASE IS DRIVEN FROM
// ---------------------------------------------------------------------------
//
// (A) THE FRAME LOOP (`frameLoop`, UF-48). A press arrives the way the shell
//     receives one -- the surface answers which entrance the point is on, and
//     the loop does the rest -- so a case can read BOTH answers the rewritten
//     rows are about: the document's `AT-56` / `AT-57` columns, and the rows the
//     panel drew afterwards. ⭐ The picture is the half no purer seam can show,
//     and it is the half 「サンプルと同じ動作にしろ」 was about.
// (B) THE DOM SURFACE (`domScreenSurface`, UF-71) for ONE case: how many
//     entrances the head carries and how many a row carries. Nothing in
//     `ScreenView` enumerates them, so the count is only observable where they
//     are drawn.
//
// ⚠️ WHAT IS DELIBERATELY NOT HERE: the `HF-17` ⇔ `HF-14` half of the head's
// correspondence. Both open a name field rather than writing the document
// (`HF-14`: 「**名前は空で立て、その場で打たせること（MUST）**」), and IF-9 carries
// no member for that -- so the pairing cannot be read at this seam. It is held
// as a premise (the manuscript still states it) and reported as a hole.

import { readFileSync } from 'node:fs'
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
  AppHeaderItems,
  DisplayLanguage,
  RowTitle,
  ScreenFrame,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type { Task, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import {
  oneByRole,
  selfAndDescendants,
  surfaceOf as domSurfaceOf,
  whatWasDrawn,
  wire,
  type FakeElement,
} from '../fixtures/fake-browser'
import { bare, specTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ===========================================================================
// The manuscripts, read at run time rather than copied (Chapter 1.9)
// ===========================================================================

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/** Everything one row of a table says, as one string. */
const says = (table: string, id: string): string => rowOf(table, id).cells.join(' ')

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/** 表 T-103's settled English names, which W-4 of 表 T-006a puts into `data-role`. */
const partName = (row: string): string => bare(rowOf('T-103', row).by['確定名（英）'] ?? '')
const ROW_TITLE_PANEL = partName('U-22')
const ROW_TITLE_TREE = partName('U-23')

const T_109 = specTable('T-109')
const T_051 = specTable('T-051')

/**
 * The rows of 表 T-051 that stand a control at the PANEL'S HEAD rather than on
 * each row, found by what those rows say about themselves.
 *
 * ⭐ DERIVED AND NEVER LISTED -- the reading is borrowed from
 * tests/unit/uf-72-screen-part.test.ts, which records that a list written here
 * has already gone stale once. `HF-10` names 「行見出しパネルの最上部」 outright
 * and `HF-12` / `HF-16` / `HF-17` each place themselves against 「`HF-10` の操作
 * 子」; a row placed on 「各行に」 says neither.
 */
const T_051_AT_THE_HEAD: readonly string[] = T_051.rows
  .filter((one) => {
    const said = one.cells.join(' ')
    return said.includes('行見出しパネルの最上部') || said.includes('`HF-10` の操作子')
  })
  .map((one) => one.id)

/** Whether a 正 cell of 表 T-109 names one of those rows. */
const isHeadRule = (authority: string): boolean =>
  T_051_AT_THE_HEAD.some((rule) =>
    new RegExp(`(^|[^0-9A-Za-z-])${rule}([^0-9-]|$)`).test(authority),
  )

/** Every entrance 表 T-109 stands on the `Row Title Panel`, head and rows alike. */
const T_109_ON_THE_PANEL = T_109.rows.filter(
  (one) => bare(one.by['面'] ?? '') === ROW_TITLE_PANEL,
)

/** Those of them the panel's HEAD carries, and those each ROW carries. */
const AT_THE_HEAD: readonly string[] = T_109_ON_THE_PANEL.filter((one) =>
  isHeadRule(one.by['正'] ?? ''),
).map((one) => one.id)

const ON_A_ROW: readonly string[] = T_109_ON_THE_PANEL.filter(
  (one) => !isHeadRule(one.by['正'] ?? ''),
).map((one) => one.id)

/**
 * The entrance 表 T-109 gives one row of 表 T-051 or one requirement.
 *
 * ⭐ THE JOIN IS THE SPECIFICATION'S OWN: 表 T-109's 正 column names the rule that
 * owns each entrance, so a case that means 「HF-13's control」 says so and is told
 * which icon that is, instead of typing `IC-90` and going quiet the day the
 * roster is renumbered.
 */
function entranceFor(rule: string): string {
  const found = T_109_ON_THE_PANEL.filter((one) =>
    new RegExp(`(^|[^0-9A-Za-z-])${rule}([^0-9-]|$)`).test(one.by['正'] ?? ''),
  )
  const first = found[0]
  if (found.length !== 1 || first === undefined) {
    throw new Error(`表 T-109 gives ${rule} ${found.length} entrances on the panel, not one`)
  }
  return first.id
}

/** The four folding controls of a row (`HF-1`'s 2 x 2 lattice), by their rule. */
const HIDE = entranceFor('HF-3') //        HR-6 -- hide this row
const OPEN_ONE_LEVEL = entranceFor('HF-13') // HR-7 -- open one level
const FOLD_BELOW = entranceFor('HF-11') //  HR-4 -- fold this row
const OPEN_ALL_BELOW = entranceFor('HF-2') // HR-3 -- open everything below

/** The four the head carries, each of them one of those four done at 段 0. */
const HEAD_OPEN_ONE_LEVEL = entranceFor('HF-16')
const HEAD_FOLD_EVERY_ROW = entranceFor('HF-12')
const HEAD_OPEN_EVERY_ROW = entranceFor('HF-10')
const HEAD_ADD_ROW = entranceFor('HF-17')

/** The three a row carries and the head must not (closing paragraph). */
const ADD_CHILD_ROW = entranceFor('HF-14')

// ===========================================================================
// (A) The frame loop. Fixture and harness copied from
//     tests/unit/fr-029-the-reason-a-press-carries.test.ts.
// ===========================================================================

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const ALPHA = '11111111-1111-4111-8111-111111111111'
const BETA = '22222222-2222-4222-8222-222222222222'
const GAMMA = '33333333-3333-4333-8333-333333333333'
const DELTA = '44444444-4444-4444-8444-444444444444'
const EPSILON = '55555555-5555-4555-8555-555555555555'
const ZETA = '66666666-6666-4666-8666-666666666666'
const ZETA_KID = '77777777-7777-4777-8777-777777777777'

/**
 * The tree these cases are driven by.
 *
 *   Alpha            (root)
 *     Beta
 *       Gamma
 *         Delta
 *     Epsilon
 *   Zeta             (a second root)
 *     ZetaKid
 *
 * ⭐⭐ FOUR LEVELS DEEP AND NOT THREE, and `HR-7` (MUST NOT) is why: 「⛔ **孫より
 * 下の畳みに触れてはならない（MUST NOT）**」 is a claim about everything BELOW the
 * grandchildren, so a tree that stopped at the grandchild could not tell a
 * press that obeyed it from one that reached one level too far.
 * ⭐ EPSILON is a second child of Alpha, so 「直下の子」 is a set and not a row.
 * ⭐ ZETA is a second root, so 「配下」 has an outside for a press to leave alone.
 */
const ROWS: readonly { readonly id: string; readonly parentId: string | null; readonly name: string }[] =
  [
    { id: ALPHA, parentId: null, name: 'Alpha' },
    { id: BETA, parentId: ALPHA, name: 'Beta' },
    { id: GAMMA, parentId: BETA, name: 'Gamma' },
    { id: DELTA, parentId: GAMMA, name: 'Delta' },
    { id: EPSILON, parentId: ALPHA, name: 'Epsilon' },
    { id: ZETA, parentId: null, name: 'Zeta' },
    { id: ZETA_KID, parentId: ZETA, name: 'ZetaKid' },
  ]

/** Every row, in the order the panel draws them when nothing is folded. */
const EVERY_ROW = ROWS.map((one) => one.name)

const nameOf = (groupId: string): string =>
  ROWS.find((one) => one.id === groupId)?.name ?? groupId

interface Fixture {
  /** Rows standing folded (`AT-56`). */
  readonly folded?: readonly string[]
  /** Rows standing hidden (`AT-57`). */
  readonly hidden?: readonly string[]
}

function documentWith(part: Fixture = {}): Document {
  const template = structuredClone(TEMPLATE) as any
  const folded = new Set(part.folded ?? [])
  const hidden = new Set(part.hidden ?? [])
  const task = (uid: number, start: string, finish: string, name: string): Task =>
    ({
      uid,
      wbsParentUid: null,
      wbsOrder: uid,
      name,
      start,
      finish,
      milestone: false,
      deadline: null,
      notes: null,
      calendarUid: null,
      actualStart: null,
      actualDuration: null,
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
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: ROWS.map((_row, index) =>
        task(index + 1, '2026-04-01', '2026-04-10', `Task${index + 1}`),
      ),
      resources: [],
      assignments: [],
      taskGroups: ROWS.map((one, index) => ({
        id: one.id,
        parentId: one.parentId,
        label: one.name,
        derivedFromTaskUid: null,
        order: index,
        isCollapsed: folded.has(one.id),
        isHidden: hidden.has(one.id),
        color: null,
        height: null,
      })),
      taskGroupMembers: ROWS.map((one, index) => ({
        taskUid: index + 1,
        groupId: one.id,
        stackOrder: null,
      })),
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

interface Host {
  readonly surface: { showSvg(svg: string): void }
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
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
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

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left' as PointerButton,
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

/** Somewhere inside the surface the fake answers for. */
const ON_THE_SURFACE = { x: 80, y: 120 }

interface Stage {
  readonly loop: FrameLoop
  readonly screen: ScreenPane
  send(input: HumanInput): void
  aim(entry: string, groupId: string | null): void
  /** Aim one entrance and press it. */
  press(entry: string, groupId: string | null): void
}

function stage(part: Fixture = {}): Stage {
  const pen = host()
  const screen = screenPane()
  const loop = frameLoop(pen.surface, documentWith(part), SCREEN, screen.wiring)
  pen.runAnimationFrames()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  const aim = (entry: string, groupId: string | null): void => {
    screen.drawAt({
      part: ROW_TITLE_PANEL,
      entry: entry as any,
      format: null,
      rowGroupId: groupId,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  }
  return {
    loop,
    screen,
    send,
    aim,
    press: (entry, groupId) => {
      aim(entry, groupId)
      // IN-1 settles a pointer operation on release, so a press is down then up.
      send(pointer('down', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      send(pointer('up', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
    },
  }
}

// ---------------------------------------------------------------------------
// Reading the two answers back
// ---------------------------------------------------------------------------

/** The rows the panel drew, by name, in the order it drew them. */
function drawnRows(built: Stage): readonly string[] {
  const panel = built.screen.last().rowTitlePanel
  return [...panel.pinnedTitles, ...panel.titles].map((one) => nameOf(one.groupId))
}

/** The title the panel drew for one row. */
function titleOf(built: Stage, groupId: string): RowTitle {
  const panel = built.screen.last().rowTitlePanel
  const found = [...panel.pinnedTitles, ...panel.titles].find((one) => one.groupId === groupId)
  if (found === undefined) {
    throw new Error(`the panel drew no title for ${nameOf(groupId)}: ${drawnRows(built).join(', ')}`)
  }
  return found
}

/** The row as the DOCUMENT holds it -- `AT-56` and `AT-57` of _assets/fig-erd-detail.md. */
function storedRow(built: Stage, groupId: string): TaskGroup {
  const found = (built.loop.document().schedule as any).taskGroups.find(
    (one: any) => one.id === groupId,
  )
  if (found === undefined) throw new Error(`the document has no row ${nameOf(groupId)}`)
  return found as TaskGroup
}

/** `AT-56` -- 「畳んでいるか」. `null` and `false` are one answer here: not folded. */
const isFolded = (built: Stage, groupId: string): boolean =>
  (storedRow(built, groupId) as any).isCollapsed === true

/** `AT-57` -- 「隠しているか」. */
const isHidden = (built: Stage, groupId: string): boolean =>
  (storedRow(built, groupId) as any).isHidden === true

/** `HF-18`'s number, as the panel drew it. */
const foldedCountOf = (built: Stage, groupId: string): number =>
  ((titleOf(built, groupId) as any).foldedRowCount as number | null | undefined) ?? 0

/** The words a telling carried, so a case can say a press ACTED instead of refusing. */
const noticeTexts = (built: Stage): readonly string[] =>
  built.screen.last().notices.map((one) => one.text)

/**
 * The press acted rather than being answered with a reason.
 *
 * ⭐ `FR-029` (MUST) makes the two exclusive: 「**押されたときに限り、行えない理由を
 * 通知すること（MUST）**」 is the answer of an entrance that 「いま文書にも画面にも
 * 何も変えられない」. ⇒ a case that means 「this entrance was armed」 can say so by
 * the absence of a telling, without naming which row of 表 T-233 would have come.
 */
function actedRatherThanRefused(built: Stage, what: string): void {
  expect(noticeTexts(built), `${what} was answered with a reason instead of acting`).toEqual([])
}

// ===========================================================================
// (B) The DOM surface, for the one case about how MANY entrances are drawn.
// ===========================================================================

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({
  x,
  y,
  width,
  height,
})

/** S-73's default hue, read out of 表 T-216 rather than written here (rule 03 section 1). */
const THEME: ScreenTheme = {
  preference: SETTINGS_DEFAULTS['themePreference'] as ScreenTheme['preference'],
  hue: Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? '')),
}

/** One row with every control armed, so nothing is left undrawn for want of work. */
const ONE_DRAWN_ROW: RowTitle = {
  groupId: 'RowAlpha',
  depth: 1,
  indentPx: SETTINGS_DEFAULTS['rowTitleIndent'] as number,
  box: rect(0, 40, 220, 64),
  label: 'RowAlpha',
  wholeLabel: 'RowAlpha',
  isLabelTruncated: false,
  expander: { canOpen: true, canClose: true, canCloseBelow: true },
  isPinned: false,
  isSelected: false,
  canOpenOneLevel: true,
  canAddChildRow: true,
} as unknown as RowTitle

const PANEL_VIEW: ScreenView = {
  language: 'ja',
  frame: EMPTY_FRAME,
  appHeaderItems: EMPTY_HEADER,
  rowTitlePanel: {
    pinnedTitles: [],
    titles: [ONE_DRAWN_ROW],
    canOpenEveryRow: true,
    canCloseEveryRow: true,
    canOpenLevelZero: true,
  },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
} as unknown as ScreenView

/** Every row of 表 T-109 carried by a node at or under this one. */
const iconsUnder = (node: FakeElement): readonly string[] =>
  selfAndDescendants(node)
    .map((one) => one.getAttribute('data-icon'))
    .filter((one): one is string => one !== null)
    .filter((one) => T_109_ON_THE_PANEL.some((row) => row.id === one))

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT LOST A COLUMN WOULD MAKE EVERY CASE BELOW
    // AGREE WITH ANYTHING -- rule 04 section 2.
    expect(ROW_TITLE_PANEL).toBe('Row Title Panel')
    expect(ROW_TITLE_TREE).toBe('Row Title Tree')
    expect(T_051_AT_THE_HEAD.slice().sort()).toEqual(['HF-10', 'HF-12', 'HF-16', 'HF-17'])
    expect(new Set([HIDE, OPEN_ONE_LEVEL, FOLD_BELOW, OPEN_ALL_BELOW]).size).toBe(4)
    expect(
      new Set([HEAD_OPEN_ONE_LEVEL, HEAD_FOLD_EVERY_ROW, HEAD_OPEN_EVERY_ROW, HEAD_ADD_ROW]).size,
    ).toBe(4)
  })

  it('⛔ 表 T-015 still says what each of the four folding operations does', () => {
    // The four sentences the ruling of 2026-08-31 wrote, each pinned so that a
    // manuscript which went back on one fails HERE rather than in a case that
    // would then be asserting a rule nobody holds.
    expect(says('T-015', 'HR-3')).toContain(
      '選択した `TaskGroup` と、その配下のすべてから、畳みと隠しを取り除くこと（MUST）',
    )
    expect(says('T-015', 'HR-3')).toContain('その行自身の畳みも解くこと（MUST）')
    expect(says('T-015', 'HR-4')).toContain('選択した `TaskGroup` を畳むこと（MUST）')
    expect(says('T-015', 'HR-4')).toContain('その行自身を隠してはならない（MUST NOT）')
    expect(says('T-015', 'HR-7')).toContain('選択した `TaskGroup` の畳みだけを解くこと（MUST）')
    expect(says('T-015', 'HR-7')).toContain('孫より下の畳みに触れてはならない（MUST NOT）')
    expect(says('T-015', 'HR-7')).toContain(
      '直下の子が `HR-6` で隠されているときは、その隠しも解くこと（MUST）',
    )
    // `HR-5` is the row that keeps `HR-4` honest: the two are ONE operation.
    expect(says('T-015', 'HR-5')).toContain('`HR-4` と同じ操作である')
    expect(says('T-051', 'HF-11')).toContain(
      '配下をすべて閉じる操作子は、表 T-015 の `HR-4` を行うこと（MUST）',
    )
    expect(says('T-051', 'HF-13')).toContain('その職務は 表 T-015 の `HR-7` である（MUST）')
    expect(says('T-051', 'HF-2')).toContain('開く操作子の職務は 表 T-015 の `HR-3` である（MUST）')
    expect(says('T-051', 'HF-3')).toContain('隠す操作子の職務は 表 T-015 の `HR-6` である（MUST）')
  })

  it('⛔ the closing paragraphs still tie the family together', () => {
    expect(REQUIREMENTS).toContain(
      '折り畳みの 4 つの操作子は、どれも押した行そのものの状態を書き換える',
    )
    expect(REQUIREMENTS).toContain('行が描かれるかどうかを決める状態は 2 つだけとすること（MUST）')
    expect(REQUIREMENTS).toContain('押した行の状態を書き換えずに、その配下の状態だけを書き換えてはならない（MUST NOT）')
    expect(REQUIREMENTS).toContain('パネルの頭は段 0 であり、行ではない。')
    expect(REQUIREMENTS).toContain(
      '頭が持つ入口が 4 つ、行が持つ入口が 7 つであることは、この 1 つの違いから出る（MUST）',
    )
    expect(REQUIREMENTS).toContain(
      '段 0 には畳み込む先の親が無いので隠せず（`HF-3`）、実体が無いので消せず（`FR-032`）、行でないので留められない（`FR-098`）。',
    )
    expect(REQUIREMENTS).toContain(
      '`HF-16` は `HF-13` を、`HF-12` は `HF-11` を、`HF-10` は `HF-2` を、`HF-17` は `HF-14` を、それぞれ段 0 に対して行うものである。',
    )
    // The arming rule every case in the last block rests on.
    expect(REQUIREMENTS).toContain(
      'その操作で、描かれる行が 1 行も増減しないときは、対象が 1 つも無いものとして扱うこと（MUST）',
    )
    expect(REQUIREMENTS).toContain(
      '数えるのは配下の行の数ではなく、その操作の前後で描かれる行の差である。',
    )
  })

  it('⛔ the two columns that decide whether a row is drawn are still AT-56 and AT-57', () => {
    // The closing paragraph names them: 「**その行自身が描かれないこと**（`AT-57`）
    // と、**その行の配下が描かれないこと**（`AT-56`）」.
    const detail = readFileSync(
      join(process.cwd(), 'docs', 'spec', '_assets', 'fig-erd-detail.md'),
      'utf8',
    )
    expect(detail).toContain('| AT-56 | `TaskGroup` | `isCollapsed` |')
    expect(detail).toContain('| AT-57 | `TaskGroup` | `isHidden` |')
    // 段 0 has the first and not the second -- 表 T-206 の `S-211`.
    expect(says('T-206', 'S-211')).toContain('段 0（行見出しパネルの頭）が畳まれているか')
    expect(says('T-206', 'S-211')).toContain('保存しない')
  })

  it('the document these cases drive is a valid GRS JSON document', () => {
    const report = validateDocument(documentWith())
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
  })

  it('⭐ every row of the fixture is drawn before anything is pressed', () => {
    // ⛔ WITHOUT THIS, A PICTURE CASE BELOW COULD PASS ON A PANEL THAT NEVER DREW
    // THE ROW IT SAYS A PRESS TOOK AWAY.
    expect(drawnRows(stage())).toEqual(EVERY_ROW)
  })

  it('⭐ nothing is being told before anything is pressed', () => {
    expect(noticeTexts(stage())).toEqual([])
  })
})

// ===========================================================================
// 1. Each control writes the state of the row it was PRESSED ON
// ===========================================================================

describe('表 T-051 の結び -- the press writes the pressed row, not its children', () => {
  it('⛔ MUST: HF-11 folds the row it was pressed on (HR-4, 指示 2026-08-31)', () => {
    // `HR-4`: 「**選択した `TaskGroup` を畳むこと（MUST）**」 —— ⇒ 「**その直下の子
    // から下が描かれなくなる**」. ⛔⛔ THE BUG THE ROW RECORDS: 「**2026-08-31 まで
    // 「配下をすべて閉じる」と書いていた** —— **実装はその読みどおり配下の行だけを
    // 閉じ、その行を閉じていなかった**」.
    const built = stage()

    built.press(FOLD_BELOW, BETA)

    expect(isFolded(built, BETA), 'HR-4 (MUST): the pressed row was left open').toBe(true)
  })

  it('⛔ MUST NOT: HF-11 does not hide the row it was pressed on (HR-4)', () => {
    // `HR-4`: 「⛔ **その行自身を隠してはならない（MUST NOT）** —— 隠すのは `HR-6`
    // である」. ⭐ The two columns are the whole of 「行が描かれるかどうかを決める
    // 状態は 2 つだけ」, so a press that wrote the wrong one would still move the
    // picture and be invisible to a case that only counted rows.
    const built = stage()

    built.press(FOLD_BELOW, BETA)

    expect(isHidden(built, BETA), 'HR-4 (MUST NOT): the fold hid the row instead').toBe(false)
  })

  it('⛔ MUST: HF-3 hides the row it was pressed on and NOT its children (HR-6)', () => {
    // `HF-3`: 「**隠す操作子の職務は 表 T-015 の `HR-6` である（MUST）**」, and
    // `HR-6` keeps 「隠した行の配下の行…を描いてはならない（MUST NOT）」 as a rule
    // about what is DRAWN -- so one write is the whole of it.
    const built = stage()

    built.press(HIDE, BETA)

    expect(isHidden(built, BETA), 'HR-6 (MUST): the pressed row was not hidden').toBe(true)
    expect(isHidden(built, GAMMA), 'the child was hidden as well as the row').toBe(false)
    expect(isHidden(built, DELTA), 'the grandchild was hidden as well as the row').toBe(false)
    // ⛔ AND IT IS NOT A FOLD. `HR-6` and `HR-1a` are two states of one row and
    // the manuscript keeps them apart -- 「⚠️ **畳みと違い、グループ LOD と同じ絵に
    // なることを求めない**」.
    expect(isFolded(built, BETA), 'the hide wrote AT-56 instead of AT-57').toBe(false)
  })

  it('⛔ MUST: HF-3 folds every row under the row it hid (HR-6)', () => {
    // `HR-6` since 2026-08-31: 「**あわせて、その行の配下を畳んだ状態にすること
    // （MUST）**」（利用者の指示「サンプルと同じ動作にしろ」）—— ⛔ 「**配下をその
    // ままにして隠してはならない（MUST NOT）**」.
    //
    // ⭐⭐ THE REASON IS THE WAY BACK, and it is measurable on the sample. `HR-6`
    // has the row return through the parent's 「配下を 1 階層開く」, and `HR-7`
    // (MUST NOT) has that press touch no fold below the direct children -- so
    // what comes back is THIS ROW ALONE. Without the fold the whole subtree
    // returns at once, which is the 「畳む前の形を覚えて戻す」 `HR-1a` threw out.
    //
    // ⚠️ THE FOLD OUTLIVES THE HIDING, and the row says so on purpose rather
    // than by omission: the row comes back folded and its own 「1 階層開く」
    // opens it. ⛔ THIS CASE HELD THE OPPOSITE UNTIL HR-6 CARRIED THE MUST --
    // the write was in the product and not in the manuscript, which is what a
    // body reading only the specification is for.
    const built = stage()

    built.press(HIDE, BETA)

    expect(isFolded(built, GAMMA), 'the row beneath the hidden one was left open').toBe(true)
    expect(isFolded(built, DELTA), 'a row two levels beneath was left open').toBe(true)
    // ⛔ AND NOT BEYOND. Only what the hiding took out of the picture is folded.
    expect(isHidden(built, GAMMA), 'the hide wrote AT-57 below the row it hid').toBe(false)
  })

  it('⛔ MUST: HF-13 unfolds the row it was pressed on (HR-7)', () => {
    // `HR-7`: 「**選択した `TaskGroup` の畳みだけを解くこと（MUST）**」 —— ⇒ 「**直下
    // の子が描かれ、孫より下は畳まれたままになる**」.
    const built = stage({ folded: [ALPHA, BETA, GAMMA] })

    built.press(OPEN_ONE_LEVEL, ALPHA)

    expect(isFolded(built, ALPHA), 'HR-7 (MUST): the pressed row is still folded').toBe(false)
  })

  it('⛔ MUST NOT: HF-13 does not touch the fold of anything below the direct children (HR-7)', () => {
    // `HR-7`: 「⛔ **孫より下の畳みに触れてはならない（MUST NOT）** —— **触れると
    // 本行と `HR-3` の違いが消える**」. ⚠️ 実測: 「`HF-13` は孫を開いた」.
    const built = stage({ folded: [ALPHA, BETA, GAMMA] })

    built.press(OPEN_ONE_LEVEL, ALPHA)

    expect(isFolded(built, GAMMA), 'HR-7 (MUST NOT): the grandchild was unfolded').toBe(true)
    // ⭐ AND THE DIRECT CHILD'S OWN FOLD IS NOT SOMETHING THIS PRESS UNDOES
    // EITHER: the row 「畳みだけを解く」 names one row, and it is the pressed one.
    // ⛔ Were this false, the grandchild would be drawn and 「1 階層」 would be two.
    expect(isFolded(built, BETA), 'HR-7: the direct child was unfolded too').toBe(true)
  })

  it('⛔ MUST: HF-2 unfolds the pressed row ITSELF as well as everything below (HR-3, 指示 2026-08-31)', () => {
    // ⭐⭐ THE RULING THAT REVERSED THIS: 「⭐⭐ **その行自身の畳みも解くこと
    // （MUST）**（利用者の指示 2026-08-31「サンプルと同じ動作にしろ」）—— **`HR-4`
    // が畳むのはその行自身なので、解く側が同じ行を解かなければ対にならない。**」
    const built = stage({ folded: [ALPHA, BETA, GAMMA, DELTA] })

    built.press(OPEN_ALL_BELOW, ALPHA)

    expect(isFolded(built, ALPHA), 'HR-3 (MUST): the pressed row was left folded').toBe(false)
    expect(isFolded(built, BETA), 'HR-3 (MUST): a child was left folded').toBe(false)
    expect(isFolded(built, GAMMA), 'HR-3 (MUST): a grandchild was left folded').toBe(false)
    expect(isFolded(built, DELTA), 'HR-3 (MUST): a great-grandchild was left folded').toBe(false)
  })

  it('⛔ MUST NOT: HF-2 leaves rows outside the pressed row’s subtree alone (HR-3)', () => {
    // 「**選択した `TaskGroup` と、その配下のすべてから**」 -- a second root is
    // under no part of the pressed row.
    const built = stage({ folded: [ALPHA, BETA, ZETA] })

    built.press(OPEN_ALL_BELOW, ALPHA)

    expect(isFolded(built, ZETA), 'HR-3: the press reached outside its own subtree').toBe(true)
  })

  it('⭐ MUST: a fold writes the state of the whole subtree, so no shape is remembered (HR-1a)', () => {
    // `HR-1a`: 「⛔⛔ **畳んだ行の配下は、それ自身も畳まれた状態とすること（MUST）。
    // 畳む前の形を覚えて、開いたときに戻してはならない（MUST NOT）**…⇒ ⭐ **畳む操作
    // は必ず配下ごと状態を書き換えること（MUST）。**」
    //
    // ⚠️⚠️ THIS IS THE ONE CASE THE CLOSING PARAGRAPH'S MUST NOT ARGUES WITH, and
    // the file header says which reading it takes: 「押した行ではなく、その配下の
    // 状態を書き換えてはならない」 forbids writing the descendants INSTEAD OF the
    // pressed row, not writing them AS WELL -- otherwise `HR-1a`'s own MUST, and
    // `HR-3`'s 「配下のすべてから」, and `HR-7`'s 「その隠しも解く」 could none of
    // them be obeyed. Reported as a contradiction rather than papered over.
    const built = stage()

    built.press(FOLD_BELOW, ALPHA)

    expect(isFolded(built, ALPHA), 'HR-4: the pressed row was left open').toBe(true)
    expect(isFolded(built, BETA), 'HR-1a (MUST): a descendant kept its open state').toBe(true)
    expect(isFolded(built, GAMMA), 'HR-1a (MUST): a descendant kept its open state').toBe(true)
    expect(isFolded(built, DELTA), 'HR-1a (MUST): a descendant kept its open state').toBe(true)
  })
})

// ===========================================================================
// 2. The picture each control leaves behind
// ===========================================================================

describe('表 T-015 -- the picture each of the four controls leaves', () => {
  it('⭐ HF-11 on a middle row takes its whole subtree off the picture and leaves the row (HR-4)', () => {
    // `HR-4`: ⇒ 「**その直下の子から下が描かれなくなる**」, and `HR-1a` (MUST NOT)
    // 「**畳んだ `TaskGroup` の配下の行と、その行に載っている `Task` を描いては
    // ならない**」. ⚠️ 実測: 「**押しても直下の子が描かれたまま残り、見本では消えた**」.
    const built = stage()

    built.press(FOLD_BELOW, BETA)

    expect(drawnRows(built)).toEqual(['Alpha', 'Beta', 'Epsilon', 'Zeta', 'ZetaKid'])
  })

  it('⭐ HF-11 on the root leaves the root alone on its branch (HR-4)', () => {
    const built = stage()

    built.press(FOLD_BELOW, ALPHA)

    expect(drawnRows(built)).toEqual(['Alpha', 'Zeta', 'ZetaKid'])
  })

  it('⭐ HF-13 draws the DIRECT CHILDREN and nothing deeper (HR-7)', () => {
    // ⭐ THE WHOLE OF 「1 階層」 IN ONE PICTURE: Beta and Epsilon come back, Gamma
    // does not. ⛔ A press that reached one level further would draw Gamma, which
    // is the 実測 the closing paragraph records.
    const built = stage({ folded: [ALPHA, BETA, GAMMA, DELTA, EPSILON] })

    built.press(OPEN_ONE_LEVEL, ALPHA)

    expect(drawnRows(built)).toEqual(['Alpha', 'Beta', 'Epsilon', 'Zeta', 'ZetaKid'])
  })

  it('⭐ HF-2 draws the pressed row’s whole subtree at once (HR-3)', () => {
    const built = stage({ folded: [ALPHA, BETA, GAMMA, DELTA, EPSILON] })

    built.press(OPEN_ALL_BELOW, ALPHA)

    expect(drawnRows(built)).toEqual(EVERY_ROW)
  })

  it('⭐ HF-3 takes the row itself off the picture, and its subtree with it (HR-6)', () => {
    // `HR-6` (MUST NOT): 「**隠した行の配下の行と、その行に載っている `Task` を
    // 描いてはならない**」 -- so hiding Beta costs three rows and not one.
    const built = stage()

    built.press(HIDE, BETA)

    expect(drawnRows(built)).toEqual(['Alpha', 'Epsilon', 'Zeta', 'ZetaKid'])
  })
})

// ===========================================================================
// 3. HR-3 and HR-4 are inverses of each other on the same row
// ===========================================================================

describe('表 T-015 -- HR-3 and HR-4 are one pair on one row', () => {
  it('⭐⭐ MUST: folding a row and then opening it below restores the picture exactly', () => {
    // 「**`HR-4` が畳むのはその行自身なので、解く側が同じ行を解かなければ対に
    // ならない**」. ⛔ Under the reading of 2026-08-30 -- HF-2 reaching 配下 only --
    // this round trip could not close, because the row HF-11 folded was the one
    // row HF-2 would not open.
    const built = stage()
    const before = drawnRows(built)

    built.press(FOLD_BELOW, BETA)
    expect(drawnRows(built), 'the fold did not move the picture at all').not.toEqual(before)

    built.press(OPEN_ALL_BELOW, BETA)

    expect(drawnRows(built), 'HR-3 did not undo what HR-4 did on the same row').toEqual(before)
  })

  it('⭐ and the document is back where it started, row for row', () => {
    // ⛔ A PICTURE THAT MATCHED WITH A COLUMN STILL SET would come apart at the
    // next press; `AT-56` is what the next press reads.
    const built = stage()

    built.press(FOLD_BELOW, ALPHA)
    built.press(OPEN_ALL_BELOW, ALPHA)

    for (const row of ROWS) {
      expect(isFolded(built, row.id), `${row.name} is still folded`).toBe(false)
      expect(isHidden(built, row.id), `${row.name} is hidden`).toBe(false)
    }
  })

  it('⭐ HR-5 needs no entrance of its own: one press of HF-11 draws the same picture', () => {
    // `HR-5`: 「⛔⛔ **`HR-4` と同じ操作である**…⭐ **入口は 1 つだけである**（表
    // T-051 の `HF-11`）」, and `HF-1`: 「**`HR-4` を 1 度押せば同じ絵になる**」.
    // ⇒ 「fold myself」 and 「fold below me」 must leave ONE picture, which is only
    // testable as: the row stays, everything under it goes.
    const built = stage()

    built.press(FOLD_BELOW, BETA)

    expect(drawnRows(built)).toContain('Beta')
    expect(drawnRows(built)).not.toContain('Gamma')
    expect(drawnRows(built)).not.toContain('Delta')
  })
})

// ===========================================================================
// 4. HR-6's two ways back, and the difference between them
// ===========================================================================

describe('表 T-015 の HR-6 -- the two ways back from a hide, and their one difference', () => {
  it('⛔ the manuscript still names both doors and says the difference is only the range', () => {
    expect(says('T-015', 'HR-6')).toContain(
      '隠した行は、親の行の「配下を 1 階層開く」操作子で戻せること（MUST）',
    )
    expect(says('T-015', 'HR-6')).toContain('「配下をすべて開く」操作子でも戻せること（MUST）')
    expect(says('T-015', 'HR-6')).toContain('1 本は直下の子だけ、2 本は配下のすべて')
    expect(says('T-015', 'HR-6')).toContain(
      '戻すための専用の面や札を設けてはならない（MUST NOT）',
    )
  })

  it('⭐ MUST: the parent’s 1-階層 control brings a hidden child back (HR-6 through HF-13)', () => {
    const built = stage({ hidden: [BETA] })
    expect(drawnRows(built), 'the hidden row was drawn to begin with').not.toContain('Beta')

    built.press(OPEN_ONE_LEVEL, ALPHA)

    expect(drawnRows(built), 'HR-6 (MUST): the hidden child did not come back').toContain('Beta')
    expect(isHidden(built, BETA)).toBe(false)
  })

  it('⭐⭐ MUST: and it brings that row ALONE, not its subtree (「1 本は直下の子だけ」)', () => {
    // Beta is hidden AND folded, so its own subtree is off the picture for a
    // second reason. ⛔ A one-level opener that also cleared Beta's fold would
    // be doing HF-2's work at HF-13's entrance, which `HF-13` (MUST NOT)
    // forbids: 「**同じ入口に兼ねさせてはならない（MUST NOT）**」.
    const built = stage({ hidden: [BETA], folded: [BETA, GAMMA, DELTA] })

    built.press(OPEN_ONE_LEVEL, ALPHA)

    expect(drawnRows(built)).toEqual(['Alpha', 'Beta', 'Epsilon', 'Zeta', 'ZetaKid'])
  })

  it('⭐⭐ MUST: the parent’s 配下をすべて control brings the row AND its subtree (HR-6 through HF-2)', () => {
    // 「⭐⭐ **「配下をすべて開く」操作子でも戻せること（MUST）**（利用者の裁定
    // 2026-08-31）…**2 本は配下のすべて**」, and `HR-3` (MUST NOT) 「**畳みだけを解いて
    // 隠しを残してはならない**」.
    const built = stage({ hidden: [BETA], folded: [BETA, GAMMA, DELTA] })

    built.press(OPEN_ALL_BELOW, ALPHA)

    expect(drawnRows(built)).toEqual(EVERY_ROW)
  })

  it('⭐ MUST: a hidden row anywhere below comes back too (「配下のどこにあろうとも」)', () => {
    const built = stage({ hidden: [DELTA] })

    built.press(OPEN_ALL_BELOW, ALPHA)

    expect(isHidden(built, DELTA), 'HR-3 (MUST): a hidden great-grandchild was left hidden').toBe(
      false,
    )
    expect(drawnRows(built)).toEqual(EVERY_ROW)
  })

  it('⭐ the pairing itself: the same start, two ranges, two pictures', () => {
    // ⛔ WITHOUT THIS THE FIVE ABOVE WOULD ALL PASS ON A BUILD THAT MADE THE TWO
    // ENTRANCES ONE. `HF-13` (MUST NOT): 「押すたびに違う量が開く入口は、何が起きる
    // かを押す前に読めない」.
    const narrow = stage({ hidden: [BETA], folded: [BETA, GAMMA, DELTA] })
    const wide = stage({ hidden: [BETA], folded: [BETA, GAMMA, DELTA] })

    narrow.press(OPEN_ONE_LEVEL, ALPHA)
    wide.press(OPEN_ALL_BELOW, ALPHA)

    expect(drawnRows(narrow), 'the two entrances drew the same picture').not.toEqual(
      drawnRows(wide),
    )
    expect(drawnRows(wide).length).toBeGreaterThan(drawnRows(narrow).length)
  })
})

// ===========================================================================
// 5. The head is 段 0: each of its entrances is a row entrance done at 段 0
// ===========================================================================

describe('表 T-051 の結び -- the head does at 段 0 what the paired control does on a row', () => {
  it('⭐⭐ HF-12 is HF-11 at 段 0: pressing it can leave no row drawn at all (HR-2)', () => {
    // `HR-2`: 「⛔⛔ **最も浅い段の行も畳むこと（MUST）**…⇒ **押すと行が 1 つも描かれ
    // ない状態になりうる。**⛔ **最も浅い段を残す読みを採ってはならない（MUST NOT）**」,
    // and the state that carries it is 表 T-206 の `S-211`, never a row's column:
    // 「**行の畳みでは本行を満たせない** —— **最も浅い段の行は親を持たないので誰にも
    // 隠されない**」.
    const built = stage()

    built.press(HEAD_FOLD_EVERY_ROW, null)

    expect(drawnRows(built), 'HR-2 (MUST NOT): the shallowest level was kept').toEqual([])
  })

  it('⭐⭐ HF-16 is HF-13 at 段 0: it brings the shallowest level back and nothing deeper', () => {
    // `HR-2`: 「⭐ **`HR-7`（子を 1 階層展開）を頭で押せば最も浅い段が戻る。**」 ⇒ the
    // head's opener does exactly what a row's one-level opener does: one level.
    const built = stage()

    built.press(HEAD_FOLD_EVERY_ROW, null)
    built.press(HEAD_OPEN_ONE_LEVEL, null)

    expect(drawnRows(built), 'HF-16 opened more or less than one level').toEqual(['Alpha', 'Zeta'])
  })

  it('⭐⭐ HF-16 also brings back a hidden TOP-LEVEL row, as HF-13 does for a child (HR-6)', () => {
    // 「**親を持たない最上位の行は、段 0 の同じ操作子で戻せること（MUST）** ——
    // 同表の `HF-16` である。`FR-085` が最上位の行を許しているためである」.
    const built = stage({ hidden: [ZETA] })
    expect(drawnRows(built)).not.toContain('Zeta')

    built.press(HEAD_OPEN_ONE_LEVEL, null)

    expect(drawnRows(built), 'HR-6 (MUST): the hidden top-level row had no way back').toContain(
      'Zeta',
    )
  })

  it('⭐⭐ HF-10 is HF-2 at 段 0: it opens every level at once (HR-1)', () => {
    const built = stage()

    built.press(HEAD_FOLD_EVERY_ROW, null)
    built.press(HEAD_OPEN_EVERY_ROW, null)

    expect(drawnRows(built)).toEqual(EVERY_ROW)
  })

  it('⭐⭐ HF-10 brings back what HF-3 hid, wherever it is (HR-1: HR-3 と同じく)', () => {
    // `HR-1`: 「⭐ **`HR-3` と同じく、`HR-6` が隠した行もすべて戻すこと（MUST）** ——
    // **本行は `HR-3` の段 0 である**」.
    const built = stage({ hidden: [ZETA, DELTA], folded: [ALPHA] })

    built.press(HEAD_OPEN_EVERY_ROW, null)

    expect(drawnRows(built)).toEqual(EVERY_ROW)
  })

  it('⭐ the four head entrances are told apart: 1 階層 and すべて are not one control', () => {
    // `HF-16` (MUST NOT): 「**`HF-10`（すべて開く）に兼ねさせてはならない（MUST NOT）**
    // —— **理由は `HF-13` が行について述べたものと同じである**」.
    const oneLevel = stage()
    const everyRow = stage()

    oneLevel.press(HEAD_FOLD_EVERY_ROW, null)
    oneLevel.press(HEAD_OPEN_ONE_LEVEL, null)
    everyRow.press(HEAD_FOLD_EVERY_ROW, null)
    everyRow.press(HEAD_OPEN_EVERY_ROW, null)

    expect(drawnRows(oneLevel), 'the head’s two openers answer alike').not.toEqual(
      drawnRows(everyRow),
    )
  })

  it('⛔ MUST NOT: the head carries none of the three a row keeps to itself', () => {
    // 「⭐ **段 0 には畳み込む先の親が無いので隠せず（`HF-3`）、実体が無いので消せず
    // （`FR-032`）、行でないので留められない（`FR-098`）。**⛔ **頭にその 3 つの入口を
    // 置いてはならない（MUST NOT）。**」 ⇒ a press that names no row cannot hide,
    // delete or pin anything, whichever of the three entrances it carries.
    const rowsBefore = drawnRows(stage())
    for (const rule of ['HF-3', 'FR-032', 'FR-098']) {
      const built = stage()

      built.press(entranceFor(rule), null)

      expect(
        drawnRows(built),
        `the head answered ${rule}'s entrance and the picture moved`,
      ).toEqual(rowsBefore)
      for (const row of ROWS) {
        expect(isHidden(built, row.id), `${rule} at the head hid ${row.name}`).toBe(false)
      }
    }
  })
})

// ===========================================================================
// 6. Four entrances at the head, seven on a row -- and why
// ===========================================================================

describe('表 T-051 の結び -- the head has four entrances and a row has seven', () => {
  it('⛔ the roster itself splits four and seven, and the three are the difference', () => {
    // 「⇒ ⭐ **頭が持つ入口が 4 つ、行が持つ入口が 7 つであることは、この 1 つの違いから
    // 出る（MUST）** —— **段 0 には畳み込む先の親が無いので隠せず（`HF-3`）、実体が無い
    // ので消せず（`FR-032`）、行でないので留められない（`FR-098`）。**」
    expect(AT_THE_HEAD).toHaveLength(4)
    expect(ON_A_ROW).toHaveLength(7)
    // ⭐ AND THE THREE ARE THE NAMED THREE, so the arithmetic is the
    // manuscript's reason and not a coincidence of two counts.
    expect(ON_A_ROW.filter((one) => !AT_THE_HEAD.includes(one))).toHaveLength(7)
    for (const rule of ['HF-3', 'FR-032', 'FR-098']) {
      expect(ON_A_ROW, `${rule}'s entrance left the row`).toContain(entranceFor(rule))
      expect(AT_THE_HEAD, `${rule}'s entrance appeared at the head`).not.toContain(
        entranceFor(rule),
      )
    }
  })

  it('⛔ MUST: the panel draws seven entrances on a row and four at its head', () => {
    // ⭐ THE COUNT IS ONLY OBSERVABLE WHERE THEY ARE DRAWN: nothing in
    // `ScreenView` enumerates a row's entrances, so this one case is driven
    // through the DOM surface rather than the loop.
    const built = wire(THEME, { 'App Header': 37 })
    domSurfaceOf(built).showScreenView(PANEL_VIEW)

    const tree = oneByRole(built.root(), ROW_TITLE_TREE)
    const row = tree.children[0]
    if (row === undefined) throw new Error(`the tree drew no row: ${whatWasDrawn(tree)}`)

    const onTheRow = new Set(iconsUnder(row))
    const inTheTree = new Set(iconsUnder(tree))
    const atTheHead = new Set(iconsUnder(built.root()).filter((one) => !inTheTree.has(one)))

    expect(
      [...onTheRow].sort(),
      `the row drew ${onTheRow.size} of 表 T-109's entrances: ${whatWasDrawn(row)}`,
    ).toEqual([...ON_A_ROW].sort())
    expect(
      [...atTheHead].sort(),
      `the head drew ${atTheHead.size} of 表 T-109's entrances`,
    ).toEqual([...AT_THE_HEAD].sort())
  })
})

// ===========================================================================
// 7. FR-029 -- when each of these entrances is armed and when it is faint
// ===========================================================================

describe('FR-029 -- the arming of every entrance the panel carries', () => {
  it('⛔ the manuscript still gives each of them its own condition', () => {
    expect(says('T-051', 'HF-2')).toContain(
      'その行が抱えている畳み込みが 0 のときは、`FR-029` に従って薄く描くこと（MUST）',
    )
    expect(says('T-051', 'HF-2')).toContain(
      'その数を示すのが `HF-18` であり、示す数と構えの条件は同じ 1 つである',
    )
    expect(says('T-051', 'HF-3')).toContain(
      '描かれている行はいつでも隠せるので、本操作子を薄く描く場面は無い',
    )
    expect(says('T-051', 'HF-13')).toContain(
      '開ける直下の子が 1 つも無いときは、`FR-029` に従って薄く描くこと（MUST）',
    )
    expect(says('T-051', 'HF-16')).toContain(
      '開ける段が無いときは、`FR-029` に従って薄く描くこと（MUST）',
    )
    expect(REQUIREMENTS).toContain(
      'その入口を押しても、いま文書にも画面にも何も変えられないときは、その入口を薄く描くこと（MUST）',
    )
  })

  it('⛔ MUST: HF-3 is never faint on a drawn row (「薄く描く場面は無い」)', () => {
    // ⭐ THE ONE ENTRANCE WITH NO SPENT STATE, and the reason is in the row: a
    // drawn row can always be taken off the screen. ⚠️ Read through `canClose`,
    // which is the panel's own statement of it.
    for (const fixture of [{}, { folded: [ALPHA] }, { folded: [BETA, GAMMA, DELTA] }]) {
      const built = stage(fixture)
      for (const name of drawnRows(built)) {
        const row = ROWS.find((one) => one.name === name)
        if (row === undefined) continue
        expect(
          (titleOf(built, row.id).expander as any).canClose,
          `HF-3 was drawn faint on the drawn row ${name}`,
        ).toBe(true)
      }
    }
  })

  it('⛔ MUST: HF-2 is armed exactly when the row is holding something folded away', () => {
    // 「**その行が抱えている畳み込みが 0 のときは薄く描くこと（MUST）**」 and the
    // closing rule 「**その操作で、描かれる行が 1 行も増減しないときは、対象が 1 つも
    // 無いものとして扱うこと（MUST）**」.
    const open = stage()
    expect(
      (titleOf(open, ALPHA).expander as any).canOpen,
      'nothing is folded under Alpha and its opener is armed',
    ).toBe(false)

    const held = stage({ folded: [BETA] })
    expect(
      (titleOf(held, ALPHA).expander as any).canOpen,
      'Beta is folded under Alpha and Alpha’s opener is faint',
    ).toBe(true)
  })

  it('⛔ MUST: HF-11 is faint on a row whose press would move no row (表 T-051 の結び)', () => {
    // 「⛔ **その操作で、描かれる行が 1 行も増減しないときは、対象が 1 つも無いものと
    // して扱うこと（MUST）** —— **畳む相手が描かれていても、その相手が配下を持たな
    // ければ、畳んで隠れる行は 1 つも無い**」. ⭐ Delta is a leaf, so folding it takes
    // nothing off the screen; Gamma holds Delta, so folding Gamma does.
    const built = stage()

    expect(
      (titleOf(built, DELTA).expander as any).canCloseBelow,
      'a leaf’s fold is armed although the picture cannot move',
    ).toBe(false)
    expect(
      (titleOf(built, GAMMA).expander as any).canCloseBelow,
      'a row with a drawn child has its fold drawn faint',
    ).toBe(true)
  })

  it('⛔ MUST: HF-13 is faint when there is no direct child to open, and armed when there is', () => {
    // 「⛔ **開ける直下の子が 1 つも無いときは、`FR-029` に従って薄く描くこと
    // （MUST）**」, whose two ways of having one are `HR-7`'s own: this row's fold,
    // and a direct child that `HR-6` hid.
    const open = stage()
    expect(
      (titleOf(open, ALPHA) as any).canOpenOneLevel ?? false,
      'nothing is folded or hidden under Alpha and its one-level opener is armed',
    ).toBe(false)

    const folded = stage({ folded: [ALPHA] })
    expect(
      (titleOf(folded, ALPHA) as any).canOpenOneLevel,
      'Alpha is folded and its one-level opener is faint',
    ).toBe(true)

    const hiding = stage({ hidden: [BETA] })
    expect(
      (titleOf(hiding, ALPHA) as any).canOpenOneLevel,
      'Alpha’s child is hidden and its one-level opener is faint -- HR-6 has no way back',
    ).toBe(true)
  })

  it('⛔ MUST: HF-16 is faint with no level to open, and armed once 段 0 is folded', () => {
    // 「⛔ **開ける段が無いときは、`FR-029` に従って薄く描くこと（MUST）**」, and
    // `HR-2` names this control as the way back from the fold it describes.
    const open = stage()
    expect(
      (open.screen.last().rowTitlePanel as any).canOpenLevelZero ?? false,
      'nothing is folded at 段 0 and the head’s one-level opener is armed',
    ).toBe(false)

    const built = stage()
    built.press(HEAD_FOLD_EVERY_ROW, null)

    expect(
      (built.screen.last().rowTitlePanel as any).canOpenLevelZero,
      'HR-2 (MUST): 段 0 is folded and the way back is drawn faint',
    ).toBe(true)
  })

  it('⛔ MUST: the head’s すべて開く and すべて畳む follow the same rule (RS-31 / RS-32)', () => {
    // 表 T-233: `RS-31` 「畳まれた行が 1 つも無い」（`HF-10`）, `RS-32` 「開いている行が
    // 1 つも無い」（`HF-12`）. ⭐ `HR-2` makes the second one reach 段 0 as well, so an
    // open panel always has something left to fold.
    const open = stage()
    expect(
      (open.screen.last().rowTitlePanel as any).canOpenEveryRow ?? false,
      'no row is folded and the head’s opener is armed',
    ).toBe(false)
    expect(
      (open.screen.last().rowTitlePanel as any).canCloseEveryRow,
      'every row is open and the head’s fold is faint',
    ).toBe(true)

    const folded = stage({ folded: [BETA] })
    expect(
      (folded.screen.last().rowTitlePanel as any).canOpenEveryRow,
      'a row is folded and the head’s opener is faint',
    ).toBe(true)
  })

  it('⭐ MUST: a press on an armed entrance acts instead of telling a reason (FR-029)', () => {
    // ⛔ WITHOUT THIS, EVERY ARMING CASE ABOVE COULD PASS ON A BUILD THAT DREW
    // THE FLAG AND ANSWERED THE PRESS WITH A REASON ANYWAY. ⭐ It also carries
    // the `HF-17` / `HF-14` pairing as far as this seam can: both are armed,
    // because a new row can always be added -- at 段 0 and under a row alike.
    const folded = stage({ folded: [BETA] })
    folded.press(OPEN_ALL_BELOW, ALPHA)
    actedRatherThanRefused(folded, 'HF-2 on a row holding a folded child')

    const hiding = stage()
    hiding.press(HIDE, BETA)
    actedRatherThanRefused(hiding, 'HF-3 on a drawn row')

    const adding = stage()
    adding.press(ADD_CHILD_ROW, ALPHA)
    actedRatherThanRefused(adding, 'HF-14 on a row')

    const addingAtLevelZero = stage()
    addingAtLevelZero.press(HEAD_ADD_ROW, null)
    actedRatherThanRefused(addingAtLevelZero, 'HF-17 at 段 0')
  })
})

// ===========================================================================
// 8. HF-18's count is the number that arms HF-2
// ===========================================================================

describe('表 T-051 の HF-18 -- the number a row shows is the number that arms its opener', () => {
  it('⛔ the manuscript still ties the count to the arming', () => {
    expect(says('T-051', 'HF-18')).toContain(
      '配下に畳み込んでいる行があるとき、その行数を行に示すこと（MUST）',
    )
    expect(says('T-051', 'HF-18')).toContain(
      '数えるのは人が畳んだ分だけとすること（MUST）。表示量（`FR-018`）が落とした行を数えてはならない（MUST NOT）',
    )
    expect(says('T-051', 'HF-2')).toContain(
      'その数を示すのが `HF-18` であり、示す数と構えの条件は同じ 1 つである',
    )
  })

  it('⛔ MUST: a row holding nothing shows no count, and one holding rows shows one', () => {
    const open = stage()
    expect(foldedCountOf(open, ALPHA), 'a row holding nothing folded still shows a number').toBe(0)

    const held = stage({ folded: [BETA] })
    expect(foldedCountOf(held, ALPHA), 'HF-18 (MUST): the held rows were not counted').toBeGreaterThan(
      0,
    )
  })

  it('⛔ MUST: the number shown and the arming of HF-2 are one condition, never two', () => {
    // 「**示す数と構えの条件は同じ 1 つである**」 -- walked over several shapes so
    // that a build which computed them separately comes apart on one of them.
    const shapes: readonly Fixture[] = [
      {},
      { folded: [BETA] },
      { folded: [GAMMA] },
      { folded: [ALPHA] },
      { hidden: [BETA] },
      { hidden: [DELTA] },
      { folded: [BETA, ZETA] },
    ]
    const apart: string[] = []
    for (const shape of shapes) {
      const built = stage(shape)
      for (const name of drawnRows(built)) {
        const row = ROWS.find((one) => one.name === name)
        if (row === undefined) continue
        const armed = (titleOf(built, row.id).expander as any).canOpen === true
        if (armed !== foldedCountOf(built, row.id) > 0) {
          apart.push(
            `${JSON.stringify(shape)} ${name}: canOpen=${String(armed)} count=${String(
              foldedCountOf(built, row.id),
            )}`,
          )
        }
      }
    }
    expect(apart, 'HF-2 (MUST): the count and the arming came apart').toEqual([])
  })

  it('⛔ MUST: the number is the rows that come back when that row’s HF-2 is pressed', () => {
    // 「⭐ **数えるのは配下の行の数ではなく、その操作の前後で描かれる行の差である。**」
    // ⇒ the count is measurable without this file deciding what 「抱えている」 means:
    // press the control and count the rows that arrived.
    const wrong: string[] = []
    const shapes: readonly Fixture[] = [
      { folded: [BETA] },
      { folded: [GAMMA] },
      { folded: [BETA, GAMMA] },
      { hidden: [BETA] },
      { hidden: [DELTA] },
    ]
    for (const shape of shapes) {
      for (const row of ROWS) {
        const built = stage(shape)
        if (!drawnRows(built).includes(row.name)) continue
        const shown = foldedCountOf(built, row.id)
        const before = drawnRows(built).length
        built.press(OPEN_ALL_BELOW, row.id)
        const arrived = drawnRows(built).length - before
        if (shown !== arrived) {
          wrong.push(
            `${JSON.stringify(shape)} ${row.name}: showed ${String(shown)}, ${String(
              arrived,
            )} rows arrived`,
          )
        }
      }
    }
    expect(wrong, 'HF-18 / HF-2 (MUST): the number shown is not the number that came back').toEqual(
      [],
    )
  })
})

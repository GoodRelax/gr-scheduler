// 表 T-051 の `HF-17` (MUST / MUST NOT, 利用者の裁定 2026-09-06「(a) ただし、1
// 階層だけ開くこと」, CR-368): pressing HF-17's own entrance (adding a row at
// 段 0, the panel's head) must open 段 0 by exactly one level when it stands
// folded (`S-211`) -- never every fold below it.
//
// ⚠️ Chapter 9 admits no Unit as a TEST_LEVEL, so these cases have no node in
// the specification. 表 T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⭐⭐ THE CLAUSE, VERBATIM (docs/spec/01-04-requirements.md, 表 T-051 の `HF-17`)
// ---------------------------------------------------------------------------
//
//   「⚠️ 本行で行を足すとき、段 0 が畳まれていれば（`S-211`）1 階層だけ開くこと
//    （MUST）。すべて開いてはならない（MUST NOT）」（利用者の裁定 2026-09-06
//    「(a) ただし、1 階層だけ開くこと」） —— 「開かなければ、本行の MUST NOT
//    （打ち込み口だけを送ってはならない）が破れる。」「すべて開けば `HF-10` と
//    同じになり、人が畳んだ意思を捨てることになる。」
//
// and 表 T-015 の `HR-2` (全畳み), which is how a fixture folds 段 0 at all:
//
//   「最も浅い段の行も畳むこと（MUST）」…「段 0 が畳まれているかは
//    `_assets/tbl-settings.md` の 表 T-206 の `S-211` が持つ」
//
// ---------------------------------------------------------------------------
// Unit under test: UF-48 of 表 T-075 (`frame-loop.ts`, `CP-25` of 表 T-062) --
// the layer holding S-211 (LY-5 of 表 T-060 leaves it the only one that may).
//
// ⛔ WRITTEN FROM docs/spec, AND WHAT WAS READ OF `src/` IS NAMED HERE (docs/
// development-rules/04-verification.md §1: only the head, published types and
// signatures). The host, screen fake and press helper are copied in shape from
// tests/unit/t-015-t-051-the-four-folding-controls.test.ts and tests/unit/
// t-051-hf-17-adding-a-row-walks-the-rename-road.test.ts, which drive this same
// unit through the same seams.
//
// ---------------------------------------------------------------------------
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//  1. THE NAME FIELD / RENAME-ROAD HALF OF HF-17 (D-243). tests/unit/
//     t-051-hf-17-adding-a-row-walks-the-rename-road.test.ts already asks that;
//     this file's one question is the fold, S-211 alone.
//  2. HF-14's OWN "open the pressed ancestor" MUST. That is a different fold
//     (a single named parent), not 段 0, and it is not this row's to restate.
//  3. WHETHER HEAD_OPEN_ONE_LEVEL (HF-16) ITSELF unfolds 段 0 -- that is
//     already the entrance HR-2's own RATIONALE names as the way back, and no
//     case here presses it.

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
import { bare, bareAll, specTable, unbroken } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ===========================================================================
// 1. The manuscript, read at run time rather than copied
// ===========================================================================

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

/** ⭐⭐ THE CLAUSE CR-368 ADDED TO HF-17 ON 2026-09-06, verbatim. */
const HF_17_OPENS_ONE_LEVEL =
  '本行で行を足すとき、段 0 が畳まれていれば（`S-211`）1 階層だけ開くこと（MUST）。すべて開いてはならない（MUST NOT）'

/** 表 T-015 の `HR-2` -- the rule that lets a fixture fold 段 0 in the first place. */
const HR_2_FOLDS_LEVEL_ZERO_TOO = '最も浅い段の行も畳むこと（MUST）'

describe('the manuscript this file is driven by', () => {
  it('still asks HF-17 to open exactly one level, never every fold', () => {
    expect(REQUIREMENTS).toContain(HF_17_OPENS_ONE_LEVEL)
  })

  it('still lets HR-2 (全畳み) fold 段 0 itself, which is the premise these cases fold with', () => {
    expect(REQUIREMENTS).toContain(HR_2_FOLDS_LEVEL_ZERO_TOO)
  })
})

/** 表 T-103's settled English name for U-22 -- the 面 these entrances sit on. */
const ROW_TITLE_PANEL = bare(
  specTable('T-103').rows.find((one) => one.id === 'U-22')?.by['確定名（英）'] ?? '',
)

const T_109_ON_THE_PANEL = specTable('T-109').rows.filter(
  (one) => bareAll(one.by['面'] ?? '').includes(ROW_TITLE_PANEL),
)

/** The entrance 表 T-109 gives one row of 表 T-051, by that table's own join. */
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

/** HR-2 at 段 0 -- folds every row AND 段 0 itself. */
const HEAD_FOLD_EVERY_ROW = entranceFor('HF-12')
/** HF-17's own entrance -- adds a row at 段 0, the panel's own head. */
const HEAD_ADD_ROW = entranceFor('HF-17')

// ===========================================================================
// 2. The document: two roots, one of them a parent of a parent, so a fold at
//    段 0 hides everything and a one-level reopen brings back roots ONLY.
//
//   Alpha            (root)
//     Beta
//       Gamma
//   Zeta             (a second root)
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
const ZETA = '44444444-4444-4444-8444-444444444444'

const ROWS: readonly { readonly id: string; readonly parentId: string | null; readonly name: string }[] = [
  { id: ALPHA, parentId: null, name: 'Alpha' },
  { id: BETA, parentId: ALPHA, name: 'Beta' },
  { id: GAMMA, parentId: BETA, name: 'Gamma' },
  { id: ZETA, parentId: null, name: 'Zeta' },
]

const nameOf = (groupId: string): string => ROWS.find((one) => one.id === groupId)?.name ?? groupId

function task(uid: number, name: string): Task {
  return {
    uid,
    wbsParentUid: null,
    wbsOrder: uid,
    name,
    start: '2026-04-01',
    finish: '2026-04-10',
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
  } as unknown as Task
}

function documentWith(): Document {
  const template = structuredClone(TEMPLATE) as any
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...structuredClone(template.schedule.project), uidHighWaterMark: 100 },
      calendars: structuredClone(template.schedule.calendars),
      tasks: ROWS.map((_row, index) => task(index + 1, `Task${index + 1}`)),
      resources: [],
      assignments: [],
      taskGroups: ROWS.map((one, index) => ({
        id: one.id,
        parentId: one.parentId,
        label: one.name,
        derivedFromTaskUid: null,
        order: index,
        isCollapsed: false,
        isHidden: false,
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

// ===========================================================================
// 3. The host, copied in shape from the two files named above.
// ===========================================================================

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

function host(): { readonly surface: { showSvg(svg: string): void }; runAnimationFrames(): void } {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  return {
    surface: { showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
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

const ON_THE_SURFACE = { x: 80, y: 120 }

interface Stage {
  readonly loop: FrameLoop
  readonly screen: ScreenPane
  press(entry: string, groupId: string | null): void
}

function stage(): Stage {
  const pen = host()
  const screen = screenPane()
  const loop = frameLoop(pen.surface, documentWith(), SCREEN, screen.wiring)
  pen.runAnimationFrames()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  return {
    loop,
    screen,
    press: (entry, groupId) => {
      screen.drawAt({
        part: ROW_TITLE_PANEL,
        entry: entry as any,
        format: null,
        rowGroupId: groupId,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      })
      send(pointer('down', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      send(pointer('up', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      screen.drawAt(null)
    },
  }
}

/** The rows the panel drew, by name, in the order it drew them. */
function drawnRows(built: Stage): readonly string[] {
  const panel = built.screen.last().rowTitlePanel
  return [...panel.pinnedTitles, ...panel.titles].map((one) => nameOf(one.groupId))
}

/** `S-211`, read the only way a screen-level test can: HF-16's own arming. */
const canOpenLevelZero = (built: Stage): boolean | undefined =>
  (built.screen.last().rowTitlePanel as any).canOpenLevelZero

// ===========================================================================
// 4. The premise: HR-2 at 段 0 folds every row away, including the roots
// ===========================================================================

describe('premise -- HEAD_FOLD_EVERY_ROW (HR-2) folds 段 0 itself', () => {
  it('before folding, every row is drawn', () => {
    const built = stage()
    expect(drawnRows(built)).toEqual(['Alpha', 'Beta', 'Gamma', 'Zeta'])
  })

  it('⭐⭐ after HEAD_FOLD_EVERY_ROW, 段 0 is folded and nothing is drawn (HR-2, MUST)', () => {
    const built = stage()

    built.press(HEAD_FOLD_EVERY_ROW, null)

    expect(
      drawnRows(built),
      'HR-2 (MUST): 最も浅い段の行も畳むこと -- the roots should have gone with everything else',
    ).toEqual([])
    expect(canOpenLevelZero(built), 'HF-16 should now be armed to open the fold this made').toBe(
      true,
    )
  })
})

// ===========================================================================
// 5. HF-17 (MUST / MUST NOT): adding a row at 段 0 opens it by ONE level
// ===========================================================================

describe('HF-17 (MUST) -- adding a row at 段 0 opens the fold by exactly one level', () => {
  it('⭐⭐ the roots reappear, the new row among them, once 段 0 is folded and HF-17 is pressed', () => {
    const built = stage()
    built.press(HEAD_FOLD_EVERY_ROW, null)
    expect(drawnRows(built)).toEqual([]) // the premise, restated

    built.press(HEAD_ADD_ROW, null)

    const after = drawnRows(built)
    expect(
      after,
      'HF-17 (MUST): 段 0 が畳まれていれば 1 階層だけ開くこと -- pressing the ' +
        'entrance at 段 0 while it stood folded left nothing visible, including the row it just made',
    ).not.toEqual([])
    expect(after, 'Alpha and Zeta are both 段 0’s own children -- both come back').toEqual(
      expect.arrayContaining(['Alpha', 'Zeta']),
    )
    expect(after.length, 'exactly one row was added to the two roots').toBe(3)
  })

  it('⛔⛔ MUST NOT: Beta and Gamma stay folded away -- only 段 0 opened, not everything (not HF-10’s shape)', () => {
    // ⛔ THE WHOLE OF THE MUST NOT: 「すべて開いてはならない」 -- 「すべて開けば
    // `HF-10` と同じになり、人が畳んだ意思を捨てることになる」. Alpha's own fold
    // (its `isCollapsed`) is untouched by HF-17 -- only 段 0's separate S-211
    // flag is -- so Beta (Alpha's child) must stay hidden.
    const built = stage()
    built.press(HEAD_FOLD_EVERY_ROW, null)

    built.press(HEAD_ADD_ROW, null)

    const after = drawnRows(built)
    expect(
      after,
      'HF-17 (MUST NOT): すべて開いてはならない -- Beta reappeared, which is HF-10’s ' +
        'shape and not the one level this row allows',
    ).not.toContain('Beta')
    expect(after).not.toContain('Gamma')
  })

  it('⭐ S-211 itself is cleared: HF-16 is no longer armed once HF-17 opened it', () => {
    const built = stage()
    built.press(HEAD_FOLD_EVERY_ROW, null)
    expect(canOpenLevelZero(built)).toBe(true)

    built.press(HEAD_ADD_ROW, null)

    expect(
      canOpenLevelZero(built),
      'S-211 should have come off the fold HF-17 just opened, so HF-16 has nothing left to do',
    ).not.toBe(true)
  })

  it('control: pressing HF-17 while 段 0 is NOT folded changes nothing about the fold', () => {
    const built = stage()
    expect(canOpenLevelZero(built)).not.toBe(true)

    built.press(HEAD_ADD_ROW, null)

    const after = drawnRows(built)
    expect(after).toEqual(expect.arrayContaining(['Alpha', 'Beta', 'Gamma', 'Zeta']))
    expect(after.length).toBe(5)
  })
})

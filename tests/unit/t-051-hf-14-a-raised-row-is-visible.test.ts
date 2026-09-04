// 表 T-051 の `HF-14` (MUST, 利用者の裁定 2026-09-03 / 2026-09-04) -- the promise
// this file is written for is HF-14's OWN summary of it: 「立てた行は見える」.
//
// ⭐⭐ HF-14 states this promise as TWO HALVES, and this file carries BOTH:
//
//   HALF 1 (詳しさの段, ruled 2026-09-03) --
//     「**立てた行が、現に描かれている詳しさの段（`FR-018`）で落ちる深さになるとき
//     は、その行が描かれるまで詳しさの段を開くこと（MUST）** —— **表示位置を送るだ
//     けで済ませてはならない（MUST NOT）。**」
//     「**これは `HF-17` の「行が見える位置まで送ること（MUST）」と同じ 1 つの約束
//     である** —— **送っても、詳しさが落とした行は現れない。**」
//
//   HALF 2 (畳み, ruled 2026-09-04, 「提案通りに進めよ。ただし開くのは押した親の
//     1つだけ。」) --
//     「**立てた行が、人が畳んだ親の下に入るときは、その親を開くこと（MUST）**
//     —— **開いてよいのは押した親 1 つだけである。その先祖まで開いてはならない
//     （MUST NOT）。**」
//
//   THE ROW ITSELF TIES THE TWO TOGETHER: 「**上の詳しさの段と合わせて、約束は
//   1 つである** —— **立てた行は見える。**」「**`HF-7` の畳みは人が自分でしたこと
//   なので、製品が動かすのはこの 1 つの場合に限る。**」 -- 表 T-051 の `HF-7`:
//   「人が畳んだ状態は、表示量の増減（`FR-018`）より優先する。人の指定を倍率が
//   上書きしてはならない（MUST NOT）」. HF-14 is the ONE case where a product
//   action is allowed to touch a human fold at all, and only the one it just
//   created a row under.
//
// ⭐ HF-14 is published for at 表 T-064's `PI-5` (docs/spec/05-07-design.md):
// `groupDepthLimit`（いまの詳しさの段が描く最も深い段。`FR-018`）／
// `groupDepthThresholdOf`（その段を描くのに要る倍率。`FR-018`）—— 「2 つとも
// 表 T-051 の `HF-14` のために公開した…行を立てる側が、立てる前に落ちるかどうか
// を問えなければならない」. ⛔ THIS FILE CALLS `groupDepthThresholdOf` NOWHERE:
// no existing test drives it, so its call convention is unestablished and
// guessing one would be exactly the "こうだろう" this body must not write.
// `groupDepthLimit(settings)` IS already driven by tests/unit/layout-engine.
// test.ts (`groupDepthLimit(settingsOf({ ...LAYOUT_SETTINGS, zoomY: 1 }))`), so
// this file drives the SAME one-argument function the same way and reads the
// OUTCOME through it -- which is all HF-14 promises: that the tier a widened
// zoomY draws through actually reaches the new row's depth, not by which
// setting carried the widening.
//
// ---------------------------------------------------------------------------
// Unit under test: UF-48 of 表 T-075 (`frame-loop.ts`, component CP-25 of
// 表 T-062), the same seam as
// tests/unit/t-051-hf-14-the-depth-cap-refuses-a-row.test.ts -- the layer that
// turns a press into a raised telling and hands the frame that carries it to
// the surface. That file's own written-down list explicitly leaves both halves
// carried here for someone else to write ("no press in this file raises a
// row, and choosing the seam it is read through is the implementer's, not
// this file's" -- point 1b), and tests/unit/uf-71.test.ts (the ScreenRenderer
// seam, HF-14's naming half) says the same about the LOD half from its own
// side ("This unit is HANDED a ScreenView: which rows survived the detail
// tier... are both settled before the description arrives... That MUST
// belongs to the side that chooses the tier."). This file is written at that
// remaining seam.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1). ⛔ NO FILE UNDER src/ WAS OPENED. The host,
// the fake surface, the fixture shape and the press helper are copied from
// tests/unit/t-051-hf-14-the-depth-cap-refuses-a-row.test.ts, which drives
// this same unit through the same seam; `startup-template.json` is a
// generated document and is read as data. `groupDepthLimit`'s call shape
// (one `DocumentSettings` argument) is copied from
// tests/unit/layout-engine.test.ts, the only place it is already driven.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED, AND WHY
// ---------------------------------------------------------------------------
//   1. HF-14's OTHER TWO PROMISES. The default name and the properties panel
//      ("押された瞬間に、既定の名前で行を立てること…") belong to
//      tests/unit/uf-71.test.ts's own HF-14 describe block, and the faint /
//      refused entrance at `FR-085`'s cap belongs to
//      tests/unit/t-051-hf-14-the-depth-cap-refuses-a-row.test.ts. Repeating
//      either here would duplicate an assertion this codebase already owns
//      elsewhere, and 表 T-051's own MUST NOT for the panel row says why
//      that is unwelcome: 「その作法をここに書き写してはならない（MUST NOT）
//      —— 同じ MUST が 2 か所に載ると必ず離れていく」.
//   2. HF-17's OWN HALF (見える位置まで表示位置を送ること). HF-14 borrows it
//      ("`HF-14`（配下に足す）も同じとすること（MUST）"), but the task that
//      asked for this file draws the line itself: 「HF-17（行が見える位置ま
//      で送る）とは別の約束である。送っても、落とされた行は現れない。」ここで
//      問うのは詳しさの段と畳みだけであり、表示位置（scrollDate 等）そのもの
//      は問わない。
//   3. WHETHER THE ADD AND THE OPEN SHARE ONE UNDO STEP OR TWO. 表 T-027's
//      `UN-1` / `UN-14` put 「行（`TaskGroup`）の追加」and「畳みと非表示の変更」
//      in the SAME target family (both count), while `UN-8` puts
//      「ズーム・スクロール・パン」in the EXCLUDED family (never counts).
//      `FR-018`'s own rationale keeps `zoomY` inside `documentSettings`
//      (`S-76`), and `FR-055` shows the pattern the codebase already uses
//      when one user gesture must write BOTH a counted change and a
//      `UN-8`-excluded one: two separate writes, ordered, only one counted
//      ("全体表示の 1 回の押下は、2 つの書き込みに分けて行うこと（MUST）…①
//      倍率と表示位置を置く（`UN-8` により段を積まない）② 畳んだ行をすべて開
//      く（`UN-17` により段を 1 つ積む）"). Whether HF-14's row-add follows
//      that SAME split (so undoing the add leaves the widened `zoomY` in
//      place, the way `UN-8` promises for every other zoom change) is never
//      stated by 表 T-051's `HF-14` itself, and no other row was found that
//      says it either. ⛔ PER THE BRIEF THIS FILE WAS WRITTEN TO, THAT SILENCE
//      MEANS NO CASE HERE ASSERTS AN UNDO STEP COUNT FOR EITHER HALF. The
//      finding is written down here, and reported, instead.
//   4. THE LITERAL "ANCESTOR" OF HALF 2's MUST NOT. See the long comment
//      above the half-2 describe block below -- 表 T-015's `HR-1a` makes the
//      literal scenario (a visible pressed parent whose OWN ancestor is ALSO
//      collapsed) structurally unreachable, so this file tests the closest
//      available proxy and says so plainly rather than silently asserting
//      the letter of the row.
// ===========================================================================

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
  RowTitle,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import { groupDepthLimit } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ===========================================================================
// The manuscripts, read at run time rather than copied (Chapter 1.9)
// ===========================================================================

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/** Everything one row of a table says, as one string. */
const says = (table: string, id: string): string => rowOf(table, id).cells.join(' ')

/** 表 T-103's settled English name for U-22 -- the 面 a row's controls answer as. */
const ROW_TITLE_PANEL = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')

/**
 * The entrance 表 T-109 gives one rule of 表 T-051.
 *
 * ⭐ THE JOIN IS THE SPECIFICATION'S OWN, copied from
 * tests/unit/t-051-hf-14-the-depth-cap-refuses-a-row.test.ts: 表 T-109's 正
 * column names the rule that owns each entrance.
 */
function entranceFor(rule: string): string {
  const onThePanel = specTable('T-109').rows.filter(
    (one) => bare(one.by['面'] ?? '') === ROW_TITLE_PANEL,
  )
  const found = onThePanel.filter((one) =>
    new RegExp(`(^|[^0-9A-Za-z-])${rule}([^0-9-]|$)`).test(one.by['正'] ?? ''),
  )
  const first = found[0]
  if (found.length !== 1 || first === undefined) {
    throw new Error(`表 T-109 gives ${rule} ${found.length} entrances on the panel, not one`)
  }
  return first.id
}

/** `HF-14`'s entrance -- the one that adds a row under this one. */
const ADD_CHILD_ROW = entranceFor('HF-14')

/** The px figure one row of a settings table prints in its 既定 column. */
const px = (table: string, id: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(rowOf(table, id).by['既定'] ?? '')
  if (found === null) throw new Error(`${id} states no number in its 既定 column`)
  return Number(found[0])
}

/** S-125 -- `maxGroupDepth`, the cap `FR-085` states and 表 T-211 carries. */
const MAX_GROUP_DEPTH = ((): number => {
  const value = SETTINGS_DEFAULTS['maxGroupDepth']
  if (typeof value !== 'number') throw new Error('SETTINGS_DEFAULTS.maxGroupDepth is not a number')
  return value
})()

/**
 * S-87 -- `groupLevelOfDetailBase`, the group-LOD threshold's initial term.
 *
 * ⭐ `threshold(d) = base × ratio^(d − 2)` (表 T-205's own row for `S-87`), so a
 * `zoomY` set to exactly this value clears depth 2 but not depth 3 -- the same
 * fact tests/unit/layout-engine.test.ts's own case already exercises
 * (`groupDepthLimit(settingsOf({ ...LAYOUT_SETTINGS, zoomY: 0.32 })) === 2`).
 * ⛔ Read from the manuscript, never typed as `0.32`.
 */
const GROUP_LOD_BASE = px('T-205', 'S-87')

// ===========================================================================
// A tiny document fixture: a chain of `TaskGroup`s, some folded, some not.
// ===========================================================================

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

/** A `TaskGroup.id` -- AT-51 types the column as a UUID. */
const uuidOf = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

interface GroupSpec {
  readonly id: string
  readonly parentId: string | null
  readonly label: string
  readonly isCollapsed: boolean
}

/** A document holding exactly the `TaskGroup`s given, at the stated `zoomY`. */
function documentWith(groups: readonly GroupSpec[], zoomY: number): Document {
  const template = structuredClone(TEMPLATE) as any
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [],
      resources: [],
      assignments: [],
      taskGroups: groups.map((one, index) => ({
        id: one.id,
        parentId: one.parentId,
        label: one.label,
        derivedFromTaskUid: null,
        order: index,
        isCollapsed: one.isCollapsed,
        isHidden: false,
        color: null,
        height: null,
      })),
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: { ...structuredClone(template.documentSettings), zoomY },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

/** All `TaskGroup`s a document holds, as the loose shape this file reads. */
const taskGroupsOf = (
  document: Document,
): readonly { id: string; parentId: string | null; isCollapsed: boolean }[] =>
  (document.schedule as any).taskGroups

/** One `TaskGroup`, found by id. */
function groupIn(document: Document, id: string): { id: string; parentId: string | null; isCollapsed: boolean } {
  const found = taskGroupsOf(document).find((one) => one.id === id)
  if (found === undefined) throw new Error(`the document holds no TaskGroup ${id}`)
  return found
}

/**
 * The one `TaskGroup` present after a press that was absent before it.
 *
 * ⭐ MEASURED AS A DIFFERENCE, matching 表 T-051's own methodology right below
 * `HF-18`: 「数えるのは配下の行の数ではなく、その操作の前後で描かれる行の差であ
 * る。」 The id a freshly raised row gets is the system's to choose, not this
 * file's, so it is never guessed -- only found.
 */
function raisedRowId(before: Document, after: Document): string {
  const beforeIds = new Set(taskGroupsOf(before).map((one) => one.id))
  const added = taskGroupsOf(after).filter((one) => !beforeIds.has(one.id))
  if (added.length !== 1) {
    throw new Error(`the press raised ${added.length} rows, expected exactly one`)
  }
  const only = added[0]
  if (only === undefined) throw new Error('unreachable')
  return only.id
}

// ===========================================================================
// The host UF-48 is given -- copied from
// tests/unit/t-051-hf-14-the-depth-cap-refuses-a-row.test.ts, which drives the
// same unit through the same seam.
// ===========================================================================

const ROW_CONTROLS_TALL = (px('T-206', 'S-138') + px('T-206', 'S-141') * 2) * 2

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
  rowControlsHeightPx: ROW_CONTROLS_TALL,
}

const realRaf = (globalThis as any).requestAnimationFrame

/**
 * ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest runs under
 * node with no `requestAnimationFrame`, and LY-5 of 表 T-060 puts the browser
 * in this layer. ⛔ Nothing in this fake decides anything about a telling.
 */
function host(): { readonly surface: { showSvg(svg: string): void }; runAnimationFrames: () => void } {
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
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
  }
}

interface ScreenPane {
  readonly wiring: ScreenWiring
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
}

function screenPane(language: DisplayLanguage): ScreenPane {
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
  /** Aim one entrance of one row and press it -- CS-2 freezes the aim at the press. */
  press(entry: string, groupId: string): void
  /** The title drawn for a row, or `undefined` if the panel draws no such row. */
  titleFor(groupId: string): RowTitle | undefined
}

function stage(document: Document, language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
  const screen = screenPane(language)
  const loop = frameLoop(pen.surface, document, SCREEN, screen.wiring)
  pen.runAnimationFrames()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  return {
    loop,
    screen,
    send,
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
      // IN-1 settles a pointer operation on release, so a press is down then up.
      send(pointer('down', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      send(pointer('up', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      screen.drawAt(null)
    },
    titleFor: (groupId) => {
      const panel = screen.last().rowTitlePanel
      return [...panel.pinnedTitles, ...panel.titles].find((one) => one.groupId === groupId)
    },
  }
}

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    expect(ROW_TITLE_PANEL).toBe('Row Title Panel')
    expect(ADD_CHILD_ROW).toBe('IC-91')
    expect(MAX_GROUP_DEPTH, 'the fixtures below assume room for at least 3 levels').toBeGreaterThanOrEqual(3)
    expect(GROUP_LOD_BASE).toBeGreaterThan(0)
  })

  it('⛔⛔ HF-14 half 1 still requires opening the detail tier, not just sending position', () => {
    expect(says('T-051', 'HF-14')).toContain(
      '立てた行が、現に描かれている詳しさの段（`FR-018`）で落ちる深さになるときは、その行が描かれるまで詳しさの段を開くこと（MUST）',
    )
    expect(says('T-051', 'HF-14')).toContain('表示位置を送るだけで済ませてはならない（MUST NOT）')
    expect(says('T-051', 'HF-14')).toContain(
      'これは `HF-17` の「行が見える位置まで送ること（MUST）」と同じ 1 つの約束である',
    )
    expect(says('T-051', 'HF-14')).toContain('送っても、詳しさが落とした行は現れない')
  })

  it('⛔⛔ HF-14 half 2 still opens only the one parent that was pressed', () => {
    expect(says('T-051', 'HF-14')).toContain(
      '立てた行が、人が畳んだ親の下に入るときは、その親を開くこと（MUST）',
    )
    expect(says('T-051', 'HF-14')).toContain(
      '開いてよいのは押した親 1 つだけである。その先祖まで開いてはならない（MUST NOT）',
    )
  })

  it('⭐ HF-14 states the two halves as one promise, and scopes it against HF-7', () => {
    expect(says('T-051', 'HF-14')).toContain('上の詳しさの段と合わせて、約束は 1 つである')
    expect(says('T-051', 'HF-14')).toContain('立てた行は見える')
    expect(says('T-051', 'HF-14')).toContain(
      '`HF-7` の畳みは人が自分でしたことなので、製品が動かすのはこの 1 つの場合に限る',
    )
    // 表 T-051's own HF-7, which HF-14 names as the rule it is allowed past.
    expect(says('T-051', 'HF-7')).toContain('人が畳んだ状態は、表示量の増減（`FR-018`）より優先する')
  })

  it('⭐ FR-018 still gives the group-LOD formula this file computes its zoomY from', () => {
    expect(says('T-205', 'S-87')).toContain('threshold(d) = base × ratio^(d − 2)')
    // The worked value this file reuses, already exercised by
    // tests/unit/layout-engine.test.ts: zoomY at exactly S-87's default clears
    // depth 2 and misses depth 3.
    // TEMPLATE is Record<string, unknown>, so the settings object has to be
    // narrowed before it can be spread.
    const stored = TEMPLATE['documentSettings'] as Record<string, unknown>
    const settings = { ...stored, zoomY: GROUP_LOD_BASE } as unknown as DocumentSettings
    expect(groupDepthLimit(settings)).toBe(2)
  })

  it('⛔ written down, not asserted: HR-1a makes a literal collapsed ANCESTOR unreachable here', () => {
    // HF-14 half 2's MUST NOT names 「その先祖」(the pressed parent's own
    // ancestors). For a row to be pressable in this fixture it must be DRAWN,
    // and 表 T-015's `HR-1a` (MUST NOT) hides a collapsed group's entire
    // subtree, not just its direct children:
    expect(says('T-015', 'HR-1a')).toContain(
      '畳んだ `TaskGroup` の配下の行と、その行に載っている `Task` を描いてはならない（MUST NOT）',
    )
    // ⛔ So a row with a COLLAPSED ancestor is never drawn, and can never be
    // the row this file presses `IC-91` on. The half-2 case below therefore
    // tests the closest reachable proxy for "opened only the one parent that
    // was pressed": an UNRELATED already-collapsed row elsewhere in the same
    // document is left untouched. That proxy is this file's own choice, not
    // a sentence 表 T-051 states -- flagged here rather than asserted as if
    // it were the letter of the row.
  })

  it('⛔ written down, not asserted: whether the add and the open share one undo step is unstated', () => {
    // 表 T-027: the ADD (`UN-1` / `UN-14`) and the FOLD-OPEN (`UN-14`) are both
    // counted targets; `zoomY` (`UN-8`) never is.
    expect(says('T-027', 'UN-14')).toContain(
      '行（`TaskGroup`）の追加・削除・名前の変更、行の色と高さの変更、畳みと非表示の変更、およびピン止め',
    )
    expect(says('T-027', 'UN-8')).toContain('ズーム・スクロール・パン')
    // FR-055 shows the split the codebase already uses for a gesture that
    // must write both a counted change and a UN-8-excluded one in the same
    // call -- the precedent this file's header comment reasons from:
    expect(REQUIREMENTS).toContain(
      '全体表示の 1 回の押下は、2 つの書き込みに分けて行うこと（MUST）。順序を入れ替えてはならない（MUST NOT）',
    )
    // ⛔ 表 T-051's HF-14 itself states no such split for the row it raises,
    // and no other row was found stating it either -- so nothing below
    // asserts an undo step count for either half of HF-14.
  })
})

// ===========================================================================
// HALF 1 (MUST): the drawn detail tier (`FR-018`) widens until the raised row
// is drawn. ⛔ (MUST NOT): sending display position is not enough on its own
// -- which this file reads as: the row is not visible merely because it was
// scrolled to, but because the tier that decides WHETHER it is computed at
// all now reaches its depth. `groupDepthLimit` is exactly that computed
// reach (表 T-064's `PI-5`), so it is asked directly rather than inferred
// from a scroll position this file never sets.
// ===========================================================================

describe('表 T-051 HF-14 half 1 (詳しさの段, MUST): the tier widens until the raised row is drawn', () => {
  it('⛔⛔ a child raised past the currently-drawn tier is drawn, and the tier now reaches its depth', () => {
    // ⭐ Two levels, neither collapsed, so the ONLY obstacle in this case is
    // FR-018's group LOD: depth 1 root, depth 2 pressed row.
    const root = uuidOf(1)
    const pressed = uuidOf(2)
    const before = documentWith(
      [
        { id: root, parentId: null, label: 'depth 1', isCollapsed: false },
        { id: pressed, parentId: root, label: 'depth 2', isCollapsed: false },
      ],
      GROUP_LOD_BASE, // exactly S-87 -- clears depth 2, misses depth 3.
    )

    // ⛔ THE CONTROL THAT MAKES THIS A TEST: without HF-14, a depth-3 child of
    // `pressed` would not clear this tier, and the case below would be
    // asserting nothing.
    expect(groupDepthLimit(before.documentSettings), 'the fixture must start below depth 3').toBe(2)

    const built = stage(before)
    // Sanity: the row being pressed is itself inside the tier -- a real
    // person could see and press it.
    expect(built.titleFor(pressed), 'the pressed row itself must be drawn to be pressed').not.toBeUndefined()

    built.press(ADD_CHILD_ROW, pressed)

    const after = built.loop.document()
    const raised = raisedRowId(before, after)
    expect(groupIn(after, raised).parentId, 'the raised row is a depth-3 child of the pressed row').toBe(
      pressed,
    )

    // ⭐⭐ THE MUST: the detail tier now reaches the raised row's own depth.
    expect(
      groupDepthLimit(after.documentSettings),
      'HF-14 (MUST): the detail tier must open until depth 3 is drawn',
    ).toBeGreaterThanOrEqual(3)

    // ⭐⭐ THE PROMISE ITSELF: 「立てた行は見える」-- the raised row is actually
    // drawn in the panel, not merely reachable by some other means.
    expect(
      built.titleFor(raised),
      'HF-14 (MUST): the raised row must be drawn once the tier opens for it',
    ).not.toBeUndefined()
  })

  it('control: a child raised INSIDE the already-drawn tier needs no widening to be visible', () => {
    // ⚠️ WITHOUT THIS, A UNIT THAT NEVER DREW A ROW COULD NOT BE TOLD APART
    // FROM ONE THAT ALWAYS WIDENS THE TIER REGARDLESS OF NEED. Here the root
    // (depth 1) is pressed, so the raised child lands at depth 2 -- already
    // inside the same `GROUP_LOD_BASE` tier that excluded depth 3 above.
    const root = uuidOf(3)
    const before = documentWith(
      [{ id: root, parentId: null, label: 'depth 1', isCollapsed: false }],
      GROUP_LOD_BASE,
    )
    expect(groupDepthLimit(before.documentSettings)).toBe(2)

    const built = stage(before)
    built.press(ADD_CHILD_ROW, root)

    const after = built.loop.document()
    const raised = raisedRowId(before, after)
    expect(groupIn(after, raised).parentId).toBe(root)
    expect(built.titleFor(raised), 'a row already inside the tier is drawn').not.toBeUndefined()
  })
})

// ===========================================================================
// HALF 2 (MUST): a raised row that lands under a HUMAN-collapsed parent opens
// that one parent. (MUST NOT): opening reaches no further than the one
// parent that was pressed.
//
// ⛔ THE LITERAL "ANCESTOR" CANNOT BE BUILT HERE, AND THIS IS WRITTEN DOWN
// RATHER THAN GLOSSED OVER: for `pressed` to be drawn at all (so `IC-91` can
// be aimed at it, matching every other case in this file and in
// tests/unit/t-051-hf-14-the-depth-cap-refuses-a-row.test.ts), none of
// `pressed`'s own ancestors may be collapsed -- 表 T-015's `HR-1a` (MUST NOT)
// hides a collapsed group's ENTIRE subtree, not just its direct children, so
// a collapsed ancestor would make `pressed` itself undrawable and unpressable
// by the same rule this case is trying to test. ⭐ What CAN be built, and is
// built below, is the closest reachable proxy the manuscript allows: an
// UNRELATED row elsewhere in the same document that a human already
// collapsed, sitting outside the path from the root to `pressed`, which this
// case requires to be left exactly as it was. A unit that "opened everything"
// or "opened every collapsed row on the way down from the root" would raise
// the pressed row's child fine, and would still fail THIS assertion --
// which is the whole reason it is the proxy used, rather than a weaker one
// that only reads `pressed` itself.
// ===========================================================================

describe('表 T-051 HF-14 half 2 (畳み, MUST / MUST NOT): only the one pressed parent opens', () => {
  it('⛔⛔ the pressed, human-collapsed parent opens, and an unrelated collapsed row elsewhere does not', () => {
    const root = uuidOf(4)
    const pressed = uuidOf(5)
    const elsewhere = uuidOf(6)
    const before = documentWith(
      [
        { id: root, parentId: null, label: 'root', isCollapsed: false },
        // 表 T-015 HR-4/HR-6 language: a human folded this row already.
        { id: pressed, parentId: root, label: 'pressed, folded by a person', isCollapsed: true },
        // An unrelated sibling branch, also folded by a person, untouched by
        // anything this case does to `pressed`.
        { id: elsewhere, parentId: root, label: 'elsewhere, also folded', isCollapsed: true },
      ],
      SETTINGS_DEFAULTS['zoomY'] as number, // default zoomY: no LOD obstacle in this half.
    )
    expect(groupDepthLimit(before.documentSettings), 'depth 3 must clear the tier in this half').toBeGreaterThanOrEqual(
      3,
    )
    expect(groupIn(before, pressed).isCollapsed, 'fixture sanity: the pressed row starts folded').toBe(true)
    expect(groupIn(before, elsewhere).isCollapsed, 'fixture sanity: the other row starts folded too').toBe(
      true,
    )

    const built = stage(before)
    // The folded row is still drawn -- HR-4 (MUST NOT) forbids hiding the row
    // itself, only what is under it -- so it can be pressed at all.
    expect(built.titleFor(pressed), 'a folded row is still drawn; only its children are hidden').not.toBeUndefined()

    built.press(ADD_CHILD_ROW, pressed)

    const after = built.loop.document()
    const raised = raisedRowId(before, after)
    expect(groupIn(after, raised).parentId).toBe(pressed)

    // ⭐⭐ THE MUST: the one pressed parent opened.
    expect(groupIn(after, pressed).isCollapsed, 'HF-14 (MUST): the pressed parent must open').toBe(false)
    // ⭐⭐ THE MUST NOT: nothing else did.
    expect(
      groupIn(after, elsewhere).isCollapsed,
      'HF-14 (MUST NOT): opening reaches no further than the pressed parent',
    ).toBe(true)
    expect(groupIn(after, root).isCollapsed, 'the untouched root stays exactly as it was').toBe(false)

    // ⭐⭐ THE PROMISE ITSELF: the raised row is drawn now that its one parent opened.
    expect(built.titleFor(raised), 'HF-14 (MUST): the raised row must be drawn once its parent opens').not.toBeUndefined()
    // And the unrelated folded row's own (nonexistent) children remain exactly
    // as unaffected as `elsewhere` itself -- nothing there was raised or moved.
    expect(taskGroupsOf(after).map((one) => one.id).sort()).toEqual(
      [...taskGroupsOf(before).map((one) => one.id), raised].sort(),
    )
  })
})

// ===========================================================================
// BOTH HALVES AT ONCE: 表 T-051's own words -- 「上の詳しさの段と合わせて、約束は
// 1 つである —— 立てた行は見える。」 A row raised under a parent that is BOTH
// past the drawn tier's depth AND folded by a person must still end up drawn,
// which requires BOTH interventions to have happened.
// ===========================================================================

describe('表 T-051 HF-14: 約束は 1 つ -- both obstacles together still end with the row visible', () => {
  it('⛔⛔ a child raised under a folded parent past the tier opens the parent AND widens the tier', () => {
    const root = uuidOf(7)
    const pressed = uuidOf(8)
    const before = documentWith(
      [
        { id: root, parentId: null, label: 'root', isCollapsed: false },
        { id: pressed, parentId: root, label: 'pressed, folded AND past the tier', isCollapsed: true },
      ],
      GROUP_LOD_BASE, // depth 2 clears, depth 3 (the new child) would not.
    )
    expect(groupDepthLimit(before.documentSettings)).toBe(2)
    expect(groupIn(before, pressed).isCollapsed).toBe(true)

    const built = stage(before)
    expect(built.titleFor(pressed), 'the pressed row is inside the tier, so it can be pressed').not.toBeUndefined()

    built.press(ADD_CHILD_ROW, pressed)

    const after = built.loop.document()
    const raised = raisedRowId(before, after)
    expect(groupIn(after, raised).parentId).toBe(pressed)

    expect(groupIn(after, pressed).isCollapsed, 'half 2: the folded parent opened').toBe(false)
    expect(groupDepthLimit(after.documentSettings), 'half 1: the tier widened to depth 3').toBeGreaterThanOrEqual(
      3,
    )
    expect(built.titleFor(raised), '立てた行は見える -- both obstacles resolved, the row is drawn').not.toBeUndefined()
  })
})

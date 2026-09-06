// 表 T-023b の締めの段落 (docs/spec/01-04-requirements.md:2312):
//
//   「**`Dual Cursor` モード（表 T-029a）に入るときも構えを外すこと（MUST）**
//    —— 同モードは作成・移動・編集を受け付けないので、構えたまま入れると何も
//    起きない構えが残る。」
//
// The unit driven is `screenStateFromInput` of UF-48 `input-command-translator`
// (component `InputCommandTranslator`, CP-18 of table T-062, published as PI-18
// of table T-064). ⭐ THAT MEMBER AND NOT ANOTHER: the clause is about what the
// arm becomes when an entrance is pressed, and `ScreenState.armed` is what
// `screenStateFromInput` answers -- `commandFromInput` plans document commands
// and the arm is not one (table T-027's UN-16 keeps it out of the document).
//
// ---------------------------------------------------------------------------
// WHERE TABLE T-218 PUTS THIS FILE
// ---------------------------------------------------------------------------
// `TS-6`, tests/unit/ -- the inside of one unit, decided by values alone
// (vitest.config.ts lists the three Vitest places). Chapter 9 does not admit
// Unit as a TEST_LEVEL, so these cases have no node in the specification.
// ⛔ NOT tests/system/: nothing here needs a browser. The clause is a function
// of two values -- what is armed, and which entrance was pressed -- and a
// Playwright case would put a build between the clause and the assertion for
// no gain.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec, AND WHAT WAS READ OF `src/` IS NAMED HERE
// ---------------------------------------------------------------------------
// (docs/development-rules/04-verification.md section 1: 読んでよいのは冒頭の
// 宣言・公開する型・署名まで.)
//
// Exported declarations read, and nothing else:
//   input-command-translator.ts  `screenStateFromInput(input, context)`,
//                                `InputContext`, `PointerPress`, and the
//                                calling convention its own doc comment states
//                                -- 「a press on an entry is read here」, from
//                                `context.pressed.on.entry`, on the RELEASE
//                                (IN-1 of table T-028)
//   screen-state.ts              `ScreenState`, `Armed`, `emptyScreenState`,
//                                `screenStateWithArmed`, `DualCursorSide`
//   input-source.ts              `PointerInput`, `InputModifiers`
//   screen-surface.ts            `ScreenPart`
// ⛔ NOT READ: `ARMED_BY_ENTRY`, `screenStateFromEntry` and every other body in
// that file. What each entrance arms is read below out of 表 T-109's own 構え
// column, never out of `src/`.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   T-023b 締め   the clause quoted at the head, and the two beside it that
//                 make the control below meaningful: 「**構えは持続すること
//                 （MUST）。**」 and 「**解除は `Esc`、または何も選んでいない
//                 ときのパレットの同じ入口の再押下とすること（MUST）**」
//   T-023b AR-1.. the six values an arm may take
//   T-029a DC-1   「入る | パレットの `Dual Cursor` の入口を押す」 -- so the
//                 press this file makes IS the entrance the clause speaks of
//   T-029a DC-4   「出る | 同じ入口の再押下、または `Esc`」 -- ⭐ THE SAME
//                 ENTRANCE IS THE WAY OUT, which is why every case below has to
//                 say which of the two a press is
//   T-109 IC-45   「`Command Palette` | カーソル | デュアルカーソルの 2 本を
//                 置く（`S-65`）| `FR-082` |」 -- the row that entrance is
//   T-023a PD-2   「`Dual Cursor` モード中 | **当たり判定を行わない。**」 -- the
//                 reason the clause gives, stated as its own row
//   FR-083 SP-1 / SP-4  what a palette press means when nothing is selected:
//                 arm it, and un-arm it on a second press. These are the
//                 CONTROL -- a build that answered `none` to every press would
//                 pass the clause and fail SP-1
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   - That IC-45 enters the mode at all. DC-1 puts 「どちらが追従中か」 in the
//     session and not in `ScreenState` (the note on `EscapeContext` says the
//     user ruled it there on 2026-08-26), so this member cannot answer it and
//     a case demanding it here would be asking the wrong unit.
//   - What DC-1 does to `dualCursor`'s two dates. That is S-65 and a document
//     value; this member answers a screen state.
//   - The Esc route of 表 T-028's IN-4. `escapeTarget` holds that ladder and
//     tests/unit/document-model.test.ts already drives it.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  emptyScreenState,
  screenStateWithArmed,
  type Armed,
  type DualCursorSide,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type { ScreenPart } from '../../src/adapter/screen-renderer/screen-surface'
import {
  screenStateFromInput,
  type InputContext,
  type InputModifiers,
  type PointerInput,
  type PointerPress,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import { specTable } from '../contract/spec-table'

// ===========================================================================
// 1. The sentence, read out of the manuscript rather than believed
// ===========================================================================

/**
 * ⚠️ Japanese literals in code. Rule 03 section 5 keeps code English and ASCII
 * and admits 日本語そのものを扱う処理 as the exception -- these strings ARE the
 * clauses, and matching them against the manuscript is what makes the cases
 * below cases about the specification rather than about this file's opinion.
 */
const THE_CLAUSE =
  'ットを押した意味は `FR-083` の `SP-1` 〜 `SP-3` が持つ。 構えの各値は排他であり、依存線を構えれば図形の構えは外れる。**`Dual Cursor` モード（表 T-029a）に入るときも構えを外すこと（MUST）'

/** The reason the same paragraph gives, which is why 「入るとき」 is not 「出るとき」. */
const THE_REASON = '同モードは作成・移動・編集を受け付けないので、構えたまま入れると何も起きない構えが残る'

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

const T_109 = specTable('T-109')

/** The entrance DC-1 names, read from 表 T-109 by what its cell says it does. */
const IC_45 = 'IC-45'

/**
 * What each palette entrance arms, taken from 表 T-109's own last column --
 * ⛔ never from `src/`. The column holds a row of 表 T-023b or `—`.
 */
const armRowOfEntry = (entry: string): string => {
  const row = T_109.rows.find((one) => one.id === entry)
  if (row === undefined) throw new Error(`table T-109 has no row ${entry}`)
  const last = row.cells[row.cells.length - 1] ?? ''
  return last.replace(/[`*\s]/g, '')
}

// ===========================================================================
// 2. The bench: one press on one entrance, and the state it answers with
// ===========================================================================

/**
 * The keys `SETTINGS_DEFAULTS` carries under dotted names, as objects.
 *
 * ⛔ INERT NUMBERS, AND NOT THE MANUSCRIPT'S. No case in this file measures a
 * height, a font or a pattern -- the layout exists only because `InputContext`
 * requires ADR-001's three values, and the member under test reads none of
 * them. The figures the manuscript actually holds are pinned by the files that
 * measure them.
 */
const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontScaleSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...NESTED, ...part }) as unknown as DocumentSettings

const ROW_ID = 'r-alfa'

const SETTINGS = settingsOf({
  scrollDate: '2026-01-01',
  scrollGroupId: ROW_ID,
  stackDirection: 'down',
})

const SCHEDULE = {
  project: {
    calendarUid: null,
    statusDate: null,
    themeHue: 214,
    title: null,
    uidHighWaterMark: 0,
    outlineBase: 1,
  },
  calendars: [],
  tasks: [],
  resources: [],
  assignments: [],
  taskGroups: [{ id: ROW_ID, parentId: null, label: 'row', order: 0, height: null }],
  taskGroupMembers: [],
  taskVisuals: [],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const REGIONS = regionsFromScreen(ENV, SETTINGS)
const LAYOUT = layoutFromSchedule(SCHEDULE, SETTINGS, REGIONS)
const GEOMETRY = geometryFromLayout(SCHEDULE, SETTINGS, LAYOUT, REGIONS, emptySelection())

const DOCUMENT = {
  schemaVersion: '2026-01-01',
  schedule: SCHEDULE,
  documentSettings: SETTINGS,
  documentStamp: {
    scheduleUpdatedUtc: '2026-01-01T00:00:00Z',
    lastEditedBy: 'test',
    settingsUpdatedUtc: '2026-01-01T00:00:00Z',
  },
  changeLog: [],
} as unknown as Document

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointerOf = (phase: PointerInput['phase']): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  // ⚠️ INERT COORDINATES. The palette is drawn OVER the schedule and
  // `ScreenRegions` holds no rectangle for it (the note on `ScreenPart.entry`
  // says so), which is exactly why `screenStateFromInput` reads the ENTRY the
  // press landed on rather than the point. No case here reads x or y.
  x: 1,
  y: 1,
  modifiers: NO_MODS,
  clickCount: 1,
})

/** U-26 of 表 T-103, spelled as that table spells it. */
const COMMAND_PALETTE = 'Command Palette'

const partOf = (entry: string): ScreenPart => ({
  part: COMMAND_PALETTE,
  entry,
  format: null,
  rowGroupId: null,
  resourceUid: null,
  dividerPanel: null,
  noticeDismissKey: null,
})

/**
 * ⚠️ `pressRow` IS INERT FOR EVERY CASE IN THIS FILE, and the reason is a rule
 * rather than convenience: 表 T-023a applies its order 「日程の描画領域だけ」
 * (MUST), and every press below lands on U-26. `PD-5` is written because the
 * type demands one of the six, and no case reads it back.
 */
const pressOn = (entry: string): PointerPress => ({
  at: pointerOf('down'),
  hit: null,
  on: partOf(entry),
  pressRow: 'PD-5',
})

const BASE: InputContext = {
  document: DOCUMENT,
  layout: LAYOUT,
  geometry: GEOMETRY,
  regions: REGIONS,
  screenState: emptyScreenState(),
  selection: emptySelection(),
  zoomStep: 3,
  zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
  zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
  pressed: null,
  isTextEntryUnsettled: false,
  isSurfaceStanding: false,
  dualCursorFollowing: null,
  today: '2026-03-01T00:00:00',
  newGroupId: 'row-minted-outside',
  newCommentBoxId: 'comment-box-minted-outside',
  newHighlightBoxId: 'highlight-box-minted-outside',
}

/**
 * One press on one entrance, settled on the RELEASE.
 *
 * ⭐ IN-1 of 表 T-028: 「ポインタ操作は押した時点で実行せず、**離した時点で
 * 確定すること。**」 -- so the happening handed in is the `up`, and the press it
 * belongs to travels in `InputContext.pressed`.
 */
const pressing = (
  entry: string,
  screenState: ScreenState,
  dualCursorFollowing: DualCursorSide | null = null,
): ScreenState =>
  screenStateFromInput(pointerOf('up'), {
    ...BASE,
    screenState,
    pressed: pressOn(entry),
    dualCursorFollowing,
  })

/** The six values of 表 T-023b, as an arm each. AR-1 is what `emptyScreenState` holds. */
const ARMS: ReadonlyArray<{ readonly row: string; readonly armed: Armed }> = [
  { row: 'AR-2', armed: { kind: 'taskShape', shapeKind: 'SH-1' } },
  { row: 'AR-3', armed: { kind: 'milestoneShape', glyph: 'IC-30' } },
  { row: 'AR-4', armed: { kind: 'dependency' } },
  { row: 'AR-5', armed: { kind: 'commentBox' } },
  { row: 'AR-6', armed: { kind: 'highlightBox' } },
]

const armedWith = (armed: Armed): ScreenState => screenStateWithArmed(emptyScreenState(), armed)

// ===========================================================================
// 3. The premises every case below stands on
// ===========================================================================

describe('D-295 -- the manuscript this file is driven by', () => {
  it("still closes table T-023b with the sentence about entering the mode", () => {
    expect(REQUIREMENTS).toContain(THE_CLAUSE)
    expect(REQUIREMENTS).toContain(THE_REASON)
  })

  it('still puts the Dual Cursor entrance on IC-45, and still arms nothing with it', () => {
    // ⭐ THE PREMISE THAT MAKES THE CLAUSE NON-TRIVIAL. If IC-45 itself armed
    // something, "entering drops the arm" would be self-contradictory. 表 T-109
    // gives it `—` in the 構え column, and the row it belongs to is FR-082.
    const row = T_109.rows.find((one) => one.id === IC_45)
    expect(row, 'table T-109 has no row IC-45').toBeDefined()
    expect(row?.cells.join(' ')).toContain('FR-082')
    expect(armRowOfEntry(IC_45)).toBe('—')
  })

  it('still names the same entrance as the way in AND the way out (DC-1 / DC-4)', () => {
    // ⭐ THE REASON THIS FILE HAS TWO HALVES. The clause says 「入るときも」, and
    // DC-4 makes the same press the exit -- so a build that simply un-armed on
    // every IC-45 press would be obeying the words and breaking DC-4's case.
    const t029a = specTable('T-029a')
    const dc1 = t029a.rows.find((one) => one.id === 'DC-1')
    const dc4 = t029a.rows.find((one) => one.id === 'DC-4')
    expect(dc1?.cells.join(' ')).toContain('パレットの `Dual Cursor` の入口を押す')
    expect(dc4?.cells.join(' ')).toContain('同じ入口の再押下')
  })

  it('still gives the arm five values other than AR-1, and this file drives all of them', () => {
    const t023b = specTable('T-023b')
    const rows = t023b.rows.map((one) => one.id)
    expect(rows).toEqual(['AR-1', 'AR-2', 'AR-3', 'AR-4', 'AR-5', 'AR-6'])
    expect(ARMS.map((one) => one.row)).toEqual(['AR-2', 'AR-3', 'AR-4', 'AR-5', 'AR-6'])
  })
})

// ===========================================================================
// 4. 「`Dual Cursor` モード（表 T-029a）に入るときも構えを外すこと（MUST）」
// ===========================================================================

describe('T-023b closing paragraph (MUST) -- entering the Dual Cursor drops the arm', () => {
  it.each(ARMS)('drops $row when IC-45 is pressed and the mode is not up', ({ armed }) => {
    const after = pressing(IC_45, armedWith(armed), null)
    expect(after.armed).toEqual({ kind: 'none' })
  })

  it('leaves the rest of the screen state alone while it drops the arm', () => {
    // ⛔ THE CLAUSE IS ABOUT THE ARM AND NOTHING ELSE. A build that answered a
    // freshly emptied state would pass the case above and quietly close an open
    // surface, put the palette back, or leave full screen.
    const before: ScreenState = {
      ...screenStateWithArmed(emptyScreenState(), { kind: 'dependency' }),
      paletteShown: false,
      fullScreen: true,
      surface: 'U-53',
    }
    const after = pressing(IC_45, before, null)
    expect(after.armed).toEqual({ kind: 'none' })
    expect({ ...after, armed: null }).toEqual({ ...before, armed: null })
  })

  it('is idempotent: pressing IC-45 with nothing armed still answers AR-1', () => {
    expect(pressing(IC_45, emptyScreenState(), null).armed).toEqual({ kind: 'none' })
  })
})

// ===========================================================================
// 5. ⭐ THE OTHER HALF: the same entrance is DC-4's way OUT
// ===========================================================================

describe('T-029a DC-4 -- going out leaves the arm alone', () => {
  it.each(ARMS)('keeps $row when IC-45 is pressed while a side is following', ({ armed }) => {
    // 「入るとき」 is what the clause says. DC-4 makes the SAME entrance the exit
    // (「同じ入口の再押下、または `Esc`」) and says nothing about the arm, so a
    // build that un-armed on the way out would be adding a rule the manuscript
    // does not carry. `dualCursorFollowing` non-null IS "in the mode": the note
    // on `EscapeContext` states the user ruled that bit into the session on
    // 2026-08-26 and that `null` there means not in the mode.
    const before = armedWith(armed)
    const after = pressing(IC_45, before, 'date1')
    expect(after.armed).toEqual(armed)
  })

  it('answers the same whichever side is following', () => {
    // ⚠️ DC-2 swaps the following side on every click, so both values are
    // reachable at the moment DC-4's press arrives.
    for (const side of ['date1', 'date2'] as const satisfies readonly DualCursorSide[]) {
      expect(pressing(IC_45, armedWith({ kind: 'commentBox' }), side).armed, side).toEqual({
        kind: 'commentBox',
      })
    }
  })
})

// ===========================================================================
// 6. ⛔ THE CONTROL. Every case above passes on a build that answers AR-1 to
//    every press, so these are the ones that must move the other way.
// ===========================================================================

describe('FR-083 SP-1 / SP-4 -- the arming entrances still arm and still un-arm', () => {
  /** The entrances 表 T-109 marks with a row of 表 T-023b, read from the table. */
  const ARMING_ENTRIES = T_109.rows
    .map((one) => one.id)
    .filter((id) => /^AR-[2-6]$/.test(armRowOfEntry(id)))

  it('drives at least one entrance per arming row of table T-023b', () => {
    // ⭐ The premise of the control itself: if 表 T-109 stopped marking any
    // entrance, the two cases below would pass over an empty list.
    // ⭐ ALL FIVE, INCLUDING AR-4. 表 T-109 marks a dependency entrance too, so
    // the control below drives every arming row of 表 T-023b and not four of
    // the five -- which is the same set `ARMS` above drives from the other side.
    const rowsCovered = new Set(ARMING_ENTRIES.map(armRowOfEntry))
    expect([...rowsCovered].sort()).toEqual(['AR-2', 'AR-3', 'AR-4', 'AR-5', 'AR-6'])
    expect([...rowsCovered].sort()).toEqual(ARMS.map((one) => one.row))
    expect(ARMING_ENTRIES.length).toBeGreaterThan(4)
  })

  it('SP-1: a press with nothing selected arms that entrance, and does NOT answer none', () => {
    for (const entry of ARMING_ENTRIES) {
      const after = pressing(entry, emptyScreenState(), null)
      expect(after.armed.kind, `${entry} (${armRowOfEntry(entry)}) armed nothing`).not.toBe('none')
    }
  })

  it('SP-4: pressing the entrance that is already armed un-arms it', () => {
    // 「解除は `Esc`、または何も選んでいないときのパレットの同じ入口の再押下と
    // すること（MUST）」 -- so the second press of the SAME entrance answers AR-1,
    // and that is a different fact from IC-45's.
    for (const entry of ARMING_ENTRIES) {
      const armed = pressing(entry, emptyScreenState(), null)
      const again = pressing(entry, armed, null)
      expect(again.armed, `${entry} did not un-arm on the second press`).toEqual({ kind: 'none' })
    }
  })

  it('the guide-cursor entrances touch the arm at neither end (FR-048)', () => {
    // ⚠️ 表 T-029a's closing note: 「`+`（十字）と `|`（縦 1 本）のガイドカーソル
    // は表示だけであり、編集を妨げない。**排他になるのは `Dual Cursor` だけで
    // ある。**」 -- so the guide-cursor entrances are the nearest neighbours of
    // IC-45 that must NOT drop the arm, and they are what stops "any cursor
    // entrance clears it" from passing.
    // ⭐ TWO, NOT FOUR, SINCE CR-369 (2026-09-06): 表 T-109 retired IC-46 (set
    // `'none'`) and IC-49 (`'double-vertical'`) with the mode itself, so the
    // pair below is the whole guide-cursor family. ⛔ THIS IS A REMOVAL OF ROWS
    // THAT NO LONGER EXIST, NOT A RELAXATION -- every entrance table T-109 still
    // gives to FR-048 is still driven, and each is still held to `—` and to an
    // untouched arm.
    // ⭐ READ, NOT TYPED: the family is every row of 表 T-109 the 正 column hands
    // to FR-048, so a retired or added mode reaches this case by itself. The
    // count guard is what stops a re-worded column from emptying the loop.
    const guideCursorEntries = T_109.rows
      .filter((one) => (one.by['正'] ?? '').replace(/[`*\s]/g, '') === 'FR-048')
      .map((one) => one.id)
    expect(guideCursorEntries, 'table T-109 hands no entrance to FR-048').toEqual([
      'IC-47',
      'IC-48',
    ])
    for (const entry of guideCursorEntries) {
      expect(armRowOfEntry(entry), `${entry} is no longer a bare cursor entrance`).toBe('—')
      const after = pressing(entry, armedWith({ kind: 'highlightBox' }), null)
      expect(after.armed, entry).toEqual({ kind: 'highlightBox' })
    }
  })
})

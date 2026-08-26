// Unit tests for the two SCROLLING rows of 表 T-023 -- `MK-1` (a bare wheel)
// and `MK-5` (`Ctrl` ＋ `Shift` ＋ wheel) -- and for the rule under 表 T-023d
// that refuses a wheel while a drag is in flight.
//
// The unit under test is UF-30 `input-command-translator.ts` (表 T-075 of
// docs/spec/05-07-design.md), component `InputCommandTranslator` (CP-18 of
// 表 T-062), published as PI-18 of 表 T-064. Chapter 9 admits no Unit level, so
// these have no node in the specification; 表 T-218 of Chapter 7 gives them
// their place: TS-6, tests/unit/.
//
// WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule
// below, the entity types the fixture is built from, and of the unit itself
// only its published types and the signature of `commandFromInput`. Every
// expected value here comes from a requirement, a table row, or the DECLARED
// MEANING OF THE ARGUMENT -- never from the translation.
//
// The rows these cases answer to (rule 03: name the row, never copy its prose):
//   T-023   MK-1 -- 「ホイール（修飾なし）」 → 「**縦スクロール**（ズームではない）」
//   T-023   MK-5 -- 「Ctrl ＋ Shift ＋ ホイール」 → 「横スクロール」
//   T-023   MK-2 / MK-3 / MK-4 -- the three zoom turns, walked only by the
//           drag case, which refuses all five together
//   T-023   MK-10 -- an assigned combination is taken from the browser (MUST)
//   FR-016  the STATEMENT that makes taking 表 T-023's assignment the
//           requirement, and the MUST NOT under 表 T-023d:
//           「ドラッグの最中はホイールによるズームとスクロールを受け付けない
//           こと（MUST NOT）」 (docs/spec/01-04-requirements.md, FR-016)
//   FR-051  「表示位置が変わったときは …… `S-77` と `S-78` が新しい表示位置を
//           指すようにすること（MUST）」
//   T-203   S-77 / S-78 -- the two anchors; S-176 / S-177 -- the two fractions
//
// TWO CASES ARE EXPECTED TO FAIL, and they are findings rather than chores
// (04-verification section 1). Search for `FINDING` below.
//
// ⛔ WHAT THE SPECIFICATION DOES NOT SAY, and is therefore NOT asserted:
//   - HOW FAR one detent scrolls. No row anywhere states it. `S-96` of
//     `_assets/tbl-settings.md` states the zoom step per notch and says why
//     the distance belongs to the device; `S-53` is that zoom step and is not
//     a scroll step. So every case below asks WHICH axis moved and WHICH WAY,
//     never how far.
//   - WHICH WAY a positive turn carries the view. No requirement fixes it.
//     The only written statement of the convention is the declaration of
//     `WheelInput.scrollPx` in the seam IF-2 -- 「positive down and right」,
//     which is what the ARGUMENT means, not what the answer should be. The two
//     sign cases below rest on that reading of the argument and say so; the
//     three axis and reversal cases do not need it at all.
//   - 表 T-031 (SC-1 … SC-6) -- which parts of the screen follow the schedule
//     and which hold still. That is a rule about what is DRAWN, and this unit
//     draws nothing: it answers a position. No case here can reach it.
//   - `UN-8` of 表 T-027 keeps a scroll out of the undo history, but 表 T-067
//     puts the step on `WS-4`, in another unit. Not reachable from here.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptyScreenState } from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type { Hit } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  NOT_STORED_ZOOM_BOUNDS,
  type DocumentCommand,
} from '../../src/use-case/edit-document/edit-document'
import {
  commandFromInput,
  type InputContext,
  type InputModifiers,
  type PointerInput,
  type TranslatedInput,
  type WheelInput,
} from '../../src/adapter/input-command-translator/input-command-translator'

// ---------------------------------------------------------------------------
// Fixed copies of the rows these cases are driven by (Chapter 1.9).
// ---------------------------------------------------------------------------

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const modsOf = (part: Partial<InputModifiers> = {}): InputModifiers => ({ ...NO_MODS, ...part })

/**
 * 表 T-023's five wheel rows, in the table's printed order.
 *
 * `carriesAModifier` is what MK-10 turns on: it takes the browser's own
 * behaviour for a combination WITH a modifier key that this tool assigned, and
 * says nothing at all about a bare turn. ⛔ So no case here asserts anything
 * about `isBrowserDefaultStopped` for MK-1.
 */
const T_023_WHEEL = [
  { row: 'MK-1', mods: NO_MODS, carriesAModifier: false },
  { row: 'MK-2', mods: modsOf({ ctrl: true }), carriesAModifier: true },
  { row: 'MK-3', mods: modsOf({ shift: true }), carriesAModifier: true },
  { row: 'MK-4', mods: modsOf({ alt: true }), carriesAModifier: true },
  { row: 'MK-5', mods: modsOf({ ctrl: true, shift: true }), carriesAModifier: true },
] as const

/** MK-5's modifiers, named once so the scrolling cases cannot drift from the walk. */
const MK_5_MODS = modsOf({ ctrl: true, shift: true })

/**
 * 表 T-203's two fractions, copied from the manuscript rows.
 *
 * ⚠️ TYPED OUT RATHER THAN READ, and unwillingly: `S-176` and `S-177` print a
 * lower bound of 0 and an upper bound of 1, and `SETTINGS_BOUNDS` carries
 * NEITHER key -- so there is nothing generated to drive this from. The upper
 * bound is exclusive because `S-176` states it is:
 * 「⚠️ **上限の 1 は含まない。1 以上になったら錠を 1 つ隣へ送る**」, and `S-177`
 * says it is the same row for the other axis
 * (docs/spec/_assets/tbl-settings.md, 表 T-203).
 */
const T_203_OFFSETS = [
  { row: 'S-176', key: 'scrollGroupOffset', min: 0, exclusiveMax: 1 },
  { row: 'S-177', key: 'scrollDayOffset', min: 0, exclusiveMax: 1 },
] as const

// ---------------------------------------------------------------------------
// The fixture. Shape copied from tests/unit/uf-30-31.test.ts, which tests the
// same unit; the schedule is taller here so that both directions of a turn
// have somewhere to go.
// ---------------------------------------------------------------------------

/** The four keys SETTINGS_DEFAULTS carries under dotted names, as objects. */
const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontScaleSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...NESTED, ...part }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

/**
 * S-53 arrives as a value (`InputContext.zoomStep`). Deliberately not the
 * figure the manuscript prints: nothing in this file reads it, and a
 * translator that re-typed the constant must not be able to hide behind it.
 */
const ZOOM_STEP = 3

const TODAY = '2026-03-01T00:00:00'

// Every nullable column has to be spelled `null`; leaving one `undefined`
// reads as "set".
const taskOf = (part: Record<string, unknown>): Task =>
  ({
    name: null,
    start: null,
    finish: null,
    milestone: null,
    percentComplete: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
    project: {
      calendarUid: null,
      statusDate: null,
      themeHue: 214,
      title: null,
      uidHighWaterMark: 10,
    },
    calendars: [],
    tasks: [],
    resources: [],
    assignments: [],
    taskGroups: [],
    taskGroupMembers: [],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
    ...part,
  }) as unknown as Schedule

const TASK_1 = taskOf({ uid: 1, name: 'one', start: '2026-01-05', finish: '2026-01-09' })
const TASK_2 = taskOf({ uid: 2, name: 'two', start: '2026-02-10', finish: '2026-02-14' })

/**
 * Enough rows that the drawn schedule is taller than the `Row Area` -- a wheel
 * over a schedule that already fits has nowhere to scroll to, and MK-1 could
 * not be told from doing nothing. The premise is asserted, never trusted.
 */
const ROW_COUNT = 40

const SCHEDULE = scheduleOf({
  tasks: [TASK_1, TASK_2],
  taskGroups: Array.from({ length: ROW_COUNT }, (_unused, index) => ({
    id: `g${index + 1}`,
    parentId: null,
    label: `row ${index + 1}`,
    order: index,
    height: null,
  })),
  taskGroupMembers: [
    { groupId: 'g1', taskUid: 1 },
    { groupId: 'g2', taskUid: 2 },
  ],
})

/**
 * The view starts in the MIDDLE of the schedule, on both axes.
 *
 * ⭐ The whole point of the fixture: a view already sitting on the first row
 * or the first day can only move one way, and a case over one of those cannot
 * tell a scroll that goes both ways from one that goes down and sticks.
 */
const START_ROW = 'g20'
const START_DATE = '2026-01-20'

const SETTINGS = settingsOf({
  scrollDate: START_DATE, // S-77
  scrollGroupId: START_ROW, // S-78
  scrollDayOffset: 0, // S-177
  scrollGroupOffset: 0, // S-176
  stackDirection: 'down', // S-58, pinned so every y reads from the top
  rulerHeight: 48,
  rulerFont: 12,
})

const documentOf = (settings: DocumentSettings): Document =>
  ({
    schemaVersion: '2026-01-01',
    schedule: SCHEDULE,
    documentSettings: settings,
    documentStamp: {
      scheduleUpdatedUtc: '2026-01-01T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedUtc: '2026-01-01T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

/**
 * A frame drawn from `settings`, the way ADR-001 has the shell draw one.
 *
 * ⚠️ Redrawn per settings rather than reused: `S-77` and `S-78` are arguments
 * to the layout, so a case that feeds an answer back in has to draw the frame
 * that answer would have produced.
 */
function frameOf(settings: DocumentSettings = SETTINGS): InputContext {
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(SCHEDULE, settings, regions)
  return {
    document: documentOf(settings),
    layout,
    geometry: geometryFromLayout(SCHEDULE, settings, layout, regions, emptySelection()),
    regions,
    screenState: emptyScreenState(),
    selection: emptySelection(),
    zoomStep: ZOOM_STEP,
    zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
    zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
    pressed: null,
    isTextEntryUnsettled: false,
    dualCursorFollowing: null,
    today: TODAY,
    newGroupId: 'row-minted-outside',
  }
}

const contextOf = (part: Partial<InputContext> = {}): InputContext => ({ ...frameOf(), ...part })

// ---------------------------------------------------------------------------
// Building the happening IF-2 supplies.
// ---------------------------------------------------------------------------

/**
 * One turn of the wheel over the `Row Area`.
 *
 * `scrollPx` is what the seam declares it to be -- how far the host would have
 * scrolled, positive down and right -- and `notches` carries the same sign.
 * ⛔ The MAGNITUDE is the caller's, never the specification's: no row turns a
 * distance into a number of rows or days.
 */
const wheelOf = (
  context: InputContext,
  px: { readonly x: number; readonly y: number },
  mods: InputModifiers = NO_MODS,
): WheelInput => ({
  kind: 'wheel',
  x: context.regions.rowArea.x + 40,
  y: context.regions.rowArea.y + 40,
  modifiers: mods,
  notches: Math.sign(px.y !== 0 ? px.y : px.x),
  scrollPx: px,
})

const pointerOf = (x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase: 'down',
  button: 'left',
  x,
  y,
  modifiers: NO_MODS,
  clickCount: 1,
})

const hitOf = (item: Hit['item'], grab: Hit['grab']): Hit => ({ item, grab })

// ---------------------------------------------------------------------------
// Reading the answer.
// ---------------------------------------------------------------------------

function commandsOf(answer: TranslatedInput): readonly DocumentCommand[] {
  const action = answer.action
  if (action === null || action.kind !== 'changeDocument') return []
  return action.writes.flat()
}

const kindsOf = (answer: TranslatedInput): readonly string[] =>
  commandsOf(answer).map((one) => one.kind)

function oneCommand(answer: TranslatedInput, kind: string): Record<string, unknown> {
  const found = commandsOf(answer).filter((one) => one.kind === kind)
  expect(found, `expected exactly one ${kind}, saw ${JSON.stringify(kindsOf(answer))}`).toHaveLength(
    1,
  )
  return found[0] as unknown as Record<string, unknown>
}

/** The position one turn answered with, or null when it asked for none. */
function positionAfter(context: InputContext, input: WheelInput): Record<string, unknown> | null {
  const written = commandsOf(commandFromInput(input, context)).filter(
    (one) => one.kind === 'setScrollPosition',
  )
  expect(written.length, 'one turn owes at most one position').toBeLessThanOrEqual(1)
  return written[0] === undefined ? null : (written[0] as unknown as Record<string, unknown>)
}

const MS_PER_DAY = 86400000
const serialOf = (text: string): number =>
  Date.UTC(Number(text.slice(0, 4)), Number(text.slice(5, 7)) - 1, Number(text.slice(8, 10))) /
  MS_PER_DAY

/**
 * How far DOWN the drawn schedule the top edge of the view stands, as the pair
 * `S-78` / `S-176` names it: the y the layout drew that row at, plus the
 * fraction of that row's own height the second value carries (`FR-080` makes
 * it a ratio and not px).
 *
 * ⭐ Read off the DRAWN row rather than off its index, so that the answer means
 * 「down」 whatever order the rows were written in.
 */
function verticalOf(context: InputContext, moved: Record<string, unknown>): number {
  const row = context.layout.rows.find((one) => one.groupId === moved['scrollGroupId'])
  expect(row, `no row ${String(moved['scrollGroupId'])} in the drawn layout`).toBeDefined()
  if (row === undefined) throw new Error('unreachable')
  return row.y + Number(moved['scrollGroupOffset']) * row.height
}

/** The same for the time axis: the pair `S-77` / `S-177`, in days. */
function horizontalOf(moved: Record<string, unknown>): number {
  const date = moved['scrollDate']
  expect(date, 'a position on the time axis must name a day (S-77)').not.toBeNull()
  return serialOf(String(date).slice(0, 10)) + Number(moved['scrollDayOffset'])
}

/** Where the view stood before any turn, read the same two ways. */
const START_VERTICAL = verticalOf(frameOf(), {
  scrollGroupId: START_ROW,
  scrollGroupOffset: 0,
})
const START_HORIZONTAL = horizontalOf({ scrollDate: START_DATE, scrollDayOffset: 0 })

/**
 * One turn, long enough to clear a row of this fixture and short enough that
 * neither end of the schedule is in reach. ⚠️ NOT a figure any table holds --
 * see the head of this file.
 */
const TURN_PX = 100

/** A shorter turn, for the time axis, so that a few days is all it asks for. */
const SHORT_TURN_PX = 30

// ---------------------------------------------------------------------------
// The fixture has to be able to show a scroll at all.
// ---------------------------------------------------------------------------

describe('the fixture leaves room to scroll in both directions', () => {
  it('draws a schedule taller than the Row Area, with the view starting inside it', () => {
    const context = frameOf()
    expect(context.layout.contentHeight).toBeGreaterThan(context.regions.rowArea.height)
    const rows = context.layout.rows
    expect(rows.length).toBe(ROW_COUNT)
    const start = rows.findIndex((one) => one.groupId === START_ROW)
    expect(start, 'the view starts on a row the layout drew').toBeGreaterThan(0)
    expect(start, 'and not on the last one').toBeLessThan(ROW_COUNT - 1)
    const pitch = rows[1]!.y - rows[0]!.y
    expect(TURN_PX, 'a turn has to clear a row to be visible at all').toBeGreaterThan(pitch)
  })
})

// ---------------------------------------------------------------------------
// 表 T-023 の MK-1 -- 「ホイール（修飾なし）」 → 「**縦スクロール**（ズームではない）」
// ---------------------------------------------------------------------------

describe('MK-1 of 表 T-023 -- a bare wheel is the vertical scroll', () => {
  it('MK-1: moves the row axis and leaves BOTH halves of the horizontal position', () => {
    // FR-016's STATEMENT makes taking 表 T-023's assignment the requirement,
    // and MK-1 assigns the bare turn to 「**縦スクロール**（ズームではない）」.
    // ⭐ A position is FOUR values, so 「leaves the horizontal alone」 is a
    // claim about `S-77` AND `S-177`: a turn that held the day and slid the
    // fraction inside it has moved the time axis just the same.
    const context = frameOf()
    const answer = commandFromInput(wheelOf(context, { x: 0, y: TURN_PX }), context)
    expect(kindsOf(answer)).toContain('setScrollPosition')
    expect(kindsOf(answer), 'MK-1 says 「ズームではない」').not.toContain('setZoom')

    const moved = oneCommand(answer, 'setScrollPosition')
    // The two spellings of one day differ, so the day is compared, not the text.
    expect(String(moved['scrollDate']).slice(0, 10), 'S-77 holds').toBe(START_DATE)
    expect(Number(moved['scrollDayOffset']), 'S-177 holds').toBe(0)
    expect(verticalOf(context, moved), 'S-78 / S-176 move').not.toBe(START_VERTICAL)
  })

  it('MK-1: the two directions of the wheel carry the view opposite ways', () => {
    // ⭐ THE HALF OF 「縦スクロール」 THAT NEEDS NO CONVENTION. Whichever way
    // the device counts its detents, a scroll is a thing that goes both ways;
    // a wheel that answered the same movement for both turns would leave the
    // rows on one side of the view unreachable by the entrance MK-1 gives them.
    const context = frameOf()
    const down = positionAfter(context, wheelOf(context, { x: 0, y: TURN_PX }))
    const up = positionAfter(context, wheelOf(context, { x: 0, y: -TURN_PX }))
    expect(down, 'a turn with room to go must answer a position').not.toBeNull()
    expect(up, 'a turn with room to go must answer a position').not.toBeNull()
    const oneWay = verticalOf(context, down!) - START_VERTICAL
    const otherWay = verticalOf(context, up!) - START_VERTICAL
    expect(oneWay * otherWay, 'the two turns must land on opposite sides').toBeLessThan(0)
  })

  it('MK-1: a positive turn carries the view DOWN the schedule', () => {
    // ⚠️ THE ONE CASE THAT LEANS ON THE ARGUMENT'S DECLARED MEANING. No
    // requirement fixes the sign; `WheelInput.scrollPx` declares itself as how
    // far the host would have scrolled, 「positive down and right」, and MK-1
    // assigns that turn to 「縦スクロール」. A view that went UP for it would
    // be scrolling against the distance it was handed.
    // ⛔ The figure the front session measured in the shipped build is NOT
    // encoded here, and neither is any distance -- only the direction.
    const context = frameOf()
    const moved = positionAfter(context, wheelOf(context, { x: 0, y: TURN_PX }))
    expect(moved).not.toBeNull()
    expect(verticalOf(context, moved!)).toBeGreaterThan(START_VERTICAL)
  })
})

// ---------------------------------------------------------------------------
// 表 T-023 の MK-5 -- 「Ctrl ＋ Shift ＋ ホイール」 → 「横スクロール」
// ---------------------------------------------------------------------------

describe('MK-5 of 表 T-023 -- Ctrl+Shift+wheel is the horizontal scroll', () => {
  it('MK-5: moves the time axis and leaves BOTH halves of the vertical position', () => {
    // ⚠️ A wheel held with the two keys down reports its turn on the VERTICAL
    // axis: the axis the DEVICE counts on is not the axis MK-5 scrolls.
    const context = frameOf()
    const answer = commandFromInput(wheelOf(context, { x: 0, y: TURN_PX }, MK_5_MODS), context)
    expect(kindsOf(answer), 'MK-5 is a scroll, not a zoom').not.toContain('setZoom')

    const moved = oneCommand(answer, 'setScrollPosition')
    expect(moved['scrollGroupId'], 'S-78 holds').toBe(START_ROW)
    expect(Number(moved['scrollGroupOffset']), 'S-176 holds').toBe(0)
    expect(horizontalOf(moved), 'S-77 / S-177 move').not.toBe(START_HORIZONTAL)
    // MK-10 (MUST): this tool assigned the combination, so it takes it.
    expect(answer.isBrowserDefaultStopped).toBe(true)
  })

  it('MK-5: the two directions of the wheel carry the view opposite ways', () => {
    // The same reading as MK-1's reversal case, on the other axis.
    const context = frameOf()
    const one = positionAfter(context, wheelOf(context, { x: 0, y: SHORT_TURN_PX }, MK_5_MODS))
    const other = positionAfter(context, wheelOf(context, { x: 0, y: -SHORT_TURN_PX }, MK_5_MODS))
    expect(one, 'a turn with room to go must answer a position').not.toBeNull()
    expect(other, 'a turn with room to go must answer a position').not.toBeNull()
    const oneWay = horizontalOf(one!) - START_HORIZONTAL
    const otherWay = horizontalOf(other!) - START_HORIZONTAL
    expect(oneWay * otherWay, 'the two turns must land on opposite sides').toBeLessThan(0)
  })

  it('MK-5: a turn reported to the RIGHT carries the view to later days', () => {
    // ⚠️ The other spelling of the same row: a tilt wheel reports the turn on
    // the horizontal axis, where `scrollPx` declares positive to be 「right」.
    // 「横スクロール」 to the right is later in time, because the time axis runs
    // that way. The sign rests on the argument's declared meaning, as MK-1's
    // sign case does; no distance is asserted.
    const context = frameOf()
    const right = positionAfter(context, wheelOf(context, { x: SHORT_TURN_PX, y: 0 }, MK_5_MODS))
    const left = positionAfter(context, wheelOf(context, { x: -SHORT_TURN_PX, y: 0 }, MK_5_MODS))
    expect(right, 'either spelling of the turn is still MK-5').not.toBeNull()
    expect(left, 'either spelling of the turn is still MK-5').not.toBeNull()
    expect(horizontalOf(right!)).toBeGreaterThan(START_HORIZONTAL)
    expect(horizontalOf(left!)).toBeLessThan(START_HORIZONTAL)
  })
})

// ---------------------------------------------------------------------------
// 表 T-203 の S-176 / S-177 -- the fractions a scrolled position carries
// ---------------------------------------------------------------------------

describe('S-176 / S-177 of 表 T-203 -- the fractions stay inside their bounds', () => {
  it('keeps both fractions at or above 0 and BELOW 1, whatever the turn', () => {
    // `S-176`: 「上限の 1 は含まない。1 以上になったら錠を 1 つ隣へ送る」 --
    // the same position written two ways is what the row exists to forbid.
    // `S-177` is that row for the other axis.
    const context = frameOf()
    const turns = [1, -1, 4, -4, TURN_PX, -TURN_PX, 7 * TURN_PX, -7 * TURN_PX]
    for (const mods of [NO_MODS, MK_5_MODS]) {
      for (const px of turns) {
        for (const spelling of [
          { x: 0, y: px },
          { x: px, y: 0 },
        ]) {
          const moved = positionAfter(context, wheelOf(context, spelling, mods))
          if (moved === null) continue
          const where = `${JSON.stringify(mods)} ${JSON.stringify(spelling)}`
          for (const bound of T_203_OFFSETS) {
            const value = Number(moved[bound.key])
            expect(value, `${bound.row} ${where}`).toBeGreaterThanOrEqual(bound.min)
            expect(value, `${bound.row} ${where}`).toBeLessThan(bound.exclusiveMax)
          }
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------
// FR-016 (MUST NOT) -- a wheel is refused while a drag is in flight
// ---------------------------------------------------------------------------

describe('FR-016 (MUST NOT) -- no wheel zoom and no wheel scroll during a drag', () => {
  /**
   * A drag of the plan bar's body in flight -- `GR-12` of 表 T-023d, which
   * `PD-3` of 表 T-023a put in charge of the press.
   *
   * `on: null` says the screen surface had drawn nothing where the press
   * landed, which is what admits 表 T-023a at all.
   */
  const dragInFlight = (context: InputContext) => ({
    at: pointerOf(context.regions.rowArea.x + 20, context.regions.rowArea.y + 20),
    hit: hitOf({ kind: 'task', taskUid: 1 }, 'GR-12'),
    on: null,
    pressRow: 'PD-3' as const,
  })

  it('refuses every one of MK-1 〜 MK-5 while a drag is in flight', () => {
    // ⭐ FINDING EXPECTED ON THE TWO SCROLLING ROWS. The rule under 表 T-023d
    // names BOTH halves --
    // 「ドラッグの最中はホイールによるズームとスクロールを受け付けないこと
    // （MUST NOT）」 (docs/spec/01-04-requirements.md, FR-016) -- so MK-1 and
    // MK-5 are refused on the same words that refuse MK-2 〜 MK-4. A build
    // that refuses only the three zoom rows keeps the view moving out from
    // under a drag that is deciding a date by where the pointer sits.
    // ⛔ If this goes red on MK-1 / MK-5, the expected value is not to be
    // relaxed: the sentence is a MUST NOT and it says 「スクロール」.
    const context = frameOf()
    const held = contextOf({ pressed: dragInFlight(context) })
    for (const wheel of T_023_WHEEL) {
      for (const spelling of [
        { x: 0, y: TURN_PX },
        { x: 0, y: -TURN_PX },
      ]) {
        const answer = commandFromInput(wheelOf(held, spelling, wheel.mods), held)
        expect(answer.action, `${wheel.row} ${JSON.stringify(spelling)}`).toBeNull()
        if (wheel.carriesAModifier) {
          // MK-10 (MUST): refused is not unassigned -- the tool still takes
          // the combination from the browser.
          expect(answer.isBrowserDefaultStopped, wheel.row).toBe(true)
        }
      }
    }
  })

  it('MK-1 / MK-5: the same turn IS a scroll once the drag has ended', () => {
    // ⭐ The other half of section 2 of 04-verification: a refusal that
    // refused everything would pass the case above without meaning anything.
    const context = frameOf()
    const scrollingRows = T_023_WHEEL.filter(
      (one) => one.row === 'MK-1' || one.row === 'MK-5',
    )
    expect(scrollingRows.length, 'the two scrolling rows of 表 T-023').toBe(2)
    for (const wheel of scrollingRows) {
      const answer = commandFromInput(wheelOf(context, { x: 0, y: TURN_PX }, wheel.mods), context)
      expect(kindsOf(answer), wheel.row).toContain('setScrollPosition')
    }
  })
})

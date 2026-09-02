// AR-5 of table T-023b: an armed comment box entrance, and the press that
// places one. The seam D-06 was open on -- a press that planned no command at
// all -- runs from `pressRowOf` / `commandFromInput` (UF-30 / UF-31,
// `InputCommandTranslator`, CP-18 of table T-062, published as PI-18 of table
// T-064) through CM-46 in `EditAnnotation` (UF-14) and out into the drawn
// picture (`schedule-geometry`, PI-6).
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1 -- the one who wrote a unit does not write its
// test). NOTHING UNDER `src/` WAS OPENED. The published names these cases call
// were taken from the specification's own seam rows (PI-6 / PI-18 of table
// T-064, PI-14's command union) and from the sibling test files that already
// call them. Every number expected below is read out of the manuscripts at run
// time through `tests/contract/spec-table.ts`; not one is typed in.
//
// THE ROWS THESE CASES REST ON
//
//   T-023b AR-5  「コメントボックス | **その位置にコメントボックスを置く**
//                （`FR-019`） | そのものへの既定操作（既存が勝つ）」
//                and its ⚠️: 「当たった対象を指す先にしてコメントボックスを置く
//                経路は持たない」
//   T-023b 結び  「構えは持続すること（MUST）」 -- so a second press owes a
//                second box, and therefore a second identifier.
//   T-023a       表題 「ポインタを押したときの判定順序」 -- THE PRESS is what
//                the order reads.
//   T-023a PD-4  「何にも当たらない かつ **図形または注記を構えている**（表
//                T-023b の AR-2 / AR-3 / AR-5 / AR-6） | 構えているものを
//                **作る**」
//   T-023a 第1分岐 「第 1 の分岐は「当たったか」であり、「構えているか」は
//                当たらなかったときにだけ効く（MUST）」
//   T-028 IN-1   「ポインタ操作は押した時点で実行せず、**離した時点で確定する
//                こと。**」 -- so the command arrives on the release, while the
//                row of table T-023a and the place it stands on are the
//                PRESS's. The two together are what the press-versus-release
//                cases below are about.
//   FR-019       「作成者がコメントボックスまたはハイライトボックスを構えて
//                置いたとき、`GRS` は、それを作り、その位置を日付と**行の識別子
//                **で持つこと。**置く手段は表 T-023b の構え（AR-5 / AR-6）と
//                する。** **行を順番で参照してはならない（MUST NOT）。**」
//   RL-18        `CommentBox` -- `TaskGroup`, 0..n - 0..1, 「留める行
//                （`anchorGroupId`）」
//   AT-110       `CommentBox.id`, 文字列（UUID）, 否, PK
//   AT-112..115  `text` / `anchorDate` / `anchorGroupId` / `bodyOffsetPx`
//   IV-1 / IV-2  of table T-220 -- the PK's uniqueness inside its array, and
//                the FK pointing at a row the same document holds.
//   CM-46        of table T-108, `createCommentBox`, 「コメントボックスを置く」
//   FR-097       「⛔ **本文が空、または `null` のときも、幅と高さのどちらも
//                表 T-215 の文字の大きさを下回ってはならない（MUST NOT）** …
//                ⚠️ **`null` を含めるのは、`CM-46` が作る箱がすべてその状態
//                だからである**」, with S-181 / S-182 of table T-201 for the
//                padding and the wrap.
//
// ⛔⛔ TWO THINGS THE SPECIFICATION DOES NOT DECIDE, AND SO HAVE NO CASE HERE.
// Both are recorded as D-193 of docs/development-records/defects.md.
//
//   1. WHAT A BOX PLACED ON GROUND BELOW THE LAST ROW ANCHORS TO. PD-4 says the
//      armed thing is made; FR-019 (MUST) and RL-18 need a row identifier; no
//      row of any table reconciles them. ⛔ FR-001's answer for a Task
//      （「指す `TaskGroup` が無いときは行を 1 つ作ってそこへ載せること
//      （MUST）」）MAY NOT BE BORROWED: the same requirement makes the created
//      Task that new row's 導出元, and a row minted for an annotation would
//      have neither a name nor one -- which AT-54 and FR-058 forbid.
//   2. WHETHER SUCH A PRESS SHOULD BE REFUSED INSTEAD, and with which reason.
//      Table T-233 holds fifteen reasons a telling can carry and none of them
//      fits 「置く先の行が無い」.
//   ⇒ EVERY CASE BELOW PRESSES ON GROUND A DRAWN ROW COVERS, which is the
//     ground the specification decides. Nothing here states either way what
//     happens off the rows.
//
// ⛔ WHAT ELSE IS NOT ASSERTED, said rather than guessed:
//   * ⛔ WHERE THE BODY SITS. AT-115's `bodyOffsetPx` is 「留めた点から本文まで
//     のずれ」 and CM-46 leaves it null; no row says where the body goes then.
//     Only the anchor and the SIZE are asked about.
//   * ⛔ THE EXACT SIZE of a box with no body. FR-097 states a FLOOR and says
//     so outright (「下限であって大きさではない」), so every size assertion
//     below is `>=`, never `===`.
//   * ⛔ THE SPELLING OF `anchorDate` BEYOND THE DAY. AT-113 is 日時 and EX-4
//     keeps an exchanged date in the form it arrived in; no row fixes what a
//     freshly minted one carries after the day. The cases compare the first ten
//     characters, which is the day and nothing more.
//   * ⛔ S-181 / S-182 AS GEOMETRY. What the padding and the wrap do to a box
//     that HAS a body is held by tests/unit/fr-097-comment-box-drawn.test.ts;
//     duplicating it here would put the same number in two places. What this
//     file asserts about them is the one thing that file cannot: that the
//     PLACED box's floor does not come from either of them.

import { describe, expect, it } from 'vitest'

import { specTable } from '../contract/spec-table'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import {
  emptyScreenState,
  screenStateWithArmed,
  type Armed,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
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
  editAnnotation,
  type AnnotationCommand,
  type DocumentCommand,
} from '../../src/use-case/edit-document/edit-document'
import {
  commandFromInput,
  pressRowOf,
  type InputContext,
  type InputModifiers,
  type PointerInput,
  type TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'

// ---------------------------------------------------------------------------
// The rows, read out of the manuscripts at run time (Chapter 1.9, :275)
// ---------------------------------------------------------------------------

const rowOf = (tableId: string, rowId: string): Readonly<Record<string, string>> => {
  const found = specTable(tableId).rows.find((row) => row.id === rowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  return found.by
}

/** Every number a cell writes, in the order it writes them. */
const numbersOf = (cell: string): number[] => (cell.match(/\d+(?:\.\d+)?/g) ?? []).map(Number)

/** The single number a cell writes, or a failure naming the cell. */
const oneNumberOf = (where: string, cell: string | undefined): number => {
  const [only, ...rest] = numbersOf(cell ?? '')
  if (only === undefined || rest.length !== 0) {
    throw new Error(`${where}: the value is not one number, it is ${cell}`)
  }
  return only
}

/** Table T-215 -- what each of FR-039's three steps is in px. */
const FONT_SIZE_OF: Readonly<Record<'S' | 'M' | 'L', number>> = {
  S: oneNumberOf('table T-215 row S-121', rowOf('T-215', 'S-121')['値']),
  M: oneNumberOf('table T-215 row S-122', rowOf('T-215', 'S-122')['値']),
  L: oneNumberOf('table T-215 row S-123', rowOf('T-215', 'S-123')['値']),
}

/** `S-181`, `commentBoxPad` -- its default and the range the manuscript admits. */
const PAD = {
  default: oneNumberOf('table T-201 row S-181 既定値', rowOf('T-201', 'S-181')['既定値']),
  min: oneNumberOf('table T-201 row S-181 下限', rowOf('T-201', 'S-181')['下限']),
  max: oneNumberOf('table T-201 row S-181 上限', rowOf('T-201', 'S-181')['上限']),
} as const

/** `S-182`, `commentBoxWrapUnits` -- the same three figures. */
const WRAP = {
  default: oneNumberOf('table T-201 row S-182 既定値', rowOf('T-201', 'S-182')['既定値']),
  min: oneNumberOf('table T-201 row S-182 下限', rowOf('T-201', 'S-182')['下限']),
  max: oneNumberOf('table T-201 row S-182 上限', rowOf('T-201', 'S-182')['上限']),
} as const

/** The key each settings row names, so a case cannot pin a key the table renamed. */
const keyOf = (tableId: string, rowId: string): string => {
  const cell = rowOf(tableId, rowId)['キー'] ?? ''
  const name = /`([^`]+)`/.exec(cell)?.[1]
  if (name === undefined) throw new Error(`table ${tableId} row ${rowId} names no key: ${cell}`)
  return name
}

const PAD_KEY = keyOf('T-201', 'S-181')
const WRAP_KEY = keyOf('T-201', 'S-182')

// ---------------------------------------------------------------------------
// The fixture. A whole DocumentSettings is 100+ keys, so a case pins the ones
// it means and everything else comes from SETTINGS_DEFAULTS, which is
// generated from the manuscript.
// ---------------------------------------------------------------------------

/** The four keys SETTINGS_DEFAULTS carries under dotted names, as objects. */
const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontScaleSizes: { L: FONT_SIZE_OF.L, M: FONT_SIZE_OF.M, S: FONT_SIZE_OF.S },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

/**
 * The rows, with identifiers that DO NOT ENCODE THEIR ORDER.
 *
 * ⭐ THIS IS THE POINT OF THE NAMES. FR-019's MUST NOT is 「行を順番で参照して
 * はならない」, and a fixture whose third row is called `g3` cannot tell an
 * identifier from an ordinal -- both read `3`. Sorted by `order`, the ids below
 * run delta, alfa, charlie, bravo, echo, foxtrot, so the row at index 2 is
 * `r-charlie` and nothing about the string says 2.
 */
const ROW_IDS = ['r-delta', 'r-alfa', 'r-charlie', 'r-bravo', 'r-echo', 'r-foxtrot'] as const

/** The row every press below lands on: index 2, and it carries no Task. */
const PRESS_ROW_ID = ROW_IDS[2]

/** The row the RELEASE of the crossing gesture lands on. Index 4, also bare. */
const RELEASE_ROW_ID = ROW_IDS[4]

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...NESTED, ...part }) as unknown as DocumentSettings

const SETTINGS = settingsOf({
  scrollDate: '2026-01-01', // S-77, so the day-to-x map has a fixed origin
  scrollGroupId: ROW_IDS[0], // S-78, so the first row is the one at the top
  stackDirection: 'down', // S-58, so every y reads from the top
  rulerHeight: 48,
  rulerFont: 12,
})

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

/**
 * S-53 arrives as a value (`InputContext.zoomStep`) because no generator brings
 * table T-201 into `src/`. Deliberately not the figure the manuscript prints --
 * no case here reads it, and a stand-in makes that plain.
 */
const ZOOM_STEP = 3

/** Today, spelled the way a date column is spelled. */
const TODAY = '2026-03-01T00:00:00'

/** The identifier the shell minted for a row FR-001 might have to make. */
const NEW_GROUP_ID = 'row-minted-outside'

/**
 * The identifier the shell minted for the box this press places.
 *
 * ⭐ MINTED OUTSIDE, not by the translator. AT-110 is 文字列（UUID）, so
 * choosing one is not a pure act; the caller hands it in the same way it hands
 * `newGroupId` for FR-001's row.
 */
const NEW_COMMENT_BOX_ID = 'comment-box-minted-outside'

// Every nullable column has to be spelled `null`; leaving one `undefined` reads
// as "set".
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

/** The one Task in the fixture, and it sits on the FIRST row, never the pressed one. */
const TASK_1: Task = taskOf({ uid: 1, name: 'one', start: '2026-01-05', finish: '2026-01-09' })

const SCHEDULE = scheduleOf({
  tasks: [TASK_1],
  taskGroups: ROW_IDS.map((id, index) => ({
    id,
    parentId: null,
    label: `row ${index + 1}`,
    order: index,
    height: null,
  })),
  taskGroupMembers: [{ groupId: ROW_IDS[0], taskUid: 1 }],
})

/** ADR-001 has the shell compute these once a frame and hand them round. */
const REGIONS = regionsFromScreen(ENV, SETTINGS)
const LAYOUT = layoutFromSchedule(SCHEDULE, SETTINGS, REGIONS)
const GEOMETRY = geometryFromLayout(SCHEDULE, SETTINGS, LAYOUT, REGIONS, emptySelection())

const documentOf = (schedule: Schedule, settings: DocumentSettings = SETTINGS): Document =>
  ({
    schemaVersion: '2026-01-01',
    schedule,
    documentSettings: settings,
    documentStamp: {
      scheduleUpdatedUtc: '2026-01-01T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedUtc: '2026-01-01T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const DOCUMENT = documentOf(SCHEDULE)

const BASE: InputContext = {
  document: DOCUMENT,
  layout: LAYOUT,
  geometry: GEOMETRY,
  regions: REGIONS,
  screenState: emptyScreenState(),
  selection: emptySelection(),
  zoomStep: ZOOM_STEP,
  zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
  zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
  pressed: null,
  isTextEntryUnsettled: false,
  // Table T-023's closing rule -- no surface stands over these cases.
  isSurfaceStanding: false,
  dualCursorFollowing: null,
  today: TODAY,
  newGroupId: NEW_GROUP_ID,
  newCommentBoxId: NEW_COMMENT_BOX_ID,
  newHighlightBoxId: 'highlight-box-minted-outside',
}

const contextOf = (part: Partial<InputContext> = {}): InputContext => ({ ...BASE, ...part })

// ---------------------------------------------------------------------------
// Building the happenings IF-2 of table T-065 supplies
// ---------------------------------------------------------------------------

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointerOf = (
  phase: PointerInput['phase'],
  x: number,
  y: number,
  part: Partial<PointerInput> = {},
): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: NO_MODS,
  clickCount: 1,
  ...part,
})

// ---------------------------------------------------------------------------
// Coordinates, read from the layout the shell built -- never guessed
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86400000
const serialOf = (text: string): number =>
  Date.UTC(Number(text.slice(0, 4)), Number(text.slice(5, 7)) - 1, Number(text.slice(8, 10))) /
  MS_PER_DAY

const ORIGIN_SERIAL = serialOf('2026-01-01')

/**
 * The MIDDLE of the column the given day is drawn in.
 *
 * ⭐ The middle and not the left edge: the edge is where two days meet, and a
 * case about WHICH day the press stands on should not turn on a rounding rule
 * no row of the specification states.
 */
const midXOfDay = (text: string): number =>
  LAYOUT.originX + (serialOf(text) - ORIGIN_SERIAL + 0.5) * LAYOUT.pxPerDay

const rowOfLayout = (groupId: string) => {
  const row = LAYOUT.rows.find((one) => one.groupId === groupId)
  if (row === undefined) throw new Error(`no row ${groupId} in the layout`)
  return row
}

const midYOfRow = (groupId: string): number => {
  const row = rowOfLayout(groupId)
  return row.y + row.height / 2
}

/** The day the press stands on, and a different day for the release. */
const PRESS_DAY = '2026-01-08'
const RELEASE_DAY = '2026-01-20'

// ---------------------------------------------------------------------------
// Reading the answers
// ---------------------------------------------------------------------------

const ARMED_COMMENT_BOX: Armed = { kind: 'commentBox' }
const ARMED_RECTANGLE: Armed = { kind: 'taskShape', shapeKind: 'rectangle' }

const armedWith = (armed: Armed): ScreenState => screenStateWithArmed(emptyScreenState(), armed)

/** A `Hit` naming the first Task's plan bar -- GR-12 of table T-023d. */
const TASK_1_HIT = { item: { kind: 'task', taskUid: 1 }, grab: 'GR-12' } as unknown as Hit

/**
 * IN-1 settles a pointer operation on release, so a gesture is a press and then
 * a release read against it. PI-18 answers which row of table T-023a the press
 * began on, and the caller puts it on the press -- the same order the shell
 * keeps at its own `collectPress`.
 */
function afterGesture(
  from: PointerInput,
  to: PointerInput,
  hit: Hit | null,
  part: Partial<InputContext> = {},
): TranslatedInput {
  const before = contextOf(part)
  const pressed = { at: from, hit, on: null, pressRow: pressRowOf({ at: from, hit }, before) }
  return commandFromInput(to, contextOf({ ...part, pressed }))
}

/** Which row of table T-023a a press resolves to, on its own. */
const pressRowFor = (from: PointerInput, hit: Hit | null, part: Partial<InputContext> = {}): string =>
  pressRowOf({ at: from, hit }, contextOf(part))

/** The writes a `changeDocument` asks for, flattened; empty when it is not one. */
function commandsOf(answer: TranslatedInput): readonly DocumentCommand[] {
  const action = answer.action
  if (action === null || action.kind !== 'changeDocument') return []
  return action.writes.flat()
}

const kindsOf = (answer: TranslatedInput): readonly string[] =>
  commandsOf(answer).map((one) => one.kind)

/** CM-46 of table T-108. */
const CM_46 = 'createCommentBox'

function oneCommand(answer: TranslatedInput, kind: string): Record<string, unknown> {
  const found = commandsOf(answer).filter((one) => one.kind === kind)
  expect(found, `expected exactly one ${kind}, saw ${JSON.stringify(kindsOf(answer))}`).toHaveLength(
    1,
  )
  return found[0] as unknown as Record<string, unknown>
}

/** The press this whole file is about: armed with AR-5, hitting nothing, on a drawn row. */
const placingGesture = (
  part: Partial<InputContext> = {},
  from = pointerOf('down', midXOfDay(PRESS_DAY), midYOfRow(PRESS_ROW_ID)),
  to = pointerOf('up', midXOfDay(PRESS_DAY), midYOfRow(PRESS_ROW_ID)),
): TranslatedInput => afterGesture(from, to, null, { screenState: armedWith(ARMED_COMMENT_BOX), ...part })

/** The anchor CM-46 carries, as `{ date, groupId }`. */
const anchorOf = (answer: TranslatedInput): Record<string, unknown> =>
  oneCommand(answer, CM_46)['anchor'] as Record<string, unknown>

/** The first ten characters of a date column -- the day, and nothing after it. */
const dayTextOf = (value: unknown): string => String(value).slice(0, 10)

// ---------------------------------------------------------------------------
// The rosters, before anything walks them. A walk over an empty roster passes
// without asserting anything, so the counts are pinned first.
// ---------------------------------------------------------------------------

describe('the rows these cases stand on', () => {
  it('表 T-023a still evaluates the press, with PD-4 between PD-3 and PD-4a', () => {
    const order = specTable('T-023a').rows.map((row) => row.id)
    expect(order).toEqual(['PD-1', 'PD-2', 'PD-3', 'PD-4', 'PD-4a', 'PD-5'])
    // 表題: 「ポインタを押したときの判定順序」 -- the press, not the release.
    expect(specTable('T-023a').caption).toContain('ポインタを押したとき')
    // PD-4's condition names AR-5 among the armings it fires for.
    expect(rowOf('T-023a', 'PD-4')['条件']).toContain('AR-5')
  })

  it('表 T-023b still has AR-5, and it points at FR-019 and lets the existing win', () => {
    const rows = specTable('T-023b').rows.map((row) => row.id)
    expect(rows).toEqual(['AR-1', 'AR-2', 'AR-3', 'AR-4', 'AR-5', 'AR-6'])
    const ar5 = rowOf('T-023b', 'AR-5')
    expect(ar5['構え']).toContain('コメントボックス')
    // 「その位置にコメントボックスを置く（`FR-019`）」
    expect(ar5['何にも当たらずにドラッグしたとき']).toContain('FR-019')
    // 「そのものへの既定操作（既存が勝つ）」
    expect(ar5['当たったとき']).toContain('既存が勝つ')
  })

  it('AT-110 makes the identifier a primary key, and RL-18 the anchor a TaskGroup', () => {
    const id = rowOf('T-058', 'AT-110')
    expect(id['エンティティ']).toContain('CommentBox')
    expect(id['列']).toContain('id')
    expect(id['鍵']).toBe('PK')
    // 否 -- AT-110 is the one column of the entity that may not be null.
    expect(id['`null`']).toBe('否')

    const anchor = rowOf('T-058', 'AT-114')
    expect(anchor['列']).toContain('anchorGroupId')
    expect(anchor['鍵']).toBe('FK')

    // 表 T-057 -- 「エンティティのあいだの関係」.
    const rl18 = rowOf('T-057', 'RL-18')
    expect(rl18['親']).toContain('CommentBox')
    expect(rl18['子']).toContain('TaskGroup')
    expect(rl18['何を表すか']).toContain('anchorGroupId')
  })

  it('carries S-181, S-182 and table T-215 from the manuscript into the defaults', () => {
    expect(PAD_KEY).toBe('commentBoxPad')
    expect(WRAP_KEY).toBe('commentBoxWrapUnits')
    expect(SETTINGS_DEFAULTS[PAD_KEY]).toBe(PAD.default)
    expect(SETTINGS_DEFAULTS[WRAP_KEY]).toBe(WRAP.default)
    expect(SETTINGS_DEFAULTS['fontScaleSizes.S']).toBe(FONT_SIZE_OF.S)
    expect(SETTINGS_DEFAULTS['fontScaleSizes.M']).toBe(FONT_SIZE_OF.M)
    expect(SETTINGS_DEFAULTS['fontScaleSizes.L']).toBe(FONT_SIZE_OF.L)
    // The bounds the sweep below runs to are real bounds, not the default twice.
    expect(PAD.min).toBeLessThan(PAD.max)
    expect(WRAP.min).toBeLessThan(WRAP.max)
  })

  it('the fixture presses on a bare row whose identifier is not its ordinal', () => {
    // FR-019's MUST NOT can only be tested where the two differ.
    expect(SCHEDULE.taskGroups[2]?.id).toBe(PRESS_ROW_ID)
    expect(PRESS_ROW_ID).not.toContain('2')
    expect(RELEASE_ROW_ID).not.toContain('4')
    expect(rowOfLayout(PRESS_ROW_ID)).not.toBe(rowOfLayout(RELEASE_ROW_ID))
    // Nothing is drawn on the pressed row, so a press there hits nothing.
    expect(SCHEDULE.taskGroupMembers.some((one) => one.groupId === PRESS_ROW_ID)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 表 T-023a PD-4 with 表 T-023b AR-5 -- the press plans CM-46
// ---------------------------------------------------------------------------

describe('PD-4 / AR-5 -- an armed comment box entrance plans a placement', () => {
  it('PD-4: a press that hit nothing while AR-5 is armed resolves to PD-4', () => {
    const row = pressRowFor(pointerOf('down', midXOfDay(PRESS_DAY), midYOfRow(PRESS_ROW_ID)), null, {
      screenState: armedWith(ARMED_COMMENT_BOX),
    })
    expect(row).toBe('PD-4')
  })

  it('PD-5: the same press with nothing armed (AR-1) is not PD-4', () => {
    const row = pressRowFor(pointerOf('down', midXOfDay(PRESS_DAY), midYOfRow(PRESS_ROW_ID)), null)
    expect(row).toBe('PD-5')
  })

  it('AR-5 (MUST): the gesture asks for exactly one CM-46 and for no Task', () => {
    const answer = placingGesture()
    expect(kindsOf(answer)).toContain(CM_46)
    expect(commandsOf(answer).filter((one) => one.kind === CM_46)).toHaveLength(1)
    // PD-4 makes 「構えているもの」 and nothing else: AR-5 is not a shape row.
    expect(kindsOf(answer)).not.toContain('createTask')
    // UN-11 keeps the arming outside the undo record, so no write touches it.
    expect(kindsOf(answer)).not.toContain('setArmed')
  })

  it('AR-5: a press and a release on the same point -- no drag -- still places one', () => {
    // 表 T-023b's column reads 「何にも当たらずにドラッグしたとき」, but a comment
    // box marks a POINT (FR-019: 「コメントボックスは点を指し」), so a press with
    // no travel is the ordinary way to place one and must not be inert.
    expect(kindsOf(placingGesture())).toContain(CM_46)
  })

  it('第 1 の分岐 (MUST): a press that HIT something plans no comment box', () => {
    // 「第 1 の分岐は「当たったか」であり、「構えているか」は当たらなかったとき
    // にだけ効く（MUST）」 -- and AR-5's own ⚠️: 「当たった対象を指す先にして
    // コメントボックスを置く経路は持たない」.
    const y = midYOfRow(SCHEDULE.taskGroupMembers[0]!.groupId)
    const answer = afterGesture(
      pointerOf('down', midXOfDay('2026-01-06'), y),
      pointerOf('up', midXOfDay('2026-01-06'), y),
      TASK_1_HIT,
      { screenState: armedWith(ARMED_COMMENT_BOX) },
    )
    expect(kindsOf(answer)).not.toContain(CM_46)
  })

  it('AR-1: with nothing armed the same gesture plans no comment box', () => {
    const answer = afterGesture(
      pointerOf('down', midXOfDay(PRESS_DAY), midYOfRow(PRESS_ROW_ID)),
      pointerOf('up', midXOfDay(PRESS_DAY), midYOfRow(PRESS_ROW_ID)),
      null,
    )
    expect(kindsOf(answer)).not.toContain(CM_46)
  })

  it('AR-2: an armed SHAPE places no comment box, so CM-46 is AR-5’s alone', () => {
    const answer = placingGesture({ screenState: armedWith(ARMED_RECTANGLE) })
    expect(kindsOf(answer)).not.toContain(CM_46)
    expect(kindsOf(answer)).toContain('createTask')
  })
})

// ---------------------------------------------------------------------------
// FR-019 and RL-18 -- the position is a date and a ROW IDENTIFIER
// ---------------------------------------------------------------------------

describe('FR-019 / RL-18 -- where the placed box is pinned', () => {
  it('FR-019 (MUST): the anchor is a date and a row identifier, and nothing else', () => {
    const anchor = anchorOf(placingGesture())
    expect(Object.keys(anchor).sort()).toEqual(['date', 'groupId'])
    expect(typeof anchor['groupId']).toBe('string')
    expect(dayTextOf(anchor['date'])).toBe(PRESS_DAY)
    expect(anchor['groupId']).toBe(PRESS_ROW_ID)
  })

  it('FR-019 (MUST NOT): the row is named by identifier, never by its ordinal', () => {
    // 「行を順番で参照してはならない（MUST NOT）」 -- 「順番で持つと並べ替えで
    // 別の行を指す」. The pressed row is at index 2 and is called `r-charlie`.
    const groupId = anchorOf(placingGesture())['groupId']
    expect(typeof groupId).toBe('string')
    expect(SCHEDULE.taskGroups.map((one) => one.id)).toContain(groupId)
    expect(SCHEDULE.taskGroups.findIndex((one) => one.id === groupId)).toBe(2)
  })

  it('T-023a / IN-1: the anchor is the PRESS’s day and row, not the release’s', () => {
    // 表 T-023a reads the PRESS (表題: 「ポインタを押したときの判定順序」); IN-1
    // only says the operation SETTLES on release. A gesture that crosses two
    // days and two rows is where the two readings part.
    const answer = placingGesture(
      {},
      pointerOf('down', midXOfDay(PRESS_DAY), midYOfRow(PRESS_ROW_ID)),
      pointerOf('up', midXOfDay(RELEASE_DAY), midYOfRow(RELEASE_ROW_ID)),
    )
    const anchor = anchorOf(answer)
    expect(dayTextOf(anchor['date'])).toBe(PRESS_DAY)
    expect(anchor['groupId']).toBe(PRESS_ROW_ID)
    // Stated as an inequality too, so the case cannot pass by both being equal.
    expect(dayTextOf(anchor['date'])).not.toBe(RELEASE_DAY)
    expect(anchor['groupId']).not.toBe(RELEASE_ROW_ID)
  })

  it('the day and the row both follow where the press stands', () => {
    for (const day of ['2026-01-08', '2026-01-15']) {
      for (const groupId of [ROW_IDS[1], ROW_IDS[3], ROW_IDS[5]]) {
        const answer = placingGesture(
          {},
          pointerOf('down', midXOfDay(day), midYOfRow(groupId)),
          pointerOf('up', midXOfDay(day), midYOfRow(groupId)),
        )
        const anchor = anchorOf(answer)
        expect(dayTextOf(anchor['date']), `${day} on ${groupId}`).toBe(day)
        expect(anchor['groupId'], `${day} on ${groupId}`).toBe(groupId)
      }
    }
  })

  it('RL-18 / IV-2: the planned anchor names a row the document actually holds', () => {
    // IV-2 of table T-220 refuses a foreign key with no row behind it, so a
    // plan that survives the aggregate is a plan whose anchor is real.
    const applied = applyPlaced(placingGesture())
    expect(applied.ok).toBe(true)
    if (!applied.ok) return
    const box = applied.document.schedule.commentBoxes[0]!
    expect(box.anchorGroupId).toBe(PRESS_ROW_ID)
    expect(dayTextOf(box.anchorDate)).toBe(PRESS_DAY)
  })
})

// ---------------------------------------------------------------------------
// AT-110 -- the identity of the thing created
// ---------------------------------------------------------------------------

/** Push the CM-46 a gesture planned through UF-14, the aggregate that owns it. */
function applyPlaced(
  answer: TranslatedInput,
  document: Document = DOCUMENT,
): ReturnType<typeof editAnnotation> {
  const create = oneCommand(answer, CM_46) as unknown as AnnotationCommand
  return editAnnotation(document, create)
}

describe('AT-110 -- what the placed box is called', () => {
  it('AT-110: the identifier is the one minted outside, and no box already holds it', () => {
    // 文字列（UUID）, so choosing one is not a pure act: the caller mints it and
    // hands it in, exactly as it hands FR-001's `newGroupId`.
    expect(oneCommand(placingGesture(), CM_46)['id']).toBe(NEW_COMMENT_BOX_ID)
    expect(SCHEDULE.commentBoxes.some((one) => one.id === NEW_COMMENT_BOX_ID)).toBe(false)
  })

  it('the identifier is read from the happening, not held inside the translator', () => {
    const other = 'comment-box-minted-outside-again'
    expect(oneCommand(placingGesture({ newCommentBoxId: other }), CM_46)['id']).toBe(other)
  })

  it('表 T-023b 結び / IV-1: a second press owes a SECOND identifier, or it is refused', () => {
    // 「構えは持続すること（MUST）」, so the entrance is still armed after the
    // first placement and the next press places another box. IV-1 of table
    // T-220 keeps a primary key unique inside its array, and AT-110 is that
    // key -- so a translator that minted one fixed id would have its second
    // box refused and nothing would be drawn.
    const first = applyPlaced(placingGesture())
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const second = applyPlaced(
      placingGesture(
        { document: first.document, newCommentBoxId: 'comment-box-minted-outside-2' },
        pointerOf('down', midXOfDay(RELEASE_DAY), midYOfRow(RELEASE_ROW_ID)),
        pointerOf('up', midXOfDay(RELEASE_DAY), midYOfRow(RELEASE_ROW_ID)),
      ),
      first.document,
    )
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.document.schedule.commentBoxes.map((one) => one.id)).toEqual([
      NEW_COMMENT_BOX_ID,
      'comment-box-minted-outside-2',
    ])

    // ⭐ And the other half: the SAME identifier twice is what IV-1 refuses.
    // This is the reason the identifier has to be fresh per press.
    const collided = applyPlaced(
      placingGesture(
        { document: first.document },
        pointerOf('down', midXOfDay(RELEASE_DAY), midYOfRow(RELEASE_ROW_ID)),
        pointerOf('up', midXOfDay(RELEASE_DAY), midYOfRow(RELEASE_ROW_ID)),
      ),
      first.document,
    )
    expect(collided.ok).toBe(false)
    if (collided.ok) return
    expect(collided.refusals[0]!.rule).toBe('IV-1')
    expect(collided.refusals[0]!.command).toBe('CM-46')
  })

  it('AT-112 / AT-111 / AT-115: CM-46 sets no body, no leader and no offset', () => {
    // FR-097's ⚠️ 「`CM-46` が作る箱がすべてその状態だからである」 -- which is
    // what makes the floor below the ordinary case and not the odd one.
    const applied = applyPlaced(placingGesture())
    expect(applied.ok).toBe(true)
    if (!applied.ok) return
    const box = applied.document.schedule.commentBoxes[0]!
    expect(box.text).toBeNull()
    expect(box.leaderShapeKind).toBeNull()
    expect(box.bodyOffsetPx).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// FR-097 -- what the placed box must be once it is drawn
// ---------------------------------------------------------------------------

/** Draw a schedule with the given settings, and answer its one comment box. */
function placedBoxDrawnWith(schedule: Schedule, over: Record<string, unknown> = {}) {
  const settings = settingsOf({
    scrollDate: '2026-01-01',
    scrollGroupId: ROW_IDS[0],
    stackDirection: 'down',
    rulerHeight: 48,
    rulerFont: 12,
    ...over,
  })
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection())
  const [only, ...rest] = geometry.commentBoxes
  if (only === undefined) throw new Error('the placed comment box was not drawn')
  if (rest.length !== 0) throw new Error('more than one comment box was drawn')
  return only
}

/** The schedule after the placing press, ready to be drawn. */
const placedSchedule = (): Schedule => {
  const applied = applyPlaced(placingGesture())
  if (!applied.ok) throw new Error('the placing press was refused by the aggregate')
  return applied.document.schedule
}

describe('FR-097 -- the placed box is drawn, and does not fall below its floor', () => {
  const SCALES = ['S', 'M', 'L'] as const

  it('the box the press placed reaches the picture at all', () => {
    // ⛔ THIS IS WHAT D-06 WAS. The press planned nothing, so nothing was
    // created and nothing was drawn -- the census of the shipped build was byte
    // for byte identical before and after.
    const schedule = placedSchedule()
    expect(schedule.commentBoxes.map((one) => one.id)).toEqual([NEW_COMMENT_BOX_ID])
    // `placedBoxDrawnWith` throws when the picture carries none, so reaching
    // the assertion is itself the half of this case that D-06 failed.
    expect(placedBoxDrawnWith(schedule).body.width).toBeGreaterThan(0)
  })

  it.each(SCALES)(
    'at fontScale %s the placed box keeps table T-215’s type size in both directions',
    (fontScale) => {
      // 「本文が空、または `null` のときも、幅と高さのどちらも 表 T-215 の文字の
      // 大きさを下回ってはならない（MUST NOT）」. ⛔ A FLOOR, not a size: the row
      // says so itself, so this is `>=` and never `===`.
      const box = placedBoxDrawnWith(placedSchedule(), { fontScale })
      expect(box.body.width).toBeGreaterThanOrEqual(FONT_SIZE_OF[fontScale])
      expect(box.body.height).toBeGreaterThanOrEqual(FONT_SIZE_OF[fontScale])
    },
  )

  it('the floor comes from table T-215, not from S-181 or S-182', () => {
    // ⛔ FR-097 forbids spelling the floor 「全角 1 文字ぶん」 outright, because
    // FR-093's 全角 turns on `labelCoef` and would make the floor move with the
    // document's settings. The same reasoning reaches the padding and the wrap:
    // neither may set it. Swept to both ends of the range table T-201 admits.
    for (const pad of [PAD.min, PAD.default, PAD.max]) {
      for (const wrapUnits of [WRAP.min, WRAP.default, WRAP.max]) {
        const box = placedBoxDrawnWith(placedSchedule(), {
          [PAD_KEY]: pad,
          [WRAP_KEY]: wrapUnits,
        })
        const where = `${PAD_KEY}=${pad}, ${WRAP_KEY}=${wrapUnits}`
        expect(box.body.width, where).toBeGreaterThanOrEqual(FONT_SIZE_OF.M)
        expect(box.body.height, where).toBeGreaterThanOrEqual(FONT_SIZE_OF.M)
      }
    }
  })
})

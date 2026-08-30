// FR-034 (MUST): 「作成者が整列を求めたとき、`GRS` は、選ばれたタスクの開始日
// または終了日を、最後に選んだタスクの日付へ揃えること。`GRS` が自動で横へ動かして
// はならない（MUST NOT）。」
//
// Unit under test: UF-30 of table T-075 (`input-command-translator.ts`,
// component `InputCommandTranslator`, CP-18 of table T-062), published as PI-18
// of table T-064. The two entrances that ask for the alignment are IC-37 and
// IC-38 of 表 T-109, both on the `Command Palette`, and both name FR-034 as
// their 正 -- so this is the side that turns a press on one of them into the
// writes of 表 T-108's `CM-11`.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⚠️ Until 2026-08-30 this entrance was measured DEAD -- 台帳 D-146 of
// docs/development-records/defects.md: two Tasks chosen, IC-37 pressed, and not
// one bar moved. These cases exist to say whether it now does what the
// manuscript says, and they were written to be indifferent to how it does it.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1)
// ---------------------------------------------------------------------------
// ⛔ THE BODY OF `input-command-translator.ts` WAS NOT READ. What was read: the
// requirements and tables named below; the entity `selection.ts` (UF-55), whose
// own head comment states which of its makers carries an order; the command
// shape `setTaskPlanDates` published by `EditDocument` (PI-9 of table T-064); and,
// for the harness alone, tests/unit/uf-30-31.test.ts -- the sibling file that
// already drives this unit. ⭐ THE HARNESS IS COPIED, THE EXPECTED VALUES ARE
// NOT: every figure asserted below comes from the fixture this file builds or
// from a table read at run time.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON (rule 03: name the row, never re-type its prose)
// ---------------------------------------------------------------------------
//   `FR-034`   the statement quoted at the head, and its MUST NOT
//   表 T-023c  `SL-7b` 「選んだ順序を保つこと（MUST）」／「範囲選択（SL-3）と
//              全選択（SL-5）は順序を作らない」ので「それだけで整列を実行させては
//              ならない（MUST NOT）」
//   表 T-109   `IC-37` 「選んだものを開始日で揃える」／`IC-38` 「選んだものを
//              終了日で揃える」 -- both 面 = `Command Palette`, both 正 = FR-034
//   表 T-108   `CM-11` `setTaskPlanDates` 「予定の開始・終了を置く」（正 `FR-012`）
//   `IV-10`    「`start` と `finish` がともに非 `null` の `Task` で、`finish` が
//              `start` より前でないこと」（docs/spec/05-07-design.md）
//   `FR-029`   「その入口を押しても、いま文書にも画面にも何も変えられないときは、
//              その入口を薄く描くこと（MUST）」／表 T-233 の `RS-34` 「揃える相手の
//              `Task` が選ばれていない」（作法 `NT-1`、正 `FR-034`）
//   `FR-031`   「文書を変えるドラッグ 1 回を 1 段にまとめること（MUST）」と
//              表 T-027 の `UN-2`（日付の変更は取り消しの対象）
//
// ---------------------------------------------------------------------------
// ⭐⭐ WHAT IS DELIBERATELY NOT ASSERTED, AND WHY
// ---------------------------------------------------------------------------
//  1. ⛔ WHAT BECOMES OF THE OTHER END OF AN ALIGNED TASK. The manuscript does
//     not decide it -- it is PD-406 of docs/development-records/
//     pending-decisions.md, 未裁定: 「`FR-034` の整列で、揃えないほうの端がどう
//     なるかをどの行も述べていない」. Every fixture below is therefore built so
//     that BOTH readings are lawful: the anchor's dates lie strictly INSIDE the
//     follower's, so neither holding the far end still nor carrying it along at
//     a constant duration can put a `finish` before a `start` (IV-10). No case
//     reads the far end's value; the one case that touches it (IV-10) only asks
//     that whatever was written is not inverted, which both readings satisfy.
//  2. ⛔ THAT THE ANCHOR IS NOT WRITTEN AT ALL. FR-034 makes 選ばれたタスク the
//     object of 揃える, and the anchor is one of them; writing it with its own
//     dates is a no-op, and no row of the manuscript forbids a no-op write.
//     What IS decided is that it does not MOVE -- 「最後に選んだタスクの日付へ」
//     is its own date -- so that is what the cases ask.
//  3. ⛔ WHAT WORDS A TELLING CARRIES. FR-038's dictionary holds them and UF-48
//     puts them on the screen; the case that pins IC-37 / IC-38 to `RS-34`'s
//     words lives beside the other nine in
//     tests/unit/fr-029-the-reason-a-press-carries.test.ts. Here the refusals
//     ask three things this unit does own: that no write leaves it, that the
//     press is not dropped in silence (FR-029's MUST), and that the situations
//     表 T-233 covers with ONE row are answered alike.
//  4. ⛔ THE SPELLING OF A DATE. `Task.start` is a text column and this file
//     does not decide its shape, so every comparison below is made on the DAY
//     the text names (`dayOf`), never on the text.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  emptyScreenState,
  screenStateWithPalette,
} from '../../src/entity/document-model/screen-state/screen-state'
import {
  emptySelection,
  selectionOfAll,
  selectionWith,
  type ItemRef,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
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
  pressRowOf,
  type InputContext,
  type InputModifiers,
  type PointerInput,
  type TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { bare, specTable } from '../contract/spec-table'

// ===========================================================================
// What the manuscript says, read at run time rather than copied
// ===========================================================================

const T_109 = specTable('T-109')
const T_108 = specTable('T-108')
const T_233 = specTable('T-233')
const T_023C = specTable('T-023c')

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

const rowOf = (table: ReturnType<typeof specTable>, id: string) => {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

/** A cell with the manuscript's emphasis taken off, so a fragment can be found in it. */
const plain = (cell: string): string => cell.replace(/\*/gu, '')

/**
 * The two entrances of 表 T-109 that name FR-034 as their 正, and which end of
 * the `Task` each one lines up.
 *
 * ⛔ READ AND NOT TYPED. 「選んだものを開始日で揃える」 and 「…終了日で揃える」 are
 * the cells that decide which end; a file that typed the pair would be a second
 * copy of that column, and a table that moved them apart would pass quietly.
 */
interface AlignEntrance {
  readonly row: string
  readonly end: 'start' | 'finish'
}

const ALIGN_ENTRANCES: readonly AlignEntrance[] = T_109.rows
  .filter((one) => bare(one.by['正'] ?? '') === 'FR-034')
  .map((one): AlignEntrance => {
    const cell = one.by['何の入口か'] ?? ''
    const start = cell.includes('開始日')
    const finish = cell.includes('終了日')
    if (start === finish) {
      throw new Error(`表 T-109 ${one.id} names neither one end nor the other: ${cell}`)
    }
    return { row: one.id, end: start ? 'start' : 'finish' }
  })

/** U-26 of 表 T-103, as 表 T-109's 面 column spells it. */
const surfaceOf = (icon: string): string => {
  const cell = bare(rowOf(T_109, icon).by['面'] ?? '')
  const first = cell.split('/')[0]?.trim() ?? ''
  if (first === '') throw new Error(`表 T-109 ${icon} names no 面`)
  return first
}

/** 表 T-108's `CM-11` -- the command a write of the plan dates has to be. */
const CM_11 = bare(rowOf(T_108, 'CM-11').by['確定名'] ?? '')

// ===========================================================================
// The document these cases drive
// ===========================================================================
//
// ⭐ THE ANCHOR LIES STRICTLY INSIDE THE FOLLOWER. That is the whole reason for
// these particular figures, and it is what makes every case below indifferent
// to PD-406 (see note 1 at the head):
//
//     FOLLOWER (uid 1)   |==========================|   02-10 .. 02-20
//     ANCHOR   (uid 2)        |==============|            02-12 .. 02-16
//
// Align on the start: 02-10 -> 02-12, and 02-12 is still before the follower's
// own finish 02-20, so holding that finish is lawful under IV-10; carrying it
// along at a constant duration puts it at 02-22, which is lawful too.
// Align on the finish: 02-20 -> 02-16, and 02-16 is still after the follower's
// own start 02-10, so both readings are lawful again.

/** The four keys SETTINGS_DEFAULTS carries under dotted names, as objects. */
const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontScaleSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const SETTINGS: DocumentSettings = {
  ...SETTINGS_DEFAULTS,
  ...NESTED,
  scrollDate: '2026-02-01', // S-77, pinned so the drawn frame is the same every run
  scrollGroupId: 'g1', // S-78
  stackDirection: 'down', // S-58
  rulerHeight: 48,
  rulerFont: 12,
} as unknown as DocumentSettings

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

const FOLLOWER_UID = 1
const ANCHOR_UID = 2

const FOLLOWER = taskOf({
  uid: FOLLOWER_UID,
  name: 'follower',
  start: '2026-02-10',
  finish: '2026-02-20',
})
const ANCHOR = taskOf({
  uid: ANCHOR_UID,
  name: 'anchor',
  start: '2026-02-12',
  finish: '2026-02-16',
})

/** A comment box, so that a case can put an SL-1 kind that is not a Task in the selection. */
const COMMENT_BOX_ID = 'c1'

const SCHEDULE: Schedule = {
  project: {
    calendarUid: null,
    statusDate: null,
    themeHue: 214,
    title: null,
    uidHighWaterMark: 10,
  },
  calendars: [],
  tasks: [FOLLOWER, ANCHOR],
  resources: [],
  assignments: [],
  taskGroups: [
    { id: 'g1', parentId: null, label: 'row 1', order: 0, height: null },
    { id: 'g2', parentId: null, label: 'row 2', order: 1, height: null },
  ],
  taskGroupMembers: [
    { groupId: 'g1', taskUid: FOLLOWER_UID },
    { groupId: 'g2', taskUid: ANCHOR_UID },
  ],
  taskVisuals: [],
  commentBoxes: [
    {
      id: COMMENT_BOX_ID,
      leaderShapeKind: null,
      text: null,
      anchorDate: '2026-02-11',
      anchorGroupId: 'g1',
      bodyOffsetPx: null,
    },
  ],
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

// ADR-001 has the shell compute these once a frame and hand them round.
const REGIONS = regionsFromScreen(ENV, SETTINGS)
const LAYOUT = layoutFromSchedule(SCHEDULE, SETTINGS, REGIONS)
const GEOMETRY = geometryFromLayout(SCHEDULE, SETTINGS, LAYOUT, REGIONS, emptySelection())

const DOCUMENT: Document = {
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

const BASE: InputContext = {
  document: DOCUMENT,
  layout: LAYOUT,
  geometry: GEOMETRY,
  regions: REGIONS,
  // FR-053 has the palette on the screen; a press on one of its entries could
  // not be answered otherwise.
  screenState: screenStateWithPalette(emptyScreenState(), true),
  selection: emptySelection(),
  zoomStep: 3,
  zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
  zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
  pressed: null,
  isTextEntryUnsettled: false,
  isSurfaceStanding: false,
  dualCursorFollowing: null,
  today: '2026-02-15T00:00:00',
  newGroupId: 'row-minted-outside',
}

const contextOf = (part: Partial<InputContext> = {}): InputContext => ({ ...BASE, ...part })

// ===========================================================================
// Spelling one press on one entry of the `Command Palette`
// ===========================================================================

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointerOf = (phase: PointerInput['phase'], x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: NO_MODS,
  clickCount: 1,
})

/** A point on the palette. The surface answered for it, so no coordinate decides. */
const PALETTE_AT = { x: 420, y: 320 }

/**
 * IN-1 settles a pointer operation on release, so a press is down then up.
 *
 * ⚠️ Chapter 5.3 states under 表 T-065 (MUST) that the side which DREW an entry
 * is the side that says where it is, so a case that wants the press to land on
 * IC-37 says so here rather than aiming at a pixel.
 */
function pressPaletteEntry(entry: string, selection: Selection): TranslatedInput {
  const down = pointerOf('down', PALETTE_AT.x, PALETTE_AT.y)
  const before = contextOf({ selection })
  const pressed = {
    at: down,
    hit: null,
    on: {
      part: surfaceOf(entry),
      entry,
      format: null,
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    },
    pressRow: pressRowOf({ at: down, hit: null }, before),
  }
  return commandFromInput(pointerOf('up', PALETTE_AT.x, PALETTE_AT.y), contextOf({ selection, pressed }))
}

/** A press that lands on nothing the screen drew -- the same gesture, no entry. */
function pressNothing(selection: Selection): TranslatedInput {
  const down = pointerOf('down', PALETTE_AT.x, PALETTE_AT.y)
  const before = contextOf({ selection })
  const pressed = {
    at: down,
    hit: null,
    on: null,
    pressRow: pressRowOf({ at: down, hit: null }, before),
  }
  return commandFromInput(pointerOf('up', PALETTE_AT.x, PALETTE_AT.y), contextOf({ selection, pressed }))
}

// ===========================================================================
// Reading the answer
// ===========================================================================

/**
 * The bundles of a `changeDocument`, or none when the press asked for no write.
 *
 * ⚠️ ONE PRESS MAY OWE MORE THAN ONE BUNDLE -- FR-031 makes the fit press write
 * twice -- so the bundles are kept apart here. A bundle is what 表 T-067's
 * `WS-4` puts one step of the history on.
 */
function bundlesOf(answer: TranslatedInput): readonly (readonly DocumentCommand[])[] {
  const action = answer.action
  if (action === null || action.kind !== 'changeDocument') return []
  return action.writes
}

const commandsOf = (answer: TranslatedInput): readonly DocumentCommand[] => bundlesOf(answer).flat()

const kindsOf = (answer: TranslatedInput): readonly string[] =>
  commandsOf(answer).map((one) => one.kind)

type PlanDates = Extract<DocumentCommand, { kind: 'setTaskPlanDates' }>

const planDatesOf = (answer: TranslatedInput): readonly PlanDates[] =>
  commandsOf(answer).filter((one): one is PlanDates => one.kind === 'setTaskPlanDates')

/**
 * The day a date column names.
 *
 * ⛔ THE COMPARISONS BELOW ARE MADE ON THIS AND NOT ON THE TEXT. `Task.start` is
 * a text column whose shape this file does not decide, so a case that compared
 * the strings would be asserting a spelling, not a date.
 */
const dayOf = (text: string): string => text.slice(0, 10)

const taskRef = (uid: number): ItemRef => ({ kind: 'task', uid })

/** Picked one at a time, so SL-7b's order exists. */
const pickedInTurn = (...items: readonly ItemRef[]): Selection =>
  items.reduce((held, one) => selectionWith(held, one), emptySelection())

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT LOST A COLUMN WOULD MAKE EVERY CASE AGREE
    // WITH ANYTHING -- rule 04 section 2.
    expect(T_109.rows.length).toBeGreaterThan(80)
    expect(T_108.rows.length).toBeGreaterThan(40)
    expect(T_233.rows.length).toBeGreaterThan(30)
    expect(T_023C.rows.length).toBeGreaterThan(8)
  })

  it('表 T-109 still gives FR-034 exactly two entrances, one per end', () => {
    expect(ALIGN_ENTRANCES.map((one) => one.row)).toEqual(['IC-37', 'IC-38'])
    expect(ALIGN_ENTRANCES.map((one) => one.end)).toEqual(['start', 'finish'])
    for (const one of ALIGN_ENTRANCES) {
      expect(surfaceOf(one.row), `${one.row} left the Command Palette`).toBe('Command Palette')
    }
  })

  it('表 T-108 still calls the write of the plan dates `CM-11` / `setTaskPlanDates`', () => {
    expect(CM_11).toBe('setTaskPlanDates')
    expect(bare(rowOf(T_108, 'CM-11').by['正'] ?? '')).toBe('FR-012')
  })

  it('表 T-233 still gives `RS-34` to the alignment, under `NT-1`', () => {
    const row = rowOf(T_233, 'RS-34')
    expect(plain(row.by['場面'] ?? '')).toContain('揃える相手の')
    expect(bare(row.by['作法'] ?? '')).toBe('NT-1')
    expect(bare(row.by['正'] ?? '')).toBe('FR-034')
  })

  it('FR-034 still says the anchor is the LAST picked, and that GRS moves nothing by itself', () => {
    // Read verbatim so that a manuscript which stops saying it fails here,
    // rather than in a case that would then be asserting a memory.
    const statement = plain(
      // The requirement's own STATEMENT line, found by the fragment no other
      // requirement carries.
      REQUIREMENTS.split('\n').find((line) => line.includes('選ばれたタスクの開始日または終了日を')) ??
        '',
    )
    expect(statement).toContain('最後に選んだタスクの日付へ')
    expect(statement).toContain('揃えること')
    expect(statement).toContain('が自動で横へ動かしてはならない（MUST NOT）')
  })

  it('`SL-7b` still keeps the order, and still forbids aligning without one', () => {
    const rule = plain(rowOf(T_023C, 'SL-7b').by['規則'] ?? '')
    expect(rule).toContain('選んだ順序を保つこと（MUST）')
    expect(rule).toContain('範囲選択（SL-3）と全選択（SL-5）は順序を作らない')
    expect(rule).toContain('それだけで整列を実行させてはならない（MUST NOT）')
  })
})

// ===========================================================================
// (a) FR-034 -- the press lines the others up on the LAST picked
// ===========================================================================

describe('FR-034 -- 選ばれたタスクの…日付を、最後に選んだタスクの日付へ揃えること（MUST）', () => {
  // One case walks both rows of 表 T-109, as Chapter 1.9 (:275) asks of a test
  // driven by a table.
  it('⭐ IC-37 / IC-38: the follower lands on the anchor, on THAT entrance\'s end', () => {
    const missed: string[] = []
    for (const one of ALIGN_ENTRANCES) {
      const answer = pressPaletteEntry(one.row, pickedInTurn(taskRef(FOLLOWER_UID), taskRef(ANCHOR_UID)))
      const written = planDatesOf(answer).filter((write) => write.uid === FOLLOWER_UID)
      if (written.length !== 1) {
        missed.push(`${one.row}: ${written.length} writes for the follower, wanted 1`)
        continue
      }
      const got = dayOf((written[0] as PlanDates)[one.end])
      const wanted = dayOf((ANCHOR as unknown as Record<string, string>)[one.end] ?? '')
      if (got !== wanted) missed.push(`${one.row}: follower.${one.end} = ${got}, wanted ${wanted}`)
    }
    expect(
      missed,
      'FR-034 (MUST): 選ばれたタスクの開始日または終了日を、最後に選んだタスクの日付へ揃えること',
    ).toEqual([])
  })

  it('⛔ the anchor does not move -- it is already on its own date', () => {
    // ⚠️ NOT 「the anchor is not written」. FR-034 makes 選ばれたタスク the object
    // of 揃える and the anchor is one of them, so a no-op write of its own dates
    // is lawful; what the requirement decides is the date it ends on.
    const moved: string[] = []
    for (const one of ALIGN_ENTRANCES) {
      const answer = pressPaletteEntry(one.row, pickedInTurn(taskRef(FOLLOWER_UID), taskRef(ANCHOR_UID)))
      for (const write of planDatesOf(answer).filter((each) => each.uid === ANCHOR_UID)) {
        if (dayOf(write.start) !== dayOf(ANCHOR.start as string)) {
          moved.push(`${one.row}: anchor.start -> ${dayOf(write.start)}`)
        }
        if (dayOf(write.finish) !== dayOf(ANCHOR.finish as string)) {
          moved.push(`${one.row}: anchor.finish -> ${dayOf(write.finish)}`)
        }
      }
    }
    expect(moved, 'FR-034: the anchor IS the date the others are lined up on').toEqual([])
  })

  it('the press asks for `CM-11` and for nothing else', () => {
    // 表 T-108 gives the plan dates one command, and 表 T-109's two rows say the
    // entrance 揃える -- it neither makes, deletes nor colours anything.
    for (const one of ALIGN_ENTRANCES) {
      const answer = pressPaletteEntry(one.row, pickedInTurn(taskRef(FOLLOWER_UID), taskRef(ANCHOR_UID)))
      expect(new Set(kindsOf(answer)), one.row).toEqual(new Set([CM_11]))
    }
  })

  it('FR-031: one press is ONE step of the history', () => {
    // 「文書を変えるドラッグ 1 回を 1 段にまとめること（MUST）」 and 表 T-027's
    // `UN-2`（日付の変更）put this press in the history exactly once. 表 T-067's
    // `WS-4` stacks one step per write, so two bundles would be two steps.
    for (const one of ALIGN_ENTRANCES) {
      const answer = pressPaletteEntry(one.row, pickedInTurn(taskRef(FOLLOWER_UID), taskRef(ANCHOR_UID)))
      expect(bundlesOf(answer).length, `${one.row} asked for more than one step`).toBe(1)
    }
  })

  it('IV-10: no write it asks for puts a `finish` before its `start`', () => {
    // 「`start` と `finish` がともに非 `null` の `Task` で、`finish` が `start`
    // より前でないこと」. ⚠️ This holds whichever way PD-406 is settled, which is
    // why the fixture puts the anchor strictly inside the follower.
    for (const one of ALIGN_ENTRANCES) {
      const answer = pressPaletteEntry(one.row, pickedInTurn(taskRef(FOLLOWER_UID), taskRef(ANCHOR_UID)))
      for (const write of planDatesOf(answer)) {
        expect(
          dayOf(write.finish) >= dayOf(write.start),
          `${one.row}: uid ${write.uid} -> ${dayOf(write.start)} .. ${dayOf(write.finish)}`,
        ).toBe(true)
      }
    }
  })

  it('only 選ばれたタスク are written -- a chosen note is left alone', () => {
    // FR-034 names タスク and nothing else; SL-1 of 表 T-023c admits four other
    // kinds into a selection. The box is picked BETWEEN the two Tasks so that
    // 最後に選んだタスク is the anchor on either reading of 「最後に」.
    for (const one of ALIGN_ENTRANCES) {
      const selection = pickedInTurn(
        taskRef(FOLLOWER_UID),
        { kind: 'commentBox', id: COMMENT_BOX_ID },
        taskRef(ANCHOR_UID),
      )
      const answer = pressPaletteEntry(one.row, selection)
      const uids = planDatesOf(answer).map((write) => write.uid)
      expect(uids, one.row).toContain(FOLLOWER_UID)
      expect(new Set(uids).size, `${one.row} wrote something that is not a chosen Task`).toBeLessThanOrEqual(2)
      expect(kindsOf(answer).every((kind) => kind === CM_11), one.row).toBe(true)
    }
  })

  it('⛔ MUST NOT: nothing is lined up unless the alignment was asked for', () => {
    // 「`GRS` が自動で横へ動かしてはならない（MUST NOT）」. The same ordered
    // selection, the same gesture, on no entry at all: no date may move.
    const answer = pressNothing(pickedInTurn(taskRef(FOLLOWER_UID), taskRef(ANCHOR_UID)))
    expect(planDatesOf(answer)).toEqual([])
  })
})

// ===========================================================================
// (b) SL-7b -- an order the person did not make is no order at all
// ===========================================================================

describe('表 T-023c `SL-7b` -- 順序を作らない選択で整列を実行させてはならない（MUST NOT）', () => {
  it('⛔ a marquee or a select-all writes nothing, on either entrance', () => {
    // `selectionOfAll` is the maker UF-55 gives SL-3 and SL-5, and its answer
    // carries `ordered === false`. ⚠️ The two Tasks ARE in it and their dates
    // differ, so a translator that read only 「how many are chosen」 would line
    // them up here -- which is the MUST NOT.
    const marquee = selectionOfAll([taskRef(FOLLOWER_UID), taskRef(ANCHOR_UID)])
    expect(marquee.ordered, 'UF-55 stopped marking a select-all as orderless').toBe(false)

    for (const one of ALIGN_ENTRANCES) {
      const answer = pressPaletteEntry(one.row, marquee)
      expect(
        kindsOf(answer),
        `${one.row}: 範囲選択（SL-3）と全選択（SL-5）は順序を作らないので、それだけで整列を実行させてはならない`,
      ).toEqual([])
    }
  })

  it('⭐ and the press is answered exactly as a press with NOTHING chosen is', () => {
    // ⛔ THIS IS HOW THIS FILE REACHES 表 T-233 WITHOUT NAMING A SPELLING. The
    // 場面 of `RS-34` -- 「揃える相手の `Task` が選ばれていない」 -- covers BOTH: an
    // empty selection designates no Task, and by `SL-7b` neither does an
    // orderless one, because 最後に選んだタスク is exactly what it does not have.
    // ⭐ One 場面 is one row (表 T-233's closing rule), so one answer.
    //
    // ⭐ THE OTHER END OF THE CHAIN IS ALREADY PINNED: the roster of
    // tests/unit/fr-029-the-reason-a-press-carries.test.ts presses IC-37 and
    // IC-38 on a document with nothing chosen and holds THAT press to the words
    // FR-038's dictionary keeps for `RS-34`. So an answer equal to it is an
    // answer carrying `RS-34`, and this file states no spelling of its own.
    const marquee = selectionOfAll([taskRef(FOLLOWER_UID), taskRef(ANCHOR_UID)])
    for (const one of ALIGN_ENTRANCES) {
      expect(
        pressPaletteEntry(one.row, marquee).action,
        `${one.row}: an orderless selection is not the empty selection's 場面`,
      ).toEqual(pressPaletteEntry(one.row, emptySelection()).action)
    }
  })
})

// ===========================================================================
// (c) RS-34's situation -- there is no `Task` to line anything up against
// ===========================================================================

describe('表 T-233 `RS-34` -- 揃える相手の `Task` が選ばれていない', () => {
  // ⚠️ WHICH WORDS REACH THE SCREEN IS NOT ASKED FOR HERE. FR-038's dictionary
  // holds them and UF-48 carries them; that join is asserted in
  // tests/unit/fr-029-the-reason-a-press-carries.test.ts. These cases ask the
  // two halves this unit owns: that no write leaves it, and that the press does
  // not simply fall through it unanswered.

  /** The three states in which FR-034 has no pair of Tasks to work on. */
  const SPENT: readonly { readonly why: string; readonly selection: Selection }[] = [
    { why: 'nothing at all is chosen', selection: emptySelection() },
    // FR-034 lines 選ばれたタスク up 「最後に選んだタスクの日付へ」: with one
    // chosen, that one Task IS the anchor and its date is already its own, so
    // 揃える相手 -- the other side of the alignment -- is not chosen.
    { why: 'one Task is chosen, and it is its own anchor', selection: pickedInTurn(taskRef(ANCHOR_UID)) },
    {
      why: 'only a note is chosen, so no Task is in the selection at all',
      selection: pickedInTurn({ kind: 'commentBox', id: COMMENT_BOX_ID }),
    },
  ]

  it('the press asks for no write in any of the three', () => {
    const wrote: string[] = []
    for (const state of SPENT) {
      for (const one of ALIGN_ENTRANCES) {
        const kinds = kindsOf(pressPaletteEntry(one.row, state.selection))
        if (kinds.length > 0) wrote.push(`${one.row} (${state.why}): ${kinds.join(', ')}`)
      }
    }
    expect(wrote, 'FR-034 has nothing to line up against').toEqual([])
  })

  it('⛔ FR-029 (MUST): the press is ANSWERED, not dropped', () => {
    // 「その入口を押しても、いま文書にも画面にも何も変えられないときは、その入口を
    // 薄く描くこと（MUST）…押されたときに限り、行えない理由を通知すること
    // （MUST）。作法は…`NT-1` に従い、運ぶ理由は、押された入口の場面に当たる…
    // 表 T-233 の行とすること（MUST）」 -- and 表 T-233's row for this 場面 is
    // `RS-34`.
    //
    // ⚠️ WHAT IS ASSERTED IS ONLY THAT THE PRESS PRODUCED AN ANSWER. A null
    // action is this unit's spelling of 「this press was not answered at all」
    // (tests/unit/uf-30-31.test.ts states it in those words), and a press that
    // neither changes anything NOR says why is the one outcome FR-029 forbids
    // outright -- 「無反応だと故障に見える」(its RATIONALE). ⛔ THE SHAPE OF THE
    // ANSWER IS NOT ASSERTED: this file does not decide how a telling is spelt.
    const silent: string[] = []
    for (const state of SPENT) {
      for (const one of ALIGN_ENTRANCES) {
        if (pressPaletteEntry(one.row, state.selection).action === null) {
          silent.push(`${one.row} (${state.why})`)
        }
      }
    }
    expect(
      silent,
      'FR-029 (MUST): 押されたときに限り、行えない理由を通知すること -- these presses changed nothing and answered nothing',
    ).toEqual([])
  })

  it('⭐ all three are one 場面, so all three are answered alike', () => {
    // 「⭐ 通知が運ぶ理由は 表 T-233 の行とすること（MUST）。同表に無い理由を運んで
    //   はならない（MUST NOT）」 and FR-029's 「当たる行があるのに落ち先を運んでは
    //   ならない（MUST NOT）」: `RS-34` is the one row whose 場面 covers all three,
    //   so all three carry it and none of them carries `RS-27`.
    //
    // ⚠️ This case and the one above have one root between them -- an answer of
    // `null` is neither equal to the others nor an answer at all.
    const first = SPENT[0] as { readonly why: string; readonly selection: Selection }
    const apart: string[] = []
    for (const one of ALIGN_ENTRANCES) {
      const wanted = pressPaletteEntry(one.row, first.selection).action
      for (const state of SPENT.slice(1)) {
        const got = pressPaletteEntry(one.row, state.selection).action
        try {
          expect(got).toEqual(wanted)
        } catch {
          apart.push(`${one.row} (${state.why}): ${JSON.stringify(got)}`)
        }
      }
    }
    expect(
      apart,
      `表 T-233: every one of these is 「揃える相手の Task が選ばれていない」, and ` +
        `wanted the same answer as 「${first.why}」`,
    ).toEqual([])
  })
})

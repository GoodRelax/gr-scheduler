// Table T-023d's closing rule -- a double click reaches MK-13's destination
// and nothing the table's ORDER would have chosen for it.
//
// The unit driven is UF-30 `input-command-translator.ts`
// (`InputCommandTranslator`, CP-18 of table T-062, published as PI-18 of table
// T-064).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- THE HOLE IT WAS WRITTEN TO STAND IN
// ---------------------------------------------------------------------------
//
// The repair of 2026-09-08 read MK-13 before the switch, and it read it on the
// release that carries `clickCount >= 2`. ⛔ A DOUBLE CLICK IS TWO RELEASES.
// The first carries `clickCount` 1, fell straight through to the switch, and
// the table's order decided a destination for it after all -- which is exactly
// what the closing rule's MUST NOT forbids.
//
// ⚠️⚠️ MEASURED ON THE SHIPPED BUILD 2026-09-10, 1920 × 1080, with FR-102's
// record (IC-76) read for the `done` line after each `in.pointer down`. One
// double click on the ダミーの印 of an unstarted Task, at the point the app
// itself answered `grab=GR-17` for:
//       up  clicks=1  ->  act=changeDocument  doc=changed
//       up  clicks=2  ->  act=editInPlace     doc=same
// The dummy count went 1 -> 0 and an actual bar 0px wide appeared where the
// mark had stood -- GR-17's arm counting a length from a drag of nothing.
// ⭐ The control was measured the same way: the same mark DRAGGED eight
// mark-widths still wrote a 48px actual, which is FR-043 working as written.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//
//   表 T-023d の結び  the two clauses quoted verbatim on their own lines below
//   表 T-023   MK-13  the 対象 list a double click has a destination for
//   表 T-023d  GR-5 / GR-6 / GR-9 / GR-12 / GR-15 / GR-17 / GR-18  those rows
//   表 T-023d  GR-3 / GR-4 / GR-7  rows MK-13 names NO destination for, which
//              therefore keep the table's order for every press -- the control
//   FR-001 / FR-019  「`S-208` を超えて動いたときをドラッグとし、超えないときを
//              クリックとすること（MUST）」, the one distance that tells the two
//              apart, and 「同じ手の動きに同じ値を使い、行の掴みと別に持たない」
//   表 T-028   IN-1  a pointer operation settles on its release

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
import {
  geometryFromLayout,
  type ScheduleGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
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
  NOT_STORED_ROW_GRAB_SIZES,
  commandFromInput,
  pressRowOf,
  type InputContext,
  type InputModifiers,
  type PointerInput,
  type TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The fixture.
// ---------------------------------------------------------------------------

const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontScaleSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const SETTINGS: DocumentSettings = ({
  ...SETTINGS_DEFAULTS,
  ...NESTED,
  scrollDate: '2026-01-01',
  scrollGroupId: 'g1',
  stackDirection: 'down',
  rulerHeight: 48,
  rulerFont: 12,
}) as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

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

/** One unstarted Task -- the state FR-043 draws the two dummies on. */
const TASK = taskOf({ uid: 1, name: 'ab', start: '2026-01-05', finish: '2026-02-05' })

/**
 * A Task that HAS an actual, for the three rows that move one.
 *
 * ⚠️ THE ENDS NEED SOMETHING TO MOVE. GR-5 / GR-6 / GR-15 write through
 * `actualEndPlacement`, which answers nothing for a Task carrying no actual --
 * so a control built on the unstarted Task alone would read 「no write」 for a
 * reason that has nothing to do with the guard it is measuring.
 */
const TASK_STARTED = taskOf({
  uid: 2,
  name: 'cd',
  start: '2026-01-05',
  finish: '2026-02-05',
  actualStart: '2026-01-05',
  actualDuration: 6,
})

const SCHEDULE = scheduleOf({
  tasks: [TASK, TASK_STARTED],
  taskGroups: [
    { id: 'g1', parentId: null, label: 'row 1', order: 0, height: null },
    { id: 'g2', parentId: null, label: 'row 2', order: 1, height: null },
  ],
  taskGroupMembers: [
    { groupId: 'g1', taskUid: 1 },
    { groupId: 'g2', taskUid: 2 },
  ],
})

const REGIONS = regionsFromScreen(ENV, SETTINGS)
const LAYOUT = layoutFromSchedule(SCHEDULE, SETTINGS, REGIONS)
const GEOMETRY: ScheduleGeometry = geometryFromLayout(
  SCHEDULE,
  SETTINGS,
  LAYOUT,
  REGIONS,
  emptySelection(),
)

const DOCUMENT: Document = ({
  schemaVersion: '2026-01-01',
  schedule: SCHEDULE,
  documentSettings: SETTINGS,
  documentStamp: {
    scheduleUpdatedUtc: '2026-01-01T00:00:00Z',
    lastEditedBy: 'test',
    settingsUpdatedUtc: '2026-01-01T00:00:00Z',
  },
  changeLog: [],
}) as unknown as Document

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

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointerOf = (
  phase: PointerInput['phase'],
  x: number,
  y: number,
  clickCount = 1,
): PointerInput => ({
  kind: 'pointer', phase, button: 'left', x, y, modifiers: NO_MODS, clickCount })

/**
 * A `Hit` naming one row of table T-023d on one of the two fixture Tasks.
 *
 * ⭐ WHICH TASK IS PART OF THE ROW. The three rows that MOVE an actual end are
 * asked about the Task that has one; every other row is asked about the
 * unstarted Task the dummies belong to.
 */
const ACTUAL_END_ROWS: readonly string[] = ['GR-5', 'GR-6', 'GR-15']

const taskHitOn = (grab: string): Hit =>
  ({
    item: { kind: 'task', taskUid: ACTUAL_END_ROWS.includes(grab) ? 2 : 1 },
    grab,
  }) as unknown as Hit

/** IN-1: a gesture is a press, and then a release read against it. */
function afterGesture(from: PointerInput, to: PointerInput, hit: Hit): TranslatedInput {
  const pressed = { at: from, hit, on: null, pressRow: pressRowOf({ at: from, hit }, BASE) }
  return commandFromInput(to, { ...BASE, pressed })
}

function commandsOf(answer: TranslatedInput): readonly DocumentCommand[] {
  const action = answer.action
  if (action === null || action.kind !== 'changeDocument') return []
  return action.writes.flat()
}

const kindsOf = (answer: TranslatedInput): readonly string[] =>
  commandsOf(answer).map((one) => one.kind)

/**
 * The point every case presses. Somewhere inside the drawing, and clear of the
 * axis's ends so `dayAtX` answers a day for both the press and every release
 * these cases make from it.
 */
const PROBE = { x: Math.round(REGIONS.rowArea.x + REGIONS.rowArea.width / 2), y: Math.round(LAYOUT.rows[0]!.y + LAYOUT.rows[0]!.height / 2) }

/** S-208, read from the generated constant rather than typed. */
const S_208 = NOT_STORED_ROW_GRAB_SIZES['S-208']

/**
 * The rows of table T-023d that MK-13 gives a double click a destination for
 * AND that carry a plain-press write.
 *
 * ⛔ GR-10 / GR-11 ARE ABSENT ON PURPOSE: the closing rule keeps a
 * double-click-only row out of a plain press entirely, so there is no
 * plain-press write of theirs for these cases to be about. 行見出し is absent
 * because its press answers `chooseRow` and writes nothing.
 */
const MK_13_ROWS = ['GR-5', 'GR-6', 'GR-9', 'GR-12', 'GR-15', 'GR-17', 'GR-18'] as const

/** Rows MK-13 names NO destination for: the table's order rules them always. */
const NOT_MK_13_ROWS = ['GR-3', 'GR-4', 'GR-7'] as const

// ---------------------------------------------------------------------------

describe('the fixture and the rosters these cases stand on', () => {
  it('names only rows table T-023d actually prints', () => {
    const printed = specTable('T-023d').rows.map((row) => row.id)
    for (const row of MK_13_ROWS) expect(printed).toContain(row)
    for (const row of NOT_MK_13_ROWS) expect(printed).toContain(row)
    // The two lists must not overlap, or the control would prove nothing.
    for (const row of NOT_MK_13_ROWS) expect(MK_13_ROWS as readonly string[]).not.toContain(row)
  })

  it('draws a schedule whose day axis answers under the probe', () => {
    expect(LAYOUT.pxPerDay).toBeGreaterThan(0)
    expect(S_208).toBeGreaterThan(0)
  })
})

describe('表 T-023d の結び -- the double click`s destination is MK-13`s', () => {
  it('writes nothing on the FIRST click of a double click (MUST)', () => {
    // 表 T-023d の結び（利用者の裁定 2026-09-08）:
    // 「替え）に手が届かない。**⚠️ **これは 1 つ下の段落が `GR-9` について述べているのと同じ事故である。**⚠️⚠️ **ダブルクリックの宛先は 表 T-023 の `MK-13` が持ち、本表の優先順より先に読むこと（MUST）」
    //
    // ⭐ THE FIRST CLICK IS WHAT THIS CASE IS ABOUT. It carries `clickCount` 1,
    // which is indistinguishable from a single click at the moment it arrives
    // -- and it does not need to be told apart: what both halves of every
    // double click have in common is that the hand did not travel.
    for (const row of MK_13_ROWS) {
      const answer = afterGesture(
        pointerOf('down', PROBE.x, PROBE.y, 1),
        pointerOf('up', PROBE.x, PROBE.y, 1),
        taskHitOn(row),
      )
      expect(kindsOf(answer), `${row} wrote on a press that never travelled`).toEqual([])
    }
  })

  it('writes nothing on the SECOND click either, and opens MK-13`s field (MUST NOT)', () => {
    // 表 T-023d の結び、続き:
    // 「️ **ダブルクリックの宛先は 表 T-023 の `MK-13` が持ち、本表の優先順より先に読むこと（MUST）**（利用者の裁定 2026-09-08）—— ⛔ **本表の順でダブルクリックの宛先を決めてはならない（MUST NOT）」
    for (const row of MK_13_ROWS) {
      const answer = afterGesture(
        pointerOf('down', PROBE.x, PROBE.y, 2),
        pointerOf('up', PROBE.x, PROBE.y, 2),
        taskHitOn(row),
      )
      expect(kindsOf(answer), `${row} wrote on the second click`).toEqual([])
      expect(answer.action?.kind, `${row} did not reach MK-13`).toBe('editInPlace')
    }
  })

  it('the press is still this tool`s, so MK-10 does not hand it back', () => {
    // ⛔ 「割り当てていない組合せを止めてはならない（MUST NOT）」 is about a
    // combination NOTHING is assigned to. This one is assigned -- the row was
    // grabbed -- so the browser must not get the gesture back half way through.
    const answer = afterGesture(
      pointerOf('down', PROBE.x, PROBE.y, 1),
      pointerOf('up', PROBE.x, PROBE.y, 1),
      taskHitOn('GR-17'),
    )
    expect(answer.isBrowserDefaultStopped).toBe(true)
  })
})

describe('the controls -- what a repair that went too far would break', () => {
  it('FR-001 / FR-019 -- a DRAG past S-208 still writes, on every one of those rows', () => {
    // ⭐ WHAT WOULD PASS IF THE REPAIR HAD GONE THE OTHER WAY: a guard that
    // refused the write
    // outright would pass every case above and take the drag away from FR-011,
    // FR-043 and GR-15 alike. The travel is `S-208` + 1px, the smallest that
    // 「`S-208` を超えて動いた」 admits.
    for (const row of MK_13_ROWS) {
      const answer = afterGesture(
        pointerOf('down', PROBE.x, PROBE.y, 1),
        pointerOf('up', PROBE.x + S_208 + 1, PROBE.y, 1),
        taskHitOn(row),
      )
      expect(kindsOf(answer).length, `${row} lost its drag`).toBeGreaterThan(0)
    }
  })

  it('a travel of exactly S-208 is a click, not a drag (MUST)', () => {
    // 「`S-208` を超えて動いたときをドラッグとし、超えないときをクリックとすること（MUST）」
    // -- 超えて, so the distance itself is still a click.
    const answer = afterGesture(
      pointerOf('down', PROBE.x, PROBE.y, 1),
      pointerOf('up', PROBE.x + S_208, PROBE.y, 1),
      taskHitOn('GR-17'),
    )
    expect(kindsOf(answer)).toEqual([])
  })

  it('rows MK-13 names no destination for keep the table`s order for a plain press', () => {
    // ⭐ 「素の押下の順は 1 文字も変わらない」. GR-3 / GR-4 are the PLAN bar's
    // ends and GR-7 is the marker, whose cycle FR-013 makes one step per
    // release whatever the distance -- none of the three is on MK-13's 対象
    // list, so none of them may be quieted by the guard the cases above ask for.
    for (const row of NOT_MK_13_ROWS) {
      const answer = afterGesture(
        pointerOf('down', PROBE.x, PROBE.y, 1),
        pointerOf('up', PROBE.x, PROBE.y, 1),
        taskHitOn(row),
      )
      expect(kindsOf(answer).length, `${row} stopped answering a plain press`).toBeGreaterThan(0)
    }
  })
})

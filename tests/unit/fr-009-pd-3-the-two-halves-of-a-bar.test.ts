// `FR-009` / 表 T-023a の `PD-3` / 表 T-018 -- what a press on a bar means while
// a dependency is armed, and what it means while nothing is.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by someone who read only docs/spec.
//
// ⭐ THE CLAUSES, VERBATIM.
//
//   表 T-023a の `PD-3`（docs/spec/01-04-requirements.md:2278）:
//     「**何かに当たった**（判定の順と優先は MK-9a） | **そのものへの操作。**
//      ⚠️ **構えが依存線のときは表 T-023d を適用せず**、当たったタスクの**左半分
//      / 右半分**で依存の端点を決める（規則と理由は `FR-009`）」
//
//   `FR-009`（docs/spec/01-04-requirements.md:1847）:
//     「**依存線を構えているときの当たり判定は、タスクの左半分と右半分のどちらに
//      当たったかを返すこと（MUST）。** 左半分が開始側、右半分が終了側である。
//      **端点の掴み代で判定してはならない（MUST NOT）** —— 低いズームでバーが数
//      px まで縮むと掴めなくなる。半分で割れば、どれだけ細くても必ずどちらかに
//      落ちる。」
//     「**引き出した辺と引き入れた辺の組合せは、4 つの種別と 1 対 1 に対応する
//      （MUST）。** したがって**種別を選ぶ入口を別に設けない**」
//
// ⛔⛔ WHERE THE HALVES ARE SPLIT IS NOT STATED. `FR-009` says 「左半分」 and
// 「右半分」 and never says of WHAT (the drawn bar? the occupied width table
// T-038 measures?) nor which half owns the exact midpoint. So the cases below
// probe the FIRST and LAST QUARTER of a wide bar, where every reading agrees,
// and the midpoint itself is left untested and reported as a gap rather than
// decided here.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  emptyScreenState,
  screenStateWithArmed,
} from '../../src/entity/document-model/screen-state/screen-state'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  itemAtPointer,
  type PointerSlop,
} from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { pressRowOf } from '../../src/adapter/input-command-translator/input-command-translator'
import {
  editDependency,
  type DependencyEdge,
} from '../../src/use-case/edit-document/edit-document'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * The nested `shapeHeightOf` the layout reads, rebuilt from the flat dotted
 * keys `SETTINGS_DEFAULTS` prints. ⛔ The five ratios are not typed here.
 */
const SHAPE_HEIGHT_OF = Object.fromEntries(
  Object.entries(SETTINGS_DEFAULTS)
    .filter(([key]) => key.startsWith('shapeHeightOf.'))
    .map(([key, value]) => [key.slice('shapeHeightOf.'.length), value]),
)

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, shapeHeightOf: SHAPE_HEIGHT_OF, ...part }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: 1200,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const SETTINGS = settingsOf({
  scrollDate: '2026-01-01',
  rulerHeight: 48,
  rulerFont: 12,
  stackDirection: 'down',
})

const REGIONS = regionsFromScreen(ENV, SETTINGS)

/** ⚠️ Table T-206's own figures, stated because `itemAtPointer` ships no default. */
const SLOP: PointerSlop = {
  planEndpoint: 6, // S-90
  actualEndpoint: 6, // S-91
  fadeHandle: 7.5, // S-92
  dummyWidth: 30, // S-93
  dummyHeight: 20, // S-93
  line: 4,
}

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    name: null,
    start: null,
    finish: null,
    milestone: null,
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
    project: { calendarUid: null, statusDate: null },
    calendars: [],
    tasks: [],
    resources: [],
    assignments: [],
    taskGroups: [],
    taskGroupMembers: [],
    taskVisuals: [],
    highlightBoxes: [],
    commentBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
    ...part,
  }) as unknown as Schedule

/**
 * One WIDE bar on one row. ⭐ Wide on purpose: `FR-009`'s MUST NOT forbids
 * deciding the endpoint by the grab margin, and a bar only a few slops across
 * would let a case pass because the margins happened to fall either side of the
 * middle. 60 days at 6px is 360px, so each quarter is 90px -- far outside the
 * 6px margin of `S-90`.
 */
const ONE_WIDE_BAR = scheduleOf({
  tasks: [taskOf({ uid: 1, name: 'Design', start: '2026-01-05', finish: '2026-03-05' })],
  taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
  taskGroupMembers: [{ groupId: 'g1', taskUid: 1 }],
})

const GEOMETRY = geometryFromLayout(
  ONE_WIDE_BAR,
  SETTINGS,
  layoutFromSchedule(ONE_WIDE_BAR, SETTINGS, REGIONS),
  REGIONS,
  emptySelection(),
)

const BAR = layoutFromSchedule(ONE_WIDE_BAR, SETTINGS, REGIONS).placements[0]!
/** A point a quarter of the way in from the left edge -- unambiguously 左半分. */
const IN_LEFT_HALF = BAR.x + BAR.width * 0.25
/** A point a quarter of the way in from the right edge -- unambiguously 右半分. */
const IN_RIGHT_HALF = BAR.x + BAR.width * 0.75
const MIDDLE_Y = BAR.y + BAR.planHeight / 2

const ARMED_DEPENDENCY = screenStateWithArmed(emptyScreenState(), { kind: 'dependency' })
const ARMED_NOTHING = emptyScreenState()

const pointerAt = (x: number): Record<string, unknown> => ({
  x,
  y: MIDDLE_Y,
  button: 'left',
  modifiers: { ctrl: false, shift: false, alt: false, meta: false },
  clickCount: 1,
  kind: 'pointer',
  phase: 'down',
})

// ---------------------------------------------------------------------------
// PD-3: a press that hit something is a press on that thing, armed or not
// ---------------------------------------------------------------------------

describe('表 T-023a の PD-3 -- a hit beats the arming', () => {
  it('PD-3 claims the press whenever something was hit, dependency armed or not', () => {
    const hit = itemAtPointer(GEOMETRY, IN_LEFT_HALF, MIDDLE_Y, SLOP)
    expect(hit, 'nothing was hit on the bar, so this file cannot ask its question').not.toBeNull()
    for (const screenState of [ARMED_NOTHING, ARMED_DEPENDENCY]) {
      expect(
        pressRowOf({ at: pointerAt(IN_LEFT_HALF) as never, hit }, {
          screenState,
          dualCursorFollowing: null,
        } as never),
      ).toBe('PD-3')
    }
  })

  it('PD-4a, not PD-3, takes a press on nothing while the dependency is armed', () => {
    // 表 T-023a の `PD-4a`: 「何にも当たらない かつ **依存線を構えている**（AR-4）
    // | **何もしない。** 引きかけの矢印があれば捨てる。構えは解かない」
    expect(
      pressRowOf({ at: pointerAt(IN_LEFT_HALF) as never, hit: null }, {
        screenState: ARMED_DEPENDENCY,
        dualCursorFollowing: null,
      } as never),
    ).toBe('PD-4a')
  })
})

// ---------------------------------------------------------------------------
// FR-009: the two halves, while armed -- and table T-023d, while not
// ---------------------------------------------------------------------------

describe('FR-009 -- 左半分と右半分のどちらに当たったかを返すこと（MUST）', () => {
  it('the hit test tells the two halves apart while a dependency is armed', () => {
    // ⛔⛔ THE MUST, ASKED WITHOUT NAMING A MEMBER. `FR-009` says the hit test
    // answers with WHICH HALF and does not say what the answer is called, so
    // this case asks only what the requirement guarantees: the answer for a
    // point in the left half and the answer for a point in the right half are
    // not the same answer. A hit test that cannot be told the dependency is
    // armed cannot make that distinction at all.
    //
    // ⚠️ The two probes are a quarter in from each end, so the MUST NOT --
    // 「端点の掴み代で判定してはならない」 -- is respected by the question too:
    // neither probe is anywhere near an endpoint's grab margin.
    const left = itemAtPointer(GEOMETRY, IN_LEFT_HALF, MIDDLE_Y, SLOP)
    const right = itemAtPointer(GEOMETRY, IN_RIGHT_HALF, MIDDLE_Y, SLOP)
    expect(left).not.toBeNull()
    expect(right).not.toBeNull()
    expect(left!.item).toEqual({ kind: 'task', taskUid: 1 })
    expect(right!.item).toEqual({ kind: 'task', taskUid: 1 })
    expect(
      right,
      'the hit test answered the same thing for both halves, so FR-009 cannot decide an endpoint',
    ).not.toEqual(left)
  })

  it('PD-3 must not apply table T-023d while a dependency is armed', () => {
    // 「⚠️ **構えが依存線のときは表 T-023d を適用せず**」. `Hit.grab` names a row
    // of 表 T-023d, so an answer that still carries one while the dependency is
    // armed is the table being applied.
    const armedHit = itemAtPointer(GEOMETRY, IN_LEFT_HALF, MIDDLE_Y, SLOP)
    const grabRows = new Set(specTable('T-023d').rows.map((one) => one.id))
    expect(armedHit).not.toBeNull()
    expect(
      grabRows.has(armedHit!.grab),
      `while armed, the hit still answered with ${armedHit!.grab} of table T-023d`,
    ).toBe(false)
  })

  it('the same two points do something ELSE while nothing is armed (table T-023d)', () => {
    // The other side of the same rule: unarmed, the press IS a row of 表 T-023d,
    // and a wide bar's two quarters are both its body -- one grab, not two
    // endpoints. ⭐ This is what makes the case above a real distinction rather
    // than an accident of geometry.
    const left = itemAtPointer(GEOMETRY, IN_LEFT_HALF, MIDDLE_Y, SLOP)
    const right = itemAtPointer(GEOMETRY, IN_RIGHT_HALF, MIDDLE_Y, SLOP)
    const grabRows = new Set(specTable('T-023d').rows.map((one) => one.id))
    expect(grabRows.has(left!.grab)).toBe(true)
    expect(left!.grab).toBe(right!.grab)
  })
})

// ---------------------------------------------------------------------------
// Table T-018: the pair of edges decides the kind
// ---------------------------------------------------------------------------

describe('表 T-018 -- 引く向きで依存の種別が決まる', () => {
  const documentOf = (): Document =>
    ({
      schemaVersion: '1',
      schedule: {
        project: {
          title: 'A',
          calendarUid: null,
          statusDate: null,
          startDate: null,
          themeHue: 214,
          uidHighWaterMark: 10,
          importSeq: 0,
          revision: 1,
          carry: {},
          carryElements: [],
        },
        calendars: [],
        tasks: [1, 2].map((uid) =>
          taskOf({
            uid,
            wbsParentUid: null,
            wbsOrder: null,
            deadline: null,
            notes: null,
            calendarUid: null,
            percentComplete: null,
            start: '2026-01-05T00:00:00',
            finish: '2026-01-09T00:00:00',
            carry: {},
            carryElements: [],
          }),
        ),
        resources: [],
        assignments: [],
        taskGroups: [{ id: 'g1', parentId: null, label: 'row', derivedFromTaskUid: null, order: 0,
          isCollapsed: null, isHidden: null, color: null, height: null }],
        taskGroupMembers: [1, 2].map((taskUid) => ({ taskUid, groupId: 'g1', stackOrder: null })),
        taskVisuals: [],
        commentBoxes: [],
        highlightBoxes: [],
        taskOrigins: [],
        baselineTasks: [],
      },
      documentSettings: { maxGroupDepth: 5, stackSafetyCap: 255 },
      documentStamp: {
        scheduleUpdatedUtc: '2026-08-17T00:00:00Z',
        lastEditedBy: 'user',
        settingsUpdatedUtc: '2026-08-17T00:00:00Z',
      },
      changeLog: [],
    }) as unknown as Document

  /**
   * The edge a cell of 表 T-018 names.
   *
   * ⭐ `FR-009` fixes the reading in as many words -- 「左半分が開始側、右半分が
   * 終了側である」 -- so 左辺 IS the start edge and 右辺 IS the finish edge. That
   * is the whole of the mapping; nothing else is copied out of the table.
   */
  const edgeOf = (cell: string): DependencyEdge => {
    const text = bare(cell)
    if (text.startsWith('左辺')) return 'start'
    if (text.startsWith('右辺')) return 'finish'
    throw new Error(`table T-018 names an edge this file cannot read: ${cell}`)
  }

  it('every row of table T-018 is reached by drawing between the edges it names', () => {
    // ⛔ DRIVEN FROM THE TABLE, one case walking every row (Chapter 1.9, :275).
    // 「引き出した辺と引き入れた辺の組合せは、4 つの種別と 1 対 1 に対応する
    // （MUST）」, so each row is produced by its own pair and by no other.
    const table = specTable('T-018')
    expect(table.rows.length, 'table T-018 no longer has four rows').toBe(4)

    /** A column by the name its heading spells, backticks and all stripped. */
    const columnAt = (heading: string): number => {
      const at = table.headings.findIndex((one) => bare(one) === heading)
      if (at < 0) throw new Error(`table T-018 has no ${heading} column; it has ${table.headings.join(', ')}`)
      return at
    }
    const LINK_TYPE = columnAt('linkType')
    const EXIT = columnAt('出口（先行の）')
    const ENTRY = columnAt('入口（後続の）')
    const NAME = columnAt('名')

    const produced = new Map<string, number>()
    for (const row of table.rows) {
      // `cells` drops the row ID, so a column index shifts by one against it.
      const cell = (at: number): string => row.cells[at - 1] ?? ''
      const result = editDependency(documentOf(), {
        kind: 'createDependency',
        predecessorUid: 1,
        successorUid: 2,
        predecessorEdge: edgeOf(cell(EXIT)),
        successorEdge: edgeOf(cell(ENTRY)),
      })
      expect(result.ok, `${row.id}: the pair of edges was refused`).toBe(true)
      if (!result.ok) continue
      const successor = result.document.schedule.tasks.find((task) => task.uid === 2)!
      const edge = successor.dependencies[0]!
      expect(edge.predecessorUid).toBe(1)
      // ⭐ The `linkType` column of the row, not a number typed here.
      expect(edge.linkType, `${row.id} (${bare(cell(NAME))})`).toBe(Number(bare(cell(LINK_TYPE))))
      produced.set(row.id, edge.linkType)
    }
    // One-to-one, both ways: four rows, four distinct kinds.
    expect(produced.size).toBe(4)
    expect(new Set(produced.values()).size).toBe(4)
  })

  it('no entrance chooses the kind -- the command carries edges and no linkType', () => {
    // 「したがって**種別を選ぶ入口を別に設けない** —— 引いた線の形がそのまま種別を
    // 表す」. A `linkType` on the create command would BE that entrance, so the
    // command must reject one.
    const withKind = {
      kind: 'createDependency',
      predecessorUid: 1,
      successorUid: 2,
      predecessorEdge: 'finish',
      successorEdge: 'start',
      linkType: 3,
    }
    const result = editDependency(documentOf(), withKind as never)
    // Whether it refuses or ignores it, the one thing it may NOT do is honour
    // it: the edges say FS (1), and that is what has to come out.
    if (result.ok) {
      const successor = result.document.schedule.tasks.find((task) => task.uid === 2)!
      expect(successor.dependencies[0]!.linkType).toBe(1)
    }
  })
})

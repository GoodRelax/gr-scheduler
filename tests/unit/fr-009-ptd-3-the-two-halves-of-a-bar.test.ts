// `FR-009` / 表 T-023a の `PTD-3` / 表 T-018 -- what a press on a bar means while
// a dependency is armed, and what it means while nothing is.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by someone who read only docs/spec.
//
// ⭐ THE CLAUSES, VERBATIM.
//
//   表 T-023a の `PTD-3`（docs/spec/01-04-requirements.md:2278）:
//     「**何かに当たった**（判定の順と優先は MK-9a） | **そのものへの操作。**
//      ⚠️ **構えが依存線のときは表 T-023d を適用せず**、当たったタスクの**左半分
//      / 右半分**で依存の端点を決める（規則と理由は `FR-009`）」
//
//   `FR-009`（docs/spec/01-04-requirements.md:1850）:
//     「**依存線を構えているときの当たり判定は、タスクの左半分と右半分のどちらに
//      当たったかを返すこと（MUST）。** 左半分が開始側、右半分が終了側である。
//      **端点の掴み代で判定してはならない（MUST NOT）** —— 低いズームでバーが数
//      px まで縮むと掴めなくなる。半分で割れば、どれだけ細くても必ずどちらかに
//      落ちる。 ⛔⛔ **割る点は、そのタスクのバー自身の中点とすること（MUST）。
//      表 T-038 が定める占有幅で割ってはならない（MUST NOT）** —— **占有幅には
//      バーの外に出るラベルと印が入るので、中点が絵の上のバーの中央からずれる。**
//      ⭐ **バーは予定の幾何に付き、予定が無いときは実績に落ちる。**⚠️ **中点
//      ちょうどに当たったときは右半分とすること（MUST）**…⛔⛔ **どちらの半分か
//      を、公開された名前から問えるようにすること（MUST）**…⛔ **表 T-023c の
//      `SL-1` を答える公開名（`_source` の外では 表 T-064 の `PI-7`）に構えを渡
//      してはならない（MUST NOT）**…⭐ **半分を答える名は別に置くこと（MUST）。
//      構えが依存線のときだけ呼ぶ。」
//
//   表 T-064 の `PI-7`（docs/spec/05-07-design.md:332）names the separate name:
//     「`dependencyEndAtPointer`（`FR-009` の「左半分 / 右半分」を答える。⛔ 構え
//      が依存線のときだけ呼ぶ —— 同要求が `itemAtPointer` に構えを渡すことを禁じ
//      ている）」
//
// ⛔ 2026-09-06 の訂正: an earlier round of this file said 「WHERE THE HALVES ARE
// SPLIT IS NOT STATED」 and left the midpoint untested. `FR-009` now states both,
// and 表 T-064 names the member that answers, so the cases below ask the
// requirement as it now reads: `dependencyEndAtPointer` for the half,
// `itemAtPointer` for what is on the point, and never one name doing both.

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
import {
  geometryFromLayout,
  type BarGeometry,
  type ScheduleGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  dependencyEndAtPointer,
  itemAtPointer,
  NOT_STORED_SIZES,
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

/** Table T-206, through the generated block `item-hit-area.ts` publishes. */
const SLOP: PointerSlop = {
  planEndpoint: NOT_STORED_SIZES['S-90'],
  actualEndpoint: NOT_STORED_SIZES['S-91'],
  // ⛔ HALF, NOT THE WHOLE SQUARE -- see `frame-loop.ts`'s `POINTER_SLOP`.
  fadeHandle: NOT_STORED_SIZES['S-92'][0] / 2,
  // ⛔⛔ NO DUMMY FIGURE HERE, AND THAT IS THE RULE RATHER THAN AN OVERSIGHT.
  // Table T-023d's closing rule reads 「`GR-9` / `GR-17` / `GR-18` の
  // 当たり判定は、`FR-043` が描いた印そのものとすること（MUST）。印の外へ
  // 広げてはならない（MUST NOT）」, so the dummy's grab area IS the width
  // `S-180` draws and there is no separate slop to state. `PointerSlop`
  // carries no dummy field at all, and a caller states nothing for it.
  line: NOT_STORED_SIZES['S-137'],
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

/** One Task on one row, whatever the Task is. */
const oneRowOf = (task: Record<string, unknown>): Schedule =>
  scheduleOf({
    tasks: [taskOf({ uid: 1, ...task })],
    taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
    taskGroupMembers: [{ groupId: 'g1', taskUid: 1 }],
  })

const geometryOf = (schedule: Schedule, settings: DocumentSettings = SETTINGS): ScheduleGeometry => {
  const regions = regionsFromScreen(ENV, settings)
  return geometryFromLayout(
    schedule,
    settings,
    layoutFromSchedule(schedule, settings, regions),
    regions,
    emptySelection(),
  )
}

/**
 * How far a drawn bar reaches sideways, and how high up it is, read off the two
 * forms `BarGeometry` publishes and nothing else.
 *
 * ⭐ THE BAR ITSELF: this is the shape's own ink, which is exactly what 「その
 * タスクのバー自身の中点」 is measured on. Nothing table T-038 adds to the
 * occupancy -- a label spilling out (`OC-1`), a marker (`OC-3`) -- is in here.
 */
const spanOfBar = (
  bar: BarGeometry,
): { readonly left: number; readonly right: number; readonly y: number } => {
  if (bar.form === 'outline') {
    const xs = bar.points.map((point) => point.x)
    const ys = bar.points.map((point) => point.y)
    return {
      left: Math.min(...xs),
      right: Math.max(...xs),
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    }
  }
  return {
    left: Math.min(bar.from.x, bar.to.x),
    right: Math.max(bar.from.x, bar.to.x),
    y: (bar.from.y + bar.to.y) / 2,
  }
}

/**
 * One WIDE bar on one row. ⭐ Wide on purpose: `FR-009`'s MUST NOT forbids
 * deciding the endpoint by the grab margin, and a bar only a few slops across
 * would let a case pass because the margins happened to fall either side of the
 * middle. 60 days at 6px is 360px, so each quarter is 90px -- far outside the
 * 6px margin of `S-90`.
 */
const ONE_WIDE_BAR = oneRowOf({ name: 'Design', start: '2026-01-05', finish: '2026-03-05' })

const GEOMETRY = geometryOf(ONE_WIDE_BAR)

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
// PTD-3: a press that hit something is a press on that thing, armed or not
// ---------------------------------------------------------------------------

describe('表 T-023a の PTD-3 -- a hit beats the arming', () => {
  it('PTD-3 claims the press whenever something was hit, dependency armed or not', () => {
    const hit = itemAtPointer(GEOMETRY, IN_LEFT_HALF, MIDDLE_Y, SLOP)
    expect(hit, 'nothing was hit on the bar, so this file cannot ask its question').not.toBeNull()
    for (const screenState of [ARMED_NOTHING, ARMED_DEPENDENCY]) {
      expect(
        pressRowOf({ at: pointerAt(IN_LEFT_HALF) as never, hit }, {
          screenState,
          dualCursorFollowing: null,
        } as never),
      ).toBe('PTD-3')
    }
  })

  it('PTD-4a, not PTD-3, takes a press on nothing while the dependency is armed', () => {
    // 表 T-023a の `PTD-4a`: 「何にも当たらない かつ **依存線を構えている**（AR-4）
    // | **何もしない。** 引きかけの矢印があれば捨てる。構えは解かない」
    expect(
      pressRowOf({ at: pointerAt(IN_LEFT_HALF) as never, hit: null }, {
        screenState: ARMED_DEPENDENCY,
        dualCursorFollowing: null,
      } as never),
    ).toBe('PTD-4a')
  })
})

// ---------------------------------------------------------------------------
// FR-009: 半分を答える名は別に置くこと（MUST）
// ---------------------------------------------------------------------------

describe('FR-009 -- 左半分と右半分のどちらに当たったかを返すこと（MUST）', () => {
  it('the separate name answers 開始側 in the left half and 終了側 in the right', () => {
    // 「左半分が開始側、右半分が終了側である」, asked of the name 表 T-064 の
    // `PI-7` puts it under. ⚠️ The two probes are a quarter in from each end, so
    // 「端点の掴み代で判定してはならない」 is respected by the question too:
    // neither probe is anywhere near an endpoint's grab margin.
    const onTask = itemAtPointer(GEOMETRY, IN_LEFT_HALF, MIDDLE_Y, SLOP)
    expect(onTask, 'nothing was hit on the bar, so this file cannot ask its question').not.toBeNull()
    const uid = (onTask!.item as { readonly taskUid: number }).taskUid

    expect(dependencyEndAtPointer(GEOMETRY, IN_LEFT_HALF, MIDDLE_Y, uid)).toEqual({
      taskUid: 1,
      edge: 'start',
    })
    expect(dependencyEndAtPointer(GEOMETRY, IN_RIGHT_HALF, MIDDLE_Y, uid)).toEqual({
      taskUid: 1,
      edge: 'finish',
    })
  })

  it('the midpoint itself is the right half', () => {
    // 「⚠️ **中点ちょうどに当たったときは右半分とすること（MUST）** —— どちらでも
    // よいが、決めておかないと同じ点が押すたびに違う端点を返す」
    const bar = GEOMETRY.tasks[0]!.plan
    expect(bar, 'the wide fixture drew no plan bar').not.toBeNull()
    const { left, right, y } = spanOfBar(bar!)
    const middle = (left + right) / 2
    expect(dependencyEndAtPointer(GEOMETRY, middle, y, 1)?.edge).toBe('finish')
    // And the point one pixel to its left is the other half, so the line is AT
    // the middle and not somewhere past it.
    expect(dependencyEndAtPointer(GEOMETRY, middle - 1, y, 1)?.edge).toBe('start')
  })

  it('the split is the bar own middle, not the middle of the occupied width', () => {
    // 「⛔⛔ **割る点は、そのタスクのバー自身の中点とすること（MUST）。表 T-038 が
    // 定める占有幅で割ってはならない（MUST NOT）** —— 占有幅にはバーの外に出る
    // ラベルと印が入るので、中点が絵の上のバーの中央からずれる」
    //
    // ⭐ HOW THE TWO MIDDLES ARE PULLED APART: 表 T-013 の `NL-3` puts a name
    // that does not fit 「形状の右に出す」, and 表 T-038 の `OC-1` counts that
    // spill into the occupancy. A short bar with a long name therefore has an
    // occupancy whose middle sits well to the RIGHT of the bar's own middle.
    // Any point between the two middles is the bar's 右半分 and the occupancy's
    // 左半分, so the two readings disagree there and only there.
    const schedule = oneRowOf({
      name: 'A task whose name is far too long to be written inside its own short bar',
      start: '2026-01-05',
      finish: '2026-01-15',
    })
    const geometry = geometryOf(schedule)
    const drawn = geometry.tasks[0]!
    expect(drawn.plan, 'the long-named fixture drew no plan bar').not.toBeNull()
    const { left, right, y } = spanOfBar(drawn.plan!)
    const label = drawn.label
    expect(
      label,
      'the long name produced no label, so the two middles cannot be pulled apart',
    ).not.toBeNull()
    expect(
      label!.x + label!.width,
      'the label did not spill past the right edge of the bar (NL-3), so this case cannot ask its question',
    ).toBeGreaterThan(right)

    const barMiddle = (left + right) / 2
    // 表 T-038: `OC-1` adds the spill to the occupancy; nothing in this fixture
    // adds anything to the left (`OC-2` is hidden by default, there is no
    // actual bar, no deadline mark and no delay figure).
    const occupiedMiddle = (left + (label!.x + label!.width)) / 2
    expect(
      occupiedMiddle,
      'the occupancy middle did not move right of the bar middle, so nothing is being told apart',
    ).toBeGreaterThan(barMiddle)

    // A point the two readings disagree about, and which is on the bar so both
    // readings can see it: right of the bar's middle, left of the occupancy's.
    const between = (barMiddle + Math.min(occupiedMiddle, right)) / 2
    expect(between).toBeGreaterThan(barMiddle)
    expect(between).toBeLessThan(occupiedMiddle)
    expect(
      dependencyEndAtPointer(geometry, between, y, 1)?.edge,
      'the point is right of the bar own middle, so FR-009 makes it 終了側',
    ).toBe('finish')
  })

  it('with no plan bar drawn, the halves are the actual bar halves', () => {
    // 「⭐ **バーは予定の幾何に付き、予定が無いときは実績に落ちる。**」 and the
    // same requirement's 「依存線は予定の幾何に付くこと（MUST）。予定を表示して
    // いないときに限り、実績の幾何に付ける」.
    //
    // ⭐ `S-227` (`planVisible`) set false is how a Task comes to have no plan
    // bar at all: `FR-001`'s floor (`S-49`) means a Task with no dates still
    // draws one, so hiding the plan is the case the clause describes. ⚠️ `S-228`
    // (`actualVisible`) is the other, independent switch, and the actual is put
    // WELL AFTER the plan on purpose -- if the split still followed the plan,
    // both probes would land on the same side of it.
    const schedule = oneRowOf({
      name: 'Actual only',
      milestone: false,
      start: '2026-01-05',
      finish: '2026-01-20',
      actualStart: '2026-03-02',
      actualDuration: 40,
    })
    const geometry = geometryOf(
      schedule,
      settingsOf({ ...SETTINGS, planVisible: false, actualVisible: true }),
    )
    const drawn = geometry.tasks[0]!
    expect(
      drawn.plan,
      'a plan bar was drawn anyway, so this case cannot ask about a Task without one',
    ).toBeNull()
    expect(drawn.actual, 'the fixture drew no actual bar either').not.toBeNull()
    const { left, right, y } = spanOfBar(drawn.actual!)
    expect(right - left, 'the actual bar has no width to halve').toBeGreaterThan(4)
    expect(dependencyEndAtPointer(geometry, left + (right - left) * 0.25, y, 1)?.edge).toBe('start')
    expect(dependencyEndAtPointer(geometry, left + (right - left) * 0.75, y, 1)?.edge).toBe('finish')
  })

  it('a bar a few px wide still falls in one half or the other', () => {
    // 「**端点の掴み代で判定してはならない（MUST NOT）** —— 低いズームでバーが数
    // px まで縮むと掴めなくなる。半分で割れば、どれだけ細くても必ずどちらかに
    // 落ちる」. ⭐ At this width BOTH endpoints' grab margins (`S-90` = 6px to
    // either side of an end) cover the WHOLE bar, so a reading that used them
    // could not tell the halves apart here at all.
    //
    // ⭐ HOW A BAR GETS THAT NARROW AT ALL: `S-86` (24px) drops any Task whose
    // width came from its duration and fell below it, but `FR-021`'s LOD rule
    // exempts a shape whose width did NOT come from the duration -- 「期間がゼロ
    // の `Task` は 表 T-201 の `S-49`（`minShapeWidth`）の床で…幅が決まり」. A
    // Task that starts and finishes the same day is drawn at that 6px floor and
    // stays drawn, which is the narrowest bar the specification admits.
    const schedule = oneRowOf({
      name: 'T',
      milestone: false,
      start: '2026-01-05',
      finish: '2026-01-05',
    })
    const geometry = geometryOf(schedule)
    const drawn = geometry.tasks[0]
    expect(
      drawn,
      'the Task was not drawn at this zoom, so this case cannot ask its question',
    ).toBeDefined()
    const bar = drawn!.plan ?? drawn!.actual
    expect(bar).not.toBeNull()
    const { left, right, y } = spanOfBar(bar!)
    expect(
      right - left,
      'the bar is not narrow enough to be the case this asks about',
    ).toBeLessThan(SLOP.planEndpoint * 2)
    // Every point across the bar answers, and the two ends answer differently.
    expect(dependencyEndAtPointer(geometry, left, y, 1)?.edge).toBe('start')
    expect(dependencyEndAtPointer(geometry, right, y, 1)?.edge).toBe('finish')
  })
})

// ---------------------------------------------------------------------------
// FR-009: the name that answers 「点の上に何が在るか」 must not answer the half
// ---------------------------------------------------------------------------

describe('FR-009 -- SL-1 を答える公開名に構えを渡してはならない（MUST NOT）', () => {
  it('itemAtPointer answers a row of table T-023d, and the same one in both halves', () => {
    // 「⛔ **表 T-023c の `SL-1` を答える公開名（…表 T-064 の `PI-7`）に構えを渡し
    // てはならない（MUST NOT）** —— その名は「点の上に何が在るか」を答えるもので
    // あり、構えによって答えが変わると、それに対して書かれたすべての呼び手と試験
    // が構えを意識することになる」
    //
    // ⇒ The consequence that can be measured from outside: that name has no way
    // to be told the arming, so its answer for a point CANNOT vary with it, and
    // a wide bar's two quarters are both its body -- one grab of 表 T-023d, not
    // two endpoints. ⭐ Whether PTD-3 withholds table T-023d is settled by the
    // CALLER, outside this name; `FR-009` puts the half on a name of its own.
    const left = itemAtPointer(GEOMETRY, IN_LEFT_HALF, MIDDLE_Y, SLOP)
    const right = itemAtPointer(GEOMETRY, IN_RIGHT_HALF, MIDDLE_Y, SLOP)
    const grabRows = new Set(specTable('T-023d').rows.map((one) => one.id))
    expect(left).not.toBeNull()
    expect(right).not.toBeNull()
    expect(left!.item).toEqual({ kind: 'task', taskUid: 1 })
    expect(grabRows.has(left!.grab), `${left!.grab} is not a row of table T-023d`).toBe(true)
    expect(
      right,
      'itemAtPointer told the two halves apart, which is the half being answered by the wrong name',
    ).toEqual(left)
  })

  it('the half is asked of a separate name that takes no grab margin', () => {
    // 「⭐ **半分を答える名は別に置くこと（MUST）。構えが依存線のときだけ呼ぶ。**」
    // ⇒ two different names; and the one that answers the half is reached
    // without a `PointerSlop` at all, which is 「端点の掴み代で判定してはならない」
    // made unaskable rather than merely unused.
    expect(dependencyEndAtPointer).not.toBe(itemAtPointer)
    expect(
      dependencyEndAtPointer.length,
      'dependencyEndAtPointer takes something beyond the geometry, the point and the Task',
    ).toBe(4)
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
    // ⭐ And the same clause whole on one line, because a quotation broken
    // across two comment lines carries a `// ` inside it and latches nothing:
    // 「引き出した辺と引き入れた辺の組合せは、4 つの種別と 1 対 1 に対応する（MUST）」
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

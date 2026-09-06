// 表 T-014 の `ST-7` -- the stack safety valve, and 表 T-233 の `RS-24`, the
// reason it hands the person.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by someone who read only docs/spec.
//
// ⭐ THE CLAUSE, VERBATIM (docs/spec/01-04-requirements.md:1228, 表 T-014 の
// `ST-7`):
//
//   「段数に機能上の上限を設けない。**ただし 1 つの `TaskGroup` あたりの段数に
//    安全弁を置き、達したらそこで処理を止め、達したことを判別できる値で返して
//    人に通知すること（MUST）。例外を投げてはならない（MUST NOT）**」
//   「黙って切り捨てても、重ねて押し込んでもならない（MUST NOT）」
//   「**数えるのは、その `TaskGroup` の行に載っている `Task` が同時に重なる段数
//    である**（取込で載せたもの（`FR-058`）を含む）」
//   「⚠️ **人が置いたものに限ってはならない（MUST NOT）**」
//   「段数は `_assets/tbl-settings.md` の `S-89` が持つ」
//
// ⭐ AND THE REASON (docs/spec/01-04-requirements.md:3924, 表 T-233):
//
//   | RS-24 | 1 つの `TaskGroup` の段数が安全弁に達したので、これ以上積めない
//           | `NT-3a` | 表 T-014 の `ST-7` |
//
// ⛔ THE BRIEF THAT ASKED FOR THIS FILE CITED 表 T-233 AT :3922. The row is at
// :3924. The clause of `ST-7` is at :1228 as the brief said.
//
// ⛔⛔ WHAT THIS FILE DELIBERATELY DOES NOT TEST: whether the telling is raised
// once per turn rather than once per frame. ⚠️ NOTHING IN docs/spec SAYS SO.
// `RS-24`'s 作法 column names `NT-3a` alone, and the only per-notice rule about
// piling the same reason up ("同じ理由の通知が既に立っているときは、新しく積まず
// に、その 1 枚の件数を増やすこと（MUST）") is written on `NT-3`, whose 場面 is
// 「破壊的な結果を伴うとき」 -- not this one. Inventing the rule here would be
// this file writing specification, so it is reported as a gap instead.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import {
  layoutFromSchedule,
  type ScheduleLayout,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// Fixtures. ⭐ Every key not pinned here comes from `SETTINGS_DEFAULTS`, which
// `npm run gen` prints from the manuscript, so a re-ruled default moves with it
// instead of being re-typed (rule 03 section 1).
// ---------------------------------------------------------------------------

/**
 * The nested `shapeHeightOf` the layout reads.
 *
 * ⚠️ `SETTINGS_DEFAULTS` prints the manuscript's dotted keys flat
 * (`shapeHeightOf.rectangle` and its four siblings), so the object they stand
 * for is rebuilt here from those very entries. ⛔ The five ratios are NOT typed:
 * re-ruling one in `_assets/tbl-settings.md` moves these cases with it.
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
  height: 900,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

/**
 * The valve this file exercises.
 *
 * ⛔ NOT 255. `S-89`'s own remark says the figure 「測って決めた値ではない」 and
 * 「これだけの本数が 1 つの行で同時に重なるのは実務では起きない」, so a case that
 * built 255 overlapping tasks would be measuring the fixture, not the rule.
 * `ST-7` states the BEHAVIOUR at the cap and puts the NUMBER in `S-89`, so the
 * behaviour is asked at a cap this file sets and the number is asserted
 * separately, straight off the manuscript, in its own case below.
 */
const CAP = 4

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
 * `howMany` tasks that all cover the same days on one row.
 *
 * ⭐ `ST-10` keeps a touching pair off the same stack only when they merely
 * touch; these overlap outright, so `ST-3`'s greedy assignment has to open one
 * stack per task and the row's stack count IS `howMany`.
 */
const overlappingOnOneRow = (howMany: number, part: Record<string, unknown> = {}): Schedule => {
  const tasks = Array.from({ length: howMany }, (_, index) =>
    taskOf({ uid: index + 1, name: `t${index + 1}`, start: '2026-01-05', finish: '2026-01-20' }),
  )
  return scheduleOf({
    tasks,
    taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
    taskGroupMembers: tasks.map((task) => ({ groupId: 'g1', taskUid: task.uid })),
    ...part,
  })
}

const SETTINGS = settingsOf({
  scrollDate: '2026-01-01',
  rulerHeight: 48,
  rulerFont: 12,
  stackDirection: 'down',
  stackSafetyCap: CAP,
})

const REGIONS = regionsFromScreen(ENV, SETTINGS)

const layoutOf = (schedule: Schedule, settings: DocumentSettings = SETTINGS): ScheduleLayout =>
  layoutFromSchedule(schedule, settings, REGIONS)

// ---------------------------------------------------------------------------

describe('表 T-014 の ST-7 -- the stack safety valve is a VALUE, never an exception', () => {
  it('ST-7 carries the member on every layout, reached or not -- it is not an optional extra', () => {
    // 「達したことを判別できる値で返して」(MUST). A caller can only judge on a
    // member that is always there: one that appears only after the valve fires
    // reads as `undefined` on a layout that simply forgot it.
    const calm = layoutOf(overlappingOnOneRow(1))
    expect(Object.prototype.hasOwnProperty.call(calm, 'stackSafetyCapReached')).toBe(true)
    expect(calm.stackSafetyCapReached).toBeNull()
  })

  it('ST-7 leaves the member null while the row stays one stack short of the cap', () => {
    // ⭐ THE BOUNDARY, BELOW. `CAP - 1` overlapping tasks need `CAP - 1` stacks,
    // which has NOT 「達した」 the valve.
    const layout = layoutOf(overlappingOnOneRow(CAP - 1))
    expect(layout.stackSafetyCapReached).toBeNull()
    expect(layout.placements).toHaveLength(CAP - 1)
  })

  it('ST-7 leaves the member null exactly at the cap, and names it only once a row exceeds the cap', () => {
    // ⭐ THE BOUNDARY, BOTH SIDES (表 T-014 の `ST-7`, 2026-09-06 の書き足し,
    // verbatim): 「安全弁の値（`S-89`）は『許される段数の上限』であること（MUST）
    // -- 同時に重なる段が `S-89` に等しいところまでは積め、`S-89` を超える段を
    // 置こうとしたときに止まる。」 So `CAP` overlapping tasks stack exactly TO the
    // cap and must stay null; `CAP + 1` is the first count that goes PAST it and
    // must reach the valve.
    const atCap = layoutOf(overlappingOnOneRow(CAP))
    expect(atCap.stackSafetyCapReached).toBeNull()
    expect(atCap.placements).toHaveLength(CAP)

    const overCap = layoutOf(overlappingOnOneRow(CAP + 1))
    expect(overCap.stackSafetyCapReached).not.toBeNull()
    expect(overCap.stackSafetyCapReached).toEqual({ groupId: 'g1', cap: CAP })
  })

  it('ST-7 must not throw when the valve is reached (MUST NOT)', () => {
    // 「例外を投げてはならない（MUST NOT）」 -- 投げると捕まえる者が要り、`FR-028`
    // が `Agent API` に課した禁止と同じ安全弁が 2 つの機構を持つことになる。
    // ⚠️ Asked well past the cap too, so a valve that only holds at the exact
    // boundary is not mistaken for one that holds.
    expect(() => layoutOf(overlappingOnOneRow(CAP))).not.toThrow()
    expect(() => layoutOf(overlappingOnOneRow(CAP * 3))).not.toThrow()
  })

  it('ST-7 must not squeeze the overflow into the last stack (MUST NOT)', () => {
    // 「重ねて押し込んでもならない（MUST NOT）」, and `ST-8` says the same thing
    // from the other side: 「最終段を再利用して重なりを許す挙動を実装してはなら
    // ない（MUST NOT）」. So no drawn task may sit on a stack at or past the cap,
    // and no two drawn tasks may share one stack of one row.
    const layout = layoutOf(overlappingOnOneRow(CAP * 3))
    for (const placement of layout.placements) {
      expect(placement.stack).toBeLessThan(CAP)
    }
    const seats = layout.placements.map((one) => `${one.groupId}#${one.stack}`)
    expect(new Set(seats).size).toBe(seats.length)
  })

  it('ST-7 must not silently drop the overflow (MUST NOT) -- it stops AND says so', () => {
    // 「黙って切り捨てても…ならない（MUST NOT）」. The two halves are asserted
    // together: a layout that drew fewer tasks than the document holds is only
    // lawful while it is ALSO carrying the value that says the valve fired.
    const layout = layoutOf(overlappingOnOneRow(CAP * 3))
    expect(layout.placements.length).toBeLessThan(CAP * 3)
    expect(layout.stackSafetyCapReached).not.toBeNull()
  })

  it('ST-7 counts the tasks an import put on the row, not only the ones a person placed', () => {
    // ⚠️ 「**人が置いたものに限ってはならない（MUST NOT）**」 -- 段が最も膨らむの
    // は深い WBS を取り込んだときであり、そこで安全弁が働かなくなる。⭐ A
    // `TaskOrigin` is what marks a task as having come from the exchange partner
    // (`FR-058`), so a row whose every task carries one must reach the valve
    // exactly as a hand-built row does -- and the same boundary as above holds
    // here too: `CAP` imported tasks stack exactly to the cap (null), `CAP + 1`
    // is the first imported count that reaches it.
    const originsFor = (howMany: number) =>
      Array.from({ length: howMany }, (_, index) => ({
        taskUid: index + 1,
        sourceProjectUid: 'p',
        sourceUid: index + 1,
        lastSeenImportSeq: 0,
        importSessionId: null,
      }))
    const atCap = overlappingOnOneRow(CAP, { taskOrigins: originsFor(CAP) })
    expect(layoutOf(atCap).stackSafetyCapReached).toBeNull()

    const overCap = overlappingOnOneRow(CAP + 1, { taskOrigins: originsFor(CAP + 1) })
    expect(layoutOf(overCap).stackSafetyCapReached).toEqual({ groupId: 'g1', cap: CAP })
  })

  it('ST-7 counts per TaskGroup, so tasks spread over two rows do not add up', () => {
    // 「**1 つの `TaskGroup` あたりの段数**に安全弁を置き」 and 「数えるのは、その
    // `TaskGroup` の行に載っている `Task` が同時に重なる段数である」. Twice the
    // cap in tasks, split evenly over two rows, leaves neither row at the valve.
    const tasks = Array.from({ length: CAP * 2 }, (_, index) =>
      taskOf({ uid: index + 1, name: `t${index + 1}`, start: '2026-01-05', finish: '2026-01-20' }),
    )
    const twoRows = scheduleOf({
      tasks,
      taskGroups: [
        { id: 'g1', parentId: null, order: 0, height: null },
        { id: 'g2', parentId: null, order: 1, height: null },
      ],
      taskGroupMembers: tasks.map((task, index) => ({
        groupId: index % 2 === 0 ? 'g1' : 'g2',
        taskUid: task.uid,
      })),
    })
    expect(layoutOf(twoRows).stackSafetyCapReached).toBeNull()
    expect(layoutOf(twoRows).placements).toHaveLength(CAP * 2)
  })

  it('ST-7 takes the number from S-89 and from nowhere else', () => {
    // 「段数は `_assets/tbl-settings.md` の `S-89` が持つ」. ⚠️ `ST-7` names the
    // ROW and not the table; `S-89` stands in 表 T-205 (LOD のしきい値). The
    // generated default is asserted against the manuscript's own cell rather
    // than against a typed 255, so re-ruling the row moves this case with it.
    const row = specTable('T-205').rows.find((one) => one.id === 'S-89')
    expect(row, 'table T-205 has no row S-89').toBeDefined()
    const printed = Number(bare(row!.by['既定'] ?? ''))
    expect(Number.isFinite(printed), `S-89's 既定 is ${row!.by['既定']}, not a number`).toBe(true)
    expect(SETTINGS_DEFAULTS['stackSafetyCap']).toBe(printed)

    // ⭐ AND IT IS READ, not baked in: a document that names a different cap is
    // judged against ITS cap. Otherwise `S-89` would be a fact about the code.
    const raised = settingsOf({ ...SETTINGS, stackSafetyCap: CAP + 1 })
    expect(layoutFromSchedule(overlappingOnOneRow(CAP), raised, REGIONS).stackSafetyCapReached)
      .toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 表 T-233 の `RS-24` -- the reason the person is handed
// ---------------------------------------------------------------------------

describe('表 T-233 の RS-24 -- the reason the valve raises', () => {
  const T_233 = specTable('T-233')
  const ROW = T_233.rows.find((one) => one.id === 'RS-24')

  it('RS-24 stands in table T-233, follows NT-3a, and points back at ST-7', () => {
    expect(ROW, 'table T-233 has no row RS-24').toBeDefined()
    expect(bare(ROW!.by['作法'] ?? '')).toBe('NT-3a')
    // 「正」 names the row that owns the rule this reason reports.
    expect(ROW!.by['正'] ?? '').toContain('ST-7')
    expect(ROW!.by['場面'] ?? '').toContain('安全弁')
  })

  it('NT-3a makes RS-24 carry a next step as well as the failure', () => {
    // `NT-3a`: 「**次に取れる手段を添えること（MUST）**」「失敗したことだけを伝えて
    // 手段を示さない通知を出してはならない（MUST NOT）」. The dictionary is where
    // `FR-038` puts the words, and 表 T-233's closing rule requires an entry for
    // every row of the table -- so a reason with no `nextStep` cannot satisfy
    // `NT-3a` in any display language.
    const words = JSON.parse(
      readFileSync(
        join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'display-words.json'),
        'utf8',
      ),
    ) as { reasons: readonly { rowId: string; text?: unknown; nextStep?: unknown }[] }
    const entry = words.reasons.find((one) => one.rowId === 'RS-24')
    expect(entry, 'the dictionary has no entry for RS-24').toBeDefined()
    expect(entry!.text).toBeDefined()
    expect(entry!.nextStep, 'RS-24 carries no next step, which NT-3a requires').toBeDefined()
  })

  it('ST-7 raises no reason while no row reached the valve', () => {
    // The other half of 「達したことを判別できる値」: a value that is set when
    // nothing happened tells the caller nothing. `RS-24`'s 場面 is 「安全弁に達し
    // た」, so a layout under the cap must give the shell nothing to report.
    expect(layoutOf(overlappingOnOneRow(CAP - 1)).stackSafetyCapReached).toBeNull()
    expect(layoutOf(scheduleOf({})).stackSafetyCapReached).toBeNull()
  })
})

// What the SHIPPED startup template draws on its very first frame.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every row
// quoted below, the shipped artifact
// `src/framework/single-html-shell/startup-template.json` (which FR-027 makes
// a document and not code), and of `src/` only the published signatures of
// `frameLoop`, `layoutFromSchedule`, `groupDepthLimit`, `regionsFromScreen`,
// `dayOf` and `commandFromInput`.
//
// ⭐ WHY THIS FILE EXISTS BESIDE THE FOUR `fr-055-*` FILES AND `uf-47-48`.
// Those four drive fixtures this repository builds by hand, and `uf-47-48`
// drives OP-10's three branches as a RULE on a two-row document. Not one of
// them asks what the ONE document the specification has actually decided --
// BT-4 of table T-034, the template FR-027 keeps exactly one of -- looks like
// when the shell boots on it. Every case below is about that artifact, and no
// case below restates a rule those files already state:
//   * the FR-018 ladder itself (that threshold(d) stands where S-87 and S-88
//     put it, that depth 1 is never a candidate, that it never runs backwards)
//     is `fr-055-vertical-fit.test.ts`. This file CALLS `groupDepthLimit` and
//     asks what the shipped document draws under it.
//   * that the fit takes the deepest tier that fits, on documents built to
//     answer 5 / 4 / 3 / 1, is `fr-055-fit-reaches-deep-tiers.test.ts`.
//   * that OP-10 branches on null, on a dangling id, and on a good place is
//     `uf-47-48.test.ts`.
//
// The rows these cases answer to (rule 03: name the row, never copy its value):
//   T-226    TP-8 -- 「行の深さと WBS の深さ」 are 「同じ 5 段に揃える」 in the
//            template. The number is read out of the cell at run time.
//   T-024a   OP-10 -- 「表示位置が `null`、または指す行が存在しないとき」 the
//            zoom and the place come from FR-055's fit (MUST). By its own
//            terms it does NOT run when the stored place is a place.
//   T-051    HF-8 -- 「起動のときは働かせてはならない（MUST NOT。表 T-024a の
//            `OP-10`）」.
//   T-203    S-77 `scrollDate` / S-78 `scrollGroupId` -- the stored place, and
//            what a `null` in either means.
//   T-206    S-96 / S-97 / S-98 -- the three zoom values the document does not
//            keep, which the fit is handed.
//   FR-018   the group level of detail: which depths a `zoomY` admits.
//   FR-055   the fit -- 「描くものが Row Area に収まる最も深い段を採る」, depth
//            1 when even that does not fit, and the vertical scroll left over.
//   FR-094   the floor under the plan height, which is why a smaller `zoomY`
//            below it removes rows instead of shrinking them.
//
// ⛔ THE ONE THING NO ROW STATES, and it is the head of this file's subject.
// ⛔ NOTHING IN docs/spec REQUIRES THE SHIPPED TEMPLATE TO CARRY A STORED
// PLACE. S-77 and S-78 default to `null`, OP-10 reads that `null` as 「人がまだ
// 場所を決めていない」 and accommodates it by name, and table T-226 says nothing
// about `documentSettings` at all. So the two cases under
// 「the stored place the shipped template ships」 below are driven by the
// ruling recorded for D-77 in docs/development-records/defects.md and NOT by a
// requirement -- they are marked as such where they stand, and the row that
// would have to exist is named there. Every OTHER case in this file is derived
// from a quoted row and holds whichever way that ruling lands.

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { specTable } from '../contract/spec-table'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { Document } from '../../src/entity/document-model/document/document'
import { dayOf, type Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptyScreenState } from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  groupDepthLimit,
  layoutFromSchedule,
  type ScheduleLayout,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import type { DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import {
  commandFromInput,
  type InputContext,
  type InputModifiers,
  type KeyInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { frameLoop } from '../../src/framework/single-html-shell/frame-loop'

// ---------------------------------------------------------------------------
// The artifact. FR-027 (MUST): 「テンプレートはバンドル済みの `GRS JSON` として
// 持つこと」, so it is read as the shipped bytes rather than rebuilt here.
// ---------------------------------------------------------------------------

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)

type Loose = Record<string, unknown>

const template = (): Document =>
  JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8')) as unknown as Document

const TEMPLATE = template()
const SETTINGS = TEMPLATE.documentSettings as DocumentSettings
const SCHEDULE = TEMPLATE.schedule as Schedule

const GROUPS = (SCHEDULE as unknown as Loose)['taskGroups'] as readonly Loose[]
const TASKS = (SCHEDULE as unknown as Loose)['tasks'] as readonly Loose[]

// ---------------------------------------------------------------------------
// The rows, read out of the manuscript at run time (Chapter 1.9, :275), so a
// re-ruled cell moves these cases instead of leaving a stale figure behind.
// ---------------------------------------------------------------------------

const rowOf = (tableId: string, rowId: string): Readonly<Record<string, string>> => {
  const found = specTable(tableId).rows.find((row) => row.id === rowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  return found.by
}

/** The first figure a cell writes. */
const firstNumberOf = (cell: string): number => {
  const hit = /[0-9]+(?:\.[0-9]+)?/.exec(cell)
  if (hit === null) throw new Error(`no figure in the cell: ${cell}`)
  return Number(hit[0])
}

const TP_8 = rowOf('T-226', 'TP-8')

// ---------------------------------------------------------------------------
// The two trees, walked out of the artifact. ⛔ Neither depth is typed here:
// both are counted from the document, and TP-8's own cell says what they owe.
// ---------------------------------------------------------------------------

/** Depth 1 is a root, which is the sense `RowPlacement.depth` publishes. */
function depthByParent(
  rows: readonly Loose[],
  keyOf: (row: Loose) => unknown,
  parentOf: (row: Loose) => unknown,
): number {
  const byKey = new Map<unknown, Loose>(
    rows.map((row): [unknown, Loose] => [keyOf(row), row]),
  )
  let deepest = 0
  for (const row of rows) {
    let depth = 1
    let walk: Loose | undefined = row
    // Bounded by the row count: IV-2 forbids a cycle, and a bound rather than
    // a trust makes a broken artifact fail here instead of hanging.
    while (walk !== undefined && depth <= rows.length) {
      const parent = parentOf(walk)
      if (parent === null || parent === undefined) break
      const above = byKey.get(parent)
      // ⛔ A parent that resolves to nothing would be an IV-2 break; counting it
      // as a level would hide that behind a depth one too deep.
      expect(above, `a parent reference resolves to no row: ${String(parent)}`).toBeDefined()
      walk = above
      depth += 1
    }
    deepest = Math.max(deepest, depth)
  }
  return deepest
}

const rowForestDepth = (): number =>
  depthByParent(GROUPS, (row) => row['id'], (row) => row['parentId'])

const wbsDepth = (): number =>
  depthByParent(TASKS, (row) => row['uid'], (row) => row['wbsParentUid'])

// ---------------------------------------------------------------------------
// One boot. A full-HD window: FR-051 has BO-1 settle the header height and the
// scrollbar thickness from the environment, so they are the host's to report
// and are given here as one.
//
// ⛔ NO CASE'S ANSWER IS A FIGURE OF THIS WINDOW. The depths drawn under
// FR-018 follow `zoomY` alone, and the one case that does depend on the Row
// Area re-measures it from these same regions rather than naming a height.
// ---------------------------------------------------------------------------

const SCREEN: ScreenEnvironment = {
  width: 1920,
  height: 1080,
  appHeaderHeight: 48,
  scrollbarThickness: 8,
}

const REGIONS: ScreenRegions = regionsFromScreen(SCREEN, SETTINGS)

/** What BO-5 of table T-077 put up, taken once -- the document has 1000 Tasks. */
const bootFrame = (() => {
  const painted: string[] = []
  const loop = frameLoop({ showSvg: (one: string) => painted.push(one) }, template(), SCREEN)
  const values = loop.current()
  if (values === null) throw new Error('BO-1 settled no size, so no frame was drawn')
  return { values, held: loop.document(), painted }
})()

const deepestDrawn = (layout: ScheduleLayout): number =>
  layout.rows.reduce((deepest, row) => Math.max(deepest, row.depth), 0)

const drawnDepths = (layout: ScheduleLayout): number[] =>
  [...new Set(layout.rows.map((row) => row.depth))].sort((a, b) => a - b)

// ---------------------------------------------------------------------------
// One press of the entrance SK-18 of table T-036 names, built the way
// `fr-055-fit-reaches-deep-tiers.test.ts` builds it: the answer FR-055 owes is
// read off the `CM-71` write, because the rule after table T-068 runs that
// table up to twice and no row says which component holds the loop.
// ---------------------------------------------------------------------------

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
/** SK-18 of table T-036 prints its key upper case, and so does this. */
const PRESS_F: KeyInput = { kind: 'key', key: 'F', modifiers: NO_MODS }

function fitWrite(settings: DocumentSettings): Record<string, unknown> {
  const layout = layoutFromSchedule(SCHEDULE, settings, REGIONS)
  const context = {
    document: { ...TEMPLATE, documentSettings: settings },
    layout,
    geometry: geometryFromLayout(SCHEDULE, settings, layout, REGIONS, emptySelection()),
    regions: REGIONS,
    screenState: emptyScreenState(),
    selection: emptySelection(),
    // S-53 arrives as a value; no case here reads it, so it is deliberately
    // not the figure the manuscript prints.
    zoomStep: 3,
    pressed: null,
    isTextEntryUnsettled: false,
    isDualCursorMode: false,
    today: '2026-04-01T00:00:00',
    newGroupId: 'row-minted-outside',
  } as unknown as InputContext

  const answer = commandFromInput(PRESS_F, context)
  const action = answer.action
  if (action === null || action.kind !== 'changeDocument') {
    throw new Error('SK-18 owes a changeDocument and this press did not ask for one')
  }
  const writes = (action.writes as readonly (readonly DocumentCommand[])[])
    .flat()
    .filter((one) => one.kind === 'fitScheduleToScreen')
  expect(writes, 'exactly one CM-71 per press (FR-031)').toHaveLength(1)
  return writes[0] as unknown as Record<string, unknown>
}

/**
 * The smallest `zoomY` at which FR-018 admits `depth`, found by bisecting the
 * published ladder between S-97 and S-98.
 *
 * ⭐ THE EXPRESSION IS NOT COPIED HERE. S-87's cell carries
 * `threshold(d) = base x ratio^(d - 2)` and `fr-055-vertical-fit.test.ts`
 * already checks the ladder against it; restating it would put the same claim
 * in two files. What this needs is only WHERE the rung is, and the ladder is
 * monotone in `zoomY` (S-88 above one, which that same file checks), so a
 * bisection finds it from the published answer alone.
 */
function rungOf(depth: number, settings: DocumentSettings): number {
  let below = NOT_STORED_ZOOM_BOUNDS['S-97']
  let above = NOT_STORED_ZOOM_BOUNDS['S-98']
  expect(groupDepthLimit({ ...settings, zoomY: above }), 'S-98 must admit the depth').toBeGreaterThanOrEqual(depth)
  expect(groupDepthLimit({ ...settings, zoomY: below }), 'S-97 must not').toBeLessThan(depth)
  for (let step = 0; step < 60; step++) {
    const middle = (below + above) / 2
    if (groupDepthLimit({ ...settings, zoomY: middle }) >= depth) above = middle
    else below = middle
  }
  return above
}

// ---------------------------------------------------------------------------
// 1. TP-8 of table T-226 -- the shipped document really is that deep on both
//    axes. Every case below is vacuous if this is not so.
// ---------------------------------------------------------------------------

describe('TP-8 of table T-226 -- the shipped template on both axes', () => {
  it('gives the row forest the number of levels the cell writes', () => {
    expect(rowForestDepth()).toBe(firstNumberOf(TP_8['値'] ?? ''))
  })

  it('gives the WBS the same number, which is what 「同じ ... に揃える」 asks', () => {
    // ⭐ 「行の深さと WBS の深さ」 -- two axes, and TP-8 levels them for THIS
    // document. 5.4 keeps them separate as a rule, which is why the case
    // compares the two counts rather than assuming one implies the other.
    expect(wbsDepth()).toBe(firstNumberOf(TP_8['値'] ?? ''))
    expect(wbsDepth()).toBe(rowForestDepth())
  })

  it('really does hang most Tasks off a WBS parent, so the second axis is not one level wearing five', () => {
    // ⛔ A document where five Tasks form one chain and the other 995 are roots
    // would satisfy the case above. What TP-8 means by an axis is that the
    // document is BUILT on it, so more Tasks carry a parent than do not.
    const parented = TASKS.filter((task) => task['wbsParentUid'] !== null).length
    expect(parented).toBeGreaterThan(TASKS.length - parented)
  })

  it('ships nothing collapsed and nothing hidden, so what is undrawn is FR-018 doing it', () => {
    // The premise of section 3. HR-1a of table T-015 takes a collapsed row's
    // children out of the drawing and HR-6 takes a hidden branch out, so either
    // one would remove rows the level of detail had nothing to do with.
    expect(GROUPS.filter((row) => row['isCollapsed'] === true)).toHaveLength(0)
    expect(GROUPS.filter((row) => row['isHidden'] === true)).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 2. The stored place the shipped template ships.
//
// ⛔ THESE TWO CASES REST ON A RULING, NOT ON A REQUIREMENT. No row of
// docs/spec requires the template to carry a place: S-77 and S-78 default to
// `null`, and OP-10 reads that `null` as 「人がまだ場所を決めていない」 and sends
// it to FR-055 -- which is a rule for it, not a complaint about it. The ruling
// is D-77 in docs/development-records/defects.md.
//
// ⭐ THE ROW THAT WOULD HAVE TO EXIST: table T-226 needs a row of its own --
// beside TP-1..TP-8, which today describe only the schedule -- saying that the
// template ships a stored view position, i.e. an `S-77` naming a day the
// document draws on and an `S-78` naming one of its own `TaskGroup.id`s, and
// saying why the template may speak for a person who has not chosen yet.
// Until it exists the two cases below assert the ruling and nothing more.
// ---------------------------------------------------------------------------

describe('the stored place the shipped template ships (D-77 ruling, no row yet)', () => {
  it('names a day, so the first half of OP-10 condition is not met at startup', () => {
    // OP-10: 「表示位置が `null`、または指す行が存在しないとき」. S-77 holds the
    // day the left edge points at.
    expect(SETTINGS.scrollDate).not.toBeNull()
    expect(dayOf(SETTINGS.scrollDate), 'S-77 holds a day, not free text').not.toBeNull()
  })

  it('names a row the document holds, so the second half is not met either', () => {
    // OP-10's other condition, 「指す行が存在しない」. S-78: 「表示の上端が指す
    // 行。⚠️ 整数ではない」 -- a `TaskGroup.id`.
    expect(SETTINGS.scrollGroupId).not.toBeNull()
    expect(GROUPS.map((row) => row['id'])).toContain(SETTINGS.scrollGroupId)
  })
})

// ---------------------------------------------------------------------------
// 3. What the first frame draws.
// ---------------------------------------------------------------------------

describe('FR-018 -- the depths the first frame of the shipped template draws', () => {
  it('draws rows deeper than the first level', () => {
    // ⭐ THE WHOLE POINT. OP-10 hands the view to FR-055 only while the stored
    // place is `null` or dangling; section 2 says it is neither, so BO-3 of
    // table T-077 -- 「見せ方の群から倍率と表示位置を読む」 -- reads the stored
    // `zoomY`, and FR-018 draws every depth that `zoomY` admits.
    // ⚠️ Section 1 has already ruled out HR-1a and HR-6 as the reason a row is
    // missing, so what is left is the level of detail.
    expect(deepestDrawn(bootFrame.values.layout)).toBeGreaterThan(1)
  })

  it('draws exactly the depths the ladder admits at the stored zoomY, and none deeper', () => {
    // FR-018 decides the depth from the zoom in force. Where the rungs stand is
    // `fr-055-vertical-fit.test.ts`; what this case adds is that the SHIPPED
    // document is drawn under them rather than under a zoom something else
    // chose.
    const admitted = groupDepthLimit(SETTINGS)
    expect(admitted, 'the ladder admits more than the first level at the stored zoom').toBeGreaterThan(1)

    const owed: number[] = []
    for (let depth = 1; depth <= Math.min(admitted, rowForestDepth()); depth++) owed.push(depth)
    expect(drawnDepths(bootFrame.values.layout)).toEqual(owed)
  })

  it('draws the left edge at the day S-77 stores, and one day at the width S-75 gives it', () => {
    // The horizontal half of the same claim. FR-017 makes one day
    // `pxPerDayAt1x` times `zoomX`; a fit would have replaced both this and the
    // origin day, which is what `uf-47-48.test.ts` measures on the null branch.
    expect(bootFrame.values.layout.originDay).toEqual(dayOf(SETTINGS.scrollDate))
    expect(bootFrame.values.layout.pxPerDay).toBe(SETTINGS.pxPerDayAt1x * SETTINGS.zoomX)
  })

  it('HF-8 (MUST NOT): boot discards nothing -- the shipped settings still say what they said', () => {
    // HF-8: 「起動のときは働かせてはならない（MUST NOT。表 T-024a の `OP-10`）」,
    // and OP-10 gives the reason: 「起動のたびに畳みを捨てると、`HR-6` が `WY-1`
    // のために保存させた状態が消える」. FR-051 puts OP-10 on the reading side, so
    // the document itself comes through a boot unedited either way.
    const held = bootFrame.held.documentSettings as DocumentSettings
    expect(held.scrollDate).toBe(SETTINGS.scrollDate)
    expect(held.scrollGroupId).toBe(SETTINGS.scrollGroupId)
    expect(held.zoomX).toBe(SETTINGS.zoomX)
    expect(held.zoomY).toBe(SETTINGS.zoomY)
    expect(
      (bootFrame.held.schedule as unknown as Loose)['taskGroups'] as readonly Loose[],
    ).toEqual(GROUPS)
  })
})

// ---------------------------------------------------------------------------
// 4. FR-055 is still there, and still answers the first level for this
//    document -- so the deeper picture above is the STORED place's doing and
//    not the fit's.
// ---------------------------------------------------------------------------

describe('FR-055 -- one press still answers the first level on this document', () => {
  it('has no second level to take: its drawing overruns the Row Area at its own rung', () => {
    // FR-055 (MUST): 「その文書が持つ最も深い段から順に見て、描くものが Row Area
    // に収まる最も深い段を採る」, and its MUST NOT keeps the zoom at or above
    // 「採った段を描ける最小の倍率」. So depth 2 is judged at depth 2's own rung.
    const rung = rungOf(2, SETTINGS)
    const drawn = layoutFromSchedule(SCHEDULE, { ...SETTINGS, zoomY: rung }, REGIONS)

    expect(deepestDrawn(drawn), 'the rung really does open the second level').toBe(2)
    expect(drawn.contentHeight).toBeGreaterThan(REGIONS.rowArea.height)
  })

  it('answers the first level, because it is the deepest one that fits', () => {
    // 「その文書が持つ最も深い段から順に見て、描くものが Row Area に収まる最も深
    // い段を採る」. The case above rules out 2, and every depth deeper than 2
    // draws MORE rows at a HIGHER rung (FR-018's monotonicity with S-88 above
    // one), so none of those fits either -- 1 is what is left.
    // ⚠️ NOT asserted here: what the landing `zoomY` is.
    // FR-018 keeps depth 1 out of the ladder's domain, so it has no rung and
    // FR-055's MUST NOT bounds the zoom from below only.
    const write = fitWrite(SETTINGS)
    const drawn = layoutFromSchedule(
      SCHEDULE,
      { ...SETTINGS, zoomY: write['zoomY'] as number },
      REGIONS,
    )

    expect(deepestDrawn(drawn)).toBe(1)
    // ⚠️ And the gap under it is allowed: 「画面の下に隙間が残ることは許す ——
    // 本要求は収めることを求めており、埋めることを求めていない」. So this case
    // says nothing about how much of the Row Area the answer uses.
  })

  it('so the fit and the stored place are two different pictures, which is why the place is what shows the depth', () => {
    // ⭐ The contrast D-77 turns on. Nothing here asks the fit to change: it is
    // answering FR-055 correctly on a document table T-226 deliberately makes
    // larger than the MC-7 scale GL-002 is judged at.
    const write = fitWrite(SETTINGS)
    const afterFit = layoutFromSchedule(
      SCHEDULE,
      { ...SETTINGS, zoomY: write['zoomY'] as number },
      REGIONS,
    )
    expect(deepestDrawn(afterFit)).toBeLessThan(deepestDrawn(bootFrame.values.layout))
  })
})

// What the SHIPPED startup template draws on its very first frame.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every row
// quoted below, and of `src/` only the published signatures of `frameLoop`,
// `layoutFromSchedule`, `groupDepthLimit`, `regionsFromScreen`, `dayOf` and
// `commandFromInput`. The shipped artifact
// `src/framework/single-html-shell/startup-template.json` (which FR-027 makes
// a document and not code) is read here as bytes, the way any GRS JSON is.
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
//            zoom and the place come from FR-055's fit (MUST), ⛔ EXCEPT for a
//            document opened from BT-4: 「表 T-034 の `BT-4`（起動テンプレート）
//            から開いた文書には働かせてはならない（MUST NOT）」, and then
//            「その文書が覆う最初の日と、行の木の先頭から描くこと（MUST）——
//            倍率は文書が持つものをそのまま使う」, with 「日も行 ID も新しく
//            持たせてはならない（MUST NOT）—— どちらも文書から導ける」, and
//            since 2026-08-29 the definition itself (MUST): 「「その文書が覆う
//            最初の日」とは、その文書の `Task` が持つ `start` と `actualStart`
//            のうち最も早い日のことである」 —— which is what
//            `TASK_DATE_COLUMNS` below now counts, and only that.
//   T-034    BT-4 -- 「初期表示用のテンプレート（`FR-027`）」, the third seat of
//            the boot order, and the one OP-10 excludes by name.
//   T-051    HF-8 -- 「起動のときは働かせてはならない（MUST NOT。表 T-024a の
//            `OP-10`）」.
//   T-068    LC-9 -- 「行を木の順に並べ、帯高と縦位置を決める」, and the rule
//            after that table: 「行を並べる順は木の順とすること（MUST）...
//            深さの順に並べてはならない（MUST NOT）—— ... 行が画面に収まり
//            きらないとき、上端に来るのが根ばかりになり、木を持つ文書が階層の
//            無い一覧に見える」.
//   T-077    BO-3 / BO-4 -- the boot reads the zoom and the place from the
//            display group, and 「`OP-10` に当たるときは、この 2 つを `BO-4` が
//            決める」.
//   T-201    S-1 `pxPerDayAt1x`, and T-203 S-75 `zoomX` -- the width of one day.
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
// ⭐ THE HEAD OF THIS FILE'S SUBJECT. The shipped template stores NO place --
// OP-10's own MUST NOT forbids giving it one -- and yet the first frame must
// still show the document's hierarchy. Two rows together make that so: OP-10's
// exclusion keeps the fit off the boot (the fit answers depth 1 on a document
// this large, which section 4 measures), and LC-9's tree order puts a row's
// children directly under it, so the first screenful is not seven roots. Every
// case below is derived from a quoted row.

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

/**
 * What BO-5 of table T-077 put up, taken once -- the document has 1000 Tasks.
 *
 * ⭐ `startedFromTemplate` is BT-4 of table T-034 being told to the boot. OP-10
 * excludes 「表 T-034 の `BT-4`（起動テンプレート）から開いた文書」 and nothing
 * else, so the boot cannot obey that MUST NOT without being told which seat of
 * table T-034 the document came from. ⚠️ It is the ONE thing this file says
 * about the shell's shape, and it is what BT-1 / BT-2 -- for which OP-10 is in
 * full force -- would leave unset.
 */
const bootFrame = (() => {
  const painted: string[] = []
  const loop = frameLoop(
    { showSvg: (one: string) => painted.push(one) },
    template(),
    SCREEN,
    undefined,
    undefined,
    undefined,
    undefined,
    true,
  )
  const values = loop.current()
  if (values === null) throw new Error('BO-1 settled no size, so no frame was drawn')
  return { values, held: loop.document(), painted }
})()

const deepestDrawn = (layout: ScheduleLayout): number =>
  layout.rows.reduce((deepest, row) => Math.max(deepest, row.depth), 0)

const drawnDepths = (layout: ScheduleLayout): number[] =>
  [...new Set(layout.rows.map((row) => row.depth))].sort((a, b) => a - b)

/**
 * 「その文書が覆う最初の日」, derived rather than stored -- which is what
 * OP-10's 「日も行 ID も新しく持たせてはならない（MUST NOT）—— どちらも文書から
 * 導ける」 says it must be.
 *
 * ⭐ TWO COLUMNS, AND THE ROW NAMES BOTH OF THEM. OP-10 (MUST, 利用者の裁定
 * 2026-08-29): 「「その文書が覆う最初の日」とは、その文書の `Task` が持つ `start`
 * と `actualStart` のうち最も早い日のことである」.
 * ⛔ THIS USED TO READ FIVE -- every date column `_assets/fig-erd-detail.md`
 * gives `Task` (`finish` / `actualFinish` / `resume` as well). That was a guess
 * made before the row said anything, and it went on passing because the shipped
 * template answers the same day either way; on a document whose `finish` or
 * `resume` stood before every `start`, it would have agreed with a tree
 * counting columns the row excludes.
 */
const TASK_DATE_COLUMNS = ['start', 'actualStart'] as const

const firstDayCovered = (): string => {
  const days: string[] = []
  for (const task of TASKS) {
    for (const column of TASK_DATE_COLUMNS) {
      const value = task[column]
      if (typeof value === 'string' && dayOf(value) !== null) days.push(value)
    }
  }
  expect(days.length, 'the template covers days at all').toBeGreaterThan(0)
  return days.reduce((earliest, one) => (one < earliest ? one : earliest))
}

/**
 * 「行の木の先頭」 -- the first row of LC-9's tree order, which is the root the
 * `AT-55` ascent puts first. ⛔ Not `GROUPS[0]`: the artifact's array order is
 * not a row of any table.
 */
const headOfRowTree = (): unknown => {
  const roots = GROUPS.filter((row) => row['parentId'] === null || row['parentId'] === undefined)
  expect(roots.length, 'TP-4 makes the top level a forest, so it has at least one root').toBeGreaterThan(0)
  const first = roots.reduce((earliest, one) =>
    (one['order'] as number) < (earliest['order'] as number) ? one : earliest,
  )
  return first['id']
}

/** The rows whose band meets the Row Area -- what a person sees on frame one. */
const rowsInFirstScreenful = (layout: ScheduleLayout) =>
  layout.rows.filter(
    (row) =>
      row.y < REGIONS.rowArea.y + REGIONS.rowArea.height && row.y + row.height > REGIONS.rowArea.y,
  )

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
// 2. The place the shipped template does NOT ship, and why that is the rule.
//
// ⭐ OP-10 forbids giving the template one: 「日も行 ID も新しく持たせては
// ならない（MUST NOT）—— どちらも文書から導ける」. So `S-77` and `S-78` stand at
// the `null` table T-203 gives them, the first half AND the second half of
// OP-10's condition are both met, and the row would fire -- except that the
// same row excludes a BT-4 document by name. ⚠️ THE EXCLUSION IS WHAT ACTS,
// not a place the artifact carries.
// ---------------------------------------------------------------------------

describe('OP-10 (MUST NOT) -- the template carries no place of its own', () => {
  it('ships no day, because OP-10 forbids giving it one', () => {
    // 「日も行 ID も新しく持たせてはならない（MUST NOT）」. S-77's own default in
    // table T-203 is `null`, and 「`null` は「人がまだ場所を決めていない」を表す」
    // -- which the template, that nobody has ever opened, is.
    expect(SETTINGS.scrollDate).toBeNull()
  })

  it('ships no row id either, for the same MUST NOT', () => {
    // S-78: 「表示の上端が指す行。⚠️ 整数ではない」 -- a `TaskGroup.id`, and the
    // template names none.
    expect(SETTINGS.scrollGroupId).toBeNull()
  })

  it('so both halves of OP-10 condition are met, and only the BT-4 exclusion keeps the fit off', () => {
    // ⭐ The premise of section 3. 「表示位置が `null`、または指す行が存在しない
    // とき」 is satisfied here, so without 「表 T-034 の `BT-4`（起動テンプレート）
    // から開いた文書には働かせてはならない（MUST NOT）」 every boot would land on
    // FR-055's fit -- and section 4 measures what that fit answers.
    expect(SETTINGS.scrollDate === null || SETTINGS.scrollGroupId === null).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 3. What the first frame draws.
// ---------------------------------------------------------------------------

describe('FR-018 -- the depths the first frame of the shipped template draws', () => {
  it('draws rows deeper than the first level', () => {
    // ⭐ THE WHOLE POINT. OP-10 does not hand a BT-4 document to FR-055:
    // 「起動テンプレートから開いた文書には働かせてはならない（MUST NOT）」, and
    // 「倍率は文書が持つものをそのまま使う」. So the `zoomY` in force is the one
    // BO-3 of table T-077 read out of the display group, and FR-018 draws every
    // depth that `zoomY` admits.
    // ⚠️ Section 1 has already ruled out HR-1a and HR-6 as the reason a row is
    // missing, so what is left is the level of detail.
    expect(deepestDrawn(bootFrame.values.layout)).toBeGreaterThan(1)
  })

  it('starts at the head of the row tree, drawn from the top of the Row Area', () => {
    // OP-10: 「その文書が覆う最初の日と、行の木の先頭から描くこと（MUST）」. The
    // head of the tree is the root LC-9's order reaches first, and 「から描く」
    // puts it at the top edge -- not scrolled past.
    const first = bootFrame.values.layout.rows[0]
    expect(first, 'the boot drew rows at all').toBeDefined()
    expect(first?.groupId).toBe(headOfRowTree())
    expect(first?.y).toBe(REGIONS.rowArea.y)
  })

  it('⭐ puts a row deeper than the first level into the FIRST SCREENFUL, not merely into the layout', () => {
    // ⭐ THE USER-VISIBLE CLAIM, and the reason LC-9 got its rule. The prose
    // after table T-068: 「深さの順に並べてはならない（MUST NOT）—— 同じ深さの行
    // が塊になり、親とその配下が画面の離れた場所に出る。行が画面に収まりきらない
    // とき、上端に来るのが根ばかりになり、木を持つ文書が階層の無い一覧に見える」.
    // TP-5 makes this document 100 rows, so it does NOT fit -- which is exactly
    // the condition that prose names.
    const drawn = bootFrame.values.layout
    expect(drawn.contentHeight, 'TP-5 keeps this document taller than the Row Area').toBeGreaterThan(
      REGIONS.rowArea.height,
    )

    const seen = rowsInFirstScreenful(drawn)
    expect(seen.length, 'the Row Area is not empty').toBeGreaterThan(0)
    expect(
      seen.reduce((deepest, row) => Math.max(deepest, row.depth), 0),
      'the first screenful is not seven roots',
    ).toBeGreaterThan(1)
  })

  it('⭐ and a parent stands directly above its own child there, which is what 「木の順」 means', () => {
    // 「親の行の直下にその配下を置き」. Measured on the rows a person actually
    // sees, so a tree order that only holds far down the document would fail.
    const seen = rowsInFirstScreenful(bootFrame.values.layout)
    const parentOf = new Map(GROUPS.map((row) => [row['id'], row['parentId']]))
    const pairs = seen.filter(
      (row, index) => index > 0 && parentOf.get(row.groupId) === seen[index - 1]?.groupId,
    )
    expect(pairs.length, 'no child follows its own parent in the first screenful').toBeGreaterThan(0)
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

  it('draws the left edge at the first day the document covers, and one day at the width S-1 x S-75 gives it', () => {
    // The horizontal half of the same claim. OP-10: 「その文書が覆う最初の日 ...
    // から描くこと（MUST）—— 倍率は文書が持つものをそのまま使う」, so the origin
    // is derived from the schedule (S-77 is `null`, section 2) and the width of
    // one day is still S-1 `pxPerDayAt1x` times S-75 `zoomX`.
    // ⛔ A fit would have replaced BOTH, which is what `uf-47-48.test.ts`
    // measures on the branch where OP-10 does run.
    expect(bootFrame.values.layout.originDay).toEqual(dayOf(firstDayCovered()))
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
//    document -- which is precisely what OP-10's BT-4 exclusion exists to keep
//    off the boot: 「その規模では収まる段が 1 つしか無く、階層を持つ文書が
//    「階層の無い文書」として初回に現れる」.
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

  it('so the fit and the BT-4 boot are two different pictures, which is why the exclusion is what shows the depth', () => {
    // ⭐ The contrast OP-10's exclusion turns on, measured. Nothing here asks
    // the fit to change: it is answering FR-055 correctly on a document table
    // T-226 deliberately makes larger than the MC-7 scale GL-002 is judged at
    // -- 「本テンプレートは表 T-025 の `MC-7` より行が多い」.
    const write = fitWrite(SETTINGS)
    const afterFit = layoutFromSchedule(
      SCHEDULE,
      { ...SETTINGS, zoomY: write['zoomY'] as number },
      REGIONS,
    )
    expect(deepestDrawn(afterFit)).toBeLessThan(deepestDrawn(bootFrame.values.layout))
  })
})

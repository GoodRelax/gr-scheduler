// Unit tests for what FR-055's whole-view fit MEASURES -- pass 1 of the rule
// printed after table T-068, and HF-8 of table T-051.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule
// below, the entity types the fixtures are built from, and of
// `input-command-translator.ts` only its published `InputContext` and the
// signature of `commandFromInput`. Every expected value here comes from a
// requirement or a table row, never from the implementation.
//
// The rows these cases answer to (rule 03: name the row, never copy its prose):
//   FR-055   the whole-view fit, and its RATIONALE's 「捨てないと…」
//   T-068    LC-1 / LC-2 / LC-9 and the two-pass rule printed after the table
//   T-051    HF-7 (collapse beats the level of detail), HF-8 (the fit discards
//            the collapse; 起動 MUST NOT), HF-10 (a different control)
//   T-015    HR-1a (a collapsed row's children are not drawn), HR-6 (a hidden
//            row's are not, and the hidden state is saved)
//   T-024a   OP-10 -- startup asks FR-055 for the zoom and the place and
//            forbids HF-8 there
//   T-038    what the drawn extent counts
//   FR-031   one press, two writes, in an order that MUST NOT be swapped
//   T-108    CM-71 `fitScheduleToScreen` / CM-72 `resetTaskGroupTreeStates` / CM-86
//   T-036    SK-18 (`F`) -- the entrance these cases press
//
// ⭐ THE TWO `FINDING` CASES NOW PASS. They were left failing because the fit
// measured the picture the author had folded instead of the whole; the wave
// that gave `fitZoom` its `Schedule` argument closed that, and the press now
// discards the fold (HF-8) before it measures. The word FINDING is kept in
// their names only so the history reads straight -- ⚠️ they are ordinary green
// cases now, and the next hand may rename them.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  fitZoom,
  layoutFromSchedule,
  type ScheduleLayout,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  NOT_STORED_ZOOM_BOUNDS,
  type DocumentCommand,
} from '../../src/use-case/edit-document/edit-document'
import {
  NOT_STORED_ZOOM_STEP,
  commandFromInput,
  type InputContext,
  type InputModifiers,
  type KeyInput,
  type TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { specTable, unbroken } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// Settings and screen. Every key not pinned here comes from SETTINGS_DEFAULTS,
// which `npm run gen` prints from the manuscript.
// ---------------------------------------------------------------------------

/** The four keys SETTINGS_DEFAULTS carries under dotted names, as objects. */
const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontScaleSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...NESTED, ...part }) as unknown as DocumentSettings

const SETTINGS = settingsOf({
  scrollDate: '2026-01-01', // S-77, pinned so the time axis has an origin
  scrollGroupId: 'p1', // S-78
  stackDirection: 'down', // S-58, pinned so every y reads from the top
  rulerHeight: 48, // S-2
  rulerFont: 12, // S-3
})

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const REGIONS = regionsFromScreen(ENV, SETTINGS)

// ---------------------------------------------------------------------------
// A schedule with two depths, so that collapsing the top rows really does take
// rows and dates out of the drawing.
//
// ⚠️ HR-1a (MUST NOT) 「畳んだ `TaskGroup` の配下の行と、その行に載っている
// `Task` を描いてはならない」 and forbids re-parenting them onto the parent
// row -- so the collapsed picture is genuinely shorter AND narrower, and pass 1
// of the two-pass rule would measure a different whole if it read it.
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86400000
const dayAfter = (from: string, days: number): string =>
  new Date(new Date(`${from}T00:00:00Z`).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10)

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

const spanning = (uid: number, from: string, days: number): Task =>
  taskOf({ uid, start: from, finish: dayAfter(from, days) })

const groupOf = (part: Record<string, unknown>): Record<string, unknown> => ({
  parentId: null,
  label: null,
  derivedFromTaskUid: null,
  treeState: 'auto',
  color: null,
  height: null,
  ...part,
})

const PARENT_IDS = ['p1', 'p2', 'p3'] as const

/**
 * Three root rows, each holding two children.
 *
 * The root rows carry a short `Task` in January; every child carries a long one
 * in the middle of the year. So a collapse takes both axes of table T-038's
 * extent down at once -- six rows of height and five months of width.
 *
 * `collapsed` and `hidden` name the root rows whose column is set to `true`.
 */
const scheduleOf = (
  part: {
    readonly collapsed?: readonly string[]
    readonly hidden?: readonly string[]
  } = {},
): Schedule => {
  const collapsed = new Set(part.collapsed ?? [])
  const hidden = new Set(part.hidden ?? [])

  const roots = PARENT_IDS.map((id, index) =>
    groupOf({
      id,
      order: index,
      treeState: hidden.has(id) ? 'hidden' : collapsed.has(id) ? 'collapsed' : 'auto',
    }),
  )
  const children = PARENT_IDS.flatMap((id, index) =>
    [0, 1].map((oneNode) => groupOf({ id: `${id}-c${oneNode}`, parentId: id, order: index * 2 + oneNode })),
  )

  // uid 1..3 on the roots, 10.. on the children.
  // FR-018 draws every Task on a drawn row whatever its width (CR-552), so the
  // spans only need to be long enough to give the measurement a real extent.
  const rootTasks = PARENT_IDS.map((_id, index) => spanning(index + 1, '2026-01-05', 20))
  const childTasks = PARENT_IDS.flatMap((_id, index) =>
    [0, 1].map((oneNode) => spanning(10 + index * 2 + oneNode, '2026-05-01', 45)),
  )

  return {
    project: {
      calendarUid: null,
      statusDate: null,
      themeHue: 214,
      title: null,
      uidHighWaterMark: 100,
    },
    calendars: [],
    tasks: [...rootTasks, ...childTasks],
    resources: [],
    assignments: [],
    taskGroups: [...roots, ...children],
    taskGroupMembers: [
      ...PARENT_IDS.map((id, index) => ({ groupId: id, taskUid: index + 1 })),
      ...PARENT_IDS.flatMap((id, index) =>
        [0, 1].map((oneNode) => ({ groupId: `${id}-c${oneNode}`, taskUid: 10 + index * 2 + oneNode })),
      ),
    ],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  } as unknown as Schedule
}

const documentOf = (schedule: Schedule, settings: DocumentSettings = SETTINGS): Document =>
  ({
    schemaVersion: '1',
    schedule,
    documentSettings: settings,
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-26T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedUtc: '2026-08-26T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

// ---------------------------------------------------------------------------
// One frame, built the way ADR-001 has the shell build it: the layout and the
// geometry come from the document that is actually on screen.
// ---------------------------------------------------------------------------

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const keyOf = (key: string): KeyInput => ({ kind: 'key', key, modifiers: NO_MODS })

type Frame = {
  readonly context: InputContext
  readonly layout: ScheduleLayout
  /** ⚠️ `fitZoom` takes the `Schedule`, not the layout, since CR-264. */
  readonly schedule: Schedule
}

const frameOf = (schedule: Schedule, settings: DocumentSettings = SETTINGS): Frame => {
  const layout = layoutFromSchedule(schedule, settings, REGIONS)
  return {
    layout,
    schedule,
    context: {
      document: documentOf(schedule, settings),
      layout,
      geometry: geometryFromLayout(schedule, settings, layout, REGIONS, emptySelection()),
      regions: REGIONS,
      screen: emptyScreenSession.screen,
      selection: emptySelection(),
      // S-53 arrives as a value. Deliberately not the figure the manuscript
      // prints: no case here reads it.
      zoomStep: 3,
      // S-54 / S-55 arrive as values for the same reason. No case here reads
      // them either: they are the range CM-71 clamps its write into.
      zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
      zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
      pressed: null,
      isTextEntryUnsettled: false,
      // table T-023's closing rule -- no surface stands over these cases.
      isSurfaceStanding: false,
      // DC-1 of table T-029a puts both dates down on the way in, so 「in the mode」
      // and 「which side follows」 are one value, not two that could disagree.
      dualCursorFollowing: null,
      today: '2026-03-01T00:00:00',
      newGroupId: 'row-minted-outside',
      newCommentBoxId: 'comment-box-minted-outside',
      newHighlightBoxId: 'highlight-box-minted-outside',
    },
  }
}

function writesOf(answer: TranslatedInput): readonly (readonly DocumentCommand[])[] {
  const action = answer.action
  if (action === null || action.kind !== 'changeDocument') {
    throw new Error('SK-18 owes a changeDocument and this input did not ask for one')
  }
  return action.writes
}

/** The zoom CM-71 would be written with, for the frame given. */
function fittedZoom(frame: Frame): { readonly zoomX: number; readonly zoomY: number } {
  const commands = writesOf(commandFromInput(keyOf('F'), frame.context)).flat()
  const fit = commands.filter((one) => one.kind === 'fitScheduleToScreen')
  expect(fit, 'exactly one CM-71 per press').toHaveLength(1)
  const one = fit[0] as unknown as Record<string, unknown>
  return { zoomX: one['zoomX'] as number, zoomY: one['zoomY'] as number }
}

// ---------------------------------------------------------------------------

const PLAIN = frameOf(scheduleOf())
const FOLDED = frameOf(scheduleOf({ collapsed: [...PARENT_IDS] }))
const HIDDEN = frameOf(scheduleOf({ hidden: ['p2'] }))
const HIDDEN_AND_FOLDED = frameOf(
  scheduleOf({ hidden: ['p2'], collapsed: [...PARENT_IDS] }),
)
const LEVEL_ZERO_FOLDED = frameOf(scheduleOf(), settingsOf({ ...SETTINGS, levelZeroTreeState: 'collapsed' }))

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const HF_8_BY_T_328 = '人が全体表示（`FR-055`）を求めたとき、行と段 0 の値を `_assets/tbl-state-machines.md` の 表 T-328 の `fitPressed` の行と根の升に従って戻すこと（MUST）'
const FR_018_ONLY_T_328 = '⭐ 値を書き換える入口と先の値は、段 0 の畳み（`_assets/tbl-settings.md` の 表 T-203 の `S-418`）を含めて、`_assets/tbl-state-machines.md` の 表 T-328 に従うこと（MUST） —— 同表に無い操作で値を書き換えてはならない（MUST NOT）'
const FR_031_FIT_TWO_WRITES = '全体表示の 1 回の押下は、2 つの書き込みに分けて行うこと（MUST）。順序を入れ替えてはならない（MUST NOT）'
const UN_14_LEVEL_ZERO_SAME_STEP = '⭐ 段 0 の畳み（`S-418`）は見せ方の群の鍵だが、同じ押下が書く行の木の状態と同じ段に入れること（MUST）'

describe('the manuscript these cases are driven by', () => {
  it.each([HF_8_BY_T_328, FR_018_ONLY_T_328, FR_031_FIT_TWO_WRITES, UN_14_LEVEL_ZERO_SAME_STEP])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe('the fixture these cases are driven by', () => {
  it('draws every row when nothing is folded, so LC-2 is not what removes them', () => {
    // 表 T-005a's group LOD is driven by zoomY, and this fixture sits at unity,
    // so the depth-2 rows are drawn. If they were not, the case below would
    // pass for a reason that has nothing to do with HF-8.
    expect(PLAIN.layout.rows).toHaveLength(PARENT_IDS.length * 3)
  })

  it('HR-1a really takes the children out of the collapsed drawing', () => {
    expect(FOLDED.layout.rows).toHaveLength(PARENT_IDS.length)
    expect(FOLDED.layout.contentHeight).toBeLessThan(PLAIN.layout.contentHeight)
    expect(FOLDED.layout.contentWidth).toBeLessThan(PLAIN.layout.contentWidth)
    // ⛔ ...and the folded picture is still a picture. A folded document whose
    // extent had fallen to zero would take FR-055's empty-document arm
    // (「描くものが 1 つも無い文書では、倍率を等倍に戻し」) and the case below
    // would be about that arm instead of about HF-8.
    expect(FOLDED.layout.contentWidth).toBeGreaterThan(0)
    expect(FOLDED.layout.placements).toHaveLength(PARENT_IDS.length)
    expect(PLAIN.layout.placements).toHaveLength(PARENT_IDS.length * 3)
  })

  it('HR-6 really takes a hidden branch out of the drawing', () => {
    expect(HIDDEN.layout.rows).toHaveLength((PARENT_IDS.length - 1) * 3)
  })
})

describe('FR-055 -- what the fit measures', () => {
  // see FR-055, HF-8, T-068, DFC-25
  // WHY: the fold is discarded BEFORE the measurement, so two documents that differ only in
  // what the author folded are one whole; asserted on the CM-71 write, not on the drawing.
  it('FINDING: a folded document and an unfolded one are fitted to the same zoom', () => {
    const plain = fittedZoom(PLAIN)
    const folded = fittedZoom(FOLDED)
    expect(folded.zoomY).toBeCloseTo(plain.zoomY, 10)
    expect(folded.zoomX).toBeCloseTo(plain.zoomX, 10)
  })

  // see HF-8, HR-6, WY-1
  it('FINDING: HF-8 returns every value but hidden to auto, so a hidden branch stays out of both measurements', () => {
    const hidden = fittedZoom(HIDDEN)
    expect(fittedZoom(HIDDEN_AND_FOLDED).zoomY).toBeCloseTo(hidden.zoomY, 10)
    expect(fittedZoom(HIDDEN_AND_FOLDED).zoomX).toBeCloseTo(hidden.zoomX, 10)
    // WHY: hiding moves the whole table T-038 measures, which makes the equality above a
    // statement about the fold alone; the zoom itself may land on one depth (CR-264).
    expect(HIDDEN.layout.rows.length).toBeLessThan(PLAIN.layout.rows.length)
    expect(HIDDEN.layout.contentHeight).toBeLessThan(PLAIN.layout.contentHeight)
  })

  // see FR-055, T-328, S-418
  it(`${HF_8_BY_T_328} -- a folded level zero is opened before the measurement, so it fits like the plain one`, () => {
    expect(LEVEL_ZERO_FOLDED.layout.rows, 'premise: TD-1 draws nothing').toHaveLength(0)
    const plain = fittedZoom(PLAIN)
    const folded = fittedZoom(LEVEL_ZERO_FOLDED)
    expect(folded.zoomY).toBeCloseTo(plain.zoomY, 10)
    expect(folded.zoomX).toBeCloseTo(plain.zoomX, 10)
  })

  // see FR-031, CM-71, CM-72, CM-86, UN-8, UN-17
  it(`${FR_031_FIT_TWO_WRITES} -- CM-71 first, then the tree values`, () => {
    const allowed = ['resetTaskGroupTreeStates', 'setLevelZeroTreeState']
    for (const frame of [FOLDED, LEVEL_ZERO_FOLDED]) {
      const writes = writesOf(commandFromInput(keyOf('F'), frame.context))
      expect(writes).toHaveLength(2)
      expect(writes[0]!.map((one) => one.kind)).toEqual(['fitScheduleToScreen'])
      const second = writes[1]!.map((one) => one as unknown as Record<string, unknown>)
      expect(second.map((one) => one['kind'])).toContain('resetTaskGroupTreeStates')
      for (const one of second) expect(allowed, FR_018_ONLY_T_328).toContain(one['kind'])
    }
    const levelZero = writesOf(commandFromInput(keyOf('F'), LEVEL_ZERO_FOLDED.context))[1]!
      .map((one) => one as unknown as Record<string, unknown>)
      .find((one) => one['kind'] === 'setLevelZeroTreeState')
    expect(levelZero?.['levelZeroTreeState'], UN_14_LEVEL_ZERO_SAME_STEP).toBe('auto')
  })
})

/**
 * The three zoom values table T-206 keeps out of the document (S-96 / S-97 /
 * S-98). `fitZoom` takes them as an argument, so no figure is re-typed here.
 */
const NOT_STORED_ZOOM = {
  step: NOT_STORED_ZOOM_STEP['S-96'],
  min: NOT_STORED_ZOOM_BOUNDS['S-97'],
  max: NOT_STORED_ZOOM_BOUNDS['S-98'],
}

describe('PI-5 `fitZoom` -- the measurement itself stays a function of the document it is handed', () => {
  // ⛔ OP-10 OF TABLE T-024a IS WHY THIS MATTERS. On startup with a null or
  // dangling position the reader must show 「`FR-055` の全体表示が選ぶ倍率と
  // 表示位置」 and 「このとき `HF-8` を働かせてはならない（MUST NOT）」, because
  // 「起動のたびに畳みを捨てると、`HR-6` が `WY-1` のために保存させた状態が
  // 消える」. BO-3 / BO-4 of table T-077 send startup through the same
  // measurement as the F key.
  //
  // ⭐ So the discard belongs to the CALLER that FR-055's press runs through,
  // never to the measurement both callers share. A fix that moved HF-8 inside
  // this function would fit the startup picture to a whole the startup screen
  // is not drawing.
  // ⚠️ SINCE CR-264 THE ARGUMENT IS THE `Schedule`, not the layout: FR-055's
  // vertical now chooses a depth, and the rule after table T-068 has that
  // choice run LC-1..LC-9 itself, over more than one depth and more than one
  // zoom. So the seam is handed the document and re-lays it out. The claim this
  // block makes is unchanged by that -- what it names is the seam's INPUT, and
  // the input still carries the fold.
  it('answers from the document given, so a folded document and an unfolded one differ here', () => {
    const plain = fitZoom(PLAIN.schedule, SETTINGS, REGIONS, NOT_STORED_ZOOM)
    const folded = fitZoom(FOLDED.schedule, SETTINGS, REGIONS, NOT_STORED_ZOOM)
    expect(folded.zoomY).not.toBeCloseTo(plain.zoomY, 6)
  })

  // see FR-055, S-332
  it('divides the Row Area less the S-332 margin on each side by the drawn width, and leaves the vertical its gap', () => {
    // Stated as the relation rather than as a figure, so re-ruling the screen or the fixture moves it.
    const margin = Number(specTable('T-206').rows.find((one) => one.id === 'S-332')?.by['既定'])
    expect(margin).toBeGreaterThan(0)
    const fit = fitZoom(PLAIN.schedule, SETTINGS, REGIONS, NOT_STORED_ZOOM)
    expect((fit.zoomX / SETTINGS.zoomX) * PLAIN.layout.contentWidth).toBeCloseTo(
      REGIONS.rowArea.width * (1 - 2 * margin),
      6,
    )
    // ⛔ THE VERTICAL HALF OF THIS CASE ASSERTED THE OPPOSITE OF THE REQUIREMENT
    // and was replaced. It read `zoomY × contentHeight ≈ rowArea.height` -- the
    // continuous ratio -- and FR-055 now says 「縦は、倍率を縮めて合わせるので
    // はなく、表示量（グループ LOD の深さ）を選んで合わせること（MUST）」 and
    // 「⚠️ 画面の下に隙間が残ることは許す —— 本要求は収めることを求めており、
    // 埋めることを求めていない」. All the vertical owes here is that what gets
    // drawn at the answered zoom does fit. Which depth it lands on, and the
    // rung it lands at, are asserted in tests/unit/fr-055-vertical-lod-fit.test.ts.
    const drawn = layoutFromSchedule(
      PLAIN.schedule,
      settingsOf({ ...SETTINGS, zoomX: fit.zoomX, zoomY: fit.zoomY }),
      REGIONS,
    )
    expect(drawn.contentHeight).toBeLessThanOrEqual(REGIONS.rowArea.height)
  })
})

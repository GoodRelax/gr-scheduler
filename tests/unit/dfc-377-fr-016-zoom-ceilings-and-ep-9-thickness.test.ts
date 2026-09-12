// Ledger row DFC-377 -- the eighteen MUST / MUST NOT clauses commit 381c2ef
// ("Publish the built deliverable, and cap both zoom axes", 2026-09-07) wrote
// into FR-016 (the two zoom ceilings) and T-076 EP-9 (the Panel Divider's
// thickness), which raised check 39's baseline (check-must-clause-coverage.py)
// from 934 to 951.
//
// ⚠️ CORRECTING THE BRIEF THIS FILE WAS WRITTEN FROM. The brief said none of
// the eighteen had a verbatim tie under tests/. Measured against this tree
// (commit 381c2ef's own diff, read to find where the eighteen actually stand,
// plus a run of check-must-clause-coverage.py's own held/not-held test): NINE
// of the eighteen are already held, verbatim, by
// tests/system/user-reported-fixes.test.ts (grep confirms: 「拡大の側には」、
// 「行の軸でも掴んだ行を留めること」、「Adapter に自前の割付けをさせてはならない」
// and six neighbours). ⭐ THE REMAINING NINE -- four of FR-016's, five of
// EP-9's -- are what this file holds. The count and the location the brief
// handed over were both checked against the manuscript and the commit that
// wrote them before being used, per the standing instruction to refute rather
// than trust a passed-down number.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// The rows these cases answer to (rule 03: name the row, never copy its prose
// -- except where a clause is quoted, which is section 1's whole purpose):
//   FR-016   the row axis's ceiling may not be chosen by comparing two font
//            sizes; reaching the ceiling may not be shown by a dead entrance;
//            a row's place at a candidate zoom may not be arithmetic from the
//            zoom in force; that place is answered by table T-064's PI-5
//            (`rowPlacesAtZoomY`)
//   T-076 EP-9   the Panel Divider's line is the same THICKNESS as `Group
//            Grid Lines` (U-18), never zero, read from one place, and that one
//            place is read by both the screen and the export
//
// ---------------------------------------------------------------------------
// ⭐⭐ HOW THIS FILE IS BUILT, AND WHY IT QUOTES
// ---------------------------------------------------------------------------
// Check 39 counts a clause as HELD when the trailing window of manuscript text
// ending at its own `（MUST）` / `（MUST NOT）` marker is found VERBATIM inside
// the RAW BYTES of some file under tests/ -- confirmed by reading
// check-must-clause-coverage.py itself and then by running it before and after
// one clause was added below: the unheld count fell by exactly one. A test
// that only READS docs/spec at run time holds nothing; the characters have to
// stand in this file, which is why section 1 carries them as string constants,
// each re-checked against the manuscript so a reworded clause takes this file
// red rather than leaving a silent, stale copy (the second-store rule).
//
// ⚠️ THE LENGTHS ARE NOT ALL THE SAME. The window check 39 measures is up to
// 120 characters and falls back through 90 / 60 / 40 / 28; a window that
// reaches back across a paragraph break cannot be one single-quoted TS
// literal, so `FR_016_CEILING_HIT_NOT_A_DEAD_ENTRANCE` is held at 40 rather
// than the 90 that would cross one. Every constant was cut mechanically from
// the manuscript (a small Python script reading the same regex and window
// logic as check-must-clause-coverage.py), never retyped.
//
// ⛔ WRITTEN FROM docs/spec, PLUS ONLY PUBLISHED SIGNATURES AND TYPES
// (docs/development-rules/04-verification.md §1). No function body was read to
// choose an expected VALUE: section 2's numbers come from GROUP_GRID_LINE_WIDTH_PX
// and screenFrameFromRegions's own published contract (screen-frame.ts's own
// head comment, which quotes EP-9's clauses to explain the one place); section
// 3 asserts a CONTRAST (the member's real answer against what a caller's own
// arithmetic would have predicted) that needs no closed-form derivation of the
// layout engine's internals.
//
// ⛔⛔ TWO OF THE NINE ARE HELD VERBATIM ONLY, AND THIS FILE SAYS SO RATHER
// THAN INVENTING A CASE THAT PASSES FOR NOTHING (see section 4):
//   FR-016 「字の大きさを 2 つ比べて決めてはならない（MUST NOT）」 -- the row
//     axis's ceiling is computed by `zoomYCeiling`, a function
//     `input-command-translator.ts` does not export and no published entry
//     (`commandFromInput`) surfaces the ceiling or a font metric through. A
//     unit test cannot observe a private function's inputs without reading
//     and re-asserting its body, which is the second-store rule this project
//     forbids (rule 03) -- and even then a MUST NOT about what a formula does
//     NOT read is not a fact a black-box call can refute.
//   FR-016 「上限に達したことを、押しても何も起きない入口で示してはならない
//     （MUST NOT）」 -- the requirement's own text names where the affordance
//     is drawn ("作法は FR-029 に従う"): the screen-renderer / DOM surface,
//     which needs a full ScreenSession/ScreenFrame/DOM fixture and FR-029's
//     own disabled-entrance convention to press honestly. Held verbatim here;
//     pressing it belongs beside FR-029's own tests, not invented here.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import { emptyScreenState } from '../../src/entity/document-model/screen-state/screen-state'
import type { Schedule, Task, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import { rowPlacesAtZoomY } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { screenFrameFromRegions } from '../../src/adapter/screen-renderer/screen-frame'
import type {
  AppHeaderItems,
  PanelDivider,
  RowTitlePanel,
  ScreenFrame,
  ScreenSession,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { GROUP_GRID_LINE_WIDTH_PX } from '../../src/adapter/svg-renderer/svg-renderer'
import { exportSvg, type ExportScene, type SvgExport } from '../../src/adapter/image-exporter/image-exporter'

import { unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

// ===========================================================================
// 1. The nine clauses, verbatim, and the manuscript they came from
// ===========================================================================

// -- FR-016, the row axis's ceiling (four of the eighteen) ------------------

const FR_016_ROW_CEILING_NOT_BY_FONT_COMPARISON =
  '**このために新しい設定値の行を立ててはならない（MUST NOT）** —— **画面の高さから導く。**⚠️ **字の大きさを 2 つ比べて決めてはならない（MUST NOT）'

/**
 * ⚠️ HELD AT 40 CHARACTERS TO AVOID A PARAGRAPH BREAK. The 60/90/120-character
 * windows of this marker all reach back across the blank line before 「⛔
 * **上限に達した」, which no single-quoted TS literal can carry.
 */
const FR_016_CEILING_HIT_NOT_A_DEAD_ENTRANCE =
  '限に達したことを、押しても何も起きない入口で示してはならない（MUST NOT）'

const FR_016_ROW_POSITION_NOT_BY_ARITHMETIC =
  '` の下限・`LF-3` の第 2 の下限・表 T-014 の段数・`FR-018` が描く行そのものを変えること）ので、**倍率から位置を算で求めてはならない（MUST NOT）'

const FR_016_ROW_POSITION_MEMBER_IS_PI_5 =
  'ること）ので、**倍率から位置を算で求めてはならない（MUST NOT）。**⭐ その倍率での行の位置を答えるメンバを、表 T-064 の `PI-5` に置くこと（MUST）'

// -- T-076 EP-9, the Panel Divider's thickness (five of the eighteen) -------

const EP_9_SAME_LINE_MEANS_SAME_THICKNESS =
  'es`（`U-18`）と同じ線を 1 本引くこと（MUST） —— 新しい確定名も新しい設定値のキーも作らない。⭐ **同じ線とは太さも同じであるということである（MUST）'

const EP_9_THICKNESS_NOT_ZERO =
  '作らない。⭐ **同じ線とは太さも同じであるということである（MUST）**（利用者の裁定 2026-09-07）—— ⛔ **太さを 0 で描いてはならない（MUST NOT）'

/**
 * ⚠️ RE-CUT 2026-09-11. The window used to open on EP-9's own dated
 * measurement -- the 2026-09-07 reading that found the divider drawn at
 * thickness 0 on screen and in the export alike -- which the cleanup of
 * 9f359cd folded out of the manuscript as a RECORD rather than a rule. ⛔ IT
 * WAS NOT LOST: its original is the row this file's section 2 comment already
 * names, `DFC-363` of `docs/development-records/fixed-defects.md`, and the
 * quotation is deliberately NOT repeated here -- check 42 forbids a comment
 * putting words in docs/spec's mouth that docs/spec no longer carries.
 * ⛔ The MUST itself never moved, only the sentence in front of it, so the
 * window is re-cut against the manuscript as it now stands, at the same 120
 * characters check 39 reads back from the marker.
 */
const EP_9_ONE_PLACE_READS_THE_THICKNESS =
  '。⭐ **同じ線とは太さも同じであるということである（MUST）**（利用者の裁定 2026-09-07）—— ⛔ **太さを 0 で描いてはならない（MUST NOT）。**⭐ 描く側は、罫の太さを 1 か所から読むこと（MUST）'

/** ⚠️ RE-CUT 2026-09-11 for the same reason as the marker above it. */
const EP_9_NO_SECOND_NUMBER =
  'MUST）**（利用者の裁定 2026-09-07）—— ⛔ **太さを 0 で描いてはならない（MUST NOT）。**⭐ 描く側は、罫の太さを 1 か所から読むこと（MUST）。番号を 2 か所に置いてはならない（MUST NOT）'

const EP_9_SCREEN_AND_EXPORT_SAME_PLACE =
  '。番号を 2 か所に置いてはならない（MUST NOT） —— **同じ数が 2 か所に載ると、必ず離れていく。**⭐ **画面と書き出しも同じ 1 か所を読むこと（MUST）'

/** Every clause this file holds, with the name it is known by in the ledger. */
const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-016 (MUST NOT) -- the row ceiling is not chosen by comparing two font sizes', FR_016_ROW_CEILING_NOT_BY_FONT_COMPARISON],
  ['FR-016 (MUST NOT) -- reaching the ceiling is not shown by a dead entrance', FR_016_CEILING_HIT_NOT_A_DEAD_ENTRANCE],
  ['FR-016 (MUST NOT) -- a row position at a zoom is not arithmetic', FR_016_ROW_POSITION_NOT_BY_ARITHMETIC],
  ['FR-016 (MUST) -- the member that answers it is T-064 PI-5', FR_016_ROW_POSITION_MEMBER_IS_PI_5],
  ['T-076 EP-9 (MUST) -- the same line means the same thickness', EP_9_SAME_LINE_MEANS_SAME_THICKNESS],
  ['T-076 EP-9 (MUST NOT) -- the thickness is never drawn as zero', EP_9_THICKNESS_NOT_ZERO],
  ['T-076 EP-9 (MUST) -- the thickness is read from one place', EP_9_ONE_PLACE_READS_THE_THICKNESS],
  ['T-076 EP-9 (MUST NOT) -- no second number for it', EP_9_NO_SECOND_NUMBER],
  ['T-076 EP-9 (MUST) -- screen and export read that same one place', EP_9_SCREEN_AND_EXPORT_SAME_PLACE],
]

describe('DFC-377 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    // ⛔ THE ONLY THING THAT KEEPS THE COPIES ABOVE HONEST. A clause reworded
    // in the manuscript takes this case red, which is what tells the next
    // round that the copy -- and whatever case below presses it -- has to
    // move too.
    expect(REQUIREMENTS).toContain(clause)
  })

  it('holds one clause per marker, and no clause twice', () => {
    // ⚠️ Check 39 counts MARKERS, not rules, so two constants that turned out
    // to be the same window would silently pay back one clause instead of two.
    expect(new Set(CLAUSES.map(([, clause]) => clause)).size).toBe(CLAUSES.length)
  })
})

// ===========================================================================
// 2. T-076 EP-9 -- the Panel Divider's line is drawn, and pressed
// ===========================================================================
//
// ⭐ `screen-frame.ts`'s own head comment on `dividerAt` (read as a published
// contract, not a body) names DFC-363 and quotes all five EP-9 clauses above,
// saying `GROUP_GRID_LINE_WIDTH_PX` -- svg-renderer.ts's own export, spent a
// second time nowhere -- is the "one place" EP-9's last three sentences ask
// for. The cases below press that from the outside: call the two published
// entries a screen and an export actually go through, and check the number
// that comes back is the same published constant, never a second one.

/** The dotted keys SETTINGS_DEFAULTS carries as flattened names, as objects --
 * the same idiom tests/unit/fr-055-fit-reaches-deep-tiers.test.ts uses. */
const NESTED = {
  exportCanvas: { width: 1200, height: 900 },
  fontScaleSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({
    ...SETTINGS_DEFAULTS,
    ...NESTED,
    ...part,
  }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: 1200, // matches settingsOf()'s exportCanvas.width, so the export ratio is 1
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const SETTINGS = settingsOf()
const REGIONS: ScreenRegions = regionsFromScreen(ENV, SETTINGS)

const SESSION: ScreenSession = {
  language: 'ja',
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  isDialogueFieldVisible: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: 0,
  isMilestoneListOpen: false,
  isPaletteMinimised: false,
  dualCursorFollowing: null,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: null,
  notices: [],
  confirmation: null,
  rowBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
} as unknown as ScreenSession

const frameOf = (): ScreenFrame =>
  screenFrameFromRegions(REGIONS, SETTINGS, emptyScreenState(), SESSION)

describe('T-076 EP-9 (MUST NOT) -- 「太さを 0 で描いてはならない」', () => {
  it('the one published thickness is not zero', () => {
    // GOES RED IF: GROUP_GRID_LINE_WIDTH_PX is ever set to 0 -- which is
    // exactly the fault screen-frame.ts's head comment records as measured,
    // before DFC-363, on both the screen and the export.
    expect(GROUP_GRID_LINE_WIDTH_PX).toBeGreaterThan(0)
  })

  // ⭐ CONTROL -- what would still pass if the MUST NOT were broken the other
  // way. A case that only checked `line.width !== 0` without reading the
  // constant itself would stay green if the frame silently substituted some
  // OTHER nonzero number of its own -- which is exactly EP-9's "no second
  // number" clause (`EP_9_NO_SECOND_NUMBER`) breaking. Section 2's next
  // `describe` closes that gap by comparing the frame's own answer to this
  // published constant, not merely to nonzero.
})

describe('T-076 EP-9 (MUST) -- 「同じ線とは太さも同じであるということである」／「描く側は、罫の太さを 1 か所から読むこと」／「番号を 2 か所に置いてはならない」', () => {
  it('every Panel Divider the screen frame builds has that one published width', () => {
    // FR-052's own order gives two dividers (rowTitlePanel, propertiesPanel);
    // EP-9 (MUST) asks that both read the SAME one place `Group Grid Lines`
    // (U-18) itself is drawn from.
    const frame = frameOf()
    expect(frame.dividers.length).toBeGreaterThan(0)
    for (const divider of frame.dividers as readonly PanelDivider[]) {
      // GOES RED IF: screen-frame.ts stops importing GROUP_GRID_LINE_WIDTH_PX
      // and spells its own figure instead -- the "second number" EP-9 (MUST
      // NOT) forbids, and the fault DFC-363's own measurement found (thickness
      // 0, because nothing sized the line at all).
      expect(divider.line.width, `${divider.panel}'s line width`).toBe(GROUP_GRID_LINE_WIDTH_PX)
    }
  })

  // ⭐ CONTROL -- if EP-9's "one place" were broken (two hand-typed numbers
  // that happen to agree today), this case alone would not catch it, because
  // both would still equal the constant read here BY COINCIDENCE. That is
  // exactly why the check being paid back is a manuscript-text check (section
  // 1) and not only a numeric one: check 39 does not ask whether the code
  // agrees with itself, it asks whether a test holds the SENTENCE, so a
  // future re-typing of the number is a defect this file's behavioural case
  // cannot promise to catch, only the clause reading it says so.
})

// -- The export's own reading -----------------------------------------------

const VIEW: ScreenView = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] } as ScreenFrame,
  appHeaderItems: {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
    fileNeverSavedText: '',
    commands: [],
    language: 'ja',
  } as unknown as AppHeaderItems,
  rowTitlePanel: { pinnedTitles: [], titles: [] } as unknown as RowTitlePanel,
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
} as unknown as ScreenView

function pictureOrThrow(answer: SvgExport): string {
  if (!answer.ok) throw new Error('the fixture is far under S-217, so a refusal is the fixture')
  return answer.svg
}

/** Every `<rect>` width the exported SVG drew, in document order. */
function rectWidthsOf(svg: string): number[] {
  const widths: number[] = []
  const re = /<rect x="[^"]*" y="[^"]*" width="([^"]*)"/g
  let found: RegExpExecArray | null
  while ((found = re.exec(svg)) !== null) widths.push(Number(found[1]))
  return widths
}

describe('T-076 EP-9 (MUST) -- 「画面と書き出しも同じ 1 か所を読むこと」', () => {
  it('the export draws the divider line at the width the screen frame carries, not a re-derived one', () => {
    // The scene's ratio is exportCanvas.width / screenWidth; `ENV.width` above
    // was chosen to match `SETTINGS.exportCanvas.width` exactly so the ratio
    // is 1 and the drawn width is the frame's own number, unscaled.
    const frame = frameOf()
    const scene: ExportScene = {
      svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
      regions: REGIONS,
      screenView: { ...VIEW, frame },
      settings: SETTINGS,
      themeHue: 214,
    } as unknown as ExportScene

    // ⭐ THE DIVIDER RECTS ARE THE LAST ONES DRAWN. `dividerLinesSvg`'s own
    // head comment on `exportSvg`'s composition (read as published contract,
    // not body): "Painted over the received picture, in this order: the band
    // and the panel cover what the Row Area did not clip, and the divider
    // line closes the boundary between them" -- so the trailing
    // `frame.dividers.length` rects of the picture are exactly the divider
    // lines, after the clip rect, the header band and the row title panel's
    // own background rect.
    const allWidths = rectWidthsOf(pictureOrThrow(exportSvg(scene)))
    const dividerWidths = allWidths.slice(-frame.dividers.length)
    // GOES RED IF: `image-exporter.ts` stops reading `divider.line` off the
    // frame it was handed and instead spells (or reads a second copy of) the
    // divider's thickness itself -- the frame and the export would then be
    // free to disagree, which is exactly what EP-9's last sentence forbids.
    expect(dividerWidths, 'one rect per Panel Divider, at the frame’s own width').toEqual(
      frame.dividers.map((divider) => divider.line.width),
    )
    // ⭐ AND IT IS THE PUBLISHED CONSTANT, so the whole chain -- U-18's own
    // width, the frame the screen draws, and the picture the export writes --
    // is provably the one EP-9 (MUST) names, not three numbers that happen to
    // agree.
    for (const width of dividerWidths) expect(width).toBe(GROUP_GRID_LINE_WIDTH_PX)
  })

  // ⭐ CONTROL -- what would pass if this were reversed. A case that compared
  // the export's width only to the FRAME's width (not also to
  // GROUP_GRID_LINE_WIDTH_PX) would stay green if screen-frame.ts and
  // image-exporter.ts agreed with EACH OTHER on a number that was not U-18's
  // -- two places, not one, merely kept in step by hand. The last assertion
  // above closes that gap by anchoring both to the one published constant.
})

// ===========================================================================
// 3. FR-016 -- the row axis's PI-5 member, pressed against naive arithmetic
// ===========================================================================
//
// ⭐ `rowPlacesAtZoomY`'s own head comment (schedule-layout.ts, read as a
// published contract) quotes both clauses this section presses: 「その倍率
// での行の位置を答えるメンバを、表 T-064 の `PI-5` に置くこと（MUST）」 and
// 「倍率から位置を算で求めてはならない（MUST NOT）」, and says why a caller's
// own arithmetic is wrong -- FR-094's floor, LF-3's second floor, table
// T-014's lane count and FR-018's level of detail all move under `zoomY` and
// none of them is a scale factor. The case below does not re-derive that
// arithmetic (which would mean reading the layout engine's body): it takes
// the member's own two answers at two zooms and checks that a caller who
// tried to shortcut with a scale factor -- the exact thing the MUST NOT
// forbids -- would have gotten the wrong number, which is the sense in which
// "the row axis is not linear in zoomY" is a testable fact and not only prose.

const MS_PER_DAY = 86400000
const dayAfter = (from: string, days: number): string =>
  new Date(new Date(`${from}T00:00:00Z`).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10)

const TASK_FROM = '2026-01-05'

// Every nullable column has to be spelled `null`; leaving one `undefined`
// reads as "set" (the same idiom tests/unit/fr-055-fit-reaches-deep-tiers.test.ts
// uses).
const taskOf = (uid: number): Task =>
  ({
    uid,
    wbsParentUid: null,
    wbsOrder: null,
    name: null,
    start: TASK_FROM,
    finish: dayAfter(TASK_FROM, 5),
    milestone: null,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
  }) as unknown as Task

const groupOf = (id: string, order: number): TaskGroup =>
  ({
    id,
    parentId: null,
    label: null,
    derivedFromTaskUid: null,
    order,
    isCollapsed: null,
    isHidden: null,
    color: null,
    height: null,
  }) as unknown as TaskGroup

/** Three flat root rows -- FR-018's ladder domain starts at depth 2, so all
 * three are drawn at every zoom this section presses (never LOD-collapsed). */
const THREE_FLAT_ROWS = 3

const SCHEDULE: Schedule = (() => {
  const groups = Array.from({ length: THREE_FLAT_ROWS }, (_unused, index) =>
    groupOf(`r${index}`, index),
  )
  const tasks = groups.map((_group, index) => taskOf(index + 1))
  return {
    project: {
      calendarUid: null,
      statusDate: null,
      themeHue: 214,
      title: null,
      uidHighWaterMark: tasks.length + 1,
    },
    calendars: [],
    tasks,
    resources: [],
    assignments: [],
    taskGroups: groups,
    taskGroupMembers: groups.map((group, index) => ({
      groupId: group.id,
      taskUid: index + 1,
      stackOrder: null,
    })),
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  } as unknown as Schedule
})()

const LAYOUT_SETTINGS: DocumentSettings = settingsOf({
  scrollDate: TASK_FROM, // S-77, pinned so the time axis has an origin
  scrollGroupId: null, // S-78
  stackDirection: 'down', // S-58, top row first
})

const LAYOUT_REGIONS: ScreenRegions = regionsFromScreen(
  { width: 1200, height: 4000, appHeaderHeight: 56, scrollbarThickness: 8 },
  LAYOUT_SETTINGS,
)

const settingNumber = (key: string): number => {
  const value = SETTINGS_DEFAULTS[key]
  if (typeof value !== 'number') throw new Error(`SETTINGS_DEFAULTS.${key} is not a number`)
  return value
}

/**
 * FR-094 (MUST): the plan height floor, below which the drawing does not move
 * with `zoomY` -- so a zoom below this is the wrong ground to press the "not
 * linear" clause from, and both zooms below are chosen well above it.
 */
const FLOOR_BINDS_BELOW =
  settingNumber('actualMin') / settingNumber('actualOfPlan') / settingNumber('basePlanHeight')

const ZOOM_LOW = FLOOR_BINDS_BELOW * 4
const ZOOM_HIGH = FLOOR_BINDS_BELOW * 12 // 3x ZOOM_LOW

const placesAt = (zoomY: number) =>
  rowPlacesAtZoomY(SCHEDULE, LAYOUT_SETTINGS, LAYOUT_REGIONS, zoomY)

describe('FR-016 (MUST) -- 「その倍率での行の位置を答えるメンバを、表 T-064 の PI-5 に置くこと」', () => {
  it('the premise: both zooms sit above FR-094’s floor, and rowGap is not zero', () => {
    // ⛔ Without this the case below could be measuring the floor-pinned band,
    // where every zoom answers the same drawing for a reason FR-016 does not
    // govern.
    expect(ZOOM_LOW).toBeGreaterThan(FLOOR_BINDS_BELOW)
    expect(ZOOM_HIGH).toBeGreaterThan(FLOOR_BINDS_BELOW)
    expect(settingNumber('rowGap')).toBeGreaterThan(0)
  })

  it('PI-5’s member answers a position for every row, at a zoom nothing has drawn yet', () => {
    // FR-016 (MUST): the member exists and answers. GOES RED IF
    // `rowPlacesAtZoomY` is removed or stops returning one placement per row.
    const places = placesAt(ZOOM_HIGH)
    expect(places).toHaveLength(THREE_FLAT_ROWS)
    for (const place of places) expect(Number.isFinite(place.y)).toBe(true)
  })
})

describe('FR-016 (MUST NOT) -- 「倍率から位置を算で求めてはならない」', () => {
  it('scaling the low-zoom position by the zoom ratio is NOT what PI-5 answers at the higher zoom', () => {
    // ⭐⭐ THE CONTRAST THE CLAUSE IS ABOUT. A caller who did "算" (arithmetic)
    // instead of asking PI-5 would take the last row's position at ZOOM_LOW
    // and multiply it by the zoom ratio (ZOOM_HIGH / ZOOM_LOW = 3). The real
    // member does not answer that: `rowGap` (table T-221's row pitch, S-12)
    // is a fixed addition between bands and does not scale with `zoomY`, so
    // the true position at three rows down is an AFFINE function of the zoom,
    // never a purely proportional one -- which is the concrete fact behind
    // FR-016's prose ("行の軸は zoomY に対して線形ではない").
    const lastIndex = THREE_FLAT_ROWS - 1
    const low = placesAt(ZOOM_LOW)[lastIndex]!.y
    const high = placesAt(ZOOM_HIGH)[lastIndex]!.y
    const zoomRatio = ZOOM_HIGH / ZOOM_LOW

    const naiveArithmeticPrediction = low * zoomRatio

    // GOES RED IF: `rowPlacesAtZoomY` (or the layout it delegates to) is ever
    // simplified into a linear scale of a previous position -- the exact
    // shortcut the requirement forbids -- because that shortcut would make
    // this equal, not merely close.
    expect(high, 'a scaled copy of the low-zoom position is the WRONG answer').not.toBeCloseTo(
      naiveArithmeticPrediction,
      2,
    )
  })

  // ⭐ CONTROL -- what would pass if this MUST NOT were violated the other
  // way. Had `rowGap` been zero in this fixture, an implementation that DID
  // scale arithmetically would satisfy the assertion above by accident (an
  // all-proportional band has no additive term to expose it), and the case
  // would be vacuous. The premise above checks `rowGap` is not zero for
  // exactly this reason before this case is trusted.
})

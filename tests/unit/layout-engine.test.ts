// Unit tests for the layoutEngine units of wave W2.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by whoever implemented the unit.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import {
  emptySelection,
  selectionWith,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import {
  dateAtX,
  fitZoom,
  groupDepthLimit,
  layoutFromSchedule,
  rulerTierOf,
  StackSafetyCapReached,
  taskPlacement,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  geometryFromLayout,
  type BarGeometry,
  type Path,
  type ScheduleGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  itemAtPointer,
  itemsInMarquee,
  type PointerSlop,
} from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import {
  regionAtPointer,
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import { NOT_STORED_ZOOM_STEP } from '../../src/adapter/input-command-translator/input-command-translator'
import { specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// 表 T-221 の `LF-3` / 表 T-051 の `HF-19` -- the second floor under a band
// (MUST, 利用者の裁定 2026-09-03, CR-339 + CR-342, ledger row D-225).
//
//   `LF-3`  「**帯高は矩形が縦に取る高さを下回らず、かつ、その行の操作子（表 T-051
//           の `HF-1` の格子）が縦に取る高さも下回らない**」
//   `HF-19` 「**`HF-1` の格子が縦に取る高さは、行の帯高の下限であること（MUST）。
//           行の帯がそれを下回ってはならない（MUST NOT）**」
//
// ⛔ THE ROWS STATE NO NUMBER: 「⚠️ **床を数で書かない** —— 操作子 1 つの外形は
// `_assets/tbl-settings.md` の 表 T-206 の `S-138` と `S-141` が決めており、格子は
// その 2 段ぶんである。⛔ **同表の値を写してはならない。**」 So it is composed here:
// `FR-029` (MUST) draws a glyph in a box of `S-138` a side and keeps at least
// `S-141` between that box and the entrance's frame, once on each side, and
// 表 T-051 の `HF-1` (MUST) stacks the four controls 「2 × 2 の格子」.
// ⇒ floor = 2 × (S-138 + S-141 × 2), read out of the manuscript at run time.
//
// ⚠️ AND IT IS A CONSTANT: 「⛔⛔ **この床を閲覧者の文字サイズに追随させてはならない
// （MUST NOT）**」 (`HF-19`), so it does not move with `zoomY` the way the bands
// it is compared against do.
// ---------------------------------------------------------------------------

/** The px figure one row of 表 T-206 prints in its 既定 column. */
const settingsTablePx = (id: string): number => {
  const row = specTable('T-206').rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-206 has no row ${id}`)
  const found = /-?\d+(?:\.\d+)?/.exec(row.by['既定'] ?? '')
  if (found === null) throw new Error(`table T-206 row ${id} states no number in 既定`)
  return Number(found[0])
}

/** One control's outer height: the glyph box, plus FR-029's gap on each side. */
const ONE_CONTROL_TALL = settingsTablePx('S-138') + settingsTablePx('S-141') * 2

/** `HF-1`'s 2 x 2 lattice -- the floor `LF-3` and `HF-19` put under every band. */
const CONTROL_LATTICE_FLOOR = ONE_CONTROL_TALL * 2

// A whole DocumentSettings is 97 keys. A case states the ones it deliberately
// pins -- values chosen to make the sums easy to check -- and every other key
// comes from SETTINGS_DEFAULTS, which is generated from the manuscript
// (CR-175). ⚠️ Before that a case re-typed the specification's own defaults,
// so moving `minShapeWidth` from 2 to 6 changed nothing here and 671 tests
// stayed green while the fixture quietly disagreed with the specification.
const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

/**
 * One generated default, read as the number it is. `SETTINGS_DEFAULTS` is
 * published as `Record<string, unknown>`, so the kind is checked here rather
 * than assumed -- a key that stopped being a number would otherwise reach an
 * arithmetic expression as `NaN` and leave the case green for the wrong reason.
 */
const settingNumber = (key: string): number => {
  const value = SETTINGS_DEFAULTS[key]
  if (typeof value !== 'number') throw new Error(`SETTINGS_DEFAULTS.${key} is not a number`)
  return value
}

/** The four (or six) corners of a bar table T-012 draws as an outline. */
const outlinePoints = (bar: BarGeometry | null): Path => {
  if (bar === null || bar.form !== 'outline') throw new Error('this bar is not an outline')
  return bar.points
}

/** The `line` arm of `BarGeometry` -- SH-3's head and SH-4's two ends. */
const lineBar = (bar: BarGeometry | null): Extract<BarGeometry, { form: 'line' }> => {
  if (bar === null || bar.form !== 'line') throw new Error('this bar is not a line')
  return bar
}

/**
 * How wide these cases hold the properties panel OPEN.
 *
 * ⚠️ STATED HERE, NOT INHERITED. S-80's default is the CLOSED panel, and a
 * panel of no width leaves FR-052 with nothing to subtract for it and
 * `regionAtPointer` with no properties panel any point can land on -- so these
 * cases open it. ⛔ Not a value of the specification: S-80 says in as many words that
 * no row fixes the width an open panel takes, so this number is this file's own
 * and is never asserted as anyone else's.
 */
const PROPERTY_PANEL_OPEN = 300

/** The five keys regionsFromScreen reads, at values that make the sums easy to check. */
const SETTINGS = settingsOf({
  rulerHeight: 48, // S-2
  propertyPanelWidth: PROPERTY_PANEL_OPEN, // S-80, open -- see above
})

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8, // half of the 17px Windows draws, per FR-051
}

describe('ScreenRegions (PI-35)', () => {
  it('FR-051 caps the measured header at appHeaderMaxHeight', () => {
    const tall = regionsFromScreen({ ...ENV, appHeaderHeight: 80 }, SETTINGS)
    expect(tall.appHeader.height).toBe(56)
    // The canvas takes whatever the capped header leaves.
    expect(tall.scheduleCanvas).toEqual({ x: 0, y: 56, width: 1000, height: 644 })
  })

  it('leaves a header shorter than the cap alone', () => {
    const short = regionsFromScreen({ ...ENV, appHeaderHeight: 40 }, SETTINGS)
    expect(short.appHeader.height).toBe(40)
    expect(short.scheduleCanvas.y).toBe(40)
  })

  it('FR-052 takes the padding, both panels and the vertical scrollbar off the Row Area width', () => {
    // ⛔ THE SUM IS WRITTEN OUT, NOT ANSWERED WITH A NUMBER. FR-052 names the
    // four things taken off the Schedule Canvas' width -- `canvasPadding`, the
    // two panel widths and the vertical scrollbar -- and two of the four reach
    // this case as generated defaults. A typed total would say nothing about
    // which of the four is missing when it moved, and would go stale the day
    // the manuscript moves one, as this line's did.
    expect(regionsFromScreen(ENV, SETTINGS).rowArea.width).toBe(
      ENV.width -
        settingNumber('canvasPadding') -
        settingNumber('rowTitlePanelWidth') -
        PROPERTY_PANEL_OPEN -
        ENV.scrollbarThickness,
    )
  })

  it('U-50 puts the Row Area inside the Row Title Panel and below the ruler band', () => {
    // ⛔ THE LEFT EDGE IS WRITTEN AS THE RELATION, NOT AS A NUMBER. `U-50` of
    // `_assets/tbl-glossary.md`: 「左右は `Row Title Panel` と `Properties
    // Panel` の内側」, so the Row Area begins where the Row Title Panel ends --
    // and that width is `S-79` (`rowTitlePanelWidth`), read from the generated
    // defaults the way the FR-052 case above reads it. ⚠️ A typed 170 stood
    // here until 2026-09-04 and went stale the day the manuscript raised `S-79`
    // to 200 (`docs/spec/_source/settings.json`, `S-79`: 「⭐⭐ **2026-09-03 に
    // 170 から 200 へ上げた**（利用者の裁定）—— **深さ 5 の掴み代が操作子に覆わ
    // れないことから決めた。**」).
    const { rowArea } = regionsFromScreen(ENV, SETTINGS)
    expect(rowArea.x).toBe(settingNumber('rowTitlePanelWidth'))
    expect(rowArea.y).toBe(56 + 48)
  })

  it('takes the ruler band, the padding and the horizontal scrollbar off the Row Area height', () => {
    // 644 canvas - 48 band - 10 padding - 8 scrollbar.
    expect(regionsFromScreen(ENV, SETTINGS).rowArea.height).toBe(578)
  })

  it('leaves exactly the padding and the scrollbar between the Row Area and what follows it', () => {
    const r = regionsFromScreen(ENV, SETTINGS)
    const rightGap = r.propertiesPanel.x - (r.rowArea.x + r.rowArea.width)
    const bottomGap =
      r.scheduleCanvas.y + r.scheduleCanvas.height - (r.rowArea.y + r.rowArea.height)
    expect(rightGap).toBe(10 + 8)
    expect(bottomGap).toBe(10 + 8)
  })

  it('gives the Row Title Panel the whole canvas height, so it owns the corner under the ruler', () => {
    // ⛔ The width is `S-79` read from the generated defaults, never typed --
    // see the U-50 case above. The three numbers that ARE typed are this file's
    // own fixture: ENV's header (56) and the canvas height it leaves (644).
    const r = regionsFromScreen(ENV, SETTINGS)
    expect(r.rowTitlePanel).toEqual({
      x: 0,
      y: 56,
      width: settingNumber('rowTitlePanelWidth'),
      height: 644,
    })
    expect(regionAtPointer(r, 50, 60)).toBe('rowTitlePanel')
  })

  it('SC-2 spans the Time Ruler across the Row Area, not across the panels', () => {
    // SC-2 of table T-031: the ruler follows the schedule sideways, so its
    // horizontal span IS the Row Area's -- written as that relation rather than
    // as a total, which is what left this case holding a stale one. Vertically
    // it stands in the band under the App Header, and the two numbers that fix
    // that are the ones ENV and SETTINGS state above.
    const r = regionsFromScreen(ENV, SETTINGS)
    expect(r.timeRuler).toEqual({
      x: r.rowArea.x,
      y: ENV.appHeaderHeight,
      width: r.rowArea.width,
      height: 48,
    })
    // ⛔ "not across the panels" is the half the relation alone cannot make: a
    // ruler spanning the whole window would agree with a Row Area that did too.
    expect(r.timeRuler.width).toBeLessThan(ENV.width)
    expect(r.timeRuler.x).toBeGreaterThan(0)
  })

  it('FR-052 reports a width of zero or less rather than clamping it', () => {
    const wide = settingsOf({ ...SETTINGS, rowTitlePanelWidth: 600, propertyPanelWidth: 400 })
    // 1000 - 10 - 600 - 400 - 8 is negative, and that IS the answer FR-052 tests.
    expect(regionsFromScreen(ENV, wide).rowArea.width).toBeLessThanOrEqual(0)
  })

  it('answers with the innermost region a point falls in', () => {
    const r = regionsFromScreen(ENV, SETTINGS)
    expect(regionAtPointer(r, 200, 200)).toBe('rowArea')
    expect(regionAtPointer(r, 200, 60)).toBe('timeRuler')
    expect(regionAtPointer(r, 50, 200)).toBe('rowTitlePanel')
    expect(regionAtPointer(r, 800, 200)).toBe('propertiesPanel')
    expect(regionAtPointer(r, 500, 10)).toBe('appHeader')
  })

  it('treats every region as half-open, so an edge belongs to what comes next', () => {
    const r = regionsFromScreen(ENV, SETTINGS)
    // The Row Area's own corner is inside it.
    expect(regionAtPointer(r, r.rowArea.x, r.rowArea.y)).toBe('rowArea')
    // ⛔ Its right edge is NOT, and the edge is asked for by name rather than
    // by a sum: the lane past it belongs to the padding and the scrollbar,
    // which fall through to the canvas.
    expect(regionAtPointer(r, r.rowArea.x + r.rowArea.width, r.rowArea.y)).toBe('scheduleCanvas')
    // The same on the other axis, so half-open is claimed of both.
    expect(regionAtPointer(r, r.rowArea.x, r.rowArea.y + r.rowArea.height)).toBe('scheduleCanvas')
  })

  it('falls through to the canvas in the padding and the scrollbar lanes', () => {
    const r = regionsFromScreen(ENV, SETTINGS)
    // The middle of the lane FR-052 leaves between the Row Area and the panel
    // that follows it -- `canvasPadding` plus the vertical scrollbar, neither
    // of which is a region of its own.
    const rightLane = (r.rowArea.x + r.rowArea.width + r.propertiesPanel.x) / 2
    expect(regionAtPointer(r, rightLane, 200)).toBe('scheduleCanvas')
    expect(regionAtPointer(r, 400, 690)).toBe('scheduleCanvas')
  })

  it('returns null outside the window', () => {
    const r = regionsFromScreen(ENV, SETTINGS)
    expect(regionAtPointer(r, 1200, 200)).toBeNull()
    expect(regionAtPointer(r, 200, -1)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// ScheduleLayout (PI-5) -- table T-068's LC-1 to LC-9.
// ---------------------------------------------------------------------------

/** The keys layoutFromSchedule reads, at their table T-201 / T-205 values. */
const LAYOUT_SETTINGS = settingsOf({
  rulerHeight: 48,
  scrollDate: '2026-01-01', // S-77
  rulerFont: 12, // S-3
  // ⚠️ S-58 defaults to 'up'; these cases pin 'down' so every y below reads
  // from the top of the band. The 'up' half of ST-5 has its own cases.
  stackDirection: 'down', // S-58
  shapeHeightOf: { rectangle: 1, chevron: 1, arrow: 0.5, endpointSpan: 0.5, milestone: 1.5 },
})

const REGIONS = regionsFromScreen(ENV, LAYOUT_SETTINGS)

// The three zoom values table T-206 keeps out of the document (S-96 / S-97 /
// S-98), which `fitZoom` now takes as an argument rather than typing them
// itself. Read from the generated constants, never re-typed (rule 03).
const NOT_STORED_ZOOM = {
  step: NOT_STORED_ZOOM_STEP['S-96'],
  min: NOT_STORED_ZOOM_BOUNDS['S-97'],
  max: NOT_STORED_ZOOM_BOUNDS['S-98'],
}

// ⚠️ Every nullable column table T-019a reads has to be spelled `null` here.
// Leaving one `undefined` reads as "set" -- `actualFinish` undefined made
// planActualState answer PS-2 for a task that had never finished.
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

// ⚠️ `project` and `calendars` are not optional padding: DR-2 makes both part
// of the schedule group, and FR-054 has layoutFromSchedule resolve the
// document's one calendar through them. Naming no calendar is what sends
// workingCalendarOf to table T-209's default, which is what these cases want.
const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null },
    calendars: [],
    tasks: [],
    // FR-059 walks these two for OC-2's assignee label, so the template names
    // them as `Schedule` declares them. Empty is the ordinary state here.
    resources: [],
    assignments: [],
    taskGroups: [],
    taskGroupMembers: [],
    taskVisuals: [],
    highlightBoxes: [],
    commentBoxes: [],
    ...part,
  }) as unknown as Schedule

/** One root row holding the tasks given, each a member of it. */
const oneRow = (tasks: readonly Task[], group: Record<string, unknown> = {}): Schedule =>
  scheduleOf({
    tasks,
    taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null, ...group }],
    taskGroupMembers: tasks.map((drawnText) => ({ groupId: 'g1', taskUid: drawnText.uid })),
  })

/** A task starting on `from` and running `days`. At zoomX 1 one day is 6px. */
const spanning = (uid: number, from: string, days: number, part: Record<string, unknown> = {}): Task => {
  const finish = new Date(new Date(from + 'T00:00:00Z').getTime() + days * 86400000)
  return taskOf({ uid, start: from, finish: finish.toISOString().slice(0, 10), ...part })
}

describe('ScheduleLayout (PI-5) -- the time axis', () => {
  it('FR-017 makes one day pxPerDayAt1x times zoomX', () => {
    expect(layoutFromSchedule(oneRow([]), LAYOUT_SETTINGS, REGIONS).pxPerDay).toBe(6)
    const zoomed = settingsOf({ ...LAYOUT_SETTINGS, zoomX: 3 })
    expect(layoutFromSchedule(oneRow([]), zoomed, REGIONS).pxPerDay).toBe(18)
  })

  // FR-017: 「しきい値は表 T-205 のしきい値の行（`S-83` 〜 `S-85`）に従うこと」。
  // The three arrive through SETTINGS_DEFAULTS, which `npm run gen` prints from
  // the manuscript, so a re-ruled threshold moves the two cases below with it.
  // ⚠️ The figures were typed in here until 2026-08-26, and re-ruling `S-85`
  // from 30 to 8 left one of them asserting a number that had stopped being a
  // boundary at all -- green, and no longer testing what its name claimed.
  const T_205_TIERS = [
    { row: 'S-83', key: 'rulerTierPxPerDayMonth', tier: 'yearMonth', below: 'year' },
    { row: 'S-84', key: 'rulerTierPxPerDayWeek', tier: 'yearMonthWeek', below: 'yearMonth' },
    { row: 'S-85', key: 'rulerTierPxPerDayDay', tier: 'yearMonthDayWeekday', below: 'yearMonthWeek' },
  ] as const

  /** The four steps, coarsest first, so a case can say "no finer than". */
  const TIER_ORDER: readonly string[] = ['year', 'yearMonth', 'yearMonthWeek', 'yearMonthDayWeekday']

  it('FR-017 steps the ruler through its four tiers', () => {
    // FR-017: 判定式は 「`pxPerDay ÷ (実効フォントサイズ ÷ `S-8`) ≧ しきい値`」。
    // LAYOUT_SETTINGS pins `rulerFont` at S-8's own figure, so the ratio is one
    // here and a px/day stands for its own scaled value.
    const scale = LAYOUT_SETTINGS.rulerFont / settingNumber('fontMin')
    expect(rulerTierOf(0, LAYOUT_SETTINGS)).toBe('year')
    for (const step of T_205_TIERS) {
      const threshold = settingNumber(step.key) * scale
      // 「≧ しきい値」 -- the step is reached AT its own threshold ...
      expect(rulerTierOf(threshold, LAYOUT_SETTINGS), step.row).toBe(step.tier)
      // ... and 「単調であること（MUST）」 keeps the coarser step just below it.
      expect(rulerTierOf(threshold * 0.999, LAYOUT_SETTINGS), step.row).toBe(step.below)
    }
  })

  it('FR-017 cancels the text scale first, so the three thresholds stay fixed', () => {
    // FR-017: 「しきい値は目盛のフォントが 12px であるときの px/day であり、判定は
    // 実効フォントサイズを 12 で割った比で行うこと（MUST）」, and 「しきい値の 3 本は
    // 固定値とし、実行時に導出してはならない（MUST NOT）」. So doubling the ruler
    // font doubles the px/day at which each of the three is reached, while
    // S-83 〜 S-85 themselves do not move.
    const rulerFont = settingNumber('fontMin') * 2
    const larger = settingsOf({ ...LAYOUT_SETTINGS, rulerFont })
    const scale = rulerFont / settingNumber('fontMin')
    for (const step of T_205_TIERS) {
      const threshold = settingNumber(step.key) * scale
      expect(rulerTierOf(threshold, larger), step.row).toBe(step.tier)
      expect(rulerTierOf(threshold * 0.999, larger), step.row).toBe(step.below)
      // The very same px/day under the smaller text is never COARSER: that is
      // the division happening, and not some second set of thresholds.
      expect(
        TIER_ORDER.indexOf(rulerTierOf(threshold, LAYOUT_SETTINGS)),
        step.row,
      ).toBeGreaterThanOrEqual(TIER_ORDER.indexOf(rulerTierOf(threshold, larger)))
    }
  })

  it('S-77 pins the left edge of the Row Area to scrollDate', () => {
    const layout = layoutFromSchedule(oneRow([]), LAYOUT_SETTINGS, REGIONS)
    expect(dateAtX(layout, REGIONS.rowArea.x)).toEqual({ year: 2026, month: 1, day: 1 })
    expect(dateAtX(layout, REGIONS.rowArea.x + 60)).toEqual({ year: 2026, month: 1, day: 11 })
  })

  it('answers null for the day while no origin is set, which is when OP-10 picks one', () => {
    const unset = settingsOf({ ...LAYOUT_SETTINGS, scrollDate: null })
    expect(dateAtX(layoutFromSchedule(oneRow([]), unset, REGIONS), 0)).toBeNull()
  })

  it('reads the axis off the layout it was built from, so x inverts xOfDay exactly', () => {
    // ⚠️ The inverse has to divide by layout.originX. Re-deriving the origin
    // from a ScreenRegions the caller hands in lets a value arrive that the
    // layout was NOT built from, and x -> day then lands on a different day
    // without saying so.
    const layout = layoutFromSchedule(oneRow([]), LAYOUT_SETTINGS, REGIONS)
    const dayAfterOrigin = (days: number): Record<string, number> => {
      const at = new Date(Date.UTC(2026, 0, 1) + days * 86400000)
      return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() }
    }
    // -1 covers a point LEFT of the origin, which S-77 reaches by scrolling.
    for (const days of [-1, 0, 1, 7, 100]) {
      expect(dateAtX(layout, layout.originX + days * layout.pxPerDay)).toEqual(
        dayAfterOrigin(days),
      )
    }
  })
})

describe('ScheduleLayout (PI-5) -- FR-080 / OP-10a: 錠が持つ端数', () => {
  // FR-080: 「⛐ その 2 つだけでは 1 日・1 行より短い位置を指せないので、端数を
  // `S-176` と `S-177` で持ち…端数は錠自身の大きさに対する比とし、px で持っては
  // ならない（MUST NOT）」
  // 表 T-024a の `OP-10a`: 「端数（`S-176` ／ `S-177`）が 0 以上 1 未満の外に
  // あるとき…錠をその分だけ隣へ送って、端数を範囲に戻すこと（MUST）。拒んでは
  // ならない（MUST NOT）」

  /** A stack of rows that all carry the same height, so 隣へ送る has one reading. */
  const STACK = scheduleOf({
    tasks: [],
    taskGroups: Array.from({ length: 6 }, (_unused, index) => ({
      id: `g${index + 1}`,
      parentId: null,
      order: index,
      height: null,
    })),
    taskGroupMembers: [],
  })

  const anchored = (part: Record<string, unknown>): DocumentSettings =>
    settingsOf({
      ...LAYOUT_SETTINGS,
      scrollGroupId: 'g1',
      scrollGroupOffset: 0,
      scrollDayOffset: 0,
      ...part,
    })

  const drawn = (part: Record<string, unknown>): ReturnType<typeof layoutFromSchedule> =>
    layoutFromSchedule(STACK, anchored(part), REGIONS)

  const topOf = (part: Record<string, unknown>): number => {
    const first = drawn(part).rows[0]
    if (first === undefined) throw new Error('the stack drew no row')
    return first.y
  }

  /**
   * 「その行が占める送り」 -- the length `S-176` measures its fraction against:
   * 「その行の帯の高さと、その下の隙間を合わせた長さ。次の行の上端までの距離で
   * あり、最後の行は自身の帯」.
   *
   * ⛔ NOT THE BAND. `S-176` forbids that in as many words -- 帯の高さに対する比
   * にしてはならない（MUST NOT）—— because 帯と帯は接していない: a fraction of
   * the band cannot name a top edge standing in the gap, which is the very
   * 「錠の上にしか着地できない形」 表 T-023d refuses.
   *
   * ⭐ READ OFF THE PICTURE: the 送り is the distance between two rows the
   * layout has already placed, so no case here has to know what the gap is.
   */
  const pitchOf = (part: Record<string, unknown>): number => {
    const rows = drawn(part).rows
    const first = rows[0]
    if (first === undefined) throw new Error('the stack drew no row')
    const next = rows[1]
    return next === undefined ? first.height : next.y - first.y
  }

  it("S-176 moves the picture by LESS than one row's 送り, and by that fraction of the 送り", () => {
    // 「表示の上端が、`scrollGroupId` が指す行のどこにあるか。その行が占める送り
    // （その行の帯の高さと、その下の隙間を合わせた長さ。次の行の上端までの距離で
    // あり、最後の行は自身の帯）に対する比であり、px ではない」-- so half a 送り
    // of offset moves the stack by half of THAT 送り.
    const row = drawn({}).rows[0]
    if (row === undefined) throw new Error('the stack drew no row')
    const pitch = pitchOf({})
    // ⛔ THE PREMISE THE MUST NOT RESTS ON: 「帯と帯は接していない」. If the two
    // touched, the band and the 送り would be one number and this case could
    // not tell the old reading from the new one.
    expect(pitch, 'S-176: 帯と帯は接していない —— 送りは帯より長い').toBeGreaterThan(row.height)

    const moved = topOf({}) - topOf({ scrollGroupOffset: 0.5 })

    expect(moved, '端数は動かす').toBeGreaterThan(0)
    expect(moved, '1 行の送りより短い移動').toBeLessThan(pitch)
    expect(moved, 'その行が占める送りに対する比').toBeCloseTo(pitch / 2, 6)
    expect(moved, '⛔ 帯の高さに対する比にしてはならない（MUST NOT）').not.toBeCloseTo(
      row.height / 2,
      6,
    )
  })

  it('S-176 is a RATIO of the 送り, so the same fraction moves further once that 送り is longer', () => {
    // ⛔ The half FR-080's MUST NOT is about: a px count would move the picture
    // the same distance at either zoom and point somewhere else on the schedule.
    const taller = { zoomY: 3, scrollGroupOffset: 0.5 }
    const tallPitch = pitchOf({ zoomY: 3 })
    const plainPitch = pitchOf({})
    expect(tallPitch, 'the case only means a 送り that really grew').toBeGreaterThan(plainPitch)

    expect(topOf({ zoomY: 3 }) - topOf(taller)).toBeCloseTo(tallPitch / 2, 6)
  })

  it('S-177 moves the picture by LESS than a whole day, and by that fraction of the day itself', () => {
    // 「表示の左端が、`scrollDate` が指す日のどこにあるか。⭐ 横の軸の `S-176`
    // である」. The left edge of the Row Area is where `scrollDate` starts, so a
    // third of a day of offset carries that day's start a third of a day left.
    const plain = drawn({})
    const moved = plain.originX - drawn({ scrollDayOffset: 1 / 3 }).originX

    expect(moved, '端数は動かす').toBeGreaterThan(0)
    expect(moved, '1 日より短い移動').toBeLessThan(plain.pxPerDay)
    expect(moved, '日自身の幅に対する比').toBeCloseTo(plain.pxPerDay / 3, 6)
  })

  it('OP-10a (MUST): a fraction of 1 or more carries the row anchor along and comes back into range', () => {
    // 「錠をその分だけ隣へ送って、端数を範囲に戻すこと（MUST）」-- so the two
    // spellings of one position draw ONE picture. ⚠️ 「同じ位置を 2 通りに書ける
    // ことを防ぐ規則であり」 is the reason the row gives itself.
    const carried = drawn({ scrollGroupId: 'g1', scrollGroupOffset: 1.5 })
    const inRange = drawn({ scrollGroupId: 'g2', scrollGroupOffset: 0.5 })

    expect(carried.rows.map((row) => row.groupId)).toEqual(inRange.rows.map((row) => row.groupId))
    expect(carried.rows.map((row) => row.y)).toEqual(inRange.rows.map((row) => row.y))
    // ⛔ 「拒んではならない（MUST NOT）」: the picture still holds every row the
    // in-range spelling holds, so nothing was dropped or fallen back on.
    expect(carried.rows.length).toBe(drawn({}).rows.length)
  })

  it('OP-10a (MUST): the same of the day anchor', () => {
    const carried = drawn({ scrollDate: '2026-01-01', scrollDayOffset: 1.5 })
    const inRange = drawn({ scrollDate: '2026-01-02', scrollDayOffset: 0.5 })

    // ⛔ NOT `originX`: that is where the day each spelling NAMES begins, and the
    // two name different days on purpose. What has to agree is the PICTURE --
    // which day is drawn at each place across the band.
    for (let at = REGIONS.rowArea.x; at < REGIONS.rowArea.x + REGIONS.rowArea.width; at += 7) {
      expect(dateAtX(carried, at), `at x ${at}`).toEqual(dateAtX(inRange, at))
    }
    expect(dateAtX(carried, REGIONS.rowArea.x), '端数を範囲に戻した先の日').not.toBeNull()
  })

  it('OP-10a (MUST NOT): a fraction below 0 is carried the other way and not refused either', () => {
    // 「0 以上 1 未満の外にあるとき」 covers both sides of the range.
    const carried = drawn({ scrollGroupId: 'g3', scrollGroupOffset: -0.5 })
    const inRange = drawn({ scrollGroupId: 'g2', scrollGroupOffset: 0.5 })

    expect(carried.rows.map((row) => row.y)).toEqual(inRange.rows.map((row) => row.y))
    expect(carried.rows.length).toBe(drawn({}).rows.length)
  })

  it('OP-10a: normalising the value first and not normalising it draw the same picture', () => {
    // The rule has to be idempotent, or a reader that tidied the document on the
    // way in and one that did not would show two things.
    const once = drawn({ scrollGroupId: 'g1', scrollGroupOffset: 2.25 })
    const twice = drawn({ scrollGroupId: 'g3', scrollGroupOffset: 0.25 })

    expect(once.rows.map((row) => row.y)).toEqual(twice.rows.map((row) => row.y))
  })
})

describe('ScheduleLayout (PI-5) -- LC-1 and LC-2', () => {
  const hierarchy = (part: Record<string, unknown>): Schedule =>
    scheduleOf({
      tasks: [spanning(1, '2026-01-01', 10)],
      taskGroups: [
        { id: 'g1', parentId: null, order: 0, height: null, ...part },
        { id: 'g2', parentId: 'g1', order: 0, height: null },
      ],
      taskGroupMembers: [{ groupId: 'g2', taskUid: 1 }],
    })

  it('HR-6 drops a hidden row and everything under it', () => {
    const layout = layoutFromSchedule(hierarchy({ isHidden: true }), LAYOUT_SETTINGS, REGIONS)
    expect(layout.rows).toHaveLength(0)
    expect(layout.placements).toHaveLength(0)
  })

  it('HR-1a drops what a collapsed row holds, without re-parenting it', () => {
    const layout = layoutFromSchedule(hierarchy({ isCollapsed: true }), LAYOUT_SETTINGS, REGIONS)
    expect(layout.rows.map((oneRect) => oneRect.groupId)).toEqual(['g1'])
    // The task sat on g2, so it must not reappear on g1.
    expect(layout.placements).toHaveLength(0)
  })

  it('FR-018 drops the deeper rows as zoomY falls, and never depth 1', () => {
    // threshold(d) = 0.32 x 1.875^(d-2), so depth 4 wants 1.125 and misses at 1.
    expect(groupDepthLimit(settingsOf({ ...LAYOUT_SETTINGS, zoomY: 1 }))).toBe(3)
    expect(groupDepthLimit(settingsOf({ ...LAYOUT_SETTINGS, zoomY: 1.125 }))).toBe(4)
    expect(groupDepthLimit(settingsOf({ ...LAYOUT_SETTINGS, zoomY: 0.32 }))).toBe(2)
    expect(groupDepthLimit(settingsOf({ ...LAYOUT_SETTINGS, zoomY: 0.001 }))).toBe(1)
  })

  it('CR-163 keeps a shape that clears S-86 and drops one that does not', () => {
    // 10 days at 6px is 60; 3 days is 18, under the 24px threshold.
    const layout = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 10), spanning(2, '2026-02-01', 3)]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    expect(layout.placements.map((onePoint) => onePoint.taskUid)).toEqual([1])
  })

  it('FR-018 draws a zero-duration Task at every zoom, because its width is not a duration', () => {
    // UC-001's extension 2a: ドラッグせずにクリックしたときは開始日と終了日が
    // 同じタスクを作ること（MUST）. FR-018 measures 期間から出た幅 and 幅が期間
    // から出ていない形状を落としてはならない（MUST NOT）-- a zero-duration shape
    // is drawn at S-49's floor, which is not a duration, so it stays (CR-174).
    // ⚠️ 6 < 24, so before CR-174 this Task was dropped at EVERY zoom.
    const schedule = oneRow([spanning(1, '2026-01-01', 0), spanning(2, '2026-02-01', 30)])
    for (const zoomX of [1, 0.5, 0.1, 0.02]) {
      const layout = layoutFromSchedule(schedule, settingsOf({ ...LAYOUT_SETTINGS, zoomX }), REGIONS)
      expect(layout.placements.map((onePoint) => onePoint.taskUid)).toContain(1)
    }
  })

  it('FR-018 still drops a Task that is merely short, so the exemption is not a hole', () => {
    // 3 days at 6px is 18, under the 24px S-86 states. Its width DID come from
    // a duration, so the CR-174 exemption must not reach it.
    const layout = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 10), spanning(2, '2026-02-01', 3)]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    expect(layout.placements.map((onePoint) => onePoint.taskUid)).toEqual([1])
  })

  it('never draws more as the zoom falls, which is FR-018 without an argument', () => {
    const schedule = oneRow([spanning(1, '2026-01-01', 10), spanning(2, '2026-02-01', 30)])
    const counts = [1, 0.5, 0.1].map(
      (zoomX) =>
        layoutFromSchedule(schedule, settingsOf({ ...LAYOUT_SETTINGS, zoomX }), REGIONS).placements.length,
    )
    expect(counts).toEqual([...counts].sort((a, b) => b - a))
  })
})

describe('ScheduleLayout (PI-5) -- LC-8 and LC-9', () => {
  it('ST-10 does not call touching ends an overlap, so a series stays on one lane', () => {
    const layout = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 10), spanning(2, '2026-01-11', 10)]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    expect(layout.placements.map((onePoint) => onePoint.stack)).toEqual([0, 0])
    expect(layout.rows[0]!.stackCount).toBe(1)
  })

  it('ST-3 puts an overlapping Task on the next lane down', () => {
    const layout = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 20), spanning(2, '2026-01-05', 20)]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    expect(layout.placements.map((onePoint) => onePoint.stack)).toEqual([0, 1])
  })

  it('ST-2 orders by start, then by the later finish, then by uid', () => {
    const layout = layoutFromSchedule(
      oneRow([spanning(9, '2026-01-01', 10), spanning(3, '2026-01-01', 30)]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    expect(layout.placements.map((onePoint) => onePoint.taskUid)).toEqual([3, 9])
  })

  it('LF-2 puts stackGap between the lanes and not after the last one', () => {
    const one = layoutFromSchedule(oneRow([spanning(1, '2026-01-01', 20)]), LAYOUT_SETTINGS, REGIONS)
    const two = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 20), spanning(2, '2026-01-05', 20)]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    // A rectangle reserves basePlanHeight, 28, at zoomY 1 -- and one lane of
    // that stands UNDER `LF-3`'s second floor, so the single-lane band is the
    // lattice and not the lane. ⇒ the row that can say anything about stackGap
    // is the two-lane one, which clears the floor on its own.
    expect(one.rows[0]!.height).toBe(Math.max(28, CONTROL_LATTICE_FLOOR))
    expect(two.rows[0]!.height).toBe(28 + 12 + 28)
    expect(
      28 + 12 + 28,
      'the two-lane band has to clear the floor, or the sum proves nothing',
    ).toBeGreaterThan(CONTROL_LATTICE_FLOOR)
  })

  it('ST-5 stacks down from the top of the band, and S-58 up reverses only the y', () => {
    // Lane 0 takes a 28-tall rectangle and lane 1 a 42-tall milestone that
    // overlaps it, so the band is 28 + 12 + 42 = 82 whichever way it stacks --
    // and the reversal has to use each lane's OWN height, not one of them.
    const overlapping = oneRow([
      spanning(1, '2026-01-01', 20),
      taskOf({ uid: 2, start: '2026-01-05', finish: '2026-01-05', milestone: true }),
    ])
    const top = REGIONS.rowArea.y

    const down = layoutFromSchedule(overlapping, LAYOUT_SETTINGS, REGIONS)
    expect(down.rows[0]!.height).toBe(82)
    expect(down.rows[0]!.stackTops).toEqual([top, top + 28 + 12])
    expect(down.placements.map((onePoint) => onePoint.y)).toEqual([top, top + 40])

    const up = layoutFromSchedule(
      overlapping,
      settingsOf({ ...LAYOUT_SETTINGS, stackDirection: 'up' }),
      REGIONS,
    )
    // ST-2 and ST-3 do not read the direction: every Task keeps its lane.
    expect(up.placements.map((onePoint) => onePoint.stack)).toEqual(down.placements.map((onePoint) => onePoint.stack))
    expect(up.rows[0]!.height).toBe(82)
    // Lane 0 is now the lowest, and lane 1 -- the taller -- takes the top.
    expect(up.rows[0]!.stackTops).toEqual([top + 42 + 12, top])
    expect(up.placements.map((onePoint) => onePoint.y)).toEqual([top + 54, top])
  })

  it('LF-3 advances the next row by the band height and rowGap', () => {
    const schedule = scheduleOf({
      tasks: [spanning(1, '2026-01-01', 20)],
      taskGroups: [
        { id: 'g1', parentId: null, order: 0, height: null },
        { id: 'g2', parentId: null, order: 1, height: null },
      ],
      taskGroupMembers: [{ groupId: 'g1', taskUid: 1 }],
    })
    const layout = layoutFromSchedule(schedule, LAYOUT_SETTINGS, REGIONS)
    // LF-3 is two rules in one row: the pitch is the band above plus `rowGap`,
    // and that band is 「矩形が縦に取る高さ」 raised to `HF-1`'s lattice. The
    // first row here holds one rectangle lane, which the lattice outruns.
    expect(layout.rows[1]!.y - layout.rows[0]!.y).toBe(Math.max(28, CONTROL_LATTICE_FLOOR) + 8)
  })

  it('LF-2 gives an empty row one rectangle lane, and LF-3 raises it to the lattice', () => {
    // 表 T-051 の `HF-19` was ruled about exactly this row: 「⚠️ **実測
    // （2026-09-03、出荷ビルド）: `Task` を 1 つも持たない行は 22〜28px、格子は
    // 48px。その行の `IC-90` と `IC-58` の中心は次の行のものであり、押しはそちら
    // へ届いた。**」 ⇒ LF-2's 「`Task` を 1 つも持たない段は、矩形が縦に取る高さと
    // する」 still gives the lane, and LF-3's second floor lifts the band off it.
    expect(layoutFromSchedule(oneRow([]), LAYOUT_SETTINGS, REGIONS).rows[0]!.height).toBe(
      Math.max(28, CONTROL_LATTICE_FLOOR),
    )
    expect(28, 'the rectangle no longer stands under the lattice').toBeLessThan(
      CONTROL_LATTICE_FLOOR,
    )
  })

  it('FR-042 reads a stated row height as a floor, never as a cap', () => {
    const tall = layoutFromSchedule(oneRow([], { height: 90 }), LAYOUT_SETTINGS, REGIONS)
    expect(tall.rows[0]!.height).toBe(90)
    const packed = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 20), spanning(2, '2026-01-05', 20)], { height: 10 }),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    // Two lanes need 68; a stated 10 must not squeeze them out.
    expect(packed.rows[0]!.height).toBe(68)
  })

  it('ST-7 stops rather than truncating or overlapping when the cap is reached', () => {
    const many = Array.from({ length: 4 }, (_, i) => spanning(i + 1, '2026-01-01', 20))
    const capped = settingsOf({ ...LAYOUT_SETTINGS, stackSafetyCap: 2 })
    expect(() => layoutFromSchedule(oneRow(many), capped, REGIONS)).toThrow(StackSafetyCapReached)
  })
})

describe('ScheduleLayout (PI-5) -- labels, shapes and fit', () => {
  it('T-013 keeps a label inside a shape wide enough, and puts it right when not', () => {
    const layout = layoutFromSchedule(
      oneRow([
        spanning(1, '2026-01-01', 60, { name: 'ab' }),
        spanning(2, '2027-01-01', 10, { name: 'a very long name indeed' }),
      ]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    expect(taskPlacement(layout, 1)!.labelPlacement).toBe('inside')
    expect(taskPlacement(layout, 2)!.labelPlacement).toBe('right')
  })

  it('OC-1 counts a label pushed outside toward the occupied width', () => {
    const layout = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 10, { name: 'a very long name indeed' })]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    const placed = taskPlacement(layout, 1)!
    expect(placed.occupiedX1).toBeGreaterThan(placed.x + placed.width)
  })

  it('LC-4 cuts a label to truncateUnits before anything measures it', () => {
    // S-35 of table T-201 (`truncateUnits`), read from the generated defaults
    // rather than re-typed: 利用者の指示 2026-08-29 raised it to 全角 24 = 半角
    // 48 (CR-283). The name below is half-width, so one character is one unit
    // (FR-093).
    //
    // ⭐ THE MARK IS INSIDE THE LIMIT, NOT ADDED TO IT. The preamble of table
    // T-013 makes 打ち切ったときは、打ち切ったことが読める記号を末尾に添えること
    // (MUST) and 記号を含めた長さが `S-35` に収まること（MUST）。超えてはならない
    // (MUST NOT) -- so a cut label is the mark plus as much of the name as the
    // remaining units hold. ⚠️ The mark is full-width, hence two units and one
    // character, which is why the length in CHARACTERS is one below the limit.
    const limit = settingNumber('truncateUnits')
    const label = taskPlacement(
      layoutFromSchedule(
        oneRow([spanning(1, '2026-01-01', 60, { name: 'x'.repeat(limit + 2) })]),
        LAYOUT_SETTINGS,
        REGIONS,
      ),
      1,
    )!.label
    const units = [...label].reduce((sum, ch) => sum + (ch.charCodeAt(0) < 0x100 ? 1 : 2), 0)
    expect(units, '表 T-013 の前書き: 記号を含めた長さが `S-35` に収まること').toBe(limit)
    // ⛔ 切りっぱなしにしてはならない（MUST NOT）-- 短い名前と、切られた長い名前が
    // 見分けられない.
    expect(label.length).toBeLessThan(limit)
    expect(label.startsWith('x')).toBe(true)
  })

  it('AT-100 resolves a shapeKind of null through Task.milestone', () => {
    const asMilestone = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 20, { milestone: true })]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    const asBar = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 20, { milestone: false })]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    // shapeHeightOf.milestone is 1.5 against the rectangle's 1.
    expect(asMilestone.placements[0]!.height).toBe(42)
    expect(asBar.placements[0]!.height).toBe(28)
  })

  it('FR-055 scales the HORIZONTAL from the drawn extent', () => {
    const schedule = oneRow([spanning(1, '2026-01-01', 20, { name: '' })])
    const layout = layoutFromSchedule(schedule, LAYOUT_SETTINGS, REGIONS)
    const fit = fitZoom(schedule, LAYOUT_SETTINGS, REGIONS, NOT_STORED_ZOOM)
    // FR-055: 「⭐ 横はこの限りではない —— 横に床は無く、段階は `FR-017` が
    // 1 日あたりの幅で定める」. Stated as the relation, not as a figure.
    expect(fit.zoomX).toBeCloseTo(REGIONS.rowArea.width / layout.contentWidth, 6)
    // ⛔ THE VERTICAL HALF OF THIS CASE WAS RETIRED, not adapted. It asserted
    // `rowArea.height / contentHeight`, and FR-055 now says the opposite:
    // 「縦は、倍率を縮めて合わせるのではなく、表示量（グループ LOD の深さ）を
    // 選んで合わせること（MUST）」, with 「⚠️ 画面の下に隙間が残ることは許す
    // —— 本要求は収めることを求めており、埋めることを求めていない」. A one-row
    // document has only depth 1, which FR-018 (MUST NOT) keeps out of the
    // ladder's domain, so no row states the zoom it lands on. What the vertical
    // does owe is asserted in tests/unit/fr-055-vertical-lod-fit.test.ts; all
    // this case may still say is FR-016's range (S-97 / S-98 of table T-206).
    expect(fit.zoomY).toBeGreaterThanOrEqual(NOT_STORED_ZOOM.min)
    expect(fit.zoomY).toBeLessThanOrEqual(NOT_STORED_ZOOM.max)
  })

  it('FR-055 returns to unity when there is no extent to divide by', () => {
    // ⚠️ A row with no Task still draws: LF-2 gives it one rectangle lane. So
    // "nothing drawn" means no rows at all, not an empty row.
    const empty = scheduleOf({})
    const layout = layoutFromSchedule(empty, LAYOUT_SETTINGS, REGIONS)
    expect(layout.contentHeight).toBe(0)
    // OP-10 (MUST) makes the fit answer the position as well as the scale,
    // so all four of S-75..S-78 are asserted here. With nothing drawn there
    // is no leftmost edge and no top row, and FR-055's empty-document arm
    // hands back what the settings already hold rather than inventing one.
    expect(fitZoom(empty, LAYOUT_SETTINGS, REGIONS, NOT_STORED_ZOOM)).toEqual({
      zoomX: 1,
      zoomY: 1,
      scrollDate: LAYOUT_SETTINGS.scrollDate,
      scrollGroupId: LAYOUT_SETTINGS.scrollGroupId,
    })
  })

  it('still has an extent when a row holds no Task, because the band is drawn', () => {
    // One row, so the extent IS that row's band -- which `LF-3` keeps at or
    // above `HF-1`'s lattice as well as at or above the rectangle.
    const layout = layoutFromSchedule(oneRow([]), LAYOUT_SETTINGS, REGIONS)
    expect(layout.contentHeight).toBe(Math.max(28, CONTROL_LATTICE_FLOOR))
  })

  it('FR-055 measures to the RIGHTMOST occupied edge, even when every one is negative', () => {
    // S-77 puts the origin a year after the content, so the whole occupancy
    // sits left of the Row Area. Measuring the right edge from a floor of 0
    // reported the distance to x = 0 instead -- here 2020px for 120px of bar,
    // which would have zoomed the fit out by nearly 17x.
    const scrolled = settingsOf({ ...LAYOUT_SETTINGS, scrollDate: '2027-01-01' })
    const layout = layoutFromSchedule(oneRow([spanning(1, '2026-01-01', 20)]), scrolled, REGIONS)
    expect(taskPlacement(layout, 1)!.occupiedX1).toBeLessThan(0)
    expect(layout.contentWidth).toBeCloseTo(120, 6)
  })

  it('FR-077 carries the drawn type size on the placement, with S-8 applied last', () => {
    const layout = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 60, { name: 'ab' })]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    // A rectangle: 28 x actualOfPlan x fontOfActual = 16.352, clear of S-8.
    expect(taskPlacement(layout, 1)!.labelFontSize).toBeCloseTo(28 * 0.73 * 0.8, 6)

    const thin = layoutFromSchedule(
      scheduleOf({
        tasks: [spanning(2, '2026-01-01', 60, { name: 'ab' })],
        taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
        taskGroupMembers: [{ groupId: 'g1', taskUid: 2 }],
        taskVisuals: [{ taskUid: 2, shapeKind: 'arrow' }],
      }),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    // An arrow is 14 tall, so 14 x 0.73 x 0.8 x thinFontScale is 6.95. FR-094
    // puts S-8's floor on AFTER the thin scale, so the answer is 12, not 6.95.
    expect(taskPlacement(thin, 2)!.labelFontSize).toBe(12)
  })
})

// ---------------------------------------------------------------------------
// ScheduleGeometry (PI-6) -- table T-068's LC-10 and LC-11, and RV-5.
// ---------------------------------------------------------------------------

/** LAYOUT_SETTINGS plus every key LC-10 and LC-11 read, at their table T-201 values. */
const GEOM_SETTINGS = settingsOf({
  ...(LAYOUT_SETTINGS as unknown as Record<string, unknown>),
  progressLineVisible: true, // S-64
})

// ⚠️ `selection` is PI-6's fifth argument and has no default of its own:
// FR-075 (MUST) shows the fade grab points on the selected Task alone, so what
// is selected decides what GR-1 and GR-2 have to be hit. Drawing nothing
// selected is the ordinary case here, which is why the default is stated once.
const geometryOf = (
  schedule: Schedule,
  settings: DocumentSettings = GEOM_SETTINGS,
  selection: Selection = emptySelection(),
): ScheduleGeometry =>
  geometryFromLayout(schedule, settings, layoutFromSchedule(schedule, settings, REGIONS), REGIONS, selection)

/** The x of a day index, at pxPerDay 6 from wherever the Row Area starts (`S-79`). */
const xOf = (dayIndex: number): number => REGIONS.rowArea.x + dayIndex * 6

// LF-11 places the marker `markerGap` past the right end of the bar FR-013
// names, as a square of side `markerSize`, so its CENTRE stands this far past
// that end. Read from the generated defaults (S-23 = 4, S-22 = 16) rather than
// re-typed, so moving either value moves these cases with it.
const MARKER_OFFSET = settingNumber('markerGap') + settingNumber('markerSize') / 2

/** One row holding the tasks given, with a shape chosen for each. */
const withVisuals = (tasks: readonly Task[], visuals: readonly Record<string, unknown>[]): Schedule =>
  scheduleOf({
    tasks,
    taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
    taskGroupMembers: tasks.map((drawnText) => ({ groupId: 'g1', taskUid: drawnText.uid })),
    taskVisuals: visuals,
  })

describe('ScheduleGeometry (PI-6) -- the shapes of table T-012', () => {
  it('LF-10 centres a milestone on its day and gives it its own plan height', () => {
    // A real milestone has start === finish, so its date span is zero. CR-163
    // measures the SHAPE, which LF-10 makes 28 x 1.5 = 42 wide, clearing S-86.
    const schedule = oneRow([
      taskOf({ uid: 1, start: '2026-01-11', finish: '2026-01-11', milestone: true }),
    ])
    const geometry = geometryOf(schedule)
    expect(geometry.tasks).toHaveLength(1)
    const points = outlinePoints(geometry.tasks[0]!.plan)
    expect(points).toHaveLength(4)
    const xs = points.map((onePoint) => onePoint.x)
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(xOf(10), 6)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(42, 6)
  })

  it('T-012a draws a rectangle as its own four points when no fade is set', () => {
    const geometry = geometryOf(oneRow([spanning(1, '2026-01-01', 20)]))
    const points = outlinePoints(geometry.tasks[0]!.plan)
    expect(points).toHaveLength(4)
    expect(new Set(points.map((onePoint) => onePoint.x))).toEqual(new Set([xOf(0), xOf(20)]))
  })

  it('FD-6 lets fadeIn win and cuts fadeOut to what is left', () => {
    const geometry = geometryOf(
      oneRow([spanning(1, '2026-01-01', 20, { fadeInDays: 15, fadeOutDays: 15 })]),
    )
    const points = outlinePoints(geometry.tasks[0]!.plan)
    // Point 2 is end - fadeOut and point 4 is start + fadeIn. fadeIn takes 15
    // of the 20 days, so fadeOut is cut to the 5 that are left and they meet.
    expect(points[1]!.x).toBeCloseTo(xOf(15), 6)
    expect(points[3]!.x).toBeCloseTo(xOf(15), 6)
  })

  it('FD-6a keeps the fade off the actual bar', () => {
    const schedule = oneRow([
      spanning(1, '2026-01-01', 20, { fadeInDays: 5, actualStart: '2026-01-01', actualDuration: 5 }),
    ])
    const points = outlinePoints(geometryOf(schedule).tasks[0]!.actual)
    // With no fade the trapezoid is a rectangle: two distinct x, not three.
    expect(new Set(points.map((onePoint) => onePoint.x)).size).toBe(2)
  })

  it('LF-6 derives the actual chevron notch from the plan and does not clamp it twice', () => {
    const schedule = withVisuals(
      [spanning(1, '2026-01-01', 20, { actualStart: '2026-01-01', actualDuration: 3 })],
      [{ taskUid: 1, shapeKind: 'chevron' }],
    )
    const geometry = geometryOf(schedule)
    const planX = outlinePoints(geometry.tasks[0]!.plan).map((onePoint) => onePoint.x)
    const actualX = outlinePoints(geometry.tasks[0]!.actual).map((onePoint) => onePoint.x)
    // The plan notch is min(120 x 0.35, 28 x 0.45) = 12.6. The actual's is that
    // times actualOfPlan -- NOT min(its own width x 0.35, ...), which would be
    // smaller and would tilt the two slopes apart.
    expect(Math.max(...planX) - planX[1]!).toBeCloseTo(12.6, 6)
    expect(Math.max(...actualX) - actualX[1]!).toBeCloseTo(12.6 * 0.73, 6)
  })

  it('LF-9 centres an actual laid inside and pushes one laid below by actualGap', () => {
    const build = (kind: string): Schedule =>
      withVisuals(
        [spanning(1, '2026-01-01', 40, { actualStart: '2026-01-01', actualDuration: 5 })],
        [{ taskUid: 1, shapeKind: kind }],
      )
    const inside = geometryOf(build('rectangle')).tasks[0]!
    const actualTop = Math.min(...outlinePoints(inside.actual).map((onePoint) => onePoint.y))
    expect(actualTop).toBeCloseTo(REGIONS.rowArea.y + (28 - 28 * 0.73) / 2, 6)

    const below = geometryOf(build('arrow')).tasks[0]!
    const planLine = lineBar(below.plan)
    const actualLine = lineBar(below.actual)
    // An arrow's plan is 28 x 0.5 = 14 tall, so its line runs at 7 from the
    // top; the actual sits 14 + actualGap below that top, on its own centre.
    const planTop = planLine.from.y - 7
    expect(actualLine.from.y - planTop).toBeCloseTo(14 + 2 + (14 * 0.73) / 2, 6)
  })

  it('LF-7 gives an arrow a head and a span two dots', () => {
    const build = (kind: string): Schedule =>
      withVisuals([spanning(1, '2026-01-01', 40)], [{ taskUid: 1, shapeKind: kind }])
    const arrow = lineBar(geometryOf(build('arrow')).tasks[0]!.plan)
    expect(arrow.head).toHaveLength(3)
    expect(arrow.dots).toHaveLength(0)
    const span = lineBar(geometryOf(build('endpointSpan')).tasks[0]!.plan)
    expect(span.head).toBeNull()
    expect(span.dots).toHaveLength(2)
  })
})

describe('ScheduleGeometry (PI-6) -- RV-1, RV-5 and LF-11', () => {
  it('RV-1 counts actualDuration in WORKED days, so a weekend does not shorten the bar', () => {
    // 2026-01-01 is a Thursday. Five worked days from it reaches the 8th, not
    // the 6th -- table T-209 works Monday to Friday.
    const schedule = oneRow([
      spanning(1, '2026-01-01', 20, { actualStart: '2026-01-01', actualDuration: 5 }),
    ])
    const placed = layoutFromSchedule(schedule, GEOM_SETTINGS, REGIONS).placements[0]!
    expect(placed.actualX).toBeCloseTo(xOf(0), 6)
    expect(placed.actualX! + placed.actualWidth).toBeCloseTo(xOf(7), 6)
  })

  it('holds no actual bar at all while the Task has not started', () => {
    const placed = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 20)]),
      GEOM_SETTINGS,
      REGIONS,
    ).placements[0]!
    expect(placed.actualX).toBeNull()
  })

  it('RV-5 answers table T-021, and PM-4 wins whenever it holds', () => {
    // Read through the marker: table T-064's PI-6 declares two members, and the
    // symbol leaves the component on MarkerGeometry rather than on its own.
    const symbolOf = (part: Record<string, unknown>, statusDate: string | null): string =>
      geometryOf(
        scheduleOf({
          project: { calendarUid: null, statusDate },
          tasks: [spanning(1, '2026-01-01', 20, part)],
          taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
          taskGroupMembers: [{ groupId: 'g1', taskUid: 1 }],
        }),
      ).tasks[0]!.marker!.symbol

    expect(symbolOf({}, '2026-06-01')).toBe('PM-4')
    expect(symbolOf({}, null)).toBe('PM-1a')
    expect(symbolOf({ actualStart: '2026-01-01', actualFinish: '2026-01-21' }, null)).toBe('PM-2')
    expect(symbolOf({ actualStart: '2026-01-01', resumeValid: false }, null)).toBe('PM-3')
    expect(symbolOf({ actualStart: '2026-01-01' }, null)).toBe('PM-1')
  })

  it('LF-11 puts the marker markerGap past the ACTUAL bar, on the plan bar centre', () => {
    const schedule = oneRow([
      spanning(1, '2026-01-01', 20, { actualStart: '2026-01-01', actualDuration: 5 }),
    ])
    const marker = geometryOf(schedule).tasks[0]!.marker!
    // FR-013: 実績バーの右端の外側に進捗マーカーを出し -- the marker hangs off
    // the ACTUAL bar. ⛔ Not "the rightmost bar": FR-013 names exactly one
    // exception, 予定だけを表示しているとき, and this Task shows both bars.
    // Five worked days from Thursday 2026-01-01 end the actual at day 7 (RV-1)
    // while the plan runs to day 20, so the two candidates are 78px apart and
    // the case can tell them apart.
    expect(marker.centre.x).toBeCloseTo(xOf(7) + MARKER_OFFSET, 6)
    // LF-11: 縦は予定バーの中心 -- the plan's centre, not the actual's.
    expect(marker.centre.y).toBeCloseTo(REGIONS.rowArea.y + 14, 6)
    // LF-11: markerSize を一辺とする正方形.
    expect(marker.radius).toBe(settingNumber('markerSize') / 2)
  })

  it('FR-013 moves the marker to the plan bar when only the plan is displayed', () => {
    // 予定だけを表示しているときは、予定バーの右端の外側に出すこと（MUST）--
    // the one exception FR-013 names, keyed on S-59, and the same form as
    // FR-009's 予定を表示していないときに限り、実績の幾何に付ける.
    const planOnly = settingsOf({
      ...(GEOM_SETTINGS as unknown as Record<string, unknown>),
      planActualDisplay: 'plan-only', // S-59
    })
    const schedule = oneRow([
      spanning(1, '2026-01-01', 20, { actualStart: '2026-01-01', actualDuration: 5 }),
    ])
    expect(geometryOf(schedule, planOnly).tasks[0]!.marker!.centre.x).toBeCloseTo(
      xOf(20) + MARKER_OFFSET,
      6,
    )
  })

  it('GR-7 hangs the marker off the end-point dummy while nothing is started', () => {
    // 実績バーの右端の外側。未着手のときは終了点の掴みシロの外側 -- a Task not
    // started has no actual bar, so FR-043's GR-17 stands in for its right end
    // and the marker leaves the plan's own right end alone.
    const fresh = geometryOf(oneRow([spanning(1, '2026-01-01', 20)])).tasks[0]!
    expect(fresh.marker!.centre.x).toBeCloseTo(fresh.dummies[1]!.at.x + MARKER_OFFSET, 6)
    // ⚠️ THE DAY MOVED WITH CR-275, THE RULE DID NOT. FR-043 now starts the
    // dummy on the working day AFTER the plan start (2026-01-01 is a Thursday,
    // so GR-9 is the Friday) and GR-17 stands S-129 along from GR-9, which puts
    // the marker one day further right than it stood. GR-7 still hangs off
    // GR-17 and off nothing else, which is what this case is for.
    expect(fresh.marker!.centre.x).toBeCloseTo(xOf(2) + MARKER_OFFSET, 6)
  })

  it('GR-7 keeps a milestone on its figure, which has no GR-17 to follow', () => {
    // マイルストーンのときは図形の外側. GR-15 gives it no actual bar and so no
    // end-point dummy either; LF-10 already makes the plan figure's right edge
    // the outside of the figure.
    const milestone = geometryOf(
      oneRow([taskOf({ uid: 1, start: '2026-01-11', finish: '2026-01-11', milestone: true })]),
    ).tasks[0]!
    expect(milestone.dummies.map((one) => one.grab)).toEqual(['GR-18'])
    // The figure is 42 across and centred on day 10, so its right edge is at 21.
    expect(milestone.marker!.centre.x).toBeCloseTo(xOf(10) + 21 + MARKER_OFFSET, 6)
  })

  it('S-63 takes the marker away', () => {
    const hidden = settingsOf({
      ...(GEOM_SETTINGS as unknown as Record<string, unknown>),
      progressMarkerVisible: false,
    })
    expect(geometryOf(oneRow([spanning(1, '2026-01-01', 20)]), hidden).tasks[0]!.marker).toBeNull()
  })

  it('FR-044 draws the resume icon on a suspended Task only', () => {
    const suspended = oneRow([
      spanning(1, '2026-01-01', 20, {
        actualStart: '2026-01-01',
        actualDuration: 2,
        resumeValid: false,
      }),
    ])
    expect(geometryOf(suspended).tasks[0]!.resume).not.toBeNull()
    const running = oneRow([
      spanning(1, '2026-01-01', 20, { actualStart: '2026-01-01', actualDuration: 2 }),
    ])
    expect(geometryOf(running).tasks[0]!.resume).toBeNull()
  })

  it('FR-043 draws both dummies while nothing is started, and none once it is', () => {
    const fresh = geometryOf(oneRow([spanning(1, '2026-01-01', 20)])).tasks[0]!
    expect(fresh.dummies.map((one) => one.grab)).toEqual(['GR-9', 'GR-17'])
    // ⛔ GR-9 IS NOT ON THE PLAN'S OWN START DAY (CR-275): GR-3 is already
    // there and wins table T-023d's order, so FR-043 (MUST NOT) puts the dummy
    // on the next WORKING day. 2026-01-01 is a Thursday, so GR-9 is the Friday
    // and GR-17 stands S-129 -- one worked day -- along from it.
    expect(fresh.dummies[0]!.at.x).toBeCloseTo(xOf(1), 6)
    expect(fresh.dummies[1]!.at.x).toBeCloseTo(xOf(2), 6)
    const started = geometryOf(
      oneRow([spanning(1, '2026-01-01', 20, { actualStart: '2026-01-01', actualDuration: 1 })]),
    ).tasks[0]!
    expect(started.dummies).toHaveLength(0)
  })
})

describe('ScheduleGeometry (PI-6) -- LC-10, the routes of table T-222', () => {
  /** Three Tasks on one row -- 1 and 2 overlap, so they take separate lanes. */
  const linked = (linkType: number, predecessor: number, successor: number): Schedule => {
    const tasks = [
      spanning(1, '2026-01-01', 20), // lane 0
      spanning(2, '2026-01-05', 20), // overlaps 1, so lane 1
      spanning(3, '2026-03-01', 20), // clear of both, so lane 0
    ].map((task) =>
      task.uid === successor
        ? taskOf({
            ...(task as unknown as Record<string, unknown>),
            dependencies: [{ predecessorUid: predecessor, linkType }],
          })
        : task,
    )
    return oneRow(tasks)
  }

  it('RP-1 draws one horizontal line when the lane is shared and the gap clears the entry run', () => {
    const route = geometryOf(linked(1, 1, 3)).dependencies[0]!
    expect(route.pattern).toBe('RP-1')
    expect(route.points).toHaveLength(2)
    expect(route.points[0]!.y).toBeCloseTo(route.points[1]!.y, 6)
  })

  it('RP-3 folds at a midpoint held inside x1 and x2 when the lanes differ', () => {
    const route = geometryOf(linked(1, 2, 3)).dependencies[0]!
    expect(route.pattern).toBe('RP-3')
    expect(route.points).toHaveLength(4) // 2 bends
    expect(route.points[1]!.x).toBeCloseTo(route.points[2]!.x, 6)
  })

  it('RP-4 takes a backwards dependency on one lane out through the corridor', () => {
    const route = geometryOf(linked(1, 3, 1)).dependencies[0]!
    expect(route.pattern).toBe('RP-4')
    expect(route.points).toHaveLength(6) // 4 bends
  })

  it('the same-side family turns back once and never draws 0 bends', () => {
    const route = geometryOf(linked(0, 2, 3)).dependencies[0]! // FF
    expect(route.pattern).toBe('RP-7')
    expect(route.points).toHaveLength(4)
    // Both runs leave by the right edge, so the turn-back is right of both.
    expect(route.points[1]!.x).toBeGreaterThan(route.points[0]!.x)
    expect(route.points[2]!.x).toBeGreaterThan(route.points[3]!.x)
  })

  it('RP-8 uses two verticals when a same-side pair shares a lane', () => {
    const route = geometryOf(linked(0, 1, 3)).dependencies[0]! // FF, one lane
    expect(route.pattern).toBe('RP-8')
    expect(route.points).toHaveLength(6)
  })

  it('mirrors x for SS rather than holding a second set of rules', () => {
    const forward = geometryOf(linked(0, 2, 3)).dependencies[0]! // FF, exits right
    const mirrored = geometryOf(linked(3, 2, 3)).dependencies[0]! // SS, exits left
    expect(mirrored.pattern).toBe(forward.pattern)
    // Every run leaves by the LEFT edge now, so the turn-back is left of both.
    expect(mirrored.points[1]!.x).toBeLessThan(mirrored.points[0]!.x)
    expect(mirrored.points[2]!.x).toBeLessThan(mirrored.points[3]!.x)
  })

  it('RT-4a draws nothing when either end is not on screen', () => {
    const zoomedOut = settingsOf({
      ...(GEOM_SETTINGS as unknown as Record<string, unknown>),
      zoomX: 0.05,
    })
    expect(geometryOf(linked(1, 2, 3), zoomedOut).dependencies).toHaveLength(0)
  })

  it('S-62 takes every dependency line away', () => {
    const hidden = settingsOf({
      ...(GEOM_SETTINGS as unknown as Record<string, unknown>),
      dependencyVisible: false,
    })
    expect(geometryOf(linked(1, 1, 3), hidden).dependencies).toHaveLength(0)
  })
})

describe('ScheduleGeometry (PI-6) -- FR-014 and LF-12', () => {
  const withStatus = (tasks: readonly Task[], statusDate: string): Schedule =>
    scheduleOf({
      project: { calendarUid: null, statusDate },
      tasks,
      taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
      taskGroupMembers: tasks.map((drawnText) => ({ groupId: 'g1', taskUid: drawnText.uid })),
    })

  it('runs one unbroken line, one vertex per lane, from above the first row to below the last', () => {
    const schedule = withStatus(
      [spanning(1, '2026-01-01', 20), spanning(2, '2026-01-05', 20)],
      '2026-02-01',
    )
    const line = geometryOf(schedule).progressLine
    // Two lanes, plus the entry above and the exit below.
    expect(line).toHaveLength(4)
    expect(line[0]!.y).toBeCloseTo(REGIONS.rowArea.y - 6, 6)
    expect(line[0]!.x).toBeCloseTo(xOf(31), 6)
    // LF-12 puts each vertex half a RECTANGLE's height below its lane's top.
    expect(line[1]!.y).toBeCloseTo(REGIONS.rowArea.y + 14, 6)
  })

  it('PL-4 marks a Task not started whose start has gone by; PL-1 leaves a finished one alone', () => {
    const late = geometryOf(withStatus([spanning(1, '2026-01-01', 20)], '2026-02-01')).progressLine
    expect(late[1]!.x).toBeCloseTo(xOf(0), 6) // its own start
    const done = geometryOf(
      withStatus(
        [spanning(1, '2026-01-01', 20, { actualStart: '2026-01-01', actualFinish: '2026-01-21' })],
        '2026-02-01',
      ),
    ).progressLine
    // No vertex, so that lane passes through the status date and the line holds.
    expect(done[1]!.x).toBeCloseTo(xOf(31), 6)
  })

  it('S-64 and an unset status date each take the line away', () => {
    const hidden = settingsOf({
      ...(GEOM_SETTINGS as unknown as Record<string, unknown>),
      progressLineVisible: false,
    })
    expect(
      geometryOf(withStatus([spanning(1, '2026-01-01', 20)], '2026-02-01'), hidden).progressLine,
    ).toHaveLength(0)
    expect(geometryOf(oneRow([spanning(1, '2026-01-01', 20)])).progressLine).toHaveLength(0)
    expect(geometryOf(oneRow([spanning(1, '2026-01-01', 20)])).statusLine).toBeNull()
  })
})

describe('ScheduleGeometry (PI-6) -- table T-020a, GR-10 and FR-019', () => {
  const asMilestone = (part: Record<string, unknown>): Schedule =>
    oneRow([taskOf({ uid: 1, start: '2026-01-11', finish: '2026-01-11', milestone: true, ...part })])

  it('GD-4 judges a milestone on its DAY, having no notion of overlap', () => {
    // The two figures are 42 and 30 across and one day -- 6px -- apart, so they
    // overlap heavily. GD-1's overlap gate would leave this row unable to fire.
    const apart = geometryOf(asMilestone({ actualStart: '2026-01-12' })).tasks[0]!
    expect(apart.guides).toHaveLength(1)
    expect(apart.guides[0]![0]!.x).toBeCloseTo(xOf(11), 6)
    expect(apart.guides[0]![1]!.x).toBeCloseTo(xOf(10), 6)
    const together = geometryOf(asMilestone({ actualStart: '2026-01-11' })).tasks[0]!
    expect(together.guides).toHaveLength(0)
  })

  it('GD-2 draws two lines once the two bars have come apart, and none while they meet', () => {
    const apart = geometryOf(
      oneRow([spanning(1, '2026-01-01', 5, { actualStart: '2026-02-02', actualDuration: 3 })]),
    ).tasks[0]!
    expect(apart.guides).toHaveLength(2)
    const overlapping = geometryOf(
      oneRow([spanning(1, '2026-01-01', 20, { actualStart: '2026-01-05', actualDuration: 3 })]),
    ).tasks[0]!
    expect(overlapping.guides).toHaveLength(0)
  })

  it('GR-10 takes the label font LC-6 stored rather than deriving it a second time', () => {
    // An arrow's plan bar is 14 tall, so planHeight x actualOfPlan x fontOfActual
    // is 8.176 -- under S-8. FR-094 applies the text floor SEPARATELY and has
    // S-9 multiply the thin shapes, which is the value LC-5 measured with.
    const schedule = withVisuals(
      [spanning(1, '2026-01-01', 5, { name: 'a'.repeat(40) })],
      [{ taskUid: 1, shapeKind: 'arrow' }],
    )
    const placed = layoutFromSchedule(schedule, GEOM_SETTINGS, REGIONS).placements[0]!
    const label = geometryOf(schedule).tasks[0]!.label!
    expect(placed.labelPlacement).toBe('right')
    expect(label.height).toBe(placed.labelFontSize)
    expect(label.height).toBe(12)
  })

  it('FR-019 encloses both rows when the range names the top one below the bottom', () => {
    const schedule = scheduleOf({
      taskGroups: [
        { id: 'g1', parentId: null, order: 0, height: null },
        { id: 'g2', parentId: null, order: 1, height: null },
      ],
      highlightBoxes: [
        {
          id: 'h1',
          startDate: '2026-01-11',
          endDate: '2026-01-01',
          topGroupId: 'g2',
          bottomGroupId: 'g1',
          strokeColor: null,
          cornerRadiusPx: null,
        },
      ],
    })
    const rows = layoutFromSchedule(schedule, GEOM_SETTINGS, REGIONS).rows
    const box = geometryOf(schedule).highlightBoxes[0]!.box
    // Both axes read both edges: the range is inverted on each, and the last
    // row of it has to stay inside the box.
    expect(box.x).toBeCloseTo(xOf(0), 6)
    expect(box.x + box.width).toBeCloseTo(xOf(10), 6)
    expect(box.y).toBeCloseTo(rows[0]!.y, 6)
    expect(box.y + box.height).toBeCloseTo(rows[1]!.y + rows[1]!.height, 6)
  })
})

// ---------------------------------------------------------------------------
// ItemHitArea (PI-7) -- table T-023d's order, and SL-3.
// ---------------------------------------------------------------------------

describe('ItemHitArea (PI-7)', () => {
  // ⚠️ itemAtPointer takes the slop as an argument and ships no default, the
  // same way EditHistory takes S-94 / S-95: table T-206 keeps these values out
  // of the document because they belong to the reader's environment. So the
  // cases below state them, at the numbers table T-206 records.
  const SLOP: PointerSlop = {
    planEndpoint: 6, // S-90 -- 6px above and below the plan bar
    actualEndpoint: 6, // S-91 -- the actual bar's own band
    fadeHandle: 7.5, // S-92 -- half of the 15 x 15 square
    dummyWidth: 30, // S-93 -- 30 x 20
    dummyHeight: 20, // S-93
    // ⛔ No row of table T-206 states this one, and no other table does either:
    // GR-13 and GR-16 give the place as 線の上 and stop. The value here is the
    // test's own, chosen so a probe sitting exactly ON the line answers.
    line: 4,
  }
  const oneTask = (part: Record<string, unknown> = {}): ScheduleGeometry =>
    geometryOf(oneRow([spanning(1, '2026-01-01', 20, part)]))
  const middleY = REGIONS.rowArea.y + 14

  it('GR-12 answers the plan bar body', () => {
    expect(itemAtPointer(oneTask(), xOf(10), middleY, SLOP)).toEqual({
      item: { kind: 'task', taskUid: 1 },
      grab: 'GR-12',
    })
  })

  // -------------------------------------------------------------------------
  // PD-191 -- FR-075's MUST, read as a hit test.
  //
  // ⭐ WRITTEN FROM docs/spec, NOT FROM THE UNIT (04-verification.md, 1.). What
  // was read of `src/`: the published signatures of PI-6 and PI-7 and the
  // declaration of `TaskGeometry`. The two corners come from table T-012a's own
  // four points, not from the list the unit builds.
  // -------------------------------------------------------------------------

  /** The plan bar's top-left and bottom-right, where GR-1 and GR-2 stand. */
  const planCornersOf = (geometry: ScheduleGeometry, uid: number) => {
    const found = geometry.tasks.find((one) => one.taskUid === uid)
    if (found === undefined) throw new Error(`no geometry for task ${uid}`)
    const points = outlinePoints(found.plan)
    const xs = points.map((one) => one.x)
    const ys = points.map((one) => one.y)
    return {
      topLeft: { x: Math.min(...xs), y: Math.min(...ys) },
      bottomRight: { x: Math.max(...xs), y: Math.max(...ys) },
    }
  }

  const SELECTED_TASK_1 = selectionWith(emptySelection(), { kind: 'task', uid: 1 })

  it('FR-075 (MUST): the fade corners answer GR-1 / GR-2 on the SELECTED Task', () => {
    // FR-075: 「掴み点は選択しているタスクにだけ出すこと（MUST）」, and S-111 of
    // table T-210 states the condition as 「選択中のタスクだけ」. Table T-023d
    // places GR-1 at 「予定バーの左上の角」 and GR-2 at 「右下の角」, above
    // GR-3 and GR-4 -- so the two corners are where the priority can be read.
    const schedule = oneRow([spanning(1, '2026-01-01', 20)])
    const corners = planCornersOf(geometryOf(schedule), 1)
    const selected = geometryOf(schedule, GEOM_SETTINGS, SELECTED_TASK_1)
    // The picture the hit test reads IS table T-012a's two corners.
    expect(selected.tasks[0]!.fadeHandles).toEqual([corners.topLeft, corners.bottomRight])
    expect(itemAtPointer(selected, corners.topLeft.x, corners.topLeft.y, SLOP)).toEqual({
      item: { kind: 'task', taskUid: 1 },
      grab: 'GR-1',
    })
    expect(
      itemAtPointer(selected, corners.bottomRight.x, corners.bottomRight.y, SLOP)?.grab,
    ).toBe('GR-2')
  })

  it('PD-191: pressing the corner of a Task that is NOT selected does not answer GR-1', () => {
    // Same corner, nothing selected. FR-075 forbids the point being there at
    // all, so the next row of table T-023d that claims it wins: GR-3 at 「予定
    // バーの左端」 and GR-4 at 「右端」. ⛔ An answer of GR-1 here is the defect
    // PD-191 was raised for -- GR-1 and GR-2 are asked of EVERY Task before
    // GR-3 is asked of any, so one stray pair takes a neighbour's end away.
    const schedule = oneRow([spanning(1, '2026-01-01', 20)])
    const bare = geometryOf(schedule)
    const corners = planCornersOf(bare, 1)
    expect(bare.tasks[0]!.fadeHandles).toHaveLength(0)
    expect(itemAtPointer(bare, corners.topLeft.x, corners.topLeft.y, SLOP)?.grab).toBe('GR-3')
    expect(
      itemAtPointer(bare, corners.bottomRight.x, corners.bottomRight.y, SLOP)?.grab,
    ).toBe('GR-4')
  })

  it('FR-075 (MUST): selecting ONE Task does not put a corner on its neighbour', () => {
    // 「選択しているタスクにだけ」 is per Task, not per frame. Two Tasks on one
    // row, one selected: the other one's own corner still answers GR-3.
    const schedule = oneRow([spanning(1, '2026-01-01', 10), spanning(2, '2026-02-01', 10)])
    const geometry = geometryOf(schedule, GEOM_SETTINGS, SELECTED_TASK_1)
    const other = planCornersOf(geometry, 2)
    expect(geometry.tasks.find((one) => one.taskUid === 2)!.fadeHandles).toHaveLength(0)
    expect(itemAtPointer(geometry, other.topLeft.x, other.topLeft.y, SLOP)?.grab).toBe('GR-3')
  })

  it('GR-3 and GR-4 beat GR-12 at the two ends', () => {
    const geometry = oneTask()
    expect(itemAtPointer(geometry, xOf(0), middleY, SLOP)?.grab).toBe('GR-3')
    expect(itemAtPointer(geometry, xOf(20), middleY, SLOP)?.grab).toBe('GR-4')
  })

  it('S-90 reaches past the top and the bottom of the bar', () => {
    const geometry = oneTask()
    expect(itemAtPointer(geometry, xOf(10), REGIONS.rowArea.y - 4, SLOP)?.grab).toBe('GR-12')
    expect(itemAtPointer(geometry, xOf(10), REGIONS.rowArea.y - 9, SLOP)).toBeNull()
  })

  it('GR-5 takes the actual start, and the actual BODY is not a grab area at all', () => {
    // 2026-01-05 is a Monday, so five worked days reach the 10th: x 194 to 230.
    const geometry = oneTask({ actualStart: '2026-01-05', actualDuration: 5 })
    expect(itemAtPointer(geometry, xOf(4), middleY, SLOP)?.grab).toBe('GR-5')
    // The MIDDLE of the actual bar answers GR-12: the plan is the taller of the
    // two, so where they overlap the plan is what is picked up.
    expect(itemAtPointer(geometry, xOf(7), middleY, SLOP)?.grab).toBe('GR-12')
  })

  it('GR-7 takes the marker markerGap outside the ACTUAL bar, over the plan body', () => {
    // GR-7: 進捗マーカー -- 実績バーの右端の外側. ⛔ Outside the ACTUAL bar,
    // which is not "outside every bar": the actual ends at day 7 while the plan
    // runs to day 20, so the marker lands ON the plan bar. GR-7 stands above
    // GR-12 in table T-023d, so the marker wins there anyway.
    const running = oneTask({ actualStart: '2026-01-01', actualDuration: 5 })
    expect(itemAtPointer(running, xOf(7) + MARKER_OFFSET, middleY, SLOP)?.grab).toBe('GR-7')
    // A whole markerSize further along the same plan body -- clear of the
    // square -- GR-12 answers, which is what makes the line above a real win.
    expect(
      itemAtPointer(running, xOf(7) + MARKER_OFFSET + settingNumber('markerSize'), middleY, SLOP)
        ?.grab,
    ).toBe('GR-12')
  })

  it('GR-7 follows the end-point dummy while the Task is not started', () => {
    // 未着手のときは終了点の掴みシロの外側: the marker leaves the plan's right
    // end and joins the two faint dummies at the head of the bar.
    expect(itemAtPointer(oneTask(), xOf(1) + MARKER_OFFSET, middleY, SLOP)?.grab).toBe('GR-7')
  })

  it('GR-9 beats GR-17 where the two dummies overlap', () => {
    // Both are 30 x 20 and one worked day apart -- 6px here -- so they do. The
    // probe stands clear of GR-3, which is above BOTH of them in the table and
    // would otherwise win at the plan's own start, and clear of GR-7, which
    // GR-7's own 未着手 clause has just brought within 8px of GR-17.
    expect(itemAtPointer(oneTask(), xOf(0) + 8, middleY, SLOP)?.grab).toBe('GR-9')
  })

  it('holds table T-023d order ACROSS Tasks, not within one', () => {
    // Two Tasks on ONE lane. Task 1's plan stops at day 15 but its actual runs
    // on to day 20 -- 14 worked days from Thursday 2026-01-01 (RV-1) -- and
    // Task 2 starts on day 20, which ST-10 does not call an overlap. GR-7 hangs
    // the marker off the ACTUAL bar's right end (FR-013), and OC-3 keeps it out
    // of the occupancy, so Task 1's marker lands inside Task 2's BODY. GR-7 is
    // above GR-12 in table T-023d, so it wins -- walking Task by Task instead
    // would answer GR-12 whenever Task 2 was reached first.
    // ⚠️ Task 1 is under way on purpose: 未着手 would send GR-7 back to the
    // end-point dummy at Task 1's own head, and the two Tasks would not meet.
    const geometry = geometryOf(
      oneRow([
        spanning(1, '2026-01-01', 15, { actualStart: '2026-01-01', actualDuration: 14 }),
        spanning(2, '2026-01-21', 20),
      ]),
    )
    // Day 20 is the actual's right end, not the plan's, which stopped at 15.
    expect(geometry.tasks[0]!.marker!.centre.x).toBeCloseTo(xOf(20) + MARKER_OFFSET, 6)
    expect(itemAtPointer(geometry, xOf(20) + MARKER_OFFSET, middleY, SLOP)?.grab).toBe('GR-7')
  })

  it('GR-13 takes a dependency line where it runs clear of the bars', () => {
    const schedule = oneRow([
      spanning(1, '2026-01-01', 20),
      taskOf({
        uid: 3,
        start: '2026-03-01',
        finish: '2026-03-21',
        dependencies: [{ predecessorUid: 1, linkType: 1 }],
      }),
    ])
    const geometry = geometryOf(schedule)
    const line = geometry.dependencies[0]!
    const between = (line.points[0]!.x + line.points[1]!.x) / 2
    expect(itemAtPointer(geometry, between, line.points[0]!.y, SLOP)?.item).toEqual({
      kind: 'dependency',
      predecessorUid: 1,
      successorUid: 3,
    })
  })

  it('answers null off everything', () => {
    expect(itemAtPointer(oneTask(), xOf(200), REGIONS.rowArea.y + 400, SLOP)).toBeNull()
  })

  it('SL-3 takes what the rectangle wholly encloses and leaves what it merely touches', () => {
    const geometry = oneTask()
    expect(itemsInMarquee(geometry, { x: 0, y: 0, width: 2000, height: 2000 })).toEqual([
      { kind: 'task', taskUid: 1 },
    ])
    // Cutting the bar in half touches it, which SL-3 forbids counting.
    expect(itemsInMarquee(geometry, { x: 0, y: 0, width: xOf(10), height: 2000 })).toEqual([])
  })

  it('SL-1 keeps the status line out of a marquee but leaves GR-16 answering', () => {
    const schedule = scheduleOf({
      project: { calendarUid: null, statusDate: '2026-06-01' },
      tasks: [spanning(1, '2026-01-01', 20)],
      taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
      taskGroupMembers: [{ groupId: 'g1', taskUid: 1 }],
    })
    const geometry = geometryOf(schedule)
    expect(geometry.statusLine).not.toBeNull()
    const taken = itemsInMarquee(geometry, { x: 0, y: 0, width: 4000, height: 4000 })
    expect(taken.every((one) => one.kind !== 'statusLine')).toBe(true)
    expect(itemAtPointer(geometry, geometry.statusLine!.x, REGIONS.rowArea.y + 200, SLOP)?.grab).toBe(
      'GR-16',
    )
  })
})

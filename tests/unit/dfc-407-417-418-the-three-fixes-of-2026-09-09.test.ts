// Three anchors, one per defect closed on 2026-09-09. ⛔ NOT A NEW SUITE and not
// a search for defects: rule 04 section 3.5 admits a unit case only as a
// 戻り止め for something already measured, and each case below fixes one
// measurement taken this round.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// THE CLAUSES, VERBATIM
//
//   DFC-417  FR-094 (`docs/spec/01-04-requirements.md`)
//          「`GRS` は、日程表を描くときの寸法 …… 進捗マーカーと再開アイコン ……
//          を、`_assets/tbl-settings.md` の表 T-201 に従って決めること（MUST）。
//          同表に無い寸法を実装が独自に持ってはならない（MUST NOT）」
//          -- and 表 T-201 の `S-24`（`markerStroke`）is the only stroke width
//          the 進捗マーカー group keeps. ⛔ Measured 2026-09-08: the disc was
//          typed at 1 and its three symbols at 1.5, so turning S-24 moved none
//          of them.
//
//   DFC-407  FR-043 「⭐⭐ 3 つ目は図形と色である —— ダミーの図形は、そのマイル
//          ストーンの実績の図形と同じとすること（MUST）。矩形で描いてはならない
//          （MUST NOT）」（利用者の裁定 2026-09-08）
//          ⛔ Measured 2026-09-08: with the plan hidden the dummy fell back to
//          a four-cornered rectangle, which is the figure that MUST NOT names.
//
//   DFC-418  表 T-108 の `AG-5` 「UI と同じ検証・同じ制限を通ること（MUST）」,
//          and FR-078's roster, 表 T-012 の `SH-5`.
//          ⛔ Measured 2026-09-08: `'NOT-A-GLYPH'` came back `accepted: true`.
//
// ⛔ WHAT IS NOT ASSERTED. Nothing below states a figure for a milestone's
// glyph: 表 T-012 の `SH-5` names the fifteen in Japanese and no row of the
// specification draws one, so the milestone cases compare one picture with
// another rather than with a shape typed here.

import { describe, expect, it } from 'vitest'

import { specTable } from '../contract/spec-table'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  COLUMN_SHAPES,
  type Calendar,
  type Schedule,
  type Task,
  type TaskGroup,
  type TaskGroupMember,
  type TaskVisual,
} from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import { editTask } from '../../src/use-case/edit-document/edit-task'

// ---------------------------------------------------------------------------
// The document under test. Plain data; every builder returns a fresh object.
// ---------------------------------------------------------------------------

/** Expand SETTINGS_DEFAULTS' dotted keys into the nested shape the type has. */
const settingsOf = (over: Readonly<Record<string, unknown>> = {}): DocumentSettings => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries({ ...SETTINGS_DEFAULTS, ...over })) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      out[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const nest = { ...((out[head] as Record<string, unknown>) ?? {}) }
    nest[key.slice(dot + 1)] = value
    out[head] = nest
  }
  return out as unknown as DocumentSettings
}

/** Every weekday worked, so 「翌稼働日」 is the next calendar day (FR-054). */
const EVERY_DAY_WORKED = {
  uid: 1,
  name: 'every day worked',
  isBaseCalendar: true,
  baseCalendarUid: null,
  ordinal: 0,
  carry: {},
  carryElements: [],
  weekDays: [1, 2, 3, 4, 5, 6, 7].map((ordinal) => ({
    ordinal,
    dayType: ordinal,
    dayWorking: true,
    carry: {},
    carryElements: [],
  })),
  exceptions: [],
} as unknown as Calendar

const task = (over: Partial<Task> & { readonly uid: number }): Task =>
  ({
    wbsParentUid: null,
    wbsOrder: null,
    name: null,
    start: null,
    finish: null,
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
    carryElements: [],
    ...over,
  }) as unknown as Task

const taskGroup = (id: string, order: number): TaskGroup =>
  ({
    id,
    parentId: null,
    label: id,
    derivedFromTaskUid: null,
    order,
    isCollapsed: false,
    isHidden: false,
    color: null,
    height: null,
  }) as unknown as TaskGroup

const visualOf = (taskUid: number, shapeKind: string, glyph: string | null): TaskVisual =>
  ({
    taskUid,
    nameAnchor: null,
    nameAlign: null,
    shapeKind,
    milestoneGlyph: glyph,
    fillColor: null,
    strokeColor: null,
    lineWeight: null,
  }) as unknown as TaskVisual

const scheduleOf = (tasks: readonly Task[], visuals: readonly TaskVisual[]): Schedule =>
  ({
    project: {
      id: null, name: null, title: null, subject: null, category: null, company: null,
      manager: null, author: null, created: null, revision: null, lastSaved: null,
      startDate: '2026-03-01T00:00:00', statusDate: null, minutesPerDay: null,
      minutesPerWeek: null, daysPerMonth: null, weekStartDay: null,
      calendarUid: EVERY_DAY_WORKED.uid, themeHue: 214, uidHighWaterMark: 1000,
      importSeq: 0, carry: {}, carryElements: [],
    },
    calendars: [EVERY_DAY_WORKED],
    tasks,
    resources: [],
    assignments: [],
    taskGroups: [taskGroup('g1', 0)],
    taskGroupMembers: tasks.map((one) => ({
      taskUid: one.uid, groupId: 'g1', stackOrder: null,
    })) as unknown as readonly TaskGroupMember[],
    taskVisuals: visuals,
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

/** BO-1 of table T-077: what the environment settles, not the document. */
const SCREEN = { width: 1280, height: 800, appHeaderHeight: 48, scrollbarThickness: 8 }

/** A day of March 2026, as a stored date column writes it. */
const day = (d: number): string => `2026-03-${String(d).padStart(2, '0')}T00:00:00`

interface Drawn {
  readonly geometry: ReturnType<typeof geometryFromLayout>
  readonly svg: string
}

/** One pass of table T-068's chain, then PI-19. */
const draw = (schedule: Schedule, over: Readonly<Record<string, unknown>> = {}): Drawn => {
  const settings = settingsOf({ zoomX: 1, scrollDate: day(1), stackDirection: 'down', ...over })
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection())
  return {
    geometry,
    svg: svgFromSchedule(schedule, settings, layout, geometry, regions, emptySelection(), 'screen'),
  }
}

/** Every `stroke-width` the marker's own figure was spelled with. */
const markerStrokeWidths = (svg: string): number[] =>
  [...svg.matchAll(/<[^>]*data-figure="[^"]*-marker"[^>]*>/g)]
    .map((one) => /stroke-width="([0-9.]+)"/.exec(one[0])?.[1])
    .filter((one): one is string => one !== undefined)
    .map(Number)

/** The one faint mark FR-043 draws, as the renderer spelled its points. */
const dummyPointCount = (svg: string): number => {
  const found = /<polygon points="([^"]*)"[^>]*data-figure="[^"]*-dummies"/.exec(svg)
  if (found === null) throw new Error('no dummy figure was drawn')
  return (found[1] ?? '').trim().split(/\s+/).length
}

// ---------------------------------------------------------------------------

describe('DFC-417: the progress marker reads S-24 for its stroke (FR-094)', () => {
  const started = (): Schedule =>
    scheduleOf(
      [task({
        uid: 1,
        start: day(2),
        finish: day(12),
        actualStart: day(2),
        actualDuration: 4,
        percentComplete: 50,
      })],
      [visualOf(1, 'rectangle', null)],
    )

  it('every stroke of the marker follows the value, and none is left behind', () => {
    // Rule 04 section 2: 「原稿から値が届く仕組みの受け入れ試験は『原稿の値を 1 つ
    // 変えると試験が落ちるか』とする」. So the case turns S-24 and watches.
    const turned = 3.7
    const drawn = markerStrokeWidths(draw(started(), { markerStroke: turned }).svg)
    expect(drawn.length).toBeGreaterThan(0)
    for (const width of drawn) expect(width).toBe(turned)
  })

  it('the same figure follows a second value, so no number of its own is left', () => {
    const drawn = markerStrokeWidths(draw(started(), { markerStroke: 0.8 }).svg)
    expect(drawn.length).toBeGreaterThan(0)
    for (const width of drawn) expect(width).toBe(0.8)
  })
})

describe("DFC-407: a not-started milestone's dummy is its own figure (FR-043)", () => {
  const milestone = (glyph: string): Schedule =>
    scheduleOf(
      [task({ uid: 1, start: day(5), finish: day(5), milestone: true })],
      [visualOf(1, 'milestone', glyph)],
    )

  it('draws the same figure whether or not the plan is shown', () => {
    // ⭐ 「ダミーの図形は、そのマイルストーンの実績の図形と同じとすること（MUST）」.
    // The plan being hidden (S-64) says nothing about the dummy, so the two
    // pictures must place the same figure -- which is why the two point counts
    // are compared with each other rather than with a number typed here.
    const shown = dummyPointCount(draw(milestone('star'), { planVisible: true }).svg)
    const hidden = dummyPointCount(draw(milestone('star'), { planVisible: false }).svg)
    expect(hidden).toBe(shown)
  })

  it('is not the rectangle, with the plan hidden', () => {
    // ⛔ 「矩形で描いてはならない（MUST NOT）」. A rectangle is four corners; the
    // star of SH-5 is not four of anything. ⚠️ Only a glyph whose outline has
    // more corners than a rectangle can state this, which is why the case names
    // one rather than sweeping all fifteen.
    expect(dummyPointCount(draw(milestone('star'), { planVisible: false }).svg)).not.toBe(4)
  })
})

describe('DFC-418: the write path judges the figure (AG-5, FR-078)', () => {
  const document = (): Document =>
    ({
      schedule: scheduleOf(
        [task({ uid: 1, start: day(5), finish: day(5), milestone: true })],
        [visualOf(1, 'milestone', 'diamond')],
      ),
    }) as unknown as Document

  /** The figures table T-012's SH-5 names, counted in the manuscript itself. */
  const SH_5_FIGURE_COUNT = ((): number => {
    const row = specTable('T-012').rows.find((one) => one.id === 'SH-5')
    if (row === undefined) throw new Error('table T-012 has no row SH-5')
    const spelt = row.by['表記']
    if (spelt === undefined) throw new Error('table T-012 row SH-5 has no 表記 cell')
    return spelt.trim().split(/\s+/).length
  })()

  const GLYPHS = COLUMN_SHAPES.TaskVisual.milestoneGlyph?.choices ?? []

  it('admits every figure SH-5 names, and exactly that many', () => {
    // ⛔ The roster is not written out here either: `COLUMN_SHAPES` is the
    // schema's own enumeration, and the count is read from the manuscript so
    // that a figure added to SH-5 and forgotten in `erd.json` falls here.
    expect(GLYPHS.length).toBe(SH_5_FIGURE_COUNT)
    for (const glyph of GLYPHS) {
      const out = editTask(document(), {
        kind: 'setTaskVisualMilestoneGlyph', uid: 1, glyph,
      } as never)
      expect(out.ok, `${glyph} was refused`).toBe(true)
    }
  })

  it('refuses a word that is not one of them (AG-5)', () => {
    const out = editTask(document(), {
      kind: 'setTaskVisualMilestoneGlyph', uid: 1, glyph: 'NOT-A-GLYPH',
    } as never)
    expect(out.ok).toBe(false)
  })

  it('still clears the column, which is not an unknown word (AT-101)', () => {
    const out = editTask(document(), {
      kind: 'setTaskVisualMilestoneGlyph', uid: 1, glyph: null,
    } as never)
    expect(out.ok).toBe(true)
  })
})

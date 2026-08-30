// Unit tests for the "name label vertical position" column table T-012 gained
// on 2026-08-27 (appendix revision 1.17, CR-265), and for the two paragraphs
// printed under that table.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/. ⛔ Written from docs/spec alone -- rule 04 section 1 keeps the
// author of a unit out of its tests, and the behaviour under test here was
// checked by hand in a browser and by nothing else.
//
// ⭐ The imports, `settingsOf`, `taskOf`, `scheduleOf`, `withVisuals`,
// `spanning` and the `ENV` / regions fixture are COPIED FROM
// tests/unit/layout-engine.test.ts, which drives the same two units
// (ScheduleLayout PI-5 and ScheduleGeometry PI-6). ⛔ That file already asserts
// the label box's HEIGHT for the right-hand arm (its GR-10 case) and says
// nothing about where the box sits DOWN the band; this file owns the vertical
// alone and does not touch it.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  layoutFromSchedule,
  taskPlacement,
  type TaskPlacement,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  geometryFromLayout,
  NOT_STORED_LABEL_SIZES,
  type BarGeometry,
  type TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRect,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'

// A case states only the keys it deliberately pins; every other key arrives
// from SETTINGS_DEFAULTS, which `npm run gen` prints from the manuscript, so a
// re-ruled default moves these cases with it rather than leaving them green
// against a stale copy (rule 03 section 1).
const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

/** The generated defaults, read by their printed dotted keys. */
const FLAT = SETTINGS_DEFAULTS as unknown as Record<string, number>

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8, // half of the 17px Windows draws, per FR-051
}

// ⚠️ S-2 and S-3 are stated as expressions with one solution per fontScale, so
// the pair below is the S column of both rows and not a number of this file's
// own. `stackDirection` is pinned to 'down' (S-58 defaults to 'up') so every y
// asserted here reads from the top of the band, and `scrollDate` is pinned
// because S-77's default is null -- OP-10 of table T-024a would otherwise pick
// the origin, which is not what these cases are about.
const SETTINGS = settingsOf({
  rulerFont: 12, // S-3, fontScale S
  rulerHeight: 42, // S-2, fontScale S
  stackDirection: 'down', // S-58
  scrollDate: '2026-01-01', // S-77
  // ⚠️ NESTED BY HAND BECAUSE THE GENERATED CONSTANT IS FLAT. `SETTINGS_DEFAULTS`
  // prints `'shapeHeightOf.arrow'` and friends as dotted top-level keys, while
  // the runtime type wants one object -- so spreading the constant alone leaves
  // `settings.shapeHeightOf` undefined and `planHeightOf` throws before any case
  // can assert anything. tests/unit/layout-engine.test.ts supplies it the same
  // way. ⛔ NO VALUE IS TYPED HERE: each is read back out of the generated
  // constant, so a change in the manuscript reaches these cases.
  shapeHeightOf: {
    rectangle: FLAT['shapeHeightOf.rectangle'],
    chevron: FLAT['shapeHeightOf.chevron'],
    arrow: FLAT['shapeHeightOf.arrow'],
    endpointSpan: FLAT['shapeHeightOf.endpointSpan'],
    milestone: FLAT['shapeHeightOf.milestone'],
  },
})

const REGIONS = regionsFromScreen(ENV, SETTINGS)

// ⚠️ Every nullable column table T-019a reads has to be spelled `null` here.
// Leaving one `undefined` reads as "set".
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

// ⚠️ `project` and `calendars` are not padding: DR-2 makes both part of the
// schedule group, and naming no calendar is what sends the layout to table
// T-209's default calendar.
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

/** One root row holding the tasks given, with a shape chosen for each. */
const withVisuals = (
  tasks: readonly Task[],
  visuals: readonly Record<string, unknown>[],
): Schedule =>
  scheduleOf({
    tasks,
    taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
    taskGroupMembers: tasks.map((drawnText) => ({ groupId: 'g1', taskUid: drawnText.uid })),
    taskVisuals: visuals,
  })

/** A task starting on `from` and running `days`. At zoomX 1 one day is 6px. */
const spanning = (
  uid: number,
  from: string,
  days: number,
  part: Record<string, unknown> = {},
): Task => {
  const finish = new Date(new Date(from + 'T00:00:00Z').getTime() + days * 86400000)
  return taskOf({ uid, start: from, finish: finish.toISOString().slice(0, 10), ...part })
}

/** The placement, the picture and the label box of task 1, in one move. */
const drawnOf = (
  schedule: Schedule,
): { placed: TaskPlacement; drawn: TaskGeometry; label: ScreenRect } => {
  const layout = layoutFromSchedule(schedule, SETTINGS, REGIONS)
  const placed = taskPlacement(layout, 1)
  if (placed === null) throw new Error('task 1 was not drawn at this zoom')
  const drawn = geometryFromLayout(
    schedule,
    SETTINGS,
    layout,
    REGIONS,
    emptySelection(),
  ).tasks.find((one) => one.taskUid === 1)
  if (drawn === undefined) throw new Error('task 1 has no picture')
  const label = drawn.label
  if (label === null) throw new Error('task 1 has no drawn label')
  return { placed, drawn, label }
}

/** How far down the band one drawn bar reaches, its head and end dots included. */
const extentOf = (bar: BarGeometry | null): { top: number; bottom: number } | null => {
  if (bar === null) return null
  if (bar.form === 'outline') {
    const ys = bar.points.map((one) => one.y)
    return { top: Math.min(...ys), bottom: Math.max(...ys) }
  }
  const half = bar.strokeWidth / 2
  const ys = [bar.from.y - half, bar.from.y + half, bar.to.y - half, bar.to.y + half]
  for (const one of bar.head ?? []) ys.push(one.y)
  for (const dot of bar.dots) ys.push(dot.at.y - dot.radius, dot.at.y + dot.radius)
  return { top: Math.min(...ys), bottom: Math.max(...ys) }
}

/**
 * The plan and the actual taken together -- what table T-012's column calls the
 * combined height for SH-1, SH-2 and SH-5. ⭐ Measured off the PICTURE rather
 * than off `TaskPlacement.height`, because the column names the two bars and
 * not the band the row's stacking reserved for them.
 */
const combinedExtentOf = (drawn: TaskGeometry): { top: number; bottom: number } => {
  const plan = extentOf(drawn.plan)
  const actual = extentOf(drawn.actual)
  if (plan === null) throw new Error('no plan bar was drawn')
  if (actual === null) return plan
  return { top: Math.min(plan.top, actual.top), bottom: Math.max(plan.bottom, actual.bottom) }
}

/** The top edge of a line-form plan bar's stroke -- what S-196 measures from. */
const strokeTopOf = (bar: BarGeometry | null): number => {
  if (bar === null || bar.form !== 'line') throw new Error('this bar is not a line')
  return Math.min(bar.from.y, bar.to.y) - bar.strokeWidth / 2
}

const centreOf = (box: ScreenRect): number => box.y + box.height / 2
const bottomOf = (box: ScreenRect): number => box.y + box.height

// A name of two half-width units, which NL-1 of table T-013 keeps inside a bar
// this long at either type size, and one of 40 units, which NL-3 pushes out to
// the right. ⚠️ 40 is under `truncateUnits` (S-35, raised to 全角 24 = 半角 48
// by CR-283), so LC-4 leaves this one whole.
const SHORT_NAME = 'ab'
const LONG_NAME = 'a'.repeat(40)

// ---------------------------------------------------------------------------
// The centred half of the column: SH-1, SH-2 and SH-5.
// ---------------------------------------------------------------------------

describe('table T-012 -- the name label sits on the centre of the combined height', () => {
  it('SH-1 centres the label on the plan and the actual taken together', () => {
    // T-012 row SH-1 (rectangle): the "name label vertical position" column
    // reads "the centre of the plan and the actual taken together". The column
    // beside it reads "laid over the inside", so the two bars share one extent
    // and the centre of the pair is the centre of the plan bar.
    const schedule = withVisuals(
      [
        spanning(1, '2026-01-01', 20, {
          name: SHORT_NAME,
          actualStart: '2026-01-01',
          actualDuration: 5,
        }),
      ],
      [{ taskUid: 1, shapeKind: 'rectangle' }],
    )
    const { placed, drawn, label } = drawnOf(schedule)
    expect(placed.shapeKind).toBe('rectangle')
    expect(placed.actualPlacement).toBe('inside')

    const combined = combinedExtentOf(drawn)
    expect(centreOf(label)).toBeCloseTo((combined.top + combined.bottom) / 2, 6)
  })

  it('SH-2 centres it too, so the notch of the chevron changes nothing', () => {
    // T-012 row SH-2 (chevron). LF-6 of table T-221 cuts the notch out of the
    // same band, so the answer is that band's centre exactly as SH-1's is.
    const schedule = withVisuals(
      [
        spanning(1, '2026-01-01', 20, {
          name: SHORT_NAME,
          actualStart: '2026-01-03',
          actualDuration: 5,
        }),
      ],
      [{ taskUid: 1, shapeKind: 'chevron' }],
    )
    const { placed, drawn, label } = drawnOf(schedule)
    expect(placed.shapeKind).toBe('chevron')
    expect(placed.actualPlacement).toBe('inside')

    const combined = combinedExtentOf(drawn)
    expect(centreOf(label)).toBeCloseTo((combined.top + combined.bottom) / 2, 6)
  })

  it('SH-5 centres it, even though its actual moves sideways rather than down', () => {
    // T-012 row SH-5 (milestone): the column beside reads "shifted sideways to
    // the actual date", and LF-10 of table T-221 gives the two figures ONE
    // vertical centre -- so moving the actual along the time axis must not move
    // the label. ⚠️ A milestone's date span is zero; CR-163 measures the SHAPE,
    // which LF-10 makes 28 x 1.5 across, clearing S-86's 24px.
    const schedule = scheduleOf({
      tasks: [
        taskOf({
          uid: 1,
          start: '2026-01-11',
          finish: '2026-01-11',
          milestone: true,
          name: SHORT_NAME,
          actualStart: '2026-01-14',
        }),
      ],
      taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
      taskGroupMembers: [{ groupId: 'g1', taskUid: 1 }],
    })
    const { placed, drawn, label } = drawnOf(schedule)
    expect(placed.shapeKind).toBe('milestone')
    expect(placed.actualPlacement).toBe('sideways')

    const combined = combinedExtentOf(drawn)
    expect(centreOf(label)).toBeCloseTo((combined.top + combined.bottom) / 2, 6)
  })
})

// ---------------------------------------------------------------------------
// The lifted half of the column: SH-3 and SH-4, by the gap S-196 holds.
// ---------------------------------------------------------------------------

describe('table T-012 -- a line-only shape lifts the label clear of both lines', () => {
  /** One 20-day task with an actual, drawn as the shape named. */
  const shaped = (shapeKind: string): Schedule =>
    withVisuals(
      [
        spanning(1, '2026-01-01', 20, {
          name: SHORT_NAME,
          actualStart: '2026-01-04',
          actualDuration: 6,
        }),
      ],
      [{ taskUid: 1, shapeKind }],
    )

  it('SH-3 puts the label bottom S-196 above the top edge of the plan SHAPE', () => {
    // T-012 row SH-3 (arrow): the "name label vertical position" column reads
    // "lifted above the plan and the actual", and S-196 of table T-206 states
    // the amount as the gap between the TOP EDGE OF THE PLAN SHAPE and the
    // BOTTOM EDGE OF THE LABEL -- measured from the shape's bounding box
    // (CR-297: "予定の図形の上端", not "予定の線の上端"), because SH-3's
    // arrowhead stands taller than the line's own stroke.
    // ⛔ The 2px is read from the generated constant, never re-typed.
    const { drawn, label } = drawnOf(shaped('arrow'))
    expect(bottomOf(label)).toBeCloseTo(
      extentOf(drawn.plan)!.top - NOT_STORED_LABEL_SIZES['S-196'],
      6,
    )
  })

  it('SH-4 does the same, its two end dots being the only difference', () => {
    // T-012 row SH-4 (endpointSpan) carries the same words in that column as
    // SH-3, so it takes the same gap from the same edge.
    const { drawn, label } = drawnOf(shaped('endpointSpan'))
    expect(bottomOf(label)).toBeCloseTo(
      extentOf(drawn.plan)!.top - NOT_STORED_LABEL_SIZES['S-196'],
      6,
    )
  })

  it('SH-3 leaves the whole label above BOTH lines, which is what the column is for', () => {
    // The paragraph under T-012 gives the reason in as many words: a line has
    // no inside, so a label centred on it would lie across the plan line AND
    // the actual line. ⭐ This case asserts the consequence rather than the
    // arithmetic, so it still reports when the gap is measured from a different
    // edge. The paragraph's own words: the label above and the actual below
    // means the three do not overlap, with the plan line between them.
    // ⛔ THE PLAN SIDE IS MEASURED FROM THE STROKE, NOT FROM `extentOf`. S-196
    // names its edge in as many words -- 「予定の線の上端と、ラベルの下端との
    // あいだの隙間である」 -- and `extentOf` answers a BOUNDING BOX that takes in
    // SH-3's arrow HEAD, which flares above and below the line at the far end.
    // Comparing against that box asks the label to clear a triangle that stands
    // at the other end of the bar, which no row asks for, and would contradict
    // the arithmetic case above rather than confirm it.
    const { drawn, label } = drawnOf(shaped('arrow'))
    const actual = extentOf(drawn.actual)!
    expect(bottomOf(label)).toBeLessThanOrEqual(strokeTopOf(drawn.plan))
    expect(bottomOf(label)).toBeLessThan(actual.top)
    // ⛔ How far the actual is pushed down is LF-9's business, not this
    // column's, so nothing here measures that distance.
  })

  it('SH-4 leaves the whole label above both lines as well', () => {
    const { drawn, label } = drawnOf(shaped('endpointSpan'))
    const plan = extentOf(drawn.plan)!
    const actual = extentOf(drawn.actual)!
    expect(bottomOf(label)).toBeLessThanOrEqual(plan.top)
    expect(bottomOf(label)).toBeLessThan(actual.top)
  })

  it('SH-3 lifts the label and lowers the actual, which are the two SEPARATE columns', () => {
    // ⚠️ The paragraph under T-012 warns that the actual-placement column and
    // the name-label column are different questions: SH-3's "shifted down"
    // belongs to the actual BAR and says nothing about the label. Keying on the
    // wrong column would put the label BELOW the plan line instead of above it.
    const { placed, drawn, label } = drawnOf(shaped('arrow'))
    expect(placed.actualPlacement).toBe('below') // the actual-placement column
    const plan = extentOf(drawn.plan)!
    expect(extentOf(drawn.actual)!.top).toBeGreaterThan(plan.top) // the actual went DOWN
    expect(label.y).toBeLessThan(plan.top) // the label went UP
  })

  it('does not lift the label for a shape that has an inside, which is the split the column makes', () => {
    // The same dates and the same name on SH-1: the column splits the five
    // shapes into "centred" and "lifted", so a rectangle must NOT take S-196.
    const { drawn, label } = drawnOf(shaped('rectangle'))
    const plan = extentOf(drawn.plan)!
    expect(label.y).toBeGreaterThanOrEqual(plan.top)
    expect(bottomOf(label)).toBeLessThanOrEqual(plan.bottom)
  })
})

// ---------------------------------------------------------------------------
// The second paragraph under T-012: the horizontal answer does not move.
// ---------------------------------------------------------------------------

describe('table T-012 -- the vertical rule leaves table T-013 alone', () => {
  const named = (shapeKind: string, days: number, name: string): Schedule =>
    withVisuals(
      [spanning(1, '2026-01-01', days, { name, actualStart: '2026-01-04', actualDuration: 3 })],
      [{ taskUid: 1, shapeKind }],
    )

  it('NL-1 still answers inside for the lifted shapes as much as for the centred ones', () => {
    // ⛔ The paragraph under T-012 states (MUST NOT) that the rule does not
    // change the horizontal placement table T-013 decides. FR-002 evaluates
    // T-013 in printed order and NL-1 holds here for all four: the cut label is
    // far narrower than a 20-day bar at either type size.
    for (const shapeKind of ['rectangle', 'chevron', 'arrow', 'endpointSpan']) {
      const { placed } = drawnOf(named(shapeKind, 20, SHORT_NAME))
      expect(placed.labelPlacement, shapeKind).toBe('inside')
    }
  })

  it('NL-3 still answers right for every one of them', () => {
    // 40 units cut to S-35's 24 are wider than a 10-day bar at either type
    // size, so NL-3 is the first row that holds -- for the lifted shapes as
    // much as for the centred ones. ⚠️ 10 days is 60px, clear of S-86's 24px,
    // so FR-018 is not what is being measured here.
    for (const shapeKind of ['rectangle', 'chevron', 'arrow', 'endpointSpan']) {
      const { placed } = drawnOf(named(shapeKind, 10, LONG_NAME))
      expect(placed.labelPlacement, shapeKind).toBe('right')
    }
  })

  it('NL-1 with SH-3 writes the label INSIDE the width and STILL lifts it', () => {
    // ⚠️ The case the paragraph names in as many words: when NL-1 holds for
    // SH-3 or SH-4 the label still moves above the shape, because a line has no
    // "inside" and NL-1's "written inside the shape" then means the horizontal
    // fit alone. So both answers hold at once -- inside across, lifted down.
    const { placed, drawn, label } = drawnOf(named('arrow', 20, SHORT_NAME))
    expect(placed.labelPlacement).toBe('inside')
    expect(label.x).toBeGreaterThanOrEqual(placed.x)
    expect(label.x + label.width).toBeLessThanOrEqual(placed.x + placed.width)
    expect(bottomOf(label)).toBeCloseTo(
      extentOf(drawn.plan)!.top - NOT_STORED_LABEL_SIZES['S-196'],
      6,
    )
  })

  it('NL-1 with SH-4 does the same', () => {
    const { placed, drawn, label } = drawnOf(named('endpointSpan', 20, SHORT_NAME))
    expect(placed.labelPlacement).toBe('inside')
    expect(label.x).toBeGreaterThanOrEqual(placed.x)
    expect(label.x + label.width).toBeLessThanOrEqual(placed.x + placed.width)
    expect(bottomOf(label)).toBeCloseTo(
      extentOf(drawn.plan)!.top - NOT_STORED_LABEL_SIZES['S-196'],
      6,
    )
  })

  it('NL-3 with SH-3 puts the label to the RIGHT of the shape and still lifts it', () => {
    // The other row of T-013 under the same shape: "written to the right of the
    // shape" is a horizontal answer, and the vertical column still holds.
    const { placed, drawn, label } = drawnOf(named('arrow', 10, LONG_NAME))
    expect(placed.labelPlacement).toBe('right')
    expect(label.x).toBeGreaterThanOrEqual(placed.x + placed.width)
    expect(bottomOf(label)).toBeCloseTo(
      extentOf(drawn.plan)!.top - NOT_STORED_LABEL_SIZES['S-196'],
      6,
    )
  })
})

// DFC-2765: FR-015 table T-339 BL-2 -- the baseline outline uses the plan bar's date-to-position conversion.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { SCREEN, bandOf, day, scheduleOf, taskOf, type Band, type Bar } from '../unit/cr-430-cross-section-scene'

const BL_2_X = '横は、`start` から `finish` までを、予定バーと同じ日付から位置への換算で置くこと（MUST）。'

interface Outline {
  readonly taskUid: number
  readonly kind: string
  readonly box: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
}

interface DrawnTask {
  readonly taskUid: number
  readonly plan: Bar | null
  readonly milestoneFigure: Bar | null
}

interface Texts {
  readonly start: string
  readonly finish: string
  readonly milestone?: boolean
}

const stageOf = (
  task: Task,
  baseline: Texts | null,
  settings: Readonly<Record<string, unknown>>,
): { outlines: readonly Outline[]; drawn: DrawnTask } => {
  const base = scheduleOf({ tasks: [task], shapeKind: 'rectangle' }) as unknown as Record<string, unknown>
  const schedule = {
    ...base,
    baselineTasks:
      baseline === null
        ? []
        : [{ uid: 1, name: null, start: baseline.start, finish: baseline.finish, milestone: baseline.milestone ?? false }],
  } as unknown as Schedule
  const merged = {
    ...SETTINGS_DEFAULTS,
    zoomX: 8,
    scrollDate: day(1),
    stackDirection: 'down',
    baselineVisible: true,
    ...settings,
  } as unknown as DocumentSettings
  const regions = regionsFromScreen(SCREEN, merged)
  const layout = layoutFromSchedule(schedule, merged, regions)
  const geometry = geometryFromLayout(schedule, merged, layout, regions, emptySelection(), null)
  const result = geometry as unknown as { tasks: readonly DrawnTask[]; baselineOutlines: readonly Outline[] }
  const drawn = result.tasks.find((one) => one.taskUid === 1)
  if (drawn === undefined) throw new Error('premise: the Task is not drawn')
  return { outlines: result.baselineOutlines, drawn }
}

const planBandOf = (drawn: DrawnTask): Band => {
  const figure = drawn.plan ?? drawn.milestoneFigure
  if (figure === null) throw new Error('premise: the Task has no drawn plan')
  return bandOf(figure)
}

const taskWith = (texts: Texts): Task =>
  ({ ...taskOf({ uid: 1 }), start: texts.start, finish: texts.finish, milestone: texts.milestone ?? false }) as Task

const sameTexts = (
  texts: Texts,
  settings: Readonly<Record<string, unknown>>,
): { outline: Outline; plan: Band } => {
  const { outlines, drawn } = stageOf(taskWith(texts), texts, settings)
  if (outlines.length !== 1) throw new Error(`premise: expected one outline, got ${outlines.length}`)
  return { outline: outlines[0] as Outline, plan: planBandOf(drawn) }
}

const MINUTES = { showsTimeOfDay: true }
const DAYS = { showsTimeOfDay: false }

describe('BL-2 -- the outline is placed with the plan bar\'s conversion from a date to a position', () => {
  it(`BL-2 「${BL_2_X}」: minute level, 04:15 to 08:15 on one day -- the box spans the plan bar's left and right, not the whole day`, () => {
    const texts = { start: '2026-03-10T04:15:00', finish: '2026-03-10T08:15:00' }
    const { outline, plan } = sameTexts(texts, MINUTES)
    expect(outline.kind).toBe('rectangle')
    expect(outline.box.x, BL_2_X).toBeCloseTo(plan.left, 6)
    expect(outline.box.x + outline.box.width, BL_2_X).toBeCloseTo(plan.right, 6)

    const wholeDay = sameTexts({ start: '2026-03-10', finish: '2026-03-10' }, DAYS).plan
    expect(wholeDay.right - wholeDay.left, 'premise: a day has a width').toBeGreaterThan(1)
    expect(outline.box.width, 'it must not fill the whole day').toBeLessThan(wholeDay.right - wholeDay.left - 1e-6)
    expect(outline.box.x, 'it starts inside the day, after 00:00').toBeGreaterThan(wholeDay.left + 1e-6)
  })

  it(`BL-2 「${BL_2_X}」: minute level, 03-09 13:00 to 03-11 10:30 -- the box spans the plan bar's left and right`, () => {
    const { outline, plan } = sameTexts({ start: '2026-03-09T13:00:00', finish: '2026-03-11T10:30:00' }, MINUTES)
    expect(outline.kind).toBe('rectangle')
    expect(outline.box.x, BL_2_X).toBeCloseTo(plan.left, 6)
    expect(outline.box.x + outline.box.width, BL_2_X).toBeCloseTo(plan.right, 6)
  })

  it(`BL-2 「${BL_2_X}」: minute level milestone at 09:00 -- the diamond is centred on where the plan bar places that instant`, () => {
    const texts = { start: '2026-03-10T09:00:00', finish: '2026-03-10T09:00:00', milestone: true }
    const { outline } = sameTexts(texts, MINUTES)
    expect(outline.kind).toBe('diamond')
    // WHY: a plan milestone stub has a minimum width that begins at the instant, so its centre is not the instant;
    // the left edge of a plain bar with the same start text is (BL-2 centres the diamond on the start position).
    const atStart = sameTexts({ start: texts.start, finish: '2026-03-10T12:00:00' }, MINUTES).plan.left
    expect(outline.box.x + outline.box.width / 2, BL_2_X).toBeCloseTo(atStart, 6)
  })

  it(`BL-2 「${BL_2_X}」: day level, date-only texts 03-06 to 03-14 -- the box equals the plan bar (day-level documents unchanged)`, () => {
    const { outline, plan } = sameTexts({ start: '2026-03-06', finish: '2026-03-14' }, DAYS)
    expect(outline.kind).toBe('rectangle')
    expect(outline.box.x, BL_2_X).toBeCloseTo(plan.left, 6)
    expect(outline.box.x + outline.box.width, BL_2_X).toBeCloseTo(plan.right, 6)
  })

  it(`BL-2 「${BL_2_X}」: day level, finish 03-14T00:00:00 on both the baseline and the Task -- the box equals the plan bar (FR-054 reads both alike)`, () => {
    const { outline, plan } = sameTexts({ start: '2026-03-06T00:00:00', finish: '2026-03-14T00:00:00' }, DAYS)
    expect(outline.kind).toBe('rectangle')
    expect(outline.box.x, BL_2_X).toBeCloseTo(plan.left, 6)
    expect(outline.box.x + outline.box.width, BL_2_X).toBeCloseTo(plan.right, 6)
  })
})

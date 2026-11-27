// Contract tests: the marker stroke follows S-24, a milestone dummy keeps its own figure, and the write path judges the glyph.

import { describe, expect, it } from 'vitest'

import { specTable } from './spec-table'
import { DEFAULT_DISPLAY_RATIO, DEFAULT_DISPLAY_SCALE } from '../fixtures/display-scale'
import {
  SETTINGS_CONSTANTS,
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
import { NOT_STORED_DELAY_MARK_SIZES, svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import { editTask } from '../../src/use-case/edit-document/edit-task'

const DEFAULT_TASK_GROUP_NAME_FIXTURE = 'fixture default task group name'

// Summary: settingsOf() expands the dotted keys of SETTINGS_DEFAULTS and the overrides into the nested DocumentSettings shape.
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

// Why: every weekday is worked, so the next working day is always the next calendar day.
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
    parentTaskUid: null,
    wbsOrder: null,
    name: null,
    start: null,
    finish: null,
    milestone: null,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    stop: null,
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
    name: id,
    derivedFromTaskUid: null,
    order,
    treeState: 'auto', color: null,
    minHeightPx: null,
  }) as unknown as TaskGroup

const visualOf = (taskUid: number, shapeKind: string, glyph: string | null): TaskVisual =>
  ({
    taskUid,
    shapeKind,
    milestoneGlyph: glyph,
    fillColor: null,
    strokeColor: null,
    strokeWidthPx: null,
  }) as unknown as TaskVisual

const scheduleOf = (tasks: readonly Task[], visuals: readonly TaskVisual[]): Schedule =>
  ({
    project: {
      id: null, name: null, title: null, subject: null, category: null, company: null,
      manager: null, author: null, creationDate: null, revision: null,
      startDate: '2026-03-01T00:00:00', statusDate: null, minutesPerDay: null,
      minutesPerWeek: null, daysPerMonth: null, weekStartDay: null,
      calendarUid: EVERY_DAY_WORKED.uid, themeHue: 214, uidHighWaterMark: 1000,
      importSequence: 0, carry: {}, carryElements: [],
    },
    calendars: [EVERY_DAY_WORKED],
    tasks,
    resources: [],
    assignments: [],
    taskGroups: [taskGroup('g1', 0)],
    taskGroupMembers: tasks.map((one) => ({
      taskUid: one.uid, taskGroupId: 'g1',
    })) as unknown as readonly TaskGroupMember[],
    taskVisuals: visuals,
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const SCREEN = { width: 1280, height: 800, appHeaderHeight: 48, scrollbarThickness: 8, propertyPanelWidth: 0 }

const day = (d: number): string => `2026-03-${String(d).padStart(2, '0')}T00:00:00`

interface Drawn {
  readonly geometry: ReturnType<typeof geometryFromLayout>
  readonly svg: string
}

// Summary: draw() lays the schedule out once and renders it to one SVG picture.
const draw = (schedule: Schedule, over: Readonly<Record<string, unknown>> = {}): Drawn => {
  const settings = settingsOf({
    zoomX: 1,
    scrollDate: day(1),
    stackDirection: 'down',
    displayScale: DEFAULT_DISPLAY_SCALE,
    ...over,
  })
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection(), null)
  return {
    geometry,
    svg: svgFromSchedule(schedule, settings, layout, geometry, regions, emptySelection(), 'screen', { themePreference: 'light', guideCursorMode: 'none' }),
  }
}

// Spec: NS-3
const PICTURE_GRID = ((): number => {
  const row = specTable('T-231').rows.find((one) => one.id === 'NS-3')
  const found = /(\d+(?:\.\d+)?)\s*px/.exec(row?.by[String.fromCharCode(0x898f, 0x5247)] ?? '')
  if (found === null) throw new Error('table T-231 row NS-3 states no grid')
  return Number(found[1])
})()

// Spec: NS-3
const onGrid = (value: number): number => Math.round(value / PICTURE_GRID) * PICTURE_GRID

// Spec: FR-039, T-252
const drawnOnTheGrid = (stored: number): number => onGrid(stored * DEFAULT_DISPLAY_RATIO)

const markerStrokeWidths = (svg: string): { readonly isDisc: boolean; readonly width: number }[] =>
  [...svg.matchAll(/<[^>]*data-figure="[^"]*-marker"[^>]*>/g)]
    .map((one) => ({ isDisc: one[0].startsWith('<circle'), width: /stroke-width="([0-9.]+)"/.exec(one[0])?.[1] }))
    .filter((one): one is { isDisc: boolean; width: string } => one.width !== undefined)
    .map((one) => ({ isDisc: one.isDisc, width: Number(one.width) }))

const dummyPointCount = (svg: string): number => {
  const found = /<polygon points="([^"]*)"[^>]*data-figure="[^"]*-dummies"/.exec(svg)
  if (found === null) throw new Error('no dummy figure was drawn')
  return (found[1] ?? '').trim().split(/\s+/).length
}

// Spec: FR-094, T-201, S-24, FR-013
describe('DFC-417: the progress marker reads S-24 for its stroke, and S-24 x S-328 for its symbol bars (FR-094, FR-013)', () => {
  const started = (): Schedule =>
    scheduleOf(
      [task({
        uid: 1,
        start: day(2),
        finish: day(12),
        actualStart: day(2),
        stop: day(5),
        percentComplete: 50,
      })],
      [visualOf(1, 'rectangle', null)],
    )

  it('every stroke of the marker follows the value, and none is left behind', () => {
    // Why: S-24 is a constant a document cannot turn, so the case reads its value instead of setting one.
    const turned = SETTINGS_CONSTANTS.markerStroke
    // Spec: S-63
    const drawn = markerStrokeWidths(draw(started(), { isProgressMarkerVisible: true }).svg)
    expect(drawn.filter((one) => one.isDisc).length).toBe(1)
    for (const { isDisc, width } of drawn) {
      expect(onGrid(width), 'S-24 x FR-039 の描く比、NS-3 の格子の上で').toBe(
        isDisc ? drawnOnTheGrid(turned) : onGrid(drawnOnTheGrid(turned) * NOT_STORED_DELAY_MARK_SIZES['S-328']),
      )
    }
  })
})

// Spec: FR-043, SH-5
describe("DFC-407: a not-started milestone's dummy is its own figure (FR-043)", () => {
  const milestone = (glyph: string): Schedule =>
    scheduleOf(
      [task({ uid: 1, start: day(5), finish: day(5), milestone: true })],
      [visualOf(1, 'milestone', glyph)],
    )

  it('draws the same figure whether or not the plan is shown', () => {
    // Why: hiding the plan (S-64) says nothing about the dummy, and no spec row draws a glyph, so the two
    // pictures are compared with each other rather than with a point count typed here.
    const shown = dummyPointCount(draw(milestone('star'), { isPlanVisible: true }).svg)
    const hidden = dummyPointCount(draw(milestone('star'), { isPlanVisible: false }).svg)
    expect(hidden).toBe(shown)
  })

  it('is not the rectangle, with the plan hidden', () => {
    // Why: a rectangle has four corners and the star has more, so only such a glyph can state the MUST NOT;
    // the case names one glyph rather than sweeping all fifteen.
    expect(dummyPointCount(draw(milestone('star'), { isPlanVisible: false }).svg)).not.toBe(4)
  })
})

// Spec: AG-5, FR-078, T-108, T-012, SH-5
describe('DFC-418: the write path judges the figure (AG-5, FR-078)', () => {
  const document = (): Document =>
    ({
      schedule: scheduleOf(
        [task({ uid: 1, start: day(5), finish: day(5), milestone: true })],
        [visualOf(1, 'milestone', 'diamond')],
      ),
    }) as unknown as Document

  const SH_5_FIGURE_COUNT = ((): number => {
    const row = specTable('T-012').rows.find((one) => one.id === 'SH-5')
    if (row === undefined) throw new Error('table T-012 has no row SH-5')
    const spelled = row.by['表記']
    if (spelled === undefined) throw new Error('table T-012 row SH-5 has no 表記 cell')
    return spelled.trim().split(/\s+/).length
  })()

  const GLYPHS = COLUMN_SHAPES.TaskVisual.milestoneGlyph?.choices ?? []

  it('admits every figure SH-5 names, and exactly that many', () => {
    // Why: the roster is the schema's own COLUMN_SHAPES and the count is read from SH-5, so a figure added
    // to SH-5 and forgotten in erd.json fails here.
    expect(GLYPHS.length).toBe(SH_5_FIGURE_COUNT)
    for (const glyph of GLYPHS) {
      const out = editTask(document(), {
        kind: 'setTaskVisualMilestoneGlyph', taskUid: 1, milestoneGlyph: glyph,
      } as never, DEFAULT_TASK_GROUP_NAME_FIXTURE)
      expect(out.ok, `${glyph} was refused`).toBe(true)
    }
  })

  it('refuses a word that is not one of them (AG-5)', () => {
    const out = editTask(document(), {
      kind: 'setTaskVisualMilestoneGlyph', taskUid: 1, milestoneGlyph: 'NOT-A-GLYPH',
    } as never, DEFAULT_TASK_GROUP_NAME_FIXTURE)
    expect(out.ok).toBe(false)
  })

  it('still clears the column, which is not an unknown word (AT-101)', () => {
    const out = editTask(document(), {
      kind: 'setTaskVisualMilestoneGlyph', taskUid: 1, milestoneGlyph: null,
    } as never, DEFAULT_TASK_GROUP_NAME_FIXTURE)
    expect(out.ok).toBe(true)
  })
})

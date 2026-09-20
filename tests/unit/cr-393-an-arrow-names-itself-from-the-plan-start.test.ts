// An arrow shape names itself from the plan's start point, sizes its marker to that name, and a rectangle may hold both inside its actual.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  geometryFromLayout,
  type TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  layoutFromSchedule,
  taskPlacement,
  type ScheduleLayout,
  type TaskPlacement,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { unbroken } from '../contract/spec-table'
import { DEFAULT_DISPLAY_SCALE, displayRatioAt } from '../fixtures/display-scale'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const FR_094_THE_ARROW_MARKER_IS_THE_NAME_FONT =
  '⭐ 表 T-012 の `SH-3` / `SH-4` の進捗マーカーの径は、表 T-201 の `S-22` に代えて、そのタスクの名称ラベルの字の大きさとすること（MUST）'

const FR_094_THE_RESUME_ICON_FOLLOWS_THAT_DIAMETER =
  '⭐ その形状の再開アイコンの広がり（`S-26` / `S-27`）も、この径から導くこと（MUST）'

const T_273_THE_NAME_NEVER_LEFT_OF_THE_MARKER =
  '⛔ 名称ラベルをマーカーの左に置いてはならない（MUST NOT） —— どの行でも左から マーカー → 名前 の順である。'

const FR_018_THE_WIDTH_IS_THE_SPAN_TIMES_THE_DAY =
  'しきい値は表 T-205 の `S-86` に従うこと（MUST） —— 幅は期間に 1 日あたりの表示幅（`FR-017`）を掛けた値である。'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-094 (MUST) -- the arrow marker diameter is that task\'s name font', FR_094_THE_ARROW_MARKER_IS_THE_NAME_FONT],
  ['FR-094 (MUST) -- the resume icon is derived from that same diameter', FR_094_THE_RESUME_ICON_FOLLOWS_THAT_DIAMETER],
  ['T-273 (MUST NOT) -- the name never stands left of the marker', T_273_THE_NAME_NEVER_LEFT_OF_THE_MARKER],
  ['FR-018 (MUST) -- the dropped width is the span times one day\'s drawn width', FR_018_THE_WIDTH_IS_THE_SPAN_TIMES_THE_DAY],
]

describe('CR-393 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('holds one clause per marker, and no clause twice', () => {
    expect(new Set(CLAUSES.map(([, clause]) => clause)).size).toBe(CLAUSES.length)
  })
})

const num = (key: string): number => {
  const value = SETTINGS_DEFAULTS[key]
  if (typeof value !== 'number') throw new Error(`SETTINGS_DEFAULTS.${key} is not a number`)
  return value
}

// see FR-039, T-252
const DRAWN_RATIO = displayRatioAt(DEFAULT_DISPLAY_SCALE)

const NESTED_DEFAULTS: Record<string, unknown> = (() => {
  const out: Record<string, unknown> = { ...SETTINGS_DEFAULTS }
  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const dot = key.indexOf('.')
    if (dot < 0) continue
    const head = key.slice(0, dot)
    out[head] = {
      ...((out[head] as Record<string, unknown> | undefined) ?? {}),
      [key.slice(dot + 1)]: value,
    }
  }
  return out
})()

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({
    ...NESTED_DEFAULTS,
    rulerHeight: 48,
    rulerFont: 12,
    scrollDate: '2026-01-01',
    stackDirection: 'down',
    assigneeVisible: false,
    percentCompleteVisible: false,
    ...part,
  }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: 1400,
  height: 900,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const REGIONS = regionsFromScreen(ENV, settingsOf())

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    name: null,
    start: null,
    finish: null,
    milestone: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

const spanning = (uid: number, from: string, days: number, part: Record<string, unknown> = {}): Task => {
  const finish = new Date(new Date(`${from}T00:00:00Z`).getTime() + days * 86400000)
  return taskOf({ uid, start: from, finish: finish.toISOString().slice(0, 10), ...part })
}

const rowsOf = (
  tasks: readonly Task[],
  visuals: readonly Record<string, unknown>[] = [],
): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null, title: null, themeHue: 214 },
    calendars: [],
    resources: [],
    assignments: [],
    highlightBoxes: [],
    commentBoxes: [],
    tasks,
    taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
    taskGroupMembers: tasks.map((task) => ({ groupId: 'g1', taskUid: task.uid })),
    taskVisuals: visuals,
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

interface Scene {
  readonly layout: ScheduleLayout
  readonly placed: TaskPlacement
  readonly drawn: TaskGeometry
}

const sceneOf = (task: Task, shapeKind: string | null, part: Record<string, unknown> = {}): Scene => {
  const settings = settingsOf(part)
  const schedule = rowsOf(
    [task],
    shapeKind === null ? [] : [{ taskUid: task.uid, shapeKind }],
  )
  const layout = layoutFromSchedule(schedule, settings, REGIONS)
  const placed = taskPlacement(layout, task.uid)
  if (placed === null) throw new Error('the task was not placed')
  const drawn = geometryFromLayout(schedule, settings, layout, REGIONS, emptySelection()).tasks.find(
    (one) => one.taskUid === task.uid,
  )
  if (drawn === undefined) throw new Error('the task was not drawn')
  return { layout, placed, drawn }
}

const ARROW_SHAPES = ['arrow', 'endpointSpan'] as const

const arrowNamed = (plannedDays: number, actualStop: string): Task =>
  spanning(1, '2026-02-02', plannedDays, {
    name: 'an arrow name long enough to reach past its own shape',
    percentComplete: 40,
    actualStart: '2026-02-02',
    stop: actualStop,
    resumeValid: true,
  })

describe('FR-094 (MUST) -- an SH-3 / SH-4 marker is as wide as that task\'s name', () => {
  it.each(ARROW_SHAPES)('%s: the marker diameter equals the name font size', (shapeKind) => {
    const scene = sceneOf(arrowNamed(20, '2026-02-10'), shapeKind)
    expect(scene.drawn.marker, 'premise: a marker is drawn for this task').not.toBeNull()
    expect(
      scene.drawn.marker!.radius * 2,
      FR_094_THE_ARROW_MARKER_IS_THE_NAME_FONT,
    ).toBeCloseTo(scene.placed.labelFontSize, 6)
  })

  it.each(ARROW_SHAPES)('%s: the marker follows the name font as the row axis zooms', (shapeKind) => {
    const low = sceneOf(arrowNamed(20, '2026-02-10'), shapeKind, { zoomY: 1 })
    const high = sceneOf(arrowNamed(20, '2026-02-10'), shapeKind, { zoomY: 6 })
    expect(high.placed.labelFontSize, 'premise: the name really does grow').toBeGreaterThan(
      low.placed.labelFontSize,
    )
    expect(high.drawn.marker!.radius * 2, FR_094_THE_ARROW_MARKER_IS_THE_NAME_FONT).toBeCloseTo(
      high.placed.labelFontSize,
      6,
    )
  })

  it('a rectangle keeps the fixed S-22 diameter -- only SH-3 / SH-4 read the name font', () => {
    const rectangle = sceneOf(arrowNamed(20, '2026-02-10'), 'rectangle')
    expect(rectangle.drawn.marker, 'premise: a marker is drawn').not.toBeNull()
    expect(
      rectangle.drawn.marker!.radius * 2,
      'FR-094 replaces S-22 for the line shapes alone; DS-1 still draws S-22 at the display ratio',
    ).toBeCloseTo(num('markerSize') * DRAWN_RATIO, 6)
  })
})

describe("T-273 (MUST NOT) -- the name never stands left of the marker", () => {
  it.each([
    ['a wide actual that holds both', 120, 'ab'],
    ['a short plan and actual that send the name outside the shape', 8, 'a name far too long for this plan'],
  ] as const)('never puts the name left of the marker: %s (MUST NOT)', (_how, planDays, name) => {
    const task = spanning(1, '2026-02-02', planDays, {
      name,
      percentComplete: 40,
      actualStart: '2026-02-02',
      stop: planDays === 8 ? '2026-02-03' : '2026-05-20',
      resumeValid: true,
    })
    const scene = sceneOf(task, 'rectangle')
    expect(scene.drawn.marker, 'premise: a marker is drawn').not.toBeNull()
    expect(scene.drawn.label, 'premise: a name is drawn').not.toBeNull()
    expect(
      scene.drawn.marker!.centre.x + scene.drawn.marker!.radius,
      T_273_THE_NAME_NEVER_LEFT_OF_THE_MARKER,
    ).toBeLessThanOrEqual(scene.drawn.label!.x + 1e-6)
  })
})

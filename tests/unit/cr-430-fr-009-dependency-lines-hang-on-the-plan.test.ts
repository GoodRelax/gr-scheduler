// CR-430 / FR-009 / RT-4a: a dependency line hangs on the plan geometry only.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { dependencyEndAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import {
  geometryFromLayout,
  type BarGeometry,
  type ScheduleGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const FR_009_ONLY_PLAN = '依存線は予定の幾何にだけ付くこと（MUST）。'
const FR_009_NOT_ACTUAL_OR_DUMMY =
  '⛔ 実績にもダミーにも付けてはならない（MUST NOT） —— 依存は予定に対して設定する情報であり、実績は記録された事実である。'
const FR_009_NO_PLAN_OR_HIDDEN =
  '⭐ 予定が無いタスクと、予定を表示していないとき（`S-227` が偽）は、その依存線を描かないこと（MUST） —— 実績へ落とさない（`RT-4a`）。'

const FR_009_HALF_NO_FALLBACK_TO_ACTUAL =
  '⛔ 予定が無いタスクへ落としてはならない（MUST NOT） —— そのタスクは結ぶ元にも先にもならないので、割る相手が無い（規則は `FR-107` の 表 T-270 の結びが持つ）。'

describe('CR-430 -- the manuscript these cases are driven by', () => {
  it('FR-009 still says a dependency line hangs on the plan alone, word for word', () => {
    expect(REQUIREMENTS).toContain(FR_009_ONLY_PLAN)
    expect(REQUIREMENTS).toContain(FR_009_NOT_ACTUAL_OR_DUMMY)
    expect(REQUIREMENTS).toContain(FR_009_NO_PLAN_OR_HIDDEN)
  })

  it('FR-009 still forbids falling to the actual band when arming a dependency, word for word', () => {
    expect(REQUIREMENTS).toContain(FR_009_HALF_NO_FALLBACK_TO_ACTUAL)
  })

  it('table T-018a RT-4a still lists a plan-less Task and a hidden plan among the endpoints that stop the line', () => {
    const row = specTable('T-018a').rows.find((one) => one.id === 'RT-4a')
    if (row === undefined) throw new Error('table T-018a has no row RT-4a')
    const rule = row.by['規則'] ?? ''
    expect(rule).toContain('予定を持たない `Task`')
    expect(rule).toContain('予定を表示していないとき')
    expect(rule).toContain('実績の幾何へ落としてはならない（MUST NOT）')
  })
})

const SHAPE_HEIGHT_OF = Object.fromEntries(
  Object.entries(SETTINGS_DEFAULTS)
    .filter(([key]) => key.startsWith('shapeHeightOf.'))
    .map(([key, value]) => [key.slice('shapeHeightOf.'.length), value]),
)

const settingsOf = (part: Readonly<Record<string, unknown>>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, shapeHeightOf: SHAPE_HEIGHT_OF, ...part }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = { width: 1200, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }

const BASE_SETTINGS = settingsOf({
  scrollDate: '2026-01-01',
  rulerHeight: 48,
  rulerFont: 12,
  stackDirection: 'down',
})

const REGIONS = regionsFromScreen(ENV, BASE_SETTINGS)

const taskOf = (part: Readonly<Record<string, unknown>>): Task =>
  ({
    name: null, start: null, finish: null, milestone: null, actualStart: null, stop: null,
    actualFinish: null, resume: null, resumeValid: null, fadeInDays: null, fadeOutDays: null,
    dependencies: [], ...part,
  }) as unknown as Task

const scheduleOf = (part: Readonly<Record<string, unknown>>): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null }, calendars: [], tasks: [], resources: [],
    assignments: [], taskGroups: [], taskGroupMembers: [], taskVisuals: [], highlightBoxes: [],
    commentBoxes: [], taskOrigins: [], baselineTasks: [], ...part,
  }) as unknown as Schedule

const PREDECESSOR_UID = 1
const SUCCESSOR_UID = 2

const linkedPair = (
  predecessor: Readonly<Record<string, unknown>>,
  successor: Readonly<Record<string, unknown>> = {},
): Schedule =>
  scheduleOf({
    tasks: [
      taskOf({ uid: PREDECESSOR_UID, name: 'A', ...predecessor }),
      taskOf({
        uid: SUCCESSOR_UID,
        name: 'B',
        start: '2026-02-01',
        finish: '2026-02-10',
        dependencies: [{ predecessorUid: PREDECESSOR_UID, linkType: 1 }],
        ...successor,
      }),
    ],
    taskGroups: [
      { id: 'g1', parentId: null, order: 0, height: null },
      { id: 'g2', parentId: null, order: 1, height: null },
    ],
    taskGroupMembers: [
      { groupId: 'g1', taskUid: PREDECESSOR_UID },
      { groupId: 'g2', taskUid: SUCCESSOR_UID },
    ],
  })

const geometryOf = (schedule: Schedule, settings: DocumentSettings = BASE_SETTINGS): ScheduleGeometry =>
  geometryFromLayout(schedule, settings, layoutFromSchedule(schedule, settings, REGIONS), REGIONS, emptySelection())

const spanOf = (bar: BarGeometry): { readonly left: number; readonly right: number } => {
  const points = bar.form === 'outline' ? bar.points : [bar.from, bar.to]
  const xs = points.map((one) => one.x)
  return { left: Math.min(...xs), right: Math.max(...xs) }
}

const DATED_PREDECESSOR = { start: '2026-01-05', finish: '2026-01-20' }
const ACTUAL_FAR_FROM_PLAN = { actualStart: '2026-03-02', stop: '2026-04-24' }

const HIDDEN_PLAN_SETTINGS = settingsOf({
  ...(BASE_SETTINGS as unknown as Record<string, unknown>),
  planVisible: false,
  actualVisible: true,
})

describe(`FR-009 / RT-4a (MUST) -- ${FR_009_NO_PLAN_OR_HIDDEN}`, () => {
  it('draws the line while the plan is shown, so the premise for hiding it holds', () => {
    const shown = geometryOf(linkedPair(DATED_PREDECESSOR))
    expect(shown.dependencies, 'premise: the dependency is drawn while the plan is shown').toHaveLength(1)
  })

  it('draws no dependency line while S-227 (planVisible) is false', () => {
    const hidden = geometryOf(
      linkedPair({ ...DATED_PREDECESSOR, ...ACTUAL_FAR_FROM_PLAN }),
      HIDDEN_PLAN_SETTINGS,
    )
    expect(hidden.dependencies, FR_009_NO_PLAN_OR_HIDDEN).toHaveLength(0)
  })
})

describe(`FR-009 (MUST NOT) -- ${FR_009_NOT_ACTUAL_OR_DUMMY}`, () => {
  it('hiding the plan does not move the line onto the actual bar: it draws no line at all', () => {
    const schedule = linkedPair({ ...DATED_PREDECESSOR, ...ACTUAL_FAR_FROM_PLAN })
    const geometry = geometryOf(schedule, HIDDEN_PLAN_SETTINGS)
    expect(
      geometry.dependencies,
      'the line must not fall back to the actual bar -- it must not exist at all',
    ).toHaveLength(0)

    const actualPredecessor = geometry.tasks.find((one) => one.taskUid === PREDECESSOR_UID)?.actual
    if (actualPredecessor === null || actualPredecessor === undefined) {
      throw new Error('the fixture drew no actual bar on the predecessor, so this case cannot guard against it')
    }
    const actualSpan = spanOf(actualPredecessor)
    for (const line of geometry.dependencies) {
      for (const point of line.points) {
        const onActualEdge =
          Math.abs(point.x - actualSpan.left) < 1 || Math.abs(point.x - actualSpan.right) < 1
        expect(onActualEdge, 'a point must not sit on the actual bar edge; the actual is not a fallback').toBe(false)
      }
    }
  })
})

describe(`RT-4a (MUST NOT) -- ${FR_009_HALF_NO_FALLBACK_TO_ACTUAL}`, () => {
  it('answers a split for the predecessor while its plan is shown, so the premise holds', () => {
    const geometry = geometryOf(linkedPair(DATED_PREDECESSOR))
    const placed = layoutFromSchedule(linkedPair(DATED_PREDECESSOR), BASE_SETTINGS, REGIONS).placements[0]!
    expect(
      dependencyEndAtPointer(geometry, placed.x + 1, placed.y + 1, PREDECESSOR_UID),
      'premise: the shown plan answers a split',
    ).not.toBeNull()
  })

  it('answers no split for a Task whose plan is not drawn, even though its actual is', () => {
    const schedule = linkedPair({ ...DATED_PREDECESSOR, ...ACTUAL_FAR_FROM_PLAN })
    const geometry = geometryOf(schedule, HIDDEN_PLAN_SETTINGS)
    const drawn = geometry.tasks.find((one) => one.taskUid === PREDECESSOR_UID)
    if (drawn?.plan !== null) throw new Error('this case needs a Task whose plan is not drawn')
    if (drawn.actual === null) throw new Error('this case needs a Task whose actual IS drawn')
    const actualSpan = spanOf(drawn.actual)
    const insideTheActualBar = { x: (actualSpan.left + actualSpan.right) / 2, y: 0 }
    expect(
      dependencyEndAtPointer(geometry, insideTheActualBar.x, insideTheActualBar.y, PREDECESSOR_UID),
      FR_009_HALF_NO_FALLBACK_TO_ACTUAL,
    ).toBeNull()
  })
})

describe('RT-4a (MUST NOT) -- a Task with no plan at all is never a dependency line endpoint', () => {
  // DEVIATION: RT-4a forbids a plan-less endpoint; the floor width still draws one (DFC-658).
  it.fails('draws no line when the predecessor has no plan at all (DFC-658)', () => {
    const geometry = geometryOf(linkedPair({ start: null, finish: null }))
    expect(geometry.dependencies).toHaveLength(0)
  })

  // DEVIATION: RT-4a forbids a plan-less endpoint; the floor width still draws one (DFC-658).
  it.fails('draws no line when the successor has no plan at all (DFC-658)', () => {
    const geometry = geometryOf(linkedPair(DATED_PREDECESSOR, { start: null, finish: null }))
    expect(geometry.dependencies).toHaveLength(0)
  })
})

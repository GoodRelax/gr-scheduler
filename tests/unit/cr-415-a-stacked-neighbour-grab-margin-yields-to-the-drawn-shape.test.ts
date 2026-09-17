// CR-415: when two stacked Tasks' grab margins overlap, the drawn shape is looked at first (table T-261).

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
  itemAtPointer,
  NOT_STORED_SIZES,
  type Hit,
  type PointerSlop,
} from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import {
  geometryFromLayout,
  type BarGeometry,
  type ScheduleGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  layoutFromSchedule,
  taskPlacement,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { specTable, unbroken } from '../contract/spec-table'
import { DEFAULT_DISPLAY_SCALE, displayRatioAt } from '../fixtures/display-scale'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const T_023D_LOOK_AT_THE_SHAPE_FIRST =
  '⭐ 上下に積んだ 2 つのタスクの掴み代が縦に重なるときは、描いた形状を先に見て、表 T-261 に従うこと（MUST）'
const GS_1_ON_THE_SHAPE = 'その形状のタスクの行だけで、表 T-023d の順に決めること（MUST）'
const GS_1_NO_NEIGHBOUR_REACHES = '⛔ 上か下の隣のタスクの掴み代を、その形状の上へ届かせてはならない（MUST NOT）'
const GS_2_THE_NEARER = '押した点からの縦の距離が近いほうの描いた形状のタスクの掴み代とすること（MUST）'
const GS_3_THE_FULL_MARGIN = '掴み代を `S-90` / `S-92` のまま当てること（MUST）'
const GS_3_NOT_SHRUNK = '⛔ 隣が無い向きの掴み代を縮めてはならない（MUST NOT）'
const GS_4_THE_LINE_FIRST = '`GS-2` と `GS-3` より先に、依存線とすること（MUST）'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['T-023d (MUST) -- overlapping stacked margins look at the drawn shape first', T_023D_LOOK_AT_THE_SHAPE_FIRST],
  ['GS-1 (MUST) -- on a drawn shape, only that Task decides', GS_1_ON_THE_SHAPE],
  ['GS-1 (MUST NOT) -- no neighbour margin reaches onto the shape', GS_1_NO_NEIGHBOUR_REACHES],
  ['GS-2 (MUST) -- in both margins, the vertically nearer shape', GS_2_THE_NEARER],
  ['GS-3 (MUST) -- with no neighbour, S-90 / S-92 as they are', GS_3_THE_FULL_MARGIN],
  ['GS-3 (MUST NOT) -- a margin with no neighbour is not shrunk', GS_3_NOT_SHRUNK],
  ['GS-4 (MUST) -- a dependency line through the gap comes first', GS_4_THE_LINE_FIRST],
]

describe('CR-415 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

// see T-201, T-206
const numberOf = (table: string, id: string, column: string): number => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  const found = (row.by[column] ?? '').match(/\d+(?:\.\d+)?/g) ?? []
  if (found.length === 0) throw new Error(`table ${table} row ${id} states no number in ${column}`)
  return Number(found[0])
}

const S_39 = numberOf('T-201', 'S-39', '既定値')
const S_90 = numberOf('T-206', 'S-90', '既定')
const S_92 = numberOf('T-206', 'S-92', '既定')
const S_137 = numberOf('T-206', 'S-137', '既定')

// see S-90, S-91, S-92, S-137, S-230
const SLOP: PointerSlop = {
  planEndpoint: NOT_STORED_SIZES['S-90'],
  actualEndpoint: NOT_STORED_SIZES['S-91'],
  fadeHandle: NOT_STORED_SIZES['S-92'][0] / 2,
  line: NOT_STORED_SIZES['S-137'],
  boxPoint: NOT_STORED_SIZES['S-230'],
}

// see T-252
const nestedDefaults = (): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const path = key.split('.')
    let into = out
    for (const step of path.slice(0, -1)) {
      into[step] = { ...((into[step] as Record<string, unknown> | undefined) ?? {}) }
      into = into[step] as Record<string, unknown>
    }
    into[path[path.length - 1]!] = value
  }
  return out
}

const SETTINGS: DocumentSettings = {
  ...nestedDefaults(),
  scrollDate: '2026-01-01',
  displayScale: DEFAULT_DISPLAY_SCALE,
  stackDirection: 'down',
  zoomX: 2,
  zoomY: 2,
} as unknown as DocumentSettings

const ENV: ScreenEnvironment = { width: 1600, height: 1000, appHeaderHeight: 56, scrollbarThickness: 8 }

const LINK = (predecessorUid: number) => ({
  predecessorUid,
  linkType: 1,
  lag: null,
  lagFormat: null,
  carry: {},
  carryElements: [],
})

const taskOf = (uid: number, start: string, finish: string, part: Record<string, unknown> = {}): Task =>
  ({
    uid,
    name: `t${uid}`,
    start,
    finish,
    milestone: null,
    percentComplete: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    stop: null,
    resume: null,
    resumeValid: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

const scheduleOf = (members: readonly (readonly [Task, string])[]): Schedule => {
  const groups = [...new Set(members.map(([, groupId]) => groupId))]
  return {
    project: { calendarUid: null, statusDate: null, title: null, themeHue: 214 },
    calendars: [],
    resources: [],
    assignments: [],
    highlightBoxes: [],
    commentBoxes: [],
    tasks: members.map(([task]) => task),
    taskGroups: groups.map((id, order) => ({ id, parentId: null, order, height: null })),
    taskGroupMembers: members.map(([task, groupId]) => ({ groupId, taskUid: task.uid })),
    taskVisuals: [],
    taskOrigins: [],
    baselineTasks: [],
  } as unknown as Schedule
}

const geometryOf = (schedule: Schedule): ScheduleGeometry => {
  const regions = regionsFromScreen(ENV, SETTINGS)
  const layout = layoutFromSchedule(schedule, SETTINGS, regions)
  for (const task of schedule.tasks) {
    if (taskPlacement(layout, task.uid) === null) throw new Error(`premise: task ${task.uid} is placed`)
  }
  return geometryFromLayout(schedule, SETTINGS, layout, regions, emptySelection())
}

interface Box {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}

// see VG-5
const shapeOf = (geometry: ScheduleGeometry, uid: number): Box => {
  const found = geometry.tasks.find((one) => one.taskUid === uid)
  const plan: BarGeometry | null | undefined = found?.plan
  if (plan === undefined || plan === null || plan.form !== 'outline') {
    throw new Error(`task ${uid} draws no outlined plan`)
  }
  const xs = plan.points.map((one) => one.x)
  const ys = plan.points.map((one) => one.y)
  const half = (S_39 * displayRatioAt(DEFAULT_DISPLAY_SCALE)) / 2
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys) - half, bottom: Math.max(...ys) + half }
}

const hitAt = (geometry: ScheduleGeometry, x: number, y: number): Hit | null => itemAtPointer(geometry, x, y, SLOP)

const taskOfHit = (hit: Hit | null): number | null =>
  hit !== null && hit.item.kind === 'task' ? hit.item.taskUid : null

const OUTSIDE_THE_END = 3

const UPPER = 1
const LOWER = 2

type Layout = 'one row, two lanes' | 'two rows'

const shortOverLong = (how: Layout): Schedule =>
  scheduleOf([
    [taskOf(UPPER, '2026-01-05', '2026-01-20'), 'g1'],
    [taskOf(LOWER, '2026-01-05', '2026-02-10'), how === 'two rows' ? 'g2' : 'g1'],
  ])

const sideBySide = (how: Layout): Schedule =>
  scheduleOf([
    [taskOf(UPPER, '2026-01-05', '2026-01-20'), 'g1'],
    [taskOf(LOWER, '2026-01-05', '2026-01-20'), how === 'two rows' ? 'g2' : 'g1'],
  ])

const LAYOUTS: readonly Layout[] = ['one row, two lanes', 'two rows']

const orderedPair = (geometry: ScheduleGeometry): readonly [Box, Box, number, number] => {
  const first = shapeOf(geometry, UPPER)
  const second = shapeOf(geometry, LOWER)
  return first.top < second.top ? [first, second, UPPER, LOWER] : [second, first, LOWER, UPPER]
}

describe('GS-1 (MUST NOT) -- on a drawn shape, the neighbour margin does not reach', () => {
  it.each(LAYOUTS)('takes the long Task, not the short neighbour GR-4, just past the short end (%s)', (how) => {
    const geometry = geometryOf(shortOverLong(how))
    const short = shapeOf(geometry, UPPER)
    const long = shapeOf(geometry, LOWER)
    const x = short.right + OUTSIDE_THE_END
    expect(x, 'premise: the point is over the long shape').toBeLessThan(long.right)
    const shortAbove = short.top < long.top
    const y = shortAbove ? long.top + 1 : long.bottom - 1
    const reach = shortAbove ? y - short.bottom : short.top - y
    expect(reach, 'premise: the point is inside the S-90 margin of the short Task').toBeLessThan(S_90)
    const hit = hitAt(geometry, x, y)
    expect(taskOfHit(hit), `${GS_1_NO_NEIGHBOUR_REACHES} -- ${JSON.stringify(hit)}`).toBe(LOWER)
    expect(hit?.grab, GS_1_ON_THE_SHAPE).not.toBe('GR-4')
  })
})

describe('GS-2 (MUST) -- off both shapes, inside both margins, the nearer one', () => {
  it.each(LAYOUTS)('gives the gap near the upper Task to its GR-4, and near the lower Task to that Task (%s)', (how) => {
    const geometry = geometryOf(sideBySide(how))
    const [upper, lower, upperUid, lowerUid] = orderedPair(geometry)
    const x = Math.max(upper.right, lower.right) + OUTSIDE_THE_END
    const gap = lower.top - upper.bottom
    expect(gap, 'premise: the two shapes stand apart').toBeGreaterThan(0)
    const nearUpper = hitAt(geometry, x, upper.bottom + gap / 4)
    const nearLower = hitAt(geometry, x, lower.top - gap / 4)
    expect(taskOfHit(nearUpper), `${GS_2_THE_NEARER} -- near the upper: ${JSON.stringify(nearUpper)}`).toBe(upperUid)
    expect(nearUpper?.grab).toBe('GR-4')
    expect(taskOfHit(nearLower), `${GS_2_THE_NEARER} -- near the lower: ${JSON.stringify(nearLower)}`).toBe(lowerUid)
    expect(nearLower?.grab).toBe('GR-4')
  })
})

describe('GS-3 (MUST NOT) -- with no neighbour in that direction, the margin keeps its full S-90', () => {
  it.each(LAYOUTS)('gives the upper Task its GR-4 S-90 - 1px above its top, and the lower one S-90 - 1px below (%s)', (how) => {
    const geometry = geometryOf(sideBySide(how))
    const [upper, lower, upperUid, lowerUid] = orderedPair(geometry)
    const x = Math.max(upper.right, lower.right) + OUTSIDE_THE_END
    const above = hitAt(geometry, x, upper.top - (S_90 - 1))
    const below = hitAt(geometry, x, lower.bottom + (S_90 - 1))
    expect(taskOfHit(above), `${GS_3_NOT_SHRUNK} -- above: ${JSON.stringify(above)}`).toBe(upperUid)
    expect(above?.grab, GS_3_THE_FULL_MARGIN).toBe('GR-4')
    expect(taskOfHit(below), `${GS_3_NOT_SHRUNK} -- below: ${JSON.stringify(below)}`).toBe(lowerUid)
    expect(below?.grab, GS_3_THE_FULL_MARGIN).toBe('GR-4')
  })

  it('keeps the fade grab S-92 as the manuscript prints it, untouched by table T-261', () => {
    expect(SLOP.fadeHandle).toBe(S_92 / 2)
    expect(SLOP.planEndpoint).toBe(S_90)
    expect(SLOP.line).toBe(S_137)
  })
})

describe('GS-4 (MUST) -- a dependency line running through the gap is taken before either margin', () => {
  it('takes the line on its corridor between the lane and the lane below', () => {
    const P = 3
    const S = 4
    const Q = 5
    const schedule = scheduleOf([
      [taskOf(P, '2026-01-05', '2026-01-15'), 'g1'],
      [taskOf(S, '2026-01-15', '2026-01-25', { dependencies: [LINK(P)] }), 'g1'],
      [taskOf(Q, '2026-01-08', '2026-01-30'), 'g1'],
    ])
    const geometry = geometryOf(schedule)
    const line = geometry.dependencies[0]
    if (line === undefined) throw new Error('the dependency line is not drawn')
    const p = shapeOf(geometry, P)
    const q = shapeOf(geometry, Q)
    expect(p.top, 'premise: the linked Tasks stand in the upper lane').toBeLessThan(q.top)
    let corridor: { readonly x: number; readonly y: number } | null = null
    for (let at = 0; at + 1 < line.points.length; at += 1) {
      const a = line.points[at]!
      const b = line.points[at + 1]!
      if (Math.abs(a.y - b.y) < 1e-9 && a.y > p.bottom && a.y < q.top) corridor = { x: (a.x + b.x) / 2, y: a.y }
    }
    if (corridor === null) throw new Error(`premise: the route ${line.pattern} runs no corridor through the gap`)
    const hit = hitAt(geometry, corridor.x, corridor.y)
    expect(hit?.item.kind, `${GS_4_THE_LINE_FIRST} -- ${JSON.stringify(hit)}`).toBe('dependency')
    expect(hit?.grab).toBe('GR-13')
  })
})

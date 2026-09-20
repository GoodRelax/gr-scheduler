// CR-415: when two stacked Tasks' grab margins overlap, the drawn shape is looked at first (table T-267).

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
  type GrabSizes,
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

const HT_1_ON_THE_SHAPE = '描いた形の上では、その形のタスクの掴み代だけが応えること（MUST）'
const HT_1_NO_NEIGHBOUR_REACHES = '⛔ 上か下の隣のタスクの掴み代を、その形の上へ届かせてはならない（MUST NOT）'
const HT_2_THE_NEARER = '形の外で 2 つ以上のタスクの掴み代に入ったときは、描いた形が上下に近いタスクの掴み代だけを残すこと（MUST）'
const HT_2_THE_LINE_SURVIVES = '⚠️ 依存線はタスクではないので、本手順では落ちない'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['HT-1 (MUST) -- on a drawn shape, only that Task decides', HT_1_ON_THE_SHAPE],
  ['HT-1 (MUST NOT) -- no neighbour margin reaches onto the shape', HT_1_NO_NEIGHBOUR_REACHES],
  ['HT-2 (MUST) -- in both margins, the vertically nearer shape', HT_2_THE_NEARER],
  ['HT-2 -- a dependency line is not dropped by the vertical step', HT_2_THE_LINE_SURVIVES],
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
const S_250 = numberOf('T-206', 'S-250', '既定')

// see T-266, T-206
const SLOP: GrabSizes = NOT_STORED_SIZES

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

const hitAt = (geometry: ScheduleGeometry, x: number, y: number, sizes: GrabSizes = SLOP): Hit | null =>
  itemAtPointer(geometry, x, y, sizes)

// see GA-1, GA-2, S-252, S-255
// WHY: `S-252` and `S-255` are 0 by default, so a plan end's margin never leaves
// its own band; a reach is given here to stage the contest `HT-2` settles.
const reachingBands = (over: number): GrabSizes => ({ ...SLOP, 'S-252': over, 'S-255': over })

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

describe('HT-1 (MUST NOT) -- on a drawn shape, the neighbour margin does not reach', () => {
  it.each(LAYOUTS)('takes the long Task, not the short neighbour GA-2, just past the short end (%s)', (how) => {
    const geometry = geometryOf(shortOverLong(how))
    const short = shapeOf(geometry, UPPER)
    const long = shapeOf(geometry, LOWER)
    const x = short.right + OUTSIDE_THE_END
    expect(x, 'premise: the point is over the long shape').toBeLessThan(long.right)
    const shortAbove = short.top < long.top
    const y = shortAbove ? long.top + 1 : long.bottom - 1
    const reach = shortAbove ? y - short.bottom : short.top - y
    expect(reach, 'premise: the point is inside the S-250 margin of the short Task').toBeLessThan(S_250)
    const hit = hitAt(geometry, x, y)
    expect(taskOfHit(hit), `${HT_1_NO_NEIGHBOUR_REACHES} -- ${JSON.stringify(hit)}`).toBe(LOWER)
    expect(hit?.grab, HT_1_ON_THE_SHAPE).not.toBe('GA-2')
  })
})

describe('HT-2 (MUST) -- off both shapes, inside both margins, the nearer one', () => {
  it.each(LAYOUTS)('gives the gap near the upper Task to its GA-2, and near the lower Task to that Task (%s)', (how) => {
    const geometry = geometryOf(sideBySide(how))
    const [upper, lower, upperUid, lowerUid] = orderedPair(geometry)
    const x = Math.max(upper.right, lower.right) + OUTSIDE_THE_END
    const gap = lower.top - upper.bottom
    expect(gap, 'premise: the two shapes stand apart').toBeGreaterThan(0)
    // WHY: both margins must reach both probes or there is no contest; a probe
    // stands a quarter of the gap out, so each end needs three quarters of it.
    const sizes = reachingBands(gap)
    const nearUpper = hitAt(geometry, x, upper.bottom + gap / 4, sizes)
    const nearLower = hitAt(geometry, x, lower.top - gap / 4, sizes)
    expect(taskOfHit(nearUpper), `${HT_2_THE_NEARER} -- near the upper: ${JSON.stringify(nearUpper)}`).toBe(upperUid)
    expect(nearUpper?.grab).toBe('GA-2')
    expect(taskOfHit(nearLower), `${HT_2_THE_NEARER} -- near the lower: ${JSON.stringify(nearLower)}`).toBe(lowerUid)
    expect(nearLower?.grab).toBe('GA-2')
  })
})


describe('HT-2 -- a dependency line running through the gap is not dropped by the vertical step', () => {
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
    expect(hit?.item.kind, `${HT_2_THE_LINE_SURVIVES} -- ${JSON.stringify(hit)}`).toBe('dependency')
    expect(hit?.grab).toBe('GA-19')
  })
})

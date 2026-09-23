// T-064 PI-7 dependencyStartOfHit -- the start of a dependency line, read off a press hit.

// see PI-7, FR-009, PTD-3, CR-388

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import * as itemHitArea from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
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
import { specTable } from '../contract/spec-table'

type Hit = itemHitArea.Hit
type DependencyEnd = itemHitArea.DependencyEnd
type StartOfHit = (
  geometry: ScheduleGeometry,
  x: number,
  y: number,
  hit: Hit | null,
) => DependencyEnd | null

const { dependencyEndAtPointer, itemAtPointer, NOT_STORED_SIZES } = itemHitArea

// see T-064, PI-7
const PI_7_START_OF_HIT = '当たりがタスクのときだけ、そのタスクに限って `dependencyEndAtPointer` を問うた答えを返し、そうでなければ `null` を返す。'

const MEMBER = 'dependencyStartOfHit'

// WHY: read off the namespace, so the file still type-checks on a tree that
// does not export the member yet; the cases then fail by name instead.
function startOfHit(): StartOfHit {
  const found: unknown = (itemHitArea as unknown as Readonly<Record<string, unknown>>)[MEMBER]
  if (typeof found !== 'function') {
    throw new Error(`item-hit-area.ts does not export ${MEMBER}, which T-064 PI-7 names`)
  }
  return found as StartOfHit
}

it('T-064 PI-7 -- the manuscript still carries the dependencyStartOfHit sentence quoted above', () => {
  const row = specTable('T-064').rows.find((one) => one.id === 'PI-7')
  if (row === undefined) throw new Error('table T-064 has no row PI-7')
  const cells = row.cells.join(' ')
  expect(cells).toContain(`\`${MEMBER}\``)
  expect(cells, PI_7_START_OF_HIT).toContain(PI_7_START_OF_HIT)
})

const SHAPE_HEIGHT_OF = Object.fromEntries(
  Object.entries(SETTINGS_DEFAULTS)
    .filter(([key]) => key.startsWith('shapeHeightOf.'))
    .map(([key, value]) => [key.slice('shapeHeightOf.'.length), value]),
)

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, shapeHeightOf: SHAPE_HEIGHT_OF, ...part }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: 1200,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

// see S-63
const SETTINGS = settingsOf({
  scrollDate: '2026-01-01',
  rulerHeight: 48,
  rulerFont: 12,
  stackDirection: 'down',
  progressMarkerVisible: true,
})

const REGIONS = regionsFromScreen(ENV, SETTINGS)

// see T-266, T-206
const SLOP: itemHitArea.GrabSizes = NOT_STORED_SIZES

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
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null },
    calendars: [],
    tasks: [],
    resources: [],
    assignments: [],
    taskGroups: [],
    taskGroupMembers: [],
    taskVisuals: [],
    highlightBoxes: [],
    commentBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
    ...part,
  }) as unknown as Schedule

const BAR_UID = 1

const ONE_WIDE_BAR = scheduleOf({
  tasks: [taskOf({ uid: BAR_UID, name: 'Design', start: '2026-01-05', finish: '2026-03-05' })],
  taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
  taskGroupMembers: [{ groupId: 'g1', taskUid: BAR_UID }],
})

const GEOMETRY = geometryFromLayout(
  ONE_WIDE_BAR,
  SETTINGS,
  layoutFromSchedule(ONE_WIDE_BAR, SETTINGS, REGIONS),
  REGIONS,
  emptySelection(),
)

const BAR = layoutFromSchedule(ONE_WIDE_BAR, SETTINGS, REGIONS).placements[0]!
const IN_LEFT_HALF = BAR.x + BAR.width * 0.25
const IN_RIGHT_HALF = BAR.x + BAR.width * 0.75
const MIDDLE_Y = BAR.y + BAR.planHeight / 2

describe('T-064 PI-7 dependencyStartOfHit -- a task hit answers what dependencyEndAtPointer answers', () => {
  for (const [half, x] of [
    ['left half', IN_LEFT_HALF],
    ['right half', IN_RIGHT_HALF],
  ] as const) {
    it(`answers dependencyEndAtPointer for the hit Task, in its ${half}`, () => {
      const hit = itemAtPointer(GEOMETRY, x, MIDDLE_Y, SLOP)
      if (hit === null || hit.item.kind !== 'task') {
        throw new Error(`the press in the ${half} did not hit the Task, so nothing can be asked`)
      }
      const expected = dependencyEndAtPointer(GEOMETRY, x, MIDDLE_Y, hit.item.taskUid)
      expect(expected, 'dependencyEndAtPointer has no answer on the bar').not.toBeNull()
      expect(startOfHit()(GEOMETRY, x, MIDDLE_Y, hit), PI_7_START_OF_HIT).toEqual(expected)
    })
  }
})

describe('T-064 PI-7 dependencyStartOfHit -- any other hit, and no hit, answers null', () => {
  const others: readonly (readonly [string, Hit])[] = [
    ['a dependency line', { item: { kind: 'dependency', predecessorUid: BAR_UID, successorUid: BAR_UID }, grab: 'GA-19' }],
    ['a highlight box', { item: { kind: 'highlightBox', id: 'h1' }, grab: 'GR-14' }],
    ['a comment box', { item: { kind: 'commentBox', id: 'c1' }, grab: 'GR-14' }],
    ['the status line', { item: { kind: 'statusLine' }, grab: 'GR-16' }],
  ]

  it('stands every probe where dependencyEndAtPointer does have an answer', () => {
    expect(dependencyEndAtPointer(GEOMETRY, IN_LEFT_HALF, MIDDLE_Y, BAR_UID)).not.toBeNull()
  })

  for (const [name, hit] of others) {
    it(`answers null when the hit is ${name}, even on the bar`, () => {
      expect(startOfHit()(GEOMETRY, IN_LEFT_HALF, MIDDLE_Y, hit), PI_7_START_OF_HIT).toBeNull()
    })
  }

  it('answers null when the hit is null, even on the bar', () => {
    expect(startOfHit()(GEOMETRY, IN_LEFT_HALF, MIDDLE_Y, null), PI_7_START_OF_HIT).toBeNull()
  })

  it('answers null for the null hit itemAtPointer gives on empty ground', () => {
    const x = IN_LEFT_HALF
    const y = REGIONS.rowArea.y + REGIONS.rowArea.height - 4
    const hit = itemAtPointer(GEOMETRY, x, y, SLOP)
    expect(hit, 'the empty-ground probe hit something').toBeNull()
    expect(startOfHit()(GEOMETRY, x, y, hit), PI_7_START_OF_HIT).toBeNull()
  })
})

// see GA-18, FR-009
const NAMED_UID = 1
const NEIGHBOUR_UID = 2

const TWO_ROWS = scheduleOf({
  tasks: [
    taskOf({
      uid: NAMED_UID,
      // WHY: a name too long to fit takes `LP-2` of table T-273, not `LP-1`, so
      // the marker stands right of the reference -- past this bar, over the next.
      name: 'A'.repeat(40),
      start: '2026-01-05',
      finish: '2026-01-15',
      actualStart: '2026-01-05',
      stop: '2026-01-15',
    }),
    taskOf({ uid: NEIGHBOUR_UID, name: 'B', start: '2026-01-05', finish: '2026-03-05' }),
  ],
  taskGroups: [
    { id: 'g1', parentId: null, order: 0, height: null },
    { id: 'g2', parentId: null, order: 1, height: null },
  ],
  taskGroupMembers: [
    { groupId: 'g1', taskUid: NAMED_UID },
    { groupId: 'g2', taskUid: NEIGHBOUR_UID },
  ],
})

const TWO_ROWS_GEOMETRY = geometryFromLayout(
  TWO_ROWS,
  SETTINGS,
  layoutFromSchedule(TWO_ROWS, SETTINGS, REGIONS),
  REGIONS,
  emptySelection(),
)

const drawnOf = (uid: number) => {
  const found = TWO_ROWS_GEOMETRY.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`Task ${uid} was not drawn`)
  return found
}

const spanOf = (bar: BarGeometry | null): { readonly left: number; readonly right: number; readonly y: number } => {
  if (bar === null) throw new Error('the bar was not drawn')
  const points = bar.form === 'outline' ? bar.points : [bar.from, bar.to]
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
}

describe('T-064 PI-7 dependencyStartOfHit -- only the hit Task, never the Task nearest the pointer', () => {
  it("answers the hit Task's start from its progress marker, not the bar under that column", () => {
    const marker = drawnOf(NAMED_UID).marker
    if (marker === null) throw new Error('the Task drew no progress marker, so nothing can be asked')
    const { x, y } = marker.centre
    const named = spanOf(drawnOf(NAMED_UID).plan)
    const neighbour = spanOf(drawnOf(NEIGHBOUR_UID).plan)
    expect(x, 'the marker probe is not past the named bar right end').toBeGreaterThan(named.right)
    expect(x, 'the neighbour bar does not reach the marker column').toBeGreaterThan(neighbour.left)
    expect(x, 'the neighbour bar does not reach the marker column').toBeLessThan(neighbour.right)

    const hit = itemAtPointer(TWO_ROWS_GEOMETRY, x, y, SLOP)
    if (hit === null || hit.item.kind !== 'task' || hit.item.taskUid !== NAMED_UID) {
      throw new Error(`the press on the marker did not hit Task ${NAMED_UID}: ${JSON.stringify(hit)}`)
    }
    const expected = dependencyEndAtPointer(TWO_ROWS_GEOMETRY, x, y, NAMED_UID)
    expect(expected, 'FR-009: a press that hit the Task falls in one half or the other').not.toBeNull()
    const answer = startOfHit()(TWO_ROWS_GEOMETRY, x, y, hit)
    expect(answer, PI_7_START_OF_HIT).toEqual(expected)
    expect(answer?.taskUid, PI_7_START_OF_HIT).toBe(NAMED_UID)
  })

  it('answers for the Task the hit names even where another Task bar is under the pointer', () => {
    const named = spanOf(drawnOf(NAMED_UID).plan)
    const x = named.left + (named.right - named.left) * 0.25
    const y = named.y
    const hit: Hit = { item: { kind: 'task', taskUid: NEIGHBOUR_UID }, grab: 'GA-9' }
    const expected = dependencyEndAtPointer(TWO_ROWS_GEOMETRY, x, y, NEIGHBOUR_UID)
    expect(
      expected,
      'the two Tasks answer alike here, so the case cannot tell them apart',
    ).not.toEqual(dependencyEndAtPointer(TWO_ROWS_GEOMETRY, x, y, NAMED_UID))
    expect(startOfHit()(TWO_ROWS_GEOMETRY, x, y, hit), PI_7_START_OF_HIT).toEqual(expected)
  })
})

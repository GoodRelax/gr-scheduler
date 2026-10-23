// CR-830: FR-104 table T-266 GA-19 -- inside a plan end's grab, a dependency line answers on its drawn line only.

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
  answersAtPointer,
  grabSizesOf,
  itemAtPointer,
  pointerWalkOf,
} from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  SCREEN,
  bandOf,
  day,
  notStored,
  rowOf,
  scheduleOf,
  taskOf,
  type Band,
  type Bar,
  type Pt,
} from '../unit/cr-430-cross-section-scene'
import { unbroken } from './spec-table'


const ACROSS = '横'

const GA_19_OFF_SHAPE = 'ただし形の外でも、予定の端（`GA-1` ／ `GA-2` ／ `GA-10` ／ `GA-11`）の掴み代が覆う点では、'
const GA_19_DRAWN_ONLY =
  '描いた線そのもの（本線と矢じり、`S-285` を足さない —— 表 T-267 の `HT-1` と同じ読み）でだけ応えること（MUST）'
const GA_19_ORDER_KEPT = '応える順（表 T-268 の `TY-2`）は変えない'
const GA_19_SHORT_LINE = '描いた線の上では線が先に応えるので、端と端のあいだの短い線も、描いた所で選べる'
const GA_19_MARGIN = '線の縁から左右へ `S-285`。'
const HT_1_DRAWN = '依存線の描いた線は本線と矢じりであり'
const TY_2_OFF_SHAPE = '依存線の続きの印・依存線（この順）'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'),
)
const cellText = (table: string, id: string, heading: string): string => unbroken(rowOf(table, id).by[heading] ?? '')

const S_250 = notStored('S-250')
const S_253 = notStored('S-253')
const S_285 = notStored('S-285')

interface Line {
  readonly predecessorUid: number
  readonly successorUid: number
  readonly pattern: string
  readonly points: readonly Pt[]
  readonly drawnPoints: readonly Pt[]
  readonly strokeWidth?: number
  readonly head?: readonly Pt[]
}

interface Stage {
  readonly geometry: unknown
  readonly plan: (uid: number) => Band
  readonly line: () => Line
}

const linkTo = (predecessorUid: number): unknown => ({
  predecessorUid,
  linkType: 1,
  lag: 0,
  carry: {},
  carryElements: [],
})

const stageOf = (tasks: readonly Task[], isTwoRows: boolean, zoomX: number): Stage => {
  const base = scheduleOf({ tasks, shapeKind: 'rectangle' }) as unknown as Record<string, unknown>
  const g1 = (base['taskGroups'] as Record<string, unknown>[])[0] as Record<string, unknown>
  const schedule = (
    isTwoRows
      ? {
          ...base,
          taskGroups: [g1, { ...g1, id: 'g2', name: 'g2', order: 1 }],
          taskGroupMembers: tasks.map((one) => {
            const uid = (one as unknown as { uid: number }).uid
            return { taskUid: uid, taskGroupId: uid === 1 ? 'g1' : 'g2' }
          }),
        }
      : base
  ) as unknown as Schedule
  const settings = {
    ...SETTINGS_DEFAULTS,
    zoomX,
    scrollDate: day(1),
    stackDirection: 'down',
  } as unknown as DocumentSettings
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection(), null)
  const drawn = geometry as unknown as {
    tasks: readonly { taskUid: number; plan: Bar | null }[]
    dependencies: readonly Line[]
  }
  return {
    geometry,
    plan: (uid) => {
      const plan = drawn.tasks.find((one) => one.taskUid === uid)?.plan ?? null
      if (plan === null) throw new Error(`premise: task ${uid} has no drawn plan`)
      return bandOf(plan)
    },
    line: () => {
      if (drawn.dependencies.length !== 1) throw new Error(`premise: one line, got ${drawn.dependencies.length}`)
      return drawn.dependencies[0] as Line
    },
  }
}

const pathOf = (line: Line): readonly Pt[] => (line.drawnPoints.length > 0 ? line.drawnPoints : line.points)

const segmentDistance = (p: Pt, a: Pt, b: Pt): number => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

const distanceToPath = (p: Pt, path: readonly Pt[]): number => {
  let best = Number.POSITIVE_INFINITY
  for (let index = 0; index + 1 < path.length; index += 1) {
    best = Math.min(best, segmentDistance(p, path[index] as Pt, path[index + 1] as Pt))
  }
  return best
}

const isInsidePolygon = (p: Pt, polygon: readonly Pt[]): boolean => {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i] as Pt
    const b = polygon[j] as Pt
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

const halfStrokeOf = (line: Line): number => {
  if (line.strokeWidth === undefined) throw new Error('premise: the line states its drawn stroke width')
  return line.strokeWidth / 2
}

const sizes = grabSizesOf()

// WHY: both seams named by CR-830 section 4 must give the same answer.
const grabAt = (stage: Stage, at: Pt): string | null => {
  const one = itemAtPointer(stage.geometry as never, at.x, at.y, sizes)
  const two = answersAtPointer(pointerWalkOf(stage.geometry as never, sizes), at.x, at.y).hit
  expect(two, `the two seams agree at ${at.x},${at.y}`).toEqual(one)
  return one?.grab ?? null
}

const itemAt = (stage: Stage, at: Pt): unknown => itemAtPointer(stage.geometry as never, at.x, at.y, sizes)?.item ?? null

const verticalRunNear = (path: readonly Pt[], x: number): readonly [Pt, Pt] => {
  for (let index = 0; index + 1 < path.length; index += 1) {
    const a = path[index] as Pt
    const b = path[index + 1] as Pt
    if (Math.abs(a.x - b.x) < 1e-6 && Math.abs(b.y - a.y) > 1e-6 && a.x > x) return [a, b]
  }
  throw new Error('premise: the line has no vertical run right of the predecessor')
}

// WHY: the falling FS line -- the predecessor in row g1, the successor in row g2 a week later.
const PREDECESSOR = taskOf({ uid: 1, start: day(2), finish: day(4) })
const SUCCESSOR = taskOf({ uid: 2, start: day(12), finish: day(15), dependencies: [linkTo(1)] })

describe('CR-830 -- the spec text the cases rest on', () => {
  it('GA-19 states the off-shape exception and keeps the answer order', () => {
    const across = cellText('T-266', 'GA-19', ACROSS)
    for (const quoted of [GA_19_MARGIN, GA_19_OFF_SHAPE, GA_19_DRAWN_ONLY, GA_19_ORDER_KEPT, GA_19_SHORT_LINE]) {
      expect(across, quoted).toContain(quoted)
      expect(REQUIREMENTS, quoted).toContain(quoted)
    }
    expect(unbroken(Object.values(rowOf('T-267', 'HT-1').by).join(' ')), HT_1_DRAWN).toContain(HT_1_DRAWN)
    expect(Object.values(rowOf('T-268', 'TY-2').by).join(' '), TY_2_OFF_SHAPE).toContain(TY_2_OFF_SHAPE)
  })
})

describe(`CR-830 -- GA-19 「${GA_19_OFF_SHAPE}${GA_19_DRAWN_ONLY}」`, () => {
  const stage = stageOf([PREDECESSOR, SUCCESSOR], true, 8)
  const line = stage.line()
  const path = pathOf(line)
  const half = halfStrokeOf(line)
  const before = stage.plan(1)
  const after = stage.plan(2)
  const LINE = { kind: 'dependency', predecessorUid: 1, successorUid: 2 }

  const marginProbe = (): Pt => {
    const [a, b] = verticalRunNear(path, before.right)
    const top = Math.min(a.y, b.y)
    // WHY: the lower half of the plan band, where the run falls; the exit run sits at the band's middle.
    const y = Math.min(before.bottom - 0.5, Math.max(top + half + S_285 + 1, (before.center + before.bottom) / 2 + 1))
    return { x: a.x + half + S_285 / 2, y }
  }

  it('case 1: outside the predecessor plan finish, within S-253, on the margin of the vertical run, GA-2 answers', () => {
    const at = marginProbe()
    expect(at.x - before.right, 'premise: outside the drawn right edge').toBeGreaterThan(0)
    expect(at.x - before.right, 'premise: inside S-253').toBeLessThan(S_253)
    expect(at.y, 'premise: inside the plan band').toBeGreaterThan(before.top)
    expect(at.y, 'premise: inside the plan band').toBeLessThan(before.bottom)
    const distance = distanceToPath(at, path)
    expect(distance, 'premise: off the drawn line').toBeGreaterThan(half)
    expect(distance, 'premise: within the S-285 margin').toBeLessThan(half + S_285)
    expect(isInsidePolygon(at, line.head ?? []), 'premise: off the arrow head').toBe(false)
    expect(grabAt(stage, at), GA_19_DRAWN_ONLY).toBe('GA-2')
    expect(itemAt(stage, at)).toEqual({ kind: 'task', taskUid: 1 })
  })

  it(`case 2: the same zone on the drawn line itself, GA-19 answers: ${GA_19_SHORT_LINE}`, () => {
    const probe = marginProbe()
    const [a] = verticalRunNear(path, before.right)
    const at = { x: a.x, y: probe.y }
    expect(distanceToPath(at, path), 'premise: on the drawn line').toBeLessThan(half)
    expect(at.x - before.right, 'premise: inside S-253').toBeLessThan(S_253)
    expect(grabAt(stage, at), GA_19_ORDER_KEPT).toBe('GA-19')
    expect(itemAt(stage, at)).toEqual(LINE)
  })

  it('case 3: on the arrow head inside the successor plan start grab, GA-19 answers', () => {
    const head = line.head ?? []
    expect(head.length, 'premise: the line draws an arrow head').toBeGreaterThan(2)
    const at = {
      x: head.reduce((sum, one) => sum + one.x, 0) / head.length,
      y: head.reduce((sum, one) => sum + one.y, 0) / head.length,
    }
    expect(isInsidePolygon(at, head), 'premise: inside the arrow head').toBe(true)
    expect(after.left - at.x, 'premise: outside the drawn left edge').toBeGreaterThan(0)
    expect(after.left - at.x, 'premise: inside S-250').toBeLessThan(S_250)
    expect(at.y, 'premise: inside the successor plan band').toBeGreaterThan(after.top)
    expect(at.y, 'premise: inside the successor plan band').toBeLessThan(after.bottom)
    expect(grabAt(stage, at), GA_19_DRAWN_ONLY).toBe('GA-19')
    expect(itemAt(stage, at)).toEqual(LINE)
  })

  it(`case 4 (control): farther than S-253 from any plan end, within the S-285 margin, GA-19 answers: ${GA_19_MARGIN}`, () => {
    const far = Math.max(S_250, S_253) + 4
    let found: Pt | null = null
    for (let index = 0; index + 1 < path.length && found === null; index += 1) {
      const a = path[index] as Pt
      const b = path[index + 1] as Pt
      if (Math.abs(a.y - b.y) > 1e-6) continue
      const x = (a.x + b.x) / 2
      if (x - before.right > far && after.left - x > far) found = { x, y: a.y + half + S_285 / 2 }
    }
    expect(found, 'premise: a horizontal run clear of both plan ends').not.toBeNull()
    const at = found as Pt
    const distance = distanceToPath(at, path)
    expect(distance, 'premise: off the drawn line').toBeGreaterThan(half)
    expect(distance, 'premise: within the S-285 margin').toBeLessThan(half + S_285)
    expect(grabAt(stage, at), GA_19_MARGIN).toBe('GA-19')
    expect(itemAt(stage, at)).toEqual(LINE)
  })
})

describe(`CR-830 -- GA-19 「${GA_19_SHORT_LINE}」 (RP-1)`, () => {
  const LEFT = taskOf({ uid: 1, start: day(2), finish: day(4) })
  const RIGHT = taskOf({ uid: 2, start: day(6), finish: day(8), dependencies: [linkTo(1)] })

  it('case 5: a short same-row line between two plan ends answers GA-19 on its drawn line', () => {
    const stage = stageOf([LEFT, RIGHT], false, 6)
    const line = stage.line()
    const path = pathOf(line)
    const half = halfStrokeOf(line)
    const left = stage.plan(1)
    const right = stage.plan(2)
    expect(line.pattern, 'premise: the short same-row line').toBe('RP-1')
    const gap = right.left - left.right
    expect(gap, 'premise: the gap is less than 2 x S-253').toBeLessThan(2 * S_253)
    expect(gap, 'premise: a gap is there').toBeGreaterThan(0)
    const head = line.head ?? []
    const headLeft = head.length > 0 ? Math.min(...head.map((one) => one.x)) : right.left
    const a = path[0] as Pt
    const at = { x: (left.right + Math.min(headLeft, right.left)) / 2, y: a.y }
    expect(distanceToPath(at, path), 'premise: on the drawn line').toBeLessThan(half)
    expect(at.x - left.right, 'premise: inside the predecessor plan finish grab').toBeLessThan(S_253)
    expect(grabAt(stage, at), GA_19_SHORT_LINE).toBe('GA-19')
    expect(itemAt(stage, at)).toEqual({ kind: 'dependency', predecessorUid: 1, successorUid: 2 })
  })
})

// CR-555: a dependency line whose ends are not visible is drawn short (FR-009, table T-303).

import { describe, expect, it } from 'vitest'

import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import { emptySelection, selectionWith } from '../../src/entity/document-model/selection/selection'
import {
  grabSizesOf,
  itemAtPointer,
  itemsInMarquee,
  selectionWithinDrawn,
} from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { specTable } from '../contract/spec-table'

const cellOf = (table: string, id: string, column: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  const cell = row.by[column]
  if (cell === undefined) throw new Error(`table ${table} row ${id} has no column ${column}`)
  return cell.replace(/`/g, '').trim()
}

const numberOf = (table: string, id: string, column: string): number => {
  const found = cellOf(table, id, column).match(/-?\d+(?:\.\d+)?/)
  if (found === null) throw new Error(`table ${table} row ${id} prints no number in ${column}`)
  return Number(found[0])
}

// see T-201, T-206, T-236
const T201 = (id: string): number => numberOf('T-201', id, '既定値')
const T206 = (id: string): number => numberOf('T-206', id, '既定')
const LIGHT = (id: string): string => cellOf('T-236', id, '明るいテーマ')
const DARK = (id: string): string => cellOf('T-236', id, '暗いテーマ')

// see FR-039, T-252
const ratioAt = (displayScale: number): number => (T206('S-236') * displayScale) / 100

const R = ratioAt(100)
const LEAD_OUT = T201('S-298') * R
const LEAD_IN = T201('S-299') * R
const ARROW_LENGTH = T201('S-19') * R
const ARROW_WIDTH = T201('S-300') * R
const MIN_WIDTH = T201('S-49') * R
const TURN = T206('S-360') * R
const STRAIGHT = T206('S-361') * R
const DOT = T206('S-362') * R
const DOT_MARGIN = T206('S-363')

const SL_3_WHOLLY = '矩形に完全に囲まれた対象だけを取ること'
const T_303_MARK_IS_PART_OF_THE_LINE = '⭐ 続きの印はその依存線の一部である'
const EL_20_NOT_SEEN = 'その端は見えていない端とすること（MUST）。'
const EL_20_STAND = '経路を引くために立つ所は `EL-2` と同じとする —— 描かれている最も近い祖先の行の帯の下端であり'

const EPS = 1e-6
// WHY: the SVG prints two decimals.
const SVG_EPS = 0.006

type Loose = Record<string, unknown>
type Settings = Parameters<typeof layoutFromSchedule>[1]
type Schedule = Parameters<typeof layoutFromSchedule>[0]
type Environment = Parameters<typeof regionsFromScreen>[0]
type Selection = Parameters<typeof geometryFromLayout>[4]

interface Pt {
  readonly x: number
  readonly y: number
}

interface Continuation {
  readonly dots: readonly Pt[]
  readonly radius: number
  readonly farUid: number
}

// see FR-009, T-303
interface Line {
  readonly predecessorUid: number
  readonly successorUid: number
  readonly pattern: string
  readonly points: readonly Pt[]
  readonly elision?: string
  readonly drawnPoints?: readonly Pt[]
  readonly continuation?: Continuation | null
  readonly head?: readonly Pt[]
}

interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

interface Row {
  readonly groupId: string
  readonly y: number
  readonly height: number
  readonly isPinned?: boolean
}

interface Placement {
  readonly taskUid: number
  readonly x: number
  readonly width: number
  readonly y: number
  readonly planHeight: number
}

const ENVIRONMENT = { width: 1600, height: 700, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }
const WIDE = { ...ENVIRONMENT, width: 4000 }

const iso = (day: number): string => new Date(Date.UTC(2026, 1, 2) + day * 86400000).toISOString().slice(0, 10)
const HOME = iso(-7)
const FAR = 400

type Link = number | readonly [number, number]

const taskOf = (uid: number, start: number, days: number, links: readonly Link[] = [], part: Loose = {}): Loose => ({
  uid,
  parentTaskUid: null,
  wbsOrder: null,
  name: `t${uid}`,
  start: iso(start),
  finish: iso(start + days),
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
  dependencies: links.map((link) => ({
    predecessorUid: typeof link === 'number' ? link : link[0],
    linkType: typeof link === 'number' ? 1 : link[1],
    lag: null,
    lagFormat: null,
    carry: {},
    carryElements: [],
  })),
  carry: {},
  ...part,
})

type GroupSpec = readonly [string, string | null, string?]

interface SceneSpec {
  readonly groups: readonly GroupSpec[]
  readonly tasks: readonly (readonly [Loose, string])[]
  readonly settings?: Loose
  readonly environment?: typeof ENVIRONMENT
  readonly selection?: Selection
}

interface Scene {
  readonly schedule: Schedule
  readonly settings: Settings
  readonly regions: { readonly taskGroupArea: Rect }
  readonly layout: { readonly taskGroups: readonly Row[]; readonly placements: readonly Placement[]; readonly scrollAreaY?: number }
  readonly geometry: ReturnType<typeof geometryFromLayout>
  readonly selection: Selection
  readonly raw: { readonly layout: unknown; readonly regions: unknown }
}

const sceneOf = (spec: SceneSpec): Scene => {
  const settings = { ...SETTINGS_DEFAULTS, scrollDate: HOME, zoomX: 1, ...spec.settings } as unknown as Settings
  const regions = regionsFromScreen((spec.environment ?? ENVIRONMENT) as unknown as Environment, settings)
  const schedule = {
    project: { calendarUid: null, statusDate: null, title: null, themeHue: 214 },
    calendars: [],
    resources: [],
    assignments: [],
    highlightBoxes: [],
    commentBoxes: [],
    tasks: spec.tasks.map(([task]) => task),
    taskGroups: spec.groups.map(([id, parentId, treeState], order) => ({
      id,
      parentId,
      order,
      minHeight: null,
      label: id,
      derivedFromTaskUid: null,
      treeState: treeState ?? 'auto',
      editGroup: null,
    })),
    taskGroupMembers: spec.tasks.map(([task, groupId]) => ({ groupId, taskUid: task['uid'] })),
    taskVisuals: spec.tasks.map(([task]) => ({ taskUid: task['uid'], shapeKind: 'rectangle' })),
    taskOrigins: [],
    baselineTasks: [],
  } as unknown as Schedule
  const layout = layoutFromSchedule(schedule, settings, regions)
  const selection = spec.selection ?? emptySelection()
  const geometry = geometryFromLayout(schedule, settings, layout, regions, selection, null)
  return {
    schedule,
    settings,
    regions: regions as unknown as Scene['regions'],
    layout: layout as unknown as Scene['layout'],
    geometry,
    selection,
    raw: { layout, regions },
  }
}

const lineOf = (scene: Scene, predecessorUid: number, successorUid: number): Line => {
  const found = (scene.geometry.dependencies as unknown as readonly Line[]).find(
    (one) => one.predecessorUid === predecessorUid && one.successorUid === successorUid,
  )
  if (found === undefined) throw new Error(`geometry.dependencies holds no line ${predecessorUid} -> ${successorUid}`)
  return found
}

const maybeLineOf = (scene: Scene, predecessorUid: number, successorUid: number): Line | undefined =>
  (scene.geometry.dependencies as unknown as readonly Line[]).find(
    (one) => one.predecessorUid === predecessorUid && one.successorUid === successorUid,
  )

const placementOf = (scene: Scene, uid: number): Placement => {
  const found = scene.layout.placements.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`the layout placed no Task ${uid}`)
  return found
}

const rowOf = (scene: Scene, groupId: string): Row => {
  const found = scene.layout.taskGroups.find((one) => one.groupId === groupId)
  if (found === undefined) throw new Error(`the layout drew no row ${groupId}`)
  return found
}

const svgOf = (scene: Scene, picture: 'screen' | 'export' = 'screen', theme: 'light' | 'dark' = 'light'): string =>
  svgFromSchedule(
    scene.schedule,
    scene.settings,
    scene.raw.layout as never,
    scene.geometry,
    scene.raw.regions as never,
    scene.selection as never,
    picture,
    { themePreference: theme, guideCursorMode: 'none' } as never,
  )

const sign = (value: number): number => (value > EPS ? 1 : value < -EPS ? -1 : 0)

// WHY: EL-7 reads the direction off the route as walked from the visible end, not off the far end.
const routeFrom = (line: Line, end: 'predecessor' | 'successor'): readonly Pt[] =>
  end === 'predecessor' ? line.points : [...line.points].reverse()

const firstStep = (route: readonly Pt[], axis: 'x' | 'y'): number => {
  for (let at = 1; at < route.length; at += 1) {
    const step = sign(route[at]![axis] - route[at - 1]![axis])
    if (step !== 0) return step
  }
  return 0
}

interface Expected {
  readonly outward: readonly Pt[]
  readonly towards: Pt
}

// see T-303
const bentLine = (line: Line, end: 'predecessor' | 'successor'): Expected => {
  const route = routeFrom(line, end)
  const anchor = route[0]!
  const across = firstStep(route, 'x')
  const down = firstStep(route, 'y')
  const lead = end === 'predecessor' ? LEAD_OUT : LEAD_IN
  const corner = { x: anchor.x + across * lead, y: anchor.y }
  return { outward: [anchor, corner, { x: corner.x, y: corner.y + down * TURN }], towards: { x: 0, y: down } }
}

// see T-303
const straightLine = (line: Line, end: 'predecessor' | 'successor'): Expected => {
  const route = routeFrom(line, end)
  const anchor = route[0]!
  const across = firstStep(route, 'x')
  return { outward: [anchor, { x: anchor.x + across * STRAIGHT, y: anchor.y }], towards: { x: across, y: 0 } }
}

// see T-303
const dotsAfter = (expected: Expected): readonly Pt[] => {
  const tip = expected.outward[expected.outward.length - 1]!
  return [1.5, 3.5, 5.5].map((steps) => ({
    x: tip.x + expected.towards.x * steps * DOT,
    y: tip.y + expected.towards.y * steps * DOT,
  }))
}

const near = (a: Pt, b: Pt, eps = EPS): boolean => Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps

const samePath = (actual: readonly Pt[], expected: readonly Pt[], eps = EPS): boolean =>
  actual.length === expected.length && actual.every((one, at) => near(one, expected[at]!, eps))

const samePathEitherWay = (actual: readonly Pt[], expected: readonly Pt[], eps = EPS): boolean =>
  samePath(actual, expected, eps) || samePath(actual, [...expected].reverse(), eps)

const sameDots = (actual: readonly Pt[], expected: readonly Pt[]): boolean =>
  actual.length === expected.length && expected.every((want) => actual.some((one) => near(one, want)))

const show = (path: readonly Pt[] | undefined): string =>
  JSON.stringify((path ?? []).map((one) => [Number(one.x.toFixed(3)), Number(one.y.toFixed(3))]))

const boxOf = (path: readonly Pt[]): Rect => {
  const xs = path.map((one) => one.x)
  const ys = path.map((one) => one.y)
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
}

const overlaps = (low: number, high: number, from: number, to: number): boolean => Math.min(high, to) - Math.max(low, from) > 0

interface Element {
  readonly tag: string
  readonly attrs: string
  readonly clips: readonly string[]
}

const attrOf = (attrs: string, name: string): string | null => {
  const found = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)
  return found === null ? null : found[1]!
}

const elementsOf = (svg: string): readonly Element[] => {
  const out: Element[] = []
  const groups: (string | null)[] = []
  for (const match of svg.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
    const [, closing, tag, attrs, selfClosing] = match
    if (tag === 'g') {
      if (closing === '/') groups.pop()
      else if (selfClosing !== '/') {
        const clip = /url\(#([^)]+)\)/.exec(attrOf(attrs!, 'clip-path') ?? '')
        groups.push(clip === null ? null : clip[1]!)
      }
      continue
    }
    if (closing === '/') continue
    out.push({ tag: tag!, attrs: attrs!, clips: groups.filter((one): one is string => one !== null) })
  }
  return out
}

const clipTopsOf = (svg: string): ReadonlyMap<string, number> => {
  const out = new Map<string, number>()
  for (const match of svg.matchAll(/<clipPath id="([^"]+)"[^>]*>\s*<rect([^>]*)>/g)) {
    out.set(match[1]!, Number(attrOf(match[2]!, 'y')))
  }
  return out
}

const pointsAttr = (attrs: string): readonly Pt[] =>
  (attrOf(attrs, 'points') ?? '')
    .trim()
    .split(/\s+/)
    .filter((one) => one !== '')
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number)
      return { x: x!, y: y! }
    })

const polylinesOf = (svg: string): readonly Element[] => elementsOf(svg).filter((one) => one.tag === 'polyline')

const circlesAt = (svg: string, centres: readonly Pt[]): readonly Element[] =>
  elementsOf(svg).filter(
    (one) =>
      one.tag === 'circle' &&
      centres.some((centre) => near({ x: Number(attrOf(one.attrs, 'cx')), y: Number(attrOf(one.attrs, 'cy')) }, centre, SVG_EPS)),
  )

// see FR-098
const cutAtScrollArea = (svg: string, element: Element, scrollAreaY: number): boolean => {
  const tops = clipTopsOf(svg)
  return element.clips.some((id) => Math.abs((tops.get(id) ?? Number.NaN) - scrollAreaY) <= SVG_EPS)
}

interface Answer {
  readonly grab: string | null
  readonly item: Loose | null
}

const answerAt = (scene: Scene, at: Pt): Answer => {
  const hit = itemAtPointer(scene.geometry, at.x, at.y, grabSizesOf()) as unknown as {
    readonly grab?: string
    readonly item?: Loose
  } | null
  return { grab: hit?.grab ?? null, item: hit?.item ?? null }
}

const isLine = (answer: Answer, predecessorUid: number, successorUid: number): boolean =>
  answer.item !== null &&
  answer.item['kind'] === 'dependency' &&
  answer.item['predecessorUid'] === predecessorUid &&
  answer.item['successorUid'] === successorUid

const predecessorOnly = (settings: Loose = {}, selection?: Selection): Scene =>
  sceneOf({
    groups: [['a', null], ['b', null]],
    tasks: [
      [taskOf(1, 0, 5), 'a'],
      [taskOf(2, FAR, 5, [1]), 'b'],
    ],
    settings,
    ...(selection === undefined ? {} : { selection }),
  })

const successorOnly = (): Scene =>
  sceneOf({
    groups: [['a', null], ['b', null]],
    tasks: [
      [taskOf(1, 0, 5), 'a'],
      [taskOf(2, 110, 5, [1]), 'b'],
    ],
    settings: { scrollDate: iso(100) },
  })

const predecessorOnlySameTaskGroup = (): Scene =>
  sceneOf({
    groups: [['a', null]],
    tasks: [
      [taskOf(1, 0, 5), 'a'],
      [taskOf(2, FAR, 5, [1]), 'a'],
    ],
  })

const successorOnlySameTaskGroup = (): Scene =>
  sceneOf({
    groups: [['a', null]],
    tasks: [
      [taskOf(1, 0, 5), 'a'],
      [taskOf(2, 110, 5, [1]), 'a'],
    ],
    settings: { scrollDate: iso(100) },
  })

const neitherEnd = (): Scene =>
  sceneOf({
    groups: [['a', null]],
    tasks: [
      [taskOf(1, 0, 5), 'a'],
      [taskOf(2, 1000, 5, [1]), 'a'],
    ],
    settings: { scrollDate: iso(300) },
  })

describe('EL-1 -- an end is visible when its plan shape overlaps where its row is drawn and the Task Group Area across', () => {
  it('EL-1: an end whose plan shape lies wholly right of the Task Group Area is not visible (EL-4)', () => {
    const scene = predecessorOnly()
    const taskGroupArea = scene.regions.taskGroupArea
    expect(placementOf(scene, 2).x, 'premise: Task 2 starts right of the Task Group Area').toBeGreaterThan(taskGroupArea.x + taskGroupArea.width)
    expect(lineOf(scene, 1, 2).elision).toBe('EL-4')
  })

  it('EL-1: a shape that only touches the Task Group Area edge (overlap width 0) is not visible (EL-5)', () => {
    const scene = sceneOf({
      groups: [['a', null], ['b', null]],
      tasks: [
        [taskOf(1, 0, 5), 'a'],
        [taskOf(2, 20, 5, [1]), 'b'],
      ],
      settings: { scrollDate: iso(6) },
    })
    const shape = placementOf(scene, 1)
    expect(shape.x + shape.width, 'premise: the plan ends exactly on the Task Group Area left edge').toBeCloseTo(scene.regions.taskGroupArea.x, 9)
    expect(lineOf(scene, 1, 2).elision).toBe('EL-5')
  })

  it('EL-1 control: one day further, the same shape overlaps the Task Group Area and the line is drawn whole (EL-3)', () => {
    const scene = sceneOf({
      groups: [['a', null], ['b', null]],
      tasks: [
        [taskOf(1, 0, 5), 'a'],
        [taskOf(2, 20, 5, [1]), 'b'],
      ],
      settings: { scrollDate: iso(5) },
    })
    const shape = placementOf(scene, 1)
    expect(shape.x + shape.width, 'premise: the plan reaches into the Task Group Area').toBeGreaterThan(scene.regions.taskGroupArea.x)
    expect(lineOf(scene, 1, 2).elision).toBe('EL-3')
  })

  it('EL-1 (the name label does not count): a label inside the Task Group Area does not make its end visible (EL-5)', () => {
    const scene = sceneOf({
      groups: [['a', null], ['b', null]],
      tasks: [
        [taskOf(1, 0, 5, [], { name: 'a rather long name that reaches into the chart' }), 'a'],
        [taskOf(2, 20, 5, [1]), 'b'],
      ],
      settings: { scrollDate: iso(7) },
    })
    const taskGroupArea = scene.regions.taskGroupArea
    const shape = placementOf(scene, 1)
    const label = scene.geometry.tasks.find((one) => one.taskUid === 1)?.label as Rect | null | undefined
    expect(shape.x + shape.width, 'premise: the plan ends left of the Task Group Area').toBeLessThan(taskGroupArea.x)
    expect(label, 'premise: the name label is drawn').toBeTruthy()
    expect(label!.x + label!.width, 'premise: the name label reaches into the Task Group Area').toBeGreaterThan(taskGroupArea.x + 1)
    expect(lineOf(scene, 1, 2).elision).toBe('EL-5')
  })

  it('EL-1: a scrolling row wholly above the Task Group Area is not visible (EL-5)', () => {
    const scene = sceneOf({
      groups: [['a', null], ['b', null], ['c', null]],
      tasks: [
        [taskOf(1, 0, 5), 'a'],
        [taskOf(2, 10, 5, [1]), 'b'],
      ],
      settings: { scrollGroupId: 'b' },
    })
    const shape = placementOf(scene, 1)
    expect(shape.y + shape.planHeight, 'premise: the plan band lies above the Task Group Area').toBeLessThanOrEqual(
      scene.regions.taskGroupArea.y,
    )
    expect(lineOf(scene, 1, 2).elision).toBe('EL-5')
  })

  it('EL-1 control: a scrolling row cut by the Task Group Area top still overlaps it and is visible (EL-3)', () => {
    const scene = sceneOf({
      groups: [['a', null], ['b', null], ['c', null]],
      tasks: [
        [taskOf(1, 0, 5), 'a'],
        [taskOf(2, 10, 5, [1]), 'b'],
      ],
      settings: { scrollGroupId: 'a', scrollGroupOffset: 0.5 },
    })
    const shape = placementOf(scene, 1)
    const top = scene.regions.taskGroupArea.y
    expect(shape.y < top && shape.y + shape.planHeight > top, 'premise: the Task Group Area top cuts the plan band').toBe(true)
    expect(lineOf(scene, 1, 2).elision).toBe('EL-3')
  })

  it('EL-1 (a row under the band is not visible) / RT-6: pinned end visible, end scrolled under the band not (EL-4)', () => {
    const scene = sceneOf({
      groups: [['P', null], ['a', null], ['b', null], ['c', null]],
      tasks: [
        [taskOf(1, 0, 5), 'P'],
        [taskOf(2, 10, 5, [1]), 'a'],
      ],
      settings: { pinnedGroupIds: ['P'], scrollGroupId: 'b' },
    })
    const taskGroupArea = scene.regions.taskGroupArea
    const under = placementOf(scene, 2)
    const scrollTop = scene.layout.scrollAreaY
    expect(rowOf(scene, 'P').isPinned, 'premise: row P is pinned').toBe(true)
    expect(scrollTop, 'premise: the layout says where the band ends').toBeTypeOf('number')
    expect(
      overlaps(under.y, under.y + under.planHeight, taskGroupArea.y, taskGroupArea.y + taskGroupArea.height) &&
        overlaps(under.x, under.x + under.width, taskGroupArea.x, taskGroupArea.x + taskGroupArea.width),
      'premise: Task 2 lies inside the Task Group Area rectangle',
    ).toBe(true)
    expect(under.y + under.planHeight, 'premise: Task 2 lies under the band').toBeLessThanOrEqual(scrollTop!)
    expect(lineOf(scene, 1, 2).elision).toBe('EL-4')
  })

  it('RT-6 control: a pinned end and a visible scrolling end draw the route whole (EL-3)', () => {
    const scene = sceneOf({
      groups: [['P', null], ['a', null]],
      tasks: [
        [taskOf(1, 0, 5), 'P'],
        [taskOf(2, 10, 5, [1]), 'a'],
      ],
      settings: { pinnedGroupIds: ['P'] },
    })
    expect(lineOf(scene, 1, 2).elision).toBe('EL-3')
  })
})

describe('EL-2 -- the end of a row the group LOD does not draw stands at the foot of its nearest drawn ancestor', () => {
  it('the manuscript: T-303 EL-20 still says it', () => {
    const cell = specTable('T-303').rows.find((one) => one.id === 'EL-20')?.cells.join('') ?? ''
    expect(cell.replace(/<br\s*\/?>/g, ''), EL_20_NOT_SEEN).toContain(EL_20_NOT_SEEN)
    expect(cell.replace(/<br\s*\/?>/g, ''), EL_20_STAND).toContain(EL_20_STAND)
  })

  // WHY: zoomY 0.4 draws depth 2 and hides depth 3; zoomY 1 draws both.
  const DEEP = [['a', null], ['a1', 'a'], ['a11', 'a1'], ['b', null]] as const satisfies readonly GroupSpec[]
  const deep = (zoomY: number): Scene =>
    sceneOf({
      groups: DEEP,
      tasks: [
        [taskOf(1, 0, 5), 'a'],
        [taskOf(2, 20, 5, [1]), 'a11'],
        // WHY: zero duration, so its width is the S-49 floor rather than its dates.
        [taskOf(3, 10, 0), 'a11'],
        [taskOf(4, 40, 5, [3]), 'b'],
      ],
      settings: { zoomY },
    })

  it('EL-2: a hidden successor is not visible; the line is EL-4 and its mark leads to that Task', () => {
    const hidden = deep(0.4)
    expect(hidden.layout.placements.some((one) => one.taskUid === 2), 'premise: the LOD hides Task 2').toBe(false)
    const line = lineOf(hidden, 1, 2)
    expect(line.elision).toBe('EL-4')
    expect(line.continuation?.farUid).toBe(2)
  })

  it('EL-2: the hidden entry stands on the foot of the nearest drawn ancestor, where the row opens across', () => {
    const hidden = deep(0.4)
    const open = deep(1)
    const ancestor = rowOf(hidden, 'a1')
    const entry = lineOf(hidden, 1, 2).points.at(-1)!
    expect(entry.y).toBeCloseTo(ancestor.y + ancestor.height, 9)
    expect(entry.x).toBeCloseTo(placementOf(open, 2).x, 9)
  })

  it('EL-2: a hidden predecessor exits from the foot of its ancestor at the right side it would open with (S-49 floor)', () => {
    const hidden = deep(0.4)
    const open = deep(1)
    const drawn = placementOf(open, 3)
    expect(drawn.width, 'premise: a zero-duration Task is drawn at the S-49 floor').toBeCloseTo(MIN_WIDTH, 9)
    const line = lineOf(hidden, 3, 4)
    expect(line.elision).toBe('EL-5')
    expect(line.continuation?.farUid).toBe(3)
    const ancestor = rowOf(hidden, 'a1')
    expect(line.points[0]!.y).toBeCloseTo(ancestor.y + ancestor.height, 9)
    expect(line.points[0]!.x).toBeCloseTo(drawn.x + drawn.width, 9)
  })

  it('EL-2 (pinned ancestor): the end stands at the foot of the last scrolling row before that ancestor', () => {
    const scene = sceneOf({
      groups: [['s', null], ['P', null], ['P1', 'P'], ['z', null]],
      tasks: [
        [taskOf(1, 0, 5), 's'],
        [taskOf(2, 20, 5, [1]), 'P1'],
      ],
      settings: { pinnedGroupIds: ['P'], zoomY: 0.2 },
    })
    expect(rowOf(scene, 'P').isPinned, 'premise: P is pinned').toBe(true)
    expect(scene.layout.taskGroups.some((one) => one.groupId === 'P1'), 'premise: the LOD hides P1').toBe(false)
    const before = rowOf(scene, 's')
    const line = lineOf(scene, 1, 2)
    expect(line.elision).toBe('EL-4')
    expect(line.points.at(-1)!.y).toBeCloseTo(before.y + before.height, 9)
  })

  it('EL-2 (pinned ancestor, no scrolling row before it): the end stands at the top of the area below the band', () => {
    const scene = sceneOf({
      groups: [['P', null], ['P1', 'P'], ['s', null]],
      tasks: [
        [taskOf(1, 0, 5), 's'],
        [taskOf(2, 20, 5, [1]), 'P1'],
      ],
      settings: { pinnedGroupIds: ['P'], zoomY: 0.2 },
    })
    expect(scene.layout.taskGroups.some((one) => one.groupId === 'P1'), 'premise: the LOD hides P1').toBe(false)
    expect(scene.layout.scrollAreaY, 'premise: the layout says where the band ends').toBeTypeOf('number')
    expect(lineOf(scene, 1, 2).points.at(-1)!.y).toBeCloseTo(scene.layout.scrollAreaY!, 9)
  })

  it('EL-20 (CR-596, no longer RT-4a): an end under a row the person folded stands on the foot of the drawn row, with a mark', () => {
    const scene = sceneOf({
      groups: [['a', null], ['a1', 'a', 'collapsed'], ['a11', 'a1']],
      tasks: [
        [taskOf(1, 0, 5), 'a'],
        [taskOf(2, 20, 5, [1]), 'a11'],
      ],
    })
    const line = lineOf(scene, 1, 2)
    expect(line.elision, EL_20_NOT_SEEN).toBe('EL-4')
    expect(line.continuation?.farUid, EL_20_NOT_SEEN).toBe(2)
    const ancestor = rowOf(scene, 'a1')
    expect(line.points.at(-1)!.y, EL_20_STAND).toBeCloseTo(ancestor.y + ancestor.height, 9)
    expect(circlesAt(svgOf(scene), line.continuation?.dots ?? []).length, 'EL-9: the mark is drawn').toBe(3)
  })
})

describe('EL-3 .. EL-8 -- which part of the route is drawn', () => {
  it('EL-3: both ends visible draws the route as it is, with its head and no mark', () => {
    const scene = sceneOf({
      groups: [['a', null], ['b', null]],
      tasks: [
        [taskOf(1, 0, 5), 'a'],
        [taskOf(2, 10, 5, [1]), 'b'],
      ],
    })
    const line = lineOf(scene, 1, 2)
    expect(line.elision).toBe('EL-3')
    expect(show(line.drawnPoints)).toBe(show(line.points))
    expect(line.head?.length ?? 0).toBeGreaterThan(0)
    expect(line.continuation ?? null).toBeNull()
  })

  it('FR-009 / RT-3: the route itself does not change with what is visible (EL-4 on a narrow screen, EL-3 on a wide one)', () => {
    const narrow = predecessorOnly()
    const wide = sceneOf({
      groups: [['a', null], ['b', null]],
      tasks: [
        [taskOf(1, 0, 5), 'a'],
        [taskOf(2, FAR, 5, [1]), 'b'],
      ],
      environment: WIDE,
    })
    expect(wide.regions.taskGroupArea.x, 'premise: the Task Group Area starts at the same x').toBe(narrow.regions.taskGroupArea.x)
    expect(lineOf(wide, 1, 2).elision, 'premise: on the wide screen both ends are visible').toBe('EL-3')
    expect(lineOf(narrow, 1, 2).elision).toBe('EL-4')
    expect(show(lineOf(narrow, 1, 2).points)).toBe(show(lineOf(wide, 1, 2).points))
  })

  it('EL-4 / EL-7: predecessor only -- out by the lead-out (S-298), down by S-360, no head', () => {
    const line = lineOf(predecessorOnly(), 1, 2)
    expect(line.pattern, 'premise: a lower row to the right is route RP-2').toBe('RP-2')
    expect(line.elision).toBe('EL-4')
    const expected = bentLine(line, 'predecessor')
    expect(expected.towards.y, 'premise: RP-2 first turns down').toBe(1)
    expect(samePathEitherWay(line.drawnPoints ?? [], expected.outward), show(line.drawnPoints)).toBe(true)
    expect(line.head === undefined || line.head.length === 0, 'EL-4: no arrow head').toBe(true)
  })

  it('EL-7 (worked example): the successor up and to the right off screen turns the short line up (RP-3)', () => {
    const scene = sceneOf({
      groups: [['a', null], ['b', null]],
      tasks: [
        [taskOf(2, FAR, 5, [1]), 'a'],
        [taskOf(1, 0, 5), 'b'],
      ],
    })
    const line = lineOf(scene, 1, 2)
    expect(line.pattern, 'premise: an upper row to the right is route RP-3').toBe('RP-3')
    expect(line.elision).toBe('EL-4')
    const expected = bentLine(line, 'predecessor')
    expect(expected.towards.y).toBe(-1)
    expect(samePathEitherWay(line.drawnPoints ?? [], expected.outward), show(line.drawnPoints)).toBe(true)
  })

  it('EL-5 / EL-7: successor only -- back by the lead-in (S-299), up by S-360, ending on the entry', () => {
    const line = lineOf(successorOnly(), 1, 2)
    expect(line.pattern, 'premise: route RP-2').toBe('RP-2')
    expect(line.elision).toBe('EL-5')
    const expected = bentLine(line, 'successor')
    expect(expected.towards.y, 'premise: read from the successor, RP-2 first turns up').toBe(-1)
    expect(samePath(line.drawnPoints ?? [], [...expected.outward].reverse()), show(line.drawnPoints)).toBe(true)
  })

  it('EL-5: the head is drawn at the entry at the size of S-19 by S-300', () => {
    const line = lineOf(successorOnly(), 1, 2)
    const entry = line.points.at(-1)!
    expect(line.head?.length ?? 0).toBeGreaterThan(0)
    expect(line.head!.some((one) => near(one, entry)), 'the head touches the entry').toBe(true)
    const box = boxOf(line.head!)
    expect(box.width).toBeCloseTo(ARROW_LENGTH, 6)
    expect(box.height).toBeCloseTo(ARROW_WIDTH, 6)
  })

  it('EL-4 / EL-8: a route with no vertical run (RP-1) goes straight on by S-361', () => {
    const line = lineOf(predecessorOnlySameTaskGroup(), 1, 2)
    expect(line.pattern, 'premise: one row is route RP-1').toBe('RP-1')
    expect(line.elision).toBe('EL-4')
    expect(samePathEitherWay(line.drawnPoints ?? [], straightLine(line, 'predecessor').outward), show(line.drawnPoints)).toBe(
      true,
    )
  })

  it('EL-5 / EL-8: successor only on one row -- S-361 into the entry, with the head', () => {
    const line = lineOf(successorOnlySameTaskGroup(), 1, 2)
    expect(line.pattern, 'premise: route RP-1').toBe('RP-1')
    expect(line.elision).toBe('EL-5')
    expect(samePath(line.drawnPoints ?? [], [...straightLine(line, 'successor').outward].reverse()), show(line.drawnPoints)).toBe(
      true,
    )
    expect(line.head?.length ?? 0).toBeGreaterThan(0)
  })

  it('EL-6: neither end visible draws nothing, even though the route crosses the Task Group Area', () => {
    const scene = neitherEnd()
    const line = lineOf(scene, 1, 2)
    const taskGroupArea = scene.regions.taskGroupArea
    const xs = line.points.map((one) => one.x)
    expect(Math.min(...xs) < taskGroupArea.x && Math.max(...xs) > taskGroupArea.x + taskGroupArea.width, 'premise: the route crosses').toBe(true)
    expect(line.elision).toBe('EL-6')
    expect(line.drawnPoints ?? null).toEqual([])
    expect(line.head === undefined || line.head.length === 0).toBe(true)
    expect(line.continuation ?? null).toBeNull()
  })

  it('EL-6 / EL-14: the undrawn line stays in geometry.dependencies, so select-all (SL-5) still takes it', () => {
    expect(maybeLineOf(neitherEnd(), 1, 2)).toBeDefined()
  })
})

describe('EL-9 -- three dots of diameter S-362, spaced by S-362, after a gap of S-362', () => {
  it('EL-9: after a vertical short line the dots run on down', () => {
    const line = lineOf(predecessorOnly(), 1, 2)
    const want = dotsAfter(bentLine(line, 'predecessor'))
    expect(sameDots(line.continuation?.dots ?? [], want), show(line.continuation?.dots)).toBe(true)
    expect(line.continuation!.radius).toBeCloseTo(DOT / 2, 9)
    expect(line.continuation!.farUid).toBe(2)
  })

  it('EL-9: after a horizontal short line the dots run on across', () => {
    const line = lineOf(predecessorOnlySameTaskGroup(), 1, 2)
    const want = dotsAfter(straightLine(line, 'predecessor'))
    expect(sameDots(line.continuation?.dots ?? [], want), show(line.continuation?.dots)).toBe(true)
  })

  it('EL-9 / EL-5: on the successor side the dots stand beyond the far end of the short line', () => {
    const line = lineOf(successorOnly(), 1, 2)
    const want = dotsAfter(bentLine(line, 'successor'))
    expect(sameDots(line.continuation?.dots ?? [], want), show(line.continuation?.dots)).toBe(true)
    expect(line.continuation!.farUid).toBe(1)
  })

  it('EL-9 (a selected line keeps the dot size; SL-8)', () => {
    const plain = lineOf(predecessorOnly(), 1, 2)
    const chosen = selectionWith(emptySelection(), { kind: 'dependency', successorUid: 2, ordinal: 0 } as never)
    const selected = lineOf(predecessorOnly({}, chosen as unknown as Selection), 1, 2)
    expect(plain.continuation, 'premise: the unselected line has a mark').toBeTruthy()
    expect(selected.continuation?.radius).toBeCloseTo(plain.continuation!.radius, 9)
  })

  it('T-252 DS-3: S-360 and S-362 grow with the display scale', () => {
    const scale = 200
    const line = lineOf(predecessorOnly({ displayScale: scale }), 1, 2)
    const ratio = ratioAt(scale)
    const drawn = line.drawnPoints ?? []
    expect(drawn.length, 'premise: a bent short line').toBe(3)
    const vertical = Math.max(Math.abs(drawn[0]!.y - drawn[1]!.y), Math.abs(drawn[1]!.y - drawn[2]!.y))
    expect(vertical).toBeCloseTo(T206('S-360') * ratio, 6)
    expect(line.continuation?.radius).toBeCloseTo((T206('S-362') * ratio) / 2, 6)
  })
})

describe('the drawn picture follows T-303', () => {
  const dependencyInk = LIGHT('S-159')
  const ground = LIGHT('S-146')

  it('EL-4: the SVG draws the short line, never the whole route, and no arrow head', () => {
    const scene = predecessorOnly()
    const line = lineOf(scene, 1, 2)
    const svg = svgOf(scene)
    const inked = polylinesOf(svg).filter((one) => attrOf(one.attrs, 'stroke') === dependencyInk)
    expect(inked.length, 'one line drawn in the dependency colour').toBe(1)
    expect(samePathEitherWay(pointsAttr(inked[0]!.attrs), line.drawnPoints ?? [], SVG_EPS)).toBe(true)
    expect(polylinesOf(svg).some((one) => samePath(pointsAttr(one.attrs), line.points, SVG_EPS))).toBe(false)
    expect(attrOf(inked[0]!.attrs, 'marker-end'), 'EL-4: no head').toBeNull()
  })

  it('EL-9: three dots in the dependency colour (S-159) at the continuation, radius half of S-362', () => {
    const scene = predecessorOnly()
    const line = lineOf(scene, 1, 2)
    const dots = circlesAt(svgOf(scene), line.continuation?.dots ?? [])
    expect(dots.length).toBe(3)
    for (const dot of dots) {
      expect(attrOf(dot.attrs, 'fill')).toBe(dependencyInk)
      expect(Number(attrOf(dot.attrs, 'r'))).toBeCloseTo(DOT / 2, 2)
    }
  })

  it('EL-9: the dark theme paints the dots in the dark S-159', () => {
    const scene = predecessorOnly()
    const line = lineOf(scene, 1, 2)
    const dots = circlesAt(svgOf(scene, 'screen', 'dark'), line.continuation?.dots ?? [])
    expect(dots.length).toBe(3)
    for (const dot of dots) expect(attrOf(dot.attrs, 'fill')).toBe(DARK('S-159'))
  })

  it('EL-9 (the ground-colour halo S-224 lies under the short line, not under the dots)', () => {
    const scene = predecessorOnly()
    const line = lineOf(scene, 1, 2)
    const svg = svgOf(scene)
    const halos = polylinesOf(svg).filter((one) => attrOf(one.attrs, 'stroke') === ground)
    expect(halos.length, 'premise: the short line has its halo').toBe(1)
    expect(samePathEitherWay(pointsAttr(halos[0]!.attrs), line.drawnPoints ?? [], SVG_EPS)).toBe(true)
    for (const dot of circlesAt(svg, line.continuation?.dots ?? [])) {
      expect(attrOf(dot.attrs, 'fill')).not.toBe(ground)
      expect(attrOf(dot.attrs, 'stroke')).not.toBe(ground)
    }
  })

  it('EL-5: the short line into the entry carries the arrow head', () => {
    const scene = successorOnly()
    const line = lineOf(scene, 1, 2)
    const inked = polylinesOf(svgOf(scene)).filter((one) => attrOf(one.attrs, 'stroke') === dependencyInk)
    expect(inked.length).toBe(1)
    expect(samePath(pointsAttr(inked[0]!.attrs), line.drawnPoints ?? [], SVG_EPS)).toBe(true)
    expect(attrOf(inked[0]!.attrs, 'marker-end')).not.toBeNull()
  })

  it('EL-6: nothing of the line is drawn -- no line in its colour, no dot', () => {
    const scene = neitherEnd()
    const svg = svgOf(scene)
    expect(polylinesOf(svg).filter((one) => attrOf(one.attrs, 'stroke') === dependencyInk)).toEqual([])
    expect(elementsOf(svg).filter((one) => one.tag === 'circle' && attrOf(one.attrs, 'fill') === dependencyInk)).toEqual([])
  })

  it('EL-15: the exported picture elides the same way and draws the mark too', () => {
    const scene = predecessorOnly()
    const line = lineOf(scene, 1, 2)
    const svg = svgOf(scene, 'export')
    expect(polylinesOf(svg).some((one) => samePath(pointsAttr(one.attrs), line.points, SVG_EPS))).toBe(false)
    expect(circlesAt(svg, line.continuation?.dots ?? []).length).toBe(3)
  })

  const pinnedScene = (pinned: boolean): Scene =>
    sceneOf({
      groups: [['P', null], ['a', null]],
      tasks: [
        [taskOf(1, 0, 5), 'P'],
        [taskOf(2, FAR, 5, [1]), 'a'],
      ],
      settings: pinned ? { pinnedGroupIds: ['P'] } : { pinnedGroupIds: ['a'] },
    })

  it('FR-098 / EL-4: the visible end is pinned, so the short line and mark are drawn in the band, not cut at the area below', () => {
    const scene = pinnedScene(true)
    const line = lineOf(scene, 1, 2)
    expect(line.elision, 'premise').toBe('EL-4')
    const svg = svgOf(scene)
    const drawn = [
      ...polylinesOf(svg).filter((one) => attrOf(one.attrs, 'stroke') === dependencyInk),
      ...circlesAt(svg, line.continuation?.dots ?? []),
    ]
    expect(drawn.length, 'premise: line and three dots drawn').toBe(4)
    for (const one of drawn) expect(cutAtScrollArea(svg, one, scene.layout.scrollAreaY!), one.tag).toBe(false)
  })

  it('FR-098 control: the visible end scrolls (the far end is pinned), so the same parts are cut at the area below the band', () => {
    const scene = sceneOf({
      groups: [['P', null], ['a', null]],
      tasks: [
        [taskOf(1, 0, 5), 'a'],
        [taskOf(2, FAR, 5, [1]), 'P'],
      ],
      settings: { pinnedGroupIds: ['P'] },
    })
    const line = lineOf(scene, 1, 2)
    expect(line.elision, 'premise').toBe('EL-4')
    const svg = svgOf(scene)
    const drawn = [
      ...polylinesOf(svg).filter((one) => attrOf(one.attrs, 'stroke') === dependencyInk),
      ...circlesAt(svg, line.continuation?.dots ?? []),
    ]
    expect(drawn.length, 'premise: line and three dots drawn').toBe(4)
    for (const one of drawn) expect(cutAtScrollArea(svg, one, scene.layout.scrollAreaY!), one.tag).toBe(true)
  })
})

describe('GA-24 / T-268 -- the mark is grabbed as part of its line', () => {
  it('GA-24 / PE-12: a press on a dot answers the dependency line with GA-24', () => {
    const scene = predecessorOnly()
    const dot = lineOf(scene, 1, 2).continuation!.dots[0]!
    const answer = answerAt(scene, dot)
    expect(answer.grab).toBe('GA-24')
    expect(isLine(answer, 1, 2), JSON.stringify(answer.item)).toBe(true)
  })

  it('GA-24: the grab reaches S-363 outside the dots box, unscaled (DS-7), and no further', () => {
    const scene = predecessorOnly()
    const mark = lineOf(scene, 1, 2).continuation!
    const box = boxOf(mark.dots)
    const right = box.x + box.width + mark.radius
    const bottom = box.y + box.height + mark.radius
    const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    expect(answerAt(scene, { x: right + DOT_MARGIN - 0.25, y: middle.y }).grab).toBe('GA-24')
    expect(answerAt(scene, { x: right + DOT_MARGIN + 0.25, y: middle.y }).grab).not.toBe('GA-24')
    expect(answerAt(scene, { x: middle.x, y: bottom + DOT_MARGIN - 0.25 }).grab).toBe('GA-24')
    expect(answerAt(scene, { x: middle.x, y: bottom + DOT_MARGIN + 0.25 }).grab).not.toBe('GA-24')
  })

  it('T-268 TY-2 (off a shape the mark answers before the line): on the short line within S-363 of the dots', () => {
    const scene = predecessorOnly()
    const line = lineOf(scene, 1, 2)
    const tip = bentLine(line, 'predecessor').outward[2]!
    const onLine = { x: tip.x, y: tip.y - 1 }
    const answer = answerAt(scene, onLine)
    expect(answer.grab).toBe('GA-24')
    expect(isLine(answer, 1, 2)).toBe(true)
  })

  // WHY: Task 4 runs under the dots, so part of the mark sits on a drawn plan body.
  const overBody = (): Scene =>
    sceneOf({
      groups: [['a', null], ['b', null]],
      tasks: [
        [taskOf(1, 0, 5), 'a'],
        [taskOf(2, FAR, 5, [1]), 'b'],
        [taskOf(4, -5, 25), 'b'],
      ],
    })

  const onBody = (scene: Scene, at: Pt): boolean => {
    const body = placementOf(scene, 4)
    return at.x > body.x && at.x < body.x + body.width && at.y > body.y && at.y < body.y + body.planHeight
  }

  it('HT-1 / T-268 TY-5: on a plan body, a dot itself answers GA-24 before the body', () => {
    const scene = overBody()
    const dots = lineOf(scene, 1, 2).continuation?.dots ?? []
    const covered = dots.filter((one) => onBody(scene, one))
    expect(covered.length, 'premise: at least one dot stands on the body of Task 4').toBeGreaterThan(0)
    const answer = answerAt(scene, covered.at(-1)!)
    expect(answer.grab).toBe('GA-24')
    expect(isLine(answer, 1, 2)).toBe(true)
  })

  it('HT-1: on a plan body, the S-363 margin does not reach -- between two dots the body answers', () => {
    const scene = overBody()
    const mark = lineOf(scene, 1, 2).continuation!
    const covered = mark.dots.filter((one) => onBody(scene, one))
    expect(covered.length, 'premise: a dot on the body').toBeGreaterThan(0)
    const dot = covered.at(-1)!
    const aside = { x: dot.x + mark.radius + DOT_MARGIN / 2, y: dot.y }
    expect(onBody(scene, aside), 'premise: the probe is on the body').toBe(true)
    const answer = answerAt(scene, aside)
    expect(answer.grab).not.toBe('GA-24')
    expect(answer.item?.['taskUid']).toBe(4)
  })

  it('EL-6 / FR-108: a line with nothing drawn cannot be grabbed where its route crosses the Task Group Area', () => {
    const scene = neitherEnd()
    const line = lineOf(scene, 1, 2)
    const taskGroupArea = scene.regions.taskGroupArea
    const across = { x: taskGroupArea.x + taskGroupArea.width / 2, y: line.points[0]!.y }
    expect(isLine(answerAt(scene, across), 1, 2)).toBe(false)
  })
})

describe('EL-13 -- marks piled on one place answer for the line whose far end is nearer', () => {
  // WHY: both successors lie down and right, so both lines leave the same way.
  const fan = (nearerFirst: boolean): Scene => {
    const nearer = [taskOf(2, FAR, 5, [1]), 'b'] as const
    const farther = [taskOf(3, FAR + 200, 5, [1]), 'c'] as const
    return sceneOf({
      groups: [['a', null], ['b', null], ['c', null]],
      tasks: [[taskOf(1, 0, 5), 'a'], ...(nearerFirst ? [nearer, farther] : [farther, nearer])],
    })
  }

  for (const nearerFirst of [true, false]) {
    it(`EL-13: the nearer far end answers (${nearerFirst ? 'made first' : 'made last'})`, () => {
      const scene = fan(nearerFirst)
      const toNear = lineOf(scene, 1, 2)
      const toFar = lineOf(scene, 1, 3)
      expect(toNear.continuation, 'premise: a mark').toBeTruthy()
      expect(sameDots(toFar.continuation?.dots ?? [], toNear.continuation!.dots), 'premise: the two marks coincide').toBe(true)
      const answer = answerAt(scene, toNear.continuation!.dots[1]!)
      expect(answer.grab).toBe('GA-24')
      expect(isLine(answer, 1, 2), JSON.stringify(answer.item)).toBe(true)
    })
  }
})

describe('EL-14 -- elided lines are still drawn objects for selection', () => {
  const taken = (items: readonly unknown[], predecessorUid: number, successorUid: number): boolean =>
    items.some((one) => {
      const item = one as Loose
      return item['kind'] === 'dependency' && item['predecessorUid'] === predecessorUid && item['successorUid'] === successorUid
    })

  it('EL-14 / SL-3: a marquee round the short line and its mark takes an EL-4 line', () => {
    const scene = predecessorOnly()
    const line = lineOf(scene, 1, 2)
    const drawn = [...(line.drawnPoints ?? []), ...(line.continuation?.dots ?? [])]
    expect(drawn.length, 'premise: something drawn').toBeGreaterThan(0)
    const box = boxOf(drawn)
    const pad = 3
    const marquee = { x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad }
    expect(taken(itemsInMarquee(scene.geometry, marquee), 1, 2)).toBe(true)
  })

  // WHY: a margin narrower than the gap before the first dot (S-362), so the rectangle holds the whole
  // WHY: stroke of the short line and its head but stops short of the mark.
  const SHORT_OF_THE_MARK = DOT * 0.6

  const marqueeRound = (points: readonly Pt[], pad: number): Rect => {
    const box = boxOf(points)
    return { x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad }
  }

  it.each([
    ['EL-4', predecessorOnly],
    ['EL-5', successorOnly],
  ] as const)(
    `SL-3 / T-303 (%s): a marquee round the short line but not the mark does not take the line -- ${T_303_MARK_IS_PART_OF_THE_LINE}`,
    (elision, make) => {
      const scene = make()
      const line = lineOf(scene, 1, 2)
      expect(line.elision, 'premise').toBe(elision)
      const stroke = [...(line.drawnPoints ?? []), ...(line.head ?? [])]
      const dots = line.continuation?.dots ?? []
      expect(stroke.length > 0 && dots.length === 3, 'premise: a short line and a mark are drawn').toBe(true)
      const lineOnly = marqueeRound(stroke, SHORT_OF_THE_MARK)
      const inside = (at: Pt): boolean =>
        at.x >= lineOnly.x && at.x <= lineOnly.x + lineOnly.width && at.y >= lineOnly.y && at.y <= lineOnly.y + lineOnly.height
      expect(dots.some(inside), 'premise: the rectangle leaves every dot centre out').toBe(false)
      expect(taken(itemsInMarquee(scene.geometry, lineOnly), 1, 2), `${SL_3_WHOLLY} ${T_303_MARK_IS_PART_OF_THE_LINE}`).toBe(
        false,
      )
      const both = marqueeRound([...stroke, ...dots], SHORT_OF_THE_MARK + DOT)
      expect(taken(itemsInMarquee(scene.geometry, both), 1, 2), `control: ${SL_3_WHOLLY}`).toBe(true)
    },
  )

  it('EL-14 / SL-3: an EL-6 line is never taken by a marquee, even one round its whole route', () => {
    const scene = neitherEnd()
    const route = boxOf(lineOf(scene, 1, 2).points)
    const marquee = { x: route.x - 100, y: route.y - 100, width: route.width + 200, height: route.height + 200 }
    expect(taken(itemsInMarquee(scene.geometry, marquee), 1, 2)).toBe(false)
  })

  it('EL-14: a selected EL-6 line stays selected -- panning does not change the selection', () => {
    const scene = neitherEnd()
    const chosen = { items: [{ kind: 'dependency', successorUid: 2, ordinal: 0 }], ordered: true }
    const kept = selectionWithinDrawn(chosen as never, scene.geometry) as unknown as { readonly items: readonly Loose[] }
    expect(kept.items.some((one) => one['kind'] === 'dependency' && one['successorUid'] === 2)).toBe(true)
  })
})

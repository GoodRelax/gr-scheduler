// Shared fixtures for the cr-430 tests: scenes, manuscript readers and the probe sweep.

import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import { emptySelection, selectionWith } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { specTable, type SpecRow } from '../contract/spec-table'

export const rowsOf = (table: string): readonly SpecRow[] => specTable(table).rows

export const rowOf = (table: string, id: string): SpecRow => {
  const row = rowsOf(table).find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row
}

export const cellOf = (table: string, id: string, column: string): string => {
  const cell = rowOf(table, id).by[column]
  if (cell === undefined) throw new Error(`table ${table} row ${id} has no column ${JSON.stringify(column)}`)
  return cell
}

export const settingIdsIn = (cell: string): readonly string[] => [...new Set(cell.match(/S-\d+/g) ?? [])]

export const pointerIdsIn = (cell: string): readonly string[] => [...new Set(cell.match(/PK-\d+/g) ?? [])]

export const numbersIn = (cell: string): readonly number[] =>
  (cell.replace(/`/g, '').match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)

// see T-206
export const defaultOf = (settingId: string): number => {
  const found = numbersIn(cellOf('T-206', settingId, '既定'))
  if (found.length === 0) throw new Error(`table T-206 row ${settingId} prints no number in the default column`)
  return found[0]!
}

export interface GrabRow {
  readonly id: string
  readonly shape: string
  readonly target: string
  readonly anchor: string
  readonly across: string
  readonly down: string
  readonly pointer: string
  readonly settingIds: readonly string[]
}

export const COLUMN_SHAPE = '形'
export const COLUMN_TARGET = '掴む所'
export const COLUMN_ANCHOR = '基準点'
export const COLUMN_ACROSS = '横'
export const COLUMN_DOWN = '縦（帯 ＋ 上下）'
export const COLUMN_POINTER = 'ポインタ（表 T-269）'

// see T-266
export const grabRows = (): readonly GrabRow[] =>
  rowsOf('T-266').map((row) => {
    const across = row.by[COLUMN_ACROSS] ?? ''
    const down = row.by[COLUMN_DOWN] ?? ''
    return {
      id: row.id,
      shape: row.by[COLUMN_SHAPE] ?? '',
      target: row.by[COLUMN_TARGET] ?? '',
      anchor: row.by[COLUMN_ANCHOR] ?? '',
      across,
      down,
      pointer: row.by[COLUMN_POINTER] ?? '',
      settingIds: settingIdsIn(`${across} ${down}`),
    }
  })

export const grabRow = (id: string): GrabRow => {
  const found = grabRows().find((one) => one.id === id)
  if (found === undefined) throw new Error(`table T-266 has no row ${id}`)
  return found
}

export const ownerOf = (settingId: string): GrabRow => {
  const owners = grabRows().filter((row) => row.settingIds.includes(settingId))
  if (owners.length !== 1) throw new Error(`table T-266 gives ${settingId} ${owners.length} owning rows, not one`)
  return owners[0]!
}

export const grabSettingIds = (): readonly string[] => grabRows().flatMap((row) => row.settingIds)

type Loose = Record<string, unknown>

const nestedDefaults = (): Loose => {
  const out: Loose = {}
  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const path = key.split('.')
    let into = out
    for (const step of path.slice(0, -1)) {
      into[step] = { ...((into[step] as Loose | undefined) ?? {}) }
      into = into[step] as Loose
    }
    into[path[path.length - 1]!] = value
  }
  return out
}

type Settings = Parameters<typeof layoutFromSchedule>[1]
type Schedule = Parameters<typeof layoutFromSchedule>[0]
type Environment = Parameters<typeof regionsFromScreen>[0]

export const ENVIRONMENT = { width: 2400, height: 900, appHeaderHeight: 56, scrollbarThickness: 8 } as Environment

export const settingsOf = (part: Loose = {}): Settings =>
  ({
    ...nestedDefaults(),
    scrollDate: '2026-01-26',
    stackDirection: 'down',
    assigneeVisible: true,
    percentCompleteVisible: true,
    zoomX: 8,
    ...part,
  }) as unknown as Settings

export const PLAN_START = '2026-02-02'

export const isoPlus = (from: string, days: number): string =>
  new Date(new Date(`${from}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10)

const taskOf = (part: Loose): Loose => ({
  uid: 0,
  wbsParentUid: null,
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
  ...part,
})

export const STARTED_UID = 1
export const UNSTARTED_UID = 2
export const DOWNSTREAM_UID = 3

const startedTask = (milestone: boolean, part: Loose = {}): Loose =>
  taskOf({
    uid: STARTED_UID,
    name: 'alpha',
    start: PLAN_START,
    finish: milestone ? PLAN_START : isoPlus(PLAN_START, 24),
    milestone: milestone ? true : null,
    percentComplete: 40,
    actualStart: PLAN_START,
    stop: isoPlus(PLAN_START, 8),
    resume: isoPlus(PLAN_START, 12),
    resumeValid: true,
    ...part,
  })

const unstartedTask = (milestone: boolean): Loose =>
  taskOf({
    uid: UNSTARTED_UID,
    name: 'beta',
    start: isoPlus(PLAN_START, 2),
    finish: milestone ? isoPlus(PLAN_START, 2) : isoPlus(PLAN_START, 26),
    milestone: milestone ? true : null,
  })

const downstreamTask = (milestone: boolean): Loose =>
  taskOf({
    uid: DOWNSTREAM_UID,
    name: 'gamma',
    start: isoPlus(PLAN_START, 30),
    finish: milestone ? isoPlus(PLAN_START, 30) : isoPlus(PLAN_START, 40),
    milestone: milestone ? true : null,
    dependencies: [
      { predecessorUid: STARTED_UID, linkType: 1, lag: null, lagFormat: null, carry: {}, carryElements: [] },
    ],
  })

export type ShapeKind = 'rectangle' | 'chevron' | 'arrow' | 'endpointSpan' | 'milestone'

const scheduleOf = (tasks: readonly Loose[], shapeKind: ShapeKind, groups: readonly string[]): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null, title: null, themeHue: 214 },
    calendars: [],
    resources: [],
    assignments: [],
    highlightBoxes: [],
    commentBoxes: [],
    tasks,
    taskGroups: [...new Set(groups)].map((id, order) => ({ id, parentId: null, order, height: null })),
    taskGroupMembers: tasks.map((task, at) => ({ groupId: groups[at], taskUid: task['uid'] })),
    taskVisuals: tasks.map((task) => ({ taskUid: task['uid'], shapeKind })),
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

export type Geometry = ReturnType<typeof geometryFromLayout>
export type TaskGeometry = Geometry['tasks'][number]
export type GrabSizes = ReturnType<typeof grabSizesOf>

export interface Scene {
  readonly shapeKind: ShapeKind
  readonly geometry: Geometry
  readonly sizes: GrabSizes
  readonly started: TaskGeometry
  readonly unstarted: TaskGeometry
  readonly downstream: TaskGeometry
}

const taskIn = (geometry: Geometry, uid: number): TaskGeometry => {
  const found = geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`the fixture did not draw Task ${uid}`)
  return found
}

export type GrabSizesOrFault = GrabSizes

const sizesNow = (): GrabSizesOrFault => {
  try {
    return grabSizesOf()
  } catch (cause) {
    return { grabSizesOfThrew: String(cause) } as unknown as GrabSizes
  }
}

export const sizesReady = (sizes: GrabSizes): boolean =>
  (sizes as unknown as Record<string, unknown>)['S-250'] !== undefined

const demandSizes = (sizes: GrabSizes): GrabSizes => {
  if (sizesReady(sizes)) return sizes
  const threw = (sizes as unknown as Record<string, unknown>)['grabSizesOfThrew']
  throw new Error(
    `grabSizesOf() does not carry the table T-266 values yet (S-250 is missing)${threw === undefined ? '' : `; it threw ${String(threw)}`}`,
  )
}

const built = (shapeKind: ShapeKind, groups: readonly string[], part: Loose, startedPart: Loose): Scene => {
  const milestone = shapeKind === 'milestone'
  const settings = settingsOf(part)
  const regions = regionsFromScreen(ENVIRONMENT, settings)
  const schedule = scheduleOf(
    [startedTask(milestone, startedPart), unstartedTask(milestone), downstreamTask(milestone)],
    shapeKind,
    groups,
  )
  const layout = layoutFromSchedule(schedule, settings, regions)
  const selection = selectionWith(emptySelection(), { kind: 'task', uid: STARTED_UID } as never)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, selection)
  return {
    shapeKind,
    geometry,
    sizes: sizesNow(),
    started: taskIn(geometry, STARTED_UID),
    unstarted: taskIn(geometry, UNSTARTED_UID),
    downstream: taskIn(geometry, DOWNSTREAM_UID),
  }
}

export const sceneOf = (shapeKind: ShapeKind, part: Loose = {}, startedPart: Loose = {}): Scene =>
  built(shapeKind, ['g0', 'g1', 'g2'], part, startedPart)

export const stackedScene = (shapeKind: ShapeKind, part: Loose = {}, startedPart: Loose = {}): Scene =>
  built(shapeKind, ['g0', 'g0', 'g0'], part, startedPart)

export const PLAN_DAYS = 24

export interface Box {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
  readonly middleX: number
  readonly middleY: number
  readonly width: number
  readonly height: number
}

const boxOfPoints = (given: readonly { readonly x: number; readonly y: number }[]): Box => {
  const points = given.filter((one) => Number.isFinite(one?.x) && Number.isFinite(one?.y))
  if (points.length === 0) throw new Error(`no finite point among ${JSON.stringify(given)}`)
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  return {
    left,
    right,
    top,
    bottom,
    middleX: (left + right) / 2,
    middleY: (top + bottom) / 2,
    width: right - left,
    height: bottom - top,
  }
}

interface LooseBar {
  readonly form?: string
  readonly points?: readonly { x: number; y: number }[]
  readonly from?: { x: number; y: number }
  readonly to?: { x: number; y: number }
  readonly head?: readonly { x: number; y: number }[]
  readonly dots?: readonly { x: number; y: number }[]
}

export const boxOf = (bar: unknown): Box => {
  if (bar === null || bar === undefined) throw new Error('the fixture drew no shape there')
  const one = bar as LooseBar
  if (Array.isArray(one.points) && one.points.length > 0) return boxOfPoints(one.points)
  const ends = [one.from, one.to, ...(one.head ?? []), ...(one.dots ?? [])].filter(
    (point): point is { x: number; y: number } => point !== undefined && point !== null,
  )
  if (ends.length > 0) return boxOfPoints(ends)
  throw new Error(`a drawn shape with neither points nor ends: ${JSON.stringify(bar)}`)
}

export const boxOfRect = (rect: unknown): Box => {
  const one = rect as { x: number; y: number; width: number; height: number }
  return boxOfPoints([
    { x: one.x, y: one.y },
    { x: one.x + one.width, y: one.y + one.height },
  ])
}

export const planOf = (task: TaskGeometry): unknown => (task as unknown as { readonly plan: unknown }).plan

export const actualOf = (task: TaskGeometry): unknown => (task as unknown as { readonly actual: unknown }).actual

export const dummiesOf = (task: TaskGeometry): readonly { readonly grab: string; readonly ink: unknown }[] =>
  (task as unknown as { readonly dummies?: readonly { grab: string; ink: unknown }[] }).dummies ?? []

export const fadeHandlesOf = (task: TaskGeometry): readonly { readonly x: number; readonly y: number }[] =>
  (task as unknown as { readonly fadeHandles?: readonly { x: number; y: number }[] }).fadeHandles ?? []

export const markerOf = (
  task: TaskGeometry,
): { readonly centre: { x: number; y: number }; readonly radius: number } | null =>
  (task as unknown as { readonly marker: { centre: { x: number; y: number }; radius: number } | null }).marker ?? null

export const resumeOf = (task: TaskGeometry): { readonly box?: unknown; readonly undecided?: boolean } | null =>
  (task as unknown as { readonly resume: { box?: unknown; undecided?: boolean } | null }).resume ?? null

export interface Answer {
  readonly grab: string | null
  readonly taskUid: number | null
}

export const answerAt = (
  scene: Scene,
  x: number,
  y: number,
  sizes: GrabSizes = scene.sizes,
  resolving?: string,
): Answer => {
  const hit = itemAtPointer(scene.geometry, x, y, demandSizes(sizes), resolving as never) as
    | { readonly grab?: string; readonly item?: { readonly taskUid?: number } }
    | null
  if (hit === null || hit === undefined) return { grab: null, taskUid: null }
  return { grab: hit.grab ?? null, taskUid: hit.item?.taskUid ?? null }
}

export const grabAt = (scene: Scene, x: number, y: number, sizes: GrabSizes = scene.sizes): string | null =>
  answerAt(scene, x, y, sizes).grab

export const sizesWith = (sizes: GrabSizes, settingId: string, value: number): GrabSizes =>
  ({ ...(sizes as unknown as Loose), [settingId]: value }) as unknown as GrabSizes

export const sizeIn = (sizes: GrabSizes, settingId: string): number | undefined =>
  (sizes as unknown as Record<string, number | undefined>)[settingId]

const PROBE_STEP = 4
const PROBE_MARGIN = 24

export interface Probe {
  readonly x: number
  readonly y: number
}

export const probesOf = (scene: Scene): readonly Probe[] => {
  const boxes: Box[] = []
  for (const task of [scene.started, scene.unstarted, scene.downstream]) {
    for (const bar of [planOf(task), actualOf(task)]) {
      if (bar !== null && bar !== undefined) boxes.push(boxOf(bar))
    }
  }
  if (boxes.length === 0) throw new Error('the fixture drew no shape at all')
  const left = Math.min(...boxes.map((one) => one.left)) - PROBE_MARGIN
  const right = Math.max(...boxes.map((one) => one.right)) + PROBE_MARGIN
  const top = Math.min(...boxes.map((one) => one.top)) - PROBE_MARGIN
  const bottom = Math.max(...boxes.map((one) => one.bottom)) + PROBE_MARGIN
  const out: Probe[] = []
  for (let y = top; y <= bottom; y += PROBE_STEP) {
    for (let x = left; x <= right; x += PROBE_STEP) out.push({ x, y })
  }
  return out
}

export interface Change {
  readonly at: Probe
  readonly before: string | null
  readonly after: string | null
}

export const changesUnder = (scene: Scene, probes: readonly Probe[], sizes: GrabSizes): readonly Change[] => {
  const out: Change[] = []
  for (const at of probes) {
    const before = grabAt(scene, at.x, at.y)
    const after = grabAt(scene, at.x, at.y, sizes)
    if (before !== after) out.push({ at, before, after })
  }
  return out
}

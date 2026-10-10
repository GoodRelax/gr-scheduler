// The scene the CR-631 cases share: a three-deep WBS on nested task groups, with stated, derived, undecided and root parents.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { InputContext, PointerInput, PointerPress } from '../../src/adapter/input-command-translator/input-command-translator'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import { parentTaskResolutionsOf } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection, type Selection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import {
  geometryFromLayout,
  type ParentTaskFamilies,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { specTable } from '../contract/spec-table'

export type Loose = Record<string, unknown>
type Settings = Parameters<typeof layoutFromSchedule>[1]
export type Schedule = Parameters<typeof layoutFromSchedule>[0]
type Environment = Parameters<typeof regionsFromScreen>[0]
export type Geometry = ReturnType<typeof geometryFromLayout>

export interface Pt {
  readonly x: number
  readonly y: number
}

export const cellOf = (table: string, id: string, column: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  const cell = row.by[column]
  if (cell === undefined) throw new Error(`table ${table} row ${id} has no column ${column}`)
  return cell
}

export const rowText = (table: string, id: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row.cells.join(' | ')
}

export const numbersIn = (cell: string): number[] =>
  [...cell.replace(/`/g, '').matchAll(/-?\d+(?:\.\d+)?/g)].map((found) => Number(found[0]))

export const numberIn = (cell: string): number => {
  const found = numbersIn(cell)[0]
  if (found === undefined) throw new Error(`no number in ${cell}`)
  return found
}

export const G = 1
export const P = 2
export const Q = 3
export const C = 4
export const D = 5
export const E = 6
export const R = 7
export const F = 8
export const M = 9

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

export const iso = (day: number): string => new Date(Date.UTC(2026, 1, 2) + day * 86400000).toISOString().slice(0, 10)

export const taskOf = (uid: number, from: number, to: number, parentTaskUid: number | null, milestone = false): Loose => ({
  uid,
  parentTaskUid,
  wbsOrder: null,
  name: `t${uid}`,
  start: iso(from),
  finish: iso(to),
  milestone: milestone ? true : null,
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
})

type GroupSpec = readonly [string, string | null]

export interface SceneSpec {
  readonly groups: readonly GroupSpec[]
  readonly tasks: readonly (readonly [Loose, string])[]
}

// WHY: G and R are IP-5 roots, P and F stated, Q, C and D derived (IP-2), E undecided (IP-3), M a milestone.
export const FAMILY: SceneSpec = {
  groups: [
    ['top', null],
    ['mid', 'top'],
    ['low', 'mid'],
  ],
  tasks: [
    [taskOf(G, 0, 40, null), 'top'],
    [taskOf(R, 60, 70, null), 'top'],
    [taskOf(P, 2, 20, G), 'mid'],
    [taskOf(M, 22, 22, null, true), 'mid'],
    [taskOf(Q, 24, 36, null), 'mid'],
    [taskOf(C, 4, 10, null), 'low'],
    [taskOf(D, 26, 30, null), 'low'],
    [taskOf(E, 19, 23, null), 'low'],
    [taskOf(F, 12, 16, P), 'low'],
  ],
}

export const scheduleOf = (spec: SceneSpec, statusDate: string | null = null): Schedule =>
  ({
    project: { ...structuredClone(TEMPLATE.schedule.project), calendarUid: null, statusDate, title: null, themeHue: 214 },
    calendars: [],
    resources: [],
    assignments: [],
    highlightBoxes: [],
    commentBoxes: [],
    tasks: spec.tasks.map(([task]) => task),
    taskGroups: spec.groups.map(([id, parentId], order) => ({
      id,
      parentId,
      order,
      minHeight: null,
      label: id,
      derivedFromTaskUid: null,
      treeState: 'expanded',
      editGroup: null,
      color: null,
    })),
    taskGroupMembers: spec.tasks.map(([task, groupId]) => ({ groupId, taskUid: task['uid'] })),
    taskVisuals: spec.tasks.map(([task]) =>
      task['milestone'] === true
        ? { taskUid: task['uid'], shapeKind: 'milestone', milestoneGlyph: 'diamond' }
        : { taskUid: task['uid'], shapeKind: 'rectangle' },
    ),
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const ENVIRONMENT = { width: 1600, height: 700, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }

export interface Scene {
  readonly schedule: Schedule
  readonly settings: Loose
  readonly geometry: Geometry
  readonly context: InputContext
  readonly families: ParentTaskFamilies | null
}

export interface FamiliesSpec {
  readonly ownerUids: readonly number[]
  readonly pointedUid?: number | null
  readonly selectedLinkChildUids?: readonly number[]
}

export const familiesOf = (schedule: Schedule, spec: FamiliesSpec): ParentTaskFamilies => ({
  resolutions: parentTaskResolutionsOf({ schedule } as unknown as Parameters<typeof parentTaskResolutionsOf>[0]),
  ownerUids: [...spec.ownerUids],
  pointedUid: spec.pointedUid ?? null,
  selectedLinkChildUids: new Set(spec.selectedLinkChildUids ?? []),
})

export const sceneOf = (
  families: FamiliesSpec | null,
  selection: Selection = emptySelection(),
  armed = false,
  spec: SceneSpec = FAMILY,
): Scene => {
  const settings = { ...SETTINGS_DEFAULTS, scrollDate: iso(-3), zoomX: 4 }
  const regions = regionsFromScreen(ENVIRONMENT as unknown as Environment, settings as unknown as Settings)
  const schedule = scheduleOf(spec)
  const layout = layoutFromSchedule(schedule, settings as unknown as Settings, regions)
  const drawn = families === null ? null : familiesOf(schedule, families)
  const geometry = geometryFromLayout(schedule, settings as unknown as Settings, layout, regions, selection, null, undefined, drawn)
  const document = {
    '$schema': TEMPLATE['$schema'],
    schemaVersion: TEMPLATE.schemaVersion,
    schedule,
    documentSettings: settings,
    documentStamp: structuredClone(TEMPLATE.documentStamp),
    changeLog: [],
  } as unknown as Document
  const context = {
    document,
    layout,
    geometry,
    regions,
    screen: { ...emptyScreenSession.screen, armModeState: armed ? { kind: 'parentTaskArmed' } : { kind: 'notArmed' } },
    selection,
    zoomStep: 1.1,
    zoomMin: 0.01,
    zoomMax: 100,
    isPictureAtStoredZoom: true,
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: '2026-03-01T00:00:00',
    newGroupId: 'task-group-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
  } as unknown as InputContext
  return { schedule, settings, geometry, context, families: drawn }
}

export interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

// WHY: the placement the layout gives the plan bar, the same box the hit test grows its grab from.
export const barOf = (scene: Scene, uid: number): Box => {
  const placements = (scene.context.layout as unknown as { readonly placements: readonly Loose[] }).placements
  const found = placements.find((one) => one['taskUid'] === uid)
  if (found === undefined) throw new Error(`the layout places no task ${uid}`)
  return { x: found['x'] as number, y: found['y'] as number, width: found['width'] as number, height: found['planHeight'] as number }
}

export const centerOf = (box: Box): Pt => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 })

export const MODS = { ctrl: false, shift: false, alt: false, meta: false }

export const pointerAt = (
  phase: PointerInput['phase'],
  at: Pt,
  modifiers: Partial<typeof MODS> = {},
): PointerInput => ({ kind: 'pointer', phase, button: 'left', x: at.x, y: at.y, modifiers: { ...MODS, ...modifiers }, clickCount: 1 })

export const pressOf = (scene: Scene, at: Pt, modifiers: Partial<typeof MODS> = {}, pressRow = 'PTD-3'): PointerPress =>
  ({
    at: pointerAt('down', at, modifiers),
    hit: itemAtPointer(scene.geometry, at.x, at.y, grabSizesOf()),
    on: null,
    pressRow,
  }) as unknown as PointerPress

export const parentTasksOf = (scene: Scene) => {
  const drawing = (scene.geometry as unknown as { readonly parentTasks?: Geometry['parentTasks'] }).parentTasks
  if (drawing === undefined) throw new Error('geometry carries no parentTasks')
  return drawing
}

export const arrowOf = (scene: Scene, childUid: number) => {
  const found = parentTasksOf(scene).arrows.find((one) => one.childUid === childUid)
  if (found === undefined) throw new Error(`no arrow from child ${childUid}`)
  return found
}

// WHY: the middle of the arrow's longest run, which sits between the two bars and on no T-023d grab.
export const midOfArrow = (scene: Scene, childUid: number): Pt => {
  const points = arrowOf(scene, childUid).points as readonly Pt[]
  let best: [Pt, Pt] = [points[0]!, points[1]!]
  for (let at = 1; at < points.length; at += 1) {
    const a = points[at - 1]!
    const b = points[at]!
    if (Math.hypot(b.x - a.x, b.y - a.y) > Math.hypot(best[1].x - best[0].x, best[1].y - best[0].y)) best = [a, b]
  }
  return { x: (best[0].x + best[1].x) / 2, y: (best[0].y + best[1].y) / 2 }
}

export const emptyPoint = (scene: Scene): Pt => {
  const g = barOf(scene, G)
  const r = barOf(scene, R)
  // WHY: on the top task group, between G's finish and R's start -- a point nothing of T-023d answers.
  return { x: (g.x + g.width + r.x) / 2, y: g.y + g.height / 2 }
}

// CR-772 spec-only stage: one task group tree, the rows drawn for it, and the drag the translator reads (HF-15, UF-97).

import { displayRatioOf } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type {
  InputContext,
  PointerPress,
  TaskGroupGrabLanding,
  TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import {
  commandFromRowGrab,
  taskGroupGrabLandingAt,
} from '../../src/adapter/input-command-translator/task-group-grab'
import type { Document } from '../../src/entity/document-model/document/document'
import { editDocument } from '../../src/use-case/edit-document/edit-document'
import type { SettingsLimits } from '../../src/use-case/edit-document/edit-document-settings'
import { numberIn, rowOf, taskGroupDocument, type TaskGroupSeed } from '../unit/cr-541-stage'
import { REQUIREMENTS, DESIGN } from './cr-731-stage'

export { REQUIREMENTS, DESIGN }

// see T-206, T-201, T-211
export const S_208 = numberIn(rowOf('T-206', 'S-208').by['既定'] ?? '')
export const S_597 = numberIn(rowOf('T-206', 'S-597').by['既定'] ?? '')
export const S_598 = numberIn(rowOf('T-206', 'S-598').by['既定'] ?? '')
export const S_599 = numberIn(rowOf('T-206', 'S-599').by['既定'] ?? '')
export const S_213 = numberIn(rowOf('T-206', 'S-213').by['既定'] ?? '')
export const S_37 = numberIn(rowOf('T-201', 'S-37').by['既定値'] ?? '')
export const S_125 = numberIn(rowOf('T-211', 'S-125').by['値'] ?? '')

// WHY: drawing order is A, A1, A1x, A2, A2a, B, B1, C (folded), D, E, E1, E2, E3; Ah is hidden and C1 sits in the folded C, so neither is drawn.
export const ROWS: readonly TaskGroupSeed[] = [
  { id: 'A', parentId: null },
  { id: 'A1', parentId: 'A' },
  { id: 'A1x', parentId: 'A1' },
  { id: 'Ah', parentId: 'A' },
  { id: 'A2', parentId: 'A' },
  { id: 'A2a', parentId: 'A2' },
  { id: 'B', parentId: null },
  { id: 'B1', parentId: 'B' },
  { id: 'C', parentId: null, treeState: 'collapsed' },
  { id: 'C1', parentId: 'C' },
  { id: 'D', parentId: null },
  { id: 'E', parentId: null },
  { id: 'E1', parentId: 'E' },
  { id: 'E2', parentId: 'E1' },
  { id: 'E3', parentId: 'E2' },
]

const NOT_DRAWN: ReadonlySet<string> = new Set(['Ah', 'C1'])
const PANEL_TOP = 100
const ROW_HEIGHT = 24
const PANEL_X = 20
const PANEL_WIDTH = 300
const PANEL_HEIGHT = 400
const PRESS_X = 200

export interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface Scene {
  // see FR-042
  readonly heights?: Readonly<Record<string, number>>
  // see FR-098
  readonly pinned?: readonly string[]
}

export const documentOf = (scene: Scene = {}): Document =>
  taskGroupDocument(ROWS, { pinnedTaskGroupIds: [...(scene.pinned ?? [])] }) as unknown as Document

export function boxesOf(scene: Scene = {}): readonly { readonly taskGroupId: string; readonly box: Box }[] {
  const heightOf = (id: string): number => scene.heights?.[id] ?? ROW_HEIGHT
  const pinned = scene.pinned ?? []
  const out: { taskGroupId: string; box: Box }[] = []
  let at = PANEL_TOP
  for (const id of pinned) {
    out.push({ taskGroupId: id, box: { x: PANEL_X, y: at, width: PANEL_WIDTH, height: heightOf(id) } })
    at += heightOf(id)
  }
  for (const seed of ROWS) {
    if (NOT_DRAWN.has(seed.id) || pinned.includes(seed.id)) continue
    out.push({ taskGroupId: seed.id, box: { x: PANEL_X, y: at, width: PANEL_WIDTH, height: heightOf(seed.id) } })
    at += heightOf(seed.id)
  }
  return out
}

export const boxOf = (id: string, scene: Scene = {}): Box => {
  const found = boxesOf(scene).find((one) => one.taskGroupId === id)
  if (found === undefined) throw new Error(`premise: ${id} is drawn`)
  return found.box
}

// WHY: the boundary under a drawn row is the gap between it and the next drawn row.
export const under = (id: string, scene: Scene = {}): number => boxOf(id, scene).y + boxOf(id, scene).height

export const indentPx = (document: Document = documentOf()): number => S_37 * displayRatioOf(document.documentSettings)

const NO_MODS = { ctrl: false, shift: false, alt: false, meta: false }

export function pressOn(heldId: string, isCarried: boolean, pressY = 150): PointerPress {
  return {
    at: { kind: 'pointer', phase: 'down', button: 'left', x: PRESS_X, y: pressY, modifiers: NO_MODS, clickCount: 1 },
    hit: null,
    on: {
      part: 'Task Group Panel',
      entry: null,
      format: null,
      taskGroupId: heldId,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
      isTaskGroupGrabStrip: true,
    },
    pressRow: 'PTD-3',
    isTaskGroupGrabCarried: isCarried,
  } as unknown as PointerPress
}

export function contextOf(scene: Scene = {}, press: PointerPress | null = null): InputContext {
  return {
    document: documentOf(scene),
    drawnTaskGroupBoxes: boxesOf(scene),
    regions: { taskGroupArea: { x: PANEL_X, y: PANEL_TOP, width: PANEL_WIDTH, height: PANEL_HEIGHT } },
    pressed: press,
  } as unknown as InputContext
}

export const pointerAt = (
  steps: number,
  y: number,
  phase: 'move' | 'up' = 'move',
): { kind: 'pointer'; phase: 'move' | 'up'; button: 'left'; x: number; y: number; modifiers: typeof NO_MODS; clickCount: number } => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: PRESS_X + steps * indentPx(),
  y,
  modifiers: NO_MODS,
  clickCount: 1,
})

// WHY: steps counts indents to the right of the press point, y is the pointer height.
export function landingAt(
  heldId: string,
  steps: number,
  y: number,
  scene: Scene = {},
): TaskGroupGrabLanding | null {
  const at = pointerAt(steps, y)
  return taskGroupGrabLandingAt(contextOf(scene, pressOn(heldId, true)), heldId, at, pressOn(heldId, true))
}

export function releaseAt(heldId: string, steps: number, y: number, scene: Scene = {}): TranslatedInput {
  const press = pressOn(heldId, true)
  return commandFromRowGrab(pointerAt(steps, y, 'up'), press, contextOf(scene, press), heldId)
}

export interface MoveWrite {
  readonly kind: string
  readonly taskGroupId: string
  readonly parentId: string | null
  readonly order: number
}

// WHY: empty when the release wrote nothing.
export function writesOf(result: TranslatedInput): readonly MoveWrite[] {
  const action = result.action as { kind: string; writes?: readonly (readonly MoveWrite[])[] } | null
  if (action === null || action.kind !== 'changeDocument') return []
  return (action.writes ?? []).flat()
}

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }

export interface Placement {
  readonly parentId: string | null
  readonly depth: number
  readonly siblings: readonly string[]
  readonly previous: string | null
  readonly next: string | null
  readonly treeState: string
  readonly after: Document
}

// WHY: applies the release's one write with the document's own edit road, then reads where the held task group stands.
export function placedBy(heldId: string, result: TranslatedInput, scene: Scene = {}): Placement {
  const writes = writesOf(result)
  if (writes.length !== 1) throw new Error(`premise: one write, got ${writes.length}`)
  const edit = editDocument(documentOf(scene), writes[0] as never, LIMITS, 'row')
  if (!edit.ok) throw new Error(`the edit road refused the write: ${JSON.stringify(edit.refusals)}`)
  return placementIn(edit.document, heldId)
}

export function placementIn(document: Document, id: string): Placement {
  const groups = (document.schedule.taskGroups as readonly { id: string; parentId: string | null; order: number; treeState: string }[])
  const one = groups.find((g) => g.id === id)
  if (one === undefined) throw new Error(`premise: ${id} exists`)
  const siblings = groups
    .filter((g) => g.parentId === one.parentId)
    .sort((a, b) => a.order - b.order)
    .map((g) => g.id)
  const at = siblings.indexOf(id)
  let depth = 0
  for (let up: string | null = id; up !== null; up = groups.find((g) => g.id === up)?.parentId ?? null) depth += 1
  return {
    parentId: one.parentId,
    depth,
    siblings,
    previous: siblings[at - 1] ?? null,
    next: siblings[at + 1] ?? null,
    treeState: one.treeState,
    after: document,
  }
}

export const treeOf = (document: Document): readonly { id: string; parentId: string | null; treeState: string }[] =>
  document.schedule.taskGroups as unknown as readonly { id: string; parentId: string | null; treeState: string }[]

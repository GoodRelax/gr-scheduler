// CR-774 spec-only stage: one task group tree with deep branches, the drag the translator reads, and the shell that carries it (HF-15, UF-97, QN-16).

import { displayRatioOf } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type {
  InputContext,
  PointerPress,
  TaskGroupGrabLanding,
  TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import * as grab from '../../src/adapter/input-command-translator/task-group-grab'
import type { Document } from '../../src/entity/document-model/document/document'
import { numberIn, rowOf, taskGroupDocument, type TaskGroupSeed } from '../unit/cr-541-stage'
import { REQUIREMENTS, DESIGN } from './cr-731-stage'
import { shell, type Shell } from './cr-772-shell-stage'

export { REQUIREMENTS, DESIGN }

// see T-206, T-201, T-211
export const S_208 = numberIn(rowOf('T-206', 'S-208').by['既定'] ?? '')
export const S_37 = numberIn(rowOf('T-201', 'S-37').by['既定値'] ?? '')
export const S_125 = numberIn(rowOf('T-211', 'S-125').by['値'] ?? '')

// WHY: P is the target; S is a chain of S_125 levels; H has two leaves under one parent; T is a chain to drop under.
// WHY: the tree is built for S_125 = 5, and the first case of the cases file says so.
export const ROWS: readonly TaskGroupSeed[] = [
  { id: 'P', parentId: null },
  { id: 'P1', parentId: 'P' },
  { id: 'S', parentId: null },
  { id: 'S1', parentId: 'S' },
  { id: 'S2', parentId: 'S1' },
  { id: 'S3', parentId: 'S2' },
  { id: 'S4', parentId: 'S3' },
  { id: 'H', parentId: null },
  { id: 'H1', parentId: 'H' },
  { id: 'H2', parentId: 'H1' },
  { id: 'H3', parentId: 'H2' },
  { id: 'H4a', parentId: 'H3' },
  { id: 'H4b', parentId: 'H3' },
  { id: 'T', parentId: null },
  { id: 'T1', parentId: 'T' },
  { id: 'T2', parentId: 'T1' },
  { id: 'T3', parentId: 'T2' },
  { id: 'T4', parentId: 'T3' },
]

const PANEL_TOP = 100
const ROW_HEIGHT = 24
const PANEL_X = 20
const PANEL_WIDTH = 300
const PANEL_HEIGHT = 600
const PRESS_X = 200

export interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

// WHY: a structural reading of the landing; the new member is added by CR-774, so no type name is imported for it.
export interface PastCapLanding {
  readonly parentId: string | null
  readonly order: number
  readonly depth: number
  readonly gapY: number
  readonly lineIndentPx: number
  readonly isPastDepthCap: boolean
}

export interface MoveCommand {
  readonly kind: string
  readonly taskGroupId: string
  readonly parentId: string | null
  readonly order: number
}

export interface TaskGroupRow {
  readonly id: string
  readonly parentId: string | null
  readonly order: number
}

export const documentOf = (): Document => taskGroupDocument(ROWS) as unknown as Document

export function boxesOf(): readonly { readonly taskGroupId: string; readonly box: Box }[] {
  return ROWS.map((seed, at) => ({
    taskGroupId: seed.id,
    box: { x: PANEL_X, y: PANEL_TOP + at * ROW_HEIGHT, width: PANEL_WIDTH, height: ROW_HEIGHT },
  }))
}

const boxOf = (id: string): Box => {
  const found = boxesOf().find((one) => one.taskGroupId === id)
  if (found === undefined) throw new Error(`premise: ${id} is drawn`)
  return found.box
}

// WHY: the boundary under a drawn row is the gap between it and the next drawn row.
export const under = (id: string): number => boxOf(id).y + boxOf(id).height

export const indentPx = (document: Document = documentOf()): number => S_37 * displayRatioOf(document.documentSettings)

const NO_MODS = { ctrl: false, shift: false, alt: false, meta: false }

function pressOn(heldId: string): PointerPress {
  return {
    at: { kind: 'pointer', phase: 'down', button: 'left', x: PRESS_X, y: 150, modifiers: NO_MODS, clickCount: 1 },
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
    isTaskGroupGrabCarried: true,
  } as unknown as PointerPress
}

function contextOf(press: PointerPress): InputContext {
  return {
    document: documentOf(),
    drawnTaskGroupBoxes: boxesOf(),
    regions: { taskGroupArea: { x: PANEL_X, y: PANEL_TOP, width: PANEL_WIDTH, height: PANEL_HEIGHT } },
    pressed: press,
  } as unknown as InputContext
}

const pointerAt = (steps: number, y: number, phase: 'move' | 'up') => ({
  kind: 'pointer' as const,
  phase,
  button: 'left' as const,
  x: PRESS_X + steps * indentPx(),
  y,
  modifiers: NO_MODS,
  clickCount: 1,
})

// WHY: steps counts indents to the right of the press point, y is the pointer height.
export function landingAt(heldId: string, steps: number, y: number): PastCapLanding | null {
  const press = pressOn(heldId)
  return grab.taskGroupGrabLandingAt(contextOf(press), heldId, pointerAt(steps, y, 'move'), press) as PastCapLanding | null
}

export function releaseAt(heldId: string, steps: number, y: number): TranslatedInput {
  const press = pressOn(heldId)
  return grab.commandFromRowGrab(pointerAt(steps, y, 'up'), press, contextOf(press), heldId)
}

export interface ChangeAction {
  readonly kind: string
  readonly writes?: readonly (readonly MoveCommand[])[]
  readonly question?: string
}

export const actionOf = (result: TranslatedInput): ChangeAction | null => result.action as unknown as ChangeAction | null

// WHY: empty when the release wrote nothing; the bundles are one undo step each.
export const bundlesOf = (result: TranslatedInput): readonly (readonly MoveCommand[])[] => actionOf(result)?.writes ?? []

export const groupsOf = (document: Document = documentOf()): readonly TaskGroupRow[] =>
  document.schedule.taskGroups as unknown as readonly TaskGroupRow[]

type LiftMovesAfter = (taskGroups: readonly unknown[], heldGroupId: string, landing: unknown) => readonly MoveCommand[]

// WHY: the seam CR-774 adds; looked up, so a missing one is one named failure rather than a compile error in every case.
export function liftMovesAfter(heldId: string, landing: PastCapLanding): readonly MoveCommand[] {
  const found = (grab as unknown as { taskGroupLiftMovesAfter?: LiftMovesAfter }).taskGroupLiftMovesAfter
  if (found === undefined) throw new Error('premise: task-group-grab.ts exports taskGroupLiftMovesAfter (CR-774 section 5.1)')
  return found(groupsOf(), heldId, landing)
}

// WHY: the CM-73 reading of a move: order is the index among the new parent's children with the moved one taken out.
export function applyMoves(groups: readonly TaskGroupRow[], commands: readonly MoveCommand[]): readonly TaskGroupRow[] {
  let now = groups.map((one) => ({ ...one }))
  for (const command of commands) {
    if (command.kind !== 'moveTaskGroup') throw new Error(`premise: only moves are applied, got ${command.kind}`)
    const rest = now.filter((one) => one.id !== command.taskGroupId)
    const kin = rest.filter((one) => one.parentId === command.parentId).sort((a, b) => a.order - b.order)
    const at = Math.max(0, Math.min(kin.length, Math.trunc(command.order)))
    kin.splice(at, 0, { id: command.taskGroupId, parentId: command.parentId, order: 0 })
    const placed = new Map(kin.map((one, rank) => [one.id, rank]))
    now = [...rest, { id: command.taskGroupId, parentId: command.parentId, order: 0 }].map((one) =>
      one.parentId === command.parentId ? { ...one, order: placed.get(one.id) ?? one.order } : one,
    )
  }
  return now
}

export const childrenIn = (groups: readonly TaskGroupRow[], parentId: string | null): readonly string[] =>
  groups
    .filter((one) => one.parentId === parentId)
    .sort((a, b) => a.order - b.order)
    .map((one) => one.id)

export function depthIn(groups: readonly TaskGroupRow[], id: string): number {
  let depth = 0
  for (let up: string | null = id; up !== null; up = groups.find((g) => g.id === up)?.parentId ?? null) depth += 1
  return depth
}

export const deepestIn = (groups: readonly TaskGroupRow[]): number => Math.max(...groups.map((one) => depthIn(groups, one.id)))

export const idsDeeperThan = (groups: readonly TaskGroupRow[], limit: number): readonly string[] =>
  groups.filter((one) => depthIn(groups, one.id) > limit).map((one) => one.id)

// WHY: the same tree through the frame loop, so the question and the answer are the real ones.
export function shellOf(language: 'ja' | 'en' = 'ja'): Shell {
  const open = ROWS.map((one) => ({ ...one, treeState: 'expanded' as const }))
  return shell(taskGroupDocument(open) as unknown as Document, language)
}

// WHY: presses the strip of heldId, carries it past S-208, then moves to the gap under aboveId, steps indents right of the press.
export function carryUnder(built: Shell, heldId: string, aboveId: string, steps: number): { x: number; y: number } {
  const home = built.press(heldId)
  built.move(home.x + 2, home.y + S_208 + 3)
  const to = { x: home.x + steps * indentPx(built.loop.document()), y: built.stripPoint(aboveId).y + 1 }
  built.move(to.x, to.y)
  return to
}

export function dragUnder(built: Shell, heldId: string, aboveId: string, steps: number): void {
  const to = carryUnder(built, heldId, aboveId, steps)
  built.release(to.x, to.y)
}

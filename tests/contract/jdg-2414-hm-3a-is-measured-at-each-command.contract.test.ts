// JDG-2414 spec-only cases: the depth cap of HM-3a is measured at each command of a write batch, at the moment the command lands (AG-3, AG-5, HF-15, QN-16).

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import { planDocumentChange } from '../../src/use-case/apply-document-change/document-change-plan'
import type {
  ChangeStep,
  DocumentCommand,
  SettingsLimits,
  WriteMoment,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { undoEdit } from '../../src/use-case/undo-edit/undo-edit'
import {
  S_125,
  actionOf,
  applyMoves,
  bundlesOf,
  childrenIn,
  deepestIn,
  documentOf,
  groupsOf,
  idsDeeperThan,
  landingAt,
  releaseAt,
  under,
  type MoveCommand,
} from './cr-774-stage'

// WHY: the write path the Agent API (AM-7, AG-5) and the UI both drive: one planDocumentChange call per batch.
const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }
const CALM: WriteMoment = { gestureInFlight: false, editingInPlace: false, questionAsked: false, deliveringNotices: false }
const HISTORY_LIMITS = { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 }

interface Held {
  readonly document: Document
  readonly history: EditHistory<ChangeStep>
}

const fresh = (): Held => ({ document: documentOf(), history: { done: [], undone: [] } })

function batch(held: Held, commands: readonly MoveCommand[]): ReturnType<typeof planDocumentChange> {
  return planDocumentChange({
    defaultTaskGroupName: 'Row',
    document: held.document,
    expectedStamp: held.document.documentStamp,
    commands: commands as unknown as readonly DocumentCommand[],
    moment: CALM,
    history: held.history,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: LIMITS,
    editedBy: 'tester',
    updatedAt: '2028-05-02T00:00:00Z',
  })
}

const move = (taskGroupId: string, parentId: string | null, order: number): MoveCommand => ({
  kind: 'moveTaskGroup',
  taskGroupId,
  parentId,
  order,
})

// WHY: S > S1 > S2 > S3 > S4 is five deep. Put under P (as the last child, after P1) it sits one level lower, so S4 would be at depth 6.
const MOVE_S_UNDER_P = move('S', 'P', 1)
// WHY: lifting S4 to be the second child of S2 makes the subtree four deep before the move and five deep after it.
const LIFT_S4_TO_S2 = move('S4', 'S2', 1)

describe('premise -- the fixture is five deep and the cap is S-125', () => {
  it('the deepest group of the fixture is exactly at the cap, and the move below would pass it', () => {
    expect(deepestIn(groupsOf())).toBe(S_125)
    const passed = applyMoves(groupsOf(), [MOVE_S_UNDER_P])
    expect(deepestIn(passed)).toBe(S_125 + 1)
    const settled = applyMoves(groupsOf(), [LIFT_S4_TO_S2, MOVE_S_UNDER_P])
    expect(deepestIn(settled)).toBe(S_125)
  })
})

describe('HM-3a / AG-3 / AG-5 -- the cap is measured at each command of a batch, at the moment it lands', () => {
  it('[move past the cap, then lift back within it] is refused as a whole, with the HM-3a refusal on the way', () => {
    const held = fresh()
    const plan = batch(held, [MOVE_S_UNDER_P, LIFT_S4_TO_S2])
    expect(plan.ok, 'a batch that passes the cap mid-way is refused even though the last command would bring it back').toBe(false)
    if (plan.ok) return
    expect(plan.refusal.step).toBe('WS-3')
    expect(plan.refusal.reason).toBe('refused')
    const refusals = (plan.refusal as unknown as { refusals: readonly unknown[] }).refusals
    expect(refusals.length, 'AG-3 / AG-9a: the refusal names the command that was refused').toBeGreaterThan(0)
  })

  it('a refused batch leaves the document and the history exactly as they were (AG-3: nothing half applied)', () => {
    const held = fresh()
    const before = structuredClone(held.document)
    const plan = batch(held, [MOVE_S_UNDER_P, LIFT_S4_TO_S2])
    expect(plan.ok).toBe(false)
    expect(held.document).toEqual(before)
    expect(held.history.done).toHaveLength(0)
  })

  it('the reverse order [lift first, then move] is accepted and lands the tree the two commands describe', () => {
    const held = fresh()
    const plan = batch(held, [LIFT_S4_TO_S2, MOVE_S_UNDER_P])
    expect(plan.ok, JSON.stringify(plan.ok ? null : plan.refusal)).toBe(true)
    if (!plan.ok) return
    const after = groupsOf(plan.document)
    expect(childrenIn(after, 'P')).toEqual(['P1', 'S'])
    expect(childrenIn(after, 'S2')).toEqual(['S3', 'S4'])
    expect(childrenIn(after, 'S3')).toEqual([])
    expect(idsDeeperThan(after, S_125)).toEqual([])
    expect(deepestIn(after)).toBe(S_125)
    expect(plan.history.done, 'FR-031: one batch is one undo step').toHaveLength(1)
  })

  it('the same two commands sent one by one: the move alone is refused (it passes the cap), the lift then move is accepted', () => {
    const moveAlone = batch(fresh(), [MOVE_S_UNDER_P])
    expect(moveAlone.ok, 'HM-3a: a move whose deepest group lands past the cap is not accepted').toBe(false)

    const lifted = batch(fresh(), [LIFT_S4_TO_S2])
    expect(lifted.ok).toBe(true)
    if (!lifted.ok) return
    const moved = batch({ document: lifted.document, history: lifted.history }, [MOVE_S_UNDER_P])
    expect(moved.ok).toBe(true)
  })

  it.todo('the HM-3a refusal carries a row id of its own -- the spec names no reason value for it (AG-9a lists only invariant rows and T-233 rows)')
})

// WHY: the held group H (five deep, two leaves under H3) let go at depth 2 under P, one indent right of P1: H4a and H4b land at depth 6.
const releasedBundle = (): readonly MoveCommand[] => {
  const result = releaseAt('H', 1, under('P1'))
  return bundlesOf(result)[0] ?? []
}

describe('QN-16 / HF-15 -- the Yes batch lifts first and moves last, so every command is within the cap when it lands', () => {
  it('the release is one bundle asked as QN-16: the lifts of the too-deep groups first, the held group move last', () => {
    expect(landingAt('H', 1, under('P1'))?.isPastDepthCap).toBe(true)
    const result = releaseAt('H', 1, under('P1'))
    expect(actionOf(result)?.kind).toBe('changeDocument')
    expect(actionOf(result)?.question).toBe('QN-16')
    expect(bundlesOf(result), 'AG-3 / UN-4: one bundle, one undo step').toHaveLength(1)
    const bundle = releasedBundle()
    expect(bundle.length).toBeGreaterThan(1)
    const last = bundle[bundle.length - 1]
    expect(last).toMatchObject({ kind: 'moveTaskGroup', taskGroupId: 'H', parentId: 'P' })
    const lifts = bundle.slice(0, -1)
    expect(lifts.map((one) => [one.kind, one.taskGroupId])).toEqual([
      ['moveTaskGroup', 'H4a'],
      ['moveTaskGroup', 'H4b'],
    ])
    expect(
      lifts.every((one) => one.taskGroupId !== 'H'),
      'no lift comes after the held group move',
    ).toBe(true)
  })

  it('applied ONE BY ONE, in order, every command is accepted: none passes the cap when it lands', () => {
    const bundle = releasedBundle()
    expect(bundle.length).toBeGreaterThan(1)
    let held = fresh()
    bundle.forEach((command, at) => {
      const plan = batch(held, [command])
      expect(plan.ok, `command ${String(at)} (${command.taskGroupId}) lands within the cap: ${JSON.stringify(plan.ok ? null : plan.refusal)}`).toBe(true)
      if (!plan.ok) return
      held = { document: plan.document, history: plan.history }
      expect(deepestIn(groupsOf(held.document)), `after command ${String(at)} nothing is deeper than the cap`).toBeLessThanOrEqual(S_125)
    })
    expect(idsDeeperThan(groupsOf(held.document), S_125)).toEqual([])
  })

  it('the old arrangement, the held move FIRST and the lifts after, is refused as a whole by the same write path', () => {
    const bundle = releasedBundle()
    const lifts = bundle.slice(0, -1)
    const held = bundle[bundle.length - 1]
    expect(held).toBeDefined()
    const backwards = [held as MoveCommand, ...lifts]
    const plan = batch(fresh(), backwards)
    expect(plan.ok, 'the held move lands H4a and H4b at depth 6, so the batch is refused although the lifts follow').toBe(false)
  })
})

describe('QN-16 / HF-15 -- the Yes batch applied as one batch', () => {
  it('moves the held group under the landing parent and brings every too-deep group to the cap', () => {
    const plan = batch(fresh(), releasedBundle())
    expect(plan.ok, JSON.stringify(plan.ok ? null : plan.refusal)).toBe(true)
    if (!plan.ok) return
    const after = groupsOf(plan.document)
    expect(childrenIn(after, 'P')).toEqual(['P1', 'H'])
    expect(childrenIn(after, 'H3'), 'the lifted groups leave the group at the cap').toEqual([])
    expect(idsDeeperThan(after, S_125), 'nothing stays past the cap').toEqual([])
    expect(deepestIn(after)).toBe(S_125)
  })

  it('the lifted groups become children of their ancestor one level above the cap, right after the ancestor at the cap, in tree order', () => {
    const plan = batch(fresh(), releasedBundle())
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const after = groupsOf(plan.document)
    // WHY: H is at depth 2, so H1 is 3, H2 is 4 (cap - 1) and H3 is 5 (the cap).
    expect(childrenIn(after, 'H2'), 'H3 first, then the first lifted group, then the second').toEqual(['H3', 'H4a', 'H4b'])
  })

  it('a Task stays on the task group that carries it, lifted or not (HM-3)', () => {
    const held = fresh()
    const before = structuredClone(held.document.schedule.taskGroupMembers)
    const plan = batch(held, releasedBundle())
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.document.schedule.taskGroupMembers).toEqual(before)
  })

  it('one batch is one undo step, and that one undo restores the document before the batch', () => {
    const held = fresh()
    const before = structuredClone(held.document.schedule.taskGroups)
    const plan = batch(held, releasedBundle())
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.history.done.length - held.history.done.length, 'the history gains exactly one step').toBe(1)
    expect(plan.document.schedule.taskGroups).not.toEqual(before)
    const outcome = undoEdit({ document: plan.document, history: plan.history })
    expect(outcome.undone).toBe(true)
    expect(outcome.next.document.schedule.taskGroups).toEqual(before)
    expect(outcome.next.history.done).toHaveLength(0)
  })

  it('the batch lands the same tree as the CM-73 reading of its commands in order', () => {
    const bundle = releasedBundle()
    const plan = batch(fresh(), bundle)
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const byId = (rows: readonly { id: string; parentId: string | null; order: number }[]) =>
      [...rows].map((one) => [one.id, one.parentId, childrenIn(rows, one.parentId).indexOf(one.id)]).sort((x, y) => String(x[0]).localeCompare(String(y[0])))
    expect(byId(groupsOf(plan.document))).toEqual(byId(applyMoves(groupsOf(), bundle)))
  })
})

// EditDocument -- the Dependency aggregate.
//
// @unit      UF-13  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure
//
// The three commands table T-108 puts in the `Dependency` group: CM-36 to
// CM-38.
//
// A dependency is held on the SUCCESSOR (AT-42, AT-45), so every command names
// one by the pair (predecessor, successor).
//
// Each command rebuilds `document.schedule` only when it changed something,
// because the schedule instant moves by that reference (FR-063).

import type { Document } from '../../entity/document-model/document/document'
import type { Dependency, Task } from '../../entity/document-model/schedule/schedule'
import { taskByUid } from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited } from './edit-document'

/**
 * The edge of a bar a line was drawn out of or into. Reading the half off the
 * pointer (FR-009) is the caller's, so the Agent API can name an edge directly.
 */
export type DependencyEdge = 'start' | 'finish'

/**
 * CM-36 to CM-38 of table T-108. CM-36 carries no `linkType`: FR-009 derives it
 * from the edges, and a parameter would be the separate entrance it forbids.
 */
export type DependencyCommand =
  | {
      readonly kind: 'createDependency'
      readonly predecessorUid: number
      readonly successorUid: number
      /** The edge the line was drawn OUT of, on the predecessor. */
      readonly predecessorEdge: DependencyEdge
      /** The edge the line was drawn INTO, on the successor. */
      readonly successorEdge: DependencyEdge
    }
  | {
      readonly kind: 'deleteDependency'
      readonly predecessorUid: number
      readonly successorUid: number
    }
  | {
      readonly kind: 'setDependencyLag'
      readonly predecessorUid: number
      readonly successorUid: number
      /** Not nullable, though AT-47 is: S-117 already gives 0 the meaning of no lag. */
      readonly lag: number
    }

/**
 * The row of table T-018 a pair of edges falls on, as its `linkType` (codes
 * fixed by AT-46, not ordered by this file).
 *
 * @purity pure
 */
function linkTypeOf(from: DependencyEdge, into: DependencyEdge): number {
  if (from === 'finish') return into === 'start' ? 1 : 0 // DP-1 FS / DP-3 FF
  return into === 'finish' ? 2 : 3 //                       DP-2 SF / DP-4 SS
}

/**
 * `reasonCategory` (AG-9a of table T-035) is left out wherever `rule` already
 * tells the refusal apart.
 *
 * @purity pure
 */
function reject(
  command: string,
  rule: string,
  what: string,
  reasonCategory?: Refusal['reasonCategory'],
): Refusal {
  return reasonCategory === undefined
    ? { command, rule, what }
    : { command, rule, reasonCategory, what }
}

/**
 * The document with one task put back in place of the one it replaces.
 *
 * @purity pure
 */
function withTask(document: Document, task: Task): Document {
  const tasks = document.schedule.tasks.map((one) => (one.uid === task.uid ? task : one))
  return { ...document, schedule: { ...document.schedule, tasks } }
}

/**
 * Runs one Dependency command against the document.
 *
 * @purity pure
 */
export function editDependency(document: Document, command: DependencyCommand): EditResult {
  const schedule = document.schedule

  switch (command.kind) {
    case 'createDependency': {
      const predecessor = taskByUid(schedule, command.predecessorUid)
      const successor = taskByUid(schedule, command.successorUid)
      const refusals: Refusal[] = []

      // Table T-018b's refusals are all collected before answering, so the
      // caller learns every wrong item in one round trip (NT-1).
      if (command.predecessorUid === command.successorUid) {
        // Carries a reason category because RS-56 of table T-233 is a row of its
        // own and `CM-36` / `FR-009` cannot separate it from the refusals below.
        // No row ID is spelled here: the join to `RS-56` is the Adapter's (LY-4).
        refusals.push(
          reject('CM-36', 'FR-009', `one task may not be both ends: UID ${command.predecessorUid}`,
                 'bothEndsAreOneTask'),
        )
      }
      // DN-2: searched by `predecessorUid` alone, whatever the kind. The pair is
      // ordered, so the reverse dependency is a different pair.
      if (successor !== null &&
          successor.dependencies.some((one) => one.predecessorUid === command.predecessorUid)) {
        refusals.push(
          reject('CM-36', 'FR-009',
                 `a dependency from ${command.predecessorUid} to ${command.successorUid} already exists`),
        )
      }
      // DN-3. A milestone is a `Task` here (AT-30), so the rows of
      // `schedule.tasks` are exactly the admitted ends. Caught here rather than
      // left to IV-2 so the refusal names which endpoint was wrong.
      if (predecessor === null) {
        refusals.push(
          reject('CM-36', 'FR-009', `no task holds the predecessor UID ${command.predecessorUid}`),
        )
      }
      if (successor === null) {
        refusals.push(
          reject('CM-36', 'FR-009', `no task holds the successor UID ${command.successorUid}`),
        )
      }
      // The two null tests are also what narrows the types below; each of
      // them has already put its own refusal on the list.
      if (refusals.length > 0 || predecessor === null || successor === null) {
        return refused(refusals)
      }

      // FR-009's milestone fold, on the way in only: an imported dependency's
      // type may not be rewritten, so no sweep over the document does this.
      const milestoneEnd = predecessor.milestone === true || successor.milestone === true
      const linkType = milestoneEnd
        ? 1 // DP-1 FS
        : linkTypeOf(command.predecessorEdge, command.successorEdge)

      const dependency: Dependency = {
        predecessorUid: command.predecessorUid,
        linkType,
        // S-117 of table T-213. The lag moves no date (FR-009).
        lag: document.documentSettings.dependencyLagDefault,
        // MISSING: S-118 fixes the unit at 稼働日, but no `LagFormat` code (AT-48)
        // is specified for it. `null` holds no value, which AT-48 admits; it does
        // not claim a unit.
        lagFormat: null,
        // Nothing arrived from an exchange partner, so there is nothing to
        // carry back -- EX-2 and FR-021 bind the values that DID arrive.
        carry: {},
        carryElements: [],
      }

      // Appended, so the order the imported rows arrived in is not disturbed.
      return edited(
        withTask(document, {
          ...successor,
          dependencies: [...successor.dependencies, dependency],
        }),
      )
    }

    case 'deleteDependency': {
      const successor = taskByUid(schedule, command.successorUid)
      const held = successor?.dependencies ?? []
      // CD-3 of table T-050
      const kept = held.filter((one) => one.predecessorUid !== command.predecessorUid)
      if (successor === null || kept.length === held.length) {
        // Already as asked: the same document comes back (FR-063).
        return edited(document)
      }
      return edited(withTask(document, { ...successor, dependencies: kept }))
    }

    case 'setDependencyLag': {
      const successor = taskByUid(schedule, command.successorUid)
      const held = successor?.dependencies
        .find((one) => one.predecessorUid === command.predecessorUid) ?? null
      if (successor === null || held === null) {
        // Unlike CM-37, this command cannot already have had its way, so it is
        // refused rather than answered with an untouched document.
        return refused([
          reject('CM-38', 'FR-009',
                 `no dependency runs from ${command.predecessorUid} to ${command.successorUid}`),
        ])
      }
      // S-117 states no range, so a negative lag (a lead) is accepted.
      if (!Number.isInteger(command.lag)) {
        return refused([reject('CM-38', 'AT-47', `lag must be an integer: ${command.lag}`)])
      }
      if (held.lag === command.lag) {
        // Nothing changed, so nothing is rebuilt (FR-063).
        return edited(document)
      }

      // CM-38 is ⭐ in table T-108, which names no columns for it. Only `lag` is
      // written:
      //
      // MISSING: FR-009 folds an imported type to FS only when a person edits
      // the dependency, and neither FR-009 nor table T-108 says whether a lag
      // change is that edit, so `linkType` is left as it stands.
      //
      // MISSING: `lagFormat` is left as it stands (no code for 稼働日, as in
      // CM-36), so an imported non-working-day unit holds the number entered.
      const dependencies = successor.dependencies.map((one) =>
        one.predecessorUid === command.predecessorUid ? { ...one, lag: command.lag } : one,
      )
      return edited(withTask(document, { ...successor, dependencies }))
    }
  }
}

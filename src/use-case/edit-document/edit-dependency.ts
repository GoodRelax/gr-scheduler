// EditDocument: the Dependency commands of table T-108.
// @unit      UF-13  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { Dependency, Task } from '../../entity/document-model/schedule/schedule'
import { taskByUid } from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited } from './edit-document'

export type DependencyEdge = 'start' | 'finish'

export type DependencyCommand =
  | {
      readonly kind: 'createDependency'
      readonly predecessorUid: number
      readonly successorUid: number
      readonly predecessorEdge: DependencyEdge
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
      readonly lag: number
    }

/** @purity pure */
function linkTypeOf(from: DependencyEdge, into: DependencyEdge): number {
  if (from === 'finish') return into === 'start' ? 1 : 0
  return into === 'finish' ? 2 : 3
}

/** @purity pure */
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

/** @purity pure */
function withTask(document: Document, task: Task): Document {
  const tasks = document.schedule.tasks.map((one) => (one.uid === task.uid ? task : one))
  return { ...document, schedule: { ...document.schedule, tasks } }
}

// see CM-36, CM-37, CM-38, FR-009
/** @purity pure */
export function editDependency(document: Document, command: DependencyCommand): EditResult {
  const schedule = document.schedule

  switch (command.kind) {
    case 'createDependency': {
      const predecessor = taskByUid(schedule, command.predecessorUid)
      const successor = taskByUid(schedule, command.successorUid)
      const refusals: Refusal[] = []

      if (command.predecessorUid === command.successorUid) {
        refusals.push(
          reject('CM-36', 'FR-009', `one task may not be both ends: UID ${command.predecessorUid}`,
                 'bothEndsAreOneTask'),
        )
      }
      if (successor !== null &&
          successor.dependencies.some((one) => one.predecessorUid === command.predecessorUid)) {
        refusals.push(
          reject('CM-36', 'FR-009',
                 `a dependency from ${command.predecessorUid} to ${command.successorUid} already exists`),
        )
      }
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
      if (refusals.length > 0 || predecessor === null || successor === null) {
        return refused(refusals)
      }

      const milestoneEnd = predecessor.milestone === true || successor.milestone === true
      const linkType = milestoneEnd
        ? 1
        : linkTypeOf(command.predecessorEdge, command.successorEdge)

      const dependency: Dependency = {
        predecessorUid: command.predecessorUid,
        linkType,
        lag: document.documentSettings.dependencyLagDefault,
        // WHY: null, not a LagFormat code: S-118 fixes the unit but AT-48 has no code for it.
        lagFormat: null,
        carry: {},
        carryElements: [],
      }

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
      const kept = held.filter((one) => one.predecessorUid !== command.predecessorUid)
      if (successor === null || kept.length === held.length) {
        return edited(document)
      }
      return edited(withTask(document, { ...successor, dependencies: kept }))
    }

    case 'setDependencyLag': {
      const successor = taskByUid(schedule, command.successorUid)
      const held = successor?.dependencies
        .find((one) => one.predecessorUid === command.predecessorUid) ?? null
      if (successor === null || held === null) {
        return refused([
          reject('CM-38', 'FR-009',
                 `no dependency runs from ${command.predecessorUid} to ${command.successorUid}`),
        ])
      }
      if (!Number.isInteger(command.lag)) {
        return refused([reject('CM-38', 'AT-47', `lag must be an integer: ${command.lag}`)])
      }
      if (held.lag === command.lag) {
        return edited(document)
      }

      // WHY: linkType and lagFormat stay as they stand: neither FR-009 nor T-108 says
      // whether a lag change is the person's edit that folds an imported type to FS.
      const dependencies = successor.dependencies.map((one) =>
        one.predecessorUid === command.predecessorUid ? { ...one, lag: command.lag } : one,
      )
      return edited(withTask(document, { ...successor, dependencies }))
    }
  }
}

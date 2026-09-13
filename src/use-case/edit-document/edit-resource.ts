// EditDocument -- the Resource and Assignment aggregate.
//
// @unit      UF-15  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure
//
// The six commands table T-108 puts in `Resource` and `Assignment` (CM-40 to
// CM-45). Unassigning (CM-45, FR-008) and deleting (CM-42, CD-5 of table T-050)
// stay two commands because only deleting takes the 担当者 away.
//
// Each command returns the document UNCHANGED when it changes nothing, because
// document-change-plan.ts tells a schedule-group write by the `schedule`
// reference (FR-063).

import type { Document } from '../../entity/document-model/document/document'
import type {
  Assignment,
  Resource,
  Schedule,
} from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited } from './edit-document'

/** CM-40 to CM-45 of table T-108. */
export type ResourceCommand =
  | { readonly kind: 'createResource'; readonly name: string | null }
  | { readonly kind: 'setResourceName'; readonly uid: number; readonly name: string | null }
  | { readonly kind: 'deleteResource'; readonly uids: readonly number[] }
  | { readonly kind: 'deleteUnreferencedResources' }
  | { readonly kind: 'createAssignment'; readonly taskUid: number; readonly resourceUid: number }
  | { readonly kind: 'unassignResource'; readonly taskUid: number; readonly resourceUid: number }

/** The AT-87 code for 作業; FR-008. */
const WORK_RESOURCE = 1

/** @purity pure */
function reject(command: string, rule: string, what: string): Refusal {
  return { command, rule, what }
}

/** @purity pure */
function withSchedule(document: Document, part: Partial<Schedule>): Document {
  return { ...document, schedule: { ...document.schedule, ...part } }
}

/**
 * Runs one Resource or Assignment command against the document.
 *
 * @purity pure
 */
export function editResource(document: Document, command: ResourceCommand): EditResult {
  const { project, resources, assignments, tasks } = document.schedule

  // FR-008 / AT-20; the reason is FR-001's.
  const nextUid = project.uidHighWaterMark + 1

  switch (command.kind) {
    case 'createResource': {
      const made: Resource = {
        uid: nextUid,
        // Neither an empty name nor one another resource carries is refused:
        // FR-059 keeps a nameless resource off the label, and MG-5 of table
        // T-032 folds same-named 担当者 on the merge path only. AS-4 of table
        // T-225 is not checked here.
        name: command.name,
        resourceKind: WORK_RESOURCE,
        isCostResource: false,
        // Not decided: FR-008 only bans editing the calendar, and neither no
        // calendar nor a copy of the document's (AT-18) is specified. `null`
        // because AT-89 admits it and FR-054 keeps this column out of working-day
        // counts, so the choice reaches only what is written out.
        calendarUid: null,
        // GRS made this row, so nothing is carried back (table T-053).
        carry: {},
        carryElements: [],
      }
      return edited(
        withSchedule(document, {
          project: { ...project, uidHighWaterMark: nextUid },
          resources: [...resources, made],
        }),
      )
    }

    case 'setResourceName': {
      const held = resources.find((one) => one.uid === command.uid)
      if (held === undefined) {
        // Not decided, here and at CM-42 and CM-45: a command naming a row the
        // document does not hold is refused rather than skipped, so an
        // all-or-nothing bundle (AG-3 of table T-035) cannot report success for
        // a rename that renamed nothing. The choice is this file's.
        return refused([
          reject('CM-41', 'FR-008', `no resource with uid ${command.uid} is in the document`),
        ])
      }
      if (held.name === command.name) return edited(document)
      // The count of tasks the rename reaches is told under NT-3 of table T-037,
      // not here (CP-9).
      return edited(
        withSchedule(document, {
          resources: resources.map((one) =>
            one.uid === command.uid ? { ...one, name: command.name } : one,
          ),
        }),
      )
    }

    case 'deleteResource': {
      // Only the uids handed, so this is not the delete-all entrance FR-099
      // forbids; select-all feeds it every uid instead.
      if (command.uids.length === 0) return edited(document)
      const missing = command.uids.filter((uid) => !resources.some((one) => one.uid === uid))
      if (missing.length > 0) {
        return refused(
          // Not decided by FR-099; refused for the reason at CM-41 above.
          missing.map((uid) =>
            reject('CM-42', 'FR-099', `no resource with uid ${uid} is in the document`),
          ),
        )
      }
      const going = new Set(command.uids)
      // CD-5 of table T-050. The confirmation FR-099 asks for is the screen's
      // (CP-9), so this file does not gate on it.
      return edited(
        withSchedule(document, {
          resources: resources.filter((one) => !going.has(one.uid)),
          assignments: assignments.filter(
            (one) => one.resourceUid === null || !going.has(one.resourceUid),
          ),
        }),
      )
    }

    case 'deleteUnreferencedResources': {
      // FR-008 / FR-099
      const referenced = new Set(
        assignments.flatMap((one) => (one.resourceUid === null ? [] : [one.resourceUid])),
      )
      const kept = resources.filter((one) => referenced.has(one.uid))
      if (kept.length === resources.length) return edited(document)
      // No cascade: every resource that goes is one no assignment points at.
      return edited(withSchedule(document, { resources: kept }))
    }

    case 'createAssignment': {
      const refusals: Refusal[] = []
      // IV-2 of table T-220 (AT-93 and AT-94 are foreign keys).
      if (!tasks.some((one) => one.uid === command.taskUid)) {
        refusals.push(
          reject('CM-44', 'IV-2', `no task with uid ${command.taskUid} is in the document`),
        )
      }
      if (!resources.some((one) => one.uid === command.resourceUid)) {
        refusals.push(
          reject('CM-44', 'IV-2', `no resource with uid ${command.resourceUid} is in the document`),
        )
      }
      // FR-008
      if (
        assignments.some(
          (one) => one.taskUid === command.taskUid && one.resourceUid === command.resourceUid,
        )
      ) {
        refusals.push(
          reject(
            'CM-44',
            'FR-008',
            `task ${command.taskUid} already holds an assignment of resource ${command.resourceUid}`,
          ),
        )
      }
      if (refusals.length > 0) return refused(refusals)
      const made: Assignment = {
        uid: nextUid,
        taskUid: command.taskUid,
        resourceUid: command.resourceUid,
        carry: {},
        carryElements: [],
      }
      return edited(
        withSchedule(document, {
          project: { ...project, uidHighWaterMark: nextUid },
          assignments: [...assignments, made],
        }),
      )
    }

    case 'unassignResource': {
      // Every assignment of the pair goes, not the first one found: FR-008 binds
      // only what is created here, so an imported document may hold two.
      const kept = assignments.filter(
        (one) => !(one.taskUid === command.taskUid && one.resourceUid === command.resourceUid),
      )
      if (kept.length === assignments.length) {
        // Not decided by FR-008; refused for the reason at CM-41 above.
        return refused([
          reject(
            'CM-45',
            'FR-008',
            `task ${command.taskUid} holds no assignment of resource ${command.resourceUid}`,
          ),
        ])
      }
      // The `Resource` stays even after its last assignment (FR-008); CM-43
      // takes an unreferenced one away.
      return edited(withSchedule(document, { assignments: kept }))
    }
  }
}

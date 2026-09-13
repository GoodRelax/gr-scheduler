// EditDocument: the Resource and Assignment commands of table T-108.
// @unit      UF-15  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type {
  Assignment,
  Resource,
  Schedule,
} from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited } from './edit-document'

export type ResourceCommand =
  | { readonly kind: 'createResource'; readonly name: string | null }
  | { readonly kind: 'setResourceName'; readonly uid: number; readonly name: string | null }
  | { readonly kind: 'deleteResource'; readonly uids: readonly number[] }
  | { readonly kind: 'deleteUnreferencedResources' }
  | { readonly kind: 'createAssignment'; readonly taskUid: number; readonly resourceUid: number }
  | { readonly kind: 'unassignResource'; readonly taskUid: number; readonly resourceUid: number }

const WORK_RESOURCE = 1

/** @purity pure */
function reject(command: string, rule: string, what: string): Refusal {
  return { command, rule, what }
}

/** @purity pure */
function withSchedule(document: Document, part: Partial<Schedule>): Document {
  return { ...document, schedule: { ...document.schedule, ...part } }
}

// see CM-40, CM-41, CM-42, CM-43, CM-44, CM-45
/** @purity pure */
export function editResource(document: Document, command: ResourceCommand): EditResult {
  const { project, resources, assignments, tasks } = document.schedule

  const nextUid = project.uidHighWaterMark + 1

  switch (command.kind) {
    case 'createResource': {
      const made: Resource = {
        uid: nextUid,
        name: command.name,
        resourceKind: WORK_RESOURCE,
        isCostResource: false,
        // WHY: null: no row decides a new resource's calendar, and FR-054 keeps it out of day counts.
        calendarUid: null,
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
        // WHY: a uid the document lacks is refused, not skipped (also CM-42, CM-45): a bundle
        // must not report success for an edit that did nothing (AG-3).
        return refused([
          reject('CM-41', 'FR-008', `no resource with uid ${command.uid} is in the document`),
        ])
      }
      if (held.name === command.name) return edited(document)
      return edited(
        withSchedule(document, {
          resources: resources.map((one) =>
            one.uid === command.uid ? { ...one, name: command.name } : one,
          ),
        }),
      )
    }

    case 'deleteResource': {
      if (command.uids.length === 0) return edited(document)
      const missing = command.uids.filter((uid) => !resources.some((one) => one.uid === uid))
      if (missing.length > 0) {
        return refused(
          missing.map((uid) =>
            reject('CM-42', 'FR-099', `no resource with uid ${uid} is in the document`),
          ),
        )
      }
      const going = new Set(command.uids)
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
      const referenced = new Set(
        assignments.flatMap((one) => (one.resourceUid === null ? [] : [one.resourceUid])),
      )
      const kept = resources.filter((one) => referenced.has(one.uid))
      if (kept.length === resources.length) return edited(document)
      return edited(withSchedule(document, { resources: kept }))
    }

    case 'createAssignment': {
      const refusals: Refusal[] = []
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
      // TRAP: remove every assignment of the pair, not the first: an imported document may hold two.
      const kept = assignments.filter(
        (one) => !(one.taskUid === command.taskUid && one.resourceUid === command.resourceUid),
      )
      if (kept.length === assignments.length) {
        return refused([
          reject(
            'CM-45',
            'FR-008',
            `task ${command.taskUid} holds no assignment of resource ${command.resourceUid}`,
          ),
        ])
      }
      return edited(withSchedule(document, { assignments: kept }))
    }
  }
}

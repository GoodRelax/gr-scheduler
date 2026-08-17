// EditDocument -- the Resource and Assignment aggregate.
//
// @unit      UF-15  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure
//
// The six commands table T-108 puts in `Resource` (CM-40 to CM-43) and in
// `Assignment` (CM-44, CM-45).
//
// ⚠️ 解除 and 削除 are two different words in the specification, and they stay
// two commands here. CM-45 unassigns: FR-008 makes keeping the 担当者 a MUST
// and forbids sweeping up one nothing points at any more (MUST NOT). CM-42
// deletes the 担当者, and CD-5 of table T-050 takes its assignments with it --
// but never a `Task`. CR-149 renamed `deleteAssignment` to `unassignResource`
// for this reason alone.
//
// ⚠️ Everything this file writes -- `Resource`, `Assignment`, and the
// `uidHighWaterMark` the two are numbered from -- lives in the schedule group,
// so every command that changes something rebuilds `document.schedule`. Each
// one returns the document UNCHANGED when it changes nothing: FR-063 raises
// the revision for a write that moved the schedule group, and
// document-change-plan.ts reads that from the schedule REFERENCE.
//
// ⚠️ It is not the public entry of its component. Nothing outside
// `edit-document/` may import it (Chapter 5.3, MUST NOT) -- `edit-document.ts`
// re-exports what leaves.

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

/**
 * `Resource/Type` as AT-87 codes it: 0 = 材料, 1 = 作業, 2 = 費用.
 *
 * FR-008: "新しく作る担当者は作業資源として作ること（MUST）" -- FR-059 draws
 * only work resources on the assignee label, so a resource made with any other
 * kind would be one whose name never appears on the schedule.
 */
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

  // FR-008: "新しい `Resource` と `Assignment` の `uid` も
  // `Project.uidHighWaterMark` に従って採ること（MUST）", and AT-20 is the
  // highest uid ever ISSUED, not the highest one still standing and not the
  // Tasks' alone. FR-001 holds the reason: numbering from the largest uid that
  // exists re-issues one that undo took away, and the redo then puts two rows
  // with the same uid in the document -- which IV-1 of table T-220 forbids.
  const nextUid = project.uidHighWaterMark + 1

  switch (command.kind) {
    case 'createResource': {
      const made: Resource = {
        uid: nextUid,
        // ⚠️ Nothing refuses an empty or absent name. FR-008 bans no name, and
        // FR-059 already decides what such a resource does on screen: it is not
        // drawn on the assignee label. ⚠️ Nor is a name that some other
        // resource already carries refused -- FR-008's MUST NOT is about the
        // pair an assignment names, and MG-5 of table T-032 folds same-named
        // 担当者 together on the merge path only.
        name: command.name,
        resourceKind: WORK_RESOURCE,
        // FR-059 keeps 費用資源 off the assignee label beside 材料資源, so the
        // column that spells out the same fact for the exchange partner says
        // the resource is not one (AT-88).
        isCostResource: false,
        // ⛔ NOT DECIDED. CR-150 §3 row 1 records the open question in as many
        // words: whether a resource made here is given no calendar or a copy of
        // the document's (AT-18). FR-008 holds only the ban on EDITING the
        // calendar, so neither answer is in the specification. `null` is
        // written because AT-89 admits it and FR-054 forbids counting working
        // days by this column at all -- so the choice reaches nothing inside
        // GRS, only what is written out. It is a hole, not a ruling.
        calendarUid: null,
        // Table T-053's two vessels. GRS made this row, so it carries nothing
        // of the exchange partner's back.
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
        // ⛔ NOT DECIDED, here and at CM-42 and CM-45: no requirement says what
        // a command naming a row the document does not hold should do. It is
        // refused rather than passed over, because AG-3 of table T-035 makes a
        // bundle all-or-nothing -- a silent skip would let that bundle report
        // success for a rename that renamed nothing. The choice is this file's.
        return refused([
          reject('CM-41', 'FR-008', `no resource with uid ${command.uid} is in the document`),
        ])
      }
      // FR-063: the revision may only rise for a write that moved the schedule
      // group. Renaming to the name already held moves nothing, so the same
      // document goes back untouched.
      if (held.name === command.name) return edited(document)
      // ⚠️ The MUST to say how many tasks change with the name is NOT this
      // file's: CP-9 leaves the aggregate to validate and return a document,
      // and NT-3 of table T-037 (FR-076) owns the notice and its count --
      // "担当者名の波及" is one of the examples that row names.
      return edited(
        withSchedule(document, {
          resources: resources.map((one) =>
            one.uid === command.uid ? { ...one, name: command.name } : one,
          ),
        }),
      )
    }

    case 'deleteResource': {
      // ⚠️ This deletes the uids it was handed and no others, so it is not the
      // entrance FR-099 forbids ("一覧のすべてを 1 つの操作で消す入口を設けて
      // はならない"). The same requirement puts select-all beside the roster
      // and says deleting after it "同じことができ" -- which is this command
      // with every uid in the list.
      if (command.uids.length === 0) return edited(document)
      const missing = command.uids.filter((uid) => !resources.some((one) => one.uid === uid))
      if (missing.length > 0) {
        return refused(
          // ⛔ NOT DECIDED. FR-099 says nothing about a uid naming no resource;
          // refused for the reason written out at CM-41 above.
          missing.map((uid) =>
            reject('CM-42', 'FR-099', `no resource with uid ${uid} is in the document`),
          ),
        )
      }
      const going = new Set(command.uids)
      // CD-5 of table T-050: what goes with the 担当者 is the assignments that
      // point AT it. ⚠️ The Tasks do not go -- "担当が外れるだけである". So no
      // `Task`, `TaskGroupMember` or `TaskVisual` is touched here.
      //
      // ⚠️ FR-099 lets a referenced 担当者 be deleted -- that is why it requires
      // a confirmation naming the tasks that come free. Asking is the screen's
      // business (CP-9 settles nothing), so this file does not gate on it.
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
      // FR-008 forbids GRS clearing these away by itself (MUST NOT) and then
      // requires this entrance in the same breath: "どの割当からも参照されて
      // いない担当者を作成者が明示して削除できること（MUST）". FR-099 makes it
      // one of the roster's two ways to delete.
      const referenced = new Set(
        assignments.flatMap((one) => (one.resourceUid === null ? [] : [one.resourceUid])),
      )
      const kept = resources.filter((one) => referenced.has(one.uid))
      // Nothing was unreferenced: the schedule must keep its reference so
      // FR-063 does not raise the revision for a sweep that swept nothing.
      if (kept.length === resources.length) return edited(document)
      // ⚠️ No assignment is touched. CD-5's cascade has nothing to do here --
      // every resource that goes is one no assignment points at.
      return edited(withSchedule(document, { resources: kept }))
    }

    case 'createAssignment': {
      const refusals: Refusal[] = []
      // IV-2 of table T-220: a foreign key that is not null points at a row in
      // the same document. AT-93 and AT-94 are both FK columns, so an
      // assignment onto a uid the document does not hold would leave the
      // document broken the moment it was written.
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
      // FR-008: "同じ `Task` と同じ `Resource` の組の割当を 2 つ作ってはならな
      // い（MUST NOT）" -- MG-5 of table T-032 already folds such a pair into
      // one on the merge side, and without the same ban on the screen side the
      // result of one operation would depend on whether a merge had been run.
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
      // ⚠️ Every assignment of the pair goes, not the first one found:
      // FR-008's MUST NOT binds what is CREATED here, so a document that
      // arrived from outside may still hold two of them, and leaving one behind
      // would mean the 担当者 was still on the task after being taken off it.
      const kept = assignments.filter(
        (one) => !(one.taskUid === command.taskUid && one.resourceUid === command.resourceUid),
      )
      if (kept.length === assignments.length) {
        // ⛔ NOT DECIDED. FR-008 says nothing about a pair that holds no
        // assignment; refused for the reason written out at CM-41 above.
        return refused([
          reject(
            'CM-45',
            'FR-008',
            `task ${command.taskUid} holds no assignment of resource ${command.resourceUid}`,
          ),
        ])
      }
      // ⚠️ The `Resource` is left standing even when this was its last
      // assignment: FR-008 makes that a MUST ("割当を解除しても担当者そのもの
      // は残すこと") and forbids the automatic sweep (MUST NOT). CM-43 is the
      // one entrance that takes an unreferenced 担当者 away.
      return edited(withSchedule(document, { assignments: kept }))
    }
  }
}

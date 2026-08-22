// EditDocument -- the Dependency aggregate.
//
// @unit      UF-13  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure
//
// The three commands table T-108 puts in the `Dependency` group: CM-36 to
// CM-38.
//
// ⚠️ A dependency is held on the SUCCESSOR. AT-42 puts the array on `Task`,
// and AT-45 says of `predecessorUid` that "後続は入れ子の位置が表す" -- the
// successor is the task whose array the row sits in, so no column names it.
// Every command here therefore names one dependency by the pair (predecessor,
// successor), which is also the pair FR-009 allows only once.
//
// ⚠️ All three commands reach the schedule group, so all three rebuild
// `document.schedule` -- but ONLY when they changed something. FR-063 moves
// the schedule instant by that reference, so a command that wrote nothing
// gives the same document back untouched.
//
// ⚠️ This file validates and returns a new Document. It settles nothing
// (CP-9), and it is not the public entry of its component (Chapter 5.3,
// MUST NOT) -- `edit-document.ts` re-exports what leaves.

import type { Document } from '../../entity/document-model/document/document'
import type { Dependency, Task } from '../../entity/document-model/schedule/schedule'
import { taskByUid } from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited } from './edit-document'

/**
 * Which edge of a bar the line was drawn out of, and which it was drawn into.
 *
 * ⚠️ FR-009 has the hit test answer with the LEFT HALF or the RIGHT HALF of
 * the task -- "左半分が開始側、右半分が終了側" -- and forbids deciding it by a
 * grab margin at the endpoints (MUST NOT), because a bar squeezed to a few px
 * at low zoom could then not be grabbed at all. Reading that half off the
 * pointer belongs to the caller; what arrives here is the edge it means, so
 * the Agent API can name one directly (FR-028).
 */
export type DependencyEdge = 'start' | 'finish'

/**
 * CM-36 to CM-38 of table T-108.
 *
 * ⚠️ CM-36 carries no `linkType`. FR-009 makes the pair of edges correspond
 * one-to-one with the four rows of table T-018 and then says, in as many
 * words, "種別を選ぶ入口を別に設けない" -- a `linkType` parameter would BE
 * that entrance.
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
      /**
       * ⚠️ Not nullable, though AT-47 is: S-117 gives 0 the meaning
       * "間を空けない", so a second spelling of "no lag" would carry nothing
       * the number 0 does not already carry.
       */
      readonly lag: number
    }

/**
 * The row of table T-018 a pair of edges falls on, as its `linkType`.
 *
 * The codes are the exchange partner's, fixed by AT-46 (`0` = FF, `1` = FS,
 * `2` = SF, `3` = SS) -- they are not this file's spelling and are not sorted
 * in any order of its own. Every pair lands on exactly one row, which is what
 * FR-009 means by "4 行のいずれか 1 つに必ず落ちる".
 *
 * @purity pure
 */
function linkTypeOf(from: DependencyEdge, into: DependencyEdge): number {
  if (from === 'finish') return into === 'start' ? 1 : 0 // DP-1 FS / DP-3 FF
  return into === 'finish' ? 2 : 3 //                       DP-2 SF / DP-4 SS
}

/** @purity pure */
function reject(command: string, rule: string, what: string): Refusal {
  return { command, rule, what }
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

      // FR-009 forbids three dependencies outright (MUST NOT), and they are
      // pushed in the order the requirement lists them. All three are
      // collected before any is answered: NT-1 of FR-076 wants the person
      // told WHICH item is wrong and why, and answering one at a time makes
      // the caller learn the list one round trip at a time.
      if (command.predecessorUid === command.successorUid) {
        refusals.push(
          reject('CM-36', 'FR-009', `one task may not be both ends: UID ${command.predecessorUid}`),
        )
      }
      // The duplicate rule. Its 組 is the pair of ends and NOT the kind of
      // link -- "先行と後続の対を指す。種別は問わない" -- so the successor's
      // array is searched by `predecessorUid` alone and an FS between two
      // tasks blocks an SS between the same two.
      //
      // ⚠️ The pair is ordered. A dependency the other way round, from the
      // successor back to the predecessor, is a different pair and is not
      // refused here.
      if (successor !== null &&
          successor.dependencies.some((one) => one.predecessorUid === command.predecessorUid)) {
        refusals.push(
          reject('CM-36', 'FR-009',
                 `a dependency from ${command.predecessorUid} to ${command.successorUid} already exists`),
        )
      }
      // "タスクでもマイルストーンでもないものを端点にするもの". A milestone is
      // a `Task` in this model -- AT-30 is a column of `Task`, not an entity
      // of its own -- so the two kinds FR-009 admits are exactly the rows of
      // `schedule.tasks`. A UID reaching none of them names a row, an
      // annotation, or nothing at all. IV-2 would refuse the same value later
      // as a dangling foreign key; catching it here is what lets the refusal
      // name which endpoint was wrong.
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

      // FR-009: "マイルストーンが端に来る依存は、画面上で作るとき FS とする
      // こと（MUST）" -- a milestone is a point, so the four date relations
      // collapse into one.
      //
      // ⚠️ This folds the type ON THE WAY IN and nowhere else. The same
      // requirement forbids rewriting the type of an IMPORTED dependency
      // (MUST NOT), which is why no sweep over the document does this.
      const milestoneEnd = predecessor.milestone === true || successor.milestone === true
      const linkType = milestoneEnd
        ? 1 // DP-1 FS
        : linkTypeOf(command.predecessorEdge, command.successorEdge)

      const dependency: Dependency = {
        predecessorUid: command.predecessorUid,
        linkType,
        // S-117 of table T-213, the value a new dependency is given. It is
        // read from the document rather than written in here, because that is
        // where the settings row lives.
        //
        // ⚠️ The lag is held and nothing more: FR-009 says it "日付を自動で
        // 動かさない", so no date below is touched.
        lag: document.documentSettings.dependencyLagDefault,
        // ⛔ MISSING: S-118 fixes the unit of a lag at 稼働日, but nothing in
        // the specification says which `LagFormat` code (AT-48 -- the exchange
        // partner's enumeration) spells that unit, so a dependency GRS made
        // itself can hold no unit. `null` here means "no value held", which is
        // what AT-48 being nullable admits; it does NOT claim a unit.
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
      // CD-3 of table T-050: a dependency takes nothing with it. Both tasks
      // stay, and so does everything pointing at them.
      const kept = held.filter((one) => one.predecessorUid !== command.predecessorUid)
      if (successor === null || kept.length === held.length) {
        // The pair names no dependency, so the document already stands as the
        // command asks. The SAME document comes back: its `schedule` reference
        // does not move, and FR-063 therefore leaves the schedule instant alone.
        return edited(document)
      }
      return edited(withTask(document, { ...successor, dependencies: kept }))
    }

    case 'setDependencyLag': {
      const successor = taskByUid(schedule, command.successorUid)
      const held = successor?.dependencies
        .find((one) => one.predecessorUid === command.predecessorUid) ?? null
      if (successor === null || held === null) {
        // Unlike CM-37, there is no state in which this command has already
        // had its way: the lag was asked for and cannot be written, so AG-8
        // has the caller told rather than answered with an untouched document.
        return refused([
          reject('CM-38', 'FR-009',
                 `no dependency runs from ${command.predecessorUid} to ${command.successorUid}`),
        ])
      }
      // AT-47 types the lag as an integer. Table T-213 leaves S-117's lower
      // and upper columns empty, so no range is checked and a negative lag --
      // a lead -- is accepted.
      if (!Number.isInteger(command.lag)) {
        return refused([reject('CM-38', 'AT-47', `lag must be an integer: ${command.lag}`)])
      }
      if (held.lag === command.lag) {
        // Nothing changed, so nothing is rebuilt (FR-063).
        return edited(document)
      }

      // ⚠️ Table T-108 marks CM-38 with ⭐, which by that table's own note
      // means a MUST spanning several columns was folded into one command.
      // The table does not name those columns, and the two candidates are
      // exactly the two things below that the specification does not decide.
      // Only `lag` is written.
      //
      // ⛔ MISSING: FR-009 keeps an imported type as it stands ("取り込んだ
      // 依存の種別は書き換えてはならない", MUST NOT) and folds it to FS
      // "人がその依存を編集したときに限り". Table T-108 gives this aggregate
      // no other edit -- the lag is the only column of an existing dependency
      // a person can reach -- so whether a lag change IS that 編集 is decided
      // nowhere. `linkType` is left exactly as it stands, which is the half
      // the MUST NOT does decide.
      //
      // ⛔ MISSING: `lagFormat` is left as it stands, for the same reason it
      // is null in CM-36 -- no code for 稼働日 exists to write. Where an
      // imported dependency carries a unit that is not the working day, the
      // number a person just entered is stored under that other unit.
      const dependencies = successor.dependencies.map((one) =>
        one.predecessorUid === command.predecessorUid ? { ...one, lag: command.lag } : one,
      )
      return edited(withTask(document, { ...successor, dependencies }))
    }
  }
}

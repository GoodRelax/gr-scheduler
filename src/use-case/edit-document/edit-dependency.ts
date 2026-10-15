// EditDocument: the Dependency commands of table T-108.
// @unit      UF-13  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import { SETTINGS_CONSTANTS } from '../../entity/document-model/document-settings/document-settings'
import type { Dependency, Task } from '../../entity/document-model/schedule/schedule'
import {
  lagOfWorkingDays,
  minutesPerWorkingDayOf,
  taskByUid,
  TENTHS_OF_A_MINUTE,
  withoutDependencyAt,
  WORKING_DAY_LAG_FORMAT,
} from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited, reject } from './edit-document'

export type DependencyEdge = 'start' | 'finish'

// <generated -- do not edit by hand>
// From docs/spec/_source/document-commands.json (table T-108, DependencyCommand).
// see T-108
export interface WorkingDayLag {
  readonly lagWorkingDays: number
}

// see T-108
export interface TypedLag {
  readonly lagMinutes: number
  readonly lagUnit: 'd' | 'h' | 'm'
}

// see T-108
export type DependencyCommand =
  | {
      readonly kind: 'createDependency'
      readonly predecessorUid: Dependency['predecessorUid']
      readonly successorUid: Task['uid']
      readonly predecessorEdge: 'start' | 'finish'
      readonly successorEdge: 'start' | 'finish'
    }
  | {
      readonly kind: 'deleteDependency'
      readonly predecessorUid: Dependency['predecessorUid']
      readonly successorUid: Task['uid']
    }
  | {
      readonly kind: 'deleteDependencyAt'
      readonly predecessorUid: Dependency['predecessorUid']
      readonly successorUid: Task['uid']
      readonly order: number
    }
  | ({
      readonly kind: 'setDependencyLag'
      readonly predecessorUid: Dependency['predecessorUid']
      readonly successorUid: Task['uid']
    } & (WorkingDayLag | TypedLag))
// </generated>

// see FR-009, TX-3, TX-10
export type TypedLagUnit = TypedLag['lagUnit']

// see FR-009, AT-48
// WHY: the codes are mspdi_pj12.xsd's LagFormat: 7 working days, 5 hours, 3 minutes.
const LAG_FORMAT_OF_UNIT: Readonly<Record<TypedLagUnit, number>> = { d: WORKING_DAY_LAG_FORMAT, h: 5, m: 3 }

/** @purity pure */
function linkTypeOf(from: DependencyEdge, into: DependencyEdge): number {
  if (from === 'finish') return into === 'start' ? 1 : 0
  return into === 'finish' ? 2 : 3
}

// see FR-009, RT-4a
/** @purity pure */
function planlessEndRefusals(ends: readonly (Task | null)[]): Refusal[] {
  return ends.flatMap((end) =>
    end === null || (end.start !== null && end.finish !== null)
      ? []
      : [reject('CM-36', 'FR-009', `task UID ${end.uid} has no plan dates`)])
}

/** @purity pure */
function withTask(document: Document, task: Task): Document {
  const tasks = document.schedule.tasks.map((one) => (one.uid === task.uid ? task : one))
  return { ...document, schedule: { ...document.schedule, tasks } }
}

// see CM-36, CM-37, CM-93, CM-38, FR-009, AT-47
/** @purity pure */
export function editDependency(document: Document, command: DependencyCommand): EditResult {
  const schedule = document.schedule

  switch (command.kind) {
    case 'createDependency': {
      const predecessor = taskByUid(schedule, command.predecessorUid)
      const successor = taskByUid(schedule, command.successorUid)
      const refusals: Refusal[] = planlessEndRefusals([predecessor, successor])

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
        linkLag: lagOfWorkingDays(SETTINGS_CONSTANTS.dependencyLagDefault, minutesPerWorkingDayOf(schedule.project)),
        lagFormat: WORKING_DAY_LAG_FORMAT,
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

    case 'deleteDependencyAt':
      return withOneLineDeleted(document, command)

    case 'setDependencyLag':
      return withLagSet(document, command)
  }
}

// see CM-93, FR-155, FA-3
// WHY: a line named by its order that is not there is refused rather than passed over, so a bundle built on another
// document cannot delete a line nobody named.
/** @purity pure */
function withOneLineDeleted(document: Document, command: Extract<DependencyCommand, { kind: 'deleteDependencyAt' }>): EditResult {
  const successor = taskByUid(document.schedule, command.successorUid)
  const kept = successor === null ? null : withoutDependencyAt(successor, command.predecessorUid, command.order)
  if (kept === null) {
    return refused([
      reject('CM-93', 'FR-155',
             `no dependency number ${command.order} runs from ${command.predecessorUid} to ${command.successorUid}`),
    ])
  }
  return edited(withTask(document, kept))
}

// see CM-38, FR-009, AT-47
/** @purity pure */
function withLagSet(document: Document, command: Extract<DependencyCommand, { kind: 'setDependencyLag' }>): EditResult {
  const schedule = document.schedule
  const successor = taskByUid(schedule, command.successorUid)
  const held = successor?.dependencies
    .find((one) => one.predecessorUid === command.predecessorUid) ?? null
  if (successor === null || held === null) {
    return refused([
      reject('CM-38', 'FR-009',
             `no dependency runs from ${command.predecessorUid} to ${command.successorUid}`),
    ])
  }
  const written = writtenLagOf(command, minutesPerWorkingDayOf(schedule.project))
  if (typeof written === 'string') return refused([reject('CM-38', 'FR-009', written)])
  if (held.linkLag === written.linkLag && held.lagFormat === written.lagFormat) {
    return edited(document)
  }

  const dependencies = successor.dependencies.map((one) =>
    one.predecessorUid === command.predecessorUid ? { ...one, ...written } : one,
  )
  return edited(withTask(document, { ...successor, dependencies }))
}

// see FR-009, AT-47, AT-48
// WHY: a string is the refusal's reason; the lag is held in tenths of a minute whatever unit was typed.
/** @purity pure */
function writtenLagOf(lag: WorkingDayLag | TypedLag, minutesPerDay: number): Pick<Dependency, 'linkLag' | 'lagFormat'> | string {
  if ('lagMinutes' in lag) {
    const lagFormat = LAG_FORMAT_OF_UNIT[lag.lagUnit] as number | undefined
    if (lagFormat === undefined) return `lag unit must be d, h or m: ${String(lag.lagUnit)}`
    if (!Number.isInteger(lag.lagMinutes)) return `lag must be whole minutes: ${lag.lagMinutes}`
    return { linkLag: lag.lagMinutes * TENTHS_OF_A_MINUTE, lagFormat }
  }
  if (!Number.isInteger(lag.lagWorkingDays)) return `lag must be whole working days: ${lag.lagWorkingDays}`
  return { linkLag: lagOfWorkingDays(lag.lagWorkingDays, minutesPerDay), lagFormat: WORKING_DAY_LAG_FORMAT }
}

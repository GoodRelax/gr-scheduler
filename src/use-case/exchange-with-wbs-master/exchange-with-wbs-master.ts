// File: ExchangeWithWbsMaster: picks the tasks that use case UC-010 drops for an unusable date, and tells work values apart.
// @unit      UF-217  (docs/spec/05-07-design.md, table T-075)
// @component ExchangeWithWbsMaster, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-51

import type { Document } from '../../entity/document-model/document/document'
import type { Task } from '../../entity/document-model/schedule/schedule'

const WORK_COLUMN = 'Work'

const UNUSABLE_DATE_RULES: ReadonlySet<string> = new Set(['IV-14'])

const TASK_REFUSAL_PREFIX = '/schedule/tasks/'

/** @purity pure */
function taskIndexOfRefusal(at: string): number | null {
  if (!at.startsWith(TASK_REFUSAL_PREFIX)) return null
  const rest = at.slice(TASK_REFUSAL_PREFIX.length)
  const cut = rest.indexOf('/')
  if (cut <= 0) return null
  const index = Number(rest.slice(0, cut))
  return Number.isInteger(index) && index >= 0 ? index : null
}

// Provisional: OPQ-25
// Spec: UC-010, FR-023, CD-1
/** @purity pure */
export function taskUidsWithAnUnusableDate(
  refusals: readonly { readonly rule: string; readonly at: string }[],
  tasks: readonly Task[],
): ReadonlySet<number> {
  const seeds = new Set<number>()
  for (const refusal of refusals) {
    if (!UNUSABLE_DATE_RULES.has(refusal.rule)) continue
    const index = taskIndexOfRefusal(refusal.at)
    if (index === null) continue
    const task = tasks[index]
    if (task === undefined) continue
    seeds.add(task.uid)
  }
  return seeds
}

// Provisional: OPQ-25
// Spec: UC-010, EX-3
/** @purity pure */
export function holdsWorkValues(document: Document): boolean {
  return document.schedule.tasks.some((task) => task.carry[WORK_COLUMN] !== undefined)
}

// File: OperateThroughAgentApi: reads a refusal of the write path as the reason and rule use case UC-012 hands the agent.
// @unit      UF-220  (docs/spec/05-07-design.md, table T-075)
// @component OperateThroughAgentApi, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-54

import type { PlanRefusal, ReplacementRefusal } from '../apply-document-change/apply-document-change'

export type WriteRefusalReason =
  | 'staleStamp'
  | 'commandRefused'
  | 'notOwnStep'
  | Extract<PlanRefusal, { readonly step: 'WS-2' }>['reason']

// Provisional: OPQ-25
// Spec: UC-012, AV-4, WS-1, WS-2, WS-3
/** @purity pure */
export function reasonOfPlanRefusal(refusal: PlanRefusal): WriteRefusalReason {
  switch (refusal.step) {
    case 'WS-1':
      return 'staleStamp'
    case 'WS-2':
      return refusal.reason
    case 'WS-3':
      return 'commandRefused'
  }
}

// Provisional: OPQ-25
// Spec: UC-012, AG-2, AG-3, AG-9
/** @purity pure */
export function ruleOfPlanRefusal(refusal: PlanRefusal): string {
  switch (refusal.step) {
    case 'WS-1':
      return 'AG-2'
    case 'WS-2':
      return refusal.reason === 'deliveringNotices' ? 'Chapter 5.5' : 'AG-9'
    case 'WS-3':
      return 'AG-3'
  }
}

// Provisional: OPQ-25
// Spec: UC-012, AV-4, AG-10
// Why: commandRefused for an empty side of the history: AV-4 has no reason of its own, and notAvailable means a missing component.
/** @purity pure */
export function reasonOfStepRefusal(refusal: ReplacementRefusal): WriteRefusalReason {
  if (refusal.step !== 'WS-3') return reasonOfPlanRefusal(refusal)
  return refusal.reason === 'notOwnStep' ? 'notOwnStep' : 'commandRefused'
}

// Provisional: OPQ-25
// Spec: UC-012, AG-10, FR-031
/** @purity pure */
export function stepRefusalWhat(refusal: ReplacementRefusal): string {
  if (refusal.step !== 'WS-3') return `${refusal.step} refused it; the rule is ${ruleOfPlanRefusal(refusal)}`
  if (refusal.reason === 'notOwnStep') return 'AG-10: the step was written by another writer, not by you'
  return 'FR-031: the history holds no step to move'
}

// AgentApiValues: the Agent API region of the session and its transitions.
// @unit      UF-125  (docs/spec/05-07-design.md, table T-075)
// @component AdvanceScreenSession, layer UseCase (table T-062)
// @purity    pure
// Generated region below the carried-value and effect types: docs/spec/_source/state-machines.json. Do not edit by hand; npm run gen.

import { NO_EFFECTS, unchanged, type Step } from './session-step'

export interface AgentApiValuesEventCarried {
  readonly isRememberedEnabled: boolean
}

export type AgentApiValuesEffect =
  | { readonly type: Exclude<AgentApiValuesEffectName, 'raiseNotice'> }
  | { readonly type: 'raiseNotice'; readonly reason: 'RS-20' }

// <generated -- do not edit by hand>
// From docs/spec/_source/state-machines.json, region agentApi (table T-296).
// Rebuild: npm run gen (tools/generate_state_machine_types.py).

export type AgentApiValuesKey =
  | 'agentApi'
  | 'agentApiEnablingStateMachine.disabled'
  | 'agentApiEnablingStateMachine.enabled'

export type AgentApiEnablingState =
  | { readonly kind: 'disabled' }
  | { readonly kind: 'enabled' }

export interface AgentApiValues {
  readonly agentApiEnablingState: AgentApiEnablingState
}

export type AgentApiValuesAxes = Omit<AgentApiValues, never>

export type AgentApiValuesEvent =
  | { readonly type: 'agentApiEntryPressed' }
  | { readonly type: 'rememberedEnablingLoaded'; readonly isRememberedEnabled: AgentApiValuesEventCarried['isRememberedEnabled'] }

export type AgentApiValuesEffectName =
  | 'storeAgentApiEnabling'
  | 'raiseNotice'

const AGENT_API_VALUES_INITIAL_AXES: AgentApiValuesAxes = {
  agentApiEnablingState: { kind: 'disabled' },
}
// </generated>

type AgentApiStep = Step<AgentApiValues, AgentApiValuesEffect>

type EventOf<T extends AgentApiValuesEvent['type']> = Extract<AgentApiValuesEvent, { readonly type: T }>

const ENABLED: AgentApiEnablingState = { kind: 'enabled' }

// see T-296
export const emptyAgentApiValues: AgentApiValues = { ...AGENT_API_VALUES_INITIAL_AXES }

// WHY: the root cell stores the value after the press (S-99b); only turning it off tells RS-20 (FR-065).
/** @purity pure */
function onAgentApiEntryPressed(values: AgentApiValues): AgentApiStep {
  if (values.agentApiEnablingState.kind === 'disabled') {
    return { state: { ...values, agentApiEnablingState: ENABLED }, effects: [{ type: 'storeAgentApiEnabling' }] }
  }
  return {
    state: { ...values, agentApiEnablingState: AGENT_API_VALUES_INITIAL_AXES.agentApiEnablingState },
    effects: [{ type: 'storeAgentApiEnabling' }, { type: 'raiseNotice', reason: 'RS-20' }],
  }
}

/** @purity pure */
function isRememberedEnabled(event: EventOf<'rememberedEnablingLoaded'>): boolean {
  return event.isRememberedEnabled
}

// WHY: the startup read of S-99b comes back as an event; it neither stores nor tells anything.
/** @purity pure */
function onRememberedEnablingLoaded(values: AgentApiValues, event: EventOf<'rememberedEnablingLoaded'>): AgentApiStep {
  if (values.agentApiEnablingState.kind !== 'disabled' || !isRememberedEnabled(event)) return unchanged(values)
  return { state: { ...values, agentApiEnablingState: ENABLED }, effects: NO_EFFECTS }
}

const HANDLERS: {
  readonly [T in AgentApiValuesEvent['type']]: (values: AgentApiValues, event: EventOf<T>) => AgentApiStep
} = {
  agentApiEntryPressed: onAgentApiEntryPressed,
  rememberedEnablingLoaded: onRememberedEnablingLoaded,
}

// see SF-2, SF-8, T-296
/** @purity pure */
export function stepAgentApiValues(values: AgentApiValues, event: AgentApiValuesEvent): AgentApiStep {
  const handler = HANDLERS[event.type] as (values: AgentApiValues, event: AgentApiValuesEvent) => AgentApiStep
  return handler(values, event)
}

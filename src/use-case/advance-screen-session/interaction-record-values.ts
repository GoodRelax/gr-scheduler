// InteractionRecordValues: the interaction-record region of the session and its transitions.
// @unit      UF-124  (docs/spec/05-07-design.md, table T-075)
// @component AdvanceScreenSession, layer UseCase (table T-062)
// @purity    pure
// Generated region below the effect type: docs/spec/_source/state-machines.json. Do not edit by hand; npm run gen.

import type { Step } from './session-step'

export type InteractionRecordValuesEffect = { readonly type: InteractionRecordValuesEffectName }

// <generated -- do not edit by hand>
// From docs/spec/_source/state-machines.json, region interactionRecord (table T-295).
// Rebuild: npm run gen (tools/generate_state_machine_types.py).

export type InteractionRecordValuesKey =
  | 'interactionRecord'
  | 'interactionRecordingStateMachine.notRecording'
  | 'interactionRecordingStateMachine.recordingInteractions'

export type InteractionRecordingState =
  | { readonly kind: 'notRecording' }
  | { readonly kind: 'recordingInteractions' }

export interface InteractionRecordValues {
  readonly interactionRecordingState: InteractionRecordingState
}

export type InteractionRecordValuesAxes = Omit<InteractionRecordValues, never>

export type InteractionRecordValuesEvent =
  | { readonly type: 'interactionRecordToggled' }

export type InteractionRecordValuesEffectName =
  | 'beginInteractionRecord'
  | 'handInteractionRecordToClipboard'

const INTERACTION_RECORD_VALUES_INITIAL_AXES: InteractionRecordValuesAxes = {
  interactionRecordingState: { kind: 'notRecording' },
}
// </generated>

type InteractionRecordStep = Step<InteractionRecordValues, InteractionRecordValuesEffect>

// see T-295
export const emptyInteractionRecordValues: InteractionRecordValues = { ...INTERACTION_RECORD_VALUES_INITIAL_AXES }

// WHY: one entrance both begins and stops (FR-102, IC-76); the record's lines stay with the shell.
/** @purity pure */
function onInteractionRecordToggled(values: InteractionRecordValues): InteractionRecordStep {
  if (values.interactionRecordingState.kind === 'notRecording') {
    return {
      state: { ...values, interactionRecordingState: { kind: 'recordingInteractions' } },
      effects: [{ type: 'beginInteractionRecord' }],
    }
  }
  return {
    state: { ...values, interactionRecordingState: INTERACTION_RECORD_VALUES_INITIAL_AXES.interactionRecordingState },
    effects: [{ type: 'handInteractionRecordToClipboard' }],
  }
}

const HANDLERS: {
  readonly [T in InteractionRecordValuesEvent['type']]: (values: InteractionRecordValues) => InteractionRecordStep
} = {
  interactionRecordToggled: onInteractionRecordToggled,
}

// see SF-2, SF-8, T-295
/** @purity pure */
export function stepInteractionRecordValues(
  values: InteractionRecordValues,
  event: InteractionRecordValuesEvent,
): InteractionRecordStep {
  return HANDLERS[event.type](values)
}

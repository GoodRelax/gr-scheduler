// NoticeValues: the notices region of the session and its transitions.
// @unit      UF-87   (docs/spec/05-07-design.md, table T-075)
// @component AdvanceScreenSession, layer UseCase (table T-062)
// @purity    pure
// Generated region below the carried-value types: docs/spec/_source/state-machines.json. Do not edit by hand; npm run gen.

import { NO_EFFECTS, unchanged, type Step } from './session-step'

// see NT-3, IR-3
export interface StandingNotice {
  readonly reason: string
  readonly affectedCount: number | null
}

export interface NoticeValuesStateCarried {
  readonly standing: readonly StandingNotice[]
}

export interface NoticeValuesEventCarried {
  readonly reason: string
  readonly affectedCount: number | null
  readonly silentWatchers: number
}

interface NoticeValuesEffectPayloads {
  readonly raiseNotice: { readonly reason: 'RS-23' }
}

export type NoticeValuesEffect = {
  readonly [N in NoticeValuesEffectName]: { readonly type: N } & NoticeValuesEffectPayloads[N]
}[NoticeValuesEffectName]

// <generated -- do not edit by hand>
// From docs/spec/_source/state-machines.json, region notices (table T-286).
// Rebuild: npm run gen (tools/generate_state_machine_types.py).

export type NoticeValuesKey =
  | 'notices'
  | 'noticeDisplayStateMachine.hidden'
  | 'noticeDisplayStateMachine.shown'
  | 'changeDeliveryStateMachine.idle'
  | 'changeDeliveryStateMachine.delivering'

export type NoticeDisplayState =
  | { readonly kind: 'hidden' }
  | { readonly kind: 'shown'; readonly standing: NoticeValuesStateCarried['standing'] }

export type ChangeDeliveryState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'delivering' }

export interface NoticeValues {
  readonly noticeDisplayState: NoticeDisplayState
  readonly changeDeliveryState: ChangeDeliveryState
}

export type NoticeValuesAxes = Omit<NoticeValues, never>

export type NoticeValuesEvent =
  | { readonly type: 'noticeRaised'; readonly reason: NoticeValuesEventCarried['reason']; readonly affectedCount: NoticeValuesEventCarried['affectedCount'] }
  | { readonly type: 'newestNoticeDismissAsked' }
  | { readonly type: 'noticeDismissPressed'; readonly reason: NoticeValuesEventCarried['reason'] }
  | { readonly type: 'documentReplaced' }
  | { readonly type: 'changeDelivered'; readonly silentWatchers: NoticeValuesEventCarried['silentWatchers'] }

export type NoticeValuesEffectName =
  | 'raiseNotice'

export interface NoticeValuesTransition {
  readonly state: NoticeValuesKey
  readonly event: NoticeValuesEvent['type']
  readonly guard: string | null
  readonly to: string
  readonly effect: NoticeValuesEffectName | null
  readonly effectArgument: string | null
}

const NOTICE_VALUES_INITIAL_AXES: NoticeValuesAxes = {
  noticeDisplayState: { kind: 'hidden' },
  changeDeliveryState: { kind: 'idle' },
}

export const NOTICE_VALUES_TRANSITIONS: readonly NoticeValuesTransition[] = [
  {
    state: 'noticeDisplayStateMachine.hidden',
    event: 'noticeRaised',
    guard: null,
    to: 'noticeDisplayStateMachine.shown',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'noticeDisplayStateMachine.shown',
    event: 'noticeRaised',
    guard: 'isSameReasonStanding',
    to: 'noticeDisplayStateMachine.shown',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'noticeDisplayStateMachine.shown',
    event: 'noticeRaised',
    guard: 'not isSameReasonStanding',
    to: 'noticeDisplayStateMachine.shown',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'noticeDisplayStateMachine.shown',
    event: 'newestNoticeDismissAsked',
    guard: 'isOnlyOneStanding',
    to: 'noticeDisplayStateMachine.hidden',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'noticeDisplayStateMachine.shown',
    event: 'newestNoticeDismissAsked',
    guard: 'not isOnlyOneStanding',
    to: 'noticeDisplayStateMachine.shown',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'noticeDisplayStateMachine.shown',
    event: 'noticeDismissPressed',
    guard: 'isLeavingNone',
    to: 'noticeDisplayStateMachine.hidden',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'noticeDisplayStateMachine.shown',
    event: 'noticeDismissPressed',
    guard: 'isLeavingSome',
    to: 'noticeDisplayStateMachine.shown',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'changeDeliveryStateMachine.idle',
    event: 'documentReplaced',
    guard: null,
    to: 'changeDeliveryStateMachine.delivering',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'changeDeliveryStateMachine.delivering',
    event: 'changeDelivered',
    guard: 'not hasSilentWatcher',
    to: 'changeDeliveryStateMachine.idle',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'changeDeliveryStateMachine.delivering',
    event: 'changeDelivered',
    guard: 'hasSilentWatcher',
    to: 'changeDeliveryStateMachine.idle',
    effect: 'raiseNotice',
    effectArgument: 'RS-23',
  },
]
// </generated>

type NoticeStep = Step<NoticeValues, NoticeValuesEffect>

type EventOf<T extends NoticeValuesEvent['type']> = Extract<NoticeValuesEvent, { readonly type: T }>

// see T-286
export const emptyNoticeValues: NoticeValues = { ...NOTICE_VALUES_INITIAL_AXES }

// WHY: an empty list is the kind `hidden`, so a `shown` kind never holds an empty list.
/** @purity pure */
function withStanding(values: NoticeValues, standing: readonly StandingNotice[]): NoticeStep {
  const onScreen: NoticeDisplayState = standing.length === 0 ? { kind: 'hidden' } : { kind: 'shown', standing }
  return { state: { ...values, noticeDisplayState: onScreen }, effects: NO_EFFECTS }
}

/** @purity pure */
function withDelivery(
  values: NoticeValues,
  delivery: ChangeDeliveryState,
  effects: readonly NoticeValuesEffect[],
): NoticeStep {
  return { state: { ...values, changeDeliveryState: delivery }, effects }
}

// see T-286, NT-3
/** @purity pure */
function onNoticeRaised(values: NoticeValues, event: EventOf<'noticeRaised'>): NoticeStep {
  const raised = { reason: event.reason, affectedCount: event.affectedCount }
  const standing = values.noticeDisplayState.kind === 'shown' ? values.noticeDisplayState.standing : []
  const same = standing.find((one) => one.reason === event.reason)
  if (same === undefined) return withStanding(values, [...standing, raised])
  // WHY: the gathered notice moves to the end, so newest-first dismissal (NT-8) meets it first.
  const gathered = { reason: same.reason, affectedCount: (same.affectedCount ?? 1) + (event.affectedCount ?? 1) }
  return withStanding(values, [...standing.filter((one) => one !== same), gathered])
}

// see T-286, NT-8
/** @purity pure */
function onNewestNoticeDismissAsked(values: NoticeValues): NoticeStep {
  if (values.noticeDisplayState.kind === 'hidden') return unchanged(values)
  return withStanding(values, values.noticeDisplayState.standing.slice(0, -1))
}

// see T-286, NT-8
/** @purity pure */
function onNoticeDismissPressed(values: NoticeValues, event: EventOf<'noticeDismissPressed'>): NoticeStep {
  if (values.noticeDisplayState.kind === 'hidden') return unchanged(values)
  const standing = values.noticeDisplayState.standing
  const kept = standing.filter((one) => one.reason !== event.reason)
  if (kept.length === standing.length) return unchanged(values)
  return withStanding(values, kept)
}

// see T-286, WS-2
/** @purity pure */
function onDocumentReplaced(values: NoticeValues): NoticeStep {
  if (values.changeDeliveryState.kind === 'delivering') return unchanged(values)
  return withDelivery(values, { kind: 'delivering' }, NO_EFFECTS)
}

// see T-286, RS-23
/** @purity pure */
function onChangeDelivered(values: NoticeValues, event: EventOf<'changeDelivered'>): NoticeStep {
  if (values.changeDeliveryState.kind === 'idle') return unchanged(values)
  const effects: readonly NoticeValuesEffect[] =
    event.silentWatchers > 0 ? [{ type: 'raiseNotice', reason: 'RS-23' }] : NO_EFFECTS
  return withDelivery(values, { kind: 'idle' }, effects)
}

// WHY: the same table form as the screen-values region, so a missing event fails to compile.
const HANDLERS: {
  readonly [T in NoticeValuesEvent['type']]: (values: NoticeValues, event: EventOf<T>) => NoticeStep
} = {
  noticeRaised: onNoticeRaised,
  newestNoticeDismissAsked: onNewestNoticeDismissAsked,
  noticeDismissPressed: onNoticeDismissPressed,
  documentReplaced: onDocumentReplaced,
  changeDelivered: onChangeDelivered,
}

// see SF-2, SF-8, T-286
/** @purity pure */
export function stepNoticeValues(values: NoticeValues, event: NoticeValuesEvent): NoticeStep {
  const handler = HANDLERS[event.type] as (values: NoticeValues, event: NoticeValuesEvent) => NoticeStep
  return handler(values, event)
}

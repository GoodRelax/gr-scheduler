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
// From docs/spec/_source/state-machines.json, region notices (tables T-286 to T-288).
// Rebuild: npm run gen (tools/generate_state_machine_types.py).

export type NoticeValuesKey =
  | 'notices'
  | 'notices.onScreen.none'
  | 'notices.onScreen.standing'
  | 'notices.delivery.idle'
  | 'notices.delivery.delivering'

export type NoticeValuesOnScreen =
  | { readonly kind: 'none' }
  | { readonly kind: 'standing'; readonly standing: NoticeValuesStateCarried['standing'] }

export type NoticeValuesDelivery =
  | { readonly kind: 'idle' }
  | { readonly kind: 'delivering' }

export interface NoticeValues {
  readonly onScreen: NoticeValuesOnScreen
  readonly delivery: NoticeValuesDelivery
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
  readonly id: string
  readonly from: readonly (readonly NoticeValuesKey[])[]
  readonly event: NoticeValuesEvent['type']
  readonly guard: string | null
  readonly to: readonly string[] | 'self'
  readonly effect: NoticeValuesEffectName | null
  readonly effectArgument: string | null
}

const NOTICE_VALUES_INITIAL_AXES: NoticeValuesAxes = {
  onScreen: { kind: 'none' },
  delivery: { kind: 'idle' },
}

export const NOTICE_VALUES_TRANSITIONS: readonly NoticeValuesTransition[] = [
  {
    id: 'TN-54',
    from: [['notices.onScreen.none']],
    event: 'noticeRaised',
    guard: null,
    to: ['notices.onScreen.standing'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-55',
    from: [['notices.onScreen.standing']],
    event: 'noticeRaised',
    guard: 'isSameReasonStanding',
    to: 'self',
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-56',
    from: [['notices.onScreen.standing']],
    event: 'noticeRaised',
    guard: 'not isSameReasonStanding',
    to: 'self',
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-57',
    from: [['notices.onScreen.standing']],
    event: 'newestNoticeDismissAsked',
    guard: 'isOnlyOneStanding',
    to: ['notices.onScreen.none'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-58',
    from: [['notices.onScreen.standing']],
    event: 'newestNoticeDismissAsked',
    guard: 'not isOnlyOneStanding',
    to: 'self',
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-59',
    from: [['notices.onScreen.standing']],
    event: 'noticeDismissPressed',
    guard: 'leavesNone',
    to: ['notices.onScreen.none'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-60',
    from: [['notices.onScreen.standing']],
    event: 'noticeDismissPressed',
    guard: 'leavesSome',
    to: 'self',
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-61',
    from: [['notices.delivery.idle']],
    event: 'documentReplaced',
    guard: null,
    to: ['notices.delivery.delivering'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-62',
    from: [['notices.delivery.delivering']],
    event: 'changeDelivered',
    guard: 'not hasSilentWatcher',
    to: ['notices.delivery.idle'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-63',
    from: [['notices.delivery.delivering']],
    event: 'changeDelivered',
    guard: 'hasSilentWatcher',
    to: ['notices.delivery.idle'],
    effect: 'raiseNotice',
    effectArgument: 'RS-23',
  },
]
// </generated>

type NoticeStep = Step<NoticeValues, NoticeValuesEffect>

type EventOf<T extends NoticeValuesEvent['type']> = Extract<NoticeValuesEvent, { readonly type: T }>

// see T-286
export const emptyNoticeValues: NoticeValues = { ...NOTICE_VALUES_INITIAL_AXES }

// WHY: an empty list is the kind `none`, so a `standing` kind never holds an empty list.
/** @purity pure */
function withStanding(values: NoticeValues, standing: readonly StandingNotice[]): NoticeStep {
  const onScreen: NoticeValuesOnScreen = standing.length === 0 ? { kind: 'none' } : { kind: 'standing', standing }
  return { state: { ...values, onScreen }, effects: NO_EFFECTS }
}

/** @purity pure */
function withDelivery(
  values: NoticeValues,
  delivery: NoticeValuesDelivery,
  effects: readonly NoticeValuesEffect[],
): NoticeStep {
  return { state: { ...values, delivery }, effects }
}

// see TN-54, TN-55, TN-56, NT-3
/** @purity pure */
function onNoticeRaised(values: NoticeValues, event: EventOf<'noticeRaised'>): NoticeStep {
  const raised = { reason: event.reason, affectedCount: event.affectedCount }
  const standing = values.onScreen.kind === 'standing' ? values.onScreen.standing : []
  const same = standing.find((one) => one.reason === event.reason)
  if (same === undefined) return withStanding(values, [...standing, raised])
  // WHY: the gathered notice moves to the end, so newest-first dismissal (NT-8) meets it first.
  const gathered = { reason: same.reason, affectedCount: (same.affectedCount ?? 1) + (event.affectedCount ?? 1) }
  return withStanding(values, [...standing.filter((one) => one !== same), gathered])
}

// see TN-57, TN-58, NT-8
/** @purity pure */
function onNewestNoticeDismissAsked(values: NoticeValues): NoticeStep {
  if (values.onScreen.kind === 'none') return unchanged(values)
  return withStanding(values, values.onScreen.standing.slice(0, -1))
}

// see TN-59, TN-60, NT-8
/** @purity pure */
function onNoticeDismissPressed(values: NoticeValues, event: EventOf<'noticeDismissPressed'>): NoticeStep {
  if (values.onScreen.kind === 'none') return unchanged(values)
  const standing = values.onScreen.standing
  const kept = standing.filter((one) => one.reason !== event.reason)
  if (kept.length === standing.length) return unchanged(values)
  return withStanding(values, kept)
}

// see TN-61, WS-2
/** @purity pure */
function onDocumentReplaced(values: NoticeValues): NoticeStep {
  if (values.delivery.kind === 'delivering') return unchanged(values)
  return withDelivery(values, { kind: 'delivering' }, NO_EFFECTS)
}

// see TN-62, TN-63, RS-23
/** @purity pure */
function onChangeDelivered(values: NoticeValues, event: EventOf<'changeDelivered'>): NoticeStep {
  if (values.delivery.kind === 'idle') return unchanged(values)
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

// see SF-2, SF-8, T-288
/** @purity pure */
export function stepNoticeValues(values: NoticeValues, event: NoticeValuesEvent): NoticeStep {
  const handler = HANDLERS[event.type] as (values: NoticeValues, event: NoticeValuesEvent) => NoticeStep
  return handler(values, event)
}

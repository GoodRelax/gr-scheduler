// NoticeValues: the notices region of the session and its transitions.
// @unit      UF-87   (docs/spec/05-07-design.md, table T-075)
// @component AdvanceScreenSession, layer UseCase (table T-062)
// @purity    pure
// Generated region below the carried-value types: docs/spec/_source/state-machines.json. Do not edit by hand; npm run gen.
// Generated region after it: the notice roster from docs/spec/_source/notice-reasons.json (tables T-233, T-234). Do not edit by hand; npm run gen.

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
  | { readonly type: 'noticeTimeElapsed'; readonly reason: NoticeValuesEventCarried['reason'] }
  | { readonly type: 'newestNoticeDismissAsked' }
  | { readonly type: 'noticeDismissPressed'; readonly reason: NoticeValuesEventCarried['reason'] }
  | { readonly type: 'documentReplaced' }
  | { readonly type: 'changeDelivered'; readonly silentWatchers: NoticeValuesEventCarried['silentWatchers'] }

export type NoticeValuesEffectName =
  | 'raiseNotice'

const NOTICE_VALUES_INITIAL_AXES: NoticeValuesAxes = {
  noticeDisplayState: { kind: 'hidden' },
  changeDeliveryState: { kind: 'idle' },
}
// </generated>

// <generated -- do not edit by hand>
// From docs/spec/_source/notice-reasons.json (tables T-233 and T-234) and the rows of table T-220.
// Rebuild: npm run gen (tools/generate_notice_reasons.py).

// see T-233
export type ReasonRow =
  | 'RS-1'
  | 'RS-2'
  | 'RS-3'
  | 'RS-4'
  | 'RS-5'
  | 'RS-6'
  | 'RS-7'
  | 'RS-8'
  | 'RS-9'
  | 'RS-10'
  | 'RS-11'
  | 'RS-12'
  | 'RS-13'
  | 'RS-14'
  | 'RS-78'
  | 'RS-79'
  | 'RS-80'
  | 'RS-81'
  | 'RS-16'
  | 'RS-19'
  | 'RS-20'
  | 'RS-21'
  | 'RS-22'
  | 'RS-23'
  | 'RS-24'
  | 'RS-25'
  | 'RS-26'
  | 'RS-27'
  | 'RS-28'
  | 'RS-29'
  | 'RS-30'
  | 'RS-31'
  | 'RS-32'
  | 'RS-33'
  | 'RS-34'
  | 'RS-36'
  | 'RS-37'
  | 'RS-38'
  | 'RS-39'
  | 'RS-40'
  | 'RS-41'
  | 'RS-42'
  | 'RS-43'
  | 'RS-44'
  | 'RS-46'
  | 'RS-48'
  | 'RS-63'
  | 'RS-64'
  | 'RS-49'
  | 'RS-50'
  | 'RS-51'
  | 'RS-52'
  | 'RS-53'
  | 'RS-54'
  | 'RS-55'
  | 'RS-56'
  | 'RS-57'
  | 'RS-58'
  | 'RS-82'
  | 'RS-83'
  | 'RS-84'
  | 'RS-85'
  | 'RS-86'
  | 'RS-87'
  | 'RS-88'
  | 'RS-59'
  | 'RS-60'
  | 'RS-61'
  | 'RS-62'
  | 'RS-66'
  | 'RS-65'
  | 'RS-67'
  | 'RS-68'
  | 'RS-69'
  | 'RS-70'
  | 'RS-71'
  | 'RS-72'
  | 'RS-73'
  | 'RS-74'
  | 'RS-75'
  | 'RS-76'
  | 'RS-77'
  | 'RS-15'

// see T-220
export type InvariantRow =
  | 'IV-1'
  | 'IV-2'
  | 'IV-3'
  | 'IV-4'
  | 'IV-5'
  | 'IV-6'
  | 'IV-23'
  | 'IV-7'
  | 'IV-17'
  | 'IV-8'
  | 'IV-9'
  | 'IV-10'
  | 'IV-11'
  | 'IV-12'
  | 'IV-14'
  | 'IV-15'
  | 'IV-16'
  | 'IV-19'
  | 'IV-18'
  | 'IV-20'
  | 'IV-21'
  | 'IV-22'

// see FR-076
export type NoticeReason = ReasonRow | InvariantRow

// see T-234
export type QuestionRow =
  | 'QN-1'
  | 'QN-2'
  | 'QN-3'
  | 'QN-4'
  | 'QN-5'
  | 'QN-9'
  | 'QN-10'
  | 'QN-11'
  | 'QN-12'
  | 'QN-8'

// see T-037
export type NoticeManner =
  | 'NT-1'
  | 'NT-3'
  | 'NT-3a'
  | 'NT-4'
  | 'NT-5'
  | 'NT-6'

// see T-233, T-037
export const NOTICE_MANNER_OF_REASON: Readonly<Record<NoticeReason, NoticeManner>> = {
  'RS-1': 'NT-3a',
  'RS-2': 'NT-3a',
  'RS-3': 'NT-3a',
  'RS-4': 'NT-1',
  'RS-5': 'NT-1',
  'RS-6': 'NT-1',
  'RS-7': 'NT-1',
  'RS-8': 'NT-1',
  'RS-9': 'NT-1',
  'RS-10': 'NT-1',
  'RS-11': 'NT-1',
  'RS-12': 'NT-1',
  'RS-13': 'NT-1',
  'RS-14': 'NT-5',
  'RS-78': 'NT-6',
  'RS-79': 'NT-6',
  'RS-80': 'NT-6',
  'RS-81': 'NT-1',
  'RS-16': 'NT-5',
  'RS-19': 'NT-4',
  'RS-20': 'NT-5',
  'RS-21': 'NT-1',
  'RS-22': 'NT-5',
  'RS-23': 'NT-3a',
  'RS-24': 'NT-3a',
  'RS-25': 'NT-1',
  'RS-26': 'NT-1',
  'RS-27': 'NT-1',
  'RS-28': 'NT-1',
  'RS-29': 'NT-1',
  'RS-30': 'NT-1',
  'RS-31': 'NT-1',
  'RS-32': 'NT-1',
  'RS-33': 'NT-1',
  'RS-34': 'NT-1',
  'RS-36': 'NT-1',
  'RS-37': 'NT-1',
  'RS-38': 'NT-1',
  'RS-39': 'NT-1',
  'RS-40': 'NT-3a',
  'RS-41': 'NT-3a',
  'RS-42': 'NT-3a',
  'RS-43': 'NT-3a',
  'RS-44': 'NT-1',
  'RS-46': 'NT-3a',
  'RS-48': 'NT-1',
  'RS-63': 'NT-5',
  'RS-64': 'NT-1',
  'RS-49': 'NT-3',
  'RS-50': 'NT-5',
  'RS-51': 'NT-5',
  'RS-52': 'NT-3',
  'RS-53': 'NT-1',
  'RS-54': 'NT-1',
  'RS-55': 'NT-1',
  'RS-56': 'NT-1',
  'RS-57': 'NT-1',
  'RS-58': 'NT-1',
  'RS-82': 'NT-1',
  'RS-83': 'NT-1',
  'RS-84': 'NT-1',
  'RS-85': 'NT-1',
  'RS-86': 'NT-1',
  'RS-87': 'NT-1',
  'RS-88': 'NT-1',
  'RS-59': 'NT-3a',
  'RS-60': 'NT-5',
  'RS-61': 'NT-1',
  'RS-62': 'NT-1',
  'RS-66': 'NT-3a',
  'RS-65': 'NT-5',
  'RS-67': 'NT-1',
  'RS-68': 'NT-5',
  'RS-69': 'NT-1',
  'RS-70': 'NT-1',
  'RS-71': 'NT-3',
  'RS-72': 'NT-5',
  'RS-73': 'NT-5',
  'RS-74': 'NT-1',
  'RS-75': 'NT-3a',
  'RS-76': 'NT-3a',
  'RS-77': 'NT-5',
  'RS-15': 'NT-3a',
  'IV-1': 'NT-1',
  'IV-2': 'NT-1',
  'IV-3': 'NT-1',
  'IV-4': 'NT-1',
  'IV-5': 'NT-1',
  'IV-6': 'NT-1',
  'IV-23': 'NT-1',
  'IV-7': 'NT-1',
  'IV-17': 'NT-1',
  'IV-8': 'NT-1',
  'IV-9': 'NT-1',
  'IV-10': 'NT-1',
  'IV-11': 'NT-1',
  'IV-12': 'NT-1',
  'IV-14': 'NT-1',
  'IV-15': 'NT-1',
  'IV-16': 'NT-1',
  'IV-19': 'NT-1',
  'IV-18': 'NT-1',
  'IV-20': 'NT-1',
  'IV-21': 'NT-1',
  'IV-22': 'NT-1',
}

// see T-233, FR-076
export const NOTICE_DISPLAY_OF_REASON: Readonly<Record<NoticeReason, 'show' | 'hide' | 'autoDismiss' | 'report'>> = {
  'RS-1': 'show',
  'RS-2': 'show',
  'RS-3': 'show',
  'RS-4': 'show',
  'RS-5': 'show',
  'RS-6': 'show',
  'RS-7': 'show',
  'RS-8': 'show',
  'RS-9': 'show',
  'RS-10': 'show',
  'RS-11': 'show',
  'RS-12': 'show',
  'RS-13': 'show',
  'RS-14': 'report',
  'RS-78': 'show',
  'RS-79': 'show',
  'RS-80': 'show',
  'RS-81': 'show',
  'RS-16': 'report',
  'RS-19': 'hide',
  'RS-20': 'show',
  'RS-21': 'show',
  'RS-22': 'hide',
  'RS-23': 'autoDismiss',
  'RS-24': 'show',
  'RS-25': 'show',
  'RS-26': 'show',
  'RS-27': 'hide',
  'RS-28': 'hide',
  'RS-29': 'hide',
  'RS-30': 'hide',
  'RS-31': 'hide',
  'RS-32': 'hide',
  'RS-33': 'autoDismiss',
  'RS-34': 'hide',
  'RS-36': 'hide',
  'RS-37': 'hide',
  'RS-38': 'hide',
  'RS-39': 'hide',
  'RS-40': 'hide',
  'RS-41': 'show',
  'RS-42': 'show',
  'RS-43': 'show',
  'RS-44': 'hide',
  'RS-46': 'hide',
  'RS-48': 'show',
  'RS-63': 'autoDismiss',
  'RS-64': 'show',
  'RS-49': 'hide',
  'RS-50': 'report',
  'RS-51': 'report',
  'RS-52': 'report',
  'RS-53': 'hide',
  'RS-54': 'autoDismiss',
  'RS-55': 'hide',
  'RS-56': 'autoDismiss',
  'RS-57': 'show',
  'RS-58': 'autoDismiss',
  'RS-82': 'show',
  'RS-83': 'show',
  'RS-84': 'autoDismiss',
  'RS-85': 'autoDismiss',
  'RS-86': 'autoDismiss',
  'RS-87': 'autoDismiss',
  'RS-88': 'autoDismiss',
  'RS-59': 'autoDismiss',
  'RS-60': 'report',
  'RS-61': 'autoDismiss',
  'RS-62': 'hide',
  'RS-66': 'autoDismiss',
  'RS-65': 'autoDismiss',
  'RS-67': 'show',
  'RS-68': 'autoDismiss',
  'RS-69': 'autoDismiss',
  'RS-70': 'autoDismiss',
  'RS-71': 'report',
  'RS-72': 'report',
  'RS-73': 'report',
  'RS-74': 'hide',
  'RS-75': 'show',
  'RS-76': 'show',
  'RS-77': 'autoDismiss',
  'RS-15': 'show',
  'IV-1': 'show',
  'IV-2': 'show',
  'IV-3': 'show',
  'IV-4': 'show',
  'IV-5': 'show',
  'IV-6': 'show',
  'IV-23': 'show',
  'IV-7': 'show',
  'IV-17': 'show',
  'IV-8': 'show',
  'IV-9': 'show',
  'IV-10': 'show',
  'IV-11': 'show',
  'IV-12': 'show',
  'IV-14': 'show',
  'IV-15': 'show',
  'IV-16': 'show',
  'IV-19': 'show',
  'IV-18': 'show',
  'IV-20': 'show',
  'IV-21': 'show',
  'IV-22': 'show',
}

// see T-233, FR-076
export const NOTICE_WORDS_ROW_OF_REASON: Readonly<Record<NoticeReason, NoticeReason>> = {
  'RS-1': 'RS-1',
  'RS-2': 'RS-2',
  'RS-3': 'RS-3',
  'RS-4': 'RS-4',
  'RS-5': 'RS-5',
  'RS-6': 'RS-6',
  'RS-7': 'RS-6',
  'RS-8': 'RS-8',
  'RS-9': 'RS-6',
  'RS-10': 'RS-10',
  'RS-11': 'RS-11',
  'RS-12': 'RS-11',
  'RS-13': 'RS-11',
  'RS-14': 'RS-14',
  'RS-78': 'RS-78',
  'RS-79': 'RS-79',
  'RS-80': 'RS-80',
  'RS-81': 'RS-81',
  'RS-16': 'RS-16',
  'RS-19': 'RS-19',
  'RS-20': 'RS-20',
  'RS-21': 'RS-21',
  'RS-22': 'RS-22',
  'RS-23': 'RS-23',
  'RS-24': 'RS-24',
  'RS-25': 'RS-25',
  'RS-26': 'RS-26',
  'RS-27': 'RS-27',
  'RS-28': 'RS-28',
  'RS-29': 'RS-29',
  'RS-30': 'RS-30',
  'RS-31': 'RS-31',
  'RS-32': 'RS-32',
  'RS-33': 'RS-33',
  'RS-34': 'RS-34',
  'RS-36': 'RS-36',
  'RS-37': 'RS-37',
  'RS-38': 'RS-38',
  'RS-39': 'RS-39',
  'RS-40': 'RS-40',
  'RS-41': 'RS-41',
  'RS-42': 'RS-15',
  'RS-43': 'RS-43',
  'RS-44': 'RS-44',
  'RS-46': 'RS-46',
  'RS-48': 'RS-48',
  'RS-63': 'RS-63',
  'RS-64': 'RS-64',
  'RS-49': 'RS-49',
  'RS-50': 'RS-50',
  'RS-51': 'RS-51',
  'RS-52': 'RS-52',
  'RS-53': 'RS-53',
  'RS-54': 'RS-54',
  'RS-55': 'RS-55',
  'RS-56': 'RS-56',
  'RS-57': 'RS-57',
  'RS-58': 'RS-58',
  'RS-82': 'RS-82',
  'RS-83': 'RS-83',
  'RS-84': 'RS-84',
  'RS-85': 'RS-85',
  'RS-86': 'RS-86',
  'RS-87': 'RS-87',
  'RS-88': 'RS-88',
  'RS-59': 'RS-59',
  'RS-60': 'RS-60',
  'RS-61': 'RS-61',
  'RS-62': 'RS-62',
  'RS-66': 'RS-66',
  'RS-65': 'RS-65',
  'RS-67': 'RS-67',
  'RS-68': 'RS-68',
  'RS-69': 'RS-69',
  'RS-70': 'RS-70',
  'RS-71': 'RS-71',
  'RS-72': 'RS-72',
  'RS-73': 'RS-73',
  'RS-74': 'RS-74',
  'RS-75': 'RS-75',
  'RS-76': 'RS-76',
  'RS-77': 'RS-77',
  'RS-15': 'RS-15',
  'IV-1': 'IV-1',
  'IV-2': 'IV-2',
  'IV-3': 'IV-3',
  'IV-4': 'IV-4',
  'IV-5': 'IV-5',
  'IV-6': 'IV-6',
  'IV-23': 'IV-23',
  'IV-7': 'IV-7',
  'IV-17': 'RS-21',
  'IV-8': 'IV-8',
  'IV-9': 'IV-9',
  'IV-10': 'IV-10',
  'IV-11': 'IV-11',
  'IV-12': 'IV-12',
  'IV-14': 'IV-14',
  'IV-15': 'IV-15',
  'IV-16': 'IV-16',
  'IV-19': 'IV-19',
  'IV-18': 'IV-18',
  'IV-20': 'IV-20',
  'IV-21': 'IV-21',
  'IV-22': 'IV-22',
}

// see T-234, FR-076
export const QUESTION_DISPLAY_OF_ROW: Readonly<Record<QuestionRow, 'ask' | 'askOnlyWithUnsavedEdits'>> = {
  'QN-1': 'ask',
  'QN-2': 'ask',
  'QN-3': 'ask',
  'QN-4': 'ask',
  'QN-5': 'askOnlyWithUnsavedEdits',
  'QN-9': 'ask',
  'QN-10': 'ask',
  'QN-11': 'ask',
  'QN-12': 'ask',
  'QN-8': 'ask',
}
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

/** @purity pure */
function displayOf(reason: string): (typeof NOTICE_DISPLAY_OF_REASON)[NoticeReason] | null {
  return Object.hasOwn(NOTICE_DISPLAY_OF_REASON, reason) ? NOTICE_DISPLAY_OF_REASON[reason as NoticeReason] : null
}

// see FR-076, T-233
/** @purity pure */
function wordsRowOf(reason: string): string {
  return Object.hasOwn(NOTICE_WORDS_ROW_OF_REASON, reason) ? NOTICE_WORDS_ROW_OF_REASON[reason as NoticeReason] : reason
}

// see NT-3, T-233
// WHY: reasons that share one row's words are one reason to the person reading them (CR-712 X-2).
/** @purity pure */
function isSameReason(a: string, b: string): boolean {
  return wordsRowOf(a) === wordsRowOf(b)
}

// see T-286, NT-3, FR-076
/** @purity pure */
function onNoticeRaised(values: NoticeValues, event: EventOf<'noticeRaised'>): NoticeStep {
  if (displayOf(event.reason) === 'hide') return unchanged(values)
  const raised = { reason: event.reason, affectedCount: event.affectedCount }
  const standing = values.noticeDisplayState.kind === 'shown' ? values.noticeDisplayState.standing : []
  const same = standing.find((one) => isSameReason(one.reason, event.reason))
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

// see T-286, NT-2
/** @purity pure */
function onNoticeTimeElapsed(values: NoticeValues, event: EventOf<'noticeTimeElapsed'>): NoticeStep {
  if (values.noticeDisplayState.kind === 'hidden' || displayOf(event.reason) !== 'autoDismiss') return unchanged(values)
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
  noticeTimeElapsed: onNoticeTimeElapsed,
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

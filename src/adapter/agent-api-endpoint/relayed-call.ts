// AgentApiEndpoint -- hands a call the relay carried to the member of the same name and answers it.
// @unit      UF-185   (docs/spec/05-07-design.md, table T-075)
// @component AgentApiEndpoint, layer Adapter (table T-062)
// @purity    non-pure

import {
  messageOf,
  type AgentApi,
  type AgentExport,
  type AgentImportSource,
  type AgentWriteRequest,
} from './agent-api-members'

// see T-107, AG-12
export interface RelayedParams {
  agentApiVersion: {}
  schemaVersion: {}
  readDocument: {}
  readStamp: {}
  readSelection: {}
  readDialogueMessages: {}
  readSearchRows: { word: string }
  readShownTasks: {}
  readDelayDiagnostics: {}
  applyCommands: { request: AgentWriteRequest }
  importDocument: { source: AgentImportSource }
  undoEdit: {}
  redoEdit: {}
  exportJson: {}
  exportMspdi: {}
  exportSvg: {}
  exportPng: {}
  exportEmbeddedHtml: {}
  focusTask: { taskUid: number }
  showOnlyTasks: { taskUids: readonly number[] | null }
  // WHY: no waitMs here -- the relay does the waiting, the page only subscribes.
  watchChanges: {}
  postDialogueMessage: { text: string }
}

export type RelayedCall = {
  [K in keyof AgentApi]: { readonly member: K; readonly params: RelayedParams[K] }
}[keyof AgentApi]

// see AG-9a
export type RelayedAnswer =
  | { readonly result: unknown }
  | { readonly error: { readonly code: number; readonly message: string } }

type ParameterizedMember = {
  [K in keyof AgentApi]: keyof RelayedParams[K] extends never ? never : K
}[keyof AgentApi]

// WHY: only members with arguments -- listing all of them would restate table T-107 (check 69).
const MEMBER_PARAMETERS = {
  readSearchRows: ['word'],
  applyCommands: ['request'],
  importDocument: ['source'],
  focusTask: ['taskUid'],
  showOnlyTasks: ['taskUids'],
  postDialogueMessage: ['text'],
} as const satisfies { readonly [K in ParameterizedMember]: readonly (keyof RelayedParams[K])[] }

type ArgumentsNamed<TParams, TNames> = {
  -readonly [I in keyof TNames]: TParams[TNames[I] & keyof TParams]
}

type ListedArguments<K extends keyof AgentApi> = K extends ParameterizedMember
  ? ArgumentsNamed<RelayedParams[K], (typeof MEMBER_PARAMETERS)[K]>
  : []

// WHY: watchChanges is left out -- the page hands it a receiver of its own, never a param.
type MisorderedMember = {
  [K in Exclude<keyof AgentApi, 'watchChanges'>]: AgentApi[K] extends (...args: infer Taken) => unknown
    ? [Taken, ListedArguments<K>] extends [ListedArguments<K>, Taken]
      ? never
      : K
    : never
}[Exclude<keyof AgentApi, 'watchChanges'>]

const EVERY_LIST_MATCHES_ITS_SIGNATURE: [MisorderedMember] extends [never] ? true : MisorderedMember = true
void EVERY_LIST_MATCHES_ITS_SIGNATURE

const METHOD_NOT_FOUND = -32601
const INTERNAL_ERROR = -32603

// WHY: String.fromCharCode spreads its arguments, and a whole image overflows the call stack.
const BYTES_PER_CHARACTER_RUN = 0x8000

/** @purity pure */
function base64Of(bytes: Uint8Array): string {
  let binary = ''
  for (let start = 0; start < bytes.length; start += BYTES_PER_CHARACTER_RUN) {
    binary += String.fromCharCode(...bytes.subarray(start, start + BYTES_PER_CHARACTER_RUN))
  }
  return btoa(binary)
}

/** @purity pure */
function isMemberName(api: AgentApi, member: unknown): member is keyof AgentApi {
  return typeof member === 'string' && Object.prototype.hasOwnProperty.call(api, member)
}

/** @purity pure */
function isParameterized(member: keyof AgentApi): member is ParameterizedMember {
  return Object.prototype.hasOwnProperty.call(MEMBER_PARAMETERS, member)
}

// see AM-17
/** @purity non-pure */
function answerWatch(api: AgentApi, sendNotice: (notice: unknown) => void): RelayedAnswer {
  const watch = api.watchChanges((notice) => sendNotice(notice))
  return { result: { hasReplacedEarlierWatch: watch.hasReplacedEarlierWatch } }
}

// see AM-14
/** @purity non-pure */
async function answerPng(api: AgentApi): Promise<RelayedAnswer> {
  const exported: AgentExport<Uint8Array> = await api.exportPng()
  return { result: exported.ok ? { ok: true, value: base64Of(exported.value) } : exported }
}

/** @purity non-pure */
async function answerMember(
  api: AgentApi,
  member: keyof AgentApi,
  params: unknown,
  sendNotice: (notice: unknown) => void,
): Promise<RelayedAnswer> {
  if (typeof api[member] !== 'function') return { result: api[member] }
  if (member === 'watchChanges') return answerWatch(api, sendNotice)
  if (member === 'exportPng') return answerPng(api)
  const held = (typeof params === 'object' && params !== null ? params : {}) as Record<string, unknown>
  const names: readonly string[] = isParameterized(member) ? MEMBER_PARAMETERS[member] : []
  const argumentsInOrder = names.map((name) => held[name])
  const method = api[member] as (...args: unknown[]) => unknown
  return { result: await method.apply(api, argumentsInOrder) }
}

// see AG-12, AG-9a, T-107
/** @purity non-pure */
export async function answerRelayedCall(
  api: AgentApi,
  call: RelayedCall,
  sendNotice: (notice: unknown) => void,
): Promise<RelayedAnswer> {
  const member: unknown = call.member
  if (!isMemberName(api, member)) {
    return { error: { code: METHOD_NOT_FOUND, message: `Unknown member: ${String(member)}` } }
  }
  try {
    return await answerMember(api, member, call.params, sendNotice)
  } catch (thrown) {
    return { error: { code: INTERNAL_ERROR, message: messageOf(thrown) } }
  }
}

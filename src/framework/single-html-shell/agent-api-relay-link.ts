// SingleHtmlShell -- the page's WebSocket link to the relay that served it (AG-12).
// @unit      UF-188   (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import { answerRelayedCall } from '../../adapter/agent-api-endpoint/agent-api-endpoint'

// WHY: read off answerRelayedCall, the name table T-064 PI-17 lists; importing the
// types by name would cross the folder with names the table does not hold (check 26b).
type AgentApi = Parameters<typeof answerRelayedCall>[0]
type RelayedCall = Parameters<typeof answerRelayedCall>[1]

export type RelayPlace = Pick<Location, 'hash' | 'host'>

export interface AgentApiRelayLink {
  /** @purity non-pure */
  close(): void
}

const JSON_RPC_VERSION = '2.0'
const KEY_PRESENTED = 'relayKeyPresented'
const CHANGE_NOTICED = 'changeNoticed'
const INTERNAL_ERROR = -32603
// see AG-12
const CLOSE_REFUSED_BY_RELAY = 1008
const RECONNECT_DELAYS_MS: readonly number[] = [1000, 2000, 4000, 8000]

interface RelayRequest {
  readonly id: number | string
  readonly method: unknown
  readonly params: unknown
}

/** @purity pure */
function relayKeyOf(hash: string): string | null {
  const key = hash.startsWith('#') ? hash.slice(1) : hash
  return key === '' ? null : key
}

/** @purity pure */
function relayRequestOf(text: unknown): RelayRequest | null {
  if (typeof text !== 'string') return null
  let read: unknown
  try {
    read = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof read !== 'object' || read === null) return null
  const { id, method, params } = read as Record<string, unknown>
  if (typeof id !== 'number' && typeof id !== 'string') return null
  return { id, method, params }
}

// see AG-12
/** @purity non-pure */
function answerRelayRequests(api: AgentApi, socket: WebSocket, sendWhileOpen: (message: object) => void): void {
  socket.addEventListener('message', (event: MessageEvent) => {
    const request = relayRequestOf(event.data)
    if (request === null) return
    const call = { member: request.method, params: request.params ?? {} } as RelayedCall
    void answerRelayedCall(api, call, (notice) =>
      sendWhileOpen({ method: CHANGE_NOTICED, params: notice }),
    ).then((answer) => {
      try {
        sendWhileOpen({ id: request.id, ...answer })
      } catch (thrown) {
        // WHY: a value JSON cannot carry would otherwise leave the relay waiting for this id forever.
        sendWhileOpen({ id: request.id, error: { code: INTERNAL_ERROR, message: String(thrown) } })
      }
    })
  })
}

/** @purity non-pure */
function sendingOn(socket: WebSocket): (message: object) => void {
  return (message) => {
    if (socket.readyState !== socket.OPEN) return
    socket.send(JSON.stringify({ jsonrpc: JSON_RPC_VERSION, ...message }))
  }
}

interface RelayLinkState {
  readonly api: AgentApi
  readonly address: string
  readonly key: string
  readonly openSocket: (address: string) => WebSocket
  readonly onLost: () => void
  socket: WebSocket | null
  hasEnded: boolean
  isRetrying: boolean
  triesMade: number
  pendingTry: ReturnType<typeof setTimeout> | null
}

/** @purity non-pure */
function giveUpRelayLink(state: RelayLinkState): void {
  state.hasEnded = true
  state.onLost()
}

// see AG-12, RS-90
/** @purity non-pure */
function tryRelayAgainLater(state: RelayLinkState): void {
  const delayMs = RECONNECT_DELAYS_MS[state.triesMade]
  if (delayMs === undefined) {
    giveUpRelayLink(state)
    return
  }
  state.triesMade += 1
  state.pendingTry = setTimeout(() => {
    state.pendingTry = null
    if (!state.hasEnded && !connectRelayOnce(state)) tryRelayAgainLater(state)
  }, delayMs)
}

// see AG-12, RS-90
// WHY: the browser drops the link on waking from modern standby while the relay runs on with the
// same port and key (CR-808), so the page tries the same address again before it tells RS-90.
/** @purity non-pure */
function relayLinkClosed(state: RelayLinkState, hasOpened: boolean, code: number): void {
  if (state.hasEnded) return
  if (hasOpened && code !== CLOSE_REFUSED_BY_RELAY) {
    state.isRetrying = true
    state.triesMade = 0
    tryRelayAgainLater(state)
  } else if (state.isRetrying) {
    tryRelayAgainLater(state)
  } else if (hasOpened) {
    giveUpRelayLink(state)
  }
}

// see AG-12
/** @purity non-pure */
function connectRelayOnce(state: RelayLinkState): boolean {
  let opened: WebSocket
  try {
    opened = state.openSocket(state.address)
  } catch {
    return false
  }
  state.socket = opened
  const sendWhileOpen = sendingOn(opened)
  let hasOpened = false
  opened.addEventListener('open', () => {
    hasOpened = true
    sendWhileOpen({ method: KEY_PRESENTED, params: { key: state.key } })
  })
  let hasClosed = false
  opened.addEventListener('close', (event: CloseEvent) => {
    // WHY: one socket is one try; a repeated close event must not count a second try.
    if (hasClosed || state.socket !== opened) return
    hasClosed = true
    relayLinkClosed(state, hasOpened, event.code)
  })
  answerRelayRequests(state.api, opened, sendWhileOpen)
  return true
}

// WHY: the page closing the link itself (Agent API turned off) is not a loss and stops a waiting try.
/** @purity non-pure */
function closeRelayLink(state: RelayLinkState): void {
  state.hasEnded = true
  if (state.pendingTry !== null) clearTimeout(state.pendingTry)
  state.pendingTry = null
  state.socket?.close()
}

// see AG-12
/** @purity non-pure */
export function openAgentApiRelayLink(
  api: AgentApi,
  place: RelayPlace,
  openSocket: (address: string) => WebSocket,
  onLost: () => void = () => undefined,
): AgentApiRelayLink | null {
  const key = relayKeyOf(place.hash)
  if (key === null || place.host === '') return null
  const state: RelayLinkState = {
    api,
    address: `ws://${place.host}/`,
    key,
    openSocket,
    onLost,
    socket: null,
    hasEnded: false,
    isRetrying: false,
    triesMade: 0,
    pendingTry: null,
  }
  if (!connectRelayOnce(state)) return null
  return { close: () => closeRelayLink(state) }
}

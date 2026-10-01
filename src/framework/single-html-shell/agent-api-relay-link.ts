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
export function openAgentApiRelayLink(
  api: AgentApi,
  place: RelayPlace,
  openSocket: (address: string) => WebSocket,
): AgentApiRelayLink | null {
  const key = relayKeyOf(place.hash)
  if (key === null || place.host === '') return null
  let socket: WebSocket
  try {
    socket = openSocket(`ws://${place.host}/`)
  } catch {
    return null
  }

  /** @purity non-pure */
  const sendWhileOpen = (message: object): void => {
    if (socket.readyState !== socket.OPEN) return
    socket.send(JSON.stringify({ jsonrpc: JSON_RPC_VERSION, ...message }))
  }

  socket.addEventListener('open', () => sendWhileOpen({ method: KEY_PRESENTED, params: { key } }))
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

  return {
    close(): void {
      socket.close()
    },
  }
}

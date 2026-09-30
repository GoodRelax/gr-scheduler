// UF-185 answerRelayedCall and UF-188 openAgentApiRelayLink: the page side of the MCP relay (AG-12 (2) (7), design 3.2 / 3.3).

import { describe, expect, it } from 'vitest'

import {
  answerRelayedCall,
  type AgentApi,
  type RelayedCall,
} from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { openAgentApiRelayLink } from '../../src/framework/single-html-shell/agent-api-relay-link'
import { specTable } from '../contract/spec-table'

type Json = Record<string, unknown>

const MEMBERS: readonly string[] = specTable('T-107').rows.map((row) => (row.cells[1] ?? '').replace(/`/g, ''))

const PROPERTIES = new Set(['agentApiVersion', 'schemaVersion'])

const A_KEY = 'Oa5ibfMeXyHSMpj7la0NleMhCzr_E1cRCnQ2gkh-NmY'
const A_HOST = '127.0.0.1:54690'

interface Fake {
  readonly api: AgentApi
  readonly calls: { member: string; args: unknown[] }[]
  readonly receivers: ((notice: unknown) => void)[]
}

const fakeApi = (): Fake => {
  const calls: { member: string; args: unknown[] }[] = []
  const receivers: ((notice: unknown) => void)[] = []
  const api: Record<string, unknown> = {}
  for (const member of MEMBERS) {
    if (PROPERTIES.has(member)) {
      api[member] = member === 'agentApiVersion' ? '9.8.7-fake' : 42
      continue
    }
    api[member] = (...args: unknown[]): unknown => {
      calls.push({ member, args })
      if (member === 'watchChanges') {
        receivers.push(args[0] as (notice: unknown) => void)
        return { hasReplacedEarlierWatch: false }
      }
      if (member === 'applyCommands') {
        return { accepted: false, refusal: { target: member, reason: 'RS-61', stamp: 'stamp-3', refusals: [] } }
      }
      return { ok: true, stamp: 'stamp-3', value: { member, args } }
    }
  }
  return { api: api as unknown as AgentApi, calls, receivers }
}

const settle = async (): Promise<void> => {
  for (let i = 0; i < 20; i++) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

type Listener = (event: unknown) => void

class FakeSocket {
  readonly sent: Json[] = []
  closed = false
  onopen: Listener | null = null
  onmessage: Listener | null = null
  onclose: Listener | null = null
  onerror: Listener | null = null
  private readonly listeners = new Map<string, Listener[]>()

  constructor(readonly address: string) {}

  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((one) => one !== listener))
  }

  send(data: string): void {
    this.sent.push(JSON.parse(data) as Json)
  }

  close(): void {
    this.closed = true
  }

  emit(type: 'open' | 'message' | 'close' | 'error', event: unknown = {}): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event)
    const property = this[`on${type}`]
    if (property !== null) property(event)
  }

  deliver(message: Json): void {
    this.emit('message', { data: JSON.stringify(message) })
  }
}

interface Opened {
  readonly link: ReturnType<typeof openAgentApiRelayLink>
  readonly sockets: FakeSocket[]
  readonly fake: Fake
}

const open = (place: { hash: string; host: string }): Opened => {
  const sockets: FakeSocket[] = []
  const fake = fakeApi()
  const link = openAgentApiRelayLink(fake.api, place, (address) => {
    const socket = new FakeSocket(address)
    sockets.push(socket)
    return socket as unknown as WebSocket
  })
  return { link, sockets, fake }
}

const openedWithKey = (): Opened & { socket: FakeSocket } => {
  const opened = open({ hash: `#${A_KEY}`, host: A_HOST })
  const socket = opened.sockets[0]
  if (socket === undefined) throw new Error('no socket was opened')
  socket.emit('open')
  return { ...opened, socket }
}

describe('UF-185 answerRelayedCall (SEAM-1)', () => {
  it('SEAM-1: a property answers its value', async () => {
    const call = { member: 'agentApiVersion', params: {} } as unknown as RelayedCall
    expect(await answerRelayedCall(fakeApi().api, call, () => undefined)).toEqual({ result: '9.8.7-fake' })
  })

  it('SEAM-1: a method receives its params spread and answers what it returns', async () => {
    const fake = fakeApi()
    const call = { member: 'focusTask', params: { taskUid: 7 } } as unknown as RelayedCall
    const answer = await answerRelayedCall(fake.api, call, () => undefined)
    expect(fake.calls).toEqual([{ member: 'focusTask', args: [7] }])
    expect(answer).toEqual({ result: { ok: true, stamp: 'stamp-3', value: { member: 'focusTask', args: [7] } } })
  })

  it('AG-9a: a refusal is a result, never an error', async () => {
    const call = { member: 'applyCommands', params: { request: {} } } as unknown as RelayedCall
    const answer = await answerRelayedCall(fakeApi().api, call, () => undefined)
    expect(answer).not.toHaveProperty('error')
    expect((answer as { result: Json }).result['accepted']).toBe(false)
  })

  it('SEAM-1: an unknown member is error -32601', async () => {
    const call = { member: 'notAMember', params: {} } as unknown as RelayedCall
    const answer = await answerRelayedCall(fakeApi().api, call, () => undefined)
    expect((answer as { error: { code: number } }).error.code).toBe(-32601)
  })
})

describe('UF-188 openAgentApiRelayLink: when the page connects (AG-12 (2) (7))', () => {
  it('AG-12 (7): no key in the hash -> null, and nothing is opened', () => {
    for (const hash of ['', '#']) {
      const opened = open({ hash, host: A_HOST })
      expect(opened.link, JSON.stringify(hash)).toBeNull()
      expect(opened.sockets, JSON.stringify(hash)).toEqual([])
    }
  })

  it('design 3.2: an empty host -> null, and nothing is opened', () => {
    const opened = open({ hash: `#${A_KEY}`, host: '' })
    expect(opened.link).toBeNull()
    expect(opened.sockets).toEqual([])
  })

  it('design 3.2: with a key it opens ws://<host>/ once -- the same origin', () => {
    const opened = open({ hash: `#${A_KEY}`, host: A_HOST })
    expect(opened.link).not.toBeNull()
    expect(opened.sockets.map((one) => one.address)).toEqual([`ws://${A_HOST}/`])
  })

  it('AG-12 (7): on open the first message presents the key from the hash', () => {
    const { socket } = openedWithKey()
    expect(socket.sent[0]).toEqual({ jsonrpc: '2.0', method: 'relayKeyPresented', params: { key: A_KEY } })
  })

  it('AG-12 (7): nothing is sent before the socket opens', () => {
    const opened = open({ hash: `#${A_KEY}`, host: A_HOST })
    expect(opened.sockets[0]?.sent).toEqual([])
  })

  it('AG-12 (2): close() closes the socket', () => {
    const { link, socket } = openedWithKey()
    link?.close()
    expect(socket.closed).toBe(true)
  })
})

describe('UF-188 openAgentApiRelayLink: answering the relay (design 3.2, 3.3)', () => {
  it('design 3.2: a relay request is answered with the same id and the RelayedAnswer', async () => {
    const { socket, fake } = openedWithKey()
    socket.deliver({ jsonrpc: '2.0', id: 7, method: 'readSearchRows', params: { word: 'kick-off' } })
    await settle()
    expect(fake.calls).toEqual([{ member: 'readSearchRows', args: ['kick-off'] }])
    expect(socket.sent.slice(1)).toEqual([
      {
        jsonrpc: '2.0',
        id: 7,
        result: { ok: true, stamp: 'stamp-3', value: { member: 'readSearchRows', args: ['kick-off'] } },
      },
    ])
  })

  it('design 3.2: a property request answers its value', async () => {
    const { socket } = openedWithKey()
    socket.deliver({ jsonrpc: '2.0', id: 1, method: 'agentApiVersion', params: {} })
    await settle()
    expect(socket.sent.slice(1)).toEqual([{ jsonrpc: '2.0', id: 1, result: '9.8.7-fake' }])
  })

  it('AG-9a: a refusal travels back as a result', async () => {
    const { socket } = openedWithKey()
    socket.deliver({ jsonrpc: '2.0', id: 2, method: 'applyCommands', params: { request: {} } })
    await settle()
    const answer = socket.sent[1] ?? {}
    expect(answer['id']).toBe(2)
    expect(answer).not.toHaveProperty('error')
    expect((answer['result'] as Json)['accepted']).toBe(false)
  })

  it('SEAM-1: an unknown member comes back as error -32601 with the same id', async () => {
    const { socket } = openedWithKey()
    socket.deliver({ jsonrpc: '2.0', id: 3, method: 'notAMember', params: {} })
    await settle()
    const answer = socket.sent[1] ?? {}
    expect(answer['id']).toBe(3)
    expect((answer['error'] as Json | undefined)?.['code']).toBe(-32601)
  })

  it('design 3.3: after watchChanges each notice goes out as changeNoticed, in order', async () => {
    const { socket, fake } = openedWithKey()
    socket.deliver({ jsonrpc: '2.0', id: 4, method: 'watchChanges', params: {} })
    await settle()
    expect(socket.sent[1]).toEqual({ jsonrpc: '2.0', id: 4, result: { hasReplacedEarlierWatch: false } })
    const first = { kind: 'scheduleChanged', stamp: 'stamp-4' }
    const second = { kind: 'dialogueMessage', text: 'wait' }
    fake.receivers[0]?.(first)
    fake.receivers[0]?.(second)
    await settle()
    expect(socket.sent.slice(2)).toEqual([
      { jsonrpc: '2.0', method: 'changeNoticed', params: first },
      { jsonrpc: '2.0', method: 'changeNoticed', params: second },
    ])
  })
})

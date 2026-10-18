// CR-808: the page reconnects to the relay by itself after the link drops (AG-12 (2), design 5, RS-90).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { openAgentApiRelayLink } from '../../src/framework/single-html-shell/agent-api-relay-link'
import { specTable, unbroken } from './spec-table'

type Json = Record<string, unknown>
type Listener = (event: unknown) => void

const ADDRESS = 'ws://127.0.0.1:54690/'
const PLACE = { hash: '#a-key', host: '127.0.0.1:54690' }

// WHY: design 5 gives the waits before the 1st, 2nd, 3rd and 4th reconnect try.
const WAITS_MS = [1000, 2000, 4000, 8000]
const ALL_WAITS_MS = WAITS_MS.reduce((sum, one) => sum + one, 0)

class FakeSocket {
  readonly OPEN = 1
  readyState = 0
  readonly sent: Json[] = []
  closeCalls = 0
  private readonly listeners = new Map<string, Listener[]>()
  onopen: Listener | null = null
  onmessage: Listener | null = null
  onclose: Listener | null = null
  onerror: Listener | null = null

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

  // WHY: a real socket answers close() with a close event; the link must not take that for a drop of the relay.
  close(): void {
    this.closeCalls += 1
    this.emit('close', { code: 1000 })
  }

  emit(type: 'open' | 'message' | 'close' | 'error', event: unknown = {}): void {
    if (type === 'open') this.readyState = 1
    if (type === 'close') this.readyState = 3
    for (const listener of this.listeners.get(type) ?? []) listener(event)
    const property = this[`on${type}`]
    if (property !== null) property(event)
  }

  deliver(message: Json): void {
    this.emit('message', { data: JSON.stringify(message) })
  }

  connect(): void {
    this.emit('open')
  }

  drop(code = 1006): void {
    this.emit('close', { code })
  }
}

interface Harness {
  readonly link: { close(): void } | null
  readonly sockets: FakeSocket[]
  readonly lost: number[]
  readonly stampCalls: number[]
  throwNext(count: number): void
}

const openLink = (): Harness => {
  const sockets: FakeSocket[] = []
  const lost: number[] = []
  const stampCalls: number[] = []
  let throwing = 0
  const api = {
    readStamp: (): unknown => {
      stampCalls.push(stampCalls.length + 1)
      return { stamp: 'stamp-1' }
    },
  }
  const open = openAgentApiRelayLink as unknown as (
    api: unknown,
    place: { hash: string; host: string },
    openSocket: (address: string) => unknown,
    onLost: () => void,
  ) => { close(): void } | null
  const link = open(
    api,
    PLACE,
    (address) => {
      if (throwing > 0 && sockets.length > 0) {
        throwing -= 1
        // WHY: the throwing call still counts as a call, so it is recorded like a socket that never opened.
        sockets.push(new FakeSocket(address))
        throw new Error('the socket could not be made')
      }
      const made = new FakeSocket(address)
      sockets.push(made)
      return made
    },
    () => void lost.push(lost.length + 1),
  )
  return {
    link,
    sockets,
    lost,
    stampCalls,
    throwNext: (count: number) => {
      throwing = count
    },
  }
}

const first = (harness: Harness): FakeSocket => {
  const socket = harness.sockets[0]
  if (socket === undefined) throw new Error('no socket was opened')
  return socket
}

const latest = (harness: Harness): FakeSocket => {
  const socket = harness.sockets[harness.sockets.length - 1]
  if (socket === undefined) throw new Error('no socket was opened')
  return socket
}

const heldThenDropped = (code = 1006): Harness => {
  const harness = openLink()
  first(harness).connect()
  first(harness).drop(code)
  return harness
}

// WHY: walks the four waits; at the end of each a new socket must exist, and the given way fails it.
const failEveryTry = (harness: Harness, fail: (socket: FakeSocket) => void): void => {
  for (const [index, wait] of WAITS_MS.entries()) {
    vi.advanceTimersByTime(wait - 1)
    expect(harness.sockets).toHaveLength(index + 1)
    vi.advanceTimersByTime(1)
    expect(harness.sockets).toHaveLength(index + 2)
    fail(latest(harness))
  }
}

const settle = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0)
}

describe('CR-808 AG-12 (2): the page reconnects by itself, same address, and tells RS-90 only when no try connects', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('AG-12 (2): a held link drops (code 1006) -> onLost is not called at once and no socket is opened at once', () => {
    const harness = heldThenDropped(1006)
    expect(harness.lost).toEqual([])
    expect(harness.sockets).toHaveLength(1)
  })

  it('design 5: the first reconnect try opens a new socket at 1 s, not before, to the same address', () => {
    const harness = heldThenDropped(1006)
    vi.advanceTimersByTime(999)
    expect(harness.sockets).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(harness.sockets).toHaveLength(2)
    expect(harness.sockets.map((one) => one.address)).toEqual([ADDRESS, ADDRESS])
    expect(harness.lost).toEqual([])
  })

  it('AG-12 (2): a reconnect that opens presents the key again and onLost is never called', () => {
    const harness = heldThenDropped(1006)
    vi.advanceTimersByTime(1000)
    const second = latest(harness)
    second.connect()
    expect(second.sent[0]).toMatchObject({ jsonrpc: '2.0', method: 'relayKeyPresented', params: { key: 'a-key' } })
    vi.advanceTimersByTime(ALL_WAITS_MS * 2)
    expect(harness.lost).toEqual([])
    expect(harness.sockets).toHaveLength(2)
  })

  it('AG-12 (2): requests on the reconnected socket are answered on that socket', async () => {
    const harness = heldThenDropped(1006)
    vi.advanceTimersByTime(1000)
    const second = latest(harness)
    second.connect()
    second.deliver({ jsonrpc: '2.0', id: 7, method: 'readStamp', params: {} })
    await settle()
    const answer = second.sent.find((one) => one['id'] === 7)
    expect(answer).toBeDefined()
    expect(answer).toHaveProperty('result')
    expect(answer).not.toHaveProperty('error')
    expect(harness.stampCalls).toHaveLength(1)
    expect(harness.lost).toEqual([])
  })

  it('design 5: four tries that never open -> onLost exactly once after 1+2+4+8 s, and not before', () => {
    const harness = heldThenDropped(1006)
    for (const [index, wait] of WAITS_MS.entries()) {
      vi.advanceTimersByTime(wait - 1)
      expect(harness.sockets).toHaveLength(index + 1)
      vi.advanceTimersByTime(1)
      expect(harness.sockets).toHaveLength(index + 2)
      expect(harness.lost).toEqual([])
      latest(harness).drop(1006)
    }
    expect(harness.sockets).toHaveLength(5)
    expect(harness.lost).toEqual([1])
  })

  it('design 5: onLost is not called before the 4th try has failed, even after 15 s have passed since the drop', () => {
    const harness = heldThenDropped(1006)
    failEveryTryExceptTheLast(harness)
    expect(harness.sockets).toHaveLength(5)
    expect(harness.lost).toEqual([])
    latest(harness).drop(1006)
    expect(harness.lost).toEqual([1])
  })

  it('design 5: no fifth try -- after RS-90 no further socket is opened, however long the page waits', () => {
    const harness = heldThenDropped(1006)
    failEveryTry(harness, (socket) => socket.drop(1006))
    expect(harness.lost).toEqual([1])
    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(harness.sockets).toHaveLength(5)
    expect(harness.lost).toEqual([1])
  })

  it('design 5: a try the relay refused (opens, then close code 1008) counts as not connected -- four of them give one RS-90', () => {
    const harness = heldThenDropped(1006)
    failEveryTry(harness, (socket) => {
      socket.connect()
      socket.drop(1008)
    })
    expect(harness.sockets).toHaveLength(5)
    expect(harness.lost).toEqual([1])
    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(harness.sockets).toHaveLength(5)
  })

  it('design 5: a refused try is only one failed try -- the next try still comes after its own wait', () => {
    const harness = heldThenDropped(1006)
    vi.advanceTimersByTime(1000)
    latest(harness).connect()
    latest(harness).drop(1008)
    expect(harness.lost).toEqual([])
    vi.advanceTimersByTime(1999)
    expect(harness.sockets).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(harness.sockets).toHaveLength(3)
  })

  it('design 5: a try that fails before opening (error, then close) is one failed try', () => {
    const harness = heldThenDropped(1006)
    failEveryTry(harness, (socket) => {
      socket.emit('error')
      socket.drop(1006)
    })
    expect(harness.sockets).toHaveLength(5)
    expect(harness.lost).toEqual([1])
  })

  it('design 5: a repeated close event of one failed try is not a second failed try (as CR-796 kept for onLost)', () => {
    const harness = heldThenDropped(1006)
    failEveryTry(harness, (socket) => {
      socket.emit('error')
      socket.drop(1006)
      socket.drop(1006)
    })
    expect(harness.sockets).toHaveLength(5)
    expect(harness.lost).toEqual([1])
  })

  it('design 5: openSocket throwing on every reconnect try counts as four failed tries -> onLost once after 15 s', () => {
    const harness = heldThenDropped(1006)
    harness.throwNext(4)
    for (const [index, wait] of WAITS_MS.entries()) {
      vi.advanceTimersByTime(wait - 1)
      expect(harness.sockets).toHaveLength(index + 1)
      expect(harness.lost).toEqual([])
      vi.advanceTimersByTime(1)
      expect(harness.sockets).toHaveLength(index + 2)
    }
    expect(harness.lost).toEqual([1])
    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(harness.sockets).toHaveLength(5)
    expect(harness.lost).toEqual([1])
  })

  it('design 5: a throw on the 1st try followed by a connecting 2nd try -> no RS-90', () => {
    const harness = heldThenDropped(1006)
    harness.throwNext(1)
    vi.advanceTimersByTime(1000)
    expect(harness.sockets).toHaveLength(2)
    vi.advanceTimersByTime(2000)
    expect(harness.sockets).toHaveLength(3)
    latest(harness).connect()
    vi.advanceTimersByTime(ALL_WAITS_MS * 2)
    expect(harness.lost).toEqual([])
    expect(harness.sockets).toHaveLength(3)
  })

  it('design 5: a later try connects after earlier failures -> no RS-90', () => {
    const harness = heldThenDropped(1006)
    vi.advanceTimersByTime(1000)
    latest(harness).drop(1006)
    vi.advanceTimersByTime(2000)
    latest(harness).drop(1006)
    vi.advanceTimersByTime(4000)
    latest(harness).connect()
    vi.advanceTimersByTime(ALL_WAITS_MS * 2)
    expect(harness.lost).toEqual([])
    expect(harness.sockets).toHaveLength(4)
  })

  it('design 5: a reconnected link that drops again starts counting from 1 s again', () => {
    const harness = heldThenDropped(1006)
    vi.advanceTimersByTime(1000)
    latest(harness).connect()
    latest(harness).drop(1006)
    expect(harness.lost).toEqual([])
    vi.advanceTimersByTime(999)
    expect(harness.sockets).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(harness.sockets).toHaveLength(3)
  })

  it('design 5: counting restarts from 1 s even after earlier failed tries (1 s, 2 s used, 3rd connects, drops again)', () => {
    const harness = heldThenDropped(1006)
    vi.advanceTimersByTime(1000)
    latest(harness).drop(1006)
    vi.advanceTimersByTime(2000)
    latest(harness).drop(1006)
    vi.advanceTimersByTime(4000)
    expect(harness.sockets).toHaveLength(4)
    latest(harness).connect()
    latest(harness).drop(1006)
    vi.advanceTimersByTime(999)
    expect(harness.sockets).toHaveLength(4)
    vi.advanceTimersByTime(1)
    expect(harness.sockets).toHaveLength(5)
    expect(harness.lost).toEqual([])
  })

  it('design 5: the full run after a re-drop is again 4 tries then one RS-90', () => {
    const harness = heldThenDropped(1006)
    vi.advanceTimersByTime(1000)
    latest(harness).connect()
    latest(harness).drop(1006)
    let expected = 3
    for (const wait of WAITS_MS) {
      vi.advanceTimersByTime(wait)
      expect(harness.sockets).toHaveLength(expected)
      latest(harness).drop(1006)
      expected += 1
    }
    expect(harness.lost).toEqual([1])
    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(harness.sockets).toHaveLength(6)
  })

  it('AG-12 (2): close() while waiting for a try stops it -- no new socket, no onLost', () => {
    const harness = heldThenDropped(1006)
    vi.advanceTimersByTime(500)
    harness.link?.close()
    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(harness.sockets).toHaveLength(1)
    expect(harness.lost).toEqual([])
  })

  it('AG-12 (2): close() while a reconnect socket is still connecting is not a loss and starts no further try', () => {
    const harness = heldThenDropped(1006)
    vi.advanceTimersByTime(1000)
    expect(harness.sockets).toHaveLength(2)
    harness.link?.close()
    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(harness.sockets).toHaveLength(2)
    expect(harness.lost).toEqual([])
  })

  it('AG-12 (2): close() between two failed tries stops the rest of the run -- no onLost', () => {
    const harness = heldThenDropped(1006)
    vi.advanceTimersByTime(1000)
    latest(harness).drop(1006)
    harness.link?.close()
    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(harness.sockets).toHaveLength(2)
    expect(harness.lost).toEqual([])
  })

  it('AG-12 (2): close() after a successful reconnect closes that socket and is not a loss', () => {
    const harness = heldThenDropped(1006)
    vi.advanceTimersByTime(1000)
    latest(harness).connect()
    harness.link?.close()
    expect(latest(harness).closeCalls).toBeGreaterThan(0)
    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(harness.sockets).toHaveLength(2)
    expect(harness.lost).toEqual([])
  })

  it('AG-12 (2): an error followed by close events on a held link starts one reconnect run, not two', () => {
    const harness = openLink()
    first(harness).connect()
    first(harness).emit('error')
    first(harness).drop(1006)
    first(harness).drop(1006)
    vi.advanceTimersByTime(1000)
    expect(harness.sockets).toHaveLength(2)
    vi.advanceTimersByTime(999)
    expect(harness.sockets).toHaveLength(2)
  })

  it('CR-796 kept: a first link that never opened and closes -> no onLost and no reconnect try', () => {
    const harness = openLink()
    first(harness).drop(1006)
    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(harness.lost).toEqual([])
    expect(harness.sockets).toHaveLength(1)
  })

  it('CR-796 kept: a first link that opened and was refused with 1008 -> onLost once, no reconnect try', () => {
    const harness = openLink()
    first(harness).connect()
    first(harness).drop(1008)
    expect(harness.lost).toEqual([1])
    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(harness.lost).toEqual([1])
    expect(harness.sockets).toHaveLength(1)
  })
})

// WHY: walks the four waits but leaves the last try without its failure.
function failEveryTryExceptTheLast(harness: Harness): void {
  for (const [index, wait] of WAITS_MS.entries()) {
    vi.advanceTimersByTime(wait)
    expect(harness.sockets).toHaveLength(index + 2)
    if (index < WAITS_MS.length - 1) latest(harness).drop(1006)
  }
}

describe('CR-808 spec text: AG-12 (2), design 5 and RS-90 say the page reconnects', () => {
  const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
  const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'design-mcp-relay.md'), 'utf8'))

  it('AG-12 (2): the requirement says the page reconnects to the same address and tells RS-90 only when no try connects', () => {
    const at = REQUIREMENTS.indexOf('| AG-12 |')
    expect(at).toBeGreaterThan(-1)
    const row = REQUIREMENTS.slice(at, REQUIREMENTS.indexOf('\n', at))
    const two = row.slice(row.indexOf('②'), row.indexOf('③'))
    expect(two).toContain('繋ぎ直し')
    expect(two).toContain('RS-90')
    expect(two).toContain('MUST')
  })

  it('design 5: the bullet for a page that drops names the waits 1 s / 2 s / 4 s / 8 s and 4 tries', () => {
    const at = DESIGN.indexOf('呼び出しの途中でページが切れた')
    expect(at).toBeGreaterThan(-1)
    const rest = DESIGN.slice(at)
    const end = rest.indexOf('\n- **', 1)
    const bullet = end === -1 ? rest : rest.slice(0, end)
    expect(bullet).toContain('1 秒・2 秒・4 秒・8 秒')
    expect(bullet).toContain('4 回')
    expect(bullet).toContain('繋ぎ直し')
    expect(bullet).toContain('RS-90')
    expect(bullet).toContain('1008')
  })

  it('RS-90: the reason row cites AG-12 and says a reconnect by the page itself is not told', () => {
    const row = specTable('T-233').rows.find((one) => one.id === 'RS-90')
    expect(row).toBeDefined()
    const text = row?.cells.join(' ') ?? ''
    expect(text).toContain('AG-12')
    expect(text).toContain('繋ぎ直')
    expect(text).toContain('CR-808')
  })
})

// CR-796 slice 1, page side: a call that waits on a person returns at once (AG-12 (2) (6), AM-8, AM-17, AV-15, RS-90).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  agentApiMembers,
  type AgentApiWiring,
} from '../../src/adapter/agent-api-endpoint/agent-api-members'
import type { AgentSnapshot } from '../../src/adapter/agent-api-endpoint/snapshot-source'
import { relayTimedOutResult } from '../../src/adapter/mcp-tool-translator/mcp-tool-translator'
import type { Document } from '../../src/entity/document-model/document/document'
import { NOT_STORED_LIMITS, type EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { DEFAULT_TASK_GROUP_NAME } from '../../src/adapter/screen-renderer/screen-renderer'
import { openAgentApiRelayLink } from '../../src/framework/single-html-shell/agent-api-relay-link'
import type { ChangeStep, SettingsLimits } from '../../src/use-case/apply-document-change/apply-document-change'
import { emptyChangeWatchers } from '../../src/use-case/notify-change-watchers/notify-change-watchers'
import { specTable, unbroken } from './spec-table'

type Json = Record<string, unknown>

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Document

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const startingDocument = (): Document =>
  ({
    ...structuredClone(TEMPLATE),
    documentStamp: {
      scheduleUpdatedAt: '2026-10-18T10:00:00Z',
      fileSavedAt: '2026-10-18T10:00:00Z',
      lastEditedBy: 'a person at the keyboard',
      settingsUpdatedAt: '2026-10-18T10:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const HISTORY_LIMITS = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * 1024 * 1024,
}

const SETTINGS_LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }

type TakeIn = AgentApiWiring['takeInDocument']

function wiringWith(takeInDocument: TakeIn): AgentApiWiring {
  const state = {
    document: startingDocument(),
    history: { done: [], undone: [] } as EditHistory<ChangeStep>,
  }
  const readSnapshot = (): AgentSnapshot => ({
    defaultTaskGroupName: DEFAULT_TASK_GROUP_NAME,
    document: state.document,
    documentAsWritten: state.document,
    selection: emptySelection(),
    frame: null,
    exportScene: null,
    isGestureInFlight: false,
    isEditingInPlace: false,
    isQuestionAsked: false,
    isDeliveringNotices: false,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: SETTINGS_LIMITS,
    readAt: '2026-10-18T08:30:00Z',
    localReadAt: '2026-10-18T09:00:00',
  })
  return {
    changeWatchers: emptyChangeWatchers(),
    source: { readSnapshot },
    holder: {
      read: () => ({ document: state.document, history: state.history }),
      replace: (next) => {
        state.document = next.document
        state.history = next.history
      },
    },
    audience: { deliver: () => undefined },
    rasterizer: undefined,
    takeInDocument,
    shownTasks: undefined,
    appShell: undefined,
    writerName: 'agent under test',
    schemaVersion: String((TEMPLATE as unknown as Json)['schemaVersion']),
  }
}

// WHY: the third parameter is the new seam; typed loosely so the file compiles before and after the change.
type Asking = (incoming: unknown, reading: unknown, onAsked: (asked: 'U-61') => void) => Promise<unknown>
const road = (body: Asking): TakeIn => body as unknown as TakeIn

describe('CR-796 AM-8 / AG-12 (6): importDocument returns at once when the road asks a person (AV-15)', () => {
  it('AM-8: a road that asks and has not settled -> { ok: true, asked: "U-61", stamp } without waiting for the road', async () => {
    let finish: (landing: unknown) => void = () => undefined
    const api = agentApiMembers(
      wiringWith(
        road(
          (_incoming, _reading, onAsked) =>
            new Promise((resolve) => {
              onAsked('U-61')
              finish = resolve
            }),
        ),
      ),
    )
    const stampBefore = api.readStamp()
    const outcome = await Promise.race([
      api.importDocument(startingDocument()),
      new Promise<'waited'>((resolve) => setTimeout(() => resolve('waited'), 500)),
    ])
    expect(outcome).not.toBe('waited')
    expect(outcome).toEqual({ ok: true, asked: 'U-61', stamp: stampBefore })
    finish(true)
  })

  it('AV-15: the asked outcome carries no refusal and no hasUpdatedSchedule (nothing is written yet)', async () => {
    const api = agentApiMembers(
      wiringWith(
        road(
          (_incoming, _reading, onAsked) =>
            new Promise(() => {
              onAsked('U-61')
            }),
        ),
      ),
    )
    const outcome = (await Promise.race([
      api.importDocument(startingDocument()),
      new Promise((resolve) => setTimeout(() => resolve({ waited: true }), 500)),
    ])) as Json
    expect(outcome['ok']).toBe(true)
    expect(outcome).not.toHaveProperty('refusal')
    expect(outcome).not.toHaveProperty('hasUpdatedSchedule')
  })

  it('AM-8: the road settling after it asked changes nothing already answered, and does not throw', async () => {
    let finish: (landing: unknown) => void = () => undefined
    const api = agentApiMembers(
      wiringWith(
        road(
          (_incoming, _reading, onAsked) =>
            new Promise((resolve) => {
              onAsked('U-61')
              finish = resolve
            }),
        ),
      ),
    )
    const outcome = await Promise.race([
      api.importDocument(startingDocument()),
      new Promise((resolve) => setTimeout(() => resolve({ waited: true }), 500)),
    ])
    finish(true)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(outcome).toMatchObject({ ok: true, asked: 'U-61' })
  })

  it('AM-8: a road that settles without asking -> the old AgentWriteOutcome, no "asked"', async () => {
    const api = agentApiMembers(wiringWith(road(async () => true)))
    const outcome = (await api.importDocument(startingDocument())) as unknown as Json
    expect(outcome['ok']).toBe(true)
    expect(outcome).not.toHaveProperty('asked')
    expect(outcome).toHaveProperty('hasUpdatedSchedule')
  })

  it('AM-8: a road that settles with a refusal without asking -> { ok: false, refusal }, no "asked"', async () => {
    const landing = { landed: false, refusals: [] }
    const api = agentApiMembers(wiringWith(road(async () => landing)))
    const outcome = (await api.importDocument(startingDocument())) as unknown as Json
    expect(outcome).not.toHaveProperty('asked')
    expect(outcome['ok']).toBe(false)
    expect(outcome).toHaveProperty('refusal')
  })

  it('AM-8: the road is given a function as its third parameter', async () => {
    let seen: unknown = 'never called'
    const api = agentApiMembers(
      wiringWith(
        road(async (_incoming, _reading, onAsked) => {
          seen = onAsked
          return true
        }),
      ),
    )
    await api.importDocument(startingDocument())
    expect(typeof seen).toBe('function')
  })
})

describe('CR-796 relayTimedOutResult(member, deadlineMs): the pure answer for a call the page never answered (design 5)', () => {
  const structuredOf = (result: unknown): Json => (result as { structuredContent: Json }).structuredContent
  const refusalOf = (result: unknown): Json => structuredOf(result)['refusal'] as Json
  const textOf = (result: unknown): string =>
    ((result as { content: { type: string; text: string }[] }).content[0] as { text: string }).text

  it('design 5: it is a value (not an MCP error) whose refusal has target "relay" and reason "relayTimedOut"', () => {
    const result = relayTimedOutResult('importDocument', 45000)
    expect(result).not.toHaveProperty('isError', true)
    expect(structuredOf(result)['ok']).toBe(false)
    expect(refusalOf(result)['target']).toBe('relay')
    expect(refusalOf(result)['reason']).toBe('relayTimedOut')
  })

  it('design 5: its text names the member, and differs for another member', () => {
    const one = relayTimedOutResult('importDocument', 45000)
    const other = relayTimedOutResult('applyCommands', 45000)
    expect(textOf(one)).toContain('importDocument')
    expect(textOf(other)).toContain('applyCommands')
    expect(textOf(one)).not.toContain('applyCommands')
    expect(JSON.stringify(refusalOf(one))).toContain('importDocument')
  })

  it('design 5: it is pure -- the same arguments give an equal value', () => {
    expect(relayTimedOutResult('readStamp', 200)).toEqual(relayTimedOutResult('readStamp', 200))
  })

  it('design 5: the refusal carries no document and no stamp (the page did not answer)', () => {
    const refusal = refusalOf(relayTimedOutResult('readStamp', 200))
    expect(refusal['stamp'] ?? null).toBeNull()
    expect(refusal['document'] ?? null).toBeNull()
  })
})

describe('CR-796 / CR-808 openAgentApiRelayLink(api, place, openSocket, onLost): RS-90 only when no reconnect connects (AG-12 (2))', () => {
  // WHY: CR-808 -- a drop is first answered by up to four reconnect tries (1 s, 2 s, 4 s, 8 s), so time must be ours.
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  type Listener = (event: unknown) => void

  class FakeSocket {
    readonly sent: Json[] = []
    closeCalls = 0
    private readonly listeners = new Map<string, Listener[]>()
    onopen: Listener | null = null
    onmessage: Listener | null = null
    onclose: Listener | null = null
    onerror: Listener | null = null

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
      this.emit('close')
    }

    emit(type: 'open' | 'message' | 'close' | 'error', event: unknown = {}): void {
      for (const listener of this.listeners.get(type) ?? []) listener(event)
      const property = this[`on${type}`]
      if (property !== null) property(event)
    }
  }

  // WHY: a retry socket that never opens and closes is a try that did not connect (design 5).
  const failAllTries = (sockets: FakeSocket[]): void => {
    for (const delayMs of [1000, 2000, 4000, 8000]) {
      vi.advanceTimersByTime(delayMs)
      sockets[sockets.length - 1]?.emit('close', { code: 1006 })
    }
  }

  const openLink = (): { link: { close(): void } | null; socket: FakeSocket; sockets: FakeSocket[]; lost: number[] } => {
    const sockets: FakeSocket[] = []
    const lost: number[] = []
    const open = openAgentApiRelayLink as unknown as (
      api: unknown,
      place: { hash: string; host: string },
      openSocket: (address: string) => unknown,
      onLost: () => void,
    ) => { close(): void } | null
    const link = open(
      {},
      { hash: '#a-key', host: '127.0.0.1:54690' },
      () => {
        const made = new FakeSocket()
        sockets.push(made)
        return made
      },
      () => void lost.push(lost.length + 1),
    )
    const socket = sockets[0]
    if (socket === undefined) throw new Error('no socket was opened')
    return { link, socket, sockets, lost }
  }

  it('AG-12 (2) / CR-808: a socket that had opened and then closes -> onLost is called once, after all four reconnect tries fail', () => {
    const { socket, sockets, lost } = openLink()
    socket.emit('open')
    socket.emit('close')
    expect(lost).toEqual([])
    failAllTries(sockets)
    expect(sockets).toHaveLength(5)
    expect(lost).toHaveLength(1)
  })

  it('AG-12 (2) / CR-808: an error followed by the close still calls onLost once, not twice', () => {
    const { socket, sockets, lost } = openLink()
    socket.emit('open')
    socket.emit('error')
    socket.emit('close')
    socket.emit('close')
    expect(lost).toEqual([])
    failAllTries(sockets)
    expect(lost).toHaveLength(1)
  })

  it("AG-12 (2): the link's own close() is not a loss -- onLost is not called", () => {
    const { link, socket, lost } = openLink()
    socket.emit('open')
    link?.close()
    expect(socket.closeCalls).toBeGreaterThan(0)
    expect(lost).toEqual([])
  })

  it('AG-12 (2): no close at all -> onLost is not called', () => {
    const { socket, lost } = openLink()
    socket.emit('open')
    expect(lost).toEqual([])
  })
})

describe('CR-796 spec text: RS-90 and AG-12 (6)', () => {
  it('T-233 has a row RS-90 that cites AG-12', () => {
    const row = specTable('T-233').rows.find((one) => one.id === 'RS-90')
    expect(row).toBeDefined()
    expect(row?.cells.join(' ')).toContain('AG-12')
  })

  it('AG-12 (6): the requirement says a call that needs a person answers at once with AV-15', () => {
    const at = REQUIREMENTS.indexOf('| AG-12 |')
    expect(at).toBeGreaterThan(-1)
    const row = REQUIREMENTS.slice(at, REQUIREMENTS.indexOf('\n', at))
    const six = row.slice(row.indexOf('⑥'))
    expect(six).toContain('AV-15')
    expect(six).toContain('U-61')
  })

  it('AM-8 and AV-15: the member table gives importDocument the AV-15 outcome', () => {
    const table = readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-agent-api-members.md'), 'utf8')
    const lineOf = (id: string): string => table.split(/\r?\n/).find((line) => line.startsWith(`| ${id} |`)) ?? ''
    expect(lineOf('AM-8')).toContain('AV-15')
    expect(lineOf('AV-15')).toContain('AgentImportOutcome')
  })
})

// see AG-12
describe('AG-12 (2) (6) -- the clauses slice 1 added, held verbatim', () => {
  const requirements = readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8')
  const clauses = [
    'どの試みも繋がらなかったときだけ 表 T-233 の `RS-90` を告げること（MUST）',
    '問いを出したら答えを待たずに値（`_assets/tbl-agent-api-members.md` の 表 T-400 の `AV-15` の「人に問うたとき」）で返すこと（MUST）',
    '人が答えた後の書き込みは人の書き込みとして刻印に残し（`FR-063`）、本表の `AG-6` の監視で呼んだ側へ届けること（MUST）',
    '取次は、ページが答えない呼び出しに、AI のアプリの要求の時間切れより短い締め切り（`_assets/design-mcp-relay.md` の 5）で拒否を値で返すこと（MUST）',
  ]
  it.each(clauses)('the specification says: %s', (clause) => {
    expect(requirements).toContain(clause)
  })
})

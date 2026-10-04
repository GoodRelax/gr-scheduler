// CR-613 spec-only tests: SEAM-1, answerRelayedCall (PI-17, UF-185) against a fake AgentApi built from table T-107.

import { describe, expect, it } from 'vitest'

import {
  answerRelayedCall,
  type AgentApi,
  type RelayedAnswer,
  type RelayedCall,
} from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { specTable } from './spec-table'

// see T-107
const PARAM_KEYS: Readonly<Record<string, readonly string[]>> = {
  agentApiVersion: [],
  schemaVersion: [],
  readDocument: [],
  readStamp: [],
  readSelection: [],
  readDialogueMessages: [],
  readSearchRows: ['word'],
  readShownTasks: [],
  readDelayDiagnostics: [],
  applyCommands: ['request'],
  importDocument: ['source'],
  undoEdit: [],
  redoEdit: [],
  exportJson: [],
  exportMspdi: [],
  exportSvg: [],
  exportPng: [],
  exportEmbeddedHtml: [],
  focusTask: ['taskUid'],
  showOnlyTasks: ['taskUids'],
  watchChanges: [],
  postDialogueMessage: ['text'],
}

const PROPERTIES = new Set(['agentApiVersion', 'schemaVersion'])

// WHY: the two write members answer { accepted }, every other member { ok } (SEAM-1).
const ANSWERS_ACCEPTED = new Set(['applyCommands', 'importDocument'])

const MEMBERS: readonly string[] = specTable('T-107').rows.map((row) => (row.cells[1] ?? '').replace(/`/g, ''))

const METHODS = MEMBERS.filter((name) => !PROPERTIES.has(name))

const A_STAMP = 'stamp-41'

const PARAMS_OF: Readonly<Record<string, Record<string, unknown>>> = {
  readSearchRows: { word: 'kick-off' },
  applyCommands: { request: { stamp: A_STAMP, commands: [{ kind: 'setProjectTitle', title: 'x' }] } },
  importDocument: { source: { kind: 'grsJson', text: '{}' } },
  focusTask: { taskUid: 17 },
  showOnlyTasks: { taskUids: [17] },
  postDialogueMessage: { text: 'why did you move it?' },
}

const paramsFor = (member: string): Record<string, unknown> => PARAMS_OF[member] ?? {}

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 255, 128])

type Mode = 'answer' | 'refuse'

interface Fake {
  readonly api: AgentApi
  readonly calls: { member: string; args: unknown[] }[]
  readonly receivers: ((notice: unknown) => void)[]
}

const refusalOf = (member: string): Record<string, unknown> => ({
  target: member,
  reason: 'RS-61',
  stamp: A_STAMP,
  refusals: [{ target: 'task:3', reason: 'IV-2' }],
})

const valueOf = (member: string, mode: Mode, args: readonly unknown[]): unknown => {
  if (member === 'exportPng') {
    return mode === 'answer' ? { ok: true, value: PNG_BYTES } : { ok: false, refusal: refusalOf(member) }
  }
  if (ANSWERS_ACCEPTED.has(member)) {
    return mode === 'answer'
      ? { accepted: true, stamp: A_STAMP, echo: args }
      : { accepted: false, refusal: refusalOf(member) }
  }
  return mode === 'answer'
    ? { ok: true, stamp: A_STAMP, value: { member, echo: args } }
    : { ok: false, refusal: refusalOf(member) }
}

// WHY: exportPng and importDocument answer a promise, so an implementation
// that forgets to await is seen; the rest answer at once.
const ASYNC_MEMBERS = new Set(['exportPng', 'importDocument'])

const fakeApi = (mode: Mode): Fake => {
  const calls: { member: string; args: unknown[] }[] = []
  const receivers: ((notice: unknown) => void)[] = []
  const api: Record<string, unknown> = { agentApiVersion: '9.8.7-fake', schemaVersion: 42 }
  for (const member of METHODS) {
    api[member] = (...args: unknown[]): unknown => {
      calls.push({ member, args })
      if (member === 'watchChanges') {
        receivers.push(args[0] as (notice: unknown) => void)
        return { hasReplacedEarlierWatch: receivers.length > 1 }
      }
      const value = valueOf(member, mode, args)
      return ASYNC_MEMBERS.has(member) ? Promise.resolve(value) : value
    }
  }
  return { api: api as unknown as AgentApi, calls, receivers }
}

const callOf = (member: string, params: Record<string, unknown> = paramsFor(member)): RelayedCall =>
  ({ member, params }) as unknown as RelayedCall

const noNotice = (): void => undefined

const resultOf = (answer: RelayedAnswer): unknown => {
  if (!('result' in answer)) throw new Error(`expected a result, got ${JSON.stringify(answer)}`)
  return answer.result
}

const directAnswer = async (api: AgentApi, member: string): Promise<unknown> => {
  const table = api as unknown as Record<string, unknown>
  if (PROPERTIES.has(member)) return table[member]
  const args = (PARAM_KEYS[member] ?? []).map((key) => paramsFor(member)[key])
  return await (table[member] as (...a: unknown[]) => unknown)(...args)
}

describe('SEAM-1: the fake is built from table T-107', () => {
  it('T-107 names exactly the members the seam gives parameters to', () => {
    expect([...MEMBERS].sort()).toEqual(Object.keys(PARAM_KEYS).sort())
  })
})

describe('SEAM-1 answerRelayedCall: every member answers what a direct call answers', () => {
  it('SEAM-1 properties: agentApiVersion and schemaVersion come back as the property value', async () => {
    const { api } = fakeApi('answer')
    expect(resultOf(await answerRelayedCall(api, callOf('agentApiVersion'), noNotice))).toBe('9.8.7-fake')
    expect(resultOf(await answerRelayedCall(api, callOf('schemaVersion'), noNotice))).toBe(42)
  })

  it('SEAM-1 observable: each method of T-107 (but exportPng and watchChanges) answers what it returns, awaited', async () => {
    for (const member of METHODS.filter((name) => name !== 'exportPng' && name !== 'watchChanges')) {
      const { api } = fakeApi('answer')
      const answer = await answerRelayedCall(api, callOf(member), noNotice)
      expect(answer, member).not.toHaveProperty('error')
      expect(resultOf(answer), member).toEqual(await directAnswer(fakeApi('answer').api, member))
    }
  })

  it('SEAM-1: the params are spread into the member in the order of the seam\'s keys', async () => {
    for (const member of METHODS.filter((name) => name !== 'watchChanges')) {
      const fake = fakeApi('answer')
      await answerRelayedCall(fake.api, callOf(member), noNotice)
      const expected = (PARAM_KEYS[member] ?? []).map((key) => paramsFor(member)[key])
      expect(fake.calls, member).toEqual([{ member, args: expected }])
    }
  })

  it('AG-9a / SEAM-1: a refusal of every member comes back as the value it is -- never as error, same reason and stamp', async () => {
    for (const member of METHODS.filter((name) => name !== 'watchChanges')) {
      const { api } = fakeApi('refuse')
      const answer = await answerRelayedCall(api, callOf(member), noNotice)
      expect(answer, member).not.toHaveProperty('error')
      expect(resultOf(answer), member).toEqual(await directAnswer(fakeApi('refuse').api, member))
    }
  })

  it('design 3.2: exportPng\'s bytes come back as their base64 string', async () => {
    const { api } = fakeApi('answer')
    const answer = await answerRelayedCall(api, callOf('exportPng'), noNotice)
    expect(resultOf(answer)).toEqual({ ok: true, value: Buffer.from(PNG_BYTES).toString('base64') })
  })

  it('AG-8 / SEAM-1: exportPng\'s refusal is unchanged', async () => {
    const { api } = fakeApi('refuse')
    const answer = await answerRelayedCall(api, callOf('exportPng'), noNotice)
    expect(resultOf(answer)).toEqual({ ok: false, refusal: refusalOf('exportPng') })
  })

  it('SEAM-1: the answer is plain JSON -- it survives JSON.stringify and parse unchanged for every member', async () => {
    for (const member of MEMBERS.filter((name) => name !== 'watchChanges')) {
      const { api } = fakeApi('answer')
      const answer = await answerRelayedCall(api, callOf(member), noNotice)
      expect(JSON.parse(JSON.stringify(answer)), member).toEqual(answer)
    }
  })
})

describe('SEAM-1 watchChanges: subscribes and forwards every notice (design 3.3, AG-6)', () => {
  it('subscribes once through api.watchChanges and answers what it returned', async () => {
    const fake = fakeApi('answer')
    const answer = await answerRelayedCall(fake.api, callOf('watchChanges'), noNotice)
    expect(fake.calls.filter((one) => one.member === 'watchChanges')).toHaveLength(1)
    expect(fake.receivers).toHaveLength(1)
    expect(resultOf(answer)).toEqual({ hasReplacedEarlierWatch: false })
  })

  it('every notice the subscription receives goes to sendNotice, in order', async () => {
    const fake = fakeApi('answer')
    const sent: unknown[] = []
    await answerRelayedCall(fake.api, callOf('watchChanges'), (notice) => void sent.push(notice))
    const first = { kind: 'scheduleChanged', stamp: 'stamp-42' }
    const second = { kind: 'dialogueMessage', text: 'wait' }
    fake.receivers[0]?.(first)
    fake.receivers[0]?.(second)
    expect(sent).toEqual([first, second])
  })

  it('AG-6: a second watch answers hasReplacedEarlierWatch as the member returned it', async () => {
    const fake = fakeApi('answer')
    await answerRelayedCall(fake.api, callOf('watchChanges'), noNotice)
    const again = await answerRelayedCall(fake.api, callOf('watchChanges'), noNotice)
    expect(resultOf(again)).toEqual({ hasReplacedEarlierWatch: true })
  })

  it('no other member sends a notice', async () => {
    const sent: unknown[] = []
    for (const member of MEMBERS.filter((name) => name !== 'watchChanges')) {
      await answerRelayedCall(fakeApi('answer').api, callOf(member), (notice) => void sent.push(notice))
    }
    expect(sent).toEqual([])
  })
})

describe('SEAM-1: an error only when the member could not be called', () => {
  const errorOf = (answer: RelayedAnswer): { code: number; message: string } => {
    if (!('error' in answer)) throw new Error(`expected an error, got ${JSON.stringify(answer)}`)
    return answer.error
  }

  it('a name that is not a member of AgentApi gives -32601', async () => {
    for (const member of ['notAMember', 'readstamp', 'constructor', 'toString', '__proto__']) {
      const answer = await answerRelayedCall(fakeApi('answer').api, callOf(member, {}), noNotice)
      const error = errorOf(answer)
      expect(error.code, member).toBe(-32601)
      expect(typeof error.message, member).toBe('string')
    }
  })

  it('a member that throws gives -32603 with a message', async () => {
    const fake = fakeApi('answer')
    const api = { ...(fake.api as unknown as Record<string, unknown>) }
    api['readStamp'] = (): never => {
      throw new Error('the member threw')
    }
    const error = errorOf(await answerRelayedCall(api as unknown as AgentApi, callOf('readStamp'), noNotice))
    expect(error.code).toBe(-32603)
    expect(error.message.length).toBeGreaterThan(0)
  })

  it('a member that rejects gives -32603 with a message', async () => {
    const fake = fakeApi('answer')
    const api = { ...(fake.api as unknown as Record<string, unknown>) }
    api['exportPng'] = (): Promise<never> => Promise.reject(new Error('the member rejected'))
    const error = errorOf(await answerRelayedCall(api as unknown as AgentApi, callOf('exportPng'), noNotice))
    expect(error.code).toBe(-32603)
    expect(error.message.length).toBeGreaterThan(0)
  })
})

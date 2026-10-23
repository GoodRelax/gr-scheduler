// DFC-2641 spec-only cases: for every member of table T-107, the MCP tool input keys are the manuscript's argument names and a tool call under them reaches the AgentApi member with those arguments, in the manuscript's order.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { answerRelayedCall, type AgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { mcpToolList, relayedCallOf } from '../../src/adapter/mcp-tool-translator/mcp-tool-translator'
import { unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const MANUSCRIPT = JSON.parse(readFileSync(join(SPEC, '_source', 'agent-api-members.json'), 'utf8'))
const RELAY_DESIGN = unbroken(readFileSync(join(SPEC, '_assets', 'design-mcp-relay.md'), 'utf8').replace(/\r\n/g, '\n'))

// see AG-12, T-107
const INPUT_KEYS_ARE_ARGUMENTS = '1 つのオブジェクトとし、鍵はそのメンバの引数の名とする。'
const ARGUMENTS_HELD_BY_T_107 = '引数の名・型・意味は 表 T-107 の引数の欄が持ち（`tbl-agent-api-members.md`）、道具の入力の形はその原稿から刷り、手で書かない。'
const WAIT_KEY_ONLY = '⚠️ `watchChanges` だけは受け手の代わりに待つ長さ `waitMs` を受ける（`AG-12` の ⑤）'
const RELAY_ANSWERS_READ_SCHEMA = '⚠️ `readSchema`（`AM-30`）だけは取次が自分で答える（`AG-12` の ④）'

interface ManuscriptKey {
  readonly name: string
}

interface ManuscriptMember {
  readonly id: string
  readonly name: string
  readonly kind: 'property' | 'method'
  readonly arguments: readonly ManuscriptKey[]
  readonly mcpOnlyKeys?: readonly ManuscriptKey[]
}

const MEMBERS: readonly ManuscriptMember[] = MANUSCRIPT.members.rows
const RELAY_ANSWERED = 'readSchema'
const WATCH = 'watchChanges'
const PAGE_MEMBERS = MEMBERS.filter((member) => member.name !== RELAY_ANSWERED)
const PAGE_METHODS = PAGE_MEMBERS.filter((member) => member.kind === 'method' && member.name !== WATCH)

const noNotice = (): void => undefined
const sentinelOf = (member: string, key: string): string => `dfc-2641-${member}-${key}`

const toolNamed = (name: string) => {
  const found = mcpToolList().find((tool) => tool.name === name)
  if (found === undefined) throw new Error(`mcpToolList has no tool ${name}`)
  return found
}

// see AG-12
// WHY: a member with MCP-only keys takes those at the MCP door; the receiver of watchChanges never reaches it.
const mcpKeysOf = (member: ManuscriptMember): readonly string[] => {
  if (member.name === WATCH) return (member.mcpOnlyKeys ?? []).map((key) => key.name)
  return [...member.arguments, ...(member.mcpOnlyKeys ?? [])].map((key) => key.name)
}

describe('DFC-2641 -- the specification these cases are driven by', () => {
  it('design 3.1 still says the input keys are the argument names table T-107 holds, waitMs aside, readSchema answered by the relay', () => {
    expect(RELAY_DESIGN).toContain(INPUT_KEYS_ARE_ARGUMENTS)
    expect(RELAY_DESIGN).toContain(ARGUMENTS_HELD_BY_T_107)
    expect(RELAY_DESIGN).toContain(WAIT_KEY_ONLY)
    expect(RELAY_DESIGN).toContain(RELAY_ANSWERS_READ_SCHEMA)
  })

  it('the manuscript holds the 27 members of T-107, and AM-30 is readSchema', () => {
    expect(MEMBERS).toHaveLength(27)
    expect(MEMBERS.find((member) => member.id === 'AM-30')?.name).toBe(RELAY_ANSWERED)
  })
})

describe('T-107 row by row: the MCP tool, the relayed call and the member agree on the manuscript argument names', () => {
  it.each(MEMBERS.map((member) => [member.id, member.name, member] as const))(
    '%s %s (T-107, design 3.1): the tool input keys are the manuscript argument names',
    (_id, name, member) => {
      expect(Object.keys(toolNamed(name).inputSchema.properties).sort()).toEqual([...mcpKeysOf(member)].sort())
    },
  )

  it.each(PAGE_METHODS.map((member) => [member.id, member.name, member] as const))(
    '%s %s (T-107, AG-12 (4)): a tool call keyed by the argument names reaches the member with those values, in the manuscript order',
    async (_id, name, member) => {
      const keys = member.arguments.map((key) => key.name)
      expect(Object.keys(toolNamed(name).inputSchema.properties)).toEqual(expect.arrayContaining(keys))
      const seen: unknown[][] = []
      const fake = {
        [name]: (...taken: unknown[]): unknown => {
          seen.push(taken)
          return { ok: true, value: '' }
        },
      } as unknown as AgentApi
      const call = relayedCallOf({ name, arguments: Object.fromEntries(keys.map((key) => [key, sentinelOf(name, key)])) })
      expect(call?.member).toBe(name)
      if (call === null) return
      await answerRelayedCall(fake, call, noNotice)
      expect(seen).toEqual([keys.map((key) => sentinelOf(name, key))])
    },
  )

  it.each(PAGE_MEMBERS.filter((member) => member.kind === 'property').map((member) => [member.id, member.name] as const))(
    '%s %s (T-107, design 3.1): a property is a tool with an empty input whose call answers the value',
    async (_id, name) => {
      expect(Object.keys(toolNamed(name).inputSchema.properties)).toEqual([])
      const call = relayedCallOf({ name, arguments: {} })
      if (call === null) throw new Error(`no relayed call for ${name}`)
      expect(await answerRelayedCall({ [name]: 'dfc-2641-value' } as unknown as AgentApi, call, noNotice)).toEqual({
        result: 'dfc-2641-value',
      })
    },
  )
})

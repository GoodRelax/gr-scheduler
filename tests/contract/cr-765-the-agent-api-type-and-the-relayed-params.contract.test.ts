// CR-765 spec-only tests: the AgentApi type, AGENT_API_VERSION and RelayedParams the generator prints from table T-107 and T-400.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  answerRelayedCall,
  installAgentApi,
  type AgentApi as PublishedAgentApi,
  type AgentApiWiring,
  type RelayedCall,
} from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import type {
  AgentApi,
  AgentChangeReceiver,
  AgentDelayDiagnostics,
  AgentExport,
  AgentFocusOutcome,
  AgentImportSource,
  AgentRefusal,
  AgentRefusalReason,
  AgentShownTasks,
  AgentUtteranceOutcome,
  AgentWatch,
  AgentWriteOutcome,
  AgentWriteRequest,
} from '../../src/adapter/agent-api-endpoint/agent-api-members'
import type { RelayedParams } from '../../src/adapter/agent-api-endpoint/relayed-call'
import type { DialogueMessage } from '../../src/entity/document-model/dialogue-log/dialogue-log'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Selection } from '../../src/entity/document-model/selection/selection'
import type { SearchRows } from '../../src/entity/document-model/schedule/schedule'
import { printedMembers } from './cr-765-printed-tables'
import { unbroken } from './spec-table'

const { members } = printedMembers()

const SCHEMA_VERSION_HELD = 'the-format-version-of-this-build'

const stubbedWiring = { schemaVersion: SCHEMA_VERSION_HELD } as unknown as AgentApiWiring

const MANUSCRIPT = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'agent-api-members.json'), 'utf8'),
) as { readonly version: number }

const PRINTED = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-agent-api-members.md'), 'utf8'))

type Stamp = Document['documentStamp']

const noNotice = (): void => undefined

describe('AM-1 and AG-1: the version the AgentApi hands out is the one the table prints', () => {
  it('agentApiVersion is 4 -- the number the prose of T-107 gives and the manuscript declares', () => {
    expect(installAgentApi(stubbedWiring).agentApiVersion).toBe(4)
    expect(MANUSCRIPT.version).toBe(4)
    expect(PRINTED).toContain('いまの版は 4 である（`AM-1` が返す値）')
  })

  it('schemaVersion is the format version the page was wired with (AM-2)', () => {
    expect(installAgentApi(stubbedWiring).schemaVersion).toBe(SCHEMA_VERSION_HELD)
  })
})

describe('the AgentApi value has exactly the 22 members of T-107, a property or a method as the table says', () => {
  const api = installAgentApi(stubbedWiring) as unknown as Record<string, unknown>

  it('the keys are the confirmed names', () => {
    expect(Object.keys(api).sort()).toEqual(members.map((one) => one.name).sort())
  })

  it.each(members.map((one) => [one.id, one.name, one.isProperty] as const))('%s %s: a property is a value and a method is a function', (_id, name, isProperty) => {
    expect(typeof api[name] === 'function', name).toBe(!isProperty)
  })

  it('a method takes as many arguments as the table prints for it, MCP-only keys not counted', () => {
    for (const one of members.filter((member) => !member.isProperty)) {
      const taken = one.arguments.filter((argument) => !argument.isMcpOnly).length
      expect((api[one.name] as (...rest: unknown[]) => unknown).length, `${one.id} ${one.name}`).toBe(taken)
    }
  })
})

describe('the AgentApi type, member by member (T-107)', () => {
  it('has 22 members and the published AgentApi is the same type', () => {
    expectTypeOf<keyof AgentApi>().toEqualTypeOf<
      | 'agentApiVersion'
      | 'schemaVersion'
      | 'readDocument'
      | 'readStamp'
      | 'readSelection'
      | 'readDialogueMessages'
      | 'readSearchRows'
      | 'readShownTasks'
      | 'readDelayDiagnostics'
      | 'applyCommands'
      | 'importDocument'
      | 'undoEdit'
      | 'redoEdit'
      | 'exportJson'
      | 'exportMspdi'
      | 'exportSvg'
      | 'exportPng'
      | 'exportEmbeddedHtml'
      | 'focusTask'
      | 'showOnlyTasks'
      | 'watchChanges'
      | 'postDialogueMessage'
    >()
    expectTypeOf<PublishedAgentApi>().toEqualTypeOf<AgentApi>()
  })

  it('the two properties are a number and a string', () => {
    expectTypeOf<AgentApi['agentApiVersion']>().toEqualTypeOf<number>()
    expectTypeOf<AgentApi['schemaVersion']>().toEqualTypeOf<string>()
  })

  it('the readers return what the return column names', () => {
    expectTypeOf<ReturnType<AgentApi['readDocument']>>().toEqualTypeOf<Document>()
    expectTypeOf<ReturnType<AgentApi['readStamp']>>().toEqualTypeOf<Stamp>()
    expectTypeOf<ReturnType<AgentApi['readSelection']>>().toEqualTypeOf<Selection>()
    expectTypeOf<ReturnType<AgentApi['readDialogueMessages']>>().toEqualTypeOf<readonly DialogueMessage[]>()
    expectTypeOf<ReturnType<AgentApi['readSearchRows']>>().toEqualTypeOf<SearchRows>()
    expectTypeOf<ReturnType<AgentApi['readShownTasks']>>().toEqualTypeOf<AgentShownTasks>()
    expectTypeOf<ReturnType<AgentApi['readDelayDiagnostics']>>().toEqualTypeOf<AgentDelayDiagnostics>()
    expectTypeOf<Parameters<AgentApi['readSearchRows']>>().toEqualTypeOf<[word: string]>()
  })

  it('the writers take and return what the argument and return columns name', () => {
    expectTypeOf<Parameters<AgentApi['applyCommands']>>().toEqualTypeOf<[request: AgentWriteRequest]>()
    expectTypeOf<ReturnType<AgentApi['applyCommands']>>().toEqualTypeOf<AgentWriteOutcome>()
    expectTypeOf<Parameters<AgentApi['importDocument']>>().toEqualTypeOf<[source: AgentImportSource]>()
    expectTypeOf<ReturnType<AgentApi['importDocument']>>().toEqualTypeOf<Promise<AgentWriteOutcome>>()
    expectTypeOf<ReturnType<AgentApi['undoEdit']>>().toEqualTypeOf<AgentWriteOutcome>()
    expectTypeOf<ReturnType<AgentApi['redoEdit']>>().toEqualTypeOf<AgentWriteOutcome>()
    expectTypeOf<Parameters<AgentApi['focusTask']>>().toEqualTypeOf<[taskUid: number]>()
    expectTypeOf<ReturnType<AgentApi['focusTask']>>().toEqualTypeOf<AgentFocusOutcome>()
    expectTypeOf<Parameters<AgentApi['showOnlyTasks']>>().toEqualTypeOf<[taskUids: readonly number[] | null]>()
    expectTypeOf<ReturnType<AgentApi['showOnlyTasks']>>().toEqualTypeOf<AgentWriteOutcome>()
  })

  it('the exporters return a value or a refusal; the two that wait return a promise of it', () => {
    expectTypeOf<ReturnType<AgentApi['exportJson']>>().toEqualTypeOf<AgentExport<string>>()
    expectTypeOf<ReturnType<AgentApi['exportMspdi']>>().toEqualTypeOf<AgentExport<string>>()
    expectTypeOf<ReturnType<AgentApi['exportSvg']>>().toEqualTypeOf<AgentExport<string>>()
    expectTypeOf<ReturnType<AgentApi['exportPng']>>().toEqualTypeOf<Promise<AgentExport<Uint8Array>>>()
    expectTypeOf<ReturnType<AgentApi['exportEmbeddedHtml']>>().toEqualTypeOf<Promise<AgentExport<string>>>()
  })

  it('watching takes a receiver and returns a watch; posting takes a text and returns an utterance outcome', () => {
    expectTypeOf<Parameters<AgentApi['watchChanges']>>().toEqualTypeOf<[receive: AgentChangeReceiver]>()
    expectTypeOf<ReturnType<AgentApi['watchChanges']>>().toEqualTypeOf<AgentWatch>()
    expectTypeOf<Parameters<AgentApi['postDialogueMessage']>>().toEqualTypeOf<[text: string]>()
    expectTypeOf<ReturnType<AgentApi['postDialogueMessage']>>().toEqualTypeOf<AgentUtteranceOutcome>()
  })

  it('a refusal carries the six fields of AV-3 and its reason is the type of AV-4', () => {
    expectTypeOf<keyof AgentRefusal>().toEqualTypeOf<'target' | 'reason' | 'stamp' | 'document' | 'refusals' | 'what'>()
    expectTypeOf<AgentRefusal['reason']>().toEqualTypeOf<AgentRefusalReason>()
  })
})

describe('RelayedParams: what the relay carries to each member is the argument column, without the MCP-only key', () => {
  it('has one entry per member of the AgentApi', () => {
    expectTypeOf<keyof RelayedParams>().toEqualTypeOf<keyof AgentApi>()
  })

  it('each entry holds the named arguments of its member', () => {
    expectTypeOf<RelayedParams['readSearchRows']>().toEqualTypeOf<{ word: string }>()
    expectTypeOf<RelayedParams['applyCommands']>().toEqualTypeOf<{ request: AgentWriteRequest }>()
    expectTypeOf<RelayedParams['importDocument']>().toEqualTypeOf<{ source: AgentImportSource }>()
    expectTypeOf<RelayedParams['focusTask']>().toEqualTypeOf<{ taskUid: number }>()
    expectTypeOf<RelayedParams['showOnlyTasks']>().toEqualTypeOf<{ taskUids: readonly number[] | null }>()
    expectTypeOf<RelayedParams['postDialogueMessage']>().toEqualTypeOf<{ text: string }>()
  })

  it('watchChanges carries nothing -- the relay reads waitMs itself and the page supplies the receiver', () => {
    expectTypeOf<RelayedParams['watchChanges']>().toEqualTypeOf<{}>()
    expectTypeOf<RelayedParams['agentApiVersion']>().toEqualTypeOf<{}>()
  })
})

describe('answerRelayedCall hands the named params to the member in the order the table prints them', () => {
  const sentinelOf = (member: string, key: string): string => `value-of-${member}-${key}`

  it.each(members.filter((one) => !one.isProperty && one.name !== 'watchChanges' && one.name !== 'exportPng').map((one) => [one.id, one.name] as const))(
    '%s %s',
    async (_id, name) => {
      const member = members.find((one) => one.name === name)
      if (member === undefined) throw new Error(`no member ${name}`)
      const keys = member.arguments.filter((argument) => !argument.isMcpOnly).map((argument) => argument.name)
      const seen: unknown[][] = []
      const fake = {
        [name]: (...taken: unknown[]): unknown => {
          seen.push(taken)
          return { echoed: true }
        },
      } as unknown as AgentApi
      const params = Object.fromEntries(keys.map((key) => [key, sentinelOf(name, key)]))
      const answer = await answerRelayedCall(fake, { member: name, params } as unknown as RelayedCall, noNotice)
      expect(answer).toEqual({ result: { echoed: true } })
      expect(seen).toEqual([keys.map((key) => sentinelOf(name, key))])
    },
  )

  it('a property comes back as its value, and watchChanges is given a receiver of the page\'s own', async () => {
    const received: unknown[] = []
    const fake = {
      agentApiVersion: 4,
      watchChanges: (receive: unknown): unknown => {
        received.push(receive)
        return { hasReplacedEarlierWatch: false, stopWatching: () => true }
      },
    } as unknown as AgentApi
    expect(await answerRelayedCall(fake, { member: 'agentApiVersion', params: {} }, noNotice)).toEqual({ result: 4 })
    expect(await answerRelayedCall(fake, { member: 'watchChanges', params: {} }, noNotice)).toEqual({
      result: { hasReplacedEarlierWatch: false },
    })
    expect(received).toHaveLength(1)
    expect(typeof received[0]).toBe('function')
  })
})

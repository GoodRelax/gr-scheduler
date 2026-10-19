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
  AgentWatch,
  AgentWriteOutcome,
  AgentImportOutcome,
  AgentSearchPage,
  AgentWriteRequest,
} from '../../src/adapter/agent-api-endpoint/agent-api-members'
import type { RelayedParams } from '../../src/adapter/agent-api-endpoint/relayed-call'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Selection } from '../../src/entity/document-model/selection/selection'
import { printedMembers } from './cr-765-printed-tables'
import { unbroken } from './spec-table'

const { members: printedAll } = printedMembers()

// WHY: AM-30 readSchema is answered by the relay (AG-12 (4)); the page's AgentApi has no such member (CR-799).
const members = printedAll.filter((one) => one.name !== 'readSchema')

const SCHEMA_VERSION_HELD = 'the-format-version-of-this-build'

const stubbedWiring = { schemaVersion: SCHEMA_VERSION_HELD } as unknown as AgentApiWiring

const MANUSCRIPT = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'agent-api-members.json'), 'utf8'),
) as { readonly version: number }

const PRINTED = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-agent-api-members.md'), 'utf8'))

type Stamp = Document['documentStamp']

const noNotice = (): void => undefined

describe('AM-1 and AG-1: the version the AgentApi hands out is the one the table prints', () => {
  it('agentApiVersion is the date-time the prose of T-107 gives and the manuscript declares (JDG-2741)', () => {
    expect(installAgentApi(stubbedWiring).agentApiVersion).toBe('2026-10-19T01:15:00Z')
    expect(MANUSCRIPT.version).toBe('2026-10-19T01:15:00Z')
    expect(MANUSCRIPT.version).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/)
    expect(PRINTED).toContain('いまの版は `2026-10-19T01:15:00Z` である（`AM-1` が返す値）')
  })

  it('schemaVersion is the format version the page was wired with (AM-2)', () => {
    expect(installAgentApi(stubbedWiring).schemaVersion).toBe(SCHEMA_VERSION_HELD)
  })
})

describe('the AgentApi value has exactly the 22 members of T-107 the page holds (all but the relay-answered AM-30), a property or a method as the table says', () => {
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
  it('has 26 members and the published AgentApi is the same type', () => {
    expectTypeOf<keyof AgentApi>().toEqualTypeOf<
      | 'agentApiVersion'
      | 'schemaVersion'
      | 'readDocument'
      | 'readStamp'
      | 'readSelection'
      | 'readSearchRows'
      | 'readTableRows'
      | 'readShownTasks'
      | 'readDelayDiagnostics'
      | 'applyCommands'
      | 'importDocument'
      | 'requestOpenFile'
      | 'issueDelayFixes'
      | 'undoEdit'
      | 'redoEdit'
      | 'exportJson'
      | 'exportMspdi'
      | 'exportSvg'
      | 'exportPng'
      | 'exportEmbeddedHtml'
      | 'exportFixLogTsv'
      | 'focusTask'
      | 'showOnlyTasks'
      | 'runDelayDiagnostics'
      | 'closeWindow'
      | 'watchChanges'
    >()
    expectTypeOf<PublishedAgentApi>().toEqualTypeOf<AgentApi>()
  })

  it('the two properties are a number and a string', () => {
    expectTypeOf<AgentApi['agentApiVersion']>().toEqualTypeOf<string>()
    expectTypeOf<AgentApi['schemaVersion']>().toEqualTypeOf<string>()
  })

  it('the readers return what the return column names', () => {
    expectTypeOf<ReturnType<AgentApi['readDocument']>>().toEqualTypeOf<Document>()
    expectTypeOf<ReturnType<AgentApi['readStamp']>>().toEqualTypeOf<Stamp>()
    expectTypeOf<ReturnType<AgentApi['readSelection']>>().toEqualTypeOf<Selection>()
    expectTypeOf<ReturnType<AgentApi['readSearchRows']>>().toEqualTypeOf<AgentSearchPage>()
    expectTypeOf<ReturnType<AgentApi['readShownTasks']>>().toEqualTypeOf<AgentShownTasks>()
    expectTypeOf<ReturnType<AgentApi['readDelayDiagnostics']>>().toEqualTypeOf<AgentDelayDiagnostics>()
    // see AM-3, AM-25
    expectTypeOf<Parameters<AgentApi['readDocument']>>().toEqualTypeOf<
      [includeCarry: boolean, taskUids: readonly number[], parts: readonly string[]]
    >()
    expectTypeOf<Parameters<AgentApi['readSearchRows']>>().toEqualTypeOf<
      [word: string, filters: 'asShown' | 'none', offset: number, limit: number]
    >()
  })

  it('the writers take and return what the argument and return columns name', () => {
    expectTypeOf<Parameters<AgentApi['applyCommands']>>().toEqualTypeOf<[request: AgentWriteRequest]>()
    expectTypeOf<ReturnType<AgentApi['applyCommands']>>().toEqualTypeOf<AgentWriteOutcome>()
    expectTypeOf<Parameters<AgentApi['importDocument']>>().toEqualTypeOf<[source: AgentImportSource]>()
    expectTypeOf<ReturnType<AgentApi['importDocument']>>().toEqualTypeOf<Promise<AgentImportOutcome>>()
    expectTypeOf<ReturnType<AgentApi['undoEdit']>>().toEqualTypeOf<AgentWriteOutcome>()
    expectTypeOf<ReturnType<AgentApi['redoEdit']>>().toEqualTypeOf<AgentWriteOutcome>()
    expectTypeOf<Parameters<AgentApi['focusTask']>>().toEqualTypeOf<[taskUid: number]>()
    expectTypeOf<ReturnType<AgentApi['focusTask']>>().toEqualTypeOf<AgentFocusOutcome>()
    expectTypeOf<Parameters<AgentApi['showOnlyTasks']>>().toEqualTypeOf<[taskUids: readonly number[]]>()
    expectTypeOf<ReturnType<AgentApi['showOnlyTasks']>>().toEqualTypeOf<AgentWriteOutcome>()
  })

  it('the exporters return a value or a refusal; the two that wait return a promise of it', () => {
    expectTypeOf<ReturnType<AgentApi['exportJson']>>().toEqualTypeOf<AgentExport<string>>()
    expectTypeOf<ReturnType<AgentApi['exportMspdi']>>().toEqualTypeOf<AgentExport<string>>()
    expectTypeOf<ReturnType<AgentApi['exportSvg']>>().toEqualTypeOf<AgentExport<string>>()
    expectTypeOf<ReturnType<AgentApi['exportPng']>>().toEqualTypeOf<Promise<AgentExport<Uint8Array>>>()
    expectTypeOf<ReturnType<AgentApi['exportEmbeddedHtml']>>().toEqualTypeOf<Promise<AgentExport<string>>>()
  })

  it('watching takes a receiver and returns a watch', () => {
    expectTypeOf<Parameters<AgentApi['watchChanges']>>().toEqualTypeOf<[receive: AgentChangeReceiver]>()
    expectTypeOf<ReturnType<AgentApi['watchChanges']>>().toEqualTypeOf<AgentWatch>()
  })

  it('a refusal carries the five fields of AV-3 (no document) and its reason is the type of AV-4', () => {
    expectTypeOf<keyof AgentRefusal>().toEqualTypeOf<'target' | 'reason' | 'stamp' | 'refusals' | 'message'>()
    expectTypeOf<AgentRefusal['reason']>().toEqualTypeOf<AgentRefusalReason>()
  })
})

describe('RelayedParams: what the relay carries to each member is the argument column, without the MCP-only key', () => {
  it('has one entry per member of the AgentApi', () => {
    expectTypeOf<keyof RelayedParams>().toEqualTypeOf<keyof AgentApi>()
  })

  it('each entry holds the named arguments of its member', () => {
    expectTypeOf<RelayedParams['readDocument']>().toEqualTypeOf<{
      includeCarry: boolean
      taskUids: readonly number[]
      parts: readonly string[]
    }>()
    expectTypeOf<RelayedParams['readSearchRows']>().toEqualTypeOf<{
      word: string
      filters: 'asShown' | 'none'
      offset: number
      limit: number
    }>()
    expectTypeOf<RelayedParams['applyCommands']>().toEqualTypeOf<{ request: AgentWriteRequest }>()
    expectTypeOf<RelayedParams['importDocument']>().toEqualTypeOf<{ source: AgentImportSource }>()
    expectTypeOf<RelayedParams['focusTask']>().toEqualTypeOf<{ taskUid: number }>()
    expectTypeOf<RelayedParams['showOnlyTasks']>().toEqualTypeOf<{ taskUids: readonly number[] }>()
    expectTypeOf<RelayedParams['readDelayDiagnostics']>().toEqualTypeOf<{ parts: readonly string[]; limit: number }>()
    expectTypeOf<RelayedParams['issueDelayFixes']>().toEqualTypeOf<{ expectedStamp: Stamp; fixKeys: readonly string[] }>()
    expectTypeOf<RelayedParams['runDelayDiagnostics']>().toEqualTypeOf<{}>()
    expectTypeOf<RelayedParams['closeWindow']>().toEqualTypeOf<{ which: 'delayDiagnosticsReport' | 'propertiesPanel' }>()
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

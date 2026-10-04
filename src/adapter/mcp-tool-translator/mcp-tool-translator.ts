// McpToolTranslator -- maps MCP tools to Agent API members and back (AG-12).
// @unit      UF-186   (docs/spec/05-07-design.md, table T-075)
// @component McpToolTranslator, layer Adapter (table T-062)
// @purity    pure
// @publishes table T-064 row PI-40

import type { answerRelayedCall } from '../agent-api-endpoint/agent-api-endpoint'
import toolDescriptions from './mcp-tool-descriptions.json'

// WHY: read off answerRelayedCall, the name table T-064 PI-17 lists; importing the
// types by name would cross the folder with names the table does not hold.
type AgentApi = Parameters<typeof answerRelayedCall>[0]
type RelayedCall = Parameters<typeof answerRelayedCall>[1]
type RelayedAnswer = Awaited<ReturnType<typeof answerRelayedCall>>

export interface McpTool {
  readonly name: string
  readonly description: string
  readonly inputSchema: { readonly type: 'object'; readonly properties: Record<string, object> }
}

export interface McpToolResult {
  readonly content: readonly (
    | { readonly type: 'text'; readonly text: string }
    | { readonly type: 'image'; readonly data: string; readonly mimeType: 'image/png' })[]
  readonly structuredContent?: Record<string, unknown>
  readonly isError?: boolean
}

type MemberName = keyof AgentApi

const WATCH_CHANGES = 'watchChanges'
const EXPORT_PNG = 'exportPng'
const PNG_MIME_TYPE = 'image/png'

type SchemaKeysOf<K extends MemberName> = K extends typeof WATCH_CHANGES
  ? 'waitMs'
  : keyof Extract<RelayedCall, { readonly member: K }>['params']

type SameKeys<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

type CheckedProperties<T> = {
  readonly [K in MemberName]: K extends keyof T
    ? SameKeys<keyof T[K], SchemaKeysOf<K>> extends true
      ? T[K]
      : never
    : never
}

const STRING_VALUE = { type: 'string' } as const
const NUMBER_VALUE = { type: 'number' } as const
const OBJECT_VALUE = { type: 'object' } as const
const NUMBER_LIST_VALUE = { type: ['array', 'null'], items: NUMBER_VALUE } as const

const WRITTEN_PROPERTIES = {
  agentApiVersion: {},
  schemaVersion: {},
  readDocument: {},
  readStamp: {},
  readSelection: {},
  readDialogueMessages: {},
  readSearchRows: { word: STRING_VALUE },
  readShownTasks: {},
  readDelayDiagnostics: {},
  applyCommands: { request: OBJECT_VALUE },
  importDocument: { source: OBJECT_VALUE },
  undoEdit: {},
  redoEdit: {},
  exportJson: {},
  exportMspdi: {},
  exportSvg: {},
  exportPng: {},
  exportEmbeddedHtml: {},
  focusTask: { taskUid: NUMBER_VALUE },
  showOnlyTasks: { taskUids: NUMBER_LIST_VALUE },
  watchChanges: { waitMs: NUMBER_VALUE },
  postDialogueMessage: { text: STRING_VALUE },
} satisfies Record<MemberName, Record<string, object>>

const TOOL_PROPERTIES: CheckedProperties<typeof WRITTEN_PROPERTIES> = WRITTEN_PROPERTIES

/** @purity pure */
function isMemberName(name: string): name is MemberName {
  return Object.hasOwn(TOOL_PROPERTIES, name)
}

/** @purity pure */
function toolOf(row: { readonly name: string; readonly description: string }): McpTool {
  if (!isMemberName(row.name)) {
    throw new Error(`table T-107 names ${row.name}, which AgentApi does not have`)
  }
  return {
    name: row.name,
    description: row.description,
    inputSchema: { type: 'object', properties: TOOL_PROPERTIES[row.name] },
  }
}

// TRAP: built once at load, so a T-107 row without an AgentApi member (or the reverse)
// stops the relay at start instead of listing a tool no page can answer.
const MCP_TOOLS: readonly McpTool[] = toolDescriptions.tools.map(toolOf)
if (MCP_TOOLS.length !== Object.keys(TOOL_PROPERTIES).length) {
  throw new Error('table T-107 and AgentApi do not name the same members')
}

// see AG-12, T-107
/** @purity pure */
export function mcpToolList(): readonly McpTool[] {
  return MCP_TOOLS
}

// see AG-12, AG-5
/** @purity pure */
export function relayedCallOf(toolCall: {
  readonly name: string
  readonly arguments?: Record<string, unknown>
}): RelayedCall | null {
  const member = toolCall.name
  if (!isMemberName(member)) return null
  const params = member === WATCH_CHANGES ? {} : (toolCall.arguments ?? {})
  return { member, params } as RelayedCall
}

// WHY: MCP carries structuredContent only as a JSON object -- never an array or a bare value.
/** @purity pure */
function structuredContentOf(result: unknown): Record<string, unknown> | undefined {
  if (typeof result !== 'object' || result === null || Array.isArray(result)) return undefined
  return result as Record<string, unknown>
}

/** @purity pure */
function pngDataOf(member: string, result: unknown): string | null {
  const exported = member === EXPORT_PNG ? structuredContentOf(result) : undefined
  if (exported === undefined) return null
  return exported['ok'] === true && typeof exported['value'] === 'string' ? exported['value'] : null
}

// see AG-9a, AG-12
/** @purity pure */
export function mcpToolResultOf(member: string, answer: RelayedAnswer): McpToolResult {
  if ('error' in answer) {
    return { content: [{ type: 'text', text: answer.error.message }], isError: true }
  }
  const { result } = answer
  const pngData = pngDataOf(member, result)
  if (pngData !== null) {
    return { content: [{ type: 'image', data: pngData, mimeType: PNG_MIME_TYPE }] }
  }
  const text = JSON.stringify(result) ?? 'null'
  const structuredContent = structuredContentOf(result)
  return structuredContent === undefined
    ? { content: [{ type: 'text', text }] }
    : { content: [{ type: 'text', text }], structuredContent }
}

// see AG-12
/** @purity pure */
export function pageNotConnectedResult(pageUrl: string): McpToolResult {
  const structuredContent = {
    ok: false,
    refusal: {
      target: 'relay',
      reason: 'pageNotConnected',
      stamp: null,
      document: null,
      refusals: [],
      what:
        `No GRS page is connected to the relay. Open ${pageUrl} in a browser, ` +
        'open the document there and enable the Agent API.',
      pageUrl,
    },
  }
  return { content: [{ type: 'text', text: JSON.stringify(structuredContent) }], structuredContent }
}

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

// WHY: the names, descriptions and input shapes are printed from the manuscript of table T-107 (CR-765),
// the one that also prints AgentApi and RelayedParams, so a tool and its member cannot drift apart unseen.
const MCP_TOOLS: readonly McpTool[] = toolDescriptions.tools.map((row): McpTool => ({
  name: row.name,
  description: row.description,
  inputSchema: { type: 'object', properties: row.inputSchema.properties },
}))

const MEMBER_NAMES: ReadonlySet<string> = new Set(MCP_TOOLS.map((tool) => tool.name))

/** @purity pure */
function isMemberName(name: string): name is MemberName {
  return MEMBER_NAMES.has(name)
}

// see AG-12, T-107
/** @purity pure */
export function mcpToolList(): readonly McpTool[] {
  return MCP_TOOLS
}

// see AG-12
// WHY: printed from the same manuscript as the tools (CR-791), so the text never names a tool the list lacks.
/** @purity pure */
export function mcpInstructions(): string {
  return toolDescriptions.instructions
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

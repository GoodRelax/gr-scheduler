// AgentApiEndpoint -- public entry of this folder.
//
// @unit      UF-27   (docs/spec/05-07-design.md, table T-075)
// @component AgentApiEndpoint, layer Adapter (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-17
//
// An entrance only (CP-17 of table T-062, FR-028): every member of table T-107
// hands its work to the component that owns the rule.
//
// Not exposed by default (FR-065): nothing here runs until `installAgentApi` is
// called. Turning it on and remembering that per origin (S-99b of table T-206)
// are the Framework's (LY-5): IC-20 of table T-109 moves
// `ScreenSession.isAgentApiEnabled`, and `single-html-shell.ts` installs through
// `watchAgentApiEnabling`. The on-indicator is UF-62's (`app-header-items.ts`).
//
// The folder splits by what constrains each file, not by purity (UT-4 of table
// T-063); `snapshot-source.ts` holds the seam (the note under table T-075).

export type { AgentSnapshot, FrameSnapshot, SnapshotSource } from './snapshot-source'

// The types `installAgentApi`'s argument and answer name; nothing wider, since
// R2.19 declares no more.
export type {
  AgentApi,
  AgentApiWiring,
  AgentChangeReceiver,
  AgentExport,
  AgentImportSource,
  AgentRefusal,
  AgentRefusalReason,
  AgentWatch,
  AgentWriteOutcome,
  AgentWriteRequest,
} from './agent-api-members'

import { agentApiMembers, type AgentApi, type AgentApiWiring } from './agent-api-members'

/**
 * Answers with the surface and does not place it: no table names where the API
 * is found, so the shell decides. A reference once handed out keeps working
 * (FR-065).
 *
 * Calling it is the exposure; it registers, watches and starts nothing itself
 * (AM-17 subscribes only when asked).
 *
 * `non-pure` (PI-17) although the body only builds a value: everything the value
 * does reads or writes outside, and a gentler tag invites it onto R7.2's pure path.
 *
 * @purity non-pure
 */
export function installAgentApi(wiring: AgentApiWiring): AgentApi {
  return agentApiMembers(wiring)
}

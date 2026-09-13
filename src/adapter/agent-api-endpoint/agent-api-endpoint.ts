// AgentApiEndpoint: the entrance to the Agent API; each member hands its work on.
// @unit      UF-27   (docs/spec/05-07-design.md, table T-075)
// @component AgentApiEndpoint, layer Adapter (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-17

export type { AgentSnapshot, FrameSnapshot, SnapshotSource } from './snapshot-source'

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

/** @purity non-pure */
export function installAgentApi(wiring: AgentApiWiring): AgentApi {
  return agentApiMembers(wiring)
}

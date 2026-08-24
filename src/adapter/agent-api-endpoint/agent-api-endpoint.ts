// AgentApiEndpoint -- public entry of this folder.
//
// @unit      UF-27   (docs/spec/05-07-design.md, table T-075)
// @component AgentApiEndpoint, layer Adapter (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-17
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
//
// ⭐ WHY THE COMPONENT EXISTS. FR-028 says a person's UI and the Agent API are
// equals -- everything one can do the other can do -- and that there is one
// document behind both. CP-17 of table T-062 gives this component the job of
// putting that second entrance in place. ⛔ It is an entrance and nothing more:
// every member of table T-107 hands its work to the component that owns the
// rule, and no rule is decided here. The one thing this component genuinely
// owns is the shape of the answer, and FR-028 fixes even that -- accepted or
// refused, as a VALUE, never as a thrown exception (MUST NOT).
//
// ⛔ NOT EXPOSED BY DEFAULT (FR-065, and FR-028's own RATIONALE says so as a
// MUST). Nothing in this folder runs until somebody calls `installAgentApi`,
// and nothing in this folder puts the answer anywhere -- see the note on
// `installAgentApi` below. Two consequences worth stating, because both are
// somebody else's work and neither is missing by accident:
//
//   * WHO may turn it on, and how it is remembered. FR-065 makes enabling a
//     per-document memory (MUST) and S-99b of table T-206 puts that record in
//     `localStorage`, keyed by the document, deliberately NOT in the document:
//     enabling is the reader's judgement, not the document's content. That is
//     the Framework's to hold (LY-5), and the startup flag FR-028's RATIONALE
//     admits is the shell's too.
//     ⚠️ THE TURNING ON NOW EXISTS AND THE INSTALLING STILL DOES NOT. IC-20 of
//     table T-109 moves `ScreenSession.isAgentApiEnabled`, but no caller of
//     `installAgentApi` reads it, so pressing IC-20 opens no entrance and the
//     memory S-99b asks for is not written either -- `single-html-shell.ts`
//     carries the STOP that says what each of the two is waiting on.
//   * THAT it is on has to be visible while it is on (FR-065, MUST). UF-62 of
//     table T-075 owns that indicator and `app-header-items.ts` draws it, so
//     this half is kept.
//
// ⭐ THE THREE FILES, and why they are three. Table T-063's UT-4 says the split
// is NOT by purity -- table T-075 marks both of the two non-declaring units
// `non-pure` -- but by what constrains them: installation is FR-065's, the
// eighteen members are table T-107's, and the seam is a declaration the layer
// on the far side of it compiles against without taking this entry in whole
// (the note under table T-075).

// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.
//
// The seam declared in this folder is re-exported here because
// the layer that implements it may not reach past this file
// (Chapter 5.3, MUST).

export type { AgentSnapshot, FrameSnapshot, SnapshotSource } from './snapshot-source'

// PI-17's other half. The types travel with `installAgentApi` because its
// answer and its argument name them and nothing else does -- widening the
// public face past what the two published members reach would put names on it
// that R2.19 never declared.
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
 * Build the Agent API and hand it back.
 *
 * ⭐ IT ANSWERS WITH THE SURFACE AND DOES NOT PLACE IT. Where a caller finds the
 * API -- a global's name, a property on some host object -- is a name the
 * application publishes to the outside world, and no row of any table states
 * one. Choosing it here would be inventing a public name; so the shell that
 * turned the API on decides where the reference goes, which is also the shape
 * FR-065 describes when it requires a person to be told that disabling cannot
 * take back a reference already handed over (MUST). A reference this call
 * answered with keeps working, and that is the truth FR-065 wants said out
 * loud rather than a leak to be patched.
 *
 * ⛔ Calling it IS the exposure. FR-065 and FR-028 keep the API closed by
 * default; nothing else in this folder is reachable from outside, and this
 * function registers nothing, watches nothing and starts nothing on its own --
 * AM-17 is the only member that subscribes, and only when a caller asks.
 *
 * ⚠️ `non-pure` because PI-17 says so, and the tag is right even though the
 * body only builds a value: everything the value can do writes or reads
 * outside, and a gentler tag would invite the call onto a path R7.2 keeps pure.
 *
 * @purity non-pure
 */
export function installAgentApi(wiring: AgentApiWiring): AgentApi {
  return agentApiMembers(wiring)
}

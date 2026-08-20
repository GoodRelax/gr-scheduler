// DocumentCodec -- public entry of this folder.
//
// @unit      UF-34   (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    pure
// @publishes table T-064 row PI-20
//
// Generated as an empty unit by tools/generate_unit_tree.py. Fill it in; the
// generator never rewrites a file that exists.
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.

// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.
//
// The seam declared in this folder is re-exported here because
// the layer that implements it may not reach past this file
// (Chapter 5.3, MUST).

// ⭐ All six names of PI-20 leave through this file, in the table's own order.
// That is the whole of UF-34's job: table T-075 gives this unit no work beyond
// binding the codecs beside it and publishing them.
//
// ⚠️ The formats stay in separate files for the reason UT-5 of table T-063
// gives -- each answers to a different authority, and only the single .html
// reaches outside the process. ⛔ That is a reason to split the FILES. It is
// not a reason to withhold a member here: a caller that cannot reach
// `exportEmbeddedHtml` or the MSPDI pair from this entry has to read a sibling
// instead, which is exactly what Chapter 5.3 forbids (MUST NOT).
// ⚠️ An earlier note in this place claimed the MSPDI pair and the single .html
// were deliberately absent. They were absent because two agents were writing
// in this folder at once and neither was allowed to touch this file. Both are
// done; the note was false and is gone.
//
// ⭐ Each member's argument and result types come with it. A caller can
// neither hold what a member returns nor implement the seam without naming
// them, so a type left behind reopens the same MUST NOT that a member left
// behind would.
// ⛔ `Document` is not among them. It belongs to another component and leaves
// through that component's own entry; re-publishing it here would give one
// type two homes and put this component in the way of every change to it.
// ⛔ `MSPDI_NAMESPACE` is not among them either. PI-20 does not name it, and
// nothing outside this folder writes an MSPDI root.

export type { AppShell, AppShellReading, AppShellSource } from './app-shell-source'

export { documentFromJson, jsonFromDocument } from './json-codec'
export type { JsonDecoding, JsonFault } from './json-codec'

export { documentFromMspdi, mspdiFromDocument } from './mspdi-codec'
export type { MspdiDecoding, MspdiEncoding, MspdiFault, MspdiNotice } from './mspdi-codec'

export { exportEmbeddedHtml } from './embedded-html-codec'
export type {
  EmbeddedHtmlExport,
  EmbeddedHtmlFault,
  EmbeddedHtmlFaultReason,
} from './embedded-html-codec'

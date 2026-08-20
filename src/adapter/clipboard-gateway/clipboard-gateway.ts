// ClipboardGateway -- public entry of this folder.
//
// @unit      UF-45   (docs/spec/05-07-design.md, table T-075)
// @component ClipboardGateway, layer Adapter (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-24
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
//
// ⭐ The smallest component in the tree: one seam, one member, and PI-24 is the
// whole of what leaves. What it is for is in `clipboard.ts`, next to the seam
// that carries it.
//
// ⛔ Nothing is composed here. The picture arrives from SvgRenderer and the
// text from DocumentCodec -- the two edges `_source/components.json` draws into
// this component -- already made. ⚠️ Those are edges of supply, not of import:
// ADR-001 has the frame computed once and handed to everyone who needs it, so
// asking SvgRenderer again would both repeat that work and let the picture
// that goes out drift from the one on the screen -- and sameness is what
// FR-025 says of this route.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.
//
// The seam declared in this folder is re-exported here because
// the layer that implements it may not reach past this file
// (Chapter 5.3, MUST).

import type { Clipboard, ClipboardContent, ClipboardWriting } from './clipboard'

export type {
  Clipboard,
  ClipboardContent,
  ClipboardFault,
  ClipboardWriting,
} from './clipboard'

/**
 * Send one content to the clipboard (IO-6 of table T-024, and FR-068's copy).
 *
 * ⭐ Why this is not a synonym for the seam member. FR-028 forbids throwing
 * (MUST NOT), and the seam is implemented in the Framework (LR-5) over a
 * browser API whose way of refusing is to reject. This is the last place
 * inside the app that can turn a rejection back into a value, so it does, and
 * every caller may rely on getting one. ⚠️ Trusting the seam's own promise
 * instead would put the requirement's guarantee in a file this component does
 * not own.
 *
 * ⛔ The refusal loses the browser's own message on the way. That is FR-028's
 * instruction rather than an error being swallowed: it is the reading of those
 * messages that the requirement forbids, because it makes the kind of a
 * failure implementation-dependent. What a person is told, and what they are
 * told to do next (NT-1 and NT-3a of table T-037), is composed from
 * `ClipboardFault` by the side that knows the display language (FR-038).
 *
 * ⚠️ The seam comes first because it is what the shell supplies once at wiring
 * time -- CP-25 is the component that wires, and PI-25 shows the shape of it
 * for the two implementations the shell writes itself -- while the content is
 * what differs from call to call.
 *
 * @purity non-pure
 */
export async function writeClipboard(
  clipboard: Clipboard,
  content: ClipboardContent,
): Promise<ClipboardWriting> {
  try {
    return await clipboard.writeClipboardContent(content)
  } catch {
    // An implementation that rejects has already broken FR-028's MUST NOT;
    // which of the three faults it meant cannot be recovered from here without
    // reading its message, so the one that claims least is reported.
    return { ok: false, fault: 'writeFailed' }
  }
}

// ClipboardGateway -- public entry of this folder.
//
// @unit      UF-45   (docs/spec/05-07-design.md, table T-075)
// @component ClipboardGateway, layer Adapter (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-24
//
// What the seam is for is noted in `clipboard.ts`.
//
// Nothing is composed here: the picture and the text arrive already made, from
// ImageExporter and DocumentCodec (edges of supply in `_source/components.json`,
// not imports). Assembling here would repeat ADR-001's once-computed frame and
// let the copied picture drift from the exported one (FR-025).
//
// The picture is ImageExporter's `SvgExport.svg` (PI-21), not SvgRenderer's
// `svgFromSchedule` (PI-19), which has had neither table T-076's assembly nor
// FR-025's cut (WY-2 of table T-041). This component cannot check that: a
// finished string does not say how it was made.

import type { Clipboard, ClipboardContent, ClipboardWriting } from './clipboard'

export type {
  Clipboard,
  ClipboardContent,
  ClipboardFault,
  ClipboardWriting,
} from './clipboard'

/**
 * IO-6 of table T-024, and FR-068's copy.
 *
 * Not a synonym for the seam member: the Framework implements the seam (LR-5)
 * over a browser API that refuses by rejecting, and this is the last place
 * inside the app that can turn a rejection into a value (FR-028).
 *
 * The browser's message is dropped on purpose: FR-028 forbids reading it. The
 * words a person reads are composed from `ClipboardFault` where the display
 * language is known (NT-1, NT-3a of table T-037; FR-038).
 *
 * The seam comes first because the shell supplies it once at wiring (CP-25);
 * the content differs per call.
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
    // An implementation that rejects has already broken FR-028; which fault it
    // meant cannot be recovered without reading its message, so the one that
    // claims least is reported.
    return { ok: false, fault: 'writeFailed' }
  }
}

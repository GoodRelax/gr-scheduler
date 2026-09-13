// BrowserClipboard -- public entry of this folder.
//
// @unit      UF-53   (docs/spec/05-07-design.md, table T-075)
// @component BrowserClipboard, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-30
//
// The implementation of Clipboard (table T-065 IF-5), declared one layer in by
// ClipboardGateway (LR-5).
//
// What is left here is the single browser call and its ends, each returned as a
// value (FR-028, MUST NOT):
//
//     no clipboard object on the navigator     unsupported
//     refused, named NotAllowedError           notPermitted
//     any other throw or rejection             writeFailed
//     resolved                                 { ok: true }
//
// `writeClipboard` in the declaring folder catches too; that is no reason for
// this side to reject.
//
// ⛔ IO-6 of table T-024 says "as an image", but the picture leaves as SVG text:
// the browsers CN-2 of table T-003 targets take only PNG as a clipboard image on
// write, and this component has no edge to CanvasRasterizer and may not render
// again (FR-025). A drawing tool turns pasted SVG source back into the picture
// (EZ-4 of FR-092); an image-only app shows markup. Closing the gap is a new
// `ClipboardContent` variant and component edge, the declaring side's decision.
//
// ⚠️ `navigator.permissions` is not asked first: the answer cannot change what
// this does, it would be a second reach into the browser (R7.4), and the refusal
// already has its next step (NT-3a).
//
// ⛔ `document.execCommand('copy')` is not a fallback: it needs a live document
// and a selection in a page DomSvgSurface owns, and its bare `false` would
// collapse every fault into `writeFailed`.
//
// ⛔ NOT CHECKABLE HERE: FR-020's watermark choice on this route (FR-025, LM-8) is
// applied where the picture is made; see `clipboard.ts`.
//
// ⛔ Nothing validates the string: CHN-9 is send-only and outside FR-023's checks,
// so a length or emptiness rule here would be a boundary the specification did
// not draw.

import type {
  Clipboard,
  ClipboardContent,
  ClipboardFault,
} from '../../adapter/clipboard-gateway/clipboard-gateway'

/**
 * The characters that go on the clipboard; for a picture, the SVG markup (see
 * the header).
 *
 * @purity pure
 */
function textFromContent(content: ClipboardContent): string {
  return content.kind === 'picture' ? content.svg : content.text
}

/**
 * Which of `ClipboardFault`'s values the browser's refusal was.
 *
 * `name` is one of a fixed set the platform defines, not message wording, so
 * FR-028's ban does not reach it. Not `instanceof DOMException`: a host need not
 * have that global. ⛔ Only one name is claimed; everything else takes the value
 * that claims least, as `writeClipboard` does.
 *
 * @provisional PND-121
 * @purity pure
 */
function faultFromThrown(thrown: unknown): ClipboardFault {
  const isRefused =
    typeof thrown === 'object' &&
    thrown !== null &&
    'name' in thrown &&
    thrown.name === 'NotAllowedError'
  return isRefused ? 'notPermitted' : 'writeFailed'
}

/**
 * IF-5 over the browser's own clipboard.
 *
 * The clipboard arrives as an argument (LY-5, R7.3), so the unit runs against any
 * object with one method.
 *
 * ⚠️ Pass `navigator.clipboard`, which is absent where the browser offers no
 * clipboard, so `undefined` answers `unsupported` -- possibly including a page
 * opened straight from a file (CN-1, FR-067, LM-14).
 *
 * ⛔ Call it inside the event the person started, or the write comes back as
 * `notPermitted`.
 *
 * Tagged `pure`: this only binds the clipboard into IF-5's shape; the effect and
 * its non-pure tag are on the member.
 *
 * @purity pure
 */
export function browserClipboard(
  systemClipboard: { writeText(text: string): Promise<void> } | undefined,
): Clipboard {
  return {
    /** @purity non-pure */
    async writeClipboardContent(content: ClipboardContent) {
      if (systemClipboard === undefined) return { ok: false, fault: 'unsupported' }
      try {
        await systemClipboard.writeText(textFromContent(content))
        return { ok: true }
      } catch (thrown) {
        // ⛔ The catch is the whole of FR-028's MUST NOT on this side: a
        // rejection and a synchronous throw both land here, and neither leaves.
        return { ok: false, fault: faultFromThrown(thrown) }
      }
    },
  }
}

// BrowserClipboard -- public entry of this folder.
//
// @unit      UF-53   (docs/spec/05-07-design.md, table T-075)
// @component BrowserClipboard, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-30
//
// The implementation of Clipboard (table T-065 IF-5). ClipboardGateway, one
// layer in, declares the seam; this layer holds the browser. That direction is
// LR-5 of table T-061 (MUST), and it is why the inner layers never learn that
// a clipboard is a browser thing at all.
//
// ⭐ WHY THIS UNIT EXISTS. Everything that could be decided is decided before
// the content gets here: the picture is the one SvgRenderer made and the text
// is the one DocumentCodec made. What is left is the single call the browser
// offers and the ways it can end -- and every one of them has to come back as
// a value, because FR-028 forbids the throw (MUST NOT). All four ends:
//
//     no clipboard object on the navigator     unsupported
//     refused, named NotAllowedError           notPermitted
//     any other throw or rejection             writeFailed
//     resolved                                 { ok: true }
//
// ⚠️ `writeClipboard` in the declaring folder catches anyway, saying it will
// not put FR-028's guarantee in a file it does not own. That is not a reason
// for this side to be careless -- it is the reason nothing here rejects.
//
// ⛔ WHAT WAS HARD (1): IO-6 OF TABLE T-024 SAYS "AS AN IMAGE", AND THE
// PICTURE LEAVES HERE AS TEXT. IO-6 has the clipboard carry the current screen
// to another app as an image, for pasting into a document. The seam hands a
// picture over as an SVG string (`ClipboardContent`), and no browser this
// specification is written for takes SVG as a clipboard image: CN-2 of table
// T-003 baselines Chromium, keeps Firefox to a check, and puts Safari out of
// scope. The one image type those take on a write is PNG, and this component
// cannot make one -- `_source/components.json` draws it no edge to
// CanvasRasterizer, and `clipboard.ts` forbids a second rendering here because
// FR-025 says what goes out this way is the same picture. So the markup goes
// out as characters. ⭐ What that buys: a drawing tool takes SVG source pasted
// as text and turns it back into the picture, which is the pasting FR-092's
// EZ-4 says to stay close to. ⚠️ What it costs: an app that only understands
// images gets markup and shows it as such. ⛔ Closing the gap means a new
// variant on `ClipboardContent` and a new component edge -- the declaring
// side's decision, not this one's. Recorded as PD-120, class E; nothing is
// implemented on it here.
//
// ⛔ WHAT WAS HARD (2): THE PERMISSION AND THE GESTURE ARE THE CALLER'S. The
// browser settles both after the call is made and reports a denied permission,
// a write outside a person's gesture, and an unfocused page as one refusal --
// which is exactly why `ClipboardFault` has one value for them and not three.
// ⚠️ So this unit does not ask `navigator.permissions` first: the answer
// cannot change what it does, it would be a second reach into the browser
// against R7.4, and the refusal is already a value whose next step (NT-3a of
// table T-037, MUST) is to ask for it again directly.
//
// ⛔ WHAT WAS HARD (3): THE OLDER MECHANISM IS NOT USED AS A FALLBACK.
// `document.execCommand('copy')` would work where the async API is absent, and
// it is refused here for two reasons. It needs a live document and a
// selection: a second browser object, and a write into a page this component
// does not own (the host element belongs to DomSvgSurface). And it refuses
// with a bare `false` that carries no name, so all three of `ClipboardFault`'s
// values would collapse into `writeFailed` and NT-3a would have nothing left
// to tell a person to do next. ⭐ `unsupported` is the truthful answer for a
// browser with no clipboard to write to, and it is one of the three.
//
// ⛔ NOT CHECKABLE HERE, and stated so it is not looked for: FR-025 puts
// FR-020's watermark choice on this route as well (LM-8 reaches an outbound
// route, and table T-008's R-9 is one). It is applied where the picture is
// made. `clipboard.ts` says this on the declaring side and it stays true on
// this one -- a picture that arrives already made cannot be inspected for it.
//
// ⛔ Nothing here validates the string. Table T-008's R-9 is send-only and its
// own remark says it is not subject to the checking -- FR-023's intakes are
// the other direction. A length or emptiness rule invented here would be a
// boundary the specification did not draw.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import type {
  Clipboard,
  ClipboardContent,
  ClipboardFault,
} from '../../adapter/clipboard-gateway/clipboard-gateway'

/**
 * The characters that go on the clipboard.
 *
 * ⭐ Both variants of `ClipboardContent` already carry a string, so the choice
 * is which one and not how to encode it. For a picture that string is the SVG
 * markup -- see the first hard part above for why it leaves as characters.
 *
 * @purity pure
 */
function textFromContent(content: ClipboardContent): string {
  return content.kind === 'picture' ? content.svg : content.text
}

/**
 * Which of `ClipboardFault`'s three the browser's refusal was.
 *
 * ⭐ `name` is not the message FR-028's rationale bans the reading of. That ban
 * is on making the kind of a failure depend on wording an implementation is
 * free to change; `name` is one of a fixed set the platform defines, and the
 * classification it feeds stops inside this file -- what leaves is one of the
 * seam's own three values.
 *
 * ⚠️ Deliberately not `instanceof DOMException`: that would tie the unit to a
 * global a host need not have, and the seam asks what kind of failure it was,
 * not what class the browser used to say so.
 *
 * ⛔ Only one name is claimed. Everything else takes the value that claims
 * least, which is the reading `writeClipboard` already applies to a seam that
 * breaks its promise.
 *
 * @provisional PD-121
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
 * ⭐ The clipboard ARRIVES rather than being reached for. LY-5 of table T-060
 * makes this the layer that holds such things, and R7.3 asks for the injection
 * by name; the effect is that the unit can be exercised with an object that
 * has one method and no browser behind it.
 *
 * ⚠️ Pass `navigator.clipboard`, which is absent -- not empty -- where the
 * browser offers no clipboard to write to, so the parameter takes `undefined`
 * and answers `unsupported` for it. ⛔ A page opened straight from a file is
 * the case to keep in mind: CN-1 of table T-003 and FR-067 mean the app is
 * used that way, and LM-14 already records that opening it so costs some
 * abilities. Whether this is one of them is the browser's answer, not an
 * assumption made here -- which is what the value is for.
 *
 * ⛔ Call it inside the event the person started. The browsers want a gesture,
 * and one made outside it comes back as `notPermitted`.
 *
 * ⭐ Tagged `pure` although the unit is not: this only binds the clipboard
 * into the shape IF-5 asks for and holds no state of its own. The effect is in
 * the member, and that is where the non-pure tag sits.
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

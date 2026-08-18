// ScreenRenderer -- declares the interface ScreenSurface (table T-065 IF-9).
//
// @unit      UF-70   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    n/a
// @seam      ScreenSurface, implemented in another layer (LR-5)
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
//
// ⚠️ This file imports a type from the public entry, which imports this file
// back. Both edges are `import type`, so nothing survives into the built module
// graph and there is no cycle at run time. ⭐ No third file could hold
// `ScreenView` instead: table T-075 fixes this folder at eleven units, and the
// one that binds the nine descriptions together is UF-60.

import type { ScreenView } from './screen-renderer'

/**
 * What stands in the `Dialogue Field` (U-44), as the surface read it.
 *
 * ⚠️ `author` and `settledAt` are VALUES, not something read on this side. Who
 * is speaking and what the clock says belong to the Framework (LY-5 of table
 * T-060, and CS-1 of table T-066 keeps the clock out of the inner layers), which
 * is the layer that implements this seam. AG-6 of table T-035 selects on the
 * writers other than the watcher itself, so `author` is the name it compares
 * against its own.
 *
 * ⛔ The sequence is NOT here. AG-11 makes the log count in an order of its own,
 * and `logWithMessage` (PI-33) is what assigns it -- two callers choosing a
 * number would lose a message from AG-6's selection.
 */
export interface DialogueInput {
  /** What the person has typed. */
  readonly text: string
  /**
   * Whether the person settled it.
   *
   * ⛔ AG-11 forbids anything to read the half-typed line as an utterance, which
   * is why the flag travels with the text instead of the surface deciding alone:
   * `dialogueMessageFromInput` (PI-37) is the one place that turns the pair into
   * an utterance, and it refuses this one while the flag is false.
   */
  readonly isSettled: boolean
  /** AG-6 selects on "settled by someone other than me". */
  readonly author: string
  /** ISO 8601, UTC, to the second -- the spelling AT-129 uses for the stamp. */
  readonly settledAt: string
}

// The members are not in the specification: table T-065 names the
// interface and what it supplies, nothing more. They are decided here,
// by the component that declares the seam.
export interface ScreenSurface {
  /**
   * Put the description on the screen. The first half of IF-9.
   *
   * ⭐ A value, not a node tree, for the reason SvgSurface takes a string:
   * ScreenRenderer is `pure` (table T-075 UF-60), so what crosses this seam has
   * to be a value, and building nodes needs the browser that LR-6 keeps out and
   * that 5.3 puts on the far side of this declaration.
   *
   * ⚠️ The whole description each time, not a patch. Table T-078 already limits
   * how often a frame runs, and a patch protocol would put the diffing rule --
   * which no requirement states -- inside a seam.
   *
   * @purity non-pure
   */
  showScreenView(view: ScreenView): void

  /**
   * What stands in the dialogue field, or `null` while the person has entered
   * nothing. The second half of what IF-9 says this seam supplies.
   *
   * ⭐ Pulled, not pushed. A push would mean this side holding a listener, and
   * UF-60 is `pure`: it can neither register one nor remember one. The shell
   * asks, hands the answer to `dialogueMessageFromInput`, and passes what comes
   * back to `postDialogueMessage` -- which is the edge
   * `_source/components.json` draws from ScreenRenderer to PostDialogueMessage.
   *
   * ⚠️ Reads the field as it stands now, so it is not deterministic: two calls
   * one keystroke apart answer differently.
   *
   * @purity semi-pure-b
   */
  readDialogueInput(): DialogueInput | null
}

/**
 * UseCase layer: pure keyboard-command mapping for the schedule canvas
 * (WCAG 2.1.1 Keyboard, 2.1.2 No Keyboard Trap). No DOM, no side effects: it
 * turns a key chord into an intent the canvas adapter then executes, so the
 * mapping is unit-testable in isolation and the trap-avoidance rule (Tab intents
 * never force a preventDefault at a list boundary) lives in one place.
 *
 * Modifier policy: chords with Ctrl/Cmd are mapped to `none` here because the
 * global document shortcuts (Undo/Redo/Copy/Paste) own those; the canvas layer
 * must not double-handle them.
 */

/** A normalized key chord derived from a KeyboardEvent (adapter-supplied). */
export interface KeyChord {
  /** `KeyboardEvent.key` (e.g. "ArrowLeft", "Tab", "Enter", " "). */
  readonly key: string;
  /** Whether Shift was held. */
  readonly shiftKey: boolean;
  /** Whether Ctrl or Meta (Cmd) was held. */
  readonly ctrlOrMeta: boolean;
}

/** A resolved canvas intent (what the adapter should do). */
export type CanvasKeyCommand =
  /** Move the selected item by a whole-day and/or a whole-row delta. */
  | { readonly kind: 'nudge'; readonly deltaDays: number; readonly deltaRows: number }
  /** Resize the selected task's end edge by a whole-day delta. */
  | { readonly kind: 'resize'; readonly deltaDays: number }
  /** Advance the keyboard-focused item to the next one. */
  | { readonly kind: 'focus-next' }
  /** Move the keyboard-focused item to the previous one. */
  | { readonly kind: 'focus-prev' }
  /** Activate: place an armed shape, or open the focused item for editing. */
  | { readonly kind: 'activate' }
  /** Cancel the current gesture / selection (Escape). */
  | { readonly kind: 'cancel' }
  /** No canvas action (let the event flow to other handlers / the browser). */
  | { readonly kind: 'none' };

/** One day forward/back per horizontal arrow press. */
const NUDGE_DAYS = 1;
/** One row up/down per vertical arrow press. */
const NUDGE_ROWS = 1;

/**
 * Map a key chord pressed while the schedule canvas is focused to a canvas
 * intent (WCAG 2.1.1). Unmapped keys and Ctrl/Cmd chords return `none`.
 *
 * @param chord - The normalized key chord.
 * @returns The resolved canvas command.
 */
export function resolveCanvasKeyCommand(chord: KeyChord): CanvasKeyCommand {
  if (chord.ctrlOrMeta) {
    return { kind: 'none' };
  }
  switch (chord.key) {
    case 'ArrowLeft':
      return chord.shiftKey
        ? { kind: 'resize', deltaDays: -NUDGE_DAYS }
        : { kind: 'nudge', deltaDays: -NUDGE_DAYS, deltaRows: 0 };
    case 'ArrowRight':
      return chord.shiftKey
        ? { kind: 'resize', deltaDays: NUDGE_DAYS }
        : { kind: 'nudge', deltaDays: NUDGE_DAYS, deltaRows: 0 };
    case 'ArrowUp':
      return { kind: 'nudge', deltaDays: 0, deltaRows: -NUDGE_ROWS };
    case 'ArrowDown':
      return { kind: 'nudge', deltaDays: 0, deltaRows: NUDGE_ROWS };
    case 'Tab':
      return chord.shiftKey ? { kind: 'focus-prev' } : { kind: 'focus-next' };
    case 'Enter':
    case ' ':
    case 'Spacebar': // legacy key name for the space bar
      return { kind: 'activate' };
    case 'Escape':
      return { kind: 'cancel' };
    default:
      return { kind: 'none' };
  }
}

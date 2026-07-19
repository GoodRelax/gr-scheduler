/**
 * UseCase-adjacent pure helper: map a wheel event's modifier keys to an action
 * (ADR-004 anisotropic zoom + scroll). Kept side-effect free and DOM-free so the
 * mapping is unit-testable without a renderer.
 *
 * Mapping (user feedback: the old "plain wheel = zoom" felt wrong):
 * - plain wheel (no modifier) -> vertical scroll
 * - Ctrl + wheel             -> zoom BOTH axes (pointer-centered)
 * - Shift + wheel            -> zoom the width / time axis only (horizontal zoom)
 * - Alt + wheel              -> zoom the height / row axis only (vertical zoom)
 * - Ctrl + Shift + wheel     -> horizontal scroll
 *
 * `metaKey` (Cmd on macOS) is treated as an alias of `ctrlKey` so the same gestures
 * work on both platforms.
 */

/** The action a wheel gesture maps to under its modifier keys. */
export type WheelMode =
  | 'scroll-vertical'
  | 'scroll-horizontal'
  | 'zoom-both'
  | 'zoom-x'
  | 'zoom-y';

/** The modifier-key subset of a wheel event that selects the {@link WheelMode}. */
export interface WheelModifiers {
  /** Ctrl held (or Cmd/meta, treated as the same). */
  readonly ctrlKey: boolean;
  /** Shift held. */
  readonly shiftKey: boolean;
  /** Alt / Option held. */
  readonly altKey: boolean;
  /** Meta / Cmd held (macOS alias of Ctrl). */
  readonly metaKey?: boolean;
}

/**
 * Resolve which pan/zoom action a wheel gesture performs from its modifiers.
 *
 * @param modifiers - The wheel event's modifier-key state.
 * @returns The selected {@link WheelMode}.
 */
export function resolveWheelMode(modifiers: WheelModifiers): WheelMode {
  const ctrl = modifiers.ctrlKey || modifiers.metaKey === true;
  if (ctrl && modifiers.shiftKey) {
    return 'scroll-horizontal';
  }
  if (ctrl) {
    return 'zoom-both';
  }
  if (modifiers.shiftKey) {
    return 'zoom-x';
  }
  if (modifiers.altKey) {
    return 'zoom-y';
  }
  return 'scroll-vertical';
}

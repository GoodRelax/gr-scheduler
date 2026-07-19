/**
 * Adapter layer: canvas keyboard navigation (WCAG 2.1.1 Keyboard, 2.1.2 No
 * Keyboard Trap, 2.4.7 Focus Visible). Attaches to the focusable schedule canvas
 * and turns key presses into editing actions via the pure command mapper
 * (usecase/keyboard-commands), so every canvas function is reachable without a
 * pointer:
 *
 * - Tab / Shift+Tab rove keyboard focus among visible items; at the ends focus is
 *   allowed to leave (no preventDefault), so the canvas is never a keyboard trap.
 * - Arrow keys nudge the focused item by a day (left/right) or a row (up/down);
 *   Shift + left/right resizes a task's end edge.
 * - Enter / Space places an armed palette shape at the caret, or opens the focused
 *   item for editing.
 * - Escape cancels the current gesture / selection.
 *
 * The keyboard-focused item drives a visible SVG focus ring in the renderer and a
 * polite live-region announcement of its accessible name.
 */

import type { Locale } from '../../domain/model/schedule-model.js';
import type { ScheduleStore } from '../../domain/command/schedule-store.js';
import type { EditingController } from './editing-controller.js';
import type { SvgRenderer } from '../render/svg-renderer.js';
import { itemAccessibleName } from '../../domain/usecase/accessible-name.js';
import { resolveCanvasKeyCommand } from '../../domain/usecase/keyboard-commands.js';

/** Collaborators the canvas keyboard layer coordinates. */
export interface KeyboardNavigationContext {
  readonly renderer: SvgRenderer;
  readonly controller: EditingController;
  readonly store: ScheduleStore;
  /** Announce a message politely to assistive tech. */
  readonly announce: (message: string) => void;
  /** The active UI locale (for accessible-name wording). */
  readonly getLocale: () => Locale;
  /** Called when Enter/Space activates an already-focused item (open editing). */
  readonly onActivateItem?: (itemId: string) => void;
}

/**
 * Attach canvas keyboard navigation to the renderer's SVG element.
 *
 * @param context - The collaborators to drive.
 * @returns A detach function that removes the listeners.
 */
export function attachCanvasKeyboardNavigation(context: KeyboardNavigationContext): () => void {
  const svg = context.renderer.getSvgElement();

  const currentItemId = (): string | null => {
    const selection = context.controller.getSelection();
    return selection.size === 1 ? ([...selection][0] ?? null) : null;
  };

  const focusItem = (itemId: string): void => {
    context.controller.setSelection(new Set([itemId]));
    context.renderer.setKeyboardFocusItem(itemId);
    context.renderer.ensureItemVisible(itemId);
    announceItem(context, itemId);
  };

  const focusFirstItem = (): boolean => {
    const order = context.controller.getVisibleItemIdOrder();
    const first = order[0];
    if (first === undefined) {
      return false;
    }
    focusItem(first);
    return true;
  };

  const handler = (event: KeyboardEvent): void => {
    const command = resolveCanvasKeyCommand({
      key: event.key,
      shiftKey: event.shiftKey,
      ctrlOrMeta: event.ctrlKey || event.metaKey,
    });

    switch (command.kind) {
      case 'none':
        return;

      case 'focus-next':
      case 'focus-prev': {
        const order = context.controller.getVisibleItemIdOrder();
        const current = currentItemId();
        const index = current === null ? -1 : order.indexOf(current);
        const nextIndex =
          command.kind === 'focus-next'
            ? index === -1
              ? 0
              : index + 1
            : index - 1;
        const target = nextIndex >= 0 ? order[nextIndex] : undefined;
        if (target === undefined) {
          // Boundary reached: let Tab escape the canvas (2.1.2 no trap).
          context.renderer.setKeyboardFocusItem(null);
          return;
        }
        focusItem(target);
        event.preventDefault();
        return;
      }

      case 'nudge': {
        if (currentItemId() === null) {
          if (focusFirstItem()) {
            event.preventDefault();
          }
          return;
        }
        if (context.controller.nudgeSelection(command.deltaDays, command.deltaRows)) {
          refreshFocusedItem(context, currentItemId());
        }
        event.preventDefault();
        return;
      }

      case 'resize': {
        if (currentItemId() === null) {
          if (focusFirstItem()) {
            event.preventDefault();
          }
          return;
        }
        if (context.controller.resizeSelection(command.deltaDays)) {
          refreshFocusedItem(context, currentItemId());
        }
        event.preventDefault();
        return;
      }

      case 'activate': {
        event.preventDefault();
        if (context.controller.hasArmedShape()) {
          const created = context.controller.placeArmedItemAtCaret(
            context.renderer.viewportCenterWorldX(),
          );
          if (created !== null) {
            context.renderer.setKeyboardFocusItem(created);
            context.renderer.ensureItemVisible(created);
            announceItem(context, created);
          }
          return;
        }
        const itemId = currentItemId();
        if (itemId !== null) {
          context.onActivateItem?.(itemId);
        }
        return;
      }

      case 'cancel': {
        event.preventDefault();
        context.controller.cancelActiveGesture();
        context.renderer.setKeyboardFocusItem(null);
        return;
      }

      default:
        return;
    }
  };

  const clearRingOnBlur = (): void => context.renderer.setKeyboardFocusItem(null);

  svg.addEventListener('keydown', handler);
  svg.addEventListener('blur', clearRingOnBlur);
  return () => {
    svg.removeEventListener('keydown', handler);
    svg.removeEventListener('blur', clearRingOnBlur);
  };
}

/** Announce a focused item's accessible name (4.1.2) via the live region. */
function announceItem(context: KeyboardNavigationContext, itemId: string): void {
  const item = context.store.getDocument().items.find((candidate) => candidate.id === itemId);
  if (item !== undefined) {
    context.announce(itemAccessibleName(item, context.getLocale()));
  }
}

/** Re-sync the focus ring and announcement after an edit moved/resized an item. */
function refreshFocusedItem(context: KeyboardNavigationContext, itemId: string | null): void {
  if (itemId === null) {
    return;
  }
  context.renderer.setKeyboardFocusItem(itemId);
  context.renderer.ensureItemVisible(itemId);
  announceItem(context, itemId);
}

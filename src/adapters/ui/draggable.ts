/**
 * Adapter layer: a small reusable "drag a floating panel by its handle" helper
 * (TOOL-L1-001 / TOOL-L1-006). Used by the floating command palette so it can be
 * repositioned like the shape (tool) palette. Keeps the dragged element on-screen
 * by clamping to the host's client box.
 *
 * The element must be absolutely positioned inside a positioned `host`. On the
 * first drag the helper converts any `right`/`bottom` anchoring to explicit
 * `left`/`top` so subsequent moves are unambiguous.
 */

/** Options controlling {@link enablePanelDrag}. */
export interface PanelDragOptions {
  /** The absolutely-positioned element to move. */
  readonly element: HTMLElement;
  /** The child that starts a drag when pressed. */
  readonly handle: HTMLElement;
  /** The positioned container the element is clamped within. */
  readonly host: HTMLElement;
  /** Optional callback invoked when a drag starts (e.g. to raise/solidify). */
  readonly onDragStart?: () => void;
}

/** Clamp a value into the inclusive [min, max] range. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Make `element` draggable by `handle` within `host`. Returns a detach function.
 *
 * @param options - The element, handle, host and optional drag-start callback.
 * @returns A function that removes the drag listeners.
 */
export function enablePanelDrag(options: PanelDragOptions): () => void {
  const { element, handle, host, onDragStart } = options;
  let dragging = false;
  let originX = 0;
  let originY = 0;
  let startLeft = 0;
  let startTop = 0;

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) {
      return;
    }
    dragging = true;
    onDragStart?.();
    // Pin the current on-screen position as explicit left/top so a panel anchored
    // by `right`/`top` starts moving from where it visually is, not from 0,0.
    const elementRect = element.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    startLeft = elementRect.left - hostRect.left;
    startTop = elementRect.top - hostRect.top;
    element.style.left = `${startLeft}px`;
    element.style.top = `${startTop}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    originX = event.clientX;
    originY = event.clientY;
    handle.setPointerCapture(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!dragging) {
      return;
    }
    const maxLeft = Math.max(0, host.clientWidth - element.offsetWidth);
    const maxTop = Math.max(0, host.clientHeight - element.offsetHeight);
    element.style.left = `${clamp(startLeft + (event.clientX - originX), 0, maxLeft)}px`;
    element.style.top = `${clamp(startTop + (event.clientY - originY), 0, maxTop)}px`;
  };

  const endDrag = (event: PointerEvent): void => {
    if (!dragging) {
      return;
    }
    dragging = false;
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
  };

  handle.addEventListener('pointerdown', onPointerDown);
  handle.addEventListener('pointermove', onPointerMove);
  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);

  return () => {
    handle.removeEventListener('pointerdown', onPointerDown);
    handle.removeEventListener('pointermove', onPointerMove);
    handle.removeEventListener('pointerup', endDrag);
    handle.removeEventListener('pointercancel', endDrag);
  };
}

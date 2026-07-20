/**
 * Adapter layer: a small accessible dropdown menu for the header Load / Save buttons
 * (CR-003 Part 1). The trigger is a real focusable button (`aria-haspopup="menu"`,
 * `aria-expanded`); the popup is a `role="menu"` list of `role="menuitem"` buttons.
 * The popup is appended to `document.body` and positioned under the trigger on open so
 * it is never clipped by the header's overflow, and it closes on outside pointerdown,
 * Escape (returning focus to the trigger) or item activation.
 *
 * The visible glyph / label and the accessible names are supplied by the caller
 * (header-model specs); this module owns only the DOM plumbing and the a11y wiring.
 */

import type { HeaderMenuItemSpec } from '../../app/header-model.js';

/** A built header menu: its trigger button and each item button keyed by role. */
export interface HeaderMenu {
  /** The header trigger button to place in the header. */
  readonly trigger: HTMLButtonElement;
  /** Look up an item button by its spec role. */
  item(role: string): HTMLButtonElement;
  /** Close the popup if open (no-op otherwise). */
  close(): void;
}

/** Options for {@link createHeaderMenu}. */
export interface HeaderMenuOptions {
  /** Visible trigger label. */
  readonly label: string;
  /** Accessible name of the trigger (aria-label + title). */
  readonly accessibleName: string;
  /** Stable `data-role` for the trigger (e.g. `load` / `save`). */
  readonly triggerRole: string;
  /** The menu items, in visible order. */
  readonly items: readonly HeaderMenuItemSpec[];
  /** Extra class names for the trigger (matches the other header buttons). */
  readonly triggerClassName?: string;
}

/** CSS class of a header dropdown popup (styled once via {@link ensureHeaderMenuStylesheet}). */
const HEADER_MENU_CLASS = 'grsch-header-menu';

/** Install the header-menu popup stylesheet once (idempotent). */
export function ensureHeaderMenuStylesheet(doc: Document): void {
  const styleId = 'grsch-header-menu-style';
  if (doc.getElementById(styleId) !== null) {
    return;
  }
  const style = doc.createElement('style');
  style.id = styleId;
  style.textContent = `
.${HEADER_MENU_CLASS} {
  position: fixed;
  z-index: 40;
  display: flex;
  flex-direction: column;
  min-width: 140px;
  padding: 4px;
  margin: 0;
  border: 1px solid var(--grsch-menu-border);
  border-radius: 6px;
  background: var(--grsch-surface-strong);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22);
  font-family: system-ui, sans-serif;
}
.${HEADER_MENU_CLASS} button {
  cursor: pointer;
  text-align: left;
  padding: 5px 10px;
  font-size: 0.82em;
  line-height: 1.3;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--grsch-text-strong);
  white-space: nowrap;
}
.${HEADER_MENU_CLASS} button:hover,
.${HEADER_MENU_CLASS} button:focus-visible {
  background: var(--grsch-btn-active-bg);
}`;
  doc.head.appendChild(style);
}

/**
 * Build an accessible header dropdown menu. The caller places {@link HeaderMenu.trigger}
 * in the header and wires each {@link HeaderMenu.item} button's `click`.
 *
 * @param options - Trigger label / name / role and the item specs.
 * @returns The built menu handle.
 */
export function createHeaderMenu(options: HeaderMenuOptions): HeaderMenu {
  ensureHeaderMenuStylesheet(document);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = `grsch-header-btn ${options.triggerClassName ?? 'grsch-file-btn'}`.trim();
  trigger.dataset.role = options.triggerRole;
  trigger.textContent = options.label;
  trigger.setAttribute('aria-label', options.accessibleName);
  trigger.title = options.accessibleName;
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');

  const popup = document.createElement('div');
  popup.className = HEADER_MENU_CLASS;
  popup.dataset.role = `${options.triggerRole}-menu`;
  popup.setAttribute('role', 'menu');
  popup.setAttribute('aria-label', options.accessibleName);
  popup.style.display = 'none';

  const itemButtons = new Map<string, HTMLButtonElement>();
  for (const spec of options.items) {
    const itemButton = document.createElement('button');
    itemButton.type = 'button';
    itemButton.dataset.role = spec.role;
    itemButton.setAttribute('role', 'menuitem');
    itemButton.textContent = spec.label;
    itemButton.setAttribute('aria-label', spec.accessibleName);
    itemButton.title = spec.accessibleName;
    // Activating any item closes the menu (the caller's own click handler runs too).
    itemButton.addEventListener('click', () => close());
    popup.appendChild(itemButton);
    itemButtons.set(spec.role, itemButton);
  }
  document.body.appendChild(popup);

  let isOpen = false;

  const onOutsidePointerDown = (event: PointerEvent): void => {
    const target = event.target;
    if (target instanceof Node && (popup.contains(target) || trigger.contains(target))) {
      return;
    }
    close();
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      trigger.focus();
    }
  };

  function open(): void {
    if (isOpen) {
      return;
    }
    isOpen = true;
    const rect = trigger.getBoundingClientRect();
    popup.style.display = 'flex';
    popup.style.top = `${rect.bottom + 4}px`;
    popup.style.left = `${rect.left}px`;
    trigger.setAttribute('aria-expanded', 'true');
    // Defer so the click that opened the menu does not immediately close it.
    window.setTimeout(() => {
      document.addEventListener('pointerdown', onOutsidePointerDown);
      document.addEventListener('keydown', onKeyDown, true);
    }, 0);
    const firstItem = popup.querySelector<HTMLButtonElement>('button');
    firstItem?.focus();
  }

  function close(): void {
    if (!isOpen) {
      return;
    }
    isOpen = false;
    popup.style.display = 'none';
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onOutsidePointerDown);
    document.removeEventListener('keydown', onKeyDown, true);
  }

  trigger.addEventListener('click', () => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  });

  return {
    trigger,
    item: (role: string): HTMLButtonElement => {
      const button = itemButtons.get(role);
      if (button === undefined) {
        throw new Error(`Header menu "${options.triggerRole}" has no item "${role}"`);
      }
      return button;
    },
    close,
  };
}

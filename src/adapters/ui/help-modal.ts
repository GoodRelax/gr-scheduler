/**
 * Adapter layer: the Help modal (SHELL batch item 2).
 *
 * An accessible dialog (`role="dialog"`, `aria-modal="true"`) that presents ALL
 * app features on one screen in a two-column layout, each with its keyboard
 * shortcut where one exists. Opened from the header `[?]` button, it is
 * focus-trapped, closes on Esc / the × button / a backdrop click, and returns
 * focus to the opener (WCAG 2.1.2 / 2.4.3 / 2.4.7).
 *
 * The feature catalogue is a pure data model ({@link buildHelpModel}) so it is
 * unit-testable without a DOM, and every documented shortcut is one that actually
 * exists in the input layer (keyboard-shortcuts / keyboard-navigation / wheel-mode
 * / the delete dialog) -- no phantom shortcuts.
 *
 * English only (product decision for the help surface); the rest of the app's i18n
 * is untouched.
 */

/** A single documented capability, optionally with its keyboard shortcut. */
export interface HelpEntry {
  /** What the feature does (English). */
  readonly feature: string;
  /** The keyboard shortcut, or undefined when the feature is pointer-only. */
  readonly shortcut?: string;
}

/** A titled group of related capabilities. */
export interface HelpSection {
  readonly title: string;
  readonly entries: readonly HelpEntry[];
}

/**
 * The complete, comprehensive feature catalogue shown in the Help modal. Pure
 * data (no DOM) so tests can assert coverage of features and shortcuts.
 *
 * @returns The ordered help sections.
 */
export function buildHelpModel(): readonly HelpSection[] {
  return [
    {
      title: 'Create & draw',
      entries: [
        { feature: 'Arm a milestone shape (diamond / circle / triangle / square / star), then click a row' },
        { feature: 'Arm a task shape (bar / arrow / chevron / span), then click or drag across a row' },
        { feature: 'Move an item by dragging its body' },
        { feature: 'Resize a task by dragging its start / end edge' },
        { feature: 'Place an armed shape at the caret', shortcut: 'Enter' },
      ],
    },
    {
      title: 'Select & edit',
      entries: [
        { feature: 'Select an item by clicking it' },
        { feature: 'Marquee-select by dragging over empty canvas' },
        { feature: 'Select every item', shortcut: 'Ctrl+A' },
        { feature: 'Delete the selection (item / dependency / annotation)', shortcut: 'Delete / Backspace' },
        { feature: 'Copy the selection', shortcut: 'Ctrl+C' },
        { feature: 'Paste the clipboard', shortcut: 'Ctrl+V' },
        { feature: 'Undo', shortcut: 'Ctrl+Z' },
        { feature: 'Redo', shortcut: 'Ctrl+Y / Ctrl+Shift+Z' },
        { feature: 'Cancel a gesture, or close the panel / a dialog', shortcut: 'Esc' },
      ],
    },
    {
      title: 'Navigate the canvas',
      entries: [
        { feature: 'Scroll the timeline', shortcut: 'Wheel' },
        { feature: 'Zoom (time / row axis)', shortcut: 'Ctrl / Shift / Alt + Wheel' },
        { feature: 'Pan the canvas', shortcut: 'Ctrl + Drag' },
        { feature: 'Move focus between items', shortcut: 'Tab' },
        { feature: 'Nudge the focused item by a day / row', shortcut: 'Arrow keys' },
        { feature: 'Resize the focused task', shortcut: 'Shift + Left / Right' },
        { feature: 'Fit the whole schedule into view' },
      ],
    },
    {
      title: 'Properties',
      entries: [
        { feature: 'Edit dates, categories, assignee, status and remarks' },
        { feature: 'Change fill_color and stroke_color (CUD palette or picker)' },
        { feature: 'Change icon_shape_kind and label_position' },
        { feature: 'Toggle plan / actual per item; set line_weight and fade days' },
        {
          feature:
            'Edit predecessor_item_ids / successor_item_ids (comma-separated ItemIDs) to wire dependencies',
        },
        { feature: 'Show or hide the properties panel' },
      ],
    },
    {
      title: 'Classification pane',
      entries: [
        { feature: 'Add a section or a sub-category' },
        { feature: 'Reorder a node among its siblings (move up / down)' },
        { feature: 'Hide a node, or show all under a section' },
        { feature: 'Copy / paste a node subtree', shortcut: 'Ctrl+C / Ctrl+V' },
        { feature: 'Delete a node (with confirm dialog)', shortcut: 'D confirm / C cancel' },
        { feature: 'Resize the pane by dragging its divider' },
      ],
    },
    {
      title: 'Display & overlays',
      entries: [
        { feature: 'Toggle plan and actual visibility' },
        { feature: 'Toggle date and category gridlines' },
        { feature: 'Cursor guide: off / crosshair / single / double vertical' },
        { feature: 'Toggle the today line and the progress (lightning) line' },
        {
          feature:
            'Dependency link mode: click a source item then a target to link (repeat for n:n); click a linked pair again to unlink',
        },
        { feature: 'Add comments and enclosure boxes' },
        { feature: 'Toggle the evidence watermark' },
        { feature: 'Switch light / dark theme and UI language' },
        { feature: 'Adjust the font size (small / medium / large)' },
        { feature: 'Toggle browser fullscreen' },
      ],
    },
    {
      title: 'Files',
      entries: [
        { feature: 'Export the schedule as JSON, MSProject XML or SVG' },
        { feature: 'Import a JSON / XML document' },
        { feature: 'Import an SVG / PNG icon' },
        { feature: 'Autosave to local storage with crash recovery' },
      ],
    },
  ];
}

/** The usage hint moved out of the header into the Help modal (SHELL item 1). */
export const HELP_USAGE_HINT =
  'Arm a shape then click or drag a row to create; drag items to move, edges to ' +
  'resize; wheel = scroll, Ctrl/Shift/Alt+wheel = zoom, Ctrl+drag = pan, Fit frames all.';

/** CSS class of the modal backdrop + dialog (installed once). */
const HELP_MODAL_STYLE_ID = 'grsch-help-modal-style';

/** Install the Help-modal stylesheet once (themed via the shared CSS variables). */
function ensureHelpModalStylesheet(doc: Document): void {
  if (doc.getElementById(HELP_MODAL_STYLE_ID) !== null) {
    return;
  }
  const style = doc.createElement('style');
  style.id = HELP_MODAL_STYLE_ID;
  style.textContent = `
.grsch-help-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--grsch-scrim);
  padding: 20px;
  box-sizing: border-box;
}
.grsch-help-dialog {
  width: 85vw;
  max-height: 92vh;
  overflow: auto;
  background: var(--grsch-surface-strong);
  color: var(--grsch-text);
  border: 1px solid var(--grsch-menu-border);
  border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  font-family: system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.4;
}
.grsch-help-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--grsch-panel-border);
}
.grsch-help-head h2 { margin: 0; font-size: 1.15em; color: var(--grsch-text-strong); }
.grsch-help-close {
  cursor: pointer;
  border: 1px solid var(--grsch-menu-border);
  border-radius: 5px;
  background: var(--grsch-btn-bg-solid);
  color: var(--grsch-text);
  font-size: 1.1em;
  line-height: 1;
  padding: 2px 9px;
}
.grsch-help-hint {
  margin: 0;
  padding: 8px 16px;
  color: var(--grsch-text-muted);
  border-bottom: 1px solid var(--grsch-panel-border);
}
.grsch-help-columns {
  column-count: 3;
  column-gap: 24px;
  padding: 12px 16px 16px;
}
@media (max-width: 900px) { .grsch-help-columns { column-count: 2; } }
@media (max-width: 620px) { .grsch-help-columns { column-count: 1; } }
.grsch-help-section {
  break-inside: avoid;
  margin: 0 0 12px;
}
.grsch-help-section h3 {
  margin: 0 0 4px;
  font-size: 0.95em;
  color: var(--grsch-text-strong);
  border-bottom: 1px solid var(--grsch-panel-border);
  padding-bottom: 2px;
}
.grsch-help-entry {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 1px 0;
}
.grsch-help-key {
  flex: 0 0 auto;
  font-family: ui-monospace, monospace;
  font-size: 0.9em;
  color: var(--grsch-text-strong);
  background: var(--grsch-btn-bg-solid);
  border: 1px solid var(--grsch-btn-border);
  border-radius: 4px;
  padding: 0 5px;
  white-space: nowrap;
  align-self: start;
}`;
  doc.head.appendChild(style);
}

/** Selector for focusable controls, used by the focus trap. */
const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The Help modal controller. Build once with a host element; {@link open} shows it
 * (trapping focus and remembering the opener), {@link close} hides it and returns
 * focus. Content is rendered from {@link buildHelpModel}.
 */
export class HelpModal {
  private readonly host: HTMLElement;
  private backdrop: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  private returnFocusTo: HTMLElement | null = null;

  /**
   * @param host - The element the modal is appended to when open (usually the app root).
   */
  public constructor(host: HTMLElement) {
    this.host = host;
    ensureHelpModalStylesheet(document);
  }

  /** Whether the modal is currently open. */
  public isOpen(): boolean {
    return this.backdrop !== null;
  }

  /**
   * Open the modal and trap focus inside it.
   *
   * @param returnFocusTo - The control focus returns to on close (the opener).
   */
  public open(returnFocusTo: HTMLElement | null): void {
    if (this.isOpen()) {
      return;
    }
    this.returnFocusTo = returnFocusTo;
    this.render();
    // Move focus into the dialog (the close button) so the trap has an anchor.
    const closeButton = this.dialog?.querySelector<HTMLElement>('[data-role="help-close"]');
    closeButton?.focus();
  }

  /** Close the modal and return focus to the opener. */
  public close(): void {
    if (this.backdrop === null) {
      return;
    }
    this.backdrop.remove();
    this.backdrop = null;
    this.dialog = null;
    this.returnFocusTo?.focus();
    this.returnFocusTo = null;
  }

  private render(): void {
    const backdrop = document.createElement('div');
    backdrop.className = 'grsch-help-backdrop';
    backdrop.dataset.role = 'help-backdrop';
    // A click on the backdrop (outside the dialog) closes it.
    backdrop.addEventListener('pointerdown', (event) => {
      if (event.target === backdrop) {
        this.close();
      }
    });

    const dialog = document.createElement('div');
    dialog.className = 'grsch-help-dialog';
    dialog.dataset.role = 'help-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'grsch-help-title');
    dialog.tabIndex = -1;
    dialog.addEventListener('keydown', (event) => this.handleKeydown(event));

    const head = document.createElement('div');
    head.className = 'grsch-help-head';
    const title = document.createElement('h2');
    title.id = 'grsch-help-title';
    title.textContent = 'gr-scheduler help';
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'grsch-help-close';
    closeButton.dataset.role = 'help-close';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', 'Close help');
    closeButton.title = 'Close help';
    closeButton.addEventListener('click', () => this.close());
    head.append(title, closeButton);

    const hint = document.createElement('p');
    hint.className = 'grsch-help-hint';
    hint.dataset.role = 'help-hint';
    hint.textContent = HELP_USAGE_HINT;

    const columns = document.createElement('div');
    columns.className = 'grsch-help-columns';
    for (const section of buildHelpModel()) {
      columns.appendChild(renderSection(section));
    }

    dialog.append(head, hint, columns);
    backdrop.appendChild(dialog);
    this.host.appendChild(backdrop);
    this.backdrop = backdrop;
    this.dialog = dialog;
  }

  /** Focus trap + Esc close (Tab / Shift+Tab wrap within the dialog). */
  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      // Stop the shell's window-level Esc handler from also acting on this Esc.
      event.stopPropagation();
      this.close();
      return;
    }
    if (event.key !== 'Tab' || this.dialog === null) {
      return;
    }
    const focusable = Array.from(
      this.dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((element) => !element.hasAttribute('disabled'));
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === this.dialog)) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first?.focus();
    }
  }
}

/** Build the DOM for one help section. */
function renderSection(section: HelpSection): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'grsch-help-section';
  wrapper.dataset.role = 'help-section';
  const heading = document.createElement('h3');
  heading.textContent = section.title;
  wrapper.appendChild(heading);
  for (const entry of section.entries) {
    const row = document.createElement('div');
    row.className = 'grsch-help-entry';
    const label = document.createElement('span');
    label.textContent = entry.feature;
    row.appendChild(label);
    if (entry.shortcut !== undefined) {
      const key = document.createElement('span');
      key.className = 'grsch-help-key';
      key.textContent = entry.shortcut;
      row.appendChild(key);
    }
    wrapper.appendChild(row);
  }
  return wrapper;
}

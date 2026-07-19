/**
 * Adapter layer: the property panel (ARCH-C-029, PROP-L1-001/002/004).
 *
 * Edits the selected item's properties and writes changes back through the store
 * as `edit-property` commands, so every property edit is undoable and the render
 * follows the model (bidirectional sync -- editing start_date/end_date here moves
 * the item on the canvas, ALIGN-L1-003).
 *
 * Property NAMES are shown as the fixed English field keys (PROP-L1-004); the
 * localized label layer is out of M2 scope, so the English key doubles as the
 * label for now. Colors offer the 10-swatch CUD palette (PROP-L1-005/006)
 * alongside a full-color input.
 */

import type {
  LabelPosition,
  ScheduleDocument,
  ScheduleItem,
} from '../../domain/model/schedule-model.js';
import type { ScheduleStore } from '../../domain/command/schedule-store.js';
import { editPropertyCommand, type ItemPropertyPatch } from '../../domain/command/commands.js';
import { CUD_PALETTE, TRANSPARENT_COLOR_KEY } from '../../domain/model/cud-palette.js';
import { MUTED_TEXT_HEX } from '../../domain/usecase/a11y-tokens.js';

/**
 * A tiny checkerboard CSS background used to render the "transparent" color swatch
 * so it reads as "no color" rather than as a white swatch (WCAG 1.4.1: not by hue
 * alone -- the swatch also carries the accessible name "transparent").
 */
const CHECKERBOARD_BACKGROUND =
  'repeating-conic-gradient(#c9c9c9 0% 25%, #ffffff 0% 50%) 50% / 8px 8px';

/** A single editable field descriptor bound to the panel. */
interface FieldControl {
  readonly input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  readonly readValue: (item: ScheduleItem) => string;
}

/**
 * Side panel that edits the currently selected item. Construct with a container
 * and store, then drive it via {@link setSelectedItemId}.
 */
export class PropertyPanel {
  private readonly root: HTMLElement;
  private readonly store: ScheduleStore;
  private readonly controls: FieldControl[] = [];
  private selectedItemId: string | null = null;
  /** Invoked when the user closes the panel with the × button (fix 10). */
  private readonly onRequestHide: (() => void) | null;
  /** The end_date field row, hidden for milestones (M-03 invariant guard). */
  private endDateRow: HTMLElement | null = null;
  /** The fade_in_days field row, shown for tasks only (fade is tasks-only). */
  private fadeInDaysRow: HTMLElement | null = null;
  /** The fade_out_days field row, shown for tasks only. */
  private fadeOutDaysRow: HTMLElement | null = null;
  /** The middle_category input (drives the minor field's enablement). */
  private middleCategoryInput: HTMLInputElement | null = null;
  /** The minor_category input, disabled while middle is empty (SECT rework rule). */
  private minorCategoryInput: HTMLInputElement | null = null;

  /**
   * @param container - Host element the panel builds itself into.
   * @param store - The store to read from and dispatch edits to.
   * @param onRequestHide - Optional callback the × close button invokes so the
   *   shell can keep the properties toggle button's state in sync (fix 10).
   */
  public constructor(container: HTMLElement, store: ScheduleStore, onRequestHide?: () => void) {
    this.root = container;
    this.store = store;
    this.onRequestHide = onRequestHide ?? null;
    this.buildStaticLayout();
    store.subscribe((document) => this.refreshValues(document));
  }

  /**
   * Point the panel at a selected item (or null to show the empty state).
   *
   * @param itemId - The selected item id, or null.
   */
  public setSelectedItemId(itemId: string | null): void {
    this.selectedItemId = itemId;
    this.refreshValues(this.store.getDocument());
  }

  /**
   * Show or hide the (fixed, right-side) property panel region. Hiding it collapses
   * the panel to zero width so the flex canvas reclaims the space; showing it
   * restores the panel. The panel stays a fixed region -- it never floats.
   *
   * @param hidden - True to hide the panel, false to show it.
   */
  public setHidden(hidden: boolean): void {
    this.root.style.display = hidden ? 'none' : 'block';
  }

  /** Whether the panel is currently hidden. */
  public isHidden(): boolean {
    return this.root.style.display === 'none';
  }

  private buildStaticLayout(): void {
    this.root.innerHTML = '';
    // Named landmark region so assistive tech can jump to the editor (WCAG 4.1.2).
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', 'Properties');
    this.root.style.width = '260px';
    this.root.style.flex = '0 0 260px';
    this.root.style.borderLeft = '1px solid #ddd';
    this.root.style.background = '#fafafa';
    // Kept scrollable as a safety net, but the compact sizing below is tuned so the
    // full field set fits WITHOUT a scrollbar at a normal window height (user
    // feedback: the panel was cut off / needed scrolling).
    this.root.style.overflowY = 'auto';
    this.root.style.padding = '6px 8px';
    this.root.style.boxSizing = 'border-box';
    // Relative sizing so the uniform font scale (TOOL-L1-002) rescales the panel.
    // Smaller than before so all rows fit without scrolling.
    this.root.style.fontFamily = 'system-ui, sans-serif';
    // Trimmed from 0.74em / 1.25 line-height to fit the two extra fade rows without
    // a vertical scrollbar at a normal window height (user requires no-scroll).
    this.root.style.fontSize = '0.7em';
    this.root.style.lineHeight = '1.2';

    // Header row: title on the left, a × close button on the right (fix 10). The
    // button hides the panel (reclaiming the canvas width) and notifies the shell.
    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.alignItems = 'center';
    headerRow.style.justifyContent = 'space-between';
    headerRow.style.marginBottom = '4px';
    const heading = document.createElement('strong');
    heading.textContent = 'Properties';
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.dataset.role = 'close-properties';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', 'Close properties panel');
    closeButton.title = 'Close properties panel';
    closeButton.style.cursor = 'pointer';
    closeButton.style.border = '1px solid #ccc';
    closeButton.style.borderRadius = '4px';
    closeButton.style.background = '#ffffff';
    closeButton.style.color = '#2b2b2b';
    closeButton.style.lineHeight = '1';
    closeButton.style.padding = '1px 6px';
    closeButton.addEventListener('click', () => {
      this.setHidden(true);
      this.onRequestHide?.();
    });
    headerRow.append(heading, closeButton);
    this.root.appendChild(headerRow);

    const empty = document.createElement('div');
    empty.dataset.role = 'empty-state';
    empty.textContent = 'Select an item to edit its properties.';
    empty.style.color = MUTED_TEXT_HEX;
    this.root.appendChild(empty);

    const form = document.createElement('div');
    form.dataset.role = 'form';
    form.style.display = 'none';
    this.root.appendChild(form);

    this.addTextField(form, 'abbreviation', (item) => item.abbrev, (value) => ({ abbrev: value }));
    this.addTextField(form, 'full_name', (item) => item.fullName ?? '', (value) => ({ fullName: value }));
    this.addTextAreaField(form, 'description', (item) => item.description ?? '', (value) => ({ description: value }));
    this.addDateField(form, 'start_date', (item) => item.startDate, (value) => ({ startDate: value }));
    this.endDateRow = this.addDateField(
      form,
      'end_date',
      (item) => item.endDate ?? '',
      (value) => ({ endDate: value }),
    );
    // Fade taper day counts (tasks only). Editing them reshapes the bar into a
    // trapezoid / parallelogram; the command clamps so in + out <= task length.
    this.fadeInDaysRow = this.addNumberField(
      form,
      'fade_in_days',
      (item) => item.fadeInDays ?? 0,
      (value) => ({ fadeInDays: value }),
    );
    this.fadeOutDaysRow = this.addNumberField(
      form,
      'fade_out_days',
      (item) => item.fadeOutDays ?? 0,
      (value) => ({ fadeOutDays: value }),
    );
    this.addTextField(form, 'major_category', (item) => item.majorCategory ?? '', (value) => ({ majorCategory: value }));
    // A middle can be cleared: doing so also clears minor (minor requires middle).
    this.middleCategoryInput = this.addTextField(
      form,
      'middle_category',
      (item) => item.middleCategory ?? '',
      (value) => (value.trim().length === 0 ? { middleCategory: value, minorCategory: '' } : { middleCategory: value }),
    );
    // A minor may only be set when a middle exists (SECT rework rule): the input is
    // disabled while middle is empty, and the change is guarded even if enabled.
    this.minorCategoryInput = this.addTextField(
      form,
      'minor_category',
      (item) => item.minorCategory ?? '',
      (value) => ({ minorCategory: value }),
      () => (this.middleCategoryInput?.value.trim().length ?? 0) > 0,
    );
    this.addTextField(form, 'assignee', (item) => item.assignee ?? '', (value) => ({ assignee: value }));
    this.addTextField(form, 'status', (item) => item.status ?? '', (value) => ({ status: value }));
    this.addTextField(form, 'remarks', (item) => item.remarks ?? '', (value) => ({ remarks: value }));
    this.addSelectField(
      form,
      'plan_actual_kind',
      ['plan', 'actual'],
      (item) => item.planActualKind ?? 'plan',
      (value) => ({ planActualKind: value === 'actual' ? 'actual' : 'plan' }),
    );
    this.addSelectField(
      form,
      'line_weight',
      ['thin', 'medium', 'thick'],
      (item) => item.lineWeight ?? 'medium',
      (value) => ({ lineWeight: value === 'thin' ? 'thin' : value === 'thick' ? 'thick' : 'medium' }),
    );
    this.addSelectField(
      form,
      'label_position',
      ['auto', 'center', 'top', 'bottom', 'right', 'left'],
      (item) => item.labelPosition ?? 'auto',
      (value) => ({ labelPosition: labelPositionOf(value) }),
    );
    this.addColorField(form, 'stroke_color', (item) => item.strokeColor, (value) => ({ strokeColor: value }));
    this.addColorField(form, 'fill_color', (item) => item.fillColor, (value) => ({ fillColor: value }));
  }

  private addFieldRow(form: HTMLElement, fieldKey: string): HTMLElement {
    const row = document.createElement('label');
    row.style.display = 'block';
    row.style.marginBottom = '2px';
    const caption = document.createElement('span');
    caption.textContent = fieldKey;
    caption.style.display = 'block';
    caption.style.color = '#333';
    caption.style.fontFamily = 'ui-monospace, monospace';
    caption.style.fontSize = '0.9em';
    row.appendChild(caption);
    form.appendChild(row);
    return row;
  }

  private addTextField(
    form: HTMLElement,
    fieldKey: string,
    readValue: (item: ScheduleItem) => string,
    toPatch: (value: string) => ItemPropertyPatch,
    canDispatch?: () => boolean,
  ): HTMLInputElement {
    const row = this.addFieldRow(form, fieldKey);
    const input = document.createElement('input');
    input.type = 'text';
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';
    input.addEventListener('change', () => {
      if (canDispatch !== undefined && !canDispatch()) {
        // Guarded (e.g. minor while middle empty): revert the edit, do not dispatch.
        input.value = '';
        return;
      }
      this.dispatchPatch(toPatch(input.value));
    });
    row.appendChild(input);
    this.controls.push({ input, readValue });
    return input;
  }

  private addTextAreaField(
    form: HTMLElement,
    fieldKey: string,
    readValue: (item: ScheduleItem) => string,
    toPatch: (value: string) => ItemPropertyPatch,
  ): void {
    const row = this.addFieldRow(form, fieldKey);
    const input = document.createElement('textarea');
    input.rows = 2;
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';
    input.addEventListener('change', () => this.dispatchPatch(toPatch(input.value)));
    row.appendChild(input);
    this.controls.push({ input, readValue });
  }

  private addDateField(
    form: HTMLElement,
    fieldKey: string,
    readValue: (item: ScheduleItem) => string,
    toPatch: (value: string) => ItemPropertyPatch,
  ): HTMLElement {
    const row = this.addFieldRow(form, fieldKey);
    const input = document.createElement('input');
    input.type = 'date';
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';
    input.addEventListener('change', () => {
      if (input.value.length > 0) {
        this.dispatchPatch(toPatch(input.value));
      }
    });
    row.appendChild(input);
    this.controls.push({ input, readValue });
    return row;
  }

  /**
   * Add a whole-number field (e.g. the fade day counts). Non-numeric / negative
   * input is coerced to a non-negative integer before dispatch; the command clamps
   * the upper bound against the task length.
   *
   * @returns The row element so the caller can show/hide it per item kind.
   */
  private addNumberField(
    form: HTMLElement,
    fieldKey: string,
    readValue: (item: ScheduleItem) => number,
    toPatch: (value: number) => ItemPropertyPatch,
  ): HTMLElement {
    const row = this.addFieldRow(form, fieldKey);
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '1';
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';
    input.addEventListener('change', () => {
      const parsed = Number.parseInt(input.value, 10);
      const nonNegative = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
      this.dispatchPatch(toPatch(nonNegative));
    });
    row.appendChild(input);
    this.controls.push({ input, readValue: (item) => String(readValue(item)) });
    return row;
  }

  private addSelectField(
    form: HTMLElement,
    fieldKey: string,
    options: readonly string[],
    readValue: (item: ScheduleItem) => string,
    toPatch: (value: string) => ItemPropertyPatch,
  ): void {
    const row = this.addFieldRow(form, fieldKey);
    const input = document.createElement('select');
    input.style.width = '100%';
    for (const option of options) {
      const element = document.createElement('option');
      element.value = option;
      element.textContent = option;
      input.appendChild(element);
    }
    input.addEventListener('change', () => this.dispatchPatch(toPatch(input.value)));
    row.appendChild(input);
    this.controls.push({ input, readValue });
  }

  private addColorField(
    form: HTMLElement,
    fieldKey: string,
    readValue: (item: ScheduleItem) => string,
    toPatch: (value: string) => ItemPropertyPatch,
  ): void {
    const row = this.addFieldRow(form, fieldKey);
    const swatches = document.createElement('div');
    swatches.style.display = 'flex';
    swatches.style.flexWrap = 'wrap';
    swatches.style.gap = '3px';
    swatches.style.marginBottom = '4px';
    swatches.setAttribute('role', 'group');
    swatches.setAttribute('aria-label', `${fieldKey} palette`);
    // A "transparent" swatch (no fill / no border) precedes the CUD colors so an
    // item can have no visible paint -- the default for the stroke color (item:
    // add transparent + default transparent stroke).
    const transparentSwatch = document.createElement('button');
    transparentSwatch.type = 'button';
    transparentSwatch.dataset.role = 'transparent-swatch';
    transparentSwatch.title = TRANSPARENT_COLOR_KEY;
    transparentSwatch.setAttribute('aria-label', TRANSPARENT_COLOR_KEY);
    transparentSwatch.style.width = '14px';
    transparentSwatch.style.height = '14px';
    transparentSwatch.style.padding = '0';
    transparentSwatch.style.border = '1px solid #999';
    transparentSwatch.style.background = CHECKERBOARD_BACKGROUND;
    transparentSwatch.style.cursor = 'pointer';
    transparentSwatch.addEventListener('click', () =>
      this.dispatchPatch(toPatch(TRANSPARENT_COLOR_KEY)),
    );
    swatches.appendChild(transparentSwatch);
    for (const color of CUD_PALETTE) {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      // Color-only swatch: name it so it is not conveyed by hue alone (1.1.1/1.4.1).
      swatch.title = color.colorKey;
      swatch.setAttribute('aria-label', color.colorKey);
      swatch.style.width = '14px';
      swatch.style.height = '14px';
      swatch.style.padding = '0';
      swatch.style.border = '1px solid #999';
      swatch.style.background = color.cssValue;
      swatch.style.cursor = 'pointer';
      swatch.addEventListener('click', () => this.dispatchPatch(toPatch(color.cssValue)));
      swatches.appendChild(swatch);
    }
    row.appendChild(swatches);
    const input = document.createElement('input');
    input.type = 'color';
    input.style.width = '100%';
    input.addEventListener('change', () => this.dispatchPatch(toPatch(input.value)));
    row.appendChild(input);
    this.controls.push({ input, readValue });
  }

  private dispatchPatch(patch: ItemPropertyPatch): void {
    if (this.selectedItemId === null) {
      return;
    }
    this.store.dispatch(editPropertyCommand(this.selectedItemId, patch));
  }

  private refreshValues(document: ScheduleDocument): void {
    const empty = this.root.querySelector<HTMLElement>('[data-role="empty-state"]');
    const form = this.root.querySelector<HTMLElement>('[data-role="form"]');
    const item =
      this.selectedItemId === null
        ? undefined
        : document.items.find((candidate) => candidate.id === this.selectedItemId);
    if (item === undefined) {
      if (empty) empty.style.display = 'block';
      if (form) form.style.display = 'none';
      return;
    }
    if (empty) empty.style.display = 'none';
    if (form) form.style.display = 'block';
    // M-03: a milestone has no end_date; hide the field so it cannot be set.
    const isMilestone = item.itemKind === 'milestone';
    if (this.endDateRow !== null) {
      this.endDateRow.style.display = isMilestone ? 'none' : 'block';
    }
    // Fade is tasks-only: hide both day-count rows for a milestone.
    if (this.fadeInDaysRow !== null) {
      this.fadeInDaysRow.style.display = isMilestone ? 'none' : 'block';
    }
    if (this.fadeOutDaysRow !== null) {
      this.fadeOutDaysRow.style.display = isMilestone ? 'none' : 'block';
    }
    for (const control of this.controls) {
      // Do not clobber the field the user is actively editing.
      if (globalThis.document.activeElement === control.input) {
        continue;
      }
      control.input.value = control.readValue(item);
    }
    // Minor may only be set when a middle exists: disable + visually mute otherwise
    // (SECT rework rule; the change handler also guards against a stray dispatch).
    if (this.minorCategoryInput !== null) {
      const middleEmpty = (item.middleCategory ?? '').trim().length === 0;
      this.minorCategoryInput.disabled = middleEmpty;
      this.minorCategoryInput.title = middleEmpty
        ? 'set a middle_category before a minor_category'
        : '';
      this.minorCategoryInput.style.opacity = middleEmpty ? '0.5' : '1';
    }
  }
}

/** Narrow a raw string to a LabelPosition, defaulting to 'auto'. */
function labelPositionOf(value: string): LabelPosition {
  switch (value) {
    case 'center':
    case 'top':
    case 'bottom':
    case 'right':
    case 'left':
      return value;
    default:
      return 'auto';
  }
}

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
  IconShapeKind,
  LabelPosition,
  MilestoneShape,
  ScheduleDocument,
  ScheduleItem,
  TaskShape,
} from '../../domain/model/schedule-model.js';
import {
  DEFAULT_DEPENDENCY_LINE_COLOR,
  MILESTONE_SHAPE_KINDS,
  TASK_SHAPE_KINDS,
} from '../../domain/model/schedule-model.js';
import type { ScheduleStore } from '../../domain/command/schedule-store.js';
import {
  editPropertyCommand,
  rewireItemDependenciesCommand,
  setDependencyColorCommand,
  type ItemPropertyPatch,
} from '../../domain/command/commands.js';
import { effectiveMilestoneShape, effectiveTaskShape } from '../../domain/usecase/task-glyph.js';
import {
  isEmptyRewire,
  planPredecessorRewire,
  planSuccessorRewire,
  predecessorItemIds,
  successorItemIds,
} from '../../domain/usecase/dependency-projection.js';
import { CUD_PALETTE, TRANSPARENT_COLOR_KEY } from '../../domain/model/cud-palette.js';

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
 * Callbacks + labels wiring the always-present progress-line (イナズマ線) control
 * section (item 2). The panel reads the current visibility/color through the getters
 * and writes changes through the setters, keeping the panel free of any renderer /
 * view-state dependency (the shell owns that state).
 */
export interface ProgressLineControlHandlers {
  /** Whether the progress line is currently shown. */
  readonly isVisible: () => boolean;
  /** The current progress-line color. */
  readonly getColor: () => string;
  /** Show (true) or hide/delete (false) the progress line. */
  readonly onToggle: (visible: boolean) => void;
  /** Recolor the progress line. */
  readonly onColor: (color: string) => void;
  /** Localized section label. */
  readonly label: string;
  /** Localized accessible name for the color control. */
  readonly colorLabel: string;
}

/**
 * Side panel that edits the currently selected item. Construct with a container
 * and store, then drive it via {@link setSelectedItemId}.
 */
export class PropertyPanel {
  private readonly root: HTMLElement;
  private readonly store: ScheduleStore;
  private readonly controls: FieldControl[] = [];
  /** The item whose values the fields DISPLAY (the first of the selection). */
  private selectedItemId: string | null = null;
  /**
   * Every selected item id a dispatched patch is applied to (item 5: a fill-color
   * edit applies to all selected items). Contains just {@link selectedItemId} for a
   * single selection, or all ids for a multi-selection.
   */
  private selectedItemIds: ReadonlySet<string> = new Set();
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
  /** The icon_shape_kind select; its options are rebuilt per item family (item 4). */
  private iconShapeKindSelect: HTMLSelectElement | null = null;
  /** The predecessor comma-id field (item 4); rewires edges targeting the selected item. */
  private predecessorItemIdsInput: HTMLInputElement | null = null;
  /** The successor comma-id field (item 4); rewires edges originating at the selected item. */
  private successorItemIdsInput: HTMLInputElement | null = null;
  /** Serial for the ids of edges added by a panel rewire (item 4). */
  private nextRewireSerial = 0;
  /** The dependency-line color form, shown when a dependency line is selected (item 1). */
  private dependencyForm: HTMLElement | null = null;
  /** The native color input inside the dependency form. */
  private dependencyColorInput: HTMLInputElement | null = null;
  /** The selected dependency line id, or null (item 1). */
  private selectedDependencyId: string | null = null;

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
    this.selectedItemIds = itemId === null ? new Set() : new Set([itemId]);
    if (itemId !== null) {
      this.selectedDependencyId = null;
    }
    this.refreshValues(this.store.getDocument());
  }

  /**
   * Point the panel at a whole selection (item 5 multi-select). The fields display
   * the FIRST selected item's values, and a dispatched patch is applied to EVERY
   * selected item (so e.g. a fill-color change recolors all of them).
   *
   * @param itemIds - The selected item ids (empty for the empty state).
   */
  public setSelectedItemIds(itemIds: ReadonlySet<string>): void {
    this.selectedItemIds = new Set(itemIds);
    this.selectedItemId = itemIds.size === 0 ? null : ([...itemIds][0] ?? null);
    if (itemIds.size > 0) {
      this.selectedDependencyId = null;
    }
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
    // Compact, SCOPED control sizing so the full field set (now including the two
    // dependency-array fields, item 4) still fits the fixed-height panel WITHOUT a
    // vertical scrollbar. Scoped by class so it touches only this panel's controls.
    this.root.classList.add('grsch-prop-panel');
    const compactStyle = document.createElement('style');
    compactStyle.textContent = [
      '.grsch-prop-panel input:not([type="color"]),',
      '.grsch-prop-panel select { height: 17px; padding: 0 2px; box-sizing: border-box; }',
      '.grsch-prop-panel input[type="color"] { height: 16px; padding: 0; box-sizing: border-box; }',
      '.grsch-prop-panel textarea { padding: 0 2px; box-sizing: border-box; }',
    ].join('\n');
    this.root.appendChild(compactStyle);
    this.root.style.width = '260px';
    this.root.style.flex = '0 0 260px';
    this.root.style.borderLeft = '1px solid var(--grsch-panel-border)';
    this.root.style.background = 'var(--grsch-panel-bg)';
    this.root.style.color = 'var(--grsch-text)';
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
    this.root.style.lineHeight = '1.15';

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
    closeButton.style.border = '1px solid var(--grsch-menu-border)';
    closeButton.style.borderRadius = '4px';
    closeButton.style.background = 'var(--grsch-surface-strong)';
    closeButton.style.color = 'var(--grsch-text)';
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
    empty.style.color = 'var(--grsch-text-muted)';
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
    // Editing the fill marks it EXPLICIT so it overrides the plan/actual display
    // color (item 5): the change is otherwise masked for plan/actual items.
    this.addColorField(
      form,
      'fill_color',
      (item) => item.fillColor,
      (value) => ({ fillColor: value, fillColorExplicit: true }),
    );
    // Dependency arrays (item 4): comma-separated ItemIDs the user can author to wire
    // predecessors / successors (1:1, 1:n, n:1, n:n). Editing rewires the canonical edge
    // list in one undoable step and re-renders the (yamabuki) lines. Field NAMES stay
    // English (PROP-L1-004).
    this.predecessorItemIdsInput = this.addDependencyIdField(form, 'predecessor_item_ids', 'predecessor');
    this.successorItemIdsInput = this.addDependencyIdField(form, 'successor_item_ids', 'successor');
    // Unified glyph shape (item 4): its options are rebuilt per item family in
    // refreshValues (milestone shapes for a milestone; bar/arrow/chevron/span for a
    // task) and it drives rendering. Placed LAST so it does not shift the earlier
    // fields' on-screen positions.
    this.iconShapeKindSelect = this.addIconShapeKindField(form);

    // The dependency-line color form (item 1) is a sibling of the item form, shown
    // only while a dependency line is selected.
    this.buildDependencyForm();
  }

  private addFieldRow(form: HTMLElement, fieldKey: string): HTMLElement {
    const row = document.createElement('label');
    row.style.display = 'block';
    // 1px row gap keeps the full field set (now including icon_shape_kind) plus the
    // progress-line section within the panel height without a vertical scrollbar.
    row.style.marginBottom = '1px';
    const caption = document.createElement('span');
    caption.textContent = fieldKey;
    caption.style.display = 'block';
    caption.style.color = 'var(--grsch-text)';
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

  /**
   * Build the `icon_shape_kind` select (item 4). Its option set is rebuilt per item
   * in {@link refreshValues} because the valid kinds depend on the item family
   * (milestone shapes vs task shapes). Changing it dispatches a patch that sets
   * `iconShapeKind` AND the matching legacy field (taskShape / milestoneShape) so
   * the model stays internally consistent and re-renders.
   *
   * @returns The select element (repopulated per item).
   */
  private addIconShapeKindField(form: HTMLElement): HTMLSelectElement {
    const row = this.addFieldRow(form, 'icon_shape_kind');
    const select = document.createElement('select');
    select.style.width = '100%';
    select.dataset.role = 'icon-shape-kind';
    select.addEventListener('change', () => {
      const item = this.currentItem();
      if (item === null) {
        return;
      }
      const value = select.value as IconShapeKind;
      const patch: ItemPropertyPatch =
        item.itemKind === 'milestone'
          ? { iconShapeKind: value, milestoneShape: value as MilestoneShape }
          : { iconShapeKind: value, taskShape: value as TaskShape };
      this.dispatchPatch(patch);
    });
    row.appendChild(select);
    return select;
  }

  /**
   * Build a comma-separated ItemID field that authors the selected item's
   * predecessors or successors (item 4). On change it parses the ids, plans the
   * minimal edge rewire against the current document, and dispatches ONE undoable
   * {@link rewireItemDependenciesCommand}; the dependency lines then re-render. The
   * input is NOT part of {@link controls} (it reads from the edge list, not the item),
   * so {@link refreshValues} sets its value from the projection directly.
   *
   * @returns The text input element.
   */
  private addDependencyIdField(
    form: HTMLElement,
    fieldKey: string,
    kind: 'predecessor' | 'successor',
  ): HTMLInputElement {
    const row = this.addFieldRow(form, fieldKey);
    const input = document.createElement('input');
    input.type = 'text';
    input.dataset.role = `${kind}-item-ids`;
    input.placeholder = 'e.g. SYS1, SYS2';
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';
    input.addEventListener('change', () => this.dispatchDependencyRewire(kind, input.value));
    row.appendChild(input);
    return input;
  }

  /**
   * Parse a comma-separated ItemID list and rewire the selected item's predecessors or
   * successors to exactly that set (item 4). Unknown / self ids are ignored (repaired);
   * an empty field clears that side. A rewire that changes nothing dispatches no command.
   */
  private dispatchDependencyRewire(kind: 'predecessor' | 'successor', text: string): void {
    const item = this.currentItem();
    if (item === null) {
      return;
    }
    const document = this.store.getDocument();
    const desiredIds = text
      .split(',')
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
    const validItemIds = new Set(document.items.map((candidate) => candidate.id));
    const makeEdgeId = (): string => `dep-${Date.now()}-${this.nextRewireSerial++}`;
    const rewire =
      kind === 'predecessor'
        ? planPredecessorRewire(document.dependencies, item.id, desiredIds, validItemIds, makeEdgeId)
        : planSuccessorRewire(document.dependencies, item.id, desiredIds, validItemIds, makeEdgeId);
    if (isEmptyRewire(rewire)) {
      return;
    }
    this.store.dispatch(rewireItemDependenciesCommand(rewire.addEdges, rewire.removeEdgeIds));
  }

  /**
   * Build the dependency-line color form (item 1), shown only while a dependency
   * line is selected. Offers the CUD palette swatches plus a native color input;
   * each dispatches an undoable {@link setDependencyColorCommand} for the selected
   * line. Hidden by default.
   */
  private buildDependencyForm(): void {
    const form = document.createElement('div');
    form.dataset.role = 'dependency-form';
    form.style.display = 'none';
    const heading = document.createElement('strong');
    heading.textContent = 'Dependency line';
    heading.style.display = 'block';
    heading.style.marginBottom = '4px';
    form.appendChild(heading);

    const row = this.addFieldRow(form, 'line_color');
    const swatches = document.createElement('div');
    swatches.style.display = 'flex';
    swatches.style.flexWrap = 'wrap';
    swatches.style.gap = '3px';
    swatches.style.marginBottom = '4px';
    swatches.setAttribute('role', 'group');
    swatches.setAttribute('aria-label', 'line_color palette');
    for (const color of CUD_PALETTE) {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.title = color.colorKey;
      swatch.setAttribute('aria-label', color.colorKey);
      swatch.style.width = '14px';
      swatch.style.height = '14px';
      swatch.style.padding = '0';
      swatch.style.border = '1px solid #999';
      swatch.style.background = color.cssValue;
      swatch.style.cursor = 'pointer';
      swatch.addEventListener('click', () => this.dispatchDependencyColor(color.cssValue));
      swatches.appendChild(swatch);
    }
    row.appendChild(swatches);
    const input = document.createElement('input');
    input.type = 'color';
    input.style.width = '100%';
    input.dataset.role = 'dependency-color';
    input.addEventListener('change', () => this.dispatchDependencyColor(input.value));
    row.appendChild(input);
    this.dependencyColorInput = input;
    this.dependencyForm = form;
    this.root.appendChild(form);
  }

  /** Dispatch an undoable color change for the currently selected dependency line. */
  private dispatchDependencyColor(color: string): void {
    if (this.selectedDependencyId === null) {
      return;
    }
    this.store.dispatch(setDependencyColorCommand(this.selectedDependencyId, color));
  }

  /**
   * Build and mount the always-present progress-line control section (item 2) at the
   * top of the panel: a show/hide (delete/restore) toggle and a color input. The
   * section is visible whenever the panel is open, independent of the item selection,
   * so the progress line stays controllable and can be brought back after hiding.
   *
   * @param handlers - Getters/setters + labels supplied by the shell.
   */
  public attachProgressLineControls(handlers: ProgressLineControlHandlers): void {
    const section = document.createElement('div');
    section.dataset.role = 'progress-line-section';
    section.style.display = 'flex';
    section.style.alignItems = 'center';
    section.style.gap = '6px';
    section.style.borderBottom = '1px solid var(--grsch-panel-border)';
    section.style.paddingBottom = '4px';
    section.style.marginBottom = '4px';

    const caption = document.createElement('span');
    caption.textContent = handlers.label;
    caption.style.color = 'var(--grsch-text)';
    caption.style.fontFamily = 'ui-monospace, monospace';
    caption.style.fontSize = '0.9em';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.dataset.role = 'toggle-progress-line';
    toggle.style.cursor = 'pointer';
    const syncToggle = (): void => {
      const visible = handlers.isVisible();
      toggle.setAttribute('aria-pressed', visible ? 'true' : 'false');
      toggle.textContent = visible ? 'shown' : 'hidden';
      const name = `${handlers.label}: ${visible ? 'on' : 'off'}`;
      toggle.setAttribute('aria-label', name);
      toggle.title = name;
    };
    toggle.addEventListener('click', () => {
      handlers.onToggle(!handlers.isVisible());
      syncToggle();
    });

    const color = document.createElement('input');
    color.type = 'color';
    color.dataset.role = 'progress-line-color';
    color.value = handlers.getColor();
    color.setAttribute('aria-label', handlers.colorLabel);
    color.title = handlers.colorLabel;
    color.addEventListener('input', () => handlers.onColor(color.value));

    section.append(caption, toggle, color);
    // Append at the BOTTOM of the panel so it never shifts the item fields' on-screen
    // positions (keeping earlier fields where prior tests expect them).
    this.root.appendChild(section);
    syncToggle();
  }

  /** The single item whose values the panel currently displays, or null. */
  private currentItem(): ScheduleItem | null {
    if (this.selectedItemId === null) {
      return null;
    }
    return this.store.getDocument().items.find((item) => item.id === this.selectedItemId) ?? null;
  }

  /**
   * Point the panel at a selected dependency line (item 1), or null to clear. When
   * set, the panel shows the dependency color form and hides the item form; the
   * caller ensures item + dependency selection are mutually exclusive.
   *
   * @param dependencyId - The selected dependency id, or null.
   */
  public setSelectedDependency(dependencyId: string | null): void {
    this.selectedDependencyId = dependencyId;
    if (dependencyId !== null) {
      // A dependency selection supersedes any item selection in the panel display.
      this.selectedItemId = null;
      this.selectedItemIds = new Set();
    }
    this.refreshValues(this.store.getDocument());
  }

  private dispatchPatch(patch: ItemPropertyPatch): void {
    // Apply to EVERY selected item (item 5 multi-select); a single selection is the
    // common one-element case. Each edit-property command is a no-op when its values
    // already match, so unchanged items add no spurious history.
    const targets = this.selectedItemIds.size > 0
      ? [...this.selectedItemIds]
      : this.selectedItemId === null
        ? []
        : [this.selectedItemId];
    for (const itemId of targets) {
      this.store.dispatch(editPropertyCommand(itemId, patch));
    }
  }

  private refreshValues(document: ScheduleDocument): void {
    const empty = this.root.querySelector<HTMLElement>('[data-role="empty-state"]');
    const form = this.root.querySelector<HTMLElement>('[data-role="form"]');

    // A selected dependency line takes over the panel with its color form (item 1).
    if (this.selectedDependencyId !== null) {
      const dependency = (document.dependencies ?? []).find(
        (candidate) => candidate.id === this.selectedDependencyId,
      );
      if (dependency !== undefined) {
        if (empty) empty.style.display = 'none';
        if (form) form.style.display = 'none';
        if (this.dependencyForm) this.dependencyForm.style.display = 'block';
        if (this.dependencyColorInput) {
          this.dependencyColorInput.value =
            dependency.strokeColor ?? DEFAULT_DEPENDENCY_LINE_COLOR;
        }
        return;
      }
      // The selected line vanished (deleted / undone): fall through to the item view.
      this.selectedDependencyId = null;
    }
    if (this.dependencyForm) this.dependencyForm.style.display = 'none';

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
    // Rebuild the icon_shape_kind options for this item's family and select its
    // effective shape (item 4).
    this.refreshIconShapeKindOptions(item);
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
    // Dependency arrays (item 4) are projected from the canonical edge list, not stored
    // on the item, so they are refreshed here rather than through the item controls.
    if (
      this.predecessorItemIdsInput !== null &&
      globalThis.document.activeElement !== this.predecessorItemIdsInput
    ) {
      this.predecessorItemIdsInput.value = predecessorItemIds(document.dependencies, item.id).join(', ');
    }
    if (
      this.successorItemIdsInput !== null &&
      globalThis.document.activeElement !== this.successorItemIdsInput
    ) {
      this.successorItemIdsInput.value = successorItemIds(document.dependencies, item.id).join(', ');
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

  /**
   * Rebuild the icon_shape_kind select's options for an item's family and select its
   * effective shape (item 4). A milestone offers the five milestone glyph shapes; a
   * task offers bar / arrow / chevron / span.
   */
  private refreshIconShapeKindOptions(item: ScheduleItem): void {
    const select = this.iconShapeKindSelect;
    if (select === null) {
      return;
    }
    const kinds: readonly string[] =
      item.itemKind === 'milestone' ? MILESTONE_SHAPE_KINDS : TASK_SHAPE_KINDS;
    const current =
      item.itemKind === 'milestone' ? effectiveMilestoneShape(item) : effectiveTaskShape(item);
    const signature = kinds.join(',');
    // Only rebuild the <option> set when the family changed, so an open dropdown is
    // not torn down on every unrelated store update.
    if (select.dataset.optionSignature !== signature) {
      select.innerHTML = '';
      for (const kind of kinds) {
        const option = document.createElement('option');
        option.value = kind;
        option.textContent = kind;
        select.appendChild(option);
      }
      select.dataset.optionSignature = signature;
    }
    if (globalThis.document.activeElement !== select) {
      select.value = current;
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

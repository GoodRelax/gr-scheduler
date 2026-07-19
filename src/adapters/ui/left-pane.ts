/**
 * Adapter layer: the fixed, resizable left classification pane (ARCH-C-030 UI;
 * CANVAS-L1-006 fixed pane, CANVAS-L2-001 resizable width, CANVAS-L1-007 vertical
 * scroll sync, SECT-L1-006 names, SECT-L2-001 hierarchy by indentation).
 *
 * The pane is an opaque overlay pinned to the left of the schedule stage. The
 * renderer offsets its world content to the right by the pane width, so the pane
 * behaves as a frozen column: it stays put while the schedule pans horizontally,
 * and its rows are translated by -scrollY to stay row-aligned with the schedule
 * vertically. Section (大) / row (中) / optional sub (小) classifications are shown
 * by INDENTATION, never separate columns.
 *
 * Hidden (collapsed) sections are represented by small re-show tabs at the bottom
 * (SECT-L1-004); adding a hidden section adds one tab without thickening anything
 * (SECT-L1-005). Every section edit goes through the undoable command store.
 */

import type {
  ScheduleDocument,
  Section,
  ViewState,
} from '../../domain/model/schedule-model.js';
import type { ScheduleStore } from '../../domain/command/schedule-store.js';
import {
  addSectionCommand,
  addSubcategoryCommand,
  removeClassificationNodeCommand,
  reorderSectionCommand,
  setSectionCollapsedCommand,
} from '../../domain/command/commands.js';
import type { SvgRenderer } from '../render/svg-renderer.js';
import {
  computeRowGeometry,
  rowHeightAt,
  rowTopAt,
} from '../../domain/usecase/layout-engine.js';
import {
  hiddenSectionTabs,
  orderedVisibleRows,
  sectionReorderTarget,
} from '../../domain/usecase/section-organizer.js';
import {
  classificationCollapseLevel,
  collapseRows,
  contiguousSectionBands,
} from '../../domain/usecase/classification-tree.js';
import type { SectionMoveDirection } from '../../domain/usecase/section-organizer.js';
import { clampLeftPaneWidth, resolveLeftPaneWidth } from '../../domain/usecase/left-pane-layout.js';
import { SUBCLASSIFICATION_TEXT_HEX } from '../../domain/usecase/a11y-tokens.js';

/** Height in pixels of the pinned hidden-section tab strip. */
const TAB_STRIP_HEIGHT = 22;

/**
 * The fixed left classification pane. Construct with the stage host, store and
 * renderer; it wires itself to store and view-state changes and renders eagerly.
 */
export class LeftClassificationPane {
  private readonly host: HTMLElement;
  private readonly store: ScheduleStore;
  private readonly renderer: SvgRenderer;
  private readonly container: HTMLElement;
  private readonly scrollLayer: HTMLElement;
  private readonly tabStrip: HTMLElement;
  private readonly divider: HTMLElement;
  /**
   * Pinned top strip carrying the global "Add section" button. It sits in the
   * blank Gantt-corner above row 0 and does NOT scroll (unlike {@link scrollLayer}),
   * so adding a section is always reachable regardless of vertical scroll.
   */
  private readonly editToolbar: HTMLElement;
  /**
   * After a reorder rebuilds the pane, the ▲ / ▼ button that was activated is
   * destroyed; this remembers which section + direction to re-focus so keyboard
   * users can nudge a section repeatedly without losing their place (SC 2.4.3).
   */
  private pendingMoveFocus: { readonly sectionId: string; readonly direction: SectionMoveDirection } | null =
    null;

  /**
   * @param host - The positioned stage element to overlay the pane onto.
   * @param store - The schedule store (read + dispatch section commands).
   * @param renderer - The renderer (view state / scroll / pane width source).
   */
  public constructor(host: HTMLElement, store: ScheduleStore, renderer: SvgRenderer) {
    this.host = host;
    this.store = store;
    this.renderer = renderer;

    this.container = document.createElement('div');
    this.container.dataset.role = 'left-classification-pane';
    // Named landmark for the frozen classification column (WCAG 4.1.2).
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-label', 'Classification pane');
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.bottom = '0';
    this.container.style.overflow = 'hidden';
    this.container.style.background = '#eef1f5';
    this.container.style.borderRight = '1.5px solid #c3c8d0';
    this.container.style.boxSizing = 'border-box';
    // Relative sizing so the uniform font scale (TOOL-L1-002) rescales the pane.
    this.container.style.fontFamily = 'system-ui, sans-serif';
    this.container.style.fontSize = '0.8em';
    this.container.style.lineHeight = '1.4';
    this.container.style.zIndex = '4';
    this.container.style.userSelect = 'none';

    this.scrollLayer = document.createElement('div');
    this.scrollLayer.style.position = 'absolute';
    this.scrollLayer.style.top = '0';
    this.scrollLayer.style.left = '0';
    this.scrollLayer.style.right = '0';
    this.container.appendChild(this.scrollLayer);

    this.tabStrip = document.createElement('div');
    this.tabStrip.style.position = 'absolute';
    this.tabStrip.style.left = '2px';
    this.tabStrip.style.bottom = '2px';
    this.tabStrip.style.display = 'flex';
    this.tabStrip.style.gap = '3px';
    this.tabStrip.style.height = `${TAB_STRIP_HEIGHT - 4}px`;
    this.container.appendChild(this.tabStrip);

    this.divider = document.createElement('div');
    this.divider.dataset.role = 'left-pane-divider';
    this.divider.style.position = 'absolute';
    this.divider.style.top = '0';
    this.divider.style.right = '0';
    this.divider.style.bottom = '0';
    this.divider.style.width = '6px';
    this.divider.style.cursor = 'col-resize';
    this.divider.style.background = 'transparent';
    this.container.appendChild(this.divider);

    this.editToolbar = document.createElement('div');
    this.editToolbar.dataset.role = 'section-edit-toolbar';
    this.editToolbar.style.position = 'absolute';
    this.editToolbar.style.top = '2px';
    this.editToolbar.style.left = '4px';
    this.editToolbar.style.right = '10px';
    this.editToolbar.style.height = '16px';
    this.editToolbar.style.display = 'flex';
    this.editToolbar.style.alignItems = 'center';
    this.editToolbar.style.gap = '4px';
    // Opaque so it masks any row content scrolled up under the Gantt corner.
    this.editToolbar.style.background = '#eef1f5';
    this.editToolbar.style.zIndex = '5';
    const addSectionButton = this.buildEditButton('add-section', '+', 'Add section', () => {
      this.store.dispatch(addSectionCommand());
    });
    this.editToolbar.appendChild(addSectionButton);
    this.container.appendChild(this.editToolbar);

    this.host.appendChild(this.container);
    this.enableDividerDrag();

    this.store.subscribe(() => this.render());
    this.renderer.onViewStateChange(() => this.render());
    this.render();
  }

  /** Rebuild the pane from the current document + view state (cheap: ~50 rows). */
  public render(): void {
    const document = this.store.getDocument();
    const viewState = this.renderer.getViewState();
    const paneWidth = resolveLeftPaneWidth(viewState.leftPaneWidth);
    this.container.style.width = `${paneWidth}px`;

    // Drop the pane rows by the same content top offset the schedule uses so the
    // frozen column stays row-aligned with the canvas beneath the date ruler (the
    // top-left corner above row 0 is intentionally left blank, like a Gantt header).
    const topOffset = this.renderer.getContentTopOffsetPx();
    this.scrollLayer.style.transform = `translateY(${topOffset - viewState.scrollY}px)`;
    this.renderRowsAndSections(document, viewState);
    this.renderHiddenTabs(document.sections);
    this.restorePendingMoveFocus();
  }

  private renderRowsAndSections(
    document: ScheduleDocument,
    viewState: ViewState,
  ): void {
    const sections = document.sections;
    const rows = document.rows;
    const zoomY = viewState.zoomY;
    while (this.scrollLayer.firstChild !== null) {
      this.scrollLayer.removeChild(this.scrollLayer.firstChild);
    }
    // Vertical LOD: collapse the derived tree (minor -> middle -> major) as zoomY
    // shrinks so the pane hides sub-levels in lock-step with the canvas rows.
    const visible0 = orderedVisibleRows(sections, rows);
    const collapse = collapseRows(visible0, classificationCollapseLevel(zoomY));
    const visibleRows = collapse.rows;
    const bands = contiguousSectionBands(visibleRows, sections);
    const bandStartIndices = new Set(bands.map((band) => band.startRowIndex));
    const bandNameByStart = new Map(bands.map((band) => [band.startRowIndex, band.name]));
    const sectionIdByStart = new Map(bands.map((band) => [band.startRowIndex, band.sectionId]));
    // Rows may have DIFFERENT heights (a category row grows to stack overlapping
    // items, item: multi-lane stacking): compute the same variable geometry the
    // canvas uses so the pane's rows stay aligned. Items are remapped onto their
    // DISPLAY row (matching the canvas) so per-row lane counts match.
    const laidItems = document.items.map((item) => {
      const displayId = collapse.rowIdToDisplayId.get(item.rowId);
      return displayId !== undefined && displayId !== item.rowId
        ? { ...item, rowId: displayId }
        : item;
    });
    const rowGeometry = computeRowGeometry(laidItems, visibleRows, document.epochDate, viewState);
    // A middle (track) label repeats on every detail row beneath it; decorate only
    // its FIRST appearance with edit buttons so a track has one add/remove control.
    const decoratedMiddles = new Set<string>();

    visibleRows.forEach((row, index) => {
      const top = rowTopAt(rowGeometry, index, zoomY);
      const bandHeight = rowHeightAt(rowGeometry, index, zoomY);
      // Section header (大分類) sits at the top of its band, indent 0.
      if (bandStartIndices.has(index)) {
        const sectionName = bandNameByStart.get(index) ?? '';
        const header = window.document.createElement('div');
        header.dataset.role = 'section-header';
        header.dataset.sectionId = sectionIdByStart.get(index) ?? '';
        header.style.position = 'absolute';
        header.style.top = `${top}px`;
        header.style.left = '4px';
        header.style.right = '4px';
        header.style.height = '14px';
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.gap = '4px';
        header.style.fontWeight = '700';
        header.style.color = '#333a44';
        header.style.overflow = 'hidden';
        header.style.whiteSpace = 'nowrap';

        const hideButton = window.document.createElement('button');
        hideButton.type = 'button';
        hideButton.textContent = '−'; // minus sign
        // Icon-only control: give it a text name (WCAG 1.1.1 / 4.1.2).
        hideButton.title = 'hide section';
        hideButton.setAttribute(
          'aria-label',
          `hide section: ${bandNameByStart.get(index) ?? ''}`,
        );
        hideButton.style.cursor = 'pointer';
        hideButton.style.fontSize = '0.85em';
        hideButton.style.padding = '0 3px';
        hideButton.style.border = '1px solid #b7bdc7';
        hideButton.style.borderRadius = '3px';
        hideButton.style.background = '#fbfcfe';
        const sectionId = sectionIdByStart.get(index);
        hideButton.addEventListener('click', () => {
          if (sectionId !== undefined) {
            this.store.dispatch(setSectionCollapsedCommand(sectionId, true));
          }
        });

        // Keyboard-accessible reorder affordance (SECT-L1-002): move this section
        // one step up / down through the undoable store. ▲ is disabled on the
        // first section and ▼ on the last (sectionReorderTarget returns null).
        const moveUpButton = this.buildSectionMoveButton(sectionId, sectionName, 'up');
        const moveDownButton = this.buildSectionMoveButton(sectionId, sectionName, 'down');

        // Add a TRACK (中分類) under this section, and REMOVE the whole section.
        // Both act on declared classification nodes through the undoable store; the
        // major identity is the section name (SECT editing rework req 1-3).
        const addTrackButton = this.buildEditButton(
          'add-subcategory',
          '↓',
          `Add sub-category under ${sectionName}`,
          () => this.store.dispatch(addSubcategoryCommand({ major: sectionName })),
        );
        addTrackButton.dataset.major = sectionName;
        const removeSectionButton = this.buildEditButton(
          'remove-section',
          '✕', // multiplication X (distinct from the hide "−" so both coexist)
          `Remove section ${sectionName}`,
          () => this.store.dispatch(removeClassificationNodeCommand({ major: sectionName })),
        );
        removeSectionButton.dataset.major = sectionName;

        const nameSpan = window.document.createElement('span');
        nameSpan.textContent = sectionName;
        nameSpan.style.overflow = 'hidden';
        nameSpan.style.textOverflow = 'ellipsis';

        header.append(
          hideButton,
          moveUpButton,
          moveDownButton,
          addTrackButton,
          removeSectionButton,
          nameSpan,
        );
        this.scrollLayer.appendChild(header);
      }

      // Row (中分類 / track), indented; optional sub (小分類 / detail) further indented.
      // Only branches that actually carry items reach here (empty tracks/details
      // never render), and a bare major row has no track label to show.
      if (row.classificationLabel.length > 0) {
        const midLabel = window.document.createElement('div');
        midLabel.dataset.role = 'track-label';
        midLabel.style.position = 'absolute';
        midLabel.style.top = `${top + 15}px`;
        midLabel.style.left = '18px';
        midLabel.style.right = '4px';
        midLabel.style.height = `${Math.max(12, bandHeight - 16)}px`;
        midLabel.style.display = 'flex';
        midLabel.style.alignItems = 'center';
        midLabel.style.gap = '4px';
        midLabel.style.color = '#2b2b2b';
        midLabel.style.overflow = 'hidden';

        const midText = window.document.createElement('span');
        midText.textContent = row.classificationLabel;
        midText.style.overflow = 'hidden';
        midText.style.whiteSpace = 'nowrap';
        midText.style.textOverflow = 'ellipsis';
        midLabel.appendChild(midText);

        // Add a DETAIL (小分類) under this track, and REMOVE the track. Only the
        // first row of a repeated middle carries the controls (see decoratedMiddles).
        const trackMajor = row.majorLabel;
        const trackMiddle = row.middleLabel;
        if (trackMajor !== undefined && trackMiddle !== undefined) {
          const middleKey = `${trackMajor}${trackMiddle}`;
          if (!decoratedMiddles.has(middleKey)) {
            decoratedMiddles.add(middleKey);
            const addDetailButton = this.buildEditButton(
              'add-subcategory',
              '↓',
              `Add sub-category under ${trackMiddle}`,
              () =>
                this.store.dispatch(
                  addSubcategoryCommand({ major: trackMajor, middle: trackMiddle }),
                ),
            );
            const removeTrackButton = this.buildEditButton(
              'remove-track',
              '✕',
              `Remove category ${trackMiddle}`,
              () =>
                this.store.dispatch(
                  removeClassificationNodeCommand({ major: trackMajor, middle: trackMiddle }),
                ),
            );
            midLabel.append(addDetailButton, removeTrackButton);
          }
        }
        this.scrollLayer.appendChild(midLabel);
      }

      if (row.subClassificationLabel !== undefined && row.subClassificationLabel.length > 0) {
        const subLabel = window.document.createElement('div');
        subLabel.dataset.role = 'detail-label';
        subLabel.style.position = 'absolute';
        subLabel.style.top = `${top + 28}px`;
        subLabel.style.left = '30px';
        subLabel.style.right = '4px';
        subLabel.style.height = '12px';
        subLabel.style.display = 'flex';
        subLabel.style.alignItems = 'center';
        subLabel.style.gap = '4px';
        subLabel.style.color = SUBCLASSIFICATION_TEXT_HEX;
        subLabel.style.fontSize = '0.83em';
        subLabel.style.overflow = 'hidden';

        const subText = window.document.createElement('span');
        subText.textContent = row.subClassificationLabel;
        subText.style.overflow = 'hidden';
        subText.style.whiteSpace = 'nowrap';
        subText.style.textOverflow = 'ellipsis';
        subLabel.appendChild(subText);

        // REMOVE the detail leaf (小分類 has no sub-add). Reclassifies its items up
        // to the track level via the undoable store.
        const detailMajor = row.majorLabel;
        const detailMiddle = row.middleLabel;
        const detailMinor = row.minorLabel;
        if (detailMajor !== undefined && detailMiddle !== undefined && detailMinor !== undefined) {
          const removeDetailButton = this.buildEditButton(
            'remove-detail',
            '✕',
            `Remove category ${detailMinor}`,
            () =>
              this.store.dispatch(
                removeClassificationNodeCommand({
                  major: detailMajor,
                  middle: detailMiddle,
                  minor: detailMinor,
                }),
              ),
          );
          subLabel.appendChild(removeDetailButton);
        }
        this.scrollLayer.appendChild(subLabel);
      }
    });
  }

  private renderHiddenTabs(sections: readonly Section[]): void {
    while (this.tabStrip.firstChild !== null) {
      this.tabStrip.removeChild(this.tabStrip.firstChild);
    }
    // One small tab per hidden section: the count grows with the hidden count,
    // and the tabs share a fixed-height strip (SECT-L1-004 / SECT-L1-005).
    for (const tab of hiddenSectionTabs(sections)) {
      const button = window.document.createElement('button');
      button.type = 'button';
      button.dataset.role = 'hidden-section-tab';
      button.textContent = tab.name;
      button.title = `show section: ${tab.name}`;
      button.setAttribute('aria-label', `show section: ${tab.name}`);
      button.style.cursor = 'pointer';
      button.style.maxWidth = '72px';
      button.style.overflow = 'hidden';
      button.style.whiteSpace = 'nowrap';
      button.style.textOverflow = 'ellipsis';
      button.style.fontSize = '0.85em';
      button.style.padding = '0 6px';
      button.style.border = '1px solid #9aa1ac';
      button.style.borderRadius = '3px';
      button.style.background = '#d7dce3';
      button.style.color = '#333a44';
      button.addEventListener('click', () => {
        this.store.dispatch(setSectionCollapsedCommand(tab.sectionId, false));
      });
      this.tabStrip.appendChild(button);
    }
  }

  /** Wire the right-edge divider so dragging resizes the pane (CANVAS-L2-001). */
  private enableDividerDrag(): void {
    let dragging = false;
    this.divider.addEventListener('pointerdown', (event) => {
      dragging = true;
      this.divider.setPointerCapture(event.pointerId);
      event.stopPropagation();
      event.preventDefault();
    });
    this.divider.addEventListener('pointermove', (event) => {
      if (!dragging) {
        return;
      }
      const hostRect = this.host.getBoundingClientRect();
      const proposed = event.clientX - hostRect.left;
      const width = clampLeftPaneWidth(proposed, hostRect.width);
      this.renderer.setLeftPaneWidth(width);
      event.stopPropagation();
    });
    const end = (event: PointerEvent): void => {
      dragging = false;
      if (this.divider.hasPointerCapture(event.pointerId)) {
        this.divider.releasePointerCapture(event.pointerId);
      }
    };
    this.divider.addEventListener('pointerup', end);
    this.divider.addEventListener('pointercancel', end);
  }

  /**
   * Build one small, icon-only classification edit button (add / remove) as a real
   * focusable `<button>` with a descriptive accessible name (WCAG 1.1.1 / 4.1.2),
   * wired to dispatch its command through the undoable store.
   *
   * @param role - The `data-role` used by tests / styling.
   * @param glyph - The single-glyph icon shown in the button.
   * @param accessibleName - The aria-label + tooltip (e.g. "Remove section None1").
   * @param onClick - The click handler (dispatches the edit command).
   * @returns The configured button element.
   */
  private buildEditButton(
    role: string,
    glyph: string,
    accessibleName: string,
    onClick: () => void,
  ): HTMLButtonElement {
    const button = window.document.createElement('button');
    button.type = 'button';
    button.dataset.role = role;
    button.textContent = glyph;
    button.title = accessibleName;
    button.setAttribute('aria-label', accessibleName);
    button.style.cursor = 'pointer';
    button.style.fontSize = '0.8em';
    button.style.lineHeight = '1';
    button.style.padding = '0 3px';
    button.style.border = '1px solid #b7bdc7';
    button.style.borderRadius = '3px';
    button.style.background = '#fbfcfe';
    button.style.color = '#333a44';
    button.style.flex = '0 0 auto';
    button.addEventListener('click', onClick);
    return button;
  }

  /**
   * Build one ▲ / ▼ section-move button for a section header (SECT-L1-002). The
   * button is a real focusable control with a descriptive accessible name and is
   * disabled when the section cannot move that way (already at the boundary), so
   * the enabled state always matches {@link sectionReorderTarget}.
   *
   * @param sectionId - The section this button moves, if known.
   * @param sectionName - The section's display name for the accessible label.
   * @param direction - `'up'` (▲, towards the top) or `'down'` (▼, towards bottom).
   * @returns The configured button element.
   */
  private buildSectionMoveButton(
    sectionId: string | undefined,
    sectionName: string,
    direction: SectionMoveDirection,
  ): HTMLButtonElement {
    const button = window.document.createElement('button');
    button.type = 'button';
    button.dataset.role = direction === 'up' ? 'section-move-up' : 'section-move-down';
    button.dataset.sectionId = sectionId ?? '';
    button.textContent = direction === 'up' ? '▲' : '▼'; // ▲ / ▼
    const label = `Move section ${sectionName} ${direction}`;
    button.title = label;
    button.setAttribute('aria-label', label);
    button.style.cursor = 'pointer';
    button.style.fontSize = '0.7em';
    button.style.lineHeight = '1';
    button.style.padding = '0 3px';
    button.style.border = '1px solid #b7bdc7';
    button.style.borderRadius = '3px';
    button.style.background = '#fbfcfe';

    const target =
      sectionId === undefined
        ? null
        : sectionReorderTarget(this.store.getDocument().sections, sectionId, direction);
    if (sectionId === undefined || target === null) {
      button.disabled = true;
      button.style.opacity = '0.4';
      button.style.cursor = 'default';
      return button;
    }

    button.addEventListener('click', () => {
      // Remember the button so focus returns to it after the reorder re-renders
      // the pane (keyboard users can press ▼ repeatedly).
      this.pendingMoveFocus = { sectionId, direction };
      this.reorderSection(sectionId, target);
    });
    return button;
  }

  /**
   * After a reorder rebuilds the pane, return keyboard focus to the same section's
   * move button; if that direction is now disabled (the section reached an end),
   * focus the opposite-direction button so focus stays on the moved section.
   */
  private restorePendingMoveFocus(): void {
    const pending = this.pendingMoveFocus;
    if (pending === null) {
      return;
    }
    this.pendingMoveFocus = null;
    const preferred = this.scrollLayer.querySelector<HTMLButtonElement>(
      `button[data-role="section-move-${pending.direction}"][data-section-id="${pending.sectionId}"]`,
    );
    if (preferred !== null && !preferred.disabled) {
      preferred.focus();
      return;
    }
    const fallbackDirection = pending.direction === 'up' ? 'down' : 'up';
    const fallback = this.scrollLayer.querySelector<HTMLButtonElement>(
      `button[data-role="section-move-${fallbackDirection}"][data-section-id="${pending.sectionId}"]`,
    );
    if (fallback !== null && !fallback.disabled) {
      fallback.focus();
    }
  }

  /**
   * Reorder a section to a new index through the undoable store (SECT-L1-002).
   * Called by the header ▲ / ▼ move buttons; also usable by a future
   * drag-reorder affordance. Covered by tests.
   *
   * @param sectionId - The section being moved.
   * @param targetIndex - Destination index in the visible section order.
   */
  public reorderSection(sectionId: string, targetIndex: number): void {
    this.store.dispatch(reorderSectionCommand(sectionId, targetIndex));
  }
}

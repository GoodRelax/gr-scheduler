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
 *
 * CLASSIFICATION-PANE restructure: every node (major / middle / minor) carries the
 * same consolidated icon row `[name] ▲ ▼ □ + - X` (req 5); middle / minor nodes can
 * be reordered (req 1) and individually hidden (req 2, revealed by a parent `□`),
 * copied / pasted as a duplicate subtree (req 3, Ctrl+C/V + context menu), and a
 * major / middle / minor delete goes through a confirm dialog (req 6). Middle names
 * are top-aligned and minor names center-aligned so they never collide (req 4).
 */

import type {
  DeclaredCategory,
  ScheduleDocument,
  Section,
  ViewState,
} from '../../domain/model/schedule-model.js';
import type { ScheduleStore } from '../../domain/command/schedule-store.js';
import {
  addSectionCommand,
  addSubcategoryCommand,
  duplicateCategorySubtreeCommand,
  removeClassificationNodeCommand,
  reorderCategoryNodeCommand,
  reorderSectionCommand,
  revealDescendantsCommand,
  setCategoryNodeHiddenCommand,
  setSectionCollapsedCommand,
} from '../../domain/command/commands.js';
import type { SvgRenderer } from '../render/svg-renderer.js';
import { estimateInnerLeftLabelExtentPx } from '../render/item-geometry.js';
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
  orderedMiddlesUnderMajor,
  orderedMinorsUnderMiddle,
} from '../../domain/usecase/classification-tree.js';
import type { SectionMoveDirection } from '../../domain/usecase/section-organizer.js';
import type { CategoryMoveDirection } from '../../domain/usecase/classification-tree.js';
import { clampLeftPaneWidth, resolveLeftPaneWidth } from '../../domain/usecase/left-pane-layout.js';

/**
 * A classification node addressed by the pane: its level, path components, display
 * name and (for a major) its section id. Used by the per-node control row, the
 * copy/paste clipboard, the context menu and the delete dialog.
 */
interface PaneNode {
  readonly level: 'major' | 'middle' | 'minor';
  readonly major: string;
  readonly middle?: string;
  readonly minor?: string;
  readonly name: string;
  readonly sectionId?: string;
}

/** The declared-node path form of a pane node (for command dispatch). */
function nodePath(node: PaneNode): DeclaredCategory {
  return {
    major: node.major,
    ...(node.middle !== undefined ? { middle: node.middle } : {}),
    ...(node.minor !== undefined ? { minor: node.minor } : {}),
  };
}

/** True when the keyboard event targets a text field (typing wins over shortcuts). */
function isEditableTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

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
   * After a MIDDLE / MINOR reorder rebuilds the pane, re-focus the same node's
   * move button so keyboard users can nudge it repeatedly (SC 2.4.3), mirroring
   * {@link pendingMoveFocus} for sections.
   */
  private pendingCategoryFocus: { readonly node: PaneNode; readonly direction: CategoryMoveDirection } | null =
    null;
  /** The node currently focused / selected in the pane (for Ctrl+C copy). */
  private selectedNode: PaneNode | null = null;
  /** The node most recently copied (Ctrl+C / context Copy), pasted by Ctrl+V. */
  private copiedNode: PaneNode | null = null;
  /** The open right-click context menu, if any (removed on next open / dismiss). */
  private contextMenu: HTMLElement | null = null;
  /** The open delete-confirmation modal overlay, if any. */
  private deleteOverlay: HTMLElement | null = null;

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
    this.container.style.background = 'var(--grsch-pane-bg)';
    this.container.style.borderRight = '1.5px solid var(--grsch-section-line)';
    this.container.style.color = 'var(--grsch-text)';
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
    this.editToolbar.style.background = 'var(--grsch-pane-bg)';
    this.editToolbar.style.zIndex = '5';
    const addSectionButton = this.buildEditButton('add-section', '+', 'Add section', () => {
      this.store.dispatch(addSectionCommand());
    });
    this.editToolbar.appendChild(addSectionButton);
    this.container.appendChild(this.editToolbar);

    this.host.appendChild(this.container);
    this.ensureControlsStylesheet();
    this.enableDividerDrag();

    // Ctrl+C / Ctrl+V on a focused section node copy / paste its subtree (req 3).
    // Handled at the pane so the global item-clipboard shortcut does not also fire
    // (we stopPropagation once a section node is the target).
    this.container.addEventListener('keydown', (event) => this.handlePaneKeydown(event));

    this.store.subscribe(() => this.render());
    this.renderer.onViewStateChange(() => this.render());
    this.render();
  }

  /**
   * Install (once) the stylesheet that keeps each node's `[▲ ▼ □ + − ✕]` control row
   * HIDDEN by default and reveals it only when the node is HOVERED or SELECTED /
   * keyboard-FOCUSED (req 3). The controls stay in the DOM and in the tab order
   * (they are only collapsed to zero width + transparent, never `display:none`), so
   * a keyboard user can Tab to them and the act of focusing one reveals the row via
   * `:focus-within`. This reclaims the horizontal space a node normally wastes.
   */
  private ensureControlsStylesheet(): void {
    // A real-DOM concern only; the unit-test fake document lacks getElementById /
    // head, so guard before touching them (the pure logic is covered elsewhere).
    const doc = window.document;
    if (
      typeof doc.getElementById !== 'function' ||
      doc.head === null ||
      doc.head === undefined ||
      typeof doc.head.appendChild !== 'function'
    ) {
      return;
    }
    const styleId = 'grsch-pane-node-controls-style';
    if (doc.getElementById(styleId) !== null) {
      return;
    }
    const style = window.document.createElement('style');
    style.id = styleId;
    style.textContent = [
      '.grsch-node-controls {',
      '  display: inline-flex; align-items: center; gap: 4px; flex: 0 0 auto;',
      '  max-width: 0; overflow: hidden; opacity: 0; pointer-events: none;',
      '}',
      '.grsch-pane-node:hover > .grsch-node-controls,',
      '.grsch-pane-node:focus-within > .grsch-node-controls {',
      '  max-width: 999px; overflow: visible; opacity: 1; pointer-events: auto;',
      '}',
    ].join('\n');
    doc.head.appendChild(style);
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
    this.restorePendingCategoryFocus();
  }

  /** Create an element via the (possibly faked) window document. */
  private el<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
    return window.document.createElement(tag);
  }

  private renderRowsAndSections(document: ScheduleDocument, viewState: ViewState): void {
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
    const rowGeometry = computeRowGeometry(
      laidItems,
      visibleRows,
      document.epochDate,
      viewState,
      // Match the canvas: the same label-collision extent so pane rows align with the
      // grown lanes (CR-003 Part 2).
      estimateInnerLeftLabelExtentPx,
    );
    // A middle (track) label repeats on every detail row beneath it; decorate only
    // its FIRST appearance with the icon row so a track has one control set.
    const decoratedMiddles = new Set<string>();

    visibleRows.forEach((row, index) => {
      const top = rowTopAt(rowGeometry, index, zoomY);
      const bandHeight = rowHeightAt(rowGeometry, index, zoomY);

      // Section header (major) sits at the top of its band, indent 0.
      if (bandStartIndices.has(index)) {
        const sectionName = bandNameByStart.get(index) ?? '';
        const sectionId = sectionIdByStart.get(index);
        const header = this.el('div');
        header.dataset.role = 'section-header';
        header.setAttribute('class', 'grsch-pane-node');
        header.dataset.sectionId = sectionId ?? '';
        header.style.position = 'absolute';
        header.style.top = `${top}px`;
        header.style.left = '4px';
        header.style.right = '4px';
        header.style.height = '14px';
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.gap = '4px';
        header.style.fontWeight = '700';
        header.style.color = 'var(--grsch-header-label)';
        header.style.overflow = 'hidden';
        header.style.whiteSpace = 'nowrap';

        const node: PaneNode = {
          level: 'major',
          major: sectionName,
          name: sectionName,
          ...(sectionId !== undefined ? { sectionId } : {}),
        };
        this.wireNodeRow(header, node);
        header.appendChild(this.buildNameSpan(node));
        this.appendNodeControls(header, node);
        this.scrollLayer.appendChild(header);
      }

      // Track (middle) label, indented. TOP-aligned within its (possibly tall) band
      // (req 4) so a Middle name never overlaps the first Minor name beneath it. The
      // label repeats per detail row; only its FIRST appearance carries the icon row.
      if (row.classificationLabel.length > 0) {
        const trackMajor = row.majorLabel;
        const trackMiddle = row.middleLabel;
        const midLabel = this.el('div');
        midLabel.dataset.role = 'track-label';
        midLabel.setAttribute('class', 'grsch-pane-node');
        midLabel.style.position = 'absolute';
        midLabel.style.top = `${top + 15}px`;
        midLabel.style.left = '18px';
        midLabel.style.right = '4px';
        midLabel.style.height = `${Math.max(12, bandHeight - 16)}px`;
        midLabel.style.display = 'flex';
        midLabel.style.alignItems = 'flex-start';
        midLabel.style.gap = '4px';
        midLabel.style.color = 'var(--grsch-mid-label)';
        midLabel.style.overflow = 'hidden';

        const middleKey = JSON.stringify([trackMajor, trackMiddle]);
        const decorate =
          trackMajor !== undefined && trackMiddle !== undefined && !decoratedMiddles.has(middleKey);
        if (trackMajor !== undefined && trackMiddle !== undefined) {
          decoratedMiddles.add(middleKey);
        }
        const node: PaneNode = {
          level: 'middle',
          major: trackMajor ?? '',
          ...(trackMiddle !== undefined ? { middle: trackMiddle } : {}),
          name: row.classificationLabel,
        };
        midLabel.appendChild(this.buildNameSpan(node));
        if (decorate) {
          this.wireNodeRow(midLabel, node);
          this.appendNodeControls(midLabel, node);
        }
        this.scrollLayer.appendChild(midLabel);
      }

      // Detail (minor) label, further indented. CENTER-aligned within its band (req 4).
      if (row.subClassificationLabel !== undefined && row.subClassificationLabel.length > 0) {
        const detailMajor = row.majorLabel;
        const detailMiddle = row.middleLabel;
        const detailMinor = row.minorLabel;
        const subLabel = this.el('div');
        subLabel.dataset.role = 'detail-label';
        subLabel.setAttribute('class', 'grsch-pane-node');
        subLabel.style.position = 'absolute';
        subLabel.style.top = `${top + 28}px`;
        subLabel.style.left = '30px';
        subLabel.style.right = '4px';
        subLabel.style.height = '12px';
        subLabel.style.display = 'flex';
        subLabel.style.alignItems = 'center';
        subLabel.style.gap = '4px';
        subLabel.style.color = 'var(--grsch-sub-label)';
        subLabel.style.fontSize = '0.83em';
        subLabel.style.overflow = 'hidden';

        const node: PaneNode = {
          level: 'minor',
          major: detailMajor ?? '',
          ...(detailMiddle !== undefined ? { middle: detailMiddle } : {}),
          ...(detailMinor !== undefined ? { minor: detailMinor } : {}),
          name: row.subClassificationLabel,
        };
        subLabel.appendChild(this.buildNameSpan(node));
        if (detailMajor !== undefined && detailMiddle !== undefined && detailMinor !== undefined) {
          this.wireNodeRow(subLabel, node);
          this.appendNodeControls(subLabel, node);
        }
        this.scrollLayer.appendChild(subLabel);
      }
    });
  }

  /** The ellipsized text span carrying a node's display name (rendered FIRST, req 5). */
  private buildNameSpan(node: PaneNode): HTMLSpanElement {
    const span = this.el('span');
    span.dataset.role = 'node-name';
    span.textContent = node.name;
    span.style.overflow = 'hidden';
    span.style.whiteSpace = 'nowrap';
    span.style.textOverflow = 'ellipsis';
    span.style.flex = '1 1 auto';
    span.style.minWidth = '0';
    // Focusable so a keyboard user can select a node for Ctrl+C copy (req 3).
    span.tabIndex = 0;
    span.addEventListener('focus', () => {
      this.selectedNode = node;
    });
    span.addEventListener('click', () => {
      this.selectedNode = node;
    });
    return span;
  }

  /**
   * Tag a node row with its classification path and wire the right-click context
   * menu (Copy / Paste) on it, so the menu acts on the pointed-at node (req 3).
   */
  private wireNodeRow(rowElement: HTMLElement, node: PaneNode): void {
    rowElement.dataset.nodeLevel = node.level;
    rowElement.dataset.nodeMajor = node.major;
    if (node.middle !== undefined) {
      rowElement.dataset.nodeMiddle = node.middle;
    }
    if (node.minor !== undefined) {
      rowElement.dataset.nodeMinor = node.minor;
    }
    rowElement.addEventListener('contextmenu', (event) =>
      this.openContextMenu(node, event as MouseEvent),
    );
  }

  /**
   * Append the consolidated per-node icon row (req 5), name-first order:
   * `▲ ▼ □ + - X`. `□` (show-all) and `+` (add sub-category) apply only to nodes
   * that can HAVE children (major / middle); a minor leaf shows `▲ ▼ - X`.
   */
  private appendNodeControls(container: HTMLElement, node: PaneNode): void {
    // The controls live in a collapsible wrapper (revealed on hover / focus /
    // selection by the pane-node-controls stylesheet, req 3). Keeping them in the
    // DOM (never `display:none`) preserves keyboard reachability.
    const controls = this.el('div');
    controls.setAttribute('class', 'grsch-node-controls');
    controls.dataset.role = 'node-controls';
    controls.appendChild(this.buildMoveButton(node, 'up'));
    controls.appendChild(this.buildMoveButton(node, 'down'));
    if (node.level === 'major' || node.level === 'middle') {
      controls.appendChild(this.buildShowAllButton(node));
      controls.appendChild(this.buildAddSubButton(node));
    }
    controls.appendChild(this.buildHideButton(node));
    controls.appendChild(this.buildDeleteButton(node));
    container.appendChild(controls);
  }

  /** Build the ▲ / ▼ move button for a node (major via section order; else category). */
  private buildMoveButton(node: PaneNode, direction: CategoryMoveDirection): HTMLButtonElement {
    if (node.level === 'major') {
      return this.buildSectionMoveButton(node.sectionId, node.name, direction);
    }
    return this.buildCategoryMoveButton(node, direction);
  }

  /**
   * Build a ▲ / ▼ move button for a MIDDLE / MINOR node (req 1). Disabled at the
   * sibling boundary so its enabled state matches the reorder command's own no-op.
   */
  private buildCategoryMoveButton(
    node: PaneNode,
    direction: CategoryMoveDirection,
  ): HTMLButtonElement {
    const button = this.el('button');
    button.type = 'button';
    button.dataset.role = direction === 'up' ? 'category-move-up' : 'category-move-down';
    button.dataset.nodeMajor = node.major;
    if (node.middle !== undefined) {
      button.dataset.nodeMiddle = node.middle;
    }
    if (node.minor !== undefined) {
      button.dataset.nodeMinor = node.minor;
    }
    button.textContent = direction === 'up' ? '▲' : '▼';
    const label = `Move ${node.name} ${direction}`;
    button.title = label;
    button.setAttribute('aria-label', label);
    this.styleControl(button, '0.7em');

    const siblings = this.categorySiblings(node);
    const currentIndex = node.level === 'middle' ? siblings.indexOf(node.middle ?? '') : siblings.indexOf(node.minor ?? '');
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const canMove = currentIndex !== -1 && targetIndex >= 0 && targetIndex < siblings.length;
    if (!canMove) {
      button.disabled = true;
      button.style.opacity = '0.4';
      button.style.cursor = 'default';
      return button;
    }
    button.addEventListener('click', () => {
      this.pendingCategoryFocus = { node, direction };
      this.store.dispatch(reorderCategoryNodeCommand(nodePath(node), direction));
    });
    return button;
  }

  /** The ordered sibling names of a middle / minor node (for boundary disabling). */
  private categorySiblings(node: PaneNode): string[] {
    const document = this.store.getDocument();
    if (node.level === 'middle') {
      return orderedMiddlesUnderMajor(document, node.major);
    }
    if (node.level === 'minor' && node.middle !== undefined) {
      return orderedMinorsUnderMiddle(document, node.major, node.middle);
    }
    return [];
  }

  /** Build the `□` show-all button that reveals every hidden descendant (req 2). */
  private buildShowAllButton(node: PaneNode): HTMLButtonElement {
    const button = this.buildEditButton(
      'show-all',
      '□', // □ white square
      `Show all sub-sections of ${node.name}`,
      () => this.store.dispatch(revealDescendantsCommand(nodePath(node))),
    );
    return button;
  }

  /** Build the `+` add-sub-category button (the renamed old `↓`, req 5). */
  private buildAddSubButton(node: PaneNode): HTMLButtonElement {
    const parent =
      node.level === 'major'
        ? { major: node.major }
        : { major: node.major, middle: node.middle ?? '' };
    const button = this.buildEditButton(
      'add-subcategory',
      '+',
      `Add sub-category under ${node.name}`,
      () => this.store.dispatch(addSubcategoryCommand(parent)),
    );
    button.dataset.nodeMajor = node.major;
    return button;
  }

  /** Build the `-` hide button (individual hide, req 2). */
  private buildHideButton(node: PaneNode): HTMLButtonElement {
    const button = this.buildEditButton('hide-node', '−', `Hide ${node.name}`, () => {
      if (node.level === 'major') {
        if (node.sectionId !== undefined) {
          this.store.dispatch(setSectionCollapsedCommand(node.sectionId, true));
        }
        return;
      }
      this.store.dispatch(setCategoryNodeHiddenCommand(nodePath(node), true));
    });
    return button;
  }

  /** Build the `X` delete button; clicking opens the confirm dialog (req 6). */
  private buildDeleteButton(node: PaneNode): HTMLButtonElement {
    const role =
      node.level === 'major' ? 'remove-section' : node.level === 'middle' ? 'remove-track' : 'remove-detail';
    const label = node.level === 'major' ? `Remove section ${node.name}` : `Remove category ${node.name}`;
    const button = this.buildEditButton(role, '✕', label, () => undefined);
    button.dataset.nodeMajor = node.major;
    // Replace the no-op with the dialog opener so we can reference the trigger.
    button.addEventListener('click', () => this.openDeleteDialog(node, button));
    return button;
  }

  /** Shared button styling for the icon-row controls. */
  private styleControl(button: HTMLButtonElement, fontSize: string): void {
    button.style.cursor = 'pointer';
    button.style.fontSize = fontSize;
    button.style.lineHeight = '1';
    button.style.padding = '0 3px';
    button.style.border = '1px solid var(--grsch-btn-face-border)';
    button.style.borderRadius = '3px';
    button.style.background = 'var(--grsch-btn-face)';
    button.style.color = 'var(--grsch-header-label)';
    button.style.flex = '0 0 auto';
  }

  // -------------------------------------------------------------------------
  // Copy / paste (req 3): keyboard + right-click context menu
  // -------------------------------------------------------------------------

  /** Ctrl+C copies the selected node; Ctrl+V pastes a duplicate as its sibling. */
  private handlePaneKeydown(event: KeyboardEvent): void {
    if (isEditableTarget(event.target)) {
      return; // typing in a text field wins (req 3)
    }
    const ctrl = event.ctrlKey || event.metaKey;
    if (!ctrl) {
      return;
    }
    const key = (event.key || '').toLowerCase();
    if (key === 'c' && this.selectedNode !== null) {
      this.copiedNode = this.selectedNode;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (key === 'v' && this.copiedNode !== null) {
      this.dispatchDuplicate(this.copiedNode);
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /** Duplicate a node's subtree + items as a sibling copy (req 3). */
  private dispatchDuplicate(node: PaneNode): void {
    this.store.dispatch(duplicateCategorySubtreeCommand(nodePath(node)));
  }

  /** Open the right-click Copy / Paste menu on a section node (req 3). */
  private openContextMenu(node: PaneNode, event: MouseEvent): void {
    if (typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    this.closeContextMenu();
    const menu = this.el('div');
    menu.dataset.role = 'section-context-menu';
    menu.setAttribute('role', 'menu');
    menu.style.position = 'fixed';
    menu.style.left = `${event.clientX || 0}px`;
    menu.style.top = `${event.clientY || 0}px`;
    menu.style.zIndex = '30';
    menu.style.background = 'var(--grsch-surface-strong)';
    menu.style.border = '1px solid var(--grsch-menu-border)';
    menu.style.borderRadius = '4px';
    menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    menu.style.padding = '2px';
    menu.style.display = 'flex';
    menu.style.flexDirection = 'column';
    menu.style.font = 'inherit';

    const copyItem = this.buildContextMenuItem('context-copy', 'Copy', () => {
      this.copiedNode = node;
      this.closeContextMenu();
    });
    const pasteItem = this.buildContextMenuItem('context-paste', 'Paste', () => {
      if (this.copiedNode !== null) {
        this.dispatchDuplicate(this.copiedNode);
      }
      this.closeContextMenu();
    });
    if (this.copiedNode === null) {
      pasteItem.disabled = true;
      pasteItem.style.opacity = '0.4';
    }
    menu.append(copyItem, pasteItem);
    this.host.appendChild(menu);
    this.contextMenu = menu;
    copyItem.focus();

    // Dismiss on the next outside pointer press / Escape.
    const dismiss = (dismissEvent: Event): void => {
      if (dismissEvent instanceof KeyboardEvent && dismissEvent.key !== 'Escape') {
        return;
      }
      this.closeContextMenu();
    };
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('pointerdown', dismiss, { once: true, capture: true });
      window.addEventListener('keydown', dismiss, { once: true, capture: true });
    }
  }

  /** Build one context-menu button. */
  private buildContextMenuItem(role: string, label: string, onClick: () => void): HTMLButtonElement {
    const item = this.el('button');
    item.type = 'button';
    item.dataset.role = role;
    item.setAttribute('role', 'menuitem');
    item.textContent = label;
    item.setAttribute('aria-label', label);
    item.style.cursor = 'pointer';
    item.style.textAlign = 'left';
    item.style.padding = '4px 12px';
    item.style.border = 'none';
    item.style.background = 'transparent';
    item.style.color = 'var(--grsch-text-strong)';
    item.addEventListener('click', onClick);
    return item;
  }

  /** Remove the context menu if open. */
  private closeContextMenu(): void {
    if (this.contextMenu !== null) {
      const parent = this.contextMenu.parentNode;
      if (parent) {
        parent.removeChild(this.contextMenu);
      } else {
        this.host.removeChild(this.contextMenu);
      }
      this.contextMenu = null;
    }
  }

  // -------------------------------------------------------------------------
  // Delete confirmation dialog (req 6)
  // -------------------------------------------------------------------------

  /**
   * Open the modal delete-confirmation dialog for a node (req 6). Only on confirm
   * (Delete / D / Enter) is the node actually removed (undoable); Cancel / C / Esc
   * closes with no change. Focus starts on Cancel (safer default) and returns to
   * the triggering `X` button on close. Focus is trapped between the two buttons.
   */
  private openDeleteDialog(node: PaneNode, trigger: HTMLElement): void {
    this.closeDeleteDialog(null);
    const overlay = this.el('div');
    overlay.dataset.role = 'delete-dialog-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '40';
    overlay.style.background = 'var(--grsch-scrim)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    const dialog = this.el('div');
    dialog.dataset.role = 'delete-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'delete-dialog-title');
    dialog.style.background = 'var(--grsch-surface-strong)';
    dialog.style.borderRadius = '6px';
    dialog.style.boxShadow = '0 6px 24px rgba(0,0,0,0.3)';
    dialog.style.padding = '16px 18px';
    dialog.style.minWidth = '220px';
    dialog.style.font = 'inherit';
    dialog.style.color = 'var(--grsch-text-strong)';

    const title = this.el('p');
    title.id = 'delete-dialog-title';
    title.dataset.role = 'delete-dialog-body';
    title.textContent = node.level === 'major' ? 'Delete this section?' : 'Delete this category?';
    title.style.margin = '0 0 14px';
    title.style.fontSize = '1em';

    const buttonRow = this.el('div');
    buttonRow.style.display = 'flex';
    buttonRow.style.justifyContent = 'flex-end';
    buttonRow.style.gap = '10px';

    const deleteButton = this.buildDialogButton('dialog-delete', 'D', 'elete', 'Delete');
    deleteButton.style.background = 'var(--grsch-danger)';
    deleteButton.style.color = 'var(--grsch-danger-text)';
    deleteButton.style.border = '1px solid var(--grsch-danger-border)';
    const cancelButton = this.buildDialogButton('dialog-cancel', 'C', 'ancel', 'Cancel');

    const confirm = (): void => {
      this.store.dispatch(removeClassificationNodeCommand(nodePath(node)));
      this.closeDeleteDialog(trigger);
    };
    const cancel = (): void => this.closeDeleteDialog(trigger);
    deleteButton.addEventListener('click', confirm);
    cancelButton.addEventListener('click', cancel);

    // Keyboard: D confirms, C / Esc cancel, Enter confirms (documented), Tab traps.
    dialog.addEventListener('keydown', (event) => {
      const key = (event.key || '').toLowerCase();
      if (key === 'd') {
        event.preventDefault();
        event.stopPropagation();
        confirm();
      } else if (key === 'c' || event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        cancel();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        confirm();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        const active = window.document.activeElement;
        (active === cancelButton ? deleteButton : cancelButton).focus();
      }
    });

    buttonRow.append(deleteButton, cancelButton);
    dialog.append(title, buttonRow);
    overlay.appendChild(dialog);
    this.host.appendChild(overlay);
    this.deleteOverlay = overlay;
    // Default focus on Cancel (safer for a destructive action).
    cancelButton.focus();
  }

  /**
   * Build one dialog action button with its first letter BOLD (affording the D / C
   * keyboard shortcut, req 6).
   */
  private buildDialogButton(
    role: string,
    boldLetter: string,
    rest: string,
    accessibleName: string,
  ): HTMLButtonElement {
    const button = this.el('button');
    button.type = 'button';
    button.dataset.role = role;
    button.setAttribute('aria-label', accessibleName);
    button.style.cursor = 'pointer';
    button.style.padding = '5px 14px';
    button.style.borderRadius = '4px';
    button.style.border = '1px solid var(--grsch-btn-face-border)';
    button.style.background = 'var(--grsch-btn-face-alt)';
    button.style.color = 'var(--grsch-text-strong)';
    button.style.font = 'inherit';
    const bold = this.el('b');
    bold.textContent = boldLetter;
    button.appendChild(bold);
    button.appendChild(window.document.createTextNode(rest));
    return button;
  }

  /** Close the delete dialog and return focus to the triggering button, if any. */
  private closeDeleteDialog(returnFocusTo: HTMLElement | null): void {
    if (this.deleteOverlay !== null) {
      const parent = this.deleteOverlay.parentNode;
      if (parent) {
        parent.removeChild(this.deleteOverlay);
      } else {
        this.host.removeChild(this.deleteOverlay);
      }
      this.deleteOverlay = null;
    }
    if (returnFocusTo !== null && typeof returnFocusTo.focus === 'function') {
      returnFocusTo.focus();
    }
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
      button.style.border = '1px solid var(--grsch-btn-active-border)';
      button.style.borderRadius = '3px';
      button.style.background = 'var(--grsch-btn-active-bg)';
      button.style.color = 'var(--grsch-header-label)';
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
   * Build one small, icon-only classification edit button (add / remove / hide /
   * show-all) as a real focusable `<button>` with a descriptive accessible name
   * (WCAG 1.1.1 / 4.1.2), wired to dispatch its command through the undoable store.
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
    this.styleControl(button, '0.8em');
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
    button.textContent = direction === 'up' ? '▲' : '▼';
    const label = `Move section ${sectionName} ${direction}`;
    button.title = label;
    button.setAttribute('aria-label', label);
    this.styleControl(button, '0.7em');

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

  /** Mirror of {@link restorePendingMoveFocus} for a MIDDLE / MINOR reorder (req 1). */
  private restorePendingCategoryFocus(): void {
    const pending = this.pendingCategoryFocus;
    if (pending === null) {
      return;
    }
    this.pendingCategoryFocus = null;
    const attrs = this.categoryFocusSelector(pending.node);
    const find = (direction: CategoryMoveDirection): HTMLButtonElement | null =>
      this.scrollLayer.querySelector<HTMLButtonElement>(
        `button[data-role="category-move-${direction}"]${attrs}`,
      );
    const preferred = find(pending.direction);
    if (preferred !== null && !preferred.disabled) {
      preferred.focus();
      return;
    }
    const fallback = find(pending.direction === 'up' ? 'down' : 'up');
    if (fallback !== null && !fallback.disabled) {
      fallback.focus();
    }
  }

  /** The attribute selector fragment matching a middle / minor node's move button. */
  private categoryFocusSelector(node: PaneNode): string {
    let selector = `[data-node-major="${node.major}"]`;
    if (node.middle !== undefined) {
      selector += `[data-node-middle="${node.middle}"]`;
    }
    if (node.minor !== undefined) {
      selector += `[data-node-minor="${node.minor}"]`;
    }
    return selector;
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

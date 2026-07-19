/**
 * Adapter layer: SVG renderer with viewport virtualization, diff rendering and
 * requestAnimationFrame batching (ARCH-C-022, ADR-009).
 *
 * Virtualization contract: only items that both intersect the viewport window
 * (ViewState + canvas size) AND pass the LOD threshold receive a DOM node.
 * Existing nodes are patched in place; nodes that leave the visible set are
 * removed. This keeps the live SVG node count proportional to the visible set
 * (a few dozen to a few hundred) rather than the total item count, which is the
 * core RISK-001 / NFR-L1-002 performance strategy.
 *
 * The renderer owns a mutable copy of ViewState and translates a single content
 * group by -scroll, so item placements are authored in world space. A separate
 * screen-space-fixed overlay group (ADR-004) holds the zoom-invariant decorations.
 *
 * Since the H-1 god-object split, `SvgRenderer` is the ORCHESTRATOR/FACADE: it
 * owns the SVG root, the group elements, the diffRender lifecycle, the view state
 * and the public API, and delegates each drawing concern to a cohesive layer
 * module ({@link GridLayer}, {@link ItemLayer}, ... ) and each pointer query to
 * {@link HitTester}, all reading a per-frame {@link RenderContext}. The public API,
 * every `data-role`/`data-*` attribute and the DOM structure/order are unchanged.
 */

import type {
  CanvasSize,
  IsoDate,
  Row,
  ScheduleDocument,
  ScheduleItem,
  ViewState,
} from '../../domain/model/schedule-model.js';
import {
  layoutRows,
  rowTopAt,
  rowHeightAt,
  rowBoundaryY,
  rowIndexAtWorldY as resolveRowIndexAtWorldY,
  EMPTY_ROW_GEOMETRY,
  type ItemPlacement,
  type RowGeometry,
} from '../../domain/usecase/layout-engine.js';
import {
  computeFitViewForItems,
  computeViewportWindow,
} from '../../domain/usecase/viewport.js';
import {
  clampTimelineScrollX,
  fromDayNumber,
  pixelsPerDay,
} from '../../domain/usecase/time-coordinate-mapper.js';
import {
  orderedVisibleRows,
  type SectionBand,
} from '../../domain/usecase/section-organizer.js';
import {
  classificationCollapseLevel,
  collapseRows,
  contiguousSectionBands,
} from '../../domain/usecase/classification-tree.js';
import { type Point, type Rect } from '../../domain/usecase/dependency-router.js';
import { resolveLeftPaneWidth } from '../../domain/usecase/left-pane-layout.js';
import { rulerTierCount } from '../../domain/usecase/date-ruler.js';
import { resolveWheelMode } from '../input/wheel-mode.js';
import {
  ALIGNMENT_GUIDE_STROKE_HEX,
  CUD_BLUE_ACCENT_HEX,
  DEPENDENCY_PREVIEW_STROKE_HEX,
} from '../../domain/usecase/render-tokens.js';
import { uiLabel } from '../../domain/usecase/i18n.js';
import { ViewTransform } from '../../domain/usecase/view-transform.js';
import type { WorldPoint } from '../../domain/usecase/view-transform.js';
import { createLogger } from '../../app/logger.js';
import {
  RULER_TIER_HEIGHT_PX,
  SVG_NS,
  type RenderContext,
} from './render-context.js';
import { buildDependencyMarkerDefs, placementRect } from './dependency-geometry.js';
import { GridLayer } from './layers/grid-layer.js';
import { ClassificationLayer } from './layers/classification-layer.js';
import { GhostLayer } from './layers/ghost-layer.js';
import { ItemLayer } from './layers/item-layer.js';
import { DependencyLayer } from './layers/dependency-layer.js';
import { RoundedBoxLayer } from './layers/rounded-box-layer.js';
import { ProgressTodayLayer } from './layers/progress-today-layer.js';
import { CursorGuideLayer } from './layers/cursor-guide-layer.js';
import { CommentLayer } from './layers/comment-layer.js';
import { WatermarkLayer } from './layers/watermark-layer.js';
import { RulerLayer } from './layers/ruler-layer.js';
import { HitTester } from './hit-tester.js';
import type { AnnotationHit, ItemHit } from './hit-tester.js';

export type { WorldPoint } from '../../domain/usecase/view-transform.js';
export type { ItemHit, AnnotationHit } from './hit-tester.js';

const log = createLogger('grsch:render');

/** Snapshot of the most recent render, used by the benchmark harness. */
export interface RenderMetrics {
  /** Number of item DOM nodes currently mounted (the virtualized set size). */
  readonly liveNodeCount: number;
  /** Nodes created during the last diff. */
  readonly createdCount: number;
  /** Nodes removed during the last diff. */
  readonly removedCount: number;
}

/** Notified with the new view state whenever zoom/scroll/pane-width change. */
export type ViewStateListener = (viewState: ViewState) => void;

/**
 * SVG renderer for the schedule stage. Instantiate, then call {@link mount}
 * with a host element and {@link setDocument} with a document.
 */
export class SvgRenderer {
  private readonly svg: SVGSVGElement;
  private readonly contentGroup: SVGGElement;
  private readonly overlayGroup: SVGGElement;
  private readonly itemById = new Map<string, ScheduleItem>();

  private readonly gridGroup: SVGGElement;
  private readonly classificationGroup: SVGGElement;
  private readonly ghostGroup: SVGGElement;
  private readonly depGroup: SVGGElement;

  private readonly gridLayer: GridLayer;
  private readonly classificationLayer: ClassificationLayer;
  private readonly ghostLayer: GhostLayer;
  private readonly itemLayer: ItemLayer;
  private readonly dependencyLayer: DependencyLayer;
  private readonly roundedBoxLayer: RoundedBoxLayer;
  private readonly progressTodayLayer: ProgressTodayLayer;
  private readonly cursorGuideLayer: CursorGuideLayer;
  private readonly commentLayer: CommentLayer;
  private readonly watermarkLayer: WatermarkLayer;
  private readonly rulerLayer: RulerLayer;
  private readonly hitTester = new HitTester();

  /** Vertical order index of each DISPLAY row id, refreshed on every layout pass. */
  private readonly rowOrderById = new Map<string, number>();
  /** Maps each level-0 row id to the display row id it collapsed into (vertical LOD). */
  private rowIdToDisplayId = new Map<string, string>();
  /** The current display (collapsed) rows, in vertical order. */
  private displayRows: readonly Row[] = [];
  /** Reference date ("today") for the today line and illuminated line base. */
  private readonly today: IsoDate = fromDayNumber(
    Math.floor(Date.now() / 86_400_000),
  );

  private scheduleDocument: ScheduleDocument | null = null;
  private viewState: ViewState;
  private canvasSize: CanvasSize = { widthPx: 0, heightPx: 0 };
  private placements: readonly ItemPlacement[] = [];
  private readonly placementById = new Map<string, ItemPlacement>();
  /** Per-row variable-height geometry from the last layout (item: multi-lane stacking). */
  private rowGeometry: RowGeometry = EMPTY_ROW_GEOMETRY;
  /** Last pointer position over the canvas (client px), for the cursor guide (items 9-12). */
  private pointerClient: { readonly clientX: number; readonly clientY: number } | null = null;
  /** Lazily created rubber-band marquee rectangle, present only during a marquee drag. */
  private marqueeRect: SVGRectElement | null = null;
  private sectionBands: readonly SectionBand[] = [];
  private layoutDirty = false;
  private rafHandle: number | null = null;
  private lastMetrics: RenderMetrics = { liveNodeCount: 0, createdCount: 0, removedCount: 0 };
  private afterRenderCallback: ((metrics: RenderMetrics) => void) | null = null;
  private viewStateListener: ViewStateListener | null = null;
  private selectedItemIds: ReadonlySet<string> = new Set();
  /** The currently selected annotation (rounded-box / comment), drawn highlighted. */
  private selectedAnnotationId: string | null = null;
  /** The currently selected dependency line, drawn highlighted (item 1). */
  private selectedDependencyId: string | null = null;
  /** The item currently focused via keyboard, drawn with a visible ring (2.4.7). */
  private keyboardFocusItemId: string | null = null;
  private createPreviewRect: SVGRectElement | null = null;
  private alignmentGuideLine: SVGLineElement | null = null;
  private dependencyPreviewLine: SVGPathElement | null = null;
  private host: HTMLElement | null = null;

  public constructor() {
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.style.display = 'block';
    this.svg.style.touchAction = 'none';
    // Suppress native TEXT selection across the whole canvas so a marquee/normal
    // drag never blue-highlights the watermark, item abbreviation labels, category
    // labels or ruler text (selection-bug fix). Real editable inputs (property
    // fields, the user-name box) live OUTSIDE this SVG in the HTML chrome, so they
    // stay fully selectable/editable. Set on the root so it cascades to all text.
    this.svg.style.userSelect = 'none';
    this.svg.style.setProperty('-webkit-user-select', 'none');
    // Themed via the shared CSS variable (light default matches the historical
    // white). Using an inline `var()` re-resolves live on a theme switch, so no
    // re-render is needed when the user toggles dark mode.
    this.svg.style.background = 'var(--grsch-canvas-bg, #ffffff)';

    // Accessibility: make the schedule an operable, named application region
    // reachable by keyboard (WCAG 4.1.2 role/name, 2.1.1 keyboard). The concrete
    // aria-label is (re)applied per active locale in applyCanvasAria().
    this.svg.setAttribute('data-role', 'schedule-canvas');
    this.svg.setAttribute('role', 'application');
    this.svg.setAttribute('tabindex', '0');
    this.svg.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown Enter Escape');

    this.svg.appendChild(buildDependencyMarkerDefs());

    this.contentGroup = document.createElementNS(SVG_NS, 'g');
    this.contentGroup.setAttribute('data-role', 'content-world');
    // Faint decorative gridlines (vertical date ticks + horizontal category
    // boundaries) sit at the very BACK, behind the section lines and every item, so
    // they read as a grid without obscuring content. Purely decorative: aria-hidden
    // and non-interactive (WCAG 1.3.1 -- no semantic value for assistive tech).
    this.gridGroup = document.createElementNS(SVG_NS, 'g');
    this.gridGroup.setAttribute('data-role', 'gridlines');
    this.gridGroup.setAttribute('pointer-events', 'none');
    this.gridGroup.setAttribute('aria-hidden', 'true');
    // Classification lines sit behind items; dependency lines sit above them.
    this.classificationGroup = document.createElementNS(SVG_NS, 'g');
    this.classificationGroup.setAttribute('data-role', 'classification-lines');
    this.classificationGroup.setAttribute('pointer-events', 'none');
    // Previous-plan ghost bars sit above the classification lines but behind the
    // live item glyphs (PLAN-L1-004); world-space so they follow zoom/pan.
    this.ghostGroup = document.createElementNS(SVG_NS, 'g');
    this.ghostGroup.setAttribute('data-role', 'previous-plan-ghosts');
    this.ghostGroup.setAttribute('pointer-events', 'none');
    this.depGroup = document.createElementNS(SVG_NS, 'g');
    this.depGroup.setAttribute('data-role', 'dependency-lines');
    this.depGroup.setAttribute('pointer-events', 'none');
    this.contentGroup.appendChild(this.gridGroup);
    this.contentGroup.appendChild(this.classificationGroup);
    this.contentGroup.appendChild(this.ghostGroup);
    // Screen-space overlay (ADR-004): today line, dual cursors, illuminated line,
    // rounded-box enclosures and comment leaders. Not transformed by scroll/zoom;
    // each decoration maps world -> screen per frame. Bounded by decoration count.
    this.overlayGroup = document.createElementNS(SVG_NS, 'g');
    this.overlayGroup.setAttribute('data-role', 'screen-space-overlay');
    this.overlayGroup.setAttribute('pointer-events', 'none');

    this.svg.appendChild(this.contentGroup);
    this.svg.appendChild(this.overlayGroup);

    // Wire the drawing concerns to their target groups (H-1 split). The groups are
    // owned here so the DOM structure/order stays identical; each layer only
    // populates its group from the shared per-frame RenderContext.
    this.gridLayer = new GridLayer(this.gridGroup);
    this.classificationLayer = new ClassificationLayer(this.classificationGroup);
    this.ghostLayer = new GhostLayer(this.ghostGroup);
    this.itemLayer = new ItemLayer(this.contentGroup);
    this.dependencyLayer = new DependencyLayer(this.contentGroup, this.depGroup);
    this.roundedBoxLayer = new RoundedBoxLayer(this.overlayGroup);
    this.progressTodayLayer = new ProgressTodayLayer(this.overlayGroup);
    this.cursorGuideLayer = new CursorGuideLayer(this.overlayGroup);
    this.commentLayer = new CommentLayer(this.overlayGroup);
    this.watermarkLayer = new WatermarkLayer(this.overlayGroup);
    this.rulerLayer = new RulerLayer(this.overlayGroup);

    this.viewState = { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' };
    // Apply the localized canvas name now that the view state exists (4.1.2).
    this.applyCanvasAria();
  }

  /**
   * Build the read-only {@link RenderContext} for the current frame / query. Cheap
   * to construct (a shallow object of live references + bound helpers), so it is
   * rebuilt per render pass and per hit-test, keeping every scalar snapshot current
   * while the map/array references stay live.
   */
  private buildContext(): RenderContext {
    return {
      scheduleDocument: this.scheduleDocument,
      viewState: this.viewState,
      canvasSize: this.canvasSize,
      today: this.today,
      placements: this.placements,
      placementById: this.placementById,
      itemById: this.itemById,
      displayRows: this.displayRows,
      sectionBands: this.sectionBands,
      rowOrderById: this.rowOrderById,
      rowIdToDisplayId: this.rowIdToDisplayId,
      selectedItemIds: this.selectedItemIds,
      selectedAnnotationId: this.selectedAnnotationId,
      selectedDependencyId: this.selectedDependencyId,
      keyboardFocusItemId: this.keyboardFocusItemId,
      pointerClient: this.pointerClient,
      leftPaneWidth: this.getLeftPaneWidth(),
      contentTopOffsetPx: this.getContentTopOffsetPx(),
      hasMountedItem: (itemId) => this.itemLayer.hasMounted(itemId),
      mountedItemIds: () => this.itemLayer.mountedIds(),
      viewTransform: (rect) => this.viewTransform(rect),
      worldToContentX: (worldX) => this.viewTransform().toContentX(worldX),
      worldToContentY: (worldY) => this.viewTransform().toContentY(worldY),
      screenToWorld: (screenX, screenY) => this.screenToWorld(screenX, screenY),
      svgClientRect: () => {
        const rect = this.svg.getBoundingClientRect();
        return { left: rect.left, top: rect.top };
      },
      rowTop: (index) => this.rowTop(index),
      rowHeight: (index) => this.rowHeight(index),
      rowBoundary: (index) => this.rowBoundary(index),
      screenRectVisible: (x, y, width, height) => this.screenRectVisible(x, y, width, height),
    };
  }

  /**
   * Mount the renderer into a host element and start observing its size.
   *
   * @param host - The container element to render into.
   */
  public mount(host: HTMLElement): void {
    this.host = host;
    host.appendChild(this.svg);
    this.measureCanvas(host);
    this.attachInputHandlers(host);
    const resizeObserver = new ResizeObserver(() => {
      this.measureCanvas(host);
      this.requestRender();
    });
    resizeObserver.observe(host);
  }

  /** Register a callback invoked after every completed render (for metrics). */
  public setAfterRenderCallback(callback: (metrics: RenderMetrics) => void): void {
    this.afterRenderCallback = callback;
  }

  /**
   * Register a callback invoked whenever the view state changes (zoom / scroll /
   * pane width). Used by the left classification pane to stay scroll-synced
   * (CANVAS-L1-007) and pane-width-synced (CANVAS-L2-001).
   *
   * @param listener - Called with the new view state after each change.
   */
  public onViewStateChange(listener: ViewStateListener): void {
    this.viewStateListener = listener;
  }

  /** Effective left-pane width in CSS pixels (world content is offset by this). */
  public getLeftPaneWidth(): number {
    return resolveLeftPaneWidth(this.viewState.leftPaneWidth);
  }

  /**
   * Vertical offset in CSS pixels the schedule content is pushed DOWN by so the
   * first row starts flush directly beneath the fixed date ruler, with no wasted
   * band between them (item: no empty space under the ruler). It equals the current
   * ruler height (tier count x tier band height) and shrinks/grows as the zoom
   * changes the ruler's tier count. The left classification pane reads this to keep
   * its rows aligned with the schedule.
   */
  public getContentTopOffsetPx(): number {
    return rulerTierCount(this.viewState.zoomX) * RULER_TIER_HEIGHT_PX;
  }

  /**
   * Set the left classification pane width and re-render (CANVAS-L2-001). The
   * width is stored in ViewState so it is persisted with the document.
   *
   * @param width - The new pane width in CSS pixels (already clamped).
   */
  public setLeftPaneWidth(width: number): void {
    if (this.viewState.leftPaneWidth === width) {
      return;
    }
    this.viewState = { ...this.viewState, leftPaneWidth: width };
    this.requestRender();
    this.viewStateListener?.(this.viewState);
  }

  /**
   * Replace the document to render and rebuild the item index.
   *
   * @param scheduleDocument - The schedule to display.
   */
  public setDocument(scheduleDocument: ScheduleDocument): void {
    this.scheduleDocument = scheduleDocument;
    this.viewState = { ...scheduleDocument.viewState };
    this.itemById.clear();
    for (const item of scheduleDocument.items) {
      this.itemById.set(item.id, item);
    }
    // A replaced document (import / restore) invalidates any prior annotation /
    // dependency selection id.
    this.selectedAnnotationId = null;
    this.selectedDependencyId = null;
    this.applyCanvasAria();
    this.clearMountedNodes();
    this.layoutDirty = true;
    this.requestRender();
  }

  /** Current (mutable-copy) view state. */
  public getViewState(): ViewState {
    return this.viewState;
  }

  /**
   * Apply the localized accessible label to the canvas (WCAG 4.1.2 / 3.1.1). Kept
   * in sync with the active UI locale so a screen reader announces the region in
   * the user's language.
   */
  private applyCanvasAria(): void {
    const locale = this.viewState?.activeLocale ?? 'en';
    this.svg.setAttribute('aria-label', uiLabel('schedule_canvas', locale));
    this.svg.setAttribute('aria-roledescription', uiLabel('schedule_canvas', locale));
  }

  /**
   * Set (or clear with null) the keyboard-focused item and redraw its focus ring
   * (WCAG 2.4.7). Distinct from selection: the ring is a solid, offset outline so
   * the focused item is clearly indicated even when it is also selected.
   *
   * @param itemId - The focused item id, or null to clear.
   */
  public setKeyboardFocusItem(itemId: string | null): void {
    if (this.keyboardFocusItemId === itemId) {
      return;
    }
    this.keyboardFocusItemId = itemId;
    this.requestRender();
  }

  /** World x at the horizontal center of the visible schedule viewport. */
  public viewportCenterWorldX(): number {
    const scheduleWidth = Math.max(0, this.canvasSize.widthPx - this.getLeftPaneWidth());
    return this.viewState.scrollX + scheduleWidth / 2;
  }

  /**
   * Scroll so the given item is inside the visible schedule viewport, if it is
   * laid out (WCAG 2.4.3 keeps keyboard-focused content on screen). A best-effort
   * nudge only along the axis where the item is off-screen; no-op when already
   * visible or when the item has no placement.
   *
   * @param itemId - The item to reveal.
   */
  public ensureItemVisible(itemId: string): void {
    const placement = this.placementById.get(itemId);
    if (placement === undefined) {
      return;
    }
    const margin = 24;
    const leftPaneWidth = this.getLeftPaneWidth();
    const scheduleWidth = Math.max(0, this.canvasSize.widthPx - leftPaneWidth);
    let nextScrollX = this.viewState.scrollX;
    let nextScrollY = this.viewState.scrollY;

    const screenX = placement.worldX - this.viewState.scrollX;
    if (screenX < margin) {
      nextScrollX = placement.worldX - margin;
    } else if (screenX + placement.worldWidth > scheduleWidth - margin) {
      nextScrollX = placement.worldX + placement.worldWidth - scheduleWidth + margin;
    }

    const screenY = placement.worldY - this.viewState.scrollY;
    if (screenY < margin) {
      nextScrollY = placement.worldY - margin;
    } else if (screenY + placement.worldHeight > this.canvasSize.heightPx - margin) {
      nextScrollY = placement.worldY + placement.worldHeight - this.canvasSize.heightPx + margin;
    }

    if (nextScrollX !== this.viewState.scrollX || nextScrollY !== this.viewState.scrollY) {
      this.setViewState({ ...this.viewState, scrollX: Math.max(0, nextScrollX), scrollY: Math.max(0, nextScrollY) });
    }
  }

  /**
   * Frame the WHOLE schedule so every row and the full date span are visible
   * (fix 7 "Fit"). Computes zoomX / zoomY / scroll from the item day-extent and
   * the finest (level-0) visible row count -- an upper bound that guarantees the
   * collapsed rows shown at the fitted zoom always fit -- then applies it. A no-op
   * when there is nothing to frame or the canvas has no size yet.
   */
  public fitToContent(): void {
    if (this.scheduleDocument === null) {
      return;
    }
    // Re-measure the drawing surface first: the canvas size cached at mount can be
    // stale (e.g. the stage was full width before the property panel mounted and
    // shrank it), which would make Fit spread content wider than the visible area
    // and clip the right-most items. Reading the host's current rect flushes layout
    // so Fit always frames against the ACTUAL viewport width/height.
    if (this.host !== null) {
      this.measureCanvas(this.host);
    }
    if (this.canvasSize.widthPx <= 0 || this.canvasSize.heightPx <= 0) {
      return;
    }
    const items = this.scheduleDocument.items;
    if (items.length === 0) {
      return;
    }
    // Frame EVERY item across all rows, including multi-bar sub-lanes, trapezoid
    // fades and milestone glyphs: the item-based Fit measures the true content
    // bottom (lane-inclusive) at the chosen zoomX so no stacked item is clipped.
    const visibleRows = orderedVisibleRows(
      this.scheduleDocument.sections,
      this.scheduleDocument.rows,
    );
    const fit = computeFitViewForItems(items, visibleRows, this.scheduleDocument.epochDate, {
      canvasSize: this.canvasSize,
      leftPaneWidth: this.getLeftPaneWidth(),
      topOffsetForZoomX: (zoomX) => rulerTierCount(zoomX) * RULER_TIER_HEIGHT_PX,
    });
    if (fit === null) {
      return;
    }
    this.setViewState({ ...this.viewState, ...fit });
    log.debug('fit_to_content', {
      zoom_x: fit.zoomX,
      zoom_y: fit.zoomY,
      row_count: visibleRows.length,
    });
  }

  /** Metrics from the most recent completed render. */
  public getLastMetrics(): RenderMetrics {
    return this.lastMetrics;
  }

  /**
   * Apply an edited document (items/rows changed) while preserving the current
   * view state (zoom/scroll). Used by the store subscription so an edit never
   * resets the viewport. Distinct from {@link setDocument}, which adopts the
   * document's own view state and clears mounted nodes.
   *
   * @param scheduleDocument - The updated document to render.
   */
  public updateItems(scheduleDocument: ScheduleDocument): void {
    this.scheduleDocument = scheduleDocument;
    this.itemById.clear();
    for (const item of scheduleDocument.items) {
      this.itemById.set(item.id, item);
    }
    // M-02: mark layout dirty and let the rAF recompute once per frame instead
    // of running the O(n log n) layout synchronously on every drag pointermove.
    this.layoutDirty = true;
    this.requestRender();
  }

  /** The host element the renderer is mounted into (null before mount). */
  public getHostElement(): HTMLElement | null {
    return this.host;
  }

  /** The root SVG element (for bounding-rect math in the editing controller). */
  public getSvgElement(): SVGSVGElement {
    return this.svg;
  }

  /**
   * Convert a screen point (client coordinates) into world content coordinates,
   * the EXACT inverse of the content-group transform applied in {@link diffRender}
   * (calibration fix, fix 1). The content group is translated by
   * `(leftPaneWidth - scrollX, topOffset - scrollY)` and never scaled (zoom is
   * baked into the placements), so a world point `(wx, wy)` lands at client
   * `(rect.left + wx + leftPaneWidth - scrollX, rect.top + wy + topOffset - scrollY)`.
   * Inverting that yields the formulas below; {@link worldToScreen} is the forward
   * map and the two are kept in lockstep through the same offset accessors so the
   * selectable region can never drift from the drawn position.
   *
   * @param screenX - Client x (e.g. PointerEvent.clientX).
   * @param screenY - Client y (e.g. PointerEvent.clientY).
   * @returns The corresponding world-space point.
   */
  public screenToWorld(screenX: number, screenY: number): WorldPoint {
    const rect = this.svg.getBoundingClientRect();
    return this.viewTransform(rect).fromClient({ clientX: screenX, clientY: screenY });
  }

  /**
   * Build the world <-> screen {@link ViewTransform} for the CURRENT view offsets.
   * A single source of truth for the coordinate math (review M-1 / R2): every
   * conversion below goes through it so the client-space and content-space maps can
   * never diverge. Pass the SVG bounding rect for client-space conversions
   * (pointer <-> world); omit it for pure content-space conversions (the values
   * written to SVG attributes), where the rect offset must NOT be applied.
   *
   * @param rect - The SVG bounding rect, or `{ left: 0, top: 0 }` for content space.
   * @returns A transform capturing the current pane width, top offset and scroll.
   */
  private viewTransform(rect: { left: number; top: number } = { left: 0, top: 0 }): ViewTransform {
    return new ViewTransform({
      leftPaneWidth: this.getLeftPaneWidth(),
      contentTopOffsetPx: this.getContentTopOffsetPx(),
      scrollX: this.viewState.scrollX,
      scrollY: this.viewState.scrollY,
      rectLeft: rect.left,
      rectTop: rect.top,
    });
  }

  /**
   * Forward map: convert a world content point into a client-space screen point,
   * the exact inverse of {@link screenToWorld}. Used by tests (and future
   * decorations) to find the on-screen center of a laid-out item so a click there
   * is guaranteed to hit it (calibration fix, fix 1).
   *
   * @param worldX - World-space x.
   * @param worldY - World-space y.
   * @returns The client-space screen point.
   */
  public worldToScreen(worldX: number, worldY: number): { readonly screenX: number; readonly screenY: number } {
    const rect = this.svg.getBoundingClientRect();
    const client = this.viewTransform(rect).toClient({ worldX, worldY });
    return { screenX: client.clientX, screenY: client.clientY };
  }

  /** Client-space center of a laid-out item, or null when it has no placement. */
  public itemScreenCenter(itemId: string): { readonly screenX: number; readonly screenY: number } | null {
    const placement = this.placementById.get(itemId);
    if (placement === undefined) {
      return null;
    }
    return this.worldToScreen(
      placement.worldX + placement.worldWidth / 2,
      placement.worldY + placement.worldHeight / 2,
    );
  }

  /**
   * Hit-test the visible item set at a screen point (topmost lane wins). Only
   * items that currently pass viewport + LOD culling are hit-testable, which is
   * the intended behavior (you can only grab what you can see).
   *
   * @param screenX - Client x.
   * @param screenY - Client y.
   * @returns The hit item and sub-region, or null when the point is empty.
   */
  public hitTest(screenX: number, screenY: number): ItemHit | null {
    return this.hitTester.hitTest(this.buildContext(), screenX, screenY);
  }

  /**
   * Replace the current selection and re-render the affected outlines.
   *
   * @param itemIds - The ids that should appear selected.
   */
  public setSelection(itemIds: ReadonlySet<string>): void {
    this.selectedItemIds = new Set(itemIds);
    this.requestRender();
  }

  /**
   * Set (or clear with null) the selected annotation and redraw its highlight /
   * resize handles (CURS-L1-007). Selecting an annotation is mutually exclusive
   * with an item selection; the caller clears the other side.
   *
   * @param annotationId - The selected annotation id, or null.
   */
  public setSelectedAnnotation(annotationId: string | null): void {
    if (this.selectedAnnotationId === annotationId) {
      return;
    }
    this.selectedAnnotationId = annotationId;
    this.requestRender();
  }

  /** The currently selected annotation id, or null. */
  public getSelectedAnnotationId(): string | null {
    return this.selectedAnnotationId;
  }

  /**
   * Hit-test the canvas annotations at a screen point (CURS-L1-007 select/resize).
   * When the SELECTED rounded-box is hit near a corner, the matching resize handle
   * region is returned; otherwise the topmost annotation whose border/interior
   * contains the point is returned as a `body` (select) hit. Comments are
   * body-only (not resizable).
   *
   * @param screenX - Client x.
   * @param screenY - Client y.
   * @returns The annotation hit, or null when the point is over no annotation.
   */
  public hitTestAnnotation(screenX: number, screenY: number): AnnotationHit | null {
    return this.hitTester.hitTestAnnotation(this.buildContext(), screenX, screenY);
  }

  /**
   * Show a transient creation preview rectangle in world space during a
   * click-drag create gesture, or hide it when passed null.
   *
   * @param worldRect - The preview rectangle, or null to hide.
   */
  public showCreatePreview(
    worldRect: { worldX: number; worldY: number; worldWidth: number; worldHeight: number } | null,
  ): void {
    if (worldRect === null) {
      this.createPreviewRect?.remove();
      this.createPreviewRect = null;
      return;
    }
    if (this.createPreviewRect === null) {
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('fill', 'rgba(0,114,178,0.2)');
      rect.setAttribute('stroke', CUD_BLUE_ACCENT_HEX);
      rect.setAttribute('stroke-dasharray', '4 2');
      rect.setAttribute('pointer-events', 'none');
      this.contentGroup.appendChild(rect);
      this.createPreviewRect = rect;
    }
    this.createPreviewRect.setAttribute('x', String(worldRect.worldX));
    this.createPreviewRect.setAttribute('y', String(worldRect.worldY));
    this.createPreviewRect.setAttribute('width', String(Math.max(1, worldRect.worldWidth)));
    this.createPreviewRect.setAttribute('height', String(worldRect.worldHeight));
  }

  /** World-space bounding rectangle of an item, or null when not laid out. */
  public getItemRect(itemId: string): Rect | null {
    const placement = this.placementById.get(itemId);
    return placement === undefined ? null : placementRect(placement);
  }

  /**
   * Show (or hide with null) the rubber-band marquee selection rectangle in world
   * space during an empty-area drag (item 3). A solid thin outline with a
   * semi-transparent fill, drawn in the scrolled content group so it tracks the
   * schedule under pan/zoom.
   *
   * @param worldRect - The marquee rectangle in world space, or null to hide.
   */
  public showMarquee(
    worldRect: { worldX: number; worldY: number; worldWidth: number; worldHeight: number } | null,
  ): void {
    if (worldRect === null) {
      this.marqueeRect?.remove();
      this.marqueeRect = null;
      return;
    }
    if (this.marqueeRect === null) {
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('data-role', 'marquee');
      rect.setAttribute('fill', 'rgba(0,114,178,0.12)');
      rect.setAttribute('stroke', CUD_BLUE_ACCENT_HEX);
      rect.setAttribute('stroke-width', '1');
      rect.setAttribute('pointer-events', 'none');
      this.contentGroup.appendChild(rect);
      this.marqueeRect = rect;
    }
    this.marqueeRect.setAttribute('x', String(worldRect.worldX));
    this.marqueeRect.setAttribute('y', String(worldRect.worldY));
    this.marqueeRect.setAttribute('width', String(Math.max(0, worldRect.worldWidth)));
    this.marqueeRect.setAttribute('height', String(Math.max(0, worldRect.worldHeight)));
  }

  /**
   * The ids of every laid-out item whose world-space box intersects a world-space
   * rectangle (item 3 marquee select). Uses the current placements so it matches
   * exactly what the user framed on screen.
   *
   * @param worldRect - The selection rectangle in world space.
   * @returns The intersecting item ids.
   */
  public itemsIntersectingWorldRect(worldRect: {
    worldX: number;
    worldY: number;
    worldWidth: number;
    worldHeight: number;
  }): string[] {
    const left = worldRect.worldX;
    const right = worldRect.worldX + worldRect.worldWidth;
    const top = worldRect.worldY;
    const bottom = worldRect.worldY + worldRect.worldHeight;
    const ids: string[] = [];
    for (const placement of this.placements) {
      const itemRight = placement.worldX + placement.worldWidth;
      const itemBottom = placement.worldY + placement.worldHeight;
      if (
        itemRight >= left &&
        placement.worldX <= right &&
        itemBottom >= top &&
        placement.worldY <= bottom
      ) {
        ids.push(placement.itemId);
      }
    }
    return ids;
  }

  /**
   * Show a transient dependency-link preview polyline in world space during a
   * link-drag gesture (DEP-L1-002), or hide it when passed null.
   *
   * @param worldPoints - The preview vertices, or null to hide.
   */
  public showDependencyPreview(worldPoints: readonly Point[] | null): void {
    if (worldPoints === null || worldPoints.length < 2) {
      this.dependencyPreviewLine?.remove();
      this.dependencyPreviewLine = null;
      return;
    }
    if (this.dependencyPreviewLine === null) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', DEPENDENCY_PREVIEW_STROKE_HEX);
      path.setAttribute('stroke-width', '1.4');
      path.setAttribute('stroke-dasharray', '4 3');
      path.setAttribute('pointer-events', 'none');
      this.contentGroup.appendChild(path);
      this.dependencyPreviewLine = path;
    }
    const pathData = worldPoints
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
    this.dependencyPreviewLine.setAttribute('d', pathData);
  }

  /**
   * Show a vertical alignment guide at a world x (snapping feedback), or hide it
   * when passed null.
   *
   * @param worldX - World x of the guide, or null to hide.
   */
  public showAlignmentGuide(worldX: number | null): void {
    if (worldX === null) {
      this.alignmentGuideLine?.remove();
      this.alignmentGuideLine = null;
      return;
    }
    if (this.alignmentGuideLine === null) {
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('stroke', ALIGNMENT_GUIDE_STROKE_HEX);
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-dasharray', '3 3');
      line.setAttribute('pointer-events', 'none');
      this.contentGroup.appendChild(line);
      this.alignmentGuideLine = line;
    }
    const top = this.viewState.scrollY - 1000;
    const bottom = this.viewState.scrollY + this.canvasSize.heightPx + 1000;
    this.alignmentGuideLine.setAttribute('x1', String(worldX));
    this.alignmentGuideLine.setAttribute('x2', String(worldX));
    this.alignmentGuideLine.setAttribute('y1', String(top));
    this.alignmentGuideLine.setAttribute('y2', String(bottom));
  }

  /**
   * Replace the view state and schedule a diff render. Recomputes layout only
   * when a zoom axis changed (scroll-only changes reuse the cached layout).
   *
   * @param nextViewState - The new view state.
   */
  public setViewState(nextViewState: ViewState): void {
    const zoomChanged =
      nextViewState.zoomX !== this.viewState.zoomX ||
      nextViewState.zoomY !== this.viewState.zoomY;
    // Clamp the horizontal scroll into the permitted timeline range so the user can
    // pan/scroll back to the year 2000 (and no further) regardless of the epoch,
    // and never off into unbounded blank space to the right (fix: date range).
    const clampedScrollX =
      this.scheduleDocument === null
        ? nextViewState.scrollX
        : clampTimelineScrollX(
            nextViewState.scrollX,
            this.scheduleDocument.epochDate,
            nextViewState.zoomX,
          );
    this.viewState =
      clampedScrollX === nextViewState.scrollX
        ? nextViewState
        : { ...nextViewState, scrollX: clampedScrollX };
    if (zoomChanged) {
      this.layoutDirty = true;
    }
    this.applyCanvasAria();
    this.requestRender();
    this.viewStateListener?.(this.viewState);
  }

  /** Schedule a diff render on the next animation frame (batched). */
  public requestRender(): void {
    if (this.rafHandle !== null) {
      return;
    }
    this.rafHandle = requestAnimationFrame(() => {
      this.rafHandle = null;
      this.renderNow();
    });
  }

  /**
   * Render synchronously (no rAF). Used for the initial-render timing in the
   * benchmark harness so the measured span covers actual DOM construction.
   */
  public renderNow(): void {
    if (this.scheduleDocument === null) {
      return;
    }
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    if (this.layoutDirty) {
      this.recomputeLayout();
      this.layoutDirty = false;
    }
    this.diffRender();
  }

  private measureCanvas(host: HTMLElement): void {
    const rect = host.getBoundingClientRect();
    this.canvasSize = { widthPx: rect.width, heightPx: rect.height };
  }

  private recomputeLayout(): void {
    if (this.scheduleDocument === null) {
      return;
    }
    // Section order + collapsed hiding decide which rows are laid out and in what
    // vertical order (SECT-L1-002 / SECT-L1-003); collapsed sections' rows are
    // omitted so their items get no placement (and thus no node / no dep line).
    const visibleRows = orderedVisibleRows(
      this.scheduleDocument.sections,
      this.scheduleDocument.rows,
    );
    // Vertical level-of-detail: as zoomY shrinks, collapse minor -> middle -> major
    // so the detail rows merge onto their parent lane (mirrors the time-axis LOD).
    const collapse = collapseRows(visibleRows, classificationCollapseLevel(this.viewState.zoomY));
    this.displayRows = collapse.rows;
    this.rowIdToDisplayId = collapse.rowIdToDisplayId;
    this.rowOrderById.clear();
    this.displayRows.forEach((row, index) => this.rowOrderById.set(row.id, index));
    this.sectionBands = contiguousSectionBands(this.displayRows, this.scheduleDocument.sections);
    // Remap each item onto its DISPLAY row so collapsed detail rows share a lane.
    const laidItems = this.scheduleDocument.items.map((item) => {
      const displayId = this.rowIdToDisplayId.get(item.rowId);
      return displayId !== undefined && displayId !== item.rowId ? { ...item, rowId: displayId } : item;
    });
    const laid = layoutRows(
      laidItems,
      this.displayRows,
      this.scheduleDocument.epochDate,
      this.viewState,
    );
    this.placements = laid.placements;
    // Row bands may now have different heights (a row grows to stack overlapping
    // items); keep the geometry so gridlines, section boxes, comments, rounded boxes
    // and hit-testing all follow the taller rows (item: multi-lane stacking).
    this.rowGeometry = laid.geometry;
    this.placementById.clear();
    for (const placement of this.placements) {
      this.placementById.set(placement.itemId, placement);
    }
  }

  /** World-space top of display row `index` under the current variable geometry. */
  private rowTop(index: number): number {
    return rowTopAt(this.rowGeometry, index, this.viewState.zoomY);
  }

  /** World-space band height of display row `index` under the current geometry. */
  private rowHeight(index: number): number {
    return rowHeightAt(this.rowGeometry, index, this.viewState.zoomY);
  }

  /** World-space y of the boundary above display row `index` (variable geometry). */
  private rowBoundary(index: number): number {
    return rowBoundaryY(this.rowGeometry, index, this.viewState.zoomY);
  }

  /**
   * Display row index whose band contains a world y, following variable row heights
   * (item: multi-lane stacking). Used by the editing controller for create / move
   * target-row resolution so hit-testing tracks the taller rows.
   *
   * @param worldY - World-space y.
   * @returns The display row index, clamped to the visible range.
   */
  public rowIndexAtWorldY(worldY: number): number {
    return resolveRowIndexAtWorldY(this.rowGeometry, worldY, this.viewState.zoomY);
  }

  /** World-space band top of display row `index` (variable geometry, for callers). */
  public rowBandTopWorldY(index: number): number {
    return this.rowTop(index);
  }

  /** World-space band height of display row `index` (variable geometry, for callers). */
  public rowBandHeightWorldY(index: number): number {
    return this.rowHeight(index);
  }

  private diffRender(): void {
    const leftPaneWidth = this.getLeftPaneWidth();
    // The frozen left pane occupies the leftmost `leftPaneWidth` pixels, so the
    // schedule area is narrower; cull against that reduced width.
    const scheduleCanvas: CanvasSize = {
      widthPx: Math.max(0, this.canvasSize.widthPx - leftPaneWidth),
      heightPx: this.canvasSize.heightPx,
    };
    const viewportWindow = computeViewportWindow(this.viewState, scheduleCanvas);

    // Translate the whole world group by (paneWidth - scroll, topOffset - scroll):
    // the +paneWidth shift keeps world x = 0 to the RIGHT of the frozen pane so
    // early items are not hidden behind it (mock: time axis begins after the
    // classification pane); the +topOffset shift drops row 0 to just below the date
    // ruler so the first row is flush under it, not hidden behind it (item: no gap).
    const topOffset = this.getContentTopOffsetPx();
    this.contentGroup.setAttribute(
      'transform',
      `translate(${leftPaneWidth - this.viewState.scrollX} ${topOffset - this.viewState.scrollY})`,
    );

    const ctx = this.buildContext();
    this.gridLayer.render(ctx, viewportWindow);
    this.classificationLayer.render(ctx, viewportWindow);
    this.ghostLayer.render(ctx, viewportWindow);

    const itemMetrics = this.itemLayer.render(ctx, viewportWindow);

    this.dependencyLayer.render(ctx, viewportWindow);
    this.renderOverlay(ctx);

    this.lastMetrics = {
      liveNodeCount: itemMetrics.liveNodeCount,
      createdCount: itemMetrics.createdCount,
      removedCount: itemMetrics.removedCount,
    };
    log.debug('diff_render_complete', {
      live_node_count: this.lastMetrics.liveNodeCount,
      created_count: itemMetrics.createdCount,
      removed_count: itemMetrics.removedCount,
      total_item_count: this.itemById.size,
      dependency_node_count: this.dependencyLayer.mountedCount,
    });
    this.afterRenderCallback?.(this.lastMetrics);
  }

  /**
   * Redraw the whole screen-space overlay (ADR-004): rounded-box enclosures,
   * illuminated line, today line, dual cursors, cursor guide, comment leaders,
   * watermark and the fixed date ruler. Cleared and rebuilt each frame; the layers
   * are invoked in the FIXED z-order below (each appends to the overlay group), so
   * the DOM order matches the pre-split renderer exactly.
   */
  private renderOverlay(ctx: RenderContext): void {
    while (this.overlayGroup.firstChild !== null) {
      this.overlayGroup.removeChild(this.overlayGroup.firstChild);
    }
    if (this.scheduleDocument === null) {
      return;
    }
    this.roundedBoxLayer.render(ctx);
    this.progressTodayLayer.renderProgressLine(ctx);
    this.progressTodayLayer.renderTodayLine(ctx);
    this.cursorGuideLayer.renderDualCursor(ctx);
    this.cursorGuideLayer.renderGuide(ctx);
    this.commentLayer.render(ctx);
    this.watermarkLayer.render(ctx);
    // The fixed date ruler is drawn LAST so it stays on top of the top strip; it
    // is pinned to y = 0 (fixed on vertical scroll) yet maps world x so it scrolls
    // and zooms horizontally with the timeline (item25/26/50).
    this.rulerLayer.render(ctx);
  }

  /**
   * Whether a screen-space rectangle intersects the visible schedule viewport
   * (the canvas minus the frozen left pane). Off-viewport overlay annotations are
   * culled with this so their draw cost tracks the visible set, matching item
   * virtualization (M-02). A small margin keeps partially-clipped decorations.
   */
  private screenRectVisible(x: number, y: number, width: number, height: number): boolean {
    const margin = 32;
    const left = this.getLeftPaneWidth() - margin;
    const right = this.canvasSize.widthPx + margin;
    const top = -margin;
    const bottom = this.canvasSize.heightPx + margin;
    return x + width >= left && x <= right && y + height >= top && y <= bottom;
  }

  /**
   * Set (or clear with null) the selected dependency line and redraw its highlight
   * (item 1). Selecting a line is mutually exclusive with item / annotation
   * selection; the caller clears the other sides.
   *
   * @param dependencyId - The selected dependency id, or null.
   */
  public setSelectedDependency(dependencyId: string | null): void {
    if (this.selectedDependencyId === dependencyId) {
      return;
    }
    this.selectedDependencyId = dependencyId;
    this.requestRender();
  }

  /** The currently selected dependency line id, or null. */
  public getSelectedDependencyId(): string | null {
    return this.selectedDependencyId;
  }

  /**
   * Hit-test the dependency lines at a screen point (item 1). Recomputes each
   * visible line's route in world space (same router the renderer draws with) and
   * returns the id of the nearest line within the grab tolerance of the pointer, or
   * null. The content group is only translated (never scaled), so world px == screen
   * px and the tolerance is a real on-screen grab zone.
   *
   * @param screenX - Client x.
   * @param screenY - Client y.
   * @returns The hit dependency id, or null.
   */
  public hitTestDependency(screenX: number, screenY: number): string | null {
    return this.hitTester.hitTestDependency(this.buildContext(), screenX, screenY);
  }

  private clearMountedNodes(): void {
    this.itemLayer.clear();
    this.dependencyLayer.clear();
  }

  private attachInputHandlers(host: HTMLElement): void {
    host.addEventListener('wheel', (event) => this.handleWheel(event), { passive: false });

    let panPointerId: number | null = null;
    let lastClientX = 0;
    let lastClientY = 0;

    host.addEventListener('pointerdown', (event) => {
      // Panning is now an EXPLICIT gesture: Ctrl/Cmd + drag, or a middle-button
      // drag (fix 3 + fix 4). A plain left-drag on empty canvas no longer scrolls
      // -- it deselects (handled by the editing controller) or does nothing -- so
      // the user can drag freely without the schedule sliding away.
      const wantsPan = event.button === 1 || event.ctrlKey || event.metaKey;
      if (!wantsPan) {
        return;
      }
      // Pan only from the schedule surface itself. Presses that originate on an
      // overlay control (left-pane hide / re-show / ▲▼ reorder buttons, tool
      // palette, toolbar, form fields) must reach that control: capturing the
      // pointer here would retarget pointerup and swallow the control's native
      // click, leaving those buttons operable by keyboard only (F-01).
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          'button, input, select, textarea, a[href], [role="toolbar"], [data-role="left-classification-pane"]',
        ) !== null
      ) {
        return;
      }
      panPointerId = event.pointerId;
      lastClientX = event.clientX;
      lastClientY = event.clientY;
      host.setPointerCapture(event.pointerId);
      // A grabbing (closed-hand) cursor signals the active pan (fix 4). The idle
      // canvas keeps its default arrow; `grab` (open hand) stays reserved for the
      // palette drag handle.
      host.style.cursor = 'grabbing';
      event.preventDefault();
    });
    host.addEventListener('pointermove', (event) => {
      if (panPointerId !== event.pointerId) {
        return;
      }
      const deltaX = event.clientX - lastClientX;
      const deltaY = event.clientY - lastClientY;
      lastClientX = event.clientX;
      lastClientY = event.clientY;
      this.setViewState({
        ...this.viewState,
        scrollX: this.viewState.scrollX - deltaX,
        scrollY: this.viewState.scrollY - deltaY,
      });
    });
    const endPan = (event: PointerEvent): void => {
      if (panPointerId === event.pointerId) {
        panPointerId = null;
        host.style.cursor = 'default';
      }
    };
    host.addEventListener('pointerup', endPan);
    host.addEventListener('pointercancel', endPan);

    // Track the live pointer position for the pointer-following cursor guide
    // (items 9-12). Kept as raw client coordinates; renderCursorGuide maps them into
    // the SVG's screen box. Only re-render when a guide mode is active so an idle
    // canvas is not repainted on every mouse move.
    host.addEventListener('pointermove', (event) => {
      this.pointerClient = { clientX: event.clientX, clientY: event.clientY };
      if ((this.viewState.cursorGuideMode ?? 'none') !== 'none') {
        this.requestRender();
      }
    });
    host.addEventListener('pointerleave', () => {
      if (this.pointerClient !== null) {
        this.pointerClient = null;
        if ((this.viewState.cursorGuideMode ?? 'none') !== 'none') {
          this.requestRender();
        }
      }
    });

    // Default canvas cursor is a normal arrow; the editing controller applies
    // contextual cursors on hover (col-resize on task edges, crosshair in
    // link/create modes).
    host.style.cursor = 'default';
  }

  private handleWheel(event: WheelEvent): void {
    // Always own the wheel so the page never scrolls under the app (item50).
    event.preventDefault();
    const mode = resolveWheelMode(event);

    // Scroll modes: plain wheel pans vertically, Ctrl+Shift pans horizontally.
    // Most mice report only deltaY, so a horizontal pan uses deltaY as the amount.
    if (mode === 'scroll-vertical') {
      this.setViewState({
        ...this.viewState,
        scrollY: Math.max(0, this.viewState.scrollY + event.deltaY),
      });
      return;
    }
    if (mode === 'scroll-horizontal') {
      const amount = event.deltaX !== 0 ? event.deltaX : event.deltaY;
      // setViewState clamps scrollX into the timeline range [2000, 2100], so the
      // user can pan back before the epoch to the year 2000.
      this.setViewState({
        ...this.viewState,
        scrollX: this.viewState.scrollX + amount,
      });
      return;
    }

    // Zoom modes: pointer-centered so the world point under the cursor stays put
    // (fix 5). The cursor's world position is measured in SCHEDULE-LOCAL space --
    // the pointer minus the frozen left-pane width (x) and the ruler top offset
    // (y) -- because that is the origin the content transform scales about. Using
    // the raw pointer offset (as before) anchored to the wrong point, so the row /
    // section under the cursor jumped out of view when zooming.
    const rect = this.svg.getBoundingClientRect();
    const localX = event.clientX - rect.left - this.getLeftPaneWidth();
    const localY = event.clientY - rect.top - this.getContentTopOffsetPx();
    const zoomFactor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    const zoomTimeAxis = mode === 'zoom-both' || mode === 'zoom-x';
    const zoomRowAxis = mode === 'zoom-both' || mode === 'zoom-y';

    let nextZoomX = this.viewState.zoomX;
    let nextScrollX = this.viewState.scrollX;
    if (zoomTimeAxis) {
      nextZoomX = clampZoom(this.viewState.zoomX * zoomFactor);
      const ratioX = nextZoomX / this.viewState.zoomX;
      const worldX = this.viewState.scrollX + localX;
      nextScrollX = worldX * ratioX - localX;
    }

    let nextZoomY = this.viewState.zoomY;
    let nextScrollY = this.viewState.scrollY;
    if (zoomRowAxis) {
      nextZoomY = clampZoom(this.viewState.zoomY * zoomFactor);
      const ratioY = nextZoomY / this.viewState.zoomY;
      const worldY = this.viewState.scrollY + localY;
      nextScrollY = worldY * ratioY - localY;
    }

    this.setViewState({
      ...this.viewState,
      zoomX: nextZoomX,
      zoomY: nextZoomY,
      scrollX: nextScrollX,
      scrollY: nextScrollY,
    });
    log.debug('wheel_zoom', {
      wheel_mode: mode,
      pixels_per_day: pixelsPerDay(nextZoomX),
      zoom_x: nextZoomX,
      zoom_y: nextZoomY,
    });
  }
}

/** Clamp a zoom multiplier to a sane operating range. */
function clampZoom(zoom: number): number {
  return Math.min(64, Math.max(0.02, zoom));
}

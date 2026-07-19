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
 * screen-space-fixed overlay group (for future zoom-invariant decorations such
 * as arrow heads / watermark, ADR-004) is created but left as a stub for M1.
 */

import type {
  CanvasSize,
  Dependency,
  IsoDate,
  Row,
  ScheduleDocument,
  ScheduleItem,
  ViewState,
} from '../../domain/model/schedule-model.js';
import {
  DEFAULT_DEPENDENCY_LINE_COLOR,
  DEFAULT_PROGRESS_LINE_COLOR,
} from '../../domain/model/schedule-model.js';
import {
  effectiveMilestoneShape,
  effectiveTaskShape,
  taskGlyphPath,
  taskShapeIsStroked,
  taskShapeUsesPath,
} from '../../domain/usecase/task-glyph.js';
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
import { lodThreshold } from '../../domain/usecase/lod-selector.js';
import {
  fadePointsToAttribute,
  fadeTrapezoidPoints,
  hasFade,
  type FadePoint,
} from '../../domain/usecase/fade-geometry.js';
import {
  computeFitViewForItems,
  computeViewportWindow,
  placementIntersectsWindow,
  type ViewportWindow,
} from '../../domain/usecase/viewport.js';
import {
  clampTimelineScrollX,
  dateToWorldX,
  fromDayNumber,
  pixelsPerDay,
  toDayNumber,
} from '../../domain/usecase/time-coordinate-mapper.js';
import { displayFillColor } from '../../domain/usecase/plan-actual-colors.js';
import {
  orderedVisibleRows,
  type SectionBand,
} from '../../domain/usecase/section-organizer.js';
import {
  classificationCollapseLevel,
  collapseRows,
  contiguousSectionBands,
} from '../../domain/usecase/classification-tree.js';
import {
  routeDependency,
  type Point,
  type Rect,
} from '../../domain/usecase/dependency-router.js';
import { resolveLeftPaneWidth } from '../../domain/usecase/left-pane-layout.js';
import {
  buildIlluminatedLine,
  collectPreviousPlanGhosts,
  filterByPlanActualDisplay,
  type RowProgressFront,
} from '../../domain/usecase/progress-line-builder.js';
import {
  cursorScreenX,
  cursorSpanDays,
  roundedBoxScreenRect,
} from '../../domain/usecase/cursor-span.js';
import { isRoundedBox } from '../../domain/model/annotation.js';
import type {
  Annotation,
  CommentAnnotation,
  RoundedBoxAnnotation,
} from '../../domain/model/annotation.js';
import { buildDateRuler, rulerTierCount } from '../../domain/usecase/date-ruler.js';
import { resolveWheelMode } from '../input/wheel-mode.js';
import { pickItemHit, type HitCandidate } from '../../domain/usecase/edge-hit.js';
import type { CursorMode, CursorGuideMode } from '../../domain/model/schedule-model.js';
import { DOUBLE_VERTICAL_GUIDE_OFFSET_PX } from '../../domain/model/schedule-model.js';
import { buildWatermarkLayer } from '../../domain/usecase/watermark-builder.js';
import { itemAccessibleName } from '../../domain/usecase/accessible-name.js';
import {
  FOCUS_RING_DASH_ARRAY,
  FOCUS_RING_HEX,
  FOCUS_RING_STROKE_WIDTH,
  SELECTION_DASH_ARRAY,
} from '../../domain/usecase/a11y-tokens.js';
import { uiLabel } from '../../domain/usecase/i18n.js';
import { createLogger } from '../../app/logger.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const log = createLogger('grsch:render');

/** Font pixel size per font-scale step. */
const FONT_SIZE_BY_SCALE: Record<ViewState['fontScale'], number> = { S: 10, M: 12, L: 14 };

/** Snapshot of the most recent render, used by the benchmark harness. */
export interface RenderMetrics {
  /** Number of item DOM nodes currently mounted (the virtualized set size). */
  readonly liveNodeCount: number;
  /** Nodes created during the last diff. */
  readonly createdCount: number;
  /** Nodes removed during the last diff. */
  readonly removedCount: number;
}

interface MountedItem {
  readonly group: SVGGElement;
  /**
   * The glyph element. A milestone is a `path`; a task is a `rect` when it has no
   * fade (identical to the pre-fade rendering) and a `polygon` when it tapers. It
   * is swapped in place by {@link SvgRenderer.ensureTaskGlyphElement} when a task's
   * fade turns on or off, so a bar keeps exactly one glyph node.
   */
  shape: SVGElement;
  readonly label: SVGTextElement;
  /** Accessible-name `<title>` child (WCAG 1.1.1 / 4.1.2). */
  readonly title: SVGTitleElement;
  /** Lazily created dashed selection outline, present only while selected. */
  selectionOutline: SVGRectElement | null;
  /** Lazily created solid keyboard-focus ring, present only while focused (2.4.7). */
  focusRing: SVGRectElement | null;
  /** Fade-in (top-left) corner drag handle, present only for a selected task. */
  fadeInHandle: SVGRectElement | null;
  /** Fade-out (bottom-right) corner drag handle, present only for a selected task. */
  fadeOutHandle: SVGRectElement | null;
}

/** A hit against a rendered item, with the sub-region under the pointer. */
export interface ItemHit {
  readonly itemId: string;
  /** Which part of the item was hit (drives move vs resize vs label drag vs fade). */
  readonly region: 'body' | 'resize-start' | 'resize-end' | 'label' | 'fade-in' | 'fade-out';
}

/** World-space point (content coordinates, before the scroll translate). */
export interface WorldPoint {
  readonly worldX: number;
  readonly worldY: number;
}

/**
 * Screen-pixel half-width within which a task edge counts as a resize handle. The
 * content group is only translated (never scaled), so world px == screen px and
 * this is a real on-screen grab zone. Widened from the original hair-thin value so
 * the edge is actually grabbable and takes precedence over a move (interaction
 * hardening, ITEM-L1-004).
 */
const RESIZE_HANDLE_PX = 9;

/** Screen-pixel HALF-extent of a rounded-box corner grab zone (hit tolerance). */
const ANNOTATION_HANDLE_PX = 9;

/**
 * Screen-pixel HALF-extent of the DRAWN corner handle square (side = 2x this).
 * Halved from the original 9 (18px square) to 4.5 (9px square) so the handles are
 * a discreet marker, not the oversized blocks the user reported; the larger
 * {@link ANNOTATION_HANDLE_PX} grab tolerance keeps them easy to grab.
 */
const ANNOTATION_HANDLE_DRAW_HALF_PX = 4.5;

/** Screen-pixel tolerance for grabbing a rounded-box border to select it. */
const ANNOTATION_BORDER_TOLERANCE_PX = 7;

/** Height in CSS pixels of one date-ruler tier band. */
const RULER_TIER_HEIGHT_PX = 16;

/**
 * Faint gridline stroke color + opacity (fix 5). "As faint as barely visible": a
 * dark hairline at ~0.08 alpha reads as a subtle grid on the white canvas without
 * competing with items. Decorative only (the group is aria-hidden).
 */
const GRID_LINE_STROKE = '#1e293b';
const GRID_LINE_OPACITY = '0.08';
const GRID_LINE_WIDTH = '1';

/** A resolved hit against a canvas annotation (rounded-box / comment). */
export interface AnnotationHit {
  readonly annotationId: string;
  /** Which part was hit: the body (select/move) or a specific corner handle. */
  readonly region: 'body' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se';
}

/** Id of the shared minimal dependency arrowhead marker (DEP-L1-004). */
const DEP_ARROW_MARKER_ID = 'grsch-dep-arrow';

/**
 * Screen-pixel tolerance within which a click counts as landing on a dependency
 * line (item 1). Wide enough that the thin (1.4px) line is comfortably grabbable.
 */
const DEP_HIT_TOLERANCE_PX = 6;

/** A mounted dependency line: the path plus the id it was routed for. */
interface MountedDependency {
  readonly path: SVGPathElement;
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
  private readonly mountedById = new Map<string, MountedItem>();
  private readonly itemById = new Map<string, ScheduleItem>();

  private readonly gridGroup: SVGGElement;
  private readonly classificationGroup: SVGGElement;
  private readonly ghostGroup: SVGGElement;
  private readonly depGroup: SVGGElement;
  private readonly depMountedById = new Map<string, MountedDependency>();

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
    this.svg.style.background = '#ffffff';

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

    this.viewState = { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' };
    // Apply the localized canvas name now that the view state exists (4.1.2).
    this.applyCanvasAria();
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
    return {
      worldX: screenX - rect.left - this.getLeftPaneWidth() + this.viewState.scrollX,
      worldY: screenY - rect.top - this.getContentTopOffsetPx() + this.viewState.scrollY,
    };
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
    return {
      screenX: rect.left + worldX + this.getLeftPaneWidth() - this.viewState.scrollX,
      screenY: rect.top + worldY + this.getContentTopOffsetPx() - this.viewState.scrollY,
    };
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
    const point = this.screenToWorld(screenX, screenY);
    const fontSize = FONT_SIZE_BY_SCALE[this.viewState.fontScale];

    // Fade corner handles on a SELECTED task win first: they are small, on top of
    // the glyph, and their gesture (set fade-in/out) must take precedence over the
    // move/resize-edge under the same corner.
    const fadeHit = this.hitTestFadeHandle(point.worldX, point.worldY);
    if (fadeHit !== null) {
      return fadeHit;
    }

    // Collect every mounted item whose BAR BODY contains the pointer, then resolve
    // the grab with a shared, tested rule: task EDGE zones take precedence over a body
    // (move), and the SELECTED bar (then the topmost lane) wins under overlap, so
    // stacked plan/actual bars no longer hide each other's resize edges. This is
    // checked BEFORE labels so that a point clearly inside a bar resizes/moves that
    // bar rather than being stolen by ANOTHER item's long abbreviation label that
    // merely overlaps the bar (regression guard: a narrow task under a milestone's
    // wide label must still be edge-resizable).
    const candidates: HitCandidate[] = [];
    for (const placement of this.placements) {
      if (!this.mountedById.has(placement.itemId)) {
        continue;
      }
      const withinX =
        point.worldX >= placement.worldX && point.worldX <= placement.worldX + placement.worldWidth;
      const withinY =
        point.worldY >= placement.worldY && point.worldY <= placement.worldY + placement.worldHeight;
      if (!withinX || !withinY) {
        continue;
      }
      const item = this.itemById.get(placement.itemId);
      candidates.push({
        itemId: placement.itemId,
        laneIndex: placement.laneIndex,
        worldLeft: placement.worldX,
        worldWidth: placement.worldWidth,
        isTask: item?.itemKind === 'task',
        isSelected: this.selectedItemIds.has(placement.itemId),
      });
    }
    const bodyHit = pickItemHit(candidates, point.worldX, RESIZE_HANDLE_PX);
    if (bodyHit !== null) {
      return bodyHit;
    }

    // Labels can sit OUTSIDE the glyph, so fall back to them only when the pointer is
    // not inside any bar body (they win ties among themselves by document order).
    for (const placement of this.placements) {
      if (!this.mountedById.has(placement.itemId)) {
        continue;
      }
      const item = this.itemById.get(placement.itemId);
      if (item === undefined || item.abbrev.length === 0) {
        continue;
      }
      if (pointInLabelBox(item, placement, fontSize, point.worldX, point.worldY)) {
        return { itemId: placement.itemId, region: 'label' };
      }
    }
    return null;
  }

  /**
   * Hit-test the fade corner handles of the currently selected tasks at a world
   * point. Returns a `fade-in` / `fade-out` hit when the point is within the grab
   * tolerance of a selected task's top-left / bottom-right vertex, else null. Only
   * selected tasks draw handles, so only they are corner-grabbable.
   */
  private hitTestFadeHandle(worldX: number, worldY: number): ItemHit | null {
    const tolerance = ANNOTATION_HANDLE_PX;
    for (const placement of this.placements) {
      if (!this.mountedById.has(placement.itemId) || !this.selectedItemIds.has(placement.itemId)) {
        continue;
      }
      const item = this.itemById.get(placement.itemId);
      if (item === undefined || item.itemKind !== 'task') {
        continue;
      }
      // Bound the VERTICAL grab tolerance to a fraction of the bar height so a SHORT
      // bar (e.g. at a small zoomY once tall multi-lane rows shrink the Fit zoom) does
      // not let the bottom-right fade corner swallow the mid-height resize edge -- the
      // fade corner then only wins genuinely near the corner, leaving the edge for
      // resize. A normal-height bar keeps the full tolerance.
      const verticalTolerance = Math.min(tolerance, placement.worldHeight * 0.4);
      const centers = this.taskFadeHandleCenters(item, placement);
      if (
        Math.abs(worldX - centers.fadeIn.x) <= tolerance &&
        Math.abs(worldY - centers.fadeIn.y) <= verticalTolerance
      ) {
        return { itemId: placement.itemId, region: 'fade-in' };
      }
      if (
        Math.abs(worldX - centers.fadeOut.x) <= tolerance &&
        Math.abs(worldY - centers.fadeOut.y) <= verticalTolerance
      ) {
        return { itemId: placement.itemId, region: 'fade-out' };
      }
    }
    return null;
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
    if (this.scheduleDocument === null) {
      return null;
    }
    const rect = this.svg.getBoundingClientRect();
    const localX = screenX - rect.left;
    const localY = screenY - rect.top;
    const epoch = this.scheduleDocument.epochDate;
    const annotations = this.scheduleDocument.annotations ?? [];

    // First, a corner handle on the currently selected rounded box (handles are
    // only drawn for it, so only it is corner-resizable).
    if (this.selectedAnnotationId !== null) {
      const selected = annotations.find((a) => a.id === this.selectedAnnotationId);
      if (selected !== undefined && isRoundedBox(selected)) {
        const handle = this.roundedBoxHandleAt(selected, epoch, localX, localY);
        if (handle !== null) {
          return { annotationId: selected.id, region: handle };
        }
      }
    }

    // Then a body hit, topmost (last drawn) first.
    for (let index = annotations.length - 1; index >= 0; index -= 1) {
      const annotation = annotations[index];
      if (annotation === undefined) {
        continue;
      }
      if (this.annotationBodyHit(annotation, epoch, localX, localY)) {
        return { annotationId: annotation.id, region: 'body' };
      }
    }
    return null;
  }

  /** The corner-handle region of a rounded box at a local point, or null. */
  private roundedBoxHandleAt(
    box: RoundedBoxAnnotation,
    epoch: IsoDate,
    localX: number,
    localY: number,
  ): AnnotationHit['region'] | null {
    const geometry = roundedBoxScreenRect(
      box,
      epoch,
      this.viewState,
      this.getContentTopOffsetPx(),
      (rowIndex) => this.rowBoundary(rowIndex),
    );
    const half = ANNOTATION_HANDLE_PX;
    const corners: Array<{ x: number; y: number; region: AnnotationHit['region'] }> = [
      { x: geometry.x, y: geometry.y, region: 'resize-nw' },
      { x: geometry.x + geometry.width, y: geometry.y, region: 'resize-ne' },
      { x: geometry.x, y: geometry.y + geometry.height, region: 'resize-sw' },
      { x: geometry.x + geometry.width, y: geometry.y + geometry.height, region: 'resize-se' },
    ];
    for (const corner of corners) {
      if (Math.abs(localX - corner.x) <= half && Math.abs(localY - corner.y) <= half) {
        return corner.region;
      }
    }
    return null;
  }

  /** Whether a local point is on an annotation's border/interior (select zone). */
  private annotationBodyHit(
    annotation: Annotation,
    epoch: IsoDate,
    localX: number,
    localY: number,
  ): boolean {
    if (isRoundedBox(annotation)) {
      // Pass the content top offset so the hit rectangle matches where the box is
      // actually DRAWN (renderRoundedBoxes uses the same offset). Omitting it made
      // the selectable region sit one ruler-height above the visible box
      // (calibration fix, fix 1).
      const geometry = roundedBoxScreenRect(
        annotation,
        epoch,
        this.viewState,
        this.getContentTopOffsetPx(),
        (rowIndex) => this.rowBoundary(rowIndex),
      );
      const tolerance = ANNOTATION_BORDER_TOLERANCE_PX;
      const insideX = localX >= geometry.x - tolerance && localX <= geometry.x + geometry.width + tolerance;
      const insideY = localY >= geometry.y - tolerance && localY <= geometry.y + geometry.height + tolerance;
      if (!insideX || !insideY) {
        return false;
      }
      // Border-band OR interior: the whole enclosed rectangle selects it (items are
      // hit-tested first, so an item inside the box still wins).
      return true;
    }
    // Comment: hit-test the text body box.
    const body = this.commentBodyRect(annotation, epoch);
    return (
      localX >= body.x && localX <= body.x + body.width && localY >= body.y && localY <= body.y + body.height
    );
  }

  /** Screen-space bounding box of a comment's text body (for hit-testing/select). */
  private commentBodyRect(
    comment: CommentAnnotation,
    epoch: IsoDate,
  ): { x: number; y: number; width: number; height: number } {
    const anchorWorldX = dateToWorldX(comment.anchorDate, epoch, this.viewState.zoomX);
    const rowBand = this.rowTop(comment.anchorRowIndex);
    const anchorX = this.worldToScreenX(anchorWorldX);
    const anchorY = this.worldToScreenY(rowBand + this.rowHeight(comment.anchorRowIndex) / 2);
    const bodyX = anchorX + comment.bodyOffsetPx.dx;
    const bodyY = anchorY + comment.bodyOffsetPx.dy;
    const width = Math.max(24, comment.text.length * 7 + 10);
    const height = 20;
    return { x: bodyX, y: bodyY - height / 2, width, height };
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
      rect.setAttribute('stroke', '#0072b2');
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
      rect.setAttribute('stroke', '#0072b2');
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
      path.setAttribute('stroke', '#8452b3');
      path.setAttribute('stroke-width', '1.4');
      path.setAttribute('stroke-dasharray', '4 3');
      path.setAttribute('pointer-events', 'none');
      this.contentGroup.appendChild(path);
      this.dependencyPreviewLine = path;
    }
    const data = worldPoints
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
    this.dependencyPreviewLine.setAttribute('d', data);
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
      line.setAttribute('stroke', '#e69f00');
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
    const effectiveZoom = Math.min(this.viewState.zoomX, this.viewState.zoomY);
    const threshold = lodThreshold(effectiveZoom);
    const fontSize = FONT_SIZE_BY_SCALE[this.viewState.fontScale];

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

    this.renderGrid(viewportWindow);
    this.renderClassificationLines(viewportWindow);
    this.renderPreviousPlanGhosts(viewportWindow);

    // Plan/actual display filter (PLAN-L1-002): drop the hidden side entirely.
    const visibleItemIds = new Set(
      filterByPlanActualDisplay(
        this.scheduleDocument?.items ?? [],
        this.viewState.planActualDisplay,
      ).map((item) => item.id),
    );

    const desiredIds = new Set<string>();
    let createdCount = 0;

    for (const placement of this.placements) {
      const item = this.itemById.get(placement.itemId);
      if (item === undefined || item.importance < threshold) {
        continue;
      }
      if (!visibleItemIds.has(placement.itemId)) {
        continue;
      }
      if (!placementIntersectsWindow(placement, viewportWindow)) {
        continue;
      }
      desiredIds.add(placement.itemId);

      let mounted = this.mountedById.get(placement.itemId);
      if (mounted === undefined) {
        mounted = this.createItemNode(item);
        this.mountedById.set(placement.itemId, mounted);
        this.contentGroup.appendChild(mounted.group);
        createdCount += 1;
      }
      this.patchItemNode(mounted, item, placement, fontSize);
    }

    let removedCount = 0;
    for (const [itemId, mounted] of this.mountedById) {
      if (!desiredIds.has(itemId)) {
        mounted.group.remove();
        this.mountedById.delete(itemId);
        removedCount += 1;
      }
    }

    this.renderDependencies(viewportWindow);
    this.renderOverlay();

    this.lastMetrics = {
      liveNodeCount: this.mountedById.size,
      createdCount,
      removedCount,
    };
    log.debug('diff_render_complete', {
      live_node_count: this.lastMetrics.liveNodeCount,
      created_count: createdCount,
      removed_count: removedCount,
      total_item_count: this.itemById.size,
      dependency_node_count: this.depMountedById.size,
    });
    this.afterRenderCallback?.(this.lastMetrics);
  }

  /**
   * Draw the faint decorative gridlines behind everything (fix 5): VERTICAL lines at
   * the current LOD date ticks and HORIZONTAL lines at every category (middle/minor)
   * row boundary. Both default ON (absent flag treated as visible) and are togglable
   * via the palette. Bounded by the visible tick/row count so it never threatens the
   * 60fps target; aria-hidden decorative content only.
   */
  private renderGrid(window: ViewportWindow): void {
    while (this.gridGroup.firstChild !== null) {
      this.gridGroup.removeChild(this.gridGroup.firstChild);
    }
    if (this.scheduleDocument === null) {
      return;
    }
    if (this.viewState.gridDateLinesVisible !== false) {
      this.renderDateGridlines(window);
    }
    if (this.viewState.gridCategoryLinesVisible !== false) {
      this.renderCategoryGridlines(window);
    }
  }

  /** Append one faint gridline to the grid group. */
  private appendGridLine(x1: number, y1: number, x2: number, y2: number): void {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2));
    line.setAttribute('stroke', GRID_LINE_STROKE);
    line.setAttribute('stroke-opacity', GRID_LINE_OPACITY);
    line.setAttribute('stroke-width', GRID_LINE_WIDTH);
    this.gridGroup.appendChild(line);
  }

  /**
   * Faint VERTICAL hairlines at the finest visible date-ruler boundaries (year /
   * month / day, matching the current LOD), so the timeline reads as a grid. The
   * ruler cells are computed in screen space; each boundary is mapped back to world
   * x (the grid group is inside the scrolled content group) so the lines track zoom
   * and pan exactly and align with the ruler ticks above.
   */
  private renderDateGridlines(window: ViewportWindow): void {
    if (this.scheduleDocument === null) {
      return;
    }
    const leftPaneWidth = this.getLeftPaneWidth();
    const scheduleWidth = Math.max(0, this.canvasSize.widthPx - leftPaneWidth);
    const ruler = buildDateRuler(this.scheduleDocument.epochDate, this.viewState, scheduleWidth);
    const finestTier = ruler.tiers[ruler.tiers.length - 1];
    if (finestTier === undefined) {
      return;
    }
    for (const cell of finestTier.cells) {
      // Screen x -> world x: screen = world - scrollX + leftPaneWidth.
      const worldX = cell.startScreenX + this.viewState.scrollX - leftPaneWidth;
      this.appendGridLine(worldX, window.worldTop, worldX, window.worldBottom);
    }
  }

  /**
   * Faint HORIZONTAL hairlines at every display-row boundary. Each visible display
   * row is a leaf at the current vertical LOD, so a line at every row top draws the
   * middle/minor category boundaries as a grid. Bounded by the visible row count.
   */
  private renderCategoryGridlines(window: ViewportWindow): void {
    const rowCount = this.displayRows.length;
    for (let rowIndex = 0; rowIndex <= rowCount; rowIndex += 1) {
      // Boundary y between rows follows variable row heights (multi-lane stacking):
      // boundary(0) = top, boundary(rowCount) = bottom of the last (possibly tall) row.
      const worldY = this.rowBoundary(rowIndex);
      if (worldY < window.worldTop || worldY > window.worldBottom) {
        continue;
      }
      this.appendGridLine(window.worldLeft, worldY, window.worldRight, worldY);
    }
  }

  /**
   * Draw one thin horizontal classification line at the top of each visible
   * section band (SECT-L1-001). The line spans only the visible width so it never
   * costs more than a handful of nodes regardless of the total schedule extent.
   */
  private renderClassificationLines(window: ViewportWindow): void {
    while (this.classificationGroup.firstChild !== null) {
      this.classificationGroup.removeChild(this.classificationGroup.firstChild);
    }
    for (const band of this.sectionBands) {
      const worldY = this.rowBoundary(band.startRowIndex);
      if (worldY < window.worldTop || worldY > window.worldBottom) {
        continue;
      }
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', String(window.worldLeft));
      line.setAttribute('x2', String(window.worldRight));
      line.setAttribute('y1', String(worldY));
      line.setAttribute('y2', String(worldY));
      line.setAttribute('stroke', '#c3c8d0');
      line.setAttribute('stroke-width', '1.5');
      this.classificationGroup.appendChild(line);
    }
  }

  /**
   * Draw the pre-change plan of each changed item as a grayed ghost bar in world
   * space, behind the live glyphs (PLAN-L1-004). Only ghosts for items that still
   * have a current placement and intersect the viewport are drawn, so the ghost
   * node count stays bounded by the visible edited set.
   */
  private renderPreviousPlanGhosts(window: ViewportWindow): void {
    while (this.ghostGroup.firstChild !== null) {
      this.ghostGroup.removeChild(this.ghostGroup.firstChild);
    }
    if (this.scheduleDocument === null) {
      return;
    }
    const epoch = this.scheduleDocument.epochDate;
    const zoomX = this.viewState.zoomX;
    for (const ghost of collectPreviousPlanGhosts(this.scheduleDocument.items)) {
      const placement = this.placementById.get(ghost.itemId);
      if (placement === undefined) {
        continue; // current item culled (collapsed/filtered): drop its ghost too.
      }
      const startX = dateToWorldX(ghost.startDate, epoch, zoomX);
      const endX = dateToWorldX(ghost.endDate ?? ghost.startDate, epoch, zoomX);
      const width = Math.max(6, endX - startX);
      if (startX + width < window.worldLeft || startX > window.worldRight) {
        continue;
      }
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(startX));
      rect.setAttribute('y', String(placement.worldY));
      rect.setAttribute('width', String(width));
      rect.setAttribute('height', String(placement.worldHeight));
      rect.setAttribute('rx', '2');
      rect.setAttribute('fill', '#c9c9c9');
      rect.setAttribute('fill-opacity', '0.55');
      rect.setAttribute('stroke', '#9a9a9a');
      rect.setAttribute('stroke-dasharray', '3 2');
      this.ghostGroup.appendChild(rect);
    }
  }

  /**
   * Redraw the whole screen-space overlay (ADR-004): today line, dual cursors,
   * illuminated line, rounded-box enclosures and comment leaders. Cleared and
   * rebuilt each frame; every element maps world -> screen so it tracks zoom/pan
   * while staying screen-space where the spec requires zoom-invariance
   * (CURS-L1-001/002/003, CURS-L2-001, PLAN-L1-003).
   */
  private renderOverlay(): void {
    while (this.overlayGroup.firstChild !== null) {
      this.overlayGroup.removeChild(this.overlayGroup.firstChild);
    }
    if (this.scheduleDocument === null) {
      return;
    }
    this.renderRoundedBoxes();
    this.renderIlluminatedLine();
    this.renderTodayLine();
    this.renderDualCursor();
    this.renderCursorGuide();
    this.renderComments();
    this.renderWatermark();
    // The fixed date ruler is drawn LAST so it stays on top of the top strip; it
    // is pinned to y = 0 (fixed on vertical scroll) yet maps world x so it scrolls
    // and zooms horizontally with the timeline (item25/26/50).
    this.renderDateRuler();
  }

  /**
   * Draw the fixed top date-ruler (item25/26/50). The tiers (year / year+month /
   * month+day+weekday) follow the current horizontal zoom via the ruler model. The
   * whole band is screen-space at the top of the canvas, so it stays visible on
   * vertical scroll while its cells track horizontal scroll/zoom.
   */
  private renderDateRuler(): void {
    if (this.scheduleDocument === null) {
      return;
    }
    const leftPaneWidth = this.getLeftPaneWidth();
    const scheduleWidth = Math.max(0, this.canvasSize.widthPx - leftPaneWidth);
    const ruler = buildDateRuler(this.scheduleDocument.epochDate, this.viewState, scheduleWidth);
    const totalHeight = ruler.tiers.length * RULER_TIER_HEIGHT_PX;
    if (totalHeight === 0) {
      return;
    }
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('data-role', 'date-ruler');
    group.setAttribute('data-granularity', ruler.granularity);
    // Expose the tier count so tests/AT can see the stacked-tier structure without
    // parsing geometry (item26: year-month / day / weekday at the finest zoom).
    group.setAttribute('data-tier-count', String(ruler.tiers.length));
    group.setAttribute('pointer-events', 'none');

    // Opaque background so the timeline scrolls UNDER the ruler like a Gantt header.
    const background = document.createElementNS(SVG_NS, 'rect');
    background.setAttribute('x', String(leftPaneWidth));
    background.setAttribute('y', '0');
    background.setAttribute('width', String(scheduleWidth));
    background.setAttribute('height', String(totalHeight));
    background.setAttribute('fill', '#eef1f5');
    background.setAttribute('stroke', 'none');
    group.appendChild(background);

    const rightEdge = leftPaneWidth + scheduleWidth;
    ruler.tiers.forEach((tier, tierIndex) => {
      const bandTop = tierIndex * RULER_TIER_HEIGHT_PX;
      const bandBottom = bandTop + RULER_TIER_HEIGHT_PX;
      for (const cell of tier.cells) {
        // Cull cells fully outside the schedule strip (bounded node count, M-02).
        if (cell.endScreenX < leftPaneWidth || cell.startScreenX > rightEdge) {
          continue;
        }
        // Density-aware LOD: the day / weekday tiers thin their labels to an empty
        // string when a day cell is too narrow to hold text. Skip drawing both the
        // separator and the label for those cells so the tier never overlaps.
        if (cell.label.length === 0) {
          continue;
        }
        const separator = document.createElementNS(SVG_NS, 'line');
        const separatorX = Math.max(leftPaneWidth, cell.startScreenX);
        separator.setAttribute('x1', String(separatorX));
        separator.setAttribute('x2', String(separatorX));
        separator.setAttribute('y1', String(bandTop));
        separator.setAttribute('y2', String(bandBottom));
        separator.setAttribute('stroke', '#c3c8d0');
        separator.setAttribute('stroke-width', '1');
        group.appendChild(separator);

        // Center the label within the visible portion of the cell.
        const visibleLeft = Math.max(leftPaneWidth, cell.startScreenX);
        const visibleRight = Math.min(rightEdge, cell.endScreenX);
        const label = document.createElementNS(SVG_NS, 'text');
        label.setAttribute('data-role', 'date-ruler-label');
        label.setAttribute('data-tier', String(tierIndex));
        label.setAttribute('data-unit', tier.unit);
        label.textContent = cell.label;
        label.setAttribute('x', String((visibleLeft + visibleRight) / 2));
        label.setAttribute('y', String(bandTop + RULER_TIER_HEIGHT_PX / 2));
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('dominant-baseline', 'middle');
        label.setAttribute('font-size', '10');
        label.setAttribute('font-family', 'system-ui, sans-serif');
        label.setAttribute('fill', '#2b2b2b');
        group.appendChild(label);
      }
      // Bottom border of the tier band.
      const border = document.createElementNS(SVG_NS, 'line');
      border.setAttribute('x1', String(leftPaneWidth));
      border.setAttribute('x2', String(rightEdge));
      border.setAttribute('y1', String(bandBottom));
      border.setAttribute('y2', String(bandBottom));
      border.setAttribute('stroke', '#a9b0ba');
      border.setAttribute('stroke-width', '1');
      group.appendChild(border);
    });

    this.overlayGroup.appendChild(group);
  }

  /**
   * Draw the diagonal tiled evidence watermark across the whole canvas in screen
   * space (TOOL-L1-007, TOOL-L2-002). Faint and non-interactive; uses the shared
   * builder so it matches the SVG export exactly. The user name is inserted via
   * `textContent`, so an XSS payload in the name becomes inert text (C-17).
   */
  private renderWatermark(): void {
    const watermark = this.viewState.watermark;
    if (watermark === undefined || !watermark.enabled) {
      return;
    }
    const layer = buildWatermarkLayer(
      { userName: watermark.userName, timestamp: watermark.timestamp },
      this.canvasSize.widthPx,
      this.canvasSize.heightPx,
    );
    if (layer.label.length === 0) {
      return;
    }
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('data-role', 'watermark');
    group.setAttribute('opacity', String(layer.opacity));
    group.setAttribute('pointer-events', 'none');
    for (const tile of layer.tiles) {
      const text = document.createElementNS(SVG_NS, 'text');
      text.textContent = layer.label; // inert: no markup interpretation (C-17).
      text.setAttribute('x', String(tile.x));
      text.setAttribute('y', String(tile.y));
      text.setAttribute('transform', `rotate(${tile.rotationDeg} ${tile.x} ${tile.y})`);
      text.setAttribute('font-size', String(layer.fontSizePx));
      text.setAttribute('fill', '#888888');
      group.appendChild(text);
    }
    this.overlayGroup.appendChild(group);
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

  /** Screen-space y of a world y under the current scroll + content top offset. */
  private worldToScreenY(worldY: number): number {
    return worldY - this.viewState.scrollY + this.getContentTopOffsetPx();
  }

  /** Screen-space x of a world x under the current scroll + frozen left pane. */
  private worldToScreenX(worldX: number): number {
    return worldX - this.viewState.scrollX + this.getLeftPaneWidth();
  }

  /** Draw the vertical today line across the schedule area (CURS-L1-001). */
  private renderTodayLine(): void {
    if (this.scheduleDocument === null || this.viewState.todayLineVisible !== true) {
      return;
    }
    const x = cursorScreenX(this.today, this.scheduleDocument.epochDate, this.viewState);
    if (x < this.getLeftPaneWidth() || x > this.canvasSize.widthPx) {
      return;
    }
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(x));
    line.setAttribute('x2', String(x));
    line.setAttribute('y1', '0');
    line.setAttribute('y2', String(this.canvasSize.heightPx));
    line.setAttribute('stroke', '#d55e00');
    line.setAttribute('stroke-width', '1.5');
    line.setAttribute('stroke-dasharray', '6 3');
    this.overlayGroup.appendChild(line);
  }

  /**
   * Draw the two measurement cursors and the day-count above the SECONDARY (差分)
   * marker (CURS-L1-002/003, mock feedback). Each cursor is a vertical line, plus
   * a horizontal line when in crosshair mode.
   */
  private renderDualCursor(): void {
    const cursor = this.viewState.dualCursor;
    if (this.scheduleDocument === null || cursor === undefined || cursor.visible !== true) {
      return;
    }
    const epoch = this.scheduleDocument.epochDate;
    const primaryX = cursorScreenX(cursor.primary.atDate, epoch, this.viewState);
    const secondaryX = cursorScreenX(cursor.secondary.atDate, epoch, this.viewState);
    this.drawCursorMarker(primaryX, cursor.primary.mode, '#0072b2');
    this.drawCursorMarker(secondaryX, cursor.secondary.mode, '#009e73');

    // Day-count above the secondary marker (signed base -> diff span).
    const spanDays = cursorSpanDays(cursor.primary.atDate, cursor.secondary.atDate);
    const label = document.createElementNS(SVG_NS, 'text');
    label.textContent = `${spanDays >= 0 ? '+' : ''}${spanDays}d`;
    label.setAttribute('x', String(secondaryX));
    label.setAttribute('y', '14');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '12');
    label.setAttribute('font-weight', '600');
    label.setAttribute('fill', '#009e73');
    this.overlayGroup.appendChild(label);
  }

  /** Draw one cursor's vertical line (+ horizontal line in crosshair mode). */
  private drawCursorMarker(screenX: number, mode: CursorMode, color: string): void {
    const vertical = document.createElementNS(SVG_NS, 'line');
    vertical.setAttribute('x1', String(screenX));
    vertical.setAttribute('x2', String(screenX));
    vertical.setAttribute('y1', '0');
    vertical.setAttribute('y2', String(this.canvasSize.heightPx));
    vertical.setAttribute('stroke', color);
    vertical.setAttribute('stroke-width', '1.2');
    this.overlayGroup.appendChild(vertical);
    if (mode === 'crosshair') {
      const midY = this.canvasSize.heightPx / 2;
      const horizontal = document.createElementNS(SVG_NS, 'line');
      horizontal.setAttribute('x1', String(this.getLeftPaneWidth()));
      horizontal.setAttribute('x2', String(this.canvasSize.widthPx));
      horizontal.setAttribute('y1', String(midY));
      horizontal.setAttribute('y2', String(midY));
      horizontal.setAttribute('stroke', color);
      horizontal.setAttribute('stroke-width', '1.2');
      horizontal.setAttribute('stroke-dasharray', '2 2');
      this.overlayGroup.appendChild(horizontal);
    }
  }

  /**
   * Draw the pointer-following measurement GUIDE (items 9-12), one of four exclusive
   * modes selected in {@link ViewState.cursorGuideMode}:
   *
   * - `none`            -- nothing drawn.
   * - `crosshair`       -- one vertical + one horizontal line through the pointer.
   * - `single-vertical` -- one vertical line at the pointer.
   * - `double-vertical` -- two vertical lines (pointer + a fixed screen offset).
   *
   * The lines are placed from the LIVE pointer client position mapped into the SVG's
   * own coordinate box (`clientX - rect.left`), which is the same screen space the
   * overlay group is drawn in -- fixing the earlier bug where the guide used a
   * world/offset coordinate and never appeared. Nothing is drawn while the pointer is
   * off-canvas or over the frozen left pane.
   */
  private renderCursorGuide(): void {
    const mode: CursorGuideMode = this.viewState.cursorGuideMode ?? 'none';
    if (mode === 'none' || this.pointerClient === null) {
      return;
    }
    const rect = this.svg.getBoundingClientRect();
    const x = this.pointerClient.clientX - rect.left;
    const y = this.pointerClient.clientY - rect.top;
    const leftPaneWidth = this.getLeftPaneWidth();
    const rightEdge = this.canvasSize.widthPx;
    const bottomEdge = this.canvasSize.heightPx;
    // Only over the schedule area (right of the frozen pane, inside the canvas).
    if (x < leftPaneWidth || x > rightEdge || y < 0 || y > bottomEdge) {
      return;
    }
    const color = '#0072b2';
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('data-role', 'cursor-guide');
    group.setAttribute('data-guide-mode', mode);
    group.setAttribute('pointer-events', 'none');

    // A vertical line at the pointer for every mode except the (unreached) none.
    group.appendChild(this.buildGuideLine(x, 0, x, bottomEdge, color));
    if (mode === 'crosshair') {
      // Plus a horizontal line spanning the schedule area at the pointer's y.
      group.appendChild(this.buildGuideLine(leftPaneWidth, y, rightEdge, y, color));
    } else if (mode === 'double-vertical') {
      // Plus a second vertical line a fixed screen offset to the right.
      const secondX = x + DOUBLE_VERTICAL_GUIDE_OFFSET_PX;
      if (secondX <= rightEdge) {
        group.appendChild(this.buildGuideLine(secondX, 0, secondX, bottomEdge, color));
      }
    }
    this.overlayGroup.appendChild(group);
  }

  /** Build one thin screen-space guide line element. */
  private buildGuideLine(x1: number, y1: number, x2: number, y2: number, color: string): SVGLineElement {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2));
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-dasharray', '4 3');
    return line;
  }

  /**
   * Draw the illuminated (progress) line as a PLAIN polyline (no terminal dots),
   * toggled with the actual display (PLAN-L1-003 / L2-001). Each row's actual
   * front becomes a vertex; the builder anchors the ends to today's axis.
   */
  private renderIlluminatedLine(): void {
    if (this.scheduleDocument === null || this.viewState.planActualDisplay === 'plan-only') {
      return;
    }
    // Deletable / hideable (item 2): a false flag removes the line from the DOM.
    // Absent is treated as visible so legacy documents keep showing it.
    if (this.viewState.progressLineVisible === false) {
      return;
    }
    const fronts = this.computeRowProgressFronts();
    const worldVertices = buildIlluminatedLine(
      this.today,
      fronts,
      this.scheduleDocument.epochDate,
      this.viewState.zoomX,
      this.viewState.zoomY,
      (rowIndex) => this.rowTop(rowIndex),
      (rowIndex) => this.rowHeight(rowIndex),
    );
    if (worldVertices.length < 2) {
      return;
    }
    const data = worldVertices
      .map((vertex, index) => {
        const x = this.worldToScreenX(vertex.worldX);
        const y = this.worldToScreenY(vertex.worldY);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('data-role', 'progress-line');
    path.setAttribute('d', data);
    path.setAttribute('fill', 'none');
    // Editable color (item 2), defaulting to purple when unset.
    path.setAttribute('stroke', this.viewState.progressLineColor ?? DEFAULT_PROGRESS_LINE_COLOR);
    path.setAttribute('stroke-width', '1.6');
    path.setAttribute('stroke-linejoin', 'round');
    this.overlayGroup.appendChild(path);
  }

  /**
   * Derive each visible row's actual-progress front date from its actual items
   * (PLAN-L2-001). The front is `start + progressRatio * span`; the furthest
   * front on a row wins. Rows with no actual item contribute no vertex.
   */
  private computeRowProgressFronts(): RowProgressFront[] {
    const frontDayByRowIndex = new Map<number, number>();
    for (const item of this.scheduleDocument?.items ?? []) {
      if (item.planActualKind !== 'actual') {
        continue;
      }
      const displayId = this.rowIdToDisplayId.get(item.rowId) ?? item.rowId;
      const rowIndex = this.rowOrderById.get(displayId);
      if (rowIndex === undefined) {
        continue;
      }
      const startDay = toDayNumber(item.startDate);
      const endDay = item.endDate === null ? startDay : toDayNumber(item.endDate);
      const ratio = item.progressRatio ?? 0;
      const frontDay = startDay + Math.round(ratio * (endDay - startDay));
      const current = frontDayByRowIndex.get(rowIndex);
      if (current === undefined || frontDay > current) {
        frontDayByRowIndex.set(rowIndex, frontDay);
      }
    }
    const fronts: RowProgressFront[] = [];
    for (const [rowIndex, frontDay] of frontDayByRowIndex) {
      fronts.push({ rowIndex, frontDate: fromDayNumber(frontDay) });
    }
    return fronts;
  }

  /**
   * Draw rounded-box enclosures in screen space with a zoom-invariant corner
   * radius (CURS-L1-007 / L2-001). The rect follows zoom/pan; the corner radius
   * is a fixed screen-pixel value.
   */
  private renderRoundedBoxes(): void {
    if (this.scheduleDocument === null) {
      return;
    }
    const epoch = this.scheduleDocument.epochDate;
    for (const annotation of this.scheduleDocument.annotations ?? []) {
      if (!isRoundedBox(annotation)) {
        continue;
      }
      const geometry = roundedBoxScreenRect(
        annotation,
        epoch,
        this.viewState,
        this.getContentTopOffsetPx(),
        (rowIndex) => this.rowBoundary(rowIndex),
      );
      if (!this.screenRectVisible(geometry.x, geometry.y, geometry.width, geometry.height)) {
        continue; // off-viewport: cull (parity with item virtualization, M-02).
      }
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('data-role', 'annotation-box');
      rect.setAttribute('data-annotation-id', annotation.id);
      rect.setAttribute('x', String(geometry.x));
      rect.setAttribute('y', String(geometry.y));
      rect.setAttribute('width', String(geometry.width));
      rect.setAttribute('height', String(geometry.height));
      rect.setAttribute('rx', String(geometry.cornerRadiusPx));
      rect.setAttribute('ry', String(geometry.cornerRadiusPx));
      rect.setAttribute('fill', 'none');
      rect.setAttribute('stroke', annotation.strokeColor);
      rect.setAttribute('stroke-width', '2');
      this.overlayGroup.appendChild(rect);
      if (annotation.id === this.selectedAnnotationId) {
        this.drawRoundedBoxHandles(geometry);
      }
    }
  }

  /**
   * Draw the four corner resize handles of the selected rounded box (CURS-L1-007).
   * The handles are small screen-space squares whose size never changes with zoom,
   * matching the zoom-invariant corner radius (CURS-L2-001).
   */
  private drawRoundedBoxHandles(geometry: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): void {
    const half = ANNOTATION_HANDLE_DRAW_HALF_PX;
    const corners = [
      { x: geometry.x, y: geometry.y },
      { x: geometry.x + geometry.width, y: geometry.y },
      { x: geometry.x, y: geometry.y + geometry.height },
      { x: geometry.x + geometry.width, y: geometry.y + geometry.height },
    ];
    // A faint selection outline first, then the opaque handles on top.
    const outline = document.createElementNS(SVG_NS, 'rect');
    outline.setAttribute('data-role', 'annotation-selection');
    outline.setAttribute('x', String(geometry.x));
    outline.setAttribute('y', String(geometry.y));
    outline.setAttribute('width', String(geometry.width));
    outline.setAttribute('height', String(geometry.height));
    outline.setAttribute('fill', 'none');
    outline.setAttribute('stroke', '#0072b2');
    outline.setAttribute('stroke-width', '1');
    outline.setAttribute('stroke-dasharray', SELECTION_DASH_ARRAY);
    this.overlayGroup.appendChild(outline);
    for (const corner of corners) {
      const handle = document.createElementNS(SVG_NS, 'rect');
      handle.setAttribute('data-role', 'annotation-handle');
      handle.setAttribute('x', String(corner.x - half));
      handle.setAttribute('y', String(corner.y - half));
      handle.setAttribute('width', String(half * 2));
      handle.setAttribute('height', String(half * 2));
      handle.setAttribute('fill', '#ffffff');
      handle.setAttribute('stroke', '#0072b2');
      handle.setAttribute('stroke-width', '1.5');
      this.overlayGroup.appendChild(handle);
    }
  }

  /**
   * Draw comment annotations in screen space (CURS-L1-005/006): a callout-box
   * (rectangle + short leader) or a polyline leader, with the text at a
   * screen-space offset from its world-space anchor.
   */
  private renderComments(): void {
    if (this.scheduleDocument === null) {
      return;
    }
    for (const annotation of this.scheduleDocument.annotations ?? []) {
      if (annotation.annotationKind === 'rounded-box') {
        continue;
      }
      this.drawComment(annotation);
      if (annotation.id === this.selectedAnnotationId) {
        const body = this.commentBodyRect(annotation, this.scheduleDocument.epochDate);
        const outline = document.createElementNS(SVG_NS, 'rect');
        outline.setAttribute('data-role', 'annotation-selection');
        outline.setAttribute('x', String(body.x - 2));
        outline.setAttribute('y', String(body.y - 2));
        outline.setAttribute('width', String(body.width + 4));
        outline.setAttribute('height', String(body.height + 4));
        outline.setAttribute('fill', 'none');
        outline.setAttribute('stroke', '#0072b2');
        outline.setAttribute('stroke-width', '1.5');
        outline.setAttribute('stroke-dasharray', SELECTION_DASH_ARRAY);
        this.overlayGroup.appendChild(outline);
      }
    }
  }

  private drawComment(comment: CommentAnnotation): void {
    if (this.scheduleDocument === null) {
      return;
    }
    const epoch = this.scheduleDocument.epochDate;
    const anchorWorldX = dateToWorldX(comment.anchorDate, epoch, this.viewState.zoomX);
    const rowBand = this.rowTop(comment.anchorRowIndex);
    const anchorX = this.worldToScreenX(anchorWorldX);
    const anchorY = this.worldToScreenY(rowBand + this.rowHeight(comment.anchorRowIndex) / 2);
    const bodyX = anchorX + comment.bodyOffsetPx.dx;
    const bodyY = anchorY + comment.bodyOffsetPx.dy;

    // Cull comments whose leader+body bounding box is off-viewport (M-02).
    const boundLeft = Math.min(anchorX, bodyX);
    const boundTop = Math.min(anchorY, bodyY);
    const boundWidth = Math.abs(bodyX - anchorX) + Math.max(24, comment.text.length * 7 + 10);
    const boundHeight = Math.abs(bodyY - anchorY) + 20;
    if (!this.screenRectVisible(boundLeft, boundTop, boundWidth, boundHeight)) {
      return;
    }

    if (comment.annotationKind === 'callout-box') {
      const width = Math.max(24, comment.text.length * 7 + 10);
      const height = 20;
      const box = document.createElementNS(SVG_NS, 'rect');
      box.setAttribute('x', String(bodyX));
      box.setAttribute('y', String(bodyY - height / 2));
      box.setAttribute('width', String(width));
      box.setAttribute('height', String(height));
      box.setAttribute('rx', '3');
      box.setAttribute('fill', '#fff7e6');
      box.setAttribute('stroke', '#8a6d3b');
      box.setAttribute('stroke-width', '1');
      const leader = document.createElementNS(SVG_NS, 'line');
      leader.setAttribute('x1', String(anchorX));
      leader.setAttribute('y1', String(anchorY));
      leader.setAttribute('x2', String(bodyX));
      leader.setAttribute('y2', String(bodyY));
      leader.setAttribute('stroke', '#8a6d3b');
      leader.setAttribute('stroke-width', '1');
      const text = this.buildCommentText(comment.text, bodyX + 5, bodyY);
      this.overlayGroup.appendChild(leader);
      this.overlayGroup.appendChild(box);
      this.overlayGroup.appendChild(text);
      return;
    }

    // polyline leader: anchor -> elbow -> body, then the text at the body.
    const elbowX = (anchorX + bodyX) / 2;
    const leader = document.createElementNS(SVG_NS, 'path');
    leader.setAttribute(
      'd',
      `M ${anchorX} ${anchorY} L ${elbowX} ${anchorY} L ${bodyX} ${bodyY}`,
    );
    leader.setAttribute('fill', 'none');
    leader.setAttribute('stroke', '#555555');
    leader.setAttribute('stroke-width', '1');
    const text = this.buildCommentText(comment.text, bodyX + 4, bodyY - 4);
    this.overlayGroup.appendChild(leader);
    this.overlayGroup.appendChild(text);
  }

  private buildCommentText(content: string, x: number, y: number): SVGTextElement {
    const text = document.createElementNS(SVG_NS, 'text');
    text.textContent = content;
    text.setAttribute('x', String(x));
    text.setAttribute('y', String(y));
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', '12');
    text.setAttribute('fill', '#1a1a1a');
    return text;
  }

  /**
   * Route and draw dependency lines (DEP-L1-001/003/004). Only dependencies with
   * at least one endpoint inside the viewport window are drawn, and obstacles are
   * limited to the mounted (visible) item set, so the dependency node count stays
   * bounded by the visible dependencies -- never one path per 1000 items (ADR-006
   * consequence / RISK-001 perf strategy). Endpoints whose item was culled by a
   * collapsed section have no placement and are skipped (line hidden).
   */
  private renderDependencies(viewportWindow: ViewportWindow): void {
    const dependencies = this.scheduleDocument?.dependencies ?? [];
    const desiredIds = new Set<string>();

    // Build ONE `itemId -> Rect` map per render (bounded to the mounted/visible
    // set) and reuse the SAME Rect instances both as obstacles and as endpoint
    // rects. Sharing instances plus the itemId tag makes the router's endpoint
    // self-exclusion robust regardless of comparison strategy (H-01 / L-02).
    const rectByItemId = new Map<string, Rect>();
    for (const [itemId] of this.mountedById) {
      const placement = this.placementById.get(itemId);
      if (placement !== undefined) {
        rectByItemId.set(itemId, placementRect(placement));
      }
    }
    const obstacles: readonly Rect[] = [...rectByItemId.values()];

    for (const dependency of dependencies) {
      const fromPlacement = this.placementById.get(dependency.fromItemId);
      const toPlacement = this.placementById.get(dependency.toItemId);
      if (fromPlacement === undefined || toPlacement === undefined) {
        continue; // an endpoint item is hidden (collapsed/deleted): drop the line.
      }
      const fromVisible = placementIntersectsWindow(fromPlacement, viewportWindow);
      const toVisible = placementIntersectsWindow(toPlacement, viewportWindow);
      if (!fromVisible && !toVisible) {
        continue; // neither endpoint near the viewport: skip (bounded node count).
      }
      desiredIds.add(dependency.id);
      // Reuse the shared obstacle instance for an endpoint when it is mounted;
      // otherwise build a fresh (itemId-tagged) rect for the off-screen endpoint.
      const fromRect =
        rectByItemId.get(dependency.fromItemId) ?? placementRect(fromPlacement);
      const toRect = rectByItemId.get(dependency.toItemId) ?? placementRect(toPlacement);
      this.drawDependency(dependency, fromRect, toRect, obstacles);
    }

    for (const [dependencyId, mounted] of this.depMountedById) {
      if (!desiredIds.has(dependencyId)) {
        mounted.path.remove();
        this.depMountedById.delete(dependencyId);
      }
    }
    // Keep dependency lines above item glyphs.
    this.contentGroup.appendChild(this.depGroup);
  }

  private drawDependency(
    dependency: Dependency,
    fromRect: Rect,
    toRect: Rect,
    obstacles: readonly Rect[],
  ): void {
    const route = routeDependency(
      fromRect,
      dependency.fromAnchor,
      toRect,
      dependency.toAnchor,
      obstacles,
    );
    // route.points[0] is the exact source anchor and the last point the exact
    // target anchor, so the drawn line terminates on the anchor geometry
    // (DEP-L1-002).
    const pathData = route.points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    let mounted = this.depMountedById.get(dependency.id);
    if (mounted === undefined) {
      const path = document.createElementNS(SVG_NS, 'path');
      // Tagged so the geometric hit-test / tests can address a specific line.
      path.setAttribute('data-role', 'dependency-line');
      path.setAttribute('data-dependency-id', dependency.id);
      path.setAttribute('fill', 'none');
      path.setAttribute('marker-end', `url(#${DEP_ARROW_MARKER_ID})`);
      this.depGroup.appendChild(path);
      mounted = { path };
      this.depMountedById.set(dependency.id, mounted);
    }
    mounted.path.setAttribute('d', pathData);
    // Per-line color (item 1) falls back to the yamabuki-gold default; the arrowhead
    // marker follows the stroke via `context-stroke`.
    const strokeColor = dependency.strokeColor ?? DEFAULT_DEPENDENCY_LINE_COLOR;
    mounted.path.setAttribute('stroke', strokeColor);
    // A selected line is drawn thicker so the selection is visible on top of items.
    const isSelected = dependency.id === this.selectedDependencyId;
    mounted.path.setAttribute('stroke-width', isSelected ? '3.2' : '1.4');
    if (isSelected) {
      mounted.path.setAttribute('data-selected', 'true');
    } else {
      mounted.path.removeAttribute('data-selected');
    }
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
   * returns the id of the nearest line within {@link DEP_HIT_TOLERANCE_PX} of the
   * pointer, or null. The content group is only translated (never scaled), so world
   * px == screen px and the tolerance is a real on-screen grab zone.
   *
   * @param screenX - Client x.
   * @param screenY - Client y.
   * @returns The hit dependency id, or null.
   */
  public hitTestDependency(screenX: number, screenY: number): string | null {
    const dependencies = this.scheduleDocument?.dependencies ?? [];
    if (dependencies.length === 0) {
      return null;
    }
    const point = this.screenToWorld(screenX, screenY);
    const rectByItemId = new Map<string, Rect>();
    for (const [itemId] of this.mountedById) {
      const placement = this.placementById.get(itemId);
      if (placement !== undefined) {
        rectByItemId.set(itemId, placementRect(placement));
      }
    }
    const obstacles: readonly Rect[] = [...rectByItemId.values()];
    let bestId: string | null = null;
    let bestDistance = DEP_HIT_TOLERANCE_PX;
    for (const dependency of dependencies) {
      const fromRect = rectByItemId.get(dependency.fromItemId);
      const toRect = rectByItemId.get(dependency.toItemId);
      if (fromRect === undefined || toRect === undefined) {
        continue; // an endpoint is not currently laid out / visible.
      }
      const route = routeDependency(
        fromRect,
        dependency.fromAnchor,
        toRect,
        dependency.toAnchor,
        obstacles,
      );
      const distance = distanceToPolyline(point.worldX, point.worldY, route.points);
      if (distance <= bestDistance) {
        bestDistance = distance;
        bestId = dependency.id;
      }
    }
    return bestId;
  }

  private createItemNode(item: ScheduleItem): MountedItem {
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('data-item-id', item.id);
    // Expose each item as a named graphic to assistive tech (WCAG 1.1.1 / 4.1.2):
    // role="img" + <title>; the concrete name is patched per render.
    group.setAttribute('role', 'img');
    const title = document.createElementNS(SVG_NS, 'title');
    const shape =
      item.itemKind === 'milestone'
        ? document.createElementNS(SVG_NS, 'path')
        : document.createElementNS(SVG_NS, 'rect');
    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('dominant-baseline', 'middle');
    // Title first so it is the accessible name source; then the graphic + label.
    group.appendChild(title);
    group.appendChild(shape);
    group.appendChild(label);
    return {
      group,
      shape,
      label,
      title,
      selectionOutline: null,
      focusRing: null,
      fadeInHandle: null,
      fadeOutHandle: null,
    };
  }

  /**
   * Ensure a task's glyph element matches its current shape (item: task-type /
   * icon-shape) and fade state: a `path` for arrow / chevron / span, a `polygon`
   * for a faded bar, a `rect` for a plain bar (the exact pre-fade rendering,
   * including rounded corners). Swaps the node in place before the label so the
   * group keeps a single glyph node per item (virtualization/perf invariant).
   * Milestones are left untouched (always a `path`).
   */
  private ensureTaskGlyphElement(mounted: MountedItem, item: ScheduleItem): void {
    if (item.itemKind !== 'task') {
      return;
    }
    const shape = effectiveTaskShape(item);
    const wantTag = taskShapeUsesPath(shape)
      ? 'path'
      : hasFade(item.fadeInDays, item.fadeOutDays)
        ? 'polygon'
        : 'rect';
    const currentTag = mounted.shape.tagName.toLowerCase();
    if (currentTag === wantTag) {
      return;
    }
    const next = document.createElementNS(SVG_NS, wantTag);
    mounted.shape.replaceWith(next);
    mounted.shape = next;
  }

  private patchItemNode(
    mounted: MountedItem,
    item: ScheduleItem,
    placement: ItemPlacement,
    fontSize: number,
  ): void {
    // Swap the glyph element FIRST (rect / polygon / path per shape + fade) so the
    // paint attributes below land on the element actually shown this frame.
    this.ensureTaskGlyphElement(mounted, item);
    // Property-driven fill (fix 3): plan -> green, actual -> orange, derived from
    // the plan_actual_status PROPERTY (never by parsing the category name). Items
    // without plan/actual semantics keep their own stored fill. Grey baseline /
    // changed-plan ghosts are drawn separately (renderPreviousPlanGhosts) and are
    // unaffected. Paired with the non-color stroke-dash below for WCAG 1.4.1.
    const fillColor = displayFillColor(item);
    const taskShape = item.itemKind === 'task' ? effectiveTaskShape(item) : null;
    const stroked = taskShape !== null && taskShapeIsStroked(taskShape);
    if (stroked) {
      // A `span` (*--*) connector is a thin STROKED line with no fill; its own fill
      // color paints the stroke so the fill-color control recolors the connector.
      mounted.shape.setAttribute('fill', 'none');
      mounted.shape.setAttribute('stroke', fillColor);
      mounted.shape.setAttribute('stroke-width', String(strokeWidthPx(item.lineWeight)));
      mounted.shape.setAttribute('stroke-dasharray', 'none');
    } else {
      mounted.shape.setAttribute('fill', fillColor);
      // Item borders are SOLID and OFF by default (item 2): a transparent/absent
      // stroke color renders `stroke="none"` (no border); any explicit stroke is
      // solid (no dash-array). The dashed SELECTION outline is a separate node.
      const stroke = resolveStrokeAttribute(item.strokeColor);
      mounted.shape.setAttribute('stroke', stroke);
      mounted.shape.setAttribute(
        'stroke-width',
        stroke === 'none' ? '0' : String(strokeWidthPx(item.lineWeight)),
      );
      mounted.shape.setAttribute('stroke-dasharray', 'none');
    }
    // Tag the glyph with its shape so tests / assistive tech can read the kind.
    if (taskShape !== null) {
      mounted.shape.setAttribute('data-task-shape', taskShape);
    }

    // Refresh the accessible name (abbrev + kind + dates) for the active locale.
    const accessibleName = itemAccessibleName(item, this.viewState.activeLocale ?? 'en');
    mounted.title.textContent = accessibleName;
    mounted.group.setAttribute('aria-label', accessibleName);

    if (item.itemKind === 'milestone') {
      const size = placement.worldHeight;
      const centerX = placement.worldX;
      const centerY = placement.worldY + size / 2;
      mounted.shape.setAttribute('d', milestonePath(item, centerX, centerY, size / 2));
    } else if (taskShape !== null && taskShapeUsesPath(taskShape)) {
      // Arrow / chevron / span: draw the shape from its own vertices. The fade taper
      // only applies to a plain bar, so these shapes ignore fadeIn/Out days.
      mounted.shape.setAttribute(
        'd',
        taskGlyphPath(taskShape, {
          x: placement.worldX,
          y: placement.worldY,
          width: placement.worldWidth,
          height: placement.worldHeight,
        }),
      );
    } else if (hasFade(item.fadeInDays, item.fadeOutDays)) {
      // Faded task: draw the 4-point trapezoid/parallelogram. The polygon carries a
      // data attribute so tests/AT can read the taper without re-deriving geometry.
      const points = this.taskFadePoints(item, placement);
      mounted.shape.setAttribute('points', fadePointsToAttribute(points));
      mounted.shape.setAttribute('data-fade-in-days', String(item.fadeInDays ?? 0));
      mounted.shape.setAttribute('data-fade-out-days', String(item.fadeOutDays ?? 0));
    } else {
      mounted.shape.setAttribute('x', String(placement.worldX));
      mounted.shape.setAttribute('y', String(placement.worldY));
      mounted.shape.setAttribute('width', String(placement.worldWidth));
      mounted.shape.setAttribute('height', String(placement.worldHeight));
      mounted.shape.setAttribute('rx', '2');
    }

    const labelAnchor = labelAnchorPoint(item, placement);
    mounted.label.textContent = item.abbrev;
    mounted.label.setAttribute('x', String(labelAnchor.x));
    mounted.label.setAttribute('y', String(labelAnchor.y));
    mounted.label.setAttribute('text-anchor', labelAnchor.textAnchor);
    mounted.label.setAttribute('font-size', String(fontSize));
    mounted.label.setAttribute('fill', '#1a1a1a');

    this.updateSelectionOutline(mounted, placement);
    this.updateFocusRing(mounted, placement);
    this.updateFadeHandles(mounted, item, placement);
  }

  /**
   * World-space vertices of a task's fade trapezoid, using the same day->x mapping
   * as the layout so the polygon tracks zoom/scroll exactly. `top` is the lane's
   * upper (smaller-y) edge; `bottom` its lower edge.
   */
  private taskFadePoints(item: ScheduleItem, placement: ItemPlacement): readonly FadePoint[] {
    const startDay = toDayNumber(item.startDate);
    const endDay = item.endDate === null ? startDay : toDayNumber(item.endDate);
    const perDay = pixelsPerDay(this.viewState.zoomX);
    return fadeTrapezoidPoints({
      startDay,
      endDay,
      fadeInDays: item.fadeInDays ?? 0,
      fadeOutDays: item.fadeOutDays ?? 0,
      top: placement.worldY,
      bottom: placement.worldY + placement.worldHeight,
      dayToX: (day) => placement.worldX + (day - startDay) * perDay,
    });
  }

  /**
   * The two fade drag-handle centers of a selected task in world space: the
   * top-left vertex (drives fade-in) and the bottom-right vertex (drives fade-out).
   * Derived from {@link taskFadePoints} so the handles always sit on the drawn
   * corners, whether the bar is a rectangle, trapezoid or parallelogram.
   */
  private taskFadeHandleCenters(
    item: ScheduleItem,
    placement: ItemPlacement,
  ): { readonly fadeIn: FadePoint; readonly fadeOut: FadePoint } {
    const points = this.taskFadePoints(item, placement);
    // Vertex order: [bottom-left, bottom-right, top-right, top-left].
    return { fadeOut: points[1] as FadePoint, fadeIn: points[3] as FadePoint };
  }

  /**
   * Add or remove the two corner fade handles for a selected task (top-left =
   * fade-in, bottom-right = fade-out). Reuses the small half-size white square with
   * a blue border from the rounded-box handles. Handles are removed for milestones
   * and unselected items.
   */
  private updateFadeHandles(
    mounted: MountedItem,
    item: ScheduleItem,
    placement: ItemPlacement,
  ): void {
    const show = item.itemKind === 'task' && this.selectedItemIds.has(placement.itemId);
    if (!show) {
      if (mounted.fadeInHandle !== null) {
        mounted.fadeInHandle.remove();
        mounted.fadeInHandle = null;
      }
      if (mounted.fadeOutHandle !== null) {
        mounted.fadeOutHandle.remove();
        mounted.fadeOutHandle = null;
      }
      return;
    }
    const centers = this.taskFadeHandleCenters(item, placement);
    mounted.fadeInHandle = this.placeFadeHandle(mounted, mounted.fadeInHandle, 'fade-in', centers.fadeIn);
    mounted.fadeOutHandle = this.placeFadeHandle(mounted, mounted.fadeOutHandle, 'fade-out', centers.fadeOut);
  }

  /** Lazily create and position one fade corner handle square. */
  private placeFadeHandle(
    mounted: MountedItem,
    existing: SVGRectElement | null,
    role: 'fade-in' | 'fade-out',
    center: FadePoint,
  ): SVGRectElement {
    let handle = existing;
    if (handle === null) {
      handle = document.createElementNS(SVG_NS, 'rect');
      handle.setAttribute('data-role', `${role}-handle`);
      handle.setAttribute('fill', '#ffffff');
      handle.setAttribute('stroke', '#0072b2');
      handle.setAttribute('stroke-width', '1.5');
      handle.setAttribute('pointer-events', 'none');
      mounted.group.appendChild(handle);
    }
    const half = ANNOTATION_HANDLE_DRAW_HALF_PX;
    handle.setAttribute('x', String(center.x - half));
    handle.setAttribute('y', String(center.y - half));
    handle.setAttribute('width', String(half * 2));
    handle.setAttribute('height', String(half * 2));
    return handle;
  }

  /** Add or remove the dashed selection outline based on current selection. */
  private updateSelectionOutline(mounted: MountedItem, placement: ItemPlacement): void {
    const isSelected = this.selectedItemIds.has(placement.itemId);
    if (!isSelected) {
      if (mounted.selectionOutline !== null) {
        mounted.selectionOutline.remove();
        mounted.selectionOutline = null;
      }
      return;
    }
    if (mounted.selectionOutline === null) {
      const outline = document.createElementNS(SVG_NS, 'rect');
      // Tagged so tests / assistive-tech can find the selected item's marker.
      outline.setAttribute('data-role', 'selection-outline');
      outline.setAttribute('fill', 'none');
      outline.setAttribute('stroke', '#0072b2');
      outline.setAttribute('stroke-width', '1.5');
      // Selection is conveyed by a dashed pattern, not color alone (WCAG 1.4.1).
      outline.setAttribute('stroke-dasharray', SELECTION_DASH_ARRAY);
      outline.setAttribute('pointer-events', 'none');
      mounted.group.appendChild(outline);
      mounted.selectionOutline = outline;
    }
    const pad = 3;
    mounted.selectionOutline.setAttribute('x', String(placement.worldX - pad));
    mounted.selectionOutline.setAttribute('y', String(placement.worldY - pad));
    mounted.selectionOutline.setAttribute('width', String(placement.worldWidth + pad * 2));
    mounted.selectionOutline.setAttribute('height', String(placement.worldHeight + pad * 2));
  }

  /**
   * Add or remove the solid keyboard-focus ring based on the focused item
   * (WCAG 2.4.7). The ring is solid and offset further out than the selection
   * dashes, so a focused-and-selected item shows a clear, distinct indicator.
   */
  private updateFocusRing(mounted: MountedItem, placement: ItemPlacement): void {
    const isFocused = this.keyboardFocusItemId === placement.itemId;
    if (!isFocused) {
      if (mounted.focusRing !== null) {
        mounted.focusRing.remove();
        mounted.focusRing = null;
      }
      return;
    }
    if (mounted.focusRing === null) {
      const ring = document.createElementNS(SVG_NS, 'rect');
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', FOCUS_RING_HEX);
      ring.setAttribute('stroke-width', String(FOCUS_RING_STROKE_WIDTH));
      ring.setAttribute('stroke-dasharray', FOCUS_RING_DASH_ARRAY);
      ring.setAttribute('pointer-events', 'none');
      mounted.group.appendChild(ring);
      mounted.focusRing = ring;
    }
    const pad = 6;
    mounted.focusRing.setAttribute('x', String(placement.worldX - pad));
    mounted.focusRing.setAttribute('y', String(placement.worldY - pad));
    mounted.focusRing.setAttribute('width', String(placement.worldWidth + pad * 2));
    mounted.focusRing.setAttribute('height', String(placement.worldHeight + pad * 2));
  }

  private clearMountedNodes(): void {
    for (const mounted of this.mountedById.values()) {
      mounted.group.remove();
    }
    this.mountedById.clear();
    for (const mounted of this.depMountedById.values()) {
      mounted.path.remove();
    }
    this.depMountedById.clear();
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

/** World-space bounding rectangle of an item placement (for anchors/routing). */
function placementRect(placement: ItemPlacement): Rect {
  return {
    x: placement.worldX,
    y: placement.worldY,
    width: placement.worldWidth,
    height: placement.worldHeight,
    // Tag with the owning item so the router can exclude an endpoint from being
    // an obstacle to its own line by stable identity, not object reference (H-01).
    itemId: placement.itemId,
  };
}

/**
 * Build the `<defs>` holding the minimal, screen-space-fixed dependency
 * arrowhead marker (DEP-L1-004, ADR-004). `markerUnits="userSpaceOnUse"` with a
 * fixed size makes the arrowhead a constant few pixels regardless of stroke or
 * zoom (the content group is only translated, never scaled).
 */
function buildDependencyMarkerDefs(): SVGDefsElement {
  const defs = document.createElementNS(SVG_NS, 'defs');
  const marker = document.createElementNS(SVG_NS, 'marker');
  marker.setAttribute('id', DEP_ARROW_MARKER_ID);
  marker.setAttribute('markerUnits', 'userSpaceOnUse');
  marker.setAttribute('markerWidth', '7');
  marker.setAttribute('markerHeight', '7');
  marker.setAttribute('refX', '6');
  marker.setAttribute('refY', '3');
  marker.setAttribute('orient', 'auto');
  const head = document.createElementNS(SVG_NS, 'path');
  head.setAttribute('d', 'M 0 0 L 6 3 L 0 6 Z');
  // Follow each line's own stroke color (item 1) so the arrowhead matches a
  // recolored line and the yamabuki-gold default.
  head.setAttribute('fill', 'context-stroke');
  marker.appendChild(head);
  defs.appendChild(marker);
  return defs;
}

/**
 * Resolve an item's stroke color to an SVG `stroke` attribute value. A blank,
 * `transparent` or `none` color yields `'none'` so the item draws NO border by
 * default (item 2); any other color is returned verbatim (a solid border).
 */
function resolveStrokeAttribute(strokeColor: string): string {
  const value = strokeColor.trim().toLowerCase();
  return value === '' || value === 'transparent' || value === 'none' ? 'none' : strokeColor;
}

/** Map a line-weight step to a stroke width in CSS pixels. */
function strokeWidthPx(lineWeight: ScheduleItem['lineWeight']): number {
  switch (lineWeight) {
    case 'thin':
      return 1;
    case 'thick':
      return 3;
    case 'medium':
    default:
      return 2;
  }
}

/** Anchor position + text-anchor for an item's abbreviation label. */
function labelAnchorPoint(
  item: ScheduleItem,
  placement: ItemPlacement,
): { x: number; y: number; textAnchor: string } {
  const centerX = placement.worldX + placement.worldWidth / 2;
  const centerY = placement.worldY + placement.worldHeight / 2;
  const right = placement.worldX + placement.worldWidth + 4;
  const position = item.labelPosition ?? 'auto';
  let base: { x: number; y: number; textAnchor: string };
  switch (position) {
    case 'center':
      base = { x: centerX, y: centerY, textAnchor: 'middle' };
      break;
    case 'top':
      base = { x: centerX, y: placement.worldY - 4, textAnchor: 'middle' };
      break;
    case 'bottom':
      base = { x: centerX, y: placement.worldY + placement.worldHeight + 10, textAnchor: 'middle' };
      break;
    case 'left':
      base = { x: placement.worldX - 4, y: centerY, textAnchor: 'end' };
      break;
    case 'right':
    case 'auto':
    default:
      base = { x: right, y: centerY, textAnchor: 'start' };
      break;
  }
  const offset = item.labelOffset;
  return offset === undefined
    ? base
    : { x: base.x + offset.dx, y: base.y + offset.dy, textAnchor: base.textAnchor };
}

/** Approximate whether a world point falls on an item's abbreviation label. */
function pointInLabelBox(
  item: ScheduleItem,
  placement: ItemPlacement,
  fontSize: number,
  worldX: number,
  worldY: number,
): boolean {
  const anchor = labelAnchorPoint(item, placement);
  const width = Math.max(8, item.abbrev.length * fontSize * 0.62);
  const left =
    anchor.textAnchor === 'middle'
      ? anchor.x - width / 2
      : anchor.textAnchor === 'end'
        ? anchor.x - width
        : anchor.x;
  const top = anchor.y - fontSize * 0.8;
  return (
    worldX >= left && worldX <= left + width && worldY >= top && worldY <= top + fontSize * 1.4
  );
}

/** Shortest distance from a point to a polyline (sequence of connected segments). */
function distanceToPolyline(px: number, py: number, points: readonly Point[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    if (a === undefined || b === undefined) {
      continue;
    }
    best = Math.min(best, distanceToSegment(px, py, a.x, a.y, b.x, b.y));
  }
  return best;
}

/** Shortest distance from point (px,py) to the segment (ax,ay)-(bx,by). */
function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return Math.hypot(px - ax, py - ay);
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

/** Build the SVG path `d` for a milestone glyph centered at (cx, cy). */
function milestonePath(item: ScheduleItem, cx: number, cy: number, radius: number): string {
  const shape = effectiveMilestoneShape(item);
  switch (shape) {
    case 'circle': {
      // Two arcs form a full circle.
      return `M ${cx - radius} ${cy} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 ${-radius * 2} 0 Z`;
    }
    case 'square':
      return `M ${cx - radius} ${cy - radius} h ${radius * 2} v ${radius * 2} h ${-radius * 2} Z`;
    case 'triangle':
      return `M ${cx} ${cy - radius} L ${cx + radius} ${cy + radius} L ${cx - radius} ${cy + radius} Z`;
    case 'star':
      return starPath(cx, cy, radius);
    case 'diamond':
    default:
      return `M ${cx} ${cy - radius} L ${cx + radius} ${cy} L ${cx} ${cy + radius} L ${cx - radius} ${cy} Z`;
  }
}

/** Build a five-point star path centered at (cx, cy). */
function starPath(cx: number, cy: number, radius: number): string {
  const points: string[] = [];
  for (let index = 0; index < 10; index += 1) {
    const currentRadius = index % 2 === 0 ? radius : radius * 0.5;
    const angle = (Math.PI / 5) * index - Math.PI / 2;
    const x = cx + currentRadius * Math.cos(angle);
    const y = cy + currentRadius * Math.sin(angle);
    points.push(`${index === 0 ? 'M' : 'L'} ${x} ${y}`);
  }
  return `${points.join(' ')} Z`;
}

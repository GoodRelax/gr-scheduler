/**
 * Adapter layer: the shared render CONTEXT that every SVG layer module and the
 * hit-tester read from (H-1 god-object split, review R3/R4).
 *
 * The renderer used to be a single 2900-line class where each drawing concern
 * reached into private state directly. Splitting it by feature seam requires a
 * single, named surface through which the extracted layers observe the current
 * frame: the laid-out placements, the view offsets, the selection, and the pure
 * world<->content geometry. `SvgRenderer` builds one {@link RenderContext} per
 * render pass (and per hit-test) and passes it to each layer, so the layers stay
 * pure adapters over shared read-only state with NO new global state (DIP).
 *
 * Every value here is exactly what the monolith exposed as a private field or a
 * private helper method, renamed only where the review demanded (the two
 * same-looking `worldToScreen*` families are now `worldToContentX/Y`, matching the
 * {@link ViewTransform} content space). The move is mechanical: the produced SVG is
 * byte-identical.
 */

import type {
  CanvasSize,
  IsoDate,
  Row,
  ScheduleDocument,
  ScheduleItem,
  ViewState,
} from '../../domain/model/schedule-model.js';
import type { ItemPlacement } from '../../domain/usecase/layout-engine.js';
import type { SectionBand } from '../../domain/usecase/section-organizer.js';
import type { ViewTransform, WorldPoint } from '../../domain/usecase/view-transform.js';

/** The SVG XML namespace every element in the renderer is created under. */
export const SVG_NS = 'http://www.w3.org/2000/svg';

/** Height in CSS pixels of one date-ruler tier band (shared: ruler + top offset). */
export const RULER_TIER_HEIGHT_PX = 16;

/**
 * Read-only view of the current frame shared with every render layer and the
 * hit-tester. Built fresh by {@link SvgRenderer} per render / hit-test so the
 * scalar snapshots (view state, selection) are always current and the map/array
 * references stay live.
 */
export interface RenderContext {
  /** The document being rendered, or null before one is set. */
  readonly scheduleDocument: ScheduleDocument | null;
  /**
   * The separately-loaded baseline reference document (CR-002 Part 3 / PLAN-L1-004),
   * or null when none is loaded. A read-only past-plan snapshot drawn as a grey
   * underlay, id-matched to the current items; its actuals are ignored. RUNTIME app
   * state, NOT persisted into {@link scheduleDocument}.
   */
  readonly baselineDocument: ScheduleDocument | null;
  /**
   * Whether the baseline underlay is drawn (CR-002 Part 3 visibility toggle). This is
   * INDEPENDENT of {@link ViewState.planActualDisplay}; even a loaded baseline is not
   * drawn while this is false.
   */
  readonly baselineVisible: boolean;
  /** The current (mutable-copy) view state. */
  readonly viewState: ViewState;
  /** The measured drawing-surface size in CSS pixels. */
  readonly canvasSize: CanvasSize;
  /** Reference date ("today") for the today line and illuminated line base. */
  readonly today: IsoDate;
  /** The laid-out item placements from the last layout pass. */
  readonly placements: readonly ItemPlacement[];
  /** Placement lookup by item id. */
  readonly placementById: ReadonlyMap<string, ItemPlacement>;
  /** Item lookup by id. */
  readonly itemById: ReadonlyMap<string, ScheduleItem>;
  /** The current display (collapsed) rows, in vertical order. */
  readonly displayRows: readonly Row[];
  /** Contiguous section bands over the display rows. */
  readonly sectionBands: readonly SectionBand[];
  /** Vertical order index of each DISPLAY row id. */
  readonly rowOrderById: ReadonlyMap<string, number>;
  /** Maps each level-0 row id to the display row id it collapsed into. */
  readonly rowIdToDisplayId: ReadonlyMap<string, string>;
  /** The currently selected item ids (dashed outline). */
  readonly selectedItemIds: ReadonlySet<string>;
  /** The selected annotation (rounded-box / comment) id, or null. */
  readonly selectedAnnotationId: string | null;
  /** The selected dependency line id, or null. */
  readonly selectedDependencyId: string | null;
  /** The item focused via keyboard, drawn with a ring, or null. */
  readonly keyboardFocusItemId: string | null;
  /** Last pointer position over the canvas (client px), for the cursor guide. */
  readonly pointerClient: { readonly clientX: number; readonly clientY: number } | null;
  /**
   * Whether the double-vertical cursor-guide REFERENCE line (line-1) is the active
   * selection, so it is drawn highlighted (cursor-guide span rework). Absent/false
   * means unselected.
   */
  readonly cursorGuideReferenceSelected?: boolean;

  /** Effective left-pane width in CSS pixels (world content is offset by this). */
  readonly leftPaneWidth: number;
  /** Vertical CSS px the content is pushed down by so row 0 clears the ruler. */
  readonly contentTopOffsetPx: number;

  /** Whether an item currently has a mounted (visible) DOM node. */
  hasMountedItem(itemId: string): boolean;
  /** The ids of every item with a mounted (visible) DOM node. */
  mountedItemIds(): Iterable<string>;

  /** The world<->screen transform for the current offsets (rect optional). */
  viewTransform(rect?: { left: number; top: number }): ViewTransform;
  /** World x -> SVG content x (the value written to an SVG attribute). */
  worldToContentX(worldX: number): number;
  /** World y -> SVG content y. */
  worldToContentY(worldY: number): number;
  /** Client point -> world point (inverse of the content transform). */
  screenToWorld(screenX: number, screenY: number): WorldPoint;
  /** The SVG element's client bounding-rect left/top. */
  svgClientRect(): { readonly left: number; readonly top: number };

  /** World-space top of display row `index` under the current geometry. */
  rowTop(index: number): number;
  /** World-space band height of display row `index`. */
  rowHeight(index: number): number;
  /** World-space y of the boundary above display row `index`. */
  rowBoundary(index: number): number;
  /** Whether a screen-space rectangle intersects the visible schedule viewport. */
  screenRectVisible(x: number, y: number, width: number, height: number): boolean;
}

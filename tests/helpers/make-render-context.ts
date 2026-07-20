/**
 * Test factory that builds a {@link RenderContext} for the renderer-layer and
 * hit-tester unit tests (review M-4 / R6). It mirrors what `SvgRenderer.buildContext`
 * produces at runtime -- live placement/selection state plus the pure world<->content
 * geometry from a real {@link ViewTransform} -- so a layer or the hit-tester can be
 * exercised in isolation against a known, pinned frame.
 */

import type { RenderContext } from '../../src/adapters/render/render-context.js';
import type {
  CanvasSize,
  IsoDate,
  Row,
  ScheduleDocument,
  ScheduleItem,
  ViewState,
} from '../../src/domain/model/schedule-model.js';
import type { ItemPlacement } from '../../src/domain/usecase/layout-engine.js';
import type { SectionBand } from '../../src/domain/usecase/section-organizer.js';
import { ViewTransform } from '../../src/domain/usecase/view-transform.js';

/** Overridable inputs for {@link makeRenderContext}. */
export interface RenderContextInit {
  scheduleDocument?: ScheduleDocument | null;
  baselineDocument?: ScheduleDocument | null;
  baselineVisible?: boolean;
  viewState?: ViewState;
  canvasSize?: CanvasSize;
  today?: IsoDate;
  placements?: readonly ItemPlacement[];
  placementById?: ReadonlyMap<string, ItemPlacement>;
  itemById?: ReadonlyMap<string, ScheduleItem>;
  displayRows?: readonly Row[];
  sectionBands?: readonly SectionBand[];
  rowOrderById?: ReadonlyMap<string, number>;
  rowIdToDisplayId?: ReadonlyMap<string, string>;
  selectedItemIds?: ReadonlySet<string>;
  selectedAnnotationId?: string | null;
  selectedDependencyId?: string | null;
  keyboardFocusItemId?: string | null;
  pointerClient?: { readonly clientX: number; readonly clientY: number } | null;
  cursorGuideReferenceSelected?: boolean;
  leftPaneWidth?: number;
  contentTopOffsetPx?: number;
  /** The set of item ids treated as mounted/visible (default: all placements). */
  mounted?: ReadonlySet<string>;
  svgRect?: { left: number; top: number };
  rowTop?: (index: number) => number;
  rowHeight?: (index: number) => number;
  rowBoundary?: (index: number) => number;
  screenRectVisible?: (x: number, y: number, width: number, height: number) => boolean;
}

const DEFAULT_VIEW_STATE: ViewState = {
  zoomX: 1,
  zoomY: 1,
  scrollX: 0,
  scrollY: 0,
  fontScale: 'M',
};

/** Build a full {@link RenderContext} from a small set of overrides. */
export function makeRenderContext(over: RenderContextInit = {}): RenderContext {
  const viewState = over.viewState ?? DEFAULT_VIEW_STATE;
  const leftPaneWidth = over.leftPaneWidth ?? 0;
  const contentTopOffsetPx = over.contentTopOffsetPx ?? 0;
  const placements = over.placements ?? [];
  const placementById =
    over.placementById ?? new Map(placements.map((placement) => [placement.itemId, placement]));
  const mounted = over.mounted ?? new Set(placements.map((placement) => placement.itemId));
  const svgRect = over.svgRect ?? { left: 0, top: 0 };
  const rowHeight = over.rowHeight ?? ((_index: number) => 40);
  const rowTop = over.rowTop ?? ((index: number) => index * 40);
  const rowBoundary = over.rowBoundary ?? ((index: number) => index * 40);

  const transformAt = (rectLeft: number, rectTop: number): ViewTransform =>
    new ViewTransform({
      leftPaneWidth,
      contentTopOffsetPx,
      scrollX: viewState.scrollX,
      scrollY: viewState.scrollY,
      rectLeft,
      rectTop,
    });

  return {
    scheduleDocument: over.scheduleDocument ?? null,
    baselineDocument: over.baselineDocument ?? null,
    baselineVisible: over.baselineVisible ?? false,
    viewState,
    canvasSize: over.canvasSize ?? { widthPx: 1000, heightPx: 600 },
    today: over.today ?? ('2026-07-19' as IsoDate),
    placements,
    placementById,
    itemById: over.itemById ?? new Map(),
    displayRows: over.displayRows ?? [],
    sectionBands: over.sectionBands ?? [],
    rowOrderById: over.rowOrderById ?? new Map(),
    rowIdToDisplayId: over.rowIdToDisplayId ?? new Map(),
    selectedItemIds: over.selectedItemIds ?? new Set(),
    selectedAnnotationId: over.selectedAnnotationId ?? null,
    selectedDependencyId: over.selectedDependencyId ?? null,
    keyboardFocusItemId: over.keyboardFocusItemId ?? null,
    pointerClient: over.pointerClient ?? null,
    cursorGuideReferenceSelected: over.cursorGuideReferenceSelected ?? false,
    leftPaneWidth,
    contentTopOffsetPx,
    hasMountedItem: (itemId) => mounted.has(itemId),
    mountedItemIds: () => mounted.values(),
    viewTransform: (rect) => transformAt(rect?.left ?? 0, rect?.top ?? 0),
    worldToContentX: (worldX) => transformAt(0, 0).toContentX(worldX),
    worldToContentY: (worldY) => transformAt(0, 0).toContentY(worldY),
    screenToWorld: (screenX, screenY) =>
      transformAt(svgRect.left, svgRect.top).fromClient({ clientX: screenX, clientY: screenY }),
    svgClientRect: () => svgRect,
    rowTop,
    rowHeight,
    rowBoundary,
    screenRectVisible: over.screenRectVisible ?? (() => true),
  };
}

/** Build a minimal task {@link ScheduleItem} with sensible defaults. */
export function makeTask(id: string, over: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id,
    rowId: 'row-0',
    itemKind: 'task',
    startDate: '2026-01-01' as IsoDate,
    endDate: '2026-01-10' as IsoDate,
    abbrev: id,
    importance: 1,
    fillColor: '#4477aa',
    strokeColor: 'none',
    ...over,
  };
}

/** Build a placement rectangle for an item. */
export function makePlacement(
  itemId: string,
  worldX: number,
  worldY: number,
  worldWidth: number,
  worldHeight: number,
  laneIndex = 0,
): ItemPlacement {
  return { itemId, rowId: 'row-0', laneIndex, worldX, worldY, worldWidth, worldHeight };
}

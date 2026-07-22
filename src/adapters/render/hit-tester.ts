/**
 * Adapter layer: the four hit-test families extracted from the renderer god-object
 * (H-1 / M-4 split). Given the current {@link RenderContext} (view transform +
 * document + laid-out placements + selection), each method returns the SAME target
 * in the SAME priority order the monolith used -- ordering bugs here were real
 * before, so the sequence is preserved verbatim:
 *
 * - {@link HitTester.hitTest}: fade corner handle -> bar body/edge -> label.
 * - {@link HitTester.hitTestAnnotation}: selected-box corner handle -> topmost body.
 * - {@link HitTester.hitTestDependency}: nearest routed line within tolerance.
 *
 * Pure read-only queries: no DOM mutation, no side effects.
 */

import type { IsoDate, ScheduleItem } from '../../domain/model/schedule-model.js';
import type {
  Annotation,
  RoundedBoxAnnotation,
} from '../../domain/model/annotation.js';
import { isComment, isRoundedBox } from '../../domain/model/annotation.js';
import {
  pickItemHit,
  type EdgeRegion,
  type HitCandidate,
} from '../../domain/usecase/edge-hit.js';
import type { ItemPlacement } from '../../domain/usecase/layout-engine.js';
import {
  actualSideLaneRect,
  computeItemDisplayedBars,
  drawsActualBar,
  isActualSideShown,
  isPlanSideShown,
  type ItemLaneRect,
} from '../../domain/usecase/plan-actual-display.js';
import {
  resolvePlanActualStyle,
  separateActualBarOffsetPx,
} from '../../domain/usecase/plan-actual-geometry.js';
import { roundedBoxScreenRect } from '../../domain/usecase/cursor-span.js';
import type { Rect } from '../../domain/usecase/dependency-router.js';
import { routeConnector } from '../../domain/usecase/dependency-connector.js';
import { isDependencyRenderable } from '../../domain/usecase/dependency-visibility.js';
import {
  FONT_SIZE_BY_SCALE,
  pointInLabelBox,
  taskFadeHandleCenters,
} from './item-geometry.js';
import { commentAnchorScreenPoint, commentBodyRect } from './comment-geometry.js';
import {
  DEP_HIT_TOLERANCE_PX,
  distanceToPolyline,
  placementRect,
} from './dependency-geometry.js';
import type { RenderContext } from './render-context.js';

/**
 * A hit on the PLAN side of an item: its laid-out bar, its label, or a fade corner
 * handle. A gesture started here edits the PLANNED dates (`startDate`/`endDate`) and
 * behaves exactly as it always has.
 */
export interface PlanSideItemHit {
  readonly side: 'plan';
  readonly itemId: string;
  /** Which part of the item was hit (drives move vs resize vs label drag vs fade). */
  readonly region: EdgeRegion | 'label' | 'fade-in' | 'fade-out';
}

/**
 * A hit on the ACTUAL (as-run) bar of an item (review H-1 / M-1). A gesture started
 * here edits `actualStart` / `actualEnd` ONLY -- the planned dates are never touched.
 * Labels and fade handles belong to the plan glyph, so they cannot occur here; the
 * union makes that unrepresentable rather than merely documented.
 */
export interface ActualSideItemHit {
  readonly side: 'actual';
  readonly itemId: string;
  /** Which part of the ACTUAL bar was hit (body move vs actual-edge resize). */
  readonly region: EdgeRegion;
}

/** A hit against a rendered item: which item, which sub-region, and on which side. */
export type ItemHit = PlanSideItemHit | ActualSideItemHit;

/** A resolved hit against a canvas annotation (rounded-box / comment). */
export interface AnnotationHit {
  readonly annotationId: string;
  /**
   * Which part was hit: the body (select/move), a rounded-box corner handle, or a
   * selected comment's leader `anchor` handle (drag the pointed-at target).
   */
  readonly region: 'body' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | 'anchor';
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

/** Screen-pixel tolerance for grabbing a rounded-box border to select it. */
const ANNOTATION_BORDER_TOLERANCE_PX = 7;

/**
 * Whether a world point lies inside a world-space lane rectangle (inclusive on all
 * four borders, matching the long-standing hit semantics).
 *
 * @param rect - The rectangle to test against.
 * @param worldX - Pointer world x.
 * @param worldY - Pointer world y.
 * @returns True when the point is inside (or exactly on) the rectangle.
 */
function rectContainsPoint(rect: ItemLaneRect, worldX: number, worldY: number): boolean {
  return (
    worldX >= rect.worldX &&
    worldX <= rect.worldX + rect.worldWidth &&
    worldY >= rect.worldY &&
    worldY <= rect.worldY + rect.worldHeight
  );
}

/**
 * Whether an item contributes an ACTUAL-side grab rectangle, i.e. whether
 * {@link HitTester.itemGrabRects} would return anything other than the plain plan
 * rectangle. Deliberately a chain of FIELD tests (no date parsing, no allocation) so
 * the hit-test hot path can skip rectangle construction for every item that has no
 * actual to grab (M-2). It mirrors `itemGrabRects` case for case; the two must stay
 * in lock-step, which the hit-tester tests pin.
 *
 * @param item - The placed item, or undefined when it is not in the document.
 * @param epochDate - The document time-axis origin, or undefined before one is set.
 * @param planShown - Whether the plan side passes the display filter.
 * @param actualShown - Whether the actual side passes the display filter.
 * @returns True when the item owns a second (or relocated) actual rectangle.
 */
function ownsActualGrabRect(
  item: ScheduleItem | undefined,
  epochDate: IsoDate | undefined,
  planShown: boolean,
  actualShown: boolean,
): boolean {
  if (item === undefined || epochDate === undefined) {
    return false;
  }
  if (!actualShown || item.actualStart === undefined) {
    return false;
  }
  // With the plan hidden, the lone drawn glyph IS the actual, wherever it sits; with
  // both sides shown, only an item that really draws a second actual bar has one.
  return planShown ? drawsActualBar(item) : true;
}

/** Resolves pointer hits against items, annotations and dependency lines. */
export class HitTester {
  /**
   * Hit-test the visible item set at a screen point (topmost lane wins). Only
   * items that currently pass viewport + LOD culling are hit-testable, which is
   * the intended behavior (you can only grab what you can see).
   */
  public hitTest(ctx: RenderContext, screenX: number, screenY: number): ItemHit | null {
    const point = ctx.screenToWorld(screenX, screenY);
    const fontSize = FONT_SIZE_BY_SCALE[ctx.viewState.fontScale];

    // Fade corner handles on a SELECTED task win first: they are small, on top of
    // the glyph, and their gesture (set fade-in/out) must take precedence over the
    // move/resize-edge under the same corner.
    const fadeHit = this.hitTestFadeHandle(ctx, point.worldX, point.worldY);
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
    //
    // M-2 (hot path): `hitTest` runs on EVERY pointer move, so the cheap rejections
    // come first. An item is dropped by its lane band (a scalar compare on the
    // placement) and then by the plan rectangle itself; only an item that both
    // survives the band AND really owns a second/relocated ACTUAL rectangle -- a
    // field test, no date parsing -- pays for {@link itemGrabRects}, which is what
    // turns dates into world x.
    const epochDate = ctx.scheduleDocument?.epochDate;
    const display = ctx.viewState.planActualDisplay;
    const planShown = isPlanSideShown(display);
    const actualShown = isActualSideShown(display);
    // The ONLY rectangle that can sit outside a placement's own lane band is the
    // `separate` actual bar stacked below it, so the band is widened by exactly that
    // offset (and only when the active style/filter can stack one).
    const stacksActualBelowPlan =
      planShown && actualShown && resolvePlanActualStyle(ctx.viewState.planActualStyle) === 'separate';
    const candidates: HitCandidate[] = [];
    for (const placement of ctx.placements) {
      if (!ctx.hasMountedItem(placement.itemId)) {
        continue;
      }
      const bandBottom =
        placement.worldY +
        placement.worldHeight +
        (stacksActualBelowPlan ? separateActualBarOffsetPx(placement.worldHeight) : 0);
      if (point.worldY < placement.worldY || point.worldY > bandBottom) {
        continue;
      }
      const item = ctx.itemById.get(placement.itemId);
      const isTask = item?.itemKind === 'task';
      const isSelected = ctx.selectedItemIds.has(placement.itemId);
      if (!ownsActualGrabRect(item, epochDate, planShown, actualShown)) {
        // Plan rectangle only (the overwhelming majority): test the placement in
        // place, allocating nothing and parsing no dates.
        if (rectContainsPoint(placement, point.worldX, point.worldY)) {
          candidates.push({
            itemId: placement.itemId,
            laneIndex: placement.laneIndex,
            worldLeft: placement.worldX,
            worldWidth: placement.worldWidth,
            isTask,
            isSelected,
            side: 'plan',
          });
        }
        continue;
      }
      for (const grab of this.itemGrabRects(ctx, placement)) {
        if (!rectContainsPoint(grab, point.worldX, point.worldY)) {
          continue;
        }
        candidates.push({
          itemId: placement.itemId,
          laneIndex: placement.laneIndex,
          worldLeft: grab.worldX,
          worldWidth: grab.worldWidth,
          // BOTH sides carry resize edges on a task: a plan edge writes the plan
          // dates, an actual edge writes `actualStart` / `actualEnd` (M-1). A
          // milestone stays point-like on either side (no resizable edge).
          isTask,
          isSelected,
          side: grab.isPlanSide ? 'plan' : 'actual',
        });
      }
    }
    const bodyHit = pickItemHit(candidates, point.worldX, RESIZE_HANDLE_PX);
    if (bodyHit !== null) {
      return bodyHit.side === 'actual'
        ? { side: 'actual', itemId: bodyHit.itemId, region: bodyHit.region }
        : { side: 'plan', itemId: bodyHit.itemId, region: bodyHit.region };
    }

    // Labels can sit OUTSIDE the glyph, so fall back to them only when the pointer is
    // not inside any bar body (they win ties among themselves by document order).
    for (const placement of ctx.placements) {
      if (!ctx.hasMountedItem(placement.itemId)) {
        continue;
      }
      const item = ctx.itemById.get(placement.itemId);
      if (item === undefined || item.abbrev.length === 0) {
        continue;
      }
      if (pointInLabelBox(item, placement, fontSize, point.worldX, point.worldY)) {
        return { side: 'plan', itemId: placement.itemId, region: 'label' };
      }
    }
    return null;
  }

  /**
   * The world-space rectangles of an item that are grabbable, in the SAME frame the
   * item layer draws them (CR-013 Part 2):
   *
   * - Normally the laid-out plan lane rectangle, exactly as before.
   * - Under `actual-only` the lone drawn glyph sits on the ACTUAL extent, so the grab
   *   rectangle moves with it instead of staying on the hidden plan span.
   * - When a stacked actual BAR is drawn (`separate` with both sides shown), its own
   *   rectangle is grabbable too -- it lives below the plan bar, outside the plan
   *   rectangle, and would otherwise be un-clickable.
   *
   * Every actual rectangle carries the {@link actualBarRenderWidthPx} screen-space
   * minimum width, so a "started, not finished" actual (a zero-length span) has a real
   * grab target at any zoom.
   *
   * Only called for items {@link ownsActualGrabRect} accepted: the plan-rectangle-only
   * cases are answered by the caller without building anything (M-2).
   */
  private itemGrabRects(
    ctx: RenderContext,
    placement: ItemPlacement,
  ): readonly (ItemLaneRect & { readonly isPlanSide: boolean })[] {
    const planRect = { ...placement, isPlanSide: true };
    const item = ctx.itemById.get(placement.itemId);
    const epochDate = ctx.scheduleDocument?.epochDate;
    if (item === undefined || epochDate === undefined) {
      return [planRect];
    }
    const display = ctx.viewState.planActualDisplay;
    const planShown = isPlanSideShown(display);
    const actualShown = isActualSideShown(display);
    if (!planShown && actualShown) {
      const loneActual = actualSideLaneRect(item, placement, epochDate, ctx.viewState.zoomX);
      return loneActual === null ? [planRect] : [{ ...loneActual, isPlanSide: false }];
    }
    if (!planShown || !actualShown || !drawsActualBar(item)) {
      return [planRect];
    }
    const bars = computeItemDisplayedBars(
      item,
      placement,
      epochDate,
      ctx.viewState.zoomX,
      resolvePlanActualStyle(ctx.viewState.planActualStyle),
      display,
    );
    if (bars.actual === null) {
      return [planRect];
    }
    return [
      planRect,
      {
        worldX: bars.actual.x,
        worldY: bars.actual.y,
        worldWidth: bars.actual.width,
        worldHeight: bars.actual.height,
        isPlanSide: false,
      },
    ];
  }

  /**
   * Hit-test the fade corner handles of the currently selected tasks at a world
   * point. Returns a `fade-in` / `fade-out` hit when the point is within the grab
   * tolerance of a selected task's top-left / bottom-right vertex, else null. Only
   * selected tasks draw handles, so only they are corner-grabbable.
   */
  private hitTestFadeHandle(ctx: RenderContext, worldX: number, worldY: number): ItemHit | null {
    const tolerance = ANNOTATION_HANDLE_PX;
    for (const placement of ctx.placements) {
      if (!ctx.hasMountedItem(placement.itemId) || !ctx.selectedItemIds.has(placement.itemId)) {
        continue;
      }
      const item = ctx.itemById.get(placement.itemId);
      if (item === undefined || item.itemKind !== 'task') {
        continue;
      }
      // Bound the VERTICAL grab tolerance to a fraction of the bar height so a SHORT
      // bar (e.g. at a small zoomY once tall multi-lane rows shrink the Fit zoom) does
      // not let the bottom-right fade corner swallow the mid-height resize edge -- the
      // fade corner then only wins genuinely near the corner, leaving the edge for
      // resize. A normal-height bar keeps the full tolerance.
      const verticalTolerance = Math.min(tolerance, placement.worldHeight * 0.4);
      const centers = taskFadeHandleCenters(item, placement, ctx.viewState.zoomX);
      if (
        Math.abs(worldX - centers.fadeIn.x) <= tolerance &&
        Math.abs(worldY - centers.fadeIn.y) <= verticalTolerance
      ) {
        return { side: 'plan', itemId: placement.itemId, region: 'fade-in' };
      }
      if (
        Math.abs(worldX - centers.fadeOut.x) <= tolerance &&
        Math.abs(worldY - centers.fadeOut.y) <= verticalTolerance
      ) {
        return { side: 'plan', itemId: placement.itemId, region: 'fade-out' };
      }
    }
    return null;
  }

  /**
   * Hit-test the canvas annotations at a screen point (CURS-L1-007 select/resize).
   * When the SELECTED rounded-box is hit near a corner, the matching resize handle
   * region is returned; otherwise the topmost annotation whose border/interior
   * contains the point is returned as a `body` (select) hit. Comments are
   * body-only (not resizable).
   */
  public hitTestAnnotation(ctx: RenderContext, screenX: number, screenY: number): AnnotationHit | null {
    if (ctx.scheduleDocument === null) {
      return null;
    }
    const rect = ctx.svgClientRect();
    const localX = screenX - rect.left;
    const localY = screenY - rect.top;
    const epoch = ctx.scheduleDocument.epochDate;
    const annotations = ctx.scheduleDocument.annotations ?? [];

    // First, a handle on the currently SELECTED annotation (handles are only drawn
    // for the selected one): a rounded-box corner, or a comment's leader-anchor
    // handle. Both take precedence over a body hit so the handle stays grabbable.
    if (ctx.selectedAnnotationId !== null) {
      const selected = annotations.find((a) => a.id === ctx.selectedAnnotationId);
      if (selected !== undefined && isRoundedBox(selected)) {
        const handle = this.roundedBoxHandleAt(ctx, selected, epoch, localX, localY);
        if (handle !== null) {
          return { annotationId: selected.id, region: handle };
        }
      }
      if (selected !== undefined && isComment(selected)) {
        const anchor = commentAnchorScreenPoint(ctx, selected, epoch);
        if (
          Math.abs(localX - anchor.x) <= ANNOTATION_HANDLE_PX &&
          Math.abs(localY - anchor.y) <= ANNOTATION_HANDLE_PX
        ) {
          return { annotationId: selected.id, region: 'anchor' };
        }
      }
    }

    // Then a body hit, topmost (last drawn) first.
    for (let index = annotations.length - 1; index >= 0; index -= 1) {
      const annotation = annotations[index];
      if (annotation === undefined) {
        continue;
      }
      if (this.annotationBodyHit(ctx, annotation, epoch, localX, localY)) {
        return { annotationId: annotation.id, region: 'body' };
      }
    }
    return null;
  }

  /** The corner-handle region of a rounded box at a local point, or null. */
  private roundedBoxHandleAt(
    ctx: RenderContext,
    box: RoundedBoxAnnotation,
    epoch: IsoDate,
    localX: number,
    localY: number,
  ): AnnotationHit['region'] | null {
    const geometry = roundedBoxScreenRect(
      box,
      epoch,
      ctx.viewState,
      ctx.contentTopOffsetPx,
      (rowIndex) => ctx.rowBoundary(rowIndex),
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
    ctx: RenderContext,
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
        ctx.viewState,
        ctx.contentTopOffsetPx,
        (rowIndex) => ctx.rowBoundary(rowIndex),
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
    const body = commentBodyRect(ctx, annotation, epoch);
    return (
      localX >= body.x && localX <= body.x + body.width && localY >= body.y && localY <= body.y + body.height
    );
  }

  /**
   * Hit-test the dependency lines at a screen point (item 1). Recomputes each
   * visible line's route in world space (same router the renderer draws with) and
   * returns the id of the nearest line within {@link DEP_HIT_TOLERANCE_PX} of the
   * pointer, or null. The content group is only translated (never scaled), so world
   * px == screen px and the tolerance is a real on-screen grab zone.
   */
  public hitTestDependency(ctx: RenderContext, screenX: number, screenY: number): string | null {
    const dependencies = ctx.scheduleDocument?.dependencies ?? [];
    if (dependencies.length === 0) {
      return null;
    }
    const point = ctx.screenToWorld(screenX, screenY);
    const rectByItemId = new Map<string, Rect>();
    for (const itemId of ctx.mountedItemIds()) {
      const placement = ctx.placementById.get(itemId);
      if (placement !== undefined) {
        rectByItemId.set(itemId, placementRect(placement));
      }
    }
    let bestId: string | null = null;
    let bestDistance = DEP_HIT_TOLERANCE_PX;
    for (const dependency of dependencies) {
      // A line hidden by the plan/actual filter or a cross-kind (legacy) edge is not
      // grabbable, matching what the render layer draws (DEP plan/actual rework).
      if (!isDependencyRenderable(dependency, ctx.itemById, ctx.viewState.planActualDisplay)) {
        continue;
      }
      const fromRect = rectByItemId.get(dependency.fromItemId);
      const toRect = rectByItemId.get(dependency.toItemId);
      if (fromRect === undefined || toRect === undefined) {
        continue; // an endpoint is not currently laid out / visible.
      }
      const route = routeConnector(fromRect, toRect);
      const distance = distanceToPolyline(point.worldX, point.worldY, route.points);
      if (distance <= bestDistance) {
        bestDistance = distance;
        bestId = dependency.id;
      }
    }
    return bestId;
  }
}

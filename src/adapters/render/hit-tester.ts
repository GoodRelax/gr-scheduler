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

import type { IsoDate } from '../../domain/model/schedule-model.js';
import type {
  Annotation,
  RoundedBoxAnnotation,
} from '../../domain/model/annotation.js';
import { isComment, isRoundedBox } from '../../domain/model/annotation.js';
import { pickItemHit, type HitCandidate } from '../../domain/usecase/edge-hit.js';
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

/** A hit against a rendered item, with the sub-region under the pointer. */
export interface ItemHit {
  readonly itemId: string;
  /** Which part of the item was hit (drives move vs resize vs label drag vs fade). */
  readonly region: 'body' | 'resize-start' | 'resize-end' | 'label' | 'fade-in' | 'fade-out';
}

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
    const candidates: HitCandidate[] = [];
    for (const placement of ctx.placements) {
      if (!ctx.hasMountedItem(placement.itemId)) {
        continue;
      }
      const withinX =
        point.worldX >= placement.worldX && point.worldX <= placement.worldX + placement.worldWidth;
      const withinY =
        point.worldY >= placement.worldY && point.worldY <= placement.worldY + placement.worldHeight;
      if (!withinX || !withinY) {
        continue;
      }
      const item = ctx.itemById.get(placement.itemId);
      candidates.push({
        itemId: placement.itemId,
        laneIndex: placement.laneIndex,
        worldLeft: placement.worldX,
        worldWidth: placement.worldWidth,
        isTask: item?.itemKind === 'task',
        isSelected: ctx.selectedItemIds.has(placement.itemId),
      });
    }
    const bodyHit = pickItemHit(candidates, point.worldX, RESIZE_HANDLE_PX);
    if (bodyHit !== null) {
      return bodyHit;
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

/**
 * Adapter layer: dependency lines (DEP-L1-001/003/004, H-1 split). Only
 * dependencies with at least one endpoint inside the viewport window are drawn,
 * and obstacles are limited to the mounted (visible) item set, so the dependency
 * node count stays bounded by the visible dependencies -- never one path per 1000
 * items (ADR-006 consequence / RISK-001 perf strategy). The layer owns the mounted
 * dependency nodes and diff-patches them like the item layer.
 */

import type { Dependency } from '../../../domain/model/schedule-model.js';
import { DEFAULT_DEPENDENCY_LINE_COLOR } from '../../../domain/model/schedule-model.js';
import type { Rect } from '../../../domain/usecase/dependency-router.js';
import { routeConnector } from '../../../domain/usecase/dependency-connector.js';
import { isDependencyRenderable } from '../../../domain/usecase/dependency-visibility.js';
import { placementIntersectsWindow, type ViewportWindow } from '../../../domain/usecase/viewport.js';
import { DEP_ARROW_MARKER_ID, placementRect } from '../dependency-geometry.js';
import { SVG_NS, type RenderContext } from '../render-context.js';

/** A mounted dependency line: the path plus the id it was routed for. */
interface MountedDependency {
  readonly path: SVGPathElement;
}

/** Routes, draws and diff-patches the dependency lines in their own group. */
export class DependencyLayer {
  private readonly depMountedById = new Map<string, MountedDependency>();

  public constructor(
    private readonly contentGroup: SVGGElement,
    private readonly depGroup: SVGGElement,
  ) {}

  /** Number of mounted dependency nodes (for metrics logging). */
  public get mountedCount(): number {
    return this.depMountedById.size;
  }

  /** Remove every mounted dependency node (document replaced). */
  public clear(): void {
    for (const mounted of this.depMountedById.values()) {
      mounted.path.remove();
    }
    this.depMountedById.clear();
  }

  /**
   * Route and draw the dependency lines for the current viewport, then keep the
   * dependency group above the item glyphs by re-appending it last.
   */
  public render(ctx: RenderContext, viewportWindow: ViewportWindow): void {
    const dependencies = ctx.scheduleDocument?.dependencies ?? [];
    const desiredIds = new Set<string>();

    // Build ONE `itemId -> Rect` map per render (bounded to the mounted/visible
    // set) and reuse the SAME Rect instances both as obstacles and as endpoint
    // rects. Sharing instances plus the itemId tag makes the router's endpoint
    // self-exclusion robust regardless of comparison strategy (H-01 / L-02).
    const rectByItemId = new Map<string, Rect>();
    for (const itemId of ctx.mountedItemIds()) {
      const placement = ctx.placementById.get(itemId);
      if (placement !== undefined) {
        rectByItemId.set(itemId, placementRect(placement));
      }
    }

    for (const dependency of dependencies) {
      // Constraint (DEP plan/actual rework): only plan->plan / actual->actual edges are
      // drawn, and only when BOTH endpoints are visible under the plan/actual filter.
      // A cross-kind (legacy) edge or a hidden-side edge is skipped -- never crashes.
      if (!isDependencyRenderable(dependency, ctx.itemById, ctx.viewState.planActualDisplay)) {
        continue;
      }
      const fromPlacement = ctx.placementById.get(dependency.fromItemId);
      const toPlacement = ctx.placementById.get(dependency.toItemId);
      if (fromPlacement === undefined || toPlacement === undefined) {
        continue; // an endpoint item is hidden (collapsed/deleted): drop the line.
      }
      const fromVisible = placementIntersectsWindow(fromPlacement, viewportWindow);
      const toVisible = placementIntersectsWindow(toPlacement, viewportWindow);
      if (!fromVisible && !toVisible) {
        continue; // neither endpoint near the viewport: skip (bounded node count).
      }
      desiredIds.add(dependency.id);
      const fromRect =
        rectByItemId.get(dependency.fromItemId) ?? placementRect(fromPlacement);
      const toRect = rectByItemId.get(dependency.toItemId) ?? placementRect(toPlacement);
      this.drawDependency(ctx, dependency, fromRect, toRect);
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
    ctx: RenderContext,
    dependency: Dependency,
    fromRect: Rect,
    toRect: Rect,
  ): void {
    const route = routeConnector(fromRect, toRect);
    // route.points[0] is the source center-right exit and the last point the target
    // center-left entry, so the drawn line leaves/enters the fixed house-style anchors
    // (DEP-L1-003 rework).
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
    const isSelected = dependency.id === ctx.selectedDependencyId;
    mounted.path.setAttribute('stroke-width', isSelected ? '3.2' : '1.4');
    if (isSelected) {
      mounted.path.setAttribute('data-selected', 'true');
    } else {
      mounted.path.removeAttribute('data-selected');
    }
  }
}

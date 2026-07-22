/**
 * Adapter layer: the item glyphs -- milestones, tasks (rect / polygon / path),
 * their abbreviation labels, accessible titles, selection outlines, keyboard focus
 * rings and fade handles (H-1 split). Owns the virtualized mounted-node set and
 * runs the create / patch / remove diff against the viewport + LOD + plan/actual
 * filter, exactly as the monolith did. The produced DOM is byte-identical.
 *
 * Paint order inside one item group (DEF-009): `<title>`, the primary glyph (plan
 * bar / milestone plan marker), then every other bar or marker, and LAST the
 * `item-label-layer` group holding the abbreviation and the assignee name. Bars are
 * mounted through {@link ItemLayer.mountBeneathLabels}, so text always paints above
 * them -- including the vivid ACTUAL bar that overlays the plan bar under `overlap`.
 */

import type { PlanActualDisplay, ScheduleItem } from '../../../domain/model/schedule-model.js';
import type { ItemPlacement } from '../../../domain/usecase/layout-engine.js';
import type { ViewportWindow } from '../../../domain/usecase/viewport.js';
import { placementIntersectsWindow } from '../../../domain/usecase/viewport.js';
import { lodThreshold, shouldRenderAllItems } from '../../../domain/usecase/lod-selector.js';
import { filterByPlanActualDisplay } from '../../../domain/usecase/progress-line-builder.js';
import {
  actualDisplayFillColor,
  displayFillColor,
} from '../../../domain/usecase/plan-actual-colors.js';
import {
  resolvePlanActualStyle,
  type PlanActualBarRect,
} from '../../../domain/usecase/plan-actual-geometry.js';
import {
  computeItemPlanActualPaint,
  type ItemPlanActualPaint,
} from '../../../domain/usecase/plan-actual-paint.js';
import {
  effectiveMilestoneShape,
  effectiveTaskShape,
  milestoneIconHeightPx,
  milestoneLabelFontSizePx,
  taskGlyphPaintMode,
  taskGlyphPath,
  taskShapeUsesPath,
  TASK_CONNECTOR_LINE_Y_FRACTION,
} from '../../../domain/usecase/task-glyph.js';
import {
  fadePointsToAttribute,
  hasFade,
  type FadePoint,
} from '../../../domain/usecase/fade-geometry.js';
import { itemAccessibleName } from '../../../domain/usecase/accessible-name.js';
import { assigneeLabelGeometry } from '../../../domain/usecase/assignee-layout.js';
import {
  FOCUS_RING_DASH_ARRAY,
  FOCUS_RING_HEX,
  FOCUS_RING_STROKE_WIDTH,
  ITEM_LABEL_HEX,
  planActualStrokeWidthPx,
  SELECTION_DASH_ARRAY,
} from '../../../domain/usecase/a11y-tokens.js';
import { CUD_BLUE_ACCENT_HEX, HANDLE_FILL_HEX } from '../../../domain/usecase/render-tokens.js';
import {
  ANNOTATION_HANDLE_DRAW_HALF_PX,
  chevronFadeExtentsPx,
  labelAnchorPoint,
  milestonePath,
  milestoneShapeUsesEvenOdd,
  resolveStrokeAttribute,
  strokeWidthPx,
  taskAbbrevFontSize,
  taskFadeHandleCenters,
  taskFadePoints,
  TASK_LINE_ARROW_STROKE_PX,
} from '../item-geometry.js';
import { SVG_NS, type RenderContext } from '../render-context.js';

interface MountedItem {
  readonly group: SVGGElement;
  /**
   * The glyph element. A milestone is a `path`; a task is a `rect` when it has no
   * fade (identical to the pre-fade rendering) and a `polygon` when it tapers. It
   * is swapped in place by {@link ItemLayer.ensureTaskGlyphElement} when a task's
   * fade turns on or off, so a bar keeps exactly one glyph node.
   */
  shape: SVGElement;
  /**
   * The item's TEXT layer (DEF-009): a group created with the item node and kept as
   * the paint anchor every bar/marker is inserted BEFORE, so the abbreviation and the
   * assignee name always paint ABOVE the plan bar and the vivid actual bar under both
   * the `overlap` and `separate` styles. Never removed, so the invariant survives the
   * lazy creation / removal cycles of the actual bar and the milestone actual marker.
   */
  readonly labelLayer: SVGGElement;
  readonly label: SVGTextElement;
  /**
   * The optional assignee-name label drawn to the LEFT of the glyph (CR-004 Part 5),
   * present only while {@link ViewState.assigneeVisible} is on and the item has an
   * assignee. Lazily created; removed when hidden or the assignee is cleared.
   */
  assigneeLabel: SVGTextElement | null;
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
  /**
   * The ACTUAL bar (PLAN-L1-005), present only for a plain-rect task that records
   * actual dates: overlaid on the plan bar under `overlap`, stacked below it under
   * `separate`. Lazily created; removed when the item has no actual side or is not a
   * plain rect.
   */
  actualBar: SVGRectElement | null;
  /**
   * The ACTUAL milestone marker (CR-002 Part 2), a second glyph drawn at the
   * milestone's `actualStart` when present. A milestone shows plan + actual as TWO
   * markers with NO filled span between them. Lazily created; removed when the
   * milestone has no actual or the item is not a milestone.
   */
  milestoneActualMarker: SVGPathElement | null;
  /**
   * The optional thin leader line joining a milestone's plan and actual markers
   * (CR-002 Part 2), cueing the shift. Present only alongside a milestone actual
   * marker.
   */
  milestoneLeader: SVGLineElement | null;
}

/** The result of one item diff pass (feeds the renderer's metrics snapshot). */
export interface ItemDiffMetrics {
  readonly liveNodeCount: number;
  readonly createdCount: number;
  readonly removedCount: number;
}

/** Builds, patches and virtualizes the item glyph nodes inside the content group. */
export class ItemLayer {
  private readonly mountedById = new Map<string, MountedItem>();

  public constructor(private readonly contentGroup: SVGGElement) {}

  /** Whether an item currently has a mounted (visible) DOM node. */
  public hasMounted(itemId: string): boolean {
    return this.mountedById.has(itemId);
  }

  /** The ids of every item with a mounted (visible) DOM node. */
  public mountedIds(): IterableIterator<string> {
    return this.mountedById.keys();
  }

  /** Remove every mounted item node (document replaced / cleared). */
  public clear(): void {
    for (const mounted of this.mountedById.values()) {
      mounted.group.remove();
    }
    this.mountedById.clear();
  }

  /**
   * Run the item create / patch / remove diff for the current viewport window,
   * culling by LOD threshold, the plan/actual display filter and viewport
   * intersection. Returns the node counts for the renderer's metrics snapshot.
   */
  public render(ctx: RenderContext, viewportWindow: ViewportWindow): ItemDiffMetrics {
    const effectiveZoom = Math.min(ctx.viewState.zoomX, ctx.viewState.zoomY);
    // A small schedule renders in FULL: bypass both the LOD threshold and viewport
    // virtualization so every item is shown regardless of zoom/scroll. This is the
    // startup-Fit under-render fix -- at the default (un-fitted) zoom = 1 the viewport
    // window would otherwise cull every item past the first screen, and at the very
    // small fit zoom the LOD threshold would cull all but the top-importance items.
    // Large schedules keep the bounded, virtualized live-node set (ADR-009).
    const renderAllItems = shouldRenderAllItems(ctx.scheduleDocument?.items.length ?? 0);
    const threshold = renderAllItems ? 0 : lodThreshold(effectiveZoom);

    // Plan/actual display filter (PLAN-L1-002): drop the hidden side entirely.
    const visibleItemIds = new Set(
      filterByPlanActualDisplay(
        ctx.scheduleDocument?.items ?? [],
        ctx.viewState.planActualDisplay,
      ).map((item) => item.id),
    );

    const desiredIds = new Set<string>();
    let createdCount = 0;

    for (const placement of ctx.placements) {
      const item = ctx.itemById.get(placement.itemId);
      if (item === undefined || item.importance < threshold) {
        continue;
      }
      if (!visibleItemIds.has(placement.itemId)) {
        continue;
      }
      if (!renderAllItems && !placementIntersectsWindow(placement, viewportWindow)) {
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
      this.patchItemNode(ctx, mounted, item, placement);
    }

    let removedCount = 0;
    for (const [itemId, mounted] of this.mountedById) {
      if (!desiredIds.has(itemId)) {
        mounted.group.remove();
        this.mountedById.delete(itemId);
        removedCount += 1;
      }
    }

    return { liveNodeCount: this.mountedById.size, createdCount, removedCount };
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
    // DEF-009: every text node lives in a dedicated layer group kept LAST among the
    // painted children, so an actual bar created later can never bury the label.
    const labelLayer = document.createElementNS(SVG_NS, 'g');
    labelLayer.setAttribute('data-role', 'item-label-layer');
    labelLayer.appendChild(label);
    // Title first so it is the accessible name source; then the graphic + text layer.
    group.appendChild(title);
    group.appendChild(shape);
    group.appendChild(labelLayer);
    return {
      group,
      shape,
      labelLayer,
      label,
      assigneeLabel: null,
      title,
      selectionOutline: null,
      focusRing: null,
      fadeInHandle: null,
      fadeOutHandle: null,
      actualBar: null,
      milestoneActualMarker: null,
      milestoneLeader: null,
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
    ctx: RenderContext,
    mounted: MountedItem,
    item: ScheduleItem,
    placement: ItemPlacement,
  ): void {
    // Swap the glyph element FIRST (rect / polygon / path per shape + fade) so the
    // paint attributes below land on the element actually shown this frame.
    this.ensureTaskGlyphElement(mounted, item);
    // Plan/actual display filter (PLAN-L1-002, DEF-008): the filter gates the BARS,
    // not just which items are drawn. Under `actual-only` the item's SINGLE glyph
    // stands in for the actual side -- placed over the actual extent, painted in the
    // vivid shade -- so no plan bar survives and no second (actual) node is mounted;
    // under `plan-only` every actual node is removed and the plan bar fills the lane.
    // Every one of those decisions comes from the SHARED paint helper the SVG exporter
    // also calls (DEF-011), so screen and export cannot drift apart (ARCH-C-022).
    const display = ctx.viewState.planActualDisplay;
    const paint = this.computeItemPaint(ctx, item, placement, display);
    /** True while the primary glyph stands in for the ACTUAL side (actual-only). */
    const glyphIsLoneActual = paint.primaryGlyphSide === 'actual';
    /** The rectangle the primary glyph is drawn from (the actual extent when lone). */
    const glyphPlacement: ItemPlacement = {
      ...placement,
      worldX: paint.primaryGlyphRect.x,
      worldY: paint.primaryGlyphRect.y,
      worldWidth: paint.primaryGlyphRect.width,
      worldHeight: paint.primaryGlyphRect.height,
    };
    // Plan/actual coloring (CR-002 Part 1): the PLAN side is the pale shade derived
    // from the item's own base fill (or the base fill itself for a plan-only item /
    // an explicit fill); the ACTUAL side is the vivid shade. The grey baseline
    // underlay is a separate layer (GhostLayer) and is unaffected. The plan/actual
    // outline WEIGHT below (thin plan / thick actual) is the non-color redundancy
    // for WCAG 1.4.1.
    const fillColor = glyphIsLoneActual ? actualDisplayFillColor(item) : displayFillColor(item);
    const taskShape = item.itemKind === 'task' ? effectiveTaskShape(item) : null;
    const paintMode = taskShape === null ? 'fill' : taskGlyphPaintMode(taskShape);
    if (paintMode === 'line') {
      // Arrow: a LINE arrow (shaft + open head), stroked with the item's own color at
      // a thicker weight so it reads as an arrow; no fill.
      mounted.shape.setAttribute('fill', 'none');
      mounted.shape.setAttribute('stroke', fillColor);
      mounted.shape.setAttribute('stroke-width', String(TASK_LINE_ARROW_STROKE_PX));
      mounted.shape.setAttribute('stroke-dasharray', 'none');
    } else if (paintMode === 'line-with-dots') {
      // A `span` (*---*) connector: a stroked line whose small FILLED dot terminals
      // need a fill, so both fill and stroke take the item's own color.
      mounted.shape.setAttribute('fill', fillColor);
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
    // Clear any side marker left over from a previous display mode; the branches
    // below re-apply it whenever this glyph really stands for one plan/actual side.
    mounted.shape.removeAttribute('data-plan-actual-side');

    // Refresh the accessible name (abbrev + kind + dates) for the active locale.
    const accessibleName = itemAccessibleName(item, ctx.viewState.activeLocale ?? 'en');
    mounted.title.textContent = accessibleName;
    mounted.group.setAttribute('aria-label', accessibleName);

    if (item.itemKind === 'milestone') {
      // CR-004 Part 2: the milestone icon is drawn 15% TALLER than the task-bar lane
      // height, centered on the lane so the extra height overhangs symmetrically.
      const iconHeight = milestoneIconHeightPx(glyphPlacement.worldHeight);
      const radius = iconHeight / 2;
      // Under `actual-only` this center is already the ACTUAL point (glyphPlacement).
      const glyphCenterX = glyphPlacement.worldX;
      const centerY = glyphPlacement.worldY + glyphPlacement.worldHeight / 2;
      // CR-004 Part 6b: the default `star` renders as an OUTLINE (stroke only, no
      // fill) unless the user set an explicit fill_color; other milestone shapes keep
      // the general fill/stroke paint set above. CR-004 Part 6c: the composite special
      // glyphs fill with the evenodd rule so their inner subpaths read as holes.
      const milestoneShape = effectiveMilestoneShape(item);
      if (milestoneShape === 'star' && item.fillColorExplicit !== true) {
        mounted.shape.setAttribute('fill', 'none');
        mounted.shape.setAttribute('stroke', fillColor);
        mounted.shape.setAttribute('stroke-width', String(strokeWidthPx(item.lineWeight)));
      }
      mounted.shape.setAttribute('fill-rule', milestoneShapeUsesEvenOdd(item) ? 'evenodd' : 'nonzero');
      mounted.shape.setAttribute('data-milestone-shape', milestoneShape);
      // The primary glyph is the PLAN marker at startDate (its laid-out worldX) --
      // or, under `actual-only`, the lone ACTUAL marker at actualStart.
      mounted.shape.setAttribute('d', milestonePath(item, glyphCenterX, centerY, radius));
      // CR-002 Part 2: a milestone shows plan + actual as TWO markers with NO filled
      // span between them (a point has no span to paint). The shared paint decision
      // yields the actual marker's world-x only while BOTH sides are shown and an
      // actual is recorded; a lone side is a single marker.
      if (paint.milestoneActualCenterX !== null) {
        this.updateMilestoneActualMarker(
          mounted,
          item,
          paint.milestoneActualCenterX,
          glyphCenterX,
          centerY,
          radius,
        );
      } else {
        this.removeMilestoneActualMarker(mounted);
      }
      // A milestone never carries a task actual BAR (Overlap/Separate is tasks-only).
      this.removeActualBar(mounted);
    } else if (taskShape !== null && taskShapeUsesPath(taskShape)) {
      // Arrow / chevron / span draw from their own vertices. A CHEVRON tapers its
      // concave (fade-in) left and pointed (fade-out) right by the fade extents; the
      // arrow / span line stays in the lower band with the label above it.
      const glyphOptions =
        taskShape === 'chevron' ? chevronFadeExtentsPx(item, glyphPlacement) : {};
      mounted.shape.setAttribute(
        'd',
        taskGlyphPath(
          taskShape,
          {
            x: glyphPlacement.worldX,
            y: glyphPlacement.worldY,
            width: glyphPlacement.worldWidth,
            height: glyphPlacement.worldHeight,
          },
          glyphOptions,
        ),
      );
      if (taskShape === 'arrow' || taskShape === 'span') {
        // Expose the connector line's y so tests / assistive tech can confirm the
        // centered abbreviation sits ABOVE the line (items 3 / 4).
        mounted.shape.setAttribute(
          'data-connector-line-y',
          String(
            glyphPlacement.worldY + glyphPlacement.worldHeight * TASK_CONNECTOR_LINE_Y_FRACTION,
          ),
        );
      } else {
        mounted.shape.removeAttribute('data-connector-line-y');
      }
      if (taskShape === 'span') {
        mounted.shape.setAttribute('data-span-terminals', '2');
      } else {
        mounted.shape.removeAttribute('data-span-terminals');
      }
      if (taskShape === 'chevron') {
        // A chevron carries its fade days so tests / AT can read the taper (item 5).
        mounted.shape.setAttribute('data-fade-in-days', String(item.fadeInDays ?? 0));
        mounted.shape.setAttribute('data-fade-out-days', String(item.fadeOutDays ?? 0));
      } else {
        mounted.shape.removeAttribute('data-fade-in-days');
        mounted.shape.removeAttribute('data-fade-out-days');
      }
      // Path-shaped tasks (arrow / chevron / span) do not carry a separate actual bar.
      this.removeActualBar(mounted);
    } else if (hasFade(item.fadeInDays, item.fadeOutDays)) {
      // Faded task: draw the 4-point trapezoid/parallelogram. The polygon carries a
      // data attribute so tests/AT can read the taper without re-deriving geometry.
      const points = taskFadePoints(item, glyphPlacement, ctx.viewState.zoomX);
      mounted.shape.setAttribute('points', fadePointsToAttribute(points));
      mounted.shape.setAttribute('data-fade-in-days', String(item.fadeInDays ?? 0));
      mounted.shape.setAttribute('data-fade-out-days', String(item.fadeOutDays ?? 0));
      // A tapered polygon bar does not carry a separate actual bar.
      this.removeActualBar(mounted);
    } else {
      // Plain rectangular task bar: the shared paint decision already routed the
      // two-mode plan/actual geometry (PLAN-L1-005) through the display filter
      // (PLAN-L1-002). The primary glyph carries the PLAN bar, or the ACTUAL bar when
      // the plan side is filtered out (a lone bar, never a second node).
      const glyphRect = paint.primaryGlyphRect;
      mounted.shape.setAttribute('x', String(glyphRect.x));
      mounted.shape.setAttribute('y', String(glyphRect.y));
      mounted.shape.setAttribute('width', String(glyphRect.width));
      mounted.shape.setAttribute('height', String(glyphRect.height));
      mounted.shape.setAttribute('rx', '2');
      if (paint.actualBarRect !== null) {
        // Plan + actual coexist: the vivid actual shade doubles as the outline color
        // so the non-color line-WEIGHT redundancy (CR-002 Part 1) reads over both the
        // pale plan fill and the vivid actual fill. The PLAN bar takes the THIN
        // outline (supplementary); the actual bar takes the THICK one (emphasized).
        const actualFill = actualDisplayFillColor(item);
        mounted.shape.setAttribute('stroke', actualFill);
        mounted.shape.setAttribute('stroke-width', String(planActualStrokeWidthPx('plan')));
        mounted.shape.setAttribute('data-plan-actual-side', 'plan');
        this.updateActualBar(mounted, paint.actualBarRect, actualFill);
      } else {
        // One side only (or none): no second bar node. A surviving ACTUAL side is
        // marked and weighted below, with the other lone-actual glyph kinds.
        this.removeActualBar(mounted);
      }
    }

    if (glyphIsLoneActual) {
      // A lone ACTUAL glyph keeps the CR-002 Part 1 redundancy pair: the vivid shade
      // (applied as the fill above) plus the THICK plan/actual outline weight, and it
      // is tagged as the actual side so tests / assistive tech can read which side a
      // single bar represents. Stroked glyph kinds (arrow / span) are skipped: their
      // stroke IS the glyph and its weight carries the shape, not the side.
      mounted.shape.setAttribute('data-plan-actual-side', 'actual');
      if (paintMode === 'fill') {
        mounted.shape.setAttribute('stroke', fillColor);
        mounted.shape.setAttribute('stroke-width', String(planActualStrokeWidthPx('actual')));
      }
    }

    // The label follows the glyph that is actually drawn, so a lone ACTUAL bar keeps
    // its abbreviation on the bar instead of floating over the hidden plan extent.
    const labelAnchor = labelAnchorPoint(item, glyphPlacement);
    // A task's abbreviation is sized to 90% of its bar height (item 1) so it reads as
    // a big in-bar label; a milestone's side caption is sized from its (15%-enlarged)
    // ICON height (CR-004 Part 2), mirroring how a task keys its font off the bar.
    const labelFontSize =
      item.itemKind === 'task'
        ? taskAbbrevFontSize(placement.worldHeight)
        : milestoneLabelFontSizePx(milestoneIconHeightPx(placement.worldHeight));
    mounted.label.textContent = item.abbrev;
    mounted.label.setAttribute('x', String(labelAnchor.x));
    mounted.label.setAttribute('y', String(labelAnchor.y));
    mounted.label.setAttribute('text-anchor', labelAnchor.textAnchor);
    mounted.label.setAttribute('font-size', String(labelFontSize));
    mounted.label.setAttribute('fill', ITEM_LABEL_HEX);

    this.updateAssigneeLabel(mounted, item, glyphPlacement, ctx.viewState.assigneeVisible === true);
    // Selection outline, focus ring and fade handles stay on the LAID-OUT placement:
    // they mirror the hit-test / drag frame, which is the item's plan span whichever
    // side is currently displayed.
    this.updateSelectionOutline(ctx, mounted, placement);
    this.updateFocusRing(ctx, mounted, placement);
    this.updateFadeHandles(ctx, mounted, item, placement);
  }

  /**
   * Draw (or remove) an item's assignee name to the LEFT of its glyph (CR-004 Part 5,
   * ITEM-L2-004). Shown only when the assignee column is enabled and the item carries
   * an assignee; right-aligned so names across rows form a right-aligned column
   * ending just before each glyph's left edge, and vertically kept above the lane
   * center so it never overlaps a `middle_left` inbound dependency stub (DEP-L2-003).
   */
  private updateAssigneeLabel(
    mounted: MountedItem,
    item: ScheduleItem,
    placement: ItemPlacement,
    assigneeVisible: boolean,
  ): void {
    const assignee = item.assignee?.trim() ?? '';
    if (!assigneeVisible || assignee.length === 0) {
      if (mounted.assigneeLabel !== null) {
        mounted.assigneeLabel.remove();
        mounted.assigneeLabel = null;
      }
      return;
    }
    // A milestone glyph is centered on worldX and drawn 15% taller than the lane, so
    // its visual left edge is its center minus the icon radius; a task's left edge is
    // its worldX.
    const itemLeftX =
      item.itemKind === 'milestone'
        ? placement.worldX - milestoneIconHeightPx(placement.worldHeight) / 2
        : placement.worldX;
    const geometry = assigneeLabelGeometry(itemLeftX, placement.worldY, placement.worldHeight);
    let label = mounted.assigneeLabel;
    if (label === null) {
      label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('data-role', 'assignee-label');
      label.setAttribute('dominant-baseline', 'middle');
      label.setAttribute('pointer-events', 'none');
      // DEF-009: joins the text layer, so it paints above every bar like the abbrev.
      mounted.labelLayer.appendChild(label);
      mounted.assigneeLabel = label;
    }
    label.textContent = assignee;
    label.setAttribute('x', String(geometry.x));
    label.setAttribute('y', String(geometry.y));
    label.setAttribute('text-anchor', geometry.textAnchor);
    label.setAttribute('font-size', String(geometry.fontSizePx));
    label.setAttribute('fill', ITEM_LABEL_HEX);
  }

  /**
   * Every rectangle this item paints under the active plan/actual style
   * (PLAN-L1-005) and display filter (PLAN-L1-002, DEF-008), taken from the SHARED
   * decision {@link computeItemPlanActualPaint} -- the very function the SVG exporter
   * calls, so the canvas and the exported picture keep ONE definition (DEF-011,
   * ARCH-C-022).
   *
   * Without a document there is no time axis to map an actual onto, so the item is
   * painted from its lane rectangle alone (plan side only).
   *
   * @param ctx - The render context (document, view state, zoom).
   * @param item - The item to paint.
   * @param placement - Its laid-out lane rectangle.
   * @param display - The active display filter; `undefined` behaves as `both`.
   * @returns The primary glyph rectangle, the optional actual bar and the optional
   *   milestone actual marker position.
   */
  private computeItemPaint(
    ctx: RenderContext,
    item: ScheduleItem,
    placement: ItemPlacement,
    display: PlanActualDisplay | undefined,
  ): ItemPlanActualPaint {
    const epochDate = ctx.scheduleDocument?.epochDate;
    const { actualStart: _droppedActualStart, ...planOnlyItem } = item;
    return computeItemPlanActualPaint(
      epochDate === undefined ? planOnlyItem : item,
      placement,
      epochDate ?? item.startDate,
      ctx.viewState.zoomX,
      resolvePlanActualStyle(ctx.viewState.planActualStyle),
      display,
    );
  }

  /**
   * Mount a bar / marker node so it always paints BENEATH the item's text layer
   * (DEF-009). SVG paints later siblings on top, so inserting before the (always
   * last, never removed) label layer keeps the abbreviation and the assignee name
   * readable over both the pale plan bar and the vivid actual bar, no matter in which
   * order the lazily created nodes appear or how often the plan/actual display and
   * style are toggled.
   */
  private mountBeneathLabels(mounted: MountedItem, node: SVGElement): void {
    mounted.group.insertBefore(node, mounted.labelLayer);
  }

  /** Create or update the actual bar rect for a plain-rect task (PLAN-L1-005). */
  private updateActualBar(mounted: MountedItem, rect: PlanActualBarRect, fill: string): void {
    let bar = mounted.actualBar;
    if (bar === null) {
      bar = document.createElementNS(SVG_NS, 'rect');
      bar.setAttribute('data-role', 'actual-bar');
      bar.setAttribute('data-plan-actual-side', 'actual');
      bar.setAttribute('rx', '2');
      bar.setAttribute('pointer-events', 'none');
      // DEF-009: under the default `overlap` style this vivid bar sits exactly on the
      // plan bar, so it must land BELOW the label layer or it paints over the abbrev.
      this.mountBeneathLabels(mounted, bar);
      mounted.actualBar = bar;
    }
    bar.setAttribute('x', String(rect.x));
    bar.setAttribute('y', String(rect.y));
    bar.setAttribute('width', String(rect.width));
    bar.setAttribute('height', String(rect.height));
    // CR-002 Part 1: the actual bar is the VIVID shade, outlined with the THICK
    // plan/actual weight so it stays distinguishable from the pale plan in grayscale.
    bar.setAttribute('fill', fill);
    bar.setAttribute('stroke', fill);
    bar.setAttribute('stroke-width', String(planActualStrokeWidthPx('actual')));
  }

  /** Remove the actual bar when the item has no actual side or is not a plain rect. */
  private removeActualBar(mounted: MountedItem): void {
    if (mounted.actualBar !== null) {
      mounted.actualBar.remove();
      mounted.actualBar = null;
    }
  }

  /**
   * Draw (or remove) a milestone's ACTUAL marker + optional leader line (CR-002
   * Part 2). A milestone shows plan vs actual as TWO markers -- the plan marker at
   * `startDate` (the primary glyph) and this actual marker at `actualStart` -- with
   * NO filled span between them. The actual marker uses the vivid actual shade so it
   * reads as the emphasized as-run point; a thin leader joins the two centers to cue
   * the horizontal shift.
   *
   * @param mounted - The item's mounted node set.
   * @param item - The milestone being drawn.
   * @param actualCenterX - World x of the actual point, from the shared paint decision
   *   (already aligned into the placement's world-x frame).
   * @param planCenterX - World x of the plan marker, the leader's other end.
   * @param centerY - World y both markers are centered on.
   * @param radius - Half the milestone icon height.
   */
  private updateMilestoneActualMarker(
    mounted: MountedItem,
    item: ScheduleItem,
    actualCenterX: number,
    planCenterX: number,
    centerY: number,
    radius: number,
  ): void {
    const actualFill = actualDisplayFillColor(item);

    let leader = mounted.milestoneLeader;
    if (leader === null) {
      leader = document.createElementNS(SVG_NS, 'line');
      leader.setAttribute('data-role', 'milestone-plan-actual-leader');
      leader.setAttribute('stroke', actualFill);
      leader.setAttribute('stroke-width', '1');
      leader.setAttribute('stroke-dasharray', '2 2');
      leader.setAttribute('pointer-events', 'none');
      // Behind the two markers so the endpoints stay crisp.
      mounted.group.insertBefore(leader, mounted.shape);
      mounted.milestoneLeader = leader;
    }
    leader.setAttribute('x1', String(planCenterX));
    leader.setAttribute('y1', String(centerY));
    leader.setAttribute('x2', String(actualCenterX));
    leader.setAttribute('y2', String(centerY));
    leader.setAttribute('stroke', actualFill);

    let marker = mounted.milestoneActualMarker;
    if (marker === null) {
      marker = document.createElementNS(SVG_NS, 'path');
      marker.setAttribute('data-role', 'milestone-actual-marker');
      marker.setAttribute('data-plan-actual-side', 'actual');
      marker.setAttribute('pointer-events', 'none');
      // DEF-009: the milestone caption stays readable over the actual marker too.
      this.mountBeneathLabels(mounted, marker);
      mounted.milestoneActualMarker = marker;
    }
    marker.setAttribute('d', milestonePath(item, actualCenterX, centerY, radius));
    marker.setAttribute('fill', actualFill);
    marker.setAttribute('stroke', 'none');
    marker.setAttribute('fill-rule', milestoneShapeUsesEvenOdd(item) ? 'evenodd' : 'nonzero');
  }

  /** Remove a milestone's actual marker + leader when it records no actual. */
  private removeMilestoneActualMarker(mounted: MountedItem): void {
    if (mounted.milestoneActualMarker !== null) {
      mounted.milestoneActualMarker.remove();
      mounted.milestoneActualMarker = null;
    }
    if (mounted.milestoneLeader !== null) {
      mounted.milestoneLeader.remove();
      mounted.milestoneLeader = null;
    }
  }

  /**
   * Add or remove the two corner fade handles for a selected task (top-left =
   * fade-in, bottom-right = fade-out). Reuses the small half-size white square with
   * a blue border from the rounded-box handles. Handles are removed for milestones
   * and unselected items.
   */
  private updateFadeHandles(
    ctx: RenderContext,
    mounted: MountedItem,
    item: ScheduleItem,
    placement: ItemPlacement,
  ): void {
    const show = item.itemKind === 'task' && ctx.selectedItemIds.has(placement.itemId);
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
    const centers = taskFadeHandleCenters(item, placement, ctx.viewState.zoomX);
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
      handle.setAttribute('fill', HANDLE_FILL_HEX);
      handle.setAttribute('stroke', CUD_BLUE_ACCENT_HEX);
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
  private updateSelectionOutline(
    ctx: RenderContext,
    mounted: MountedItem,
    placement: ItemPlacement,
  ): void {
    const isSelected = ctx.selectedItemIds.has(placement.itemId);
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
      outline.setAttribute('stroke', CUD_BLUE_ACCENT_HEX);
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
  private updateFocusRing(
    ctx: RenderContext,
    mounted: MountedItem,
    placement: ItemPlacement,
  ): void {
    const isFocused = ctx.keyboardFocusItemId === placement.itemId;
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
}

/**
 * Adapter layer: the two measurement cursors (CURS-L1-002/003) and the
 * pointer-following measurement guide (items 9-12), both drawn in the screen-space
 * overlay (H-1 split). The dual cursor measures a fixed date span; the guide
 * tracks the live pointer in one of four exclusive modes.
 */

import type { CursorMode, CursorGuideMode } from '../../../domain/model/schedule-model.js';
import {
  CURSOR_GUIDE_DOUBLE_LINE_COLOR,
  CURSOR_GUIDE_LINE_COLOR,
} from '../../../domain/model/schedule-model.js';
import {
  cursorGuideSpanDays,
  cursorGuideSpanLabel,
  cursorScreenX,
  cursorSpanDays,
} from '../../../domain/usecase/cursor-span.js';
import { CUD_BLUE_ACCENT_HEX, CUD_GREEN_ACCENT_HEX } from '../../../domain/usecase/render-tokens.js';
import { SVG_NS, type RenderContext } from '../render-context.js';

/** Draws the measurement cursors and the pointer-following guide into the overlay. */
export class CursorGuideLayer {
  public constructor(private readonly overlayGroup: SVGGElement) {}

  /**
   * Draw the two measurement cursors and the day-count above the SECONDARY (差分)
   * marker (CURS-L1-002/003, mock feedback). Each cursor is a vertical line, plus
   * a horizontal line when in crosshair mode.
   */
  public renderDualCursor(ctx: RenderContext): void {
    const cursor = ctx.viewState.dualCursor;
    if (ctx.scheduleDocument === null || cursor === undefined || cursor.visible !== true) {
      return;
    }
    const epoch = ctx.scheduleDocument.epochDate;
    const primaryX = cursorScreenX(cursor.primary.atDate, epoch, ctx.viewState);
    const secondaryX = cursorScreenX(cursor.secondary.atDate, epoch, ctx.viewState);
    this.drawCursorMarker(ctx, primaryX, cursor.primary.mode, CUD_BLUE_ACCENT_HEX);
    this.drawCursorMarker(ctx, secondaryX, cursor.secondary.mode, CUD_GREEN_ACCENT_HEX);

    // Day-count above the secondary marker (signed base -> diff span).
    const spanDays = cursorSpanDays(cursor.primary.atDate, cursor.secondary.atDate);
    const label = document.createElementNS(SVG_NS, 'text');
    label.textContent = `${spanDays >= 0 ? '+' : ''}${spanDays}d`;
    label.setAttribute('x', String(secondaryX));
    label.setAttribute('y', '14');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '12');
    label.setAttribute('font-weight', '600');
    label.setAttribute('fill', CUD_GREEN_ACCENT_HEX);
    this.overlayGroup.appendChild(label);
  }

  /** Draw one cursor's vertical line (+ horizontal line in crosshair mode). */
  private drawCursorMarker(ctx: RenderContext, screenX: number, mode: CursorMode, color: string): void {
    const vertical = document.createElementNS(SVG_NS, 'line');
    vertical.setAttribute('x1', String(screenX));
    vertical.setAttribute('x2', String(screenX));
    vertical.setAttribute('y1', '0');
    vertical.setAttribute('y2', String(ctx.canvasSize.heightPx));
    vertical.setAttribute('stroke', color);
    vertical.setAttribute('stroke-width', '1.2');
    this.overlayGroup.appendChild(vertical);
    if (mode === 'crosshair') {
      const midY = ctx.canvasSize.heightPx / 2;
      const horizontal = document.createElementNS(SVG_NS, 'line');
      horizontal.setAttribute('x1', String(ctx.leftPaneWidth));
      horizontal.setAttribute('x2', String(ctx.canvasSize.widthPx));
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
   * - `double-vertical` -- a FIXED reference line (line-1, pinned to a stored date)
   *                        plus a pointer-tracking measuring line (line-2), with a
   *                        day-span label ("N days") between them.
   *
   * The lines are THIN SOLID lines (no dash, ~1px) -- the earlier dashed style read as
   * dotted and is removed (item 1). They are placed from the LIVE pointer client
   * position mapped into the SVG's own coordinate box (`clientX - rect.left`), the same
   * screen space the overlay group is drawn in. Nothing is drawn while the pointer is
   * off-canvas or over the frozen left pane.
   */
  public renderGuide(ctx: RenderContext): void {
    const mode: CursorGuideMode = ctx.viewState.cursorGuideMode ?? 'none';
    if (mode === 'none' || ctx.pointerClient === null) {
      return;
    }
    const rect = ctx.svgClientRect();
    const x = ctx.pointerClient.clientX - rect.left;
    const y = ctx.pointerClient.clientY - rect.top;
    const leftPaneWidth = ctx.leftPaneWidth;
    const rightEdge = ctx.canvasSize.widthPx;
    const bottomEdge = ctx.canvasSize.heightPx;
    // Only over the schedule area (right of the frozen pane, inside the canvas).
    if (x < leftPaneWidth || x > rightEdge || y < 0 || y > bottomEdge) {
      return;
    }
    // crosshair + single-vertical draw in shocking pink; double-vertical draws in the
    // shocking-green complement so the span (two-line) guide is distinct at a glance
    // (item 1). Both are bright accents legible over the light and the dark canvas.
    const color =
      mode === 'double-vertical' ? CURSOR_GUIDE_DOUBLE_LINE_COLOR : CURSOR_GUIDE_LINE_COLOR;
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('data-role', 'cursor-guide');
    group.setAttribute('data-guide-mode', mode);
    group.setAttribute('pointer-events', 'none');

    if (mode === 'double-vertical') {
      this.buildDoubleVerticalGuide(ctx, group, x, bottomEdge, color);
    } else {
      // A vertical line at the pointer for the crosshair / single-vertical modes.
      group.appendChild(this.buildGuideLine(x, 0, x, bottomEdge, color));
      if (mode === 'crosshair') {
        // Plus a horizontal line spanning the schedule area at the pointer's y.
        group.appendChild(this.buildGuideLine(leftPaneWidth, y, rightEdge, y, color));
      }
    }
    this.overlayGroup.appendChild(group);
  }

  /**
   * Draw the double-vertical SPAN guide: a FIXED reference line (line-1, pinned to
   * {@link ViewState.cursorGuideReferenceDate}) that is individually selectable /
   * draggable, plus a pointer-tracking measuring line (line-2), and a day-count label
   * of the span between them (cursor-guide span rework). Falls back to a lone measuring
   * line when no reference date or document is available yet.
   */
  private buildDoubleVerticalGuide(
    ctx: RenderContext,
    group: SVGGElement,
    pointerX: number,
    bottomEdge: number,
    color: string,
  ): void {
    // The measuring line (line-2) always tracks the pointer.
    const measuringLine = this.buildGuideLine(pointerX, 0, pointerX, bottomEdge, color);
    measuringLine.setAttribute('data-guide-role', 'measure');

    const referenceDate = ctx.viewState.cursorGuideReferenceDate;
    const epoch = ctx.scheduleDocument?.epochDate;
    if (referenceDate === undefined || epoch === undefined) {
      group.appendChild(measuringLine);
      return;
    }
    const referenceX = cursorScreenX(referenceDate, epoch, ctx.viewState);
    // The FIXED reference line (line-1). Tagged so the editing controller can hit-test
    // and drag it, and drawn with a data-selected flag when it is the active selection.
    const referenceLine = this.buildGuideLine(referenceX, 0, referenceX, bottomEdge, color);
    referenceLine.setAttribute('data-role', 'cursor-guide-reference');
    referenceLine.setAttribute('data-guide-role', 'reference');
    if (ctx.cursorGuideReferenceSelected === true) {
      referenceLine.setAttribute('data-selected', 'true');
      referenceLine.setAttribute('stroke-width', '2');
    }
    group.appendChild(referenceLine);
    group.appendChild(measuringLine);

    // Day-span label ("N days") placed just right of the measuring line, near the top.
    const spanDays = cursorGuideSpanDays(referenceDate, pointerX, epoch, ctx.viewState);
    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('data-role', 'cursor-guide-span-label');
    label.textContent = cursorGuideSpanLabel(spanDays);
    label.setAttribute('x', String(pointerX + 6));
    label.setAttribute('y', '28');
    label.setAttribute('font-size', '12');
    label.setAttribute('font-weight', '600');
    label.setAttribute('fill', color);
    group.appendChild(label);
  }

  /** Build one thin SOLID screen-space guide line element (no dash, item 1). */
  private buildGuideLine(x1: number, y1: number, x2: number, y2: number, color: string): SVGLineElement {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2));
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '1');
    // Explicitly no dash: the guide lines are THIN SOLID lines (item 1). The prior
    // 'stroke-dasharray' read as dotted, which the user reported as still-dotted.
    line.setAttribute('stroke-dasharray', 'none');
    return line;
  }
}

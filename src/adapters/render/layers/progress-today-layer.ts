/**
 * Adapter layer: the vertical today line (CURS-L1-001) and the illuminated
 * (progress) line (PLAN-L1-003 / L2-001), both drawn in the screen-space overlay
 * (H-1 split). The progress line is a plain polyline (no terminal dots) whose
 * vertices are each row's actual front; the today line is a thin dashed blue rule.
 */

import {
  DEFAULT_PROGRESS_LINE_COLOR,
  TODAY_LINE_COLOR,
} from '../../../domain/model/schedule-model.js';
import {
  buildIlluminatedLine,
  type RowProgressFront,
} from '../../../domain/usecase/progress-line-builder.js';
import { cursorScreenX } from '../../../domain/usecase/cursor-span.js';
import { fromDayNumber, toDayNumber } from '../../../domain/usecase/time-coordinate-mapper.js';
import { SVG_NS, type RenderContext } from '../render-context.js';

/** Draws the today line and the illuminated progress line into the overlay. */
export class ProgressTodayLayer {
  public constructor(private readonly overlayGroup: SVGGElement) {}

  /**
   * Draw the illuminated (progress) line as a PLAIN polyline (no terminal dots),
   * toggled with the actual display (PLAN-L1-003 / L2-001). Each row's actual
   * front becomes a vertex; the builder anchors the ends to today's axis.
   */
  public renderProgressLine(ctx: RenderContext): void {
    if (ctx.scheduleDocument === null || ctx.viewState.planActualDisplay === 'plan-only') {
      return;
    }
    // Deletable / hideable (item 2): a false flag removes the line from the DOM.
    // Absent is treated as visible so legacy documents keep showing it.
    if (ctx.viewState.progressLineVisible === false) {
      return;
    }
    const { fronts, itemCenterByRowIndex } = this.computeRowProgressFronts(ctx);
    const worldVertices = buildIlluminatedLine(
      ctx.today,
      fronts,
      ctx.scheduleDocument.epochDate,
      ctx.viewState.zoomX,
      ctx.viewState.zoomY,
      (rowIndex) => ctx.rowTop(rowIndex),
      (rowIndex) => ctx.rowHeight(rowIndex),
      // Bend at the touched item's vertical center; fall back to the band center for a
      // row whose front-defining item has no placement (item 3).
      (rowIndex) =>
        itemCenterByRowIndex.get(rowIndex) ?? ctx.rowTop(rowIndex) + ctx.rowHeight(rowIndex) / 2,
    );
    if (worldVertices.length < 2) {
      return;
    }
    const pathData = worldVertices
      .map((vertex, index) => {
        const x = ctx.worldToContentX(vertex.worldX);
        const y = ctx.worldToContentY(vertex.worldY);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('data-role', 'progress-line');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    // Editable color (item 2), defaulting to purple when unset.
    path.setAttribute('stroke', ctx.viewState.progressLineColor ?? DEFAULT_PROGRESS_LINE_COLOR);
    path.setAttribute('stroke-width', '1.6');
    path.setAttribute('stroke-linejoin', 'round');
    this.overlayGroup.appendChild(path);
  }

  /** Draw the vertical today line across the schedule area (CURS-L1-001). */
  public renderTodayLine(ctx: RenderContext): void {
    if (ctx.scheduleDocument === null || ctx.viewState.todayLineVisible !== true) {
      return;
    }
    const x = cursorScreenX(ctx.today, ctx.scheduleDocument.epochDate, ctx.viewState);
    if (x < ctx.leftPaneWidth || x > ctx.canvasSize.widthPx) {
      return;
    }
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(x));
    line.setAttribute('x2', String(x));
    line.setAttribute('y1', '0');
    line.setAttribute('y2', String(ctx.canvasSize.heightPx));
    // High-brightness blue (dodger blue), THIN and dashed so the today marker reads
    // as a cool, high-contrast line distinct from the warm dependency gold (item 2).
    line.setAttribute('data-role', 'today-line');
    line.setAttribute('stroke', TODAY_LINE_COLOR);
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-dasharray', '6 3');
    this.overlayGroup.appendChild(line);
  }

  /**
   * Derive each visible row's actual-progress front date from its actual items
   * (PLAN-L2-001). The front is `start + progressRatio * span`; the furthest
   * front on a row wins. Rows with no actual item contribute no vertex.
   */
  private computeRowProgressFronts(ctx: RenderContext): {
    fronts: RowProgressFront[];
    itemCenterByRowIndex: Map<number, number>;
  } {
    const frontDayByRowIndex = new Map<number, number>();
    // The world-space vertical center of the ITEM that defines each row's front, so the
    // progress line can bend exactly at that item's mid-height (item 3). Keyed by the
    // same row index as the front and taken from the item's own placement, which already
    // accounts for the 90%-of-lane stacked bar height and the row band's top padding.
    const itemCenterByRowIndex = new Map<number, number>();
    for (const item of ctx.scheduleDocument?.items ?? []) {
      if (item.planActualKind !== 'actual') {
        continue;
      }
      const displayId = ctx.rowIdToDisplayId.get(item.rowId) ?? item.rowId;
      const rowIndex = ctx.rowOrderById.get(displayId);
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
        const placement = ctx.placementById.get(item.id);
        if (placement !== undefined) {
          itemCenterByRowIndex.set(rowIndex, placement.worldY + placement.worldHeight / 2);
        }
      }
    }
    const fronts: RowProgressFront[] = [];
    for (const [rowIndex, frontDay] of frontDayByRowIndex) {
      fronts.push({ rowIndex, frontDate: fromDayNumber(frontDay) });
    }
    return { fronts, itemCenterByRowIndex };
  }
}

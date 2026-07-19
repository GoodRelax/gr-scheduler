/**
 * Adapter layer: rounded-box enclosure annotations in screen space with a
 * zoom-invariant corner radius (CURS-L1-007 / L2-001, H-1 split). The rect follows
 * zoom/pan; the corner radius and the selection handles are fixed screen-pixel
 * values. Drawn FIRST in the overlay so items and other decorations sit above it.
 */

import { isRoundedBox } from '../../../domain/model/annotation.js';
import { roundedBoxScreenRect } from '../../../domain/usecase/cursor-span.js';
import { CUD_BLUE_ACCENT_HEX, HANDLE_FILL_HEX } from '../../../domain/usecase/render-tokens.js';
import { SELECTION_DASH_ARRAY } from '../../../domain/usecase/a11y-tokens.js';
import { ANNOTATION_HANDLE_DRAW_HALF_PX } from '../item-geometry.js';
import { SVG_NS, type RenderContext } from '../render-context.js';

/** Draws rounded-box annotations and their selection handles into the overlay. */
export class RoundedBoxLayer {
  public constructor(private readonly overlayGroup: SVGGElement) {}

  /** Append every visible rounded box (and the selected box's handles). */
  public render(ctx: RenderContext): void {
    if (ctx.scheduleDocument === null) {
      return;
    }
    const epoch = ctx.scheduleDocument.epochDate;
    for (const annotation of ctx.scheduleDocument.annotations ?? []) {
      if (!isRoundedBox(annotation)) {
        continue;
      }
      const geometry = roundedBoxScreenRect(
        annotation,
        epoch,
        ctx.viewState,
        ctx.contentTopOffsetPx,
        (rowIndex) => ctx.rowBoundary(rowIndex),
      );
      if (!ctx.screenRectVisible(geometry.x, geometry.y, geometry.width, geometry.height)) {
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
      if (annotation.id === ctx.selectedAnnotationId) {
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
    outline.setAttribute('stroke', CUD_BLUE_ACCENT_HEX);
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
      handle.setAttribute('fill', HANDLE_FILL_HEX);
      handle.setAttribute('stroke', CUD_BLUE_ACCENT_HEX);
      handle.setAttribute('stroke-width', '1.5');
      this.overlayGroup.appendChild(handle);
    }
  }
}

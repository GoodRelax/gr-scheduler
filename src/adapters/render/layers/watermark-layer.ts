/**
 * Adapter layer: the diagonal tiled evidence watermark across the whole canvas in
 * screen space (TOOL-L1-007, TOOL-L2-002, H-1 split). Faint and non-interactive;
 * uses the shared builder so it matches the SVG export exactly. The user name is
 * inserted via `textContent`, so an XSS payload in the name becomes inert text
 * (C-17).
 */

import { buildWatermarkLayer, resolveWatermark } from '../../../domain/usecase/watermark-builder.js';
import { WATERMARK_TILE_HEX } from '../../../domain/usecase/render-tokens.js';
import { SVG_NS, type RenderContext } from '../render-context.js';

/** Draws the tiled watermark into the overlay group. */
export class WatermarkLayer {
  public constructor(private readonly overlayGroup: SVGGElement) {}

  /** Append the watermark tiles (default-ON so a fresh document is still marked). */
  public render(ctx: RenderContext): void {
    // Default-ON: an absent watermark resolves to the enabled default mark
    // ("GoodRelax") so a fresh/legacy document still carries the evidence mark.
    const watermark = resolveWatermark(ctx.viewState.watermark);
    if (!watermark.enabled) {
      return;
    }
    const layer = buildWatermarkLayer(
      { userName: watermark.userName, timestamp: watermark.timestamp },
      ctx.canvasSize.widthPx,
      ctx.canvasSize.heightPx,
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
      text.setAttribute('fill', WATERMARK_TILE_HEX);
      group.appendChild(text);
    }
    this.overlayGroup.appendChild(group);
  }
}

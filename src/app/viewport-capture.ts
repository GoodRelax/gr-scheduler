/**
 * Framework layer: capture the CURRENT viewport as a self-contained SVG string for the
 * header SS button (CR-003 Part 1). Distinct from the Save SVG / PNG path, which
 * exports the FULL canvas via the pure `svg-exporter`; SS snapshots exactly what the
 * on-screen renderer currently shows (the same scroll / zoom / virtualized subset).
 *
 * The live SVG is cloned and made standalone so it rasterizes offline: the active
 * theme's CSS custom properties are inlined onto the clone's root and the canvas
 * element rules (which consume those variables for the background / gridlines / ruler)
 * are embedded as a `<style>` child, plus an explicit background rect so the raster is
 * never transparent. Item fills are already explicit attributes, so the drawn schedule
 * is faithful. Pure DOM plumbing (no network).
 */

import { CANVAS_ELEMENT_RULES, THEME_VARIABLE_NAMES } from './theme.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Fallback capture size when the live SVG has not been measured yet. */
const FALLBACK_WIDTH = 1280;
const FALLBACK_HEIGHT = 720;

/**
 * Build a self-contained SVG string of the current viewport from the live canvas SVG.
 *
 * @param liveSvg - The renderer's on-screen `<svg>` element.
 * @param doc - The owning document (source of the active theme variable values).
 * @returns A standalone SVG document string ready for {@link rasterizeSvgToPng}.
 */
export function buildViewportCaptureSvg(liveSvg: SVGSVGElement, doc: Document): string {
  const width = liveSvg.clientWidth || Number(liveSvg.getAttribute('width')) || FALLBACK_WIDTH;
  const height = liveSvg.clientHeight || Number(liveSvg.getAttribute('height')) || FALLBACK_HEIGHT;

  const clone = liveSvg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', SVG_NS);
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const computed = doc.defaultView?.getComputedStyle(doc.documentElement);
  const canvasBg = computed?.getPropertyValue('--grsch-canvas-bg').trim();
  if (computed !== undefined) {
    for (const name of THEME_VARIABLE_NAMES) {
      const value = computed.getPropertyValue(name).trim();
      if (value.length > 0) {
        clone.style.setProperty(name, value);
      }
    }
  }

  // Opaque background rect FIRST (behind everything) so the raster is never transparent.
  const background = doc.createElementNS(SVG_NS, 'rect');
  background.setAttribute('x', '0');
  background.setAttribute('y', '0');
  background.setAttribute('width', String(width));
  background.setAttribute('height', String(height));
  background.setAttribute('fill', canvasBg !== undefined && canvasBg.length > 0 ? canvasBg : '#ffffff');
  clone.insertBefore(background, clone.firstChild);

  // Canvas element rules (consume the inlined variables) so gridlines / ruler paint.
  const style = doc.createElementNS(SVG_NS, 'style');
  style.textContent = CANVAS_ELEMENT_RULES;
  clone.insertBefore(style, clone.firstChild);

  return new XMLSerializer().serializeToString(clone);
}

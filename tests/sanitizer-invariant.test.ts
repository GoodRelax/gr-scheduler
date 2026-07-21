import { describe, expect, it } from 'vitest';
import rendererSource from '../src/adapters/render/svg-renderer.ts?raw';
import exporterSource from '../src/domain/usecase/svg-exporter.ts?raw';

/**
 * M5a review M-1: lock the trust-boundary invariant that no imported (sanitized)
 * asset bytes are inlined into the live SVG DOM or exported markup. CR-004 Part 6a
 * withdrew the external image-import path entirely, so the STRONGER invariant now
 * holds: neither the renderer nor the exporter references `sanitizedDataUri` at
 * all. These are source-level assertions so a future change that reintroduces an
 * un-vetted asset sink fails the test.
 */
describe('sanitizer invariant (M5a review M-1)', () => {
  it('the live renderer never consumes imported asset bytes into the DOM', () => {
    // The live canvas must not touch sanitizedDataUri at all: it neither reads nor
    // inlines imported assets, so a sanitizer gap cannot reach an executable path.
    expect(rendererSource).not.toContain('sanitizedDataUri');
  });

  it('the live renderer never uses HTML-inlining sinks', () => {
    for (const sink of ['innerHTML', 'insertAdjacentHTML', 'outerHTML', 'importNode', 'DOMParser']) {
      expect(rendererSource).not.toContain(sink);
    }
  });

  it('the exporter no longer consumes imported asset bytes (image import withdrawn)', () => {
    // CR-004 Part 6a removed external image import; the exporter must not reference
    // sanitized asset bytes any more.
    expect(exporterSource).not.toContain('sanitizedDataUri');
  });

  it('the exporter never uses HTML-inlining sinks', () => {
    for (const sink of ['innerHTML', 'insertAdjacentHTML', 'outerHTML', 'document.write']) {
      expect(exporterSource).not.toContain(sink);
    }
  });
});

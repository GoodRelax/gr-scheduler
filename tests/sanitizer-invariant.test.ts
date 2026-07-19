import { describe, expect, it } from 'vitest';
import rendererSource from '../src/adapters/render/svg-renderer.ts?raw';
import exporterSource from '../src/domain/usecase/svg-exporter.ts?raw';

/**
 * M5a review M-1: lock the trust-boundary invariant that imported (sanitized)
 * assets are ONLY ever consumed as `data:` URIs via an `<image>` element, never
 * inlined into the live SVG DOM. These are source-level assertions so a future
 * change that inlines assets fails the test (the required M-1 fix; a full
 * DOMParser migration is optional/out of scope).
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

  it('the exporter consumes sanitizedDataUri ONLY inside an <image> href', () => {
    // Every occurrence of the sanitized asset URI must be immediately preceded by
    // an <image ... href= opening, i.e. a non-script image context.
    const token = 'sanitizedDataUri';
    let searchFrom = 0;
    let occurrences = 0;
    for (;;) {
      const at = exporterSource.indexOf(token, searchFrom);
      if (at === -1) {
        break;
      }
      occurrences += 1;
      // Ignore doc-comment mentions: only lines that actually build markup count.
      const preceding = exporterSource.slice(Math.max(0, at - 240), at);
      const isMarkupSite = preceding.includes('href="') || preceding.includes('<image');
      const isDocMention = /\*|@param|@returns|comment|never an external/i.test(preceding);
      expect(isMarkupSite || isDocMention).toBe(true);
      if (isMarkupSite) {
        expect(preceding).toContain('<image');
      }
      searchFrom = at + token.length;
    }
    expect(occurrences).toBeGreaterThan(0);
  });

  it('the exporter never uses HTML-inlining sinks', () => {
    for (const sink of ['innerHTML', 'insertAdjacentHTML', 'outerHTML', 'document.write']) {
      expect(exporterSource).not.toContain(sink);
    }
  });
});

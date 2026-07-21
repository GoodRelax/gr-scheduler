/**
 * Regression guard for CR-005 Part 4 (LIVE defect): the canvas comment body must
 * follow a RUNTIME font-scale toggle, equal to the minor-category name size at the
 * new scale -- not just the scale that was active at the initial render.
 *
 * This exercises the real re-render path rather than a pure buildCommentText call:
 * it drives CommentLayer.render(ctx) exactly as SvgRenderer.renderOverlay does --
 * CLEAR the overlay group, then re-render with a fresh RenderContext whose
 * viewState.fontScale changed -- and asserts the emitted `<text>` font-size tracks
 * the toggle. A test that only re-rendered once (or only called buildCommentText)
 * would not catch the live defect, where a fontScale change left the previously
 * rendered comment `<text>` untouched.
 *
 * jsdom / happy-dom are not installed (package.json is frozen), so the REAL layer
 * code runs against the compact fake SVG DOM used by the other renderer-layer tests.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { IsoDate, ScheduleDocument, FontScale } from '../src/domain/model/schedule-model.js';
import type { Annotation } from '../src/domain/model/annotation.js';
import { CommentLayer } from '../src/adapters/render/layers/comment-layer.js';
import { minorCategoryNameFontPx } from '../src/app/font-scale.js';
import { createGroup, installFakeSvgDocument, type FakeSvgNode } from './helpers/fake-svg-dom.js';
import { makeRenderContext } from './helpers/make-render-context.js';

function documentWithComment(): ScheduleDocument {
  const comment: Annotation = {
    id: 'c1',
    annotationKind: 'callout-box',
    text: 'note',
    anchorDate: '2026-01-05' as IsoDate,
    anchorRowIndex: 0,
    anchorPoint: 4,
    bodyOffsetPx: { dx: 40, dy: -30 },
  } as unknown as Annotation;
  return {
    schemaVersion: 1,
    title: 'comment-font-scale',
    epochDate: '2026-01-01' as IsoDate,
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [],
    rows: [],
    items: [],
    annotations: [comment],
  };
}

let dom: { restore(): void };
beforeEach(() => {
  dom = installFakeSvgDocument();
});
afterEach(() => {
  dom.restore();
});

/**
 * Re-render the overlay the way SvgRenderer.renderOverlay does: clear the group,
 * then draw the comment layer for a context at the given scale. Returns the emitted
 * comment `<text>` font-size.
 */
function renderCommentAtScale(overlay: FakeSvgNode, fontScale: FontScale): string | null {
  // Clear (renderOverlay empties the overlay group before each frame's rebuild).
  while (overlay.firstChild !== null) {
    overlay.removeChild(overlay.firstChild);
  }
  const doc = documentWithComment();
  const viewState = { ...doc.viewState, fontScale };
  new CommentLayer(overlay as unknown as SVGGElement).render(
    makeRenderContext({
      // ctx.viewState is what the layer reads (= SvgRenderer.this.viewState at
      // runtime, updated by setViewState on a scale toggle).
      viewState,
      scheduleDocument: { ...doc, viewState },
      rowTop: () => 0,
      rowHeight: () => 40,
    }),
  );
  for (const text of overlay.querySelectorAll('text')) {
    if (text.textContent === 'note') {
      return text.getAttribute('font-size');
    }
  }
  return null;
}

describe('CR-005 Part 4: comment body follows a runtime font-scale toggle', () => {
  it('renders the comment body at the minor-category name size for the active scale', () => {
    const overlay = createGroup();
    for (const scale of ['S', 'M', 'L'] as FontScale[]) {
      expect(renderCommentAtScale(overlay, scale)).toBe(String(minorCategoryNameFontPx(scale)));
    }
  });

  it('UPDATES on a re-render when only the scale changed (the live-defect path)', () => {
    const overlay = createGroup();
    // Initial render at L (the sample default): comment is 11.
    expect(renderCommentAtScale(overlay, 'L')).toBe(String(minorCategoryNameFontPx('L')));
    expect(renderCommentAtScale(overlay, 'L')).toBe('11');
    // Toggle to S -> the rebuilt comment text must now be 8, not the stale 11.
    expect(renderCommentAtScale(overlay, 'S')).toBe(String(minorCategoryNameFontPx('S')));
    expect(renderCommentAtScale(overlay, 'S')).toBe('8');
    // And back up to M -> 9.
    expect(renderCommentAtScale(overlay, 'M')).toBe(String(minorCategoryNameFontPx('M')));
    expect(renderCommentAtScale(overlay, 'M')).toBe('9');
  });

  it('emits exactly one comment text per re-render (no stale text left behind)', () => {
    const overlay = createGroup();
    renderCommentAtScale(overlay, 'L');
    renderCommentAtScale(overlay, 'S');
    const bodies = (overlay as unknown as FakeSvgNode)
      .querySelectorAll('text')
      .filter((t) => t.textContent === 'note');
    expect(bodies).toHaveLength(1);
    expect(bodies[0]?.getAttribute('font-size')).toBe(String(minorCategoryNameFontPx('S')));
  });
});

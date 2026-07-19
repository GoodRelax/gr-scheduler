import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { IsoDate, ScheduleDocument, ViewState } from '../src/domain/model/schedule-model.js';
import {
  CURSOR_GUIDE_DOUBLE_LINE_COLOR,
  CURSOR_GUIDE_LINE_COLOR,
} from '../src/domain/model/schedule-model.js';
import {
  cursorGuideSpanDays,
  cursorGuideSpanLabel,
  cursorScreenX,
} from '../src/domain/usecase/cursor-span.js';
import { CursorGuideLayer } from '../src/adapters/render/layers/cursor-guide-layer.js';
import {
  createGroup,
  installFakeSvgDocument,
  type FakeSvgNode,
} from './helpers/fake-svg-dom.js';
import { makeRenderContext } from './helpers/make-render-context.js';

/**
 * Real-(fake)-DOM coverage for the cursor-guide lines (batch items 1 & 3): the guide
 * lines are THIN SOLID lines (no dash), colored per mode, and the double-vertical mode
 * draws a fixed reference line + a pointer-tracking measuring line + a day-span label.
 */

const SVG_G = () => createGroup() as unknown as SVGGElement;

function sampleDocument(): ScheduleDocument {
  return {
    schemaVersion: 1,
    title: 'Test',
    epochDate: '2026-01-01' as IsoDate,
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [],
    rows: [],
    items: [],
  };
}

let dom: { restore(): void };

beforeEach(() => {
  dom = installFakeSvgDocument();
});

afterEach(() => {
  dom.restore();
});

/** All guide lines in a rendered overlay group. */
function guideLines(overlay: SVGGElement): FakeSvgNode[] {
  const node = overlay as unknown as FakeSvgNode;
  const guide = node.querySelector('[data-role="cursor-guide"]');
  return guide?.querySelectorAll('line') ?? [];
}

describe('cursor-guide lines are thin and SOLID (item 1)', () => {
  for (const mode of ['crosshair', 'single-vertical'] as const) {
    it(`${mode}: no dash, thin stroke, shocking pink`, () => {
      const overlay = SVG_G();
      const viewState: ViewState = {
        zoomX: 1,
        zoomY: 1,
        scrollX: 0,
        scrollY: 0,
        fontScale: 'M',
        cursorGuideMode: mode,
      };
      new CursorGuideLayer(overlay).renderGuide(
        makeRenderContext({
          scheduleDocument: sampleDocument(),
          viewState,
          pointerClient: { clientX: 300, clientY: 200 },
          leftPaneWidth: 0,
        }),
      );
      const lines = guideLines(overlay);
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) {
        const dash = line.getAttribute('stroke-dasharray');
        expect(dash === null || dash === 'none').toBe(true);
        expect(line.getAttribute('stroke-width')).toBe('1');
        expect(line.getAttribute('stroke')).toBe(CURSOR_GUIDE_LINE_COLOR);
      }
    });
  }

  it('double-vertical guide lines are green, solid and thin', () => {
    const overlay = SVG_G();
    const viewState: ViewState = {
      zoomX: 1,
      zoomY: 1,
      scrollX: 0,
      scrollY: 0,
      fontScale: 'M',
      cursorGuideMode: 'double-vertical',
      cursorGuideReferenceDate: '2026-02-01' as IsoDate,
    };
    new CursorGuideLayer(overlay).renderGuide(
      makeRenderContext({
        scheduleDocument: sampleDocument(),
        viewState,
        pointerClient: { clientX: 300, clientY: 200 },
        leftPaneWidth: 0,
      }),
    );
    const lines = guideLines(overlay);
    for (const line of lines) {
      const dash = line.getAttribute('stroke-dasharray');
      expect(dash === null || dash === 'none').toBe(true);
      expect(line.getAttribute('stroke')).toBe(CURSOR_GUIDE_DOUBLE_LINE_COLOR);
    }
  });
});

describe('double-vertical measurement (item 3)', () => {
  const viewState: ViewState = {
    zoomX: 1,
    zoomY: 1,
    scrollX: 0,
    scrollY: 0,
    fontScale: 'M',
    cursorGuideMode: 'double-vertical',
    cursorGuideReferenceDate: '2026-02-01' as IsoDate,
  };

  it('draws a fixed reference line, a pointer measuring line and a day-span label', () => {
    const overlay = SVG_G();
    // Place the pointer exactly at the screen x of 2026-02-11 (10 days after ref).
    const pointerX = cursorScreenX('2026-02-11', '2026-01-01', viewState);
    new CursorGuideLayer(overlay).renderGuide(
      makeRenderContext({
        scheduleDocument: sampleDocument(),
        viewState,
        pointerClient: { clientX: pointerX, clientY: 200 },
        leftPaneWidth: 0,
      }),
    );
    const node = overlay as unknown as FakeSvgNode;
    const reference = node.querySelector('[data-role="cursor-guide-reference"]');
    expect(reference).not.toBeNull();
    // The reference line is individually addressable (selectable / draggable).
    expect(reference?.getAttribute('data-guide-role')).toBe('reference');
    const guide = node.querySelector('[data-role="cursor-guide"]');
    const measure = guide
      ?.querySelectorAll('line')
      .find((line) => line.getAttribute('data-guide-role') === 'measure');
    expect(measure).not.toBeUndefined();
    const label = node.querySelector('[data-role="cursor-guide-span-label"]');
    expect(label?.textContent).toBe('10 days');
  });

  it('highlights the reference line when it is selected', () => {
    const overlay = SVG_G();
    new CursorGuideLayer(overlay).renderGuide(
      makeRenderContext({
        scheduleDocument: sampleDocument(),
        viewState,
        pointerClient: { clientX: 300, clientY: 200 },
        leftPaneWidth: 0,
        cursorGuideReferenceSelected: true,
      }),
    );
    const reference = (overlay as unknown as FakeSvgNode).querySelector(
      '[data-role="cursor-guide-reference"]',
    );
    expect(reference?.getAttribute('data-selected')).toBe('true');
  });
});

describe('span helpers (item 3, pure)', () => {
  const viewState: ViewState = { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' };

  it('labels a day count with correct singular / plural', () => {
    expect(cursorGuideSpanLabel(5)).toBe('5 days');
    expect(cursorGuideSpanLabel(1)).toBe('1 day');
    expect(cursorGuideSpanLabel(0)).toBe('0 days');
    expect(cursorGuideSpanLabel(-3)).toBe('3 days');
  });

  it('measures the whole-day span from the reference to a pointer screen x', () => {
    const pointerX = cursorScreenX('2026-02-11', '2026-01-01', viewState);
    expect(cursorGuideSpanDays('2026-02-01', pointerX, '2026-01-01', viewState)).toBe(10);
  });
});

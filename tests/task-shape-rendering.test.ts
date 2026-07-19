/**
 * Unit coverage for the task-shape rendering batch (pure-logic + real-DOM-shim
 * parts). The live browser behavior (arrow line + head, span dots, chevron fade
 * handle drag) is asserted in tests/e2e/task-shape-rendering.spec.ts; here we lock
 * the pure geometry and the ItemLayer attributes the DOM behavior is built on:
 *
 *  1. A task abbreviation font-size == 0.9 x the rendered bar height (item 1).
 *  2. A task auto-label is centered inside the bar; a milestone keeps its side label
 *     (item 2).
 *  3. An arrow renders a stroked line + open head (not a filled block) with the label
 *     ABOVE the connector line (item 3).
 *  4. A span renders a connector with two filled dot terminals, label above the line
 *     (item 4).
 *  5. A chevron created via the palette defaults to a 14/14-day feather and its glyph
 *     tapers with the fade (item 5).
 */

import { describe, expect, it } from 'vitest';
import type { IsoDate, ScheduleDocument, ScheduleItem } from '../src/domain/model/schedule-model.js';
import { ItemLayer } from '../src/adapters/render/layers/item-layer.js';
import {
  chevronFadeExtentsPx,
  labelAnchorPoint,
  taskAbbrevFontSize,
  TASK_ABBREV_FONT_HEIGHT_RATIO,
  TASK_ABBREV_FONT_MIN_PX,
  TASK_LINE_ARROW_STROKE_PX,
} from '../src/adapters/render/item-geometry.js';
import {
  defaultFadeDaysForTaskShape,
  taskGlyphPaintMode,
  taskGlyphPath,
  TASK_CONNECTOR_LABEL_Y_FRACTION,
  TASK_CONNECTOR_LINE_Y_FRACTION,
} from '../src/domain/usecase/task-glyph.js';
import { createGroup, installFakeSvgDocument, type FakeSvgNode } from './helpers/fake-svg-dom.js';
import { makePlacement, makeRenderContext, makeTask } from './helpers/make-render-context.js';
import type { ViewportWindow } from '../src/domain/usecase/viewport.js';

const SVG_G = (): SVGGElement => createGroup() as unknown as SVGGElement;
const WIDE_WINDOW: ViewportWindow = { worldLeft: -100, worldRight: 5000, worldTop: -100, worldBottom: 5000 };
const GLYPH_RECT = { x: 100, y: 40, width: 80, height: 20 };

function sampleDocument(items: readonly ScheduleItem[]): ScheduleDocument {
  return {
    schemaVersion: 1,
    title: 'Test',
    epochDate: '2026-01-01' as IsoDate,
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [],
    rows: [],
    items,
  };
}

/** Render one item through ItemLayer against the fake SVG DOM and return its group. */
function renderItem(item: ScheduleItem, placement = makePlacement(item.id, 100, 100, 120, 40)): FakeSvgNode {
  const install = installFakeSvgDocument();
  try {
    const content = SVG_G();
    const layer = new ItemLayer(content);
    layer.render(
      makeRenderContext({
        scheduleDocument: sampleDocument([item]),
        placements: [placement],
        itemById: new Map<string, ScheduleItem>([[item.id, item]]),
      }),
      WIDE_WINDOW,
    );
    return content as unknown as FakeSvgNode;
  } finally {
    install.restore();
  }
}

describe('item 1: task abbreviation font-size is 90% of the bar height', () => {
  it('computes 0.9 x height and clamps a thin bar up to the floor', () => {
    expect(TASK_ABBREV_FONT_HEIGHT_RATIO).toBe(0.9);
    expect(taskAbbrevFontSize(40)).toBeCloseTo(36, 6);
    expect(taskAbbrevFontSize(20)).toBeCloseTo(18, 6);
    // A very thin bar clamps up to the legibility floor.
    expect(taskAbbrevFontSize(2)).toBe(TASK_ABBREV_FONT_MIN_PX);
  });

  it('renders the task label at 0.9 x the rendered bar height', () => {
    const node = renderItem(makeTask('t', { abbrev: 'T' }), makePlacement('t', 100, 100, 120, 40));
    expect(node.querySelector('text')?.getAttribute('font-size')).toBe('36');
  });
});

describe('item 2: a task auto-label is centered; a milestone keeps its side label', () => {
  const placement = makePlacement('x', 100, 100, 120, 40);

  it('centers a plain bar task auto-label on both axes', () => {
    const anchor = labelAnchorPoint(makeTask('x', { taskShape: 'bar' }), placement);
    expect(anchor.textAnchor).toBe('middle');
    expect(anchor.x).toBe(160); // worldX + width / 2
    expect(anchor.y).toBe(120); // worldY + height / 2 (vertical center)
  });

  it('keeps a milestone auto-label to the RIGHT (side label unchanged)', () => {
    const milestone: ScheduleItem = {
      id: 'x',
      rowId: 'row-0',
      itemKind: 'milestone',
      startDate: '2026-01-01',
      endDate: null,
      abbrev: 'M',
      importance: 1,
      fillColor: '#4477aa',
      strokeColor: 'none',
      milestoneShape: 'diamond',
    };
    const anchor = labelAnchorPoint(milestone, placement);
    expect(anchor.textAnchor).toBe('start');
    expect(anchor.x).toBe(224); // worldX + width + 4
    expect(anchor.y).toBe(120);
  });

  it('honors an explicit label_position override on a task', () => {
    const anchor = labelAnchorPoint(makeTask('x', { taskShape: 'bar', labelPosition: 'right' }), placement);
    expect(anchor.textAnchor).toBe('start');
    expect(anchor.x).toBe(224);
  });
});

describe('items 3 / 4: arrow is a line + head, span is a line + dots, label above the line', () => {
  it('classifies the paint mode per shape', () => {
    expect(taskGlyphPaintMode('bar')).toBe('fill');
    expect(taskGlyphPaintMode('chevron')).toBe('fill');
    expect(taskGlyphPaintMode('arrow')).toBe('line');
    expect(taskGlyphPaintMode('span')).toBe('line-with-dots');
  });

  it('builds an arrow as an OPEN head line (multi-subpath, no closing Z)', () => {
    const arrow = taskGlyphPath('arrow', GLYPH_RECT);
    expect((arrow.match(/M /g) ?? []).length).toBe(2); // shaft + open head
    expect(arrow).not.toContain('Z'); // an open (unfilled) line arrow, not a block
  });

  it('builds a span as a line + two filled circle subpaths', () => {
    const span = taskGlyphPath('span', GLYPH_RECT);
    // One shaft M plus two circle M = three subpaths; each dot is a closed arc.
    expect((span.match(/M /g) ?? []).length).toBe(3);
    expect((span.match(/ a /g) ?? []).length).toBe(4); // two arcs per circle, two circles
    expect((span.match(/Z/g) ?? []).length).toBe(2); // two closed dots
  });

  it('positions the connector line in the lower band and the label above it', () => {
    expect(TASK_CONNECTOR_LABEL_Y_FRACTION).toBeLessThan(TASK_CONNECTOR_LINE_Y_FRACTION);
    const placement = makePlacement('a', 100, 100, 120, 40);
    for (const shape of ['arrow', 'span'] as const) {
      const anchor = labelAnchorPoint(makeTask('a', { taskShape: shape }), placement);
      const lineY = placement.worldY + placement.worldHeight * TASK_CONNECTOR_LINE_Y_FRACTION;
      expect(anchor.textAnchor).toBe('middle');
      expect(anchor.y).toBeLessThan(lineY); // label sits ABOVE the line
    }
  });

  it('renders an arrow glyph as a stroked line (thicker weight, no fill) with the label above the line', () => {
    const node = renderItem(makeTask('ar', { taskShape: 'arrow', abbrev: 'AR' }));
    const path = node.querySelector('path');
    expect(path?.getAttribute('fill')).toBe('none');
    expect(path?.getAttribute('stroke-width')).toBe(String(TASK_LINE_ARROW_STROKE_PX));
    const lineY = Number(path?.getAttribute('data-connector-line-y'));
    const labelY = Number(node.querySelector('text')?.getAttribute('y'));
    expect(labelY).toBeLessThan(lineY);
  });

  it('renders a span glyph with a fill (filled dots) and two terminals, label above the line', () => {
    const node = renderItem(makeTask('sp', { taskShape: 'span', abbrev: 'SP', fillColor: '#0072b2' }));
    const path = node.querySelector('path');
    expect(path?.getAttribute('fill')).not.toBe('none'); // dots are filled
    expect(path?.getAttribute('data-span-terminals')).toBe('2');
    const lineY = Number(path?.getAttribute('data-connector-line-y'));
    const labelY = Number(node.querySelector('text')?.getAttribute('y'));
    expect(labelY).toBeLessThan(lineY);
  });
});

describe('item 5: chevron fade defaults and taper', () => {
  it('defaults a chevron to a 14/14-day feather; other shapes start square', () => {
    expect(defaultFadeDaysForTaskShape('chevron')).toEqual({ fadeInDays: 14, fadeOutDays: 14 });
    expect(defaultFadeDaysForTaskShape('bar')).toEqual({ fadeInDays: 0, fadeOutDays: 0 });
    expect(defaultFadeDaysForTaskShape('arrow')).toEqual({ fadeInDays: 0, fadeOutDays: 0 });
    expect(defaultFadeDaysForTaskShape('span')).toEqual({ fadeInDays: 0, fadeOutDays: 0 });
  });

  it('derives chevron fade extents in px from days and pixels-per-day', () => {
    // 9-day span (2026-01-01..2026-01-10) rendered 90px wide => 10 px/day.
    const placement = makePlacement('c', 0, 0, 90, 40);
    const extents = chevronFadeExtentsPx(
      makeTask('c', { taskShape: 'chevron', fadeInDays: 2, fadeOutDays: 3 }),
      placement,
    );
    expect(extents.fadeInPx).toBeCloseTo(20, 6);
    expect(extents.fadeOutPx).toBeCloseTo(30, 6);
  });

  it('a larger fade-out lengthens the chevron point (distinct path)', () => {
    const small = taskGlyphPath('chevron', GLYPH_RECT, { fadeInPx: 4, fadeOutPx: 4 });
    const bigPoint = taskGlyphPath('chevron', GLYPH_RECT, { fadeInPx: 4, fadeOutPx: 20 });
    expect(small).not.toBe(bigPoint);
    expect(small.endsWith('Z')).toBe(true); // still a closed feather body
  });

  it('renders a chevron path carrying its fade days', () => {
    const node = renderItem(
      makeTask('cv', { taskShape: 'chevron', abbrev: 'CV', fadeInDays: 14, fadeOutDays: 14 }),
    );
    const path = node.querySelector('path');
    expect(path?.getAttribute('data-fade-in-days')).toBe('14');
    expect(path?.getAttribute('data-fade-out-days')).toBe('14');
    // A chevron is a FILLED body (unlike the arrow line / span dots).
    expect(path?.getAttribute('fill')).not.toBe('none');
  });
});

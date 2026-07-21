import { describe, expect, it } from 'vitest';
import { exportScheduleSvg } from '../src/domain/usecase/svg-exporter.js';
import { CURRENT_SCHEMA_VERSION } from '../src/domain/usecase/json-codec.js';
import type { ScheduleDocument, ScheduleItem } from '../src/domain/model/schedule-model.js';

function makeItem(id: string, rowId: string, index: number): ScheduleItem {
  return {
    id,
    rowId,
    itemKind: index % 4 === 0 ? 'milestone' : 'task',
    startDate: '2026-02-01',
    endDate: index % 4 === 0 ? null : '2026-03-01',
    abbrev: id,
    importance: 1,
    ...(index % 4 === 0 ? { milestoneShape: 'diamond' as const } : { taskShape: 'bar' as const }),
    fillColor: '#4477aa',
    strokeColor: '#28527a',
  };
}

function makeDocument(itemCount: number): ScheduleDocument {
  const rows = [
    { id: 'row-1', sectionId: 'sec-1', classificationLabel: 'Design', order: 0 },
    { id: 'row-2', sectionId: 'sec-1', classificationLabel: 'Test', order: 1 },
  ];
  const items: ScheduleItem[] = [];
  for (let index = 0; index < itemCount; index += 1) {
    items.push(makeItem(`it-${index}`, index % 2 === 0 ? 'row-1' : 'row-2', index));
  }
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title: 'Export Test',
    epochDate: '2026-01-01',
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M', leftPaneWidth: 200 },
    sections: [{ id: 'sec-1', name: 'Body', order: 0, rowIds: ['row-1', 'row-2'] }],
    rows,
    items,
    dependencies: [{ id: 'dep-1', fromItemId: 'it-0', fromAnchor: 7, toItemId: 'it-1', toAnchor: 1 }],
  };
}

describe('svg-exporter (IO-L1-003, DATA-SVG-001)', () => {
  it('renders ALL items, not just a virtualized viewport subset', () => {
    const itemCount = 1000;
    const svg = exportScheduleSvg(makeDocument(itemCount));
    for (let index = 0; index < itemCount; index += 1) {
      expect(svg).toContain(`data-item-id="it-${index}"`);
    }
  });

  it('produces a self-contained SVG with no external references', () => {
    const svg = exportScheduleSvg(makeDocument(20));
    expect(svg).toMatch(/^<svg /);
    expect(svg).not.toContain('<script');
    // No external references: href/src must be a data: URI or internal #fragment
    // (the only allowed http URL is the xmlns namespace declaration).
    expect(svg).not.toMatch(/href="(?!data:|#)/);
    expect(svg).not.toMatch(/src="(?!data:|#)/);
    expect(svg).not.toContain('url(http');
    // The sole http(s) occurrence is the SVG namespace, never a resource fetch.
    const externalUrls = svg.match(/https?:\/\/[^"]+/g) ?? [];
    expect(externalUrls.every((url) => url === 'http://www.w3.org/2000/svg')).toBe(true);
  });

  it('escapes abbreviation text so an XSS payload becomes inert (C-02)', () => {
    const doc = makeDocument(1);
    const withPayload: ScheduleDocument = {
      ...doc,
      items: [{ ...(doc.items[0] as ScheduleItem), abbrev: '<img src=x onerror=alert(1)>' }],
    };
    const svg = exportScheduleSvg(withPayload);
    expect(svg).not.toContain('<img src=x');
    expect(svg).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('renders a watermark layer only when the hook is supplied (DATA-SVG-002)', () => {
    const doc = makeDocument(2);
    expect(exportScheduleSvg(doc)).not.toContain('data-layer="watermark"');
    const marked = exportScheduleSvg(doc, { watermark: { userName: 'pm-local', timestamp: '2026-07-18' } });
    expect(marked).toContain('data-layer="watermark"');
    expect(marked).toContain('pm-local 2026-07-18');
  });
});

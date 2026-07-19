import { describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  ImportRejectedError,
  deserializeScheduleDocument,
} from '../src/domain/usecase/json-codec.js';
import { sanitizeSvg } from '../src/domain/usecase/import-sanitizer.js';
import type { ScheduleDocument } from '../src/domain/model/schedule-model.js';

function docWithItemColors(fillColor: string, strokeColor: string): ScheduleDocument {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title: 'Color Import',
    epochDate: '2026-01-01',
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [{ id: 'sec-1', name: 'S', order: 0, rowIds: ['row-1'] }],
    rows: [{ id: 'row-1', sectionId: 'sec-1', classificationLabel: 'R', order: 0 }],
    items: [
      {
        id: 'it-1',
        rowId: 'row-1',
        itemKind: 'task',
        startDate: '2026-02-01',
        endDate: '2026-03-01',
        abbrev: 'T1',
        importance: 1,
        taskShape: 'bar',
        fillColor,
        strokeColor,
      },
    ],
  };
}

describe('color import validation (security-design C-02, M5a review M-3)', () => {
  it('accepts a document with valid hex item colors', () => {
    const json = JSON.stringify(docWithItemColors('#0072b2', '#4d4d4d'));
    const parsed = deserializeScheduleDocument(json);
    expect(parsed.items[0]?.fillColor).toBe('#0072b2');
  });

  it('REJECTS a document whose item fillColor is an external paint reference', () => {
    const json = JSON.stringify(docWithItemColors('url(http://evil/beacon)', '#4d4d4d'));
    expect(() => deserializeScheduleDocument(json)).toThrow(ImportRejectedError);
  });

  it('REJECTS a document whose item strokeColor smuggles expression()', () => {
    const json = JSON.stringify(docWithItemColors('#0072b2', 'expression(alert(1))'));
    expect(() => deserializeScheduleDocument(json)).toThrow(ImportRejectedError);
  });

  it('strips an external url() paint ref from an imported SVG but keeps safe colors', () => {
    const svg = sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<rect fill="url(http://evil/beacon)" stroke="#ff0000"/>' +
        '</svg>',
    );
    expect(svg).not.toContain('url(http://evil');
    expect(svg).toContain('stroke="#ff0000"');
  });

  it('keeps an INTERNAL url(#id) gradient reference in an imported SVG', () => {
    const svg = sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<defs><linearGradient id="g"><stop stop-color="#0072b2"/></linearGradient></defs>' +
        '<rect fill="url(#g)"/>' +
        '</svg>',
    );
    expect(svg).toContain('fill="url(#g)"');
  });
});

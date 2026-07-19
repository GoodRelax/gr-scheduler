import { describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  deserializeScheduleDocument,
  serializeScheduleDocument,
  validateScheduleDocument,
} from '../src/domain/usecase/json-codec.js';
import { ImportRejectedError } from '../src/domain/usecase/import-sanitizer.js';
import type { ScheduleDocument } from '../src/domain/model/schedule-model.js';
import type { Annotation } from '../src/domain/model/annotation.js';

/** A rich fixture exercising every optional collection for round-trip coverage. */
function makeRichDocument(): ScheduleDocument {
  const annotations: Annotation[] = [
    {
      id: 'cm-1',
      annotationKind: 'callout-box',
      text: 'bottleneck',
      anchorDate: '2026-09-01',
      anchorRowIndex: 1,
      bodyOffsetPx: { dx: 40, dy: -30 },
    },
    {
      id: 'box-1',
      annotationKind: 'rounded-box',
      startDate: '2026-08-01',
      endDate: '2026-09-20',
      topRowIndex: 0,
      bottomRowIndex: 1,
      strokeColor: '#cc3311',
      cornerRadiusPx: 10,
    },
  ];
  return {
    projectId: '11111111-1111-4111-8111-111111111111',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title: 'Vehicle A Program',
    epochDate: '2026-01-01',
    viewState: {
      zoomX: 1,
      zoomY: 1,
      scrollX: 0,
      scrollY: 0,
      fontScale: 'M',
      leftPaneWidth: 220,
      planActualDisplay: 'both',
      todayLineVisible: true,
      dualCursor: {
        primary: { atDate: '2026-07-01', mode: 'vertical-line' },
        secondary: { atDate: '2026-09-01', mode: 'crosshair' },
        visible: true,
      },
    },
    sections: [{ id: 'sec-1', name: 'Body', order: 0, rowIds: ['row-1', 'row-2'], collapsed: false }],
    rows: [
      { id: 'row-1', sectionId: 'sec-1', classificationLabel: 'Design', order: 0 },
      { id: 'row-2', sectionId: 'sec-1', classificationLabel: 'Test', order: 1 },
    ],
    items: [
      {
        id: 'it-1',
        rowId: 'row-1',
        itemKind: 'milestone',
        startDate: '2026-08-01',
        endDate: null,
        abbrev: 'DR1',
        importance: 90,
        milestoneShape: 'diamond',
        fillColor: '#ffffff',
        strokeColor: '#4e79a7',
        importedAssetId: 'asset-1',
      },
      {
        id: 'it-2',
        rowId: 'row-2',
        itemKind: 'task',
        startDate: '2026-08-10',
        endDate: '2026-09-20',
        abbrev: 'DUR',
        importance: 60,
        taskShape: 'bar',
        fillColor: '#f6c89a',
        strokeColor: '#f28e2b',
        previousPlan: { startDate: '2026-08-05', endDate: '2026-09-05' },
      },
    ],
    dependencies: [{ id: 'dep-1', fromItemId: 'it-1', fromAnchor: 4, toItemId: 'it-2', toAnchor: 3, bends: 2 }],
    annotations,
    assets: [{ id: 'asset-1', assetFormat: 'svg', sanitizedDataUri: 'data:image/svg+xml;base64,PHN2Zy8+' }],
  };
}

describe('json-codec round-trip (IO-L1-001, DATA-JSON-013)', () => {
  it('preserves the whole document including assets, previousPlan, annotations and dependencies', () => {
    const original = makeRichDocument();
    const restored = deserializeScheduleDocument(serializeScheduleDocument(original));
    expect(restored).toStrictEqual(original);
  });

  it('preserves the imported icon asset reference from item to assets[]', () => {
    const original = makeRichDocument();
    const restored = deserializeScheduleDocument(serializeScheduleDocument(original));
    expect(restored.items[0]?.importedAssetId).toBe('asset-1');
    expect(restored.assets?.[0]?.sanitizedDataUri).toBe('data:image/svg+xml;base64,PHN2Zy8+');
  });
});

/** A minimal document carrying one faded task, for fade-field coverage. */
function makeFadedTaskDocument(fadeInDays: number, fadeOutDays: number): ScheduleDocument {
  return {
    projectId: '22222222-2222-4222-8222-222222222222',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title: 'Fade fixture',
    epochDate: '2026-01-01',
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [{ id: 'sec-1', name: 'S', order: 0, rowIds: ['row-1'] }],
    rows: [{ id: 'row-1', sectionId: 'sec-1', classificationLabel: 'A', order: 0 }],
    items: [
      {
        id: 'task-fade',
        rowId: 'row-1',
        itemKind: 'task',
        startDate: '2026-02-01',
        endDate: '2026-02-11', // 10-day span
        abbrev: 'T',
        importance: 50,
        taskShape: 'bar',
        fillColor: '#0072b2',
        strokeColor: '#4d4d4d',
        fadeInDays,
        fadeOutDays,
      },
    ],
  };
}

describe('json-codec fade fields round-trip + validation (ITEM fade cross-fade)', () => {
  it('round-trips fadeInDays / fadeOutDays byte-for-meaning', () => {
    const original = makeFadedTaskDocument(3, 2);
    const restored = deserializeScheduleDocument(serializeScheduleDocument(original));
    expect(restored).toStrictEqual(original);
    expect(restored.items[0]?.fadeInDays).toBe(3);
    expect(restored.items[0]?.fadeOutDays).toBe(2);
  });

  it('rejects a negative fade value', () => {
    const doc = makeFadedTaskDocument(-1, 0);
    expect(() => deserializeScheduleDocument(JSON.stringify(doc))).toThrow(ImportRejectedError);
  });

  it('rejects a fade sum that exceeds the task length', () => {
    // 10-day task with 8 + 8 = 16 > 10.
    const doc = makeFadedTaskDocument(8, 8);
    expect(() => deserializeScheduleDocument(JSON.stringify(doc))).toThrow(ImportRejectedError);
  });

  it('accepts a fade sum exactly equal to the task length', () => {
    const doc = makeFadedTaskDocument(5, 5); // sum 10 == length
    expect(() => deserializeScheduleDocument(JSON.stringify(doc))).not.toThrow();
  });

  it('rejects fade fields on a milestone (tasks-only)', () => {
    const doc = makeFadedTaskDocument(1, 1);
    const item = doc.items[0] as unknown as Record<string, unknown>;
    item['itemKind'] = 'milestone';
    item['endDate'] = null;
    expect(() => deserializeScheduleDocument(JSON.stringify(doc))).toThrow(ImportRejectedError);
  });
});

describe('json-codec schemaVersion migration (DATA-JSON-001)', () => {
  it('migrates a legacy version-0 document up to the current version', () => {
    const legacy = {
      schemaVersion: 0,
      title: 'Legacy',
      epochDate: '2026-01-01',
      viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
      sections: [],
      rows: [],
      items: [],
      // no dependencies / annotations / assets: the 0->1 migration back-fills them
    };
    const restored = deserializeScheduleDocument(JSON.stringify(legacy));
    expect(restored.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(restored.dependencies).toStrictEqual([]);
    expect(restored.annotations).toStrictEqual([]);
    expect(restored.assets).toStrictEqual([]);
  });

  it('rejects a document whose schemaVersion is newer than this build', () => {
    const doc = { ...makeRichDocument(), schemaVersion: CURRENT_SCHEMA_VERSION + 5 };
    expect(() => deserializeScheduleDocument(JSON.stringify(doc))).toThrow(ImportRejectedError);
  });

  it('rejects a document with a missing/non-integer schemaVersion', () => {
    const doc = { ...makeRichDocument() } as Record<string, unknown>;
    delete doc['schemaVersion'];
    expect(() => deserializeScheduleDocument(JSON.stringify(doc))).toThrow(ImportRejectedError);
    expect(() => deserializeScheduleDocument(JSON.stringify({ ...makeRichDocument(), schemaVersion: 1.5 }))).toThrow(
      ImportRejectedError,
    );
  });
});

describe('json-codec security (C-05, C-06)', () => {
  it('drops __proto__ so imports cannot pollute Object.prototype (AS-3)', () => {
    const malicious = '{"schemaVersion":1,"__proto__":{"polluted":true},"title":"x","epochDate":"2026-01-01","viewState":{"zoomX":1,"zoomY":1,"scrollX":0,"scrollY":0,"fontScale":"M"},"sections":[],"rows":[],"items":[]}';
    deserializeScheduleDocument(malicious);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('rejects a document whose fields are wrong-typed (no coercion)', () => {
    const broken = { ...makeRichDocument(), title: 42 } as unknown;
    expect(() => validateScheduleDocument(broken)).toThrow(ImportRejectedError);
  });

  it('rejects malformed JSON text', () => {
    expect(() => deserializeScheduleDocument('{not json')).toThrow(ImportRejectedError);
  });
});

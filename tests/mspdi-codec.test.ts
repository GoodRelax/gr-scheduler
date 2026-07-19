import { describe, expect, it } from 'vitest';
import { exportMspdi, importMspdi } from '../src/domain/usecase/mspdi-codec.js';
import { ImportRejectedError } from '../src/domain/usecase/import-sanitizer.js';
import { CURRENT_SCHEMA_VERSION } from '../src/domain/usecase/json-codec.js';
import type { ScheduleDocument } from '../src/domain/model/schedule-model.js';

function makeDocument(): ScheduleDocument {
  return {
    projectId: '55555555-5555-4555-8555-555555555555',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title: 'Vehicle A Program',
    epochDate: '2026-01-01',
    viewState: { zoomX: 1.5, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'L', leftPaneWidth: 220 },
    sections: [{ id: 'sec-1', name: 'Body', order: 0, rowIds: ['row-1', 'row-2'] }],
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
        fullName: 'Design Review 1',
        importance: 90,
        milestoneShape: 'diamond',
        fillColor: '#ffffff',
        strokeColor: '#4e79a7',
      },
      {
        id: 'it-2',
        rowId: 'row-2',
        itemKind: 'task',
        startDate: '2026-08-10',
        endDate: '2026-09-20',
        abbrev: 'DUR',
        fullName: 'Durability Test',
        importance: 60,
        taskShape: 'bar',
        fillColor: '#f6c89a',
        strokeColor: '#f28e2b',
      },
    ],
    dependencies: [{ id: 'dep-1', fromItemId: 'it-1', fromAnchor: 4, toItemId: 'it-2', toAnchor: 3 }],
    annotations: [],
    assets: [{ id: 'asset-1', assetFormat: 'svg', sanitizedDataUri: 'data:image/svg+xml;base64,PHN2Zy8+' }],
  };
}

describe('mspdi-codec round-trip via sidecar (IO-L1-002, DATA-MSPDI-006)', () => {
  it('preserves the full document (gr-scheduler-only fields survive)', () => {
    const original = makeDocument();
    const restored = importMspdi(exportMspdi(original));
    expect(restored).toStrictEqual(original);
  });

  it('emits standard MSPDI elements a real MS Project could read', () => {
    const xml = exportMspdi(makeDocument());
    expect(xml).toContain('<Title>Vehicle A Program</Title>');
    expect(xml).toContain('<Milestone>1</Milestone>'); // it-1 is a milestone
    expect(xml).toContain('<Start>2026-08-10T00:00:00</Start>'); // it-2 start
    expect(xml).toContain('<PredecessorLink>'); // dependency present
    expect(xml).toContain('<Type>1</Type>'); // FinishToStart
  });
});

describe('mspdi-codec standard-element fallback (no sidecar, lossy)', () => {
  it('reconstructs tasks/dates/dependencies/hierarchy from standard elements', () => {
    const xml = exportMspdi(makeDocument());
    // Strip the sidecar Notes so only the standard MSPDI elements remain.
    const withoutSidecar = xml.replace(/<Notes>[\s\S]*?<\/Notes>/, '');
    const restored = importMspdi(withoutSidecar);
    expect(restored.items).toHaveLength(2);
    expect(restored.items[0]?.itemKind).toBe('milestone');
    expect(restored.items[0]?.startDate).toBe('2026-08-01');
    expect(restored.items[1]?.endDate).toBe('2026-09-20');
    expect(restored.dependencies).toHaveLength(1);
    expect(restored.dependencies?.[0]?.fromItemId).toBe(restored.items[0]?.id);
  });
});

describe('mspdi-codec security (C-07, C-08)', () => {
  it('rejects XML containing a DOCTYPE/ENTITY declaration (XXE / billion-laughs)', () => {
    const xxe =
      '<?xml version="1.0"?><!DOCTYPE Project [<!ENTITY x SYSTEM "file:///etc/passwd">]><Project><Title>&x;</Title></Project>';
    expect(() => importMspdi(xxe)).toThrow(ImportRejectedError);
  });
});

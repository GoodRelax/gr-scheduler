import { describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  deserializeScheduleDocument,
  serializeScheduleDocument,
} from '../src/domain/usecase/json-codec.js';
import { exportMspdi, importMspdi } from '../src/domain/usecase/mspdi-codec.js';
import { layoutItems } from '../src/domain/usecase/layout-engine.js';
import { exportScheduleSvg } from '../src/domain/usecase/svg-exporter.js';
import { anchorPoint, routeDependency } from '../src/domain/usecase/dependency-router.js';
import { ScheduleStore } from '../src/domain/command/schedule-store.js';
import { moveItemCommand } from '../src/domain/command/commands.js';
import type { ScheduleDocument } from '../src/domain/model/schedule-model.js';
import type { Annotation } from '../src/domain/model/annotation.js';

/**
 * A rich, multi-bar, multi-section fixture that exercises every collection the
 * render pipeline touches (layout, dependency routing, SVG export), used to
 * prove that codec round-trips do not just preserve raw field equality
 * (already covered by json-codec.test.ts / mspdi-codec.test.ts) but also
 * preserve the DOWNSTREAM pipeline output built from the restored document.
 */
function makePipelineDocument(): ScheduleDocument {
  const annotations: Annotation[] = [
    {
      id: 'cm-1',
      annotationKind: 'callout-box',
      text: 'bottleneck',
      anchorDate: '2026-09-01',
      anchorRowIndex: 1,
      bodyOffsetPx: { dx: 40, dy: -30 },
    },
  ];
  return {
    projectId: '33333333-3333-4333-8333-333333333333',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title: 'Pipeline Fixture',
    epochDate: '2026-01-01',
    viewState: { zoomX: 1.25, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M', leftPaneWidth: 200 },
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
        importance: 90,
        milestoneShape: 'diamond',
        fillColor: '#ffffff',
        strokeColor: '#4e79a7',
        importedAssetId: 'asset-1',
      },
      {
        id: 'it-2',
        rowId: 'row-1',
        itemKind: 'task',
        startDate: '2026-08-05',
        endDate: '2026-08-20',
        abbrev: 'DEV',
        importance: 50,
        taskShape: 'bar',
        fillColor: '#f6c89a',
        strokeColor: '#f28e2b',
      },
      {
        id: 'it-3',
        rowId: 'row-2',
        itemKind: 'task',
        startDate: '2026-08-10',
        endDate: '2026-09-20',
        abbrev: 'DUR',
        importance: 60,
        taskShape: 'chevron',
        fillColor: '#59a14f',
        strokeColor: '#3d7136',
        actualStart: '2026-08-12',
        progressRatio: 0.4,
      },
    ],
    dependencies: [{ id: 'dep-1', fromItemId: 'it-1', fromAnchor: 4, toItemId: 'it-3', toAnchor: 3, bends: 2 }],
    annotations,
    assets: [{ id: 'asset-1', assetFormat: 'svg', sanitizedDataUri: 'data:image/svg+xml;base64,PHN2Zy8+' }],
  };
}

describe('pipeline integration: layout + dependency routing + SVG export share one document', () => {
  it('routes the dependency between the exact placements the layout engine produced', () => {
    const document = makePipelineDocument();
    const placements = layoutItems(document.items, document.rows, document.epochDate, document.viewState);
    const byId = new Map(placements.map((placement) => [placement.itemId, placement]));
    const from = byId.get('it-1')!;
    const to = byId.get('it-3')!;
    const dependency = document.dependencies![0]!;

    const fromRect = { x: from.worldX, y: from.worldY, width: from.worldWidth, height: from.worldHeight };
    const toRect = { x: to.worldX, y: to.worldY, width: to.worldWidth, height: to.worldHeight };
    const routed = routeDependency(fromRect, dependency.fromAnchor, toRect, dependency.toAnchor);

    // The routed polyline's endpoints must land exactly on the layout-derived anchors.
    expect(routed.points[0]).toEqual(anchorPoint(fromRect, dependency.fromAnchor));
    expect(routed.points[routed.points.length - 1]).toEqual(anchorPoint(toRect, dependency.toAnchor));
    expect(routed.bends).toBeGreaterThanOrEqual(0);
    expect(routed.bends).toBeLessThanOrEqual(3);
  });

  it('SVG export renders one glyph per item placed by the layout engine, in the same row', () => {
    const document = makePipelineDocument();
    const placements = layoutItems(document.items, document.rows, document.epochDate, document.viewState);
    const svg = exportScheduleSvg(document);
    for (const placement of placements) {
      expect(svg).toContain(`data-item-id="${placement.itemId}"`);
    }
    // Multi-bar row-1 places it-1 and it-2 in independent lanes (no overlap).
    const row1Placements = placements.filter((placement) => placement.rowId === 'row-1');
    expect(row1Placements).toHaveLength(2);
  });
});

describe('pipeline integration: JSON round-trip preserves the whole render pipeline', () => {
  it('produces byte-identical SVG output before and after a JSON export/import round-trip', () => {
    const original = makePipelineDocument();
    const restored = deserializeScheduleDocument(serializeScheduleDocument(original));

    expect(restored).toStrictEqual(original);
    expect(exportScheduleSvg(restored)).toBe(exportScheduleSvg(original));

    const placementsBefore = layoutItems(original.items, original.rows, original.epochDate, original.viewState);
    const placementsAfter = layoutItems(restored.items, restored.rows, restored.epochDate, restored.viewState);
    expect(placementsAfter).toStrictEqual(placementsBefore);
  });

  it('a document imported from JSON can be edited via ScheduleStore commands and re-exported', () => {
    const original = makePipelineDocument();
    const restored = deserializeScheduleDocument(serializeScheduleDocument(original));

    const store = new ScheduleStore(restored);
    store.dispatch(moveItemCommand('it-2', 5));
    const edited = store.getDocument();
    expect(edited.items.find((item) => item.id === 'it-2')?.startDate).toBe('2026-08-10');

    store.undo();
    expect(store.getDocument()).toStrictEqual(restored);

    // The round-trip + edit + undo cycle never mutates the original fixture.
    expect(original.items.find((item) => item.id === 'it-2')?.startDate).toBe('2026-08-05');
  });
});

describe('pipeline integration: MSPDI round-trip (sidecar) preserves the whole render pipeline', () => {
  it('produces byte-identical SVG output before and after an MSPDI export/import round-trip', () => {
    const original = makePipelineDocument();
    const restored = importMspdi(exportMspdi(original));

    expect(restored).toStrictEqual(original);
    expect(exportScheduleSvg(restored)).toBe(exportScheduleSvg(original));
  });
});

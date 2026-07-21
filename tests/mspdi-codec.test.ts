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

/**
 * A richer document exercising the standard-element mappings B-1..B-6 + Part C:
 * hierarchy (Summary/OutlineLevel), assignee (Resource/Assignment), progressRatio
 * (PercentComplete), actual dates (ActualStart/ActualFinish), description (Notes),
 * targetDate (Deadline), and dependency linkType/lagDays (Type/LinkLag).
 */
function makeRichDocument(): ScheduleDocument {
  return {
    projectId: '66666666-6666-4666-8666-666666666666',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title: 'Rich Program',
    epochDate: '2026-01-01',
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [
      { id: 'sec-1', name: 'Body', order: 0, rowIds: ['row-1'] },
      { id: 'sec-2', name: 'Test', order: 1, rowIds: ['row-2'] },
    ],
    rows: [
      { id: 'row-1', sectionId: 'sec-1', classificationLabel: 'Design', order: 0 },
      { id: 'row-2', sectionId: 'sec-2', classificationLabel: 'Durability', order: 1 },
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
        assignee: 'A. Sato',
        targetDate: '2026-08-05',
      },
      {
        id: 'it-2',
        rowId: 'row-2',
        itemKind: 'task',
        startDate: '2026-08-10',
        endDate: '2026-09-20',
        abbrev: 'DUR',
        fullName: 'Durability Test',
        description: 'Bench durability run',
        importance: 60,
        taskShape: 'bar',
        fillColor: '#f6c89a',
        strokeColor: '#f28e2b',
        assignee: 'B. Tanaka',
        actualStart: '2026-08-14',
        actualEnd: '2026-09-18',
        progressRatio: 0.4,
        targetDate: '2026-09-30',
      },
    ],
    dependencies: [
      {
        id: 'dep-1',
        fromItemId: 'it-1',
        fromAnchor: 5,
        toItemId: 'it-2',
        toAnchor: 3,
        linkType: 'SS',
        lagDays: 10,
      },
    ],
    annotations: [],
  };
}

/** Strip the loss-free Project-level sidecar so only standard MSPDI elements remain. */
function stripSidecar(xml: string): string {
  return xml.replace(/<Notes>[\s\S]*?<\/Notes>/, '');
}

describe('mspdi-codec standard-element mappings (B-1..B-6, Part C)', () => {
  it('emits the new standard elements a real MS Project could read', () => {
    const xml = exportMspdi(makeRichDocument());
    expect(xml).toContain('<Summary>1</Summary>'); // section summary tasks (B-1)
    expect(xml).toContain('<OutlineLevel>2</OutlineLevel>'); // items under a summary
    expect(xml).toContain('<ActualStart>2026-08-14T00:00:00</ActualStart>'); // B-4
    expect(xml).toContain('<ActualFinish>2026-09-18T00:00:00</ActualFinish>'); // B-4
    expect(xml).toContain('<PercentComplete>40</PercentComplete>'); // B-3
    expect(xml).toContain('<Deadline>2026-09-30T00:00:00</Deadline>'); // Part C
    expect(xml).toContain('<Notes>Bench durability run</Notes>'); // B-6 task description
    expect(xml).toContain('<Resource><UID>1</UID><Name>A. Sato</Name></Resource>'); // B-2
    expect(xml).toContain('<Assignment>'); // B-2
    expect(xml).toContain('<Type>3</Type>'); // SS link type (Part C)
    expect(xml).toContain('<LinkLag>144000</LinkLag>'); // lagDays 10 -> 144000 (Part C)
    expect(xml).toContain('<LagFormat>8</LagFormat>'); // elapsed days (Part C)
  });

  it('round-trips the new fields through standard elements (no sidecar)', () => {
    const original = makeRichDocument();
    const restored = importMspdi(stripSidecar(exportMspdi(original)));

    // B-1: two sections restored from the two Summary tasks.
    expect(restored.sections).toHaveLength(2);
    expect(restored.sections.map((section) => section.name)).toEqual(['Body', 'Test']);

    const milestone = restored.items[0];
    const task = restored.items[1];
    expect(restored.items).toHaveLength(2);

    // B-4: actual dates.
    expect(task?.actualStart).toBe('2026-08-14');
    expect(task?.actualEnd).toBe('2026-09-18');
    // B-3: progress ratio via PercentComplete.
    expect(task?.progressRatio).toBeCloseTo(0.4, 6);
    // Part C: deadline.
    expect(milestone?.targetDate).toBe('2026-08-05');
    expect(task?.targetDate).toBe('2026-09-30');
    // B-6: description via Notes.
    expect(task?.description).toBe('Bench durability run');
    // B-2: assignees via Resource/Assignment.
    expect(milestone?.assignee).toBe('A. Sato');
    expect(task?.assignee).toBe('B. Tanaka');

    // Part C: dependency linkType + lagDays round-trip.
    expect(restored.dependencies).toHaveLength(1);
    expect(restored.dependencies?.[0]?.linkType).toBe('SS');
    expect(restored.dependencies?.[0]?.lagDays).toBe(10);
  });

  it('imports SplitParts as multiple items on one row (B-5, multi-bar)', () => {
    const xml =
      '<?xml version="1.0"?><Project><Title>Split Program</Title>' +
      '<CreationDate>2026-01-01T00:00:00</CreationDate><Tasks>' +
      '<Task><UID>1</UID><Name>Section A</Name><OutlineLevel>1</OutlineLevel><Summary>1</Summary></Task>' +
      '<Task><UID>2</UID><Name>Phase</Name><OutlineLevel>2</OutlineLevel><Summary>0</Summary>' +
      '<Start>2026-08-10T00:00:00</Start><Finish>2026-09-30T00:00:00</Finish><Milestone>0</Milestone>' +
      '<Splits>' +
      '<SplitPart><Start>2026-08-10T00:00:00</Start><Finish>2026-08-20T00:00:00</Finish></SplitPart>' +
      '<SplitPart><Start>2026-09-01T00:00:00</Start><Finish>2026-09-30T00:00:00</Finish></SplitPart>' +
      '</Splits></Task></Tasks></Project>';
    const restored = importMspdi(xml);
    expect(restored.items).toHaveLength(2);
    // Both split parts share the one row created by the summary task.
    const rowIds = new Set(restored.items.map((item) => item.rowId));
    expect(rowIds.size).toBe(1);
    expect(restored.items[0]?.startDate).toBe('2026-08-10');
    expect(restored.items[0]?.endDate).toBe('2026-08-20');
    expect(restored.items[1]?.startDate).toBe('2026-09-01');
    expect(restored.items[1]?.endDate).toBe('2026-09-30');
  });

  it('preserves the full rich document loss-free via the sidecar', () => {
    const original = makeRichDocument();
    expect(importMspdi(exportMspdi(original))).toStrictEqual(original);
  });
});

/**
 * A separate past-plan reference snapshot (DATA-JSON-016) for best-effort baseline
 * export. Its only item id (`it-2`) matches a task in {@link makeDocument}; the main
 * document's milestone `it-1` has NO baseline item, so it must emit no Baseline.
 */
function makeBaselineDocument(): ScheduleDocument {
  return {
    projectId: '77777777-7777-4777-8777-777777777777',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title: 'Baseline Snapshot',
    epochDate: '2026-01-01',
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [{ id: 'sec-1', name: 'Body', order: 0, rowIds: ['row-2'] }],
    rows: [{ id: 'row-2', sectionId: 'sec-1', classificationLabel: 'Test', order: 0 }],
    items: [
      {
        id: 'it-2',
        rowId: 'row-2',
        itemKind: 'task',
        startDate: '2026-07-15',
        endDate: '2026-08-25',
        abbrev: 'DUR0',
        fullName: 'Durability Test (baseline)',
        importance: 60,
        taskShape: 'bar',
        fillColor: '#cccccc',
        strokeColor: '#999999',
      },
    ],
    annotations: [],
  };
}

describe('mspdi-codec best-effort baseline (DATA-MSPDI-003, CR-002 Part 3)', () => {
  it('emits Baseline0 Start/Finish for id-matched tasks and omits for unmatched', () => {
    const xml = exportMspdi(makeDocument(), makeBaselineDocument());
    // it-2 matched -> Baseline0 from the baseline item's plan dates.
    expect(xml).toContain('<BaselineNumber>0</BaselineNumber>');
    expect(xml).toContain('<BaselineStart>2026-07-15T00:00:00</BaselineStart>');
    expect(xml).toContain('<BaselineFinish>2026-08-25T00:00:00</BaselineFinish>');
    // it-1 has no baseline match -> exactly one Baseline block overall.
    expect(xml.match(/<BaselineStart>/g)).toHaveLength(1);
  });

  it('emits no Baseline elements when no baseline document is supplied', () => {
    const xml = exportMspdi(makeDocument());
    expect(xml).not.toContain('<BaselineNumber>');
    expect(xml).not.toContain('<BaselineStart>');
    expect(xml).not.toContain('<BaselineFinish>');
  });

  it('drops Baseline elements on import (no per-item field to receive them)', () => {
    // With vs without baseline, differing ONLY by the Baseline0 elements.
    const withBaseline = stripSidecar(exportMspdi(makeDocument(), makeBaselineDocument()));
    const withoutBaseline = stripSidecar(exportMspdi(makeDocument()));
    expect(withBaseline).toContain('<BaselineStart>'); // baseline actually present in the XML
    expect(withoutBaseline).not.toContain('<BaselineStart>');
    // Import ignores the Baseline elements: the reconstructed documents are identical,
    // proving import lands the baseline into no document field (best-effort asymmetry).
    expect(importMspdi(withBaseline)).toStrictEqual(importMspdi(withoutBaseline));
  });
});

describe('mspdi-codec security (C-07, C-08)', () => {
  it('rejects XML containing a DOCTYPE/ENTITY declaration (XXE / billion-laughs)', () => {
    const xxe =
      '<?xml version="1.0"?><!DOCTYPE Project [<!ENTITY x SYSTEM "file:///etc/passwd">]><Project><Title>&x;</Title></Project>';
    expect(() => importMspdi(xxe)).toThrow(ImportRejectedError);
  });
});

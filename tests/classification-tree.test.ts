import { describe, expect, it } from 'vitest';
import type { Row, ScheduleDocument, ScheduleItem, Section } from '../src/domain/model/schedule-model.js';
import {
  deserializeScheduleDocument,
  serializeScheduleDocument,
} from '../src/domain/usecase/json-codec.js';
import {
  classificationCollapseLevel,
  classificationImportError,
  classificationValidationError,
  clampRowIndexToSection,
  collapseRows,
  contiguousSectionBands,
  MIDDLE_EXPAND_MIN_ZOOM_Y,
  MINOR_EXPAND_MIN_ZOOM_Y,
  rebuildClassification,
  resolveClassificationPath,
} from '../src/domain/usecase/classification-tree.js';

/** Build an item carrying an explicit classification path. */
function item(
  id: string,
  major: string,
  middle?: string,
  minor?: string,
): ScheduleItem {
  return {
    id,
    rowId: 'pending',
    itemKind: 'task',
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    abbrev: id,
    importance: 1,
    fillColor: '#4477aa',
    strokeColor: '#333333',
    majorCategory: major,
    ...(middle !== undefined ? { middleCategory: middle } : {}),
    ...(minor !== undefined ? { minorCategory: minor } : {}),
  };
}

/** A minimal document wrapping a set of items (no pre-seeded sections). */
function documentOf(items: ScheduleItem[], sections: Section[] = []): ScheduleDocument {
  return {
    projectId: '44444444-4444-4444-8444-444444444444',
    schemaVersion: 2,
    title: 'test',
    epochDate: '2026-01-01',
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections,
    rows: [],
    items,
  };
}

describe('classification derivation: placement rules (SECT rework)', () => {
  it('places an item with only a major at the MAJOR level (depth 0)', () => {
    expect(resolveClassificationPath(item('a', 'Phase 1')).depth).toBe(0);
  });

  it('places an item with major + middle at the MIDDLE level (depth 1)', () => {
    expect(resolveClassificationPath(item('a', 'Phase 1', 'Track A')).depth).toBe(1);
  });

  it('places an item with major + middle + minor at the MINOR level (depth 2)', () => {
    expect(resolveClassificationPath(item('a', 'Phase 1', 'Track A', 'Detail 1')).depth).toBe(2);
  });

  it('treats a minor without a middle as minor-unset (defensive, depth 0)', () => {
    const path = resolveClassificationPath(item('a', 'Phase 1', undefined, 'Detail 1'));
    expect(path.depth).toBe(0);
    expect(path.minor).toBeUndefined();
  });
});

describe('classification derivation: tree materialization', () => {
  it('derives one leaf row per non-empty branch and excludes empty tracks/details', () => {
    const doc = rebuildClassification(
      documentOf([
        item('m', 'Phase 1'), // major-level row
        item('t', 'Phase 1', 'Track A'), // middle-level row
        item('d1', 'Phase 1', 'Track B', 'Detail 1'), // minor-level row
        item('d2', 'Phase 1', 'Track B', 'Detail 2'), // another minor row
      ]),
    );
    // One section (Phase 1), four distinct leaf rows (no empty Track B "middle" row,
    // since no item sits directly at Track B's middle level).
    expect(doc.sections).toHaveLength(1);
    expect(doc.rows).toHaveLength(4);
    const depths = doc.rows.map((row) => row.depth);
    expect(depths.sort()).toEqual([0, 1, 2, 2]);
  });

  it('groups distinct majors into ordered sections (first-appearance order)', () => {
    const doc = rebuildClassification(
      documentOf([item('a', 'Phase 2'), item('b', 'Phase 1'), item('c', 'Phase 2')]),
    );
    expect(doc.sections.map((section) => section.name)).toEqual(['Phase 2', 'Phase 1']);
  });

  it('places every item on the leaf row for its path (multi-bar preserved)', () => {
    const doc = rebuildClassification(
      documentOf([
        item('x', 'Phase 1', 'Track A', 'Detail 1'),
        item('y', 'Phase 1', 'Track A', 'Detail 1'),
      ]),
    );
    const rowIds = new Set(doc.items.map((it) => it.rowId));
    expect(rowIds.size).toBe(1); // both land on the same minor leaf
    expect(doc.rows).toHaveLength(1);
  });

  it('preserves an existing section id, order and collapsed state across a rebuild', () => {
    const seeded: Section[] = [
      { id: 'section-0', name: 'Phase 1', order: 0, rowIds: [], collapsed: true },
      { id: 'section-1', name: 'Phase 2', order: 1, rowIds: [], collapsed: false },
    ];
    const doc = rebuildClassification(
      documentOf([item('a', 'Phase 2'), item('b', 'Phase 1')], seeded),
    );
    const phase1 = doc.sections.find((section) => section.name === 'Phase 1');
    const phase2 = doc.sections.find((section) => section.name === 'Phase 2');
    expect(phase1?.id).toBe('section-0');
    expect(phase1?.collapsed).toBe(true);
    // Existing sections keep their order even though Phase 2's item appears first.
    expect(doc.sections.map((section) => section.name)).toEqual(['Phase 1', 'Phase 2']);
    expect(phase2?.order).toBe(1);
  });
});

describe('classification validation (SECT rework)', () => {
  it('rejects a minor set with an empty middle (invalid combo)', () => {
    expect(classificationValidationError(item('a', 'Phase 1', undefined, 'Detail 1'))).toMatch(/middle/);
    expect(classificationImportError(item('a', 'Phase 1', undefined, 'Detail 1'))).toMatch(/middle/);
  });

  it('requires a major on every item (strict rule)', () => {
    const noMajor: ScheduleItem = { ...item('a', 'Phase 1'), majorCategory: '' };
    expect(classificationValidationError(noMajor)).toMatch(/major/);
  });

  it('rejects middle/minor without a major on import', () => {
    const bad: ScheduleItem = { ...item('a', 'Phase 1', 'Track A'), majorCategory: '' };
    expect(classificationImportError(bad)).toMatch(/major/);
  });

  it('accepts a legacy item with no categories on import (back-compat)', () => {
    const legacy: ScheduleItem = { ...item('a', 'x'), majorCategory: '' };
    delete (legacy as { majorCategory?: string }).majorCategory;
    expect(classificationImportError(legacy)).toBeNull();
  });

  it('accepts well-formed classifications', () => {
    expect(classificationValidationError(item('a', 'Phase 1', 'Track A', 'Detail 1'))).toBeNull();
    expect(classificationValidationError(item('b', 'Phase 1'))).toBeNull();
  });

  it('rejects a JSON import whose item has a minor without a middle', () => {
    const bad = documentOf([item('a', 'Phase 1', undefined, 'Detail 1')]);
    expect(() => deserializeScheduleDocument(serializeScheduleDocument(bad))).toThrow(/middle/);
  });

  it('accepts a JSON round-trip of a well-formed classified document', () => {
    const good = rebuildClassification(
      documentOf([item('a', 'Phase 1', 'Track A', 'Detail 1'), item('b', 'Phase 1')]),
    );
    expect(deserializeScheduleDocument(serializeScheduleDocument(good))).toStrictEqual(good);
  });
});

describe('vertical-LOD collapse thresholds', () => {
  it('maps zoomY to collapse levels at the documented thresholds', () => {
    expect(classificationCollapseLevel(1)).toBe(0);
    expect(classificationCollapseLevel(MINOR_EXPAND_MIN_ZOOM_Y)).toBe(0);
    expect(classificationCollapseLevel(MINOR_EXPAND_MIN_ZOOM_Y - 0.01)).toBe(1);
    expect(classificationCollapseLevel(MIDDLE_EXPAND_MIN_ZOOM_Y)).toBe(1);
    expect(classificationCollapseLevel(MIDDLE_EXPAND_MIN_ZOOM_Y - 0.01)).toBe(2);
  });

  it('progressively collapses minor then middle as zoomY drops, keeping major', () => {
    const doc = rebuildClassification(
      documentOf([
        item('m', 'Phase 1'),
        item('t', 'Phase 1', 'Track A'),
        item('d1', 'Phase 1', 'Track B', 'Detail 1'),
        item('d2', 'Phase 1', 'Track B', 'Detail 2'),
      ]),
    );

    const level0 = collapseRows(doc.rows, 0).rows;
    const level1 = collapseRows(doc.rows, 1).rows;
    const level2 = collapseRows(doc.rows, 2).rows;

    // Level 0: all four leaves. Level 1: minors merge onto Track B -> 3 rows.
    // Level 2: everything collapses onto the single Phase 1 major lane -> 1 row.
    expect(level0).toHaveLength(4);
    expect(level1).toHaveLength(3);
    expect(level2).toHaveLength(1);
    expect(level2[0]?.depth).toBe(0);
    // The two Detail rows collapse into ONE Track B row at level 1.
    expect(level1.filter((row) => row.middleLabel === 'Track B')).toHaveLength(1);
  });

  it('maps each level-0 row to its collapsed display row id', () => {
    const doc = rebuildClassification(
      documentOf([
        item('d1', 'Phase 1', 'Track B', 'Detail 1'),
        item('d2', 'Phase 1', 'Track B', 'Detail 2'),
      ]),
    );
    const collapsed = collapseRows(doc.rows, 1);
    const targets = new Set(doc.rows.map((row) => collapsed.rowIdToDisplayId.get(row.id)));
    expect(targets.size).toBe(1); // both details collapse to the same Track B row
  });

  it('passes legacy rows without a derived depth through unchanged', () => {
    const legacyRows: Row[] = [
      { id: 'r0', sectionId: 's0', classificationLabel: 'A', order: 0 },
      { id: 'r1', sectionId: 's0', classificationLabel: 'B', order: 1 },
    ];
    const collapsed = collapseRows(legacyRows, 2);
    expect(collapsed.rows.map((row) => row.id)).toEqual(['r0', 'r1']);
  });
});

describe('rounded-box single-section clamp', () => {
  const doc = rebuildClassification(
    documentOf([
      item('a', 'Phase 1', 'Track A'),
      item('b', 'Phase 1', 'Track B'),
      item('c', 'Phase 2', 'Track C'),
      item('d', 'Phase 2', 'Track D'),
    ]),
  );
  const bands = contiguousSectionBands(doc.rows, doc.sections);

  it('produces one band per section over the derived rows', () => {
    expect(bands.map((band) => [band.name, band.startRowIndex, band.rowCount])).toEqual([
      ['Phase 1', 0, 2],
      ['Phase 2', 2, 2],
    ]);
  });

  it('clamps a dragged edge back into the anchor edge section band', () => {
    // Anchor in Phase 1 (rows 0..1); a drag toward row 3 (Phase 2) is pulled to row 1.
    expect(clampRowIndexToSection(bands, 0, 3)).toBe(1);
    // Anchor in Phase 2 (rows 2..3); a drag up to row 0 (Phase 1) is pulled to row 2.
    expect(clampRowIndexToSection(bands, 3, 0)).toBe(2);
    // A drag that stays within the anchor's section is unchanged.
    expect(clampRowIndexToSection(bands, 0, 1)).toBe(1);
    expect(clampRowIndexToSection(bands, 2, 3)).toBe(3);
  });
});

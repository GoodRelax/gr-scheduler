import { describe, expect, it } from 'vitest';
import type { Row, Section } from '../src/domain/model/schedule-model.js';
import {
  hiddenSectionTabs,
  moveSectionToIndex,
  orderedVisibleRows,
  sectionReorderTarget,
  setSectionCollapsed,
  visibleSectionBands,
} from '../src/domain/usecase/section-organizer.js';

function section(id: string, order: number, rowIds: string[], collapsed = false): Section {
  return { id, name: id.toUpperCase(), order, rowIds, collapsed };
}

function row(id: string, sectionId: string, order: number): Row {
  return { id, sectionId, classificationLabel: id, order };
}

const sections: Section[] = [
  section('s0', 0, ['r0', 'r1']),
  section('s1', 1, ['r2', 'r3']),
  section('s2', 2, ['r4']),
];
const rows: Row[] = [
  row('r0', 's0', 0),
  row('r1', 's0', 1),
  row('r2', 's1', 0),
  row('r3', 's1', 1),
  row('r4', 's2', 0),
];

describe('section organizer: reorder (SECT-L1-002)', () => {
  it('moves a section to a new index and renumbers order densely', () => {
    const next = moveSectionToIndex(sections, 's2', 0);
    const byId = new Map(next.map((s) => [s.id, s.order]));
    expect(byId.get('s2')).toBe(0);
    expect(byId.get('s0')).toBe(1);
    expect(byId.get('s1')).toBe(2);
  });

  it('reorders the visible rows to follow the new section order', () => {
    const reordered = moveSectionToIndex(sections, 's2', 0);
    expect(orderedVisibleRows(reordered, rows).map((r) => r.id)).toEqual([
      'r4',
      'r0',
      'r1',
      'r2',
      'r3',
    ]);
  });

  it('is a no-op when the target index equals the current index', () => {
    const next = moveSectionToIndex(sections, 's1', 1);
    expect(next.map((s) => s.order)).toEqual(sections.map((s) => s.order));
  });
});

describe('section organizer: up/down move target (SECT-L1-002)', () => {
  it('returns null for ▲ on the first section (move up disabled)', () => {
    expect(sectionReorderTarget(sections, 's0', 'up')).toBeNull();
  });

  it('returns null for ▼ on the last section (move down disabled)', () => {
    expect(sectionReorderTarget(sections, 's2', 'down')).toBeNull();
  });

  it('nudges a middle section one step up and one step down', () => {
    expect(sectionReorderTarget(sections, 's1', 'up')).toBe(0);
    expect(sectionReorderTarget(sections, 's1', 'down')).toBe(2);
  });

  it('returns null for an unknown section id', () => {
    expect(sectionReorderTarget(sections, 'missing', 'down')).toBeNull();
  });

  it('respects the order field rather than array position', () => {
    const shuffled: Section[] = [
      section('a', 2, ['ra']),
      section('b', 0, ['rb']),
      section('c', 1, ['rc']),
    ];
    // Ordered by `order`: b(0), c(1), a(2). So b cannot move up, a cannot move down.
    expect(sectionReorderTarget(shuffled, 'b', 'up')).toBeNull();
    expect(sectionReorderTarget(shuffled, 'a', 'down')).toBeNull();
    expect(sectionReorderTarget(shuffled, 'c', 'up')).toBe(0);
    expect(sectionReorderTarget(shuffled, 'c', 'down')).toBe(2);
  });
});

describe('section organizer: show/hide (SECT-L1-003)', () => {
  it('removes a collapsed section rows from the visible layout', () => {
    const collapsed = setSectionCollapsed(sections, 's1', true);
    expect(orderedVisibleRows(collapsed, rows).map((r) => r.id)).toEqual(['r0', 'r1', 'r4']);
  });

  it('re-showing a section restores its rows at the original order position', () => {
    const hidden = setSectionCollapsed(sections, 's1', true);
    const shown = setSectionCollapsed(hidden, 's1', false);
    expect(orderedVisibleRows(shown, rows).map((r) => r.id)).toEqual([
      'r0',
      'r1',
      'r2',
      'r3',
      'r4',
    ]);
  });

  it('returns the same section reference set when the state is unchanged', () => {
    const unchanged = setSectionCollapsed(sections, 's1', false);
    expect(unchanged.map((s) => s.collapsed)).toEqual(sections.map((s) => s.collapsed));
  });
});

describe('section organizer: hidden tabs (SECT-L1-004/005)', () => {
  it('produces one tab per hidden section (count grows with hidden count)', () => {
    expect(hiddenSectionTabs(sections)).toHaveLength(0);

    const oneHidden = setSectionCollapsed(sections, 's0', true);
    expect(hiddenSectionTabs(oneHidden)).toHaveLength(1);

    const twoHidden = setSectionCollapsed(oneHidden, 's2', true);
    const tabs = hiddenSectionTabs(twoHidden);
    expect(tabs).toHaveLength(2);
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, 1]);
    expect(tabs.map((t) => t.sectionId)).toEqual(['s0', 's2']);
  });
});

describe('section organizer: bands (SECT-L1-001)', () => {
  it('describes contiguous visible bands aligned with orderedVisibleRows', () => {
    const bands = visibleSectionBands(sections, rows);
    expect(bands.map((b) => [b.sectionId, b.startRowIndex, b.rowCount])).toEqual([
      ['s0', 0, 2],
      ['s1', 2, 2],
      ['s2', 4, 1],
    ]);
  });

  it('re-indexes bands when a section is collapsed', () => {
    const collapsed = setSectionCollapsed(sections, 's0', true);
    const bands = visibleSectionBands(collapsed, rows);
    expect(bands.map((b) => [b.sectionId, b.startRowIndex, b.rowCount])).toEqual([
      ['s1', 0, 2],
      ['s2', 2, 1],
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import {
  itemAccessibleName,
  paletteShapeAccessibleName,
} from '../src/domain/usecase/accessible-name.js';
import type { ScheduleItem } from '../src/domain/model/schedule-model.js';

function milestone(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: 'm1',
    rowId: 'r1',
    itemKind: 'milestone',
    startDate: '2026-01-05',
    endDate: null,
    abbrev: 'M1',
    importance: 1,
    fillColor: '#0072b2',
    strokeColor: '#4d4d4d',
    milestoneShape: 'diamond',
    ...overrides,
  };
}

function task(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: 't1',
    rowId: 'r1',
    itemKind: 'task',
    startDate: '2026-01-05',
    endDate: '2026-01-12',
    abbrev: 'T2',
    importance: 1,
    fillColor: '#0072b2',
    strokeColor: '#4d4d4d',
    taskShape: 'bar',
    ...overrides,
  };
}

describe('itemAccessibleName (WCAG 1.1.1 / 4.1.2)', () => {
  it('names a milestone as abbrev + kind + single date', () => {
    expect(itemAccessibleName(milestone(), 'en')).toBe('M1 Milestone, 2026-01-05');
  });

  it('names a task as abbrev + kind + start to end', () => {
    expect(itemAccessibleName(task(), 'en')).toBe('T2 Task, 2026-01-05 to 2026-01-12');
  });

  it('localizes the kind and connective words (PROP-L1-003)', () => {
    expect(itemAccessibleName(milestone(), 'ja')).toContain('マイルストーン');
    expect(itemAccessibleName(task(), 'ja')).toContain('タスク');
    expect(itemAccessibleName(task(), 'ja')).toContain('から');
  });

  it('is never empty even with a blank abbreviation', () => {
    const name = itemAccessibleName(milestone({ abbrev: '   ' }), 'en');
    expect(name.length).toBeGreaterThan(0);
    expect(name).toBe('Milestone, 2026-01-05');
  });
});

describe('paletteShapeAccessibleName (icon-only buttons, NFR-L1-005)', () => {
  it('pairs the kind with the concrete shape and is never empty', () => {
    expect(paletteShapeAccessibleName('milestone', 'circle', 'en')).toBe('Milestone circle');
    expect(paletteShapeAccessibleName('task', 'bar', 'en')).toBe('Task bar');
  });

  it('produces a non-empty name for every palette shape in both locales', () => {
    const milestoneShapes = ['circle', 'triangle', 'square', 'diamond', 'star'];
    const taskShapes = ['bar', 'arrow', 'chevron'];
    for (const locale of ['en', 'ja'] as const) {
      for (const shape of milestoneShapes) {
        expect(paletteShapeAccessibleName('milestone', shape, locale).trim().length).toBeGreaterThan(
          0,
        );
      }
      for (const shape of taskShapes) {
        expect(paletteShapeAccessibleName('task', shape, locale).trim().length).toBeGreaterThan(0);
      }
    }
  });
});

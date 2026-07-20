import { describe, expect, it } from 'vitest';
import type { Dependency, ScheduleItem } from '../src/domain/model/schedule-model.js';
import {
  isDependencyRenderable,
  isItemVisibleUnderDisplay,
  sameLinkableKind,
} from '../src/domain/usecase/dependency-visibility.js';

/**
 * Unit coverage for dependency-edge visibility under the actual-date model
 * (CR-001 Part A). There is no cross-kind link constraint: any two items may be
 * linked. An edge renders when both endpoints exist and the SIDE the edge anchors
 * to is drawn under the plan/actual display filter (plan bars are always drawn;
 * actual bars only for items that record actual dates).
 */

function item(id: string, over: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id,
    rowId: 'r0',
    itemKind: 'milestone',
    startDate: '2026-02-01',
    endDate: null,
    abbrev: id,
    importance: 1,
    fillColor: '#0072b2',
    strokeColor: '#4d4d4d',
    ...over,
  };
}

const dep = (fromItemId: string, toItemId: string): Dependency => ({
  id: `${fromItemId}-${toItemId}`,
  fromItemId,
  fromAnchor: 5,
  toItemId,
  toAnchor: 3,
});

describe('linkable kind (actual-date model: no constraint)', () => {
  it('links any two items (no plan/actual same-side constraint in the actual-date model)', () => {
    expect(sameLinkableKind(item('a'), item('b'))).toBe(true);
  });

  it('links a task to a milestone regardless of kind', () => {
    const task = item('a', { itemKind: 'task', endDate: '2026-03-01' });
    expect(sameLinkableKind(task, item('b'))).toBe(true);
  });
});

describe('display visibility', () => {
  it('shows both sides for both / undefined and neither for none', () => {
    expect(isItemVisibleUnderDisplay('plan', 'both')).toBe(true);
    expect(isItemVisibleUnderDisplay('actual', undefined)).toBe(true);
    expect(isItemVisibleUnderDisplay('plan', 'none')).toBe(false);
    expect(isItemVisibleUnderDisplay('actual', 'none')).toBe(false);
  });

  it('hides the opposite side under a single-sided filter', () => {
    expect(isItemVisibleUnderDisplay('plan', 'plan-only')).toBe(true);
    expect(isItemVisibleUnderDisplay('actual', 'plan-only')).toBe(false);
    expect(isItemVisibleUnderDisplay('plan', 'actual-only')).toBe(false);
    expect(isItemVisibleUnderDisplay('actual', 'actual-only')).toBe(true);
  });
});

describe('isDependencyRenderable', () => {
  // p1/p2 carry no actual side; a1/a2 record actual dates (drawn under actual-only).
  const items = new Map<string, ScheduleItem>([
    ['p1', item('p1')],
    ['p2', item('p2')],
    ['a1', item('a1', { actualStart: '2026-02-03' })],
    ['a2', item('a2', { actualStart: '2026-02-04' })],
  ]);

  it('renders an edge when both endpoints exist and are shown', () => {
    expect(isDependencyRenderable(dep('p1', 'p2'), items, 'both')).toBe(true);
    expect(isDependencyRenderable(dep('a1', 'a2'), items, 'both')).toBe(true);
  });

  it('returns false when an endpoint item is missing', () => {
    expect(isDependencyRenderable(dep('p1', 'ghost'), items, 'both')).toBe(false);
  });

  it('hides every edge when the filter is none', () => {
    expect(isDependencyRenderable(dep('p1', 'p2'), items, 'none')).toBe(false);
  });

  it('hides an edge under actual-only when an endpoint has no actual side', () => {
    // p1 records no actual, so under actual-only there is no actual bar to anchor to.
    expect(isDependencyRenderable(dep('p1', 'a1'), items, 'actual-only')).toBe(false);
  });

  it('gates actual-only edges on both endpoints having an actual side', () => {
    expect(isDependencyRenderable(dep('p1', 'p2'), items, 'actual-only')).toBe(false);
    expect(isDependencyRenderable(dep('a1', 'a2'), items, 'actual-only')).toBe(true);
    // plan-only keeps every edge: every item has a plan bar.
    expect(isDependencyRenderable(dep('p1', 'p2'), items, 'plan-only')).toBe(true);
  });
});

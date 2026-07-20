import { describe, expect, it } from 'vitest';
import type { Dependency, ScheduleItem } from '../src/domain/model/schedule-model.js';
import {
  isDependencyRenderable,
  isItemVisibleUnderDisplay,
  sameLinkableKind,
} from '../src/domain/usecase/dependency-visibility.js';

/**
 * Unit coverage for dependency-edge visibility.
 *
 * TODO(IM2): the plan/actual link CONSTRAINT (edges only plan->plan or actual->actual,
 * keyed by the removed `planActualKind`) and the endpoint-side (plan-only/actual-only)
 * visibility split are DEFERRED to IM2 against the actual-date model. The assertions
 * that pinned that old behavior are `it.skip`-ped below (restore in IM2). For IM1 an
 * edge is renderable when both endpoints exist and the filter is not `none`.
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

describe('linkable kind (IM1: constraint removed)', () => {
  it('links any two items (no plan/actual same-side constraint in the actual-date model)', () => {
    expect(sameLinkableKind(item('a'), item('b'))).toBe(true);
  });

  it.skip('TODO(IM2): only same-side (plan/actual) pairs may link', () => {
    // Restore against the actual-date model: an edge should relate compatible sides.
    expect(sameLinkableKind(item('a'), item('b'))).toBe(true);
  });
});

describe('display visibility', () => {
  it('shows both sides for both / undefined and neither for none', () => {
    expect(isItemVisibleUnderDisplay('plan', 'both')).toBe(true);
    expect(isItemVisibleUnderDisplay('actual', undefined)).toBe(true);
    expect(isItemVisibleUnderDisplay('plan', 'none')).toBe(false);
    expect(isItemVisibleUnderDisplay('actual', 'none')).toBe(false);
  });

  it.skip('TODO(IM2): hides the opposite side under a single-sided filter', () => {
    expect(isItemVisibleUnderDisplay('plan', 'plan-only')).toBe(true);
    expect(isItemVisibleUnderDisplay('actual', 'plan-only')).toBe(false);
    expect(isItemVisibleUnderDisplay('plan', 'actual-only')).toBe(false);
    expect(isItemVisibleUnderDisplay('actual', 'actual-only')).toBe(true);
  });
});

describe('isDependencyRenderable', () => {
  const items = new Map<string, ScheduleItem>([
    ['p1', item('p1')],
    ['p2', item('p2')],
    ['a1', item('a1')],
    ['a2', item('a2')],
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

  it.skip('TODO(IM2): skips a cross-kind (plan<->actual) edge', () => {
    expect(isDependencyRenderable(dep('p1', 'a1'), items, 'both')).toBe(false);
  });

  it.skip('TODO(IM2): hides an edge when its side is hidden by the filter', () => {
    expect(isDependencyRenderable(dep('p1', 'p2'), items, 'actual-only')).toBe(false);
    expect(isDependencyRenderable(dep('a1', 'a2'), items, 'plan-only')).toBe(false);
  });
});

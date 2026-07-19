import { describe, expect, it } from 'vitest';
import type { Dependency, ScheduleItem } from '../src/domain/model/schedule-model.js';
import {
  isDependencyRenderable,
  isItemVisibleUnderDisplay,
  linkableKindOf,
  sameLinkableKind,
} from '../src/domain/usecase/dependency-visibility.js';

/**
 * Unit coverage for the dependency plan/actual CONSTRAINTS (batch item 5): edges may
 * only connect plan->plan or actual->actual, and a drawn edge is visible only when
 * BOTH endpoints are visible under the current plan/actual display filter.
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

describe('linkable kind', () => {
  it('treats a missing planActualKind as plan', () => {
    expect(linkableKindOf(item('a'))).toBe('plan');
    expect(linkableKindOf(item('b', { planActualKind: 'plan' }))).toBe('plan');
    expect(linkableKindOf(item('c', { planActualKind: 'actual' }))).toBe('actual');
  });

  it('matches only same-side pairs', () => {
    expect(sameLinkableKind(item('a', { planActualKind: 'plan' }), item('b'))).toBe(true);
    expect(
      sameLinkableKind(item('a', { planActualKind: 'actual' }), item('b', { planActualKind: 'actual' })),
    ).toBe(true);
    expect(
      sameLinkableKind(item('a', { planActualKind: 'plan' }), item('b', { planActualKind: 'actual' })),
    ).toBe(false);
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
  const plans = new Map<string, ScheduleItem>([
    ['p1', item('p1', { planActualKind: 'plan' })],
    ['p2', item('p2', { planActualKind: 'plan' })],
  ]);
  const actuals = new Map<string, ScheduleItem>([
    ['a1', item('a1', { planActualKind: 'actual' })],
    ['a2', item('a2', { planActualKind: 'actual' })],
  ]);
  const mixed = new Map<string, ScheduleItem>([...plans, ...actuals]);

  it('renders a plan->plan edge when both sides are shown', () => {
    expect(isDependencyRenderable(dep('p1', 'p2'), plans, 'both')).toBe(true);
  });

  it('skips a cross-kind (plan<->actual) legacy edge without crashing', () => {
    expect(isDependencyRenderable(dep('p1', 'a1'), mixed, 'both')).toBe(false);
  });

  it('hides a plan edge when the plan side is hidden (actual-only)', () => {
    expect(isDependencyRenderable(dep('p1', 'p2'), plans, 'actual-only')).toBe(false);
  });

  it('hides an actual edge when the actual side is hidden (plan-only)', () => {
    expect(isDependencyRenderable(dep('a1', 'a2'), actuals, 'plan-only')).toBe(false);
    expect(isDependencyRenderable(dep('a1', 'a2'), actuals, 'both')).toBe(true);
  });

  it('returns false when an endpoint item is missing', () => {
    expect(isDependencyRenderable(dep('p1', 'ghost'), plans, 'both')).toBe(false);
  });
});

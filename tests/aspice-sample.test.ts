/**
 * Coverage for the default starter sample being an Automotive SPICE (ASPICE)
 * project that runs from project start to SOS (Start Of Sales) at ~2 years 10
 * months, framed by a ~3-year default timeline. Verifies every item is
 * well-formed (id + category + plan_actual_kind) so the derived tree, plan/actual
 * coloring and Fit all behave, and that the SOS milestone anchors the span.
 */

import { describe, expect, it } from 'vitest';
import { generateTemplateDocument } from '../src/app/sample-data.js';
import { toDayNumber } from '../src/domain/usecase/time-coordinate-mapper.js';
import type { ScheduleItem } from '../src/domain/model/schedule-model.js';

const DAYS_PER_YEAR = 365.25;

describe('default ASPICE sample (project start -> SOS, ~3-year timeline)', () => {
  const document = generateTemplateDocument();
  const epochDay = toDayNumber(document.epochDate);

  /** The largest day offset from the epoch reached by any item (the content span). */
  function maxItemDayOffset(items: readonly ScheduleItem[]): number {
    let max = 0;
    for (const item of items) {
      const end = item.endDate ?? item.startDate;
      max = Math.max(max, toDayNumber(end) - epochDay);
    }
    return max;
  }

  it('gives every item a unique id, a category and a plan_actual_kind', () => {
    const ids = new Set<string>();
    for (const item of document.items) {
      expect(item.id, `item ${item.id} id`).toBeTruthy();
      expect(ids.has(item.id), `duplicate id ${item.id}`).toBe(false);
      ids.add(item.id);
      expect((item.majorCategory ?? '').trim().length, `item ${item.id} major`).toBeGreaterThan(0);
      expect((item.middleCategory ?? '').trim().length, `item ${item.id} middle`).toBeGreaterThan(0);
      expect(item.planActualKind, `item ${item.id} plan_actual_kind`).toBeTruthy();
    }
  });

  it('has an SOS milestone at ~2 years 10 months from the start', () => {
    const sos = document.items.find((item) => item.abbrev === 'SOS');
    expect(sos).toBeDefined();
    expect(sos?.itemKind).toBe('milestone');
    expect(sos?.milestoneShape).toBe('star');
    const sosOffsetYears = (toDayNumber(sos!.startDate) - epochDay) / DAYS_PER_YEAR;
    // ~2 years 10 months = ~2.83 years.
    expect(sosOffsetYears).toBeGreaterThan(2.7);
    expect(sosOffsetYears).toBeLessThan(3.0);
  });

  it('spans about three years of content so the default timeline frames it', () => {
    const spanYears = maxItemDayOffset(document.items) / DAYS_PER_YEAR;
    expect(spanYears).toBeGreaterThan(2.7);
    expect(spanYears).toBeLessThan(3.1);
  });

  it('models the full ASPICE lifecycle (SYS + SWE phases, integration/validation)', () => {
    const abbrevs = new Set(document.items.map((item) => item.abbrev));
    // Early SYS/SWE showcase phases plus the later ASPICE phases.
    for (const phase of ['SYS1', 'SYS.4', 'SYS.5', 'SWE1', 'SWE.2', 'SWE.6']) {
      expect(abbrevs.has(phase), `expected phase ${phase}`).toBe(true);
    }
    // Integration & validation tracks reach toward SOS.
    expect(abbrevs.has('System Integration')).toBe(true);
    expect(abbrevs.has('Vehicle Validation')).toBe(true);
    // A plan/actual pair and gate milestones are present.
    expect(document.items.some((item) => item.planActualKind === 'actual')).toBe(true);
    expect(document.items.some((item) => item.abbrev === 'SoP')).toBe(true);
  });
});

/**
 * CR-012 regression coverage: the DEFAULT startup template now uses the CR-001
 * unified plan/actual model (actual dates on the SAME item as the plan), so the
 * CR-006 palette controls produce a MEANINGFUL result on it:
 *
 *  - `[P]` off (actual-only): only the items that record an actual are drawn, so the
 *    view visibly changes instead of keeping every item;
 *  - `[A]` off (plan-only): every item still draws its plan span -- the canvas is
 *    never blanked;
 *  - `[Ao]` (overlap): a recorded actual yields an actual bar painted over the plan;
 *  - `[As]` (separate): BOTH sub-lanes are populated for a recorded actual.
 *
 * It also pins the migrated shape of the template: the merged item set, the renamed
 * middle categories, the single base fill, and the surviving dependency endpoints.
 *
 * Which BARS each mode draws (the display filter gating the plan / actual sides,
 * DEF-008) is covered by tests/plan-actual-display-gating.test.ts; the geometry
 * assertions below are the two-sides-shown (`both`) case.
 */

import { describe, expect, it } from 'vitest';
import { generateTemplateDocument } from '../src/app/sample-data.js';
import type { ScheduleItem } from '../src/domain/model/schedule-model.js';
import {
  computeProgressFrontDate,
  filterByPlanActualDisplay,
  itemHasActualDates,
} from '../src/domain/usecase/progress-line-builder.js';
import { computePlanActualBars } from '../src/domain/usecase/plan-actual-geometry.js';

/** The template's migrated size: 6 `*-Actual` items merged away from the former 32. */
const TEMPLATE_ITEM_COUNT = 26;
/** The derived tree after the four `*-Actual` middles disappeared (was 13). */
const TEMPLATE_ROW_COUNT = 9;

const templateDocument = generateTemplateDocument();
const itemById = new Map(templateDocument.items.map((item) => [item.id, item]));

/** Look up a template item by id, failing loudly when the id no longer exists. */
function templateItem(id: string): ScheduleItem {
  const item = itemById.get(id);
  if (item === undefined) {
    throw new Error(`template item ${id} is missing`);
  }
  return item;
}

describe('CR-012: the template carries plan AND actual on ONE item', () => {
  it('merged the six as-run items away (26 items / 9 derived rows)', () => {
    expect(templateDocument.items).toHaveLength(TEMPLATE_ITEM_COUNT);
    expect(templateDocument.rows).toHaveLength(TEMPLATE_ROW_COUNT);
    for (const removedId of [
      'oa-ms-actual-kickoff',
      'oa-ms-actual-freeze',
      'oa-phase-actual-concept',
      'oa-phase-actual-dev',
      'ta-phase-actual-sys1',
      'ta-swephase-actual-swe2',
    ]) {
      expect(itemById.has(removedId), `${removedId} must be merged away`).toBe(false);
    }
  });

  it('transcribed each as-run span onto its plan counterpart', () => {
    const kickoff = templateItem('oa-ms-plan-kickoff');
    expect(kickoff.actualStart).toBe('2026-01-05');
    expect(kickoff.actualEnd ?? null).toBeNull();
    expect(templateItem('oa-ms-plan-freeze').actualStart).toBe('2027-03-25');

    const concept = templateItem('oa-phase-plan-concept');
    expect([concept.actualStart, concept.actualEnd, concept.progressRatio]).toEqual([
      '2026-01-05',
      '2026-05-06',
      1,
    ]);
    const seriesDevelopment = templateItem('oa-phase-plan-dev');
    expect([
      seriesDevelopment.actualStart,
      seriesDevelopment.actualEnd,
      seriesDevelopment.progressRatio,
    ]).toEqual(['2026-05-09', '2027-05-16', 0.55]);
    const sys1 = templateItem('ta-phase-plan-sys1');
    expect([sys1.actualStart, sys1.actualEnd, sys1.progressRatio]).toEqual([
      '2026-01-03',
      '2026-02-15',
      0.8,
    ]);
    const swe2 = templateItem('ta-swephase-plan-swe2');
    expect([swe2.actualStart, swe2.actualEnd, swe2.progressRatio]).toEqual([
      '2026-07-25',
      '2027-03-07',
      0.5,
    ]);
  });

  it('keeps SoP and SOS plan-only (intentional variety)', () => {
    expect(templateItem('oa-ms-plan-sop').actualStart).toBeUndefined();
    expect(templateItem('oa-ms-plan-launch').actualStart).toBeUndefined();
  });

  it('renamed the middles to drop the misleading -Plan / -Actual suffixes', () => {
    const middles = new Set(templateDocument.items.map((item) => item.middleCategory));
    expect(middles).toEqual(
      new Set(['Milestones', 'Phase', 'SYS-Phase', 'SWE-Phase', 'Integration', 'Task']),
    );
    const minors = new Set(
      templateDocument.items
        .map((item) => item.minorCategory)
        .filter((minor): minor is string => minor !== undefined),
    );
    expect(minors).toEqual(new Set(['Onboarding', 'Requirements', 'Usecase']));
  });

  it('stores ONE base fill (the red actual color is gone)', () => {
    const fills = new Set(templateDocument.items.map((item) => item.fillColor));
    expect([...fills]).toEqual(['#4477aa']);
  });

  it('keeps the four dependencies resolving to surviving items', () => {
    const dependencies = templateDocument.dependencies ?? [];
    expect(dependencies.map((dependency) => dependency.id)).toEqual([
      'tpl-dep-concept-dev',
      'tpl-dep-dev-valid',
      'tpl-dep-sys1-sys2',
      'tpl-dep-sys3-swe1',
    ]);
    for (const dependency of dependencies) {
      expect(itemById.has(dependency.fromItemId), dependency.id).toBe(true);
      expect(itemById.has(dependency.toItemId), dependency.id).toBe(true);
    }
  });

  it('keeps the curated assignees and the day tapers', () => {
    expect(templateItem('ta-phase-plan-sys1').assignee).toBe('Suzuki');
    expect(templateItem('ta-phase-plan-sys2').assignee).toBe('Saotome');
    expect(templateItem('ta-phase-plan-sys3').assignee).toBe('Sato');
    expect(templateItem('ta-phase-plan-swe1').assignee).toBe('Tanaka');
    expect(templateItem('ta-phase-plan-sys1').fadeOutDays).toBe(9);
    expect(templateItem('ta-phase-plan-sys2').fadeInDays).toBe(11);
    expect(templateItem('oa-phase-plan-rampup').fadeInDays).toBe(27);
    expect(templateDocument.annotations ?? []).toHaveLength(1);
    expect(templateDocument.schemaVersion).toBe(2);
  });
});

describe('CR-012: the palette controls act meaningfully on the template', () => {
  const withActual = templateDocument.items.filter((item) => itemHasActualDates(item));

  it('[P] off (actual-only) draws a STRICT non-empty subset', () => {
    const drawn = filterByPlanActualDisplay(templateDocument.items, 'actual-only');
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.length).toBeLessThan(templateDocument.items.length);
    expect(drawn.map((item) => item.id)).toEqual(withActual.map((item) => item.id));
  });

  it('[A] off (plan-only) keeps EVERY item (the canvas is never blanked)', () => {
    const drawn = filterByPlanActualDisplay(templateDocument.items, 'plan-only');
    expect(drawn).toHaveLength(TEMPLATE_ITEM_COUNT);
  });

  it('[Ao] overlap paints an actual bar over the plan for a recorded actual', () => {
    const bars = computePlanActualBars({
      planStartWorldX: 0,
      planEndWorldX: 120,
      actualStartWorldX: 10,
      actualEndWorldX: 90,
      laneTop: 0,
      laneHeight: 18,
      style: 'overlap',
    });
    expect(bars.actual).not.toBeNull();
    // Same lane band, narrower extent: the plan shows through past the actual.
    expect(bars.actual!.y).toBe(bars.plan.y);
    expect(bars.actual!.height).toBe(bars.plan.height);
    expect(bars.actual!.width).toBeLessThan(bars.plan.width);
  });

  it('[As] separate populates BOTH sub-lanes for a recorded actual', () => {
    const bars = computePlanActualBars({
      planStartWorldX: 0,
      planEndWorldX: 120,
      actualStartWorldX: 10,
      actualEndWorldX: 90,
      laneTop: 0,
      laneHeight: 18,
      style: 'separate',
    });
    expect(bars.actual).not.toBeNull();
    expect(bars.plan.width).toBeGreaterThan(0);
    expect(bars.actual!.width).toBeGreaterThan(0);
    // The actual sub-lane sits strictly BELOW the plan sub-lane.
    expect(bars.actual!.y).toBeGreaterThan(bars.plan.y + bars.plan.height);
  });

  it('every recorded actual yields a progress-line vertex date', () => {
    expect(withActual.length).toBeGreaterThan(0);
    for (const item of withActual) {
      expect(computeProgressFrontDate(item), `front for ${item.id}`).not.toBeNull();
    }
    // The illuminated line is opted in by the template so those vertices are drawn.
    expect(templateDocument.viewState.progressLineVisible).toBe(true);
  });
});

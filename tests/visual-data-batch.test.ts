/**
 * Unit coverage for the visual/data batch:
 *  1. the default template has a valid { major, middle } category and a
 *     plan_actual_status CONSISTENT with its "-Plan" / "-Actual" middle on EVERY
 *     item, with the user's misspellings corrected (Actual / Clarify);
 *  3. plan -> green / actual -> orange is driven by the plan_actual PROPERTY;
 *  4. the timeline range accepts panning back to 2000-01-01;
 *  6. the gridline toggle state round-trips through JSON / view state;
 *  7. Fit frames EVERY item of the sample (bbox of every item within the viewport).
 */

import { describe, expect, it } from 'vitest';
import { generateTemplateDocument } from '../src/app/sample-data.js';
import {
  ACTUAL_FILL_ORANGE,
  PLAN_FILL_GREEN,
  displayFillColor,
} from '../src/domain/usecase/plan-actual-colors.js';
import {
  clampTimelineScrollX,
  dateToWorldX,
  minTimelineScrollX,
  toDayNumber,
} from '../src/domain/usecase/time-coordinate-mapper.js';
import {
  computeFitViewForItems,
  type FitViewportInputs,
} from '../src/domain/usecase/viewport.js';
import { layoutItems } from '../src/domain/usecase/layout-engine.js';
import { orderedVisibleRows } from '../src/domain/usecase/section-organizer.js';
import { rulerTierCount } from '../src/domain/usecase/date-ruler.js';
import {
  deserializeScheduleDocument,
  serializeScheduleDocument,
} from '../src/domain/usecase/json-codec.js';

const RULER_TIER_HEIGHT_PX = 16;
const topOffsetForZoomX = (zoomX: number): number => rulerTierCount(zoomX) * RULER_TIER_HEIGHT_PX;

describe('default template sample data (fix 1)', () => {
  const document = generateTemplateDocument();

  it('gives every item a valid major + middle category', () => {
    for (const item of document.items) {
      expect(item.majorCategory, `item ${item.id} major`).toBeTruthy();
      expect((item.majorCategory ?? '').trim().length).toBeGreaterThan(0);
      expect(item.middleCategory, `item ${item.id} middle`).toBeTruthy();
      expect((item.middleCategory ?? '').trim().length).toBeGreaterThan(0);
    }
  });

  it('sets plan_actual_status consistent with each item\'s middle', () => {
    for (const item of document.items) {
      const middle = item.middleCategory ?? '';
      const expected = middle.includes('Actual') ? 'actual' : 'plan';
      expect(item.planActualKind, `item ${item.id} on middle ${middle}`).toBe(expected);
    }
  });

  it('places every item under one of the two named sections', () => {
    const majors = new Set(document.items.map((item) => item.majorCategory));
    expect(majors).toEqual(new Set(['Over All Schedule', 'TeamA']));
    // No item floats without a middle (every one is under a track).
    expect(document.items.every((item) => (item.middleCategory ?? '').length > 0)).toBe(true);
  });

  it('corrects the user misspellings (Actual / Clarify, never Acutual / Crialify)', () => {
    const serialized = JSON.stringify(document);
    expect(serialized).not.toContain('Acutual');
    expect(serialized).not.toContain('Crialify');
    const abbrevs = document.items.map((item) => item.abbrev);
    expect(abbrevs).toContain('Clarify Stakeholders');
    expect(abbrevs).toContain('Clarify Usecase');
    // The actual-side middles are spelled correctly.
    expect(document.items.some((item) => item.middleCategory === 'Milestones-Actual')).toBe(true);
    expect(document.items.some((item) => item.middleCategory === 'Phase-Actual')).toBe(true);
  });

  it('includes the TeamA Phase-Plan multi-bar row (SYS1..SWE1) and an actual SYS1', () => {
    const teamAPhasePlan = document.items.filter(
      (item) => item.majorCategory === 'TeamA' && item.middleCategory === 'Phase-Plan',
    );
    expect(teamAPhasePlan.map((item) => item.abbrev).sort()).toEqual(['SWE1', 'SYS1', 'SYS2', 'SYS3']);
    const actualSys1 = document.items.find(
      (item) => item.middleCategory === 'Phase-Actual' && item.majorCategory === 'TeamA',
    );
    expect(actualSys1?.abbrev).toBe('SYS1');
    expect(actualSys1?.planActualKind).toBe('actual');
  });
});

describe('plan/actual property-driven coloring (fix 3)', () => {
  it('maps plan -> green and actual -> orange from the property, not the name', () => {
    expect(displayFillColor({ planActualKind: 'plan', fillColor: '#123456' })).toBe(PLAN_FILL_GREEN);
    expect(displayFillColor({ planActualKind: 'actual', fillColor: '#123456' })).toBe(
      ACTUAL_FILL_ORANGE,
    );
    // No plan/actual semantics -> keep the item's own stored fill.
    expect(displayFillColor({ fillColor: '#abcdef' })).toBe('#abcdef');
  });

  it('colors the whole template by plan/actual property', () => {
    const document = generateTemplateDocument();
    for (const item of document.items) {
      const fill = displayFillColor(item);
      if (item.planActualKind === 'actual') {
        expect(fill).toBe(ACTUAL_FILL_ORANGE);
      } else {
        expect(fill).toBe(PLAN_FILL_GREEN);
      }
    }
  });
});

describe('timeline range extends back to 2000 (fix 4)', () => {
  it('permits scrolling the left edge back to 2000-01-01 from a 2026 epoch', () => {
    const epoch = '2026-01-01';
    const min = minTimelineScrollX(epoch, 1);
    // The min scroll maps to the year-2000 world x (negative, before the epoch).
    expect(min).toBe(dateToWorldX('2000-01-01', epoch, 1));
    expect(min).toBeLessThan(0);
    // A mid-2000 date sits within the permitted range.
    const world2000 = dateToWorldX('2000-06-01', epoch, 1);
    expect(clampTimelineScrollX(world2000, epoch, 1)).toBeCloseTo(world2000, 6);
    // Scrolling before 2000 is clamped to the 2000 edge.
    expect(clampTimelineScrollX(min - 5000, epoch, 1)).toBe(min);
  });

  it('is a no-op minimum when the epoch already starts at 2000', () => {
    expect(minTimelineScrollX('2000-01-01', 1)).toBe(0);
    expect(toDayNumber('2000-01-01')).toBeLessThan(toDayNumber('2026-01-01'));
  });
});

describe('gridline toggle state round-trips (fix 6)', () => {
  it('defaults ON in the template and survives a JSON round-trip', () => {
    const document = generateTemplateDocument();
    expect(document.viewState.gridDateLinesVisible).toBe(true);
    expect(document.viewState.gridCategoryLinesVisible).toBe(true);

    const restored = deserializeScheduleDocument(serializeScheduleDocument(document));
    expect(restored.viewState.gridDateLinesVisible).toBe(true);
    expect(restored.viewState.gridCategoryLinesVisible).toBe(true);
  });

  it('round-trips a hidden (toggled off) grid state', () => {
    const base = generateTemplateDocument();
    const document = {
      ...base,
      viewState: {
        ...base.viewState,
        gridDateLinesVisible: false,
        gridCategoryLinesVisible: false,
      },
    };
    const restored = deserializeScheduleDocument(serializeScheduleDocument(document));
    expect(restored.viewState.gridDateLinesVisible).toBe(false);
    expect(restored.viewState.gridCategoryLinesVisible).toBe(false);
  });
});

describe('Fit frames every sample item (fix 7)', () => {
  const canvasSize = { widthPx: 1200, heightPx: 800 };
  const leftPaneWidth = 200;
  const inputs: FitViewportInputs = { canvasSize, leftPaneWidth, topOffsetForZoomX };

  it('places every item rect inside the fitted viewport rect', () => {
    const document = generateTemplateDocument();
    const rows = orderedVisibleRows(document.sections, document.rows);
    const fit = computeFitViewForItems(document.items, rows, document.epochDate, inputs);
    expect(fit).not.toBeNull();
    if (fit === null) {
      return;
    }
    const viewState = { ...document.viewState, ...fit };
    const placements = layoutItems(document.items, rows, document.epochDate, viewState);
    expect(placements.length).toBe(document.items.length);

    const topOffset = topOffsetForZoomX(fit.zoomX);
    const viewportLeft = fit.scrollX;
    const viewportRight = fit.scrollX + (canvasSize.widthPx - leftPaneWidth);
    const viewportTop = fit.scrollY;
    const viewportBottom = fit.scrollY + (canvasSize.heightPx - topOffset);
    const epsilon = 0.5;

    for (const placement of placements) {
      expect(placement.worldX, `${placement.itemId} left`).toBeGreaterThanOrEqual(
        viewportLeft - epsilon,
      );
      expect(placement.worldX + placement.worldWidth, `${placement.itemId} right`).toBeLessThanOrEqual(
        viewportRight + epsilon,
      );
      expect(placement.worldY, `${placement.itemId} top`).toBeGreaterThanOrEqual(viewportTop - epsilon);
      expect(
        placement.worldY + placement.worldHeight,
        `${placement.itemId} bottom`,
      ).toBeLessThanOrEqual(viewportBottom + epsilon);
    }
  });

  it('frames representative items from BOTH majors after Fit', () => {
    const document = generateTemplateDocument();
    const rows = orderedVisibleRows(document.sections, document.rows);
    const fit = computeFitViewForItems(document.items, rows, document.epochDate, inputs);
    if (fit === null) {
      throw new Error('expected a fit view');
    }
    const viewState = { ...document.viewState, ...fit };
    const placements = layoutItems(document.items, rows, document.epochDate, viewState);
    const byId = new Map(placements.map((placement) => [placement.itemId, placement]));

    const topOffset = topOffsetForZoomX(fit.zoomX);
    const inViewport = (id: string): boolean => {
      const placement = byId.get(id);
      if (placement === undefined) {
        return false;
      }
      return (
        placement.worldX >= fit.scrollX - 0.5 &&
        placement.worldX + placement.worldWidth <= fit.scrollX + (canvasSize.widthPx - leftPaneWidth) + 0.5 &&
        placement.worldY >= fit.scrollY - 0.5 &&
        placement.worldY + placement.worldHeight <= fit.scrollY + (canvasSize.heightPx - topOffset) + 0.5
      );
    };
    // A milestone in "Over All Schedule" and SYS1 in "TeamA".
    expect(inViewport('oa-ms-plan-kickoff')).toBe(true);
    expect(inViewport('ta-phase-plan-sys1')).toBe(true);
  });
});

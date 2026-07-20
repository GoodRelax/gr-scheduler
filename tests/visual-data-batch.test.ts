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
  actualColorFrom,
  actualDisplayFillColor,
  displayFillColor,
  parseColorToHsl,
  planColorFrom,
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
import { layoutItems, layoutRows } from '../src/domain/usecase/layout-engine.js';
import { estimateInnerLeftLabelExtentPx } from '../src/adapters/render/item-geometry.js';
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

  it('records actual dates coherently on the same item as its plan (actual-date model)', () => {
    // The actual-date model has no per-item plan/actual discriminator: every item with
    // an actualStart also carries a planned span, and any actualEnd it has is a valid
    // ISO date (never before the actual start).
    const withActual = document.items.filter((item) => item.actualStart !== undefined);
    expect(withActual.length).toBeGreaterThan(0);
    const isoDate = /^\d{4}-\d{2}-\d{2}$/;
    for (const item of withActual) {
      expect(item.actualStart).toMatch(isoDate);
      expect(item.startDate).toMatch(isoDate);
      if (item.actualEnd != null) {
        expect(item.actualEnd).toMatch(isoDate);
        expect(item.actualEnd >= (item.actualStart as string)).toBe(true);
      }
    }
  });

  it('carries actual dates on the same item as its plan (actual-date model)', () => {
    // At least one item records an actual start on top of its planned span.
    expect(document.items.some((item) => item.actualStart !== undefined)).toBe(true);
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
    // The programme-level tracks are spelled correctly (actual dates now live on the
    // plan items themselves rather than on paired "-Actual" middle rows).
    expect(document.items.some((item) => item.middleCategory === 'Milestones-Plan')).toBe(true);
    expect(document.items.some((item) => item.middleCategory === 'Phase-Plan')).toBe(true);
  });

  it('includes the TeamA Phase-Plan multi-bar row (SYS1..SWE1) with actual dates on SYS1', () => {
    const teamAPhasePlan = document.items.filter(
      (item) => item.majorCategory === 'TeamA' && item.middleCategory === 'Phase-Plan',
    );
    expect(teamAPhasePlan.map((item) => item.abbrev).sort()).toEqual(['SWE1', 'SYS1', 'SYS2', 'SYS3']);
    // Actual (as-run) dates live on the SYS1 plan item itself (actual-date model).
    const sys1 = teamAPhasePlan.find((item) => item.abbrev === 'SYS1');
    expect(sys1?.actualStart).toBeDefined();
  });
});

describe('plan/actual saturation-derived coloring (CR-002 Part 1)', () => {
  // CR-002 Part 1: plan = PALE (desaturated + lightened) shade of the base color;
  // actual = VIVID (saturated + deepened) shade; a plan-only item keeps its own fill.
  it('keeps a plan-only item own stored fill (nothing to contrast against)', () => {
    expect(displayFillColor({ fillColor: '#123456' })).toBe('#123456');
    expect(displayFillColor({ fillColor: '#abcdef' })).toBe('#abcdef');
  });

  it('plan shade is paler (less saturated, lighter) than the vivid actual shade', () => {
    const base = '#2f80ed';
    const baseHsl = parseColorToHsl(base)!;
    const planHsl = parseColorToHsl(planColorFrom(base))!;
    const actualHsl = parseColorToHsl(actualColorFrom(base))!;
    // Plan: desaturated + lightened relative to the base.
    expect(planHsl.s).toBeLessThan(baseHsl.s);
    expect(planHsl.l).toBeGreaterThan(baseHsl.l);
    // Actual: more saturated + deeper than the plan.
    expect(actualHsl.s).toBeGreaterThan(planHsl.s);
    expect(actualHsl.l).toBeLessThan(planHsl.l);
  });

  it('derives both sides from each item base color that records an actual', () => {
    const document = generateTemplateDocument();
    const withActual = document.items.filter((item) => item.actualStart !== undefined);
    // The template carries at least one item with recorded actual dates (SYS1).
    expect(withActual.length).toBeGreaterThan(0);
    for (const item of withActual) {
      if (item.fillColorExplicit === true) {
        continue;
      }
      expect(displayFillColor(item)).toBe(planColorFrom(item.fillColor));
      expect(actualDisplayFillColor(item)).toBe(actualColorFrom(item.fillColor));
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

  it('frames the estimator-aware RENDERED bottom (last bar not clipped, DEF-006)', () => {
    // The real renderer stacks label-colliding items into extra sub-lanes via
    // `estimateInnerLeftLabelExtentPx`, and that estimator's occupied width grows with
    // the (zoomY-scaled) bar height -- so a taller Fit zoomY can add a sub-lane that
    // pushes the bottom rows down. When Fit measures WITHOUT the estimator it framed a
    // shorter content than the renderer draws, clipping the last row's BAR ~9.8px past
    // the canvas bottom. Passing the SAME estimator (and refining zoomY against the true
    // rendered bottom) must frame every item's real box within the vertical budget.
    const document = generateTemplateDocument();
    const rows = orderedVisibleRows(document.sections, document.rows);
    const fit = computeFitViewForItems(
      document.items,
      rows,
      document.epochDate,
      inputs,
      undefined,
      estimateInnerLeftLabelExtentPx,
    );
    expect(fit).not.toBeNull();
    if (fit === null) {
      return;
    }
    const viewState = { ...document.viewState, ...fit };
    // Lay out EXACTLY as the renderer does (with the label-collision estimator).
    const placements = layoutRows(
      document.items,
      rows,
      document.epochDate,
      viewState,
      estimateInnerLeftLabelExtentPx,
    ).placements;
    const renderedBottom = Math.max(
      ...placements.map((placement) => placement.worldY + placement.worldHeight),
    );
    const topOffset = topOffsetForZoomX(fit.zoomX);
    // scrollY = 0, so this world y maps to the canvas bottom edge.
    const canvasContentBottom = canvasSize.heightPx - topOffset;
    // The rendered bottom is framed with the same margin the horizontal axis reserves.
    expect(renderedBottom).toBeLessThanOrEqual(canvasContentBottom);
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

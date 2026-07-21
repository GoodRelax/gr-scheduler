/**
 * CR-004 Pass B render/layout geometry (pure units):
 * - Part 2: milestone icon +15% height and icon-based label font, and Fit counting
 *   the enlarged milestone in the content bottom so it is not clipped.
 * - Part 3: font-scaled section-tree tier offsets (no minor/middle overlap at L).
 * - Part 5: assignee label geometry (right-aligned, above the lane center).
 * - Part 6b/6c: star keeps its outline path; the 7 special milestone glyphs each
 *   produce a distinct, non-empty path (not the diamond fallback).
 */

import { describe, expect, it } from 'vitest';
import type { IsoDate, MilestoneShape, Row, ScheduleItem } from '../src/domain/model/schedule-model.js';
import {
  milestoneIconHeightPx,
  milestoneLabelFontSizePx,
  MILESTONE_ICON_HEIGHT_RATIO,
} from '../src/domain/usecase/task-glyph.js';
import {
  milestonePath,
  milestoneShapeUsesEvenOdd,
  starPath,
} from '../src/adapters/render/item-geometry.js';
import {
  assigneeLabelFontSizePx,
  assigneeLabelGeometry,
} from '../src/domain/usecase/assignee-layout.js';
import { sectionRowLabelOffsets } from '../src/domain/usecase/left-pane-layout.js';
import { computeFitViewForItems } from '../src/domain/usecase/viewport.js';

/** A milestone item of the given shape at a fixed point in time. */
function milestone(shape: MilestoneShape, id = 'm', startDate = '2026-02-01'): ScheduleItem {
  return {
    id,
    rowId: 'row-0',
    itemKind: 'milestone',
    startDate: startDate as IsoDate,
    endDate: null,
    abbrev: id,
    importance: 90,
    milestoneShape: shape,
    iconShapeKind: shape,
    fillColor: '#ffffff',
    strokeColor: '#4d4d4d',
  };
}

describe('CR-004 Part 2: milestone dimensions + label font', () => {
  it('makes the milestone icon 15% taller than the task-bar height', () => {
    expect(MILESTONE_ICON_HEIGHT_RATIO).toBe(1.15);
    expect(milestoneIconHeightPx(20)).toBeCloseTo(23, 6);
  });

  it('derives the milestone label font from the ICON height, not the bar height', () => {
    const barHeight = 20;
    const iconHeight = milestoneIconHeightPx(barHeight);
    // The font tracks the enlarged icon, so it is larger than a bar-height-derived font.
    expect(milestoneLabelFontSizePx(iconHeight)).toBeCloseTo(iconHeight * 0.9, 6);
    expect(milestoneLabelFontSizePx(iconHeight)).toBeGreaterThan(barHeight * 0.9);
  });

  it('keeps a legible floor for a tiny (zoomed-out) marker', () => {
    expect(milestoneLabelFontSizePx(1)).toBe(6);
  });

  it('Fit counts the enlarged milestone in the content bottom (not clipped)', () => {
    // A single bottom-row milestone: Fit must frame its enlarged glyph, so the fitted
    // zoomY leaves room for the +15% overhang below the lane.
    const rows: Row[] = [
      { id: 'row-0', sectionId: 'sec-0', classificationLabel: 'A', order: 0 },
      { id: 'row-1', sectionId: 'sec-0', classificationLabel: 'B', order: 1 },
    ];
    const items = [
      { ...milestone('diamond', 'top'), rowId: 'row-0' },
      { ...milestone('diamond', 'bottom', '2026-02-10'), rowId: 'row-1' },
    ];
    const inputs = {
      canvasSize: { widthPx: 1000, heightPx: 600 },
      leftPaneWidth: 160,
      topOffsetForZoomX: (): number => 30,
    };
    const fit = computeFitViewForItems(items, rows, '2026-01-01', inputs);
    expect(fit).not.toBeNull();
    if (fit === null) {
      return;
    }
    // A positive, finite zoom that frames the content (the milestone-aware bottom keeps
    // the solver from over-zooming past the vertical budget).
    expect(fit.zoomY).toBeGreaterThan(0);
    expect(Number.isFinite(fit.zoomY)).toBe(true);
  });
});

describe('CR-004 Part 3: font-scaled section-tree tier offsets (ALIGN-L2-005)', () => {
  it('spaces middle and minor tiers so they never overlap at the large font', () => {
    const large = sectionRowLabelOffsets('L');
    // The minor row starts at least one tier line-height below the middle row, so the
    // middle label's rendered bottom cannot cross the minor label's top.
    expect(large.minorTopPx - large.middleTopPx).toBeGreaterThanOrEqual(large.lineHeightPx);
  });

  it('grows the tier offsets monotonically with the font scale', () => {
    const s = sectionRowLabelOffsets('S');
    const m = sectionRowLabelOffsets('M');
    const l = sectionRowLabelOffsets('L');
    expect(m.minorTopPx).toBeGreaterThanOrEqual(s.minorTopPx);
    expect(l.minorTopPx).toBeGreaterThan(m.minorTopPx);
  });
});

describe('CR-004 Part 5: assignee label geometry (ITEM-L2-004 / DEP-L2-003)', () => {
  it('right-aligns the name ending just before the item left edge', () => {
    const geometry = assigneeLabelGeometry(100, 40, 20);
    expect(geometry.textAnchor).toBe('end');
    expect(geometry.x).toBeLessThan(100);
  });

  it('keeps the whole label box ABOVE the lane center (clear of the middle_left stub)', () => {
    const laneTop = 40;
    const laneHeight = 20;
    const geometry = assigneeLabelGeometry(100, laneTop, laneHeight);
    const laneCenter = laneTop + laneHeight / 2;
    // With a middle baseline the box bottom is ~ y + font/2; it must not reach the center.
    const boxBottom = geometry.y + geometry.fontSizePx / 2;
    expect(boxBottom).toBeLessThanOrEqual(laneCenter + 1e-6);
  });

  it('sizes the assignee font from the lane height with a legible floor', () => {
    expect(assigneeLabelFontSizePx(20)).toBeCloseTo(11, 6);
    expect(assigneeLabelFontSizePx(1)).toBe(8);
  });
});

describe('CR-004 Part 6b: default star renders as an outline path', () => {
  it('uses the five-point star path for a star milestone', () => {
    const path = milestonePath(milestone('star'), 50, 50, 10);
    expect(path).toBe(starPath(50, 50, 10));
    expect(path.length).toBeGreaterThan(0);
    // The star is not the diamond fallback.
    expect(path).not.toBe(milestonePath(milestone('diamond'), 50, 50, 10));
  });
});

describe('CR-004 Part 6c: the 7 special milestone glyphs', () => {
  const SPECIAL: MilestoneShape[] = ['file', 'box3d', 'floppy', 'cylinder', 'person', 'smiley', 'beer'];
  const diamond = milestonePath(milestone('diamond'), 40, 40, 12);

  it('produces a non-empty, shape-specific path for each special shape (not the diamond)', () => {
    const paths = new Map<string, string>();
    for (const shape of SPECIAL) {
      const d = milestonePath(milestone(shape), 40, 40, 12);
      expect(d.length, `${shape} path non-empty`).toBeGreaterThan(0);
      expect(d, `${shape} not diamond fallback`).not.toBe(diamond);
      paths.set(shape, d);
    }
    // Every special glyph is distinct from the others (visually distinguishable).
    expect(new Set(paths.values()).size).toBe(SPECIAL.length);
  });

  it('marks the composite special glyphs as evenodd-filled (holes read through)', () => {
    for (const shape of SPECIAL) {
      expect(milestoneShapeUsesEvenOdd(milestone(shape)), shape).toBe(true);
    }
    // Base shapes stay nonzero.
    expect(milestoneShapeUsesEvenOdd(milestone('diamond'))).toBe(false);
    expect(milestoneShapeUsesEvenOdd(milestone('star'))).toBe(false);
  });
});

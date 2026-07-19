import { describe, expect, it } from 'vitest';
import type { RoundedBoxAnnotation } from '../src/domain/model/annotation.js';
import type { ViewState } from '../src/domain/model/schedule-model.js';
import {
  cursorScreenX,
  cursorSpanDays,
  roundedBoxScreenRect,
  todayLineScreenX,
} from '../src/domain/usecase/cursor-span.js';

const EPOCH = '2026-01-01';

function viewState(partial: Partial<ViewState> = {}): ViewState {
  return {
    zoomX: 1,
    zoomY: 1,
    scrollX: 0,
    scrollY: 0,
    fontScale: 'M',
    leftPaneWidth: 200,
    ...partial,
  };
}

describe('dual-cursor span calc (CURS-L1-002)', () => {
  it('counts whole days from base (primary) to diff (secondary), signed', () => {
    expect(cursorSpanDays('2026-03-01', '2026-03-31')).toBe(30);
  });

  it('is negative when the diff marker is earlier than the base', () => {
    expect(cursorSpanDays('2026-03-31', '2026-03-01')).toBe(-30);
  });

  it('is zero for the same day', () => {
    expect(cursorSpanDays('2026-03-15', '2026-03-15')).toBe(0);
  });

  it('crosses a month boundary correctly', () => {
    expect(cursorSpanDays('2026-01-31', '2026-02-01')).toBe(1);
  });
});

describe('cursor / today-line screen mapping (CURS-L1-001/002)', () => {
  it('maps a date to screen x = worldX - scrollX + leftPaneWidth', () => {
    const view = viewState({ scrollX: 50, leftPaneWidth: 120 });
    // 2026-01-11 is 10 days after epoch; 10 * BASE_PIXELS_PER_DAY(6) = 60 world x.
    expect(cursorScreenX('2026-01-11', EPOCH, view)).toBeCloseTo(60 - 50 + 120, 6);
  });

  it('today-line mapping matches the cursor mapping', () => {
    const view = viewState({ scrollX: 12 });
    expect(todayLineScreenX('2026-02-01', EPOCH, view)).toBeCloseTo(
      cursorScreenX('2026-02-01', EPOCH, view),
      6,
    );
  });
});

describe('rounded-box screen rect: zoom-invariant corner radius (CURS-L2-001 / ADR-004)', () => {
  const box: RoundedBoxAnnotation = {
    id: 'box',
    annotationKind: 'rounded-box',
    startDate: '2026-02-01',
    endDate: '2026-03-01',
    topRowIndex: 0,
    bottomRowIndex: 2,
    strokeColor: '#cc3311',
    cornerRadiusPx: 12,
  };

  it('keeps the corner radius constant (<= 1px drift) across zoom levels', () => {
    const radii = [0.25, 1, 4, 16, 64].map(
      (zoom) => roundedBoxScreenRect(box, EPOCH, viewState({ zoomX: zoom, zoomY: zoom })).cornerRadiusPx,
    );
    for (const radius of radii) {
      expect(Math.abs(radius - box.cornerRadiusPx)).toBeLessThanOrEqual(1);
    }
    // All equal to each other, too.
    expect(new Set(radii).size).toBe(1);
  });

  it('scales the box WIDTH with zoomX while the radius stays fixed', () => {
    const atOne = roundedBoxScreenRect(box, EPOCH, viewState({ zoomX: 1 }));
    const atFour = roundedBoxScreenRect(box, EPOCH, viewState({ zoomX: 4 }));
    expect(atFour.width).toBeCloseTo(atOne.width * 4, 4);
    expect(atFour.cornerRadiusPx).toBe(atOne.cornerRadiusPx);
  });

  it('scales the box HEIGHT with zoomY while the radius stays fixed', () => {
    const atOne = roundedBoxScreenRect(box, EPOCH, viewState({ zoomY: 1 }));
    const atThree = roundedBoxScreenRect(box, EPOCH, viewState({ zoomY: 3 }));
    expect(atThree.height).toBeCloseTo(atOne.height * 3, 4);
    expect(atThree.cornerRadiusPx).toBe(atOne.cornerRadiusPx);
  });

  it('offsets the box by scroll and the frozen left pane', () => {
    const rect = roundedBoxScreenRect(
      box,
      EPOCH,
      viewState({ scrollX: 30, scrollY: 15, leftPaneWidth: 100 }),
    );
    // 2026-02-01 is 31 days after epoch -> 31 * 6 = 186 world x.
    expect(rect.x).toBeCloseTo(186 - 30 + 100, 4);
    expect(rect.y).toBeCloseTo(0 - 15, 4);
  });
});

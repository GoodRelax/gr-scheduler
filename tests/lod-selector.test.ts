import { describe, expect, it } from 'vitest';
import {
  LOD_FULL_RENDER_ITEM_CAP,
  isVisibleAtZoom,
  lodThreshold,
  selectItemsByLod,
  shouldRenderAllItems,
} from '../src/domain/usecase/lod-selector.js';
import type { ScheduleItem } from '../src/domain/model/schedule-model.js';

function makeItem(id: string, importance: number): ScheduleItem {
  return {
    id,
    rowId: 'row-0',
    itemKind: 'task',
    startDate: '2026-01-01',
    endDate: '2026-01-10',
    abbrev: id,
    importance,
    taskShape: 'bar',
    fillColor: '#4477aa',
    strokeColor: '#333333',
  };
}

describe('lod-selector', () => {
  it('threshold decreases monotonically as zoom increases', () => {
    let previous = Number.POSITIVE_INFINITY;
    for (const zoom of [0, 0.5, 1, 2, 4, 8, 16, 64]) {
      const current = lodThreshold(zoom);
      expect(current).toBeLessThanOrEqual(previous);
      previous = current;
    }
  });

  it('threshold stays within (0, 1]', () => {
    for (const zoom of [0, 1, 10, 1000]) {
      const threshold = lodThreshold(zoom);
      expect(threshold).toBeGreaterThan(0);
      expect(threshold).toBeLessThanOrEqual(1);
    }
  });

  it('never hides an item as the user zooms in (monotonic visibility)', () => {
    const importance = 0.3;
    let wasVisible = false;
    for (const zoom of [0.1, 0.5, 1, 2, 4, 8]) {
      const visible = isVisibleAtZoom(importance, zoom);
      if (wasVisible) {
        expect(visible).toBe(true);
      }
      wasVisible = visible;
    }
  });

  it('the visible set never grows as the user zooms out', () => {
    const items = Array.from({ length: 50 }, (_, index) =>
      makeItem(`item-${index}`, (index % 10) / 10),
    );
    const zoomedIn = selectItemsByLod(items, 8).length;
    const midZoom = selectItemsByLod(items, 1).length;
    const zoomedOut = selectItemsByLod(items, 0.1).length;
    expect(zoomedIn).toBeGreaterThanOrEqual(midZoom);
    expect(midZoom).toBeGreaterThanOrEqual(zoomedOut);
  });
});

describe('small-document full-render policy (startup-Fit under-render fix)', () => {
  it('renders all items for a document at or below the cap', () => {
    expect(shouldRenderAllItems(0)).toBe(true);
    expect(shouldRenderAllItems(26)).toBe(true);
    expect(shouldRenderAllItems(LOD_FULL_RENDER_ITEM_CAP)).toBe(true);
  });

  it('keeps virtualization for documents above the cap', () => {
    expect(shouldRenderAllItems(LOD_FULL_RENDER_ITEM_CAP + 1)).toBe(false);
    expect(shouldRenderAllItems(1000)).toBe(false);
  });

  it('covers the whole ~26-item startup template regardless of zoom', () => {
    // A small template of equal-importance items over a multi-year span must show ALL
    // items at the very small Fit zoom (where the LOD threshold rises above ~0.88) --
    // the policy bypasses culling entirely for the small document.
    expect(shouldRenderAllItems(26)).toBe(true);
    // Guard the culling regime it replaces: at the small fit zoom the raw LOD threshold
    // would otherwise exclude every importance = 1 item's non-top peers.
    expect(lodThreshold(0.13)).toBeGreaterThan(0.8);
  });
});

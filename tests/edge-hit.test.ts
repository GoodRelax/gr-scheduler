import { describe, expect, it } from 'vitest';
import {
  edgeRegionAt,
  pickItemHit,
  type HitCandidate,
} from '../src/domain/usecase/edge-hit.js';

const HANDLE = 9;

describe('edgeRegionAt: task edge zones (interaction hardening, ITEM-L1-004)', () => {
  it('classifies the left and right ends of a wide task as resize zones', () => {
    expect(edgeRegionAt(103, 100, 60, true, HANDLE)).toBe('resize-start');
    expect(edgeRegionAt(157, 100, 60, true, HANDLE)).toBe('resize-end');
    expect(edgeRegionAt(130, 100, 60, true, HANDLE)).toBe('body');
  });

  it('keeps both ends grabbable on a bar narrower than two handle widths', () => {
    // width 10, handle 9 -> the two zones would overlap, so each is clamped to the
    // half nearest its own edge; the midpoint stays neutral-ish but both ends work.
    expect(edgeRegionAt(101, 100, 10, true, HANDLE)).toBe('resize-start');
    expect(edgeRegionAt(109, 100, 10, true, HANDLE)).toBe('resize-end');
  });

  it('never reports a resize zone for a milestone (no resizable edges)', () => {
    expect(edgeRegionAt(100, 100, 20, false, HANDLE)).toBe('body');
    expect(edgeRegionAt(119, 100, 20, false, HANDLE)).toBe('body');
  });
});

describe('pickItemHit: overlap resolution (edge precedence, selected/top wins)', () => {
  const top: HitCandidate = {
    itemId: 'top',
    laneIndex: 1,
    worldLeft: 100,
    worldWidth: 100,
    isTask: true,
    isSelected: false,
    side: 'plan',
  };
  const selected: HitCandidate = {
    itemId: 'sel',
    laneIndex: 0,
    worldLeft: 150,
    worldWidth: 20,
    isTask: true,
    isSelected: true,
    side: 'plan',
  };

  it('returns null when there are no candidates', () => {
    expect(pickItemHit([], 120, HANDLE)).toBeNull();
  });

  it('grabs the SELECTED bar edge even when an upper lane overlaps it', () => {
    // x = 152 is the selected bar's start edge, but also inside the top bar's body.
    const hit = pickItemHit([top, selected], 152, HANDLE);
    expect(hit).toEqual({ itemId: 'sel', region: 'resize-start', side: 'plan' });
  });

  it('prefers an edge (resize) over a body (move) at the same point', () => {
    // x = 168 is the selected bar's end edge; top bar body also contains it.
    const hit = pickItemHit([top, selected], 168, HANDLE);
    expect(hit).toEqual({ itemId: 'sel', region: 'resize-end', side: 'plan' });
  });

  it('falls back to the topmost lane body when no edge is under the pointer', () => {
    // Only the top bar contains x = 150 (mid of 100..200), and it is not near an edge.
    const hit = pickItemHit([top], 150, HANDLE);
    expect(hit).toEqual({ itemId: 'top', region: 'body', side: 'plan' });
  });
});

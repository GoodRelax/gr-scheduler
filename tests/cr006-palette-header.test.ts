/**
 * Unit coverage for the CR-006 palette / header batch's pure, DOM-free seams. The
 * DOM wiring (buildChrome, the palette toggles, the 2-click gesture in the editing
 * controller) runs `bootstrap()` on import and is exercised in tests/e2e; here we pin
 * the extracted logic each part derives its behavior from so a regression fails fast:
 *
 * - Part 1 / Part 2: the [Fit] and [P] header controls exist and stay adjacent, in that
 *   order (CR-015 later moved them from the left edge to the head of the toolbar; the
 *   position contract now lives in tests/header-model.test.ts).
 * - Part 5: the progress-line default is now HIDDEN.
 * - Part 6: the plan/actual style default resolves to `overlap`.
 * - Part 8: two clicked corners normalize into a well-formed rounded-box rect.
 */

import { describe, expect, it } from 'vitest';
import { HEADER_CONTROL_ROLES } from '../src/app/header-model.js';
import { isProgressLineVisible } from '../src/domain/usecase/progress-line-builder.js';
import { resolvePlanActualStyle } from '../src/domain/usecase/plan-actual-geometry.js';
import { roundedBoxRectFromCorners } from '../src/domain/command/annotation-commands.js';

/** The CR-006 Part 1 / Part 2 pair, in reading order. */
const FIT_AND_PALETTE_ROLES = ['header-fit', 'header-palette-toggle'] as const;

describe('CR-006 Part 1/2: [Fit] and [P] header controls', () => {
  it('keeps [Fit] immediately followed by the [P] palette toggle', () => {
    const fitIndex = HEADER_CONTROL_ROLES.indexOf(FIT_AND_PALETTE_ROLES[0]);
    const paletteIndex = HEADER_CONTROL_ROLES.indexOf(FIT_AND_PALETTE_ROLES[1]);
    expect(fitIndex).toBeGreaterThanOrEqual(0);
    expect(paletteIndex).toBe(fitIndex + 1);
  });

  it('uses ASCII-only role identifiers (live-CSP hazard guard)', () => {
    for (const role of FIT_AND_PALETTE_ROLES) {
      const asciiClean = [...role].every((character) => {
        const code = character.charCodeAt(0);
        return code >= 32 && code <= 126;
      });
      expect(asciiClean, `non-ASCII role: ${role}`).toBe(true);
    }
  });
});

describe('CR-006 Part 5: progress line defaults to HIDDEN', () => {
  it('treats an absent / undefined flag as NOT visible', () => {
    expect(isProgressLineVisible(undefined)).toBe(false);
  });

  it('shows the line only when the flag is explicitly true', () => {
    expect(isProgressLineVisible(true)).toBe(true);
    expect(isProgressLineVisible(false)).toBe(false);
  });
});

describe('CR-006 Part 6: plan/actual style default stays overlap', () => {
  it('resolves an absent style to overlap (unchanged default)', () => {
    expect(resolvePlanActualStyle(undefined)).toBe('overlap');
    expect(resolvePlanActualStyle('overlap')).toBe('overlap');
  });

  it('resolves an explicit separate style', () => {
    expect(resolvePlanActualStyle('separate')).toBe('separate');
  });
});

describe('CR-006 Part 8: 2-click rounded-box rect normalization', () => {
  it('orders top-left then bottom-right clicks into a well-formed rect', () => {
    const rect = roundedBoxRectFromCorners('2026-01-10', '2026-03-20', 1, 4);
    expect(rect).toEqual({
      startDate: '2026-01-10',
      endDate: '2026-03-20',
      topRowIndex: 1,
      bottomRowIndex: 4,
    });
  });

  it('normalizes clicks made in the reverse / mixed order (bottom-right first)', () => {
    const rect = roundedBoxRectFromCorners('2026-03-20', '2026-01-10', 4, 1);
    expect(rect).toEqual({
      startDate: '2026-01-10',
      endDate: '2026-03-20',
      topRowIndex: 1,
      bottomRowIndex: 4,
    });
  });

  it('clamps negative row indices to zero', () => {
    const rect = roundedBoxRectFromCorners('2026-01-01', '2026-01-05', -3, 2);
    expect(rect.topRowIndex).toBe(0);
    expect(rect.bottomRowIndex).toBe(2);
  });
});

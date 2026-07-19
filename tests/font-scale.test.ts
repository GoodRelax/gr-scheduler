import { describe, expect, it } from 'vitest';
import {
  UI_FONT_CSS_VAR,
  UI_FONT_PX_BY_SCALE,
  applyUniformFontScale,
} from '../src/app/font-scale.js';

/** Minimal HTMLElement stub capturing setProperty calls (no DOM in node env). */
function makeRootStub(): { root: HTMLElement; readVar: () => string | undefined } {
  const properties = new Map<string, string>();
  const style = {
    setProperty(name: string, value: string): void {
      properties.set(name, value);
    },
  } as unknown as CSSStyleDeclaration;
  const root = { style } as unknown as HTMLElement;
  return { root, readVar: () => properties.get(UI_FONT_CSS_VAR) };
}

describe('font-scale (TOOL-L1-002 uniform application)', () => {
  it('defines a strictly increasing S < M < L px scale', () => {
    expect(UI_FONT_PX_BY_SCALE.S).toBeLessThan(UI_FONT_PX_BY_SCALE.M);
    expect(UI_FONT_PX_BY_SCALE.M).toBeLessThan(UI_FONT_PX_BY_SCALE.L);
  });

  it('publishes the chosen size as the root CSS variable (drives ALL UI text)', () => {
    const { root, readVar } = makeRootStub();
    applyUniformFontScale(root, 'S');
    expect(readVar()).toBe(`${UI_FONT_PX_BY_SCALE.S}px`);
    applyUniformFontScale(root, 'L');
    expect(readVar()).toBe(`${UI_FONT_PX_BY_SCALE.L}px`);
  });
});

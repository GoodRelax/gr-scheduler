import { describe, expect, it } from 'vitest';
import type { FontScale, ViewState } from '../src/domain/model/schedule-model.js';
import {
  applyCanvasFontScale,
  applyScaledFontVar,
  CHROME_BASE_FONT_PX,
  ensureUiFontStylesheet,
  type FontScaleCanvasTarget,
  FONT_SCALE_GLYPHS,
  FONT_SCALED_CLASS,
  LEFT_PANE_NAME_FONT_CSS,
  minorCategoryNameFontPx,
  PROPERTY_PANEL_CAPTION_FONT_CSS,
  PROPERTY_PANEL_EM,
  PROPERTY_PANEL_FONT_CSS,
  PROPERTY_PANEL_ROW_INPUT_HEIGHT_PX,
  scaledFontSizeCss,
  toFontScale,
  UI_FONT_CSS_VAR,
  UI_FONT_PX_BY_SCALE,
} from '../src/app/font-scale.js';

const SCALES: readonly FontScale[] = ['S', 'M', 'L'];

/** Minimal HTMLElement stub capturing setProperty calls (no DOM in node env). */
function makeElementStub(): { element: HTMLElement; readVar: () => string | undefined } {
  const properties = new Map<string, string>();
  const style = {
    setProperty(name: string, value: string): void {
      properties.set(name, value);
    },
  } as unknown as CSSStyleDeclaration;
  const element = { style } as unknown as HTMLElement;
  return { element, readVar: () => properties.get(UI_FONT_CSS_VAR) };
}

/** Fake document that captures the single injected `<style>` element's text. */
function makeStyleCapturingDocument(): { doc: Document; readStyleText: () => string } {
  let styleText = '';
  const head = {
    appendChild(node: { textContent: string }): void {
      styleText = node.textContent;
    },
  };
  const doc = {
    getElementById: (): null => null,
    createElement: (): { id: string; textContent: string } => ({ id: '', textContent: '' }),
    head,
  } as unknown as Document;
  return { doc, readStyleText: () => styleText };
}

describe('font-scale (CR-005 Part 1: [S][M][L] glyphs)', () => {
  it('labels the buttons S / M / L (not the old A- / A / A+)', () => {
    expect(FONT_SCALE_GLYPHS).toEqual({ S: 'S', M: 'M', L: 'L' });
    for (const glyph of Object.values(FONT_SCALE_GLYPHS)) {
      expect(glyph).not.toMatch(/A/);
    }
  });

  it('keeps the persisted S/M/L value type: a strictly increasing px scale', () => {
    expect(UI_FONT_PX_BY_SCALE.S).toBeLessThan(UI_FONT_PX_BY_SCALE.M);
    expect(UI_FONT_PX_BY_SCALE.M).toBeLessThan(UI_FONT_PX_BY_SCALE.L);
  });
});

describe('font-scale (CR-005 Part 2: header + palette excluded, 3 targets scale)', () => {
  it('pins #app to the FIXED chrome base, NOT the scaled variable', () => {
    const { doc, readStyleText } = makeStyleCapturingDocument();
    ensureUiFontStylesheet(doc);
    const css = readStyleText();
    // #app carries a fixed px base so the chrome (header + palette) never scales.
    expect(css).toContain(`#app { font-size: ${CHROME_BASE_FONT_PX}px; }`);
    // The scaled variable is NEVER bound onto #app (the chrome cannot inherit it).
    expect(css).not.toContain(`#app { font-size: var(${UI_FONT_CSS_VAR}`);
  });

  it('does NOT bind the header or palette font-size to the scaled variable', () => {
    const { doc, readStyleText } = makeStyleCapturingDocument();
    ensureUiFontStylesheet(doc);
    const css = readStyleText();
    // No rule ties the header / palette classes to the scaled variable.
    expect(css).not.toMatch(/grsch-app-header[^}]*var\(--grsch-ui-font/);
    expect(css).not.toMatch(/grsch-command-palette[^}]*var\(--grsch-ui-font/);
    // The variable appears nowhere in the GLOBAL stylesheet: it is applied per target.
    expect(css).not.toContain(UI_FONT_CSS_VAR);
  });

  it('the three scaled targets consume the variable via a font-size that references it', () => {
    // Left pane (section names) and property panel bind their font-size to the var.
    expect(LEFT_PANE_NAME_FONT_CSS).toContain(`var(${UI_FONT_CSS_VAR}`);
    expect(PROPERTY_PANEL_FONT_CSS).toContain(`var(${UI_FONT_CSS_VAR}`);
    // The calc falls back to the chrome base when the var is unset.
    expect(scaledFontSizeCss(0.8)).toBe(
      `calc(0.8 * var(${UI_FONT_CSS_VAR}, ${CHROME_BASE_FONT_PX}px))`,
    );
  });

  it('applyScaledFontVar publishes the scaled px on a specific target element', () => {
    for (const scale of SCALES) {
      const { element, readVar } = makeElementStub();
      applyScaledFontVar(element, scale);
      expect(readVar()).toBe(`${UI_FONT_PX_BY_SCALE[scale]}px`);
    }
  });

  it('exposes a stable opt-in class for the scaled targets', () => {
    expect(FONT_SCALED_CLASS).toBe('grsch-font-scaled');
  });
});

describe('font-scale (CR-005 Part 4: comment font equals minor-category name size)', () => {
  it('the minor-category name size follows the scale (strictly increasing, > 0)', () => {
    expect(minorCategoryNameFontPx('S')).toBeGreaterThan(0);
    expect(minorCategoryNameFontPx('S')).toBeLessThan(minorCategoryNameFontPx('M'));
    expect(minorCategoryNameFontPx('M')).toBeLessThan(minorCategoryNameFontPx('L'));
  });

  it('is a SINGLE source: the comment layer sizes its body from this exact function', () => {
    // The comment layer imports minorCategoryNameFontPx and sets the SVG text
    // font-size to it, so the comment body equals the minor-category name at every
    // scale by construction. Assert the concrete values are the shared ones.
    expect(minorCategoryNameFontPx('S')).toBe(
      Math.round(UI_FONT_PX_BY_SCALE.S * 0.8 * 0.83),
    );
    expect(minorCategoryNameFontPx('M')).toBe(
      Math.round(UI_FONT_PX_BY_SCALE.M * 0.8 * 0.83),
    );
    expect(minorCategoryNameFontPx('L')).toBe(
      Math.round(UI_FONT_PX_BY_SCALE.L * 0.8 * 0.83),
    );
  });
});

describe('font-scale (CR-005 Part 3: property panel fits scroll-free at S/M/L)', () => {
  it('keeps the field-row input height fixed, independent of the font scale', () => {
    // A fixed row height bounds the panel height so it does not inflate with scale.
    expect(PROPERTY_PANEL_ROW_INPUT_HEIGHT_PX).toBeGreaterThan(0);
    expect(Number.isInteger(PROPERTY_PANEL_ROW_INPUT_HEIGHT_PX)).toBe(true);
  });

  it('the REAL rendered caption stays inside the fixed row height, even at L', () => {
    // Derive the caption px from the EXACT CSS the panel applies to its captions
    // (PROPERTY_PANEL_CAPTION_FONT_CSS, an em of the panel body) rather than a parallel
    // constant, so this guards the value the panel actually renders. If the caption
    // never exceeds the fixed row height at any scale, rows do not grow and the full
    // field set stays a bounded, scroll-free height (M-1: no false-confidence path).
    const captionEmRatio = Number.parseFloat(PROPERTY_PANEL_CAPTION_FONT_CSS);
    expect(PROPERTY_PANEL_CAPTION_FONT_CSS).toMatch(/em$/); // captions scale with the body
    for (const scale of SCALES) {
      const panelBodyPx = UI_FONT_PX_BY_SCALE[scale] * PROPERTY_PANEL_EM;
      const renderedCaptionPx = captionEmRatio * panelBodyPx;
      expect(renderedCaptionPx).toBeLessThanOrEqual(PROPERTY_PANEL_ROW_INPUT_HEIGHT_PX);
    }
  });
});

describe('font-scale (L-3: dataset value validation)', () => {
  it('accepts the three valid steps and defaults anything else to M', () => {
    expect(toFontScale('S')).toBe('S');
    expect(toFontScale('M')).toBe('M');
    expect(toFontScale('L')).toBe('L');
    expect(toFontScale(undefined)).toBe('M');
    expect(toFontScale('')).toBe('M');
    expect(toFontScale('XL')).toBe('M');
    expect(toFontScale('s')).toBe('M'); // case-sensitive: lowercase is not a valid step
  });
});

describe('font-scale (L-1: font-scale toggle forces a synchronous canvas render)', () => {
  /** A canvas target that records the order of setViewState / renderNow calls. */
  function makeCanvasSpy(initial: FontScale): {
    renderer: FontScaleCanvasTarget;
    calls: string[];
    lastRenderedScale: () => FontScale | null;
  } {
    let viewState: ViewState = {
      zoomX: 1,
      zoomY: 1,
      scrollX: 0,
      scrollY: 0,
      fontScale: initial,
    };
    const calls: string[] = [];
    let renderedScale: FontScale | null = null;
    return {
      calls,
      lastRenderedScale: () => renderedScale,
      renderer: {
        getViewState: () => viewState,
        setViewState: (next) => {
          calls.push(`setViewState:${next.fontScale}`);
          viewState = next;
        },
        // renderNow models the SVG overlay rebuild: it reads the CURRENT scale, which
        // is what the comment layer would size the comment body from.
        renderNow: () => {
          calls.push('renderNow');
          renderedScale = viewState.fontScale;
        },
      },
    };
  }

  it('renders the canvas synchronously (renderNow) right after updating the scale', () => {
    const spy = makeCanvasSpy('L');
    applyCanvasFontScale(spy.renderer, 'S');
    // The scale is committed THEN the canvas is rendered synchronously (no waiting for
    // an animation frame), so the comment body cannot lag at the previous scale.
    expect(spy.calls).toEqual(['setViewState:S', 'renderNow']);
    expect(spy.lastRenderedScale()).toBe('S');
  });

  it('the synchronous render observes the NEW scale for every step', () => {
    const spy = makeCanvasSpy('M');
    for (const scale of ['S', 'L', 'M'] as FontScale[]) {
      applyCanvasFontScale(spy.renderer, scale);
      expect(spy.lastRenderedScale()).toBe(scale);
    }
  });
});

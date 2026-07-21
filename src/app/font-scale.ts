/**
 * Framework layer: SCOPED UI font-scale application (TOOL-L1-002, CR-005 Part 2).
 *
 * The [S][M][L] font setting rescales EXACTLY three targets (DEC-005 Decision 1):
 *   1. the left-pane section (category) names,
 *   2. the property panel,
 *   3. the item comment bodies (canvas comment layer).
 * The header and the floating command palette are DELIBERATELY excluded and keep a
 * fixed size at every scale.
 *
 * Mechanism: `#app` carries a FIXED chrome base font size ({@link CHROME_BASE_FONT_PX}),
 * so the header + palette (which size their text in `em` relative to `#app`) are
 * frozen regardless of the scale. The scaled size is published as a CSS custom
 * property ({@link UI_FONT_CSS_VAR}) ON THE THREE TARGET CONTAINERS ONLY (an opt-in),
 * and each target consumes it via {@link scaledFontSizeCss} (an `em`-ratio times the
 * variable). Because the variable is never set on `#app`, the chrome cannot inherit
 * it. The comment layer is SVG text, so it reads the numeric px directly from
 * {@link minorCategoryNameFontPx} (Part 4: the comment font equals the minor-category
 * name size at the same scale).
 */

import type { FontScale, ViewState } from '../domain/model/schedule-model.js';

/** Root UI font size in px per font-scale step (S / M / L). Persisted value type is
 * unchanged (only the button GLYPH changed, CR-005 Part 1). */
export const UI_FONT_PX_BY_SCALE: Readonly<Record<FontScale, number>> = {
  S: 12,
  M: 14,
  L: 17,
};

/** The CSS custom property carrying the active scaled font size (opt-in per target). */
export const UI_FONT_CSS_VAR = '--grsch-ui-font';

/**
 * Fixed chrome base font size (px). `#app` is pinned to this, so the header and the
 * floating command palette stay a constant size at every font scale (CR-005 Part 2 /
 * DEC-005 Decision 1). Equal to the M step so the M appearance is unchanged.
 */
export const CHROME_BASE_FONT_PX = UI_FONT_PX_BY_SCALE.M;

/**
 * Opt-in marker class for a scaled subtree (one of the three CR-005 targets). It is
 * a stable hook for tests + tooling; the actual sizing is driven by each target's
 * own `font-size` ({@link scaledFontSizeCss}) plus the {@link UI_FONT_CSS_VAR} the
 * target carries. Header + palette never receive this class nor the variable.
 */
export const FONT_SCALED_CLASS = 'grsch-font-scaled';

/** Header font-size glyphs for the [S][M][L] buttons (CR-005 Part 1: was [A-][A][A+]). */
export const FONT_SCALE_GLYPHS: Readonly<Record<FontScale, string>> = {
  S: 'S',
  M: 'M',
  L: 'L',
};

/** Left-pane section-name container font as a ratio of the scaled base (0.8em). */
export const LEFT_PANE_NAME_EM = 0.8;

/** Minor (小分類) label font as a ratio of the pane container font (0.83em). */
export const MINOR_LABEL_EM = 0.83;

/** Property-panel body font as a ratio of the scaled base (0.7em). */
export const PROPERTY_PANEL_EM = 0.7;

/**
 * Property-panel field caption font as a ratio of the panel body font. SINGLE source
 * of the caption size: {@link PROPERTY_PANEL_CAPTION_FONT_CSS} is derived from it and
 * is the exact value the panel sets on every caption, so there is one 0.9 in the code.
 */
export const PROPERTY_PANEL_CAPTION_EM = 0.9;

/**
 * The exact CSS `font-size` the property panel applies to every field / section
 * caption (an `em` of the panel body, so it scales with the font variable). Derived
 * from {@link PROPERTY_PANEL_CAPTION_EM} and consumed by BOTH caption render sites
 * (the field-row caption and the progress-line section caption), so no caption size
 * is hardcoded.
 */
export const PROPERTY_PANEL_CAPTION_FONT_CSS = `${PROPERTY_PANEL_CAPTION_EM}em`;

/**
 * Fixed CSS-px height of a property-panel field input row. Deliberately INDEPENDENT
 * of the font scale so the panel's overall height is bounded and it fits without a
 * scrollbar at every scale (CR-005 Part 3): only the text inside a row scales, and
 * the caption ({@link PROPERTY_PANEL_CAPTION_FONT_CSS}) is sized to stay within this
 * row height even at L.
 */
export const PROPERTY_PANEL_ROW_INPUT_HEIGHT_PX = 17;

/** Id of the injected global stylesheet so it is installed exactly once. */
const STYLE_ELEMENT_ID = 'grsch-ui-font-style';

/**
 * Build the CSS `font-size` value that binds a scaled container to the active
 * {@link UI_FONT_CSS_VAR} at a given `em` ratio, falling back to the chrome base
 * when the variable is unset. Used by the left pane and property panel so their
 * text tracks the variable the container carries (and nothing outside them does).
 *
 * @param emRatio - The container's `em` ratio of the scaled base (e.g. 0.8).
 * @returns A `calc(...)` string, e.g. `calc(0.8 * var(--grsch-ui-font, 14px))`.
 */
export function scaledFontSizeCss(emRatio: number): string {
  return `calc(${emRatio} * var(${UI_FONT_CSS_VAR}, ${CHROME_BASE_FONT_PX}px))`;
}

/** Left-pane section-name container font-size bound to the scaled variable. */
export const LEFT_PANE_NAME_FONT_CSS = scaledFontSizeCss(LEFT_PANE_NAME_EM);

/** Property-panel body font-size bound to the scaled variable. */
export const PROPERTY_PANEL_FONT_CSS = scaledFontSizeCss(PROPERTY_PANEL_EM);

/**
 * The SINGLE source of the left-pane MINOR (小分類) category-name font size in px at
 * a scale. Both the left-pane minor label AND the comment body use this so the two
 * are equal by construction (CR-005 Part 4): the comment font follows the scale and
 * equals the minor-category name size.
 *
 * @param scale - The active font scale.
 * @returns The minor-category / comment font size in whole CSS px.
 */
export function minorCategoryNameFontPx(scale: FontScale): number {
  return Math.round(UI_FONT_PX_BY_SCALE[scale] * LEFT_PANE_NAME_EM * MINOR_LABEL_EM);
}

/**
 * Install the one-time global stylesheet. `#app` is pinned to the FIXED chrome base
 * ({@link CHROME_BASE_FONT_PX}) so the header + palette never scale (CR-005 Part 2);
 * native form controls keep inheriting their container's font-size, so a control
 * inside a scaled target scales while a chrome control stays fixed. Injected as a
 * `<style>` element (allowed by the build CSP's `style-src 'unsafe-inline'`).
 *
 * @param doc - The document to install the stylesheet into.
 */
export function ensureUiFontStylesheet(doc: Document): void {
  if (doc.getElementById(STYLE_ELEMENT_ID) !== null) {
    return;
  }
  const style = doc.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = [
    // Fixed chrome base: the scaled variable is NEVER bound here, so the header and
    // palette (sized in em of #app) stay constant at every font scale.
    `#app { font-size: ${CHROME_BASE_FONT_PX}px; }`,
    '#app button, #app input, #app select, #app textarea {',
    '  font-family: inherit; font-size: inherit; line-height: inherit;',
    '}',
  ].join('\n');
  doc.head.appendChild(style);
}

/**
 * Publish the scaled font size as {@link UI_FONT_CSS_VAR} on ONE target element (opt-in,
 * CR-005 Part 2). Of the three scaled targets, only TWO consume the variable via CSS
 * -- the left-pane container and the property-panel root; the third target (canvas
 * comment bodies) is SVG text whose size is computed in the layer from
 * {@link minorCategoryNameFontPx}, not via this variable. Call this ONLY for those two
 * containers; NEVER for the header or palette. Idempotent.
 *
 * @param element - The target container to scale (left pane or property panel).
 * @param scale - The chosen font scale step.
 */
export function applyScaledFontVar(element: HTMLElement, scale: FontScale): void {
  element.style.setProperty(UI_FONT_CSS_VAR, `${UI_FONT_PX_BY_SCALE[scale]}px`);
}

/** The three valid font-scale steps, for runtime validation of untrusted input. */
const FONT_SCALE_VALUES: ReadonlySet<string> = new Set<FontScale>(['S', 'M', 'L']);

/**
 * Narrow an arbitrary string (e.g. a `data-fontScale` dataset value) to a
 * {@link FontScale}, falling back to `'M'` for anything invalid. Keeps an unchecked
 * `as FontScale` assertion out of the click handlers (L-3).
 *
 * @param value - The candidate string, possibly undefined.
 * @returns A valid font scale, defaulting to `'M'`.
 */
export function toFontScale(value: string | undefined): FontScale {
  return value !== undefined && FONT_SCALE_VALUES.has(value) ? (value as FontScale) : 'M';
}

/**
 * A renderer this module can drive to apply a font scale to the CANVAS immediately.
 * Structural so it stays testable without the full {@link import('../adapters/render/svg-renderer.js').SvgRenderer}.
 */
export interface FontScaleCanvasTarget {
  /** Read the current view state. */
  getViewState(): ViewState;
  /** Replace the view state (schedules a render). */
  setViewState(next: ViewState): void;
  /** Render the canvas SYNCHRONOUSLY now (bypassing the animation-frame batch). */
  renderNow(): void;
}

/**
 * Apply a font scale to the CANVAS in lock-step with the rest of the UI (CR-005
 * Part 4 live-defect fix). Font scaling is a discrete user action, so after updating
 * the view state we force a SYNCHRONOUS canvas re-render ({@link FontScaleCanvasTarget.renderNow}):
 * `setViewState` only SCHEDULES the SVG overlay re-render on the next animation frame,
 * which would leave the comment bodies at the previous scale while the (synchronously
 * updated) left pane already shows the new size. Rendering now keeps the comment text
 * and item labels in step with the section names and property panel.
 *
 * @param renderer - The canvas render target.
 * @param scale - The chosen font scale step.
 */
export function applyCanvasFontScale(renderer: FontScaleCanvasTarget, scale: FontScale): void {
  renderer.setViewState({ ...renderer.getViewState(), fontScale: scale });
  renderer.renderNow();
}

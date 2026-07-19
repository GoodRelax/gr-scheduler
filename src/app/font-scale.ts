/**
 * Framework layer: uniform UI font-scale application (TOOL-L1-002).
 *
 * The 大/中/小 (L/M/S) font setting must apply the SAME scale to ALL UI text --
 * schedule labels (handled by the renderer's own font-size step), the property
 * panel, the left classification pane and the toolbar/palette. This module drives
 * the HTML/CSS side: it publishes the chosen size as a CSS custom property
 * (`--grsch-ui-font`) on the app root and installs a one-time stylesheet so the
 * whole chrome (including native form controls, which do not inherit fonts by
 * default) tracks that single variable. Components size their text in `em`, so
 * one variable change rescales every UI string at once.
 */

import type { FontScale } from '../domain/model/schedule-model.js';

/** Root UI font size in px per font-scale step (S / M / L). */
export const UI_FONT_PX_BY_SCALE: Readonly<Record<FontScale, number>> = {
  S: 12,
  M: 14,
  L: 17,
};

/** Id of the injected global stylesheet so it is installed exactly once. */
const STYLE_ELEMENT_ID = 'grsch-ui-font-style';

/** The CSS custom property carrying the active UI font size. */
export const UI_FONT_CSS_VAR = '--grsch-ui-font';

/**
 * Install the one-time global stylesheet that binds the chrome to
 * {@link UI_FONT_CSS_VAR}. Native form controls (`button`/`input`/`select`/
 * `textarea`) are forced to inherit the font so the L/M/S step reaches them too
 * (TOOL-L1-002). Injected as a `<style>` element (allowed by the build CSP's
 * `style-src 'unsafe-inline'`).
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
    `#app { font-size: var(${UI_FONT_CSS_VAR}, ${UI_FONT_PX_BY_SCALE.M}px); }`,
    '#app button, #app input, #app select, #app textarea {',
    '  font-family: inherit; font-size: inherit; line-height: inherit;',
    '}',
  ].join('\n');
  doc.head.appendChild(style);
}

/**
 * Apply a font scale to the whole UI by publishing the size variable on the app
 * root (TOOL-L1-002). Idempotent; safe to call on every change.
 *
 * @param root - The app root element (`#app`).
 * @param scale - The chosen font scale step.
 */
export function applyUniformFontScale(root: HTMLElement, scale: FontScale): void {
  root.style.setProperty(UI_FONT_CSS_VAR, `${UI_FONT_PX_BY_SCALE[scale]}px`);
}

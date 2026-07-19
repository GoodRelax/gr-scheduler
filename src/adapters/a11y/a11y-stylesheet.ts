/**
 * Adapter layer: one-time accessibility stylesheet (WCAG 2.4.7 Focus Visible,
 * 2.3.3 Animation from Interactions / prefers-reduced-motion).
 *
 * It installs, exactly once, the CSS that:
 * - draws a clearly visible focus indicator on every focusable control and on the
 *   schedule canvas when reached by keyboard (`:focus-visible`, SC 2.4.7);
 * - defines the `.grsch-visually-hidden` utility used for the screen-reader-only
 *   live region and help text (kept off-screen but in the accessibility tree);
 * - disables the palette's opacity transition (and any decorative transition)
 *   when the user prefers reduced motion (SC 2.3.3).
 *
 * Injected as a `<style>` element, which the build CSP allows via
 * `style-src 'unsafe-inline'`.
 */

import { FOCUS_RING_HEX } from '../../domain/usecase/a11y-tokens.js';

/** Id of the injected stylesheet so it is installed exactly once. */
const A11Y_STYLE_ELEMENT_ID = 'grsch-a11y-style';

/** Class name for screen-reader-only (visually hidden) content. */
export const VISUALLY_HIDDEN_CLASS = 'grsch-visually-hidden';

/**
 * Install the accessibility stylesheet into a document (idempotent).
 *
 * @param doc - The document to install the stylesheet into.
 */
export function ensureA11yStylesheet(doc: Document): void {
  if (doc.getElementById(A11Y_STYLE_ELEMENT_ID) !== null) {
    return;
  }
  const style = doc.createElement('style');
  style.id = A11Y_STYLE_ELEMENT_ID;
  style.textContent = [
    // Visible keyboard focus indicator (SC 2.4.7): a solid high-contrast outline
    // on any focusable chrome control reached by keyboard.
    '#app button:focus-visible,',
    '#app input:focus-visible,',
    '#app select:focus-visible,',
    '#app textarea:focus-visible,',
    '#app [tabindex]:focus-visible,',
    '#app svg[data-role="schedule-canvas"]:focus-visible {',
    `  outline: 3px solid ${FOCUS_RING_HEX};`,
    '  outline-offset: 1px;',
    '}',
    // The canvas outline sits inside its border so it is never clipped.
    '#app svg[data-role="schedule-canvas"]:focus-visible {',
    '  outline-offset: -3px;',
    '}',
    // Screen-reader-only utility: present in the a11y tree, invisible on screen.
    `.${VISUALLY_HIDDEN_CLASS} {`,
    '  position: absolute !important;',
    '  width: 1px !important;',
    '  height: 1px !important;',
    '  padding: 0 !important;',
    '  margin: -1px !important;',
    '  overflow: hidden !important;',
    '  clip: rect(0, 0, 0, 0) !important;',
    '  white-space: nowrap !important;',
    '  border: 0 !important;',
    '}',
    // Respect reduced-motion (SC 2.3.3): drop decorative transitions/animations.
    '@media (prefers-reduced-motion: reduce) {',
    '  #app [data-role="tool-palette"] { transition: none !important; }',
    '  #app *, #app *::before, #app *::after {',
    '    animation-duration: 0.001ms !important;',
    '    transition-duration: 0.001ms !important;',
    '  }',
    '}',
  ].join('\n');
  doc.head.appendChild(style);
}

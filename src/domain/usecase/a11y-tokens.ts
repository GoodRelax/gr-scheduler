/**
 * UseCase layer: accessibility design tokens (WCAG 1.4.1 Use of Color,
 * 1.4.3 Contrast, 2.4.7 Focus Visible). Pure data, no DOM.
 *
 * Two concerns live here:
 *
 * 1. UI color tokens: the foreground/background pairs the chrome (toolbar, panel,
 *    status text, item labels) draws with. Every pair is chosen to meet the WCAG
 *    AA contrast thresholds and is asserted by the contrast unit test, so a token
 *    change that would drop below AA fails the build.
 *
 * 2. Non-color encodings: attributes that carry meaning WITHOUT relying on hue, so
 *    plan vs actual, selection and keyboard focus remain distinguishable for
 *    color-blind users and in grayscale (SC 1.4.1). These are stroke dash patterns
 *    and ring widths, never "the blue one means selected".
 */


/** A foreground-on-background color token pair with its intended usage. */
export interface UiColorPair {
  /** Stable identifier for the pair (diagnostics / test names). */
  readonly tokenName: string;
  /** Foreground (text or graphic) hex color. */
  readonly foregroundHex: string;
  /** Background hex color the foreground is drawn on. */
  readonly backgroundHex: string;
  /** True when this pair is large text or a non-text UI element (3:1 target). */
  readonly isLargeOrUi: boolean;
}

/** Toolbar background (light gray). Shared by the status/label tokens below. */
export const TOOLBAR_BACKGROUND_HEX = '#f5f5f5';
/** Primary chrome text on the toolbar / panel. */
export const CHROME_TEXT_HEX = '#333333';
/** Muted secondary text (hints / empty states) that still meets AA on the panel. */
export const MUTED_TEXT_HEX = '#595959';
/** Property panel background. */
export const PANEL_BACKGROUND_HEX = '#fafafa';
/** Left classification pane background. */
export const PANE_BACKGROUND_HEX = '#eef1f5';
/** Sub-classification (小分類) label text on the pane (AA on the pane bg). */
export const SUBCLASSIFICATION_TEXT_HEX = '#4b5563';
/** Canvas (schedule) background. */
export const CANVAS_BACKGROUND_HEX = '#ffffff';
/** Item abbreviation label color on the white canvas. */
export const ITEM_LABEL_HEX = '#1a1a1a';
/** Autosave "saved" status text (dark green, AA on the toolbar). */
export const AUTOSAVE_OK_HEX = '#1a7f46';
/** Autosave "save failed" status text (dark red, AA on the toolbar). */
export const AUTOSAVE_FAIL_HEX = '#b3261e';
/** Keyboard-focus ring color (high-contrast blue) on the white canvas. */
export const FOCUS_RING_HEX = '#0b5cad';

/**
 * The UI color pairs asserted to meet WCAG AA (SC 1.4.3 / 1.4.11). Adjust a hex
 * token above and this list keeps the contrast test honest.
 */
export const UI_COLOR_PAIRS: readonly UiColorPair[] = [
  {
    tokenName: 'chrome-text-on-toolbar',
    foregroundHex: CHROME_TEXT_HEX,
    backgroundHex: TOOLBAR_BACKGROUND_HEX,
    isLargeOrUi: false,
  },
  {
    tokenName: 'chrome-text-on-panel',
    foregroundHex: CHROME_TEXT_HEX,
    backgroundHex: PANEL_BACKGROUND_HEX,
    isLargeOrUi: false,
  },
  {
    tokenName: 'muted-text-on-panel',
    foregroundHex: MUTED_TEXT_HEX,
    backgroundHex: PANEL_BACKGROUND_HEX,
    isLargeOrUi: false,
  },
  {
    tokenName: 'muted-text-on-toolbar',
    foregroundHex: MUTED_TEXT_HEX,
    backgroundHex: TOOLBAR_BACKGROUND_HEX,
    isLargeOrUi: false,
  },
  {
    tokenName: 'item-label-on-canvas',
    foregroundHex: ITEM_LABEL_HEX,
    backgroundHex: CANVAS_BACKGROUND_HEX,
    isLargeOrUi: false,
  },
  {
    tokenName: 'autosave-ok-on-toolbar',
    foregroundHex: AUTOSAVE_OK_HEX,
    backgroundHex: TOOLBAR_BACKGROUND_HEX,
    isLargeOrUi: false,
  },
  {
    tokenName: 'autosave-fail-on-toolbar',
    foregroundHex: AUTOSAVE_FAIL_HEX,
    backgroundHex: TOOLBAR_BACKGROUND_HEX,
    isLargeOrUi: false,
  },
  {
    tokenName: 'subclassification-text-on-pane',
    foregroundHex: SUBCLASSIFICATION_TEXT_HEX,
    backgroundHex: PANE_BACKGROUND_HEX,
    isLargeOrUi: false,
  },
  {
    tokenName: 'focus-ring-on-canvas',
    foregroundHex: FOCUS_RING_HEX,
    backgroundHex: CANVAS_BACKGROUND_HEX,
    isLargeOrUi: true,
  },
] as const;

// --- Non-color encodings (SC 1.4.1 Use of Color) ----------------------------

/**
 * Selection outline dash pattern. Selection is conveyed by BOTH a color and this
 * dashed rectangle, so it is distinguishable without relying on hue (SC 1.4.1).
 */
export const SELECTION_DASH_ARRAY = '4 2';

/** Keyboard-focus ring stroke width (px). Solid, thicker than the selection dash. */
export const FOCUS_RING_STROKE_WIDTH = 2.5;

/** Keyboard-focus ring dash pattern: solid, so it differs from the dashed selection. */
export const FOCUS_RING_DASH_ARRAY = 'none';

/**
 * Non-color plan/actual redundancy code (SC 1.4.1).
 *
 * TODO(IM3): CR-002 Part 1 replaces the old dashed-plan / solid-actual redundancy with
 * a line-WIDTH code (plan thin / actual thick; no dash, which the user found too busy).
 * Until IM3 lands that, this is NEUTRALIZED to a solid stroke ('none') for every case;
 * the actual-date model no longer carries a plan/actual discriminator per item.
 *
 * @param _planActualSide - Legacy discriminator ('plan' | 'actual'); ignored for IM1.
 * @returns An SVG `stroke-dasharray` value; always 'none' (solid) until IM3.
 */
export function planActualStrokeDashArray(_planActualSide: 'plan' | 'actual' | undefined): string {
  return 'none';
}

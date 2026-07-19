/**
 * Framework layer: the theme layer (SHELL/THEME batch) -- FOUR modes.
 *
 * A single, maintainable source of truth for every UI color. The whole app is
 * themed through CSS custom properties: this module installs one stylesheet that
 * declares the variables for the light palette on `:root`, the dark palette both
 * under `@media (prefers-color-scheme: dark)` (so an untouched app respects the OS
 * preference) AND under an explicit `:root[data-theme="dark"]` (so the manual
 * choice wins over the OS), the two MONOCHROME palettes under
 * `:root[data-theme="mono-light"]` / `:root[data-theme="mono-dark"]`, plus the
 * element rules that CONSUME the variables for the SVG canvas decorations
 * (background, gridlines, date ruler, section lines, selection). The HTML chrome
 * (header, palette, panels, dialogs) consumes the same variables from its own
 * inline styles / stylesheets, so a theme switch is a single attribute flip with
 * no re-render.
 *
 * Color modes:
 *  - `light` / `dark`  : Plan (green) and actual (orange) item fills, the
 *    dependency (yamabuki) line and the progress (purple) line keep their identity;
 *    only the neutral surfaces and faint decorations are re-toned for dark.
 *  - `mono-light` / `mono-dark` : a fully GRAYSCALE (desaturated) palette for
 *    black-and-white capture / printing. The chrome variables are the luminance
 *    grayscale of the light / dark palettes (so WCAG 2.1 AA contrast is preserved),
 *    and a `filter: grayscale(1)` on the schedule canvas degrades the data-driven
 *    plan / actual / dependency / progress identities to gray as well.
 *
 * Every color pair is chosen to keep WCAG 2.1 AA contrast in all four modes.
 */

/**
 * The user's theme preference; an explicit mode is applied verbatim, `system`
 * follows `prefers-color-scheme` (between `light` and `dark`).
 */
export type ThemePreference = ThemeMode | 'system';

/** The concrete resolved theme actually applied to the DOM. */
export type ThemeMode = 'light' | 'dark' | 'mono-light' | 'mono-dark';

/** The four selectable theme modes, in the order the header selector renders them. */
export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'mono-light', 'mono-dark'];

/** Whether a mode is one of the two monochrome (grayscale) palettes. */
export function isMonochromeMode(mode: ThemeMode): boolean {
  return mode === 'mono-light' || mode === 'mono-dark';
}

/** Whether a mode uses a dark base surface (drives `color-scheme` for native controls). */
export function isDarkBaseMode(mode: ThemeMode): boolean {
  return mode === 'dark' || mode === 'mono-dark';
}

/** localStorage key the manual theme-mode choice is persisted under. */
export const THEME_PREFERENCE_STORAGE_KEY = 'grsch:theme-preference';

/** Stylesheet element id (idempotent install guard). */
const THEME_STYLE_ID = 'grsch-theme-style';

/**
 * Light-palette CSS custom property values (the app's default look). Every value
 * is an ASCII CSS color; the keys are the variable names consumed across the UI.
 */
const LIGHT_THEME_VARIABLES: Readonly<Record<string, string>> = {
  '--grsch-canvas-bg': '#ffffff',
  '--grsch-grid-line': '#1e293b',
  '--grsch-section-line': '#c3c8d0',
  '--grsch-ruler-bg': '#eef1f5',
  '--grsch-ruler-line': '#c3c8d0',
  '--grsch-ruler-text': '#2b2b2b',
  '--grsch-selection': '#0072b2',
  // Header.
  '--grsch-header-bg': '#20304a',
  '--grsch-header-fg': '#ffffff',
  '--grsch-header-muted': '#c7d0de',
  // Floating command palette.
  '--grsch-palette-surface': 'rgba(255, 255, 255, 0.24)',
  '--grsch-palette-surface-solid': 'rgba(255, 255, 255, 0.97)',
  '--grsch-palette-border': 'rgba(180, 185, 193, 0.35)',
  '--grsch-palette-border-solid': '#bbbbbb',
  '--grsch-btn-bg': 'rgba(238, 241, 245, 0.55)',
  '--grsch-btn-bg-solid': '#eef1f5',
  '--grsch-btn-hover': '#e2e7ef',
  '--grsch-btn-text': '#2b2b2b',
  '--grsch-btn-border': 'rgba(150, 155, 163, 0.55)',
  '--grsch-accent': '#3f7856',
  '--grsch-accent-border': '#35664a',
  '--grsch-accent-text': '#ffffff',
  '--grsch-input-bg': 'rgba(255, 255, 255, 0.7)',
  '--grsch-group-label': '#444444',
  '--grsch-drag-handle': '#55606f',
  '--grsch-armed-readout': '#005a8c',
  // Panels / pane / dialogs.
  '--grsch-panel-bg': '#fafafa',
  '--grsch-panel-border': '#dddddd',
  '--grsch-pane-bg': '#eef1f5',
  '--grsch-surface-strong': '#ffffff',
  '--grsch-text': '#333333',
  '--grsch-text-strong': '#222222',
  '--grsch-text-muted': '#595959',
  '--grsch-menu-border': '#9aa1ac',
  '--grsch-scrim': 'rgba(0, 0, 0, 0.28)',
  '--grsch-danger': '#c0392b',
  '--grsch-danger-border': '#a5281c',
  '--grsch-danger-text': '#ffffff',
  '--grsch-btn-face': '#fbfcfe',
  '--grsch-btn-face-alt': '#f2f4f7',
  '--grsch-btn-face-border': '#b7bdc7',
  '--grsch-btn-active-bg': '#d7dce3',
  '--grsch-btn-active-border': '#9aa1ac',
  '--grsch-header-label': '#333a44',
  '--grsch-mid-label': '#2b2b2b',
  '--grsch-sub-label': '#4b5563',
  '--grsch-input-text': '#2b2b2b',
};

/**
 * Dark-palette overrides. Neutrals go dark, faint decorations invert to a light
 * hairline at low opacity (unchanged opacity keeps them "barely visible"), and
 * text lightens to stay AA on the dark surfaces.
 */
const DARK_THEME_VARIABLES: Readonly<Record<string, string>> = {
  '--grsch-canvas-bg': '#14171c',
  '--grsch-grid-line': '#c7d0dc',
  '--grsch-section-line': '#3a4250',
  '--grsch-ruler-bg': '#232b36',
  '--grsch-ruler-line': '#3a4250',
  '--grsch-ruler-text': '#cbd4e0',
  '--grsch-selection': '#4aa3e0',
  '--grsch-header-bg': '#0f1620',
  '--grsch-header-fg': '#e8edf5',
  '--grsch-header-muted': '#9aa8bd',
  '--grsch-palette-surface': 'rgba(24, 29, 37, 0.42)',
  '--grsch-palette-surface-solid': 'rgba(33, 40, 51, 0.98)',
  '--grsch-palette-border': 'rgba(120, 132, 150, 0.4)',
  '--grsch-palette-border-solid': '#55606f',
  '--grsch-btn-bg': 'rgba(58, 66, 79, 0.55)',
  '--grsch-btn-bg-solid': '#3a4250',
  '--grsch-btn-hover': '#465060',
  '--grsch-btn-text': '#e6ebf3',
  '--grsch-btn-border': 'rgba(130, 142, 160, 0.55)',
  '--grsch-accent': '#4f9d70',
  '--grsch-accent-border': '#3f7d59',
  '--grsch-accent-text': '#0c1610',
  '--grsch-input-bg': 'rgba(38, 45, 55, 0.85)',
  '--grsch-group-label': '#d7dfe9',
  '--grsch-drag-handle': '#c2ccd8',
  '--grsch-armed-readout': '#7fc8f2',
  '--grsch-panel-bg': '#1b2028',
  '--grsch-panel-border': '#333b47',
  '--grsch-pane-bg': '#1e242d',
  '--grsch-surface-strong': '#262d37',
  '--grsch-text': '#d6dde8',
  '--grsch-text-strong': '#eef2f8',
  '--grsch-text-muted': '#9aa4b2',
  '--grsch-menu-border': '#4a5464',
  '--grsch-scrim': 'rgba(0, 0, 0, 0.55)',
  '--grsch-danger': '#d1483a',
  '--grsch-danger-border': '#b23a2d',
  '--grsch-danger-text': '#ffffff',
  '--grsch-btn-face': '#2a323d',
  '--grsch-btn-face-alt': '#2a323d',
  '--grsch-btn-face-border': '#4a5464',
  '--grsch-btn-active-bg': '#3c4757',
  '--grsch-btn-active-border': '#5a6577',
  '--grsch-header-label': '#cfd7e2',
  '--grsch-mid-label': '#d6dde8',
  '--grsch-sub-label': '#aab4c2',
  '--grsch-input-text': '#e6ebf3',
};

/**
 * Convert one CSS color literal (`#rgb`, `#rrggbb`, `rgb(...)` or `rgba(...)`) to
 * its luminance grayscale equivalent, preserving any alpha. Using the Rec. 709
 * luma weights keeps the perceived lightness -- and therefore the contrast ratio
 * against the matching background -- essentially unchanged, so a palette that is
 * AA in color stays AA in grayscale. Unrecognized values are returned unchanged.
 *
 * @param color - The source CSS color literal.
 * @returns The grayscale equivalent as `#rrggbb` or `rgba(g, g, g, a)`.
 */
export function toGrayscaleColor(color: string): string {
  const hexMatch = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(color.trim());
  if (hexMatch !== null) {
    const hex = hexMatch[1] as string;
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((character) => character + character)
            .join('')
        : hex;
    const red = Number.parseInt(full.slice(0, 2), 16);
    const green = Number.parseInt(full.slice(2, 4), 16);
    const blue = Number.parseInt(full.slice(4, 6), 16);
    const gray = grayLuma(red, green, blue);
    const channel = gray.toString(16).padStart(2, '0');
    return `#${channel}${channel}${channel}`;
  }
  const rgbaMatch = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(
    color.trim(),
  );
  if (rgbaMatch !== null) {
    const red = Number(rgbaMatch[1]);
    const green = Number(rgbaMatch[2]);
    const blue = Number(rgbaMatch[3]);
    const gray = grayLuma(red, green, blue);
    const alpha = rgbaMatch[4] ?? '1';
    return `rgba(${gray}, ${gray}, ${gray}, ${alpha})`;
  }
  return color;
}

/** Rec. 709 luma of an 8-bit RGB triple, rounded to an integer channel value. */
function grayLuma(red: number, green: number, blue: number): number {
  return Math.round(0.2126 * red + 0.7152 * green + 0.0722 * blue);
}

/** Grayscale every value of a palette variable map (keys are unchanged). */
function toGrayscalePalette(
  variables: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  const grayscale: Record<string, string> = {};
  for (const [name, value] of Object.entries(variables)) {
    grayscale[name] = toGrayscaleColor(value);
  }
  return grayscale;
}

/**
 * Monochrome palettes: the luminance grayscale of the light / dark palettes, so the
 * chrome is fully desaturated for black-and-white capture while keeping AA contrast.
 */
const MONO_LIGHT_THEME_VARIABLES: Readonly<Record<string, string>> =
  toGrayscalePalette(LIGHT_THEME_VARIABLES);
const MONO_DARK_THEME_VARIABLES: Readonly<Record<string, string>> =
  toGrayscalePalette(DARK_THEME_VARIABLES);

/** Element rules that CONSUME the variables for the SVG canvas decorations. */
const CANVAS_ELEMENT_RULES = `
svg[data-role="schedule-canvas"] { background: var(--grsch-canvas-bg); }
g[data-role="gridlines"] line { stroke: var(--grsch-grid-line); }
g[data-role="classification-lines"] line { stroke: var(--grsch-section-line); }
g[data-role="date-ruler"] > rect { fill: var(--grsch-ruler-bg); }
g[data-role="date-ruler"] line { stroke: var(--grsch-ruler-line); }
text[data-role="date-ruler-label"] { fill: var(--grsch-ruler-text); }
rect[data-role="annotation-selection"] { stroke: var(--grsch-selection); }
rect[data-role="annotation-handle"] { stroke: var(--grsch-selection); fill: var(--grsch-canvas-bg); }
/* Monochrome modes: desaturate the whole schedule canvas so the data-driven plan /
   actual / dependency / progress identities degrade to gray for B/W capture. */
:root[data-theme="mono-light"] svg[data-role="schedule-canvas"],
:root[data-theme="mono-dark"] svg[data-role="schedule-canvas"] { filter: grayscale(1); }
`;

/** Render a variable map into the body of a CSS declaration block. */
function toVariableBlock(variables: Readonly<Record<string, string>>): string {
  return Object.entries(variables)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
}

/** Build the full theme stylesheet text (variables + element rules). */
function buildThemeStylesheet(): string {
  const light = toVariableBlock(LIGHT_THEME_VARIABLES);
  const dark = toVariableBlock(DARK_THEME_VARIABLES);
  const monoLight = toVariableBlock(MONO_LIGHT_THEME_VARIABLES);
  const monoDark = toVariableBlock(MONO_DARK_THEME_VARIABLES);
  return [
    `:root {\n${light}\n}`,
    // No manual override set: honor the OS preference.
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme]) {\n${dark}\n  }\n}`,
    // Manual override wins over the OS preference either way.
    `:root[data-theme="dark"] {\n${dark}\n}`,
    `:root[data-theme="mono-light"] {\n${monoLight}\n}`,
    `:root[data-theme="mono-dark"] {\n${monoDark}\n}`,
    CANVAS_ELEMENT_RULES,
  ].join('\n');
}

/**
 * Install the theme stylesheet once. Idempotent: a second call is a no-op, so the
 * shell can call it unconditionally at bootstrap.
 *
 * @param doc - The document to install the stylesheet into.
 */
export function installThemeStylesheet(doc: Document): void {
  if (doc.getElementById(THEME_STYLE_ID) !== null) {
    return;
  }
  const style = doc.createElement('style');
  style.id = THEME_STYLE_ID;
  style.textContent = buildThemeStylesheet();
  doc.head.appendChild(style);
}

/** Whether a raw string is a valid, persistable theme preference. */
function isThemePreference(value: unknown): value is ThemePreference {
  return (
    value === 'system' ||
    value === 'light' ||
    value === 'dark' ||
    value === 'mono-light' ||
    value === 'mono-dark'
  );
}

/** Read the persisted theme preference, defaulting to `system`. */
export function readStoredThemePreference(): ThemePreference {
  try {
    const stored = globalThis.localStorage?.getItem(THEME_PREFERENCE_STORAGE_KEY);
    if (isThemePreference(stored)) {
      return stored;
    }
  } catch {
    // localStorage can throw (privacy mode / disabled); fall back to system.
  }
  return 'system';
}

/** Persist the theme preference (best-effort; storage failures are ignored). */
export function writeStoredThemePreference(preference: ThemePreference): void {
  try {
    globalThis.localStorage?.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
  } catch {
    // Ignore storage failures: the in-memory choice still applies this session.
  }
}

/** Whether the OS currently prefers a dark color scheme (false when unknown). */
export function osPrefersDark(): boolean {
  try {
    return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
  } catch {
    return false;
  }
}

/**
 * Resolve a preference to the concrete mode to apply: an explicit choice is used
 * verbatim; `system` follows the OS `prefers-color-scheme`.
 *
 * @param preference - The user's stored/selected preference.
 * @returns The concrete `light` / `dark` mode.
 */
export function resolveThemeMode(preference: ThemePreference): ThemeMode {
  if (preference !== 'system') {
    return preference;
  }
  return osPrefersDark() ? 'dark' : 'light';
}

/**
 * Apply a preference to the document root. For an explicit choice the resolved
 * mode is pinned via `data-theme` (so it beats the OS media query); for `system`
 * the attribute is removed so `prefers-color-scheme` drives the variables.
 *
 * @param doc - The document to apply to.
 * @param preference - The preference to apply.
 * @returns The concrete mode now in effect.
 */
export function applyThemePreference(doc: Document, preference: ThemePreference): ThemeMode {
  const mode = resolveThemeMode(preference);
  if (preference === 'system') {
    delete doc.documentElement.dataset.theme;
  } else {
    doc.documentElement.dataset.theme = mode;
  }
  // Drive native form controls (date / color / select inputs, scrollbars) to the
  // matching built-in palette so they are legible in the dark-based modes too.
  doc.documentElement.style.colorScheme = isDarkBaseMode(mode) ? 'dark' : 'light';
  return mode;
}

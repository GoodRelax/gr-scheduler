/**
 * Framework layer: the pure, DOM-free model of the header/toolbar layout (CR-003
 * Part 1 / TOOL-L1-008). Kept separate from `main.ts` (which runs `bootstrap()` on
 * import) so the order contract and the Load / Save menu specs are unit-testable in
 * isolation, and so `buildChrome` derives the runtime order from the SAME constant a
 * test asserts against -- the header can never silently drift from the CR-003 order.
 *
 * Header reading order (left -> right, after the branding block + centered title):
 *   SS -> Load -> Save -> Light -> Dark -> Mono L -> Mono D -> Base V -> Base I ->
 *   Undo -> Redo -> AI -> ?(Help)
 */

/**
 * Stable `data-role` of the LEFT-edge header controls (CR-006 Part 1 / Part 2), in
 * order, placed to the LEFT of the `GR Scheduler` branding block: `[Fit]` (frame the
 * whole schedule) then `[P]` (show / minimize the floating palette). Kept as a
 * DOM-free constant so `buildChrome` derives the runtime order from the same value a
 * unit test asserts against, exactly like {@link HEADER_CONTROL_ROLES}.
 */
export const HEADER_LEFT_CONTROL_ROLES: readonly string[] = ['header-fit', 'header-palette-toggle'];

/** Stable `data-role` of every top-level header control, in CR-003 Part 1 order. */
export const HEADER_CONTROL_ROLES: readonly string[] = [
  'screenshot',
  'load',
  'save',
  'theme-light',
  'theme-dark',
  'theme-mono-light',
  'theme-mono-dark',
  'baseline-visible',
  'baseline-invisible',
  'undo',
  'redo',
  'open-ai',
  'open-help',
];

/** A single entry of a header dropdown menu (Load / Save). */
export interface HeaderMenuItemSpec {
  /** Stable `data-role` for wiring + tests. */
  readonly role: string;
  /** Visible menu-item label. */
  readonly label: string;
  /** Accessible name (aria-label / title); English + ASCII (item18). */
  readonly accessibleName: string;
}

/**
 * Load menu (CR-003 Part 1): import a JSON or MSPDI XML document, import a JSON as a
 * grey baseline reference underlay, or start a fresh empty schedule (New / All Clear,
 * which is a confirmed hard reset and folded here as a document-lifecycle action).
 */
export const LOAD_MENU_ITEMS: readonly HeaderMenuItemSpec[] = [
  { role: 'load-json', label: 'JSON', accessibleName: 'Load JSON schedule' },
  { role: 'load-xml', label: 'XML', accessibleName: 'Load MS Project XML schedule' },
  {
    role: 'load-json-baseline',
    label: 'JSON as baseline',
    accessibleName: 'Load JSON as a baseline reference',
  },
  { role: 'new-clear', label: 'New (clear all)', accessibleName: 'New empty schedule (clear all)' },
];

/**
 * Save menu (CR-003 Part 1): export JSON / MSPDI XML data, or the SVG / PNG rendering.
 * SVG and PNG are the FULL-canvas fixed export -- distinct from the SS button, which
 * captures the current viewport only.
 */
export const SAVE_MENU_ITEMS: readonly HeaderMenuItemSpec[] = [
  { role: 'save-json', label: 'JSON', accessibleName: 'Save as JSON' },
  { role: 'save-xml', label: 'XML', accessibleName: 'Save as MS Project XML' },
  { role: 'save-svg', label: 'SVG', accessibleName: 'Save full canvas as SVG' },
  { role: 'save-png', label: 'PNG', accessibleName: 'Save full canvas as PNG' },
];

/** Theme-mode header buttons, in CR-003 order (Light / Dark / Mono L / Mono D). */
export interface ThemeButtonSpec {
  readonly mode: 'light' | 'dark' | 'mono-light' | 'mono-dark';
  readonly role: string;
  readonly label: string;
  readonly accessibleName: string;
}

/** The four theme-mode buttons the header renders as an exclusive segmented control. */
export const THEME_BUTTON_SPECS: readonly ThemeButtonSpec[] = [
  { mode: 'light', role: 'theme-light', label: 'Light', accessibleName: 'Light theme' },
  { mode: 'dark', role: 'theme-dark', label: 'Dark', accessibleName: 'Dark theme' },
  {
    mode: 'mono-light',
    role: 'theme-mono-light',
    label: 'Mono L',
    accessibleName: 'Monochrome light theme',
  },
  {
    mode: 'mono-dark',
    role: 'theme-mono-dark',
    label: 'Mono D',
    accessibleName: 'Monochrome dark theme',
  },
];

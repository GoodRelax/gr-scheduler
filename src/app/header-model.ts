/**
 * Framework layer: the pure, DOM-free model of the header/toolbar layout (CR-003
 * Part 1 / CR-015 / TOOL-L1-008). Kept separate from `main.ts` (which runs
 * `bootstrap()` on import) so the order contract and the Load / Save menu specs are
 * unit-testable in isolation, and so `buildChrome` derives the runtime order from the
 * SAME constant a test asserts against -- the header can never silently drift from the
 * agreed order.
 *
 * Header reading order (left -> right), CR-015 revising CR-006 Part 1 / Part 2:
 *   GR Scheduler branding -> project title -> Fit -> P -> SS -> Load -> Save ->
 *   Light -> Dark -> Mono L -> Mono D -> Base V -> Base I -> Undo -> Redo -> AI ->
 *   ?(Help)
 *
 * CR-006 had placed `[Fit]` and `[P]` to the LEFT of the branding; CR-015 moves them
 * to the FIRST two positions of the action toolbar, so the identity of the product and
 * of the open document always reads first.
 */

import type { Locale } from '../domain/model/schedule-model.js';
import { DEFAULT_LOCALE, uiLabel } from '../domain/usecase/i18n.js';

/** Stable `data-role` of the two-line `GR Scheduler` branding block (leftmost). */
export const HEADER_BRANDING_ROLE = 'app-branding';

/** Stable `data-role` of the project-title element (DEF-010 / CR-016 inline edit). */
export const HEADER_TITLE_ROLE = 'schedule-name';

/**
 * Every header element's `data-role`, in canonical left -> right order (CR-015). The
 * first two entries are the non-interactive identity elements (branding, then the
 * project title); everything after them is an interactive control and is exposed as
 * {@link HEADER_CONTROL_ROLES}, which `buildChrome` appends the toolbar in.
 */
export const HEADER_ELEMENT_ROLES: readonly string[] = [
  HEADER_BRANDING_ROLE,
  HEADER_TITLE_ROLE,
  'header-fit',
  'header-palette-toggle',
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

/**
 * Stable `data-role` of every interactive header control, in CR-015 order: the
 * {@link HEADER_ELEMENT_ROLES} order minus the branding and title identity elements,
 * so a single constant stays the source of truth for both.
 */
export const HEADER_CONTROL_ROLES: readonly string[] = HEADER_ELEMENT_ROLES.filter(
  (role) => role !== HEADER_BRANDING_ROLE && role !== HEADER_TITLE_ROLE,
);

/**
 * i18n key of the ONE header text shown when the document's `title` is blank
 * (DEF-010, localized by DEF-012). The strings themselves live with every other
 * built-in UI label in {@link UI_LABELS}, so the placeholder keeps a single
 * definition AND follows the active locale like the rest of the chrome. The key
 * itself stays an English ASCII identifier (PROP-L1-004).
 */
export const HEADER_TITLE_PLACEHOLDER_LABEL_KEY = 'untitled_schedule';

/**
 * The header text shown for a blank document title, in the active locale (DEF-012).
 *
 * @param activeLocale - The UI locale to display (defaults to English).
 * @returns The localized placeholder.
 */
export function headerTitlePlaceholder(activeLocale: Locale = DEFAULT_LOCALE): string {
  return uiLabel(HEADER_TITLE_PLACEHOLDER_LABEL_KEY, activeLocale);
}

/**
 * The rename affordance announced as the title control's accessible name and shown as
 * its tooltip (CR-016 / DEF-012): the inline rename gesture is otherwise invisible
 * (item6 -- the UI must teach itself without a manual).
 *
 * @param activeLocale - The UI locale to display (defaults to English).
 * @returns The localized affordance hint.
 */
export function scheduleTitleEditHint(activeLocale: Locale = DEFAULT_LOCALE): string {
  return uiLabel('schedule_title_edit_hint', activeLocale);
}

/**
 * ARIA role of the STATIC header title element (DEF-012, WCAG 4.1.2). The element is
 * a `<span>` that opens the inline rename editor, so it must announce itself as an
 * activatable control instead of plain text. Declared once here and applied by both
 * the header construction and the end of an edit, so the two can never disagree.
 * (While the editor is mounted INSIDE the span the role is removed: a focusable input
 * nested in a button is invalid -- axe `nested-interactive`.)
 */
export const HEADER_TITLE_ARIA_ROLE = 'button';

/**
 * The accessible name announced for the header title control (DEF-012, WCAG 4.1.2 and
 * 2.5.3 label-in-name): the CURRENT project name followed by the rename affordance, so
 * a screen-reader user hears which project is open AND that activating the control
 * renames it. The visible text is a PREFIX of the name, never replaced by a bare hint.
 *
 * @param titleText - The text currently shown in the header (a title or the placeholder).
 * @param activeLocale - The UI locale to display (defaults to English).
 * @returns The accessible name for the title control.
 */
export function scheduleTitleAccessibleName(
  titleText: string,
  activeLocale: Locale = DEFAULT_LOCALE,
): string {
  return `${titleText} - ${scheduleTitleEditHint(activeLocale)}`;
}

/**
 * Resolve the text the header shows for a document title (DEF-010): the trimmed
 * title, or the localized {@link headerTitlePlaceholder} when it is blank.
 *
 * @param documentTitle - `ScheduleDocument.title` of the active document.
 * @param activeLocale - The UI locale the placeholder is shown in (defaults to English).
 * @returns The string to render in the header title element.
 */
export function resolveHeaderTitleText(
  documentTitle: string,
  activeLocale: Locale = DEFAULT_LOCALE,
): string {
  const trimmed = documentTitle.trim();
  return trimmed.length > 0 ? trimmed : headerTitlePlaceholder(activeLocale);
}

/**
 * The slice of `ScheduleStore` the header title needs: read the current document and be
 * told when it changed. Declared structurally (DIP) so the binding below can be unit
 * tested against a real store without any DOM.
 */
export interface HeaderTitleSource {
  /** The active document (only its `title` is read). */
  getDocument(): { readonly title: string };
  /**
   * Register a change listener.
   *
   * @param listener - Called after every document change.
   * @returns An unsubscribe function.
   */
  subscribe(listener: (scheduleDocument: { readonly title: string }) => void): () => void;
}

/**
 * Bind a header title sink to the document title (DEF-010): paints once immediately,
 * then repaints on every store change -- a dispatched rename, an undo, a redo, and a
 * whole-document replacement (load / New) alike, because `ScheduleStore.subscribe`
 * notifies on all of them. This is why the title needs no point-in-time refresh calls
 * scattered through the shell.
 *
 * @param source - The store (or any structural equivalent) to follow.
 * @param setTitleText - Sink that renders the resolved text (the DOM side).
 * @param getActiveLocale - Reads the UI locale the blank-title placeholder is shown
 *   in (DEF-012); read per paint so a locale change is picked up. Defaults to English.
 * @returns An unsubscribe function.
 */
export function bindHeaderTitleText(
  source: HeaderTitleSource,
  setTitleText: (titleText: string) => void,
  getActiveLocale: () => Locale = () => DEFAULT_LOCALE,
): () => void {
  const paint = (): void => {
    setTitleText(resolveHeaderTitleText(source.getDocument().title, getActiveLocale()));
  };
  paint();
  return source.subscribe(() => {
    paint();
  });
}

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

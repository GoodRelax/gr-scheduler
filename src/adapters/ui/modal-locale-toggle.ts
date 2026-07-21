/**
 * Adapter layer: the `[en]` / `[jp]` language toggle placed inside the AI-export and
 * Help modal headers, to the LEFT of the `x` close button (CR-006 Part 4 / DEC-005
 * Decision 2). It switches the DISPLAYED language of that modal's content only; it is
 * NOT a header control and never changes the app-wide locale.
 *
 * The toggle is a small exclusive segmented control of two buttons; the active button
 * carries `aria-pressed="true"` (matching the app's other exclusive segmented controls,
 * e.g. the theme selector) so the selected language is visibly and accessibly indicated.
 * Both labels (`en` / `jp`) are ASCII glyphs (the live-CSP hash hazard guard). Pure DOM
 * construction; the caller supplies the `onSelect` reaction.
 */

import type { Locale } from '../../domain/model/schedule-model.js';

/** The handle returned by {@link buildModalLocaleToggle}. */
export interface ModalLocaleToggle {
  /** The segmented-control element to insert before the modal's close button. */
  readonly element: HTMLElement;
  /** Reflect `locale` as the checked radio without firing `onSelect` (idempotent). */
  readonly setActive: (locale: Locale) => void;
}

/** The two languages the modal toggle offers, in display order. */
const MODAL_LOCALE_SPECS: ReadonlyArray<{ locale: Locale; label: string; accessibleName: string }> = [
  { locale: 'en', label: 'en', accessibleName: 'Show this dialog in English' },
  { locale: 'ja', label: 'jp', accessibleName: 'Show this dialog in Japanese' },
];

/**
 * Build the `[en]` / `[jp]` segmented language toggle for a modal header.
 *
 * @param initialLocale - The language checked initially.
 * @param onSelect - Invoked with the chosen language when a button is clicked and the
 *   language actually changes.
 * @returns A {@link ModalLocaleToggle} handle.
 */
export function buildModalLocaleToggle(
  initialLocale: Locale,
  onSelect: (locale: Locale) => void,
): ModalLocaleToggle {
  const group = document.createElement('div');
  group.className = 'grsch-modal-locale-toggle';
  group.dataset.role = 'modal-locale-toggle';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Dialog language');

  const buttons: HTMLButtonElement[] = MODAL_LOCALE_SPECS.map(({ locale, label, accessibleName }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'grsch-modal-locale-btn';
    button.dataset.role = 'modal-locale-option';
    button.dataset.locale = locale;
    button.textContent = label;
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', accessibleName);
    button.title = accessibleName;
    group.appendChild(button);
    return button;
  });

  let active: Locale = initialLocale;
  const setActive = (locale: Locale): void => {
    active = locale;
    for (const button of buttons) {
      button.setAttribute('aria-pressed', button.dataset.locale === locale ? 'true' : 'false');
    }
  };

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const next = button.dataset.locale === 'ja' ? 'ja' : 'en';
      if (next === active) {
        return;
      }
      setActive(next);
      onSelect(next);
    });
  }

  setActive(initialLocale);
  return { element: group, setActive };
}

/** Install the shared stylesheet for the modal locale toggle once (themed). */
export function ensureModalLocaleToggleStylesheet(doc: Document): void {
  const styleId = 'grsch-modal-locale-toggle-style';
  if (doc.getElementById(styleId) !== null) {
    return;
  }
  const style = doc.createElement('style');
  style.id = styleId;
  style.textContent = `
.grsch-modal-locale-toggle {
  display: inline-flex;
  gap: 2px;
  margin-right: 8px;
}
.grsch-modal-locale-btn {
  cursor: pointer;
  min-width: 26px;
  padding: 2px 7px;
  font-size: 0.9em;
  line-height: 1;
  border: 1px solid var(--grsch-menu-border);
  border-radius: 5px;
  background: var(--grsch-btn-bg-solid);
  color: var(--grsch-text);
}
.grsch-modal-locale-btn[aria-pressed="true"] {
  background: var(--grsch-accent);
  border-color: var(--grsch-accent-border);
  color: var(--grsch-accent-text);
}`;
  doc.head.appendChild(style);
}

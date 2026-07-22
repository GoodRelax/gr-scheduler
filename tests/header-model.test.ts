import { describe, expect, it } from 'vitest';
import {
  HEADER_BRANDING_ROLE,
  HEADER_CONTROL_ROLES,
  HEADER_ELEMENT_ROLES,
  HEADER_TITLE_ARIA_ROLE,
  HEADER_TITLE_PLACEHOLDER_LABEL_KEY,
  HEADER_TITLE_ROLE,
  LOAD_MENU_ITEMS,
  SAVE_MENU_ITEMS,
  THEME_BUTTON_SPECS,
  headerTitlePlaceholder,
  resolveHeaderTitleText,
  scheduleTitleAccessibleName,
  scheduleTitleEditHint,
} from '../src/app/header-model.js';
import { UI_LABELS, uiLabel } from '../src/domain/usecase/i18n.js';

/**
 * CR-003 Part 1 / CR-015 header order contract (TOOL-L1-008). `buildChrome` appends the
 * header action controls in HEADER_CONTROL_ROLES order via a role -> element lookup, so
 * this pure assertion of the constant is the single source of truth for the header
 * layout; the live DOM order is covered by the E2E header spec.
 */

describe('CR-015: header element order', () => {
  it('reads branding -> title -> Fit -> P -> SS -> Load -> Save -> themes -> Base V/I -> Undo/Redo -> AI -> ?', () => {
    expect([...HEADER_ELEMENT_ROLES]).toEqual([
      'app-branding',
      'schedule-name',
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
    ]);
  });

  it('places [Fit] and [P] AFTER the branding and the project title (CR-015 revises CR-006)', () => {
    const brandingIndex = HEADER_ELEMENT_ROLES.indexOf(HEADER_BRANDING_ROLE);
    const titleIndex = HEADER_ELEMENT_ROLES.indexOf(HEADER_TITLE_ROLE);
    const fitIndex = HEADER_ELEMENT_ROLES.indexOf('header-fit');
    const paletteIndex = HEADER_ELEMENT_ROLES.indexOf('header-palette-toggle');
    expect(brandingIndex).toBe(0);
    expect(titleIndex).toBe(1);
    expect(fitIndex).toBeGreaterThan(titleIndex);
    expect(paletteIndex).toBe(fitIndex + 1);
  });

  it('derives the control order from the element order, minus branding and title', () => {
    expect([...HEADER_CONTROL_ROLES]).toEqual(
      HEADER_ELEMENT_ROLES.filter(
        (role) => role !== HEADER_BRANDING_ROLE && role !== HEADER_TITLE_ROLE,
      ),
    );
    // [Fit] and [P] now open the action toolbar rather than sitting left of the brand.
    expect(HEADER_CONTROL_ROLES[0]).toBe('header-fit');
    expect(HEADER_CONTROL_ROLES[1]).toBe('header-palette-toggle');
    expect(HEADER_CONTROL_ROLES).not.toContain(HEADER_BRANDING_ROLE);
    expect(HEADER_CONTROL_ROLES).not.toContain(HEADER_TITLE_ROLE);
  });

  it('keeps the CR-003 Part 1 relative order of the pre-existing controls', () => {
    expect(HEADER_CONTROL_ROLES.slice(2)).toEqual([
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
    ]);
  });

  it('lists every role exactly once', () => {
    expect(new Set(HEADER_ELEMENT_ROLES).size).toBe(HEADER_ELEMENT_ROLES.length);
  });
});

describe('DEF-010: header title text comes from the document', () => {
  it('shows the document title, trimmed', () => {
    expect(resolveHeaderTitleText('Vehicle X program')).toBe('Vehicle X program');
    expect(resolveHeaderTitleText('  Vehicle X program  ')).toBe('Vehicle X program');
  });

  it('falls back to the single shared placeholder when the title is blank', () => {
    expect(resolveHeaderTitleText('')).toBe(headerTitlePlaceholder());
    expect(resolveHeaderTitleText('   ')).toBe(headerTitlePlaceholder());
  });

  it('never substitutes the product name for a missing title', () => {
    expect(headerTitlePlaceholder('en')).not.toBe('gr-scheduler');
    expect(headerTitlePlaceholder('ja')).not.toBe('gr-scheduler');
    // eslint-disable-next-line no-control-regex
    expect(/^[\x00-\x7F]*$/.test(headerTitlePlaceholder('en'))).toBe(true);
  });
});

describe('DEF-012: the blank-title placeholder is localized, from ONE definition', () => {
  it('resolves through the i18n layer and follows the active locale', () => {
    expect(resolveHeaderTitleText('', 'en')).toBe(headerTitlePlaceholder('en'));
    expect(resolveHeaderTitleText('', 'ja')).toBe(headerTitlePlaceholder('ja'));
    expect(headerTitlePlaceholder('ja')).not.toBe(headerTitlePlaceholder('en'));
  });

  it('keeps the strings in the shared UI label table (single source)', () => {
    const entry = UI_LABELS[HEADER_TITLE_PLACEHOLDER_LABEL_KEY];
    expect(entry).toBeDefined();
    expect(headerTitlePlaceholder('en')).toBe(entry?.en);
    expect(headerTitlePlaceholder('ja')).toBe(entry?.ja);
    // The i18n key itself stays an English ASCII identifier (PROP-L1-004).
    // eslint-disable-next-line no-control-regex
    expect(/^[\x00-\x7F]*$/.test(HEADER_TITLE_PLACEHOLDER_LABEL_KEY)).toBe(true);
  });

  it('never localizes a real title, only the blank fallback', () => {
    expect(resolveHeaderTitleText('Vehicle X program', 'ja')).toBe('Vehicle X program');
  });

  it('localizes the rename affordance announced on the title control', () => {
    expect(scheduleTitleEditHint('en')).toBe(uiLabel('schedule_title_edit_hint', 'en'));
    expect(scheduleTitleEditHint('ja')).not.toBe(scheduleTitleEditHint('en'));
    expect(scheduleTitleEditHint('en').length).toBeGreaterThan(0);
  });
});

describe('DEF-012: the title control announces a role and a name (WCAG 4.1.2)', () => {
  it('exposes an activatable ARIA role for the static title span', () => {
    expect(HEADER_TITLE_ARIA_ROLE).toBe('button');
  });

  it('names the control with the CURRENT project name plus the rename affordance', () => {
    const name = scheduleTitleAccessibleName('Vehicle X program', 'en');
    // WCAG 2.5.3: the visible text starts the accessible name.
    expect(name.startsWith('Vehicle X program')).toBe(true);
    expect(name).toContain(scheduleTitleEditHint('en'));
  });

  it('names an untitled document with the localized placeholder', () => {
    for (const locale of ['en', 'ja'] as const) {
      const titleText = resolveHeaderTitleText('', locale);
      expect(scheduleTitleAccessibleName(titleText, locale)).toContain(
        headerTitlePlaceholder(locale),
      );
    }
    expect(scheduleTitleAccessibleName(resolveHeaderTitleText('', 'ja'), 'ja')).not.toBe(
      scheduleTitleAccessibleName(resolveHeaderTitleText('', 'en'), 'en'),
    );
  });
});

describe('CR-003 Part 1: header menus and theme buttons', () => {

  it('lists the four theme modes in Light / Dark / Mono L / Mono D order', () => {
    expect(THEME_BUTTON_SPECS.map((spec) => spec.mode)).toEqual([
      'light',
      'dark',
      'mono-light',
      'mono-dark',
    ]);
    // Each theme button role appears in the header order between Save and Base V.
    for (const spec of THEME_BUTTON_SPECS) {
      expect(HEADER_CONTROL_ROLES).toContain(spec.role);
    }
  });

  it('offers Load as JSON / XML / JSON-as-baseline / New-clear', () => {
    expect(LOAD_MENU_ITEMS.map((item) => item.role)).toEqual([
      'load-json',
      'load-xml',
      'load-json-baseline',
      'new-clear',
    ]);
  });

  it('offers Save as JSON / XML / SVG / PNG (full-canvas export)', () => {
    expect(SAVE_MENU_ITEMS.map((item) => item.role)).toEqual([
      'save-json',
      'save-xml',
      'save-svg',
      'save-png',
    ]);
  });

  it('keeps every visible label and accessible name ASCII (item18 / GitHub-public)', () => {
    const strings = [
      ...LOAD_MENU_ITEMS,
      ...SAVE_MENU_ITEMS,
      ...THEME_BUTTON_SPECS,
    ].flatMap((spec) => [spec.label, spec.accessibleName]);
    for (const text of strings) {
      // eslint-disable-next-line no-control-regex
      expect(/^[\x00-\x7F]*$/.test(text)).toBe(true);
    }
  });
});

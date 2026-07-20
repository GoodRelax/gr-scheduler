import { describe, expect, it } from 'vitest';
import {
  HEADER_CONTROL_ROLES,
  LOAD_MENU_ITEMS,
  SAVE_MENU_ITEMS,
  THEME_BUTTON_SPECS,
} from '../src/app/header-model.js';

/**
 * CR-003 Part 1 header order contract (TOOL-L1-008). `buildChrome` appends the header
 * action controls in HEADER_CONTROL_ROLES order via a role -> element lookup, so this
 * pure assertion of the constant is the single source of truth for the header layout;
 * the live DOM order is covered by the E2E header spec.
 */

describe('CR-003 Part 1: header control order', () => {
  it('orders the header exactly per CR-003 (SS -> Load -> Save -> themes -> Base V/I -> Undo/Redo -> AI -> ?)', () => {
    expect([...HEADER_CONTROL_ROLES]).toEqual([
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

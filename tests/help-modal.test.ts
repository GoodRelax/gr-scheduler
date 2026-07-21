/**
 * Unit coverage for the Help modal's feature catalogue (SHELL batch item 2).
 *
 * The modal renders from a pure data model, so the catalogue is asserted here
 * without a DOM: it must comprehensively enumerate the app's features AND list the
 * real keyboard shortcuts that exist in the input layer. Every shortcut string must
 * be ASCII (a live-CSP / rendering hazard guard). The real opened-dialog DOM
 * behavior (role=dialog, Esc closes, focus returns) is asserted in
 * tests/e2e/shell-theme-batch.spec.ts.
 */

import { describe, expect, it } from 'vitest';
import {
  buildHelpModel,
  downloadAppLabel,
  HELP_MODAL_STYLESHEET,
  HELP_USAGE_HINT,
} from '../src/adapters/ui/help-modal.js';

const model = buildHelpModel();
const allFeatures = model.flatMap((section) => section.entries.map((entry) => entry.feature));
const allShortcuts = model.flatMap((section) =>
  section.entries.flatMap((entry) => (entry.shortcut === undefined ? [] : [entry.shortcut])),
);
const featureText = allFeatures.join(' | ').toLowerCase();

describe('buildHelpModel: comprehensive feature coverage', () => {
  it('organizes features into several titled sections', () => {
    expect(model.length).toBeGreaterThanOrEqual(5);
    for (const section of model) {
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.entries.length).toBeGreaterThan(0);
    }
  });

  it('mentions the palette tools, editing and overlays gathered from the codebase', () => {
    for (const needle of [
      'milestone',
      'task shape',
      'marquee',
      'dependency',
      'plan / actual',
      'gridline',
      'cursor guide',
      'fit ',
      'fullscreen',
      'fill_color',
      'icon_shape_kind',
      'sub-category',
      'watermark',
      'comment',
      'json',
      'xml',
      'svg',
      'import',
      'dark',
      'font size',
    ]) {
      expect(featureText, `missing feature mention: ${needle}`).toContain(needle);
    }
  });
});

describe('buildHelpModel: real keyboard shortcuts only', () => {
  it('documents the shortcuts that actually exist in the input layer', () => {
    const shortcutText = allShortcuts.join(' | ');
    for (const needle of [
      'Ctrl+A',
      'Ctrl+Z',
      'Ctrl+Y / Ctrl+Shift+Z',
      'Delete / Backspace',
      'Ctrl+C',
      'Ctrl+V',
      'Esc',
      'Wheel',
      'Ctrl / Shift / Alt + Wheel',
      'Ctrl + Drag',
      'D confirm / C cancel',
    ]) {
      expect(shortcutText, `missing shortcut: ${needle}`).toContain(needle);
    }
  });

  it('every shortcut string is ASCII (no NUL / control characters)', () => {
    for (const shortcut of [...allShortcuts, HELP_USAGE_HINT]) {
      const asciiClean = [...shortcut].every((character) => {
        const code = character.charCodeAt(0);
        return code >= 32 && code <= 126;
      });
      expect(asciiClean, `non-ASCII shortcut: ${shortcut}`).toBe(true);
    }
  });

  it('the usage hint (moved out of the header) covers create / zoom / pan', () => {
    const hint = HELP_USAGE_HINT.toLowerCase();
    expect(hint).toContain('arm a shape');
    expect(hint).toContain('zoom');
    expect(hint).toContain('pan');
  });
});

describe('HELP_MODAL_STYLESHEET: CR-011 one-screen fit invariants', () => {
  /** Read the value of a single-declaration CSS property inside a given selector block. */
  const readDeclaration = (selector: string, property: string): string | undefined => {
    const blockMatch = new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`).exec(
      HELP_MODAL_STYLESHEET,
    );
    const block = blockMatch?.[1];
    if (block === undefined) {
      return undefined;
    }
    const declMatch = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`).exec(block);
    return declMatch?.[1]?.trim();
  };

  it('Part 2: keeps a 3-column layout (never collapses columns to fit)', () => {
    expect(readDeclaration('.grsch-help-columns', 'column-count')).toBe('3');
  });

  it('Part 2 / narrow-breakpoint decision: no media query collapses the columns to 1 or 2', () => {
    // The 900px -> 2col and 620px -> 1col collapses were removed so 3 columns hold
    // at every desktop width; narrow fit is absorbed by the clamp() font floor instead.
    expect(HELP_MODAL_STYLESHEET).not.toMatch(/@media[^{]*\{[^}]*column-count\s*:\s*[12]\b/);
    expect(HELP_MODAL_STYLESHEET).not.toContain('column-count: 2');
    expect(HELP_MODAL_STYLESHEET).not.toContain('column-count: 1');
  });

  it('Part 1: does not use overflow: auto as the fitting mechanism', () => {
    // The scroll-to-fit design is gone; a non-triggering `hidden` clip is the only
    // overflow the dialog carries.
    expect(HELP_MODAL_STYLESHEET).not.toContain('overflow: auto');
    expect(readDeclaration('.grsch-help-dialog', 'overflow')).toBe('hidden');
  });

  it('Part 1: bounds the dialog height to the viewport so it never exceeds one screen', () => {
    const maxHeight = readDeclaration('.grsch-help-dialog', 'max-height');
    expect(maxHeight).toBeDefined();
    expect(maxHeight).toContain('100vh');
    // The old scroll trigger (a fractional vh that content spilled past) is gone.
    expect(maxHeight).not.toBe('92vh');
  });

  it('Part 3: widens the dialog toward the viewport (well beyond the old 85vw)', () => {
    const width = readDeclaration('.grsch-help-dialog', 'width');
    expect(width).toBeDefined();
    const widthVw = Number.parseFloat(String(width).replace('vw', ''));
    expect(String(width)).toContain('vw');
    expect(widthVw).toBeGreaterThanOrEqual(94);
    expect(widthVw).toBeGreaterThan(85);
  });

  it('Part 4: font shrink is a clamp() with a readable floor and a 13px ceiling', () => {
    const fontSize = readDeclaration('.grsch-help-dialog', 'font-size');
    expect(fontSize).toBeDefined();
    expect(String(fontSize)).toMatch(/^clamp\(/);
    const [floorRaw, , ceilingRaw] = String(fontSize)
      .replace(/^clamp\(/, '')
      .replace(/\)$/, '')
      .split(',')
      .map((part) => part.trim());
    const floorPx = Number.parseFloat(String(floorRaw).replace('px', ''));
    const ceilingPx = Number.parseFloat(String(ceilingRaw).replace('px', ''));
    // Readable floor (never smaller than ~11px) and the original 13px as the ceiling.
    expect(floorPx).toBeGreaterThanOrEqual(11);
    expect(floorPx).toBeLessThan(ceilingPx);
    expect(ceilingPx).toBe(13);
  });
});

describe('downloadAppLabel: CR-010 Download button label', () => {
  it('localizes the verb but keeps the product name GR Scheduler in both locales', () => {
    expect(downloadAppLabel('en')).toBe('Download GR Scheduler');
    expect(downloadAppLabel('ja')).toContain('GR Scheduler');
    expect(downloadAppLabel('ja')).not.toBe(downloadAppLabel('en'));
  });

  it('the English label is ASCII (live-CSP / rendering hazard guard)', () => {
    const asciiClean = [...downloadAppLabel('en')].every((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code <= 126;
    });
    expect(asciiClean).toBe(true);
  });
});

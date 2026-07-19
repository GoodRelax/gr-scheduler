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
import { buildHelpModel, HELP_USAGE_HINT } from '../src/adapters/ui/help-modal.js';

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

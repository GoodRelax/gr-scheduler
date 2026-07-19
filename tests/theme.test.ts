/**
 * Unit coverage for the light / dark theme layer (SHELL/THEME batch item 3).
 *
 * The theme module is pure enough to test against tiny DOM / storage / matchMedia
 * fakes: the resolver maps a preference to a concrete mode, apply flips the
 * `data-theme` attribute + `color-scheme`, the stylesheet declares the CSS
 * variables for both palettes plus the canvas element rules, and the persistence
 * round-trips through localStorage. Real rendered-DOM theming (computed background
 * changing, persistence across reload, axe AA in dark) is asserted in
 * tests/e2e/shell-theme-batch.spec.ts.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyThemePreference,
  installThemeStylesheet,
  isDarkBaseMode,
  isMonochromeMode,
  osPrefersDark,
  readStoredThemePreference,
  resolveThemeMode,
  THEME_MODES,
  THEME_PREFERENCE_STORAGE_KEY,
  toGrayscaleColor,
  writeStoredThemePreference,
} from '../src/app/theme.js';
import { generateTemplateDocument } from '../src/app/sample-data.js';
import {
  deserializeScheduleDocument,
  serializeScheduleDocument,
} from '../src/domain/usecase/json-codec.js';

interface FakeStyleElement {
  id: string;
  textContent: string;
}

/** A minimal document fake sufficient for installThemeStylesheet + applyTheme. */
function createFakeDocument(): {
  doc: Document;
  styles: FakeStyleElement[];
  root: { dataset: Record<string, string>; style: Record<string, string> };
} {
  const styles: FakeStyleElement[] = [];
  const root = { dataset: {} as Record<string, string>, style: {} as Record<string, string> };
  const head = {
    appendChild: (element: FakeStyleElement): FakeStyleElement => {
      styles.push(element);
      return element;
    },
  };
  const doc = {
    createElement: (_tag: string): FakeStyleElement => ({ id: '', textContent: '' }),
    getElementById: (id: string): FakeStyleElement | null =>
      styles.find((style) => style.id === id) ?? null,
    head,
    documentElement: root,
  } as unknown as Document;
  return { doc, styles, root };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('four theme modes', () => {
  it('exposes the four selectable modes in order', () => {
    expect([...THEME_MODES]).toEqual(['light', 'dark', 'mono-light', 'mono-dark']);
  });

  it('classifies monochrome and dark-based modes', () => {
    expect(isMonochromeMode('mono-light')).toBe(true);
    expect(isMonochromeMode('mono-dark')).toBe(true);
    expect(isMonochromeMode('light')).toBe(false);
    expect(isMonochromeMode('dark')).toBe(false);
    expect(isDarkBaseMode('dark')).toBe(true);
    expect(isDarkBaseMode('mono-dark')).toBe(true);
    expect(isDarkBaseMode('light')).toBe(false);
    expect(isDarkBaseMode('mono-light')).toBe(false);
  });
});

describe('toGrayscaleColor', () => {
  it('maps a hex color to an achromatic hex of equal luminance channels', () => {
    const gray = toGrayscaleColor('#009e73');
    expect(/^#([0-9a-f]{2})\1\1$/.test(gray)).toBe(true);
  });

  it('preserves alpha for rgba colors and makes the channels equal', () => {
    const gray = toGrayscaleColor('rgba(238, 241, 245, 0.55)');
    const match = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(gray);
    expect(match).not.toBeNull();
    expect(match![1]).toBe(match![2]);
    expect(match![2]).toBe(match![3]);
    expect(match![4]).toBe('0.55');
  });

  it('expands 3-digit hex and leaves unrecognized values unchanged', () => {
    expect(toGrayscaleColor('#fff')).toBe('#ffffff');
    expect(toGrayscaleColor('transparent')).toBe('transparent');
  });
});

describe('installThemeStylesheet', () => {
  it('installs one stylesheet declaring all palettes and the canvas rules (ASCII only)', () => {
    const { doc, styles } = createFakeDocument();
    installThemeStylesheet(doc);
    expect(styles).toHaveLength(1);
    const css = styles[0]!.textContent;
    // Light defaults + dark + the two monochrome override blocks.
    expect(css).toContain(':root {');
    expect(css).toContain('[data-theme="dark"]');
    expect(css).toContain('[data-theme="mono-light"]');
    expect(css).toContain('[data-theme="mono-dark"]');
    // Monochrome modes desaturate the whole schedule canvas.
    expect(css).toContain('filter: grayscale(1)');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    // Core canvas variables + the element rules that consume them.
    expect(css).toContain('--grsch-canvas-bg: #ffffff');
    expect(css).toContain('svg[data-role="schedule-canvas"] { background: var(--grsch-canvas-bg); }');
    expect(css).toContain('g[data-role="gridlines"] line { stroke: var(--grsch-grid-line); }');
    expect(css).toContain('text[data-role="date-ruler-label"] { fill: var(--grsch-ruler-text); }');
    // ASCII only: no NUL / stray control characters (only tab/newline/CR allowed),
    // guarding against the invisible-character class of live-CSP breakage.
    const asciiClean = [...css].every((character) => {
      const code = character.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126);
    });
    expect(asciiClean).toBe(true);
    expect(css.includes(String.fromCharCode(0))).toBe(false);
    // No NUL / control characters in the generated CSS (live-CSP hazard guard).
  });

  it('is idempotent: a second call does not add a second stylesheet', () => {
    const { doc, styles } = createFakeDocument();
    installThemeStylesheet(doc);
    installThemeStylesheet(doc);
    expect(styles).toHaveLength(1);
  });
});

describe('resolveThemeMode', () => {
  it('uses an explicit preference verbatim', () => {
    expect(resolveThemeMode('light')).toBe('light');
    expect(resolveThemeMode('dark')).toBe('dark');
    expect(resolveThemeMode('mono-light')).toBe('mono-light');
    expect(resolveThemeMode('mono-dark')).toBe('mono-dark');
  });

  it('follows the OS preference for "system"', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('dark') }));
    expect(resolveThemeMode('system')).toBe('dark');
    vi.stubGlobal('matchMedia', (_query: string) => ({ matches: false }));
    expect(resolveThemeMode('system')).toBe('light');
  });

  it('osPrefersDark is false when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(osPrefersDark()).toBe(false);
    expect(resolveThemeMode('system')).toBe('light');
  });
});

describe('applyThemePreference', () => {
  it('pins data-theme + color-scheme for an explicit dark choice', () => {
    const { doc, root } = createFakeDocument();
    const mode = applyThemePreference(doc, 'dark');
    expect(mode).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
    expect(root.style.colorScheme).toBe('dark');
  });

  it('removes data-theme for "system" so prefers-color-scheme drives it', () => {
    const { doc, root } = createFakeDocument();
    vi.stubGlobal('matchMedia', (_query: string) => ({ matches: false }));
    root.dataset.theme = 'dark';
    const mode = applyThemePreference(doc, 'system');
    expect(mode).toBe('light');
    expect('theme' in root.dataset).toBe(false);
    expect(root.style.colorScheme).toBe('light');
  });

  it('pins the mono-dark attribute and a dark color-scheme', () => {
    const { doc, root } = createFakeDocument();
    const mode = applyThemePreference(doc, 'mono-dark');
    expect(mode).toBe('mono-dark');
    expect(root.dataset.theme).toBe('mono-dark');
    expect(root.style.colorScheme).toBe('dark');
  });

  it('pins the mono-light attribute and a light color-scheme', () => {
    const { doc, root } = createFakeDocument();
    const mode = applyThemePreference(doc, 'mono-light');
    expect(mode).toBe('mono-light');
    expect(root.dataset.theme).toBe('mono-light');
    expect(root.style.colorScheme).toBe('light');
  });
});

describe('theme preference persistence', () => {
  it('round-trips a stored preference and defaults to "system"', () => {
    const backing = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => backing.set(key, value),
    });
    expect(readStoredThemePreference()).toBe('system');
    writeStoredThemePreference('dark');
    expect(backing.get(THEME_PREFERENCE_STORAGE_KEY)).toBe('dark');
    expect(readStoredThemePreference()).toBe('dark');
  });

  it('falls back to "system" on an invalid stored value', () => {
    vi.stubGlobal('localStorage', {
      getItem: (_key: string) => 'chartreuse',
      setItem: (_key: string, _value: string) => undefined,
    });
    expect(readStoredThemePreference()).toBe('system');
  });
});

describe('theme preference persistence accepts the mono modes', () => {
  it('round-trips mono-light / mono-dark through localStorage', () => {
    const backing = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => backing.set(key, value),
    });
    writeStoredThemePreference('mono-light');
    expect(readStoredThemePreference()).toBe('mono-light');
    writeStoredThemePreference('mono-dark');
    expect(readStoredThemePreference()).toBe('mono-dark');
  });
});

describe('themePreference round-trips through the JSON codec', () => {
  for (const preference of ['light', 'dark', 'mono-light', 'mono-dark', 'system'] as const) {
    it(`preserves themePreference = ${preference} on export/import`, () => {
      const base = generateTemplateDocument();
      const document = {
        ...base,
        viewState: { ...base.viewState, themePreference: preference },
      };
      const restored = deserializeScheduleDocument(serializeScheduleDocument(document));
      expect(restored.viewState.themePreference).toBe(preference);
    });
  }
});

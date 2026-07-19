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
  osPrefersDark,
  readStoredThemePreference,
  resolveThemeMode,
  THEME_PREFERENCE_STORAGE_KEY,
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

describe('installThemeStylesheet', () => {
  it('installs one stylesheet declaring both palettes and the canvas rules (ASCII only)', () => {
    const { doc, styles } = createFakeDocument();
    installThemeStylesheet(doc);
    expect(styles).toHaveLength(1);
    const css = styles[0]!.textContent;
    // Light defaults + a dark override block.
    expect(css).toContain(':root {');
    expect(css).toContain('[data-theme="dark"]');
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

describe('themePreference round-trips through the JSON codec', () => {
  for (const preference of ['light', 'dark', 'system'] as const) {
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

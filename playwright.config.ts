import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for the automated accessibility end-to-end spec
 * (WCAG 2.1 AA via axe-core). The spec navigates to the built single-file
 * `dist/index.html`, so run `npm run build` first. It is kept out of the Vitest
 * run (see vitest.config.ts) and executed with `npm run test:e2e`.
 *
 * If Chromium is not installed (`npx playwright install chromium` unavailable in
 * the environment), the spec self-skips its assertions; run it where a browser is
 * present (CI or a developer machine) to exercise the full axe scan.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    // The app is a self-contained offline file; no base URL / server is needed.
    headless: true,
  },
});

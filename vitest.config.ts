import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration. Unit/integration specs are the `tests/**\/*.test.ts`
 * files and run in the Node environment (the domain layer is DOM-free; the few
 * DOM-touching tests stub what they need). The Playwright + axe-core end-to-end
 * accessibility spec lives under `tests/e2e/*.spec.ts` and is deliberately
 * EXCLUDED here so `npm run test` never tries to load Playwright; it is run
 * separately via `npm run test:e2e`.
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    environment: 'node',
  },
});

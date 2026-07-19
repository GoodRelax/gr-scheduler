import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * ESLint flat configuration for gr-scheduler.
 *
 * Rules are kept reasonable for an M1 walking skeleton. `no-console` is a
 * warning because the codebase routes all diagnostics through the namespaced
 * dev logger (src/app/logger.ts); the logger itself is the single sanctioned
 * console boundary and is annotated with an eslint-disable there.
 */
export default tseslint.config(
  {
    // dist/coverage are build artifacts; tools/ and setup.js are pre-existing
    // repository utility scripts, not part of the M1 application source.
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'playwright-report/**',
      // The e2e a11y spec depends on the optional @axe-core/playwright dev dep,
      // which may not be installed in every environment; it is run via Playwright
      // (npm run test:e2e), not linted here.
      'tests/e2e/**',
      'tools/**',
      'setup.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-console': 'warn',
      // TypeScript's own checker reports undefined identifiers; the ESLint
      // no-undef rule lacks type information and false-positives on DOM/Node
      // globals, so it is disabled per typescript-eslint guidance.
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
);

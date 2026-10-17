// Perf-only Playwright config for a git-archive copy: runs only the NFR-002/003 frame-time file
// against this copy's dist/index.html (the test reads process.cwd()/dist). No dev server.
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests',
  testMatch: ['nfr/nfr-002-003-frame-time-is-the-interval.test.ts'],
  workers: 1,
  reporter: 'line',
})

import { defineConfig } from 'vitest/config'

// Chapter 1.4 puts the layers that are decided by values alone under Vitest.
//
// The location of test code is NOT decided here: Chapter 5.3 says "the place
// for test code is held by Chapter 7", and Chapter 7 is still an empty frame.
// Vitest's own default globs are left in place until it is written, so this
// file installs the tool without deciding the layout.
export default defineConfig({
  test: {
    environment: 'node',
  },
})

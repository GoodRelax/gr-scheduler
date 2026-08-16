import { defineConfig } from 'vite'

// Chapter 5.3 forbids a main.ts: the entry is the shell itself
// (`src/framework/single-html-shell/single-html-shell.ts`, table T-062 CP-25),
// which index.html loads.
//
// The single .html deliverable (FR-067, table T-024 IO-7) is NOT wired here
// yet. Folding the built JS and CSS into one file is the shell's own concern
// and Chapter 6.1 has not been written, so nothing is decided in advance.
export default defineConfig({
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
})

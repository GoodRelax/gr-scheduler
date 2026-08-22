import { defineConfig } from 'vite'

// Chapter 5.3 forbids a main.ts: the entry is the shell itself
// (`src/framework/single-html-shell/single-html-shell.ts`, table T-062 CP-25),
// which index.html loads.
//
// The single .html deliverable (FR-067, table T-024 IO-7) is NOT wired here
// yet. Folding the built JS and CSS into one file is the shell's own concern
// and Chapter 6.1 has not been written, so nothing is decided in advance.
// ⚠️ The dev server takes its port from the PORT environment variable when one
// is set, because the tooling that launches it assigns a free port that way and
// then looks for the server THERE. Vite does not read PORT on its own, so
// without this line the assigned port and the listening port drift apart and
// the preview points at nothing.
// ⛔ `strictPort` is on ONLY when a port was assigned: an assigned port that is
// already taken has to fail loudly rather than let Vite pick the next one, which
// would drift again. Started by hand with no PORT, Vite keeps its own default
// behaviour of stepping to the next free port.
const assignedPort = Number(process.env.PORT)
const hasAssignedPort = Number.isInteger(assignedPort) && assignedPort > 0

export default defineConfig({
  server: {
    port: hasAssignedPort ? assignedPort : 5173,
    strictPort: hasAssignedPort,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
})

import { existsSync, readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'

// The relay's own build (FR-150, AG-12 (1); docs/spec/_assets/design-mcp-relay.md
// section 6): ONE ESM file for Node that carries the single .html built by
// `npm run build` inside itself and imports nothing but node: built-ins.
// Run it through `npm run build:relay`, which then packs the .mcpb
// (tools/build_relay_bundle.mjs).
//
// The process entry (stdin / stdout / stderr, exit when stdin ends) is a
// virtual module here, so no file under src/ exists for it: table T-075 has no
// unit for an entry, and McpRelayServer (UF-187) takes its streams as options.
// The page bytes are inlined at build time as base64, so the relay reads
// nothing from disk when it runs.

const PAGE_HTML_PATH = 'dist/index.html'
const OUTPUT_FILE_NAME = 'grs-relay.mjs'
const ENTRY_ID = 'virtual:grs-relay-entry'
const PAGE_HTML_ID = 'virtual:grs-relay-page-html'
const RESOLVED_PREFIX = '\0'
const RELAY_SERVER_MODULE = '/src/framework/mcp-relay-server/mcp-relay-server.ts'
// Node 18 is the oldest runtime the bundle declares (manifest.json compatibility).
const NODE_TARGET = 'node18'

const ENTRY_SOURCE = `
import { startMcpRelay } from ${JSON.stringify(RELAY_SERVER_MODULE)}
import pageHtmlBase64 from ${JSON.stringify(PAGE_HTML_ID)}

const relay = await startMcpRelay({
  input: process.stdin,
  output: process.stdout,
  log: (line) => process.stderr.write(line + '\\n'),
  pageHtml: Buffer.from(pageHtmlBase64, 'base64'),
})
let stopping = false
const stop = () => {
  if (stopping) return
  stopping = true
  relay.close().finally(() => process.exit(0))
}
process.stdin.on('end', stop)
process.stdin.on('close', stop)
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
if (process.stdin.readableEnded) stop()
`

function relayEntry(): Plugin {
  return {
    name: 'grs-relay-entry',
    enforce: 'pre',
    resolveId(id) {
      return id === ENTRY_ID || id === PAGE_HTML_ID ? RESOLVED_PREFIX + id : null
    },
    load(id) {
      if (id === RESOLVED_PREFIX + ENTRY_ID) return ENTRY_SOURCE
      if (id !== RESOLVED_PREFIX + PAGE_HTML_ID) return null
      if (!existsSync(PAGE_HTML_PATH)) {
        this.error(`${PAGE_HTML_PATH} is missing -- run \`npm run build\` before \`npm run build:relay\``)
      }
      const pageHtml = readFileSync(PAGE_HTML_PATH)
      return `export default ${JSON.stringify(pageHtml.toString('base64'))}`
    },
  }
}

const packageVersion = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version

export default defineConfig({
  plugins: [relayEntry()],
  publicDir: false,
  define: { __GRS_RELAY_VERSION__: JSON.stringify(packageVersion) },
  ssr: { noExternal: true, target: 'node' },
  build: {
    ssr: true,
    target: NODE_TARGET,
    // WHY: not dist/ -- dist/ holds the one .html the app is (CN-1, NFR-004).
    outDir: 'dist-relay',
    emptyOutDir: true,
    copyPublicDir: false,
    minify: false,
    rollupOptions: {
      input: ENTRY_ID,
      output: { format: 'es', entryFileNames: OUTPUT_FILE_NAME },
    },
  },
})

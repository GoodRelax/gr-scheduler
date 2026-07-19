import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Compute the base64 SHA-256 of a string using the Web Crypto API (available as a
 * global in the Node build runtime and typed by the DOM lib), avoiding a hard
 * `@types/node` dependency for this build-only config.
 */
async function sha256Base64(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  let binary = '';
  for (const byte of new Uint8Array(digest)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Strict Content-Security-Policy directives for the single-HTML build
 * (security-design §4 / C-12, M5a review M-2). `script-src` is filled in at build
 * time with the SHA-256 of the one inlined script so `'unsafe-inline'` is avoided
 * for scripts (C-13).
 *
 * The non-negotiable exfiltration controls are `connect-src 'none'` (no
 * fetch/XHR/WebSocket/Beacon can leave the page even under a hypothetical XSS),
 * `object-src 'none'`, `base-uri 'none'` and `form-action 'none'`.
 * `style-src 'unsafe-inline'` is retained because vite-plugin-singlefile inlines
 * CSS and the UI sets element styles dynamically; style injection cannot execute
 * script and is contained by `connect-src 'none'` (residual noted in the report).
 * `img-src data:` allows embedded base64 PNG/SVG image data URIs.
 */
function buildCspContent(scriptSources: readonly string[]): string {
  const scriptSrc = scriptSources.length > 0 ? scriptSources.join(' ') : "'none'";
  return [
    "default-src 'none'",
    `script-src ${scriptSrc}`,
    "style-src 'unsafe-inline'",
    'img-src data:',
    "connect-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/**
 * Post-build plugin that hashes the inlined script(s) of the single-file HTML and
 * injects a strict CSP `<meta>` (C-12/C-13). Runs after vite-plugin-singlefile so
 * the scripts are already inlined and their hashes are stable.
 */
function injectStrictCsp(): Plugin {
  return {
    name: 'grsch-inject-strict-csp',
    enforce: 'post',
    async generateBundle(_options, bundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type !== 'asset' || !asset.fileName.endsWith('.html')) {
          continue;
        }
        const html =
          typeof asset.source === 'string'
            ? asset.source
            : new TextDecoder().decode(asset.source);

        const scriptHashes: string[] = [];
        const scriptPattern = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
        let match: RegExpExecArray | null;
        while ((match = scriptPattern.exec(html)) !== null) {
          const body = match[1] ?? '';
          if (body.length === 0) {
            continue;
          }
          scriptHashes.push(`'sha256-${await sha256Base64(body)}'`);
        }

        const meta = `<meta http-equiv="Content-Security-Policy" content="${buildCspContent(
          scriptHashes,
        )}" />`;
        asset.source = html.replace(/<head>/i, `<head>\n    ${meta}`);
      }
    },
  };
}

/**
 * Vite configuration for gr-scheduler.
 *
 * The build uses vite-plugin-singlefile so that `npm run build` emits ONE
 * self-contained `dist/index.html` with all JS/CSS inlined and no external or
 * local asset references (NFR-L1-001, ADR-003). The strict-CSP plugin then adds a
 * hash-based Content-Security-Policy meta (security-design §4, C-12/C-13).
 */
export default defineConfig({
  plugins: [viteSingleFile(), injectStrictCsp()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    reportCompressedSize: false,
  },
});

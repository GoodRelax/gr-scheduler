// Write the build's version into the published download page (CR-799, design-mcp-relay.md section 6).
//
//     node tools/stamp_download_page.mjs _site/download/index.html
//
// The page's source (docs/download/index.html) holds a placeholder in every
// <span data-built-at> and <span data-relay-version>; this fills them with the relay's version
// (tools/relay_version.mjs; the rule is docs/development-rules/10-versions.md), the same values
// the bundle's manifest.json carries. Only the copy being published is changed, never docs/.
// The spans are text, not a style or a script, so the page's Content Security Policy hashes
// stay valid.

import { readFileSync, writeFileSync } from 'node:fs'
import { buildVersion } from './relay_version.mjs'

const SLOTS = [
  { attribute: 'data-built-at', key: 'builtAt' },
  { attribute: 'data-relay-version', key: 'semver' },
]

function fail(message) {
  process.stderr.write(`stamp_download_page: ${message}\n`)
  process.exit(1)
}

/** @purity pure */
export function stampedPage(html, version) {
  let out = html
  for (const { attribute, key } of SLOTS) {
    const slot = new RegExp(`(<span ${attribute}>)[^<]*(</span>)`, 'g')
    if (!slot.test(out)) throw new Error(`the page holds no <span ${attribute}>`)
    out = out.replace(slot, `$1${version[key]}$2`)
  }
  return out
}

function main() {
  const [path] = process.argv.slice(2)
  if (!path) fail('name the page to stamp, e.g. _site/download/index.html')
  const version = buildVersion()
  try {
    writeFileSync(path, stampedPage(readFileSync(path, 'utf8'), version))
  } catch (error) {
    fail(String(error))
  }
  process.stdout.write(`stamped ${path} with ${version.builtAt} (${version.semver})\n`)
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/stamp_download_page.mjs')) main()

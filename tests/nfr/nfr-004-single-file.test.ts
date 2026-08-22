/**
 * NFR-004 -- one file, and nothing fetched from outside it.
 *
 * Place and tool come from table T-218 of Chapter 7
 * (`docs/spec/05-07-design.md`), row `TS-4`: the systematic kind whose parent
 * is `NFR-xxx` lives in `tests/nfr/` and is driven by Playwright. That table
 * carries a MUST that test code sit only in the places it names, so this file
 * may not be moved elsewhere.
 *
 * What is being judged
 * --------------------
 *   `NFR-004`  the deliverable is one `.html`; at run time it neither talks to
 *              anything outside nor holds a resource fetched from outside.
 *              Its RATIONALE adds the MUST that the judgment be made **with
 *              the file opened directly** -- there are shapes that only fall
 *              over that way, from the combination of a content security
 *              policy and a single file.
 *   `CN-1`     table T-003: one `.html`, no server, works cut off from the
 *              network.
 *   `CN-6`     table T-003: no traffic out at run time, no resource fetched
 *              from outside.
 *   `CN-8`     table T-003: a content security policy over the single HTML;
 *              `img-src` is `data:`. A policy that refuses something under
 *              `file://` shows up as a console refusal, so this file watches
 *              for one.
 *   `NFR-011`  the first frame is drawn whole; nothing blank, nothing missing.
 *              Used here only as the definition of "the application came up".
 *   `LM-14`    table T-004: under `file://`, overwrite-save and autosave may
 *              not work, and `LM-14` **excludes** those -- plus the values
 *              kept in `localStorage` -- from the "all functions work"
 *              judgment of `CN-1` / `NFR-004`. So the console filter below
 *              drops exactly those complaints and nothing else.
 *
 * Scope: this file judges the deliverable **as a file**, plus the fact that it
 * comes up when opened directly. The operation-by-operation denominator that
 * the RATIONALE names (tables T-023a..d, T-023, T-036 and the export formats
 * of table T-024) is not covered here.
 *
 * These tests do not use `baseURL`. The deliverable is a file on disk, so
 * every navigation below is an absolute `file://` URL and the dev server
 * declared in `playwright.config.ts` plays no part.
 */
import { test, expect } from '@playwright/test'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url))
const DIST_DIR = join(REPO_ROOT, 'dist')

/**
 * What `npm run build` reads. Only the modification times of these are
 * looked at -- no file under `src/` is ever opened by this test, because the
 * expectations here must come from the specification and not from the code
 * under test (`docs/development-rules/04-verification.md` section 1).
 */
const BUILD_INPUTS = [
  'src',
  'index.html',
  'vite.config.ts',
  'package.json',
  'package-lock.json',
]

/**
 * URI strings that name something rather than locate it. A browser never
 * dereferences any of these, so their presence is not "a resource fetched from
 * outside the file" in the sense of `CN-6`.
 *
 * ### The judgment call about `http://www.w3.org/2000/svg`
 *
 * It is an XML namespace *name*. Nothing resolves it: `createElementNS` and
 * the `xmlns` attribute compare it as an opaque string, and no request is ever
 * issued for it. `IF-1` of table T-065 has `SvgRenderer` build an SVG string
 * that `DomSvgSurface` puts on screen, so this string is guaranteed to be in
 * the deliverable and would otherwise make the scan below permanently red for
 * something that is not a violation.
 *
 * It is exempted **by exact string**, and only from the raw-text scan. Two
 * things stop that exemption from becoming a hole:
 *   - the attribute scan (the test above it) resolves every URL-bearing
 *     attribute and CSS `url()` independently, so putting this same string
 *     into `src=` or `href=` would still be caught there;
 *   - the `file://` run asserts that **zero** requests leave the file, so even
 *     a fetch of this exact URL from script would go red.
 * The exemption therefore covers the one thing it names -- a namespace
 * declaration -- and nothing else. Any other absolute URL is a failure.
 *
 * A new entry may only be added here when it can be shown that nothing
 * dereferences it. Each one below carries the reason it qualifies.
 */
const NON_DEREFERENCED_URI_IDENTIFIERS = [
  // XML namespace names. Compared as opaque strings, never fetched.
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1999/xlink',
  'http://www.w3.org/1999/xhtml',
  // MSPDI target namespace and its schema location. `docs/reference/mspdi/
  // mspdi_pj12.xsd:21`; the schema URL is the one `docs/spec/05-07-design.md`
  // line 900 names as the authority. An XML writer emits these as text.
  'http://schemas.microsoft.com/project/2007',
  'https://schemas.microsoft.com/project/2007/mspdi_pj12.xsd',
  // JSON Schema dialect and `$id` of the generated GRS JSON schema
  // (`docs/spec/_source/grs-document.schema.json` lines 2-3). A validator
  // resolves `$ref` against `$id` locally; neither is retrieved.
  'https://json-schema.org/draft/2020-12/schema',
  'https://github.com/GoodRelax/gr-scheduler/docs/spec/_source/grs-document.schema.json',
]

/**
 * Console complaints that `LM-14` takes out of the judgment: overwrite-save,
 * autosave, and the values whose home is `localStorage`. Under `file://` the
 * browser may refuse the storage area and may not keep the file permission, and
 * `LM-14` says that is not a failure of `NFR-004`.
 *
 * Deliberately narrow. A content security policy refusal is checked before
 * this filter runs, so nothing here can hide one.
 */
const LM_14_EXCLUDED = [
  /localstorage/i,
  /access to storage is not allowed/i,
  /storage is (?:not allowed|disabled)/i,
  /file system access/i,
  /show(?:Save|Open|Directory)(?:File)?Picker/i,
]

/** URL schemes that stay inside the document. Everything else leaves it. */
const IN_FILE_SCHEMES = /^(?:data|blob|about|javascript):/i

/** http(s), websocket and ftp URLs anywhere in the text of the deliverable. */
const ABSOLUTE_URL = /(?:https?|wss?|ftps?):\/\/[^\s"'`<>()\\\][{}]+/gi

type UrlUse = { where: string; value: string }

let deliverable = ''
let deliverableUrl = ''
let distFiles: string[] = []

function walkFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkFiles(full))
    else out.push(full)
  }
  return out
}

function mtimes(paths: string[]): number[] {
  return paths.map((p) => statSync(p).mtimeMs)
}

/**
 * Guarantee `dist/` matches the sources before anything is asserted about it.
 * `docs/development-rules/04-verification.md` section 2: a test that passes
 * because it looked at a stale artifact has proved nothing.
 *
 * The build is skipped only when every file in `dist/` is already newer than
 * every build input, which is the one case where a rebuild could not change
 * the answer. There is no environment switch to skip it.
 */
function buildUnlessAlreadyCurrent(): void {
  const inputs: string[] = []
  for (const name of BUILD_INPUTS) {
    const full = join(REPO_ROOT, name)
    if (!existsSync(full)) continue
    if (statSync(full).isDirectory()) inputs.push(...walkFiles(full))
    else inputs.push(full)
  }
  const existing = existsSync(DIST_DIR) ? walkFiles(DIST_DIR) : []
  const newestInput = inputs.length > 0 ? Math.max(...mtimes(inputs)) : Infinity
  const oldestOutput = existing.length > 0 ? Math.min(...mtimes(existing)) : -Infinity
  if (existing.length === 0 || newestInput > oldestOutput) {
    execSync('npm run build', { cwd: REPO_ROOT, stdio: 'pipe' })
  }
}

test.beforeAll(() => {
  test.setTimeout(240_000)
  buildUnlessAlreadyCurrent()
  expect(existsSync(DIST_DIR), 'npm run build produced no dist/ directory').toBe(true)
  distFiles = walkFiles(DIST_DIR).sort()
  const html = distFiles.filter((p) => p.toLowerCase().endsWith('.html'))
  expect(html.length, `dist/ holds no .html: ${distFiles.map((p) => relative(DIST_DIR, p)).join(', ')}`).toBeGreaterThan(0)
  deliverable = readFileSync(html[0] as string, 'utf8')
  deliverableUrl = pathToFileURL(html[0] as string).href
})

test('NFR-004 / CN-1: given a fresh production build, when dist is listed, then it holds exactly one file and that file is .html', () => {
  const listed = distFiles.map((p) => relative(DIST_DIR, p).replace(/\\/g, '/'))
  expect(listed, `CN-1 says the deliverable is one .html; dist/ holds ${listed.length}`).toHaveLength(1)
  expect(listed[0]).toMatch(/\.html$/i)
})

test('NFR-004 / CN-6: given the built deliverable, when every URL-bearing attribute and CSS url() is resolved, then none of them points off the file', async ({ page }) => {
  // Parsed with DOMParser rather than navigated to: it builds the tree without
  // running a script or retrieving a single sub-resource, so this stays a
  // reading of the file's text and cannot be confused with the run below.
  const uses = await page.evaluate((html: string): UrlUse[] => {
    const cssUrls = (css: string): string[] => {
      const found: string[] = []
      const urlRe = /url\(\s*(['"]?)([^'")]*)\1\s*\)/gi
      const importRe = /@import\s+(?:url\(\s*(['"]?)([^'")]*)\1\s*\)|(['"])([^'"]*)\3)/gi
      let m: RegExpExecArray | null
      while ((m = urlRe.exec(css)) !== null) found.push((m[2] ?? '').trim())
      while ((m = importRe.exec(css)) !== null) found.push((m[2] ?? m[4] ?? '').trim())
      return found.filter((v) => v !== '')
    }
    const URL_ATTRS = [
      'src', 'srcset', 'imagesrcset', 'href', 'xlink:href', 'data', 'poster',
      'action', 'formaction', 'manifest', 'background', 'cite', 'ping',
      'archive', 'codebase', 'longdesc', 'usemap', 'profile',
    ]
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const out: UrlUse[] = []
    const push = (where: string, value: string): void => {
      const v = value.trim()
      if (v !== '') out.push({ where, value: v })
    }
    for (const el of Array.from(doc.querySelectorAll('*'))) {
      const tag = el.tagName.toLowerCase()
      for (const name of URL_ATTRS) {
        const v = el.getAttribute(name)
        if (v === null) continue
        if (name === 'srcset' || name === 'imagesrcset') {
          for (const part of v.split(',')) push(`<${tag} ${name}>`, part.trim().split(/\s+/)[0] ?? '')
        } else {
          push(`<${tag} ${name}>`, v)
        }
      }
      if (tag === 'meta' && (el.getAttribute('http-equiv') ?? '').toLowerCase() === 'refresh') {
        const m = /url\s*=\s*(.+)$/i.exec(el.getAttribute('content') ?? '')
        if (m) push('<meta http-equiv=refresh>', (m[1] ?? '').replace(/^['"]|['"]$/g, ''))
      }
      const style = el.getAttribute('style')
      if (style !== null) for (const u of cssUrls(style)) push(`<${tag} style>`, u)
      if (tag === 'style') for (const u of cssUrls(el.textContent ?? '')) push('<style>', u)
    }
    return out
  }, deliverable)

  const offFile = uses.filter(({ value }) => {
    if (value.startsWith('#')) return false
    if (IN_FILE_SCHEMES.test(value)) return false
    // Anything left is either an absolute URL, a scheme-relative `//host`, or
    // a relative path -- and a relative path means a second file, which CN-1
    // already forbids.
    return true
  })
  expect(
    offFile.map((u) => `${u.where} ${u.value}`),
    'CN-6: no reference in the deliverable may fetch a resource from outside it',
  ).toEqual([])
})

test('NFR-004 / CN-6: given the built deliverable, when its raw text is scanned for absolute URLs, then only non-dereferenced namespace identifiers remain', () => {
  const seen = new Set<string>()
  for (const match of deliverable.matchAll(ABSOLUTE_URL)) {
    seen.add(match[0].replace(/[.,;:'")\]]+$/, ''))
  }
  const external = [...seen]
    .filter((url) => !NON_DEREFERENCED_URI_IDENTIFIERS.includes(url))
    .sort()
  expect(
    external,
    'CN-6: an absolute URL that is not one of the declared identifiers means the deliverable points outside itself',
  ).toEqual([])
  // Guard the exemption itself: if the SVG namespace ever stops appearing, the
  // list above has become dead weight and the reasoning in its comment no
  // longer describes this deliverable.
  expect(
    seen.has('http://www.w3.org/2000/svg'),
    'IF-1 of table T-065 puts an SVG surface on screen, so its namespace name should be present',
  ).toBe(true)
})

test('NFR-004 (judged from file://) / CN-6: given the deliverable opened as file://, when it has finished loading, then no request left the file and none failed', async ({ page }) => {
  const requested: string[] = []
  const failed: string[] = []
  page.on('request', (r) => requested.push(r.url()))
  page.on('requestfailed', (r) => failed.push(`${r.url()} :: ${r.failure()?.errorText ?? 'unknown'}`))

  await page.goto(deliverableUrl, { waitUntil: 'load' })
  await page.waitForLoadState('networkidle')

  const offFile = requested.filter((u) => u !== deliverableUrl && !IN_FILE_SCHEMES.test(u))
  expect(offFile, 'CN-6: opening the deliverable must not request anything but itself').toEqual([])
  expect(failed, 'a failed request means something was reached for and was not there').toEqual([])
})

test('NFR-004 (judged from file://) / NFR-011 / CN-8: given the deliverable opened as file://, when the first frame is drawn, then the application is up with no page error and no CSP refusal (LM-14 exclusions applied)', async ({ page }) => {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.goto(deliverableUrl, { waitUntil: 'load' })

  // "Came up" in the sense of BO-5 of table T-077 (the first frame is put out)
  // and NFR-011 (nothing blank): the SVG surface of IF-1 is on screen.
  await expect(page.locator('svg').first()).toBeAttached({ timeout: 15_000 })
  const painted = await page.evaluate(() => document.body.querySelectorAll('*').length)
  expect(painted, 'NFR-011: the first frame must not be a blank page').toBeGreaterThan(0)

  // Checked before the LM-14 filter, so no exclusion can swallow one. CN-8 puts
  // a content security policy over the single HTML, and NFR-004's RATIONALE
  // warns that the failure mode shows up only when the file is opened directly.
  const refusals = [...consoleErrors, ...pageErrors].filter((t) =>
    /content security policy|refused to (?:load|execute|apply|connect|frame)/i.test(t))
  expect(refusals, 'CN-8: the policy refused something when the file was opened directly').toEqual([])

  const keep = (t: string): boolean => !LM_14_EXCLUDED.some((re) => re.test(t))
  expect(pageErrors.filter(keep), 'an uncaught error means the application did not come up').toEqual([])
  expect(consoleErrors.filter(keep), 'console errors outside what LM-14 excludes').toEqual([])
})

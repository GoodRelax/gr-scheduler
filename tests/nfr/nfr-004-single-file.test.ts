// NFR-004 / CN-1 / CN-6 / CN-8 / NFR-011 / LM-14: the single-file deliverable, judged from file://, fetches nothing external.
import { test, expect } from '@playwright/test'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { DOWNLOAD_ADDRESS } from '../fixtures/download-address'

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url))
const DIST_DIR = join(REPO_ROOT, 'dist')

const BUILD_INPUTS = [
  'src',
  'index.html',
  'vite.config.ts',
  'package.json',
  'package-lock.json',
]

// TRAP: an entry here silences the URL scan below; add one only when nothing
// ever dereferences it, or an external fetch passes unnoticed.
const NON_DEREFERENCED_URI_IDENTIFIERS = [
  'http://www.apache.org/licenses/',
  'http://www.apache.org/licenses/LICENSE-2.0',
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1999/xlink',
  'http://www.w3.org/1999/xhtml',
  'http://schemas.microsoft.com/project/2007',
  'https://schemas.microsoft.com/project/2007/mspdi_pj12.xsd',
  'https://json-schema.org/draft/2020-12/schema',
  'https://github.com/GoodRelax/gr-scheduler/docs/spec/_source/grs-document.schema.json',
]

// see CN-6, FR-073
// WHY: not copied as a literal -- FR-073 (MUST NOT) forbids writing S-350
// into code, and DOWNLOAD_ADDRESS already reads it from the manuscript.
const LINK_PRESSED_BY_A_PERSON = DOWNLOAD_ADDRESS

// WHY: a minified call sits next to its string argument, so this window
// catches fetch(...), xhr.open(...), import(...), importScripts(...).
const LOADER_CALL_WINDOW = 40

function loaderCallsAddress(text: string, address: string): boolean {
  const escaped = address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(
    `(?:\\bfetch|\\.open|\\bimport|\\bimportScripts)\\s*\\([^)]{0,${String(LOADER_CALL_WINDOW)}}['"\`]${escaped}['"\`]`,
  )
  return pattern.test(text)
}

// TRAP: widening this list beyond LM-14's exclusions would hide a real
// console error as though it were an LM-14 storage complaint.
const LM_14_EXCLUDED = [
  /localstorage/i,
  /access to storage is not allowed/i,
  /storage is (?:not allowed|disabled)/i,
  /file system access/i,
  /show(?:Save|Open|Directory)(?:File)?Picker/i,
]

const IN_FILE_SCHEMES = /^(?:data|blob|about|javascript):/i

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

// WHY: the build is skipped only when every dist/ file is already newer than
// every input -- the one case a rebuild could not change the answer.
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
  // WHY: parsed via DOMParser rather than navigated to -- reads the file's
  // text without running a script or fetching a sub-resource.
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

  const offFile = uses.filter(({ where, value }) => {
    if (value.startsWith('#')) return false
    if (IN_FILE_SCHEMES.test(value)) return false
    if (where === '<a href>' && value === LINK_PRESSED_BY_A_PERSON) return false
    // WHY: a relative path here means a second file, which CN-1 already
    // forbids, so it counts as off-file too.
    return true
  })
  expect(
    offFile.map((u) => `${u.where} ${u.value}`),
    'CN-6: no reference may fetch a resource from outside the file (an <a href> may only carry the S-350 address a person presses)',
  ).toEqual([])
})

test('NFR-004 / CN-6: given the built deliverable, when its raw text is scanned for absolute URLs, then only non-dereferenced namespace identifiers and the S-350 link target remain', () => {
  const seen = new Set<string>()
  for (const match of deliverable.matchAll(ABSOLUTE_URL)) {
    seen.add(match[0].replace(/[.,;:'")\]]+$/, ''))
  }
  const external = [...seen]
    .filter((url) => !NON_DEREFERENCED_URI_IDENTIFIERS.includes(url))
    .filter((url) => url !== LINK_PRESSED_BY_A_PERSON)
    .sort()
  expect(
    external,
    'CN-6: an absolute URL that is not a declared identifier or the S-350 link target means the deliverable points outside itself',
  ).toEqual([])
  // TRAP: if this assertion needs deleting, the namespace exemption above has
  // gone stale and its entries should be reconsidered.
  expect(
    seen.has('http://www.w3.org/2000/svg'),
    'IF-1 of table T-065 puts an SVG surface on screen, so its namespace name should be present',
  ).toBe(true)
  expect(
    loaderCallsAddress(deliverable, LINK_PRESSED_BY_A_PERSON),
    'CN-6: the S-350 address may sit as a link target only, never as the argument of a fetch/open/import call',
  ).toBe(false)
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

  await expect(page.locator('svg').first()).toBeAttached({ timeout: 15_000 })
  const painted = await page.evaluate(() => document.body.querySelectorAll('*').length)
  expect(painted, 'NFR-011: the first frame must not be a blank page').toBeGreaterThan(0)

  // TRAP: this scan runs before the LM-14 filter -- swap the order and a CSP
  // refusal could be silently excluded as an LM-14 storage complaint.
  const refusals = [...consoleErrors, ...pageErrors].filter((t) =>
    /content security policy|refused to (?:load|execute|apply|connect|frame)/i.test(t))
  expect(refusals, 'CN-8: the policy refused something when the file was opened directly').toEqual([])

  const keep = (t: string): boolean => !LM_14_EXCLUDED.some((re) => re.test(t))
  expect(pageErrors.filter(keep), 'an uncaught error means the application did not come up').toEqual([])
  expect(consoleErrors.filter(keep), 'console errors outside what LM-14 excludes').toEqual([])
})

// System test: SWS-8 -- the deliverable's content security policy matches table T-232, row by row.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { execSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { bare, specTable, type SpecRow, type SpecTable } from '../contract/spec-table'
import { DRAWN_SVG, CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import { expectDeclarationsUsable, lastCellOf, rowOf, swsRegistry } from './sws-case'

const registry = swsRegistry()
const { swsCase } = registry

const T232: SpecTable = specTable('T-232')

const T232_CELLS = 2

// WHY: a row ID, not a value -- rule 03.3 has a note name the row and
// never copy what the row says.
const HASH_ROW = 'PO-4'

/** @purity pure */
function directiveOf(row: SpecRow): string {
  if (row.cells.length !== T232_CELLS) {
    throw new Error(
      `table T-232 row ${row.id} has ${row.cells.length} cells after its ID, not the ` +
        `${T232_CELLS} this file reads by position`,
    )
  }
  return bare(row.cells[0] ?? '').toLowerCase()
}

/** @purity pure */
function firstCodeSpanOf(cell: string): string {
  return /`([^`]+)`/.exec(cell)?.[1] ?? ''
}

// WHY: a cell opening with a code span spells the value; one opening with
// prose states a rule instead, which cannot be compared with toBe.
/** @purity pure */
function spelledValueOf(cell: string): string | null {
  return /^`([^`]+)`/.exec(cell.trim())?.[1] ?? null
}

interface Directive {
  readonly name: string
  readonly sources: readonly string[]
}

/** @purity pure */
function directivesOf(policy: string): readonly Directive[] {
  return policy
    .split(';')
    .map((one) => one.trim())
    .filter((one) => one !== '')
    .map((one) => {
      const parts = one.split(/\s+/)
      return { name: (parts[0] ?? '').toLowerCase(), sources: parts.slice(1) }
    })
}

// WHY: matched against the console rather than the policy text -- whether
// a policy REFUSES something is a fact about the page loading, not the string.
const REFUSAL = /content security policy|refused to (?:load|execute|apply|connect|frame)/i

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url))

// WHY: not dist/ -- two Playwright workers building into one shared
// directory at once could leave a file half-written for this test to read.
const OUT_DIR_RELATIVE = 'node_modules/.grs-system-test/sws-8'
const OUT_DIR = join(REPO_ROOT, ...OUT_DIR_RELATIVE.split('/'))

// WHY: built every run, never reused (rule 04.2) -- a test that read a
// stale artifact would prove nothing, and the artifact IS SWS-8's subject.
/** @purity non-pure */
function buildDeliverable(): void {
  try {
    execSync(`npm run build -- --outDir "${OUT_DIR_RELATIVE}" --emptyOutDir`, {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    })
  } catch (cause) {
    // WHY: the default failure carries only the exit code; what the build
    // said is on the captured streams, so it must go into the message here.
    const said = cause as { stdout?: { toString(): string }; stderr?: { toString(): string } }
    throw new Error(
      'the build produced no deliverable to judge:\n' +
        `${said.stdout?.toString() ?? ''}\n${said.stderr?.toString() ?? ''}`,
      { cause },
    )
  }
}

/** @purity semi-pure-b */
function filesUnder(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...filesUnder(full))
    else out.push(full)
  }
  return out
}

let deliverableUrl = ''
let browser: Browser | null = null

// WHY: the returned array keeps filling while the page lives; a caller
// reads it after the load it cares about has finished, never before.
/** @purity non-pure */
async function openDeliverable(from: Browser): Promise<{ page: Page; complaints: string[] }> {
  const context = await from.newContext()
  const page = await context.newPage()
  const complaints: string[] = []
  page.on('console', (one) => {
    if (one.type() === 'error') complaints.push(one.text())
  })
  page.on('pageerror', (one) => complaints.push(one.message))
  await page.goto(deliverableUrl, { waitUntil: 'load' })
  return { page, complaints }
}

test.beforeAll(async () => {
  test.setTimeout(300_000)
  buildDeliverable()
  const built = filesUnder(OUT_DIR).filter((one) => one.toLowerCase().endsWith('.html'))
  const only = built[0]
  if (built.length !== 1 || only === undefined) {
    throw new Error(`the build put ${built.length} .html files into ${OUT_DIR_RELATIVE}`)
  }
  deliverableUrl = pathToFileURL(only).href
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  // WHY: this is the hook's own allowance, not an assertion's -- closing
  // the reference browser passes the default hook timeout on this machine.
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity semi-pure-b */
function openedBrowser(): Browser {
  if (browser === null) throw new Error('the reference browser was not opened')
  return browser
}

test(
  swsCase({
    sws: 'SWS-8',
    level: 'System',
    covers: T232.rows.map((one) => one.id),
    given: 'the deliverable the build assembles, opened in the reference browser straight from disk',
    when: 'the content security policy the page carries is read out of the live DOM',
    then: 'it carries every directive table T-232 names, each with the value that row settles, and carries no directive the table does not name',
  }),
  async () => {
    test.setTimeout(120_000)
    const { page } = await openDeliverable(openedBrowser())

    const policies = await page.evaluate(() =>
      Array.from(document.querySelectorAll('meta'))
        .filter(
          (one) =>
            (one.getAttribute('http-equiv') ?? '').toLowerCase() === 'content-security-policy',
        )
        .map((one) => one.getAttribute('content') ?? ''),
    )
    // WHY: one, not "at least one" -- two policies would both be enforced
    // and their intersection would no longer read as table T-232's roster.
    expect(
      policies.length,
      `SWS-8 puts one policy into the deliverable; the page carries ${policies.length}`,
    ).toBe(1)

    const directives = directivesOf(policies[0] ?? '')
    const names = directives.map((one) => one.name)
    expect(new Set(names).size, 'the policy settles one directive twice').toBe(names.length)

    const named = T232.rows.map(directiveOf)
    expect(
      named.filter((one) => !names.includes(one)),
      'table T-232 names a directive the deliverable does not carry',
    ).toEqual([])
    expect(
      names.filter((one) => !named.includes(one)),
      'the deliverable carries a directive table T-232 does not name',
    ).toEqual([])

    const rowsStatingARule: string[] = []
    for (const row of T232.rows) {
      const name = directiveOf(row)
      const carried = directives.find((one) => one.name === name)
      if (carried === undefined) continue
      const spelled = spelledValueOf(lastCellOf(row))
      if (spelled === null) {
        rowsStatingARule.push(row.id)
        continue
      }
      expect(
        carried.sources.join(' '),
        `table T-232 row ${row.id} spells what ${name} takes`,
      ).toBe(spelled)
    }

    expect(
      rowsStatingARule,
      'a row of table T-232 states a rule this file has no check for',
    ).toEqual([HASH_ROW])

    const hashRow = rowOf(T232, HASH_ROW)
    const algorithm = firstCodeSpanOf(lastCellOf(hashRow))
    expect(algorithm, `table T-232 row ${HASH_ROW} names no algorithm`).toMatch(/^[a-z0-9]+$/)
    const pinned = directives.find((one) => one.name === directiveOf(hashRow))
    expect(
      pinned?.sources ?? [],
      `table T-232 row ${HASH_ROW} admits one source and no second`,
    ).toHaveLength(1)
    // WHY: this also keeps the row's MUST NOT -- a keyword source of any
    // kind fails the shape, so the directive cannot quietly gain one.
    expect(
      pinned?.sources[0] ?? '',
      `table T-232 row ${HASH_ROW} admits only a ${algorithm} of the embedded script`,
    ).toMatch(new RegExp(`^'${algorithm}-[A-Za-z0-9+/]+={0,2}'$`))

    await page.context().close()
  },
)

test(
  swsCase({
    sws: 'SWS-8',
    level: 'System',
    covers: [HASH_ROW],
    given: 'the deliverable the build assembles, opened in the reference browser straight from disk',
    when: 'the page has finished loading under its own policy',
    then: 'the policy refused nothing, and the drawing the tool puts up is on the page',
  }),
  async () => {
    test.setTimeout(120_000)
    const { page, complaints } = await openDeliverable(openedBrowser())

    // WHY: read before the drawing is waited for -- a refused script is
    // already on the console by then, and waiting first reports the symptom.
    expect(
      complaints.filter((one) => REFUSAL.test(one)),
      `table T-232 row ${HASH_ROW}: the policy refused something when the file was opened directly`,
    ).toEqual([])

    await expect(page.locator(DRAWN_SVG)).toBeAttached({ timeout: 30_000 })

    await page.context().close()
  },
)

test('every row of table T-232 is verified by at least one case', () => {
  const covered = new Set(registry.declared().flatMap((one) => one.covers))
  for (const row of T232.rows) {
    expect(covered.has(row.id), `table T-232 row ${row.id} has no case`).toBe(true)
  }
})

test('every case declared here is one the Chapter 9 generator could use', () => {
  expectDeclarationsUsable(registry, new Set(T232.rows.map((one) => one.id)))
})

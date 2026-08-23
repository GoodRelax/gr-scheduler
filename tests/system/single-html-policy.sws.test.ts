// System cases for `SWS-8` of Chapter 6.1 -- table T-218, row TS-3.
//
//   TS-3 | software specification test | Chapter 9's SW_SPEC_TEST | parent
//        | SWS-xxx | System | tests/system/ | Playwright
//
// WHAT IS HERE. `SWS-8` is the one `SW_SPEC` node of Chapter 6.1 whose subject
// is the deliverable itself, and table T-232 of the same chapter holds the
// whole of the policy it asks for, row by row, with a MUST NOT against adding a
// directive the table does not name.
//
// WHY AT THIS LEVEL AND NOT UNDER `tests/integration/`. Two reasons, and both
// are reasons a Vitest case could not answer:
//
//   * the policy exists only in what the project's own build assembles. There
//     is no unit to call: nothing in `src/` writes the tag.
//   * the row that pins the script has a failure mode that no reading of the
//     text can see. It pins by a hash taken from the script's own body, so a
//     policy whose text is exactly right still stops the only script in the
//     file when the hash and the body have drifted apart -- and the page then
//     comes up blank. That has happened in this project already; rule 04
//     section 3 of `docs/development-rules/` records it. It shows up one second
//     after a browser opens the file, and nowhere else.
//
// HOW IT IS DRIVEN. Chapter 1.9 of `docs/spec/01-04-requirements.md`, `:275`: a
// test that verifies a requirement pointing at a table is driven by fixed data
// copied from that table, and ONE test walks every row.
// `tests/contract/spec-table.ts` takes that copy at read time out of the
// manuscript, so not one directive name and not one value is typed in this
// file. Adding a row to table T-232 fails the case below; changing a value in
// one fails it too.
//
// ⚠️ THE ONE ROW THAT SPELLS NO VALUE. Five rows of the table open with the
// value the directive takes. One states a rule instead, because the value is
// computed at build time and cannot be written down in advance. The split is
// read off the cell -- a cell that OPENS with a code span is spelling a value
// -- rather than by naming the row, and a second rule-stating row fails the
// case until someone gives it a check of its own.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { execSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { bare, specTable, type SpecRow, type SpecTable } from '../contract/spec-table'
import { DRAWN_SVG, launchReferenceBrowser } from './live-app'
import { expectDeclarationsUsable, lastCellOf, rowOf, swsRegistry } from './sws-case'

const registry = swsRegistry()
const { swsCase } = registry

// ---------------------------------------------------------------------------
// The table, read out of the specification at read time (Chapter 1.9, :275)
// ---------------------------------------------------------------------------

const T232: SpecTable = specTable('T-232')

/** How many cells a row of table T-232 has after its row ID. */
const T232_CELLS = 2

/**
 * The row of table T-232 whose value is computed at build time.
 *
 * ⭐ A row ID, not a value: rule 03 section 3 has a note name the row and never
 * copy what the row says.
 */
const HASH_ROW = 'PO-4'

/**
 * The directive one row settles.
 *
 * @purity pure
 */
function directiveOf(row: SpecRow): string {
  if (row.cells.length !== T232_CELLS) {
    throw new Error(
      `table T-232 row ${row.id} has ${row.cells.length} cells after its ID, not the ` +
        `${T232_CELLS} this file reads by position`,
    )
  }
  return bare(row.cells[0] ?? '').toLowerCase()
}

/** The text inside the first `code span` of a cell, or `''` when it has none. @purity pure */
function firstCodeSpanOf(cell: string): string {
  return /`([^`]+)`/.exec(cell)?.[1] ?? ''
}

/**
 * The value a row spells outright, or `null` when it states a rule instead.
 *
 * ⭐ A cell that OPENS with a code span is spelling the value the directive
 * takes; one that opens with prose is saying what the value has to satisfy, and
 * a rule cannot be compared with `toBe`. Read from the cell rather than decided
 * by row ID, so the split follows the manuscript.
 *
 * @purity pure
 */
function spelledValueOf(cell: string): string | null {
  return /^`([^`]+)`/.exec(cell.trim())?.[1] ?? null
}

/** One directive of a policy, as the browser was handed it. */
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

/**
 * What a refusal by the policy reads like in the browser's own words.
 *
 * ⚠️ Matched against the console rather than asserted about the text of the
 * policy: whether a policy REFUSES something is a fact about the page being
 * loaded, not about the string.
 */
const REFUSAL = /content security policy|refused to (?:load|execute|apply|connect|frame)/i

// ---------------------------------------------------------------------------
// The deliverable under test
// ---------------------------------------------------------------------------

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url))

/**
 * Where this file has the build put the deliverable.
 *
 * ⛔ NOT `dist/`. `tests/nfr/` judges `dist/` and assembles it when it is
 * stale; Playwright runs two spec files in two workers at once, and two builds
 * writing one directory can leave a file half-written -- which is exactly the
 * artifact this file would then read. Under `node_modules/` it is already
 * ignored by Git and belongs to nobody else.
 */
const OUT_DIR_RELATIVE = 'node_modules/.grs-system-test/sws-8'
const OUT_DIR = join(REPO_ROOT, ...OUT_DIR_RELATIVE.split('/'))

/**
 * Assemble the deliverable with the project's own build.
 *
 * ⭐ Every run, never reused. Rule 04 section 2: a test that passed because it
 * read a stale artifact has proved nothing, and the artifact IS the subject of
 * `SWS-8`.
 *
 * @purity non-pure
 */
function buildDeliverable(): void {
  try {
    execSync(`npm run build -- --outDir "${OUT_DIR_RELATIVE}" --emptyOutDir`, {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    })
  } catch (cause) {
    // ⚠️ The default failure carries the exit code and nothing else, and the
    // one thing worth reading -- what the build said -- is on the captured
    // streams. Put it in the message or the run reports a number.
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

/**
 * Open the deliverable straight from disk and start listening.
 *
 * ⚠️ The returned array keeps filling while the page lives. A caller reads it
 * after the load it cares about has finished, never before.
 *
 * @purity non-pure
 */
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
  await browser?.close()
})

/** The browser opened for this file, or a failure that says it was not. @purity semi-pure-b */
function openedBrowser(): Browser {
  if (browser === null) throw new Error('the reference browser was not opened')
  return browser
}

// ---------------------------------------------------------------------------
// The cases
// ---------------------------------------------------------------------------

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
    // ⚠️ One, not "at least one". Two policies are both enforced and their
    // intersection is what governs the page, so the roster table T-232 settles
    // would no longer be readable from any single one of them.
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

    // The rule-stating row, and the only one this file knows a rule for. A
    // second one appearing here is a row nobody has written a check for yet.
    expect(
      rowsStatingARule,
      'a row of table T-232 states a rule this file has no check for',
    ).toEqual([HASH_ROW])

    const hashRow = rowOf(T232, HASH_ROW)
    // The algorithm comes out of the cell, so the shape asserted below cannot
    // outlive the row that chose it.
    const algorithm = firstCodeSpanOf(lastCellOf(hashRow))
    expect(algorithm, `table T-232 row ${HASH_ROW} names no algorithm`).toMatch(/^[a-z0-9]+$/)
    const pinned = directives.find((one) => one.name === directiveOf(hashRow))
    expect(
      pinned?.sources ?? [],
      `table T-232 row ${HASH_ROW} admits one source and no second`,
    ).toHaveLength(1)
    // ⭐ This is also what keeps the row's MUST NOT: a keyword source of any
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

    // ⚠️ The refusal is read BEFORE the drawing is waited for. A refused script
    // is already on the console by the time the load has finished, and asking
    // for the drawing first would spend the timeout and then report "nothing was
    // drawn" -- which is the symptom, not the cause.
    expect(
      complaints.filter((one) => REFUSAL.test(one)),
      `table T-232 row ${HASH_ROW}: the policy refused something when the file was opened directly`,
    ).toEqual([])

    // Coming up at all is the evidence. The row pins the one script in the file
    // by a hash of that script's own body, and a hash that no longer matches
    // refuses it -- leaving a page that parses, carries a policy that reads
    // correctly, and runs nothing.
    await expect(page.locator(DRAWN_SVG)).toBeAttached({ timeout: 30_000 })

    await page.context().close()
  },
)

// ---------------------------------------------------------------------------
// The declarations themselves (table T-219, row TW-2)
// ---------------------------------------------------------------------------

test('every row of table T-232 is verified by at least one case', () => {
  const covered = new Set(registry.declared().flatMap((one) => one.covers))
  for (const row of T232.rows) {
    expect(covered.has(row.id), `table T-232 row ${row.id} has no case`).toBe(true)
  }
})

test('every case declared here is one the Chapter 9 generator could use', () => {
  expectDeclarationsUsable(registry, new Set(T232.rows.map((one) => one.id)))
})

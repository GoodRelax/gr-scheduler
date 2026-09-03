// System cases for `SWS-7` of Chapter 6.1 -- table T-218, row TS-3.
//
//   TS-3 | software specification test | Chapter 9's SW_SPEC_TEST | parent
//        | SWS-xxx | System | tests/system/ | Playwright
//
// WHAT IS HERE. `SWS-7` sends the comparison of two SVGs through table T-231.
// Two of that table's rows are obligations on what the tool WRITES rather than
// on how a comparison is run, and both can be judged from the running
// application: `NS-3`, which fixes how a coordinate or a dimension is spelled,
// and `NS-4`, which fixes what an `id` in the drawing may be built from. `NS-5`
// fixes which two pictures are compared, and the case below takes it at its
// word: two productions inside one run.
//
// ⛔ WHAT IS NOT HERE, AND WHY. The rest of table T-231 is the comparison
// itself, and there is nothing to compare against. `ImageExporter` (`PI-21` of
// table T-064) is the one place that assembles a picture for export, and the
// shell reaches it from nowhere -- `single-html-shell.ts` wires the drawing, the
// input and the frame loop and no export path at all. So the running
// application produces exactly one SVG, never two, and:
//
//   `NS-1`  the standard adopted for comparing two XML documents is implemented
//           in no file under `src/`, and nothing here produces a second document
//           for it to be applied to.
//   `NS-2`  the whitespace step in front of it, for the same reason.
//   `NS-6`  the tolerance `WY-3` is judged by. `WY-3` sets a box measured on
//           the screen against the same box inside an exported picture; with no
//           export there is no second box.
//
// ⚠️ SO THE CASE BELOW DOES NOT CLAIM TO APPLY THE STANDARD. It compares two
// drawings in a way that is blind to the two differences `NS-1` and `NS-2`
// remove -- the order attributes were written in, and whitespace-only text
// between element children -- and says so where it does it. Anything else it
// finds is a real difference between two runs.
//
// ⛔ `SWS-6`, THE SIBLING OF THIS NODE, HAS NO CASE ANYWHERE IN THIS TREE. It
// sends the comparison of two MSPDI documents through table T-228, and the same
// thing is missing: no file compares two MSPDI documents, so a case would only
// assert that nothing exists. `tests/integration/schedule-drawing.sws.test.ts`
// records the same gap from its own side. Chapter 9's pass mark (table T-219,
// row TW-2) is every `SWS-xxx` taken as a parent by at least one case, so this
// is a gap in the milestone and not only in this file.
//
// HOW IT IS DRIVEN. Chapter 1.9 of `docs/spec/01-04-requirements.md`, `:275`: a
// test that verifies a requirement pointing at a table is driven by fixed data
// copied from that table. `tests/contract/spec-table.ts` takes that copy at
// read time, so the grid the spellings are judged against and the screen the
// application is judged on both come out of the manuscript rather than out of
// this file.

import { expect, test, type Browser } from '@playwright/test'
import { specTable, type SpecRow, type SpecTable } from '../contract/spec-table'
import { DRAWN_SVG, CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { expectDeclarationsUsable, lastCellOf, rowOf, swsRegistry } from './sws-case'

const registry = swsRegistry()
const { swsCase } = registry

// ---------------------------------------------------------------------------
// The tables, read out of the specification at read time (Chapter 1.9, :275)
// ---------------------------------------------------------------------------

const T231: SpecTable = specTable('T-231')
const T025: SpecTable = specTable('T-025')

/** The row of table T-231 that fixes how a number is spelled. */
const GRID_ROW = 'NS-3'

/** The row of table T-231 that fixes what an `id` may be built from. */
const ID_ROW = 'NS-4'

/** The row of table T-231 that fixes which two pictures are set against each other. */
const PAIR_ROW = 'NS-5'

/** The row of table T-025 that fixes the screen of the base environment. */
const SCREEN_ROW = 'MC-6'

/**
 * How many places after the point a spelling may carry.
 *
 * ⭐ Derived from the grid the row states rather than written down, so moving
 * the grid moves this. A grid no finer than one px yields no places at all,
 * which is a legitimate answer and not a failure to read the cell.
 *
 * @purity pure
 */
function fractionDigitsOf(row: SpecRow): number {
  const found = /(\d+\.\d+|\d+)\s*px/.exec(lastCellOf(row))
  if (found === null) throw new Error(`table T-231 row ${row.id} states no grid in px`)
  const grid = found[1] ?? ''
  const point = grid.indexOf('.')
  return point < 0 ? 0 : grid.length - point - 1
}

const FRACTION_DIGITS = fractionDigitsOf(rowOf(T231, GRID_ROW))
const BASE_SCREEN = screenOf(rowOf(T025, SCREEN_ROW))

/**
 * What a spelling on the grid looks like.
 *
 * ⚠️ Built as a pattern over the TEXT and not as arithmetic over the value.
 * The row asks for a rounded SPELLING, so `1.0050000000000001` fails here even
 * though it is within half a grid step of a value that would pass.
 */
const SPELLING =
  FRACTION_DIGITS > 0 ? `^-?\\d+(?:\\.\\d{1,${FRACTION_DIGITS}})?$` : '^-?\\d+$'

/**
 * The attributes SVG uses to carry a coordinate or a dimension.
 *
 * ⛔ Not read off the renderer. The list is what the FORMAT defines, so an
 * attribute the tool starts writing tomorrow is already judged; a list copied
 * from today's output would grow a hole the moment the drawing did.
 *
 * ⛔ `transform` is left out on purpose: its numbers are not all a coordinate
 * or a dimension -- a scale factor and an angle are neither -- so the row's
 * words do not reach them uniformly and a case could not say which of them it
 * had judged.
 */
const GEOMETRY_ATTRIBUTES = [
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'dx',
  'dy',
  'width',
  'height',
  'points',
  'd',
  'viewBox',
  'font-size',
  'stroke-width',
  'stroke-dasharray',
  'stroke-dashoffset',
]

/**
 * Rows of table T-231 that no case here reaches, each with the reason.
 *
 * ⭐ Recorded rather than left out, so that the completeness check below can
 * still fail when the table grows a row: an unclassified row is neither covered
 * nor excused, and somebody has to decide which it is.
 */
const OUT_OF_REACH: Readonly<Record<string, string>> = {
  'NS-1':
    'the standard is implemented in no file under src/, and the running application ' +
    'produces no second document to apply it to',
  'NS-2': 'the step in front of NS-1, unreachable for the same reason',
  'NS-6':
    'the tolerance is between a box on the screen and the same box in an exported ' +
    'picture, and no export path is wired into the shell',
}

// ---------------------------------------------------------------------------
// The running application
// ---------------------------------------------------------------------------

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  // ⛔ THE HOOK'S OWN ALLOWANCE, NOT AN ASSERTION'S. Closing the reference
  // browser passes a hook's 30s default on this machine; `CLEARING_UP_MS` of
  // `./live-app` carries the measurements and the reason.
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** The browser opened for this file, or a failure that says it was not. @purity semi-pure-b */
function openedBrowser(): Browser {
  if (browser === null) throw new Error('the reference browser was not opened')
  return browser
}

/** Where the dev server the configuration declares is listening. @purity pure */
function serverUrlOf(baseURL: string | undefined): string {
  if (baseURL === undefined) {
    throw new Error('playwright.config.ts declares no baseURL for the running application')
  }
  return baseURL
}

// ---------------------------------------------------------------------------
// The cases
// ---------------------------------------------------------------------------

test(
  swsCase({
    sws: 'SWS-7',
    level: 'System',
    covers: [GRID_ROW],
    given: 'the application up in the reference browser on the screen of the base environment, showing the document it starts with',
    when: 'every coordinate and every dimension in the drawing on the page is read',
    then: 'each one is spelled on the grid the row fixes, and none carries a place beyond it',
  }),
  async ({ baseURL }) => {
    test.setTimeout(180_000)
    const context = await openedBrowser().newContext({
      baseURL: serverUrlOf(baseURL),
      viewport: BASE_SCREEN,
    })
    const page = await context.newPage()
    await page.goto('/')
    await readSettledDrawnSvg(page)

    // ⚠️ Judged inside the page, with only the offenders coming back. The
    // document the tool starts with is a full-size one, so shipping every number
    // across the wire to judge it here would be tens of thousands of strings for
    // an answer that is one boolean and a short list.
    const scan = await page.evaluate(
      /** @purity semi-pure-b */
      (asked: { selector: string; attributes: readonly string[]; spelling: string }) => {
        const root = document.querySelector(asked.selector)
        if (root === null) return { elements: 0, numbers: 0, offenders: [] as string[] }
        const onTheGrid = new RegExp(asked.spelling)
        const anyNumber = /-?\d*\.?\d+(?:[eE][-+]?\d+)?/g
        const offenders: string[] = []
        let numbers = 0
        const all = [root, ...Array.from(root.querySelectorAll('*'))]
        for (const element of all) {
          for (const name of asked.attributes) {
            const value = element.getAttribute(name)
            if (value === null) continue
            for (const found of value.match(anyNumber) ?? []) {
              numbers += 1
              if (onTheGrid.test(found)) continue
              if (offenders.length < 20) {
                offenders.push(`<${element.tagName} ${name}="${value}"> ${found}`)
              }
            }
          }
        }
        return { elements: all.length, numbers, offenders }
      },
      { selector: DRAWN_SVG, attributes: GEOMETRY_ATTRIBUTES, spelling: SPELLING },
    )

    // ⚠️ The failure this guards against is a green run that read nothing: an
    // empty drawing satisfies every spelling there is.
    expect(scan.elements, 'the drawing holds no element to read').toBeGreaterThan(1)
    expect(scan.numbers, 'the drawing holds no coordinate and no dimension').toBeGreaterThan(0)

    expect(
      scan.offenders,
      `table T-231 row ${GRID_ROW}: spelled off the grid (${scan.numbers} numbers read)`,
    ).toEqual([])

    await context.close()
  },
)

test(
  swsCase({
    sws: 'SWS-7',
    level: 'System',
    covers: [ID_ROW, PAIR_ROW],
    given: 'the application up in the reference browser on the screen of the base environment, showing the document it starts with',
    when: 'that same document is drawn twice inside one run and the two drawings are set against each other',
    then: 'they carry the same ids and are otherwise the same drawing, so nothing in either was built from a value that changes per run',
  }),
  async ({ baseURL }) => {
    test.setTimeout(180_000)
    const context = await openedBrowser().newContext({
      baseURL: serverUrlOf(baseURL),
      viewport: BASE_SCREEN,
    })

    const firstPage = await context.newPage()
    await firstPage.goto('/')
    const first = await readSettledDrawnSvg(firstPage)
    await firstPage.close()

    const secondPage = await context.newPage()
    await secondPage.goto('/')
    const second = await readSettledDrawnSvg(secondPage)

    const compared = await secondPage.evaluate(
      /** @purity pure */
      (pair: { first: string; second: string }) => {
        // ⚠️ NOT the standard `NS-1` names -- see the header. What this does is
        // ignore the two differences that standard and `NS-2` remove: the order
        // attributes were written in, and whitespace-only text between element
        // children. Everything else counts as a difference.
        /** @purity pure */
        const shapeOf = (markup: string): string => {
          /** @purity pure */
          const written = (element: Element): string => {
            const attributes = Array.from(element.attributes)
              .map((one) => `${one.name}=${JSON.stringify(one.value)}`)
              .sort()
              .join(' ')
            const hasElementChild = element.children.length > 0
            const parts: string[] = []
            for (const child of Array.from(element.childNodes)) {
              if (child.nodeType === Node.ELEMENT_NODE) {
                parts.push(written(child as Element))
                continue
              }
              if (child.nodeType !== Node.TEXT_NODE) continue
              const text = child.nodeValue ?? ''
              if (hasElementChild && text.trim() === '') continue
              parts.push(JSON.stringify(text))
            }
            return `<${element.tagName} ${attributes}>${parts.join('')}</${element.tagName}>`
          }
          return written(new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement)
        }
        /** @purity pure */
        const idsOf = (markup: string): string[] =>
          Array.from(
            new DOMParser().parseFromString(markup, 'image/svg+xml').querySelectorAll('[id]'),
          ).map((one) => one.id)

        const one = shapeOf(pair.first)
        const two = shapeOf(pair.second)
        let at = 0
        while (at < one.length && at < two.length && one[at] === two[at]) at += 1
        return {
          same: one === two,
          at,
          firstAt: one.slice(Math.max(0, at - 80), at + 80),
          secondAt: two.slice(Math.max(0, at - 80), at + 80),
          firstIds: idsOf(pair.first),
          secondIds: idsOf(pair.second),
        }
      },
      { first, second },
    )

    // ⚠️ Recorded so that a pass says how much there was to judge. An `id` built
    // from a value that changes per run is what the row forbids, and a drawing
    // that carries no `id` at all satisfies it with nothing to show.
    test.info().annotations.push({
      type: 'note',
      description: `ids in the drawing: ${compared.firstIds.length}`,
    })

    expect(
      compared.secondIds,
      `table T-231 row ${ID_ROW}: the two runs put different ids in the drawing`,
    ).toEqual(compared.firstIds)

    expect(
      compared.same,
      `table T-231 rows ${ID_ROW} / ${PAIR_ROW}: the two drawings of one run differ from ` +
        `character ${compared.at}\n  first : ${compared.firstAt}\n  second: ${compared.secondAt}`,
    ).toBe(true)

    await context.close()
  },
)

// ---------------------------------------------------------------------------
// The declarations themselves (table T-219, row TW-2)
// ---------------------------------------------------------------------------

test('every row of table T-231 is either verified by a case or recorded as out of reach', () => {
  const covered = new Set(registry.declared().flatMap((one) => one.covers))
  for (const row of T231.rows) {
    const reason = OUT_OF_REACH[row.id]
    expect(
      covered.has(row.id) || reason !== undefined,
      `table T-231 row ${row.id} is neither covered by a case nor recorded as out of reach`,
    ).toBe(true)
    // ⭐ Put on the run rather than left in a constant nobody prints: a gap that
    // is only visible by reading this file is a gap that stops being read.
    if (reason !== undefined) {
      test.info().annotations.push({ type: 'note', description: `${row.id}: ${reason}` })
    }
  }
  for (const id of Object.keys(OUT_OF_REACH)) {
    expect(
      T231.rows.some((one) => one.id === id),
      `${id} is recorded as out of reach but is no longer a row of table T-231`,
    ).toBe(true)
    expect(covered.has(id), `${id} is recorded as out of reach but a case covers it`).toBe(false)
  }
})

test('every case declared here is one the Chapter 9 generator could use', () => {
  expectDeclarationsUsable(registry, new Set(T231.rows.map((one) => one.id)))
})

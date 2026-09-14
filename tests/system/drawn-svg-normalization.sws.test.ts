// System cases for SWS-7 of Chapter 6.1 -- table T-218, row TS-3.

import { expect, test, type Browser } from '@playwright/test'
import { specTable, type SpecRow, type SpecTable } from '../contract/spec-table'
import { DRAWN_SVG, CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { expectDeclarationsUsable, lastCellOf, rowOf, swsRegistry } from './sws-case'

const registry = swsRegistry()
const { swsCase } = registry

const T231: SpecTable = specTable('T-231')
const T025: SpecTable = specTable('T-025')

const GRID_ROW = 'NS-3'
const ID_ROW = 'NS-4'
const PAIR_ROW = 'NS-5'
const SCREEN_ROW = 'MC-6'

// WHY: derived from the grid, not written down, so moving the grid moves this;
// WHY: a grid no finer than 1px yields zero places, which is a valid answer.
/** @purity pure */
function fractionDigitsOf(row: SpecRow): number {
  const found = /(\d+\.\d+|\d+)\s*px/.exec(lastCellOf(row))
  if (found === null) throw new Error(`table T-231 row ${row.id} states no grid in px`)
  const grid = found[1] ?? ''
  const point = grid.indexOf('.')
  return point < 0 ? 0 : grid.length - point - 1
}

const FRACTION_DIGITS = fractionDigitsOf(rowOf(T231, GRID_ROW))
const BASE_SCREEN = screenOf(rowOf(T025, SCREEN_ROW))

const SPELLING =
  FRACTION_DIGITS > 0 ? `^-?\\d+(?:\\.\\d{1,${FRACTION_DIGITS}})?$` : '^-?\\d+$'

// WHY: not read off the renderer -- the list is what the format defines, so a
// WHY: new attribute is already judged; transform's numbers are not uniform.
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

// WHY: recorded, not omitted, so the completeness check below still catches
// WHY: a new table row that is neither covered nor excused.
const OUT_OF_REACH: Readonly<Record<string, string>> = {
  'NS-1':
    'the standard is implemented in no file under src/, and the running application ' +
    'produces no second document to apply it to',
  'NS-2': 'the step in front of NS-1, unreachable for the same reason',
  'NS-6':
    'the tolerance is between a box on the screen and the same box in an exported ' +
    'picture, and no export path is wired into the shell',
}

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  // WHY: this raises the hook's own timeout, not an assertion's -- closing the
  // WHY: reference browser exceeds Playwright's 30s hook default on this machine.
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity semi-pure-b */
function openedBrowser(): Browser {
  if (browser === null) throw new Error('the reference browser was not opened')
  return browser
}

/** @purity pure */
function serverUrlOf(baseURL: string | undefined): string {
  if (baseURL === undefined) {
    throw new Error('playwright.config.ts declares no baseURL for the running application')
  }
  return baseURL
}

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

    // WHY: judged inside the page, only offenders returned -- shipping every
    // WHY: number across the wire would be tens of thousands of strings.
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

    // WHY: guards against a green run that read nothing -- an empty drawing
    // WHY: satisfies every spelling there is.
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
        // WHY: not NS-1's standard -- ignores only the order of written attributes
        // WHY: and whitespace-only text between children; everything else counts.
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
                // TRAP: the watermark's stamp changes every run/machine (WY-2);
                // TRAP: excluding it here is required or SWS-7 never passes once FR-020 draws it.
                if ((child as Element).getAttribute('data-role') === 'Watermark') continue
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
          )
            // WHY: same exclusion as above (WY-2) -- the watermark's clip id is
            // WHY: derived from the Row Area, which is already set aside from comparison.
            .filter((one) => one.closest('[data-role="Watermark"]') === null)
            .map((one) => one.id)

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

    // WHY: recorded so a pass states how much there was to judge -- a drawing
    // WHY: with no id at all would satisfy the row with nothing to show.
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

test('every row of table T-231 is either verified by a case or recorded as out of reach', () => {
  const covered = new Set(registry.declared().flatMap((one) => one.covers))
  for (const row of T231.rows) {
    const reason = OUT_OF_REACH[row.id]
    expect(
      covered.has(row.id) || reason !== undefined,
      `table T-231 row ${row.id} is neither covered by a case nor recorded as out of reach`,
    ).toBe(true)
    // WHY: put on the run, not just in a constant -- a gap only visible by
    // WHY: reading this file is a gap that stops being read.
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

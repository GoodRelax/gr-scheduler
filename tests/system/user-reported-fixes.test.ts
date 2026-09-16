// One System case for each of eleven rows of the defect ledger

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bareAll, specTable, type SpecTable } from '../contract/spec-table'
import { DEFAULT_DISPLAY_RATIO, S_235 } from '../fixtures/display-scale'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'


const T025: SpecTable = specTable('T-025')
const T109: SpecTable = specTable('T-109')
const T201: SpecTable = specTable('T-201')
const T202: SpecTable = specTable('T-202')
const T206: SpecTable = specTable('T-206')
const T212: SpecTable = specTable('T-212')

/** @purity pure */
function cellOf(table: SpecTable, rowId: string, column: number, columns: number): string {
  const row = rowOf(table, rowId)
  if (row.cells.length !== columns) {
    throw new Error(
      `table ${table.id} row ${rowId} has ${row.cells.length} cells after the row ID, not the ` +
        `${columns} this file reads by position -- a column was added or taken away`,
    )
  }
  return row.cells[column] ?? ''
}

function numberIn(cell: string, what: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) {
    throw new Error(`${what} states no number this file can read: ${JSON.stringify(cell)}`)
  }
  return value
}

const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

const HINT_DELAY_MS = numberIn(cellOf(T212, 'S-124', 1, 5), 'table T-212 row S-124')

const ENTRANCE_SHAPE_PX = numberIn(cellOf(T206, 'S-138', 1, 3), 'table T-206 row S-138')

const ENTRANCE_CLEAR_PX = numberIn(cellOf(T206, 'S-141', 1, 3), 'table T-206 row S-141')

// see FR-029, T-206, S-237
const ENTRANCE_FRAME_PX = numberIn(cellOf(T206, 'S-237', 1, 3), 'table T-206 row S-237')

// see FR-029, FR-039, T-252, DS-7, S-235
// WHY: DS-7 keeps the display scale off an entrance, so S-235 is the one ratio
// WHY: the outer width FR-029 derives is drawn at, on every surface.
const NARROWEST_ENTRANCE_PX =
  (ENTRANCE_SHAPE_PX + (ENTRANCE_CLEAR_PX + ENTRANCE_FRAME_PX) * 2) * S_235

const T109_COLUMNS = 5
const SURFACE_COLUMN = 0
const PURPOSE_COLUMN = 2
const SOURCE_COLUMN = 3

/** @purity pure */
function entrancesOnSurface(surface: string): readonly string[] {
  const found = T109.rows
    .filter((row) => row.cells.length === T109_COLUMNS)
    .filter((row) => bareAll(row.cells[SURFACE_COLUMN] ?? '').includes(surface))
    .map((row) => row.id)
  if (found.length === 0) throw new Error(`table T-109 puts no entrance on ${surface}`)
  return found
}

/** @purity pure */
function entranceNaming(text: string): string {
  const found = T109.rows.filter((row) => (row.cells[PURPOSE_COLUMN] ?? '').includes(text))
  if (found.length !== 1) {
    throw new Error(
      `table T-109 has ${found.length} entrances whose purpose names ${JSON.stringify(text)}, ` +
        'and this file needs exactly one',
    )
  }
  return found[0]?.id ?? ''
}

/** @purity pure */
function rowPanelRuleOf(entrance: string): string {
  const found = /HF-\d+/.exec(cellOf(T109, entrance, SOURCE_COLUMN, T109_COLUMNS))
  if (found === null) {
    throw new Error(`table T-109 row ${entrance} names no HF row of table T-051 as its rule`)
  }
  return found[0]
}

/** @purity pure */
function entranceRuledBy(rule: string): string {
  const wanted = new RegExp(`${rule}(?![0-9])`)
  const found = T109.rows
    .filter((row) => row.cells.length === T109_COLUMNS)
    .filter((row) => wanted.test(row.cells[SOURCE_COLUMN] ?? ''))
  if (found.length !== 1) {
    throw new Error(
      `table T-109 has ${found.length} entrances whose rule is ${rule}, and this file needs one`,
    )
  }
  return found[0]?.id ?? ''
}


let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

function openedBrowser(): Browser {
  if (browser === null) throw new Error('the reference browser was not opened')
  return browser
}

function serverUrlOf(baseURL: string | undefined): string {
  if (baseURL === undefined) {
    throw new Error('playwright.config.ts declares no baseURL for the running application')
  }
  return baseURL
}

interface Opened {
  readonly page: Page
  close(): Promise<void>
}

/** @purity non-pure */
async function openTheApp(baseURL: string | undefined, locale?: string): Promise<Opened> {
  const context = await openedBrowser().newContext({
    baseURL: serverUrlOf(baseURL),
    viewport: BASE_SCREEN,
    ...(locale === undefined ? {} : { locale }),
  })
  const page = await context.newPage()
  await page.goto('/')
  await readSettledDrawnSvg(page)
  return {
    page,
    /** @purity non-pure */
    async close(): Promise<void> {
      await context.close()
    },
  }
}

const CANVAS = '[data-role="Schedule Canvas"] svg'
const TOOLTIP = '[data-role="Tooltip"]'

interface Box {
  readonly entrance: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** @purity semi-pure-b */
async function readEntranceBoxes(page: Page, wanted: readonly string[]): Promise<Box[]> {
  return page.evaluate((asked: readonly string[]) => {
    const out = []
    for (const entrance of asked) {
      const element = document.querySelector(`[data-icon="${entrance}"]`)
      if (element === null) continue
      const box = element.getBoundingClientRect()
      if (box.width < 1 || box.height < 1) continue
      out.push({
        entrance,
        x: Math.round(box.x * 100) / 100,
        y: Math.round(box.y * 100) / 100,
        width: Math.round(box.width * 100) / 100,
        height: Math.round(box.height * 100) / 100,
      })
    }
    return out
  }, wanted)
}

/** @purity non-pure */
async function pressEntrance(page: Page, entrance: string): Promise<boolean> {
  const boxes = await readEntranceBoxes(page, [entrance])
  const box = boxes[0]
  if (box === undefined) return false
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(600)
  return true
}

async function readScreenTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = []
    for (const element of Array.from(document.querySelectorAll('*'))) {
      if (element.children.length > 0) continue
      const words = (element.textContent ?? '').trim()
      if (words !== '') out.push(words)
    }
    return out
  })
}


const RETIRED_NOTICE_WORD = String.fromCharCode(0x77e5, 0x3089, 0x305b)

const SETTLED_NOTICE_WORD = String.fromCharCode(0x901a, 0x77e5)

const ELLIPSIS = String.fromCharCode(0x2026)

const DICTIONARY = join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json')

interface Wording {
  readonly at: string
  readonly text: string
}

/** @purity pure */
function wordingsIn(value: unknown, at: string): Wording[] {
  if (typeof value === 'string') return [{ at, text: value }]
  if (Array.isArray(value)) return value.flatMap((one, i) => wordingsIn(one, `${at}[${i}]`))
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== '$comment')
      .flatMap(([key, one]) => wordingsIn(one, `${at}.${key}`))
  }
  return []
}

/** @purity pure */
function isJapanese(text: string): boolean {
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0
    if (code >= 0x3040 && code <= 0x30ff) return true
    if (code >= 0x4e00 && code <= 0x9fff) return true
  }
  return false
}

test('DFC-34: no word the screen can print, and none it does print, carries the retired word', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)

  const wordings = wordingsIn(JSON.parse(readFileSync(DICTIONARY, 'utf8')), 'display-words')
  const retired = wordings.filter((one) => one.text.includes(RETIRED_NOTICE_WORD))
  expect(
    retired.map((one) => `${one.at}: ${one.text}`),
    `${DICTIONARY} still writes the retired word; the settled one is the other`,
  ).toEqual([])
  expect(
    wordings.some((one) => one.text.includes(SETTLED_NOTICE_WORD)),
    'the dictionary writes the settled word nowhere at all, so this case would pass on an empty ' +
      'dictionary just as well',
  ).toBe(true)

  const app = await openTheApp(baseURL, 'ja-JP')
  try {
    const palette = entranceNaming('S-99e')
    const boxes = await readEntranceBoxes(app.page, [palette])
    const box = boxes[0]
    expect(box, `the entrance ${palette} is not on the screen`).not.toBeUndefined()
    if (box === undefined) return
    await app.page.mouse.move(box.x - 40, box.y + box.height / 2)
    await app.page.waitForTimeout(200)
    await app.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await app.page.waitForTimeout(HINT_DELAY_MS + 1500)
    const rested = await readScreenTexts(app.page)

    const faint = await app.page.evaluate(
      /** @purity semi-pure-b */
      () =>
        document.querySelector('[data-icon][data-enabled="false"]')?.getAttribute('data-icon') ??
        null,
    )
    expect(faint, 'no entrance is drawn faint, so no notice can be raised without editing').not.toBeNull()
    if (faint === null) return
    expect(await pressEntrance(app.page, faint), `${faint} is not on the screen`).toBe(true)
    const told = await readScreenTexts(app.page)

    const shown = [...new Set([...rested, ...told])]
    const japanese = shown.filter(isJapanese)
    expect(
      japanese.length,
      'the running application put no Japanese words on the screen at all, so the walk below ' +
        'proves nothing -- it did not open in Japanese, or neither the explanation nor the notice came',
    ).toBeGreaterThan(1)
    expect(
      shown.filter((text) => text.includes(RETIRED_NOTICE_WORD)),
      'the running application printed the retired word',
    ).toEqual([])
  } finally {
    await app.close()
  }
})


interface Telling {
  readonly name: string
  readonly start: string
  readonly finish: string
}

/** @purity pure */
function tellingIn(said: string): Telling | null {
  const found = /^(.*?)\s*(\d{4}-\d{2}-\d{2})\s*\/\s*(\d{4}-\d{2}-\d{2})$/.exec(said.trim())
  if (found === null) return null
  return { name: found[1] ?? '', start: found[2] ?? '', finish: found[3] ?? '' }
}

async function readBarsOnScreen(page: Page): Promise<Array<{ x: number; y: number; width: number; height: number }>> {
  return page.evaluate((asked: { canvas: string; floor: number }) => {
    const svg = document.querySelector(asked.canvas)
    if (svg === null) return []
    return Array.from(svg.querySelectorAll('polygon'))
      .map((one) => one.getBoundingClientRect())
      .filter(
        (box) =>
          box.x > 200 &&
          box.y > 100 &&
          box.x + box.width < window.innerWidth - 20 &&
          box.y + box.height < window.innerHeight - 20 &&
          box.width > 60 &&
          box.height >= asked.floor,
      )
      .map((box) => ({
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
      }))
      .sort((one, two) => one.y - two.y || one.x - two.x)
  }, { canvas: CANVAS, floor: DRAWN_PLAN_BAR_FLOOR_PX })
}

async function readTooltip(page: Page): Promise<string> {
  return page.evaluate(
    (selector: string) => (document.querySelector(selector)?.textContent ?? '').trim(),
    TOOLTIP,
  )
}

/** @purity non-pure */
async function restOnBar(
  page: Page,
  bar: { x: number; y: number; width: number; height: number },
): Promise<{ early: string; late: string }> {
  const at = { x: bar.x + Math.round(bar.width / 2), y: bar.y + Math.round(bar.height / 2) }
  await page.mouse.move(at.x - 60, at.y - 60)
  await page.waitForTimeout(300)
  await page.mouse.move(at.x, at.y)
  await page.waitForTimeout(Math.round(HINT_DELAY_MS * 0.6))
  const early = await readTooltip(page)
  await page.waitForTimeout(Math.round(HINT_DELAY_MS * 0.4) + 1500)
  const late = await readTooltip(page)
  return { early, late }
}

test('DFC-45: resting on a task bar tells the task name and its two dates, and moving clears it', async ({
  baseURL,
}) => {
  test.setTimeout(240_000)
  const app = await openTheApp(baseURL)
  try {
    const bars = await readBarsOnScreen(app.page)
    expect(
      bars.length,
      'no task bar is wholly on the screen to rest a pointer on: a drawn plan bar stands ' +
        `${DRAWN_PLAN_BAR_PX.toFixed(4)}px tall, S-4 x S-13 at the ratio FR-039 (MUST) gives -- ` +
        '「描く比は、`S-234` を 100 で割り、同書の 表 T-206 の `S-236` を掛けた値とすること（MUST）」',
    ).toBeGreaterThan(1)

    const first = bars[0]
    if (first === undefined) return
    const second = bars.find((one) => Math.abs(one.y - first.y) > first.height * 2)
    expect(second, 'only one row band has a bar wholly on the screen').not.toBeUndefined()
    if (second === undefined) return

    const one = await restOnBar(app.page, first)
    expect(
      one.early,
      `something was put up after only ${Math.round(HINT_DELAY_MS * 0.6)}ms, and table T-212 row ` +
        `S-124 gives the wait as ${HINT_DELAY_MS}ms`,
    ).toBe('')
    const told = tellingIn(one.late)
    expect(
      told,
      `resting on the bar at (${first.x}, ${first.y}) said ${JSON.stringify(one.late)}, which is ` +
        'not a name followed by start and finish as YYYY-MM-DD with a / between them (EZ-6)',
    ).not.toBeNull()
    if (told === null) return
    expect(told.name, 'the telling carries no name at all').not.toBe('')
    expect(
      told.name.includes(ELLIPSIS),
      `the name in the telling is cut short (${JSON.stringify(told.name)}), and EZ-6 asks for the whole of it`,
    ).toBe(false)

    await app.page.mouse.move(first.x - 120, first.y + 140)
    await app.page.waitForTimeout(800)
    expect(await readTooltip(app.page), 'the telling stayed up after the pointer moved').toBe('')

    const other = await restOnBar(app.page, second)
    const otherTold = tellingIn(other.late)
    expect(
      otherTold,
      `resting on the bar at (${second.x}, ${second.y}) said ${JSON.stringify(other.late)}`,
    ).not.toBeNull()
    if (otherTold === null) return
    expect(
      otherTold.name,
      'two bars in different row bands were told the same name, so the name is not read from the ' +
        'task the pointer is over',
    ).not.toBe(told.name)
  } finally {
    await app.close()
  }
})


const GUIDE_MODE_CELL = cellOf(T202, 'S-66', 1, 4)

function guideMode(name: string): string {
  if (!GUIDE_MODE_CELL.includes(`'${name}'`)) {
    throw new Error(`table T-202 row S-66 does not offer a guide cursor mode called ${name}`)
  }
  return name
}

const GUIDE_NONE = guideMode('none')
const GUIDE_CROSSHAIR = guideMode('crosshair')
const GUIDE_SINGLE_VERTICAL = guideMode('single-vertical')

/** @purity semi-pure-b */
async function readLinesThroughPointer(
  page: Page,
  at: { x: number; y: number },
): Promise<{ vertical: number; horizontal: number }> {
  return page.evaluate(
    (asked: { canvas: string; x: number; y: number }) => {
      const svg = document.querySelector(asked.canvas)
      let vertical = 0
      let horizontal = 0
      if (svg === null) return { vertical, horizontal }
      for (const line of Array.from(svg.querySelectorAll('line'))) {
        const x1 = Number(line.getAttribute('x1'))
        const x2 = Number(line.getAttribute('x2'))
        const y1 = Number(line.getAttribute('y1'))
        const y2 = Number(line.getAttribute('y2'))
        if (x1 === asked.x && x2 === asked.x && y1 !== y2) vertical += 1
        else if (y1 === asked.y && y2 === asked.y && x1 !== x2) horizontal += 1
      }
      return { vertical, horizontal }
    },
    { canvas: CANVAS, x: at.x, y: at.y },
  )
}

/** @purity non-pure */
async function movePointerTo(page: Page, at: { x: number; y: number }): Promise<void> {
  await page.mouse.move(at.x - 7, at.y - 7)
  await page.waitForTimeout(150)
  await page.mouse.move(at.x, at.y)
  await readSettledDrawnSvg(page)
}

test('DFC-72: the guide cursor can be switched to a crosshair and to a single vertical line', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const app = await openTheApp(baseURL)
  try {
    const here = { x: Math.round(BASE_SCREEN.width * 0.47) + 3, y: Math.round(BASE_SCREEN.height * 0.46) + 3 }
    const there = { x: Math.round(BASE_SCREEN.width * 0.63) + 7, y: Math.round(BASE_SCREEN.height * 0.65) + 1 }

    await movePointerTo(app.page, here)
    expect(
      await readLinesThroughPointer(app.page, here),
      `before any entrance is pressed the drawing already has a line standing on the pointer, so ` +
        'the counts below would be measuring something else',
    ).toEqual({ vertical: 0, horizontal: 0 })

    const crosshair = entranceNaming(`'${GUIDE_CROSSHAIR}'`)
    expect(await pressEntrance(app.page, crosshair), `${crosshair} is not on the screen`).toBe(true)
    await movePointerTo(app.page, here)
    expect(
      await readLinesThroughPointer(app.page, here),
      `${crosshair} sets the guide cursor to ${GUIDE_CROSSHAIR}, which table T-029 row CU-3 calls a ` +
        'crosshair: one line down and one across, both on the pointer',
    ).toEqual({ vertical: 1, horizontal: 1 })
    await movePointerTo(app.page, there)
    expect(
      await readLinesThroughPointer(app.page, there),
      'the crosshair did not follow the pointer to a second place, and CU-3 calls it a line that ' +
        'follows the pointer',
    ).toEqual({ vertical: 1, horizontal: 1 })

    const single = entranceNaming(`'${GUIDE_SINGLE_VERTICAL}'`)
    expect(await pressEntrance(app.page, single), `${single} is not on the screen`).toBe(true)
    await movePointerTo(app.page, there)
    expect(
      await readLinesThroughPointer(app.page, there),
      `${single} sets the guide cursor to ${GUIDE_SINGLE_VERTICAL}, which is one line down and ` +
        'nothing across',
    ).toEqual({ vertical: 1, horizontal: 0 })
    await movePointerTo(app.page, here)
    expect(
      await readLinesThroughPointer(app.page, here),
      'the single vertical line did not follow the pointer',
    ).toEqual({ vertical: 1, horizontal: 0 })

    expect(await pressEntrance(app.page, single), `${single} is not on the screen`).toBe(true)
    await movePointerTo(app.page, here)
    expect(
      await readLinesThroughPointer(app.page, here),
      `pressing ${single} a second time puts the guide cursor back to ${GUIDE_NONE}, which is what ` +
        'FR-048 gives instead of an entrance of its own',
    ).toEqual({ vertical: 0, horizontal: 0 })
  } finally {
    await app.close()
  }
})


test('DFC-87: the header stands its entrances in the order of table T-109, palette first', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const app = await openTheApp(baseURL)
  try {
    const listed = entrancesOnSurface('App Header')
    const palette = entranceNaming('S-99e')
    expect(
      listed[0],
      'table T-109 no longer lists the palette-visibility entrance first among the header rows, so ' +
        'the manuscript and this case disagree about what DFC-87 asked for',
    ).toBe(palette)

    const boxes = await readEntranceBoxes(app.page, listed)
    expect(
      boxes.map((one) => one.entrance),
      'the header is missing entrances table T-109 puts on it',
    ).toEqual([...listed])

    const leftToRight = [...boxes].sort((one, two) => one.x - two.x).map((one) => one.entrance)
    expect(
      leftToRight,
      'the header draws its entrances in an order table T-109 does not list them in',
    ).toEqual([...listed])
    expect(
      leftToRight[0],
      `${palette} is not the leftmost entrance of the header`,
    ).toBe(palette)
  } finally {
    await app.close()
  }
})


const PANEL_HEAD_ORDER: readonly string[] = ['HF-16', 'HF-12', 'HF-10', 'HF-17']

function doBoxesOverlap(one: Box, two: Box): boolean {
  return (
    one.x < two.x + two.width &&
    two.x < one.x + one.width &&
    one.y < two.y + two.height &&
    two.y < one.y + one.height
  )
}

test('DFC-160: the entrances at the head of the row title panel stand apart, in order', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const app = await openTheApp(baseURL)
  try {
    const head = PANEL_HEAD_ORDER.map(entranceRuledBy)
    const onPanel = entrancesOnSurface('Row Title Panel')
    for (const entrance of head) {
      expect(
        onPanel.includes(entrance),
        `table T-109 no longer puts ${entrance} on the Row Title Panel`,
      ).toBe(true)
    }

    const boxes = await readEntranceBoxes(app.page, head)
    expect(
      boxes.map((one) => one.entrance).sort(),
      'the head of the row title panel is missing entrances table T-051 puts on it',
    ).toEqual([...head].sort())

    for (const box of boxes) {
      expect(
        box.width,
        `${box.entrance} is drawn ${box.width}px wide. FR-029 (MUST): ` +
          '「入口の外形の幅は、箱の一辺（`S-138`）に、隙間（`S-141`）と枠の線の太さ（`S-237`）を' +
          '左右のぶん加えた値とすること（MUST）」 and 「箱の一辺（`S-138`）と隙間（`S-141`）と枠の' +
          '線の太さ（`S-237`）には、どの面でも同書の 表 T-206 の `S-235` を掛けて描くこと（MUST）」 ' +
          `-- (${ENTRANCE_SHAPE_PX} + (${ENTRANCE_CLEAR_PX} + ${ENTRANCE_FRAME_PX}) x 2) x ` +
          `${S_235} = ${NARROWEST_ENTRANCE_PX.toFixed(4)}px`,
      ).toBeGreaterThanOrEqual(NARROWEST_ENTRANCE_PX)
    }

    const overlapping: string[] = []
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const one = boxes[i]
        const two = boxes[j]
        if (one === undefined || two === undefined) continue
        if (!doBoxesOverlap(one, two)) continue
        overlapping.push(
          `${one.entrance} (${one.x}..${one.x + one.width}) and ${two.entrance} ` +
            `(${two.x}..${two.x + two.width})`,
        )
      }
    }
    expect(overlapping, 'two entrances of the panel head cover the same ground').toEqual([])

    const drawnRules = [...boxes]
      .sort((one, two) => one.x - two.x)
      .map((one) => rowPanelRuleOf(one.entrance))
    expect(
      drawnRules,
      'the head of the row title panel does not stand its entrances in the order HF-10 gives',
    ).toEqual(PANEL_HEAD_ORDER)
  } finally {
    await app.close()
  }
})


const AGENT_API_ENTRANCE = 'IC-20'

const AM_2 = 'schemaVersion'
const AM_3 = 'readDocument'
const AM_11 = 'exportJson'
const AM_13 = 'exportSvg'

/** @purity non-pure */
async function openTheAgentApi(page: Page): Promise<void> {
  expect(
    await pressEntrance(page, AGENT_API_ENTRANCE),
    `the entrance ${AGENT_API_ENTRANCE} that FR-065 has open the Agent API is on the screen`,
  ).toBe(true)
  expect(
    await page.evaluate(
      /** @purity semi-pure-b */
      () => typeof (window as unknown as Record<string, unknown>).grSchedulerAgentApi,
    ),
    `pressing ${AGENT_API_ENTRANCE} published the Agent API`,
  ).toBe('object')
}


interface DividerPair {
  readonly at: string
  readonly screen: string
  readonly exported: string
}

interface DividerReading {
  readonly refusal: string | null
  readonly hue: number | null
  readonly ratio: number
  readonly pairs: readonly DividerPair[]
  readonly unmatched: readonly string[]
}

/** @purity semi-pure-b */
async function dividerColoursOnBothSides(
  page: Page,
  names: { readonly read: string; readonly picture: string; readonly divider: string; readonly canvas: string },
): Promise<DividerReading> {
  return page.evaluate((asked: { read: string; picture: string; divider: string; canvas: string }) => {
    const empty = { hue: null, ratio: 0, pairs: [], unmatched: [] }
    const api = (window as unknown as Record<string, Record<string, unknown> | undefined>)
      .grSchedulerAgentApi
    const read = api?.[asked.read]
    const picture = api?.[asked.picture]
    if (typeof read !== 'function' || typeof picture !== 'function') {
      return { refusal: `the Agent API published neither ${asked.read} nor ${asked.picture}`, ...empty }
    }
    const opened = (read as () => unknown).call(api) as {
      schedule?: { project?: { themeHue?: unknown } }
    }
    const hue = typeof opened.schedule?.project?.themeHue === 'number'
      ? opened.schedule.project.themeHue
      : null
    const written = (picture as () => unknown).call(api) as
      | { ok: true; value: string }
      | { ok: false; refusal: unknown }
    if (!written.ok) {
      return { refusal: `${asked.picture} refused: ${JSON.stringify(written.refusal)}`, ...empty }
    }

    const canvas = window.document.querySelector(asked.canvas)
    if (canvas === null) return { refusal: `no ${asked.canvas} on the screen`, ...empty }
    const canvasBox = canvas.getBoundingClientRect()
    const screenWidth = Math.max(1, canvasBox.x + canvasBox.width)
    const drawn = new DOMParser().parseFromString(written.value, 'image/svg+xml')
    const ratio = Number(drawn.documentElement.getAttribute('width')) / screenWidth
    if (!Number.isFinite(ratio) || ratio <= 0) {
      return { refusal: `the picture states no width this case can shrink by`, ...empty }
    }
    const shapes = Array.from(drawn.querySelectorAll('rect'))

    const probe = window.document.createElement('div')
    window.document.body.appendChild(probe)
    const resolved = (colour: string): string => {
      probe.style.color = 'rgb(1, 2, 3)'
      probe.style.color = colour
      return window.getComputedStyle(probe).color
    }

    const pairs: { at: string; screen: string; exported: string }[] = []
    const unmatched: string[] = []
    for (const band of Array.from(window.document.querySelectorAll(asked.divider))) {
      const over = band.getBoundingClientRect()
      for (const one of Array.from(window.document.querySelectorAll('*'))) {
        if (one === band) continue
        const box = one.getBoundingClientRect()
        const inside =
          box.x >= over.x - 1 &&
          box.x + box.width <= over.x + over.width + 1 &&
          Math.abs(box.y - over.y) <= 1 &&
          Math.abs(box.height - over.height) <= 1
        if (!inside) continue
        const background = window.getComputedStyle(one).backgroundColor
        if (background === 'rgba(0, 0, 0, 0)' || background === 'transparent') continue
        const at = `x=${String(Math.round(box.x))} y=${String(Math.round(box.y))} ` +
          `w=${String(Math.round(box.width * 100) / 100)} h=${String(Math.round(box.height))}`
        const near = shapes.filter(
          (shape) =>
            Math.abs(Number(shape.getAttribute('x')) - box.x * ratio) <= 1 &&
            Math.abs(Number(shape.getAttribute('y')) - box.y * ratio) <= 1 &&
            Math.abs(Number(shape.getAttribute('width')) - box.width * ratio) <= 1 &&
            Math.abs(Number(shape.getAttribute('height')) - box.height * ratio) <= 1,
        )
        if (near.length === 0) {
          unmatched.push(at)
          continue
        }
        for (const shape of near) {
          pairs.push({
            at,
            screen: resolved(background),
            exported: resolved(shape.getAttribute('fill') ?? ''),
          })
        }
      }
    }
    probe.remove()
    return { refusal: null, hue, ratio, pairs, unmatched }
  }, names)
}

test('DFC-277: the picture fills the Panel Divider line with the colour the screen paints it', async ({
  baseURL,
}) => {
  test.setTimeout(240_000)
  const app = await openTheApp(baseURL)
  try {
    await openTheAgentApi(app.page)
    const reading = await dividerColoursOnBothSides(app.page, {
      read: AM_3,
      picture: AM_13,
      divider: '[data-role="Panel Divider"]',
      canvas: '[data-role="Schedule Canvas"]',
    })
    expect(reading.refusal, 'the picture could not be read').toBeNull()
    expect(
      reading.hue,
      'AM-3 handed back no number for the hue DR-5 of table T-052 puts on the project, so there ' +
        'is nothing to resolve either side at',
    ).not.toBeNull()
    expect(
      reading.hue,
      'the open document carries a hue of 0, and at that hue the build that dropped AT-19 on the ' +
        'way to the exporter paints exactly what the fixed one paints -- this case would pass on ' +
        'either, so it refuses to stand as an anchor for DFC-277',
    ).not.toBe(0)
    expect(
      reading.pairs.length,
      `no Panel Divider line on the screen was matched to a shape in the picture (ratio ` +
        `${String(reading.ratio)}), so there is nothing to compare`,
    ).toBeGreaterThan(0)
    expect(
      reading.unmatched,
      'the picture holds no shape where the screen holds a Panel Divider line, and EP-9 of table ' +
        'T-076 has the boundary line drawn in it',
    ).toEqual([])
    expect(
      reading.pairs.map((one) => `${one.at} exported=${one.exported}`),
      `FR-080 with WY-2 of table T-041: the picture is the screen shrunk, so each divider line is ` +
        `filled with the colour the screen paints it. Resolved at the open document's own hue ` +
        `${String(reading.hue)}`,
    ).toEqual(reading.pairs.map((one) => `${one.at} exported=${one.screen}`))
  } finally {
    await app.close()
  }
})


const STARTUP_TEMPLATE = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)

const JSON_CODEC_MODULE = '/src/adapter/document-codec/json-codec.ts'

interface VersionReading {
  readonly refusal: string | null
  readonly greatest: string
  readonly own: string
  readonly later: string
  readonly asWritten: string
  readonly ahead: string
}

/** @purity semi-pure-b */
async function versionReadings(
  page: Page,
  names: { readonly greatest: string; readonly json: string; readonly module: string },
): Promise<VersionReading> {
  return page.evaluate(
    async (asked: { greatest: string; json: string; module: string }) => {
      const empty = { greatest: '', own: '', later: '', asWritten: '', ahead: '' }
      const api = (window as unknown as Record<string, Record<string, unknown> | undefined>)
        .grSchedulerAgentApi
      const greatest = api?.[asked.greatest]
      const json = api?.[asked.json]
      if (typeof greatest !== 'string' || typeof json !== 'function') {
        return { refusal: `the Agent API published neither ${asked.greatest} nor ${asked.json}`, ...empty }
      }
      const written = (json as () => unknown).call(api) as
        | { ok: true; value: string }
        | { ok: false; refusal: unknown }
      if (!written.ok) {
        return { refusal: `${asked.json} refused: ${JSON.stringify(written.refusal)}`, ...empty }
      }
      const codec = (await import(asked.module)) as {
        documentFromJson: (
          text: string,
          greatestKnownSchemaVersion?: string,
        ) => { ok: boolean; formatVersion?: string; reason?: string }
      }
      if (typeof codec.documentFromJson !== 'function') {
        return { refusal: `${asked.module} publishes no documentFromJson`, ...empty, greatest }
      }
      const parsed = JSON.parse(written.value) as Record<string, unknown>
      const own = typeof parsed.schemaVersion === 'string' ? parsed.schemaVersion : ''
      const later = `${String(Number(greatest.slice(0, 4)) + 1)}${greatest.slice(4)}`
      const reading = (text: string): string => {
        const out = codec.documentFromJson(text, greatest)
        return out.ok ? (out.formatVersion ?? 'no reading at all') : `refused: ${String(out.reason)}`
      }
      return {
        refusal: null,
        greatest,
        own,
        later,
        asWritten: reading(written.value),
        ahead: reading(JSON.stringify({ ...parsed, schemaVersion: later })),
      }
    },
    names,
  )
}

test('DFC-282: a document later than the build reads as newerThanKnown, and one that is not reads as known', async ({
  baseURL,
}) => {
  test.setTimeout(240_000)

  const bundled = JSON.parse(readFileSync(STARTUP_TEMPLATE, 'utf8')) as { schemaVersion?: unknown }
  expect(
    typeof bundled.schemaVersion,
    `${STARTUP_TEMPLATE} carries no schemaVersion, and it is the one FR-073 calls the greatest ` +
      'version this build knows',
  ).toBe('string')

  const app = await openTheApp(baseURL)
  try {
    await openTheAgentApi(app.page)
    const read = await versionReadings(app.page, {
      greatest: AM_2,
      json: AM_11,
      module: JSON_CODEC_MODULE,
    })
    expect(read.refusal, 'the open document could not be read back through the codec').toBeNull()
    expect(
      read.greatest,
      `AM-2 of table T-107 answers with the greatest version this build knows, and the bundled ` +
        `startup template is where it is read off -- a second copy of that value is what rule 03 ` +
        'forbids',
    ).toBe(bundled.schemaVersion)
    expect(
      read.own <= read.greatest,
      `the open document states ${read.own}, which is later than the ${read.greatest} the build ` +
        'knows, so the first reading below would not be the one this case means to press',
    ).toBe(true)
    expect(
      read.asWritten,
      `the open document states ${read.own} against the ${read.greatest} this build knows, and ` +
        'FR-073 (MUST) makes only a LATER version unreadable',
    ).toBe('known')
    expect(
      read.ahead,
      `a document stating ${read.later} is later than the ${read.greatest} this build knows, ` +
        'which is what FR-073 (MUST) settles as the unreadable case',
    ).toBe('newerThanKnown')
  } finally {
    await app.close()
  }
})


interface Tick {
  readonly row: string
  readonly serial: number
  readonly x: number
}

interface RulerReading {
  readonly ticks: readonly Tick[]
  readonly band: { readonly x: number; readonly width: number }
}

/** @purity semi-pure-b */
async function readRuler(page: Page, canvas: string): Promise<RulerReading> {
  return page.evaluate((selector: string) => {
    const svg = window.document.querySelector(selector)
    const ticks: { row: string; serial: number; x: number }[] = []
    let band = { x: 0, width: 0 }
    if (svg === null) return { ticks, band }
    for (const element of Array.from(svg.querySelectorAll('[data-figure]'))) {
      const key = element.getAttribute('data-figure') ?? ''
      if (key === 'ruler-ground') {
        const ground = element.getBoundingClientRect()
        band = { x: ground.x, width: ground.width }
        continue
      }
      const found = /^ruler-([A-Za-z]+)-tick-(-?\d+)$/.exec(key)
      if (found === null) continue
      const box = element.getBoundingClientRect()
      ticks.push({ row: found[1] ?? '', serial: Number(found[2]), x: box.x })
    }
    return { ticks, band }
  }, canvas)
}

interface TimeAxis {
  readonly pxPerDay: number
  readonly serialAtX: (x: number) => number
}

/** @purity pure */
function timeAxisOf(reading: RulerReading, what: string): TimeAxis {
  const rows = new Map<string, Tick[]>()
  for (const tick of reading.ticks) {
    const held = rows.get(tick.row) ?? []
    held.push(tick)
    rows.set(tick.row, held)
  }
  let best: Tick[] = []
  for (const held of rows.values()) if (held.length > best.length) best = held
  const sorted = [...best].sort((one, two) => one.serial - two.serial)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  if (first === undefined || last === undefined || first.serial === last.serial) {
    throw new Error(`${what}: the time ruler shows fewer than two ticks of any one row`)
  }
  const pxPerDay = (last.x - first.x) / (last.serial - first.serial)
  if (!Number.isFinite(pxPerDay) || pxPerDay <= 0) {
    throw new Error(`${what}: the time ruler's ticks describe no time axis (${String(pxPerDay)})`)
  }
  return {
    pxPerDay,
    /** @purity pure */
    serialAtX: (x: number): number => first.serial + (x - first.x) / pxPerDay,
  }
}

function dateOfSerial(serial: number): string {
  return new Date(serial * 86_400_000).toISOString().slice(0, 10)
}

function dayUnder(axis: TimeAxis, x: number): string {
  return dateOfSerial(Math.floor(axis.serialAtX(x)))
}

test('DFC-297: a zoom holds the date under the pointer, and the middle date when there is no pointer', async ({
  baseURL,
}) => {
  test.setTimeout(240_000)
  const app = await openTheApp(baseURL)
  const canvas = '[data-role="Schedule Canvas"] svg'
  try {
    const canvasBox = await app.page.evaluate((selector: string) => {
      const box = window.document.querySelector(selector)?.getBoundingClientRect()
      return box === undefined ? null : { x: box.x, y: box.y, width: box.width, height: box.height }
    }, canvas)
    expect(canvasBox, 'the Schedule Canvas is not on the screen').not.toBeNull()
    if (canvasBox === null) return

    const before = timeAxisOf(await readRuler(app.page, canvas), 'before the wheel')
    const band = (await readRuler(app.page, canvas)).band
    expect(band.width, 'the time ruler draws no ground, so the Row Area cannot be located').toBeGreaterThan(0)
    const roughly = band.x + band.width * 0.25
    const at = Math.round(
      band.x + (Math.floor((roughly - band.x) / before.pxPerDay) + 0.5) * before.pxPerDay,
    )
    const middle = band.x + band.width / 2
    expect(
      Math.abs(at - middle),
      `the point the wheel is turned at (${String(at)}) is the middle of the Row Area, so this ` +
        'case could not tell a pointer-centred zoom from a middle-centred one',
    ).toBeGreaterThan(before.pxPerDay)
    const heldByPointer = dayUnder(before, at)

    await app.page.mouse.move(at, Math.round(canvasBox.y + canvasBox.height / 2))
    await app.page.keyboard.down('Shift')
    await app.page.mouse.wheel(0, -120)
    await app.page.keyboard.up('Shift')
    await readSettledDrawnSvg(app.page)

    const afterWheel = timeAxisOf(await readRuler(app.page, canvas), 'after the wheel')
    expect(
      afterWheel.pxPerDay,
      `one notch of the wheel left a day ${String(before.pxPerDay)}px wide, so nothing was zoomed ` +
        'and holding the date still proves nothing',
    ).not.toBe(before.pxPerDay)
    expect(
      dayUnder(afterWheel, at),
      `FR-016 (MUST): the date under the pointer does not move. The wheel was turned at x=` +
        `${String(at)}, where a day was ${String(before.pxPerDay)}px wide and is now ` +
        `${String(afterWheel.pxPerDay)}px`,
    ).toBe(heldByPointer)

    await app.page.mouse.move(Math.round(band.x + band.width * 0.1), Math.round(canvasBox.y + canvasBox.height / 2))
    const beforeKey = timeAxisOf(await readRuler(app.page, canvas), 'before the key')
    const heldByMiddle = dayUnder(beforeKey, middle)
    await app.page.keyboard.press('Shift+Equal')
    await readSettledDrawnSvg(app.page)

    const afterKey = timeAxisOf(await readRuler(app.page, canvas), 'after the key')
    expect(
      afterKey.pxPerDay,
      `the keyboard zoom left a day ${String(beforeKey.pxPerDay)}px wide, so nothing was zoomed`,
    ).not.toBe(beforeKey.pxPerDay)
    expect(
      dayUnder(afterKey, middle),
      `FR-016 (MUST): a route that carries no pointer takes the middle of the Row Area as the ` +
        `centre, so the date at x=${String(Math.round(middle))} does not move. The pointer was ` +
        `parked at x=${String(Math.round(band.x + band.width * 0.1))}, where the date was ` +
        `${dayUnder(beforeKey, band.x + band.width * 0.1)}`,
    ).toBe(heldByMiddle)
  } finally {
    await app.close()
  }
})

const VISIBLE_DAY_FLOOR = numberIn(cellOf(T206, 'S-229', 1, 3), 'table T-206 row S-229')

/** @purity semi-pure-b */
async function visibleDaysNow(page: Page, canvas: string, what: string): Promise<number> {
  const reading = await readRuler(page, canvas)
  return reading.band.width / timeAxisOf(reading, what).pxPerDay
}

test('DFC-375: magnifying the date axis stops with S-229 days still on the screen', async ({
  baseURL,
}) => {
  test.setTimeout(240_000)
  const app = await openTheApp(baseURL)
  const canvas = '[data-role="Schedule Canvas"] svg'
  const wheelAway = async (times: number): Promise<void> => {
    for (let turn = 0; turn < times; turn++) {
      await app.page.keyboard.down('Shift')
      await app.page.mouse.wheel(0, -120)
      await app.page.keyboard.up('Shift')
      await app.page.waitForTimeout(40)
    }
    await readSettledDrawnSvg(app.page)
  }
  try {
    const canvasBox = await app.page.evaluate((selector: string) => {
      const box = window.document.querySelector(selector)?.getBoundingClientRect()
      return box === undefined ? null : { x: box.x, y: box.y, width: box.width, height: box.height }
    }, canvas)
    expect(canvasBox, 'the Schedule Canvas is not on the screen').not.toBeNull()
    if (canvasBox === null) return
    await app.page.mouse.move(
      Math.round(canvasBox.x + canvasBox.width / 2),
      Math.round(canvasBox.y + canvasBox.height / 2),
    )

    const before = await visibleDaysNow(app.page, canvas, 'before magnifying')
    expect(
      before,
      'the document opens with fewer days on the screen than the ceiling keeps, so magnifying ' +
        'it proves nothing',
    ).toBeGreaterThan(VISIBLE_DAY_FLOOR)
    await wheelAway(50)
    const wide = await readRuler(app.page, canvas)
    const wideDays = wide.band.width / timeAxisOf(wide, 'at the ceiling, wide window').pxPerDay
    expect(
      wideDays,
      `FR-016 (MUST): 「日付の軸（\`zoomX\`）の上限は、見えている範囲が ... 表 T-206 の ` +
        `\`S-229\` 日を下回らない倍率とすること（MUST）」. The Row Area is ` +
        `${String(Math.round(wide.band.width))}px wide and shows ${wideDays.toFixed(2)} days`,
    ).toBeGreaterThanOrEqual(VISIBLE_DAY_FLOOR - 0.01)
    await wheelAway(10)
    const further = await visibleDaysNow(app.page, canvas, 'past the ceiling, wide window')
    expect(
      further,
      `ten more notches took the screen from ${wideDays.toFixed(2)} days to ` +
        `${further.toFixed(2)}, so the magnification has no ceiling at all`,
    ).toBeGreaterThanOrEqual(VISIBLE_DAY_FLOOR - 0.01)

    await app.page.setViewportSize({ width: 1280, height: 900 })
    await readSettledDrawnSvg(app.page)
    await wheelAway(20)
    const narrow = await readRuler(app.page, canvas)
    const narrowAxis = timeAxisOf(narrow, 'at the ceiling, narrow window')
    const narrowDays = narrow.band.width / narrowAxis.pxPerDay
    expect(
      narrow.band.width,
      'the narrower window did not narrow the Row Area, so the two readings are one reading',
    ).toBeLessThan(wide.band.width)
    expect(
      narrowDays,
      `FR-016 (MUST): the promise is a number of DAYS and not a magnification. The Row Area is ` +
        `now ${String(Math.round(narrow.band.width))}px wide and shows ${narrowDays.toFixed(2)} days`,
    ).toBeGreaterThanOrEqual(VISIBLE_DAY_FLOOR - 0.01)
    expect(
      narrowAxis.pxPerDay,
      `FR-016 (MUST NOT): 「固定の倍率で止めてはならない」. A day is ` +
        `${narrowAxis.pxPerDay.toFixed(2)}px wide at the ceiling of the ` +
        `${String(Math.round(narrow.band.width))}px window and was ` +
        `${timeAxisOf(wide, 'wide').pxPerDay.toFixed(2)}px at the ceiling of the ` +
        `${String(Math.round(wide.band.width))}px one -- one magnification for both widths is ` +
        'the fixed ceiling the requirement forbids',
    ).toBeLessThan(timeAxisOf(wide, 'wide').pxPerDay)
  } finally {
    await app.close()
  }
})

/** @purity semi-pure-b */
async function rowBandsNow(page: Page): Promise<
  readonly { readonly id: string; readonly y: number; readonly height: number;
             readonly isCut: boolean }[]
> {
  return page.evaluate(() =>
    [...window.document.querySelectorAll('[data-group-id][data-depth]')]
      .map((row) => {
        const box = row.getBoundingClientRect()
        return {
          id: row.getAttribute('data-group-id') ?? '',
          y: box.y,
          height: box.height,
          isCut: row.getAttribute('data-truncated') === 'true',
        }
      })
      .sort((first, second) => first.y - second.y))
}

/** @purity semi-pure-b */
async function canvasBoxNow(page: Page): Promise<
  { readonly x: number; readonly y: number; readonly width: number;
    readonly height: number } | null
> {
  return page.evaluate((selector: string) => {
    const box = window.document.querySelector(selector)?.getBoundingClientRect()
    return box === undefined ? null : { x: box.x, y: box.y, width: box.width, height: box.height }
  }, CANVAS)
}

/** @purity pure */
function tallestBandOf(
  bands: readonly { readonly height: number }[],
): number {
  return bands.reduce((most, band) => (band.height > most ? band.height : most), 0)
}

/** @purity pure */
function rowPitchOf(
  bands: readonly { readonly y: number }[],
): number | null {
  const first = bands[0]
  const second = bands[1]
  return first === undefined || second === undefined ? null : second.y - first.y
}

/** @purity pure */
function rowAreaSpanOf(
  bands: readonly { readonly y: number; readonly height: number }[],
): number {
  if (bands.length === 0) return 0
  const top = Math.min(...bands.map((band) => band.y))
  const bottom = Math.max(...bands.map((band) => band.y + band.height))
  return bottom - top
}

// see FR-016, FR-077, FR-094, S-4, S-5, S-7, S-13, S-36, S-38
const T201_COLUMNS = 7
const T201_DEFAULT = 3

/** @purity pure */
function drawingSettingOf(rowId: string): number {
  return numberIn(cellOf(T201, rowId, T201_DEFAULT, T201_COLUMNS), `table T-201 row ${rowId}`)
}

const RECTANGLE_NAME_PX_AT_ONE =
  drawingSettingOf('S-4') * drawingSettingOf('S-13') * drawingSettingOf('S-5') *
  drawingSettingOf('S-7')

// see FR-039, T-252, DS-1, S-4, S-13
const DRAWN_PLAN_BAR_PX = drawingSettingOf('S-4') * drawingSettingOf('S-13') * DEFAULT_DISPLAY_RATIO

// WHY: a browser hands back a drawn length already rounded, so the floor is let
// WHY: down by half a pixel -- still well above the S-5 actual bar under it.
const DRAWN_PLAN_BAR_FLOOR_PX = DRAWN_PLAN_BAR_PX - 0.5

// see FR-039, T-252, DS-1
const DRAWN_RECTANGLE_NAME_PX_AT_ONE = RECTANGLE_NAME_PX_AT_ONE * DEFAULT_DISPLAY_RATIO

const DEPTH_ONE_ROW_NAME_PX = drawingSettingOf('S-36') * drawingSettingOf('S-38')

const TEXT_CEILING_ZOOM_Y = DEPTH_ONE_ROW_NAME_PX / RECTANGLE_NAME_PX_AT_ONE

const NAME_PX_TOLERANCE = 0.02

/** @purity semi-pure-b */
async function nameLabelFontsNow(page: Page): Promise<Readonly<Record<string, number>>> {
  return page.evaluate((selector: string) => {
    const fonts: Record<string, number> = {}
    const svg = window.document.querySelector(selector)
    if (svg === null) return fonts
    for (const element of Array.from(svg.querySelectorAll('[data-figure]'))) {
      const key = element.getAttribute('data-figure') ?? ''
      if (!/^task-\d+-label$/.test(key)) continue
      const text = element.tagName.toLowerCase() === 'text' ? element : element.querySelector('text')
      if (text !== null) fonts[key] = Number.parseFloat(getComputedStyle(text).fontSize)
    }
    return fonts
  }, CANVAS)
}

/** @purity pure */
function fontsOfKeys(
  fonts: Readonly<Record<string, number>>,
  keys: readonly string[],
): readonly number[] {
  return keys.flatMap((key) => (fonts[key] === undefined ? [] : [fonts[key] ?? 0]))
}

test('DFC-374: magnifying the row axis stops before one row fills the Row Area', async ({
  baseURL,
}) => {
  test.setTimeout(240_000)
  const app = await openTheApp(baseURL)
  const wheelBy = async (times: number, deltaY: number): Promise<void> => {
    for (let turn = 0; turn < times; turn++) {
      await app.page.keyboard.down('Alt')
      await app.page.mouse.wheel(0, deltaY)
      await app.page.keyboard.up('Alt')
      await app.page.waitForTimeout(35)
    }
    await readSettledDrawnSvg(app.page)
  }
  const wheelAway = async (times: number): Promise<void> => wheelBy(times, -120)
  try {
    const canvasBox = await canvasBoxNow(app.page)
    expect(canvasBox, 'the Schedule Canvas is not on the screen').not.toBeNull()
    if (canvasBox === null) return
    await app.page.mouse.move(
      Math.round(canvasBox.x + canvasBox.width / 2),
      Math.round(canvasBox.y + canvasBox.height / 2),
    )

    const opened = await rowBandsNow(app.page)
    expect(opened.length, 'the document opens drawing fewer than three rows').toBeGreaterThan(2)
    const openedFonts = await nameLabelFontsNow(app.page)
    const rectangles = Object.keys(openedFonts).filter(
      (key) =>
        Math.abs((openedFonts[key] ?? 0) - DRAWN_RECTANGLE_NAME_PX_AT_ONE) < NAME_PX_TOLERANCE,
    )
    expect(
      rectangles.length,
      `no name label opens at ${DRAWN_RECTANGLE_NAME_PX_AT_ONE.toFixed(4)}px (S-4 x S-13 x S-5 x ` +
        'S-7 at the zoomY of 1 that S-76 opens with, drawn once at the ratio FR-039 (MUST) gives ' +
        '-- 「描く比は、`S-234` を 100 で割り、同書の 表 T-206 の `S-236` を掛けた値とすること（MUST）」' +
        '), so no rectangle can be told from the drawing',
    ).toBeGreaterThan(0)
    await wheelAway(45)
    const tall = await rowBandsNow(app.page)
    const tallFonts = fontsOfKeys(await nameLabelFontsNow(app.page), rectangles)
    expect(tallFonts.length, 'no rectangle drawn at the opening is still drawn after the wheel')
      .toBeGreaterThan(0)
    const expectedAtTextCeiling = DRAWN_RECTANGLE_NAME_PX_AT_ONE * TEXT_CEILING_ZOOM_Y
    const worstAtTextCeiling = Math.max(
      ...tallFonts.map((font) => Math.abs(font - expectedAtTextCeiling)),
    )
    expect(
      worstAtTextCeiling,
      `FR-016 (MUST): 「行の軸の上限は、上の倍率と、次の倍率の小さい方とすること（MUST）」 —— ` +
        `「矩形（\`_assets/tbl-settings.md\` の 表 T-201 の \`S-13\`）のタスクの名称ラベルの字が、` +
        `深さ 1 の行の名前の字（同表の \`S-36\` × \`S-38\`）に等しくなる倍率である」. On the ` +
        `1080px window the band ceiling is the larger, so the stop is zoomY ` +
        `${TEXT_CEILING_ZOOM_Y.toFixed(4)} and a rectangle's name ${expectedAtTextCeiling.toFixed(2)}px; ` +
        `the rectangles read ${tallFonts.map((font) => font.toFixed(2)).join(', ')}px ` +
        `(「形状によらず矩形で測ること（MUST）」)`,
    ).toBeLessThan(NAME_PX_TOLERANCE)
    expect(
      tall.filter((band) => band.isCut).length,
      `FR-016 (MUST NOT): 「切られた名前の印を、この上限の信号にしてはならない（MUST NOT）」. ` +
        'The magnifying settled with no cut row name standing, so this build cannot be told ' +
        'apart from one that stopped when the mark cleared',
    ).toBeGreaterThan(0)
    const tallPitch = rowPitchOf(tall)
    expect(
      tallestBandOf(tall),
      `forty-five notches of MK-4 left the tallest band at ${tallestBandOf(opened).toFixed(1)}px, ` +
        'so nothing was zoomed and a ceiling proves nothing',
    ).toBeGreaterThan(tallestBandOf(opened))
    expect(
      tall.length,
      `FR-016 (MUST): 「行の軸（\`zoomY\`）の上限は、いちばん高い行の帯が \`Row Area\` の高さに` +
        `達する倍率とすること（MUST）」. Forty-five notches of MK-4 left ${String(tall.length)} ` +
        `row(s) on a ${String(canvasBox.height)}px canvas, the tallest reading ` +
        `${tallestBandOf(tall).toFixed(1)}px -- past the ceiling the magnifying goes on until ` +
        'one row fills the screen alone',
    ).toBeGreaterThan(1)
    await wheelAway(10)
    const further = rowPitchOf(await rowBandsNow(app.page))
    expect(tallPitch, 'two bands are needed to measure a pitch and only one was drawn')
      .not.toBeNull()
    expect(
      further,
      `ten more notches took the row pitch from ${String(tallPitch)} to ${String(further)}, so ` +
        'the magnification has no ceiling at all',
    ).toBeCloseTo(tallPitch ?? 0, 0)

    await app.page.setViewportSize({ width: 1920, height: 700 })
    await readSettledDrawnSvg(app.page)
    await wheelAway(25)
    const short = await rowBandsNow(app.page)
    expect(
      short.length,
      `the short window settled with ${String(short.length)} row(s), so the ceiling did not ` +
        'fire there either',
    ).toBeGreaterThan(1)
    const tallArea = rowAreaSpanOf(tall)
    const shortArea = rowAreaSpanOf(short)
    expect(
      tallestBandOf(tall),
      `FR-016 (MUST): 「行の軸（\`zoomY\`）の上限は、いちばん高い行の帯が \`Row Area\` の高さに` +
        `達する倍率とすること（MUST）」. The tallest band on the 1080px window reads ` +
        `${tallestBandOf(tall).toFixed(2)}px against a ${tallArea.toFixed(2)}px Row Area -- a ` +
        'band that fills the area at both ends is a band the area cut, which is what a build ' +
        'with no ceiling settles at',
    ).toBeLessThan(tallArea)
    expect(
      tallestBandOf(short),
      `FR-016 (MUST): the same on the 700px window: ${tallestBandOf(short).toFixed(2)}px ` +
        `against a ${shortArea.toFixed(2)}px Row Area`,
    ).toBeLessThan(shortArea)
    expect(
      shortArea,
      `the shorter window did not shorten the Row Area (${shortArea.toFixed(2)}px against ` +
        `${tallArea.toFixed(2)}px), so the two readings are one reading`,
    ).toBeLessThan(tallArea)

    // WHY: the text ceiling does not read the window, so only a window short
    // WHY: enough for the band ceiling to be the smaller one can show the band
    // WHY: ceiling at work; 400px was measured to be one, 300px zooms not at all.
    // see FR-016, T-025, MC-6
    await app.page.setViewportSize({ width: 1920, height: 400 })
    await readSettledDrawnSvg(app.page)
    const lowBox = await canvasBoxNow(app.page)
    expect(lowBox, 'the Schedule Canvas is not on the 400px window').not.toBeNull()
    if (lowBox === null) return
    await app.page.mouse.move(
      Math.round(lowBox.x + lowBox.width / 2),
      Math.round(lowBox.y + lowBox.height / 2),
    )
    await wheelBy(45, 120)
    await wheelAway(45)
    const low = await rowBandsNow(app.page)
    const lowFonts = fontsOfKeys(await nameLabelFontsNow(app.page), rectangles)
    expect(lowFonts.length, 'no rectangle drawn at the opening is drawn on the 400px window')
      .toBeGreaterThan(0)
    expect(
      Math.min(...lowFonts),
      `the 400px window settled with rectangle names of ${lowFonts.map((f) => f.toFixed(2)).join(', ')}px, ` +
        `no larger than the ${DRAWN_RECTANGLE_NAME_PX_AT_ONE.toFixed(2)}px of zoomY 1, so nothing ` +
        'was zoomed and which ceiling stopped it cannot be read',
    ).toBeGreaterThan(DRAWN_RECTANGLE_NAME_PX_AT_ONE + NAME_PX_TOLERANCE)
    expect(
      Math.max(...lowFonts),
      `FR-016 (MUST): 「行の軸の上限は、上の倍率と、次の倍率の小さい方とすること（MUST）」; ` +
        `FR-016 (MUST NOT): 「このために新しい設定値の行を立ててはならない（MUST NOT）」 —— ` +
        `「画面の高さから導く。」 On a 400px window the rectangle names settle at ` +
        `${lowFonts.map((f) => f.toFixed(2)).join(', ')}px against the ` +
        `${expectedAtTextCeiling.toFixed(2)}px of the text ceiling -- the band ceiling read off ` +
        'this screen is the smaller one here; a build with the text ceiling alone, or with no ' +
        'ceiling, reaches the text ceiling or passes it',
    ).toBeLessThan(expectedAtTextCeiling - NAME_PX_TOLERANCE)
    expect(
      tallestBandOf(low),
      `FR-016 (MUST): on the 400px window the tallest band reads ${tallestBandOf(low).toFixed(2)}px ` +
        `against a ${rowAreaSpanOf(low).toFixed(2)}px Row Area`,
    ).toBeLessThan(rowAreaSpanOf(low))
    const lowByKey = await nameLabelFontsNow(app.page)
    await wheelAway(10)
    const furtherByKey = await nameLabelFontsNow(app.page)
    const heldKeys = rectangles.filter(
      (key) => lowByKey[key] !== undefined && furtherByKey[key] !== undefined,
    )
    const lowFurther = fontsOfKeys(furtherByKey, heldKeys)
    expect(heldKeys.length, 'no rectangle stayed drawn through the ten further notches')
      .toBeGreaterThan(0)
    expect(
      Math.max(...heldKeys.map((key) => Math.abs((furtherByKey[key] ?? 0) - (lowByKey[key] ?? 0)))),
      `ten more notches on the 400px window took the rectangle names from ` +
        `${lowFonts.map((f) => f.toFixed(2)).join(', ')}px to ` +
        `${lowFurther.map((f) => f.toFixed(2)).join(', ')}px, so the band ceiling does not hold`,
    ).toBeLessThan(NAME_PX_TOLERANCE)
  } finally {
    await app.close()
  }
})

const TRANSLATOR_SOURCE = join(
  process.cwd(), 'src', 'adapter', 'input-command-translator', 'input-command-translator.ts',
)

test('DFC-366: one notch of the row-axis zoom leaves the row under the pointer where it was', async ({
  baseURL,
}) => {
  test.setTimeout(240_000)
  const app = await openTheApp(baseURL)
  try {
    const canvasBox = await canvasBoxNow(app.page)
    expect(canvasBox, 'the Schedule Canvas is not on the screen').not.toBeNull()
    if (canvasBox === null) return
    const before = await rowBandsNow(app.page)
    expect(before.length, 'the document draws fewer than four rows to choose from')
      .toBeGreaterThan(3)
    const held = before[3]
    expect(held, 'the fourth row is not on the screen').not.toBeUndefined()
    if (held === undefined) return
    const at = Math.round(held.y + held.height / 2)

    await app.page.mouse.move(Math.round(canvasBox.x + canvasBox.width * 0.6), at)
    await app.page.keyboard.down('Alt')
    await app.page.mouse.wheel(0, -120)
    await app.page.keyboard.up('Alt')
    await readSettledDrawnSvg(app.page)

    const after = await rowBandsNow(app.page)
    const sameRow = after.find((band) => band.id === held.id)
    expect(
      sameRow,
      `the row the pointer was over (${held.id}) is no longer drawn after one notch`,
    ).not.toBeUndefined()
    if (sameRow === undefined) return
    expect(
      sameRow.height,
      `one notch of MK-4 left the band ${held.height.toFixed(1)}px tall, so nothing was zoomed ` +
        'and holding the row still proves nothing',
    ).not.toBe(held.height)
    const into = (at - held.y) / held.height
    const nowAt = sameRow.y + into * sameRow.height
    expect(
      Math.abs(nowAt - at),
      `FR-016 (MUST): 「ズームはポインタ位置を中心とし、カーソル下の日付と行が動かないこと` +
        `（MUST）」 and 「倍率を変えたとき、行の軸でも掴んだ行を留めること（MUST）」. The wheel ` +
        `was turned at y=${String(at)}, where the band was ${held.height.toFixed(1)}px and is ` +
        `now ${sameRow.height.toFixed(1)}px; the point under the pointer has moved to ` +
        `y=${nowAt.toFixed(1)}`,
    ).toBeLessThanOrEqual(4)

    const translator = readFileSync(TRANSLATOR_SOURCE, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|\n)[ \t]*\/\/[^\n]*/g, '$1')
    expect(
      /\blayoutFromSchedule\b/.test(translator),
      `FR-016 (MUST NOT): 「Adapter に自前の割付けをさせてはならない（MUST NOT）」. ` +
        'input-command-translator.ts names layoutFromSchedule outside its comments, so the ' +
        'Adapter is laying the schedule out for itself instead of asking PI-5 where the rows ' +
        'will be',
    ).toBe(false)
  } finally {
    await app.close()
  }
})


const HELD: readonly string[] = [
  'DFC-34',
  'DFC-45',
  'DFC-72',
  'DFC-87',
  'DFC-160',
  'DFC-277',
  'DFC-282',
  'DFC-297',
  'DFC-366',
  'DFC-374',
  'DFC-375',
]

const LEDGERS: readonly string[] = ['defects.md', 'fixed-defects.md']

test('every ledger row this file holds down is still a row of the ledger', () => {
  const written = LEDGERS.map((file) =>
    readFileSync(join(process.cwd(), 'docs', 'development-records', file), 'utf8'),
  )
  for (const row of HELD) {
    expect(
      written.some((ledger) => ledger.includes(`| ${row} |`)),
      `${row} has a case in this file but is a row of neither ${LEDGERS.join(' nor ')} under ` +
        'docs/development-records/',
    ).toBe(true)
  }
  expect(new Set(HELD).size, 'two entries name the same ledger row').toBe(HELD.length)
})

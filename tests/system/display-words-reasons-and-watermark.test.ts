// Four rows of the defect ledger whose build had landed and whose test had not,

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { specTable, type SpecTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'


const T025: SpecTable = specTable('T-025')
const T103: SpecTable = specTable('T-103')
const T233: SpecTable = specTable('T-233')
const T234: SpecTable = specTable('T-234')

const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

/** @purity pure */
function cellOf(table: SpecTable, id: string, column: number, columns: number): string {
  const row = rowOf(table, id)
  if (row.cells.length !== columns) {
    throw new Error(
      `table ${table.id} row ${id} has ${row.cells.length} cells after the row ID, not the ` +
        `${columns} this file reads by position -- a column was added or taken away`,
    )
  }
  return row.cells[column] ?? ''
}

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

function dictionaryWordings(): readonly Wording[] {
  return wordingsIn(JSON.parse(readFileSync(DICTIONARY, 'utf8')), 'display-words')
}

/** @purity semi-pure-b */
function dictionaryTextOf(section: string, rowId: string, language: string): string {
  const shape = JSON.parse(readFileSync(DICTIONARY, 'utf8')) as Record<string, unknown>
  const rows = shape[section]
  if (!Array.isArray(rows)) {
    throw new Error(`${DICTIONARY} holds no section named ${section}`)
  }
  for (const row of rows as readonly Record<string, unknown>[]) {
    if (row['rowId'] !== rowId) continue
    const text = row['text']
    if (text !== null && typeof text === 'object') {
      const said = (text as Record<string, unknown>)[language]
      if (typeof said === 'string' && said.length > 0) return said
    }
    throw new Error(`${DICTIONARY} row ${rowId} holds no ${language} text`)
  }
  throw new Error(`${DICTIONARY} section ${section} holds no row ${rowId}`)
}


const FULL_STOP = String.fromCharCode(0x3002)
const QUOTE_OPEN = String.fromCharCode(0x300c)
const QUOTE_SHUT = String.fromCharCode(0x300d)

interface BannedShortening {
  readonly settled: string
  readonly banned: string
}

/** @purity pure */
function bannedShorteningOf(cell: string, rowId: string): BannedShortening {
  const settled = cell.split(FULL_STOP)[0]?.trim() ?? ''
  const opened = cell.indexOf(QUOTE_OPEN)
  const shut = cell.indexOf(QUOTE_SHUT, opened + 1)
  const banned = opened < 0 || shut < 0 ? '' : cell.slice(opened + 1, shut).trim()
  if (settled.length === 0 || banned.length === 0) {
    throw new Error(
      `table T-103 row ${rowId} does not read as "settled term, then a quoted spelling": ` +
        JSON.stringify(cell),
    )
  }
  if (!settled.startsWith(banned) || settled === banned) {
    throw new Error(
      `table T-103 row ${rowId} bans ${JSON.stringify(banned)}, which is not a shortening of the ` +
        `settled term ${JSON.stringify(settled)} -- this file reads the row wrongly`,
    )
  }
  return { settled, banned }
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

/** @purity pure */
function shortens(text: string, ban: BannedShortening): boolean {
  for (let at = text.indexOf(ban.banned); at >= 0; at = text.indexOf(ban.banned, at + 1)) {
    if (text.slice(at, at + ban.settled.length) !== ban.settled) return true
  }
  return false
}


const REASON_ROWS: readonly string[] = T233.rows.map((row) => row.id)

const QUOTED_REASON = /['"](RS-\d+)['"]/g

function typescriptFilesUnder(directory: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) out.push(...typescriptFilesUnder(path))
    else if (entry.name.endsWith('.ts')) out.push(path)
  }
  return out
}

interface QuotedReason {
  readonly id: string
  readonly file: string
}

/** @purity semi-pure-b */
function quotedReasons(): QuotedReason[] {
  const out: QuotedReason[] = []
  for (const file of typescriptFilesUnder(join(process.cwd(), 'src'))) {
    const text = readFileSync(file, 'utf8')
    for (const found of text.matchAll(QUOTED_REASON)) {
      out.push({ id: found[1] ?? '', file })
    }
  }
  return out
}


const INSTANT_SHAPE = 'YYYY-MM-DDThh:mm:ssZ'
const INSTANT = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/

function statementOfFr020(): string {
  const text = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
  const lines = text.split('\n')
  const at = lines.indexOf('**UID**: FR-020')
  if (at < 0) throw new Error('01-04-requirements.md holds no requirement FR-020')
  const said = lines.slice(at, at + 8).find((line) => line.startsWith('**STATEMENT**'))
  if (said === undefined) throw new Error('FR-020 has no STATEMENT this file can read')
  return said
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

const WATERMARK = '[data-role="Watermark"]'
const CONFIRMATION = '[data-role="Confirmation"]'
const ANSWER = '[data-confirmation-answer]'

/** @purity non-pure */
async function pressEntrance(page: Page, entrance: string): Promise<boolean> {
  const box = await page.evaluate((id: string) => {
    const element = document.querySelector(`[data-icon="${id}"]`)
    if (element === null) return null
    const found = element.getBoundingClientRect()
    if (found.width < 1 || found.height < 1) return null
    return { x: found.x, y: found.y, width: found.width, height: found.height }
  }, entrance)
  if (box === null) return false
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(700)
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

async function readWatermarkInstant(page: Page): Promise<string | null> {
  const said = await page.evaluate(
    (selector: string) =>
      document.querySelector(`${selector} text`)?.textContent ?? null,
    WATERMARK,
  )
  if (said === null) return null
  return INSTANT.exec(said)?.[0] ?? null
}

async function readDrawingWithoutWatermark(page: Page): Promise<string> {
  const drawn = await readSettledDrawnSvg(page)
  return drawn.replace(new RegExp(INSTANT.source, 'g'), '')
}


test('DFC-308: no word the screen can print shortens the term U-14 settles', async ({ baseURL }) => {
  test.setTimeout(180_000)

  const T103_COLUMNS = 2
  const JAPANESE_COLUMN = 1
  const ban = bannedShorteningOf(cellOf(T103, 'U-14', JAPANESE_COLUMN, T103_COLUMNS), 'U-14')

  const wordings = dictionaryWordings()
  expect(
    wordings.filter((one) => shortens(one.text, ban)).map((one) => `${one.at}: ${one.text}`),
    `${DICTIONARY} shortens the term table T-103 row U-14 settles, which the row forbids ` +
      '(MUST NOT)',
  ).toEqual([])
  expect(
    wordings.filter((one) => one.text.includes(ban.settled)).length,
    'the dictionary writes the settled term nowhere at all, so this case would pass on an empty ' +
      'dictionary just as well',
  ).toBeGreaterThan(0)

  const app = await openTheApp(baseURL, 'ja-JP')
  try {
    expect(await pressEntrance(app.page, 'IC-62'), 'IC-62 is not on the screen').toBe(true)
    const shown = await readScreenTexts(app.page)
    expect(
      shown.filter(isJapanese).length,
      'the running application put no Japanese words on the screen at all, so the walk below ' +
        'proves nothing -- it did not open in Japanese',
    ).toBeGreaterThan(1)
    expect(
      shown.filter((text) => shortens(text, ban)),
      'the running application printed the shortening table T-103 row U-14 forbids',
    ).toEqual([])
  } finally {
    await app.close()
  }
})


test('DFC-340: the question IC-66 raises is QN-3, asked of the whole selection', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)

  const T234_COLUMNS = 3
  expect(
    cellOf(T234, 'QN-3', 0, T234_COLUMNS).length,
    'table T-234 row QN-3 states no scene',
  ).toBeGreaterThan(0)
  const asked = dictionaryTextOf('questions', 'QN-3', 'ja')

  const app = await openTheApp(baseURL, 'ja-JP')
  try {
    expect(await pressEntrance(app.page, 'IC-62'), 'IC-62 is not on the screen').toBe(true)
    const roster = await app.page.evaluate(
      () => document.querySelector('[data-role="Resource Roster"]')?.textContent?.trim() ?? null,
    )
    expect(roster, 'the roster FR-099 requires did not come up, so IC-66 has nothing to act on')
      .not.toBeNull()

    expect(await pressEntrance(app.page, 'IC-63'), 'IC-63 is not on the screen').toBe(true)
    expect(await pressEntrance(app.page, 'IC-66'), 'IC-66 is not on the screen').toBe(true)

    const confirmation = await app.page.evaluate(
      (selector: string) => document.querySelector(selector)?.textContent?.trim() ?? null,
      CONFIRMATION,
    )
    expect(
      confirmation,
      'deleting the chosen resources raised no confirmation, so table T-234 row QN-3 and the ' +
        'MUST of FR-099 were never reached',
    ).not.toBeNull()
    if (confirmation === null) return

    expect(
      confirmation.startsWith(asked),
      `the confirmation does not open with the sentence the manuscript holds for QN-3 ` +
        `(${JSON.stringify(asked)}); it says ${JSON.stringify(confirmation.slice(0, 120))}`,
    ).toBe(true)

    const named = confirmation.slice(asked.length).trim()
    expect(
      named.length,
      'the confirmation carries nothing after the question, so it names no task -- FR-099 (MUST) ' +
        'requires the names of the tasks whose assignments are released',
    ).toBeGreaterThan(0)
    expect(
      /^[\s\d,.]*$/.test(named),
      `everything the confirmation adds to the question is a number (${JSON.stringify(named)}), ` +
        'which is the very thing FR-099 forbids (MUST NOT): 件数だけを示してはならない',
    ).toBe(false)

    const answers = await app.page.evaluate(
      (selector: string) =>
        Array.from(document.querySelectorAll(selector)).map((element) =>
          (element.textContent ?? '').trim(),
        ),
      ANSWER,
    )
    expect(
      answers,
      'the confirmation does not offer the two answers table T-037 row NT-7 requires, spelled ' +
        'the way it requires them in every display language',
    ).toEqual(['Yes', 'No'])
  } finally {
    await app.close()
  }
})


test('DFC-341: no reason the product can carry is missing from table T-233', () => {
  const quoted = quotedReasons()
  expect(
    quoted.length,
    'no reason ID is quoted anywhere under src/, so this case would pass on an empty tree',
  ).toBeGreaterThan(20)

  const unseated = quoted.filter((one) => !REASON_ROWS.includes(one.id))
  expect(
    [...new Set(unseated.map((one) => `${one.id} (${one.file})`))],
    'the product tree can carry a reason table T-233 does not hold -- table T-037 forbids it ' +
      '(MUST NOT), and RS-15 is the seat the table gives a reason that has no row of its own',
  ).toEqual([])

  expect(
    REASON_ROWS,
    'table T-233 no longer holds RS-15, which table T-037 names as the seat for a reason with no ' +
      'row of its own',
  ).toContain('RS-15')

  const words = new Set(
    (JSON.parse(readFileSync(DICTIONARY, 'utf8')) as { reasons?: { rowId?: string }[] }).reasons?.map(
      (one) => one.rowId ?? '',
    ) ?? [],
  )
  expect(
    [...new Set(quoted.map((one) => one.id))].filter((id) => !words.has(id)),
    'a reason the product can carry has no word in the dictionary, so the notice would be raised ' +
      'with nothing to say -- table T-037 (MUST) has a row and its word added together',
  ).toEqual([])

  expect(REASON_ROWS, 'RS-45 is back in table T-233; this case was written for its absence')
    .not.toContain('RS-45')
  expect(words.has('RS-45'), 'the dictionary holds a word for the retired reason RS-45').toBe(false)
  expect(
    quoted.filter((one) => one.id === 'RS-45').map((one) => one.file),
    'the product tree still writes the retired reason RS-45 as a string',
  ).toEqual([])
})


test('DFC-354: the watermark is stamped when the document opens and when it changes', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)

  expect(
    statementOfFr020(),
    `FR-020 no longer spells the instant as ${INSTANT_SHAPE}, so the shape this case matches ` +
      'against is not the one the requirement asks for',
  ).toContain(INSTANT_SHAPE)

  const app = await openTheApp(baseURL)
  try {
    const opened = await readWatermarkInstant(app.page)
    expect(
      opened,
      'the watermark carries no instant of the shape FR-020 names, so the requirement is not met ' +
        'at the first of its two moments (文書を開いたとき)',
    ).not.toBeNull()
    const beforeEdit = await readDrawingWithoutWatermark(app.page)

    await app.page.waitForTimeout(2_500)
    expect(
      await readWatermarkInstant(app.page),
      'the watermark moved while nothing was edited, so the clock is being read per frame -- ' +
        'FR-020 forbids it (MUST NOT), and two frames of one schedule would draw differently',
    ).toBe(opened)

    expect(await pressEntrance(app.page, 'IC-93'), 'IC-93 is not on the screen').toBe(true)
    const afterEdit = await readDrawingWithoutWatermark(app.page)
    expect(
      afterEdit === beforeEdit,
      'pressing IC-93 left the drawing unchanged, so the document did not change and this case ' +
        'never reached the second of the two moments FR-020 names',
    ).toBe(false)
    expect(
      await readWatermarkInstant(app.page),
      'the watermark still carries the instant it was stamped with when the document was opened, ' +
        'though the document has since changed -- FR-020 (MUST) makes 文書が変わったとき the ' +
        'second of the two moments the instant is settled at',
    ).not.toBe(opened)
  } finally {
    await app.close()
  }
})

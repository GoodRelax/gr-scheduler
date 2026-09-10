// Four rows of the defect ledger whose build had landed and whose test had not,
// measured by a reader who was allowed `docs/spec/` and nothing else.
//
//   D-308  a word the screen prints must not shorten `Comment Boxes` the way
//          `U-14` of table T-103 (`_assets/tbl-glossary.md`) forbids. `FR-038`
//          (MUST) makes `_source/display-words.json` the one home of every word
//          the screen prints, so the whole of the answer is countable there.
//
//   D-340  the question `IC-66` raises stands for the WHOLE of what is chosen.
//          Table T-234 row `QN-3` settles the scene, `FR-099` (MUST) has the
//          released assignments' task names shown and (MUST NOT) forbids a bare
//          count, and table T-037 row `NT-7` (MUST) has the two answers spelled
//          `Yes` / `No` in every display language.
//
//   D-341  every reason the product can carry is a row of table T-233. The rule
//          is the sentence that closes table T-037: 通知が運ぶ理由は 表 T-233 の
//          行とすること（MUST）。同表に無い理由を運んではならない（MUST NOT）,
//          with `RS-15` named there as the seat for a reason that has no row.
//          `RS-45` left table T-233 on 2026-09-04 and is the row this case is
//          really about.
//
//   D-354  the watermark's instant is stamped when the document is opened and
//          when it changes, and at no other moment. `FR-020` (MUST) names those
//          two moments and (MUST NOT) forbids reading the clock every frame.
//
// ⛔ NO SENTENCE OF THE MANUSCRIPT IS QUOTED OR TRANSLATED AS AN EXPECTED
// VALUE. Every word compared against the running application is read out of
// `docs/spec` at read time -- the abbreviation `U-14` bans and the term it bans
// it in favour of are parsed out of `U-14`'s own cell, the question is taken
// from `_source/display-words.json` by its row ID, and the reason IDs allowed
// are the rows of table T-233. Moving any of them in the manuscript moves this
// file with it, which is what Chapter 1.9 (:275) asks of a test that verifies a
// requirement pointing at a table.
//
// ⛔ NOTHING HERE IS AN EXPECTED VALUE COPIED OUT OF `src/`. One case reads
// `src/` as TEXT -- it collects the reason IDs the tree quotes, so that they can
// be judged against table T-233 -- but the set of admissible values comes only
// from the manuscript, and the case fails when the tree names something the
// table does not hold.
//
// ⛔ NO `swsCase` IS DECLARED. Table T-219 row `TW-2` has Chapter 9's cases
// generated from those declarations and hung from an `SWS-xxx` node of Chapter
// 6.1, and none of today's `SWS-` nodes is about a dictionary word, a
// confirmation's number, a notice's reason or the watermark's instant. The rows
// each case leans on are named in prose at the case instead, the way
// `tests/system/user-reported-fixes.test.ts` does.
//
// ⚠️ THIS FILE IS PLAYWRIGHT'S, NOT VITEST'S. Table T-218 puts `tests/system/`
// under Playwright (`playwright.config.ts`), and `vitest.config.ts` includes
// only `tests/contract/`, `tests/integration/` and `tests/unit/`. Measured:
// `npx vitest run` on a path under `tests/system/` reports "No test files
// found". Run it with `npx playwright test tests/system/<this file>`.
//
// ⭐ EACH CASE SAYS WHAT WOULD MAKE IT GO RED, in the sentence above its body.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { specTable, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

// ---------------------------------------------------------------------------
// What the specification says, read at read time
// ---------------------------------------------------------------------------

const T025: SpecTable = specTable('T-025')
const T103: SpecTable = specTable('T-103')
const T233: SpecTable = specTable('T-233')
const T234: SpecTable = specTable('T-234')

/** The screen of the base environment: table T-025, row `MC-6`. */
const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

/**
 * One cell of a row, taken by position, with the table's shape guarded.
 *
 * ⭐ By position and not by heading: the headings of these tables are Japanese
 * and rule 03 section 5 keeps this tree ASCII. A table that gains or loses a
 * column fails loudly here rather than silently reading the wrong cell.
 *
 * @purity pure
 */
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

/** The manuscript `FR-038` (MUST) makes the one home of every word the screen prints. */
const DICTIONARY = join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json')

/** One string of the dictionary, and where in it that string lives. */
interface Wording {
  readonly at: string
  readonly text: string
}

/**
 * Every string the dictionary holds, wherever it sits in the shape.
 *
 * ⚠️ `$comment` is skipped: it is the manuscript talking to its reader, and
 * nothing in it is printed. `tests/system/user-reported-fixes.test.ts` walks the
 * same file the same way and gives the same reason.
 *
 * @purity pure
 */
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

/** The dictionary, read once, as the strings it holds. @purity semi-pure-b */
function dictionaryWordings(): readonly Wording[] {
  return wordingsIn(JSON.parse(readFileSync(DICTIONARY, 'utf8')), 'display-words')
}

/**
 * The text a row of the dictionary shows in one language, or a failure.
 *
 * ⭐ Reached by row ID, which is how table T-037's closing sentence says the
 * dictionary is read: 辞書は行 ID で引く.
 *
 * @purity semi-pure-b
 */
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

// ---------------------------------------------------------------------------
// D-308 -- the abbreviation `U-14` bans
// ---------------------------------------------------------------------------

// ⚠️ Three Japanese punctuation marks, built from their code points rather than
// written out. Rule 03 section 5 keeps this tree ASCII and admits handling
// Japanese itself as the exception; `tests/system/live-app.ts` and
// `tests/system/user-reported-fixes.test.ts` give the same reason for the
// characters they need -- a literal would be invisible in a diff.
/** The full stop a glossary cell ends its settled term with, U+3002. */
const FULL_STOP = String.fromCharCode(0x3002)
/** The quotation marks a glossary cell puts a banned spelling in, U+300C and U+300D. */
const QUOTE_OPEN = String.fromCharCode(0x300c)
const QUOTE_SHUT = String.fromCharCode(0x300d)

/** A banned short spelling, and the settled term it must not stand in for. */
interface BannedShortening {
  readonly settled: string
  readonly banned: string
}

/**
 * The shortening `U-14` of table T-103 forbids, parsed out of its own cell.
 *
 * ⭐ THE CELL IS THE SOURCE, NOT THIS FILE. `U-14` writes its settled term
 * first, closes it with a full stop, and then puts the spelling it bans in
 * quotation marks. Both halves are taken from there, and the guard below fails
 * the run rather than passing on a mis-parse: a banned spelling that is not the
 * head of the settled term would make the walk meaningless.
 *
 * @purity pure
 */
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

/**
 * Whether a piece of text is written in Japanese script.
 *
 * ⭐ Kana (U+3040..U+30FF) or han (U+4E00..U+9FFF), counted by code point so
 * that this file spells no character of either. Rule 03 section 5.
 *
 * @purity pure
 */
function isJapanese(text: string): boolean {
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0
    if (code >= 0x3040 && code <= 0x30ff) return true
    if (code >= 0x4e00 && code <= 0x9fff) return true
  }
  return false
}

/**
 * Whether a piece of text uses the banned spelling on its own -- that is, holds
 * it at a place where the settled term does not continue.
 *
 * @purity pure
 */
function shortens(text: string, ban: BannedShortening): boolean {
  for (let at = text.indexOf(ban.banned); at >= 0; at = text.indexOf(ban.banned, at + 1)) {
    if (text.slice(at, at + ban.settled.length) !== ban.settled) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// D-341 -- the reasons a notice may carry
// ---------------------------------------------------------------------------

/** Every row ID table T-233 holds today. @purity pure */
const REASON_ROWS: readonly string[] = T233.rows.map((row) => row.id)

/** The reason ID a shell or an adapter writes into its code, e.g. `'RS-15'`. */
const QUOTED_REASON = /['"](RS-\d+)['"]/g

/** Every `.ts` file under a directory, at any depth. @purity semi-pure-b */
function typescriptFilesUnder(directory: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) out.push(...typescriptFilesUnder(path))
    else if (entry.name.endsWith('.ts')) out.push(path)
  }
  return out
}

/** One reason ID the tree quotes, and the file it was quoted in. */
interface QuotedReason {
  readonly id: string
  readonly file: string
}

/**
 * Every reason ID quoted in the product tree.
 *
 * ⛔ QUOTED, NOT MENTIONED. A row ID inside a comment is the manuscript being
 * talked about, and a comment may name a row the table no longer holds. What a
 * notice can actually carry is what the code writes as a string, so that is what
 * is collected -- and it is judged against table T-233, never the other way
 * about.
 *
 * @purity semi-pure-b
 */
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

// ---------------------------------------------------------------------------
// D-354 -- the watermark's instant
// ---------------------------------------------------------------------------

/**
 * The shape `FR-020` (MUST) gives the instant: `YYYY-MM-DDThh:mm:ssZ`, UTC, to
 * the second.
 *
 * ⚠️ The pattern is written twice on purpose -- once as the letters the
 * requirement spells it with, so that the manuscript can be asked whether it
 * still says this, and once as what a reading of the screen is matched against.
 * A requirement that moves to another shape takes the first half red.
 */
const INSTANT_SHAPE = 'YYYY-MM-DDThh:mm:ssZ'
const INSTANT = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/

/** `FR-020`'s statement, as the manuscript writes it. @purity semi-pure-b */
function statementOfFr020(): string {
  const text = readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8')
  const lines = text.split('\n')
  const at = lines.indexOf('**UID**: FR-020')
  if (at < 0) throw new Error('01-04-requirements.md holds no requirement FR-020')
  const said = lines.slice(at, at + 8).find((line) => line.startsWith('**STATEMENT**'))
  if (said === undefined) throw new Error('FR-020 has no STATEMENT this file can read')
  return said
}

// ---------------------------------------------------------------------------
// Driving the running application
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

interface Opened {
  readonly page: Page
  close(): Promise<void>
}

/**
 * The application, up and settled, on the screen of the base environment.
 *
 * ⚠️ `locale` reaches `FR-038`: the requirement (MUST) has the application open
 * in the language chosen last and, when it cannot read one, in the language the
 * browser asks for. A context opened here has chosen none, so the locale
 * decides -- which is how the cases below get a Japanese screen.
 *
 * @purity non-pure
 */
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

/**
 * ⛔ THE SAME HANDLES THE OTHER FILES OF THIS DIRECTORY LEAN ON, and no others.
 * Nothing in the specification says how a part or an entrance is marked in the
 * page; the shell writes the part's settled name of `_assets/tbl-glossary.md`
 * and the entrance's row ID of table T-109, and a change to either marking
 * breaks these cases, as it should.
 */
const WATERMARK = '[data-role="Watermark"]'
const CONFIRMATION = '[data-role="Confirmation"]'
const ANSWER = '[data-confirmation-answer]'

/**
 * Press an entrance with a real pointer.
 *
 * ⛔ A REAL POINTER, not `element.click()`. The shell reads the pointer, and a
 * synthetic click has reached nothing in this project before.
 *
 * @purity non-pure
 */
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

/** Every piece of text a leaf of the page is showing right now. @purity semi-pure-b */
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

/** The instant the watermark is carrying right now, or `null`. @purity semi-pure-b */
async function readWatermarkInstant(page: Page): Promise<string | null> {
  const said = await page.evaluate(
    (selector: string) =>
      document.querySelector(`${selector} text`)?.textContent ?? null,
    WATERMARK,
  )
  if (said === null) return null
  return INSTANT.exec(said)?.[0] ?? null
}

/** The drawing on the page with the watermark taken out of it. @purity semi-pure-b */
async function readDrawingWithoutWatermark(page: Page): Promise<string> {
  const drawn = await readSettledDrawnSvg(page)
  return drawn.replace(new RegExp(INSTANT.source, 'g'), '')
}

// ---------------------------------------------------------------------------
// D-308 -- no word the screen prints shortens `Comment Boxes`
// ---------------------------------------------------------------------------

// GOES RED IF: a word of the dictionary, or a word the running application puts
// on the screen, writes the shortening `U-14` bans somewhere the settled term
// does not continue. Three halves are asked and each can fail on its own: the
// row has to read as a settled term with a banned shortening of it (otherwise
// the run fails rather than passing on a mis-parse); the dictionary, which
// `FR-038` makes the whole of what the product can ever print; and the screen,
// which has to be showing Japanese words for the walk to mean anything.
test('D-308: no word the screen can print shortens the term U-14 settles', async ({ baseURL }) => {
  test.setTimeout(180_000)

  // Table T-103 holds two cells after the row ID -- the settled English name and
  // the Japanese. The ban is written in the Japanese one.
  const T103_COLUMNS = 2
  const JAPANESE_COLUMN = 1
  const ban = bannedShorteningOf(cellOf(T103, 'U-14', JAPANESE_COLUMN, T103_COLUMNS), 'U-14')

  // ⭐ THE MANUSCRIPT FIRST. `FR-038` (MUST) has every word the screen prints
  // live in one dictionary per language and forbids requirements and tables from
  // spelling one, so counting there counts every word the product can ever put
  // up -- including the words for surfaces these cases cannot reach.
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

  // ⭐ THEN THE SCREEN. The roster is opened so that a second surface's words are
  // on the page as well as the header's and the palette's.
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

// ---------------------------------------------------------------------------
// D-340 -- the question asked of a whole selection
// ---------------------------------------------------------------------------

// GOES RED IF: the sentence shown when the chosen resources are deleted stops
// being the one `_source/display-words.json` holds for `QN-3` -- which is what a
// sentence written for a single resource would do, and is exactly the row this
// case pins. It also goes red if the confirmation names no task or names only a
// count (`FR-099` MUST and MUST NOT), if the two answers stop being spelled
// `Yes` / `No` (table T-037 row `NT-7` MUST), or if the roster holds one
// resource or none -- in which case the press never reached a selection at all
// and the case would be proving nothing about number.
test('D-340: the question IC-66 raises is QN-3, asked of the whole selection', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)

  // Table T-234 holds three cells after the row ID -- scene, whether names are
  // given, and the requirement that settles it. `QN-3` has to be there before
  // the dictionary is asked for its words.
  const T234_COLUMNS = 3
  expect(
    cellOf(T234, 'QN-3', 0, T234_COLUMNS).length,
    'table T-234 row QN-3 states no scene',
  ).toBeGreaterThan(0)
  const asked = dictionaryTextOf('questions', 'QN-3', 'ja')

  const app = await openTheApp(baseURL, 'ja-JP')
  try {
    // `FR-099` (MUST) puts the roster behind the command palette, gives the
    // choosing surface a "choose them all" entrance, and makes "delete what is
    // chosen" one of its two ways of deleting. Table T-109 seats those three as
    // `IC-62`, `IC-63` and `IC-66`.
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

    // `FR-099` (MUST): show the names of the tasks whose assignments are
    // released. (MUST NOT): show a count instead. Table T-234 row `QN-3` says
    // the same in its second column.
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

    // Table T-037 row `NT-7` (MUST): the two answers are words, spelled `Yes`
    // and `No` in every display language, and (MUST NOT) never translated.
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

// ---------------------------------------------------------------------------
// D-341 -- every reason the product carries is a row of table T-233
// ---------------------------------------------------------------------------

// GOES RED IF: the product tree writes a reason ID table T-233 does not hold --
// which is the state `RS-45` left behind when it retired on 2026-09-04 -- or if
// the dictionary holds no word for a reason the tree can carry. Both are the
// sentence that closes table T-037: 同表に無い理由を運んではならない（MUST NOT）
// and 行を足すときは、辞書の原稿にも項を足すこと（MUST）. A run that finds no
// quoted reason at all fails as well, since the walk would then prove nothing.
test('D-341: no reason the product can carry is missing from table T-233', () => {
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

  // ⛔ `RS-15` IS THE FALL-THROUGH, and it has to be a row of the table for the
  // sentence above to have anywhere to send an unseated reason.
  expect(
    REASON_ROWS,
    'table T-233 no longer holds RS-15, which table T-037 names as the seat for a reason with no ' +
      'row of its own',
  ).toContain('RS-15')

  // The dictionary holds a word for every reason the tree can carry.
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

  // ⛔ AND THE ROW THIS CASE IS ABOUT. `RS-45` left table T-233 on 2026-09-04;
  // the manuscript holds neither the row nor a word for it, and the product must
  // not name it as a string anywhere.
  expect(REASON_ROWS, 'RS-45 is back in table T-233; this case was written for its absence')
    .not.toContain('RS-45')
  expect(words.has('RS-45'), 'the dictionary holds a word for the retired reason RS-45').toBe(false)
  expect(
    quoted.filter((one) => one.id === 'RS-45').map((one) => one.file),
    'the product tree still writes the retired reason RS-45 as a string',
  ).toEqual([])
})

// ---------------------------------------------------------------------------
// D-354 -- the watermark's instant is stamped twice, and not per frame
// ---------------------------------------------------------------------------

// GOES RED IF: the watermark carries no instant of the shape `FR-020` names; or
// the instant moves while nothing is edited, which is the MUST NOT
// (毎フレーム時計を読んではならない); or the instant does NOT move when the
// document changes, which is the MUST that names 文書が変わったとき as the
// second of the two moments. The case also fails when the manuscript stops
// spelling the shape it is matched against, and when the press that is supposed
// to change the document leaves the drawing untouched -- in which case the third
// assertion would be proving nothing.
test('D-354: the watermark is stamped when the document opens and when it changes', async ({
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

    // ⛔ LONGER THAN THE INSTANT'S OWN RESOLUTION. `FR-020` writes the instant to
    // the second, so a wait shorter than a second could not tell a clock that is
    // read every frame from one that is not.
    await app.page.waitForTimeout(2_500)
    expect(
      await readWatermarkInstant(app.page),
      'the watermark moved while nothing was edited, so the clock is being read per frame -- ' +
        'FR-020 forbids it (MUST NOT), and two frames of one schedule would draw differently',
    ).toBe(opened)

    // `IC-93` of table T-109 adds one row at the shallowest level (table T-051
    // row `HF-17`), which is a write that changes the document -- the second of
    // the two moments `FR-020` names.
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

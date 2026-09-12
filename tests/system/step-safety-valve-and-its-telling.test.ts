// 表 T-014 の `ST-7` -- the stack safety valve, PRESSED ON THE SHIPPED BUILD.
//
// ⭐ WHY THIS FILE EXISTS, given that two Unit files already ask `ST-7`.
// `tests/unit/st-7-rs-24-the-stack-safety-valve-returns-a-value.test.ts` asks the
// layout's half (the member is always there, null up to `S-89`, named past it,
// nothing thrown, nothing squeezed or dropped) and
// `tests/unit/d-271-d-345-st-7-tells-on-the-screen-and-after-the-export.test.ts`
// asks the shell's half over hand-wired seams. ⛔ NEITHER OF THEM OPENS THE
// APPLICATION. The ledger rows D-270, D-271 and D-345 each close with 「押して
// いない」, and rule 04 section 3 of `docs/development-rules/` says in as many
// words that a green test is not a working application. ⇒ What is new here is
// the MEASUREMENT: `dist/index.html` over `file://`, driven through the entrances
// and the published surface the specification names, with the person's own
// telling read off the screen.
//
// ---------------------------------------------------------------------------
// ⭐ THE CLAUSES PRESSED, VERBATIM (docs/spec/01-04-requirements.md, 表 T-014)
// ---------------------------------------------------------------------------
//
//   「ただし 1 つの `TaskGroup` あたりの段数に安全弁を置き、達したらそこで処理を
//    止め、達したことを判別できる値で返して人に通知すること（MUST）。例外を投げ
//    てはならない（MUST NOT）」
//   「⛔⛔ 安全弁の値（`S-89`）は「許される段数の上限」であること（MUST）」
//   「⛔⛔ 通知先を画面を描く経路に限ってはならない（MUST NOT） —— 絵を書き出す
//    経路（`FR-080`）で達したときも、書き出しを終えたあとで同じ通知を画面に上げ
//    ること（MUST）」（利用者の裁定 2026-09-06）
//
// and the reason it hands the person (表 T-233):
//
//   | RS-24 | 1 つの `TaskGroup` の段数が安全弁に達したので、これ以上積めない
//           | `NT-3a` | 表 T-014 の `ST-7` |
//
// and the entrance the picture takes out of the application (`FR-025`, :3281):
//
//   「`IO-6`（クリップボード）の入口は 表 T-109 の `IC-3` とし、選択面を開かずに
//    直ちに送ること（MUST）」
//
// ---------------------------------------------------------------------------
// ⭐ EVERY EXPECTED VALUE IS READ OUT OF `docs/spec` AT READ TIME
// ---------------------------------------------------------------------------
// The cap (`S-89` of 表 T-205), the shape a created task takes (`S-13` of 表
// T-201), the words the telling prints and the next step that travels with it
// (`docs/spec/_source/display-words.json`, which `FR-038` makes the one home of
// them), the screen of the base environment (`MC-6` of 表 T-025) and the
// entrance `FR-025` gives `IO-6` are all taken from the manuscript. ⛔ NOT ONE
// NUMBER OR WORD BELOW WAS READ OFF THE RUNNING APPLICATION AND WRITTEN BACK IN.
//
// ⛔ WHAT WAS READ OF `src/`, and it set NO expectation: the published name
// `grSchedulerAgentApi` (settled by `_assets/tbl-glossary.md` above 表 T-107,
// so it is the manuscript's anyway) and the shape of `createTask` -- which
// members 表 T-108's `CM-6` takes -- because 表 T-108 names the command and its
// arguments live in `src/` by Chapter 6.1's own arrangement. The values handed
// to it are this file's fixture.
//
// ⛔ NO `swsCase` IS DECLARED. Table T-219 row `TW-2` has Chapter 9's cases
// generated from those declarations and hung from an `SWS-xxx` node of Chapter
// 6.1, and no node of today's manuscript is about the stack safety valve. The
// rows each judgement leans on are named in prose at the case instead, the way
// `tests/system/three-rows-read-from-the-spec-alone.test.ts` does.
//
// ⭐ ONE LAUNCH, TWO VISITS, ONE SWEEP -- rule 04 section 3.5 asks for a sweep
// that judges many rows in a single start rather than a press per row. Every
// case below only judges what the sweep measured.
//
// ⭐ EACH CASE SAYS WHAT WOULD MAKE IT GO RED, in the sentence above its body.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { bare, specTable, type SpecTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

// ---------------------------------------------------------------------------
// What the specification says, read at read time
// ---------------------------------------------------------------------------

const T025: SpecTable = specTable('T-025')
const T103: SpecTable = specTable('T-103')
const T201: SpecTable = specTable('T-201')
const T205: SpecTable = specTable('T-205')

/** The screen of the base environment: 表 T-025, row `MC-6`. */
const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

/** The `Notification Area` -- row `U-57` of 表 T-103, where a telling stands. */
const NOTIFICATION_AREA = bare(rowOf(T103, 'U-57').cells[0] ?? '')

/**
 * One cell of a row, taken by position with the table's shape guarded.
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

/** The first whole number written in a cell. @purity pure */
function wholeNumberIn(cell: string, what: string): number {
  const found = /\d+/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${what} states no whole number this file can read: ${JSON.stringify(cell)}`)
  }
  return value
}

// 表 T-205 holds five cells after the row ID -- key, default, floor, ceiling,
// meaning -- with the default in the second.
const T205_COLUMNS = 5
const T205_DEFAULT = 1

/**
 * `S-89` (`stackSafetyCap`) of 表 T-205: the safety valve `ST-7` puts on one
 * `TaskGroup`'s stacks, and which the same row (MUST) makes the HIGHEST ALLOWED
 * count rather than the first forbidden one.
 *
 * ⛔ THE WHOLE BOUNDARY OF THIS FILE HANGS ON THAT SENTENCE. Exactly this many
 * simultaneous stacks are still stackable; one more is where the valve stops.
 */
const STACK_SAFETY_CAP = wholeNumberIn(
  cellOf(T205, 'S-89', T205_DEFAULT, T205_COLUMNS),
  '表 T-205 row S-89',
)

// 表 T-201 holds seven cells after the row ID -- group, key, unit, default,
// floor, ceiling, reason -- with the key in the second.
const T201_COLUMNS = 7
const T201_KEY = 1

/**
 * The shape a created task is given, taken from the key of `S-13` of 表 T-201
 * (`shapeHeightOf.rectangle`) rather than spelled here.
 *
 * ⭐ `CM-6` of 表 T-108 (`createTask`) carries the shape the palette is holding,
 * and the roster of shapes lives in the manuscript as the tail of these five
 * keys. Reading it means a renamed shape moves this fixture with it.
 *
 * @purity pure
 */
const TASK_SHAPE_KIND = (() => {
  const key = bare(cellOf(T201, 'S-13', T201_KEY, T201_COLUMNS))
  const tail = /^shapeHeightOf\.([A-Za-z]+)$/.exec(key)
  if (tail === null) {
    throw new Error(`表 T-201 row S-13 no longer names a shape this file can read: ${key}`)
  }
  return tail[1] as string
})()

/**
 * The entrance `FR-025` (MUST) gives `IO-6`, read out of the clause itself.
 *
 * ⭐ Read rather than pinned, because `IC-3` is the fixture's only way OUT of
 * the application and a re-ruled entrance would otherwise leave this file
 * pressing a button that no longer exports anything -- green, and measuring
 * nothing.
 *
 * @purity pure
 */
const PICTURE_TO_CLIPBOARD_ENTRANCE = (() => {
  const said = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
  const found = /`IO-6`[^\n]{0,80}?T-109 [^\n]{0,10}?`(IC-\d+)`/.exec(said)
  if (found === null) {
    throw new Error(
      'FR-025 no longer names the entrance of table T-109 that IO-6 goes out through, so this ' +
        'file has no way to make the picture leave the application',
    )
  }
  return found[1] as string
})()

/**
 * `FR-065` keeps the `Agent API` shut until a person opens it -- row `IC-20`.
 *
 * ⚠️ Pinned, as `tests/system/fr-073-fr-022-the-difference-review-that-is-not-
 * there.test.ts` pins it: the surface it opens is what this fixture builds its
 * document through, and no clause of the manuscript writes the row ID in a form
 * a regular expression can take.
 */
const AGENT_API_ENTRANCE = 'IC-20'

/** The words `RS-24` prints, in one display language. */
interface ReasonWords {
  readonly language: string
  readonly text: string
  readonly nextStep: string
}

/**
 * `RS-24`'s entry in the dictionary `FR-038` makes the one home of the words.
 *
 * ⭐ BOTH LANGUAGES, because which one the build opens in is a setting and not
 * this file's business: a telling is judged against whichever entry it printed,
 * and the SAME entry's next step is then required beside it. That is what makes
 * the judgement about a ROW travelling rather than about a sentence.
 *
 * @purity pure
 */
const RS_24_WORDS: readonly ReasonWords[] = (() => {
  const manuscript = join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json')
  const held = JSON.parse(readFileSync(manuscript, 'utf8')) as {
    reasons?: { rowId?: string; text?: Record<string, string>; nextStep?: Record<string, string> }[]
  }
  const entry = (held.reasons ?? []).find((one) => one.rowId === 'RS-24')
  if (entry === undefined) {
    throw new Error('the dictionary manuscript holds no entry for RS-24')
  }
  const words = Object.keys(entry.text ?? {}).map((language) => ({
    language,
    text: entry.text?.[language] ?? '',
    nextStep: entry.nextStep?.[language] ?? '',
  }))
  const unwritten = words.filter((one) => one.text === '' || one.nextStep === '')
  if (words.length === 0 || unwritten.length > 0) {
    throw new Error(
      `RS-24's entry in the dictionary manuscript is not filled in for ` +
        `${JSON.stringify(unwritten.map((one) => one.language))}`,
    )
  }
  return words
})()

// ---------------------------------------------------------------------------
// Driving the shipped build
// ---------------------------------------------------------------------------

/**
 * ⛔ THE DELIVERABLE, not the sources and not the dev server. `NFR-004` row
 * `CN-1` has `dist/` hold exactly one file and that file be the `.html`;
 * `tests/nfr/` is what assembles and judges it. This file only presses it.
 */
const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')

const CANVAS = '[data-role="Schedule Canvas"] svg'

/**
 * One `TaskGroup` that the opened document does not hold, so that the stacks
 * counted are this fixture's and nothing else's.
 *
 * ⭐ `FR-001` (MUST) has a row created when `createTask` names one the document
 * does not hold, which is what makes a fresh identifier enough to get a row of
 * our own. `AT-51` makes it a UUID.
 */
const FIXTURE_ROW_ID = '6a1f0c92-4b7d-4c2e-9f31-8d5a7e0b1c46'

/** The window every fixture task covers. */
const FIXTURE_START = '2026-03-02'
const FIXTURE_FINISH = '2026-03-06'

/** What one visit to the shipped build measured. */
interface Visit {
  readonly stacks: number
  readonly writeAccepted: boolean
  readonly refusal: string
  readonly drawnAfterWrite: number
  readonly toldAfterWrite: readonly string[]
  readonly toldAfterDismissal: readonly string[]
  readonly toldAfterWaiting: readonly string[]
  readonly toldAfterPictureLeft: readonly string[]
  readonly escaped: readonly string[]
}

let browser: Browser | null = null
let overTheCap: Visit | null = null
let atTheCap: Visit | null = null
let sweepFailed: Error | null = null

/**
 * Whatever the tellings are saying right now.
 *
 * ⛔ THE PART IS ASKED FOR BY ITS SETTLED NAME (`U-57` of 表 T-103) and not by a
 * word this file invented. Rule 04 section 6 records a probe of this project
 * that asked for a role called `Notice`, found none, and called a defect fixed.
 *
 * @purity semi-pure-b
 */
async function readTellings(page: Page): Promise<string[]> {
  return page.evaluate(
    (part: string) =>
      Array.from(document.querySelectorAll('[data-role]'))
        .filter((marked) => (marked.getAttribute('data-role') ?? '').includes(part))
        .map((marked) => (marked.textContent ?? '').trim())
        .filter((said) => said !== ''),
    NOTIFICATION_AREA,
  )
}

/** Press an entrance of 表 T-109 with a real pointer. @purity non-pure */
async function pressEntrance(page: Page, entrance: string): Promise<void> {
  const at = await page.evaluate((wanted: string) => {
    const entry = document.querySelector(`[data-icon="${wanted}"]`)
    if (entry === null) return null
    const box = entry.getBoundingClientRect()
    if (box.width < 1 || box.height < 1) return null
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, entrance)
  if (at === null) {
    throw new Error(`the entrance ${entrance} is not on the screen of the shipped build`)
  }
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
}

/** What the page is handed to build the fixture document. */
interface FixtureArgs {
  readonly stacks: number
  readonly shapeKind: string
  readonly start: string
  readonly finish: string
  readonly groupId: string
}

/**
 * One visit: open the shipped build, put `stacks` tasks that all cover the same
 * window on one row of its own, and measure what the person is told -- on the
 * screen, after taking the telling down, and after the picture has left the
 * application through `IO-6`.
 *
 * @purity non-pure
 */
async function visit(stacks: number): Promise<Visit> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({ viewport: BASE_SCREEN })
  // `IO-6` writes to the host's clipboard, which a driven browser refuses until
  // it is allowed to. ⛔ This grants nothing the application does not already
  // ask a person for; it only stops the driver standing in the way of the road
  // `FR-025` (MUST) settles.
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const page = await context.newPage()
  const escaped: string[] = []
  // ST-7 (MUST NOT): an exception thrown out of the layout arrives here.
  page.on('pageerror', (thrown) => escaped.push(String(thrown)))
  try {
    await page.goto(pathToFileURL(SHIPPED_BUILD).href)
    await readSettledDrawnSvg(page)

    await pressEntrance(page, AGENT_API_ENTRANCE)
    await page.waitForTimeout(800)
    const published = await page.evaluate(
      () => typeof (globalThis as unknown as Record<string, unknown>).grSchedulerAgentApi,
    )
    if (published !== 'object') {
      throw new Error(`pressing ${AGENT_API_ENTRANCE} did not publish the Agent API`)
    }

    const args: FixtureArgs = {
      stacks,
      shapeKind: TASK_SHAPE_KIND,
      start: FIXTURE_START,
      finish: FIXTURE_FINISH,
      groupId: FIXTURE_ROW_ID,
    }
    const written = await page.evaluate((given: FixtureArgs) => {
      type Bag = Record<string, unknown>
      const api = (globalThis as unknown as Record<string, Bag | undefined>).grSchedulerAgentApi
      if (api === undefined) return { accepted: false, refusal: 'the Agent API is not published' }
      const readStamp = api['readStamp'] as () => unknown
      const applyCommands = api['applyCommands'] as (request: unknown) => Bag
      const commands = []
      for (let made = 0; made < given.stacks; made += 1) {
        commands.push({
          kind: 'createTask',
          shapeKind: given.shapeKind,
          start: given.start,
          finish: given.finish,
          groupId: given.groupId,
        })
      }
      const outcome = applyCommands({ readStamp: readStamp(), commands })
      return {
        accepted: outcome['accepted'] === true,
        refusal: JSON.stringify(outcome['refusal'] ?? null).slice(0, 400),
      }
    }, args)

    // ⚠️ Not a fixed pause standing in for a judgement: the write is answered
    // synchronously and what is waited for here is the next drawing, which the
    // shell makes on its own clock.
    await page.waitForTimeout(2500)
    const drawnAfterWrite = await page.evaluate(
      (canvas: string) => document.querySelectorAll(`${canvas} *`).length,
      CANVAS,
    )
    const toldAfterWrite = await readTellings(page)

    // `NT-8` (MUST) has a standing telling taken down by `Esc`, and `SK-19` of
    // 表 T-036 puts that first. This is what starts the export road clean.
    await page.keyboard.press('Escape')
    await page.waitForTimeout(700)
    const toldAfterDismissal = await readTellings(page)

    // ⭐ THE PREMISE THAT MAKES THE TWO ROADS TWO. If the screen road put the
    // same telling back up on its own, nothing after the export could be read
    // as the export's doing.
    await page.waitForTimeout(1500)
    const toldAfterWaiting = await readTellings(page)

    await pressEntrance(page, PICTURE_TO_CLIPBOARD_ENTRANCE)
    await page.waitForTimeout(3000)
    const toldAfterPictureLeft = await readTellings(page)

    return {
      stacks,
      writeAccepted: written.accepted,
      refusal: written.refusal,
      drawnAfterWrite,
      toldAfterWrite,
      toldAfterDismissal,
      toldAfterWaiting,
      toldAfterPictureLeft,
      escaped,
    }
  } finally {
    await context.close()
  }
}

/**
 * The telling this file is about, or `null` when none of what stands is it.
 *
 * ⭐ MATCHED ON THE DICTIONARY'S OWN WORDS, in whichever language the entry has
 * -- so what is judged is that `RS-24` travelled, not that some sentence did.
 *
 * @purity pure
 */
function rs24Among(told: readonly string[]): ReasonWords | null {
  for (const words of RS_24_WORDS) {
    if (told.some((said) => said.includes(words.text))) return words
  }
  return null
}

test.beforeAll(async () => {
  test.setTimeout(600_000)
  if (!existsSync(SHIPPED_BUILD)) {
    throw new Error(
      'the shipped build this file presses is not there; run `npx vite build` first ' +
        '(dist/index.html)',
    )
  }
  browser = await launchReferenceBrowser()
  try {
    // ⭐ ONE STACK PAST `S-89`, which `ST-7` (MUST) makes the highest ALLOWED
    // count -- so this is the first document the valve has to stop.
    overTheCap = await visit(STACK_SAFETY_CAP + 1)
    // ⭐ AND EXACTLY `S-89`, which the same sentence says is still stackable.
    atTheCap = await visit(STACK_SAFETY_CAP)
  } catch (thrown) {
    sweepFailed = thrown instanceof Error ? thrown : new Error(String(thrown))
  }
})

test.afterAll(async () => {
  // ⛔ THE HOOK'S OWN ALLOWANCE, NOT AN ASSERTION'S. `CLEARING_UP_MS` of
  // `./live-app` carries the measurements and the reason.
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** The measurement, or the failure that stopped it being taken. @purity pure */
function measured(which: Visit | null, what: string): Visit {
  if (sweepFailed !== null) throw sweepFailed
  if (which === null) throw new Error(`the ${what} visit measured nothing`)
  return which
}

// ---------------------------------------------------------------------------
// ST-7 (MUST NOT) -- the valve is a value, so the application keeps running
// ---------------------------------------------------------------------------

// GOES RED IF: a document one stack past `S-89` throws out of the layout, or
// takes the drawing down with it. 表 T-014 の `ST-7` (MUST NOT) forbids the
// exception in as many words and gives its reason -- 「投げると捕まえる者が要り」
// -- so what is measured is that nothing escaped to the page and that the canvas
// is still drawing afterwards.
test(`ST-7: ${String(STACK_SAFETY_CAP + 1)} stacks on one row throw nothing out of the build`, () => {
  const seen = measured(overTheCap, 'over-the-cap')
  expect(seen.writeAccepted, `the fixture document was written: ${seen.refusal}`).toBe(true)
  expect(
    seen.escaped,
    'ST-7 (MUST NOT): nothing was thrown out of the layout when the valve was reached',
  ).toEqual([])
  expect(
    seen.drawnAfterWrite,
    'ST-7: the valve stopped the stacking, not the drawing -- the canvas is still drawing',
  ).toBeGreaterThan(0)
})

// ---------------------------------------------------------------------------
// ST-7 (MUST) -- and the person is told, in RS-24's own words
// ---------------------------------------------------------------------------

// GOES RED IF: the valve stops and nobody is told. 表 T-014 の `ST-7` (MUST) asks
// for 「人に通知すること」 and 表 T-233 gives that telling the row `RS-24`, whose
// words are the dictionary's (`FR-038`). ⚠️ What is compared is the
// manuscript's own sentence, so a telling that stood carrying some other reason
// leaves this red.
test('ST-7 / RS-24: the person is told, in the words the dictionary holds', () => {
  const seen = measured(overTheCap, 'over-the-cap')
  const told = rs24Among(seen.toldAfterWrite)
  expect(
    told,
    'ST-7 (MUST) / RS-24: a telling carrying the row RS-24 stands on the screen; what stood ' +
      `was ${JSON.stringify(seen.toldAfterWrite)}`,
  ).not.toBeNull()
})

// GOES RED IF: the telling says only that the stacking stopped. `RS-24`'s 作法
// column names `NT-3a` of 表 T-037, which (MUST) has a failure carry the next
// step the person can take and (MUST NOT) allows one that does not.
test('NT-3a: the telling carries the next step as well as the failure', () => {
  const seen = measured(overTheCap, 'over-the-cap')
  const told = rs24Among(seen.toldAfterWrite)
  expect(told, 'the telling stood at all').not.toBeNull()
  const words = told as ReasonWords
  expect(
    seen.toldAfterWrite.some((said) => said.includes(words.nextStep)),
    `NT-3a (MUST): RS-24's next step in ${words.language} travels with it; what stood was ` +
      JSON.stringify(seen.toldAfterWrite),
  ).toBe(true)
})

// ---------------------------------------------------------------------------
// ST-7 (MUST) -- S-89 is the HIGHEST ALLOWED count, measured either side
// ---------------------------------------------------------------------------

// GOES RED IF: the valve stops one stack too early. 表 T-014 の `ST-7` (MUST)
// settles the boundary in as many words -- 「安全弁の値（`S-89`）は「許される段数
// の上限」であること」, 「同時に重なる段が `S-89` に等しいところまでは積め、`S-89`
// を超える段を置こうとしたときに止まる」 -- so a document of exactly `S-89`
// simultaneous stacks is a document nobody is told anything about.
test(`ST-7: exactly ${String(STACK_SAFETY_CAP)} stacks are stackable, and tell nobody`, () => {
  const seen = measured(atTheCap, 'at-the-cap')
  expect(seen.writeAccepted, `the fixture document was written: ${seen.refusal}`).toBe(true)
  expect(seen.escaped, 'nothing was thrown at the boundary either').toEqual([])
  expect(
    rs24Among(seen.toldAfterWrite),
    `ST-7: S-89 is the highest ALLOWED count, so ${String(STACK_SAFETY_CAP)} stacks reach no ` +
      `valve; what stood was ${JSON.stringify(seen.toldAfterWrite)}`,
  ).toBeNull()
})

// ---------------------------------------------------------------------------
// NT-8 -- the telling can be taken down, and the screen does not put it back
// ---------------------------------------------------------------------------

// GOES RED IF: `Esc` cannot take the telling down, or the screen road raises the
// same one again while nothing was touched. 表 T-037 の `NT-8` (MUST) has a
// person clear a standing telling and (MUST) puts that ahead of every other tier
// of `Esc`; `NT-3` (MUST) forbids the same reason being piled up a second time.
// ⭐ THIS IS ALSO THE PREMISE OF THE NEXT CASE: without it, a telling standing
// after an export could be the screen's and not the export's.
test('NT-8: the telling goes down on Esc, and the screen road leaves it down', () => {
  const seen = measured(overTheCap, 'over-the-cap')
  expect(
    rs24Among(seen.toldAfterDismissal),
    `NT-8 (MUST): Esc took the telling down; what was left was ` +
      JSON.stringify(seen.toldAfterDismissal),
  ).toBeNull()
  expect(
    rs24Among(seen.toldAfterWaiting),
    'NT-3 / NT-8: the screen road did not raise the same reason again on its own; what stood ' +
      `was ${JSON.stringify(seen.toldAfterWaiting)}`,
  ).toBeNull()
})

// ---------------------------------------------------------------------------
// ST-7 (MUST NOT) -- the telling is not the screen road's alone
// ---------------------------------------------------------------------------

// GOES RED IF: the picture leaves the application through `IO-6` carrying a stop
// the person is never told about. 表 T-014 の `ST-7` (MUST NOT) forbids the
// telling being limited to the screen road and (MUST) asks for the same telling
// after the writing ended -- the user's ruling of 2026-09-06, whose own reason
// is that an export lays the picture out separately from the screen.
// ⭐ THE TELLING WAS TAKEN DOWN FIRST (the case above), so what stands here came
// up after the picture left.
test('ST-7: after IO-6 sends the picture out, the same telling is up again', () => {
  const seen = measured(overTheCap, 'over-the-cap')
  const told = rs24Among(seen.toldAfterPictureLeft)
  expect(
    told,
    `ST-7 (MUST): pressing ${PICTURE_TO_CLIPBOARD_ENTRANCE} sent the picture out and the valve ` +
      `was told again; what stood was ${JSON.stringify(seen.toldAfterPictureLeft)}`,
  ).not.toBeNull()
  const words = told as ReasonWords
  expect(
    seen.toldAfterPictureLeft.some((said) => said.includes(words.nextStep)),
    'ST-7: 「同じ通知」 -- the telling after the export carries RS-24 AND its next step, as the ' +
      'screen road did',
  ).toBe(true)
})

// GOES RED IF: an export tells somebody about a valve nothing reached. The same
// sentence of `ST-7` ties the telling to the stop 「絵を書き出す経路で達したとき
// も」 -- a document at `S-89` reaches none, so `IO-6` sends the picture and says
// nothing.
test(`ST-7 control: at ${String(STACK_SAFETY_CAP)} stacks IO-6 sends the picture and tells nobody`, () => {
  const seen = measured(atTheCap, 'at-the-cap')
  expect(
    rs24Among(seen.toldAfterPictureLeft),
    `ST-7: nothing reached the valve, so the export told nobody; what stood was ` +
      JSON.stringify(seen.toldAfterPictureLeft),
  ).toBeNull()
  expect(seen.escaped, 'and the export threw nothing out of the build').toEqual([])
})

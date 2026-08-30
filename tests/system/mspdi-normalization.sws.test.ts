// System cases for `SWS-6` of Chapter 6.1 -- table T-218, row TS-3.
//
//   TS-3 | software specification test | Chapter 9's SW_SPEC_TEST | parent
//        | SWS-xxx | System | tests/system/ | Playwright
//
// WHY THIS FILE EXISTS. `SWS-6` was the one `SW_SPEC` node of Chapter 6.1 that
// no case in this tree took as a parent. Table T-219 row TW-2 lets Chapter 9
// pass only when every `SWS-xxx` is taken by at least one case, so that absence
// held the milestone open -- and it was visible only as prose, in the header of
// `drawn-svg-normalization.sws.test.ts` and in
// `docs/development-records/W5-framework.md`. ⭐ A gap that is written down does
// not stop a run. A case does.
//
// ⭐ THE STEP THAT HELD BOTH CASES RED IS NOW THERE. The surface used to open
// carrying nothing but its own close entry, so the pair of documents `SWS-6`
// speaks of could not come into being and the expectation was left standing
// where the specification put it (rule 04 section 1 forbids moving it onto what
// the code does). The surface now carries the formats and a press on one reaches
// the store, so case 1's step is met and case 2 has two documents to set against
// each other.
//
// ⛔ WHAT STILL CANNOT BE ASKED FOR, and it is not this file's to fix. Two of
// the rows table T-024 gives an out direction are pictures, and `ImageExporter`
// (PI-21) is a stub in this build -- nothing is handed to the platform for
// either. ⛔ No rasteriser is stood in for here: a picture written by the
// harness would be the harness's picture, and `SWS-6` is about what the running
// application writes. The row this file is about (`IO-1`) is an exchange format
// and goes out through the same road, so nothing here waits on that stub.
//
// WHAT IS HERE.
//
//   * Case 1 asks for the choice. `FR-096` (MUST) has exactly one entry for
//     writing a document out and forbids one per format; table T-109 row IC-3 is
//     that entry and table T-103 row U-54 names the surface it opens. The case
//     counts what is on that surface rather than naming a format, because how a
//     format is marked is the one thing here the specification does not settle.
//   * Case 2 asks for the pair. Two documents of the format of table T-024 row
//     IO-1, written out of one run with no edit in between, put through the steps
//     of table T-228 that this case can apply, and set against each other.
//
// ⛔ WHAT IS NOT HERE, AND WHY. `FR-021`'s round trip -- one document of the
// format taken in, not merged, not edited, written back out -- is the reason
// table T-228 exists, and it is the case this file would rather hold. It is not
// here for two reasons, and only the first of them is the product's:
//
//   * the entry that takes a document in (table T-109 row IC-1) reaches nothing
//     either, so there is no way to put a document of that format into the
//     running application;
//   * there is no document of that format in this tree to put in. Chapter 6.2
//     keeps the exchange partner's element names out of the specification on
//     purpose (table T-003 row CN-7) and points at a local copy of the official
//     schema that `.gitignore` keeps untracked and that is absent here. ⛔ A
//     fixture written from memory would be a guess, and rule 02 section 3
//     forbids guessing a value.
//
// ⛔ THE ROWS OF TABLE T-228 THIS CASE CANNOT APPLY are listed in OUT_OF_REACH
// below with a reason each, and the last test of the file fails when a row is
// neither covered nor excused -- so a row added to the table cannot slip past.
//
// HOW IT IS DRIVEN. Chapter 1.9 of `docs/spec/01-04-requirements.md`, `:275`: a
// test that verifies a requirement pointing at a table is driven by fixed data
// copied from that table. `tests/contract/spec-table.ts` takes that copy at read
// time, so not one row ID's content and not one format name is typed here.

import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { bare, specTable, type SpecRow, type SpecTable } from '../contract/spec-table'
import { launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { expectDeclarationsUsable, rowOf, swsRegistry } from './sws-case'

const registry = swsRegistry()
const { swsCase } = registry

// ---------------------------------------------------------------------------
// The tables, read out of the specification at read time (Chapter 1.9, :275)
// ---------------------------------------------------------------------------

const T228: SpecTable = specTable('T-228')
const T024: SpecTable = specTable('T-024')
const T103: SpecTable = specTable('T-103')
const T109: SpecTable = specTable('T-109')
const T025: SpecTable = specTable('T-025')

/** The row of table T-024 that `SWS-6` is about. */
const FORMAT_ROW = 'IO-1'

/**
 * The row of table T-109 that is the one entry `FR-096` allows for writing out.
 *
 * ⛔ IT NAMED `IC-3` UNTIL 2026-08-31, AND THAT IS A DIFFERENT ENTRANCE. Table
 * T-109 gives `IC-2` 「書き出す形式を選ぶ」 with `FR-096`（表 T-036 の `SK-12`）
 * beside it, and `IC-3` 「画像をクリップボードへコピーする」 with `FR-025` -- which
 * opens no surface at all, so this case waited five seconds for an `Export
 * Chooser` that the pressed entrance never puts up. ⚠️ Measured on the shipped
 * build: pressing IC-3 raises 「操作を終えられませんでした」 instead.
 */
const EXPORT_ENTRY_ROW = 'IC-2'

/** The row of table T-103 that names the surface that entry opens. */
const CHOOSER_ROW = 'U-54'

/** The row of table T-109 that closes an open surface, this one included. */
const CLOSE_ENTRY_ROW = 'IC-52'

/** The row of table T-025 that fixes the screen of the base environment. */
const SCREEN_ROW = 'MC-6'

/** The row of table T-228 whose step drops whitespace between element children. */
const WHITESPACE_ROW = 'NR-2'

/** The row of table T-228 whose step takes prefixes out of the verdict. */
const NAME_ROW = 'NR-3'

/**
 * Rows of table T-228 that no case here applies, each with the reason.
 *
 * ⭐ Recorded rather than left out, so that the completeness check at the foot
 * of the file can still fail when the table grows a row: an unclassified row is
 * neither covered nor excused, and somebody has to decide which it is.
 *
 * ⚠️ The first of these is not a gap in the product. The step it names is a
 * published standard, and neither the browser nor Node implements it, nor does
 * any dependency `package.json` declares. Until one is chosen, no comparison
 * anywhere in this repository can claim to have applied the whole table -- so
 * the case below says which differences it is blind to rather than claiming
 * more than it does.
 */
const OUT_OF_REACH: Readonly<Record<string, string>> = {
  'NR-1':
    'the standard it adopts is implemented by neither the browser nor Node, and package.json ' +
    'declares no dependency that implements it',
  'NR-4':
    'the step needs the exchange partner schema to know which value carries which type, and ' +
    'the local copy Chapter 6.2 points at is untracked and absent from this tree',
  'NR-5': 'the same, for the one type the step singles out',
}

/**
 * The name of the format one row of table T-024 settles.
 *
 * ⭐ Read by position out of the first cell after the row ID. The cell that
 * follows states the directions, and stating them is Japanese prose that rule
 * 03 section 5 keeps out of this tree -- so the row is named by its ID and the
 * name is taken from the table, rather than either being typed here.
 *
 * ⚠️ Used in what a failure says, never as a handle on the page. Nothing prints
 * this name on the screen: the roster of words the manuscript keeps
 * (`_source/display-words.json`) has an entry for the surface's heading and
 * none for the formats on it.
 *
 * @purity pure
 */
function formatNameOf(row: SpecRow): string {
  const name = bare(row.cells[0] ?? '')
  if (name === '') throw new Error(`table T-024 row ${row.id} names no format`)
  return name
}

/**
 * The settled name of the UI part one row of table T-103 holds.
 *
 * @purity pure
 */
function partNameOf(row: SpecRow): string {
  const name = bare(row.cells[0] ?? '')
  if (name === '') throw new Error(`table T-103 row ${row.id} names no UI part`)
  return name
}

/** Table T-024 prints format, direction, extension, first character -- in that order. */
const T024_EXTENSION = 2
const T024_FIRST_CHARACTER = 3

/**
 * One code span out of one cell of table T-024, or `null` where the cell holds
 * an em dash instead.
 *
 * @purity pure
 */
function spanOf(row: SpecRow, at: number): string | null {
  const found = /`([^`]+)`/.exec(row.cells[at] ?? '')
  return found === null ? null : (found[1] ?? null)
}

/**
 * The extension or the first character table T-024 gives one row, or a failure
 * saying the row gives none.
 *
 * @purity pure
 */
function requiredSpanOf(row: SpecRow, at: number, what: string): string {
  const span = spanOf(row, at)
  if (span === null) throw new Error(`table T-024 row ${row.id} gives no ${what}`)
  return span
}

const FORMAT_NAME = formatNameOf(rowOf(T024, FORMAT_ROW))
const FORMAT_EXTENSION = requiredSpanOf(rowOf(T024, FORMAT_ROW), T024_EXTENSION, 'extension')
const FORMAT_FIRST_CHARACTER = requiredSpanOf(
  rowOf(T024, FORMAT_ROW),
  T024_FIRST_CHARACTER,
  'first non-blank character',
)
const CHOOSER_NAME = partNameOf(rowOf(T103, CHOOSER_ROW))
const BASE_SCREEN = screenOf(rowOf(T025, SCREEN_ROW))

/**
 * ⛔ NOT DECIDED BY THE SPECIFICATION: nothing says how an entry of table T-109
 * is marked in the page. The specification settles that the entry exists, which
 * surface carries it and what it opens; the shell marks each one with the row
 * ID, which is what the selector below leans on -- the same bargain
 * `live-app.ts` records for a UI part. A change to that marking breaks this
 * case, and it should: at that point the tool and the case disagree about how
 * an entry is found, and the specification cannot settle the argument.
 *
 * @purity pure
 */
function entrySelector(rowId: string): string {
  return `[data-icon="${rowId}"]`
}

/**
 * ⛔ NOT DECIDED BY THE SPECIFICATION EITHER: nothing says how one format is
 * marked on that surface. What the specification settles is that a format is
 * carried by its row ID and by nothing else -- table T-024 has no English
 * column, which is why `_source/exchange-formats.json` keys its two entries on
 * the row ID as well -- so the case takes the same convention the shell already
 * uses for the entries of table T-109 and asks for the row ID. If the surface
 * is built with another marking, this case breaks, and it should: the tool and
 * the case would then disagree about how a format is named, and no row of the
 * specification can settle it.
 *
 * @purity pure
 */
function formatSelector(rowId: string): string {
  return `[data-format="${rowId}"]`
}

// ---------------------------------------------------------------------------
// What the running application hands to the platform
// ---------------------------------------------------------------------------

/**
 * ⛔ NOT DECIDED BY THE SPECIFICATION: nothing says through which surface of the
 * browser a document leaves the application. Table T-035 row AG-7 settles only
 * that the machine-facing side answers with a value and puts up no dialogue,
 * which says the human-facing side does put one up, and says no more. A browser
 * has two such surfaces, so both are watched: the file picker of the File
 * System Access API, and a download. ⛔ Neither is guessed to be the right one
 * -- whichever the application reaches for is recorded.
 */
const WRITTEN_FILES = '__writtenFiles'

/** One document the application handed to the platform. */
interface WrittenFile {
  readonly suggestedName: string
  readonly text: string
}

/**
 * Watch both surfaces a document can leave through, for the life of a context.
 *
 * ⚠️ Installed before the first page is created, because the application reaches
 * for the picker from a handler that a later injection would already have
 * missed.
 *
 * @purity non-pure
 */
async function watchWrittenFiles(context: BrowserContext): Promise<void> {
  await context.addInitScript(
    /** @purity non-pure */
    (key: string) => {
      const written: Array<{ suggestedName: string; text: string }> = []
      Reflect.set(globalThis, key, written)
      /** @purity non-pure */
      const readChunk = async (chunk: unknown): Promise<string> => {
        if (typeof chunk === 'string') return chunk
        if (chunk instanceof Blob) return chunk.text()
        // ⚠️ Decoded as UTF-8 because table T-003 row CN-5 (MUST) fixes what is
        // written out. A file written in anything else is a failure of that
        // row, and decoding it as its own encoding here would hide it.
        if (ArrayBuffer.isView(chunk) || chunk instanceof ArrayBuffer) {
          return new TextDecoder('utf-8', { fatal: false }).decode(chunk as ArrayBufferView)
        }
        return ''
      }
      Reflect.set(
        globalThis,
        'showSaveFilePicker',
        /** @purity non-pure */ async (options?: { suggestedName?: string }) => ({
          kind: 'file',
          name: options?.suggestedName ?? '',
          // ⛔ NOT OPTIONAL, AND THE ORDER IS THE RULE. Table T-227 row DI-4
          // (MUST) has the overwrite question put BEFORE the bytes are written,
          // and a question about what is standing at the destination cannot be
          // put without reading the destination -- so the store reads it first,
          // and a handle without this member makes that read throw. ⛔ Do not
          // answer by taking the read out of the store: that order is what the
          // row requires, not an implementation detail of it.
          //
          // ⭐ AN EMPTY FILE IS THE RIGHT ANSWER FOR A HANDLE A PICKER JUST
          // MADE. Table T-227 row DI-6 (MUST) settles that a destination of
          // zero bytes is not one that was already there and is not asked
          // about, and states its own precedence over DI-3 -- and its note is
          // that a file the chooser has just created cannot be told apart from
          // one that was standing empty, which is exactly this handle.
          /** @purity non-pure */
          getFile: async () => new File([], options?.suggestedName ?? ''),
          createWritable: async () => ({
            /** @purity non-pure */
            write: async (chunk: unknown): Promise<void> => {
              written.push({
                suggestedName: options?.suggestedName ?? '',
                text: await readChunk(chunk),
              })
            },
            /** @purity non-pure */
            close: async (): Promise<void> => {},
          }),
        }),
      )
    },
    WRITTEN_FILES,
  )
}

/**
 * The other surface: what the browser was asked to save as a download.
 *
 * ⭐ Kept on this side rather than in the page, because a download never passes
 * through the page's own script at all -- the browser takes it straight to
 * disk, and Playwright is the only witness.
 *
 * @purity non-pure
 */
const DOWNLOADED = new WeakMap<Page, WrittenFile[]>()

/**
 * Start watching a page for downloads.
 *
 * @purity non-pure
 */
function watchDownloads(page: Page): void {
  const seen: WrittenFile[] = []
  DOWNLOADED.set(page, seen)
  page.on('download', (download) => {
    void (async () => {
      const saved = await download.path()
      if (saved === null) return
      // ⚠️ Read as UTF-8 because table T-003 row CN-5 (MUST) fixes what is
      // written out.
      seen.push({ suggestedName: download.suggestedFilename(), text: readFileSync(saved, 'utf8') })
    })()
  })
}

/**
 * Everything written since the page was opened, newest last.
 *
 * ⚠️ The two surfaces are read in a fixed order rather than interleaved by
 * time, because no clock is shared between them. Nothing here needs the order:
 * one entry reaches for one surface, and a case counts the total before and
 * after taking it.
 *
 * @purity semi-pure-b
 */
async function writtenFilesOf(page: Page): Promise<readonly WrittenFile[]> {
  const inPage = await page.evaluate(
    /** @purity semi-pure-b */
    (key: string) => (Reflect.get(globalThis, key) as WrittenFile[] | undefined) ?? [],
    WRITTEN_FILES,
  )
  return [...inPage, ...(DOWNLOADED.get(page) ?? [])]
}

/**
 * Take the entry of `FR-096` once and answer with what left the application.
 *
 * ⭐ Every step names the row that asked for it, because every step is a place
 * this can stop: the entry, the surface it opens, the format on that surface,
 * and the document itself.
 *
 * @purity non-pure
 */
async function writeOutOnce(page: Page): Promise<WrittenFile> {
  const already = (await writtenFilesOf(page)).length

  const entry = page.locator(entrySelector(EXPORT_ENTRY_ROW))
  await expect(
    entry,
    `table T-109 row ${EXPORT_ENTRY_ROW}: the running application carries no entry for writing ` +
      'a document out',
  ).toHaveCount(1)
  await entry.click()

  const chooser = page.locator(`[data-role="${CHOOSER_NAME}"]`)
  await expect(
    chooser,
    `table T-103 row ${CHOOSER_ROW}: taking the entry of table T-109 row ${EXPORT_ENTRY_ROW} ` +
      `put up no ${CHOOSER_NAME}, so no format can be chosen`,
  ).toHaveCount(1)

  const choice = chooser.locator(formatSelector(FORMAT_ROW))
  await expect(
    choice,
    `table T-024 row ${FORMAT_ROW}: the ${CHOOSER_NAME} offers no way to choose ${FORMAT_NAME}, ` +
      'which FR-096 (MUST) has the author choose there',
  ).toHaveCount(1)
  await choice.click()

  await expect
    .poll(
      async () => (await writtenFilesOf(page)).length,
      {
        message:
          `table T-024 row ${FORMAT_ROW}: choosing ${FORMAT_NAME} handed the platform nothing`,
      },
    )
    .toBeGreaterThan(already)

  const written = await writtenFilesOf(page)
  const last = written[written.length - 1]
  if (last === undefined) throw new Error('unreachable: the poll above waited for this')
  return last
}

// ---------------------------------------------------------------------------
// The comparison
// ---------------------------------------------------------------------------

/**
 * Set two documents against each other the way table T-228 asks, as far as this
 * case can.
 *
 * ⚠️ THIS DOES NOT CLAIM TO APPLY THE STANDARD `NR-1` NAMES -- see OUT_OF_REACH.
 * What it does is apply the two steps of the table it can, and then be blind to
 * the differences the standard would have removed: the order attributes were
 * written in, and the spelling of an element that has no children. Anything else
 * it finds is a real difference between two documents of one run.
 *
 * ⭐ Run inside the page rather than here, because Node has no XML parser and
 * the browser the case is judged in does.
 *
 * @purity semi-pure-b
 */
async function sameAfterNormalization(
  page: Page,
  first: string,
  second: string,
): Promise<{ same: boolean; at: number; firstAt: string; secondAt: string }> {
  return page.evaluate(
    /** @purity pure */
    (pair: { first: string; second: string }) => {
      const XMLNS = 'http://www.w3.org/2000/xmlns/'
      /** @purity pure */
      const shapeOf = (markup: string): string => {
        const parsed = new DOMParser().parseFromString(markup, 'application/xml')
        const failed = parsed.querySelector('parsererror')
        if (failed !== null) return `not xml: ${failed.textContent ?? ''}`
        /** @purity pure */
        const written = (element: Element): string => {
          // NR-3: a name is the pair of its namespace and its local name, so a
          // document that binds the same namespace to another prefix reads the
          // same here.
          /** @purity pure */
          const nameOf = (uri: string | null, local: string): string => `{${uri ?? ''}}${local}`
          const attributes = Array.from(element.attributes)
            // NR-3 again: a prefix binding is not a name of the document, it is
            // how the document spells its names.
            .filter((one) => one.namespaceURI !== XMLNS && one.name !== 'xmlns')
            .map(
              (one) =>
                `${nameOf(one.namespaceURI, one.localName)}=${JSON.stringify(one.value)}`,
            )
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
            // NR-2: whitespace between element children is dropped; whitespace
            // inside a leaf is the value and is kept.
            if (hasElementChild && text.trim() === '') continue
            parts.push(JSON.stringify(text))
          }
          const name = nameOf(element.namespaceURI, element.localName)
          return `<${name} ${attributes}>${parts.join('')}</${name}>`
        }
        return written(parsed.documentElement)
      }

      const one = shapeOf(pair.first)
      const two = shapeOf(pair.second)
      let at = 0
      while (at < one.length && at < two.length && one[at] === two[at]) at += 1
      return {
        same: one === two,
        at,
        firstAt: one.slice(Math.max(0, at - 80), at + 80),
        secondAt: two.slice(Math.max(0, at - 80), at + 80),
      }
    },
    { first, second },
  )
}

// ---------------------------------------------------------------------------
// The running application
// ---------------------------------------------------------------------------

let browser: Browser | null = null

test.beforeAll(async () => {
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

/** Where the dev server the configuration declares is listening. @purity pure */
function serverUrlOf(baseURL: string | undefined): string {
  if (baseURL === undefined) {
    throw new Error('playwright.config.ts declares no baseURL for the running application')
  }
  return baseURL
}

/**
 * The application up on the screen of the base environment, watched.
 *
 * @purity non-pure
 */
async function openedApplication(
  baseURL: string | undefined,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await openedBrowser().newContext({
    baseURL: serverUrlOf(baseURL),
    viewport: BASE_SCREEN,
  })
  await watchWrittenFiles(context)
  const page = await context.newPage()
  watchDownloads(page)
  await page.goto('/')
  await readSettledDrawnSvg(page)
  return { context, page }
}

// ---------------------------------------------------------------------------
// The cases
// ---------------------------------------------------------------------------

test(
  swsCase({
    sws: 'SWS-6',
    level: 'System',
    covers: [EXPORT_ENTRY_ROW, CHOOSER_ROW],
    given: 'the application up in the reference browser on the screen of the base environment, showing the document it starts with',
    when: 'the one entry for writing a document out is taken',
    then: 'the surface for choosing a format comes up carrying something to choose, so that two documents of the exchange format can exist for the steps of table T-228 to be applied to',
  }),
  async ({ baseURL }) => {
    test.setTimeout(180_000)
    const { context, page } = await openedApplication(baseURL)

    const entry = page.locator(entrySelector(EXPORT_ENTRY_ROW))
    await expect(
      entry,
      `table T-109 row ${EXPORT_ENTRY_ROW}: the running application carries no entry for ` +
        'writing a document out',
    ).toHaveCount(1)
    await entry.click()

    const chooser = page.locator(`[data-role="${CHOOSER_NAME}"]`)
    await expect(
      chooser,
      `table T-103 row ${CHOOSER_ROW} / FR-096: taking the entry of table T-109 row ` +
        `${EXPORT_ENTRY_ROW} put up no ${CHOOSER_NAME}`,
    ).toHaveCount(1)

    // ⭐ Counted rather than named, so that the case does not depend on how a
    // format is marked -- the one thing here that no row of the specification
    // settles. `FR-096` (MUST) has the author choose a format on this surface
    // and table T-024 row IO-1 is one of them, so a surface carrying nothing
    // but its own close entry offers no choice at all.
    const choices = chooser.locator(`button:not(${entrySelector(CLOSE_ENTRY_ROW)})`)
    await expect(
      choices,
      `FR-096 (MUST) / table T-024 row ${FORMAT_ROW}: the ${CHOOSER_NAME} carries nothing to ` +
        `choose beside the entry of table T-109 row ${CLOSE_ENTRY_ROW}, so ${FORMAT_NAME} ` +
        'cannot be asked for',
    ).not.toHaveCount(0)

    await context.close()
  },
)

test(
  swsCase({
    sws: 'SWS-6',
    level: 'System',
    covers: [WHITESPACE_ROW, NAME_ROW],
    given: 'the application up in the reference browser on the screen of the base environment, showing the document it starts with',
    when: 'the exchange format is written out twice inside one run, with no edit in between',
    then: 'the two are the same document once both have been through the steps of table T-228 this case can apply, so nothing in either was built from a value that changes per run',
  }),
  async ({ baseURL }) => {
    test.setTimeout(180_000)
    const { context, page } = await openedApplication(baseURL)

    const first = await writeOutOnce(page)
    const second = await writeOutOnce(page)

    // ⛔ WHICH FORMAT CAME OUT, ASKED BEFORE THE TWO ARE COMPARED. Two documents
    // of the WRONG format are as equal to each other as two of the right one, so
    // without this the comparison below is green on a press that wrote something
    // else -- and the normalization would simply report both as "not xml".
    //
    //   * `FR-096` (MUST): 「選択面が提案する名は、文書名（`FR-035`）に 表 T-024
    //     が定める拡張子を付けたものとすること」 -- the extension is the chosen
    //     ROW's, so it is what says which row was chosen.
    //   * `OP-12` of table T-024a (MUST NOT) forbids reading a file whose
    //     extension and first non-blank character point at different rows, so a
    //     document `GRS` writes under one row's extension and another row's first
    //     character is one `GRS` itself would refuse to read back -- and
    //     `FR-021`'s lossless round trip is stated for this very row.
    for (const written of [first, second]) {
      expect(
        written.suggestedName.endsWith(FORMAT_EXTENSION),
        `FR-096 (MUST) / table T-024 row ${FORMAT_ROW}: the name proposed for the document ` +
          `written out was "${written.suggestedName}", which is not ${FORMAT_NAME}'s`,
      ).toBe(true)
      expect(
        written.text.trimStart().slice(0, FORMAT_FIRST_CHARACTER.length),
        `table T-024a row OP-12 (MUST NOT) / table T-024 row ${FORMAT_ROW}: what was written ` +
          `under that row's extension does not begin as that row begins, so GRS would refuse ` +
          'to read its own output back',
      ).toBe(FORMAT_FIRST_CHARACTER)
    }

    // ⚠️ Recorded so that a pass says how much there was to judge. Two empty
    // documents are the same document, and would say nothing.
    test.info().annotations.push({
      type: 'note',
      description: `written out: ${first.text.length} and ${second.text.length} characters`,
    })
    expect(first.text.length, 'the first document written out is empty').toBeGreaterThan(0)

    const compared = await sameAfterNormalization(page, first.text, second.text)
    expect(
      compared.same,
      `table T-228 rows ${WHITESPACE_ROW} / ${NAME_ROW}: the two documents of one run differ ` +
        `from character ${compared.at}\n  first : ${compared.firstAt}\n  second: ${compared.secondAt}`,
    ).toBe(true)

    await context.close()
  },
)

// ---------------------------------------------------------------------------
// The declarations themselves (table T-219, row TW-2)
// ---------------------------------------------------------------------------

test('every row of table T-228 is either applied by a case or recorded as out of reach', () => {
  const covered = new Set(registry.declared().flatMap((one) => one.covers))
  for (const row of T228.rows) {
    const reason = OUT_OF_REACH[row.id]
    expect(
      covered.has(row.id) || reason !== undefined,
      `table T-228 row ${row.id} is neither applied by a case nor recorded as out of reach`,
    ).toBe(true)
    // ⭐ Put on the run rather than left in a constant nobody prints: a gap that
    // is only visible by reading this file is a gap that stops being read.
    if (reason !== undefined) {
      test.info().annotations.push({ type: 'note', description: `${row.id}: ${reason}` })
    }
  }
  for (const id of Object.keys(OUT_OF_REACH)) {
    expect(
      T228.rows.some((one) => one.id === id),
      `${id} is recorded as out of reach but is no longer a row of table T-228`,
    ).toBe(true)
    expect(covered.has(id), `${id} is recorded as out of reach but a case applies it`).toBe(false)
  }
})

test('every case declared here is one the Chapter 9 generator could use', () => {
  const known = new Set(
    [T228, T024, T103, T109].flatMap((table) => table.rows.map((one) => one.id)),
  )
  expectDeclarationsUsable(registry, known)
})

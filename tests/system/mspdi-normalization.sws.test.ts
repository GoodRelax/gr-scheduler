// System cases for SWS-6 of Chapter 6.1 (table T-218 row TS-3): the exchange format, written and compared.

import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { bare, specTable, type SpecRow, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { expectDeclarationsUsable, rowOf, swsRegistry } from './sws-case'

const registry = swsRegistry()
const { swsCase } = registry

const T228: SpecTable = specTable('T-228')
const T024: SpecTable = specTable('T-024')
const T103: SpecTable = specTable('T-103')
const T109: SpecTable = specTable('T-109')
const T025: SpecTable = specTable('T-025')
const T265: SpecTable = specTable('T-265')
const T033: SpecTable = specTable('T-033')

// see T-024
const FORMAT_ROW = 'IO-1'

// TRAP: keep this at IC-2; IC-3 is a different entrance that opens no
// Export Chooser at all.
const EXPORT_ENTRY_ROW = 'IC-2'

// see T-103
const CHOOSER_ROW = 'U-54'

// see T-109
const CLOSE_ENTRY_ROW = 'IC-52'

// see T-025
const SCREEN_ROW = 'MC-6'

// see T-228
const WHITESPACE_ROW = 'NR-2'

// see T-228
const NAME_ROW = 'NR-3'

// see T-228
const SIBLING_ORDER_ROW = 'NR-6'

// WHY: read out of the tables rather than written down here, so a row ID that
// moves fails at once instead of printing a dead reference in a message.
// see T-265
const REPEAT_ROW = rowOf(T265, 'MR-2').id

// see T-265
const READ_ORDER_ROW = rowOf(T265, 'MR-1').id

// see T-033
const WRITE_ORDER_ROW = rowOf(T033, 'EX-10').id

// WHY: recorded here (not left out) so the completeness check below still
// catches a new row that is neither covered nor excused.
const OUT_OF_REACH: Readonly<Record<string, string>> = {
  'NR-1':
    'the standard it adopts is implemented by neither the browser nor Node, and package.json ' +
    'declares no dependency that implements it',
  'NR-4':
    'the step needs the exchange partner schema to know which value carries which type, and ' +
    'the local copy Chapter 6.2 points at is untracked and absent from this tree',
  'NR-5': 'the same, for the one type the step singles out',
}

// WHY: named by row ID; the format name is not shown in the running
// application, so it is only used in what a failure prints.
/** @purity pure */
function formatNameOf(row: SpecRow): string {
  const name = bare(row.cells[0] ?? '')
  if (name === '') throw new Error(`table T-024 row ${row.id} names no format`)
  return name
}

/** @purity pure */
function partNameOf(row: SpecRow): string {
  const name = bare(row.cells[0] ?? '')
  if (name === '') throw new Error(`table T-103 row ${row.id} names no UI part`)
  return name
}

// see T-024
const T024_EXTENSION = 2
const T024_FIRST_CHARACTER = 3

/** @purity pure */
function spanOf(row: SpecRow, at: number): string | null {
  const found = /`([^`]+)`/.exec(row.cells[at] ?? '')
  return found === null ? null : (found[1] ?? null)
}

/** @purity pure */
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

// TRAP: this selector must match the row-ID marking the shell uses for
// entries of table T-109; drifting apart breaks this case silently.
/** @purity pure */
function entrySelector(rowId: string): string {
  return `[data-icon="${rowId}"]`
}

// TRAP: this selector must match the row-ID marking the shell uses for a
// format; drifting apart breaks this case silently.
/** @purity pure */
function formatSelector(rowId: string): string {
  return `[data-format="${rowId}"]`
}

// WHY: a document can leave through either the File System Access API or
// a download, so both are watched rather than assuming one.
const WRITTEN_FILES = '__writtenFiles'

interface WrittenFile {
  readonly suggestedName: string
  readonly text: string
}

// WHY: installed before the first page exists -- a later injection would
// already have missed the application reaching for the picker.
/** @purity non-pure */
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
        // WHY: decoded as UTF-8 -- table T-003 row CN-5 (MUST) fixes what is
        // written out, so decoding as another encoding would hide a failure.
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
          // WHY: DI-4 (MUST) has the overwrite check read the destination
          // before writing; DI-6 settles that a fresh handle reads as empty.
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

// WHY: a download never passes through the page's own script, so it is
// watched from Playwright's side instead of inside the page.
const DOWNLOADED = new WeakMap<Page, WrittenFile[]>()

/** @purity non-pure */
function watchDownloads(page: Page): void {
  const seen: WrittenFile[] = []
  DOWNLOADED.set(page, seen)
  page.on('download', (download) => {
    void (async () => {
      const saved = await download.path()
      if (saved === null) return
      // WHY: read as UTF-8 -- table T-003 row CN-5 (MUST) fixes what is
      // written out.
      seen.push({ suggestedName: download.suggestedFilename(), text: readFileSync(saved, 'utf8') })
    })()
  })
}

// WHY: the two surfaces are read in a fixed order, not interleaved by
// time, since no clock is shared between them.
/** @purity semi-pure-b */
async function writtenFilesOf(page: Page): Promise<readonly WrittenFile[]> {
  const inPage = await page.evaluate(
    /** @purity semi-pure-b */
    (key: string) => (Reflect.get(globalThis, key) as WrittenFile[] | undefined) ?? [],
    WRITTEN_FILES,
  )
  return [...inPage, ...(DOWNLOADED.get(page) ?? [])]
}

/** @purity non-pure */
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

// WHY: run inside the page, not here -- Node has no XML parser and the
// browser being judged does.
/** @purity semi-pure-b */
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
          // see NR-3
          /** @purity pure */
          const nameOf = (uri: string | null, local: string): string => `{${uri ?? ''}}${local}`
          const attributes = Array.from(element.attributes)
            // see NR-3
            .filter((one) => one.namespaceURI !== XMLNS && one.name !== 'xmlns')
            .map(
              (one) =>
                `${nameOf(one.namespaceURI, one.localName)}=${JSON.stringify(one.value)}`,
            )
            .sort()
            .join(' ')
          const hasElementChild = element.children.length > 0
          const values: string[] = []
          // see NR-6
          const columns = new Map<string, string[]>()
          for (const child of Array.from(element.childNodes)) {
            if (child.nodeType === Node.ELEMENT_NODE) {
              const one = child as Element
              const column = nameOf(one.namespaceURI, one.localName)
              const already = columns.get(column)
              // see NR-6
              if (already === undefined) columns.set(column, [written(one)])
              else already.push(written(one))
              continue
            }
            if (child.nodeType !== Node.TEXT_NODE) continue
            const text = child.nodeValue ?? ''
            // see NR-2
            if (hasElementChild && text.trim() === '') continue
            values.push(JSON.stringify(text))
          }
          // see NR-6
          const parts = [
            ...values,
            ...Array.from(columns.keys())
              .sort()
              .map((column) => (columns.get(column) ?? []).join('')),
          ]
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

// WHY: named here and used only where a type is asked for -- the nodes it
// speaks of live in the page, so none of it survives into the browser.
interface MovablePair {
  readonly parent: Element
  readonly earlier: Element
  readonly later: Element
}

interface ReorderedCopies {
  readonly base: string
  readonly acrossNames: string | null
  readonly acrossNamesAt: string
  readonly withinOneName: string | null
  readonly withinOneNameAt: string
}

// WHY: the copies are cut from the document the application wrote, not from
// markup made up here, so what is put in another order is the format's own.
/** @purity semi-pure-b */
async function reorderedCopies(page: Page, markup: string): Promise<ReorderedCopies> {
  return page.evaluate(
    /** @purity pure */
    (text: string) => {
      const serializer = new XMLSerializer()
      /** @purity pure */
      const parsed = (): Document => new DOMParser().parseFromString(text, 'application/xml')
      // see NR-3
      /** @purity pure */
      const nameOf = (one: Element): string => `{${one.namespaceURI ?? ''}}${one.localName}`
      /** @purity pure */
      const elementsOf = (doc: Document): Element[] => Array.from(doc.getElementsByTagName('*'))
      // see NR-6
      /** @purity pure */
      const acrossNames = (doc: Document): MovablePair | null => {
        for (const parent of elementsOf(doc)) {
          const earlier = parent.children[0]
          if (earlier === undefined) continue
          const later = Array.from(parent.children).find((one) => nameOf(one) !== nameOf(earlier))
          if (later !== undefined) return { parent, earlier, later }
        }
        return null
      }
      // see NR-6
      /** @purity pure */
      const withinOneName = (doc: Document): MovablePair | null => {
        for (const parent of elementsOf(doc)) {
          const children = Array.from(parent.children)
          for (let at = 0; at < children.length; at += 1) {
            const earlier = children[at]
            if (earlier === undefined) continue
            // WHY: the two must differ in what they hold, or putting them in
            // the other order would leave the document as it was.
            const later = children
              .slice(at + 1)
              .find(
                (one) =>
                  nameOf(one) === nameOf(earlier) &&
                  serializer.serializeToString(one) !== serializer.serializeToString(earlier),
              )
            if (later !== undefined) return { parent, earlier, later }
          }
        }
        return null
      }
      /** @purity pure */
      const whereOf = (found: MovablePair | null): string =>
        found === null
          ? 'nowhere'
          : `under ${found.parent.localName}: ${found.later.localName} put before ` +
            `${found.earlier.localName}`
      /** @purity pure */
      const movedBy = (find: (doc: Document) => MovablePair | null): string | null => {
        const doc = parsed()
        const found = find(doc)
        if (found === null) return null
        found.parent.insertBefore(found.later, found.earlier)
        return serializer.serializeToString(doc)
      }
      return {
        base: serializer.serializeToString(parsed()),
        acrossNames: movedBy(acrossNames),
        acrossNamesAt: whereOf(acrossNames(parsed())),
        withinOneName: movedBy(withinOneName),
        withinOneNameAt: whereOf(withinOneName(parsed())),
      }
    },
    markup,
  )
}

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  // WHY: closing this browser can outlast a hook's default timeout; the
  // allowance is applied explicitly here.
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

/** @purity non-pure */
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

    // WHY: counted, not named -- how a format is marked on this surface is
    // the one thing here the specification does not settle.
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

    // WHY: checked before the documents are compared -- two documents of
    // the wrong format would compare equal too and hide a bad choice.
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

    // WHY: records how much text there was, since two empty documents
    // would compare equal and say nothing.
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

test(
  swsCase({
    sws: 'SWS-6',
    level: 'System',
    covers: [SIBLING_ORDER_ROW],
    given: 'the application up in the reference browser on the screen of the base environment, having written the document it starts with out in the exchange format',
    when: 'that document is compared with two copies of itself, one with two siblings of different names put in the other order and one with two children of a single name put in the other order',
    then: 'the copy that moved siblings of different names is judged the same document and the copy that moved children of a single name is judged a different one, though both differ from it as text',
  }),
  async ({ baseURL }) => {
    test.setTimeout(180_000)
    const { context, page } = await openedApplication(baseURL)

    const written = await writeOutOnce(page)
    const copies = await reorderedCopies(page, written.text)

    // WHY: recorded because which siblings were moved is the document's
    // doing, not this case's, and a failure has to be traceable to them.
    test.info().annotations.push({
      type: 'note',
      description:
        `across names: ${copies.acrossNamesAt}; within one name: ${copies.withinOneNameAt}`,
    })

    const { acrossNames, withinOneName } = copies
    expect(
      acrossNames,
      `table T-228 row ${SIBLING_ORDER_ROW}: the document written out carries no parent with ` +
        'two siblings of different names, so the row has nothing to take out of the verdict',
    ).not.toBeNull()
    expect(
      withinOneName,
      `table T-228 row ${SIBLING_ORDER_ROW} / table T-265 row ${REPEAT_ROW}: the document ` +
        'written out carries no parent with two children of a single name that differ, so ' +
        "the row's MUST NOT cannot be shown",
    ).not.toBeNull()
    if (acrossNames === null || withinOneName === null) {
      throw new Error('unreachable: the two checks above hold these')
    }

    // WHY: checked before the verdicts -- NR-6 acts BEFORE NR-1, which keeps
    // the order of children, so a copy equal as text would say nothing.
    for (const [copy, what] of [
      [acrossNames, 'siblings of different names'],
      [withinOneName, 'children of a single name'],
    ] as const) {
      expect(
        copy === copies.base,
        `table T-228 row ${SIBLING_ORDER_ROW}: putting two ${what} in the other order left the ` +
          'document as it was, so nothing was moved and neither verdict below means anything',
      ).toBe(false)
    }

    const across = await sameAfterNormalization(page, copies.base, acrossNames)
    expect(
      across.same,
      `table T-228 row ${SIBLING_ORDER_ROW} (${copies.acrossNamesAt}): the order of siblings of ` +
        `different names reached the verdict, so a document read under table T-265 row ` +
        `${READ_ORDER_ROW} and written back in the order of table T-033 row ${WRITE_ORDER_ROW} ` +
        `would come out unequal to itself (FR-021)\n  first : ${across.firstAt}` +
        `\n  second: ${across.secondAt}`,
    ).toBe(true)

    const within = await sameAfterNormalization(page, copies.base, withinOneName)
    expect(
      within.same,
      `table T-228 row ${SIBLING_ORDER_ROW} (MUST NOT) / table T-265 row ${REPEAT_ROW} ` +
        `(${copies.withinOneNameAt}): the order of two children of a single name was taken out ` +
        'of the verdict as well, though that order is itself what the document says',
    ).toBe(false)

    await context.close()
  },
)

test('every row of table T-228 is either applied by a case or recorded as out of reach', () => {
  const covered = new Set(registry.declared().flatMap((one) => one.covers))
  for (const row of T228.rows) {
    const reason = OUT_OF_REACH[row.id]
    expect(
      covered.has(row.id) || reason !== undefined,
      `table T-228 row ${row.id} is neither applied by a case nor recorded as out of reach`,
    ).toBe(true)
    // WHY: put on the run, not just left in a constant -- a gap only
    // visible by reading this file stops being read.
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

// System tests: one sweep over measured defects, pressed out of the shipped build.

import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { readRepoFile } from '../spec-files'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { specTable, type SpecTable } from '../contract/spec-table'
import { DEFAULT_DISPLAY_SCALE, displayRatioAt } from '../fixtures/display-scale'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const T016: SpecTable = specTable('T-016')
const T023: SpecTable = specTable('T-023')
const T024: SpecTable = specTable('T-024')
const T025: SpecTable = specTable('T-025')
const T036: SpecTable = specTable('T-036')
const T109: SpecTable = specTable('T-109')
const T201: SpecTable = specTable('T-201')
const T204: SpecTable = specTable('T-204')
const T206: SpecTable = specTable('T-206')
const T212: SpecTable = specTable('T-212')
const T233: SpecTable = specTable('T-233')

// Why: by position, not by heading, as the headings are Japanese; the column count is guarded
// so a table that gains or loses a column fails here.
/** @purity pure */
function cellOf(table: SpecTable, specTableRowId: string, column: number, columns: number): string {
  const row = rowOf(table, specTableRowId)
  if (row.cells.length !== columns) {
    throw new Error(
      `table ${table.id} row ${specTableRowId} has ${row.cells.length} cells after the row ID, not the ` +
        `${columns} this file reads by position -- a column was added or taken away`,
    )
  }
  return row.cells[column] ?? ''
}

/** @purity pure */
function numberIn(cell: string, what: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) {
    throw new Error(`${what} states no number this file can read: ${JSON.stringify(cell)}`)
  }
  return value
}

const T206_COLUMNS = 3
const T206_DEFAULT = 1

const T212_COLUMNS = 5
const T212_VALUE = 1

const T036_COLUMNS = 4
const T036_ASSIGNMENT = 1
const T036_ENTRANCE = 2

const T023_COLUMNS = 4
const T023_ENTRANCE = 2

const T016_COLUMNS = 6
const T016_INPUT_KIND = 1

const T109_COLUMNS = 6
const T109_PLACE = 0
const T109_PURPOSE = 2
const T109_SOURCE = 3
const T109_STANCE = 5

const T233_COLUMNS = 5
const T233_SITUATION = 0

const T024_COLUMNS = 9
const T024_ENDING = 2
const T024_FIRST_CHARACTER = 5

const T204_COLUMNS = 4
const T204_DEFAULT = 2

const T201_COLUMNS = 7
const T201_DEFAULT = 3

// Why: read, never written down: the row has moved before, and a pinned number would go red
// for the manuscript changing, not the product.
const TASK_GROUP_INDENT = numberIn(cellOf(T201, 'S-37', T201_DEFAULT, T201_COLUMNS), 'T-201 S-37')

// Spec: FR-039, T-252, T-202, S-234, S-236
const DRAWN_RATIO = displayRatioAt(DEFAULT_DISPLAY_SCALE)

// Spec: FR-039, T-252, DS-1, S-37
const DRAWN_TASK_GROUP_INDENT = TASK_GROUP_INDENT * DRAWN_RATIO

// Spec: FR-039, T-252, DS-1, S-4, S-13
const DRAWN_PLAN_BAR_PX =
  numberIn(cellOf(T201, 'S-4', T201_DEFAULT, T201_COLUMNS), 'T-201 S-4') *
  numberIn(cellOf(T201, 'S-13', T201_DEFAULT, T201_COLUMNS), 'T-201 S-13') *
  DRAWN_RATIO

// Why: a browser hands back a drawn length already rounded, so the floor is let
// Why: down by half a pixel -- still well above the S-5 actual bar under it.
const BAR_FLOOR_PX = DRAWN_PLAN_BAR_PX - 0.5

// Why: FR-025 fixes the width and lets the height stretch, so the first number of S-81 is read.
const EXPORT_WIDTH = numberIn(cellOf(T204, 'S-81', T204_DEFAULT, T204_COLUMNS), 'T-204 S-81')

// Spec: FR-025, S-217
const EXPORT_HEIGHT_CAP = numberIn(cellOf(T204, 'S-217', T204_DEFAULT, T204_COLUMNS), 'T-204 S-217')

const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

// Spec: FR-036, S-203
const HELP_TEXT_SCALE = numberIn(cellOf(T206, 'S-203', T206_DEFAULT, T206_COLUMNS), 'T-206 S-203')

// Spec: FR-092, EZ-2, S-204
const TOOLTIP_TEXT_SCALE = numberIn(cellOf(T206, 'S-204', T206_DEFAULT, T206_COLUMNS), 'T-206 S-204')

// Spec: FR-101, S-210
const SAVED_AT_TEXT_SCALE = numberIn(cellOf(T206, 'S-210', T206_DEFAULT, T206_COLUMNS), 'T-206 S-210')

// Spec: S-235, HS-7
const HEADER_SCALE = numberIn(cellOf(T206, 'S-235', T206_DEFAULT, T206_COLUMNS), 'T-206 S-235')

// Spec: FR-092, EZ-2, S-124
const HINT_DELAY_MS = numberIn(cellOf(T212, 'S-124', T212_VALUE, T212_COLUMNS), 'T-212 S-124')

// Spec: FR-038
const DICTIONARY = join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json')

/** @purity non-pure */
async function dropText(page: Page, name: string, text: string | readonly number[]): Promise<void> {
  await page.evaluate(
    (file: { name: string; text: string | number[] }) => {
      Object.defineProperty(DataTransferItem.prototype, 'getAsFileSystemHandle', { value: undefined, configurable: true })
      const transfer = new DataTransfer()
      const body = typeof file.text === 'string' ? file.text : new Uint8Array(file.text)
      transfer.items.add(new File([body], file.name))
      const target = document.querySelector('[data-role="Schedule Canvas"]') as Element
      for (const type of ['dragenter', 'dragover', 'drop']) {
        target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer }))
      }
    },
    { name, text: typeof text === 'string' ? text : [...text] },
  )
}

interface ReasonWords {
  readonly specTableRowId: string
  readonly ja: string
  readonly en: string
}

// Why: read, not spelled: FR-038 gives every printed word one home, so a literal here would
// be a second copy.
/** @purity semi-pure-mutable */
function reasonWordsOfDictionary(): ReasonWords[] {
  const held = JSON.parse(readRepoFile(DICTIONARY, 'utf8')) as {
    reasons?: Array<{ specTableRowId?: string; text?: { ja?: string; en?: string } }>
  }
  const reasons = held.reasons ?? []
  if (reasons.length === 0) throw new Error(`${DICTIONARY} holds no reasons at all`)
  return reasons.map((one) => ({
    specTableRowId: one.specTableRowId ?? '',
    ja: one.text?.ja ?? '',
    en: one.text?.en ?? '',
  }))
}

// Spec: FR-101
/** @purity semi-pure-mutable */
function neverSavedWords(): readonly string[] {
  const held = JSON.parse(readRepoFile(DICTIONARY, 'utf8')) as {
    fileStatus?: Array<{ state?: string; text?: { ja?: string; en?: string } }>
  }
  const found = (held.fileStatus ?? []).find((one) => one.state === 'neverSaved')
  const words = [found?.text?.ja ?? '', found?.text?.en ?? ''].filter((one) => one !== '')
  if (words.length === 0) {
    throw new Error(`${DICTIONARY} holds no fileStatus word for a document never written to a file`)
  }
  return words
}

// Why: both languages are accepted: the display language follows the browser (FR-038), so
// one language's seven would fail a build running in the other.
/** @purity semi-pure-mutable */
function weekdayWords(): readonly string[] {
  const held = JSON.parse(readRepoFile(DICTIONARY, 'utf8')) as {
    weekdays?: Array<{ text?: { ja?: string; en?: string } }>
  }
  const words = (held.weekdays ?? []).flatMap((one) => [one.text?.ja ?? '', one.text?.en ?? ''])
  const said = words.filter((one) => one !== '')
  if (said.length === 0) throw new Error(`${DICTIONARY} holds no weekday words`)
  return said
}

// Spec: FR-036
// Why: GLYPH_TOKEN of dom-screen-surface.ts turns exactly this token into
// Why: the wheel glyph, wherever in a dictionary word it stands.
/** @purity pure */
const WHEEL_GLYPH_TOKEN = '{IC-102}'

// Spec: FR-036
/** @purity semi-pure-mutable */
function assignmentPressWordsByRow(): Map<string, string> {
  const held = JSON.parse(readRepoFile(DICTIONARY, 'utf8')) as {
    assignments?: Array<{ specTableRowId?: string; press?: { ja?: string; en?: string } }>
  }
  const rows = held.assignments ?? []
  if (rows.length === 0) throw new Error(`${DICTIONARY} holds no assignments at all`)
  return new Map(rows.map((one) => [one.specTableRowId ?? '', `${one.press?.ja ?? ''} ${one.press?.en ?? ''}`]))
}

// Spec: FR-036
// Why: table T-023's own entrance column is the one place carrying an icon
// Why: row's wheel operation (`MK-3` -> IC-12/IC-13; `MK-4` -> IC-14/IC-15).
/** @purity semi-pure-mutable */
function wheelOperationByIcon(): Map<string, string> {
  const out = new Map<string, string>()
  for (const row of T023.rows) {
    if (row.cells.length !== T023_COLUMNS) continue
    const entrance = row.cells[T023_ENTRANCE] ?? ''
    for (const icon of entrance.match(/IC-\d+[a-z]?/g) ?? []) {
      out.set(icon, row.id)
    }
  }
  return out
}

// Spec: FR-036
/** @purity pure */
function drawsTheWheelMark(
  row: string,
  pressWords: ReadonlyMap<string, string>,
  wheelIcon: ReadonlyMap<string, string>,
): boolean {
  const operation = row.startsWith('MK-') ? row : wheelIcon.get(row)
  if (operation === undefined) return false
  return (pressWords.get(operation) ?? '').includes(WHEEL_GLYPH_TOKEN)
}

// Why: counted by code point, so this file spells no Japanese character.
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
function flat(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

// Why: not bare of spec-table: that answers the first code span, and cells such as SK-3 and
// SK-16 hold two chords the screen prints in full.
/** @purity pure */
function assignmentText(cell: string): string {
  return flat(cell.replace(/[`*]/g, ''))
}

// Why: the manuscript writes a full-width plus with spaces and Ctrl; a driven keyboard wants
// + and Control.
// Why: one chord only; a cell listing two (SK-3, SK-7, SK-16) has no single answer.
/** @purity pure */
function pressable(cell: string): string {
  const plus = String.fromCharCode(0xff0b)
  const said = assignmentText(cell)
  if (said.includes('/')) {
    throw new Error(`the assignment ${JSON.stringify(said)} lists more than one chord`)
  }
  return said.split(plus).join('+').replace(/\s+/g, '').replace(/^Ctrl\+/, 'Control+')
}

// Spec: T-109
/** @purity pure */
function surfacesOf(cell: string): readonly string[] {
  return Array.from(cell.matchAll(/`([^`]+)`/g), (one) => one[1] ?? '')
}

// Spec: FR-036
// Why: read out of the sentence, found by its opening in code points (rule 03 section 5),
// Why: so a surface it gains is swept unedited; ASCII names drop the quoted column heading.
/** @purity semi-pure-mutable */
function helpBarred(): { readonly surfaces: ReadonlySet<string>; readonly rows: ReadonlySet<string> } {
  const opening = `${String.fromCharCode(0x8868)} T-109 ` +
    String.fromCharCode(0x306e, 0x3046, 0x3061, 0x3001)
  const requirements = readRepoFile(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8')
  const line = requirements.split(/\r?\n/).find((one) => one.includes(opening))
  if (line === undefined) throw new Error('FR-036 no longer holds the sentence that keeps rows of table T-109 off the help')
  const from = line.slice(line.indexOf(opening))
  const sentence = from.slice(0, from.indexOf(String.fromCharCode(0x3002)))
  const named = surfacesOf(sentence)
  const rows = new Set(named.filter((one) => /^IC-\d+$/.test(one)))
  const surfaces = new Set(
    named.filter((one) => /^[A-Z][A-Za-z ]+$/.test(one) && one !== HELP_SURFACE_NAME),
  )
  if (surfaces.size === 0 || rows.size === 0) {
    throw new Error('the FR-036 sentence that keeps rows off the help names no surface or no row')
  }
  return { surfaces, rows }
}

// Spec: FR-036
/** @purity semi-pure-mutable */
function helpListedEntrances(): ReadonlySet<string> {
  const barred = helpBarred()
  return new Set(
    T109.rows
      .filter((row) => row.cells.length === T109_COLUMNS)
      .filter((row) => {
        const on = surfacesOf(row.cells[T109_PLACE] ?? '').filter((one) => one !== HELP_SURFACE_NAME)
        if (on.length === 0) return false
        if (on.every((one) => barred.surfaces.has(one))) return false
        return !barred.rows.has(row.id)
      })
      .map((row) => row.id),
  )
}

// Spec: FR-036
// Why: the screen spells each chord of a cell Ctrl+A and writes the plus key with the help language's word.
function screenChordsOf(cell: string): readonly string[] {
  const words = JSON.parse(
    readRepoFile(join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'display-words.json'), 'utf8'),
  ) as { readonly keyNotation: readonly { readonly part: string; readonly text: Record<string, string> }[] }
  const plus = words.keyNotation.find((one) => one.part === 'plusKey')?.text ?? {}
  return cell
    .split('\uff0f')
    .map((chord) => chord.split('\uff0b').map((one) => one.trim()))
    .filter((keys) => keys.some((one) => one !== ''))
    .map((keys) => keys.map((one) => (one === '+' ? (plus['en'] ?? '+') : one)).join('+'))
}

// Why: cells carrying prose are left out: SK-8 writes Esc plus a pointer to IN-4, and the
// screen prints the key alone.
/** @purity pure */
function keyedShortcutRows(): ReadonlyArray<readonly [string, string, string]> {
  const listed = helpListedEntrances()
  const out: Array<readonly [string, string, string]> = []
  for (const row of T036.rows) {
    if (!/^SK-/.test(row.id)) continue
    if (row.cells.length !== T036_COLUMNS) continue
    const key = assignmentText(row.cells[T036_ASSIGNMENT] ?? '')
    if (key === '' || isJapanese(key)) continue
    // Why: U+2014 is the dash the manuscript writes where a row has no assignment.
    if (key === String.fromCharCode(0x2014)) continue
    const entrance = /IC-\d+/.exec(row.cells[T036_ENTRANCE] ?? '')
    out.push([row.id, entrance === null || !listed.has(entrance[0]) ? row.id : entrance[0], key])
  }
  if (out.length < 10) {
    throw new Error(`table T-036 gave only ${out.length} rows with a bare key; this file needs more`)
  }
  return out
}

// Why: taken from the input-kind column, so a property that becomes a color is swept unedited.
/** @purity pure */
function colorPropertyRows(): readonly string[] {
  const color = String.fromCharCode(0x8272)
  const found = T016.rows
    .filter((row) => cellOf(T016, row.id, T016_INPUT_KIND, T016_COLUMNS).includes(color))
    .map((row) => row.id)
  if (found.length === 0) throw new Error('table T-016 marks no property as a color')
  return found
}

// Why: no case spells an IC-nn of its own; an entrance is found by its purpose or source, so
// a renumbered entrance moves every case with it.
/** @purity pure */
function entranceBy(column: number, ...texts: readonly string[]): string {
  const found = T109.rows
    .filter((row) => row.cells.length === T109_COLUMNS)
    .filter((row) => texts.every((text) => (row.cells[column] ?? '').includes(text)))
  if (found.length !== 1) {
    throw new Error(
      `table T-109 has ${found.length} entrances whose column ${column} carries ` +
        `${JSON.stringify(texts)}, and this file needs exactly one`,
    )
  }
  return found[0]?.id ?? ''
}

/** @purity pure */
function entranceNamedIn(entrance: string): string {
  const said = cellOf(T109, entrance, T109_PURPOSE, T109_COLUMNS)
  const found = /IC-\d+/.exec(said)
  if (found === null) {
    throw new Error(`table T-109 row ${entrance} names no other entrance in its purpose`)
  }
  return found[0]
}

// Why: the time-axis word and the zoom-in and zoom-out words are code points, since a
// Japanese literal would be invisible in a diff.
const TIME_AXIS = String.fromCharCode(0x6642, 0x9593, 0x8ef8)
const ZOOM_IN = String.fromCharCode(0x62e1, 0x5927)
const ZOOM_OUT = String.fromCharCode(0x7e2e, 0x5c0f)

// Spec: NFR-004
// Why: the deliverable, not the sources or the dev server: a measured row means one pressed
// out of the build.
const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')

// Why: the same data-role handles live-app.ts uses; no spec row says how a part is marked,
// so a change to the marking should break these cases.
const CANVAS = '[data-role="Schedule Canvas"] svg'
const TOOLTIP = '[data-role="Tooltip"]'
const PANEL = '[data-role="Properties Panel"]'
const PALETTE = '[data-role="Command Palette"]'
const HELP_SURFACE_NAME = 'Help Modal'
const HELP = `[data-role="${HELP_SURFACE_NAME}"]`
const HEADER_FILE_STATUS = '[data-role="File Status"]'
const HEADER_FILE_NAME = '[data-role="Opened File Name"]'
const HEADER_SAVED_AT = '[data-role="File Saved At"]'

let browser: Browser | null = null
let plainContext: BrowserContext | null = null
let plainPage: Page | null = null

test.beforeAll(async () => {
  if (!existsSync(SHIPPED_BUILD)) {
    throw new Error(
      'the shipped build this file presses is not there; run `npm run build` first ' +
        '(dist/index.html)',
    )
  }
  browser = await launchReferenceBrowser()
  plainContext = await browser.newContext({ viewport: BASE_SCREEN })
  plainPage = await plainContext.newPage()
  await plainPage.goto(pathToFileURL(SHIPPED_BUILD).href)
  // Why: not a fixed pause: BO-1 keeps the page hidden until the size settles and the shell
  // may draw twice, so two identical readings are awaited.
  await readSettledDrawnSvg(plainPage)
})

// Why: the hook's own allowance: closing the browser can outlast a hook's 30s default;
// CLEARING_UP_MS carries the measurements.
test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

// Trap: the shared-page cases run in file order, the ones that disturb the document last;
// moving one of those earlier changes what the later cases read.
/** @purity semi-pure-mutable */
function shared(): Page {
  if (plainPage === null) throw new Error('the shipped build was not opened')
  return plainPage
}

interface Stubbed {
  readonly page: Page
  close(): Promise<void>
}

// Why: a driven browser cannot answer the host save picker, so a stand-in of its shape is put
// in; this proves what the app does with a handle, not that the real one is accepted.
// Why: the time zone is whole hours off UTC, so a printed hour tells the two apart.
/** @purity non-pure */
async function openStubbedPage(screen: { width: number; height: number } = BASE_SCREEN): Promise<Stubbed> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({
    viewport: screen,
    timezoneId: 'America/Denver',
  })
  await context.addInitScript(() => {
    const written: string[] = []
    let asked = 0
    let minted = 0
    const record = { asked: () => asked, written: () => written }
    ;(window as unknown as { grsSweepPicker: typeof record }).grsSweepPicker = record
    const decoded = async (part: unknown): Promise<string> => {
      if (typeof part === 'string') return part
      if (part instanceof Blob) return part.text()
      if (part instanceof Uint8Array) return new TextDecoder().decode(part)
      if (part instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(part))
      return ''
    }
    const handleNamed = (name: string): unknown => ({
      kind: 'file',
      name,
      async createWritable() {
        const parts: unknown[] = []
        return {
          async write(part: unknown) {
            parts.push(part)
          },
          async close() {
            let text = ''
            for (const part of parts) text += await decoded(part)
            // Trap: write the separator as the escape, never the raw NUL byte: a raw one makes this file
            // binary to grep, and the pre-publish sweep cannot read it.
            written.push(`${name}\0${text}`)
          },
          async abort() {},
        }
      },
      async queryPermission() {
        return 'granted'
      },
      async requestPermission() {
        return 'granted'
      },
      async getFile() {
        return new File([''], name)
      },
      async isSameEntry() {
        return false
      },
    })
    ;(window as unknown as { showSaveFilePicker: unknown }).showSaveFilePicker = async () => {
      asked += 1
      minted += 1
      return handleNamed(`sweep-${minted}`)
    }
  })
  const page = await context.newPage()
  await page.goto(pathToFileURL(SHIPPED_BUILD).href)
  await readSettledDrawnSvg(page)
  return {
    page,
    /** @purity non-pure */
    async close(): Promise<void> {
      await context.close()
    },
  }
}

interface Wrote {
  readonly asked: number
  readonly files: readonly string[]
  readonly bodies: readonly string[]
}

/** @purity semi-pure-mutable */
async function readWrites(page: Page): Promise<Wrote> {
  return page.evaluate(() => {
    const held = (window as unknown as { grsSweepPicker?: { asked(): number; written(): string[] } })
      .grsSweepPicker
    if (held === undefined) return { asked: -1, files: [], bodies: [] }
    const written = held.written()
    return {
      asked: held.asked(),
      files: written.map((one) => one.split('\0')[0] ?? ''),
      bodies: written.map((one) => one.slice((one.split('\0')[0] ?? '').length + 1)),
    }
  })
}

// Why: polling, not a fixed pause: the header catches up with a write seconds later, and a
// fixed pause either wastes time or reports a working header as broken.
/** @purity non-pure */
async function until<T>(
  page: Page,
  read: () => Promise<T>,
  good: (seen: T) => boolean,
  what: string,
  timeoutMs = 20_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs
  let seen = await read()
  while (Date.now() < deadline) {
    if (good(seen)) return seen
    await page.waitForTimeout(150)
    seen = await read()
  }
  throw new Error(`${what} was still not true after ${timeoutMs}ms; last reading ${JSON.stringify(seen)}`)
}

/** @purity semi-pure-mutable */
async function entranceBox(
  page: Page,
  entrance: string,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return page.evaluate((wanted: string) => {
    const element = document.querySelector(`[data-icon="${wanted}"]`)
    if (element === null) return null
    const box = element.getBoundingClientRect()
    if (box.width < 1 || box.height < 1) return null
    return { x: box.x, y: box.y, width: box.width, height: box.height }
  }, entrance)
}

// Why: a real pointer, not element.click(): the shell builds its input from pointer events,
// and a synthetic click reaches nothing.
/** @purity non-pure */
async function pressEntrance(page: Page, entrance: string): Promise<boolean> {
  const box = await entranceBox(page, entrance)
  if (box === null) return false
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(400)
  return true
}

// Why: SP-4 of FR-083 makes a press on an armed entrance a disarm, so the arming is read off
// data-armed before any press.
/** @purity non-pure */
async function armEntrance(page: Page, entrance: string): Promise<boolean> {
  const armed = async (): Promise<boolean> =>
    page.evaluate(
      (wanted: string) =>
        document.querySelector(`[data-icon="${wanted}"]`)?.getAttribute('data-armed') === 'true',
      entrance,
    )
  if (await armed()) return true
  if (!(await pressEntrance(page, entrance))) return false
  return armed()
}

/** @purity semi-pure-mutable */
async function readNotices(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    // Trap: the role is Notification Area; asking for Notice finds none and reads a defect as fixed.
    Array.from(document.querySelectorAll('[data-role]'))
      .filter((marked) => (marked.getAttribute('data-role') ?? '').includes('Notification'))
      .map((marked) => (marked.textContent ?? '').trim())
      .filter((said) => said !== ''),
  )
}

// Why: the host's ground text, not fontSizeStepSizes, is what S-197, S-203, S-204 and S-210
// multiply; it is read off the root so a rule on body cannot become the baseline.
/** @purity semi-pure-mutable */
async function groundTextPx(page: Page): Promise<number> {
  return page.evaluate(() =>
    Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
  )
}

/** @purity semi-pure-mutable */
async function leafTextSizes(page: Page, selector: string): Promise<Array<{ text: string; px: number }>> {
  return page.evaluate((wanted: string) => {
    const host = document.querySelector(wanted)
    if (host === null) return []
    return Array.from(host.querySelectorAll('*'))
      .filter((element) => element.children.length === 0)
      .map((element) => ({
        text: (element.textContent ?? '').trim(),
        px: Number.parseFloat(getComputedStyle(element).fontSize),
      }))
  }, selector)
}

/** @purity semi-pure-mutable */
async function drawnTextsReading(page: Page, reading: string): Promise<number> {
  return page.evaluate(
    (asked: { canvas: string; wanted: string }) =>
      Array.from(document.querySelectorAll(`${asked.canvas} text`)).filter(
        (drawn) => (drawn.textContent ?? '').trim() === asked.wanted,
      ).length,
    { canvas: CANVAS, wanted: reading },
  )
}

/** @purity semi-pure-mutable */
async function firstBarOnScreen(page: Page): Promise<{ x: number; y: number } | null> {
  return page.evaluate(
    (asked: { canvas: string; width: number; floor: number }) => {
      const svg = document.querySelector(asked.canvas)
      if (svg === null) return null
      // Why: the drawing is wider than the window, so the middle of the visible part is pressed,
      // not the bar's own middle.
      for (const shape of Array.from(svg.querySelectorAll('polygon'))) {
        const box = shape.getBoundingClientRect()
        const left = Math.max(box.x, 230)
        const right = Math.min(box.right, asked.width - 30)
        if (right - left < 120) continue
        if (box.y < 150 || box.bottom > 950) continue
        if (box.height < asked.floor) continue
        return { x: Math.round((left + right) / 2), y: Math.round(box.y + box.height / 2) }
      }
      return null
    },
    { canvas: CANVAS, width: BASE_SCREEN.width, floor: BAR_FLOOR_PX },
  )
}

// Why: Playwright's own double click, after a move from elsewhere: MK-13 is judged on the
// click count, and two presses spaced by a loaded machine are not reliably one.
/** @purity non-pure */
async function doubleClickBar(page: Page, at: { x: number; y: number }): Promise<void> {
  await page.mouse.move(at.x - 40, at.y - 40)
  await page.waitForTimeout(150)
  await page.mouse.dblclick(at.x, at.y)
  await page.waitForTimeout(1200)
}

interface RulerTier {
  readonly top: number
  readonly ticks: readonly number[]
  readonly words: readonly string[]
}

// Why: the ticks, not the words, are what LF-1 is about: a tier may print a word every second
// tick and still be ticked every day.
// Why: ticks are grouped by their top; zero-height lines at those heights divide nothing.
/** @purity semi-pure-mutable */
async function rulerTiers(page: Page): Promise<RulerTier[]> {
  return page.evaluate((canvas: string) => {
    const svg = document.querySelector(canvas)
    const rows = Array.from(document.querySelectorAll('[data-depth]'))
    if (svg === null || rows.length === 0) return []
    const firstTaskGroupTop = Math.min(...rows.map((row) => row.getBoundingClientRect().top))
    const ticks = new Map<number, number[]>()
    for (const drawn of Array.from(svg.querySelectorAll('line'))) {
      const box = drawn.getBoundingClientRect()
      if (box.height < 2 || box.bottom > firstTaskGroupTop + 1) continue
      const top = Math.round(box.top)
      const held = ticks.get(top) ?? []
      held.push(Math.round(box.x * 100) / 100)
      ticks.set(top, held)
    }
    const words = new Map<number, string[]>()
    for (const drawn of Array.from(svg.querySelectorAll('text'))) {
      const box = drawn.getBoundingClientRect()
      const said = (drawn.textContent ?? '').trim()
      if (said === '') continue
      // Why: skip the watermark: FR-020's marks are clipped to the Task Group Area but report
      // their unclipped box, and this walk picks labels by geometry.
      if (drawn.closest('[data-role="Watermark"]') !== null) continue
      // Why: the middle, not the edges: a word's box is taller than its tier, so a top or bottom
      // reading puts every word one tier off.
      const middle = (box.top + box.bottom) / 2
      if (middle > firstTaskGroupTop) continue
      let nearest: number | null = null
      for (const top of ticks.keys()) {
        if (middle < top) continue
        if (nearest === null || top > nearest) nearest = top
      }
      if (nearest === null) continue
      const held = words.get(nearest) ?? []
      held.push(said)
      words.set(nearest, held)
    }
    return [...ticks.entries()]
      .sort((one, two) => one[0] - two[0])
      .map(([top, xs]) => ({
        top,
        ticks: xs.sort((one, two) => one - two),
        words: words.get(top) ?? [],
      }))
  }, CANVAS)
}

/** @purity semi-pure-mutable */
async function panelDates(page: Page): Promise<{ start: string; finish: string; name: string } | null> {
  return page.evaluate(() => {
    const dateIn = (row: string): HTMLInputElement | null =>
      document.querySelector(`[data-field-row="${row}"] input[type="date"], input[type="date"][data-field-row="${row}"]`)
    const start = dateIn('PR-3')
    const finish = dateIn('PR-47')
    if (start === null || finish === null) return null
    const both = [start.value, finish.value]
    // Why: textarea, not input: CR-408 made the name field of PR-1 a textarea.
    const named = document.querySelector('[data-field-row="PR-1"] textarea') as HTMLTextAreaElement | null
    return { start: both[0] ?? '', finish: both[1] ?? '', name: named?.value ?? '' }
  })
}

/** @purity semi-pure-mutable */
async function drawnShapes(page: Page): Promise<string[]> {
  return page.evaluate(
    (canvas: string) =>
      Array.from(document.querySelectorAll(`${canvas} polygon`)).map((drawn) => {
        const box = drawn.getBoundingClientRect()
        return [
          Math.round(box.x),
          Math.round(box.y),
          Math.round(box.width),
          Math.round(box.height),
        ].join(',')
      }),
    CANVAS,
  )
}

// Why: the ending comes from table T-024, so the button is found by the manuscript's name
// for the format, not by words on the screen.
/** @purity non-pure */
async function pressExportFormat(page: Page, chooser: string, ending: string): Promise<boolean> {
  if (!(await pressEntrance(page, chooser))) return false
  await page.waitForTimeout(600)
  const at = await page.evaluate((wanted: string) => {
    const surface = document.querySelector('[data-role="Export Chooser"]')
    if (surface === null) return null
    const found = Array.from(surface.querySelectorAll('button')).filter((one) =>
      (one.textContent ?? '').includes(wanted),
    )
    const only = found[0]
    if (found.length !== 1 || only === undefined) return null
    const box = only.getBoundingClientRect()
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, ending)
  if (at === null) return false
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  return true
}

// Why: the band itself carries a data-icon; a reading that took the innermost marked node
// would report the band and the entrance as unrelated.
// Spec: T-109, S-200, FR-053
test('DFC-103: the minimize entrance rides the palette grab band, right of its mark, in no group', async () => {
  test.setTimeout(120_000)
  const page = shared()

  const minimize = entranceBy(T109_PURPOSE, 'S-200')
  const band = entranceNamedIn(minimize)

  const bandBox = await entranceBox(page, band)
  const minimizeBox = await entranceBox(page, minimize)
  expect(bandBox, `the grab band ${band} is not on the screen`).not.toBeNull()
  expect(minimizeBox, `the minimize entrance ${minimize} is not on the screen`).not.toBeNull()
  if (bandBox === null || minimizeBox === null) return

  const inside = await page.evaluate((wanted: string) => {
    const element = document.querySelector(`[data-icon="${wanted}"]`)
    if (element === null) return null
    return {
      groups: element.closest('[data-role="Palette Groups"]') !== null,
      commands: element.closest('[data-role="Palette Commands"]') !== null,
      inPalette: element.closest('[data-role="Command Palette"]') !== null,
    }
  }, minimize)
  expect(inside, `${minimize} vanished between two readings`).not.toBeNull()
  if (inside === null) return

  expect(
    inside.inPalette,
    `${minimize} is not drawn inside the Command Palette at all, and FR-053 puts it on its band`,
  ).toBe(true)
  expect(
    inside.groups,
    `${minimize} is drawn inside a Palette Groups box; table T-109 puts it on the grab band`,
  ).toBe(false)
  expect(
    inside.commands,
    `${minimize} is drawn inside a Palette Commands box; table T-109 puts it on the grab band`,
  ).toBe(false)

  expect(
    minimizeBox.x,
    `${minimize} does not stand to the right of ${band}, and table T-109 says it lines up right of it`,
  ).toBeGreaterThan(bandBox.x)
  expect(
    Math.round(minimizeBox.x + minimizeBox.width),
    `${minimize} is not at the right end of the band (band ends at ` +
      `${Math.round(bandBox.x + bandBox.width)})`,
  ).toBe(Math.round(bandBox.x + bandBox.width))
})

// Why: both the box's direction and the two tops are read: side by side would be first in the
// box without being above.
// Spec: FR-101
test('DFC-126: the header stands the file name above the time it was written', async () => {
  test.setTimeout(120_000)
  const page = shared()

  const laid = await page.evaluate(
    (asked: { status: string; name: string; at: string }) => {
      const status = document.querySelector(asked.status)
      const name = document.querySelector(asked.name)
      const stamp = document.querySelector(asked.at)
      if (status === null || name === null || stamp === null) return null
      const order = Array.from(status.children).map((child) => child.getAttribute('data-role'))
      return {
        direction: getComputedStyle(status).flexDirection,
        order,
        nameTop: name.getBoundingClientRect().top,
        stampTop: stamp.getBoundingClientRect().top,
        nameHolds: name.parentElement === status,
        stampHolds: stamp.parentElement === status,
      }
    },
    { status: HEADER_FILE_STATUS, name: HEADER_FILE_NAME, at: HEADER_SAVED_AT },
  )
  expect(laid, 'the header has no File Status box holding the name and the stamp').not.toBeNull()
  if (laid === null) return

  expect(laid.nameHolds && laid.stampHolds, 'the name and the stamp are not both in File Status').toBe(true)
  expect(
    laid.direction,
    'File Status does not stack its children, so nothing in it can be above anything else',
  ).toBe('column')
  expect(
    laid.order,
    'File Status holds its two children in an order FR-101 does not ask for',
  ).toEqual(['Opened File Name', 'File Saved At'])
  expect(
    laid.nameTop,
    `the name is drawn at y=${laid.nameTop} and the stamp at y=${laid.stampTop}; FR-101 (MUST) ` +
      'puts the name above the time',
  ).toBeLessThanOrEqual(laid.stampTop)
})

// Spec: FR-101, S-210
test('DFC-65: the header stamp is drawn at S-210 of the ground text, and says so before any write', async () => {
  test.setTimeout(120_000)
  const page = shared()

  const ground = await groundTextPx(page)
  expect(ground, 'the page reports no ground text size at all').toBeGreaterThan(0)

  const drawn = await page.evaluate(
    (asked: { at: string; name: string }) => {
      const stamp = document.querySelector(asked.at)
      const name = document.querySelector(asked.name)
      if (stamp === null || name === null) return null
      return {
        stampPx: Number.parseFloat(getComputedStyle(stamp).fontSize),
        namePx: Number.parseFloat(getComputedStyle(name).fontSize),
        said: (stamp.textContent ?? '').trim(),
      }
    },
    { at: HEADER_SAVED_AT, name: HEADER_FILE_NAME },
  )
  expect(drawn, 'the header has no File Saved At part').not.toBeNull()
  if (drawn === null) return

  const headerGround = ground * HEADER_SCALE
  expect(
    drawn.stampPx,
    `the stamp is drawn at ${drawn.stampPx}px, and HS-7 puts it at S-210 (${SAVED_AT_TEXT_SCALE}) of ` +
      `S-235 (${HEADER_SCALE}) of the ground text (${ground}px), ${headerGround * SAVED_AT_TEXT_SCALE}px`,
  ).toBeCloseTo(headerGround * SAVED_AT_TEXT_SCALE, 1)
  expect(
    drawn.stampPx,
    'the stamp is drawn at the header ground size, so the coefficient reaches nothing',
  ).not.toBeCloseTo(headerGround, 1)

  const words = neverSavedWords()
  expect(
    words.some((one) => drawn.said.includes(one)),
    `nothing has been written yet and the header says ${JSON.stringify(drawn.said)}; FR-101 (MUST) ` +
      `asks for one of ${JSON.stringify(words)} in place of a time`,
  ).toBe(true)
})

// Why: a control first: nothing happening is also what a key that never reached the page
// looks like, so SK-14 is pressed and the palette watched.
// Spec: T-024a, OP-13, SK-21, SK-14
test('DFC-98: with no file open, the reload key of SK-21 does nothing', async () => {
  test.setTimeout(120_000)
  const page = shared()

  const reloadKey = pressable(cellOf(T036, 'SK-21', T036_ASSIGNMENT, T036_COLUMNS))
  const paletteKey = pressable(cellOf(T036, 'SK-14', T036_ASSIGNMENT, T036_COLUMNS))

  const paletteStanding = async (): Promise<boolean> =>
    page.evaluate((wanted: string) => document.querySelector(wanted) !== null, PALETTE)

  await page.mouse.move(Math.round(BASE_SCREEN.width * 0.5), Math.round(BASE_SCREEN.height * 0.6))

  // Step: the control: an assigned key reaches the application.
  const before = await paletteStanding()
  await page.keyboard.press(paletteKey)
  await page.waitForTimeout(600)
  const during = await paletteStanding()
  expect(
    during,
    `pressing ${paletteKey} (table T-036 row SK-14) did not change whether the Command Palette ` +
      'stands, so keys are not reaching this build and the reading below would prove nothing',
  ).not.toBe(before)
  await page.keyboard.press(paletteKey)
  await page.waitForTimeout(600)
  expect(await paletteStanding(), 'the control did not put the palette back').toBe(before)

  const noFile = await page.evaluate(
    (wanted: string) => (document.querySelector(wanted)?.textContent ?? '').trim(),
    HEADER_SAVED_AT,
  )
  expect(
    neverSavedWords().some((one) => noFile.includes(one)),
    `this case needs a build with no file open and the header says ${JSON.stringify(noFile)}`,
  ).toBe(true)

  const wasDrawn = await readSettledDrawnSvg(page)
  const wasSurfaces = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-role]'))
      .map((marked) => marked.getAttribute('data-role') ?? '')
      .sort(),
  )
  const wasThere = page.url()

  await page.keyboard.press(reloadKey)
  await page.waitForTimeout(1500)

  expect(page.url(), `${reloadKey} took the page somewhere else`).toBe(wasThere)
  expect(
    await readNotices(page),
    `${reloadKey} raised a notice, and OP-13 (MUST) has it do nothing with no file open`,
  ).toEqual([])
  expect(
    await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-role]'))
        .map((marked) => marked.getAttribute('data-role') ?? '')
        .sort(),
    ),
    `${reloadKey} put a surface up or took one down`,
  ).toEqual(wasSurfaces)
  expect(
    (await readSettledDrawnSvg(page)) === wasDrawn,
    `${reloadKey} changed the drawing, and OP-13 (MUST) has it do nothing with no file open`,
  ).toBe(true)
})

// Why: every leaf that carries text is measured, not the outer box, since textContent on a
// container answers its children's words.
// Spec: FR-092, EZ-2, S-204, S-124
test('DFC-106: the words a tooltip puts up are drawn at S-204 of the ground text', async () => {
  test.setTimeout(180_000)
  const page = shared()

  const ground = await groundTextPx(page)
  const zoomIn = entranceBy(T109_PURPOSE, TIME_AXIS, ZOOM_IN)
  const box = await entranceBox(page, zoomIn)
  expect(box, `the entrance ${zoomIn} is not on the screen to rest a pointer on`).not.toBeNull()
  if (box === null) return

  // Why: the pointer arrives from elsewhere, as EZ-2 starts the wait when the pointer stops.
  await page.mouse.move(box.x - 200, box.y + 260)
  await page.waitForTimeout(250)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(HINT_DELAY_MS + 1500)

  const leaves = (await leafTextSizes(page, TOOLTIP)).filter((one) => one.text !== '')
  expect(
    leaves.length,
    `nothing was put up after resting ${HINT_DELAY_MS + 1500}ms on ${zoomIn}, so there is no text ` +
      'to measure',
  ).toBeGreaterThan(0)

  for (const leaf of leaves) {
    expect(
      leaf.px,
      `a tooltip leaf reading ${JSON.stringify(leaf.text)} is drawn at ${leaf.px}px, and S-204 ` +
        `(${TOOLTIP_TEXT_SCALE}) of the ground text (${ground}px) is ${ground * TOOLTIP_TEXT_SCALE}px`,
    ).toBeCloseTo(ground * TOOLTIP_TEXT_SCALE, 1)
  }
  expect(
    ground * TOOLTIP_TEXT_SCALE,
    'S-204 has become 1, so this case would pass with no coefficient applied at all',
  ).not.toBeCloseTo(ground, 1)

  await page.mouse.move(4, BASE_SCREEN.height - 10)
  await page.waitForTimeout(500)
})

// Spec: FR-036, S-203, T-036
test('DFC-105: a help item reads shape, description, assignment, drawn at S-203', async () => {
  test.setTimeout(180_000)
  const page = shared()

  const ground = await groundTextPx(page)
  // Why: FR-036 also owns the legend mark, which stands inside the help itself;
  // Why: only a row placed outside the Help Modal can be what opens it.
  const helpSurface = /"([^"]+)"/.exec(HELP)?.[1] ?? HELP
  const helpEntrances = T109.rows
    .filter((row) => row.cells.length === T109_COLUMNS)
    .filter((row) => (row.cells[T109_SOURCE] ?? '').includes('FR-036'))
    .filter((row) => !(row.cells[T109_PLACE] ?? '').includes(helpSurface))
    .map((row) => row.id)
  expect(helpEntrances, 'table T-109 gives FR-036 no entrance outside the help').not.toEqual([])
  let helpEntrance = ''
  for (const candidate of helpEntrances) {
    if (await pressEntrance(page, candidate)) {
      helpEntrance = candidate
      break
    }
  }
  expect(helpEntrance, `none of ${helpEntrances.join(', ')} is on the screen`).not.toBe('')
  await page.waitForTimeout(1200)

  const read = await page.evaluate((wanted: string) => {
    const modal = document.querySelector(wanted)
    if (modal === null) return null
    const items = Array.from(modal.querySelectorAll('[data-table][data-row]'))
    return {
      count: items.length,
      tables: Array.from(new Set(items.map((one) => one.getAttribute('data-table') ?? ''))).sort(),
      shaped: items.map((one) => ({
        table: one.getAttribute('data-table') ?? '',
        row: one.getAttribute('data-row') ?? '',
        places: one.children.length,
        svgAt: Array.from(one.children).map((place) => place.querySelectorAll('svg').length),
        texts: Array.from(one.children).map((place) => (place.textContent ?? '').replace(/\s+/g, ' ').trim()),
        sizes: Array.from(one.querySelectorAll('*'))
          .filter((leaf) => leaf.children.length === 0)
          .map((leaf) => Number.parseFloat(getComputedStyle(leaf).fontSize)),
      })),
    }
  }, HELP)
  expect(read, 'pressing the help entrance put no Help Modal on the screen').not.toBeNull()
  if (read === null) return

  // Why: a guard, not the assertion: an empty help must not pass vacuously.
  for (const table of ['T-109', 'T-036', 'T-023']) {
    expect(read.tables, `the help lists nothing from ${table}, which FR-036 (MUST) has it cover`).toContain(
      table,
    )
  }
  for (const table of ['T-023a', 'T-023b', 'T-023c', 'T-023d']) {
    expect(read.tables, `the help lists ${table}, which FR-036 (MUST NOT) bars`).not.toContain(table)
  }
  // Spec: FR-036
  // Why: CR-785 took MK-15, MK-16 and MK-17 off the list (FR-036); they are known by touching.
  const helpMouseRows = ['MK-2', 'MK-5', 'MK-7']
  // Why: CR-635 keeps the rows helpBarred names off the list, and CR-637 moves
  // Why: a key whose entrance item is not listed into the block of keys with no entrance.
  const listedEntrances = helpListedEntrances()
  const t109Listed = T109.rows.filter((row) => listedEntrances.has(row.id))
  const foldedIntoOne = t109Listed.filter((row) => (row.cells[T109_STANCE] ?? '').includes('AR-3')).length
  const keysWithoutEntrance = T036.rows
    .filter((row) => /^SK-/.test(row.id) && row.cells.length === T036_COLUMNS)
    .filter((row) => {
      const dash = String.fromCharCode(0x2014)
      if (assignmentText(row.cells[T036_ASSIGNMENT] ?? '') === dash) return false
      if (assignmentText(row.cells[T036_ENTRANCE] ?? '') === dash) return true
      const entrances = (row.cells[T036_ENTRANCE] ?? '').match(/IC-\d+/g) ?? []
      return entrances.length > 0 && !entrances.some((one) => listedEntrances.has(one))
    }).length
  // Spec: FR-036, T-255
  const combosOf = (cell: string): string[] =>
    assignmentText(cell)
      .split(' / ')
      .map((one) => one.replace(/\uff0b/g, '+').replace(/\s+/g, ''))
      .filter((one) => one !== '')
  const t036Combos = new Set(T036.rows.flatMap((row) => combosOf(row.by['割当'] ?? '')))
  const browserRowsListed = specTable('T-255').rows.filter(
    (row) => !combosOf(row.by['割当'] ?? '').some((one) => t036Combos.has(one)),
  ).length
  const owedItems =
    t109Listed.length - foldedIntoOne + keysWithoutEntrance + helpMouseRows.length + browserRowsListed
  expect(read.count, 'the help does not put up the item count FR-036 adds up to').toBe(owedItems)

  const wrongPlaces = read.shaped.filter((one) => one.places !== 3)
  expect(
    wrongPlaces.map((one) => `${one.row} has ${one.places}`),
    'a help item does not hold the three places FR-036 (MUST) asks for',
  ).toEqual([])

  const shapeInDescription = read.shaped.filter((one) => (one.svgAt[1] ?? 0) > 0)
  expect(
    shapeInDescription.map((one) => one.row),
    'a help item draws a shape in its second place, which FR-036 (MUST) gives to the description alone',
  ).toEqual([])

  const pressWords = assignmentPressWordsByRow()
  const wheelIcon = wheelOperationByIcon()
  const shapeOutOfPlace = read.shaped.filter(
    (one) => (one.svgAt[2] ?? 0) > 0 && !drawsTheWheelMark(one.row, pressWords, wheelIcon),
  )
  expect(
    shapeOutOfPlace.map((one) => one.row),
    'a help item draws a shape in its third place that is not the wheel mark IC-102 -- FR-036 (MUST) ' +
      'gives the third place to the assignment, and JDG-76 (CR-377) is the only reason an assignment ever draws one',
  ).toEqual([])

  const silent = read.shaped.filter((one) => (one.texts[1] ?? '') === '')
  expect(
    silent.map((one) => one.row),
    'a help item carries no description in its second place',
  ).toEqual([])

  const printedByRow = new Map(read.shaped.map((one) => [one.row, one.texts]))
  const wrongKeys: string[] = []
  for (const [specTableRowId, itemId, key] of keyedShortcutRows()) {
    const places = printedByRow.get(itemId)
    if (places === undefined) {
      wrongKeys.push(`${specTableRowId} is carried by ${itemId}, which is not in the help at all`)
      continue
    }
    // Why: an entrance item may carry a key and a mouse operation in one place
    // Why: (FR-036), so the key is looked for inside the place, not as all of it.
    if (!screenChordsOf(key).every((chord) => (places[2] ?? '').includes(chord))) {
      wrongKeys.push(`${itemId} prints ${JSON.stringify(places[2] ?? '')} where T-036 ${specTableRowId} writes ${JSON.stringify(key)}`)
    }
  }
  expect(wrongKeys, 'the help does not stand the keys of table T-036 in the third place').toEqual([])

  const wrongSize = read.shaped
    .flatMap((one) => one.sizes.map((px) => ({ row: one.row, px })))
    .filter((one) => Math.abs(one.px - ground * HELP_TEXT_SCALE) > 0.05)
  expect(
    wrongSize.slice(0, 8).map((one) => `${one.row} at ${one.px}px`),
    `a help item is drawn at a size other than S-203 (${HELP_TEXT_SCALE}) of the ground text ` +
      `(${ground}px), which is ${ground * HELP_TEXT_SCALE}px`,
  ).toEqual([])

  // Step: Escape closes the surface (IN-4, SK-8).
  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
  expect(
    await page.evaluate((wanted: string) => document.querySelector(wanted) !== null, HELP),
    'the help would not close, so the cases after this one would be pressing through it',
  ).toBe(false)
})

// Spec: MK-13, PR-1
test('DFC-43: double-clicking a task opens the panel with all of the name selected', async () => {
  test.setTimeout(180_000)
  const page = shared()

  const bar = await firstBarOnScreen(page)
  expect(
    bar,
    'no task bar has a middle on the screen to double-click: a drawn plan bar stands ' +
      `${DRAWN_PLAN_BAR_PX.toFixed(4)}px tall, S-4 x S-13 at the ratio FR-039 (MUST) gives -- ` +
      '「描く比は、`S-234` を 100 で割り、同書の 表 T-206 の `S-236` を掛けた値とすること（MUST）」',
  ).not.toBeNull()
  if (bar === null) return

  await doubleClickBar(page, bar)

  const state = await page.evaluate((wanted: string) => {
    const panel = document.querySelector(wanted)
    const active = document.activeElement as HTMLInputElement | null
    return {
      panelShown: panel === null ? null : getComputedStyle(panel).display,
      tag: active?.tagName ?? '',
      row: active?.closest('[data-field-row]')?.getAttribute('data-field-row') ?? '',
      value: active?.value ?? '',
      start: active?.selectionStart ?? -1,
      end: active?.selectionEnd ?? -1,
    }
  }, PANEL)

  expect(state.panelShown, 'a double click on a task body left the Properties Panel hidden').not.toBe('none')
  // Why: FR-006 has a text field wrap inside the panel and grow downwards, which a one-line input cannot do.
  expect(state.tag, 'the focus after a double click is not in a wrapping name field').toBe('TEXTAREA')
  expect(
    state.row,
    `the focus landed in field row ${JSON.stringify(state.row)}, and MK-13 (MUST) names PR-1`,
  ).toBe('PR-1')
  expect(state.value, 'the name field the focus landed in is empty, so a selection proves nothing').not.toBe('')
  expect(
    { start: state.start, end: state.end, length: state.value.length },
    `MK-13 (MUST) asks for 「既にある文字をすべて選んだ状態」 and the field holds ` +
      `${JSON.stringify(state.value)} with ${state.start}..${state.end} selected`,
  ).toEqual({ start: 0, end: state.value.length, length: state.value.length })
})

// Why: anything merely beside the input is left out, the CV-9 custom entrance among them:
// whether a swatch beside it breaks FR-006 is not settled yet (DFC-979).
// Spec: FR-006, CV-9
test('DFC-82: nothing drawn over a color control shows the color it holds', async () => {
  test.setTimeout(120_000)
  const page = shared()

  const colorRows = colorPropertyRows()
  const judged: Array<{ row: string; value: string; over: string[] }> = []
  let pressed = 0
  for (const specTableRowId of colorRows) {
    const row = page.locator(`${PANEL} div[data-field-row="${specTableRowId}"]`).first()
    if ((await row.count()) === 0) continue
    const entrances = row.locator('button[data-color-custom-entry]')
    const count = await entrances.count()
    for (let index = 0; index < count; index += 1) {
      await entrances.nth(index).click()
      pressed += 1
      await expect
        .poll(async () => row.locator('input[type="color"]').count(), {
          message: `pressing the custom-color entrance of ${specTableRowId} brought up no host color input (CV-9)`,
          timeout: 5_000,
        })
        .toBeGreaterThan(0)
      judged.push(
        ...(await row.evaluate((rowElement: Element, asked: { rowName: string; panel: string }) => {
          const hexOf = (painted: string): string => {
            const parts = /rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/.exec(painted)
            if (parts === null || parts[4] === '0') return ''
            return `#${[parts[1], parts[2], parts[3]]
              .map((one) => Number(one).toString(16).padStart(2, '0'))
              .join('')}`
          }
          const out: Array<{ row: string; value: string; over: string[] }> = []
          for (const control of Array.from(rowElement.querySelectorAll('input[type="color"]'))) {
            const value = (control as HTMLInputElement).value.toLowerCase()
            const box = control.getBoundingClientRect()
            const over: string[] = []
            // Why: only the panel is searched -- the chart the panel floats over is behind it, not in front.
            const panel = rowElement.closest(asked.panel) ?? rowElement
            for (const node of Array.from(panel.querySelectorAll('*'))) {
              if (node === control || node.contains(control) || control.contains(node)) continue
              const its = node.getBoundingClientRect()
              if (its.width === 0 || its.height === 0) continue
              const overlaps =
                its.left < box.right && box.left < its.right && its.top < box.bottom && box.top < its.bottom
              if (!overlaps) continue
              const style = getComputedStyle(node)
              if (hexOf(style.backgroundColor) === value) {
                over.push(`a ${node.tagName} painted ${value}`)
              }
              const fill = (node.getAttribute('fill') ?? '').toLowerCase()
              const shape = node instanceof SVGGeometryElement && hexOf(style.fill) === value
              if (fill === value || shape) {
                over.push(`a ${node.tagName} filled ${value}`)
              }
              if ((node.textContent ?? '').toLowerCase().includes(value)) {
                over.push(`a ${node.tagName} prints ${value}`)
              }
            }
            out.push({ row: asked.rowName, value, over })
          }
          return out
        }, { rowName: specTableRowId, panel: PANEL })),
      )
    }
  }

  expect(
    pressed,
    `the panel drew no custom-color entrance for any of ${colorRows.join(', ')}, which table T-016 marks ` +
      'as colors -- so this case would pass on an empty panel',
  ).toBeGreaterThan(0)
  expect(judged.length, 'no host color input was there to judge').toBeGreaterThan(0)
  const showing = judged.flatMap((one) => one.over.map((said) => `${one.row}: ${said} over the control`))
  expect(showing, 'FR-006 (MUST NOT) forbids drawing the value over the control that shows it').toEqual([])
})

// Trap: this case changes the document, so it and the next two stand at the end of the page's
// order; moving it earlier hands a renamed drawing to the reading cases.
// Spec: FR-006, PR-1, SK-19
test('DFC-130: a name settled in the panel reaches the drawing', async () => {
  test.setTimeout(180_000)
  const page = shared()

  const bar = await firstBarOnScreen(page)
  expect(
    bar,
    'no task bar has a middle on the screen: a drawn plan bar stands ' +
      `${DRAWN_PLAN_BAR_PX.toFixed(4)}px tall, S-4 x S-13 at the ratio FR-039 (MUST) gives -- ` +
      '「描く比は、`S-234` を 100 で割り、同書の 表 T-206 の `S-236` を掛けた値とすること（MUST）」',
  ).not.toBeNull()
  if (bar === null) return
  await doubleClickBar(page, bar)

  const was = await page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.value ?? '')
  expect(was, 'the name field is empty, so there is nothing to change').not.toBe('')
  expect(
    await drawnTextsReading(page, was),
    `the drawing does not read ${JSON.stringify(was)} even once, so it is not the label of the bar ` +
      'that was double-clicked',
  ).toBe(1)

  // Why: a reading distinctive enough that no document could hold it already.
  const now = 'SweptName-D130'
  expect(await drawnTextsReading(page, now), `${now} is already on the screen`).toBe(0)

  await page.keyboard.type(now)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(1200)

  expect(
    await drawnTextsReading(page, now),
    `settling ${JSON.stringify(now)} in PR-1 did not put it on the drawing`,
  ).toBe(1)
  expect(
    await drawnTextsReading(page, was),
    `the old name ${JSON.stringify(was)} is still drawn after PR-1 was settled to something else`,
  ).toBe(0)
})

// Trap: leans on the case above having renamed the drawing, and puts the document back; a
// case moved between the two reads the wrong name.
// Spec: IN-6, FR-031, SK-6
test('DFC-152: settling the same value again writes nothing, so one undo puts the name back', async () => {
  test.setTimeout(180_000)
  const page = shared()

  const now = 'SweptName-D130'
  expect(
    await drawnTextsReading(page, now),
    'the case for DFC-130 did not leave its name on the drawing, so there is nothing to settle twice',
  ).toBe(1)

  // Step: the same value again, through the SK-19 key.
  await page.keyboard.press('Enter')
  await page.waitForTimeout(800)
  expect(
    await drawnTextsReading(page, now),
    'settling the same value again took the name off the drawing',
  ).toBe(1)

  const undo = pressable(cellOf(T036, 'SK-6', T036_ASSIGNMENT, T036_COLUMNS))
  await page.keyboard.press(undo)
  await page.waitForTimeout(1200)

  expect(
    await drawnTextsReading(page, now),
    `one ${undo} left ${JSON.stringify(now)} on the drawing, so a second, empty edit was written ` +
      'and the undo stack has a step nobody made (IN-6 MUST NOT)',
  ).toBe(0)
})

// Why: a line's height is read as the distance between two labels' tops, as S-136 and S-179
// place a label inside its line and name no height.
// Why: a stage is named by the pair (line count, first line's shape): TM-2 and TM-3 both stand
// on two lines, so a count alone cannot tell them apart.
// Why: the presses are not counted out: the opening stage moves with the font (S-3), so the
// walk presses until the stage changes, under a ceiling.
// Spec: FR-017, T-238, TM-1, TM-2, TM-3, TM-4
test('DFC-92: the ruler band keeps its height across stages and splits it evenly', async () => {
  test.setTimeout(180_000)
  const page = shared()

  // Why: docs/spec states no grammar for the table's tokens, so a token this case cannot read
  // throws rather than being guessed.
  const notPrinted = String.fromCharCode(0x5237, 0x3089, 0x306a, 0x3044)
  const thirdLine = 3
  const shapeOf = (token: string): RegExp => {
    if (token === 'yyyy') return /^\d{4}$/
    if (token === 'yyyy-mm') return /^\d{4}-\d{1,2}$/
    throw new Error(
      `table T-238 writes ${JSON.stringify(token)} on a first 行, and this case reads only ` +
        '`yyyy` and `yyyy-mm`',
    )
  }
  const tiers = ['TM-1', 'TM-2', 'TM-3', 'TM-4'].map((row) => ({
    row,
    lines: [T238_FIRST_LINE, T238_SECOND_LINE, thirdLine].filter(
      (column) => tierLine(row, column) !== notPrinted,
    ).length,
    first: shapeOf(tierLine(row, T238_FIRST_LINE)),
  }))
  const keyOf = (one: { lines: number; first: RegExp }): string => `${one.lines}/${one.first.source}`
  expect(
    new Set(tiers.map(keyOf)).size,
    `table T-238 no longer tells its four 段 apart by how many 行 they stand on and what the first ` +
      `of them prints (${tiers.map((one) => `${one.row} ${keyOf(one)}`).join(', ')}), so a sweep ` +
      'can no longer say which boundary it crossed',
  ).toBe(4)

  const readBand = async (): Promise<{
    height: number
    lines: Array<{ top: number; words: string[] }>
  } | null> =>
    page.evaluate((canvas: string) => {
      const svg = document.querySelector(canvas)
      const rows = Array.from(document.querySelectorAll('[data-depth]'))
      if (svg === null || rows.length === 0) return null
      const firstTaskGroupTop = Math.min(...rows.map((row) => row.getBoundingClientRect().top))
      // Why: nothing in the spec marks the band, so it is found by where it is; a change of shape
      // breaks this case, as it should.
      const band = Array.from(svg.querySelectorAll('rect'))
        .map((drawn) => drawn.getBoundingClientRect())
        .filter((box) => box.width > 500 && Math.abs(box.bottom - firstTaskGroupTop) < 1.5)
        .sort((one, two) => two.height - one.height)[0]
      if (band === undefined) return null
      // Why: an empty label does not raise the count; FR-017 says not printed is not printed empty.
      const held = new Map<number, string[]>()
      for (const label of Array.from(svg.querySelectorAll('text'))) {
        const box = label.getBoundingClientRect()
        const said = (label.textContent ?? '').trim()
        if (said === '') continue
        // Why: skip the watermark, as rulerTiers does.
        if (label.closest('[data-role="Watermark"]') !== null) continue
        if (box.bottom <= firstTaskGroupTop && box.bottom > band.top - 8) {
          const top = Math.round(box.top * 100) / 100
          held.set(top, [...(held.get(top) ?? []), said])
        }
      }
      return {
        height: Math.round(band.height * 100) / 100,
        lines: [...held.entries()]
          .sort((one, two) => one[0] - two[0])
          .map(([top, words]) => ({ top, words })),
      }
    }, CANVAS)

  const nameOf = (band: { lines: Array<{ words: string[] }> }): string | null => {
    const first = band.lines[0]
    if (first === undefined || first.words.length === 0) return null
    const found = tiers.filter(
      (one) => one.lines === band.lines.length && first.words.every((said) => one.first.test(said)),
    )
    return found.length === 1 ? (found[0] as { row: string }).row : null
  }

  const seen: Array<{ height: number; lines: Array<{ top: number; words: string[] }>; tier: string | null }> = []
  // Why: the ticks arrive before the words, so the drawing is settled before every reading.
  await readSettledDrawnSvg(page)
  const first = await readBand()
  expect(first, 'no ruler band could be found above the first task group band').not.toBeNull()
  if (first === null) return
  seen.push({ ...first, tier: nameOf(first) })

  // Why: zooming out, as the coarser stages stand on fewer than three lines, which FR-017's
  // even division is about.
  const mostPresses = 20
  const coarser = entranceBy(T109_PURPOSE, TIME_AXIS, ZOOM_OUT)
  for (let step = 0; step < mostPresses; step += 1) {
    expect(await pressEntrance(page, coarser), `${coarser} is not on the screen`).toBe(true)
    await readSettledDrawnSvg(page)
    const now = await readBand()
    if (now !== null) seen.push({ ...now, tier: nameOf(now) })
    if (new Set(seen.map((one) => one.tier)).size > 1) break
  }

  const walked = seen
    .map((one) => `${one.tier ?? '?'}[${one.lines.map((line) => line.words[0] ?? '').join('|')}]`)
    .join(' -> ')
  expect(
    seen.filter((one) => one.tier === null).length,
    `a reading of the ruler is none of the four 段 of table T-238, and FR-017 (MUST NOT) says ` +
      `「同表に無い行を刷ってはならない」; the sweep walked ${walked}`,
  ).toBe(0)

  const crossed = new Set(seen.map((one) => one.tier))
  expect(
    crossed.size,
    `the sweep never left one 段 of table T-238 (${walked}), so it proved nothing about a stage ` +
      'boundary',
  ).toBeGreaterThan(1)

  const heights = new Set(seen.map((one) => one.height))
  expect(
    [...heights],
    `the ruler band changed height when the granularity changed, which FR-017 (MUST) forbids; the ` +
      `sweep walked ${walked}`,
  ).toHaveLength(1)

  for (const one of seen) {
    if (one.lines.length !== 2) continue
    const apart = Math.round((((one.lines[1]?.top ?? 0) - (one.lines[0]?.top ?? 0)) as number) * 100) / 100
    expect(
      apart,
      `the band is ${one.height}px and ${one.tier ?? '?'} stands on two 行, so FR-017 (MUST) gives ` +
        `each of them ${one.height / 2}px; the two baselines are ${apart}px apart`,
    ).toBeCloseTo(one.height / 2, 1)
  }
  expect(
    seen.some((one) => one.lines.length === 2),
    `no 段 in the sweep stood on two 行, so the even division was never asked; the sweep walked ${walked}`,
  ).toBe(true)
})

// Spec: T-233, RS-30
test('DFC-166: pressing the open-one-level entrance with nothing to bring back says nothing (T-233 hides RS-30)', async () => {
  test.setTimeout(180_000)
  const page = shared()

  const situation = cellOf(T233, 'RS-30', T233_SITUATION, T233_COLUMNS)
  expect(situation, 'table T-233 row RS-30 names no situation').not.toBe('')

  const oneLevel = entranceBy(T109_SOURCE, 'HF-13')

  // Why: a task group's own entrances are hidden until the pointer is on its name (HF-6), and a
  // dispatched event reaches nothing, so a real pointer is moved there first.
  const firstTaskGroup = await page.evaluate(() => {
    const boxes = Array.from(document.querySelectorAll('[data-depth]'))
      .map((row) => row.getBoundingClientRect())
      .sort((one, two) => one.top - two.top)
    const found = boxes[0]
    if (found === undefined) return null
    return { nameX: found.x + 30, nameY: found.y + found.height / 2, top: found.top }
  })
  expect(firstTaskGroup, 'the task group panel drew no task groups').not.toBeNull()
  if (firstTaskGroup === null) return

  await page.mouse.move(firstTaskGroup.nameX, firstTaskGroup.nameY)
  await page.waitForTimeout(500)
  const at = await page.evaluate(
    (asked: { entrance: string; top: number }) => {
      const found = Array.from(document.querySelectorAll(`[data-icon="${asked.entrance}"]`)).find(
        (one) => Math.abs(one.getBoundingClientRect().top - asked.top) < 40,
      )
      if (found === undefined) return null
      const box = found.getBoundingClientRect()
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    },
    { entrance: oneLevel, top: firstTaskGroup.top },
  )
  expect(at, `${oneLevel} is not drawn on the first task group even with the pointer on its name`).not.toBeNull()
  if (at === null) return

  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(900)

  const said = (await readNotices(page)).join(' ')
  expect(
    said,
    `table T-233 shows RS-30 (${JSON.stringify(situation)}) as hidden, yet pressing ${oneLevel} raised a notice`,
  ).toBe('')

  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
})

// Why: the case presses until the band stands on three tiers, not a fixed count, as only the
// finest stage has a weekday tier.
// Spec: LF-1
test('DFC-91: the weekday tier of the ruler is ticked exactly where the day tier is', async () => {
  test.setTimeout(240_000)
  const page = shared()

  const finer = entranceBy(T109_PURPOSE, TIME_AXIS, ZOOM_IN)
  let tiers = await rulerTiers(page)
  for (let step = 0; step < 60 && tiers.length < 3; step += 1) {
    expect(await pressEntrance(page, finer), `${finer} is not on the screen`).toBe(true)
    tiers = await rulerTiers(page)
  }
  expect(
    tiers.length,
    `the ruler never came to stand on three tiers, so the stage that has a weekday tier at all ` +
      `was never reached; the band stands on ${tiers.length}`,
  ).toBe(3)

  // Why: the ticks arrive before the words, so the drawing is waited out before the words are read.
  await readSettledDrawnSvg(page)
  tiers = await rulerTiers(page)
  expect(tiers, 'the ruler fell back to fewer tiers while it was settling').toHaveLength(3)

  const weekdays = weekdayWords()
  const isWeekdayTier = (tier: RulerTier): boolean =>
    tier.words.length > 0 && tier.words.every((said) => weekdays.includes(said))
  const isDayTier = (tier: RulerTier): boolean =>
    tier.words.length > 0 && tier.words.every((said) => /^\d{1,2}$/.test(said))

  const weekdayTiers = tiers.filter(isWeekdayTier)
  const dayTiers = tiers.filter(isDayTier)
  expect(
    weekdayTiers.length,
    `the ruler stands on three tiers and ${weekdayTiers.length} of them print the weekday words the ` +
      'dictionary holds; this case needs exactly one',
  ).toBe(1)
  expect(
    dayTiers.length,
    `${dayTiers.length} tiers print bare day numbers; this case needs exactly one`,
  ).toBe(1)
  const weekday = weekdayTiers[0] as RulerTier
  const day = dayTiers[0] as RulerTier

  expect(
    weekday.ticks.length,
    `the day tier is divided by ${day.ticks.length} ticks and the weekday tier by ` +
      `${weekday.ticks.length}; LF-1 gives both of them one day`,
  ).toBe(day.ticks.length)
  expect(
    weekday.ticks,
    'the weekday tier is ticked at other places than the day tier, so the two are not on the same ' +
      'interval and a weekday would stand under a day that is not its own',
  ).toEqual(day.ticks)

  // Why: the coarse tier is read too, so a build that ticked every tier alike fails here.
  const coarse = tiers.filter((tier) => tier !== weekday && tier !== day)
  expect(coarse, 'the three tiers are not one coarse and the two fine ones').toHaveLength(1)
  expect(
    (coarse[0] as RulerTier).ticks.length,
    `the coarsest tier is divided by as many ticks as the day tier (${day.ticks.length}), and LF-1 ` +
      'gives it one month',
  ).toBeLessThan(day.ticks.length)

  const gaps = day.ticks.slice(1).map((one, at) => Math.round((one - (day.ticks[at] as number)) * 10) / 10)
  const distinct = [...new Set(gaps)]
  expect(
    distinct.length,
    `the day tier is ticked at ${distinct.length} different intervals (${distinct.slice(0, 6).join(', ')}px), ` +
      'and LF-1 fixes one interval per tier',
  ).toBeLessThanOrEqual(2)
})

// Spec: FR-055, HF-8, T-068, T-328
// Why: fitPressed returns every collapsed task group to auto (table T-328), so the first task group reads
// as before the fold; the task groups landed on must fit, or the drawing is already at depth 1.
// Trap: how many runs table T-068 took is not published by the build, so only its two
// outcomes are pressed here; FR-055 does not promise a fit, hence the depth-1 escape.
test('DFC-24: a fit throws away what a person folded, and the task groups it lands on fit', async () => {
  test.setTimeout(240_000)
  const page = shared()

  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  const foldAll = entranceBy(T109_SOURCE, 'HF-11')
  const fit = entranceBy(T109_SOURCE, 'FR-055')

  const firstTaskGroup = async (): Promise<{ said: string; nameX: number; nameY: number; top: number } | null> =>
    page.evaluate(() => {
      const found = Array.from(document.querySelectorAll('[data-depth]')).sort(
        (one, two) => one.getBoundingClientRect().top - two.getBoundingClientRect().top,
      )[0]
      if (found === undefined) return null
      const box = found.getBoundingClientRect()
      return {
        said: (found.textContent ?? '').replace(/\s+/g, ' ').trim(),
        nameX: box.x + 30,
        nameY: box.y + box.height / 2,
        top: box.top,
      }
    })

  const before = await firstTaskGroup()
  expect(before, 'the task group panel drew no task groups to fold').not.toBeNull()
  if (before === null) return

  // Why: the entrances are hidden until the pointer is on the name (HF-6).
  await page.mouse.move(before.nameX, before.nameY)
  await page.waitForTimeout(500)
  const at = await page.evaluate(
    (asked: { entrance: string; top: number }) => {
      const found = Array.from(document.querySelectorAll(`[data-icon="${asked.entrance}"]`)).find(
        (one) => Math.abs(one.getBoundingClientRect().top - asked.top) < 40,
      )
      if (found === undefined) return null
      const box = found.getBoundingClientRect()
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    },
    { entrance: foldAll, top: before.top },
  )
  expect(at, `${foldAll} is not drawn on the first task group even with the pointer on its name`).not.toBeNull()
  if (at === null) return
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(1000)

  const folded = await firstTaskGroup()
  expect(folded, 'the first task group went off the screen when it was folded').not.toBeNull()
  if (folded === null) return
  expect(
    folded.said,
    `folding what is under ${JSON.stringify(before.said)} changed nothing the task group says, so this ` +
      'case cannot tell afterwards whether the fold was thrown away',
  ).not.toBe(before.said)

  expect(await pressEntrance(page, fit), `${fit} is not on the screen`).toBe(true)
  await readSettledDrawnSvg(page)

  const after = await firstTaskGroup()
  expect(after, 'the first task group went off the screen when the whole was fitted').not.toBeNull()
  if (after === null) return
  expect(
    after.said,
    `after a fit the task group still reads ${JSON.stringify(after.said)} and not ` +
      `${JSON.stringify(before.said)}; the first run of table T-068 throws every fold a person made ` +
      'away, and FR-055 gives the reason -- a fold left standing shrinks what "the whole" means',
  ).toBe(before.said)

  const landed = await page.evaluate((canvas: string) => {
    const svg = document.querySelector(canvas)
    const rows = Array.from(document.querySelectorAll('[data-depth]'))
    if (svg === null || rows.length === 0) return null
    return {
      count: rows.length,
      deepest: Math.max(...rows.map((row) => Number(row.getAttribute('data-depth') ?? '0'))),
      bottom: Math.max(...rows.map((row) => row.getBoundingClientRect().bottom)),
      floor: svg.getBoundingClientRect().bottom,
    }
  }, CANVAS)
  expect(landed, 'nothing is drawn after the fit').not.toBeNull()
  if (landed === null) return
  expect(landed.count, 'the fit left no task group on the screen at all').toBeGreaterThan(0)
  expect(
    landed.bottom <= landed.floor + 1 || landed.deepest <= 1,
    `the fit left the last task group ending at y=${Math.round(landed.bottom)} with the drawing ending at ` +
      `y=${Math.round(landed.floor)}, at depth ${landed.deepest}; FR-055 has the deepest depth that ` +
      'fits taken, and only depth 1 may be left over the edge',
  ).toBe(true)
})

// Why: these cases run on fresh pages of another context: a page's clock and dialogue are fixed
// when its context is made, and a fresh page keeps one case's write out of another's reading.
// Why: the two pictures are compared whole: a Grab Point has no row fixing how it is drawn, so
// only a difference between two productions catches it.
// Spec: EP-12, U-39
test('DFC-52: the written picture is the same whether or not something is selected', async () => {
  test.setTimeout(240_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const chooser = entranceBy(T109_SOURCE, 'FR-096')

    const screenNow = async (): Promise<string> => readSettledDrawnSvg(page)
    const writeOne = async (): Promise<void> => {
      expect(await pressEntrance(page, chooser), `${chooser} is not on the screen`).toBe(true)
      await page.waitForTimeout(900)
      const at = await page.evaluate(() => {
        const surface = document.querySelector('[data-role="Export Chooser"]')
        if (surface === null) return null
        const wanted = Array.from(surface.querySelectorAll('button')).find((one) =>
          (one.textContent ?? '').includes('.svg'),
        )
        if (wanted === undefined) return null
        const box = wanted.getBoundingClientRect()
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
      })
      expect(at, 'the export chooser offers nothing that writes an .svg').not.toBeNull()
      if (at === null) return
      await page.mouse.move(at.x, at.y)
      await page.mouse.down()
      await page.mouse.up()
    }

    const withNothing = await screenNow()
    await writeOne()
    await until(page, () => readWrites(page), (seen) => seen.bodies.length === 1, 'the first picture is written')

    const bar = await firstBarOnScreen(page)
    expect(
      bar,
      'no task bar has a middle on the screen to select: a drawn plan bar stands ' +
        `${DRAWN_PLAN_BAR_PX.toFixed(4)}px tall, S-4 x S-13 at the ratio FR-039 (MUST) gives -- ` +
        '「描く比は、`S-234` を 100 で割り、同書の 表 T-206 の `S-236` を掛けた値とすること（MUST）」',
    ).not.toBeNull()
    if (bar === null) return
    await page.mouse.move(bar.x, bar.y)
    await page.mouse.down()
    await page.mouse.up()
    await page.waitForTimeout(900)
    const withOne = await screenNow()

    // Why: the control: had the press selected nothing, the pictures would be equal for another reason.
    expect(
      withOne === withNothing,
      'pressing a task bar changed nothing on the screen, so nothing was selected and the ' +
        'comparison below would prove nothing',
    ).toBe(false)

    await writeOne()
    const wrote = await until(
      page,
      () => readWrites(page),
      (seen) => seen.bodies.length === 2,
      'the second picture is written',
    )

    const [plain, selected] = wrote.bodies
    expect(plain ?? '', 'the first written picture is empty').not.toBe('')
    expect((plain ?? '').startsWith('<svg'), 'what was written is not an SVG').toBe(true)
    expect(
      (selected ?? '').length,
      `the picture written with something selected is ${(selected ?? '').length} characters and ` +
        `the one written with nothing selected is ${(plain ?? '').length}; EP-12 has the written ` +
        'picture draw no Selection at all',
    ).toBe((plain ?? '').length)
    expect(
      selected === plain,
      'the two written pictures differ, so something about what was selected reached the file',
    ).toBe(true)
  } finally {
    await opened.close()
  }
})

// Why: the dialogue is a replacement, so this proves what the build does with a handle; the
// real one is still for a person to press.
// Spec: FR-101, FR-060, DI-5
test('DFC-66: a second save writes again to the same file, and asks no second time', async () => {
  test.setTimeout(240_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const saveKey = pressable(cellOf(T036, 'SK-11', T036_ASSIGNMENT, T036_COLUMNS))

    const before = await readWrites(page)
    expect(before.asked, 'the replaced save dialogue is not in place on this page').toBe(0)
    expect(before.files, 'something had already been written before the case pressed anything').toEqual([])

    await page.mouse.move(Math.round(BASE_SCREEN.width * 0.5), Math.round(BASE_SCREEN.height * 0.6))
    await page.keyboard.press(saveKey)
    const once = await until(page, () => readWrites(page), (seen) => seen.files.length === 1, 'the first save writes')
    expect(once.asked, `the first ${saveKey} asked ${once.asked} times where to write`).toBe(1)

    await page.keyboard.press(saveKey)
    const twice = await until(page, () => readWrites(page), (seen) => seen.files.length === 2, 'the second save writes')

    expect(
      twice.asked,
      `the second ${saveKey} opened the save dialogue again (asked ${twice.asked} times); FR-060 ` +
        'holds the handle and DI-5 (MUST NOT) forbids asking every time',
    ).toBe(1)
    expect(
      twice.files[1],
      'the second save wrote to a different file than the first',
    ).toBe(twice.files[0])

    const named = await until(
      page,
      async () =>
        page.evaluate(
          (asked: { name: string; at: string }) => ({
            name: (document.querySelector(asked.name)?.textContent ?? '').trim(),
            at: (document.querySelector(asked.at)?.textContent ?? '').trim(),
          }),
          { name: HEADER_FILE_NAME, at: HEADER_SAVED_AT },
        ),
      (seen) => seen.name !== '',
      'the header names the file that was written',
    )
    expect(
      named.name,
      `the header names ${JSON.stringify(named.name)} and the file written was ` +
        `${JSON.stringify(twice.files[0])}`,
    ).toContain(twice.files[0] ?? '')
    expect(
      neverSavedWords().some((one) => named.at.includes(one)),
      `the header still says ${JSON.stringify(named.at)} after two successful writes`,
    ).toBe(false)
  } finally {
    await opened.close()
  }
})

// Why: no format is asserted, as FR-101 sets none: the hour and minute must be the reader's
// clock and not UTC, judged only where the offset is not zero.
// Spec: FR-101
test('DFC-65: the time the header prints is the reader own clock, not UTC', async () => {
  test.setTimeout(240_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const saveKey = pressable(cellOf(T036, 'SK-11', T036_ASSIGNMENT, T036_COLUMNS))

    await page.mouse.move(Math.round(BASE_SCREEN.width * 0.5), Math.round(BASE_SCREEN.height * 0.6))
    await page.keyboard.press(saveKey)
    await until(page, () => readWrites(page), (seen) => seen.files.length === 1, 'the save writes')

    const shown = await until(
      page,
      async () =>
        page.evaluate(
          (wanted: string) => (document.querySelector(wanted)?.textContent ?? '').trim(),
          HEADER_SAVED_AT,
        ),
      (seen) => !neverSavedWords().some((one) => seen.includes(one)) && seen !== '',
      'the header replaces the never-written word with a time',
    )

    const clocks = await page.evaluate(() => {
      const pad = (value: number): string => String(value).padStart(2, '0')
      const now = Date.now()
      const local: string[] = []
      const utc: string[] = []
      for (let back = 0; back <= 5; back += 1) {
        const at = new Date(now - back * 60_000)
        local.push(`${pad(at.getHours())}:${pad(at.getMinutes())}`)
        utc.push(`${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())}`)
      }
      return { local, utc, offsetMinutes: new Date().getTimezoneOffset() }
    })

    expect(
      clocks.offsetMinutes,
      'the page is running on UTC, so a local reading and a UTC reading are the same string and ' +
        'this case cannot tell them apart',
    ).not.toBe(0)
    expect(
      clocks.local.filter((one) => clocks.utc.includes(one)),
      'the two clocks share a reading in the window this case looks at',
    ).toEqual([])

    expect(
      clocks.local.filter((one) => shown.includes(one)),
      `the header prints ${JSON.stringify(shown)}, and none of the last few minutes of the ` +
        `reader clock (${clocks.local.join(', ')}) is in it`,
    ).not.toEqual([])
    expect(
      clocks.utc.filter((one) => shown.includes(one)),
      `the header prints ${JSON.stringify(shown)}, which carries a UTC reading; FR-101 (MUST NOT) ` +
        'forbids putting UTC on the screen',
    ).toEqual([])
  } finally {
    await opened.close()
  }
})

// Spec: SK-11, FR-096, FR-060, DI-5
test('DFC-97: the save key writes GRS JSON, and a second press overwrites with no question', async () => {
  test.setTimeout(240_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const saveKey = pressable(cellOf(T036, 'SK-11', T036_ASSIGNMENT, T036_COLUMNS))
    const opensWith = assignmentText(cellOf(T024, 'IO-2', T024_FIRST_CHARACTER, T024_COLUMNS))
    expect(opensWith, 'table T-024 row IO-2 names no first character').not.toBe('')

    const surfaces = async (): Promise<string[]> =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll('[data-role]'))
          .map((marked) => marked.getAttribute('data-role') ?? '')
          .sort(),
      )
    const wasSurfaces = await surfaces()

    await page.mouse.move(Math.round(BASE_SCREEN.width * 0.5), Math.round(BASE_SCREEN.height * 0.6))
    await page.keyboard.press(saveKey)
    const once = await until(page, () => readWrites(page), (seen) => seen.files.length === 1, 'the save writes')
    expect(once.asked, `the first ${saveKey} asked ${once.asked} times where to write`).toBe(1)

    const body = once.bodies[0] ?? ''
    expect(body, `${saveKey} wrote an empty file`).not.toBe('')
    expect(
      body.trimStart().startsWith(opensWith),
      `${saveKey} wrote a file opening ${JSON.stringify(body.slice(0, 24))}, and table T-024 row ` +
        `IO-2 has GRS JSON open with ${JSON.stringify(opensWith)}`,
    ).toBe(true)
    const held: unknown = JSON.parse(body)
    expect(
      typeof held === 'object' && held !== null && !Array.isArray(held),
      'what SK-11 wrote parses, but not as an object a document could be held in',
    ).toBe(true)

    await page.keyboard.press(saveKey)
    const twice = await until(
      page,
      () => readWrites(page),
      (seen) => seen.files.length === 2,
      'the second save writes',
    )
    expect(
      twice.asked,
      `the second ${saveKey} opened the dialogue again (asked ${twice.asked} times); SK-11 sends the ` +
        'overwrite to FR-060 and table T-227 row DI-5 (MUST) has that route ask nothing',
    ).toBe(1)
    expect(twice.files[1], 'the second press wrote to a different file than the first').toBe(twice.files[0])
    expect(
      (twice.bodies[1] ?? '').length,
      'the second press wrote a file of a different length, and nothing was edited between the two',
    ).toBe(body.length)

    expect(
      await surfaces(),
      `pressing ${saveKey} twice put a surface on the screen; DI-5 (MUST) has this route ask nothing`,
    ).toEqual(wasSurfaces)
    expect(await readNotices(page), `pressing ${saveKey} twice raised a notice`).toEqual([])
  } finally {
    await opened.close()
  }
})

// Why: not MC-6: the written width is S-81's and the ratio follows the screen (FR-080), so the
// screen's shape, not the document, reaches S-217.
// Why: IO-6 is not pressed: it writes to the clipboard, which a driven browser cannot answer.
// Spec: FR-025, S-217, RS-43, IO-1, IO-2, IO-3, IO-4, IO-7
test('DFC-220: a picture too tall to draw is refused as RS-43, and the other formats still write', async () => {
  test.setTimeout(300_000)
  const width = 600
  const height = Math.ceil(width * (EXPORT_HEIGHT_CAP / EXPORT_WIDTH)) + 64
  const wants = Math.round((EXPORT_WIDTH / width) * height)
  expect(
    wants,
    `a ${width}x${height} screen asks for a picture ${wants}px high, and S-217 caps it at ` +
      `${EXPORT_HEIGHT_CAP}px -- this case needs a shape that passes the cap`,
  ).toBeGreaterThan(EXPORT_HEIGHT_CAP)

  const opened = await openStubbedPage({ width, height })
  try {
    const page = opened.page
    const chooser = entranceBy(T109_SOURCE, 'FR-096')
    const reasons = reasonWordsOfDictionary()
    const endingOf = (row: string): string =>
      assignmentText(cellOf(T024, row, T024_ENDING, T024_COLUMNS))
    const carried = async (): Promise<string[]> => {
      const said = (await readNotices(page)).join(' ')
      return reasons
        .filter((one) => (one.ja !== '' && said.includes(one.ja)) || (one.en !== '' && said.includes(one.en)))
        .map((one) => one.specTableRowId)
    }
    const clear = async (): Promise<void> => {
      // Why: Escape takes the newest notice down (NT-8) and closes the chooser (IN-4).
      for (let step = 0; step < 4; step += 1) {
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
      }
    }

    for (const row of ['IO-3', 'IO-4']) {
      const ending = endingOf(row)
      expect(
        await pressExportFormat(page, chooser, ending),
        `the chooser offers nothing that writes ${ending} (table T-024 row ${row})`,
      ).toBe(true)
      await page.waitForTimeout(3000)
      const wrote = await readWrites(page)
      expect(
        wrote.files,
        `${row} (${ending}) wrote a file on a screen whose picture would be ${wants}px high, and ` +
          `FR-025 (MUST) has it not written at all past S-217 (${EXPORT_HEIGHT_CAP}px)`,
      ).toEqual([])
      expect(
        wrote.asked,
        `${row} (${ending}) opened the save dialogue before finding out it could not draw`,
      ).toBe(0)
      expect(
        await carried(),
        `the refusal of ${row} carries a reason other than RS-43, which FR-025 (MUST) names`,
      ).toEqual(['RS-43'])
      await clear()
    }

    let written = 0
    for (const row of ['IO-2', 'IO-1', 'IO-7']) {
      const ending = endingOf(row)
      expect(
        await pressExportFormat(page, chooser, ending),
        `the chooser offers nothing that writes ${ending} (table T-024 row ${row})`,
      ).toBe(true)
      written += 1
      const wrote = await until(
        page,
        () => readWrites(page),
        (seen) => seen.files.length === written,
        `${row} (${ending}) writes on a screen where a picture may not be drawn`,
      )
      expect(
        (wrote.bodies[written - 1] ?? '').length,
        `${row} (${ending}) wrote an empty file`,
      ).toBeGreaterThan(0)
      expect(
        await carried(),
        `${row} (${ending}) raised a reason of table T-233, and FR-025 says it does not meet the ` +
          'height ceiling at all because it is not a picture',
      ).toEqual([])
      await clear()
    }
  } finally {
    await opened.close()
  }
})

// Spec: FR-017, T-238
const T238: SpecTable = specTable('T-238')
const T238_COLUMNS = 5
const T238_FIRST_LINE = 1
const T238_SECOND_LINE = 2

/** @purity pure */
function tierLine(specTableRowId: string, column: number): string {
  return cellOf(T238, specTableRowId, column, T238_COLUMNS).replace(/`/g, '').trim()
}

// Why: the height is swept, not chosen: FR-001 makes a task only where the press hits no item,
// and which heights are free depends on the document.
// Spec: FR-001, TC-8, RS-53, T-233, FR-076
test('DFC-210: a bar shape needs a drag, a milestone needs only a press', async () => {
  test.setTimeout(300_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const rectangle = entranceBy(T109_PURPOSE, 'SH-1')
    // Why: a diamond, not the circle, as this case reads polygons and the circle is not one.
    const diamond = entranceBy(T109_PURPOSE, '◇')
    // Why: FR-053 (MUST) shows only the first S-216 milestone shapes of SH-5 and
    // Why: keeps the rest off the palette until the one list entrance opens them
    // Why: (S-142, closed by default); the diamond is past S-216, so the list is
    // Why: opened here, before any ground is searched, so the palette the gestures
    // Why: below are measured beside is the one the diamond is armed from.
    const milestoneList = entranceBy(T109_PURPOSE, 'S-142')
    await readSettledDrawnSvg(page)
    if ((await entranceBox(page, diamond)) === null) {
      expect(await pressEntrance(page, milestoneList), `${milestoneList} could not be pressed`).toBe(true)
    }
    expect(
      await entranceBox(page, diamond),
      `${milestoneList} was pressed and ${diamond} is still not on the palette, which FR-053 (MUST) shows once the list is open`,
    ).not.toBeNull()

    const startX = 700
    const dragPx = 160
    // Why: not simply the widest new shape: a creation opens the panel (FR-091), narrows the Task
    // Group Area and redraws every bar.
    // Why: a bar that only moved was not made: a drag on clear ground can insert a task group
    // (FR-043), so a shape whose x, width and height stood before is dropped.
    const madeNear = (
      before: readonly string[],
      after: readonly string[],
      near: number,
    ): number[][] => {
      const moved = new Set(
        before.map((one) => {
          const box = one.split(',')
          return `${box[0]}:${box[2]}:${box[3]}`
        }),
      )
      return after
        .filter((one) => !before.includes(one))
        .map((one) => one.split(',').map(Number))
        .filter((box) => !moved.has(`${box[0]}:${box[2]}:${box[3]}`))
        .filter((box) => Math.abs((box[0] ?? 0) - near) <= 40 && (box[3] ?? 0) > 8)
    }

    // Step: the click, then the drag at the same height; the first height where the drag makes a bar is clear ground.
    let ground: number | null = null
    let drew: number[] | undefined
    for (const y of [700, 660, 620, 560, 500, 440, 380, 320, 260, 740, 800, 860, 900, 940]) {
      expect(await armEntrance(page, rectangle), `${rectangle} would not arm`).toBe(true)
      const before = await drawnShapes(page)
      await page.mouse.move(startX, y)
      await page.mouse.down()
      await page.mouse.up()
      await page.waitForTimeout(900)
      const clicked = await drawnShapes(page)
      expect(await armEntrance(page, rectangle), `${rectangle} would not arm`).toBe(true)
      const beforeDrag = await drawnShapes(page)
      await page.mouse.move(startX, y)
      await page.mouse.down()
      await page.mouse.move(startX + dragPx, y, { steps: 8 })
      await page.mouse.up()
      await page.waitForTimeout(900)
      const made = madeNear(beforeDrag, await drawnShapes(page), startX).sort(
        (one, two) => (two[2] ?? 0) - (one[2] ?? 0),
      )[0]
      if (made === undefined) continue
      expect(
        clicked.length,
        'a bar shape was armed and pressed without a drag, and the drawing changed',
      ).toBe(before.length)
      ground = y
      drew = made
      break
    }
    expect(
      ground,
      `no height on the screen let a ${dragPx}px drag from x=${startX} draw a bar, and FR-001 (MUST) ` +
        'has a drag on clear ground make the span that was drawn',
    ).not.toBeNull()
    if (ground === null || drew === undefined) return
    // Why: the bar snaps to whole day columns, so the width is held to a band around the drag.
    expect(
      drew[2] ?? 0,
      `a ${dragPx}px drag drew a bar ${drew[2]}px wide, which is not the span that was drawn`,
    ).toBeGreaterThan(dragPx * 0.6)
    // Why: the upper bound keeps the span the drag's; it is judged on the shape the gesture added.
    expect(
      drew[2] ?? 0,
      `a ${dragPx}px drag drew a bar ${drew[2]}px wide, which is wider than the span that was drawn`,
    ).toBeLessThan(dragPx * 1.4)
    // Why: the dates are read off the panel, as FR-001 leaves what was made selected; one day is
    // what a press that drew nothing would show.
    const drawnDates = await panelDates(page)
    expect(drawnDates, 'the task the drag made is not showing on the Properties Panel').not.toBeNull()
    expect(
      drawnDates?.start === drawnDates?.finish,
      `the drag made a task from ${drawnDates?.start} to ${drawnDates?.finish}, which is one point`,
    ).toBe(false)

    // Step: the milestone, pressed and released on one point.
    // Why: a refusal may stand here and is not this case's: with the task selected, arming asks SP-2
    // to change its shape; FR-083 still arms, so the notices are cleared, not read.
    // Why: the point is found, not computed -- FR-001 places what is armed only where
    // Why: the press hits no item; swept outward from the bar the drag just made.
    const milestoneTries: number[] = []
    for (let x = startX + dragPx + 80; x <= 1840; x += 80) milestoneTries.push(x)
    for (let x = startX - 80; x >= 280; x -= 80) milestoneTries.push(x)
    let milestoneX: number | null = null
    for (const x of milestoneTries) {
      if (!(await armEntrance(page, diamond))) continue
      await page.keyboard.press('Enter')
      await page.waitForTimeout(400)
      const beforeMilestone = await drawnShapes(page)
      await page.mouse.move(x, ground)
      await page.mouse.down()
      await page.mouse.up()
      await page.waitForTimeout(900)
      if (madeNear(beforeMilestone, await drawnShapes(page), x).length > 0) {
        milestoneX = x
        break
      }
    }
    expect(
      milestoneX,
      'a milestone armed and pressed put nothing at any x of this height, and FR-001 (MUST) has the ' +
        'press alone place it',
    ).not.toBeNull()
  } finally {
    await opened.close()
  }
})

interface DrawnTaskGroupTitle {
  readonly depth: number
  readonly name: string
  readonly left: number
}

// Why: the name, not the task group's box: the box starts at the panel's edge, and S-37 pushes
// the word, which FR-085 measures the room against.
/** @purity semi-pure-mutable */
async function drawnTaskGroupTitles(page: Page): Promise<DrawnTaskGroupTitle[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-depth]')).map((row) => {
      const span = row.querySelector('span')
      const box = span === null ? null : span.getBoundingClientRect()
      return {
        depth: Number(row.getAttribute('data-depth') ?? '0'),
        name: (span?.textContent ?? '').trim(),
        left: box === null ? Number.NaN : Math.round(box.x * 1000) / 1000,
      }
    }),
  )
}

// Why: exactly once: task labels are text too, so a second match is null, not the wrong element.
/** @purity pure */
function writtenTitleLeft(picture: string, name: string): number | null {
  const found: number[] = []
  const marks = /<text\b([^>]*)>([^<]*)<\/text>/g
  let one = marks.exec(picture)
  while (one !== null) {
    if ((one[2] ?? '') === name) {
      const at = /\bx="(-?\d+(?:\.\d+)?)"/.exec(one[1] ?? '')
      if (at !== null) found.push(Number(at[1]))
    }
    one = marks.exec(picture)
  }
  return found.length === 1 ? (found[0] ?? null) : null
}

// Why: fitted from the outermost pair, then checked on every tier, so 0 / 16 / 40 fails rather
// than averaging 20 (FR-085).
/** @purity pure */
function stepPerTier(byDepth: ReadonlyMap<number, number>, what: string, room: number): number {
  const tiers = [...byDepth.keys()].sort((one, two) => one - two)
  const low = tiers[0] ?? 0
  const high = tiers[tiers.length - 1] ?? 0
  if (tiers.length < 2 || high === low) {
    throw new Error(`${what} shows only the tier(s) ${JSON.stringify(tiers)}, so it holds no step to read`)
  }
  const step = ((byDepth.get(high) ?? 0) - (byDepth.get(low) ?? 0)) / (high - low)
  for (const tier of tiers) {
    const wanted = (byDepth.get(low) ?? 0) + step * (tier - low)
    const seen = byDepth.get(tier) ?? 0
    if (Math.abs(seen - wanted) > room) {
      throw new Error(
        `${what} does not move by one step per tier: tier ${tier} stands at ${seen} and a ` +
          `step of ${step} puts it at ${wanted} -- readings ${JSON.stringify([...byDepth])}`,
      )
    }
  }
  return step
}

// Why: the picture is written smaller than the screen (S-81 over MC-6), so the case divides by
// that ratio, read from the manuscript.
// Why: the panel is scrolled first: untouched, the picture carries only the first tier, and no
// step can be read off it.
// Spec: FR-085, S-37, FR-025, S-81
test('DFC-49: the screen and the picture set a task group in by the same one tier of S-37', async () => {
  test.setTimeout(240_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const chooser = entranceBy(T109_SOURCE, 'FR-096')
    const ending = assignmentText(cellOf(T024, 'IO-3', T024_ENDING, T024_COLUMNS))

    const overPanel = await page.evaluate(() => {
      const one = document.querySelector('[data-role="Task Group Panel"]')
      if (one === null) return null
      const box = one.getBoundingClientRect()
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    })
    expect(overPanel, 'the task group panel is not on the screen').not.toBeNull()
    if (overPanel === null) return
    await page.mouse.move(overPanel.x, overPanel.y)
    for (let notch = 0; notch < 2; notch += 1) {
      await page.mouse.wheel(0, 200)
      await page.waitForTimeout(250)
    }
    await page.waitForTimeout(600)

    const drawn = await drawnTaskGroupTitles(page)
    expect(drawn.length, 'the panel is drawing no task groups at all').toBeGreaterThan(1)
    // Why: only names that stand once, as two alike cannot be paired with one text of the picture.
    const once = drawn.filter(
      (row) => drawn.filter((other) => other.name === row.name).length === 1 && row.name !== '',
    )
    expect(once.length, `no task group name is unique in ${JSON.stringify(drawn.map((row) => row.name))}`).toBeGreaterThan(1)

    expect(
      await pressExportFormat(page, chooser, ending),
      `the chooser offers nothing that writes ${ending} (table T-024 row IO-3)`,
    ).toBe(true)
    const wrote = await until(
      page,
      () => readWrites(page),
      (seen) => seen.bodies.length === 1,
      'the picture is written',
    )
    const picture = wrote.bodies[0] ?? ''
    expect(picture.startsWith('<svg'), 'what was written is not an SVG').toBe(true)

    const width = Number(/^<svg\b[^>]*\bwidth="(-?\d+(?:\.\d+)?)"/.exec(picture)?.[1] ?? '')
    expect(
      width,
      `the picture was written ${width}px wide and FR-025 (MUST) fixes the width at S-81; the ` +
        'ratio this case divides by would be the wrong one',
    ).toBe(EXPORT_WIDTH)
    const ratio = EXPORT_WIDTH / BASE_SCREEN.width

    const onScreen = new Map<number, number>()
    const inPicture = new Map<number, number>()
    const missing: string[] = []
    for (const row of once) {
      const at = writtenTitleLeft(picture, row.name)
      if (at === null) {
        missing.push(row.name)
        continue
      }
      onScreen.set(row.depth, row.left)
      inPicture.set(row.depth, at)
    }
    expect(
      inPicture.size,
      `the picture holds the tier(s) ${JSON.stringify([...inPicture.keys()])} of the task groups the ` +
        `screen is drawing, and this case needs two; it wrote none of ${JSON.stringify(missing)}`,
    ).toBeGreaterThan(1)

    // Why: the room is for the file's two-decimal rounding and a browser's sub-pixel layout.
    const room = 0.1
    const screenStep = stepPerTier(onScreen, 'the screen', room)
    const pictureStep = stepPerTier(inPicture, 'the written picture', room) / ratio

    expect(
      Math.abs(screenStep - DRAWN_TASK_GROUP_INDENT) <= room,
      `the screen sets a task group in by ${screenStep}px per tier and S-37 (taskGroupTitleIndent) is ` +
        `${TASK_GROUP_INDENT}px drawn at ${DRAWN_RATIO} -- ${DRAWN_TASK_GROUP_INDENT}px. FR-039 (MUST): ` +
        '「描く比は、`S-234` を 100 で割り、同書の 表 T-206 の `S-236` を掛けた値とすること（MUST）」 ' +
        `-- readings ${JSON.stringify([...onScreen])}`,
    ).toBe(true)
    expect(
      Math.abs(pictureStep - DRAWN_TASK_GROUP_INDENT) <= room,
      `the written picture sets a task group in by ${pictureStep}px per tier once the S-81 / MC-6 ratio ` +
        `is taken off, and S-37 is ${TASK_GROUP_INDENT}px drawn at ${DRAWN_RATIO} -- ` +
        `${DRAWN_TASK_GROUP_INDENT}px (FR-080 writes the picture at the same ratio) -- readings ` +
        `${JSON.stringify([...inPicture])}`,
    ).toBe(true)
    expect(
      Math.abs(screenStep - pictureStep) <= room,
      `the screen moves a task group in by ${screenStep}px per tier and the picture by ${pictureStep}px; ` +
        'DFC-49 is exactly the two sides parting company',
    ).toBe(true)
  } finally {
    await opened.close()
  }
})

interface PanelLine {
  readonly name: string
  readonly at: number
  readonly down: number
}

// Why: data-depth is a selector, not the answer: the picture carries none, so both sides are
// ranked by where the word starts (tiered).
/** @purity semi-pure-mutable */
async function panelLinesOnScreen(page: Page): Promise<PanelLine[]> {
  const lines = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-depth]')).map((row) => {
      const span = row.querySelector('span')
      const box = span === null ? null : span.getBoundingClientRect()
      return {
        name: (span?.textContent ?? '').trim(),
        at: box === null ? Number.NaN : Math.round(box.x * 100) / 100,
        down: box === null ? Number.NaN : Math.round(box.y * 100) / 100,
      }
    }),
  )
  return [...lines].sort((one, two) => one.down - two.down)
}

// Why: the FR-020 watermark is a grid of text marks over the Task Group Area, each looking like
// a task group name by coordinate, so its layer is cut out first.
// Trap: the layer nests a g of its own, so searching for the first closing tag cuts it short.
function withoutTheWatermark(picture: string): string {
  const at = picture.indexOf('<g data-role="Watermark"')
  if (at === -1) return picture
  let depth = 0
  let scan = at
  while (scan < picture.length) {
    const opens = picture.indexOf('<g', scan)
    const closes = picture.indexOf('</g>', scan)
    if (closes === -1) break
    if (opens !== -1 && opens < closes) {
      depth += 1
      scan = opens + 2
      continue
    }
    depth -= 1
    scan = closes + 4
    if (depth === 0) return picture.slice(0, at) + picture.slice(scan)
  }
  return picture.slice(0, at)
}

// Why: the window is read off the screen and shrunk by the FR-080 ratio, so right and below
// arrive already multiplied.
// Why: the head's band is cut off: the HF-12 fold count stands there and is not a task group,
// and EP-1's Document Title sits higher still.
/** @purity pure */
function panelLinesInPicture(picture: string, right: number, below: number): PanelLine[] {
  const found: PanelLine[] = []
  const scanned = withoutTheWatermark(picture)
  const marks = /<text\b([^>]*)>([^<]*)<\/text>/g
  let one = marks.exec(scanned)
  while (one !== null) {
    const attributes = one[1] ?? ''
    const across = Number(/\bx="(-?\d+(?:\.\d+)?)"/.exec(attributes)?.[1] ?? '')
    const down = Number(/\by="(-?\d+(?:\.\d+)?)"/.exec(attributes)?.[1] ?? '')
    const said = (one[2] ?? '').trim()
    if (Number.isFinite(across) && Number.isFinite(down) && across < right && down > below && said !== '') {
      found.push({ name: said, at: across, down })
    }
    one = marks.exec(scanned)
  }
  return found.sort((first, second) => first.down - second.down)
}

// Why: the tier is a rank, not a length, so neither S-37 nor the ratio enters this reading.
/** @purity pure */
function tiered(lines: readonly PanelLine[]): string[] {
  const indents = [...new Set(lines.map((line) => line.at))].sort((one, two) => one - two)
  return lines.map((line) => `${indents.indexOf(line.at)}:${line.name}`)
}

// Why: the control comes first: one wheel notch, and the two sides must agree before the fold,
// so a failure is about the press.
// Why: the fold is the panel head's HF-12, which leaves no task group drawn, so any task group
// in the picture is one the screen does not draw; HF-10 opens them again.
// Spec: FR-080, EP-3, HF-12, HF-10
test('DFC-229: the written picture draws the task groups the screen draws after a fold, with no scroll', async () => {
  test.setTimeout(300_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const chooser = entranceBy(T109_SOURCE, 'FR-096')
    const ending = assignmentText(cellOf(T024, 'IO-3', T024_ENDING, T024_COLUMNS))
    const foldAll = entranceBy(T109_SOURCE, 'HF-12')
    const openAll = entranceBy(T109_SOURCE, 'HF-10')

    const panel = await page.evaluate(() => {
      const one = document.querySelector('[data-role="Task Group Panel"]')
      if (one === null) return null
      const box = one.getBoundingClientRect()
      return { x: box.x, y: box.y, width: box.width, height: box.height }
    })
    expect(panel, 'the task group panel is not on the screen').not.toBeNull()
    if (panel === null) return
    const head = await entranceBox(page, foldAll)
    expect(head, `${foldAll} (table T-051 row HF-12) is not drawn on the panel head`).not.toBeNull()
    if (head === null) return

    const ratio = EXPORT_WIDTH / BASE_SCREEN.width
    const right = panel.width * ratio
    const below = (head.y + head.height) * ratio

    const write = async (nth: number, when: string): Promise<string> => {
      expect(
        await pressExportFormat(page, chooser, ending),
        `the chooser offers nothing that writes ${ending} (table T-024 row IO-3)`,
      ).toBe(true)
      const wrote = await until(
        page,
        () => readWrites(page),
        (seen) => seen.bodies.length === nth,
        `the picture ${when} is written`,
      )
      const picture = wrote.bodies[nth - 1] ?? ''
      expect(picture.startsWith('<svg'), `what was written ${when} is not an SVG`).toBe(true)
      const width = Number(/^<svg\b[^>]*\bwidth="(-?\d+(?:\.\d+)?)"/.exec(picture)?.[1] ?? '')
      expect(
        width,
        `the picture ${when} was written ${width}px wide and FR-025 (MUST) fixes the width at ` +
          'S-81; the window this case reads the panel out of would be the wrong one',
      ).toBe(EXPORT_WIDTH)
      return picture
    }

    // Step: read 1, nothing pressed, taken now as a wheel cannot be turned back.
    const untouchedScreen = tiered(await panelLinesOnScreen(page))
    const untouchedPicture = tiered(panelLinesInPicture(await write(1, 'with nothing pressed'), right, below))

    // Step: the control, one wheel notch over the panel and nothing else.
    const overPanel = { x: panel.x + panel.width / 2, y: panel.y + panel.height / 2 }
    await page.mouse.move(overPanel.x, overPanel.y)
    await page.mouse.wheel(0, 200)
    await readSettledDrawnSvg(page)
    const scrolledScreen = tiered(await panelLinesOnScreen(page))
    const scrolledPicture = tiered(panelLinesInPicture(await write(2, 'after one notch of the wheel'), right, below))
    expect(
      scrolledScreen.length,
      'the panel is drawing fewer than two task groups, so the control holds no order to agree about',
    ).toBeGreaterThan(1)
    expect(
      new Set(scrolledScreen.map((line) => line.split(':')[0] ?? '')).size,
      `the control is drawing one tier only (${JSON.stringify(scrolledScreen)}), so an agreement ` +
        'about tiers would mean nothing',
    ).toBeGreaterThan(1)
    expect(
      scrolledPicture,
      'the control itself does not agree: the picture and the screen part company before anything ' +
        'has been folded, so nothing below can be laid at the fold',
    ).toEqual(scrolledScreen)

    expect(
      untouchedPicture,
      'with nothing pressed at all, the picture draws task groups the screen does not; FR-080 (MUST) has ' +
        'the picture be the screen shrunk by one ratio',
    ).toEqual(untouchedScreen)

    // Step: the claim, a fold and no scroll after it.
    expect(await pressEntrance(page, foldAll), `${foldAll} is not on the screen`).toBe(true)
    await readSettledDrawnSvg(page)
    const foldedScreen = tiered(await panelLinesOnScreen(page))
    expect(
      foldedScreen,
      `pressing ${foldAll} left the screen drawing exactly what it drew before, so this case ` +
        'never folded anything and has nothing to judge',
    ).not.toEqual(scrolledScreen)
    const foldedPicture = tiered(panelLinesInPicture(await write(3, 'after every task group was folded'), right, below))
    expect(
      foldedPicture,
      `after ${foldAll} (table T-051 row HF-12) the screen draws ${foldedScreen.length} task group(s) and ` +
        `the picture ${foldedPicture.length}; FR-080 (MUST) has 表示の切り替え の結果 be the same ` +
        'in the written picture, and nothing was scrolled in between',
    ).toEqual(foldedScreen)

    // Why: and back the other way, so the case is not one about an empty drawing.
    expect(await pressEntrance(page, openAll), `${openAll} is not on the screen`).toBe(true)
    await readSettledDrawnSvg(page)
    const openedScreen = tiered(await panelLinesOnScreen(page))
    expect(
      openedScreen.length,
      `pressing ${openAll} (table T-051 row HF-10) brought no task group back, so the second half of this ` +
        'case has nothing to judge',
    ).toBeGreaterThan(1)
    const openedPicture = tiered(panelLinesInPicture(await write(4, 'after every task group was opened again'), right, below))
    expect(
      openedPicture,
      `after ${openAll} the screen draws ${openedScreen.length} task group(s) and the picture ` +
        `${openedPicture.length}; FR-080 (MUST) has the two the same, and nothing was scrolled ` +
        'in between',
    ).toEqual(openedScreen)
  } finally {
    await opened.close()
  }
})

// Why: walked whole, not section by section: FR-038 asks only whether the dictionary holds
// the word, not where it is filed.
/** @purity semi-pure-mutable */
function dictionaryWords(): ReadonlySet<string> {
  const held = new Set<string>()
  const walk = (value: unknown): void => {
    if (typeof value === 'string') {
      const said = flat(value)
      if (said !== '') held.add(said)
      return
    }
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    if (value !== null && typeof value === 'object') {
      for (const [key, one] of Object.entries(value as Record<string, unknown>)) {
        if (key === '$comment') continue
        walk(one)
      }
    }
  }
  walk(JSON.parse(readRepoFile(DICTIONARY, 'utf8')))
  if (held.size === 0) throw new Error(`${DICTIONARY} holds no words at all`)
  return held
}

// Why: the two spellings of one entry witness the screen's language, so they must differ, or
// a case passes whatever the app did.
/** @purity semi-pure-mutable */
function neverSavedByLanguage(): ReadonlyMap<string, string> {
  const held = JSON.parse(readRepoFile(DICTIONARY, 'utf8')) as {
    fileStatus?: Array<{ state?: string; text?: Record<string, string> }>
  }
  const found = (held.fileStatus ?? []).find((one) => one.state === 'neverSaved')
  const said = new Map<string, string>()
  for (const [language, word] of Object.entries(found?.text ?? {})) {
    if (typeof word === 'string' && word !== '') said.set(language, word)
  }
  if (said.size < 2) {
    throw new Error(`${DICTIONARY} spells the never-saved word in fewer than two languages`)
  }
  if (new Set(said.values()).size !== said.size) {
    throw new Error(
      `${DICTIONARY} spells the never-saved word the same way in two languages, so no reading of ` +
        'the header can tell them apart',
    )
  }
  return said
}

interface TypedInto {
  readonly tag: string
  readonly width: number
  readonly height: number
  readonly value: string
}

// Why: focused and drawn: the build keeps a 0x0 input in the page at all times, so focus
// alone offers nobody anything.
/** @purity semi-pure-mutable */
async function focusedTypableField(page: Page): Promise<TypedInto | null> {
  return page.evaluate(() => {
    const active = document.activeElement
    if (active === null) return null
    const tag = active.tagName
    const editable = (active as HTMLElement).isContentEditable === true
    const typed =
      tag === 'TEXTAREA' ||
      (tag === 'INPUT' && ['text', 'search', null, ''].includes(active.getAttribute('type')))
    if (!typed && !editable) return null
    const box = active.getBoundingClientRect()
    if (box.width < 1 || box.height < 1) return null
    return {
      tag,
      width: Math.round(box.width),
      height: Math.round(box.height),
      value: editable
        ? (active.textContent ?? '').trim()
        : (active as HTMLInputElement).value,
    }
  })
}

interface PanelPrinting {
  readonly names: readonly string[]
  readonly words: readonly string[]
}

// Why: data-field-row and the first span are the build's marking, not the spec's; a change
// to it breaks these cases, as it should.
/** @purity semi-pure-mutable */
async function panelPrinting(page: Page): Promise<PanelPrinting> {
  return page.evaluate((panel: string) => {
    const host = document.querySelector(panel)
    if (host === null) return { names: [], words: [] }
    const names = Array.from(host.querySelectorAll('div[data-field-row]'))
      .map((row) => (row.querySelector(':scope > span')?.textContent ?? '').trim())
      .filter((said) => said !== '')
    const words = Array.from(host.querySelectorAll('*'))
      .filter((element) => element.children.length === 0)
      .map((element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim())
      .filter((said) => said !== '')
    return { names, words }
  }, PANEL)
}

interface Standing {
  readonly sheets: number
  readonly text: string
}

// Why: readNotices counts areas, not sheets: every notice stands in one Notification Area,
// so the sheets are its children (NT-3).
/** @purity semi-pure-mutable */
async function standingNotices(page: Page): Promise<Standing> {
  return page.evaluate(() => {
    const areas = Array.from(document.querySelectorAll('[data-role]')).filter((marked) =>
      (marked.getAttribute('data-role') ?? '').includes('Notification'),
    )
    let sheets = 0
    let text = ''
    for (const area of areas) {
      sheets += Array.from(area.children).filter(
        (child) => (child.textContent ?? '').trim() !== '',
      ).length
      text += (area.textContent ?? '').replace(/\s+/g, ' ').trim()
    }
    return { sheets, text }
  })
}

/** @purity semi-pure-mutable */
function reasonsCarriedBy(said: string): readonly string[] {
  return reasonWordsOfDictionary()
    .filter((one) => (one.ja !== '' && said.includes(one.ja)) || (one.en !== '' && said.includes(one.en)))
    .map((one) => one.specTableRowId)
}

/** @purity pure */
function timesCarried(said: string, word: string): number {
  if (word === '') return 0
  return said.split(word).length - 1
}

interface DrawnTaskGroup {
  readonly top: number
  readonly bottom: number
  readonly text: string
}

// Why: [data-depth] is the drawn window, not the document, so a task group missing here is
// one a person cannot see (HF-17).
/** @purity semi-pure-mutable */
async function drawnTaskGroupsAndPanel(
  page: Page,
): Promise<{ rows: readonly DrawnTaskGroup[]; panelTop: number; panelBottom: number }> {
  return page.evaluate(() => {
    const panel = document.querySelector('[data-role="Task Group Panel"]')
    const box = panel?.getBoundingClientRect()
    const rows = Array.from(document.querySelectorAll('[data-depth]'))
      .map((row) => {
        const taskGroupBox = row.getBoundingClientRect()
        return {
          top: Math.round(taskGroupBox.top),
          bottom: Math.round(taskGroupBox.bottom),
          text: (row.textContent ?? '').replace(/\s+/g, ' ').trim(),
        }
      })
      .sort((one, two) => one.top - two.top)
    return {
      rows,
      panelTop: Math.round(box?.top ?? 0),
      panelBottom: Math.round(box?.bottom ?? window.innerHeight),
    }
  })
}

// Why: a task group's entrances are hidden until the pointer is on its name (HF-6), and a
// dispatched event reaches nothing.
/** @purity non-pure */
async function pressRowEntrance(page: Page, taskGroupTop: number, entrance: string): Promise<boolean> {
  const name = await page.evaluate((wantedTop: number) => {
    const row = Array.from(document.querySelectorAll('[data-depth]')).find(
      (one) => Math.abs(one.getBoundingClientRect().top - wantedTop) < 2,
    )
    if (row === undefined) return null
    const box = row.getBoundingClientRect()
    return { x: Math.round(box.x + 30), y: Math.round(box.y + box.height / 2) }
  }, taskGroupTop)
  if (name === null) return false
  await page.mouse.move(name.x, name.y)
  await page.waitForTimeout(500)
  const at = await page.evaluate(
    (asked: { entrance: string; top: number }) => {
      const found = Array.from(document.querySelectorAll(`[data-icon="${asked.entrance}"]`)).find(
        (one) => Math.abs(one.getBoundingClientRect().top - asked.top) < 60,
      )
      if (found === undefined) return null
      const box = found.getBoundingClientRect()
      if (box.width < 1 || box.height < 1) return null
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    },
    { entrance, top: taskGroupTop },
  )
  if (at === null) return false
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(600)
  return true
}

// Why: the second half is a separate claim: a name may be absent without being an identifier,
// and an identifier may stand beside a good name.
// Spec: T-006a, W-2, T-016, FR-038
test('DFC-233: the settings surface prints dictionary words and no raw identifier', async () => {
  test.setTimeout(180_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const settings = entranceBy(T109_SOURCE, 'FR-072')
    expect(await pressEntrance(page, settings), `${settings} is not on the screen`).toBe(true)
    await page.waitForTimeout(900)

    const printing = await panelPrinting(page)
    expect(
      printing.names.length,
      `pressing ${settings} put no field row on the panel, so this case has nothing to read`,
    ).toBeGreaterThan(0)

    const held = dictionaryWords()
    // Why: CR-755 (FO-15) -- a display time zone row is the dictionary's name followed by its number 1 to 4.
    const unnumbered = (name: string): string => name.replace(/ [1-4]$/, '')
    const strangers = [...new Set(printing.names)].filter((name) => !held.has(name) && !held.has(unnumbered(name)))
    expect(
      strangers.slice(0, 12),
      `the settings surface prints ${strangers.length} of its ${printing.names.length} item ` +
        'name(s) as words the dictionary does not hold; the paragraph under table T-006a (MUST) ' +
        'has this surface follow the same rule as the panel, whose names FR-038 keeps in ' +
        `${DICTIONARY}`,
    ).toEqual([])

    // Why: asked for by UUID shape, not field name, so an identifier in any row is caught.
    const identifiers = printing.words.filter((said) =>
      /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.test(said),
    )
    expect(
      identifiers,
      'the settings surface prints an identifier as it is held inside, which the same paragraph ' +
        '(MUST NOT) forbids: 「内部の綴りや識別子をそのまま出してはならない」',
    ).toEqual([])
  } finally {
    await opened.close()
  }
})

// Why: the new task group is found by the name typed, as HF-14 has it stand nameless and
// dropped if settled empty.
// Why: both halves are pressed, as HF-17 holds HF-14 to the same scroll (HF-9).
// Spec: HF-17, HF-14, HF-9
test('DFC-234: a task group added at the head, and one added under the last task group, are both brought into view', async () => {
  test.setTimeout(240_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const addAtHead = entranceBy(T109_SOURCE, 'HF-17')
    const addUnderTaskGroup = entranceBy(T109_SOURCE, 'HF-14')

    // Step: HF-17, the shallowest tier.
    expect(await pressEntrance(page, addAtHead), `${addAtHead} is not on the screen`).toBe(true)
    await page.waitForTimeout(600)
    const headField = await focusedTypableField(page)
    expect(
      headField,
      `pressing ${addAtHead} (table T-051 row HF-17) opened no field to type the new task group's name ` +
        'into, and HF-14 (MUST) has the task group stand with an empty name for a person to fill',
    ).not.toBeNull()
    if (headField === null) return

    const headName = 'ZetaHeadTaskGroup'
    await page.keyboard.type(headName)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1200)

    const afterHead = await drawnTaskGroupsAndPanel(page)
    const headTaskGroup = afterHead.rows.find((row) => row.text.includes(headName))
    expect(
      headTaskGroup,
      `after the name was settled the task group named ${JSON.stringify(headName)} is drawn nowhere; ` +
        `the panel is drawing ${afterHead.rows.length} task group(s) and HF-17 (MUST) has the view sent ` +
        'until the added task group is one of them',
    ).not.toBeUndefined()
    if (headTaskGroup === undefined) return
    expect(
      headTaskGroup.top >= afterHead.panelTop && headTaskGroup.bottom <= afterHead.panelBottom,
      `the task group named ${JSON.stringify(headName)} is drawn at ${headTaskGroup.top}..${headTaskGroup.bottom}px ` +
        `while the panel is at ${afterHead.panelTop}..${afterHead.panelBottom}px, so it is not at ` +
        'a position it can be read from',
    ).toBe(true)

    // Step: HF-14, under the task group standing lowest.
    const lowest = [...afterHead.rows].sort((one, two) => two.top - one.top)[0]
    expect(lowest, 'the panel drew no task group to add a child under').not.toBeUndefined()
    if (lowest === undefined) return
    expect(
      await pressRowEntrance(page, lowest.top, addUnderTaskGroup),
      `${addUnderTaskGroup} (table T-051 row HF-14) is not drawn on the task group at the foot of the panel ` +
        'even with the pointer on its name',
    ).toBe(true)

    const childField = await focusedTypableField(page)
    expect(
      childField,
      `pressing ${addUnderTaskGroup} on the lowest task group opened no field to type the new task group's name into`,
    ).not.toBeNull()
    if (childField === null) return

    const childName = 'ZetaChildTaskGroup'
    await page.keyboard.type(childName)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1200)

    const afterChild = await drawnTaskGroupsAndPanel(page)
    const childTaskGroup = afterChild.rows.find((row) => row.text.includes(childName))
    expect(
      childTaskGroup,
      `after the name was settled the task group named ${JSON.stringify(childName)} is drawn nowhere; ` +
        'HF-17 (MUST) holds HF-14 to the same thing -- 「`HF-14`（配下に足す）も同じとすること' +
        '（MUST）」',
    ).not.toBeUndefined()
    if (childTaskGroup === undefined) return
    expect(
      childTaskGroup.top >= afterChild.panelTop && childTaskGroup.bottom <= afterChild.panelBottom,
      `the task group named ${JSON.stringify(childName)} is drawn at ${childTaskGroup.top}..${childTaskGroup.bottom}px ` +
        `while the panel is at ${afterChild.panelTop}..${afterChild.panelBottom}px`,
    ).toBe(true)
  } finally {
    await opened.close()
  }
})

// Why: the root element's lang is checked: no requirement says how the document names its
// language, and lang is what a reader and a translation read.
// Why: the screen is asked its language by the FR-101 never-saved word, as the language follows
// the browser.
// Spec: FR-038
test('DFC-235: changing the display language changes the language the document names', async () => {
  test.setTimeout(180_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    // Why: FR-038 has two entrances since CR-574 -- the screen's language in the
    // Why: App Header and the help's own inside the Help Modal; this case is the former.
    const screenToggles = T109.rows
      .filter((row) => row.cells.length === T109_COLUMNS)
      .filter((row) => (row.cells[T109_SOURCE] ?? '').includes('FR-038'))
      .filter((row) => (row.cells[T109_PLACE] ?? '').includes('App Header'))
    expect(
      screenToggles.map((row) => row.id),
      'table T-109 must give FR-038 exactly one entrance in the App Header',
    ).toHaveLength(1)
    const toggle = screenToggles[0]?.id ?? ''
    const words = neverSavedByLanguage()

    const shownLanguage = async (): Promise<string> => {
      const said = await page.evaluate(() => {
        const header = document.querySelector('[data-role="App Header"]')
        return (header?.textContent ?? '').replace(/\s+/g, ' ').trim()
      })
      const found = [...words.entries()].filter(([, word]) => said.includes(word))
      if (found.length !== 1) {
        throw new Error(
          `the header reads ${JSON.stringify(said)}, which carries ${found.length} of the ` +
            "dictionary's never-saved words; exactly one is needed to name the language on the screen",
        )
      }
      return found[0]?.[0] ?? ''
    }

    const declared = async (): Promise<string> =>
      page.evaluate(() => document.documentElement.getAttribute('lang') ?? '')

    const wasShown = await shownLanguage()
    const wasDeclared = await declared()
    expect(
      wasDeclared,
      `before anything was pressed the screen is in ${JSON.stringify(wasShown)} and the document ` +
        `names ${JSON.stringify(wasDeclared)}`,
    ).toBe(wasShown)

    expect(await pressEntrance(page, toggle), `${toggle} is not on the screen`).toBe(true)
    await page.waitForTimeout(900)

    const nowShown = await shownLanguage()
    expect(
      nowShown,
      `pressing ${toggle} (table T-109, sourced to FR-038) left the screen in the same language, ` +
        'so this case never reached the moment the requirement is about',
    ).not.toBe(wasShown)
    expect(
      await declared(),
      `the screen changed from ${JSON.stringify(wasShown)} to ${JSON.stringify(nowShown)} and the ` +
        'document goes on naming the old one; FR-038 (MUST) has the two the same',
    ).toBe(nowShown)
  } finally {
    await opened.close()
  }
})

// Why: the reason's own words are counted with the sheets, so a merge is told apart from a
// build that stopped raising the second notice.
// Why: the ceiling is watched from the other side: a second, different reason must stand
// beside the first.
// Why: the presses are spaced, as two inside a double-click interval are one double click (MK-13).
// Spec: NT-3, NT-8
test('DFC-236: the same reason raised again counts on the standing notice instead of stacking', async () => {
  test.setTimeout(240_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const spacing = 1600
    const unreadable = { name: 'notes.txt', text: 'not a schedule' }

    await dropText(page, unreadable.name, unreadable.text)
    await page.waitForTimeout(spacing)
    const once = await standingNotices(page)
    expect(once.sheets, `dropping ${unreadable.name} raised no notice at all`).toBe(1)

    const reasons = reasonsCarriedBy(once.text)
    expect(
      reasons,
      `the notice ${unreadable.name} raised reads ${JSON.stringify(once.text)}, and table T-233 is where ` +
        'every reason a notice may carry lives',
    ).toHaveLength(1)
    const carried = reasonWordsOfDictionary().find((one) => one.specTableRowId === reasons[0])
    if (carried === undefined) return
    const word = once.text.includes(carried.ja) ? carried.ja : carried.en

    await dropText(page, unreadable.name, unreadable.text)
    await page.waitForTimeout(spacing)
    const twice = await standingNotices(page)
    expect(
      timesCarried(twice.text, word),
      `dropping ${unreadable.name} a second time put the same reason (${carried.specTableRowId}) up ` +
        `${timesCarried(twice.text, word)} times; NT-3 (MUST) has the standing sheet counted up ` +
        'instead of a second one being stacked',
    ).toBe(1)
    expect(twice.sheets, `${unreadable.name} dropped twice leaves more than one sheet standing`).toBe(1)
    expect(
      twice.text,
      `the standing notice reads exactly what it read after one drop, so nothing was counted; ` +
        'NT-3 (MUST) has its 件数 grow',
    ).not.toBe(once.text)

    await dropText(page, unreadable.name, unreadable.text)
    await page.waitForTimeout(spacing)
    const thrice = await standingNotices(page)
    expect(thrice.sheets, `${unreadable.name} dropped three times leaves more than one sheet standing`).toBe(1)
    expect(
      thrice.text,
      'the standing notice reads exactly what it read after two drops, so the third was ' +
        'counted nowhere',
    ).not.toBe(twice.text)

    // Why: a second reason, where a ceiling would show: a file that is not UTF-8.
    await dropText(page, 'bytes.json', [0xff, 0xfe, 0xfd, 0x7b])
    await page.waitForTimeout(spacing)
    const second = await standingNotices(page)
    expect(
      reasonsCarriedBy(second.text).length,
      'dropping a file that is not UTF-8 raised no reason different from the one already ' +
        `standing (${JSON.stringify(second.text)}, ${second.sheets} sheet(s)), so this half of NT-3 ` +
        '(MUST NOT: 枚数に上限を置いてはならない) cannot be judged here',
    ).toBeGreaterThan(1)
    expect(
      second.sheets,
      `two different reasons are standing and the screen is showing ${second.sheets} sheet(s); ` +
        'NT-3 merges only 同じ理由, and NT-8 (MUST) is written for two or more standing at once',
    ).toBe(2)
  } finally {
    await opened.close()
  }
})

const HELD: readonly string[] = [
  'DFC-24',
  'DFC-43',
  'DFC-49',
  'DFC-52',
  'DFC-65',
  'DFC-66',
  'DFC-82',
  'DFC-91',
  'DFC-92',
  'DFC-97',
  'DFC-98',
  'DFC-103',
  'DFC-105',
  'DFC-106',
  'DFC-126',
  'DFC-130',
  'DFC-152',
  'DFC-166',
  'DFC-210',
  'DFC-220',
  'DFC-229',
  'DFC-232',
  'DFC-233',
  'DFC-234',
  'DFC-235',
  'DFC-236',
]

// Why: both files, as fixed-defects.md continues defects.md and a row moves across once measured.
const LEDGERS: readonly string[] = ['defects.md', 'fixed-defects.md']

test('every ledger row this file holds down is still a row of the ledger', () => {
  const written = LEDGERS.map((file) =>
    readRepoFile(join(process.cwd(), 'docs', 'development-records', file), 'utf8'),
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

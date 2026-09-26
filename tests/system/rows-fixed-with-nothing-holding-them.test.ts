// System cases for seven fixed-but-unautomated rows of defects.md (DFC-27, DFC-115, DFC-133, DFC-157, DFC-180, DFC-209, DFC-215).

// WHY: a Playwright file, not a unit -- DFC-215 asks for rules that live only
// in the shell, unreachable from a Vitest and impossible to publish as a seam.
// WHY: every number asserted (scrollbar floor, press/drag boundary, screen,
// field column) is read out of docs/spec at read time, never measured locally.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { specTable, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const T025: SpecTable = specTable('T-025')
const T016: SpecTable = specTable('T-016')
const T058: SpecTable = specTable('T-058')
const T109: SpecTable = specTable('T-109')
const T206: SpecTable = specTable('T-206')

/** @purity pure */
function numberIn(cell: string, what: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) {
    throw new Error(`${what} states no number this file can read: ${JSON.stringify(cell)}`)
  }
  return value
}

/** @purity pure */
function settingOf(id: string): number {
  const row = rowOf(T206, id)
  return numberIn(row.cells[1] ?? '', `table T-206 row ${id}`)
}

const SCROLLBAR_FLOOR_PX = settingOf('S-205')

const PRESS_OR_DRAG_PX = settingOf('S-208')

const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

// WHY: resolved rather than written -- naming the entity and column here
// means the case follows the manuscript if the row itself is renumbered.
/** @purity pure */
function columnRowOf(entity: string, column: string): string {
  const found = T058.rows.filter(
    (row) => (row.cells[0] ?? '').includes(entity) && (row.cells[1] ?? '').includes(`\`${column}\``),
  )
  if (found.length !== 1) {
    throw new Error(
      `table T-058 has ${found.length} rows for ${entity}.${column}, and this file needs one`,
    )
  }
  return found[0]?.id ?? ''
}

// WHY: IR-1 marks a field by its table T-016 row; the row-name field alone
// keeps the ERD column (AT-53), so only the name is read from table T-058.
const ROW_NAME_COLUMN = columnRowOf('TaskGroup', 'label')

/** @purity pure */
function propertyRowOf(entity: string, column: string): string {
  const found = T016.rows.filter(
    (row) => (row.cells[0] ?? '').includes(`\`${column}\``) && (row.cells[2] ?? '').includes(entity),
  )
  if (found.length !== 1) {
    throw new Error(
      `table T-016 has ${found.length} rows for ${entity}.${column}, and this file needs one`,
    )
  }
  return found[0]?.id ?? ''
}

const ROW_HEIGHT_FIELD = propertyRowOf('TaskGroup', 'height')

// WHY: found by what the table says the entrance does, so that no case
// spells an IC-nn of its own.
/** @purity pure */
function entranceNaming(text: string): string {
  const found = T109.rows.filter((row) => (row.cells[2] ?? '').includes(text))
  if (found.length !== 1) {
    throw new Error(
      `table T-109 has ${found.length} entrances whose purpose names ${JSON.stringify(text)}, ` +
        'and this file needs exactly one',
    )
  }
  return found[0]?.id ?? ''
}

// WHY: built from code points, not literal characters -- rule 03 section 5
// keeps this tree ASCII, and a literal would be invisible in a diff.
const FOLD_ALL_BELOW = String.fromCharCode(
  0x884c, 0x306e, 0x914d, 0x4e0b, 0x3092, 0x3059, 0x3079, 0x3066, 0x7573, 0x3080,
)
const OPEN_ONE_TIER = String.fromCharCode(
  0x884c, 0x306e, 0x914d, 0x4e0b, 0x3092, 0x0020, 0x0031, 0x0020, 0x968e, 0x5c64, 0x3060, 0x3051,
  0x958b, 0x304f,
)
const COMMENT_BOX_WORD = String.fromCharCode(
  0x30b3, 0x30e1, 0x30f3, 0x30c8, 0x30dc, 0x30c3, 0x30af, 0x30b9,
)
const HIGHLIGHT_BOX_WORD = String.fromCharCode(
  0x30cf, 0x30a4, 0x30e9, 0x30a4, 0x30c8, 0x30dc, 0x30c3, 0x30af, 0x30b9,
)

const FOLD_BELOW_ENTRANCE = entranceNaming(FOLD_ALL_BELOW)
const OPEN_ONE_TIER_ENTRANCE = entranceNaming(OPEN_ONE_TIER)

// WHY: not entranceNaming -- table T-109 prints the same word in two
// entrances' purpose, so the holding table T-023b names must pick the row.
/** @purity pure */
function entranceArming(holding: string): string {
  const armed = specTable('T-023b').rows.filter((row) => (row.cells[0] ?? '').includes(holding))
  if (armed.length !== 1) {
    throw new Error(`table T-023b has ${armed.length} holdings named ${JSON.stringify(holding)}`)
  }
  const wanted = new RegExp(`${armed[0]?.id ?? ''}(?![0-9])`)
  const found = T109.rows.filter((row) => wanted.test(row.cells[row.cells.length - 1] ?? ''))
  if (found.length !== 1) {
    throw new Error(
      `table T-109 has ${found.length} entrances arming ${armed[0]?.id ?? ''}, and this file needs one`,
    )
  }
  return found[0]?.id ?? ''
}

const COMMENT_BOX_ENTRANCE = entranceArming(COMMENT_BOX_WORD)
const HIGHLIGHT_BOX_ENTRANCE = entranceArming(HIGHLIGHT_BOX_WORD)

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  // WHY: this is the hook's own allowance, not an assertion's -- see
  // CLEARING_UP_MS in ./live-app for the measurement behind it.
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity semi-pure-b */
function openedBrowser(): Browser {
  if (browser === null) throw new Error('the reference browser was not opened')
  return browser
}

interface Opened {
  readonly page: Page
  close(): Promise<void>
}

// WHY: the same selectors the neighbouring System files lean on -- no spec
// row fixes how a part is marked in the page.
const CANVAS = '[data-role="Schedule Canvas"] svg'
const CANVAS_PART = '[data-role="Schedule Canvas"]'
const ROW_PANEL = '[data-role="Row Title Panel"]'
const PROPERTIES = '[data-role="Properties Panel"]'
const SCROLLBARS = '[data-role="Scrollbars"]'
const DIVIDER = '[data-role="Panel Divider"]'

/** @purity non-pure */
async function openTheApp(baseURL: string | undefined): Promise<Opened> {
  if (baseURL === undefined) {
    throw new Error('playwright.config.ts declares no baseURL for the running application')
  }
  const context = await openedBrowser().newContext({ baseURL, viewport: BASE_SCREEN })
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

interface DrawnRow {
  readonly depth: number
  readonly height: number
  readonly label: string
  // WHY: a name longer than the room comes back with an ellipsis (FR-085),
  // which every case comparing a typed name reads first.
  readonly isCut: boolean
}

/** @purity semi-pure-b */
async function drawnRows(page: Page): Promise<DrawnRow[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-depth]')).map((row) => ({
      depth: Number(row.getAttribute('data-depth')),
      height: Math.round(row.getBoundingClientRect().height),
      label: (row.querySelector('span')?.textContent ?? '').trim(),
      isCut: row.getAttribute('data-truncated') === 'true',
    })),
  )
}

// WHY: short on purpose -- a name FR-085 legitimately cuts would make these
// cases argue about that instead of the name they compare against.
const SHORT_NAME = 'Row Zed'

// WHY: not the middle of the name's box -- the row's folding controls draw
// over that end, so the page is asked which element is actually on top.
/** @purity semi-pure-b */
async function nameSpotOf(page: Page, index: number): Promise<{ x: number; y: number } | null> {
  return page.evaluate((wanted: number) => {
    const row = Array.from(document.querySelectorAll('[data-depth]'))[wanted]
    const name = row?.querySelector('span')
    if (name === null || name === undefined) return null
    const box = name.getBoundingClientRect()
    const middle = box.y + box.height / 2
    for (let x = Math.ceil(box.x) + 1; x < box.right - 1; x += 2) {
      if (document.elementFromPoint(x, middle) === name) return { x, y: middle }
    }
    return null
  }, index)
}

// WHY: a real pointer, not element.click() -- the shell reads the pointer,
// and a synthetic click has reached nothing in this project before.
/** @purity non-pure */
async function pressAt(page: Page, at: { x: number; y: number }): Promise<void> {
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
}

/** @purity non-pure */
async function pressTwice(page: Page, at: { x: number; y: number }): Promise<void> {
  await pressAt(page, at)
  await page.waitForTimeout(250)
  await pressAt(page, at)
  await page.waitForTimeout(900)
}

/** @purity non-pure */
async function pressEntrance(page: Page, icon: string): Promise<boolean> {
  const at = await page.evaluate((wanted: string) => {
    const entry = document.querySelector(`[data-icon="${wanted}"]`)
    if (entry === null) return null
    const box = entry.getBoundingClientRect()
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, icon)
  if (at === null) return false
  await pressAt(page, at)
  await page.waitForTimeout(600)
  return true
}

/** @purity non-pure */
async function pressEntranceInRow(page: Page, index: number, icon: string): Promise<boolean> {
  const at = await page.evaluate(
    (asked: { index: number; icon: string }) => {
      const row = Array.from(document.querySelectorAll('[data-depth]'))[asked.index]
      const box = row?.querySelector(`[data-icon="${asked.icon}"]`)?.getBoundingClientRect()
      return box === undefined ? null : { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    },
    { index, icon },
  )
  if (at === null) return false
  await pressAt(page, at)
  await page.waitForTimeout(700)
  return true
}

/** @purity semi-pure-b */
async function armingOf(page: Page, icon: string): Promise<string | null> {
  return page.evaluate(
    (wanted: string) =>
      document.querySelector(`[data-icon="${wanted}"]`)?.getAttribute('data-armed') ?? null,
    icon,
  )
}

/** @purity semi-pure-b */
async function drawnElementCount(page: Page): Promise<number> {
  return page.evaluate(
    (canvas: string) => document.querySelector(canvas)?.querySelectorAll('*').length ?? -1,
    CANVAS,
  )
}

/** @purity non-pure */
async function cursorAt(page: Page, x: number, y: number): Promise<string> {
  await page.mouse.move(x, y)
  return page.evaluate((part: string) => {
    const surface = document.querySelector(part)
    return surface instanceof HTMLElement ? surface.style.cursor : ''
  }, CANVAS_PART)
}

const REACH_PX = 160

// WHY: ground below the last row does not do -- FR-019 (MUST) holds an
// annotation's position by a row identifier, which that ground has none of.
/** @purity non-pure */
async function groundOnADrawnRow(page: Page): Promise<{ x: number; y: number } | null> {
  const ground = await page.evaluate(
    (asked: { panel: string; reach: number }) => {
      const panel = document.querySelector(asked.panel)?.getBoundingClientRect()
      if (panel === undefined) return null
      const middles: number[] = []
      for (const row of Array.from(document.querySelectorAll('[data-depth]'))) {
        const band = row.getBoundingClientRect()
        const middle = Math.round(band.y + band.height / 2)
        if (middle >= 300 && middle <= window.innerHeight - 60) middles.push(middle)
      }
      return {
        left: Math.round(panel.right + 80),
        right: window.innerWidth - 200 - asked.reach,
        middles,
      }
    },
    { panel: ROW_PANEL, reach: REACH_PX },
  )
  if (ground === null) return null
  for (const y of ground.middles) {
    for (let x = ground.left; x <= ground.right; x += 24) {
      if ((await cursorAt(page, x, y)) !== 'default') continue
      if ((await cursorAt(page, x + REACH_PX, y)) !== 'default') continue
      return { x, y }
    }
  }
  return null
}

/** @purity semi-pure-b */
async function panelFields(page: Page): Promise<Record<string, string>> {
  return page.evaluate((panel: string) => {
    const out: Record<string, string> = {}
    for (const field of Array.from(document.querySelectorAll(`${panel} [data-field-kind]`))) {
      const row = field.getAttribute('data-field-row') ?? ''
      if (row !== '') out[row] = (field as HTMLInputElement).value
    }
    return out
  }, PROPERTIES)
}

/** @purity semi-pure-b */
async function rowPanelWidth(page: Page): Promise<number> {
  return page.evaluate(
    (panel: string) =>
      Math.round(document.querySelector(panel)?.getBoundingClientRect().width ?? -1),
    ROW_PANEL,
  )
}

/** @purity non-pure */
async function openPanelOnRow(page: Page, index: number): Promise<void> {
  const spot = await nameSpotOf(page, index)
  expect(spot, `row ${index} draws a name a pointer can reach`).not.toBeNull()
  await pressTwice(page, spot as { x: number; y: number })
}

/** @purity non-pure */
async function commitField(page: Page, kind: string, value: string): Promise<void> {
  const field = page.locator(`${PROPERTIES} [data-field-kind="${kind}"]`).first()
  await field.click()
  await field.fill(value)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(900)
}

interface DrawnBar {
  readonly axis: string
  readonly width: number
  readonly height: number
  readonly thumb: { readonly width: number; readonly height: number } | null
}

/** @purity semi-pure-b */
async function drawnScrollbars(page: Page): Promise<DrawnBar[]> {
  return page.evaluate(
    (selector: string) =>
      Array.from(document.querySelectorAll(selector)).map((bar) => {
        const box = bar.getBoundingClientRect()
        const inner = bar.firstElementChild?.getBoundingClientRect() ?? null
        return {
          axis: bar.getAttribute('data-axis') ?? '',
          width: Math.round(box.width),
          height: Math.round(box.height),
          thumb:
            inner === null
              ? null
              : { width: Math.round(inner.width), height: Math.round(inner.height) },
        }
      }),
    SCROLLBARS,
  )
}

/** @purity semi-pure-b */
async function hostScrollbarThickness(page: Page): Promise<number> {
  return page.evaluate(() => {
    const probe = document.createElement('div')
    probe.style.cssText =
      'position:absolute;visibility:hidden;overflow:scroll;width:100px;height:100px;'
    document.body.appendChild(probe)
    const thickness = probe.offsetWidth - probe.clientWidth
    probe.remove()
    return thickness
  })
}

// WHY: proves both bars are drawn at all (SC-4 MUST), so the two cases below
// cannot pass by measuring a bar that is not on the screen.
test('control for DFC-115: both scrollbars are on the screen (SC-4 of table T-031)', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  try {
    const bars = await drawnScrollbars(opened.page)
    expect(bars.map((bar) => bar.axis).sort()).toEqual(['horizontal', 'vertical'])
  } finally {
    await opened.close()
  }
})

// WHY: DFC-215's evidence as much as DFC-115's -- the halving applies to a
// thickness only the host reports, which no Vitest can be given.
test('DFC-115: neither scrollbar is drawn thinner than `S-205`, the floor FR-051 states', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  try {
    const host = await hostScrollbarThickness(opened.page)
    const bars = await drawnScrollbars(opened.page)
    const thicknessOf = (bar: DrawnBar): number =>
      bar.axis === 'vertical' ? bar.width : bar.height

    for (const bar of bars) {
      expect(thicknessOf(bar), `the ${bar.axis} bar is at least S-205 thick`).toBeGreaterThanOrEqual(
        SCROLLBAR_FLOOR_PX,
      )
      if (host / 2 < SCROLLBAR_FLOOR_PX) {
        expect(thicknessOf(bar), `the ${bar.axis} bar is the floor itself`).toBe(SCROLLBAR_FLOOR_PX)
      }
    }
  } finally {
    await opened.close()
  }
})

test('DFC-115: the thumb inside each scrollbar is as thick as the bar', async ({ baseURL }) => {
  const opened = await openTheApp(baseURL)
  try {
    for (const bar of await drawnScrollbars(opened.page)) {
      expect(bar.thumb, `the ${bar.axis} bar draws a thumb`).not.toBeNull()
      const thumb = bar.thumb as { width: number; height: number }
      const across = bar.axis === 'vertical' ? thumb.width : thumb.height
      const along = bar.axis === 'vertical' ? thumb.height : thumb.width
      expect(across, `the ${bar.axis} thumb is at least S-205 across`).toBeGreaterThanOrEqual(
        SCROLLBAR_FLOOR_PX,
      )
      expect(along, `the ${bar.axis} thumb has a length to grab`).toBeGreaterThan(
        SCROLLBAR_FLOOR_PX,
      )
    }
  } finally {
    await opened.close()
  }
})

// WHY: DFC-215's second piece of evidence -- FR-100's MUST and MUST NOT are
// both asked of one page, so neither half can pass by the page being broken.
test('DFC-215: FR-100 -- the host warning is asked for only once the document is dirty', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  try {
    const wouldWarn = (): Promise<boolean> =>
      opened.page.evaluate(() => {
        const asking = new Event('beforeunload', { cancelable: true })
        window.dispatchEvent(asking)
        return asking.defaultPrevented
      })

    expect(await wouldWarn(), 'FR-100 (MUST NOT): a document with no edit warns nobody').toBe(false)

    await openPanelOnRow(opened.page, 0)
    await commitField(opened.page, 'text', 'a name this case typed')

    expect(await wouldWarn(), 'FR-100 (MUST): an unsaved edit makes the host warn').toBe(true)
  } finally {
    await opened.close()
  }
})

// WHY: the field is found by the column table T-058 gives it, so this case
// follows a renumbering of the manuscript rather than naming AT-53 itself.
test('DFC-180: pressing a row name twice opens the panel with the name field focused and all of it selected', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  try {
    const before = await drawnRows(opened.page)
    expect(before.length, 'the startup document draws rows to press').toBeGreaterThan(0)
    const name = (before[0] as DrawnRow).label
    expect(name, 'the row this case presses has a name').not.toBe('')

    await openPanelOnRow(opened.page, 0)

    const state = await opened.page.evaluate(
      (asked: { panel: string; column: string }) => {
        const shown = document.querySelector(asked.panel)
        const box = shown?.getBoundingClientRect()
        const focused = document.activeElement
        return {
          panelWidth: Math.round(box?.width ?? 0),
          focusedRow: focused?.getAttribute('data-field-row') ?? null,
          // WHY: FR-006 wraps a text field downwards, so the name field is a textarea since CR-408.
          selection:
            focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement
              ? { start: focused.selectionStart, end: focused.selectionEnd, value: focused.value }
              : null,
          hasNameField:
            (shown?.querySelectorAll(`[data-field-row="${asked.column}"][data-field-kind]`).length ??
              0) > 0,
        }
      },
      { panel: PROPERTIES, column: ROW_NAME_COLUMN },
    )

    expect(state.panelWidth, 'MK-13: the panel is put up').toBeGreaterThan(0)
    expect(state.hasNameField, `MK-13: the panel carries the ${ROW_NAME_COLUMN} field`).toBe(true)
    expect(state.focusedRow, `MK-13: the focus is on ${ROW_NAME_COLUMN}`).toBe(ROW_NAME_COLUMN)
    expect(state.selection?.value, 'MK-13: the field holds the row name').toBe(name)
    expect(
      { start: state.selection?.start, end: state.selection?.end },
      'MK-13 (MUST): every character already there is selected',
    ).toEqual({ start: 0, end: name.length })
  } finally {
    await opened.close()
  }
})

// WHY: both faces (panel and row) are asked in one case, so FR-006 cannot
// pass by the confirmed value reaching neither, or only one of them.
test('DFC-133: confirming the height field moves the panel and the row together', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  try {
    // WHY: DFC-1002 cleared row 0's stated height (PR-20: null = blank field),
    // so this case needs Phase Gates, the template's one row that still has one.
    const before0 = await drawnRows(opened.page)
    const index = before0.findIndex((row) => row.label === 'Phase Gates')
    expect(index, 'the template draws a Phase Gates row').toBeGreaterThanOrEqual(0)

    await openPanelOnRow(opened.page, index)
    const before = (await drawnRows(opened.page))[index] as DrawnRow
    const shownBefore = (await panelFields(opened.page))[ROW_HEIGHT_FIELD]
    expect(Number(shownBefore), `the panel shows ${ROW_HEIGHT_FIELD} to begin with`).toBe(
      before.height,
    )

    const wanted = before.height + 56
    await commitField(opened.page, 'number', String(wanted))

    const after = (await drawnRows(opened.page))[index] as DrawnRow
    expect(after.height, 'FR-006: the row takes the confirmed height').toBe(wanted)
    expect(
      Number((await panelFields(opened.page))[ROW_HEIGHT_FIELD]),
      'FR-006 (MUST): the panel is not left holding the reading it had while the field was held',
    ).toBe(wanted)
  } finally {
    await opened.close()
  }
})

test('DFC-133: confirming the name field moves the panel and the row heading together', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  try {
    await openPanelOnRow(opened.page, 0)
    const before = (await drawnRows(opened.page))[0] as DrawnRow
    expect(before.label, 'the row starts under another name').not.toBe(SHORT_NAME)

    await commitField(opened.page, 'text', SHORT_NAME)

    const after = (await drawnRows(opened.page))[0] as DrawnRow
    expect(after.isCut, 'FR-085 had no reason to cut a name this short').toBe(false)
    expect(after.label, 'FR-006: the row heading takes the name').toBe(SHORT_NAME)
    expect(
      (await panelFields(opened.page))[ROW_NAME_COLUMN],
      'FR-006 (MUST): the panel shows the name it just wrote',
    ).toBe(SHORT_NAME)
  } finally {
    await opened.close()
  }
})

const WIDEN_BY_PX = 90

// WHY: the undo has to reach something first, or this case would pass on a
// keystroke that did nothing -- the rename (UN-14) is asserted before UN-16.
test('DFC-27: an undo of an unrelated edit leaves the panel width where the reader put it', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  const page = opened.page
  try {
    const boundary = await page.evaluate((divider: string) => {
      const box = document.querySelector(divider)?.getBoundingClientRect()
      return box === undefined ? null : { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    }, DIVIDER)
    expect(boundary, 'FR-052 draws a boundary to drag').not.toBeNull()
    const grab = boundary as { x: number; y: number }

    const started = await rowPanelWidth(page)
    await page.mouse.move(grab.x, grab.y)
    await page.mouse.down()
    await page.mouse.move(grab.x + WIDEN_BY_PX, grab.y, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(700)
    const widened = await rowPanelWidth(page)
    expect(widened, 'FR-052: dragging the boundary widened the panel').toBeGreaterThan(started)

    await openPanelOnRow(page, 0)
    const named = (await drawnRows(page))[0] as DrawnRow
    expect(named.label, 'the row starts under another name').not.toBe(SHORT_NAME)
    await commitField(page, 'text', SHORT_NAME)
    expect((await drawnRows(page))[0]?.label, 'the unrelated edit landed').toBe(SHORT_NAME)

    await page.mouse.move(BASE_SCREEN.width / 2, BASE_SCREEN.height / 2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(900)

    expect((await drawnRows(page))[0]?.label, 'UN-14: the undo reached the document').toBe(
      named.label,
    )
    expect(await rowPanelWidth(page), 'UN-16 (MUST NOT): the width did not come back').toBe(widened)
  } finally {
    await opened.close()
  }
})

/** @purity pure */
function drawnUnder(rows: readonly DrawnRow[], index: number): DrawnRow[] {
  const parent = rows[index] as DrawnRow
  const under: DrawnRow[] = []
  for (const row of rows.slice(index + 1)) {
    if (row.depth <= parent.depth) break
    under.push(row)
  }
  return under
}

/** @purity pure */
function rowWithAGrandchild(rows: readonly DrawnRow[]): number {
  for (let index = 0; index < rows.length; index += 1) {
    const parent = rows[index] as DrawnRow
    const under = drawnUnder(rows, index)
    if (under.some((row) => row.depth >= parent.depth + 2)) return index
  }
  return -1
}

// WHY: the row is chosen by having a grandchild drawn under it, and that
// choice is asserted first -- a document with no second tier would say nothing.
test('DFC-157: a folded row hides every tier below it, and opens exactly one back', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  const page = opened.page
  try {
    const before = await drawnRows(page)
    const index = rowWithAGrandchild(before)
    expect(index, 'the startup document draws a row with two tiers under it').toBeGreaterThanOrEqual(
      0,
    )
    const parent = before[index] as DrawnRow

    expect(
      await pressEntranceInRow(page, index, FOLD_BELOW_ENTRANCE),
      `the row draws the ${FOLD_BELOW_ENTRANCE} entrance`,
    ).toBe(true)

    const folded = await drawnRows(page)
    const stillThere = folded.findIndex((row) => row.label === parent.label)
    expect(stillThere, 'HR-4 (MUST NOT): the row itself is not hidden').toBeGreaterThanOrEqual(0)
    expect(
      drawnUnder(folded, stillThere),
      'HR-1a (MUST NOT): nothing below a folded row is drawn',
    ).toEqual([])

    expect(
      await pressEntranceInRow(page, stillThere, OPEN_ONE_TIER_ENTRANCE),
      `the row draws the ${OPEN_ONE_TIER_ENTRANCE} entrance`,
    ).toBe(true)

    const openedOnce = await drawnRows(page)
    const nowAt = openedOnce.findIndex((row) => row.label === parent.label)
    const under = drawnUnder(openedOnce, nowAt)
    expect(under.length, 'HR-7: the tier below came back').toBeGreaterThan(0)
    expect(
      under.map((row) => row.depth - parent.depth).filter((step) => step !== 1),
      'HR-1a (MUST): the tiers below it stayed folded, so only one tier is drawn',
    ).toEqual([])
  } finally {
    await opened.close()
  }
})

// WHY: proves the pointer reaches the canvas and a drag places something
// (FR-019), so the DFC-209 case below cannot pass on a page placing nothing.
test('control for DFC-209: with the highlight box armed, a drag on empty ground places one', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  const page = opened.page
  try {
    const spot = await groundOnADrawnRow(page)
    expect(spot, 'a drawn row covers empty ground with room along it').not.toBeNull()
    const at = spot as { x: number; y: number }

    expect(await pressEntrance(page, HIGHLIGHT_BOX_ENTRANCE), 'the entrance is on the screen').toBe(
      true,
    )
    expect(await armingOf(page, HIGHLIGHT_BOX_ENTRANCE), 'AR-6: the entrance stands armed').toBe(
      'true',
    )

    const before = await drawnElementCount(page)
    expect(REACH_PX, 'the drag runs further than S-208, so it is a drag').toBeGreaterThan(
      PRESS_OR_DRAG_PX,
    )
    await page.mouse.move(at.x, at.y)
    await page.mouse.down()
    await page.mouse.move(at.x + REACH_PX, at.y, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(900)

    expect(await drawnElementCount(page), 'FR-019: the drag placed a highlight box').toBeGreaterThan(
      before,
    )
  } finally {
    await opened.close()
  }
})

test('DFC-209: with the highlight box armed, a press that does not travel places nothing', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  const page = opened.page
  try {
    const spot = await groundOnADrawnRow(page)
    expect(spot, 'a drawn row covers empty ground').not.toBeNull()
    const at = spot as { x: number; y: number }

    await pressEntrance(page, HIGHLIGHT_BOX_ENTRANCE)
    expect(await armingOf(page, HIGHLIGHT_BOX_ENTRANCE), 'AR-6: the entrance stands armed').toBe(
      'true',
    )

    const before = await drawnElementCount(page)
    await pressAt(page, at)
    await page.waitForTimeout(900)

    expect(await drawnElementCount(page), 'FR-019 (MUST NOT): a click placed nothing').toBe(before)
  } finally {
    await opened.close()
  }
})

// WHY: CR-341 narrowed FR-019's MUST NOT to the highlight box by name -- the
// comment box places at one point (AR-5) and was never inside that rule.
test('DFC-209: the comment box is outside that MUST NOT -- one press still places one', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  const page = opened.page
  try {
    const spot = await groundOnADrawnRow(page)
    expect(spot, 'a drawn row covers empty ground').not.toBeNull()
    const at = spot as { x: number; y: number }

    await pressEntrance(page, COMMENT_BOX_ENTRANCE)
    expect(await armingOf(page, COMMENT_BOX_ENTRANCE), 'AR-5: the entrance stands armed').toBe(
      'true',
    )

    const before = await drawnElementCount(page)
    await pressAt(page, at)
    await page.waitForTimeout(900)

    expect(
      await drawnElementCount(page),
      'FR-019 / AR-5: a press placed a comment box',
    ).toBeGreaterThan(before)
  } finally {
    await opened.close()
  }
})

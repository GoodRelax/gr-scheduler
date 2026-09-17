// System cases for DFC-318 and DFC-319 (docs/development-records/defects.md).

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { specTable, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const T025: SpecTable = specTable('T-025')
const T028: SpecTable = specTable('T-028')
const T051: SpecTable = specTable('T-051')
const T058: SpecTable = specTable('T-058')
const T103: SpecTable = specTable('T-103')
const T109: SpecTable = specTable('T-109')
const T206: SpecTable = specTable('T-206')

const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

// WHY: anchored on the digits, so asking for HF-1 cannot be answered by
// HF-12, nor HF-12 by HF-120.
/** @purity pure */
function entranceRuledBy(rule: string): string {
  const wanted = new RegExp(`${rule}(?![0-9])`)
  const found = T109.rows.filter((row) => row.cells.some((cell) => wanted.test(cell)))
  if (found.length !== 1) {
    throw new Error(
      `table T-109 has ${found.length} entrances whose rule is ${rule}, and this file needs one`,
    )
  }
  return found[0]?.id ?? ''
}

// see HF-17
const ADD_AT_SHALLOWEST = entranceRuledBy('HF-17')
// see HF-12
const FOLD_EVERY_ROW = entranceRuledBy('HF-12')
// see HF-10
const UNFOLD_EVERY_ROW = entranceRuledBy('HF-10')

// WHY: resolved, not written -- the shell marks a properties-panel field with
// the table T-058 row it edits, so this follows the manuscript if renumbered.
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

// see HF-14
const ROW_NAME_COLUMN = columnRowOf('TaskGroup', 'label')

/** @purity pure */
function wholeRow(table: SpecTable, id: string): string {
  return rowOf(table, id).cells.join(' ')
}

/** @purity pure */
function partNamed(id: string): string {
  const found = /`([^`]+)`/.exec(rowOf(T103, id).cells[0] ?? '')
  if (found === null) throw new Error(`table T-103 row ${id} states no part name this file can read`)
  return found[1] ?? ''
}

// see U-60
const WATERMARK_UNLOCK_PART = partNamed('U-60')

// WHY: taken from U-60 rather than written, so the case follows the row that
// owns the face rather than a copy of its entrance number.
const WATERMARK_ENTRANCE = (() => {
  const found = [...wholeRow(T103, 'U-60').matchAll(/IC-\d+/g)].map((one) => one[0])
  const only = [...new Set(found)]
  if (only.length !== 1) {
    throw new Error(
      `table T-103 row U-60 names ${only.length} entrances (${only.join(', ')}), and this file ` +
        'needs exactly one',
    )
  }
  return only[0] ?? ''
})()

// WHY: given as code-point escapes, not literal characters -- rule 03
// section 5 keeps this tree ASCII, for the words table T-028 row IN-4 names.
const IN_PLACE_EDIT_WORD = String.fromCharCode(0x305d, 0x306e, 0x5834, 0x306e, 0x7de8, 0x96c6)
const OPEN_FACE_WORD = String.fromCharCode(0x958b, 0x3044, 0x3066, 0x3044, 0x308b, 0x9762)
const ELLIPSIS = String.fromCharCode(0x2026)

// WHY: read out of the cell so the order asserted below is the manuscript's,
// not a copy kept in this file.
/** @purity pure */
function escOrderOf(word: string, what: string): number {
  const at = wholeRow(T028, 'IN-4').indexOf(word)
  if (at < 0) {
    throw new Error(`table T-028 row IN-4 no longer names the tier ${what}, so its order is unknown`)
  }
  return at
}

// WHY: the deliverable, not sources or the dev server -- NFR-004 row CN-1
// has dist/ hold one .html file, which tests/nfr/ assembles and judges.
const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')

// WHY: the same handles the neighbouring System files lean on; a change to
// how the shell marks a part breaks these cases, as it should.
const PROPERTIES = '[data-role="Properties Panel"]'

let browser: Browser | null = null

test.beforeAll(async () => {
  if (!existsSync(SHIPPED_BUILD)) {
    throw new Error(
      'the shipped build this file presses is not there; run `npx vite build` first ' +
        '(dist/index.html)',
    )
  }
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  // WHY: this is the hook's own allowance, not an assertion's -- see
  // CLEARING_UP_MS in ./live-app.
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

interface Opened {
  readonly page: Page
  close(): Promise<void>
}

/** @purity non-pure */
async function openTheApp(): Promise<Opened> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({ viewport: BASE_SCREEN })
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

// WHY: a real pointer, not element.click() -- the shell builds its input
// from pointer events, and a synthetic click has reached nothing here before.
/** @purity non-pure */
async function pressEntrance(page: Page, icon: string): Promise<boolean> {
  const at = await page.evaluate((wanted: string) => {
    const entry = document.querySelector(`[data-icon="${wanted}"]`)
    if (entry === null) return null
    const box = entry.getBoundingClientRect()
    if (box.width < 1 || box.height < 1) return null
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, icon)
  if (at === null) return false
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(700)
  return true
}

interface DrawnRow {
  readonly depth: number
  readonly name: string
}

// WHY: names come back cut -- FR-085 ends one that does not fit with an
// ellipsis; see namesTheSameRow.
/** @purity semi-pure-b */
async function drawnRows(page: Page): Promise<DrawnRow[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-depth]')).map((row) => ({
      depth: Number(row.getAttribute('data-depth')),
      name: (row.querySelector('span')?.textContent ?? '').trim(),
    })),
  )
}

/** @purity pure */
function describe(some: readonly DrawnRow[]): string {
  return some.map((one) => `${String(one.depth)}:${one.name}`).join(' | ')
}

// WHY: not a plain equality -- FR-085 ends a name that does not fit with an
// ellipsis, so a drawn name is the whole of it or a head of it plus that mark.
/** @purity pure */
function namesTheSameRow(drawn: string, whole: string): boolean {
  if (drawn === whole) return true
  return drawn.endsWith(ELLIPSIS) && whole.startsWith(drawn.slice(0, -1))
}

/** @purity semi-pure-b */
async function panelState(
  page: Page,
  column: string,
): Promise<{ width: number; hasField: boolean; focusedRow: string | null; value: string | null }> {
  return page.evaluate(
    (asked: { panel: string; column: string }) => {
      const shown = document.querySelector(asked.panel)
      const focused = document.activeElement
      const field = shown?.querySelector(`[data-field-row="${asked.column}"][data-field-kind]`)
      return {
        width: Math.round(shown?.getBoundingClientRect().width ?? 0),
        hasField: field !== null && field !== undefined,
        focusedRow: focused?.getAttribute('data-field-row') ?? null,
        // WHY: FR-006 wraps a text field downwards, so the name field is a textarea since CR-408.
        value:
          field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
            ? field.value
            : null,
      }
    },
    { panel: PROPERTIES, column },
  )
}

// WHY: a wheel over the panel moves nothing while a field of the properties
// panel holds the typing, so every caller releases that field first.
/** @purity non-pure */
async function takeThePanelToTheTop(page: Page): Promise<void> {
  await page.mouse.move(BASE_SCREEN.width / 4, BASE_SCREEN.height / 2)
  for (let turns = 0; turns < 40; turns += 1) await page.mouse.wheel(0, -400)
  await page.waitForTimeout(900)
}

/** @purity semi-pure-b */
async function unlockFaceIsUp(page: Page): Promise<boolean> {
  return page.evaluate(
    (part: string) =>
      Array.from(document.querySelectorAll('[data-role]')).some((marked) =>
        (marked.getAttribute('data-role') ?? '').includes(part),
      ),
    WATERMARK_UNLOCK_PART,
  )
}

/** @purity semi-pure-b */
async function unlockFieldValue(page: Page): Promise<string | null> {
  return page.evaluate((part: string) => {
    const field = document.querySelector(`[data-role*="${part}"] input`)
    return field instanceof HTMLInputElement ? field.value : null
  }, WATERMARK_UNLOCK_PART)
}

/** @purity non-pure */
async function pressTheUnlockField(page: Page): Promise<boolean> {
  const at = await page.evaluate((part: string) => {
    const field = document.querySelector(`[data-role*="${part}"] input`)
    if (field === null) return null
    const box = field.getBoundingClientRect()
    if (box.width < 1 || box.height < 1) return null
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, WATERMARK_UNLOCK_PART)
  if (at === null) return false
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(400)
  return true
}

// WHY: goes red if HF-17, S-211 and U-60 stop cross-referencing each other
// the way the cases below assume.
test('the rows these cases are read from are still the rows that carry them', () => {
  const hf17 = wholeRow(T051, 'HF-17')
  expect(hf17, 'table T-051 row HF-17 still names the setting the fold lives in').toContain('S-211')
  expect(hf17, 'table T-051 row HF-17 still sends the naming to HF-14').toContain('HF-14')

  expect(
    wholeRow(T206, 'S-211'),
    'table T-206 row S-211 still names HF-17 as a way out of the fold',
  ).toContain('HF-17')

  expect(
    wholeRow(T103, 'U-60'),
    'table T-103 row U-60 is still the face FR-020 raises',
  ).toContain('FR-020')

  // WHY: IN-5a is read for its presence only -- it is why "mid-edit" has
  // consequences of its own, which the watermark case's third reading leans on.
  expect(
    T028.rows.map((row) => row.id),
    'table T-028 still carries IN-5a, the row that gives 入力中 its consequences',
  ).toContain('IN-5a')

  expect(
    [ADD_AT_SHALLOWEST, FOLD_EVERY_ROW, UNFOLD_EVERY_ROW, WATERMARK_ENTRANCE],
    'the four entrances these cases press are four different rows of table T-109',
  ).toHaveLength(new Set([ADD_AT_SHALLOWEST, FOLD_EVERY_ROW, UNFOLD_EVERY_ROW, WATERMARK_ENTRANCE]).size)
})

// WHY: goes red if HF-17 adds a row and draws nothing, sends the field
// alone, or leaves the shallowest tier's fold (S-211) closed.
test(`HF-17: with no row drawn at all, ${ADD_AT_SHALLOWEST} draws the row it raises`, async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp()
  const page = opened.page
  try {
    expect(
      (await drawnRows(page)).length,
      'the build opens with rows drawn, so folding them away is a change',
    ).toBeGreaterThan(0)

    expect(
      await pressEntrance(page, FOLD_EVERY_ROW),
      `the entrance ${FOLD_EVERY_ROW} is on the screen`,
    ).toBe(true)
    const folded = await drawnRows(page)
    expect(
      folded.length,
      `HF-12: every row is folded, the shallowest tier too, so none is drawn; saw ` +
        `[${describe(folded)}]`,
    ).toBe(0)

    expect(
      await pressEntrance(page, ADD_AT_SHALLOWEST),
      `the entrance ${ADD_AT_SHALLOWEST} is on the screen`,
    ).toBe(true)

    const after = await drawnRows(page)
    expect(
      after.length,
      'HF-17 (MUST): the row that was raised is drawn, and not left in the document alone',
    ).toBeGreaterThan(0)

    const panel = await panelState(page, ROW_NAME_COLUMN)
    expect(panel.width, 'HF-14: the properties panel is put up').toBeGreaterThan(0)
    expect(panel.hasField, `HF-14: the panel carries the ${ROW_NAME_COLUMN} field`).toBe(true)
    expect(panel.focusedRow, `HF-14: the naming is asked for in ${ROW_NAME_COLUMN}`).toBe(
      ROW_NAME_COLUMN,
    )

    const named = panel.value ?? ''
    expect(
      after.some((row) => namesTheSameRow(row.name, named)),
      `HF-17 (MUST NOT): the field is not sent on its own -- the row it names is drawn. ` +
        `The field holds ${JSON.stringify(named)}; the panel drew [${describe(after)}]`,
    ).toBe(true)
  } finally {
    await opened.close()
  }
})

// WHY: goes red if adding a row opens every tier of S-211, not the one tier
// HF-17 (MUST NOT) allows. The Esc that follows is not part of the judgement.
test(`HF-17 (MUST NOT): ${ADD_AT_SHALLOWEST} opens one tier of the fold, not every tier`, async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp()
  const page = opened.page
  try {
    const atOpening = await drawnRows(page)
    const shallowest = Math.min(...atOpening.map((row) => row.depth))
    expect(
      atOpening.some((row) => row.depth > shallowest),
      `THE GUARD: this document has rows below its shallowest tier, so "only the shallowest" ` +
        `is a restriction; saw [${describe(atOpening)}]`,
    ).toBe(true)

    await pressEntrance(page, FOLD_EVERY_ROW)
    expect((await drawnRows(page)).length, 'HF-12: nothing is drawn now').toBe(0)
    await pressEntrance(page, ADD_AT_SHALLOWEST)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(600)
    await takeThePanelToTheTop(page)

    const after = await drawnRows(page)
    expect(after.length, 'the panel is drawing rows again').toBeGreaterThan(0)
    expect(
      after.filter((row) => row.depth !== shallowest),
      `HF-17 (MUST NOT): one tier was opened and no more, so nothing below the shallowest ` +
        `tier (${String(shallowest)}) is drawn; saw [${describe(after)}]`,
    ).toEqual([])
  } finally {
    await opened.close()
  }
})

// WHY: the control for the case above -- from the same folded state, HF-10
// does open every tier, or the case above could pass on a panel that cannot draw a deep row.
test(`⭐ THE CONTROL: from the same folded state, ${UNFOLD_EVERY_ROW} opens every tier`, async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp()
  const page = opened.page
  try {
    const atOpening = await drawnRows(page)
    const shallowest = Math.min(...atOpening.map((row) => row.depth))

    await pressEntrance(page, FOLD_EVERY_ROW)
    expect((await drawnRows(page)).length, 'HF-12: nothing is drawn now').toBe(0)

    await pressEntrance(page, UNFOLD_EVERY_ROW)
    const after = await drawnRows(page)
    expect(
      after.some((row) => row.depth > shallowest),
      `HF-10 opens every tier, so rows below the shallowest one (${String(shallowest)}) are ` +
        `drawn; saw [${describe(after)}]`,
    ).toBe(true)
  } finally {
    await opened.close()
  }
})

// WHY: goes red if the first Esc in the unlock field takes the typing back
// but keeps hold of the field, so a later character still lands there.
test('IN-4: one Esc in the watermark unlock field takes the typing back AND lets the field go', async () => {
  test.setTimeout(180_000)
  expect(
    escOrderOf(IN_PLACE_EDIT_WORD, 'an edit made where it stands'),
    'table T-028 row IN-4 still puts an edit made where it stands ahead of an open face',
  ).toBeLessThan(escOrderOf(OPEN_FACE_WORD, 'an open face'))

  const opened = await openTheApp()
  const page = opened.page
  try {
    expect(
      await pressEntrance(page, WATERMARK_ENTRANCE),
      `the entrance ${WATERMARK_ENTRANCE} is on the screen`,
    ).toBe(true)
    expect(await unlockFaceIsUp(page), `FR-020: ${WATERMARK_ENTRANCE} put the face up`).toBe(true)

    const before = await unlockFieldValue(page)
    expect(before, `U-60 carries a field to type the answer into`).not.toBeNull()

    expect(await pressTheUnlockField(page), 'the field can be reached with a pointer').toBe(true)
    await page.keyboard.type('abc')
    await page.waitForTimeout(400)
    expect(await unlockFieldValue(page), 'the typing reached the field, so there is an edit').not.toBe(
      before,
    )

    await page.keyboard.press('Escape')
    await page.waitForTimeout(900)
    expect(
      await unlockFieldValue(page),
      'IN-4 (MUST): the first Esc took the typing back to the value before the editing began',
    ).toBe(before)
    expect(
      await unlockFaceIsUp(page),
      'IN-4: the first Esc consumed ONE tier -- the edit -- so the face is still up',
    ).toBe(true)

    await page.keyboard.type('z')
    await page.waitForTimeout(600)
    expect(
      await unlockFieldValue(page),
      'IN-4 / IN-5a: the edit tier was consumed, so the field is not taking the typing any ' +
        'more -- one Esc let it go, and it did not take a second one',
    ).toBe(before)
    expect(
      await unlockFaceIsUp(page),
      'nothing was pressed that could close the face, so it is still up',
    ).toBe(true)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(900)
    expect(
      await unlockFaceIsUp(page),
      'IN-4: the next Esc consumed the next tier down, the face itself',
    ).toBe(false)
  } finally {
    await opened.close()
  }
})

// WHY: the control for the case above -- with nothing typed there is no
// edit to consume, so the FIRST Esc reaches the face directly.
test('⭐ THE CONTROL: with nothing typed, the first Esc reaches the face itself', async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp()
  const page = opened.page
  try {
    await pressEntrance(page, WATERMARK_ENTRANCE)
    expect(await unlockFaceIsUp(page), `FR-020: ${WATERMARK_ENTRANCE} put the face up`).toBe(true)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(900)
    expect(
      await unlockFaceIsUp(page),
      'IN-4: with no edit standing, the first Esc consumed the face',
    ).toBe(false)
  } finally {
    await opened.close()
  }
})

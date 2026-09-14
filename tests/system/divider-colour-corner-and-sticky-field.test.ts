// System cases for DFC-277, DFC-314 and DFC-349 (docs/development-records/defects.md).

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { specTable, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const T016: SpecTable = specTable('T-016')
const T023B: SpecTable = specTable('T-023b')
const T025: SpecTable = specTable('T-025')
const T109: SpecTable = specTable('T-109')
const T206: SpecTable = specTable('T-206')
const T217: SpecTable = specTable('T-217')
const T236: SpecTable = specTable('T-236')

/** @purity pure */
function numberIn(cell: string, what: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) {
    throw new Error(`${what} states no number this file can read: ${JSON.stringify(cell)}`)
  }
  return value
}

// WHY: by position, not heading -- these headings are Japanese (rule 03
// section 5 keeps this tree ASCII), so a changed column fails loudly here.
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

const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

// WHY: table T-217 holds six cells after the row ID -- key, type, default,
// floor, ceiling, meaning -- with the default in the third.
const T217_COLUMNS = 6
const T217_DEFAULT = 2

// see S-132
const CORNER_RADIUS_PX = numberIn(
  cellOf(T217, 'S-132', T217_DEFAULT, T217_COLUMNS),
  'table T-217 row S-132',
)

// WHY: table T-206 holds three cells after the row ID -- what the value is,
// the default, and the note.
const T206_COLUMNS = 3
const T206_DEFAULT = 1

/** @purity pure */
function settingOf(id: string): number {
  return numberIn(cellOf(T206, id, T206_DEFAULT, T206_COLUMNS), `table T-206 row ${id}`)
}

// see S-208
const PRESS_OR_DRAG_PX = settingOf('S-208')

// see S-193
const MULTILINE_ROWS = settingOf('S-193')

// WHY: table T-236 holds five cells after the row ID -- what the colour is,
// the light theme, the dark theme, whether it follows the hue, and the note.
const T236_COLUMNS = 5
const T236_LIGHT = 1
const T236_DARK = 2
const T236_FOLLOWS_HUE = 3

const FOLLOWS_THE_HUE = String.fromCharCode(0x25cb)

// WHY: the row writes its hue as a letter and the other two parts as
// percentages, so only those two are taken; the hue comes from AT-19.
/** @purity pure */
function ruleColourParts(dark: boolean): { saturation: number; lightness: number } {
  const said = cellOf(T236, 'S-149', dark ? T236_DARK : T236_LIGHT, T236_COLUMNS)
  const found = /(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/.exec(said)
  if (found === null) {
    throw new Error(
      `table T-236 row S-149 states no saturation and lightness this file can read: ` +
        JSON.stringify(said),
    )
  }
  return { saturation: Number(found[1]), lightness: Number(found[2]) }
}

// WHY: a guard, not an assertion of its own -- the case below resolves the
// colour at the document's hue, which is only right while this mark holds.
const RULE_COLOUR_FOLLOWS_THE_HUE = cellOf(
  T236,
  'S-149',
  T236_FOLLOWS_HUE,
  T236_COLUMNS,
).includes(FOLLOWS_THE_HUE)

// WHY: table T-016 holds five cells after the row ID -- the column, the
// input form, what it belongs to, the note, and the MSPDI counterpart.
const T016_COLUMNS = 5
const T016_FORM = 1
const T016_SUBJECT = 2

const MULTILINE_FORM = String.fromCharCode(0x8907, 0x6570, 0x884c)

// WHY: not written out -- FR-006 forbids enumerating these rows in prose, so
// the roster is taken from the table; a row added for a comment box adds itself.
/** @purity pure */
function rowsBelongingTo(entity: string): readonly string[] {
  const found = T016.rows.filter((row) => {
    if (row.cells.length !== T016_COLUMNS) {
      throw new Error(
        `table T-016 row ${row.id} has ${row.cells.length} cells after the row ID, not the ` +
          `${T016_COLUMNS} this file reads by position`,
      )
    }
    return (row.cells[T016_SUBJECT] ?? '').includes(entity)
  })
  if (found.length === 0) {
    throw new Error(`table T-016 has no row whose subject is ${entity}`)
  }
  return found.map((row) => row.id)
}

const COMMENT_BOX_ENTITY = 'CommentBox'

const COMMENT_BOX_ROWS = rowsBelongingTo(COMMENT_BOX_ENTITY)

/** @purity pure */
function isMultiline(id: string): boolean {
  return cellOf(T016, id, T016_FORM, T016_COLUMNS).includes(MULTILINE_FORM)
}

// WHY: given as code-point escapes, not literal characters -- rule 03
// section 5 keeps this tree ASCII, for the two words table T-023b names.
const HIGHLIGHT_BOX_WORD = String.fromCharCode(
  0x30cf, 0x30a4, 0x30e9, 0x30a4, 0x30c8, 0x30dc, 0x30c3, 0x30af, 0x30b9,
)
const COMMENT_BOX_WORD = String.fromCharCode(
  0x30b3, 0x30e1, 0x30f3, 0x30c8, 0x30dc, 0x30c3, 0x30af, 0x30b9,
)

// WHY: not found by the word alone -- table T-109 prints the comment box's
// name in two entrances' purpose, so the holding is looked up first.
/** @purity pure */
function entranceArming(holding: string): string {
  const armed = T023B.rows.filter((row) => (row.cells[0] ?? '').includes(holding))
  if (armed.length !== 1) {
    throw new Error(`table T-023b has ${armed.length} holdings named ${JSON.stringify(holding)}`)
  }
  const wanted = new RegExp(`${armed[0]?.id ?? ''}(?![0-9])`)
  const found = T109.rows.filter((row) => wanted.test(row.cells[row.cells.length - 1] ?? ''))
  if (found.length !== 1) {
    throw new Error(
      `table T-109 has ${found.length} entrances arming ${armed[0]?.id ?? ''}, and this file ` +
        'needs exactly one',
    )
  }
  return found[0]?.id ?? ''
}

const HIGHLIGHT_BOX_ENTRANCE = entranceArming(HIGHLIGHT_BOX_WORD)
const COMMENT_BOX_ENTRANCE = entranceArming(COMMENT_BOX_WORD)

// see FR-065
const AGENT_API_ENTRANCE = 'IC-20'
// see FR-072
const SETTINGS_ENTRANCE = 'IC-17'

// see AM-3
const AM_3 = 'readDocument'

// WHY: only the generated block is read, between the markers the generator
// and check-generated-constants.py use -- nothing a person wrote is read.
/** @purity semi-pure-a */
function generatedNumber(file: string, constant: string, rowId: string): number {
  const said = readFileSync(join(process.cwd(), file), 'utf8')
  const blocks = [...said.matchAll(/\/\/ <generated[^\n]*\n([\s\S]*?)\/\/ <\/generated>/g)].map(
    (one) => one[1] ?? '',
  )
  const holding = blocks.filter((block) => block.includes(`export const ${constant}`))
  if (holding.length !== 1) {
    throw new Error(
      `${file} has ${holding.length} generated blocks declaring ${constant}, and this file ` +
        'needs exactly one -- the road DFC-314 is about is not there',
    )
  }
  const found = new RegExp(`'${rowId}':\\s*(-?\\d+(?:\\.\\d+)?)`).exec(holding[0] ?? '')
  if (found === null) {
    throw new Error(`${constant} carries no entry for ${rowId}`)
  }
  return Number(found[1])
}

const ANNOTATION_DEFAULTS_FILE = join('src', 'use-case', 'edit-document', 'edit-annotation.ts')

const CANVAS = '[data-role="Schedule Canvas"] svg'
const CANVAS_PART = '[data-role="Schedule Canvas"]'
const ROW_PANEL = '[data-role="Row Title Panel"]'
const PROPERTIES = '[data-role="Properties Panel"]'
const DIVIDER = '[data-role="Panel Divider"]'

let browser: Browser | null = null

test.beforeAll(async () => {
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

// WHY: not a fixed pause after the load -- the shell may draw twice on the
// way up, so this waits for two identical readings of the drawing.
/** @purity non-pure */
async function openTheApp(baseURL: string | undefined): Promise<Opened> {
  if (baseURL === undefined) {
    throw new Error('playwright.config.ts declares no baseURL for the running application')
  }
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({ baseURL, viewport: BASE_SCREEN })
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
  await page.waitForTimeout(500)
  return true
}

// see FR-029
/** @purity semi-pure-b */
async function armingOf(page: Page, icon: string): Promise<string | null> {
  return page.evaluate(
    (wanted: string) =>
      document.querySelector(`[data-icon="${wanted}"]`)?.getAttribute('data-armed') ?? null,
    icon,
  )
}

/** @purity non-pure */
async function arm(page: Page, entrance: string): Promise<void> {
  expect(await pressEntrance(page, entrance), `the entrance ${entrance} is on the screen`).toBe(true)
  expect(await armingOf(page, entrance), `${entrance} stands armed`).toBe('true')
}

// see IN-2
/** @purity non-pure */
async function cursorAt(page: Page, x: number, y: number): Promise<string> {
  await page.mouse.move(x, y)
  return page.evaluate((part: string) => {
    const surface = document.querySelector(part)
    return surface instanceof HTMLElement ? surface.style.cursor : ''
  }, CANVAS_PART)
}

const REACH_PX = 160

// WHY: ground below the last row is no good -- FR-019 holds a position by a
// date and a row identifier, and ground no row covers points at no row.
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

interface Drawn {
  readonly tag: string
  readonly attrs: string
  readonly rx: number | null
}

// WHY: the corner radius is read from the resolved geometry (rx of an SVG
// rectangle), not the attribute text, so a style-based value is still seen.
/** @purity semi-pure-b */
async function drawnElements(page: Page): Promise<Drawn[]> {
  return page.evaluate((canvas: string) => {
    const svg = document.querySelector(canvas)
    if (svg === null) return []
    return Array.from(svg.querySelectorAll('*')).map((element) => {
      const rect = element as SVGRectElement
      const held =
        typeof (rect as { rx?: unknown }).rx === 'object' && rect.rx !== null
          ? rect.rx.baseVal.value
          : null
      return {
        tag: element.tagName,
        attrs: Array.from(element.attributes)
          .map((one) => `${one.name}=${one.value}`)
          .join(' ')
          .slice(0, 400),
        rx: typeof held === 'number' && Number.isFinite(held) ? held : null,
      }
    })
  }, CANVAS)
}

// WHY: by multiset, not set -- a placement drawing one more of an existing
// shape would be invisible to a plain set difference.
/** @purity pure */
function addedBy(before: readonly Drawn[], after: readonly Drawn[]): Drawn[] {
  const seen = new Map<string, number>()
  for (const one of before) {
    const key = `${one.tag}|${one.attrs}`
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }
  const out: Drawn[] = []
  for (const one of after) {
    const key = `${one.tag}|${one.attrs}`
    const left = seen.get(key) ?? 0
    if (left > 0) seen.set(key, left - 1)
    else out.push(one)
  }
  return out
}

/** @purity pure */
function describe(some: readonly Drawn[]): string {
  return some.map((one) => `${one.tag}[rx=${one.rx ?? '-'}] ${one.attrs}`).join('\n  ')
}

/** @purity non-pure */
async function openTheAgentApi(page: Page): Promise<void> {
  expect(
    await pressEntrance(page, AGENT_API_ENTRANCE),
    `the entrance ${AGENT_API_ENTRANCE} that FR-065 has open the Agent API is on the screen`,
  ).toBe(true)
  expect(
    await page.evaluate(
      () => typeof (window as unknown as Record<string, unknown>).grSchedulerAgentApi,
    ),
    `pressing ${AGENT_API_ENTRANCE} published the Agent API`,
  ).toBe('object')
}

// WHY: goes red if the tree's corner radius stops matching S-132 -- this
// judges the generated road, not the browser; the drawn rx is the case below.
test(`S-132: the tree carries the corner radius table T-217 states (${CORNER_RADIUS_PX})`, () => {
  expect(
    generatedNumber(ANNOTATION_DEFAULTS_FILE, 'NOT_STORED_ANNOTATION_SIZES', 'S-132'),
    'S-132 (table T-217): the generated constant holds what the manuscript states. A ' +
      'difference here means `npm run gen` has not been run since the manuscript moved, or ' +
      'that the number was typed into the tree again',
  ).toBe(CORNER_RADIUS_PX)
})

// WHY: goes red if a placed highlight box's corner radius is not S-132 at
// every zoom (FR-019); pressed on the dev server since this checkout has no build.
test(`S-132: a placed highlight box is drawn with a corner radius of ${CORNER_RADIUS_PX}`, async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const opened = await openTheApp(baseURL)
  const page = opened.page
  try {
    const spot = await groundOnADrawnRow(page)
    expect(spot, 'a drawn row covers empty ground with room along it').not.toBeNull()
    const at = spot as { x: number; y: number }

    await arm(page, HIGHLIGHT_BOX_ENTRANCE)

    const before = await drawnElements(page)
    expect(REACH_PX, 'the drag runs further than S-208, so it is a drag').toBeGreaterThan(
      PRESS_OR_DRAG_PX,
    )
    await page.mouse.move(at.x, at.y)
    await page.mouse.down()
    await page.mouse.move(at.x + REACH_PX, at.y, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(900)

    const added = addedBy(before, await drawnElements(page))
    expect(added.length, 'FR-019: the drag placed a highlight box').toBeGreaterThan(0)

    const rounded = added.filter((one) => one.rx !== null)
    expect(
      rounded.length,
      'the placement drew something that carries a corner radius; what it drew was:\n  ' +
        describe(added),
    ).toBeGreaterThan(0)
    expect(
      rounded.map((one) => one.rx),
      `S-132 (table T-217): every corner the placement drew is ${CORNER_RADIUS_PX}px round; ` +
        `what the drag drew was:\n  ${describe(added)}`,
    ).toEqual(rounded.map(() => CORNER_RADIUS_PX))
  } finally {
    await opened.close()
  }
})

interface Painted {
  readonly background: string
  readonly html: string
}

// WHY: found by geometry, not a name -- the line inside the band carries no
// mark of its own, so it is looked for where S-134 says the band sits.
/** @purity semi-pure-b */
async function dividerLines(page: Page): Promise<Painted[]> {
  return page.evaluate((divider: string) => {
    const out: { background: string; html: string }[] = []
    for (const band of Array.from(document.querySelectorAll(divider))) {
      const over = band.getBoundingClientRect()
      for (const one of Array.from(document.querySelectorAll('*'))) {
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
        out.push({ background, html: one.outerHTML.slice(0, 300) })
      }
    }
    return out
  }, DIVIDER)
}

// WHY: goes red if the line's colour is not S-149 at the document's own hue
// (AT-19); resolved by the browser itself, so no rounding rule can disagree.
test('S-149: the screen paints the Panel Divider line with the colour table T-236 states', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  expect(
    RULE_COLOUR_FOLLOWS_THE_HUE,
    'table T-236 row S-149 still says its colour follows the document hue, which is what makes ' +
      "the document's own AT-19 the right hue to resolve it at",
  ).toBe(true)

  const opened = await openTheApp(baseURL)
  const page = opened.page
  try {
    await openTheAgentApi(page)
    const document_ = await page.evaluate((member: string) => {
      const api = (window as unknown as Record<string, Record<string, unknown> | undefined>)
        .grSchedulerAgentApi
      const read = api?.[member]
      if (typeof read !== 'function') return null
      const doc = (read as () => unknown).call(api) as {
        schedule?: { project?: { themeHue?: unknown } }
        documentSettings?: { themePreference?: unknown }
      }
      return {
        hue: doc.schedule?.project?.themeHue,
        preference: doc.documentSettings?.themePreference,
      }
    }, AM_3)

    expect(
      typeof document_?.hue,
      'AM-3 handed back the hue DR-5 of table T-052 (MUST) puts on the schedule group\'s ' +
        `project; it handed ${JSON.stringify(document_)}`,
    ).toBe('number')
    const dark = document_?.preference === 'dark'
    const parts = ruleColourParts(dark)
    const said = `hsl(${String(document_?.hue)} ${String(parts.saturation)}% ${String(parts.lightness)}%)`

    const wanted = await page.evaluate((colour: string) => {
      const probe = window.document.createElement('div')
      window.document.body.appendChild(probe)
      probe.style.color = colour
      const resolved = window.getComputedStyle(probe).color
      probe.remove()
      return resolved
    }, said)

    const lines = await dividerLines(page)
    expect(
      lines.length,
      'every Panel Divider band of table T-076 has a line painted inside it; the bands are ' +
        `sized by S-134 and this case found ${lines.length} painted lines`,
    ).toBeGreaterThan(0)
    expect(
      lines.map((one) => one.background),
      `S-149 (table T-236): every Panel Divider line is painted ${said} (${wanted}) -- the ` +
        `document's own hue with the manuscript's saturation and lightness. What was painted ` +
        `was:\n  ${lines.map((one) => `${one.background} ${one.html}`).join('\n  ')}`,
    ).toEqual(lines.map(() => wanted))
  } finally {
    await opened.close()
  }
})

interface Field {
  readonly row: string
  readonly editable: string | null
  readonly controls: readonly {
    readonly tag: string
    readonly multiline: boolean
    readonly linesShown: number | null
  }[]
}

// WHY: a control is [data-field-kind] inside [data-field-row]; multiline is
// asked of the element (textarea or editable box), not the tree's own word.
/** @purity semi-pure-b */
async function panelFields(page: Page): Promise<Field[]> {
  return page.evaluate((panel: string) => {
    const shown = document.querySelector(panel)
    if (shown === null) return []
    const out: Field[] = []
    for (const field of Array.from(shown.querySelectorAll('[data-field-row]'))) {
      if (field.hasAttribute('data-field-kind')) continue
      out.push({
        row: field.getAttribute('data-field-row') ?? '',
        editable: field.getAttribute('data-editable'),
        controls: Array.from(field.querySelectorAll('[data-field-kind]')).map((control) => {
          const lines = control.getAttribute('rows')
          return {
            tag: control.tagName,
            multiline:
              control.tagName === 'TEXTAREA' || (control as HTMLElement).isContentEditable,
            linesShown: lines === null ? null : Number(lines),
          }
        }),
      })
    }
    return out
  }, PROPERTIES) as Promise<Field[]>
}

// WHY: goes red if the comment box's body field has no control or the wrong
// form; reached via FR-072's IC-17 toggle, not the MK-13 double click route.
test(`PR-21 / FR-006: the comment box's field carries the control table T-016 names`, async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const opened = await openTheApp(baseURL)
  const page = opened.page
  try {
    const spot = await groundOnADrawnRow(page)
    expect(spot, 'a drawn row covers empty ground').not.toBeNull()
    const at = spot as { x: number; y: number }

    await arm(page, COMMENT_BOX_ENTRANCE)
    await page.mouse.move(at.x, at.y)
    await page.mouse.down()
    await page.mouse.up()
    await page.waitForTimeout(900)

    // WHY: the arming stays up (table T-023b's closing rule), so it is put
    // down before the box is picked -- else the press places a second box.
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    await page.mouse.move(at.x, at.y)
    await page.mouse.down()
    await page.mouse.up()
    await page.waitForTimeout(700)

    expect(
      await pressEntrance(page, SETTINGS_ENTRANCE),
      `the entrance ${SETTINGS_ENTRANCE} is on the screen`,
    ).toBe(true)
    expect(
      await pressEntrance(page, SETTINGS_ENTRANCE),
      `FR-072: a second press on ${SETTINGS_ENTRANCE} goes back to the last selection`,
    ).toBe(true)
    await page.waitForTimeout(700)

    const fields = await panelFields(page)
    const shown = fields.map((one) => one.row)
    expect(
      shown,
      `FR-006: the panel shows the rows of table T-016 whose subject is ${COMMENT_BOX_ENTITY} ` +
        'and no other; what it showed was ' +
        JSON.stringify(fields),
    ).toEqual([...COMMENT_BOX_ROWS])

    for (const row of COMMENT_BOX_ROWS) {
      const field = fields.find((one) => one.row === row)
      expect(field, `the panel drew a field for table T-016 row ${row}`).toBeDefined()
      const drawn = field as Field
      expect(
        drawn.controls.length,
        `FR-006 / DFC-349: table T-016 row ${row} marks no read-only, so its field carries a ` +
          `control; what it carried was ${JSON.stringify(drawn)}`,
      ).toBeGreaterThan(0)

      if (!isMultiline(row)) continue
      expect(
        drawn.controls.map((one) => one.multiline),
        `FR-006: table T-016 marks row ${row} as a multi-line field, so its control takes more ` +
          `than one line; what it carried was ${JSON.stringify(drawn.controls)}`,
      ).toEqual(drawn.controls.map(() => true))
      expect(
        drawn.controls.map((one) => one.linesShown),
        `S-193 (table T-206): a multi-line field of FR-006 shows ${MULTILINE_ROWS} lines; row ` +
          `${row} showed ${JSON.stringify(drawn.controls.map((one) => one.linesShown))}`,
      ).toEqual(drawn.controls.map(() => MULTILINE_ROWS))
    }
  } finally {
    await opened.close()
  }
})

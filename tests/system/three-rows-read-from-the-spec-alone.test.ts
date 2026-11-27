// System tests: rows S-132, SK-3 and IN-4, read from the spec alone and pressed on the shipped build.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { specTable, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const T023B: SpecTable = specTable('T-023b')
const T023C: SpecTable = specTable('T-023c')
const T025: SpecTable = specTable('T-025')
const T028: SpecTable = specTable('T-028')
const T036: SpecTable = specTable('T-036')
const T109: SpecTable = specTable('T-109')
const T206: SpecTable = specTable('T-206')
const T217: SpecTable = specTable('T-217')

/** @purity pure */
function numberIn(cell: string, what: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) {
    throw new Error(`${what} states no number this file can read: ${JSON.stringify(cell)}`)
  }
  return value
}

// Why: by position, not heading: the headings are Japanese and this tree is ASCII; a table
// that gains or loses a column fails here rather than reading the wrong cell.
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

// Spec: T-217
const T217_COLUMNS = 6
const T217_DEFAULT = 2

// Spec: S-132, FR-019
const CORNER_RADIUS_PX = numberIn(
  cellOf(T217, 'S-132', T217_DEFAULT, T217_COLUMNS),
  'table T-217 row S-132',
)

// Spec: T-206
const T206_COLUMNS = 3
const T206_DEFAULT = 1

// Spec: S-208, FR-019
const PRESS_OR_DRAG_PX = numberIn(
  cellOf(T206, 'S-208', T206_DEFAULT, T206_COLUMNS),
  'table T-206 row S-208',
)

// Spec: T-036
const T036_COLUMNS = 4
const T036_ASSIGNMENT = 1

// Why: the assignment column marks each key on its own and joins them with a
// fullwidth plus, so the first mark alone reads Ctrl and selects nothing.
const T036_ALTERNATIVE = /[\uFF0F/]/
const T036_KEY_MARK = /`([^`]+)`/g

// Why: not written out here: the assignment column is the one home of the spelling, so the
// cases press whatever that cell names.
/** @purity pure */
function chordsOf(id: string): readonly string[] {
  const said = cellOf(T036, id, T036_ASSIGNMENT, T036_COLUMNS)
  const found = said
    .split(T036_ALTERNATIVE)
    .map((one) => [...one.matchAll(T036_KEY_MARK)].map((mark) => (mark[1] ?? '').trim()))
    .filter((keys) => keys.length > 0)
    .map((keys) => asDriven(keys.join('+')))
  if (found.length === 0) {
    throw new Error(`table T-036 row ${id} names no key this file can read: ${JSON.stringify(said)}`)
  }
  return found
}

const SK3_KEYS = chordsOf('SK-3')

// Summary: asDriven maps the manuscript's key spelling (Ctrl) to the driver's (Control) and decides no assignment.
/** @purity pure */
function asDriven(spelling: string): string {
  return spelling
    .replace(/\s*\+\s*/g, '+')
    .split('+')
    .map((part) => (part === 'Ctrl' ? 'Control' : part))
    .join('+')
}

// Spec: SK-2, SL-1
const SK2_KEY = ((): string => {
  const found = chordsOf('SK-2')[0]
  if (found === undefined) throw new Error('table T-036 row SK-2 names no key this file can read')
  return found
})()

// Spec: IC-74, HF-10
// Why: anchored so that HF-1 cannot be found by asking for HF-10.
const UNFOLD_ALL_ENTRANCE = (() => {
  const wanted = /HF-10(?![0-9])/
  const found = T109.rows.filter((row) => row.cells.some((cell) => wanted.test(cell)))
  if (found.length !== 1) {
    throw new Error(
      `table T-109 has ${found.length} entrances whose rule is HF-10, and this file needs one`,
    )
  }
  return found[0]?.id ?? ''
})()

// Spec: IC-20, FR-065
// Why: anchored so that a longer requirement number cannot answer for this one.
const AGENT_API_ENTRANCE = (() => {
  const wanted = /FR-065(?![0-9])/
  const found = T109.rows.filter((row) => row.cells.some((cell) => wanted.test(cell)))
  if (found.length !== 1) {
    throw new Error(
      `table T-109 has ${found.length} entrances governed by FR-065, and this file needs one`,
    )
  }
  return found[0]?.id ?? ''
})()

// Spec: SK-13, S-99g
const SK13_KEY = (() => {
  const found = /`([^`]+)`/.exec(cellOf(T036, 'SK-13', 1, T036_COLUMNS))
  if (found === null) throw new Error('table T-036 row SK-13 names no key this file can read')
  return asDriven(found[1] ?? '')
})()

// Why: the two words of the T-023b holdings are built from code points, since this tree is ASCII.
const HIGHLIGHT_BOX_WORD = String.fromCharCode(
  0x30cf, 0x30a4, 0x30e9, 0x30a4, 0x30c8, 0x30dc, 0x30c3, 0x30af, 0x30b9,
)
const COMMENT_BOX_WORD = String.fromCharCode(
  0x30b3, 0x30e1, 0x30f3, 0x30c8, 0x30dc, 0x30c3, 0x30af, 0x30b9,
)

// Why: not found by the word alone: T-109 prints the comment box's name in two entrances, so
// the holding is looked up in T-023b first and the entrance by its AR row ID.
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

// Spec: IC-36, AR-6
const HIGHLIGHT_BOX_ENTRANCE = entranceArming(HIGHLIGHT_BOX_WORD)
// Spec: IC-35, AR-5
const COMMENT_BOX_ENTRANCE = entranceArming(COMMENT_BOX_WORD)

// Spec: SL-1
// Why: a guard, not an assertion: the third SK-3 case judges this sentence; matched by code
// point and paired with TaskGroup so the clause, not the word alone, is found.
const TASK_GROUP_IS_NOT_A_TARGET = (() => {
  const said = rowOf(T023C, 'SL-1').cells.join(' ')
  const opening = String.fromCharCode(0x30bf, 0x30b9, 0x30af, 0x30b0, 0x30eb, 0x30fc, 0x30d7, 0xff08)
  return said.includes(opening) && said.includes('TaskGroup')
})()

// Spec: IN-4
// Why: read out of the cell, so the order asserted below is the manuscript's, not a copy.
const ESC_TIERS: readonly { readonly key: string; readonly word: string }[] = [
  { key: 'notice', word: String.fromCharCode(0x51fa, 0x3066, 0x3044, 0x308b, 0x901a, 0x77e5) },
  { key: 'face', word: String.fromCharCode(0x958b, 0x3044, 0x3066, 0x3044, 0x308b, 0x9762) },
  { key: 'holding', word: String.fromCharCode(0x69cb, 0x3048) },
]

/** @purity pure */
function escOrderOf(key: string): number {
  const said = rowOf(T028, 'IN-4').cells.join(' ')
  const tier = ESC_TIERS.find((one) => one.key === key)
  if (tier === undefined) throw new Error(`no tier named ${key}`)
  const at = said.indexOf(tier.word)
  if (at < 0) {
    throw new Error(`table T-028 row IN-4 no longer names the tier ${key}, so its order is unknown`)
  }
  return at
}

// Spec: NFR-004, CN-1
// Why: the deliverable, not the sources nor the dev server; tests/nfr/ assembles and judges
// it, and this file only presses it.
const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')

// Why: the same handles the neighbouring System files use: the spec does not say how a part
// is marked, and the shell writes the part's glossary name.
const CANVAS = '[data-role="Schedule Canvas"] svg'
const CANVAS_PART = '[data-role="Schedule Canvas"]'
const TASK_GROUP_PANEL_BOX = '[data-role="Task Group Panel"]'
const HELP = '[data-role="Help Modal"]'

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
  // Why: the hook's own allowance, not an assertion's: closing the browser can pass the hook's
  // 30 s default; CLEARING_UP_MS of ./live-app carries the reason.
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

interface Opened {
  readonly page: Page
  close(): Promise<void>
}

// Spec: BO-1
// Why: not a fixed pause: the page stays invisible until the size settles and may draw twice
// on the way up, so two identical readings of the drawing are awaited.
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

// Why: a real pointer, not element.click(): the shell builds its input from pointer events.
/** @purity non-pure */
async function pressAt(page: Page, at: { x: number; y: number }): Promise<void> {
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
}

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
  await pressAt(page, at)
  await page.waitForTimeout(500)
  return true
}

// Spec: FR-029
/** @purity semi-pure-mutable */
async function armingOf(page: Page, icon: string): Promise<string | null> {
  return page.evaluate(
    (wanted: string) =>
      document.querySelector(`[data-icon="${wanted}"]`)?.getAttribute('data-armed') ?? null,
    icon,
  )
}

// Spec: IN-2
/** @purity non-pure */
async function cursorAt(page: Page, x: number, y: number): Promise<string> {
  await page.mouse.move(x, y)
  return page.evaluate((part: string) => {
    const surface = document.querySelector(part)
    return surface instanceof HTMLElement ? surface.style.cursor : ''
  }, CANVAS_PART)
}

const REACH_PX = 160

// Spec: FR-019, PTD-5
// Why: ground below the last task group points at no task group, the other rule of FR-019;
// emptiness is the product's own answer, the plain arrow with nothing armed.
/** @purity non-pure */
async function groundOnADrawnTaskGroup(page: Page): Promise<{ x: number; y: number } | null> {
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
    { panel: TASK_GROUP_PANEL_BOX, reach: REACH_PX },
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

// Why: rx is read from the resolved geometry, not the attribute text, so a value that comes
// through a style is still seen.
/** @purity semi-pure-mutable */
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

// Why: by multiset, not set: one more of an existing shape would be invisible to a plain
// difference.
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

// Spec: SL-1, FR-018, AM-3
// Why: the document, not the drawing: FR-018 drops task groups from the drawing as detail
// falls, so a count from the page answers how many fit, not what SL-1 asks.
/** @purity semi-pure-mutable */
async function readDocumentTaskGroupIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const api = (
      window as unknown as { grSchedulerAgentApi?: { readDocument(): unknown } }
    ).grSchedulerAgentApi
    if (api === undefined) throw new Error('the Agent API is not open, so the document cannot be read')
    const held = api.readDocument() as { schedule: { taskGroups: { id: string }[] } }
    return held.schedule.taskGroups.map((one) => one.id)
  })
}

// Spec: FR-085
// Why: the window, not the document, read only for failure messages; names come back cut,
// so none is compared against a typed one.
/** @purity semi-pure-mutable */
async function readDrawnTaskGroupNames(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-depth]')).map(
      (row) => `${row.getAttribute('data-depth')}:${(row.querySelector('span')?.textContent ?? '').trim()}`,
    ),
  )
}

// Spec: U-55
// Why: read before it is answered, so a failure can say what the tool offered to delete.
/** @purity semi-pure-mutable */
async function readConfirmation(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-role]'))
      .filter((marked) => (marked.getAttribute('data-role') ?? '').includes('Confirm'))
      .map((marked) => (marked.textContent ?? '').trim().slice(0, 600))
      .filter((said) => said !== ''),
  )
}

// Spec: T-037
/** @purity semi-pure-mutable */
async function readNotices(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    // Trap: the role is Notification Area; asking for a role called Notice finds none and a
    // defect looks fixed.
    Array.from(document.querySelectorAll('[data-role]'))
      .filter((marked) => (marked.getAttribute('data-role') ?? '').includes('Notification'))
      .map((marked) => (marked.textContent ?? '').trim())
      .filter((said) => said !== ''),
  )
}

// Spec: S-99g
/** @purity semi-pure-mutable */
async function faceIsUp(page: Page): Promise<boolean> {
  return page.evaluate((wanted: string) => {
    const face = document.querySelector(wanted)
    if (face === null) return false
    const box = face.getBoundingClientRect()
    return box.width > 1 && box.height > 1
  }, HELP)
}

/** @purity non-pure */
async function arm(page: Page, entrance: string): Promise<void> {
  expect(await pressEntrance(page, entrance), `the entrance ${entrance} is on the screen`).toBe(true)
  expect(await armingOf(page, entrance), `${entrance} stands armed`).toBe('true')
}

/** @purity non-pure */
async function placeAHighlightBox(page: Page): Promise<Drawn[]> {
  const spot = await groundOnADrawnTaskGroup(page)
  expect(spot, 'a drawn task group covers empty ground with room along it').not.toBeNull()
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
  return added
}

// Spec: S-132, FR-019
// Why: the resolved geometry is compared, not the attribute text: a radius from a style is
// still the radius the reader sees.
test(`S-132: a placed highlight box is drawn with a corner radius of ${CORNER_RADIUS_PX}`, async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp()
  const page = opened.page
  try {
    const added = await placeAHighlightBox(page)
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

// Spec: SK-3, SK-2, SL-1, FR-032, NT-7
// Why: a confirmation is answered when one stands: answering it is part of asking for the
// deletion, not a weakening of the judgment.
for (const key of SK3_KEYS) {
  test(`SK-3: ${key} deletes every task ${SK2_KEY} selected`, async () => {
    test.setTimeout(180_000)
    const opened = await openTheApp()
    const page = opened.page
    try {
      const shapesBefore = await page.evaluate(
        (canvas: string) => document.querySelectorAll(`${canvas} polygon`).length,
        CANVAS,
      )
      expect(shapesBefore, 'the build opens with tasks drawn, so there is something to delete').
        toBeGreaterThan(0)

      await page.mouse.move(BASE_SCREEN.width / 2, BASE_SCREEN.height / 2)
      await page.keyboard.press(SK2_KEY)
      await page.waitForTimeout(400)
      await page.keyboard.press(key)
      await page.waitForTimeout(700)
      // Spec: NT-7
      await page.keyboard.press('y')
      await page.waitForTimeout(1200)

      expect(
        await page.evaluate(
          (canvas: string) => document.querySelectorAll(`${canvas} polygon`).length,
          CANVAS,
        ),
        `SK-3 with ${key}: no task of the ${shapesBefore} drawn is left`,
      ).toBe(0)
    } finally {
      await opened.close()
    }
  })
}

// Spec: SL-1, SK-3, AM-3, FR-065
// Why: task groups are counted in the document, not the panel: FR-018 narrows the panel as
// detail falls, and emptying the tasks let it draw one task group fewer.
test(`SK-3 / SL-1: the same ${SK3_KEYS[0]} leaves every task group standing`, async () => {
  test.setTimeout(180_000)
  expect(
    TASK_GROUP_IS_NOT_A_TARGET,
    'table T-023c row SL-1 still says a task group (TaskGroup) is not among what can be selected',
  ).toBe(true)

  const opened = await openTheApp()
  const page = opened.page
  try {
    expect(
      await pressEntrance(page, AGENT_API_ENTRANCE),
      `the entrance ${AGENT_API_ENTRANCE} is on the screen`,
    ).toBe(true)
    expect(
      await page.evaluate(
        () => typeof (window as unknown as Record<string, unknown>).grSchedulerAgentApi,
      ),
      `pressing ${AGENT_API_ENTRANCE} publishes the Agent API, which is how the document is read`,
    ).toBe('object')

    const taskGroupsBefore = await readDocumentTaskGroupIds(page)
    const drawnBefore = await readDrawnTaskGroupNames(page)
    expect(taskGroupsBefore.length, 'the build opens with task groups in the document').toBeGreaterThan(0)

    await page.mouse.move(BASE_SCREEN.width / 2, BASE_SCREEN.height / 2)
    await page.keyboard.press(SK2_KEY)
    await page.waitForTimeout(400)
    expect(
      await readDocumentTaskGroupIds(page),
      'SK-2 selected but deleted nothing, so the task groups still stand at this point',
    ).toEqual(taskGroupsBefore)

    await page.keyboard.press(SK3_KEYS[0] as string)
    await page.waitForTimeout(700)
    const asked = await readConfirmation(page)
    await page.keyboard.press('y')
    await page.waitForTimeout(1200)

    // Spec: FR-032
    // Why: an equality of identifiers, not a floor on a count; names are not compared, since
    // FR-032 lets a task group take its name from a task before the task goes.
    const taskGroupsAfter = await readDocumentTaskGroupIds(page)
    const drawnAfter = await readDrawnTaskGroupNames(page)
    expect(
      taskGroupsAfter,
      'SL-1: a task group is not among what can be selected, so none of them was deleted; ' +
        `the document held ${String(taskGroupsBefore.length)} task groups and now holds ` +
        `${String(taskGroupsAfter.length)}; the panel drew [${drawnBefore.join(' | ')}] and now draws ` +
        `[${drawnAfter.join(' | ')}]; the confirmation said [${asked.join(' // ')}]`,
    ).toEqual(taskGroupsBefore)
  } finally {
    await opened.close()
  }
})

// Spec: SL-1, SK-3
test(`SK-3 / SL-1: ${SK3_KEYS[0]} takes a placed highlight box with it`, async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp()
  const page = opened.page
  try {
    const added = await placeAHighlightBox(page)
    const marks = added.map((one) => `${one.tag}|${one.attrs}`)

    await page.mouse.move(BASE_SCREEN.width / 2, BASE_SCREEN.height / 2)
    await page.keyboard.press(SK2_KEY)
    await page.waitForTimeout(400)
    await page.keyboard.press(SK3_KEYS[0] as string)
    await page.waitForTimeout(700)
    await page.keyboard.press('y')
    await page.waitForTimeout(1200)

    const left = (await drawnElements(page)).map((one) => `${one.tag}|${one.attrs}`)
    expect(
      marks.filter((mark) => left.includes(mark)),
      'SL-1: the highlight box is among what SK-3 deletes, so nothing it drew is left',
    ).toEqual([])
  } finally {
    await opened.close()
  }
})

// Spec: IN-4, FR-020
test('IN-4: with a face up and a holding armed, one Esc closes the face and leaves the holding', async () => {
  test.setTimeout(180_000)
  expect(
    escOrderOf('face'),
    'table T-028 row IN-4 still puts an open face ahead of a holding',
  ).toBeLessThan(escOrderOf('holding'))

  const opened = await openTheApp()
  const page = opened.page
  try {
    await arm(page, HIGHLIGHT_BOX_ENTRANCE)
    await page.keyboard.press(SK13_KEY)
    await page.waitForTimeout(900)
    expect(await faceIsUp(page), `SK-13 (${SK13_KEY}) put a face up`).toBe(true)
    expect(
      await armingOf(page, HIGHLIGHT_BOX_ENTRANCE),
      'the holding survived the face being opened, so both tiers stand',
    ).toBe('true')

    await page.keyboard.press('Escape')
    await page.waitForTimeout(900)
    expect(await faceIsUp(page), 'IN-4: the first Esc closed the face').toBe(false)
    expect(
      await armingOf(page, HIGHLIGHT_BOX_ENTRANCE),
      'IN-4: the first Esc consumed ONE tier, so the holding is still armed',
    ).toBe('true')

    await page.keyboard.press('Escape')
    await page.waitForTimeout(900)
    expect(
      await armingOf(page, HIGHLIGHT_BOX_ENTRANCE),
      'IN-4: the second Esc consumed the next tier down, the holding',
    ).not.toBe('true')
  } finally {
    await opened.close()
  }
})

// Spec: IN-4, NT-8, HF-10, IC-74, RS-31, FR-029, T-328, T-329
// Why: HF-10 is dim only while no task group is undrawn (the zoom counts too), so one press
// first draws every task group (T-328 everyTaskGroupOpenPressed); T-233 hides RS-31, so an unreadable drop raises the notice.
test('IN-4: with a notice up and a holding armed, one Esc clears the notice only', async () => {
  test.setTimeout(180_000)
  expect(
    escOrderOf('notice'),
    'table T-028 row IN-4 still puts a raised notice ahead of a holding',
  ).toBeLessThan(escOrderOf('holding'))

  const opened = await openTheApp()
  const page = opened.page
  try {
    // Step: set up a picture in which every task group is drawn, then clear any notice it raised
    expect(
      await pressEntrance(page, UNFOLD_ALL_ENTRANCE),
      `the entrance ${UNFOLD_ALL_ENTRANCE} is on the screen`,
    ).toBe(true)
    if ((await readNotices(page)).length > 0) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(900)
    }
    expect(
      (await readNotices(page)).length,
      'NT-8: the notice the set-up press may have raised is still standing',
    ).toBe(0)

    await arm(page, COMMENT_BOX_ENTRANCE)
    await page.evaluate(() => {
      Object.defineProperty(DataTransferItem.prototype, 'getAsFileSystemHandle', { value: undefined, configurable: true })
      const transfer = new DataTransfer()
      transfer.items.add(new File(['not a schedule'], 'notes.txt'))
      const target = document.querySelector('[data-role="Schedule Canvas"]') as Element
      for (const type of ['dragenter', 'dragover', 'drop']) {
        target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer }))
      }
    })
    await page.waitForTimeout(900)
    const notices = await readNotices(page)

    expect(notices.length, 'FR-076 / RS-11: dropping notes.txt told no reason').toBeGreaterThan(0)
    expect(
      await armingOf(page, COMMENT_BOX_ENTRANCE),
      'the holding survived a press on an entrance that does not arm, so both tiers stand',
    ).toBe('true')

    await page.keyboard.press('Escape')
    await page.waitForTimeout(900)
    expect((await readNotices(page)).length, 'IN-4 / NT-8: the first Esc cleared the notice').toBe(0)
    expect(
      await armingOf(page, COMMENT_BOX_ENTRANCE),
      'IN-4: the first Esc consumed ONE tier, so the holding is still armed',
    ).toBe('true')

    await page.keyboard.press('Escape')
    await page.waitForTimeout(900)
    expect(
      await armingOf(page, COMMENT_BOX_ENTRANCE),
      'IN-4: the second Esc consumed the next tier this file drives, the holding',
    ).not.toBe('true')
  } finally {
    await opened.close()
  }
})

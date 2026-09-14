// ST-7 stack safety valve: pressed on the shipped build, not just in unit tests.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { bare, specTable, type SpecTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'


const T025: SpecTable = specTable('T-025')
const T103: SpecTable = specTable('T-103')
const T201: SpecTable = specTable('T-201')
const T205: SpecTable = specTable('T-205')

const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

const NOTIFICATION_AREA = bare(rowOf(T103, 'U-57').cells[0] ?? '')

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

function wholeNumberIn(cell: string, what: string): number {
  const found = /\d+/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${what} states no whole number this file can read: ${JSON.stringify(cell)}`)
  }
  return value
}

const T205_COLUMNS = 5
const T205_DEFAULT = 1

const STACK_SAFETY_CAP = wholeNumberIn(
  cellOf(T205, 'S-89', T205_DEFAULT, T205_COLUMNS),
  '表 T-205 row S-89',
)

const T201_COLUMNS = 7
const T201_KEY = 1

/** @purity pure */
const TASK_SHAPE_KIND = (() => {
  const key = bare(cellOf(T201, 'S-13', T201_KEY, T201_COLUMNS))
  const tail = /^shapeHeightOf\.([A-Za-z]+)$/.exec(key)
  if (tail === null) {
    throw new Error(`表 T-201 row S-13 no longer names a shape this file can read: ${key}`)
  }
  return tail[1] as string
})()

/** @purity pure */
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

const AGENT_API_ENTRANCE = 'IC-20'

interface ReasonWords {
  readonly language: string
  readonly text: string
  readonly nextStep: string
}

/** @purity pure */
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


const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')

const CANVAS = '[data-role="Schedule Canvas"] svg'

const FIXTURE_ROW_ID = '6a1f0c92-4b7d-4c2e-9f31-8d5a7e0b1c46'

const FIXTURE_START = '2026-03-02'
const FIXTURE_FINISH = '2026-03-06'

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

/** @purity semi-pure-b */
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

interface FixtureArgs {
  readonly stacks: number
  readonly shapeKind: string
  readonly start: string
  readonly finish: string
  readonly groupId: string
}

/** @purity non-pure */
async function visit(stacks: number): Promise<Visit> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({ viewport: BASE_SCREEN })
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const page = await context.newPage()
  const escaped: string[] = []
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

    await page.waitForTimeout(2500)
    const drawnAfterWrite = await page.evaluate(
      (canvas: string) => document.querySelectorAll(`${canvas} *`).length,
      CANVAS,
    )
    const toldAfterWrite = await readTellings(page)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(700)
    const toldAfterDismissal = await readTellings(page)

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

/** @purity pure */
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
    overTheCap = await visit(STACK_SAFETY_CAP + 1)
    atTheCap = await visit(STACK_SAFETY_CAP)
  } catch (thrown) {
    sweepFailed = thrown instanceof Error ? thrown : new Error(String(thrown))
  }
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

function measured(which: Visit | null, what: string): Visit {
  if (sweepFailed !== null) throw sweepFailed
  if (which === null) throw new Error(`the ${what} visit measured nothing`)
  return which
}


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


test('ST-7 / RS-24: the person is told, in the words the dictionary holds', () => {
  const seen = measured(overTheCap, 'over-the-cap')
  const told = rs24Among(seen.toldAfterWrite)
  expect(
    told,
    'ST-7 (MUST) / RS-24: a telling carrying the row RS-24 stands on the screen; what stood ' +
      `was ${JSON.stringify(seen.toldAfterWrite)}`,
  ).not.toBeNull()
})

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

test(`ST-7 control: at ${String(STACK_SAFETY_CAP)} stacks IO-6 sends the picture and tells nobody`, () => {
  const seen = measured(atTheCap, 'at-the-cap')
  expect(
    rs24Among(seen.toldAfterPictureLeft),
    `ST-7: nothing reached the valve, so the export told nobody; what stood was ` +
      JSON.stringify(seen.toldAfterPictureLeft),
  ).toBeNull()
  expect(seen.escaped, 'and the export threw nothing out of the build').toEqual([])
})

// CR-653 section 9 on the shipped build: an icon description takes no press, and moving onto it puts it away.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test, type Browser, type Page } from '@playwright/test'
import { bare, bareAll, specTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import {
  ERP_SAMPLE,
  REQUIREMENTS,
  TASK_GROUP_HIDE,
  TASK_GROUP_OPEN_ONE_LEVEL,
  SHALLOW_ZOOM,
  documentOf,
  drawnRowIds,
  isTaskGroupEntranceArmed,
  openDocument,
  openStage,
  readTree,
  settle,
  stateOf,
  type Stage,
} from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'

const IN_3_TAKES_NO_POINTER = '⭐ ツールチップはポインタを受け取らず、下へ通すこと（MUST）（`FR-152` の 表 T-337 の `UZ-2`）'
const UZ_2_PASSES_THE_PRESS = '押下を受けず、下へ通すこと（MUST）—— 説明は短く、押すものを持たないので、覆った入口から押す手を奪ってはならない'
const EZ_2_LEAVING = 'ポインタがそのアイコンの外へ出たら、説明を消し、次に入った対象で待ちを数え直すこと（MUST）'
const EZ_2_THE_BOX_IS_OUTSIDE = '説明の箱の上へ動いたことも、アイコンの外へ出たことに数える（説明はポインタを受け取らない —— `IN-3`）。'
const GR_19_NO_PRESS_IN_FRONT = '押下を受けないもの（`UZ-1`・`UZ-2`）'

const CLAUSES: readonly string[] = [
  IN_3_TAKES_NO_POINTER,
  UZ_2_PASSES_THE_PRESS,
  EZ_2_LEAVING,
  EZ_2_THE_BOX_IS_OUTSIDE,
  GR_19_NO_PRESS_IN_FRONT,
]

const T_103 = specTable('T-103')
const T_109 = specTable('T-109')
const partOf = (id: string): string => `[data-role="${bare(rowOf(T_103, id).by['確定名（英）'] ?? '')}"]`

// see U-26, U-53
const PALETTE = partOf('U-26')
const TOOLTIP = partOf('U-53')
const PALETTE_NAME = bare(rowOf(T_103, 'U-26').by['確定名（英）'] ?? '')

// see T-109
const PLACE_A_RECTANGLE = rowOf(T_109, 'IC-23').id
const ARM_A_DEPENDENCY = rowOf(T_109, 'IC-61').id
const NO_ARM = new Set(['', '—', '-'])

const numberOf = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(cell).replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return value
}

// see S-124
const S_124_MS = numberOf(rowOf(specTable('T-212'), 'S-124').by['値'] ?? '')

// see FR-038, EZ-2
const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  readonly icons: readonly { readonly rowId: string; readonly hint?: { readonly ja: string; readonly en: string } }[]
}
const HINTS: ReadonlyMap<string, readonly string[]> = new Map(
  WORDS.icons.flatMap((one) => (one.hint === undefined ? [] : [[one.rowId, [one.hint.ja, one.hint.en]] as const])),
)

// WHY: past a wait the box still needs a frame or two to be drawn and read back (as CR-576's cases allow).
const SHOW_ALLOWANCE_MS = 1_500
// WHY: a point this far inside an edge is inside the box whatever fraction the layout lands on.
const INSET_PX = 2

interface Rect {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

interface Point {
  readonly x: number
  readonly y: number
}

interface Front {
  readonly shownText: string
  readonly boxHolds: boolean
  readonly inTooltip: boolean
  readonly entrance: string | null
}

const centreOf = (rect: Rect): Point => ({ x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 })

const holds = (rect: Rect, point: Point): boolean =>
  point.x >= rect.left && point.x < rect.right && point.y >= rect.top && point.y < rect.bottom

const said = (rect: Rect | null): string =>
  rect === null ? '(none)' : `[${rect.left.toFixed(1)}, ${rect.top.toFixed(1)}] - [${rect.right.toFixed(1)}, ${rect.bottom.toFixed(1)}]`

/** @purity pure */
function isHintOf(icon: string, text: string): boolean {
  return (HINTS.get(icon) ?? []).some((hint) => hint !== '' && text.includes(hint))
}

// WHY: the point of the overlap nearest the column of the hinted icon, so the move from it is straight down where it can be.
/** @purity pure */
function pointOfOverlap(box: Rect, covered: Rect, column: number): Point | null {
  const left = Math.max(box.left, covered.left) + INSET_PX
  const right = Math.min(box.right, covered.right) - INSET_PX
  const top = Math.max(box.top, covered.top) + INSET_PX
  const bottom = Math.min(box.bottom, covered.bottom) - INSET_PX
  if (left >= right || top >= bottom) return null
  return { x: Math.min(Math.max(column, left), right), y: (top + bottom) / 2 }
}

// see EZ-2
/** @purity pure */
function pointOfTheBoxOutside(box: Rect, icon: Rect): Point | null {
  const x = Math.min(Math.max(centreOf(icon).x, box.left + INSET_PX), box.right - INSET_PX)
  const below = { x, y: (Math.max(box.top, icon.bottom) + box.bottom) / 2 }
  if (holds(box, below) && !holds(icon, below)) return below
  const above = { x, y: (box.top + Math.min(box.bottom, icon.top)) / 2 }
  return holds(box, above) && !holds(icon, above) ? above : null
}

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity semi-pure-b */
async function shownNow(page: Page): Promise<{ text: string; rect: Rect | null }> {
  return page.evaluate((tooltip: string) => {
    const layer = document.querySelector(tooltip)
    const boxes = layer === null ? [] : Array.from(layer.children).filter((one) => (one.textContent ?? '').trim() !== '')
    const box = boxes[boxes.length - 1]
    const found = box?.getBoundingClientRect()
    return {
      text: (box?.textContent ?? '').trim(),
      rect: found === undefined ? null : { left: found.left, top: found.top, right: found.right, bottom: found.bottom },
    }
  }, TOOLTIP)
}

// WHY: every change of the shown text stamped by the page itself, so the first change after a move is not lost between polls.
/** @purity non-pure */
async function installRecorder(page: Page): Promise<void> {
  await page.evaluate((tooltip: string) => {
    const log = [] as { at: number; text: string }[]
    ;(window as unknown as Record<string, unknown>)['grsCr653'] = log
    let last = '\u0000'
    const note = (): void => {
      const layer = document.querySelector(tooltip)
      const boxes = layer === null ? [] : Array.from(layer.children).filter((one) => (one.textContent ?? '').trim() !== '')
      const text = (boxes[boxes.length - 1]?.textContent ?? '').trim()
      if (text === last) return
      last = text
      log.push({ at: performance.now(), text })
    }
    new MutationObserver(note).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden'],
    })
    note()
  }, TOOLTIP)
}

/** @purity semi-pure-b */
async function changesSince(page: Page, since: number): Promise<readonly { at: number; text: string }[]> {
  return page.evaluate((from: number) => {
    const log = (window as unknown as Record<string, { at: number; text: string }[]>)['grsCr653']
    if (log === undefined) throw new Error('the recorder is not installed')
    return log.filter((one) => one.at >= from)
  }, since)
}

// see T-337, GR-19
/** @purity semi-pure-b */
async function frontAt(page: Page, at: Point): Promise<Front> {
  return page.evaluate(
    ({ point, tooltip }: { point: { x: number; y: number }; tooltip: string }) => {
      const layer = document.querySelector(tooltip)
      const boxes = layer === null ? [] : Array.from(layer.children).filter((one) => (one.textContent ?? '').trim() !== '')
      const box = boxes[boxes.length - 1]?.getBoundingClientRect()
      const front = document.elementFromPoint(point.x, point.y)
      return {
        shownText: (boxes[boxes.length - 1]?.textContent ?? '').trim(),
        boxHolds: box !== undefined && point.x >= box.left && point.x < box.right && point.y >= box.top && point.y < box.bottom,
        inTooltip: front !== null && front.closest(tooltip) !== null,
        entrance: front?.closest('[data-icon]')?.getAttribute('data-icon') ?? null,
      }
    },
    { point: at, tooltip: TOOLTIP },
  )
}

/** @purity semi-pure-b */
async function rectIn(page: Page, scope: string, icon: string): Promise<Rect> {
  const found = await page.evaluate(
    ({ within, wanted }: { within: string; wanted: string }) => {
      const box = document.querySelector(`${within} [data-icon="${wanted}"]`)?.getBoundingClientRect()
      return box === undefined ? null : { left: box.left, top: box.top, right: box.right, bottom: box.bottom }
    },
    { within: scope, wanted: icon },
  )
  if (found === null) throw new Error(`no ${icon} is drawn inside ${scope}`)
  return found
}

/** @purity semi-pure-b */
async function isArmed(page: Page, icon: string): Promise<boolean> {
  return page.evaluate((wanted: string) => document.querySelector(`[data-icon="${wanted}"]`)?.getAttribute('data-armed') === 'true', icon)
}

/** @purity non-pure */
async function restUntilHinted(page: Page, icon: string, at: Point): Promise<{ text: string; rect: Rect }> {
  await page.mouse.move(at.x, at.y, { steps: 4 })
  await expect
    .poll(async () => isHintOf(icon, (await shownNow(page)).text), {
      timeout: S_124_MS + SHOW_ALLOWANCE_MS,
      message: `premise: resting on ${icon} shows its description`,
    })
    .toBe(true)
  const shown = await shownNow(page)
  if (shown.rect === null) throw new Error(`${icon}: a description without a box`)
  return { text: shown.text, rect: shown.rect }
}

/** @purity non-pure */
async function pressHere(page: Page, at: Point): Promise<void> {
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  await settle(page)
}

/** @purity non-pure */
async function openTheSample(): Promise<Stage> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const stage = await openStage(browser)
  await openDocument(stage.page, 'sample-large-erp-program.ja.xml', ERP_SAMPLE)
  await installRecorder(stage.page)
  return stage
}

// WHY: at the shallow zoom T1's children are not drawn, so IC-90 has something to bring back and a press on it shows.
/** @purity non-pure */
async function openTheShallowTree(): Promise<Stage> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const stage = await openStage(browser)
  await openDocument(stage.page, 'arranged.json', documentOf({ zoomY: SHALLOW_ZOOM }))
  expect((await readTree(stage.page)).zoomY, 'premise: the file zoom is kept').toBe(SHALLOW_ZOOM)
  return stage
}

test('CR-653 -- IN-3, UZ-2, EZ-2 and GR-19 still say what these cases press, word for word', () => {
  for (const clause of CLAUSES) expect(REQUIREMENTS, clause).toContain(clause)
  expect(REQUIREMENTS, 'IN-3 no longer asks a description to be hoverable').not.toContain('ポインタを乗せられること')
  expect(S_124_MS, 'premise: S-124 reads as a wait').toBeGreaterThan(0)
  for (const icon of [TASK_GROUP_HIDE, TASK_GROUP_OPEN_ONE_LEVEL, PLACE_A_RECTANGLE]) {
    expect(HINTS.has(icon), `premise: the dictionary gives ${icon} a description`).toBe(true)
  }
  for (const icon of [PLACE_A_RECTANGLE, ARM_A_DEPENDENCY]) {
    const row = rowOf(T_109, icon)
    expect(bareAll(row.by['面'] ?? ''), `premise: ${icon} sits on the ${PALETTE_NAME}`).toContain(PALETTE_NAME)
    expect(NO_ARM.has((row.by['構え'] ?? '').trim()), `premise: ${icon} arms something`).toBe(false)
  }
})

test.describe('CR-653 (a) -- the description of a task group control covers the control below it, and the press reaches that control', () => {
  test(`IN-3 / UZ-2 -- ${UZ_2_PASSES_THE_PRESS}`, async () => {
    test.setTimeout(240_000)
    const stage = await openTheShallowTree()
    try {
      const { page } = stage
      const row = 'T1'
      expect(await drawnRowIds(page), 'premise: the children of T1 are not drawn yet').not.toContain('T1a')
      expect(await isTaskGroupEntranceArmed(page, row, TASK_GROUP_OPEN_ONE_LEVEL), `premise: ${TASK_GROUP_OPEN_ONE_LEVEL} has a level to open`).toBe(true)
      const scope = `[data-group-id="${row}"]`
      const hide = await rectIn(page, scope, TASK_GROUP_HIDE)
      const below = await rectIn(page, scope, TASK_GROUP_OPEN_ONE_LEVEL)

      const shown = await restUntilHinted(page, TASK_GROUP_HIDE, centreOf(hide))
      const at = pointOfOverlap(shown.rect, below, centreOf(hide).x)
      expect(at, `premise: the description ${said(shown.rect)} of ${TASK_GROUP_HIDE} covers ${TASK_GROUP_OPEN_ONE_LEVEL} ${said(below)}`).not.toBeNull()
      if (at === null) return
      expect(holds(hide, at), `premise: ${JSON.stringify(at)} lies outside ${TASK_GROUP_HIDE} ${said(hide)}`).toBe(false)

      const front = await frontAt(page, at)
      expect(front.shownText, 'premise: the description still stands while the front is read').toBe(shown.text)
      expect(front.boxHolds, `premise: the box covers ${JSON.stringify(at)}`).toBe(true)
      expect(front.inTooltip, `${IN_3_TAKES_NO_POINTER} -- the box is the front at ${JSON.stringify(at)}`).toBe(false)
      expect(front.entrance, UZ_2_PASSES_THE_PRESS).toBe(TASK_GROUP_OPEN_ONE_LEVEL)

      // STEP: straight down from the hinted control onto the covered one, and press at once
      await pressHere(page, at)
      expect(await drawnRowIds(page), `${UZ_2_PASSES_THE_PRESS} -- ${TASK_GROUP_OPEN_ONE_LEVEL} did not open a level`).toContain('T1a')
      expect(stateOf(await readTree(page), row), `${UZ_2_PASSES_THE_PRESS} -- the press went to ${TASK_GROUP_HIDE}`).not.toBe('hidden')
    } finally {
      await stage.close()
    }
  })
})

test.describe('CR-653 (b) -- the description of a palette entrance covers the next task group, and the press arms the entrance below', () => {
  test(`IN-3 / UZ-2 -- ${IN_3_TAKES_NO_POINTER}`, async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample()
    try {
      const { page } = stage
      const above = await rectIn(page, PALETTE, PLACE_A_RECTANGLE)
      const below = await rectIn(page, PALETTE, ARM_A_DEPENDENCY)
      expect(await isArmed(page, ARM_A_DEPENDENCY), `premise: ${ARM_A_DEPENDENCY} is not armed yet`).toBe(false)

      const shown = await restUntilHinted(page, PLACE_A_RECTANGLE, centreOf(above))
      const at = pointOfOverlap(shown.rect, below, centreOf(above).x)
      expect(at, `premise: the description ${said(shown.rect)} of ${PLACE_A_RECTANGLE} covers ${ARM_A_DEPENDENCY} ${said(below)}`).not.toBeNull()
      if (at === null) return

      const front = await frontAt(page, at)
      expect(front.shownText, 'premise: the description still stands while the front is read').toBe(shown.text)
      expect(front.boxHolds, `premise: the box covers ${JSON.stringify(at)}`).toBe(true)
      expect(front.inTooltip, `${IN_3_TAKES_NO_POINTER} -- the box is the front at ${JSON.stringify(at)}`).toBe(false)
      expect(front.entrance, UZ_2_PASSES_THE_PRESS).toBe(ARM_A_DEPENDENCY)

      await pressHere(page, at)
      expect(await isArmed(page, ARM_A_DEPENDENCY), `${UZ_2_PASSES_THE_PRESS} (${ARM_A_DEPENDENCY})`).toBe(true)
      expect(await isArmed(page, PLACE_A_RECTANGLE), `${UZ_2_PASSES_THE_PRESS} -- the press went to ${PLACE_A_RECTANGLE}`).toBe(false)
    } finally {
      await stage.close()
    }
  })
})

test.describe('CR-653 (c) -- moving from the icon onto its own description puts the description away', () => {
  test(`EZ-2 -- ${EZ_2_LEAVING} ${EZ_2_THE_BOX_IS_OUTSIDE}`, async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample()
    try {
      const { page } = stage
      const icon = await rectIn(page, PALETTE, PLACE_A_RECTANGLE)
      const shown = await restUntilHinted(page, PLACE_A_RECTANGLE, centreOf(icon))
      const at = pointOfTheBoxOutside(shown.rect, icon)
      expect(at, `premise: a point of the box ${said(shown.rect)} lies outside ${PLACE_A_RECTANGLE} ${said(icon)}`).not.toBeNull()
      if (at === null) return

      const since = await page.evaluate(() => performance.now())
      await page.mouse.move(at.x, at.y)
      await expect
        .poll(async () => (await shownNow(page)).text, { timeout: SHOW_ALLOWANCE_MS, message: EZ_2_THE_BOX_IS_OUTSIDE })
        .not.toBe(shown.text)
      const first = (await changesSince(page, since)).find((one) => one.text !== shown.text)
      expect(first?.text, `${EZ_2_LEAVING} -- the first change after moving onto the box read ${JSON.stringify(first?.text)}`).toBe('')
    } finally {
      await stage.close()
    }
  })
})

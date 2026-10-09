// W3 spec-only tester 5: FR-039's unrounded floor comparison for the Task Group Panel width saved by a boundary drag.

// WHY: the clause is about pointer travel in screen px, which only a real browser delivers.

import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { bare, specTable, unbroken } from '../contract/spec-table'
import { answerConfirmation, enableAgentApi, icon, readDocument, settle } from '../usecase/uc-harness'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

// see FR-039
const FR_039_UNROUNDED =
  '⭐ 「床より広い」は、押した時点に描いた幅にポインタが横に動いた px を足した幅（`FR-052` のポインタ位置が決める幅）が、床より大きいことであり、2 つを丸めずにそのまま比べること（MUST）'
const FR_039_SAVED =
  '保存する `S-79` は、離した時点で描いた幅が本段の床より広ければ、描いた幅を描く比で割った値とし、床と等しければ（`FR-052` が床で止めて描いているときを含む）、いま保存している `S-79` と、床を描く比で割った値の小さい方とすること（MUST）'

const VIEWPORT = { width: 1920, height: 1080 }
test.use({ viewport: VIEWPORT, locale: 'en-US' })
test.setTimeout(120_000)

/** @purity pure */
function numberIn(cell: string, what: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  if (found === null) throw new Error(`${what} states no number: ${JSON.stringify(cell)}`)
  return Number(found[0])
}

/** @purity pure */
function cellOf(table: string, id: string, column: string): string {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row.by[column] ?? ''
}

const S_37 = numberIn(cellOf('T-201', 'S-37', '既定値'), 'S-37')
const S_125 = numberIn(cellOf('T-211', 'S-125', '値'), 'S-125')
const S_138 = numberIn(cellOf('T-206', 'S-138', '既定'), 'S-138')
const S_235 = numberIn(cellOf('T-206', 'S-235', '既定'), 'S-235')
const S_236 = numberIn(cellOf('T-206', 'S-236', '既定'), 'S-236')
const S_243 = numberIn(cellOf('T-206', 'S-243', '既定'), 'S-243')
const S_237 = numberIn(cellOf('T-206', 'S-237', '既定'), 'S-237')
const PANEL_WIDTH_KEY = bare(cellOf('T-203', 'S-79', 'キー'))
const DISPLAY_SCALE_KEY = bare(cellOf('T-202', 'S-234', 'キー'))

// see FR-039, HF-4, FR-029
/** @purity pure */
function floorAt(ratio: number): number {
  return S_37 * ratio * S_125 + S_138 * S_235 + 4 * (S_138 + S_243 * 2 + S_237 * 2) * S_235
}

const TEMPLATE_TEXT = readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8')

// WHY: a headless browser has no file handles; a dropped file is handed over as one.
const HOST_STUB = `(() => {
  const original = DataTransferItem.prototype.getAsFileSystemHandle
  DataTransferItem.prototype.getAsFileSystemHandle = async function () {
    const file = this.getAsFile()
    if (!file) return original ? original.call(this) : null
    const text = await file.text()
    return { kind: 'file', name: file.name, getFile: async () => new File([text], file.name),
      queryPermission: async () => 'granted', requestPermission: async () => 'granted',
      isSameEntry: async (other) => Boolean(other) && other.name === file.name }
  }
})()`

/** @purity non-pure */
async function launch(page: Page): Promise<void> {
  await page.addInitScript(HOST_STUB)
  await page.goto('/')
  await page.waitForSelector('[data-role="Schedule Canvas"]')
  await settle(page)
}

/** @purity non-pure */
async function openByDrop(page: Page, text: string): Promise<void> {
  await page.evaluate((text) => {
    const transfer = new DataTransfer()
    transfer.items.add(new File([text], 'w3-t5-panel.json'))
    const target = document.querySelector('[data-role="Schedule Canvas"]') as Element
    for (const type of ['dragenter', 'dragover', 'drop']) target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer }))
  }, text)
  await page.waitForSelector('[data-role="Open Chooser"]')
  await page.click(icon('IC-71', '[data-role="Open Chooser"]'))
  await page.waitForTimeout(200)
  if (await page.locator('[data-role="Confirmation"] [data-confirmation-answer="proceed"]').count()) await answerConfirmation(page, 'proceed')
  await settle(page)
}

/** @purity non-pure */
async function pressMoveRelease(page: Page, from: { x: number; y: number }, dx: number): Promise<void> {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  const steps = Math.max(1, Math.min(8, Math.abs(dx)))
  for (let i = 1; i <= steps; i += 1) await page.mouse.move(from.x + (dx * i) / steps, from.y)
  // WHY: the frame that reads the last move must run before the release, or the release reads an older position.
  await page.waitForTimeout(150)
  await page.mouse.up()
  await settle(page)
}



test.describe('W3-T5 -- the manuscript these cases are driven by', () => {
  test('01-04 still says each clause, word for word', () => {
    for (const clause of [FR_039_UNROUNDED, FR_039_SAVED]) expect(REQUIREMENTS, clause).toContain(clause)
  })
})

test(`FR-039: "${FR_039_UNROUNDED}"`, async ({ browser }) => {
  // WHY: display scale 110 puts the drawn width at a quarter past a pixel and the floor just past a whole pixel,
  // so a release a quarter px over the floor reads "wider" unrounded but "equal" when both are rounded.
  const DISPLAY_SCALE = 110
  const STORED = 300
  const ratio = (DISPLAY_SCALE / 100) * S_236
  const drawnAtPress = STORED * ratio
  const floor = floorAt(ratio)
  // WHY: each release starts in a fresh browser context, so no earlier drag, open or remembered switch carries over.
  const release = async (dx: number): Promise<number> => {
    const context = await browser.newContext({ viewport: VIEWPORT, locale: 'en-US' })
    const page = await context.newPage()
    await launch(page)
    await enableAgentApi(page)
    const root = JSON.parse(TEMPLATE_TEXT) as Record<string, any>
    root['documentSettings'][PANEL_WIDTH_KEY] = STORED
    root['documentSettings'][DISPLAY_SCALE_KEY] = DISPLAY_SCALE
    await openByDrop(page, JSON.stringify(root))
    const panel = await page.locator('[data-role="Task Group Panel"]').boundingBox()
    expect(panel?.width ?? 0, 'premise: the panel is drawn at S-79 times the drawn ratio').toBeCloseTo(drawnAtPress, 2)
    const start = { x: Math.round((panel?.x ?? 0) + (panel?.width ?? 0)), y: Math.round((panel?.y ?? 0) + 300) }
    await pressMoveRelease(page, start, dx)
    const saved = Number((await readDocument(page)).documentSettings[PANEL_WIDTH_KEY])
    await context.close()
    return saved
  }

  const overDx = Math.ceil(floor - drawnAtPress)
  const over = drawnAtPress + overDx
  expect(over, 'premise: the release width is over the floor').toBeGreaterThan(floor)
  expect(Math.round(over), 'premise: rounded, the release width equals the rounded floor').toBe(Math.round(floor))
  expect(await release(overDx), `${FR_039_UNROUNDED} / ${FR_039_SAVED}`).toBeCloseTo(over / ratio, 2)

  expect(await release(overDx - 1), `premise: under the floor, ${FR_039_SAVED}`).toBeCloseTo(Math.min(STORED, floor / ratio), 2)
})

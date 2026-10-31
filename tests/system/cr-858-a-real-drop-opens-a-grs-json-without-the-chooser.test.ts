// CR-858 on the dev server with real browser drops (CDP Input.dispatchDragEvent): a dropped GRS JSON opens without the Open Chooser, an MSPDI drop keeps it (FR-087 T-024a OP-19, OP-4).
import { expect, test, type Page } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { VIEWPORT, answerConfirmation, enableAgentApi, readDocument, settle } from '../use-case/uc-harness'
import { taskGroupsDocument } from './w3-t1-stage'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const REQUIREMENTS = readFileSync(resolve('docs', 'spec', '01-04-requirements.md'), 'utf8').replace(/\r?\n/g, '')

const OP_19_OPENS_WITHOUT_CHOOSER =
  '人が `GRS JSON`（表 T-024 の `IO-2`）か単一の `.html`（`IO-7`）をウィンドウへドロップしたとき、`GRS` は、`Open Chooser`（`_assets/tbl-glossary.md` の `U-56`）を出さずに、`OP-3` の 3 択を置き換えに定めて開くこと（MUST）'
const OP_19_KEEPS_OP_4 = '`OP-4` の確認は掛かること（MUST）'

const OPEN_CHOOSER = '[data-role="Open Chooser"]'
const CONFIRMATION = '[data-role="Confirmation"]'
const CANVAS = '[data-role="Schedule Canvas"]'
const MSPDI_SAMPLE = resolve('docs', 'about', 'samples', 'sample-medium-sfa-webapp.en.xml')

// WHY: a page-built DataTransfer hands getAsFileSystemHandle() no handle (DFC-946); CDP drops the file the way a browser does.
/** @purity non-pure */
async function dropForReal(page: Page, path: string): Promise<void> {
  const box = await page.locator(CANVAS).boundingBox()
  if (box === null) throw new Error('the Schedule Canvas is not drawn')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  const cdp = await page.context().newCDPSession(page)
  const data = { items: [], files: [path], dragOperationsMask: 1 }
  for (const type of ['dragEnter', 'dragOver', 'drop'] as const) await cdp.send('Input.dispatchDragEvent', { type, x, y, data })
  await cdp.detach()
  await page.waitForTimeout(300)
  await settle(page)
}

/** @purity non-pure */
async function openDevServer(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForSelector(CANVAS)
  await settle(page)
  await enableAgentApi(page)
}

/** @purity non-pure */
function writtenFixture(path: string, rows: number): string {
  writeFileSync(path, taskGroupsDocument({ rows }), 'utf8')
  return path
}

/** @purity non-pure */
async function makeAnUnsavedEdit(page: Page): Promise<void> {
  const landed = await page.evaluate(() => {
    const api = (window as any).grSchedulerAgentApi
    const uid = api.readDocument().schedule.tasks[0]?.uid
    return api.applyCommands({ expectedStamp: api.readStamp(), commands: [{ kind: 'setTaskName', taskUid: uid, name: 'Edited here' }] }).ok
  })
  expect(landed, 'premise: the unsaved edit landed').toBe(true)
}

test('the clauses these cases drive are still in the manuscript', () => {
  expect(REQUIREMENTS).toContain(OP_19_OPENS_WITHOUT_CHOOSER)
  expect(REQUIREMENTS).toContain(OP_19_KEEPS_OP_4)
})

test('Given nothing is unsaved, When a person drops a GRS JSON, Then GRS opens it without the Open Chooser or a question', async ({ page }, info) => {
  await openDevServer(page)
  const dropped = writtenFixture(info.outputPath('cr-858-seven.json'), 7)
  await dropForReal(page, dropped)
  await expect(page.locator(OPEN_CHOOSER), OP_19_OPENS_WITHOUT_CHOOSER).toHaveCount(0)
  await expect(page.locator(CONFIRMATION), 'OP-19: nothing was unsaved, yet a question stood').toHaveCount(0)
  await expect.poll(async () => (await readDocument(page)).schedule.tasks.length, 'OP-19: the dropped GRS JSON did not open').toBe(7)
})

test('Given an unsaved edit, When a person drops a GRS JSON, Then GRS asks QN-5 once and opens it on proceed', async ({ page }, info) => {
  await openDevServer(page)
  await makeAnUnsavedEdit(page)
  const before = (await readDocument(page)).schedule.tasks.length
  await dropForReal(page, writtenFixture(info.outputPath('cr-858-five.json'), 5))
  await expect(page.locator(OPEN_CHOOSER), OP_19_OPENS_WITHOUT_CHOOSER).toHaveCount(0)
  await expect(page.locator(CONFIRMATION), OP_19_KEEPS_OP_4).toHaveCount(1)
  expect((await readDocument(page)).schedule.tasks.length, 'OP-4: the document changed before the answer').toBe(before)
  await answerConfirmation(page, 'proceed')
  await expect.poll(async () => (await readDocument(page)).schedule.tasks.length).toBe(5)
})

test('Given an unsaved edit, When a person drops a GRS JSON and cancels QN-5, Then GRS keeps the current document', async ({ page }, info) => {
  await openDevServer(page)
  await makeAnUnsavedEdit(page)
  const before = await readDocument(page)
  await dropForReal(page, writtenFixture(info.outputPath('cr-858-three.json'), 3))
  await expect(page.locator(CONFIRMATION), OP_19_KEEPS_OP_4).toHaveCount(1)
  await answerConfirmation(page, 'cancel')
  await expect(page.locator(OPEN_CHOOSER)).toHaveCount(0)
  const after = await readDocument(page)
  expect(after.schedule.tasks.length, 'OP-4: a cancel replaced the document').toBe(before.schedule.tasks.length)
  expect(after.schedule.tasks[0]?.name).toBe('Edited here')
})

test('Given any document, When a person drops an MSPDI XML, Then GRS raises the Open Chooser with its three choices', async ({ page }) => {
  await openDevServer(page)
  await dropForReal(page, MSPDI_SAMPLE)
  await expect(page.locator(OPEN_CHOOSER), 'OP-19: an MSPDI drop keeps the OP-3 choices').toHaveCount(1)
  for (const entry of ['IC-71', 'IC-72', 'IC-73']) await expect(page.locator(`${OPEN_CHOOSER} [data-icon="${entry}"]`)).toHaveCount(1)
})

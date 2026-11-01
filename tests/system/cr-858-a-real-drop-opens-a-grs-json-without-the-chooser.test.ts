// CR-858 on the dev server with real browser drops (CDP Input.dispatchDragEvent): one dropped file opens as a replace without the Open Chooser, several dropped files open none (FR-087 T-024a OP-19, OP-11, OP-4).
import { expect, test, type Page } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { HOST_STUB, VIEWPORT, answerConfirmation, enableAgentApi, openThroughIc1, readDocument, settle } from '../use-case/uc-harness'
import { taskGroupsDocument } from './w3-t1-stage'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const REQUIREMENTS = readFileSync(resolve('docs', 'spec', '01-04-requirements.md'), 'utf8').replace(/\r?\n/g, '')

const OP_19_OPENS_WITHOUT_CHOOSER =
  '人がファイルを 1 つウィンドウへドロップしたとき、`GRS` は、`Open Chooser`（`_assets/tbl-glossary.md` の `U-56`）を出さずに、`OP-3` の 3 択を置き換えに定めて開くこと（MUST）'
const OP_19_KEEPS_OP_4 = '`OP-4` の確認は掛かること（MUST）'
const OP_11_SEVERAL_OPEN_NONE =
  '人が 2 つ以上のファイルを同時にウィンドウへドロップしたとき、`GRS` は、どのファイルも開かずに断り、現在の文書を変えないこと（MUST）'
const WORDS = JSON.parse(readFileSync(resolve('docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  readonly reasons: readonly { readonly rowId: string; readonly text: { readonly ja: string; readonly en: string } }[]
}
const RS_14_EN = WORDS.reasons.find((one) => one.rowId === 'RS-14')?.text.en ?? ''

const OPEN_CHOOSER = '[data-role="Open Chooser"]'
const CONFIRMATION = '[data-role="Confirmation"]'
const CANVAS = '[data-role="Schedule Canvas"]'
const NOTICES = '[data-role="Notification Area"]'
const MSPDI_SAMPLE = resolve('docs', 'about', 'samples', 'sample-medium-sfa-webapp.en.xml')

// WHY: a page-built DataTransfer hands getAsFileSystemHandle() no handle (DFC-946); CDP drops the file the way a browser does.
/** @purity non-pure */
async function dropForReal(page: Page, ...paths: readonly string[]): Promise<void> {
  const box = await page.locator(CANVAS).boundingBox()
  if (box === null) throw new Error('the Schedule Canvas is not drawn')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  const cdp = await page.context().newCDPSession(page)
  const data = { items: [], files: [...paths], dragOperationsMask: 1 }
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

// WHY: the open route reads the one embedded-document container of a .html (FR-067), so a hand-built page stands in for an exported one.
/** @purity non-pure */
function writtenHtmlFixture(path: string, rows: number): string {
  const html =
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>GRS</title></head><body><div id="app"></div>' +
    `<script type="application/json" id="embedded-document">${taskGroupsDocument({ rows })}</script></body></html>
`
  writeFileSync(path, html, 'utf8')
  return path
}

/** @purity semi-pure-b */
const readStamp = (page: Page): Promise<unknown> => page.evaluate(() => (window as any).grSchedulerAgentApi.readStamp())

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
  expect(REQUIREMENTS).toContain(OP_11_SEVERAL_OPEN_NONE)
  expect(RS_14_EN, 'the dictionary holds the RS-14 words').not.toBe('')
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

test('Given nothing is unsaved, When a person drops an MSPDI XML, Then GRS opens it without the Open Chooser', async ({ page }) => {
  await openDevServer(page)
  const before = (await readDocument(page)).schedule.tasks.length
  await dropForReal(page, MSPDI_SAMPLE)
  await expect(page.locator(OPEN_CHOOSER), OP_19_OPENS_WITHOUT_CHOOSER).toHaveCount(0)
  await expect.poll(async () => (await readDocument(page)).schedule.tasks.length, 'OP-19: the dropped MSPDI did not open').not.toBe(before)
})

// WHY: OP-11 refuses every several-file drop, so neither order lets its first file decide (JDG-3584 overturned the first-file rule).
for (const order of ['GRS JSON first', 'MSPDI first'] as const) {
  test(`Given any document, When a person drops a GRS JSON and an MSPDI XML at once (${order}), Then GRS opens neither and tells RS-14`, async ({ page }, info) => {
    await openDevServer(page)
    const before = await readDocument(page)
    const json = writtenFixture(info.outputPath('cr-858-pair.json'), 2)
    const paths = order === 'GRS JSON first' ? [json, MSPDI_SAMPLE] : [MSPDI_SAMPLE, json]
    await dropForReal(page, ...paths)
    await expect(page.locator(OPEN_CHOOSER)).toHaveCount(0)
    await expect(page.locator(CONFIRMATION)).toHaveCount(0)
    await expect(page.locator(NOTICES), OP_11_SEVERAL_OPEN_NONE).toContainText(RS_14_EN)
    // WHY: the next step of RS-14 is the owner's own wording (JDG-3585), so it is held letter for letter.
    await expect(page.locator(NOTICES), 'RS-14 next step (JDG-3585)').toContainText('Drop one file at a time.')
    expect((await readDocument(page)).schedule.tasks.length, OP_11_SEVERAL_OPEN_NONE).toBe(before.schedule.tasks.length)
  })
}

test('Given an unsaved edit, When a person drops two files at once, Then GRS opens neither, asks nothing, keeps the edit and tells RS-14', async ({ page }, info) => {
  await openDevServer(page)
  await makeAnUnsavedEdit(page)
  const stamp = await readStamp(page)
  await dropForReal(page, writtenFixture(info.outputPath('cr-858-edited-one.json'), 2), MSPDI_SAMPLE)
  await expect(page.locator(OPEN_CHOOSER)).toHaveCount(0)
  await expect(page.locator(CONFIRMATION), 'OP-11: QN-5 was asked for a drop that opens nothing').toHaveCount(0)
  await expect(page.locator(NOTICES), OP_11_SEVERAL_OPEN_NONE).toContainText(RS_14_EN)
  expect((await readDocument(page)).schedule.tasks[0]?.name, OP_11_SEVERAL_OPEN_NONE).toBe('Edited here')
  expect(await readStamp(page), 'OP-11: the unsaved document moved').toEqual(stamp)
})

// WHY: OP-19 holds for every format, so MSPDI takes the same OP-4 question as GRS JSON.
test('Given an unsaved edit, When a person drops an MSPDI XML, Then GRS asks QN-5 once and opens it on proceed', async ({ page }) => {
  await openDevServer(page)
  await makeAnUnsavedEdit(page)
  const before = (await readDocument(page)).schedule.tasks.length
  await dropForReal(page, MSPDI_SAMPLE)
  await expect(page.locator(OPEN_CHOOSER), OP_19_OPENS_WITHOUT_CHOOSER).toHaveCount(0)
  await expect(page.locator(CONFIRMATION), OP_19_KEEPS_OP_4).toHaveCount(1)
  expect((await readDocument(page)).schedule.tasks.length, 'OP-4: the document changed before the answer').toBe(before)
  await answerConfirmation(page, 'proceed')
  await expect(page.locator(CONFIRMATION), 'OP-4: QN-5 was asked more than once').toHaveCount(0)
  await expect.poll(async () => (await readDocument(page)).schedule.tasks.length, 'OP-19: the dropped MSPDI did not open').not.toBe(before)
})

test('Given an unsaved edit, When a person drops an MSPDI XML and cancels QN-5, Then GRS keeps the current document', async ({ page }) => {
  await openDevServer(page)
  await makeAnUnsavedEdit(page)
  const before = await readDocument(page)
  await dropForReal(page, MSPDI_SAMPLE)
  await expect(page.locator(CONFIRMATION), OP_19_KEEPS_OP_4).toHaveCount(1)
  await answerConfirmation(page, 'cancel')
  await expect(page.locator(OPEN_CHOOSER)).toHaveCount(0)
  await expect(page.locator(CONFIRMATION)).toHaveCount(0)
  const after = await readDocument(page)
  expect(after.schedule.tasks.length, 'OP-4: a cancel replaced the document').toBe(before.schedule.tasks.length)
  expect(after.schedule.tasks[0]?.name).toBe('Edited here')
})

test('Given nothing is unsaved, When a person drops a single .html, Then GRS opens its document without the Open Chooser', async ({ page }, info) => {
  await openDevServer(page)
  await dropForReal(page, writtenHtmlFixture(info.outputPath('cr-858-six.html'), 6))
  await expect(page.locator(OPEN_CHOOSER), OP_19_OPENS_WITHOUT_CHOOSER).toHaveCount(0)
  await expect(page.locator(CONFIRMATION)).toHaveCount(0)
  await expect.poll(async () => (await readDocument(page)).schedule.tasks.length, 'OP-19: the dropped .html did not open').toBe(6)
})

test('Given an unsaved edit, When a person drops a single .html, Then GRS asks QN-5 once and opens it on proceed', async ({ page }, info) => {
  await openDevServer(page)
  await makeAnUnsavedEdit(page)
  const before = (await readDocument(page)).schedule.tasks.length
  await dropForReal(page, writtenHtmlFixture(info.outputPath('cr-858-four.html'), 4))
  await expect(page.locator(OPEN_CHOOSER), OP_19_OPENS_WITHOUT_CHOOSER).toHaveCount(0)
  await expect(page.locator(CONFIRMATION), OP_19_KEEPS_OP_4).toHaveCount(1)
  expect((await readDocument(page)).schedule.tasks.length, 'OP-4: the document changed before the answer').toBe(before)
  await answerConfirmation(page, 'proceed')
  await expect(page.locator(CONFIRMATION), 'OP-4: QN-5 was asked more than once').toHaveCount(0)
  await expect.poll(async () => (await readDocument(page)).schedule.tasks.length).toBe(4)
})

test('Given an unsaved edit, When a person drops a single .html and cancels QN-5, Then GRS keeps the current document', async ({ page }, info) => {
  await openDevServer(page)
  await makeAnUnsavedEdit(page)
  const before = await readDocument(page)
  await dropForReal(page, writtenHtmlFixture(info.outputPath('cr-858-kept.html'), 4))
  await expect(page.locator(CONFIRMATION), OP_19_KEEPS_OP_4).toHaveCount(1)
  await answerConfirmation(page, 'cancel')
  await expect(page.locator(OPEN_CHOOSER)).toHaveCount(0)
  const after = await readDocument(page)
  expect(after.schedule.tasks.length, 'OP-4: a cancel replaced the document').toBe(before.schedule.tasks.length)
  expect(after.schedule.tasks[0]?.name).toBe('Edited here')
})

// WHY: a headless browser has no file picker, so the host stub hands IC-1 the next file as a person's pick would.
for (const name of ['cr-858-picked.json', 'sample-medium-sfa-webapp.en.xml'] as const) {
  test(`Given any document, When a person picks ${name} in the file dialog, Then GRS raises the Open Chooser with its three choices`, async ({ page }) => {
    await page.addInitScript(HOST_STUB)
    await openDevServer(page)
    const text = name.endsWith('.json') ? taskGroupsDocument({ rows: 3 }) : readFileSync(MSPDI_SAMPLE, 'utf8')
    await openThroughIc1(page, name, text, null)
    await expect(page.locator(OPEN_CHOOSER), 'OP-19: the file dialog keeps the OP-3 choices').toHaveCount(1)
    for (const entry of ['IC-71', 'IC-72', 'IC-73']) await expect(page.locator(`${OPEN_CHOOSER} [data-icon="${entry}"]`)).toHaveCount(1)
  })
}

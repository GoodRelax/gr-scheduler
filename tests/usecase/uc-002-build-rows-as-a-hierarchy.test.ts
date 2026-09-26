// Use-case test for UC-002 (build rows as a hierarchy), table T-334 row VT-1.
import { expect, test, type Page } from '@playwright/test'
import { VIEWPORT, enableAgentApi, launch, openByDrop, press, pressRowControl, readDocument, readSample, revealRow, rowSelector, savedFiles, settle, specMismatch } from './uc-harness'

test.use({ viewport: VIEWPORT })

const ERP = 'sample-large-erp-program.ja.xml'
const PROGRAM_MANAGEMENT = '00000000-0000-4000-8000-000000000001'
const PROGRAM_PLANNING = '00000000-0000-4000-8000-000000000010'
const TECHNICAL_BASE = '00000000-0000-4000-8000-00000000001c'

const drawnRowIds = (page: Page): Promise<string[]> =>
  page.evaluate(() => [...document.querySelectorAll('[data-role="Row Title Tree"] [data-group-id]')].map((r) => r.getAttribute('data-group-id') ?? ''))

const grabRowRight = async (page: Page, groupId: string, dx: number): Promise<void> => {
  const grip = (await page.locator(rowSelector(groupId) + ' [data-row-grab]').boundingBox())!
  const x = grip.x + grip.width / 2
  const y = grip.y + grip.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(x + (dx * i) / 10, y)
  await page.mouse.up()
  await settle(page)
}

test('UC-002 build rows as a hierarchy (FR-085, FR-042, FR-005 HM-1 HM-2, T-015 HR-4 HR-6, HF-15)', async ({ page }) => {
  test.setTimeout(120000)
  specMismatch('UC-002 step 3 / T-015a HM-1: moving a derived row under another row leaves Task.wbsParentUid of its task unchanged')
  await launch(page)
  await enableAgentApi(page)
  await openByDrop(page, ERP, readSample(ERP))

  let madeId = ''
  await test.step('UC-002 step 1: make a TaskGroup, name it, set its colour and height (FR-085, HF-17, FR-042)', async () => {
    const before = (await readDocument(page)).schedule.taskGroups.map((g) => g.id)
    await press(page, 'IC-93')
    const made = (await readDocument(page)).schedule.taskGroups.find((g) => !before.includes(g.id))!
    madeId = made.id
    expect(made.parentId).toBeNull()
    await expect(page.locator('[data-role="Properties Panel"] textarea[data-field-row="AT-53"]')).toBeFocused()
    await page.keyboard.type('Review board')
    await page.keyboard.press('Enter')
    await settle(page)
    await page.click('[data-role="Properties Panel"] [data-colour-choice="green"]')
    await settle(page)
    await page.fill('[data-role="Properties Panel"] input[data-field-row="PR-20"]', '60')
    await page.keyboard.press('Enter')
    await settle(page)
    const named = (await readDocument(page)).schedule.taskGroups.find((g) => g.id === madeId)!
    expect(named.label).toBe('Review board')
    expect(named.color).toBe('green')
    expect(named.height).toBe(60)
    await expect(page.locator(rowSelector(madeId) + ' > span')).toHaveText('Review board')
  })

  await test.step('UC-002 step 2: move a TaskGroup under another TaskGroup by its grab band (HF-15, GR-20)', async () => {
    await press(page, 'IC-10')
    await grabRowRight(page, TECHNICAL_BASE, 25)
  })

  await test.step('UC-002 step 3: the hierarchy is rebuilt and reaches the WBS, keeping the UID (FR-005 HM-1, HM-2)', async () => {
    const doc = await readDocument(page)
    const moved = doc.schedule.taskGroups.find((g) => g.id === TECHNICAL_BASE)!
    const parent = doc.schedule.taskGroups.find((g) => g.id === PROGRAM_PLANNING)!
    expect(moved.parentId).toBe(PROGRAM_PLANNING)
    const task = doc.schedule.tasks.find((t) => t.uid === moved.derivedFromTaskUid)
    expect(task).toBeDefined()
    expect.soft(task!.wbsParentUid).toBe(parent.derivedFromTaskUid)
  })

  await test.step('UC-002 step 4: fold one level of the tree and hide a row (IC-58, IC-77, IC-59)', async () => {
    await pressRowControl(page, madeId, 'IC-59')
    await pressRowControl(page, PROGRAM_MANAGEMENT, 'IC-58')
    const children = (await readDocument(page)).schedule.taskGroups.filter((g) => g.parentId === PROGRAM_MANAGEMENT).map((g) => g.id)
    expect(children.length).toBeGreaterThan(0)
    expect(await drawnRowIds(page)).toEqual(expect.arrayContaining(children))
    await pressRowControl(page, PROGRAM_MANAGEMENT, 'IC-77')
  })

  await test.step('UC-002 step 5: rows under the fold are not drawn and a hidden row can be brought back (HR-4, HR-1a, HR-6, HF-16)', async () => {
    const doc = await readDocument(page)
    expect(doc.schedule.taskGroups.find((g) => g.id === PROGRAM_MANAGEMENT)!.treeState).toBe('collapsed')
    const children = doc.schedule.taskGroups.filter((g) => g.parentId === PROGRAM_MANAGEMENT).map((g) => g.id)
    const drawn = await drawnRowIds(page)
    expect(drawn).toContain(PROGRAM_MANAGEMENT)
    for (const child of children) expect(drawn).not.toContain(child)
    expect(doc.schedule.taskGroups.find((g) => g.id === madeId)!.treeState).toBe('hidden')
    expect(drawn).not.toContain(madeId)
    await press(page, 'IC-92')
    expect((await readDocument(page)).schedule.taskGroups.find((g) => g.id === madeId)!.treeState).not.toBe('hidden')
    await revealRow(page, madeId)
    await expect(page.locator(rowSelector(madeId))).toHaveCount(1)
  })

  await test.step('UC-002 step 5 kept over a save: the fold survives saving and reopening (FR-024, IO-2)', async () => {
    await press(page, 'IC-2')
    await page.click('[data-role="Export Chooser"] [data-format="IO-2"]')
    await expect.poll(async () => (await savedFiles(page)).length).toBe(1)
    const saved = (await savedFiles(page))[0]!
    await openByDrop(page, saved.name, saved.text)
    const doc = await readDocument(page)
    expect(doc.schedule.taskGroups.find((g) => g.id === PROGRAM_MANAGEMENT)!.treeState).toBe('collapsed')
    const drawn = await drawnRowIds(page)
    for (const child of doc.schedule.taskGroups.filter((g) => g.parentId === PROGRAM_MANAGEMENT)) expect(drawn).not.toContain(child.id)
    expect(doc.schedule.taskGroups.find((g) => g.id === TECHNICAL_BASE)!.parentId).toBe(PROGRAM_PLANNING)
  })
})

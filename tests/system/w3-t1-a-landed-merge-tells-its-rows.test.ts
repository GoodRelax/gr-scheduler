// W3 spec-only cases on the shipped build: FR-022 table MG-14 -- a landed merge tells what it overwrote (RS-71), kept (RS-72) and missed (RS-73).

import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { unbroken } from '../contract/spec-table'
import { reasonWords } from './cr-570-tree-state-stage'
import { VIEWPORT, dropFile, enableAgentApi, icon, launch, openByDrop, settle } from '../usecase/uc-harness'
import { taskGroupsDocument } from './w3-t1-stage'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: the constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const MG_14 = '| MG-14 | 合流が着地した | 上書きしたもの・残したもの・届かなかったものを、表 T-233 の行で告げること（MUST）'

const REVIEW = '[data-role="Difference Review"]'
const NOTICES = '[data-role="Notification Area"]'
const IMPORT_REPORT = '[data-role="Import Report"]'

/** @purity non-pure */
async function mergeByDrop(page: Page, name: string, text: string): Promise<void> {
  await dropFile(page, name, text)
  await page.click(icon('IC-72', '[data-role="Open Chooser"]'))
  await settle(page)
}

/** @purity semi-pure-b */
async function toldText(page: Page): Promise<string> {
  return page.evaluate(
    (selectors: readonly string[]) => selectors.map((one) => document.querySelector(one)?.textContent ?? '').join(' | '),
    [NOTICES, IMPORT_REPORT],
  )
}

/** @purity pure */
function tells(said: string, rowId: string): boolean {
  return reasonWords(rowId).some((words) => said.includes(words))
}

test.describe('W3-T1 the manuscript this case is driven by', () => {
  test('MG-14 still reads this way', () => {
    expect(REQUIREMENTS).toContain(MG_14)
  })
})

test.describe(`MG-14 (MUST): ${MG_14.slice(-40)}`, () => {
  test.setTimeout(180_000)

  test('a GRS JSON merge that overwrites task 2 and lacks task 3 tells RS-71 and RS-72', async ({ page }) => {
    await launch(page)
    await enableAgentApi(page)
    await openByDrop(page, 'w3-t1-current.json', taskGroupsDocument({ rows: 3 }))
    const renamed = await page.evaluate(() => {
      const api = (window as any).grSchedulerAgentApi
      return api.applyCommands({ readStamp: api.readStamp(), commands: [{ kind: 'setTaskName', uid: 2, name: 'Changed here' }] }).accepted
    })
    expect(renamed, 'premise: task 2 differs from the incoming file').toBe(true)
    await mergeByDrop(page, 'w3-t1-incoming.json', taskGroupsDocument({ rows: 2 }))
    await expect(page.locator(REVIEW), 'premise: the Difference Review asks about task 2').toHaveCount(1)
    await page.click(icon('IC-95', REVIEW))
    await settle(page)
    const said = await toldText(page)
    expect(tells(said, 'RS-71'), `RS-71 (overwritten) is told; said: ${said}`).toBe(true)
    expect(tells(said, 'RS-72'), `RS-72 (kept, not in the file) is told; said: ${said}`).toBe(true)
  })

  test('a second merge that no longer carries task 3 tells RS-73 with its name', async ({ page }) => {
    await launch(page)
    await enableAgentApi(page)
    await openByDrop(page, 'w3-t1-current.json', taskGroupsDocument({ rows: 3 }))
    await mergeByDrop(page, 'w3-t1-first.json', taskGroupsDocument({ rows: 3 }))
    if (await page.locator(REVIEW).count()) {
      await page.click(icon('IC-95', REVIEW))
      await settle(page)
    }
    await page.keyboard.press('Escape')
    await settle(page)
    await mergeByDrop(page, 'w3-t1-second.json', taskGroupsDocument({ rows: 2 }))
    if (await page.locator(REVIEW).count()) {
      await page.click(icon('IC-95', REVIEW))
      await settle(page)
    }
    const said = await toldText(page)
    expect(tells(said, 'RS-73'), `RS-73 (came last time, not this time) is told; said: ${said}`).toBe(true)
    expect(said, 'the missing task is named').toContain('Task 03')
  })
})

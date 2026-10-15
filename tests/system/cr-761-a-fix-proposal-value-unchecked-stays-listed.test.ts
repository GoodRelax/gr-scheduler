// CR-761 on a built app: one value of the fix proposals' filter unchecked by its drawn check box stays listed (SV-7, T-374).

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { bare, specTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg } from './live-app'
import { BASE_SCREEN, openDocument, pressEntrance, settle } from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'
import { taskGroupsDocument } from './w3-t1-stage'

// WHY: the committed dist can lag the code under test; GRS_CR761_BUILD names a fresh build of the current src.
const BUILD = process.env['GRS_CR761_BUILD'] ?? join(process.cwd(), 'dist', 'index.html')

const REPORT = `[data-role="${bare(rowOf(specTable('T-103'), 'U-66').cells[0] ?? '')}"]`
const PROPOSALS = '[data-role="Delay Fix Proposals"]'
const MENU = '[data-search-filter-menu]'
const TASK_COLUMN = 'FM-5'
const METHOD_COLUMN = 'FM-3'

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

// WHY: a parent whose span differs from its children, and a started successor of an unfinished task, so the
// proposals hold rows of several tasks and several fix methods.
/** @purity pure */
function proposingDocument(): string {
  const base = JSON.parse(taskGroupsDocument({ rows: 5, parentTaskOf: { 2: 1, 3: 1 } })) as {
    schedule: { project: { statusDate: string | null }; tasks: Record<string, unknown>[] }
  }
  base.schedule.project.statusDate = '2027-05-01T00:00:00'
  const dated: Record<number, readonly [string, string, string | null]> = {
    1: ['2027-05-10', '2027-05-21', null],
    2: ['2027-05-10', '2027-05-14', null],
    3: ['2027-05-17', '2027-05-26', null],
    4: ['2027-04-05', '2027-04-09', '2027-04-05'],
    5: ['2027-04-12', '2027-04-16', '2027-04-14'],
  }
  for (const task of base.schedule.tasks) {
    const uid = task['uid'] as number
    const [start, finish, actualStart] = dated[uid] ?? ['2027-05-10', '2027-05-10', null]
    task['start'] = `${start}T08:00:00`
    task['finish'] = `${finish}T17:00:00`
    if (actualStart !== null) {
      task['actualStart'] = `${actualStart}T08:00:00`
      task['percentComplete'] = 30
    }
    task['dependencies'] = uid === 5 ? [{ predecessorUid: 4, linkType: 1, lag: null, lagFormat: null, carry: {}, carryElements: [] }] : []
  }
  return JSON.stringify(base)
}

// WHY: the stand-in file picker of the shared stage, over the build this case names instead of the committed one.
/** @purity non-pure */
async function openBuild(): Promise<{ page: Page; close(): Promise<void> }> {
  if (browser === null) throw new Error('no browser')
  if (!existsSync(BUILD)) throw new Error('no build at GRS_CR761_BUILD or dist/index.html')
  const context = await browser.newContext({ viewport: BASE_SCREEN })
  await context.addInitScript(() => {
    const held = { next: { name: '', text: '' }, written: [] as string[] }
    ;(window as unknown as Record<string, unknown>)['grsCr570'] = held
    ;(window as unknown as Record<string, unknown>)['showOpenFilePicker'] = async () => [
      {
        kind: 'file',
        name: held.next.name,
        getFile: async () => new File([held.next.text], held.next.name),
        queryPermission: async () => 'granted',
        requestPermission: async () => 'granted',
        isSameEntry: async () => false,
      },
    ]
  })
  const page = await context.newPage()
  await page.goto(pathToFileURL(BUILD).href)
  await readSettledDrawnSvg(page)
  return { page, close: async () => context.close() }
}

/** @purity non-pure */
async function pressSelector(page: Page, selector: string): Promise<void> {
  const box = await page.locator(selector).first().boundingBox()
  expect(box, `${selector} is drawn`).not.toBeNull()
  if (box === null) return
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.up()
  await settle(page)
}

interface Mark {
  readonly value: string
  readonly label: string
  readonly checked: boolean
}

/** @purity semi-pure-b */
async function marksOf(page: Page): Promise<readonly Mark[]> {
  return page.evaluate((menu: string) => {
    return Array.from(document.querySelectorAll<HTMLInputElement>(`${menu} input[type="checkbox"]`)).map((mark) => ({
      value: mark.getAttribute('data-search-filter-value') ?? '',
      label: (mark.closest('label')?.textContent ?? '').trim(),
      checked: mark.checked,
    }))
  }, `${REPORT} ${MENU}`)
}

/** @purity semi-pure-b */
async function proposalRows(page: Page): Promise<number> {
  return page.evaluate((selector: string) => document.querySelectorAll(`${selector} tbody tr`).length, PROPOSALS)
}

/** @purity non-pure */
async function openFilter(page: Page, column: string): Promise<readonly Mark[]> {
  await pressSelector(page, `${REPORT} thead th[data-column="${column}"] [data-icon="IC-122"]`)
  return marksOf(page)
}

/** @purity non-pure */
async function closeFilter(page: Page, column: string): Promise<void> {
  await pressSelector(page, `${REPORT} thead th[data-column="${column}"] [data-icon="IC-122"]`)
}

test('SV-7 / T-374: a task unchecked in the fix proposals stays listed unchecked, other lists keep its values, and it checks back', async () => {
  const stage = await openBuild()
  const page = stage.page
  try {
    await openDocument(page, 'cr-761.json', proposingDocument())
    expect(await pressEntrance(page, 'IC-107'), 'IC-107 is on the screen').toBe(true)
    expect(await pressEntrance(page, 'IC-155'), 'IC-155 is on the screen').toBe(true)
    const rows = await proposalRows(page)
    const methods = (await openFilter(page, METHOD_COLUMN)).map((one) => one.label)
    await closeFilter(page, METHOD_COLUMN)
    const tasks = await openFilter(page, TASK_COLUMN)
    expect(tasks.length, 'premise: the proposals name two tasks or more').toBeGreaterThan(1)
    const first = tasks[0] as Mark
    // STEP: uncheck the first task by its drawn check box
    await pressSelector(page, `${REPORT} ${MENU} input[type="checkbox"][data-search-filter-value="${first.value}"]`)
    expect(await proposalRows(page), 'the table drops the rows of the task').toBeLessThan(rows)
    const after = await marksOf(page)
    expect(after.map((one) => one.label)).toEqual(tasks.map((one) => one.label))
    expect(after.filter((one) => !one.checked).map((one) => one.label)).toEqual([first.label])
    await closeFilter(page, TASK_COLUMN)
    expect((await openFilter(page, METHOD_COLUMN)).map((one) => one.label), 'answer A: the removed rows still give their values').toEqual(methods)
    await closeFilter(page, METHOD_COLUMN)
    await openFilter(page, TASK_COLUMN)
    // STEP: check the same task again
    await pressSelector(page, `${REPORT} ${MENU} input[type="checkbox"][data-search-filter-value="${first.value}"]`)
    expect(await proposalRows(page)).toBe(rows)
    expect((await marksOf(page)).every((one) => one.checked)).toBe(true)
  } finally {
    await stage.close()
  }
})

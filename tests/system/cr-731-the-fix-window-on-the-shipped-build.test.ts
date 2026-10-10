// CR-731 on the shipped build: the boxes, the choice and the date of the proposal, pressed as a person presses them (RW-16, FA-1, FA-24, UN-21).

import { expect, test, type Browser, type Page } from '@playwright/test'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import { keyOf, openDocument, openStage, pressEntrance, settle, type Stage } from './cr-570-tree-state-stage'
import { readDocumentOf, taskGroupsDocument } from './w3-t1-stage'

const DIAGNOSE = 'IC-107'
const SHOW_PROPOSALS = 'IC-155'
const OVERWRITE_AND_FIX = 'IC-157'
const PROPOSALS = '[data-role="Delay Fix Proposals"]'
const FOOTER = '[data-role="Delay Fix Footer"]'

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

interface Dated {
  readonly start: string
  readonly finish: string
  readonly actualStart?: string
}

const link = (predecessorUid: number, linkType = 1): unknown => ({ predecessorUid, linkType, lag: null, lagFormat: null, carry: {}, carryElements: [] })

/** @purity pure */
function documentWith(rows: number, parentTaskOf: Record<number, number>, dates: Record<number, Dated>, links: Record<number, readonly unknown[]>, statusDate: string): string {
  const base = JSON.parse(taskGroupsDocument({ rows, parentTaskOf })) as { schedule: { project: { statusDate: string | null }; tasks: Record<string, unknown>[] } }
  base.schedule.project.statusDate = statusDate
  for (const task of base.schedule.tasks) {
    const uid = task['uid'] as number
    const given = dates[uid]
    if (given === undefined) continue
    task['start'] = `${given.start}T08:00:00`
    task['finish'] = `${given.finish}T17:00:00`
    if (given.actualStart !== undefined) {
      task['actualStart'] = `${given.actualStart}T08:00:00`
      task['percentComplete'] = 30
    }
    task['dependencies'] = links[uid] ?? []
  }
  return JSON.stringify(base)
}

const CHAIN = (): string =>
  documentWith(
    5,
    { 2: 1, 3: 2, 4: 2, 5: 1 },
    {
      1: { start: '2027-05-10', finish: '2027-05-21' },
      2: { start: '2027-05-10', finish: '2027-05-21' },
      3: { start: '2027-05-10', finish: '2027-05-14' },
      4: { start: '2027-05-17', finish: '2027-05-26' },
      5: { start: '2027-05-10', finish: '2027-05-12' },
    },
    {},
    '2027-05-01T00:00:00',
  )

const LOOP = (): string =>
  documentWith(
    3,
    {},
    { 1: { start: '2027-05-10', finish: '2027-05-11' }, 2: { start: '2027-05-12', finish: '2027-05-13' }, 3: { start: '2027-05-14', finish: '2027-05-17' } },
    { 1: [link(3)], 2: [link(1)], 3: [link(2)] },
    '2027-05-01T00:00:00',
  )

const STARTED_SUCCESSOR = (): string =>
  documentWith(
    2,
    {},
    {
      1: { start: '2027-05-10', finish: '2027-05-14', actualStart: '2027-05-10' },
      2: { start: '2027-05-17', finish: '2027-05-21', actualStart: '2027-05-28' },
    },
    { 2: [link(1)] },
    '2027-05-31T17:00:00',
  )

/** @purity non-pure */
async function proposalsOver(text: string): Promise<Stage> {
  if (browser === null) throw new Error('no browser')
  const opened = await openStage(browser)
  await openDocument(opened.page, 'cr-731.json', text)
  expect(await pressEntrance(opened.page, DIAGNOSE), 'IC-107 is on the screen').toBe(true)
  expect(await pressEntrance(opened.page, SHOW_PROPOSALS), 'IC-155 is on the screen').toBe(true)
  return opened
}

/** @purity semi-pure-b */
async function checkedCount(page: Page): Promise<{ checked: boolean; disabled: boolean }[]> {
  return page.evaluate((selector: string) => {
    const boxes = Array.from(document.querySelectorAll(`${selector} input[type="checkbox"]`)) as HTMLInputElement[]
    return boxes.map((one) => ({ checked: one.checked, disabled: one.disabled }))
  }, PROPOSALS)
}

/** @purity semi-pure-b */
async function footerText(page: Page): Promise<string> {
  return page.evaluate((selector: string) => document.querySelector(selector)?.textContent ?? '', FOOTER)
}

/** @purity non-pure */
async function writtenCount(page: Page): Promise<number> {
  return page.evaluate(() => ((window as unknown as Record<string, { written: string[] }>)['grsCr570'] as { written: string[] }).written.length)
}

/** @purity semi-pure-b */
async function dependencyCount(page: Page): Promise<number> {
  const document = await readDocumentOf(page)
  return (document.schedule.tasks as { dependencies: unknown[] }[]).reduce((sum, one) => sum + one.dependencies.length, 0)
}

test.describe('item 2 -- RW-16: the chain row follows the box of the row it follows', () => {
  test('unchecking the source row unchecks and disables the chain row, and checking it again brings the chain row back', async () => {
    const { page, close } = await proposalsOver(CHAIN())
    try {
      const before = await checkedCount(page)
      expect(before.length, 'FA-11 on the middle parent and on the root after it').toBe(2)
      expect(before.every((one) => one.checked && !one.disabled)).toBe(true)
      await page.locator(`${PROPOSALS} input[type="checkbox"]`).first().click()
      await settle(page)
      expect(await checkedCount(page)).toEqual([
        { checked: false, disabled: false },
        { checked: false, disabled: true },
      ])
      await page.locator(`${PROPOSALS} input[type="checkbox"]`).first().click()
      await settle(page)
      expect(await checkedCount(page)).toEqual(before)
    } finally {
      await close()
    }
  })

  test('the strip counts the checked rows: 2, then 0, then 2', async () => {
    const { page, close } = await proposalsOver(CHAIN())
    try {
      expect(await footerText(page)).toMatch(/\b2\b/)
      await page.locator(`${PROPOSALS} input[type="checkbox"]`).first().click()
      await settle(page)
      expect(await footerText(page)).toMatch(/\b0\b/)
      await page.locator(`${PROPOSALS} input[type="checkbox"]`).first().click()
      await settle(page)
      expect(await footerText(page)).toMatch(/\b2\b/)
    } finally {
      await close()
    }
  })
})

test.describe('item 4 -- FA-1: a loop of three lines waits for a choice, and the choice checks the row', () => {
  test('before the choice no row is checked; choosing a line checks it; IC-157 then deletes that line and nothing else', async () => {
    const { page, close } = await proposalsOver(LOOP())
    try {
      const choices = page.locator(`${PROPOSALS} select`)
      expect(await choices.count(), 'one choice for each row of the loop').toBeGreaterThan(0)
      expect((await checkedCount(page)).some((one) => one.checked), 'nothing is checked until a choice').toBe(false)
      await choices.first().selectOption({ index: 1 })
      await settle(page)
      expect((await checkedCount(page)).filter((one) => one.checked), 'the chosen row is checked').toHaveLength(1)
      const before = await dependencyCount(page)
      const written = await writtenCount(page)
      expect(await pressEntrance(page, OVERWRITE_AND_FIX)).toBe(true)
      await settle(page)
      expect(await writtenCount(page), 'the file is written first').toBe(written + 1)
      expect(await dependencyCount(page), 'one line is gone').toBe(before - 1)
    } finally {
      await close()
    }
  })
})

test.describe('item 5 -- FA-24: a suggested date waits for the box, and one undo takes it back', () => {
  test('the box is empty at first; checked, IC-157 puts 2027-05-28 on the predecessor; one undo empties it again', async () => {
    const { page, close } = await proposalsOver(STARTED_SUCCESSOR())
    try {
      const boxes = page.locator(`${PROPOSALS} input[type="checkbox"]`)
      expect((await checkedCount(page)).some((one) => one.checked), 'no suggested date is checked at first').toBe(false)
      await boxes.first().click()
      await settle(page)
      expect(await pressEntrance(page, OVERWRITE_AND_FIX)).toBe(true)
      await settle(page)
      const mended = await readDocumentOf(page)
      const task = (mended.schedule.tasks as { uid: number; actualFinish: string | null }[]).find((one) => one.uid === 1)
      expect(task?.actualFinish?.slice(0, 10)).toBe('2027-05-28')
      await page.keyboard.press(keyOf('SK-6'))
      await settle(page)
      const undone = await readDocumentOf(page)
      expect((undone.schedule.tasks as { uid: number; actualFinish: string | null }[]).find((one) => one.uid === 1)?.actualFinish).toBeNull()
    } finally {
      await close()
    }
  })
})

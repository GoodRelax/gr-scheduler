// W3 spec-only cases on the shipped build: T-351 WBS parent hands and field, FR-075 grab colours, trailing look rows, the FX-5 field.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { colourOf } from '../../src/adapter/svg-renderer/svg-renderer'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import { openDocument, openStage, pressEntrance, reasonWords, settle, type Stage } from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'
import { applyCommandsOf, readDocumentOf, rowsDocument } from './w3-t1-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const FR_135_FIELD = 'プロパティパネルの WBS の親の欄の出し方と、押したときの動きは、表 T-351 の `WL-15` 〜 `WL-17` に従うこと（MUST）'
const FR_135_HANDS = '—— 候補がどれかを図の上で読み、そのまま引いて結べる。WBS の親を結ぶ・外す手は 表 T-351 に従うこと（MUST）'
const FR_075_COLOURS = '掴み点の寸法は `_assets/tbl-settings.md` の表 T-210 が持つ。掴み点の面と縁は、同書の 表 T-236 の `S-527` と `S-528` の色で描くこと（MUST）'
const FR_006_LOOK_LAST =
  '⭐ 見た目の行（表 T-016 の入力の型に `色` を含む行と、塗りの透過率・枠線の幅の行）は、同じ対象の行の並びの末尾に置くこと（MUST）'
// WHY: CR-690 -- the old span row retired; the field rule is FX-5 of table T-367 (one settle, written only while fixed).
const IX_17_FIELD =
  '⭐ 2 つの入力は 1 つの欄として確定し、確定した値で 表 T-108 の `CM-88` を、片方か 2 つともを空にして確定したら同表の `CM-89` を、1 回発行すること（MUST）'

const PROPERTIES = `[data-role="${bare(rowOf(specTable('T-103'), 'U-25').cells[0] ?? '')}"]`
const NOTIFICATION_AREA = `[data-role="${bare(rowOf(specTable('T-103'), 'U-57').cells[0] ?? '')}"]`
const ARM_WBS_PARENT = rowOf(specTable('T-109'), 'IC-142').id
const THEME_TOGGLE = rowOf(specTable('T-109'), 'IC-16').id
const DOCUMENT_SETTINGS = rowOf(specTable('T-109'), 'IC-17').id
const LINK_INK = bare(rowOf(specTable('T-236'), 'S-503').by['明るいテーマ'] ?? '')

const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  readonly settings: readonly { readonly rowId: string; readonly label: { readonly ja: string; readonly en: string } }[]
}
const SPAN_LABELS = (() => {
  const found = WORDS.settings.find((one) => one.rowId === 'K-141')
  return found === undefined ? [] : [found.label.ja, found.label.en]
})()

// see T-016
const LOOK_ROWS_OF_A_TASK = specTable('T-016')
  .rows.filter((row) => bare(row.by['対象'] ?? '') === 'Task')
  .filter((row) => (row.by['入力の型'] ?? '').includes('色') || /fillTransparencyPercent|strokeWidthPx/.test(row.by['列（`GRS JSON`）'] ?? ''))
  .map((row) => row.id)

// WHY: task 2 hangs under task 1; task 4 is a milestone; March 2026 starts on a Monday.
const DOCUMENT = (): string => rowsDocument({ rows: 4, wbsParentOf: { 2: 1 }, milestoneUids: [4], settings: { zoomX: 6, scrollDate: '2026-02-25T00:00:00' } })

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity non-pure */
async function stage(): Promise<Stage> {
  if (browser === null) throw new Error('no browser')
  const opened = await openStage(browser)
  await openDocument(opened.page, 'w3-t1-wbs.json', DOCUMENT())
  return opened
}

/** @purity semi-pure-b */
async function barCentre(page: Page, uid: number): Promise<{ x: number; y: number }> {
  const at = await page.evaluate((wanted: number) => {
    const r = document.querySelector(`[data-figure="task-${wanted}-plan"]`)?.getBoundingClientRect()
    return r === undefined ? null : { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, uid)
  if (at === null) throw new Error(`task ${uid} has no plan bar on the screen`)
  return at
}

/** @purity non-pure */
async function openPanelOf(page: Page, uid: number): Promise<void> {
  const at = await barCentre(page, uid)
  await page.mouse.dblclick(at.x, at.y)
  await settle(page)
}

/** @purity semi-pure-b */
async function parentOf(page: Page, uid: number): Promise<number | null> {
  const held = await readDocumentOf(page)
  return (held.schedule.tasks as { uid: number; wbsParentUid: number | null }[]).find((one) => one.uid === uid)?.wbsParentUid ?? null
}

/** @purity non-pure */
async function dragBar(page: Page, from: number, to: number): Promise<void> {
  const start = await barCentre(page, from)
  const end = await barCentre(page, to)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 10 })
  await page.mouse.up()
  await settle(page)
}

/** @purity semi-pure-b */
async function panelRows(page: Page): Promise<string[]> {
  return page.evaluate(
    (selector: string) => [...(document.querySelector(selector)?.children ?? [])].map((one) => one.getAttribute('data-field-row') ?? '?'),
    PROPERTIES,
  )
}

/** @purity semi-pure-b */
async function inkOf(page: Page, colour: string): Promise<string> {
  return page.evaluate((wanted: string) => {
    const probe = document.createElement('span')
    probe.style.color = wanted
    document.body.appendChild(probe)
    const said = getComputedStyle(probe).color
    probe.remove()
    return said
  }, colour)
}

test.describe('W3-T1 the manuscript these cases are driven by', () => {
  test('FR-135, FR-075, the look rows and FX-5 still read this way', () => {
    for (const clause of [FR_135_FIELD, FR_135_HANDS, FR_075_COLOURS, FR_006_LOOK_LAST, IX_17_FIELD]) expect(REQUIREMENTS, clause).toContain(clause)
    expect(LOOK_ROWS_OF_A_TASK, 'premise: T-016 names the look rows of a Task, in the CR-689 order').toEqual(['PR-40', 'PR-39', 'PR-12'])
    expect(SPAN_LABELS.length, 'premise: the dictionary holds the K-141 word').toBe(2)
  })
})

test.describe(`FR-135 (MUST): ${FR_135_FIELD.slice(-40)}`, () => {
  test.setTimeout(180_000)

  test('WL-15 / WL-16: the stated parent is a link in the S-503 ink with a cross; pressing it selects the parent and writes nothing', async () => {
    const opened = await stage()
    try {
      await openPanelOf(opened.page, 2)
      const field = await opened.page.evaluate((selector: string) => {
        const row = document.querySelector(`${selector} [data-field-row="PR-15"]`)
        const link = row?.querySelector('[data-link-task-uid]') ?? null
        const cross = [...(row?.querySelectorAll('button') ?? [])].find((one) => (one.textContent ?? '').includes('×')) ?? null
        return link === null
          ? null
          : {
              text: link.textContent ?? '',
              ink: getComputedStyle(link).color,
              line: getComputedStyle(link).textDecorationLine,
              cross: cross !== null,
            }
      }, PROPERTIES)
      expect(field, 'WL-15 (1): a link stands in the PR-15 row').not.toBeNull()
      expect(field?.text).toBe('Task 01')
      expect(field?.ink, 'the S-503 ink').toBe(await inkOf(opened.page, LINK_INK))
      expect(field?.line).toContain('underline')
      expect(field?.cross, 'a cross on the right').toBe(true)
      // WHY: SJ-2 opens the target's rows (treeState) as part of the jump; WL-16 forbids any other write.
      const written = async (): Promise<string> => {
        const held = (await readDocumentOf(opened.page)).schedule
        return JSON.stringify({ ...held, taskGroups: (held.taskGroups as Record<string, unknown>[]).map((one) => ({ ...one, treeState: null })) })
      }
      const before = await written()
      await opened.page.click(`${PROPERTIES} [data-field-row="PR-15"] [data-link-task-uid]`)
      await settle(opened.page)
      const chosen = await opened.page.evaluate(() =>
        JSON.stringify((window as unknown as { grSchedulerAgentApi: { readSelection(): unknown } }).grSchedulerAgentApi.readSelection()),
      )
      expect(chosen, 'WL-16: the parent is chosen').toMatch(/\b1\b/)
      expect(chosen, 'WL-16: the child is no longer the choice').not.toMatch(/\b2\b/)
      const after = await written()
      const changed = Object.keys(JSON.parse(before)).filter((key) => JSON.stringify(JSON.parse(before)[key]) !== JSON.stringify(JSON.parse(after)[key]))
      expect(changed, `WL-16: nothing is written (${after.length - before.length} chars moved)`).toEqual([])
    } finally {
      await opened.close()
    }
  })

  test('WL-17: the cross unbinds the parent in one undo step', async () => {
    const opened = await stage()
    try {
      await openPanelOf(opened.page, 2)
      await opened.page.click(`${PROPERTIES} [data-field-row="PR-15"] button`)
      await settle(opened.page)
      expect(await parentOf(opened.page, 2), 'the cross writes null').toBeNull()
      await opened.page.keyboard.press('Control+z')
      await settle(opened.page)
      expect(await parentOf(opened.page, 2), 'one undo brings the parent back').toBe(1)
    } finally {
      await opened.close()
    }
  })
})

test.describe(`FR-135 (MUST): ${FR_135_HANDS.slice(-40)}`, () => {
  test.setTimeout(180_000)

  test('WL-1 / WL-5: armed, a drag from the chosen child onto a bar binds it; one undo unbinds', async () => {
    const opened = await stage()
    try {
      const child = await barCentre(opened.page, 3)
      await opened.page.mouse.click(child.x, child.y)
      await settle(opened.page)
      expect(await pressEntrance(opened.page, ARM_WBS_PARENT), 'IC-142 is on the screen').toBe(true)
      await dragBar(opened.page, 3, 1)
      expect(await parentOf(opened.page, 3), 'WL-5: task 3 hangs under task 1').toBe(1)
      await opened.page.keyboard.press('Escape')
      await settle(opened.page)
      await opened.page.keyboard.press('Control+z')
      await settle(opened.page)
      expect(await parentOf(opened.page, 3)).toBeNull()
    } finally {
      await opened.close()
    }
  })

  test('WL-8: armed, a release on a milestone writes nothing and tells RS-69', async () => {
    const opened = await stage()
    try {
      const child = await barCentre(opened.page, 3)
      await opened.page.mouse.click(child.x, child.y)
      await settle(opened.page)
      expect(await pressEntrance(opened.page, ARM_WBS_PARENT)).toBe(true)
      const before = JSON.stringify((await readDocumentOf(opened.page)).schedule)
      await dragBar(opened.page, 3, 4)
      expect(JSON.stringify((await readDocumentOf(opened.page)).schedule), 'nothing is written').toBe(before)
      const told = await opened.page.evaluate((selector: string) => document.querySelector(selector)?.textContent ?? '', NOTIFICATION_AREA)
      expect(reasonWords('RS-69').some((words) => told.includes(words)), `RS-69 is told; the area said: ${told}`).toBe(true)
    } finally {
      await opened.close()
    }
  })
})

test.describe(`FR-075 (MUST): ${FR_075_COLOURS.slice(-40)}`, () => {
  test.setTimeout(180_000)

  test('the grab points of the chosen task take S-527 / S-528, and follow a dark theme and a new hue', async () => {
    const opened = await stage()
    try {
      /** @purity semi-pure-b */
      const handles = async (): Promise<{ fill: string; stroke: string }[]> =>
        opened.page.evaluate(() =>
          [...document.querySelectorAll('[data-role="Schedule Canvas"] svg [data-figure="task-2-fade-handle"]')].map((one) => ({
            fill: one.getAttribute('fill') ?? '',
            stroke: one.getAttribute('stroke') ?? '',
          })),
        )
      await openPanelOf(opened.page, 2)
      const light = await handles()
      expect(light.length, 'premise: the chosen task shows its grab points (S-111)').toBeGreaterThan(0)
      for (const one of light) expect(one).toEqual({ fill: colourOf('S-527', 214, false, false), stroke: colourOf('S-528', 214, false, false) })
      // WHY: an open panel holds an unsettled field, and AG-9 refuses a write then; close it first.
      await opened.page.keyboard.press('Escape')
      await opened.page.keyboard.press('Escape')
      await settle(opened.page)
      expect((await applyCommandsOf(opened.page, [{ kind: 'setThemeHue', hue: 52 }])).accepted, 'premise: the hue is written').toBe(true)
      expect(await pressEntrance(opened.page, THEME_TOGGLE)).toBe(true)
      await openPanelOf(opened.page, 2)
      const plan = await opened.page.evaluate(() => document.querySelector('[data-role="Schedule Canvas"] svg [data-figure="task-1-plan"]')?.getAttribute('stroke') ?? '')
      expect(plan, 'premise: the plan bars already follow the dark theme and the new hue').toBe(colourOf('S-156', 52, true, false))
      const dark = await handles()
      expect(dark.length).toBeGreaterThan(0)
      for (const one of dark) expect(one).toEqual({ fill: colourOf('S-527', 52, true, false), stroke: colourOf('S-528', 52, true, false) })
    } finally {
      await opened.close()
    }
  })
})

test.describe(`FR-006 (MUST): ${FR_006_LOOK_LAST.slice(-40)}`, () => {
  test.setTimeout(120_000)

  test('a task panel ends with its look rows, outline width before outline colour before fill colour', async () => {
    const opened = await stage()
    try {
      await openPanelOf(opened.page, 2)
      const rows = (await panelRows(opened.page)).filter((one) => one.startsWith('PR-'))
      expect(rows.length, 'premise: the panel shows the task').toBeGreaterThan(LOOK_ROWS_OF_A_TASK.length)
      expect(rows.slice(-LOOK_ROWS_OF_A_TASK.length)).toEqual(LOOK_ROWS_OF_A_TASK)
    } finally {
      await opened.close()
    }
  })
})

test.describe(`FX-5 (MUST): ${IX_17_FIELD.slice(-40)}`, () => {
  test.setTimeout(120_000)

  test('one K-141 row holds two date inputs; with the span fixed, entering both writes the span once', async () => {
    const opened = await stage()
    try {
      expect(await pressEntrance(opened.page, DOCUMENT_SETTINGS), 'IC-17 opens the document settings').toBe(true)
      const field = await opened.page.evaluate(
        ({ selector, labels }: { selector: string; labels: readonly string[] }) => {
          const rows = [...(document.querySelector(selector)?.querySelectorAll('[data-field-row="K-141"]') ?? [])].filter((one) =>
            labels.some((label) => ((one as HTMLElement).innerText ?? '').trim().startsWith(label)),
          )
          return rows.map((one) => ({ dates: one.querySelectorAll('input[type="date"]').length, editable: one.getAttribute('data-editable') }))
        },
        { selector: PROPERTIES, labels: SPAN_LABELS },
      )
      expect(field, 'one row named by K-141, with a start and a finish date input').toEqual([{ dates: 2, editable: 'true' }])
      const inputs = opened.page.locator(`${PROPERTIES} input[type="date"]`).filter({ hasNot: opened.page.locator('[data-field-row="IC-44"]') })
      const spanInputs = opened.page.locator(`${PROPERTIES} [data-field-row="K-141"] input[type="date"]`)
      expect(await inputs.count()).toBeGreaterThan(0)
      // WHY: FX-5 lets the two inputs be written only while the span is fixed; FX-4 fixes it in one step (K-142).
      await opened.page.locator(`${PROPERTIES} [data-field-row="K-142"] input[type="checkbox"]`).check()
      await settle(opened.page)
      const fixed = (await readDocumentOf(opened.page)).documentSettings
      await spanInputs.nth(0).fill('2026-03-02')
      await spanInputs.nth(1).fill('2026-03-29')
      await spanInputs.nth(1).press('Enter')
      await settle(opened.page)
      const set = (await readDocumentOf(opened.page)).documentSettings
      expect([String(set.fitSpanStart).slice(0, 10), String(set.fitSpanFinish).slice(0, 10)]).toEqual(['2026-03-02', '2026-03-29'])
      await opened.page.keyboard.press('Control+z')
      await settle(opened.page)
      const undone = (await readDocumentOf(opened.page)).documentSettings
      expect([undone.fitSpanStart, undone.fitSpanFinish], 'one undo: the span was one CM-88').toEqual([fixed.fitSpanStart, fixed.fitSpanFinish])
    } finally {
      await opened.close()
    }
  })
})

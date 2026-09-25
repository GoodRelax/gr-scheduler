// CR-570 on the shipped build: the stage the tree-state cases press (open, read, press, save).

import { expect, type Browser, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'
import { readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

export const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')
// see T-025, MC-6
export const BASE_SCREEN = screenOf(rowOf(specTable('T-025'), 'MC-6'))
export const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
export const ERP_SAMPLE = readFileSync(join(process.cwd(), 'sample-schedule', 'sample-large-erp-program.ja.xml'), 'utf8')
export const ERP_PROGRAM_ROW = '1. \u30d7\u30ed\u30b0\u30e9\u30e0\u7ba1\u7406'

export type TreeState = 'auto' | 'collapsed' | 'expanded' | 'temporarilyExpanded' | 'hidden'

// see T-109
/** @purity pure */
export function entranceRuledBy(rule: string): string {
  const wanted = new RegExp(`${rule}(?![0-9a-z])`)
  const found = specTable('T-109').rows.filter((row) => wanted.test(row.cells.join(' ')))
  if (found.length !== 1) throw new Error(`table T-109 has ${found.length} entrances ruled by ${rule}`)
  return found[0]?.id ?? ''
}

export const ROW_OPEN_ONE_LEVEL = entranceRuledBy('HF-13')
export const ROW_OPEN_ALL_BELOW = entranceRuledBy('HF-2')
export const ROW_HIDE = entranceRuledBy('HF-3')
export const ROW_FOLD_ALL_BELOW = entranceRuledBy('HF-11')
export const HEAD_OPEN_EVERY_ROW = entranceRuledBy('HF-10')
export const HEAD_FOLD_EVERY_ROW = entranceRuledBy('HF-12')
export const HEAD_OPEN_TOP_LEVEL = entranceRuledBy('HF-16')
export const FIT = rowOf(specTable('T-109'), 'IC-10').id
export const ROW_ZOOM_SHRINK = rowOf(specTable('T-109'), 'IC-14').id
export const ROW_ZOOM_ENLARGE = rowOf(specTable('T-109'), 'IC-15').id
export const DATE_ZOOM_OUT = rowOf(specTable('T-109'), 'IC-12').id
export const DATE_ZOOM_IN = rowOf(specTable('T-109'), 'IC-13').id
export const UNDO = rowOf(specTable('T-109'), 'IC-5').id
const OPEN = rowOf(specTable('T-109'), 'IC-1').id
const REPLACE = rowOf(specTable('T-109'), 'IC-71').id
const AGENT_API = rowOf(specTable('T-109'), 'IC-20').id
const CONFIRMATION = `[data-role="${bare(rowOf(specTable('T-103'), 'U-55').cells[0] ?? '')}"]`
const NOTIFICATION_AREA = `[data-role="${bare(rowOf(specTable('T-103'), 'U-57').cells[0] ?? '')}"]`
const ROW = '[data-depth]'

const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  readonly confirmation: readonly { readonly answer: string; readonly text: { readonly en: string } }[]
  readonly reasons: readonly { readonly rowId: string; readonly text: { readonly ja: string; readonly en: string } }[]
}
const PROCEED_WORD = WORDS.confirmation.find((one) => one.answer === 'proceed')?.text.en ?? ''

/** @purity pure */
export function reasonWords(rowId: string): readonly string[] {
  const found = WORDS.reasons.find((one) => one.rowId === rowId)
  if (found === undefined) throw new Error(`the dictionary holds no ${rowId}`)
  return [found.text.ja, found.text.en]
}

// see SK-11, SK-6, SK-16c
/** @purity pure */
export function keyOf(id: string): string {
  // WHY: the raw cell -- bare() refuses a cell of several code spans (DFC-343), and this one is a chord.
  const said = (rowOf(specTable('T-036'), id).cells[1] ?? '').replace(/`|\*/g, '').trim()
  return said
    .split(/\s*\uff0b\s*/)
    .map((part) => (part === 'Ctrl' ? 'Control' : part.length === 1 ? part.toLowerCase() : part))
    .join('+')
}

export interface Stage {
  readonly page: Page
  close(): Promise<void>
}

// WHY: a driven browser cannot answer the host's file pickers; stand-ins with the same shape hand
// over the next document to open and keep every body the save wrote (as measured-sweep does).
/** @purity non-pure */
export async function openStage(browser: Browser): Promise<Stage> {
  if (!existsSync(SHIPPED_BUILD)) throw new Error('run `npm run build` first (dist/index.html)')
  const context = await browser.newContext({ viewport: BASE_SCREEN })
  await context.addInitScript(() => {
    const held = { next: { name: '', text: '' }, written: [] as string[] }
    ;(window as unknown as Record<string, unknown>)['grsCr570'] = held
    const handleNamed = (name: string, file: File): unknown => ({
      kind: 'file',
      name,
      getFile: async () => file,
      queryPermission: async () => 'granted',
      requestPermission: async () => 'granted',
      isSameEntry: async () => false,
      async createWritable() {
        const parts: unknown[] = []
        return {
          async write(part: unknown) {
            parts.push(part)
          },
          async close() {
            let text = ''
            for (const part of parts) {
              if (typeof part === 'string') text += part
              else if (part instanceof Blob) text += await part.text()
              else if (part instanceof Uint8Array) text += new TextDecoder().decode(part)
              else if (part instanceof ArrayBuffer) text += new TextDecoder().decode(new Uint8Array(part))
            }
            held.written.push(text)
          },
          async abort() {},
        }
      },
    })
    ;(window as unknown as Record<string, unknown>)['showOpenFilePicker'] = async () => [
      handleNamed(held.next.name, new File([held.next.text], held.next.name)),
    ]
    ;(window as unknown as Record<string, unknown>)['showSaveFilePicker'] = async () => handleNamed('saved.json', new File([''], 'saved.json'))
  })
  const page = await context.newPage()
  await page.goto(pathToFileURL(SHIPPED_BUILD).href)
  await readSettledDrawnSvg(page)
  expect(await pressEntrance(page, AGENT_API), 'FR-065: the Agent API entrance is on the screen').toBe(true)
  return {
    page,
    /** @purity non-pure */
    async close(): Promise<void> {
      await context.close()
    },
  }
}

/** @purity non-pure */
export async function settle(page: Page): Promise<void> {
  await page.waitForTimeout(400)
  await readSettledDrawnSvg(page)
}

/** @purity non-pure */
async function pressAt(page: Page, at: { x: number; y: number }): Promise<void> {
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
}

/** @purity non-pure */
export async function pressEntrance(page: Page, icon: string): Promise<boolean> {
  const at = await page.evaluate((wanted: string) => {
    const box = document.querySelector(`[data-icon="${wanted}"]`)?.getBoundingClientRect()
    return box === undefined ? null : { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, icon)
  if (at === null) return false
  await pressAt(page, at)
  await settle(page)
  return true
}

// see OP-3, IC-1, IC-71
/** @purity non-pure */
export async function openDocument(page: Page, name: string, text: string): Promise<void> {
  await page.evaluate((next: { name: string; text: string }) => {
    ;((window as unknown as Record<string, { next: unknown }>)['grsCr570'] as { next: unknown }).next = next
  }, { name, text })
  expect(await pressEntrance(page, OPEN), 'IC-1 is on the screen').toBe(true)
  await page.waitForTimeout(1_000)
  expect(await pressEntrance(page, REPLACE), 'IC-71 is on the screen').toBe(true)
  await page.waitForTimeout(800)
  const proceed = await page.$(`${CONFIRMATION} button:has-text(${JSON.stringify(PROCEED_WORD)})`)
  if (proceed !== null) await proceed.click({ timeout: 3_000 })
  await page.waitForTimeout(1_500)
  await settle(page)
}

export interface TreeRow {
  readonly id: string
  readonly parentId: string | null
  readonly label: string
  readonly treeState: TreeState
}

export interface TreeReading {
  readonly zoomY: number
  readonly levelZero: string
  readonly rows: readonly TreeRow[]
}

// see AM-3
/** @purity semi-pure-b */
export async function readTree(page: Page): Promise<TreeReading> {
  return page.evaluate(() => {
    const api = (window as unknown as { grSchedulerAgentApi?: { readDocument(): unknown } }).grSchedulerAgentApi
    if (api === undefined) throw new Error('the Agent API is not open')
    const held = api.readDocument() as {
      schedule: {
        taskGroups: { id: string; parentId: string | null; label: string | null; derivedFromTaskUid: number | null; treeState: string }[]
        tasks: { uid: number; name: string | null }[]
      }
      documentSettings: { zoomY: number; levelZeroTreeState: string }
    }
    const nameOf = (uid: number | null): string => held.schedule.tasks.find((task) => task.uid === uid)?.name ?? ''
    return {
      zoomY: held.documentSettings.zoomY,
      levelZero: held.documentSettings.levelZeroTreeState,
      rows: held.schedule.taskGroups.map((row) => ({
        id: row.id,
        parentId: row.parentId,
        label: row.label ?? nameOf(row.derivedFromTaskUid),
        treeState: row.treeState as 'auto',
      })),
    }
  })
}

/** @purity pure */
export function stateOf(reading: TreeReading, id: string): TreeState {
  const found = reading.rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`the document holds no row ${id}`)
  return found.treeState
}

/** @purity pure */
export function rowNamed(reading: TreeReading, label: string): TreeRow {
  const found = reading.rows.find((row) => row.label === label)
  if (found === undefined) throw new Error(`no row named ${label}; the first rows are ${reading.rows.slice(0, 5).map((row) => row.label).join(' / ')}`)
  return found
}

/** @purity pure */
export function childrenOf(reading: TreeReading, id: string): readonly TreeRow[] {
  return reading.rows.filter((row) => row.parentId === id)
}

/** @purity pure */
export function isLeaf(reading: TreeReading, id: string): boolean {
  return childrenOf(reading, id).length === 0
}

/** @purity pure */
export function descendantsOf(reading: TreeReading, id: string): readonly TreeRow[] {
  return childrenOf(reading, id).flatMap((child) => [child, ...descendantsOf(reading, child.id)])
}

// WHY: the panel marks the rows it draws; FR-055 fits the whole picture on one screen, so after a
// fit this list is every drawn row, and elsewhere it is the drawn rows the window shows.
/** @purity semi-pure-b */
export async function drawnRowIds(page: Page): Promise<string[]> {
  return page.evaluate(
    (row: string) => Array.from(document.querySelectorAll(row)).map((one) => one.getAttribute('data-group-id') ?? ''),
    ROW,
  )
}

// see FR-029, EN-2
/** @purity semi-pure-b */
export async function isArmed(page: Page, icon: string): Promise<boolean> {
  const said = await page.evaluate((wanted: string) => {
    const entry = document.querySelector(`[data-icon="${wanted}"]`)
    if (entry === null) return null
    return entry.getAttribute('aria-disabled') === 'true' || entry.getAttribute('data-enabled') === 'false'
  }, icon)
  if (said === null) throw new Error(`the entrance ${icon} is not on the screen`)
  return !said
}

// WHY: a row's controls are drawn only while the pointer is on its name (HF-6), so the pointer goes
// to the left end of the name first and the entrance is read and pressed from there.
/** @purity non-pure */
async function showRowControls(page: Page, id: string): Promise<void> {
  const spot = await page.evaluate(
    (asked: { id: string; row: string }) => {
      const row = Array.from(document.querySelectorAll(asked.row)).find((one) => one.getAttribute('data-group-id') === asked.id)
      const name = row?.querySelector('span')
      if (name === null || name === undefined) return null
      const box = name.getBoundingClientRect()
      for (let y = Math.max(box.y, 0) + 1; y < Math.min(box.bottom, window.innerHeight); y += 1) {
        for (let x = Math.ceil(box.x) + 1; x < box.x + 40; x += 2) {
          if (document.elementFromPoint(x, y) === name) return { x, y }
        }
      }
      return null
    },
    { id, row: ROW },
  )
  if (spot === null) throw new Error(`the name of row ${id} is not on the screen`)
  await page.mouse.move(spot.x, spot.y)
  await page.waitForTimeout(300)
}

/** @purity non-pure */
export async function isRowEntranceArmed(page: Page, id: string, icon: string): Promise<boolean> {
  await showRowControls(page, id)
  const said = await page.evaluate(
    (asked: { id: string; icon: string; row: string }) => {
      const entry = Array.from(document.querySelectorAll(asked.row))
        .find((one) => one.getAttribute('data-group-id') === asked.id)
        ?.querySelector(`[data-icon="${asked.icon}"]`)
      if (entry === null || entry === undefined) return null
      return entry.getAttribute('aria-disabled') === 'true' || entry.getAttribute('data-enabled') === 'false'
    },
    { id, icon, row: ROW },
  )
  if (said === null) throw new Error(`row ${id} draws no ${icon}`)
  return !said
}

/** @purity non-pure */
export async function pressRowEntrance(page: Page, id: string, icon: string): Promise<void> {
  await showRowControls(page, id)
  const at = await page.evaluate(
    (asked: { id: string; icon: string; row: string }) => {
      const box = Array.from(document.querySelectorAll(asked.row))
        .find((one) => one.getAttribute('data-group-id') === asked.id)
        ?.querySelector(`[data-icon="${asked.icon}"]`)
        ?.getBoundingClientRect()
      return box === undefined ? null : { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    },
    { id, icon, row: ROW },
  )
  if (at === null) throw new Error(`row ${id} draws no ${icon}`)
  await page.mouse.move(at.x, at.y, { steps: 4 })
  await pressAt(page, at)
  await settle(page)
}

/** @purity non-pure */
export async function pressKey(page: Page, id: string): Promise<void> {
  await page.keyboard.press(keyOf(id))
  await settle(page)
}

// see FR-100
/** @purity semi-pure-b */
export async function wouldWarn(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const asking = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(asking)
    return asking.defaultPrevented
  })
}

// see SK-11
/** @purity non-pure */
export async function saveDocument(page: Page): Promise<string> {
  const before = await page.evaluate(() => ((window as unknown as Record<string, { written: string[] }>)['grsCr570'] as { written: string[] }).written.length)
  await pressKey(page, 'SK-11')
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    const written = await page.evaluate(() => ((window as unknown as Record<string, { written: string[] }>)['grsCr570'] as { written: string[] }).written)
    if (written.length > before) return written[written.length - 1] ?? ''
    await page.waitForTimeout(250)
  }
  throw new Error('SK-11 wrote nothing through the save picker')
}

// see FR-029, T-233
/** @purity semi-pure-b */
export async function toldReason(page: Page, rowId: string): Promise<boolean> {
  const said = await page.evaluate(
    (area: string) => Array.from(document.querySelectorAll(area)).map((one) => one.textContent ?? '').join(' | '),
    NOTIFICATION_AREA,
  )
  return reasonWords(rowId).some((words) => said.includes(words))
}

// WHY: IC-14 until the zoom stops moving, which is the ZE-1 end; bounded so a build that never
// reaches it fails here instead of spinning.
/** @purity non-pure */
export async function shrinkToTheEnd(page: Page): Promise<number> {
  let last = (await readTree(page)).zoomY
  for (let step = 0; step < 80; step += 1) {
    await pressEntrance(page, ROW_ZOOM_SHRINK)
    const now = (await readTree(page)).zoomY
    if (now === last) return now
    last = now
  }
  throw new Error('IC-14 never reached the shrinking end (ZE-1)')
}

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { schedule: Record<string, unknown> & { taskGroups: Record<string, unknown>[] }; documentSettings: Record<string, unknown> }

// see S-87, S-88
// WHY: threshold(d) = base x ratio^(d - 2) (S-87's remark); below the depth-2 threshold only depth 1
// is drawn by the zoom, at 1 every depth of this tree is.
const THRESHOLD_OF_DEPTH_TWO = Number(TEMPLATE.documentSettings['groupLevelOfDetailBase'])
export const SHALLOW_ZOOM = THRESHOLD_OF_DEPTH_TWO * 0.9
export const DEEP_ZOOM = 1

// WHY: T1 reaches depth 4 so TD-7 has an ancestor, a pressed row and a child to show; T2 has one
// leaf child; T3 is a leaf at depth 1.
const TREE: readonly { readonly id: string; readonly parentId: string | null }[] = [
  { id: 'T1', parentId: null },
  { id: 'T1a', parentId: 'T1' },
  { id: 'T1a1', parentId: 'T1a' },
  { id: 'T1a1x', parentId: 'T1a1' },
  { id: 'T1b', parentId: 'T1' },
  { id: 'T2', parentId: null },
  { id: 'T2a', parentId: 'T2' },
  { id: 'T3', parentId: null },
]

export interface Arrangement {
  readonly tree?: readonly { readonly id: string; readonly parentId: string | null }[]
  readonly zoomY: number
  readonly states?: Readonly<Record<string, TreeState>>
  readonly levelZero?: 'auto' | 'collapsed'
  readonly pinned?: readonly string[]
}

/** @purity pure */
export function documentOf(arranged: Arrangement): string {
  const group = TEMPLATE.schedule.taskGroups[0] ?? {}
  const taskGroups = (arranged.tree ?? TREE).map((row, order) => ({
    ...group,
    id: row.id,
    parentId: row.parentId,
    label: `Row ${row.id}`,
    order,
    treeState: arranged.states?.[row.id] ?? 'auto',
    height: null,
  }))
  const built = {
    ...TEMPLATE,
    schedule: {
      ...TEMPLATE.schedule,
      taskGroups,
      tasks: [],
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      assignments: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...TEMPLATE.documentSettings,
      zoomY: arranged.zoomY,
      levelZeroTreeState: arranged.levelZero ?? 'auto',
      pinnedGroupIds: arranged.pinned ?? [],
      scrollGroupId: 'T1',
      scrollGroupOffset: 0,
      scrollDate: '2026-01-01',
      scrollDayOffset: 0,
    },
  }
  const checked = validateDocument(built)
  expect(checked.errors, 'the fixture is a document the schema accepts').toEqual([])
  return JSON.stringify(built)
}

// WHY: the first row the panel draws at a point no control of its own covers (HF-6), pressed to
// choose the row (FR-004's row choice), as tests/system/duplicate-paste-and-dual-cursor does.
/** @purity non-pure */
export async function chooseRow(page: Page, id: string): Promise<void> {
  await showRowControls(page, id)
  const at = await page.evaluate(
    (asked: { id: string; row: string }) => {
      const row = Array.from(document.querySelectorAll(asked.row)).find((one) => one.getAttribute('data-group-id') === asked.id)
      if (row === undefined) return null
      const box = row.getBoundingClientRect()
      for (let x = Math.round(box.x) + 2; x < box.right - 2; x += 3) {
        for (const y of [Math.round(box.y) + 4, Math.round(box.y + box.height / 2)]) {
          const node = document.elementFromPoint(x, y)
          if (node === null || node.closest('[data-icon]') !== null || node.closest('[data-row-grab]') !== null) continue
          if (node.closest('[data-group-id]') !== row) continue
          return { x, y }
        }
      }
      return null
    },
    { id, row: ROW },
  )
  if (at === null) throw new Error(`every point of row ${id} is covered by its own controls`)
  await pressAt(page, at)
  await settle(page)
}

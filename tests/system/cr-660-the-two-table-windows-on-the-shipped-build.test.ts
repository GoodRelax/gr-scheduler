// CR-660 on the shipped build: column order and fixed columns, the filter's search field and how it closes, status glyphs, the link colour, default widths and grips (T-330, T-331, T-346, T-347).

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg } from './live-app'
import { ERP_SAMPLE, keyOf, openDocument, openStage, settle, type Stage } from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'

const SV_7_CONTROLS_STAY = '操作の段をフィルタの一番上に置き、値の一覧を縦に送っても動かさないこと（MUST）'
const SV_7_MARKS_KEPT = '⛔ 打った語で、値ごとのチェックを変えてはならない（MUST NOT）'
const SV_7_LISTED_ONLY = '`IC-125`・`IC-126` は、一覧にいま出ている項目のチェックだけを変え、検索で一覧に出ていない項目のチェックは変えない。'
const SV_7_HEADING_WORD = '見出しのセルの語を押したときも、`IC-122` を押したものとして同じに答えること（MUST）'
const SV_7_CLOSE = '⭐ 開いているフィルタは、同じ列の `IC-122` をもう一度押すか、`Esc`（`SV-14`）か、フィルタの箱の外を押すと閉じる。'
const SV_7_OUTSIDE = '外を押して閉じたときは、その押下を押した先（日程表のタスク・ほかの窓・`App Header`・同じ窓のほかの所）にも渡すこと（MUST）'
const SV_7_DROPDOWN = 'フィルタは、押した列の見出しのセルの下に、表の上に重ねるドロップダウンとして開くこと（MUST）'
const SV_6_FIXED = '横は、タスクの表は `SQ-1` まで（表 T-331 の並びで 表示・ステータス・進捗・タスク の 4 列）、コメントボックスの表は `SQ-7` までを左に固定し'
const RW_10_FIXED = '横は `DT-8`・`DT-1`・`DT-3`・`DT-4`（表示・ステータス・進捗・タスク —— 表 T-347 の並びで左の 4 列）を左に固定し'
const SV_18_MEASURED =
  '⭐ 中身の字の幅が決まる列（ステータス・進捗・日付 —— `SQ-5`・`SQ-11`・`SQ-3`・`SQ-4`・`SQ-12`・`SQ-13`・`SQ-9`）の既定は、そのときの言語（`FR-038`）と字の段（`SV-16`）で、見出し（語と `IC-122`）も値も省略記号で切られない最小の幅とすること（MUST）'
const RW_9_MEASURED = '中身の字の幅が決まる列（`DT-1`・`DT-3`・`DT-5`・`DT-6`）の既定は、`SV-18` と同じ規則で測る'
const SV_18_FOLLOW = '握っているあいだ、列の幅をポインタに追従させること（MUST）'
const SV_18_OTHERS = 'その境目の左の列の幅を変える —— ほかの列の幅は変えず、右の列はその分だけ動く。'
const SV_11_EDGE = '縁と角（表 T-023d の `GR-25`）を握っているあいだ、ウィンドウの大きさをポインタに追従させること（MUST）'
const SQ_5_DRAW = '先頭に、日程表の進捗マーカーと同じ絵（`FR-133`、表 T-021・表 T-315 の色と形）を表の字の大きさ（1 字ぶんの正方形）で描き、続けて語を書く'
const SQ_5_GLYPHS = '未着手は `PM-1a`、進行中は `PM-1`、完了は `PM-2`、中断の 2 つは `PM-3`、ボトルネックは `DG-2` の炎。'
const DT_1_NO_GLYPH = '疑義・記載漏れと確定はマーカーを持たないので絵を描かず、絵の幅だけ空けて語の頭をそろえる。'
const RW_4_GLYPHS = '`DT-1` の窓の絵と同じ —— 疑義・記載漏れと確定は絵の幅だけ空ける'
const SQ_1_LINK = '字を `_assets/tbl-settings.md` の 表 T-236 の `S-503` の色で描き、下線を引く'
const DT_4_LINK = '`SQ-1` と同じ（`S-503` の色と下線を含む）。'
const U_32_NOT_THE_BOX =
  '⛔ `Schedule Canvas` の範囲を、`data-role` に `Schedule Canvas` を持つ要素の箱から読んではならない（MUST NOT）'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const cellOf = (table: string, id: string, heading: string): string => unbroken(rowOf(specTable(table), id).by[heading] ?? '')

const T_103 = specTable('T-103')
const roleOf = (id: string): string => `[data-role="${bare(rowOf(T_103, id).cells[0] ?? '')}"]`
const PANEL = roleOf('U-64')
const REPORT = roleOf('U-66')
const APP_HEADER = roleOf('U-31')
const DIAGNOSE = rowOf(specTable('T-109'), 'IC-107').id
const TEXT_SIZE = rowOf(specTable('T-109'), 'IC-127').id
const OPEN_SEARCH = keyOf('SK-24')
const STEPS = specTable('T-333').rows.length

const TASK_COLUMNS = specTable('T-331').rows.filter((row) => row.by['表'] === 'タスク').map((row) => row.id)
const REPORT_COLUMNS = specTable('T-347').rows.map((row) => row.id)
const MEASURED_TASK_COLUMNS = ['SQ-5', 'SQ-11', 'SQ-3', 'SQ-4', 'SQ-12', 'SQ-13']
const MEASURED_REPORT_COLUMNS = ['DT-1', 'DT-3', 'DT-5', 'DT-6']

// see SV-18, RW-9
const WIDTH_ROW: Readonly<Record<string, string>> = {
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [`SQ-${n}`, `S-${465 + n}`])),
  ...Object.fromEntries([11, 12, 13].map((n) => [`SQ-${n}`, `S-${489 + n}`])),
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((n) => [`DT-${n}`, `S-${474 + n}`])),
  'SQ-10': 'S-496',
  'DT-8': 'S-496',
}

/** @purity pure */
function settingPx(column: string): number | null {
  const said = cellOf('T-206', WIDTH_ROW[column] ?? '', '既定')
  if (said.startsWith('測る')) return null
  const px = /^(\d+)px/.exec(said)
  if (px === null) throw new Error(`T-206 holds no px default for ${column}: ${said}`)
  return Number(px[1])
}

/** @purity pure */
function rgbOf(hex: string): string {
  const n = Number.parseInt(hex.replace('#', ''), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

const LINK = { light: rgbOf(bare(cellOf('T-236', 'S-503', '明るいテーマ'))), dark: rgbOf(bare(cellOf('T-236', 'S-503', '暗いテーマ'))) }

const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  readonly planActualStates: readonly { readonly rowId: string; readonly text: { readonly ja: string; readonly en: string } }[]
  readonly delayReportStatuses: readonly { readonly rowId: string; readonly text: { readonly ja: string; readonly en: string } }[]
}
// WHY: the screen speaks the browser's language, so a word is looked up in both languages.
const STATE_WORD = new Map(WORDS.planActualStates.flatMap((one) => [[one.text.ja, one.rowId] as const, [one.text.en, one.rowId] as const]))
const REPORT_STATUS = new Map(WORDS.delayReportStatuses.flatMap((one) => [[one.text.ja, one.rowId] as const, [one.text.en, one.rowId] as const]))

// see SQ-5, T-019a
const GLYPH_OF_STATE: Readonly<Record<string, string>> = { 'PS-1': 'PM-1a', 'PS-5': 'PM-1', 'PS-2': 'PM-2', 'PS-3': 'PM-3', 'PS-4': 'PM-3' }

interface Box {
  readonly x: number
  readonly y: number
  readonly right: number
  readonly bottom: number
  readonly width: number
  readonly height: number
}

interface Mark {
  readonly value: string
  readonly label: string
  readonly checked: boolean
  readonly listed: boolean
}

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity non-pure */
async function stageWith(scheme: 'light' | 'dark' = 'light'): Promise<Stage> {
  if (browser === null) throw new Error('no browser')
  const stage = await openStage(browser)
  if (scheme === 'dark') {
    await stage.page.emulateMedia({ colorScheme: 'dark' })
    await stage.page.reload()
    await readSettledDrawnSvg(stage.page)
  }
  await openDocument(stage.page, 'sample-large-erp-program.ja.xml', ERP_SAMPLE)
  return stage
}

/** @purity non-pure */
async function withSearch(scheme: 'light' | 'dark' = 'light'): Promise<Stage> {
  const stage = await stageWith(scheme)
  await stage.page.keyboard.press(OPEN_SEARCH)
  await settle(stage.page)
  await expect(stage.page.locator(`${PANEL} tbody tr`).first()).toBeVisible()
  return stage
}

/** @purity non-pure */
async function withReport(scheme: 'light' | 'dark' = 'light'): Promise<Stage> {
  const stage = await stageWith(scheme)
  await pressSelector(stage.page, `[data-icon="${DIAGNOSE}"]`)
  await expect(stage.page.locator(`${REPORT} tbody tr`).first()).toBeVisible()
  return stage
}

/** @purity semi-pure-b */
async function boxOf(page: Page, selector: string): Promise<Box | null> {
  return page.evaluate((wanted: string) => {
    const box = document.querySelector(wanted)?.getBoundingClientRect()
    return box === undefined ? null : { x: box.x, y: box.y, right: box.right, bottom: box.bottom, width: box.width, height: box.height }
  }, selector)
}

// WHY: the range starts at the App Header's lower edge; the element with the role spans the window.
// see U-32, UZ-9
/** @purity semi-pure-b */
async function scheduleCanvasRange(page: Page): Promise<Box> {
  const header = await boxOf(page, APP_HEADER)
  const view = page.viewportSize()
  if (header === null || view === null) throw new Error(`${U_32_NOT_THE_BOX} -- ${APP_HEADER} is not on the screen`)
  const height = view.height - header.bottom
  return { x: 0, y: header.bottom, right: view.width, bottom: view.height, width: view.width, height }
}

/** @purity non-pure */
async function pressAt(page: Page, x: number, y: number): Promise<void> {
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.up()
  await settle(page)
}

/** @purity non-pure */
async function pressSelector(page: Page, selector: string): Promise<void> {
  const box = await boxOf(page, selector)
  expect(box, `${selector} is on the screen`).not.toBeNull()
  if (box !== null) await pressAt(page, box.x + box.width / 2, box.y + box.height / 2)
}

/** @purity semi-pure-b */
async function headingColumns(page: Page, window: string): Promise<{ readonly column: string; readonly box: Box }[]> {
  return page.evaluate((asked: string) => {
    return Array.from(document.querySelectorAll(`${asked} thead th`)).map((cell) => {
      const r = cell.getBoundingClientRect()
      return { column: cell.getAttribute('data-column') ?? '', box: { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height } }
    })
  }, window)
}

// WHY: the table box is the nearest scrolled ancestor of the table; scrolling it sideways is SV-6's case.
/** @purity non-pure */
async function scrollTableSideways(page: Page, window: string, by: number): Promise<number> {
  return page.evaluate(
    (asked: { window: string; by: number }) => {
      let box = document.querySelector(`${asked.window} table`)?.parentElement ?? null
      while (box !== null && box.scrollWidth <= box.clientWidth) box = box.parentElement
      if (box === null) return 0
      box.scrollLeft = asked.by
      return box.scrollLeft
    },
    { window, by },
  )
}

/** @purity non-pure */
async function narrowWindow(page: Page, window: string, width: number): Promise<void> {
  const box = await boxOf(page, window)
  if (box === null) throw new Error(`${window} is not on the screen`)
  await page.mouse.move(box.right - 1, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + width, box.y + box.height / 2, { steps: 6 })
  await page.mouse.up()
  await settle(page)
}

/** @purity non-pure */
async function openFilter(page: Page, window: string, column: string): Promise<void> {
  await pressSelector(page, `${window} thead th[data-column="${column}"] [data-icon="IC-122"]`)
}

/** @purity semi-pure-b */
async function menuCount(page: Page, window: string): Promise<number> {
  return page.evaluate((asked: string) => {
    const window = document.querySelector(asked)
    return window === null ? -1 : window.querySelectorAll('[data-search-filter-menu]').length
  }, window)
}

/** @purity semi-pure-b */
async function marksOf(page: Page, window: string): Promise<readonly Mark[]> {
  return page.evaluate((asked: string) => {
    // WHY: the open filter's marks only, not the SQ-10 boxes of the table rows.
    return Array.from(document.querySelectorAll<HTMLInputElement>(`${asked} [data-search-filter-menu] input[type="checkbox"]`)).map((mark) => ({
      value: mark.getAttribute('data-search-filter-value') ?? '',
      label: (mark.closest('label')?.textContent ?? '').trim(),
      checked: mark.checked,
      listed: mark.getClientRects().length > 0,
    }))
  }, window)
}

// WHY: the search field is the one text input of the open filter (the check boxes and dates are not text).
const FILTER_FIELD = 'input:not([type="checkbox"]):not([type="date"])'

/** @purity semi-pure-b */
async function filterFieldOf(page: Page, window: string): Promise<Box | null> {
  return page.evaluate(
    (asked: { window: string; field: string }) => {
      const field = document.querySelector(`${asked.window} [data-search-filter-menu]`)?.querySelector(asked.field)
      const r = field?.getBoundingClientRect()
      return r === undefined ? null : { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
    },
    { window, field: FILTER_FIELD },
  )
}

/** @purity non-pure */
async function typeInFilter(page: Page, window: string, word: string): Promise<void> {
  const field = await filterFieldOf(page, window)
  expect(field, 'SV-7: the open value filter holds a search field').not.toBeNull()
  if (field === null) return
  await pressAt(page, field.x + field.width / 2, field.y + field.height / 2)
  await page.keyboard.type(word)
  await settle(page)
}

const folded = (text: string): string => text.normalize('NFKC').toLowerCase()

const NARROWING_WORD = 'UAT'

const isHit = (one: Mark): boolean => folded(one.label).includes(folded(NARROWING_WORD))

// WHY: opens the SQ-1 filter, unticks one value the word will not list, types the word; returns the marks before typing.
/** @purity non-pure */
async function narrowedByWord(page: Page): Promise<readonly Mark[]> {
  await openFilter(page, PANEL, 'SQ-1')
  const fresh = await marksOf(page, PANEL)
  expect(fresh.length, 'premise: the name filter lists many values').toBeGreaterThan(10)
  expect(fresh.filter(isHit).length, `premise: some names hold ${NARROWING_WORD}`).toBeGreaterThan(0)
  expect(fresh.filter(isHit).length, `premise: not every name holds ${NARROWING_WORD}`).toBeLessThan(fresh.length)
  const other = fresh.find((one) => !isHit(one))
  await pressSelector(page, `${PANEL} input[type="checkbox"][data-search-filter-value="${other?.value ?? ''}"]`)
  const before = await marksOf(page, PANEL)
  await typeInFilter(page, PANEL, NARROWING_WORD)
  return before
}

/** @purity semi-pure-b */
async function glyphCells(page: Page, window: string, column: string): Promise<{ readonly word: string; readonly glyph: string | null; readonly glyphPx: number; readonly fontPx: number; readonly textLeft: number }[]> {
  return page.evaluate(
    (asked: { window: string; column: string }) => {
      const heads = Array.from(document.querySelectorAll(`${asked.window} thead th`))
      const at = heads.findIndex((one) => one.getAttribute('data-column') === asked.column)
      return Array.from(document.querySelectorAll(`${asked.window} tbody tr`)).map((row) => {
        const cell = row.children[at] as HTMLElement
        const svg = cell.querySelector('svg')
        const text = Array.from(cell.childNodes).find((one) => one.nodeType === Node.TEXT_NODE)
        const range = document.createRange()
        if (text !== undefined) range.selectNodeContents(text)
        return {
          word: (text?.textContent ?? '').trim(),
          glyph: svg === null ? null : svg.innerHTML.replace(/ data-figure="[^"]*"/g, ''),
          glyphPx: svg === null ? 0 : svg.getBoundingClientRect().width,
          fontPx: Number.parseFloat(getComputedStyle(cell).fontSize),
          textLeft: text === undefined ? -1 : range.getBoundingClientRect().left - cell.getBoundingClientRect().left,
        }
      })
    },
    { window, column },
  )
}

/** @purity semi-pure-b */
async function linkCells(page: Page, window: string, column: string): Promise<{ readonly colour: string; readonly line: string }[]> {
  return page.evaluate(
    (asked: { window: string; column: string }) => {
      const heads = Array.from(document.querySelectorAll(`${asked.window} thead th`))
      const at = heads.findIndex((one) => one.getAttribute('data-column') === asked.column)
      return Array.from(document.querySelectorAll(`${asked.window} tbody tr`)).slice(0, 20).map((row) => {
        const style = getComputedStyle(row.children[at] as Element)
        return { colour: style.color, line: style.textDecorationLine }
      })
    },
    { window, column },
  )
}

/** @purity semi-pure-b */
async function clippedCells(page: Page, window: string, columns: readonly string[]): Promise<readonly string[]> {
  return page.evaluate(
    (asked: { window: string; columns: readonly string[] }) => {
      const heads = Array.from(document.querySelectorAll(`${asked.window} thead th`))
      const out: string[] = []
      for (const column of asked.columns) {
        const at = heads.findIndex((one) => one.getAttribute('data-column') === column)
        const head = heads[at]
        const word = head?.querySelector('span')
        if (word !== null && word !== undefined && word.scrollWidth > word.clientWidth) out.push(`${column} heading "${word.textContent ?? ''}"`)
        for (const row of Array.from(document.querySelectorAll(`${asked.window} tbody tr`))) {
          const cell = row.children[at] as HTMLElement | undefined
          if (cell !== undefined && cell.scrollWidth > cell.clientWidth) out.push(`${column} "${cell.textContent ?? ''}"`)
        }
      }
      return out
    },
    { window, columns },
  )
}

/** @purity non-pure */
async function dragBorder(page: Page, window: string, column: string, dx: number): Promise<{ readonly start: number; readonly held: number; readonly after: number; readonly others: readonly number[]; readonly othersAfter: readonly number[] }> {
  const before = await headingColumns(page, window)
  const cell = before.find((one) => one.column === column)
  if (cell === undefined) throw new Error(`${window} draws no ${column} heading`)
  const from = { x: cell.box.right - 1, y: cell.box.y + cell.box.height / 2 }
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + dx / 2, from.y, { steps: 4 })
  await page.mouse.move(from.x + dx, from.y, { steps: 4 })
  await page.waitForTimeout(300)
  const held = (await headingColumns(page, window)).find((one) => one.column === column)?.box.width ?? 0
  await page.mouse.up()
  await settle(page)
  const after = await headingColumns(page, window)
  return {
    start: cell.box.width,
    held,
    after: after.find((one) => one.column === column)?.box.width ?? 0,
    others: before.filter((one) => one.column !== column).map((one) => Math.round(one.box.width)),
    othersAfter: after.filter((one) => one.column !== column).map((one) => Math.round(one.box.width)),
  }
}

test.describe('CR-660 -- the clauses these cases are driven by', () => {
  test('SV-6, SV-7, SV-11, SV-18, RW-4, RW-9, RW-10, SQ-1, SQ-5, DT-1 and DT-4 still read this way', () => {
    for (const clause of [SV_7_CONTROLS_STAY, SV_7_MARKS_KEPT, SV_7_LISTED_ONLY, SV_7_HEADING_WORD, SV_7_CLOSE, SV_7_OUTSIDE, SV_7_DROPDOWN]) {
      expect(cellOf('T-330', 'SV-7', '定め')).toContain(clause)
    }
    expect(cellOf('T-330', 'SV-6', '定め')).toContain(SV_6_FIXED)
    expect(cellOf('T-346', 'RW-10', '定め')).toContain(RW_10_FIXED)
    for (const clause of [SV_18_MEASURED, SV_18_FOLLOW, SV_18_OTHERS]) expect(cellOf('T-330', 'SV-18', '定め')).toContain(clause)
    expect(cellOf('T-346', 'RW-9', '定め')).toContain(RW_9_MEASURED)
    expect(REQUIREMENTS).toContain(SV_11_EDGE)
    expect(cellOf('T-331', 'SQ-5', '書き方')).toContain(SQ_5_DRAW)
    expect(cellOf('T-331', 'SQ-5', '書き方')).toContain(SQ_5_GLYPHS)
    expect(cellOf('T-347', 'DT-1', '書き方')).toContain(DT_1_NO_GLYPH)
    expect(cellOf('T-346', 'RW-4', '定め')).toContain(RW_4_GLYPHS)
    expect(cellOf('T-331', 'SQ-1', '書き方')).toContain(SQ_1_LINK)
    expect(cellOf('T-347', 'DT-4', '書き方')).toContain(DT_4_LINK)
    expect(LINK.light).toMatch(/^rgb\(/)
    expect(LINK.dark).toMatch(/^rgb\(/)
  })
})

test.describe('T-331 / T-347 / SV-6 / RW-10 -- column order and the fixed columns (area 1)', () => {
  test.setTimeout(150_000)

  test('T-331 / SV-6: the tasks table heads its columns in T-331 order, and the columns up to SQ-1 stay while the rest scroll', async () => {
    const stage = await withSearch()
    try {
      const page = stage.page
      const before = await headingColumns(page, PANEL)
      expect(before.map((one) => one.column)).toEqual(TASK_COLUMNS)
      await narrowWindow(page, PANEL, 500)
      const start = await headingColumns(page, PANEL)
      const moved = await scrollTableSideways(page, PANEL, 200)
      expect(moved, 'premise: the table is wider than the panel and scrolls sideways').toBeGreaterThan(50)
      await settle(page)
      const after = await headingColumns(page, PANEL)
      const fixedCount = TASK_COLUMNS.indexOf('SQ-1') + 1
      after.forEach((one, at) => {
        const shift = (start[at]?.box.x ?? 0) - one.box.x
        if (at < fixedCount) expect(Math.abs(shift), `${one.column} is fixed (SV-6)`).toBeLessThanOrEqual(1)
        else expect(Math.abs(shift - moved), `${one.column} scrolls under the fixed columns`).toBeLessThanOrEqual(1)
      })
    } finally {
      await stage.close()
    }
  })

  test('T-347 / RW-10: the report heads its columns in T-347 order, and DT-8, DT-1, DT-3, DT-4 stay while the rest scroll', async () => {
    const stage = await withReport()
    try {
      const page = stage.page
      expect((await headingColumns(page, REPORT)).map((one) => one.column)).toEqual(REPORT_COLUMNS)
      await narrowWindow(page, REPORT, 500)
      const start = await headingColumns(page, REPORT)
      const moved = await scrollTableSideways(page, REPORT, 200)
      expect(moved, 'premise: the report table scrolls sideways').toBeGreaterThan(50)
      await settle(page)
      const after = await headingColumns(page, REPORT)
      const fixedCount = REPORT_COLUMNS.indexOf('DT-4') + 1
      after.forEach((one, at) => {
        const shift = (start[at]?.box.x ?? 0) - one.box.x
        if (at < fixedCount) expect(Math.abs(shift), `${one.column} is fixed (RW-10)`).toBeLessThanOrEqual(1)
        else expect(Math.abs(shift - moved), `${one.column} scrolls under the fixed columns`).toBeLessThanOrEqual(1)
      })
    } finally {
      await stage.close()
    }
  })
})

test.describe('T-330 SV-7 -- the search field of a value filter (area 2)', () => {
  test.setTimeout(150_000)

  test(`SV-7 「${SV_7_MARKS_KEPT}」 -- typing narrows the list and leaves every mark`, async () => {
    const stage = await withSearch()
    try {
      const page = stage.page
      const before = await narrowedByWord(page)
      const narrowed = await marksOf(page, PANEL)
      for (const one of narrowed) expect(one.listed, `SV-7 / SV-4: ${one.label} is listed iff it holds ${NARROWING_WORD}`).toBe(isHit(one))
      expect(narrowed.map((one) => [one.value, one.checked]), SV_7_MARKS_KEPT).toEqual(before.map((one) => [one.value, one.checked]))
    } finally {
      await stage.close()
    }
  })

  test(`SV-7 「${SV_7_LISTED_ONLY}」 -- IC-126 pressed on a narrowed list`, async () => {
    const stage = await withSearch()
    try {
      const page = stage.page
      const before = await narrowedByWord(page)
      await pressSelector(page, `${PANEL} [data-icon="IC-126"]`)
      const hidden = await marksOf(page, PANEL)
      const wasChecked = (one: Mark): boolean | undefined => before.find((mark) => mark.value === one.value)?.checked
      const stillTicked = hidden.filter((one) => isHit(one) && one.checked).map((one) => one.label)
      const changed = hidden.filter((one) => !isHit(one) && one.checked !== wasChecked(one)).map((one) => one.label)
      const shape = `${hidden.filter(isHit).length} listed, ${hidden.filter((one) => !isHit(one)).length} unlisted, ${hidden.filter((one) => one.listed).length} shown after IC-126`
      expect(stillTicked, `IC-126 unticks every listed value (${shape})`).toEqual([])
      expect(changed, `IC-126 leaves every unlisted value as it was (${shape})`).toEqual([])
    } finally {
      await stage.close()
    }
  })

  test(`SV-7 「${SV_7_CONTROLS_STAY}」`, async () => {
    const stage = await withSearch()
    try {
      const page = stage.page
      await openFilter(page, PANEL, 'SQ-1')
      const field = await filterFieldOf(page, PANEL)
      const showAll = await boxOf(page, `${PANEL} [data-icon="IC-125"]`)
      const firstLine = await boxOf(page, `${PANEL} input[type="checkbox"]`)
      expect(field, 'the search field').not.toBeNull()
      expect(showAll, 'IC-125').not.toBeNull()
      if (field === null || showAll === null || firstLine === null) return
      expect(field.bottom, 'the search field is above the value list').toBeLessThanOrEqual(firstLine.y + 1)
      expect(showAll.bottom, 'IC-125 is above the value list').toBeLessThanOrEqual(firstLine.y + 1)
      await page.mouse.move(firstLine.x + 20, firstLine.y + 40)
      await page.mouse.wheel(0, 400)
      await settle(page)
      const firstAfter = await boxOf(page, `${PANEL} input[type="checkbox"]`)
      expect((firstAfter?.y ?? 0) < firstLine.y - 20, 'premise: the value list scrolled').toBe(true)
      expect(await filterFieldOf(page, PANEL), 'the search field did not move').toEqual(field)
      expect(await boxOf(page, `${PANEL} [data-icon="IC-125"]`), 'IC-125 did not move').toEqual(showAll)
    } finally {
      await stage.close()
    }
  })

  test(`SV-7 「${SV_7_DROPDOWN}」 -- the filter opens under its heading cell`, async () => {
    const stage = await withSearch()
    try {
      const page = stage.page
      await openFilter(page, PANEL, 'SQ-11')
      const head = (await headingColumns(page, PANEL)).find((one) => one.column === 'SQ-11')
      const showAll = await boxOf(page, `${PANEL} [data-icon="IC-125"]`)
      expect(head).toBeDefined()
      expect(showAll).not.toBeNull()
      if (head === undefined || showAll === null) return
      expect(showAll.y, 'the filter starts below the heading row').toBeGreaterThanOrEqual(head.box.bottom - 1)
      expect(showAll.x, 'the filter starts at the heading cell').toBeGreaterThanOrEqual(head.box.x - 1)
    } finally {
      await stage.close()
    }
  })
})

test.describe('T-330 SV-7 -- how the open filter closes (area 3)', () => {
  test.setTimeout(150_000)

  test(`SV-7 「${SV_7_CLOSE}」 -- the same IC-122 pressed again closes it`, async () => {
    const stage = await withSearch()
    try {
      const page = stage.page
      await openFilter(page, PANEL, 'SQ-2')
      expect(await menuCount(page, PANEL)).toBe(1)
      await openFilter(page, PANEL, 'SQ-2')
      expect(await menuCount(page, PANEL)).toBe(0)
    } finally {
      await stage.close()
    }
  })

  test(`SV-7 「${SV_7_HEADING_WORD}」 -- the heading word of the open column closes it too`, async () => {
    const stage = await withSearch()
    try {
      const page = stage.page
      await openFilter(page, PANEL, 'SQ-5')
      expect(await menuCount(page, PANEL)).toBe(1)
      const word = await boxOf(page, `${PANEL} thead th[data-column="SQ-5"] span`)
      expect(word).not.toBeNull()
      if (word === null) return
      await pressAt(page, word.x + Math.min(10, word.width / 2), word.y + word.height / 2)
      expect(await menuCount(page, PANEL)).toBe(0)
    } finally {
      await stage.close()
    }
  })

  test(`SV-7 「${SV_7_CLOSE}」 -- a press outside closes the filter, and Esc closes it before the panel (SV-14)`, async () => {
    const stage = await withSearch()
    try {
      const page = stage.page
      await openFilter(page, PANEL, 'SQ-2')
      const canvas = await scheduleCanvasRange(page)
      const panel = await boxOf(page, PANEL)
      if (panel === null) throw new Error('premise: the panel is on the screen')
      // STEP: press the schedule outside the panel, above its top edge
      await pressAt(page, canvas.right - 60, Math.max(canvas.y + 30, panel.y - 30))
      expect(await menuCount(page, PANEL), SV_7_CLOSE).toBe(0)
      await openFilter(page, PANEL, 'SQ-2')
      expect(await menuCount(page, PANEL)).toBe(1)
      await page.keyboard.press('Escape')
      await settle(page)
      expect(await menuCount(page, PANEL), 'SV-14: Esc closes the filter').toBe(0)
      expect(await boxOf(page, PANEL), 'SV-14: the panel stays for the next Esc').not.toBeNull()
    } finally {
      await stage.close()
    }
  })

  test('SV-7 on the report: IC-122 pressed again closes, and so does a press outside', async () => {
    const stage = await withReport()
    try {
      const page = stage.page
      await openFilter(page, REPORT, 'DT-3')
      expect(await menuCount(page, REPORT)).toBe(1)
      const canvas = await scheduleCanvasRange(page)
      const report = await boxOf(page, REPORT)
      if (report === null) throw new Error('premise: the report is on the screen')
      await pressAt(page, canvas.right - 60, Math.max(canvas.y + 30, report.y - 30))
      expect(await menuCount(page, REPORT), SV_7_CLOSE).toBe(0)
      await openFilter(page, REPORT, 'DT-3')
      expect(await menuCount(page, REPORT)).toBe(1)
      await openFilter(page, REPORT, 'DT-3')
      expect(await menuCount(page, REPORT)).toBe(0)
    } finally {
      await stage.close()
    }
  })
})

test.describe('T-331 SQ-5 / T-347 DT-1 / T-346 RW-4 -- the status glyph (area 4)', () => {
  test.setTimeout(180_000)

  test(`SQ-5 「${SQ_5_GLYPHS}」 -- one glyph per glyph row, one character square, before the word`, async () => {
    const stage = await withSearch()
    try {
      const cells = await glyphCells(stage.page, PANEL, 'SQ-5')
      const byGlyphRow = new Map<string, Set<string>>()
      for (const cell of cells) {
        const state = STATE_WORD.get(cell.word)
        expect(state, `the SQ-5 word ${cell.word} is a T-019a state`).toBeDefined()
        expect(cell.glyph, `${cell.word} draws a glyph`).not.toBeNull()
        expect(Math.abs(cell.glyphPx - cell.fontPx), `${cell.word}: the glyph is one character wide`).toBeLessThanOrEqual(0.5)
        const row = GLYPH_OF_STATE[state ?? ''] ?? ''
        byGlyphRow.set(row, (byGlyphRow.get(row) ?? new Set()).add(cell.glyph ?? ''))
      }
      expect(byGlyphRow.size, 'premise: the sample holds tasks of at least three glyph rows').toBeGreaterThanOrEqual(3)
      for (const [row, glyphs] of byGlyphRow) expect(glyphs.size, `${row} is drawn one way`).toBe(1)
      const distinct = new Set([...byGlyphRow.values()].map((one) => [...one][0]))
      expect(distinct.size, 'each glyph row draws its own picture').toBe(byGlyphRow.size)
    } finally {
      await stage.close()
    }
  })

  test(`DT-1 「${DT_1_NO_GLYPH}」, and RW-4 「${RW_4_GLYPHS}」`, async () => {
    const stage = await withReport()
    try {
      const page = stage.page
      const cells = await glyphCells(page, REPORT, 'DT-1')
      expect(cells.length, 'premise: the report lists rows').toBeGreaterThan(0)
      const lefts = new Set(cells.map((one) => Math.round(one.textLeft)))
      expect(lefts.size, 'every status word starts at the same place').toBe(1)
      const byStatus = new Map<string, Set<string | null>>()
      for (const cell of cells) {
        const status = REPORT_STATUS.get(cell.word)
        expect(status, `the DT-1 word ${cell.word} is a report status`).toBeDefined()
        byStatus.set(status ?? '', (byStatus.get(status ?? '') ?? new Set()).add(cell.glyph))
        if (cell.glyph !== null) expect(Math.abs(cell.glyphPx - cell.fontPx), `${cell.word}: one character wide`).toBeLessThanOrEqual(0.5)
      }
      for (const [status, glyphs] of byStatus) {
        expect(glyphs.size, `${status} is drawn one way`).toBe(1)
        const isMarkerless = status === 'DX-3' || status === 'DX-9'
        expect([...glyphs][0] === null, `${status}: no glyph only for the doubtful and the settled`).toBe(isMarkerless)
      }
      const summary = await page.evaluate((report: string) => {
        const table = document.querySelector(`${report} table`)
        let line = table?.parentElement?.previousElementSibling ?? null
        while (line !== null && line.querySelector('svg') === null) line = line.previousElementSibling
        return Array.from(line?.children ?? []).map((item) => ({
          text: (item.textContent ?? '').trim(),
          glyph: item.querySelector('svg')?.innerHTML.replace(/ data-figure="[^"]*"/g, '') ?? null,
        }))
      }, REPORT)
      for (const [status, glyphs] of byStatus) {
        const words = [...REPORT_STATUS.entries()].filter(([, row]) => row === status).map(([said]) => said)
        const word = words.join(' / ')
        const item = summary.find((one) => words.some((said) => one.text.startsWith(said) && /^[:：\s0-9]/.test(one.text.slice(said.length))))
        expect(item, `RW-4: the summary holds ${word}`).toBeDefined()
        expect(item?.glyph ?? null, `RW-4: ${word} carries the table's glyph`).toBe([...glyphs][0] ?? null)
      }
    } finally {
      await stage.close()
    }
  })

  test('SQ-5: while the diagnosis is shown a bottleneck draws the same flame as the report DT-1 DG-2', async () => {
    const stage = await withReport()
    try {
      const page = stage.page
      const report = await glyphCells(page, REPORT, 'DT-1')
      const flame = report.find((one) => REPORT_STATUS.get(one.word) === 'DG-2')?.glyph
      expect(flame, 'premise: the sample has a bottleneck').toBeDefined()
      await page.keyboard.press(OPEN_SEARCH)
      await settle(page)
      const search = await glyphCells(page, PANEL, 'SQ-5')
      const bottlenecks = search.filter((one) => !STATE_WORD.has(one.word))
      expect(bottlenecks.length, 'premise: the search table names a bottleneck').toBeGreaterThan(0)
      for (const one of bottlenecks) expect(one.glyph, one.word).toBe(flame)
      const late = report.find((one) => REPORT_STATUS.get(one.word) === 'DG-4')?.glyph
      if (late !== undefined) expect(search.map((one) => one.glyph), 'SQ-5: PM-4 is never drawn').not.toContain(late)
    } finally {
      await stage.close()
    }
  })

  for (const scheme of ['light', 'dark'] as const) {
    test(`SQ-1 「${SQ_1_LINK}」 and DT-4 (${scheme} theme)`, async () => {
      const stage = await withReport(scheme)
      try {
        const page = stage.page
        await page.keyboard.press(OPEN_SEARCH)
        await settle(page)
        for (const [window, column] of [
          [PANEL, 'SQ-1'],
          [REPORT, 'DT-4'],
        ] as const) {
          const cells = await linkCells(page, window, column)
          expect(cells.length, `premise: ${column} has cells`).toBeGreaterThan(0)
          for (const cell of cells) {
            expect(cell.colour, `${column} in S-503 (${scheme})`).toBe(LINK[scheme])
            expect(cell.line, `${column} underlined`).toContain('underline')
          }
        }
      } finally {
        await stage.close()
      }
    })
  }
})

test.describe('T-330 SV-18 / T-346 RW-9 -- default widths and the grips (areas 5 and 6)', () => {
  test.setTimeout(180_000)

  test('SV-18: each tasks table column T-206 sizes starts at its T-206 width', async () => {
    const stage = await withSearch()
    try {
      for (const one of await headingColumns(stage.page, PANEL)) {
        const px = settingPx(one.column)
        if (px !== null) expect(Math.abs(one.box.width - px), `${one.column} -> ${WIDTH_ROW[one.column]}`).toBeLessThanOrEqual(1)
      }
    } finally {
      await stage.close()
    }
  })

  test('RW-9: each report column T-206 sizes starts at its T-206 width', async () => {
    const stage = await withReport()
    try {
      for (const one of await headingColumns(stage.page, REPORT)) {
        const px = settingPx(one.column)
        if (px !== null) expect(Math.abs(one.box.width - px), `${one.column} -> ${WIDTH_ROW[one.column]}`).toBeLessThanOrEqual(1)
      }
    } finally {
      await stage.close()
    }
  })

  test(`SV-18 / RW-9 「${RW_9_MEASURED}」 -- no measured column clips its heading or its values at any text step`, async () => {
    const stage = await withReport()
    try {
      const page = stage.page
      await page.keyboard.press(OPEN_SEARCH)
      await settle(page)
      for (let step = 0; step < STEPS; step += 1) {
        expect(await clippedCells(page, PANEL, MEASURED_TASK_COLUMNS), `search table, text step ${step}`).toEqual([])
        expect(await clippedCells(page, REPORT, MEASURED_REPORT_COLUMNS), `report table, text step ${step}`).toEqual([])
        await pressSelector(page, `${PANEL} [data-icon="${TEXT_SIZE}"]`)
      }
    } finally {
      await stage.close()
    }
  })

  test(`SV-18 「${SV_18_FOLLOW}」 -- the SQ-11 border widens SQ-11 alone`, async () => {
    const stage = await withSearch()
    try {
      const drag = await dragBorder(stage.page, PANEL, 'SQ-11', 40)
      expect(Math.abs(drag.held - drag.start - 40), 'the width follows while held').toBeLessThanOrEqual(1)
      expect(Math.abs(drag.after - drag.start - 40), 'the width settles where it was let go').toBeLessThanOrEqual(1)
      expect(drag.othersAfter, SV_18_OTHERS).toEqual(drag.others)
    } finally {
      await stage.close()
    }
  })

  test(`RW-9 「${SV_18_FOLLOW}」 -- the DT-1 border narrows DT-1 alone`, async () => {
    const stage = await withReport()
    try {
      const drag = await dragBorder(stage.page, REPORT, 'DT-1', -30)
      expect(Math.abs(drag.held - drag.start + 30), 'the width follows while held').toBeLessThanOrEqual(1)
      expect(Math.abs(drag.after - drag.start + 30), 'the width settles where it was let go').toBeLessThanOrEqual(1)
      expect(drag.othersAfter, SV_18_OTHERS).toEqual(drag.others)
    } finally {
      await stage.close()
    }
  })

  test(`SV-11 「${SV_11_EDGE}」 -- the report's right edge narrows the window`, async () => {
    const stage = await withReport()
    try {
      const page = stage.page
      const start = await boxOf(page, REPORT)
      if (start === null) throw new Error('premise: the report is on the screen')
      const from = { x: start.right - 1, y: start.y + start.height / 2 }
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      await page.mouse.move(from.x - 60, from.y, { steps: 6 })
      await page.waitForTimeout(300)
      const held = await boxOf(page, REPORT)
      await page.mouse.up()
      await settle(page)
      const after = await boxOf(page, REPORT)
      expect(Math.abs((held?.width ?? 0) - start.width + 60), 'the size follows while held').toBeLessThanOrEqual(1)
      expect(Math.abs((after?.width ?? 0) - start.width + 60), 'the size settles where it was let go').toBeLessThanOrEqual(1)
    } finally {
      await stage.close()
    }
  })
})

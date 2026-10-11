// CR-733 on the shipped build: a press anywhere in a table window brings it to the front (WB-11).

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import { ERP_SAMPLE, keyOf, openDocument, openStage, pressEntrance, settle, type Stage } from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const cellOf = (table: string, id: string, heading: string): string => unbroken(rowOf(specTable(table), id).by[heading] ?? '')

const WB_11_PRESS = 'ウィンドウのどこか（タイトルバー —— 帯（表 T-023d の `GR-24`）とタイトルバーの入口 —— ・縁（同表の `GR-25`）・本文）を押したら、押した時点で、そのウィンドウを'
const WB_11_NOT_SPENT = '押下は前に出すために費やさず、押した所のもの（入口・帯・縁・本文）がそのまま受ける'
const WB_11_LAST_PRESSED = '⭐ 同じ段の前後は、後に開いたか、後に押したものが前である'
const WB_11_NEXT = 'いちばん前のウィンドウを閉じたら、残りのうち、その次に後に開いたか押したものがいちばん前になる。'
const WB_11_ANY_STATE = '`WB-1`・`WB-2`・`WB-3` のどれでも前に出す。'
const WB_8_RAISES = '握った時点で、そのウィンドウを `WB-11` のとおり前に出す —— 中断しても前のまま。'
const SV_2_AGAIN = 'パネルが出ていれば、パネルを前に出し（`FR-036` の 表 T-335 の `WB-11`）、焦点をここへ戻し、打ってある語をすべて選ぶこと（MUST）'
const IN_4_ONE_ESC = '1 度の `Esc` で閉じるウィンドウは 1 つとし、焦点がその中にあるウィンドウを先に、ほかは `FR-152` の 表 T-337 の手前のものから閉じること（MUST）'
const IN_4_FRONT_IS_WB_11 = '表のウィンドウの前後は 表 T-335 の `WB-11` が持つ。'

const T_103 = specTable('T-103')
const roleOf = (id: string): string => `[data-role="${bare(rowOf(T_103, id).cells[0] ?? '')}"]`
const ICON = (id: string): string => rowOf(specTable('T-109'), id).id
const SEARCH = roleOf('U-64')
const REPORT = roleOf('U-66')
const LIST = roleOf('U-49')
const OPEN_SEARCH_KEY = keyOf('SK-24')
const IC_52_CLOSE = ICON('IC-52')
const IC_62_LIST = ICON('IC-62')
const IC_107_REPORT = ICON('IC-107')
const IC_117_SEARCH = ICON('IC-117')
const IC_119_COMMENT_TABLE = ICON('IC-119')
const IC_129_MINIMIZE = ICON('IC-129')
const EDGE = Number(/(\d+)px/.exec(cellOf('T-206', 'S-426', '既定'))?.[1] ?? Number.NaN)

interface Box {
  readonly x: number
  readonly y: number
  readonly right: number
  readonly bottom: number
  readonly width: number
  readonly height: number
}

type Which = 'search' | 'report' | 'list'

const ROLE_OF: Readonly<Record<Which, string>> = { search: SEARCH, report: REPORT, list: LIST }
const ALL_WINDOWS = `${SEARCH},${REPORT},${LIST}`

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
  const one = await openStage(browser)
  await openDocument(one.page, 'sample-large-erp-program.ja.xml', ERP_SAMPLE)
  return one
}

/** @purity non-pure */
async function openWindow(page: Page, which: Which): Promise<void> {
  if (which === 'search') {
    await page.keyboard.press(OPEN_SEARCH_KEY)
    await settle(page)
  } else {
    expect(await pressEntrance(page, which === 'report' ? IC_107_REPORT : IC_62_LIST), `the entrance of ${which} is on the screen`).toBe(true)
  }
  await expect(page.locator(ROLE_OF[which])).toHaveCount(1)
  await settle(page)
}

/** @purity semi-pure-b */
async function boxOf(page: Page, selector: string): Promise<Box> {
  const box = await page.evaluate((wanted: string) => {
    const found = document.querySelector(wanted)?.getBoundingClientRect()
    return found === undefined ? null : { x: found.x, y: found.y, right: found.right, bottom: found.bottom, width: found.width, height: found.height }
  }, selector)
  expect(box, `${selector} is on the screen`).not.toBeNull()
  return box as Box
}

// WHY: WB-11 and UZ-6 speak of what is in front at a point; the element the browser finds there is what the author sees.
/** @purity semi-pure-b */
async function windowAt(page: Page, x: number, y: number): Promise<Which | null> {
  const role = await page.evaluate(
    ({ px, py, windows }: { px: number; py: number; windows: string }) =>
      document.elementFromPoint(px, py)?.closest(windows)?.getAttribute('data-role') ?? null,
    { px: x, py: y, windows: ALL_WINDOWS },
  )
  const found = (Object.keys(ROLE_OF) as Which[]).find((which) => ROLE_OF[which] === `[data-role="${role}"]`)
  return found ?? null
}

/** @purity semi-pure-b */
async function titleBarY(page: Page, which: Which): Promise<number> {
  const close = await boxOf(page, `${ROLE_OF[which]} [data-icon="${IC_52_CLOSE}"]`)
  return close.y + close.height / 2
}

/** @purity non-pure */
async function pressAt(page: Page, x: number, y: number): Promise<void> {
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.up()
  await settle(page)
}

/** @purity non-pure */
async function dragFrom(page: Page, x: number, y: number, dx: number, dy: number): Promise<void> {
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 6 })
  await page.mouse.move(x + dx, y + dy, { steps: 6 })
  await page.mouse.up()
  await settle(page)
}

interface Overlap {
  readonly back: Which
  readonly front: Which
  readonly backBox: Box
  readonly frontBox: Box
}

// WHY: both windows open in the same SV-9 box; the later one is dragged right by half its width so the earlier one's left half shows.
/** @purity non-pure */
async function overlapped(page: Page, back: Which, front: Which): Promise<Overlap> {
  await openWindow(page, back)
  await openWindow(page, front)
  const first = await boxOf(page, ROLE_OF[front])
  const y = await titleBarY(page, front)
  await dragFrom(page, first.x + 14, y, Math.round(first.width / 2), 0)
  const backBox = await boxOf(page, ROLE_OF[back])
  const frontBox = await boxOf(page, ROLE_OF[front])
  expect(frontBox.x, 'the front window was dragged right').toBeGreaterThan(backBox.x + 100)
  return { back, front, backBox, frontBox }
}

/** @purity semi-pure-b */
function overlapPoint(one: Overlap): { x: number; y: number } {
  return { x: (one.frontBox.x + one.backBox.right) / 2, y: one.backBox.y + one.backBox.height * 0.6 }
}

/** @purity non-pure */
async function expectFrontAtOverlap(page: Page, one: Overlap, wanted: Which, why: string): Promise<void> {
  const at = overlapPoint(one)
  expect(await windowAt(page, at.x, at.y), why).toBe(wanted)
}

/** @purity semi-pure-b */
function backVisibleX(one: Overlap): number {
  return (one.backBox.x + one.frontBox.x) / 2
}

/** @purity non-pure */
async function bringFrontAgain(page: Page, one: Overlap): Promise<void> {
  await pressAt(page, one.frontBox.right - 30, one.frontBox.y + one.frontBox.height * 0.6)
  await expectFrontAtOverlap(page, one, one.front, 'a press on the right part of the window restores it to the front (WB-11)')
}

const PAIRS: readonly (readonly [Which, Which])[] = [
  ['search', 'report'],
  ['report', 'search'],
  ['list', 'report'],
]

test.describe('CR-733 -- the clauses these cases are driven by', () => {
  test('WB-11, WB-8, SV-2, IN-4 and the rows that point at WB-11 still read this way', () => {
    const wb11 = cellOf('T-335', 'WB-11', '定め')
    expect(wb11 || unbroken(rowOf(specTable('T-335'), 'WB-11').cells.join(' '))).toContain(WB_11_PRESS)
    const whole = unbroken(rowOf(specTable('T-335'), 'WB-11').cells.join(' '))
    expect(whole).toContain(WB_11_NOT_SPENT)
    expect(whole).toContain(WB_11_LAST_PRESSED)
    expect(whole).toContain(WB_11_NEXT)
    expect(whole).toContain(WB_11_ANY_STATE)
    expect(unbroken(rowOf(specTable('T-335'), 'WB-8').cells.join(' '))).toContain(WB_8_RAISES)
    expect(unbroken(rowOf(specTable('T-330'), 'SV-2').cells.join(' '))).toContain(SV_2_AGAIN)
    expect(REQUIREMENTS).toContain(IN_4_ONE_ESC)
    expect(REQUIREMENTS).toContain(IN_4_FRONT_IS_WB_11)
    for (const [table, id] of [['T-337', 'UZ-6'], ['T-346', 'RW-5'], ['T-370', 'RO-6']] as const) {
      expect(unbroken(rowOf(specTable(table), id).cells.join(' ')), `${id} points at WB-11`).toContain('`WB-11`')
    }
    expect(EDGE, 'S-426 is a px width').toBeGreaterThan(0)
  })
})

for (const [back, front] of PAIRS) {
  test.describe(`WB-11 -- ${back} behind ${front}`, () => {
    test('a press on the body, the title bar and the edge brings the back window to the front, and a press on the other one takes it back', async () => {
      const one = await stage()
      try {
        const o = await overlapped(one.page, back, front)
        await expectFrontAtOverlap(one.page, o, front, 'the window opened later is in front (WB-11, UZ-6)')
        const x = backVisibleX(o)
        const titleY = await titleBarY(one.page, back)
        const kinds: readonly (readonly [string, number, number])[] = [
          ['body', x, o.backBox.y + o.backBox.height * 0.6],
          ['title bar', o.backBox.x + 12, titleY],
          ['edge (GR-25 outside the top)', x, o.backBox.y - Math.max(2, EDGE / 2)],
        ]
        for (const [kind, px, py] of kinds) {
          expect(await windowAt(one.page, px, py), `the ${kind} point shows ${back}, or its edge band`).not.toBe(front)
          await pressAt(one.page, px, py)
          await expectFrontAtOverlap(one.page, o, back, `a press on the ${kind} of the back window brings it to the front (WB-11)`)
          await bringFrontAgain(one.page, o)
        }
      } finally {
        await one.close()
      }
    })

    test('a drag of the back window by its title bar moves it and leaves it in front; an Esc during the grab puts the window back and it stays in front (WB-8)', async () => {
      const one = await stage()
      try {
        const o = await overlapped(one.page, back, front)
        const titleY = await titleBarY(one.page, back)
        const from = { x: o.backBox.x + 12, y: titleY }
        await dragFrom(one.page, from.x, from.y, 0, -40)
        const moved = await boxOf(one.page, ROLE_OF[back])
        expect(moved.y, 'the window followed the pointer up').toBeLessThan(o.backBox.y - 20)
        await expectFrontAtOverlap(one.page, { ...o, backBox: moved }, back, 'the dragged window is in front (WB-8, WB-11)')
        await bringFrontAgain(one.page, { ...o, backBox: moved })

        // STEP: grab again, move, press Esc, release
        const again = await boxOf(one.page, ROLE_OF[back])
        const restPoint = { x: again.x + 12, y: await titleBarY(one.page, back) }
        await one.page.mouse.move(restPoint.x, restPoint.y)
        await one.page.mouse.down()
        await one.page.mouse.move(restPoint.x, restPoint.y + 30, { steps: 6 })
        await one.page.keyboard.press('Escape')
        await one.page.mouse.up()
        await settle(one.page)
        const after = await boxOf(one.page, ROLE_OF[back])
        expect(Math.abs(after.y - again.y), 'the aborted grab left the window where it was (IN-1)').toBeLessThan(2)
        await expectFrontAtOverlap(one.page, { ...o, backBox: after }, back, 'the window grabbed and aborted stays in front (WB-8)')
      } finally {
        await one.close()
      }
    })

    test('DFC-2420: a press-drag just inside the front window\'s title-bar left end, over the back window\'s edge band, moves the front window and it stays in front', async () => {
      const one = await stage()
      try {
        await openWindow(one.page, back)
        await openWindow(one.page, front)
        const a = await boxOf(one.page, ROLE_OF[back])
        const b = await boxOf(one.page, ROLE_OF[front])
        const titleY = await titleBarY(one.page, front)
        // WHY: 4px inside the back window's right end puts the title-bar left end under its outside edge band.
        await dragFrom(one.page, b.x + 14, titleY, Math.round(a.right - 4 - b.x), 0)
        const placed = await boxOf(one.page, ROLE_OF[front])
        const backNow = await boxOf(one.page, ROLE_OF[back])
        const probe = { x: placed.x + EDGE + 3, y: titleY }
        expect(probe.x, 'the probe lies in the back window\'s outside edge band').toBeGreaterThan(backNow.right)
        expect(probe.x).toBeLessThanOrEqual(backNow.right + EDGE)
        expect(await windowAt(one.page, probe.x, probe.y), 'the front window is in front at the probe').toBe(front)
        await dragFrom(one.page, probe.x, probe.y, 0, -30)
        const afterFront = await boxOf(one.page, ROLE_OF[front])
        const afterBack = await boxOf(one.page, ROLE_OF[back])
        expect(afterFront.y, 'the front window moved with the pointer').toBeLessThan(placed.y - 15)
        expect(afterBack.width, 'the back window was not resized').toBeCloseTo(backNow.width, 0)
        expect(afterBack.height).toBeCloseTo(backNow.height, 0)
        expect(await windowAt(one.page, probe.x, afterFront.y + (titleY - placed.y)), 'the front window is still in front').toBe(front)
      } finally {
        await one.close()
      }
    })
  })
}

test.describe('WB-11 -- the pressed control still acts', () => {
  test('a press on the comment-box table entrance of a back search panel switches the table and brings the panel to the front', async () => {
    const one = await stage()
    try {
      const o = await overlapped(one.page, 'search', 'report')
      const columns = async (): Promise<string[]> =>
        one.page.evaluate((window: string) => Array.from(document.querySelectorAll(`${window} thead th`)).map((cell) => cell.getAttribute('data-column') ?? ''), SEARCH)
      const before = await columns()
      const entrance = await boxOf(one.page, `${SEARCH} [data-icon="${IC_119_COMMENT_TABLE}"]`)
      const at = { x: entrance.x + entrance.width / 2, y: entrance.y + entrance.height / 2 }
      expect(await windowAt(one.page, at.x, at.y), 'the entrance is in the part nobody covers').toBe('search')
      await pressAt(one.page, at.x, at.y)
      expect(await columns(), 'the entrance acted on the first press (WB-11: the press is not spent on raising)').not.toEqual(before)
      await expectFrontAtOverlap(one.page, o, 'search', 'the same press brought the panel to the front')
    } finally {
      await one.close()
    }
  })

  test('a press on the minimize entrance of a back window acts on the first press (WB-11: the press is not spent on raising)', async () => {
    const one = await stage()
    try {
      await openWindow(one.page, 'search')
      await openWindow(one.page, 'report')
      const first = await boxOf(one.page, REPORT)
      const y = await titleBarY(one.page, 'report')
      // WHY: moving the report right by its width leaves the search panel's entrances uncovered.
      await dragFrom(one.page, first.x + 14, y, Math.round(first.width), 0)
      const entrance = await boxOf(one.page, `${SEARCH} [data-icon="${IC_129_MINIMIZE}"]`)
      const heightBefore = (await boxOf(one.page, SEARCH)).height
      await pressAt(one.page, entrance.x + entrance.width / 2, entrance.y + entrance.height / 2)
      expect((await boxOf(one.page, SEARCH)).height, 'the first press minimized the window (WB-2)').toBeLessThan(heightBefore / 2)
    } finally {
      await one.close()
    }
  })
})

test.describe('WB-11 / WB-2 -- a minimized window comes to the front when pressed', () => {
  test('a press on the title bar of a minimized search panel puts it in front of the report and leaves it minimized', async () => {
    const one = await stage()
    try {
      await openWindow(one.page, 'search')
      const entrance = await boxOf(one.page, `${SEARCH} [data-icon="${IC_129_MINIMIZE}"]`)
      await pressAt(one.page, entrance.x + entrance.width / 2, entrance.y + entrance.height / 2)
      const bar = await boxOf(one.page, SEARCH)
      expect(bar.height, 'the search panel is minimized (WB-2)').toBeLessThan(80)
      await openWindow(one.page, 'report')
      const report = await boxOf(one.page, REPORT)
      const y = await titleBarY(one.page, 'report')
      // STEP: drag the report over the right half of the minimized bar
      await dragFrom(one.page, report.x + 14, y, Math.round(bar.x + bar.width / 2 - report.x), 0)
      const reportNow = await boxOf(one.page, REPORT)
      const barNow = await boxOf(one.page, SEARCH)
      const covered = { x: barNow.x + barNow.width * 0.75, y: barNow.y + barNow.height / 2 }
      const bare = { x: barNow.x + 8, y: barNow.y + barNow.height / 2 }
      expect(await windowAt(one.page, covered.x, covered.y), 'the report covers the right half of the bar').toBe('report')
      expect(reportNow.x).toBeGreaterThan(barNow.x)
      await pressAt(one.page, bare.x, bare.y)
      expect(await windowAt(one.page, covered.x, covered.y), 'the minimized panel is in front after a press (WB-11 holds in WB-2)').toBe('search')
      expect((await boxOf(one.page, SEARCH)).height, 'the press did not restore it').toBeLessThan(80)
    } finally {
      await one.close()
    }
  })
})

test.describe('WB-11 -- opening puts a window in front', () => {
  test('the window opened last is in front, and a window closed and opened again is in front of the one that stayed', async () => {
    const one = await stage()
    try {
      await openWindow(one.page, 'report')
      await openWindow(one.page, 'search')
      const a = await boxOf(one.page, SEARCH)
      const at = { x: a.x + a.width / 2, y: a.y + a.height * 0.6 }
      expect(await windowAt(one.page, at.x, at.y), 'the panel opened after the report is in front').toBe('search')
      await pressAt(one.page, a.right - 20, await titleBarY(one.page, 'search'))
      await one.page.waitForTimeout(100)
      await openWindow(one.page, 'list')
      expect(await windowAt(one.page, at.x, at.y), 'the roster opened last is in front of both').toBe('list')
      // STEP: close the roster, then the panel, then open the panel again
      const closeList = await boxOf(one.page, `${LIST} [data-icon="${IC_52_CLOSE}"]`)
      await pressAt(one.page, closeList.x + closeList.width / 2, closeList.y + closeList.height / 2)
      await expect(one.page.locator(LIST)).toHaveCount(0)
      expect(await windowAt(one.page, at.x, at.y), 'after the front window closes, the next most recently opened one is in front (WB-11)').toBe('search')
      const closeSearch = await boxOf(one.page, `${SEARCH} [data-icon="${IC_52_CLOSE}"]`)
      await pressAt(one.page, closeSearch.x + closeSearch.width / 2, closeSearch.y + closeSearch.height / 2)
      await expect(one.page.locator(SEARCH)).toHaveCount(0)
      expect(await windowAt(one.page, at.x, at.y), 'the report remains').toBe('report')
      await openWindow(one.page, 'search')
      const again = await boxOf(one.page, SEARCH)
      expect(await windowAt(one.page, again.x + again.width / 2, again.y + again.height * 0.6), 'a reopened panel is in front (WB-6, WB-11)').toBe('search')
    } finally {
      await one.close()
    }
  })

  test('closing the front of three windows leaves the most recently opened of the other two in front, and again', async () => {
    const one = await stage()
    try {
      await openWindow(one.page, 'search')
      await openWindow(one.page, 'report')
      await openWindow(one.page, 'list')
      const box = await boxOf(one.page, LIST)
      const at = { x: box.x + box.width / 2, y: box.y + box.height * 0.6 }
      expect(await windowAt(one.page, at.x, at.y)).toBe('list')
      const closeList = await boxOf(one.page, `${LIST} [data-icon="${IC_52_CLOSE}"]`)
      await pressAt(one.page, closeList.x + closeList.width / 2, closeList.y + closeList.height / 2)
      expect(await windowAt(one.page, at.x, at.y), 'the report was opened after the panel, so it is next in front').toBe('report')
      const closeReport = await boxOf(one.page, `${REPORT} [data-icon="${IC_52_CLOSE}"]`)
      await pressAt(one.page, closeReport.x + closeReport.width / 2, closeReport.y + closeReport.height / 2)
      expect(await windowAt(one.page, at.x, at.y), 'then the panel').toBe('search')
    } finally {
      await one.close()
    }
  })
})

test.describe('SV-2 / IC-117 / SK-24 -- a shown search panel comes to the front with the focus', () => {
  /** @purity non-pure */
  async function arranged(): Promise<{ readonly one: Stage; readonly o: Overlap }> {
    const one = await stage()
    await openWindow(one.page, 'search')
    await one.page.keyboard.type('a')
    await settle(one.page)
    await openWindow(one.page, 'report')
    const report = await boxOf(one.page, REPORT)
    await dragFrom(one.page, report.x + 14, await titleBarY(one.page, 'report'), Math.round(report.width / 2), 0)
    const backBox = await boxOf(one.page, SEARCH)
    const frontBox = await boxOf(one.page, REPORT)
    return { one, o: { back: 'search', front: 'report', backBox, frontBox } }
  }

  /** @purity semi-pure-b */
  async function field(page: Page): Promise<{ readonly inPanel: boolean; readonly value: string; readonly selected: string }> {
    return page.evaluate((panel: string) => {
      const active = document.activeElement as HTMLInputElement | null
      const inPanel = active !== null && document.querySelector(panel)?.contains(active) === true
      const value = active !== null && 'value' in active ? String(active.value) : ''
      const selected =
        active !== null && typeof active.selectionStart === 'number' && typeof active.selectionEnd === 'number'
          ? value.slice(active.selectionStart, active.selectionEnd)
          : ''
      return { inPanel, value, selected }
    }, SEARCH)
  }

  test('SK-24 on a search panel hidden behind the report brings it to the front, focuses the field and selects the typed word', async () => {
    const { one, o } = await arranged()
    try {
      await expectFrontAtOverlap(one.page, o, 'report', 'the report opened later is in front')
      await pressAt(one.page, o.frontBox.right - 30, o.frontBox.y + o.frontBox.height * 0.6)
      await one.page.keyboard.press(OPEN_SEARCH_KEY)
      await settle(one.page)
      await expectFrontAtOverlap(one.page, o, 'search', 'SK-24 brought the shown panel to the front (SV-2)')
      const now = await field(one.page)
      expect(now.inPanel, 'the focus is in the panel').toBe(true)
      expect(now.value, 'the typed word is still there').not.toBe('')
      expect(now.selected, 'every typed word is selected').toBe(now.value)
    } finally {
      await one.close()
    }
  })

  test('IC-117 on a shown search panel hidden behind the report does the same', async () => {
    const { one, o } = await arranged()
    try {
      await pressAt(one.page, o.frontBox.right - 30, o.frontBox.y + o.frontBox.height * 0.6)
      await expectFrontAtOverlap(one.page, o, 'report', 'the report is in front after a press on it')
      expect(await pressEntrance(one.page, IC_117_SEARCH), 'IC-117 is on the screen').toBe(true)
      await expectFrontAtOverlap(one.page, o, 'search', 'IC-117 brought the shown panel to the front (IC-117)')
      const now = await field(one.page)
      expect(now.inPanel).toBe(true)
      expect(now.selected).toBe(now.value)
      expect(now.value).not.toBe('')
    } finally {
      await one.close()
    }
  })
})

test.describe('IN-4 -- Esc closes the window that is in front, by the order WB-11 keeps', () => {
  test('the window pressed last closes first, then the other', async () => {
    const one = await stage()
    try {
      const o = await overlapped(one.page, 'report', 'list')
      await expectFrontAtOverlap(one.page, o, 'list', 'the roster opened later is in front')
      await pressAt(one.page, backVisibleX(o), o.backBox.y + o.backBox.height * 0.6)
      await expectFrontAtOverlap(one.page, o, 'report', 'a press brought the report to the front')
      await one.page.keyboard.press('Escape')
      await settle(one.page)
      await expect(one.page.locator(REPORT), 'the report pressed last closed first').toHaveCount(0)
      await expect(one.page.locator(LIST)).toHaveCount(1)
      await one.page.keyboard.press('Escape')
      await settle(one.page)
      await expect(one.page.locator(LIST)).toHaveCount(0)
    } finally {
      await one.close()
    }
  })

  test('the roster opened after the report closes before the report (the old fixed order closed the report first)', async () => {
    const one = await stage()
    try {
      await openWindow(one.page, 'report')
      await openWindow(one.page, 'list')
      await one.page.keyboard.press('Escape')
      await settle(one.page)
      await expect(one.page.locator(LIST), 'the roster opened later closed first').toHaveCount(0)
      await expect(one.page.locator(REPORT)).toHaveCount(1)
    } finally {
      await one.close()
    }
  })

  test('after the front panel is closed with IC-52, Esc closes the roster that is then in front', async () => {
    const one = await stage()
    try {
      await openWindow(one.page, 'report')
      await openWindow(one.page, 'list')
      await openWindow(one.page, 'search')
      const closeSearch = await boxOf(one.page, `${SEARCH} [data-icon="${IC_52_CLOSE}"]`)
      await pressAt(one.page, closeSearch.x + closeSearch.width / 2, closeSearch.y + closeSearch.height / 2)
      await expect(one.page.locator(SEARCH)).toHaveCount(0)
      await one.page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
      await one.page.keyboard.press('Escape')
      await settle(one.page)
      await expect(one.page.locator(LIST), 'the roster opened after the report closed next').toHaveCount(0)
      await expect(one.page.locator(REPORT)).toHaveCount(1)
    } finally {
      await one.close()
    }
  })
})

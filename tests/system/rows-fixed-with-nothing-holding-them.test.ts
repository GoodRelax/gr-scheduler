// System cases for seven rows of `docs/development-records/defects.md` that
// stood at 「試験待ち」 on 2026-09-03: the fix is in and was measured by hand on
// the shipped build, and nothing automated holds it down.
//
//   D-27   the panel width does not come back when an unrelated edit is undone
//   D-115  the scrollbars are drawn no thinner than the floor `FR-051` gives
//   D-133  committing a field moves the panel as well as the row
//   D-157  a collapsed row's descendants are collapsed too, and open one tier
//   D-180  a row's name is edited by pressing it twice
//   D-209  a highlight box is placed by a drag and never by a click
//   D-215  this file IS the road -- see below
//
// ⭐⭐ D-215 IS WHY THIS FILE EXISTS AT ALL, AND WHY IT IS A PLAYWRIGHT FILE.
// The row asked for 「`UF-47` に在る規則を測る道」 -- the rules that live in the
// shell and in no unit, so that `keyof typeof Shell` is `never` and no Vitest
// can reach them. Its two candidates were ① measure them through table T-218's
// `TS-3` (`tests/system/`, Playwright) and ② publish the points as a seam. ⛔ ②
// was never available: `PI-25` of Chapter 5.3 states that `SingleHtmlShell`
// 「他のコンポーネントから呼ばれるメンバを持たない」, so publishing one would
// break the manuscript rather than satisfy it. ⇒ ①, which is this file. Two of
// the cases below can be measured NOWHERE ELSE and are D-215's own evidence:
//   * `FR-051`'s floor on the scrollbars (`S-205`) -- the halving and the floor
//     are applied against a thickness the HOST reports, and no host reports one
//     to a Vitest.
//   * `FR-100`'s host warning -- registered on the window by the shell, and
//     asserted here through the event itself rather than through a member.
//
// ⛔ NO `swsCase` IS DECLARED HERE, for the reason
// `tests/system/user-reported-fixes.test.ts` gives: table T-219 row `TW-2` has
// Chapter 9's cases generated from those declarations and hung from an
// `SWS-xxx` node, and none of Chapter 6.1's nodes is about any of these seven.
// The rows each case leans on are named in prose, at the case.
//
// ⭐ EVERY NUMBER ASSERTED IS READ OUT OF `docs/spec` AT READ TIME -- the
// scrollbar floor, the boundary between a press and a drag, the screen of the
// base environment, and the column a field stands for. Nothing below is a
// number measured off the running application. Chapter 1.9 (`:275`) asks
// exactly this of a test that verifies a requirement pointing at a table.
//
// ⭐ EACH CASE SAYS WHAT WOULD MAKE IT GO RED, in the sentence above its body.
//
// ⛔ WHAT WAS READ OF `src/`: nothing. Every handle used here
// (`[data-role]`, `[data-icon]`, `[data-depth]`, `[data-field-row]`) is one the
// neighbouring System files already lean on, and the specification settles none
// of them -- see `tests/system/live-app.ts`, which says so of `DRAWN_SVG`.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { specTable, type SpecTable } from '../contract/spec-table'
import { launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

// ---------------------------------------------------------------------------
// What the specification says, read at read time
// ---------------------------------------------------------------------------

const T025: SpecTable = specTable('T-025')
const T058: SpecTable = specTable('T-058')
const T109: SpecTable = specTable('T-109')
const T206: SpecTable = specTable('T-206')

/** The first number written in a cell. @purity pure */
function numberIn(cell: string, what: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) {
    throw new Error(`${what} states no number this file can read: ${JSON.stringify(cell)}`)
  }
  return value
}

/** The default a row of table T-206 states. @purity pure */
function settingOf(id: string): number {
  const row = rowOf(T206, id)
  return numberIn(row.cells[1] ?? '', `table T-206 row ${id}`)
}

/**
 * `S-205` -- 「`Scrollbars` の太さの下限（`FR-051`）」. The floor `FR-051` (MUST)
 * applies after halving the host's own default.
 */
const SCROLLBAR_FLOOR_PX = settingOf('S-205')

/**
 * `S-208` -- 「図形を置くときに押しと引きを分ける距離」, which `FR-019` (MUST)
 * makes the boundary between a press and a drag when an annotation is placed.
 */
const PRESS_OR_DRAG_PX = settingOf('S-208')

/** The screen of the base environment: table T-025, row `MC-6`. */
const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

/**
 * The `AT-nn` of table T-058 that is one column of one entity.
 *
 * ⭐ Resolved rather than written: the shell marks a field of the properties
 * panel with the row of table T-058 it edits, and naming the entity and the
 * column here means the case follows the manuscript if a row is renumbered.
 *
 * @purity pure
 */
function columnRowOf(entity: string, column: string): string {
  const found = T058.rows.filter(
    (row) => (row.cells[0] ?? '').includes(entity) && (row.cells[1] ?? '').includes(`\`${column}\``),
  )
  if (found.length !== 1) {
    throw new Error(
      `table T-058 has ${found.length} rows for ${entity}.${column}, and this file needs one`,
    )
  }
  return found[0]?.id ?? ''
}

/** `AT-53` -- `TaskGroup.label`, the field `MK-13` (MUST) puts the focus in. */
const ROW_NAME_COLUMN = columnRowOf('TaskGroup', 'label')
/** `AT-59` -- `TaskGroup.height`, the row's own height. */
const ROW_HEIGHT_COLUMN = columnRowOf('TaskGroup', 'height')

/**
 * The one entrance of table T-109 whose purpose names this text.
 *
 * ⭐ Found by what the table says the entrance does, so that no case spells an
 * `IC-nn` of its own.
 *
 * @purity pure
 */
function entranceNaming(text: string): string {
  const found = T109.rows.filter((row) => (row.cells[2] ?? '').includes(text))
  if (found.length !== 1) {
    throw new Error(
      `table T-109 has ${found.length} entrances whose purpose names ${JSON.stringify(text)}, ` +
        'and this file needs exactly one',
    )
  }
  return found[0]?.id ?? ''
}

/**
 * Words of the manuscript this file has to match an entrance's purpose against,
 * built from their code points.
 *
 * ⚠️ Rule 03 section 5 keeps this tree ASCII, and `tests/system/live-app.ts`
 * gives the same reason for the one character it needs: a literal would be
 * invisible in a diff. Every one of these is a phrase table T-109 prints in its
 * 目的 column.
 */
/** U+884C U+306E U+914D U+4E0B U+3092 U+3059 U+3079 U+3066 U+7573 U+3080 -- 「行の配下をすべて畳む」. */
const FOLD_ALL_BELOW = String.fromCharCode(
  0x884c, 0x306e, 0x914d, 0x4e0b, 0x3092, 0x3059, 0x3079, 0x3066, 0x7573, 0x3080,
)
/** U+884C U+306E U+914D U+4E0B U+3092 1 U+968E U+5C64 U+3060 U+3051 U+958B U+304F -- 「行の配下を 1 階層だけ開く」. */
const OPEN_ONE_TIER = String.fromCharCode(
  0x884c, 0x306e, 0x914d, 0x4e0b, 0x3092, 0x0020, 0x0031, 0x0020, 0x968e, 0x5c64, 0x3060, 0x3051,
  0x958b, 0x304f,
)
/** U+30B3 U+30E1 U+30F3 U+30C8 U+30DC U+30C3 U+30AF U+30B9 -- 「コメントボックス」. */
const COMMENT_BOX_WORD = String.fromCharCode(
  0x30b3, 0x30e1, 0x30f3, 0x30c8, 0x30dc, 0x30c3, 0x30af, 0x30b9,
)
/** U+30CF U+30A4 U+30E9 U+30A4 U+30C8 U+30DC U+30C3 U+30AF U+30B9 -- 「ハイライトボックス」. */
const HIGHLIGHT_BOX_WORD = String.fromCharCode(
  0x30cf, 0x30a4, 0x30e9, 0x30a4, 0x30c8, 0x30dc, 0x30c3, 0x30af, 0x30b9,
)

/** `IC-77` -- 表 T-051 の `HF-11`, which does 表 T-015 の `HR-4`. */
const FOLD_BELOW_ENTRANCE = entranceNaming(FOLD_ALL_BELOW)
/** `IC-90` -- 表 T-051 の `HF-13`, which does 表 T-015 の `HR-7`. */
const OPEN_ONE_TIER_ENTRANCE = entranceNaming(OPEN_ONE_TIER)
/**
 * The entrance that arms one of table T-023b's holdings.
 *
 * ⛔ NOT `entranceNaming`: table T-109 prints 「コメントボックス」 in the purpose
 * of two entrances (arming one, and editing the text of one), so the word alone
 * does not pick a row. ⭐ The 構え column does: table T-023b names the holding,
 * and table T-109's last column says which entrance arms it.
 *
 * @purity pure
 */
function entranceArming(holding: string): string {
  const armed = specTable('T-023b').rows.filter((row) => (row.cells[0] ?? '').includes(holding))
  if (armed.length !== 1) {
    throw new Error(`table T-023b has ${armed.length} holdings named ${JSON.stringify(holding)}`)
  }
  const wanted = new RegExp(`${armed[0]?.id ?? ''}(?![0-9])`)
  const found = T109.rows.filter((row) => wanted.test(row.cells[row.cells.length - 1] ?? ''))
  if (found.length !== 1) {
    throw new Error(
      `table T-109 has ${found.length} entrances arming ${armed[0]?.id ?? ''}, and this file needs one`,
    )
  }
  return found[0]?.id ?? ''
}

/** `IC-35` -- the entrance that arms 表 T-023b の `AR-5`, the comment box. */
const COMMENT_BOX_ENTRANCE = entranceArming(COMMENT_BOX_WORD)
/** `IC-36` -- the entrance that arms 表 T-023b の `AR-6`, the highlight box. */
const HIGHLIGHT_BOX_ENTRANCE = entranceArming(HIGHLIGHT_BOX_WORD)

// ---------------------------------------------------------------------------
// Driving the running application
// ---------------------------------------------------------------------------

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  await browser?.close()
})

/** The browser opened for this file, or a failure that says it was not. @purity semi-pure-b */
function openedBrowser(): Browser {
  if (browser === null) throw new Error('the reference browser was not opened')
  return browser
}

interface Opened {
  readonly page: Page
  close(): Promise<void>
}

/**
 * ⛔ THE SAME HANDLES the neighbouring System files lean on, and no others.
 * Nothing in the specification says how a part is marked in the page.
 */
const CANVAS = '[data-role="Schedule Canvas"] svg'
const CANVAS_PART = '[data-role="Schedule Canvas"]'
const ROW_PANEL = '[data-role="Row Title Panel"]'
const PROPERTIES = '[data-role="Properties Panel"]'
const SCROLLBARS = '[data-role="Scrollbars"]'
const DIVIDER = '[data-role="Panel Divider"]'

/**
 * The application, up and settled, on the screen of the base environment.
 *
 * @purity non-pure
 */
async function openTheApp(baseURL: string | undefined): Promise<Opened> {
  if (baseURL === undefined) {
    throw new Error('playwright.config.ts declares no baseURL for the running application')
  }
  const context = await openedBrowser().newContext({ baseURL, viewport: BASE_SCREEN })
  const page = await context.newPage()
  await page.goto('/')
  await readSettledDrawnSvg(page)
  return {
    page,
    /** @purity non-pure */
    async close(): Promise<void> {
      await context.close()
    },
  }
}

/** One row of the row title panel, as the page drew it. */
interface DrawnRow {
  readonly depth: number
  readonly height: number
  readonly label: string
  /**
   * Whether `FR-085` cut the name to fit the panel.
   *
   * ⚠️ Every case that compares a name against one it typed reads this first:
   * a name longer than the room comes back with an ellipsis, and that is
   * `FR-085` working, not the row failing.
   */
  readonly isCut: boolean
}

/** Every row the panel is drawing right now, in the order it drew them. @purity semi-pure-b */
async function drawnRows(page: Page): Promise<DrawnRow[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-depth]')).map((row) => ({
      depth: Number(row.getAttribute('data-depth')),
      height: Math.round(row.getBoundingClientRect().height),
      label: (row.querySelector('span')?.textContent ?? '').trim(),
      isCut: row.getAttribute('data-truncated') === 'true',
    })),
  )
}

/**
 * A short name, so that `FR-085` has no reason to cut it.
 *
 * ⭐ Short and not long on purpose: what these cases compare is the name the
 * panel and the heading show against the name they were given, and a name the
 * panel legitimately cuts would make them argue about `FR-085` instead.
 */
const SHORT_NAME = 'Row Zed'

/**
 * A point on a row's name that the name itself answers for.
 *
 * ⛔ NOT THE MIDDLE OF THE NAME'S BOX. The row's folding controls are drawn
 * over the far end of that box, so the middle reaches a button -- measured
 * 2026-09-03, where a press at the centre put the focus on the fold entrance
 * instead. The page is asked which element is on top, the way
 * `tests/system/open-defect-pins.test.ts` asks it.
 *
 * @purity semi-pure-b
 */
async function nameSpotOf(page: Page, index: number): Promise<{ x: number; y: number } | null> {
  return page.evaluate((wanted: number) => {
    const row = Array.from(document.querySelectorAll('[data-depth]'))[wanted]
    const name = row?.querySelector('span')
    if (name === null || name === undefined) return null
    const box = name.getBoundingClientRect()
    const middle = box.y + box.height / 2
    for (let x = Math.ceil(box.x) + 1; x < box.right - 1; x += 2) {
      if (document.elementFromPoint(x, middle) === name) return { x, y: middle }
    }
    return null
  }, index)
}

/**
 * Press with a real pointer.
 *
 * ⛔ A REAL POINTER, not `element.click()`. The shell reads the pointer, and a
 * synthetic click has reached nothing in this project before.
 *
 * @purity non-pure
 */
async function pressAt(page: Page, at: { x: number; y: number }): Promise<void> {
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
}

/** Press a row's name twice, which 表 T-023 の `MK-13` calls a double press. @purity non-pure */
async function pressTwice(page: Page, at: { x: number; y: number }): Promise<void> {
  await pressAt(page, at)
  await page.waitForTimeout(250)
  await pressAt(page, at)
  await page.waitForTimeout(900)
}

/** Press one entrance of table T-109 wherever it stands. @purity non-pure */
async function pressEntrance(page: Page, icon: string): Promise<boolean> {
  const at = await page.evaluate((wanted: string) => {
    const entry = document.querySelector(`[data-icon="${wanted}"]`)
    if (entry === null) return null
    const box = entry.getBoundingClientRect()
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, icon)
  if (at === null) return false
  await pressAt(page, at)
  await page.waitForTimeout(600)
  return true
}

/** Press an entrance drawn inside one row of the panel. @purity non-pure */
async function pressEntranceInRow(page: Page, index: number, icon: string): Promise<boolean> {
  const at = await page.evaluate(
    (asked: { index: number; icon: string }) => {
      const row = Array.from(document.querySelectorAll('[data-depth]'))[asked.index]
      const box = row?.querySelector(`[data-icon="${asked.icon}"]`)?.getBoundingClientRect()
      return box === undefined ? null : { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    },
    { index, icon },
  )
  if (at === null) return false
  await pressAt(page, at)
  await page.waitForTimeout(700)
  return true
}

/** Whether an entrance stands armed -- `FR-029` writes it beside the entry. @purity semi-pure-b */
async function armingOf(page: Page, icon: string): Promise<string | null> {
  return page.evaluate(
    (wanted: string) =>
      document.querySelector(`[data-icon="${wanted}"]`)?.getAttribute('data-armed') ?? null,
    icon,
  )
}

/** How many elements the drawing holds. @purity semi-pure-b */
async function drawnElementCount(page: Page): Promise<number> {
  return page.evaluate(
    (canvas: string) => document.querySelector(canvas)?.querySelectorAll('*').length ?? -1,
    CANVAS,
  )
}

/** The shape the canvas shows at a point -- `IN-2` of table T-028. @purity non-pure */
async function cursorAt(page: Page, x: number, y: number): Promise<string> {
  await page.mouse.move(x, y)
  return page.evaluate((part: string) => {
    const surface = document.querySelector(part)
    return surface instanceof HTMLElement ? surface.style.cursor : ''
  }, CANVAS_PART)
}

/** How far the drag below runs along the row. */
const REACH_PX = 160

/**
 * Empty ground that one of the DRAWN ROWS covers, with room along the row.
 *
 * ⛔ Ground BELOW the last row is no good: `FR-019` (MUST) holds an annotation's
 * position 「日付と行の識別子で」, and ground no row covers points at no row --
 * which is a different rule of the same requirement, and not what D-209 is
 * about. ⭐ Emptiness is the PRODUCT's own answer: `PD-5` gives ground that hit
 * nothing the plain arrow, read with nothing armed.
 *
 * @purity non-pure
 */
async function groundOnADrawnRow(page: Page): Promise<{ x: number; y: number } | null> {
  const ground = await page.evaluate(
    (asked: { panel: string; reach: number }) => {
      const panel = document.querySelector(asked.panel)?.getBoundingClientRect()
      if (panel === undefined) return null
      const middles: number[] = []
      for (const row of Array.from(document.querySelectorAll('[data-depth]'))) {
        const band = row.getBoundingClientRect()
        const middle = Math.round(band.y + band.height / 2)
        if (middle >= 300 && middle <= window.innerHeight - 60) middles.push(middle)
      }
      return {
        left: Math.round(panel.right + 80),
        right: window.innerWidth - 200 - asked.reach,
        middles,
      }
    },
    { panel: ROW_PANEL, reach: REACH_PX },
  )
  if (ground === null) return null
  for (const y of ground.middles) {
    for (let x = ground.left; x <= ground.right; x += 24) {
      if ((await cursorAt(page, x, y)) !== 'default') continue
      if ((await cursorAt(page, x + REACH_PX, y)) !== 'default') continue
      return { x, y }
    }
  }
  return null
}

/** The value each field of the properties panel is showing. @purity semi-pure-b */
async function panelFields(page: Page): Promise<Record<string, string>> {
  return page.evaluate((panel: string) => {
    const out: Record<string, string> = {}
    for (const field of Array.from(document.querySelectorAll(`${panel} [data-field-kind]`))) {
      const row = field.getAttribute('data-field-row') ?? ''
      if (row !== '') out[row] = (field as HTMLInputElement).value
    }
    return out
  }, PROPERTIES)
}

/** How wide the row title panel is drawn right now. @purity semi-pure-b */
async function rowPanelWidth(page: Page): Promise<number> {
  return page.evaluate(
    (panel: string) =>
      Math.round(document.querySelector(panel)?.getBoundingClientRect().width ?? -1),
    ROW_PANEL,
  )
}

/** Open the properties panel on one row by pressing its name twice. @purity non-pure */
async function openPanelOnRow(page: Page, index: number): Promise<void> {
  const spot = await nameSpotOf(page, index)
  expect(spot, `row ${index} draws a name a pointer can reach`).not.toBeNull()
  await pressTwice(page, spot as { x: number; y: number })
}

/** Put a value into one field of the panel and confirm it. @purity non-pure */
async function commitField(page: Page, kind: string, value: string): Promise<void> {
  const field = page.locator(`${PROPERTIES} [data-field-kind="${kind}"]`).first()
  await field.click()
  await field.fill(value)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(900)
}

// ---------------------------------------------------------------------------
// D-115 and D-215 -- the rules that live in the shell
// ---------------------------------------------------------------------------

/** One scrollbar, as the page drew it. */
interface DrawnBar {
  readonly axis: string
  readonly width: number
  readonly height: number
  readonly thumb: { readonly width: number; readonly height: number } | null
}

/** Both scrollbars, and the thumb inside each. @purity semi-pure-b */
async function drawnScrollbars(page: Page): Promise<DrawnBar[]> {
  return page.evaluate(
    (selector: string) =>
      Array.from(document.querySelectorAll(selector)).map((bar) => {
        const box = bar.getBoundingClientRect()
        const inner = bar.firstElementChild?.getBoundingClientRect() ?? null
        return {
          axis: bar.getAttribute('data-axis') ?? '',
          width: Math.round(box.width),
          height: Math.round(box.height),
          thumb:
            inner === null
              ? null
              : { width: Math.round(inner.width), height: Math.round(inner.height) },
        }
      }),
    SCROLLBARS,
  )
}

/** The thickness the host itself gives a scrolling box in this browser. @purity semi-pure-b */
async function hostScrollbarThickness(page: Page): Promise<number> {
  return page.evaluate(() => {
    const probe = document.createElement('div')
    probe.style.cssText =
      'position:absolute;visibility:hidden;overflow:scroll;width:100px;height:100px;'
    document.body.appendChild(probe)
    const thickness = probe.offsetWidth - probe.clientWidth
    probe.remove()
    return thickness
  })
}

// GOES RED IF: either scrollbar stops being drawn. This is the control for the
// two cases below -- table T-031 row `SC-4` (MUST) 「横・縦とも常時表示する。
// 内容が収まっていても消さない」, and neither case beneath it means anything if
// the bar it measures is not on the screen at all.
test('control for D-115: both scrollbars are on the screen (SC-4 of table T-031)', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  try {
    const bars = await drawnScrollbars(opened.page)
    expect(bars.map((bar) => bar.axis).sort()).toEqual(['horizontal', 'vertical'])
  } finally {
    await opened.close()
  }
})

// GOES RED IF: the floor of `FR-051` is taken out again. ⭐ THIS IS D-215's
// EVIDENCE AS MUCH AS D-115's: the halving is applied to a thickness the HOST
// reports, which no Vitest can be given, and the shell publishes no member that
// would let one ask. Measured 2026-09-03 in the reference browser: the host
// answers 0 for an overlay scrollbar, so the halving gives 0 and the floor is
// the only thing between that and a band nobody can point at.
test('D-115: neither scrollbar is drawn thinner than `S-205`, the floor FR-051 states', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  try {
    const host = await hostScrollbarThickness(opened.page)
    const bars = await drawnScrollbars(opened.page)
    const thicknessOf = (bar: DrawnBar): number =>
      bar.axis === 'vertical' ? bar.width : bar.height

    for (const bar of bars) {
      // FR-051 (MUST NOT): 「下回ったまま描いてはならない」.
      expect(thicknessOf(bar), `the ${bar.axis} bar is at least S-205 thick`).toBeGreaterThanOrEqual(
        SCROLLBAR_FLOOR_PX,
      )
      // FR-051 (MUST): 「半分にした結果が `S-205` を下回るときは、`S-205` と
      // すること」 -- so where the host's own half is under the floor, the floor
      // is what is drawn, exactly.
      if (host / 2 < SCROLLBAR_FLOOR_PX) {
        expect(thicknessOf(bar), `the ${bar.axis} bar is the floor itself`).toBe(SCROLLBAR_FLOOR_PX)
      }
    }
  } finally {
    await opened.close()
  }
})

// GOES RED IF: the band is drawn at the floor but the thing inside it is not,
// which is the shape the user reported (「スクロールする奴(カーソル？)の表示が
// ない」). `FR-051` (MUST) has the position changeable 「スクロールバーの操作でも」
// and table T-031 row `SC-4` has it 「掴んで動かす」 -- neither is possible
// against a thumb of no thickness.
test('D-115: the thumb inside each scrollbar is as thick as the bar', async ({ baseURL }) => {
  const opened = await openTheApp(baseURL)
  try {
    for (const bar of await drawnScrollbars(opened.page)) {
      expect(bar.thumb, `the ${bar.axis} bar draws a thumb`).not.toBeNull()
      const thumb = bar.thumb as { width: number; height: number }
      const across = bar.axis === 'vertical' ? thumb.width : thumb.height
      const along = bar.axis === 'vertical' ? thumb.height : thumb.width
      expect(across, `the ${bar.axis} thumb is at least S-205 across`).toBeGreaterThanOrEqual(
        SCROLLBAR_FLOOR_PX,
      )
      expect(along, `the ${bar.axis} thumb has a length to grab`).toBeGreaterThan(
        SCROLLBAR_FLOOR_PX,
      )
    }
  } finally {
    await opened.close()
  }
})

// GOES RED IF: the shell stops registering the host's warning, or starts asking
// for it with nothing to lose. ⭐ D-215's SECOND piece of evidence, and the
// second rule that lives only in the shell: `FR-100` (MUST) 「未保存の編集を
// 持ったまま作成者がページを離れようとしたとき…離れる前に宿主の警告が出るように
// すること」, (MUST NOT) 「未保存の編集が無いときに出させてはならない」. Both
// halves are asked of one page, so neither can pass by the page being broken.
test('D-215: FR-100 -- the host warning is asked for only once the document is dirty', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  try {
    const wouldWarn = (): Promise<boolean> =>
      opened.page.evaluate(() => {
        const asking = new Event('beforeunload', { cancelable: true })
        window.dispatchEvent(asking)
        return asking.defaultPrevented
      })

    expect(await wouldWarn(), 'FR-100 (MUST NOT): a document with no edit warns nobody').toBe(false)

    await openPanelOnRow(opened.page, 0)
    await commitField(opened.page, 'text', 'a name this case typed')

    expect(await wouldWarn(), 'FR-100 (MUST): an unsaved edit makes the host warn').toBe(true)
  } finally {
    await opened.close()
  }
})

// ---------------------------------------------------------------------------
// D-180 -- the road to a row's name
// ---------------------------------------------------------------------------

// GOES RED IF: pressing a row's name twice stops opening the panel, stops
// putting the focus in the name field, or stops selecting what is already
// there. 表 T-023 row `MK-13` (MUST), 「行見出し（行の名前）＝ プロパティパネルを
// 出し、名前の欄（`_assets/fig-erd-detail.md` の `AT-53`）を編集できる状態にして
// 焦点を置き、既にある文字をすべて選んだ状態にすること」（利用者の裁定
// 2026-09-01）. ⭐ The field is found by the column table T-058 gives it, so the
// case follows a renumbering of the manuscript.
test('D-180: pressing a row name twice opens the panel with the name field focused and all of it selected', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  try {
    const before = await drawnRows(opened.page)
    expect(before.length, 'the startup document draws rows to press').toBeGreaterThan(0)
    const name = (before[0] as DrawnRow).label
    expect(name, 'the row this case presses has a name').not.toBe('')

    await openPanelOnRow(opened.page, 0)

    const state = await opened.page.evaluate(
      (asked: { panel: string; column: string }) => {
        const shown = document.querySelector(asked.panel)
        const box = shown?.getBoundingClientRect()
        const focused = document.activeElement
        return {
          panelWidth: Math.round(box?.width ?? 0),
          focusedRow: focused?.getAttribute('data-field-row') ?? null,
          selection:
            focused instanceof HTMLInputElement
              ? { start: focused.selectionStart, end: focused.selectionEnd, value: focused.value }
              : null,
          hasNameField:
            (shown?.querySelectorAll(`[data-field-row="${asked.column}"][data-field-kind]`).length ??
              0) > 0,
        }
      },
      { panel: PROPERTIES, column: ROW_NAME_COLUMN },
    )

    expect(state.panelWidth, 'MK-13: the panel is put up').toBeGreaterThan(0)
    expect(state.hasNameField, `MK-13: the panel carries the ${ROW_NAME_COLUMN} field`).toBe(true)
    expect(state.focusedRow, `MK-13: the focus is on ${ROW_NAME_COLUMN}`).toBe(ROW_NAME_COLUMN)
    expect(state.selection?.value, 'MK-13: the field holds the row name').toBe(name)
    expect(
      { start: state.selection?.start, end: state.selection?.end },
      'MK-13 (MUST): every character already there is selected',
    ).toEqual({ start: 0, end: name.length })
  } finally {
    await opened.close()
  }
})

// ---------------------------------------------------------------------------
// D-133 -- what a confirmed field moves
// ---------------------------------------------------------------------------

// GOES RED IF: the panel keeps the reading it had while the field was held, so
// that confirming a value moves the row and leaves the panel behind -- the
// shape the ledger recorded (「完了率91（古い・誤り）→ 完了率7」). `FR-006`
// (MUST) 「同じ値を 2 つの面から編集できる以上、片方だけが動く状態を作らない」,
// and nothing in `docs/spec` allows a redraw to be skipped because a control is
// still held. Both faces are asked in one case, so it cannot pass by the value
// reaching neither.
test('D-133: confirming the height field moves the panel and the row together', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  try {
    await openPanelOnRow(opened.page, 0)
    const before = (await drawnRows(opened.page))[0] as DrawnRow
    const shownBefore = (await panelFields(opened.page))[ROW_HEIGHT_COLUMN]
    expect(Number(shownBefore), `the panel shows ${ROW_HEIGHT_COLUMN} to begin with`).toBe(
      before.height,
    )

    const wanted = before.height + 56
    await commitField(opened.page, 'number', String(wanted))

    const after = (await drawnRows(opened.page))[0] as DrawnRow
    expect(after.height, 'FR-006: the row takes the confirmed height').toBe(wanted)
    expect(
      Number((await panelFields(opened.page))[ROW_HEIGHT_COLUMN]),
      'FR-006 (MUST): the panel is not left holding the reading it had while the field was held',
    ).toBe(wanted)
  } finally {
    await opened.close()
  }
})

// GOES RED IF: the same skip returns for the name -- the second half of the
// ledger's own measurement of 2026-09-03 (「続けて改名 → パネルも行見出しも
// 新しい名前」). The panel and the row heading are the two faces `FR-006`
// forbids to part company.
test('D-133: confirming the name field moves the panel and the row heading together', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  try {
    await openPanelOnRow(opened.page, 0)
    const before = (await drawnRows(opened.page))[0] as DrawnRow
    expect(before.label, 'the row starts under another name').not.toBe(SHORT_NAME)

    await commitField(opened.page, 'text', SHORT_NAME)

    const after = (await drawnRows(opened.page))[0] as DrawnRow
    expect(after.isCut, 'FR-085 had no reason to cut a name this short').toBe(false)
    expect(after.label, 'FR-006: the row heading takes the name').toBe(SHORT_NAME)
    expect(
      (await panelFields(opened.page))[ROW_NAME_COLUMN],
      'FR-006 (MUST): the panel shows the name it just wrote',
    ).toBe(SHORT_NAME)
  } finally {
    await opened.close()
  }
})

// ---------------------------------------------------------------------------
// D-27 -- what an undo may not give back
// ---------------------------------------------------------------------------

/** Drag the panel boundary this far to the right. */
const WIDEN_BY_PX = 90

// GOES RED IF: a `Ctrl`+`Z` puts the panel width back. 表 T-027 row `UN-16`
// files 「見る場所の割り付けと出力の設定 —— パネル幅（`FR-052`）」 under 対象外,
// and the rule printed after the table reads 「対象外の操作で文書が戻っては
// ならない（MUST NOT）」. ⚠️ `UN-16` also says 「保存することと戻せることは別で
// ある」, so the width being IN the document is not a reason for an undo to move
// it.
//
// ⭐ THE UNDO HAS TO REACH SOMETHING, or the case would pass on a keystroke that
// did nothing at all. The rename is 表 T-027 row `UN-14`, 対象, and its coming
// back is asserted FIRST -- that assertion is this case's own control.
test('D-27: an undo of an unrelated edit leaves the panel width where the reader put it', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  const page = opened.page
  try {
    const boundary = await page.evaluate((divider: string) => {
      const box = document.querySelector(divider)?.getBoundingClientRect()
      return box === undefined ? null : { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    }, DIVIDER)
    expect(boundary, 'FR-052 draws a boundary to drag').not.toBeNull()
    const grab = boundary as { x: number; y: number }

    const started = await rowPanelWidth(page)
    await page.mouse.move(grab.x, grab.y)
    await page.mouse.down()
    await page.mouse.move(grab.x + WIDEN_BY_PX, grab.y, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(700)
    const widened = await rowPanelWidth(page)
    expect(widened, 'FR-052: dragging the boundary widened the panel').toBeGreaterThan(started)

    await openPanelOnRow(page, 0)
    const named = (await drawnRows(page))[0] as DrawnRow
    expect(named.label, 'the row starts under another name').not.toBe(SHORT_NAME)
    await commitField(page, 'text', SHORT_NAME)
    expect((await drawnRows(page))[0]?.label, 'the unrelated edit landed').toBe(SHORT_NAME)

    await page.mouse.move(BASE_SCREEN.width / 2, BASE_SCREEN.height / 2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(900)

    // The control: 表 T-027 row `UN-14` is 対象, so this much MUST come back.
    expect((await drawnRows(page))[0]?.label, 'UN-14: the undo reached the document').toBe(
      named.label,
    )
    // The claim: `UN-16` is 対象外, so this much MUST NOT.
    expect(await rowPanelWidth(page), 'UN-16 (MUST NOT): the width did not come back').toBe(widened)
  } finally {
    await opened.close()
  }
})

// ---------------------------------------------------------------------------
// D-157 -- a collapsed row's descendants
// ---------------------------------------------------------------------------

/**
 * The rows drawn under one row, up to the next row of its own tier or shallower.
 *
 * ⚠️ Read off the DRAWN rows, which is what the requirement is about: `HR-1a`
 * (MUST NOT) 「畳んだ `TaskGroup` の配下の行…を描いてはならない」.
 *
 * @purity pure
 */
function drawnUnder(rows: readonly DrawnRow[], index: number): DrawnRow[] {
  const parent = rows[index] as DrawnRow
  const under: DrawnRow[] = []
  for (const row of rows.slice(index + 1)) {
    if (row.depth <= parent.depth) break
    under.push(row)
  }
  return under
}

/** The first drawn row that has a grandchild drawn under it. @purity pure */
function rowWithAGrandchild(rows: readonly DrawnRow[]): number {
  for (let index = 0; index < rows.length; index += 1) {
    const parent = rows[index] as DrawnRow
    const under = drawnUnder(rows, index)
    if (under.some((row) => row.depth >= parent.depth + 2)) return index
  }
  return -1
}

// GOES RED IF: folding a row leaves any of its descendants drawn, or opening it
// one tier brings more than one tier back. 表 T-015 row `HR-1a` (MUST)
// 「畳んだ行の配下は、それ自身も畳まれた状態とすること。畳む前の形を覚えて、
// 開いたときに戻してはならない（MUST NOT）」（利用者の裁定 2026-08-30）, reached
// through 表 T-051 rows `HF-11` and `HF-13`, whose entrances table T-109 names.
// ⭐ The row is CHOSEN by the drawing having a grandchild under it, and that
// choice is asserted first -- a document with no second tier would make the
// rest of the case say nothing.
test('D-157: a folded row hides every tier below it, and opens exactly one back', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  const page = opened.page
  try {
    const before = await drawnRows(page)
    const index = rowWithAGrandchild(before)
    expect(index, 'the startup document draws a row with two tiers under it').toBeGreaterThanOrEqual(
      0,
    )
    const parent = before[index] as DrawnRow

    expect(
      await pressEntranceInRow(page, index, FOLD_BELOW_ENTRANCE),
      `the row draws the ${FOLD_BELOW_ENTRANCE} entrance`,
    ).toBe(true)

    const folded = await drawnRows(page)
    const stillThere = folded.findIndex((row) => row.label === parent.label)
    expect(stillThere, 'HR-4 (MUST NOT): the row itself is not hidden').toBeGreaterThanOrEqual(0)
    expect(
      drawnUnder(folded, stillThere),
      'HR-1a (MUST NOT): nothing below a folded row is drawn',
    ).toEqual([])

    expect(
      await pressEntranceInRow(page, stillThere, OPEN_ONE_TIER_ENTRANCE),
      `the row draws the ${OPEN_ONE_TIER_ENTRANCE} entrance`,
    ).toBe(true)

    const openedOnce = await drawnRows(page)
    const nowAt = openedOnce.findIndex((row) => row.label === parent.label)
    const under = drawnUnder(openedOnce, nowAt)
    expect(under.length, 'HR-7: the tier below came back').toBeGreaterThan(0)
    expect(
      under.map((row) => row.depth - parent.depth).filter((step) => step !== 1),
      'HR-1a (MUST): the tiers below it stayed folded, so only one tier is drawn',
    ).toEqual([])
  } finally {
    await opened.close()
  }
})

// ---------------------------------------------------------------------------
// D-209 -- how a highlight box is placed
// ---------------------------------------------------------------------------

// GOES RED IF: the pointer this file drives stops reaching the canvas, or the
// highlight box stops being placeable at all. `FR-019` (MUST)
// 「ハイライトボックスはドラッグでのみ置くこと」 -- the control for the case
// below, which would otherwise pass on a page where nothing can be placed.
test('control for D-209: with the highlight box armed, a drag on empty ground places one', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  const page = opened.page
  try {
    const spot = await groundOnADrawnRow(page)
    expect(spot, 'a drawn row covers empty ground with room along it').not.toBeNull()
    const at = spot as { x: number; y: number }

    expect(await pressEntrance(page, HIGHLIGHT_BOX_ENTRANCE), 'the entrance is on the screen').toBe(
      true,
    )
    expect(await armingOf(page, HIGHLIGHT_BOX_ENTRANCE), 'AR-6: the entrance stands armed').toBe(
      'true',
    )

    const before = await drawnElementCount(page)
    expect(REACH_PX, 'the drag runs further than S-208, so it is a drag').toBeGreaterThan(
      PRESS_OR_DRAG_PX,
    )
    await page.mouse.move(at.x, at.y)
    await page.mouse.down()
    await page.mouse.move(at.x + REACH_PX, at.y, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(900)

    expect(await drawnElementCount(page), 'FR-019: the drag placed a highlight box').toBeGreaterThan(
      before,
    )
  } finally {
    await opened.close()
  }
})

// GOES RED IF: a press that never travels `S-208` places a highlight box.
// `FR-019` (MUST NOT) 「クリックでは置かないこと」（利用者の裁定 2026-09-02
// 「ハイライトボックスはクリックで置かない。ドラッグのみ」）, with the reason
// given in the same paragraph: 「押した 1 点はその範囲を言えない」.
test('D-209: with the highlight box armed, a press that does not travel places nothing', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  const page = opened.page
  try {
    const spot = await groundOnADrawnRow(page)
    expect(spot, 'a drawn row covers empty ground').not.toBeNull()
    const at = spot as { x: number; y: number }

    await pressEntrance(page, HIGHLIGHT_BOX_ENTRANCE)
    expect(await armingOf(page, HIGHLIGHT_BOX_ENTRANCE), 'AR-6: the entrance stands armed').toBe(
      'true',
    )

    const before = await drawnElementCount(page)
    await pressAt(page, at)
    await page.waitForTimeout(900)

    expect(await drawnElementCount(page), 'FR-019 (MUST NOT): a click placed nothing').toBe(before)
  } finally {
    await opened.close()
  }
})

// GOES RED IF: the narrowing CR-341 made to `FR-019` is undone and the comment
// box is dragged into the same MUST NOT. ⚠️ 「コメントボックスは本段の対象では
// ない —— 裁定の逐語はハイライトボックスだけを名指しており、コメントボックスは
// 1 点に置くもので、囲う範囲を持たない」. 表 T-023b row `AR-5` places one 「その
// 位置に」, which is a press and not a travel.
test('D-209: the comment box is outside that MUST NOT -- one press still places one', async ({
  baseURL,
}) => {
  const opened = await openTheApp(baseURL)
  const page = opened.page
  try {
    const spot = await groundOnADrawnRow(page)
    expect(spot, 'a drawn row covers empty ground').not.toBeNull()
    const at = spot as { x: number; y: number }

    await pressEntrance(page, COMMENT_BOX_ENTRANCE)
    expect(await armingOf(page, COMMENT_BOX_ENTRANCE), 'AR-5: the entrance stands armed').toBe(
      'true',
    )

    const before = await drawnElementCount(page)
    await pressAt(page, at)
    await page.waitForTimeout(900)

    expect(
      await drawnElementCount(page),
      'FR-019 / AR-5: a press placed a comment box',
    ).toBeGreaterThan(before)
  } finally {
    await opened.close()
  }
})

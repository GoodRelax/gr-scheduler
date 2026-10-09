// W3 spec-only tester 2: screen clauses of 01-04-requirements.md pressed on the built dist/index.html.
import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { specTable, unbroken } from '../contract/spec-table'
import { VIEWPORT, dropFile, elementBox, enableAgentApi, launch, openByDrop, press, readDocument, readSample, settle, type Box } from '../usecase/uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US', colorScheme: 'light' })

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see FR-039
// WHY: CR-690 -- table T-369 places the font size field (FO-4) right under the display scale field (FO-3).
const FONT_SCALE_FIELD = '文字サイズを選ぶ欄を同表の `FO-4` の場所に置き、表 T-202 の `S-70` の 3 段を選ばせ、選ばれた段で同表の `CM-62` を 1 回発行すること（MUST）'
const OTHER_TEXT_WEIGHT =
  '⭐ 名称ラベル・`NT-7` の頭 1 文字・`Document Title` のほかの字は、すべて `_assets/tbl-settings.md` の 表 T-206 の `S-529` の太さで描くこと（MUST）'

// see FR-096
const FORMAT_BUTTON_GAP = '⭐ 上下に隣り合う 2 つの形式のボタンのあいだは、`_assets/tbl-settings.md` の 表 T-206 の `S-517` の隔たりとすること（MUST）'

// see FR-052
const HELD_WIDTH_IS_RELEASED_WIDTH =
  '⭐ 掴んでいるあいだに描くタスクグループパネルの幅は、その時点のポインタ位置で離したときに `FR-039` の 表 T-252 の後の段が保存する `S-79` を、同じ段の規則で描いた幅とすること（MUST）'

// see MK-13, T-023
const TITLE_DOUBLE_CLICK = '／`Document Title`（`_assets/tbl-glossary.md` の `U-27`） ＝ 表 T-036 の `SK-9` が開くのと同じ、その場で編集する欄（`FR-035`）を開くこと（MUST）'

// see CF-1, T-366
const SOLVE_BEFORE_DRAWING =
  'テーマ色（`themeHue`）・明暗（`themePreference`）・モノクロ（`themeMonochrome`）のどれかが変わったら、描く前に `CF-2` 〜 `CF-4` を、この順に 1 回解くこと（MUST）'

// see FR-036, T-335
const CHOOSERS_FOLLOW_WB_10 =
  '⭐ 保存の面（`_assets/tbl-glossary.md` の `U-54`、`FR-096`）と開く面（`U-56`、表 T-024a の `OP-16`）は、ウィンドウではなく `_assets/tbl-settings.md` の `S-99g` の面のままとし、題の行と動かし方だけを本表の `WB-10` に従うこと（MUST）'
const CHOOSERS_ARE_NOT_WINDOWS = 'ほかの操作を止めたままとすると定めた。⛔ 2 つに `WB-1` 〜 `WB-9` を当ててはならない（MUST NOT）'

// see T-023, S-514, S-515, S-516
const WHEEL_UNITS =
  '行で報告されたときの 1 行の長さ、画素で報告されたときの 1 ノッチの長さ、行で報告されたときの 1 ノッチの行数は、`_assets/tbl-settings.md` の 表 T-206 の `S-514`・`S-515`・`S-516` に従うこと（MUST）'

// see IN-7, T-028
const TOOLTIP_COLOURS = '⭐ 説明の地・字・縁の色は、`_assets/tbl-settings.md` の 表 T-236 の `S-146`・`S-147`・`S-149` とすること（MUST）'

// see FR-100
const NO_WARNING_WORDS = '印の遷移は `_assets/tbl-state-machines.md` の 表 T-290 の `unsavedEditsStateMachine` が持つ。**警告の文言を `GRS` が決めてはならない（MUST NOT）'

// see FR-046, DA-7
const FIELD_SCROLLS_LIKE_THE_ENTRANCE =
  '欄の名は `FR-038` の辞書が 表 T-109 の `IC-44` に持つ語とすること（MUST） —— 新しい語を作らない。欄で日付を確定したときも、上の「基準日線を出す操作」と同じく表示位置を横に送ること（MUST）'

// see HF-10, T-051
const OPEN_ALL_NOT_OUTERMOST =
  '⭐ 焦点が `Tab` で進む順も、この並びの左から右とすること（MUST） —— 見た目と違う順で焦点が飛ぶと、次に押されるのがどれかを読めない。⛔ **本行の「すべて開く」を並びのいちばん外へ置いてはならない（MUST NOT）'

// see FR-016, GA-7
const FADE_FROM_POINTER = 'フェードの日数は、ポインタの位置から求めること（MUST）'

const CLAUSES = [
  FONT_SCALE_FIELD,
  OTHER_TEXT_WEIGHT,
  FORMAT_BUTTON_GAP,
  HELD_WIDTH_IS_RELEASED_WIDTH,
  TITLE_DOUBLE_CLICK,
  SOLVE_BEFORE_DRAWING,
  CHOOSERS_FOLLOW_WB_10,
  CHOOSERS_ARE_NOT_WINDOWS,
  WHEEL_UNITS,
  TOOLTIP_COLOURS,
  NO_WARNING_WORDS,
  FIELD_SCROLLS_LIKE_THE_ENTRANCE,
  OPEN_ALL_NOT_OUTERMOST,
  FADE_FROM_POINTER,
]

const ERP = 'sample-large-erp-program.en.xml'

const cellOf = (table: string, id: string, column: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row.by[column] ?? ''
}

const numberIn = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  if (found === null) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return Number(found[0])
}

type Rgb = readonly [number, number, number]

// see T-236
const rgbOfHsl = (hue: number, saturation: number, lightness: number): Rgb => {
  const s = saturation / 100
  const l = lightness / 100
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number): number => {
    const k = (n + hue / 30) % 12
    return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255
  }
  return [channel(0), channel(8), channel(4)]
}

const rgbOfPaint = (paint: string, hue = 0): Rgb => {
  const text = paint.trim().toLowerCase().replace(/`/g, '').replace(/\bh\b/, String(hue))
  const hex = /^#([0-9a-f]{6})$/.exec(text)
  if (hex !== null) {
    const value = Number.parseInt(hex[1] ?? '', 16)
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
  }
  const hsl = /^hsl\(\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*\)$/.exec(text)
  if (hsl !== null) return rgbOfHsl(Number(hsl[1]), Number(hsl[2]), Number(hsl[3]))
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(text)
  if (rgb !== null) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  throw new Error(`not a colour: ${paint}`)
}

const farthestChannel = (a: Rgb, b: Rgb): number => Math.max(...a.map((value, i) => Math.abs(value - (b[i] ?? 0))))

const boxOf = async (page: Page, selector: string): Promise<Box> => {
  const box = await elementBox(page, selector)
  if (box === null) throw new Error(`nothing matches ${selector}`)
  return box
}

test('the clauses are the specification words', () => {
  for (const clause of CLAUSES) expect(REQUIREMENTS, clause).toContain(clause)
})

test(`FR-039: ${FONT_SCALE_FIELD}`, async ({ page }) => {
  await launch(page)
  await enableAgentApi(page)
  await press(page, 'IC-17')
  const rows = await page.evaluate(() => [...document.querySelectorAll('[data-role="Properties Panel"] [data-field-row]')].filter((e) => e.parentElement?.closest('[data-field-row]') === null).map((e) => e.getAttribute('data-field-row')))
  const scale = rows.indexOf('K-125')
  expect(scale, 'precondition: the display scale field K-125 is on the settings face').toBeGreaterThanOrEqual(0)
  expect(rows[scale + 1], 'the font size field K-85 does not sit under the display scale field').toBe('K-85')
  const levels = [...cellOf('T-202', 'S-70', '型').matchAll(/'([^']+)'/g)].map((m) => m[1])
  const field = page.locator('[data-role="Properties Panel"] select[data-field-row="K-85"]')
  expect(await field.locator('option').evaluateAll((all) => all.map((one) => (one as HTMLOptionElement).value))).toEqual(levels)
  const before = (await readDocument(page)).documentSettings['fontScale']
  const chosen = levels.find((one) => one !== before) ?? ''
  await field.selectOption(chosen)
  // STEP: IN-6 -- the choice is an in-place edit, settled by Enter
  await field.press('Enter')
  await settle(page)
  expect((await readDocument(page)).documentSettings['fontScale']).toBe(chosen)
  // STEP: one CM-62 is one undo step (UN-13), so one undo gives the level back
  await page.mouse.click(VIEWPORT.width / 2, VIEWPORT.height / 2)
  await settle(page)
  await page.keyboard.press('Control+z')
  await settle(page)
  expect((await readDocument(page)).documentSettings['fontScale'], 'one undo did not give the level back: CM-62 was not issued once').toBe(before)
})

test(`FR-039: ${OTHER_TEXT_WEIGHT}`, async ({ page }) => {
  const S_529 = cellOf('T-206', 'S-529', '既定').trim()
  await launch(page)
  const offenders = async (where: string): Promise<string[]> =>
    page.evaluate(
      ({ where, weight }) => {
        const found: string[] = []
        const excluded = (element: Element): boolean =>
          element.closest('[data-role="Document Title"]') !== null || /^task-\d+-label/.test(element.closest('[data-figure]')?.getAttribute('data-figure') ?? '')
        for (const element of document.querySelectorAll('body *')) {
          if (excluded(element)) continue
          const own = [...element.childNodes].some((one) => one.nodeType === Node.TEXT_NODE && (one.textContent ?? '').trim() !== '')
          if (!own || element.getClientRects().length === 0) continue
          const drawn = getComputedStyle(element).fontWeight
          if (drawn !== weight) found.push(`${where}: <${element.tagName.toLowerCase()} ${element.closest('[data-role]')?.getAttribute('data-role') ?? ''}> "${(element.textContent ?? '').trim().slice(0, 30)}" ${drawn}`)
        }
        return found
      },
      { where, weight: S_529 },
    )
  const seen: string[] = [...(await offenders('start'))]
  await press(page, 'IC-17')
  seen.push(...(await offenders('settings face')))
  await press(page, 'IC-17')
  await press(page, 'IC-2')
  seen.push(...(await offenders('export chooser')))
  await page.keyboard.press('Escape')
  await settle(page)
  await press(page, 'IC-22')
  seen.push(...(await offenders('help')))
  expect(seen).toEqual([])
})

test(`FR-096: ${FORMAT_BUTTON_GAP}`, async ({ page }) => {
  const S_517_EM = numberIn(cellOf('T-206', 'S-517', '既定'))
  await launch(page)
  await press(page, 'IC-2')
  const measured = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('[data-role="Export Chooser"] [data-format]')] as HTMLElement[]
    return buttons.map((one) => {
      const r = one.getBoundingClientRect()
      return { left: r.left, top: r.top, bottom: r.bottom, em: Number.parseFloat(getComputedStyle(one.parentElement as Element).fontSize) }
    })
  })
  expect(measured.length, 'precondition: the chooser shows two formats or more').toBeGreaterThan(1)
  for (let i = 1; i < measured.length; i++) {
    const prev = measured[i - 1]!
    const next = measured[i]!
    expect(Math.abs(next.left - prev.left), 'precondition: the formats stand one above the other').toBeLessThan(0.5)
    expect(next.top - prev.bottom).toBeCloseTo(S_517_EM * prev.em, 1)
  }
})

test(`FR-052: ${HELD_WIDTH_IS_RELEASED_WIDTH}`, async ({ page }) => {
  await launch(page)
  const panelWidth = async (): Promise<number> => (await boxOf(page, '[data-role="Task Group Panel"]')).w
  const dragAndCompare = async (dx: number): Promise<{ held: number; released: number; start: number }> => {
    const divider = await boxOf(page, '[data-role="Panel Divider"]')
    const start = await panelWidth()
    const x = divider.x + divider.w / 2
    const y = divider.y + divider.h / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + dx, y, { steps: 8 })
    await settle(page)
    const held = await panelWidth()
    await page.mouse.up()
    await settle(page)
    return { held, released: await panelWidth(), start }
  }
  const wider = await dragAndCompare(140)
  expect(wider.released, 'precondition: the drag changed the width').not.toBeCloseTo(wider.start, 0)
  expect(wider.held).toBeCloseTo(wider.released, 1)
  // STEP: past the floor of table T-252, where the held picture must stop where the release lands
  const narrower = await dragAndCompare(-1000)
  expect(narrower.held).toBeCloseTo(narrower.released, 1)
})

test(`MK-13: ${TITLE_DOUBLE_CLICK}`, async ({ page }) => {
  await launch(page)
  const field = (): Promise<{ tag: string; row: string | null; inTitle: boolean; value: string; all: boolean } | null> =>
    page.evaluate(() => {
      const active = document.activeElement as HTMLInputElement | null
      if (active === null || !('value' in active)) return null
      return {
        tag: active.tagName,
        row: active.getAttribute('data-field-row'),
        inTitle: active.closest('[data-role="Document Title"]') !== null,
        value: active.value,
        all: active.selectionStart === 0 && active.selectionEnd === active.value.length,
      }
    })
  await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2)
  await page.keyboard.press('F2')
  await settle(page)
  const byKey = await field()
  expect(byKey, 'precondition: SK-9 (F2) opened an in-place field').not.toBeNull()
  await page.keyboard.press('Escape')
  await settle(page)
  await page.dblclick('[data-role="Document Title"]')
  await settle(page)
  expect(await field()).toEqual(byKey)
})

test(`CF-1: ${SOLVE_BEFORE_DRAWING}`, async ({ page }) => {
  // WHY: CF-3's measured line puts k = 2 on TH-3 in the light theme, and CF-2 moves S-155 by k times S-522.
  const TH_3 = numberIn(cellOf('T-305', 'TH-3', '色相'))
  const K_OF_TH_3 = 2
  const S_522 = numberIn(cellOf('T-206', 'S-522', '既定'))
  const S_155 = /hsl\(H\s+([\d.]+)%\s+([\d.]+)%\)/.exec(cellOf('T-236', 'S-155', '明るいテーマ').replace(/`/g, ''))
  if (S_155 === null) throw new Error('S-155 light is not an hsl(H s% l%) formula')
  const solved = rgbOfHsl(TH_3, Number(S_155[1]), Number(S_155[2]) - K_OF_TH_3 * S_522)
  const unsolved = rgbOfHsl(TH_3, Number(S_155[1]), Number(S_155[2]))
  await launch(page)
  await enableAgentApi(page)
  await press(page, 'IC-17')
  await page.evaluate(() => {
    const seen: string[] = []
    ;(window as any).__w3Fills = seen
    const record = (element: Element): void => {
      const figure = element.getAttribute('data-figure') ?? ''
      if (/^task-\d+-plan$/.test(figure)) seen.push(`${figure} ${element.getAttribute('fill') ?? getComputedStyle(element).fill}`)
    }
    new MutationObserver((changes) => {
      for (const change of changes) {
        if (change.type === 'attributes' && change.target instanceof Element) record(change.target)
        for (const added of change.addedNodes) {
          if (!(added instanceof Element)) continue
          record(added)
          for (const inner of added.querySelectorAll('[data-figure]')) record(inner)
        }
      }
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['fill', 'style'] })
  })
  await page.click(`[data-colour-choice="${TH_3}"]`)
  await settle(page)
  const afterSwatch = await readDocument(page)
  expect(afterSwatch.schedule.project['themeHue'], 'precondition: the swatch set the hue').toBe(TH_3)
  // WHY: only a task with no stored fill draws S-155; a stored one draws its T-294 cell (CV-6), and
  // S-321 green sits within the on-hue filter of TH-3 without being solved (DFC-2204).
  const storedFill = new Set(afterSwatch.schedule.taskVisuals.filter((one) => one['fillColor'] !== null).map((one) => `task-${one['taskUid']}-plan`))
  const ofThemeRow = (figureAndFill: readonly [string, string][]): string[] =>
    figureAndFill.filter(([figure]) => !storedFill.has(figure)).map(([, fill]) => fill)
  const recorded: string[] = await page.evaluate(() => (window as any).__w3Fills)
  const drawn = ofThemeRow(recorded.map((one) => [one.slice(0, one.indexOf(' ')), one.slice(one.indexOf(' ') + 1)] as [string, string]))
  const onHue = drawn.map((fill) => rgbOfPaint(fill)).filter((rgb) => farthestChannel(rgb, unsolved) < 4 || farthestChannel(rgb, solved) < 4)
  expect(onHue.length, 'precondition: plan bars were drawn in the new hue').toBeGreaterThan(0)
  for (const rgb of onHue) expect(farthestChannel(rgb, solved), `a frame drew S-155 as ${rgb.join(',')} instead of the solved colour`).toBeLessThanOrEqual(0.75)
  // STEP: CF-1 -- the exported picture uses the same solve
  const svg: string = await page.evaluate(() => (window as any).grSchedulerAgentApi.exportSvg().value)
  const exported = ofThemeRow(
    [...svg.matchAll(/<[a-z]+ [^>]*data-figure="(task-\d+-plan)"[^>]*>/g)].map((m) => [m[1] ?? '', /fill="([^"]+)"/.exec(m[0])?.[1] ?? ''] as [string, string]),
  ).filter((fill) => fill.startsWith('hsl') || fill.startsWith('#'))
  const exportedOnHue = exported.map((fill) => rgbOfPaint(fill)).filter((rgb) => farthestChannel(rgb, unsolved) < 4 || farthestChannel(rgb, solved) < 4)
  expect(exportedOnHue.length).toBeGreaterThan(0)
  for (const rgb of exportedOnHue) {
    const shown = `the exported picture painted S-155 as ${rgb.map((one) => one.toFixed(1)).join(',')}, solved is ${solved.map((one) => one.toFixed(1)).join(',')}`
    expect(farthestChannel(rgb, solved), shown).toBeLessThanOrEqual(0.75)
  }
})

const chooserCases: readonly { readonly name: string; readonly role: string; readonly open: (page: Page) => Promise<void> }[] = [
  { name: 'the save face (U-54)', role: 'Export Chooser', open: (page) => press(page, 'IC-2') },
  {
    name: 'the open face (U-56)',
    role: 'Open Chooser',
    open: async (page) => {
      await dropFile(page, ERP, readSample(ERP))
      await settle(page)
    },
  },
]

for (const chooser of chooserCases) {
  test(`FR-036 WB-10: ${chooser.name} -- ${CHOOSERS_FOLLOW_WB_10}`, async ({ page }) => {
    await launch(page)
    await chooser.open(page)
    const surface = `[data-role="${chooser.role}"]`
    expect(await page.getAttribute(surface, 'aria-modal'), 'S-99g: the face is not modal').toBe('true')
    const titleRow = `${surface} [data-window-grab]`
    const titleIcons = await page.locator(`${titleRow} [data-icon]`).evaluateAll((all) => all.map((one) => one.getAttribute('data-icon')))
    expect(titleIcons, 'WB-10: the title row holds IC-52 and nothing else').toEqual(['IC-52'])
    const before = await boxOf(page, surface)
    const band = await boxOf(page, titleRow)
    await page.mouse.move(band.x + band.w / 3, band.y + band.h / 2)
    await page.mouse.down()
    await page.mouse.move(band.x + band.w / 3 + 150, band.y + band.h / 2 + 90, { steps: 8 })
    await settle(page)
    const following = await boxOf(page, surface)
    await page.mouse.up()
    await settle(page)
    expect(following.x - before.x, 'WB-8: the face does not follow the band').toBeCloseTo(150, 0)
    expect(following.y - before.y).toBeCloseTo(90, 0)
  })

  test(`FR-036: ${chooser.name} -- ${CHOOSERS_ARE_NOT_WINDOWS}`, async ({ page }) => {
    await launch(page)
    await chooser.open(page)
    const surface = `[data-role="${chooser.role}"]`
    for (const icon of ['IC-129', 'IC-130', 'IC-131']) expect(await page.locator(`${surface} [data-icon="${icon}"]`).count(), `${icon} is on the face`).toBe(0)
    const before = await boxOf(page, surface)
    // STEP: WB-10 lays no edge (GR-25), so a drag from the corner leaves the size alone
    await page.mouse.move(before.x + before.w - 1, before.y + before.h - 1)
    await page.mouse.down()
    await page.mouse.move(before.x + before.w + 120, before.y + before.h + 80, { steps: 8 })
    await page.mouse.up()
    await settle(page)
    const after = await boxOf(page, surface)
    expect([after.w, after.h]).toEqual([before.w, before.h])
    // STEP: the band cannot be dragged out of the browser window
    const band = await boxOf(page, `${surface} [data-window-grab]`)
    await page.mouse.move(band.x + 4, band.y + band.h / 2)
    await page.mouse.down()
    await page.mouse.move(band.x - 3000, band.y - 3000, { steps: 8 })
    await page.mouse.up()
    await settle(page)
    const pushed = await boxOf(page, `${surface} [data-window-grab]`)
    expect(pushed.x >= -0.5 && pushed.y >= -0.5, 'WB-10: the title band left the browser window').toBe(true)
  })
}

const wheelOutcome = async (browser: Browser, wheel: { deltaMode: number; deltaY: number; shiftKey: boolean }): Promise<Record<string, unknown>> => {
  const context = await browser.newContext({ viewport: VIEWPORT, locale: 'en-US' })
  const page = await context.newPage()
  try {
    await launch(page)
    await enableAgentApi(page)
    await openByDrop(page, ERP, readSample(ERP))
    const area = await boxOf(page, '[data-role="Scrollbars"][data-axis="horizontal"]')
    await page.evaluate(
      ({ x, y, wheel }) => {
        const target = document.elementFromPoint(x, y) as Element
        target.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: x, clientY: y, deltaX: 0, deltaY: wheel.deltaY, deltaMode: wheel.deltaMode, shiftKey: wheel.shiftKey }))
      },
      { x: area.x + area.w / 2, y: VIEWPORT.height / 2, wheel },
    )
    await settle(page)
    const settings = (await readDocument(page)).documentSettings
    return { zoomX: settings['zoomX'], zoomY: settings['zoomY'], scrollGroupId: settings['scrollGroupId'], scrollGroupOffset: settings['scrollGroupOffset'], scrollDate: settings['scrollDate'], scrollDayOffset: settings['scrollDayOffset'] }
  } finally {
    await context.close()
  }
}

test(`T-023: ${WHEEL_UNITS}`, async ({ browser }) => {
  test.setTimeout(180_000)
  const S_514_PX = numberIn(cellOf('T-206', 'S-514', '既定'))
  const S_515_PX = numberIn(cellOf('T-206', 'S-515', '既定'))
  const S_516_LINES = numberIn(cellOf('T-206', 'S-516', '既定'))
  const LINE = 1
  const PIXEL = 0
  // STEP: MK-1 -- one line reported by lines scrolls as far as S-514 px reported by pixels
  const byLine = await wheelOutcome(browser, { deltaMode: LINE, deltaY: 1, shiftKey: false })
  const byPixel = await wheelOutcome(browser, { deltaMode: PIXEL, deltaY: S_514_PX, shiftKey: false })
  const still = await wheelOutcome(browser, { deltaMode: PIXEL, deltaY: 0, shiftKey: false })
  expect(byPixel, 'precondition: the pixel wheel scrolled').not.toEqual(still)
  expect(byLine).toEqual(byPixel)
  // STEP: MK-3 -- one notch is S-516 lines, or S-515 px
  const notchByLines = await wheelOutcome(browser, { deltaMode: LINE, deltaY: S_516_LINES, shiftKey: true })
  const notchByPixels = await wheelOutcome(browser, { deltaMode: PIXEL, deltaY: S_515_PX, shiftKey: true })
  expect(notchByPixels['zoomX'], 'precondition: the Shift wheel zoomed the time axis').not.toEqual(still['zoomX'])
  expect(notchByLines['zoomX']).toEqual(notchByPixels['zoomX'])
})

test(`IN-7: ${TOOLTIP_COLOURS}`, async ({ page }) => {
  await launch(page)
  await enableAgentApi(page)
  const hue = Number((await readDocument(page)).schedule.project['themeHue'])
  await page.hover('[data-icon="IC-1"]')
  await expect(page.locator('[data-role="Tooltip"] [role="tooltip"]')).toHaveCount(1, { timeout: 10_000 })
  const drawn = await page.evaluate(() => {
    const tip = document.querySelector('[data-role="Tooltip"] [role="tooltip"]') as HTMLElement
    const style = getComputedStyle(tip)
    return { ground: style.backgroundColor, ink: style.color, rule: style.borderTopColor }
  })
  const expected = { ground: cellOf('T-236', 'S-146', '明るいテーマ'), ink: cellOf('T-236', 'S-147', '明るいテーマ'), rule: cellOf('T-236', 'S-149', '明るいテーマ') }
  for (const part of ['ground', 'ink', 'rule'] as const) {
    expect(farthestChannel(rgbOfPaint(drawn[part]), rgbOfPaint(expected[part], hue)), `${part}: ${drawn[part]} vs ${expected[part]}`).toBeLessThanOrEqual(1)
  }
})

test(`FR-100: ${NO_WARNING_WORDS}`, async ({ page }) => {
  await page.addInitScript(() => {
    const listeners: unknown[] = []
    ;(window as any).__w3Unload = listeners
    const original = window.addEventListener.bind(window)
    window.addEventListener = ((type: string, listener: unknown, options?: unknown) => {
      if (type === 'beforeunload') listeners.push(listener)
      return original(type, listener as EventListener, options as AddEventListenerOptions)
    }) as typeof window.addEventListener
  })
  await launch(page)
  await enableAgentApi(page)
  const uid = (await readDocument(page)).schedule.tasks[0]?.['uid']
  await page.evaluate((uid) => {
    const api = (window as any).grSchedulerAgentApi
    return api.applyCommands({ readStamp: api.readStamp(), commands: [{ kind: 'setTaskName', uid, name: 'An unsaved edit' }] })
  }, uid)
  await settle(page)
  const heard = await page.evaluate(() => {
    const said: unknown[] = []
    let asked = false
    const fake = {
      type: 'beforeunload',
      preventDefault: () => {
        asked = true
      },
      get returnValue(): unknown {
        return undefined
      },
      set returnValue(value: unknown) {
        asked = true
        said.push(value)
      },
    }
    const handlers = [...((window as any).__w3Unload as unknown[]), window.onbeforeunload].filter((one) => typeof one === 'function') as ((event: unknown) => unknown)[]
    for (const handler of handlers) {
      const back = handler(fake)
      if (back !== undefined && back !== null && back !== false) said.push(back)
    }
    return { asked, said: said.map((one) => (typeof one === 'string' ? one : typeof one)), handlers: handlers.length }
  })
  expect(heard.asked, 'precondition (FR-100): an unsaved edit asked the host for its warning').toBe(true)
  expect(heard.said.filter((one) => one !== '' && one !== 'boolean'), 'GRS handed the host words for the warning').toEqual([])
})

test(`DA-7: ${FIELD_SCROLLS_LIKE_THE_ENTRANCE}`, async ({ page }) => {
  await launch(page)
  await enableAgentApi(page)
  await press(page, 'IC-17')
  const date = '2027-09-15'
  const field = page.locator('[data-role="Properties Panel"] input[data-field-row="IC-44"]')
  await field.fill(date)
  await field.press('Enter')
  await settle(page)
  expect(String((await readDocument(page)).schedule.project['statusDate']).slice(0, 10), 'precondition: the field set statusDate').toBe(date)
  const area = await boxOf(page, '[data-role="Scrollbars"][data-axis="horizontal"]')
  const line = await boxOf(page, '[data-figure="status-line"]')
  expect(line.x + line.w / 2, 'the status line is not at the middle of the Task Group Area').toBeCloseTo(area.x + area.w / 2, 0)
})

test(`HF-10: ${OPEN_ALL_NOT_OUTERMOST}`, async ({ page }) => {
  await launch(page)
  const head = await page.evaluate(() =>
    [...document.querySelectorAll('[data-role="Task Group Panel"] > [data-icon]')].map((one) => ({ icon: one.getAttribute('data-icon'), x: one.getBoundingClientRect().x })),
  )
  const xs = head.map((one) => one.x)
  const openAll = head.find((one) => one.icon === 'IC-74')
  expect(openAll, 'precondition: HR-1 (IC-74) heads the Task Group Panel').toBeDefined()
  expect(openAll!.x, 'IC-74 is the leftmost of the row').toBeGreaterThan(Math.min(...xs))
  expect(openAll!.x, 'IC-74 is the rightmost of the row').toBeLessThan(Math.max(...xs))
  // STEP: the Tab order of the same row
  await page.locator(`[data-role="Task Group Panel"] > [data-icon="${head[0]?.icon}"]`).focus()
  const order: string[] = []
  for (let i = 0; i < head.length * 2; i++) {
    const icon = await page.evaluate(() => {
      const active = document.activeElement
      return active?.parentElement?.getAttribute('data-role') === 'Task Group Panel' ? active.getAttribute('data-icon') : null
    })
    if (icon !== null && !order.includes(icon)) order.push(icon)
    await page.keyboard.press('Tab')
  }
  const at = order.indexOf('IC-74')
  expect(at > 0 && at < order.length - 1, `IC-74 is outermost in the Tab order ${order.join(' ')}`).toBe(true)
})

test(`FR-016: ${FADE_FROM_POINTER}`, async ({ page }) => {
  await launch(page)
  await enableAgentApi(page)
  const documentBefore = await readDocument(page)
  const task = documentBefore.schedule.tasks.find((one) => one['milestone'] === false && one['parentTaskUid'] !== null && one['fadeOutDays'] === null)
  expect(task, 'precondition: a task with a period and no fade-out').toBeDefined()
  const uid = Number(task!['uid'])
  const plan = await boxOf(page, `[data-figure="task-${uid}-plan"]`)
  await page.mouse.click(plan.x + plan.w / 2, plan.y + plan.h / 2)
  await settle(page)
  const handleAt = async (): Promise<{ x: number; y: number }> => {
    const handles = await page.evaluate(
      (uid) =>
        [...document.querySelectorAll(`[data-figure="task-${uid}-fade-handle"]`)].map((e) => {
          const r = e.getBoundingClientRect()
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
        }),
      uid,
    )
    expect(handles.length, 'precondition: the selected task shows its fade grab points').toBe(2)
    // WHY: GA-8 stands on point 2 of table T-012a, the bottom edge of the plan, so the lower handle is the fade-out one.
    return handles.reduce((low, one) => (one.y > low.y ? one : low))
  }
  const ticks = await page.evaluate(() =>
    [...document.querySelectorAll('[data-figure*="-tick-"]')]
      .map((e) => ({ day: Number((e.getAttribute('data-figure') ?? '').split('-tick-')[1]), x: e.getBoundingClientRect().x }))
      .filter((t) => Number.isFinite(t.day))
      .sort((a, b) => a.day - b.day),
  )
  const first = ticks[0]!
  const last = ticks[ticks.length - 1]!
  const perDay = (last.x - first.x) / (last.day - first.day)
  // WHY: the plan ends on the right edge of its finish day, the left edge of the next calendar day (RV-6).
  const endDay = Math.round(Date.parse(String(task!['finish']).slice(0, 10) + 'T00:00:00Z') / 86_400_000) + 1
  const xOfDay = (day: number): number => first.x + (day - first.day) * perDay
  const results: { pointer: number; expected: number; written: unknown }[] = []
  for (const pointerDays of [9.3, 3.6]) {
    const handle = await handleAt()
    const covering = await page.evaluate(
      ({ x, y }) => document.elementsFromPoint(x, y).map((e) => e.getAttribute('data-role')).filter((role) => role === 'Command Palette' || role === 'Properties Panel'),
      handle,
    )
    expect(covering, 'precondition: no panel covers the fade-out grab point').toEqual([])
    // STEP: the press lands off the handle centre; the pointer position alone decides the count
    await page.mouse.move(handle.x - 1, handle.y - 1)
    await page.mouse.down()
    await page.mouse.move(xOfDay(endDay - pointerDays), handle.y - 1, { steps: 8 })
    await page.mouse.up()
    await settle(page)
    const after = (await readDocument(page)).schedule.tasks.find((one) => Number(one['uid']) === uid)
    results.push({ pointer: pointerDays, expected: Math.round(pointerDays), written: after?.['fadeOutDays'] })
  }
  expect(results.map((one) => one.written)).toEqual(results.map((one) => one.expected))
})

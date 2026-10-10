// CR-575 section 9 items 2-5 on the shipped build: the palette band stays grabbable over the App Header, over the help and inside the window.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { bare, bareAll, specTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import { ERP_SAMPLE, REQUIREMENTS, openDocument, openStage, settle, type Stage } from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'

const FR_053_OVER_THE_HEADER = '⚠️ `App Header` の上へは運べる —— パレットはヘッダーより手前に描く（表 T-337）。'
const FR_053_FOLLOWS_THE_POINTER = '**掴み帯を握っているあいだ、パレットをポインタに追従させること（MUST）**'
const FR_053_NEVER_OUT_OF_THE_WINDOW = '⛔ 掴み帯を閲覧環境の窓の外へ出してはならない（MUST NOT）。'
const FR_053_WHAT_STAYS_IN =
  '帯の上端と下端が窓の中に在り、帯の右端の `IC-53` と `IC-75` が窓の中に在ること（MUST） —— 追従しているあいだも、離して角が決まるときも、窓の大きさが変わったときも同じである。'
const FR_053_MINIMIZED_SHOWS_THE_BAND_ONLY =
  '⛔ 最小化しているあいだに出すのは掴み帯だけとし、ほかは何も出さないこと（MUST） —— 帯には掴めることを示す 表 T-109 の `IC-53` と、最小化の入口（同表の `IC-75`）が載ったままである。'
const FR_152_FOLLOW_T_337 = '前後は `FR-152` の 表 T-337 に従うこと。'
const T_337_THE_FRONT_ONE_TAKES_THE_PRESS = '⭐ 押下は、その点で最も手前に描かれた UI パーツが受けること（MUST）。'
const T_337_NO_PART_STOPS_PRESSES_OUTSIDE = '⛔ UI パーツは、自分の外の押下を止めてはならない（MUST NOT）'
const IN_3_A_PRESS_DROPS_THE_TRIGGER =
  '⭐ 入口を押したら、その入口の説明の引き金は外れたものとすること（MUST） —— 押した入口が開いた UI パーツの上に、押す前の説明が残る。'
const IC_75_SAME_ENTRANCE_RESTORES = '**同じ入口で戻す**'

const CLAUSES: readonly string[] = [
  FR_053_OVER_THE_HEADER,
  FR_053_FOLLOWS_THE_POINTER,
  FR_053_NEVER_OUT_OF_THE_WINDOW,
  FR_053_WHAT_STAYS_IN,
  FR_053_MINIMIZED_SHOWS_THE_BAND_ONLY,
  FR_152_FOLLOW_T_337,
  T_337_THE_FRONT_ONE_TAKES_THE_PRESS,
  T_337_NO_PART_STOPS_PRESSES_OUTSIDE,
  IN_3_A_PRESS_DROPS_THE_TRIGGER,
]

const T_103 = specTable('T-103')
const T_109 = specTable('T-109')
const partOf = (id: string): string => `[data-role="${bare(rowOf(T_103, id).by['確定名（英）'] ?? '')}"]`

const PALETTE = partOf('U-26')
const HEADER = partOf('U-31')
const HELP = partOf('U-30')
const TOOLTIP = partOf('U-53')

const GRAB_MARK = rowOf(T_109, 'IC-53').id
const MINIMIZE = rowOf(T_109, 'IC-75').id
const OPEN_HELP = rowOf(T_109, 'IC-22').id

const PALETTE_NAME = bare(rowOf(T_103, 'U-26').by['確定名（英）'] ?? '')
const NO_ARM = new Set(['', '—', '-'])
const ARMING_IN_THE_PALETTE: readonly string[] = T_109.rows
  .filter((row) => bareAll(row.by['面'] ?? '').includes(PALETTE_NAME) && !NO_ARM.has((row.by['構え'] ?? '').trim()))
  .map((row) => row.id)

const numberOf = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(cell).replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return value
}

// see S-124
const S_124_MS = numberOf(rowOf(specTable('T-212'), 'S-124').by['値'] ?? '')

// WHY: the two window sizes CR-575 section 9 names for the check on the shipped build.
const TALL = { width: 1600, height: 1000 }
const LOW = { width: 1600, height: 600 }

// WHY: a box laid out at a fractional position reads back a fraction off; less than that is not a move.
const SUBPIXEL = 0.5

// WHY: past S-124 the description still needs a frame or two to be drawn and read back.
const SHOW_ALLOWANCE_MS = 1_500

interface Rect {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

interface Point {
  readonly x: number
  readonly y: number
}

interface Band {
  readonly band: Rect
  readonly palette: Rect
  readonly grabMark: Rect
  readonly minimize: Rect
  readonly window: { readonly width: number; readonly height: number }
}

const centerOf = (rect: Rect): Point => ({ x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 })

const holds = (rect: Rect, point: Point): boolean =>
  point.x >= rect.left && point.x < rect.right && point.y >= rect.top && point.y < rect.bottom

const insideWindow = (rect: Rect, window: { width: number; height: number }): boolean =>
  rect.left >= -SUBPIXEL &&
  rect.top >= -SUBPIXEL &&
  rect.right <= window.width + SUBPIXEL &&
  rect.bottom <= window.height + SUBPIXEL

const said = (rect: Rect): string =>
  `[${rect.left.toFixed(1)}, ${rect.top.toFixed(1)}] - [${rect.right.toFixed(1)}, ${rect.bottom.toFixed(1)}]`

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

// see OP-3
async function openTheSample(size: { width: number; height: number }): Promise<Stage> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const stage = await openStage(browser)
  await stage.page.setViewportSize(size)
  await openDocument(stage.page, 'sample-large-erp-program.ja.xml', ERP_SAMPLE)
  return stage
}

async function rectOf(page: Page, selector: string): Promise<Rect | null> {
  return page.evaluate((wanted: string) => {
    const found = document.querySelector(wanted)
    if (found === null) return null
    const box = found.getBoundingClientRect()
    return { left: box.left, top: box.top, right: box.right, bottom: box.bottom }
  }, selector)
}

// see GR-19, FR-053
async function readBand(page: Page): Promise<Band> {
  const read = await page.evaluate(
    ({ palette, grabMark, minimize }: { palette: string; grabMark: string; minimize: string }) => {
      const rect = (element: Element): { left: number; top: number; right: number; bottom: number } => {
        const box = element.getBoundingClientRect()
        return { left: box.left, top: box.top, right: box.right, bottom: box.bottom }
      }
      const whole = document.querySelector(palette)
      const grab = whole?.querySelector(`[data-icon="${grabMark}"]`) ?? null
      const small = whole?.querySelector(`[data-icon="${minimize}"]`) ?? null
      if (whole === null || grab === null || small === null) return null
      let band: Element | null = grab
      while (band !== null && band.parentElement !== whole) band = band.parentElement
      if (band === null) return null
      return {
        band: rect(band),
        palette: rect(whole),
        grabMark: rect(grab),
        minimize: rect(small),
        window: { width: window.innerWidth, height: window.innerHeight },
      }
    },
    { palette: PALETTE, grabMark: `${GRAB_MARK}`, minimize: `${MINIMIZE}` },
  )
  if (read === null) throw new Error(`no ${PALETTE} carrying ${GRAB_MARK} and ${MINIMIZE} is on the screen`)
  return read
}

// see T-337
async function frontIsInside(page: Page, point: Point, selector: string): Promise<boolean> {
  return page.evaluate(
    ({ at, wanted }: { at: { x: number; y: number }; wanted: string }) => {
      const front = document.elementFromPoint(at.x, at.y)
      const part = document.querySelector(wanted)
      return front !== null && part !== null && part.contains(front)
    },
    { at: point, wanted: selector },
  )
}

async function visibleEntrancesIn(page: Page, selector: string): Promise<string[]> {
  return page.evaluate((wanted: string) => {
    const part = document.querySelector(wanted)
    if (part === null) return []
    return Array.from(part.querySelectorAll('[data-icon]'))
      .filter((one) => {
        const box = one.getBoundingClientRect()
        const seen = 'checkVisibility' in one ? (one as unknown as { checkVisibility(): boolean }).checkVisibility() : true
        return seen && box.width > 0 && box.height > 0
      })
      .map((one) => one.getAttribute('data-icon') ?? '')
  }, selector)
}

async function pressAt(page: Page, point: Point): Promise<void> {
  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
  await page.mouse.up()
  await settle(page)
}

// see FR-053
async function carry(page: Page, from: Point, to: Point): Promise<void> {
  const steps = 12
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  for (let step = 1; step <= steps; step += 1) {
    await page.mouse.move(from.x + ((to.x - from.x) * step) / steps, from.y + ((to.y - from.y) * step) / steps)
  }
  await page.mouse.up()
  await settle(page)
}

async function carryOverTheHeader(page: Page): Promise<{ before: Band; after: Band; header: Rect }> {
  const header = await rectOf(page, HEADER)
  if (header === null) throw new Error(`no ${HEADER} is on the screen`)
  const before = await readBand(page)
  const from = centerOf(before.band)
  await carry(page, from, { x: from.x, y: centerOf(header).y })
  return { before, after: await readBand(page), header }
}

async function tooltipText(page: Page): Promise<string> {
  return page.evaluate((wanted: string) => document.querySelector(wanted)?.textContent?.trim() ?? '', TOOLTIP)
}

async function isArmed(page: Page, icon: string): Promise<boolean> {
  return page.evaluate((wanted: string) => document.querySelector(`[data-icon="${wanted}"]`)?.getAttribute('data-armed') === 'true', icon)
}

test('CR-575 -- FR-053, FR-152, T-337 and IN-3 still say what these cases press, word for word', () => {
  for (const clause of CLAUSES) expect(REQUIREMENTS, clause).toContain(clause)
  expect(rowOf(T_109, MINIMIZE).by['何の入口か'] ?? '', IC_75_SAME_ENTRANCE_RESTORES).toContain(IC_75_SAME_ENTRANCE_RESTORES)
  expect(ARMING_IN_THE_PALETTE.length, 'premise: table T-109 names entrances of the palette that arm').toBeGreaterThan(0)
  expect(S_124_MS, 'premise: S-124 reads as a wait').toBeGreaterThan(0)
})

test.describe('CR-575 item 2 -- the band is carried over the App Header and stays the front there (FR-053, T-337 UZ-5 over UZ-8)', () => {
  test('FR-053 / T-337: over the header the band center shows the palette, and the band carries it back', async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample(TALL)
    try {
      const { page } = stage
      const { before, after, header } = await carryOverTheHeader(page)
      const center = centerOf(after.band)
      expect(holds(header, center), `${FR_053_OVER_THE_HEADER} band ${said(after.band)}, header ${said(header)}`).toBe(true)
      expect(await frontIsInside(page, center, PALETTE), T_337_THE_FRONT_ONE_TAKES_THE_PRESS).toBe(true)

      await carry(page, center, centerOf(before.band))
      const back = await readBand(page)
      expect(Math.abs(back.palette.left - before.palette.left), `${FR_053_FOLLOWS_THE_POINTER} ${said(back.palette)} vs ${said(before.palette)}`).toBeLessThanOrEqual(SUBPIXEL)
      expect(Math.abs(back.palette.top - before.palette.top), `${FR_053_FOLLOWS_THE_POINTER} ${said(back.palette)} vs ${said(before.palette)}`).toBeLessThanOrEqual(SUBPIXEL)
    } finally {
      await stage.close()
    }
  })

  test('FR-053 / IC-75: over the header IC-75 minimizes to the band alone, and the same entrance restores it in place', async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample(TALL)
    try {
      const { page } = stage
      const { after, header } = await carryOverTheHeader(page)
      const open = await visibleEntrancesIn(page, PALETTE)
      expect(open.filter((one) => one !== GRAB_MARK && one !== MINIMIZE).length, 'premise: the palette shows entrances before it is minimized').toBeGreaterThan(0)
      const minimizeAt = centerOf(after.minimize)
      expect(await frontIsInside(page, minimizeAt, PALETTE), `${T_337_THE_FRONT_ONE_TAKES_THE_PRESS} (${MINIMIZE})`).toBe(true)

      await pressAt(page, minimizeAt)
      const minimized = await visibleEntrancesIn(page, PALETTE)
      expect(minimized.filter((one) => one !== GRAB_MARK && one !== MINIMIZE), FR_053_MINIMIZED_SHOWS_THE_BAND_ONLY).toEqual([])
      expect(minimized, FR_053_MINIMIZED_SHOWS_THE_BAND_ONLY).toEqual(expect.arrayContaining([GRAB_MARK, MINIMIZE]))
      const small = await readBand(page)
      expect(holds(header, centerOf(small.band)), `${FR_053_OVER_THE_HEADER} band ${said(small.band)}`).toBe(true)

      await pressAt(page, centerOf(small.minimize))
      const restored = await visibleEntrancesIn(page, PALETTE)
      expect(restored.filter((one) => one !== GRAB_MARK && one !== MINIMIZE).length, IC_75_SAME_ENTRANCE_RESTORES).toBeGreaterThan(0)
      const again = await readBand(page)
      expect(holds(header, centerOf(again.band)), `${FR_053_OVER_THE_HEADER} band ${said(again.band)}`).toBe(true)
    } finally {
      await stage.close()
    }
  })
})

test.describe('CR-575 item 3 -- the palette over the open help is in front and armable (T-337 UZ-5 over UZ-7, JDG-661)', () => {
  test('T-337: with the help open, an entrance of the palette carried over the help is the front and arms', async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample(TALL)
    try {
      const { page } = stage
      const helpEntrance = await rectOf(page, `[data-icon="${OPEN_HELP}"]`)
      if (helpEntrance === null) throw new Error(`${OPEN_HELP} is not on the screen`)
      await pressAt(page, centerOf(helpEntrance))
      const help = await rectOf(page, HELP)
      if (help === null) throw new Error(`${OPEN_HELP} opened no ${HELP}`)

      const shown = await visibleEntrancesIn(page, PALETTE)
      const arming = ARMING_IN_THE_PALETTE.find((one) => shown.includes(one))
      if (arming === undefined) throw new Error(`none of ${ARMING_IN_THE_PALETTE.join(' ')} is shown in the palette`)
      expect(await isArmed(page, arming), `premise: ${arming} is not armed yet`).toBe(false)
      const entrance = await rectOf(page, `${PALETTE} [data-icon="${arming}"]`)
      if (entrance === null) throw new Error(`${arming} is not in the palette`)
      const before = await readBand(page)
      const shift = { x: centerOf(help).x - centerOf(entrance).x, y: centerOf(help).y - centerOf(entrance).y }
      const from = centerOf(before.band)
      await carry(page, from, { x: from.x + shift.x, y: from.y + shift.y })

      const moved = await rectOf(page, `${PALETTE} [data-icon="${arming}"]`)
      if (moved === null) throw new Error(`${arming} left the palette`)
      const target = centerOf(moved)
      expect(holds(help, target), `premise: ${arming} ${said(moved)} lies over ${HELP} ${said(help)}`).toBe(true)
      expect(await frontIsInside(page, target, PALETTE), T_337_THE_FRONT_ONE_TAKES_THE_PRESS).toBe(true)
      expect(await frontIsInside(page, centerOf((await readBand(page)).band), PALETTE), T_337_THE_FRONT_ONE_TAKES_THE_PRESS).toBe(true)

      await pressAt(page, target)
      // WHY: data-armed is the mark the use-case tests read an armed entrance by; no row names one.
      expect(await isArmed(page, arming), `${T_337_THE_FRONT_ONE_TAKES_THE_PRESS} (${arming})`).toBe(true)
      expect(await rectOf(page, HELP), T_337_NO_PART_STOPS_PRESSES_OUTSIDE).not.toBeNull()
    } finally {
      await stage.close()
    }
  })
})

test.describe('CR-575 item 4 -- the band never leaves the window (FR-053, JDG-660)', () => {
  const expectInside = (read: Band, when: string): void => {
    expect(read.band.top, `${FR_053_WHAT_STAYS_IN} ${when}: band ${said(read.band)}`).toBeGreaterThanOrEqual(-SUBPIXEL)
    expect(read.band.bottom, `${FR_053_WHAT_STAYS_IN} ${when}: band ${said(read.band)}`).toBeLessThanOrEqual(read.window.height + SUBPIXEL)
    expect(insideWindow(read.grabMark, read.window), `${FR_053_WHAT_STAYS_IN} ${when}: ${GRAB_MARK} ${said(read.grabMark)}`).toBe(true)
    expect(insideWindow(read.minimize, read.window), `${FR_053_WHAT_STAYS_IN} ${when}: ${MINIMIZE} ${said(read.minimize)}`).toBe(true)
  }

  test('FR-053: thrown past the top and the right edge, the band stays in while held and after release', async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample(TALL)
    try {
      const { page } = stage
      const from = centerOf((await readBand(page)).band)
      const width = TALL.width
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      await page.mouse.move(from.x, 1, { steps: 12 })
      await settle(page)
      expectInside(await readBand(page), 'while held at the top edge')
      await page.mouse.move(width - 1, 1, { steps: 12 })
      await settle(page)
      expectInside(await readBand(page), 'while held at the top right corner')
      await page.mouse.up()
      await settle(page)
      expectInside(await readBand(page), 'after release at the top right corner')
    } finally {
      await stage.close()
    }
  })

  test('FR-053: left at the bottom right corner, the band and its two marks stay in when the window shrinks', async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample(TALL)
    try {
      const { page } = stage
      const from = centerOf((await readBand(page)).band)
      await carry(page, from, { x: TALL.width - 1, y: TALL.height - 1 })
      expectInside(await readBand(page), `after release at the bottom right corner of ${TALL.width} x ${TALL.height}`)
      await page.setViewportSize(LOW)
      await settle(page)
      expectInside(await readBand(page), `after the window shrank to ${LOW.width} x ${LOW.height}`)
      const narrow = { width: LOW.width / 2, height: LOW.height }
      await page.setViewportSize(narrow)
      await settle(page)
      expectInside(await readBand(page), `after the window shrank to ${narrow.width} x ${narrow.height}`)
    } finally {
      await stage.close()
    }
  })
})

test.describe('CR-575 item 5 -- pressing an entrance drops its description (IN-3, JDG-662)', () => {
  test('IN-3: the description IC-22 shows is gone once IC-22 is pressed and the help is open', async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample(TALL)
    try {
      const { page } = stage
      const entrance = await rectOf(page, `[data-icon="${OPEN_HELP}"]`)
      if (entrance === null) throw new Error(`${OPEN_HELP} is not on the screen`)
      const at = centerOf(entrance)
      await page.mouse.move(at.x, at.y)
      await expect
        .poll(() => tooltipText(page), { timeout: S_124_MS + SHOW_ALLOWANCE_MS, message: `premise: resting on ${OPEN_HELP} shows its description` })
        .not.toBe('')

      // STEP: press without moving the pointer, so only the press can drop the trigger
      await page.mouse.down()
      await page.mouse.up()
      await expect.poll(() => rectOf(page, HELP), { timeout: SHOW_ALLOWANCE_MS, message: `${OPEN_HELP} opens ${HELP}` }).not.toBeNull()
      await expect.poll(() => tooltipText(page), { timeout: SHOW_ALLOWANCE_MS, message: IN_3_A_PRESS_DROPS_THE_TRIGGER }).toBe('')
      await page.waitForTimeout(S_124_MS + SHOW_ALLOWANCE_MS)
      expect(await tooltipText(page), IN_3_A_PRESS_DROPS_THE_TRIGGER).toBe('')
    } finally {
      await stage.close()
    }
  })
})

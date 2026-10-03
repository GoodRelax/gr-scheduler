// CR-576 section 8 claims 3, 4, 5 and 6 on the shipped build: the icon hint waits from entering, the task hint waits from the stop.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test, type Browser, type Page } from '@playwright/test'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, DRAWN_SVG, launchReferenceBrowser } from './live-app'
import { ERP_SAMPLE, REQUIREMENTS, openDocument, openStage, settle, type Stage } from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'

const EZ_2_WAIT = 'ポインタがアイコンに入ってから `_assets/tbl-settings.md` の `S-124` が経ったら、そのアイコンの説明を出すこと（MUST）。'
const EZ_2_FROM_ENTERING = '⭐ 待ちは、ポインタがそのアイコンに入った時から数えること（MUST）。'
const EZ_2_NO_RESTART = 'アイコンの中でポインタが動いても数え直してはならない（MUST NOT）'
const EZ_2_STAYS = '⭐ 出した説明は、ポインタがそのアイコンの上にあるあいだ、消さず、置き場も動かさないこと（MUST）'
const EZ_2_LEAVING = 'ポインタがそのアイコンの外へ出たら、説明を消し、次に入った対象で待ちを数え直すこと（MUST）'
const EZ_2_THE_BOX_IS_OUTSIDE = '説明の箱の上へ動いたことも、アイコンの外へ出たことに数える（説明はポインタを受け取らない —— `IN-3`）。'
const EZ_6_WAIT =
  '日程の上でポインタが `_assets/tbl-settings.md` の `S-439` のあいだ止まったら、そこに当たったものの説明を、表 T-348 の行で出すこと（MUST）。'
const EZ_6_MOVE_HIDES = 'ポインタが動いたら消すこと（MUST）'
const EZ_6_TWO_VALUES = '⚠️ 待ち時間は `S-439` とし、`EZ-2` の待ち（`S-124`）とは別の値として持つこと（MUST）'
const EZ_6_FROM_THE_STOP = '⚠️ 待ちを数え始めるのは、`EZ-2` と違い、ポインタが止まった時である'
const EZ_6_DATES =
  '予定の日は、マイルストーンなら `start` の日（`TL-10`）1 つ、ほかは `start` の日、半角空白 1 つ、`-`、半角空白 1 つ、`finish` の日 の順とすること（MUST）'
const IN_3_CAN_BE_PUT_AWAY = '**消せること** —— ポインタもフォーカスも動かさずに消す手立てがあること。'
const IN_4_LAST_RUNG = '`Dual Cursor` モード → 出ている説明 の順とすること（MUST）'
const MACHINE_ROW_TARGET = '| `screen/hintTargetChanged` | — | → `allowed` |'

const CLAUSES: readonly string[] = [
  EZ_2_WAIT,
  EZ_2_FROM_ENTERING,
  EZ_2_NO_RESTART,
  EZ_2_STAYS,
  EZ_2_LEAVING,
  EZ_2_THE_BOX_IS_OUTSIDE,
  EZ_6_WAIT,
  EZ_6_MOVE_HIDES,
  EZ_6_TWO_VALUES,
  EZ_6_FROM_THE_STOP,
  EZ_6_DATES,
  IN_3_CAN_BE_PUT_AWAY,
  IN_4_LAST_RUNG,
]

const MACHINE_TABLES = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-state-machines.md'), 'utf8'))

const numberOf = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(cell).replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return value
}

// see S-124, S-439
const S_124_MS = numberOf(rowOf(specTable('T-212'), 'S-124').by['値'] ?? '')
const S_439_MS = numberOf(rowOf(specTable('T-212'), 'S-439').by['値'] ?? '')

// see U-31, U-53
const HEADER = `[data-role="${bare(rowOf(specTable('T-103'), 'U-31').by['確定名（英）'] ?? '')}"]`
const TOOLTIP = `[data-role="${bare(rowOf(specTable('T-103'), 'U-53').by['確定名（英）'] ?? '')}"]`
// WHY: the stage presses IC-20 on opening, and a pressed entrance has dropped its trigger (IN-3).
const PRESSED_ON_OPENING = rowOf(specTable('T-109'), 'IC-20').id

// see FR-038, EZ-2
const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  readonly icons: readonly { readonly rowId: string; readonly hint?: { readonly ja: string; readonly en: string } }[]
}
const HINTS: ReadonlyMap<string, readonly string[]> = new Map(
  WORDS.icons.flatMap((one) => (one.hint === undefined ? [] : [[one.rowId, [one.hint.ja, one.hint.en]] as const])),
)

// see EZ-6
// see TL-5, TL-10, TL-11
const TELLING = /: (?:\d{4}\/)?\d{1,2}\/\d{1,2} \([^)]+\) - (?:\d{4}\/)?\d{1,2}\/\d{1,2} \([^)]+\)/

// WHY: "a few pixels" of claim 3 -- small enough to stay inside an entrance of the App Header.
const WIGGLE_PX = 2
// WHY: claim 3 moves the pointer every fifth of S-124.
const WIGGLE_EVERY_MS = Math.round(S_124_MS / 5)
// WHY: the page may count a wait from the frame the move fell in, so a shown box can read one 60 Hz frame early.
const ONE_FRAME_MS = 17
// WHY: past a wait the box still needs a frame or two to be drawn and read back (as CR-575's cases allow).
const SHOW_ALLOWANCE_MS = 1_500
// WHY: a box laid out at a fractional position reads back a fraction off; less than that is not a move.
const SUBPIXEL = 0.5

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

interface Seen {
  readonly at: number
  readonly text: string
  readonly rect: Rect | null
}

interface Log {
  readonly moves: readonly number[]
  readonly seen: readonly Seen[]
}

const centreOf = (rect: Rect): Point => ({ x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 })

const said = (rect: Rect | null): string =>
  rect === null ? '(none)' : `[${rect.left.toFixed(1)}, ${rect.top.toFixed(1)}] - [${rect.right.toFixed(1)}, ${rect.bottom.toFixed(1)}]`

const sameRect = (one: Rect | null, two: Rect | null): boolean =>
  one !== null &&
  two !== null &&
  Math.abs(one.left - two.left) <= SUBPIXEL &&
  Math.abs(one.top - two.top) <= SUBPIXEL &&
  Math.abs(one.right - two.right) <= SUBPIXEL &&
  Math.abs(one.bottom - two.bottom) <= SUBPIXEL

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

// see OP-3
/** @purity non-pure */
async function openTheSample(): Promise<Stage> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const stage = await openStage(browser)
  await openDocument(stage.page, 'sample-large-erp-program.ja.xml', ERP_SAMPLE)
  await installRecorder(stage.page)
  return stage
}

// WHY: the page's own clock -- every pointer move and every change of the shown box, stamped where they happen,
// so a wait is measured without the round trips of the driver.
/** @purity non-pure */
async function installRecorder(page: Page): Promise<void> {
  await page.evaluate((tooltip: string) => {
    const log = { moves: [] as number[], seen: [] as { at: number; text: string; rect: { left: number; top: number; right: number; bottom: number } | null }[] }
    ;(window as unknown as Record<string, unknown>)['grsCr576'] = log
    window.addEventListener('pointermove', (event) => log.moves.push(event.timeStamp), true)
    let last = '\u0000'
    const note = (): void => {
      const layer = document.querySelector(tooltip)
      const boxes = layer === null ? [] : Array.from(layer.children).filter((one) => (one.textContent ?? '').trim() !== '')
      const box = boxes[boxes.length - 1]
      const text = (box?.textContent ?? '').trim()
      const found = box?.getBoundingClientRect()
      const rect = found === undefined ? null : { left: found.left, top: found.top, right: found.right, bottom: found.bottom }
      const key = `${text}|${rect === null ? '' : [rect.left, rect.top, rect.right, rect.bottom].map((n) => n.toFixed(1)).join(',')}`
      if (key === last) return
      last = key
      log.seen.push({ at: performance.now(), text, rect })
    }
    new MutationObserver(note).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden'],
    })
    note()
  }, TOOLTIP)
}

/** @purity semi-pure-b */
async function nowOf(page: Page): Promise<number> {
  return page.evaluate(() => performance.now())
}

/** @purity semi-pure-b */
async function logSince(page: Page, since: number): Promise<Log> {
  return page.evaluate((from: number) => {
    const log = (window as unknown as Record<string, { moves: number[]; seen: { at: number; text: string; rect: unknown }[] }>)['grsCr576']
    if (log === undefined) throw new Error('the recorder is not installed')
    return { moves: log.moves.filter((at) => at >= from), seen: log.seen.filter((one) => one.at >= from) }
  }, since) as Promise<Log>
}

/** @purity semi-pure-b */
async function shownNow(page: Page): Promise<{ text: string; rect: Rect | null }> {
  return page.evaluate((tooltip: string) => {
    const layer = document.querySelector(tooltip)
    const boxes = layer === null ? [] : Array.from(layer.children).filter((one) => (one.textContent ?? '').trim() !== '')
    const box = boxes[boxes.length - 1]
    const found = box?.getBoundingClientRect()
    return {
      text: (box?.textContent ?? '').trim(),
      rect: found === undefined ? null : { left: found.left, top: found.top, right: found.right, bottom: found.bottom },
    }
  }, TOOLTIP)
}

// WHY: two entrances of the App Header that carry a description, are wholly on the screen and are the front at
// their centre, wide enough to move a few pixels inside.
/** @purity semi-pure-b */
async function twoHintedEntrances(page: Page): Promise<readonly { icon: string; rect: Rect }[]> {
  const found = await page.evaluate(
    ({ header, hinted, skip, room }: { header: string; hinted: readonly string[]; skip: string; room: number }) => {
      const part = document.querySelector(header)
      if (part === null) return []
      const out: { icon: string; rect: { left: number; top: number; right: number; bottom: number } }[] = []
      for (const one of Array.from(part.querySelectorAll('[data-icon]'))) {
        const icon = one.getAttribute('data-icon') ?? ''
        if (icon === skip || !hinted.includes(icon) || out.some((seen) => seen.icon === icon)) continue
        const box = one.getBoundingClientRect()
        if (box.width < 2 * room + 4 || box.height < 2 * room + 4) continue
        if (box.left < 0 || box.top < 0 || box.right > window.innerWidth || box.bottom > window.innerHeight) continue
        const front = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
        if (front === null || (front !== one && !one.contains(front))) continue
        out.push({ icon, rect: { left: box.left, top: box.top, right: box.right, bottom: box.bottom } })
      }
      return out
    },
    { header: HEADER, hinted: [...HINTS.keys()], skip: PRESSED_ON_OPENING, room: WIGGLE_PX },
  )
  if (found.length < 2) throw new Error(`premise: the App Header shows ${found.length} hinted entrances, and these cases need two`)
  return found.slice(0, 2)
}

// see EZ-2
/** @purity pure */
function pointOfTheBoxOutside(box: Rect, icon: Rect, centre: Point): Point | null {
  const at = { x: Math.min(Math.max(centre.x, box.left + 2), box.right - 2), y: (box.top + box.bottom) / 2 }
  const outside = at.y < icon.top || at.y > icon.bottom || at.x < icon.left || at.x > icon.right
  return outside ? at : null
}

// see IN-3, UZ-2
/** @purity semi-pure-b */
async function frontIsTheTooltip(page: Page, at: Point): Promise<boolean> {
  return page.evaluate(
    ({ point, tooltip }: { point: Point; tooltip: string }) => {
      const front = document.elementFromPoint(point.x, point.y)
      return front !== null && front.closest(tooltip) !== null
    },
    { point: at, tooltip: TOOLTIP },
  )
}

/** @purity pure */
function isHintOf(icon: string, text: string): boolean {
  return (HINTS.get(icon) ?? []).some((hint) => hint !== '' && text.includes(hint))
}

// WHY: a spot where nothing raises a description -- the corner of the window, checked quiet before use.
/** @purity non-pure */
async function goNowhere(page: Page): Promise<Point> {
  const spot = await page.evaluate(() => ({ x: 2, y: window.innerHeight - 2 }))
  await page.mouse.move(spot.x, spot.y)
  await page.waitForTimeout(Math.max(S_124_MS, S_439_MS) + SHOW_ALLOWANCE_MS / 2)
  const quiet = await shownNow(page)
  if (quiet.text !== '') throw new Error(`premise: the corner ${JSON.stringify(spot)} raises ${JSON.stringify(quiet.text)}`)
  return spot
}

/** @purity non-pure */
async function wiggleInside(page: Page, centre: Point, times: number): Promise<void> {
  const steps: readonly Point[] = [
    { x: WIGGLE_PX, y: 0 },
    { x: 0, y: WIGGLE_PX },
    { x: -WIGGLE_PX, y: 0 },
    { x: 0, y: -WIGGLE_PX },
  ]
  for (let at = 0; at < times; at += 1) {
    await page.waitForTimeout(WIGGLE_EVERY_MS)
    const step = steps[at % steps.length] ?? { x: 0, y: 0 }
    await page.mouse.move(centre.x + step.x, centre.y + step.y)
  }
}

/** @purity non-pure */
async function restUntilShown(page: Page, at: Point, what: string): Promise<{ text: string; rect: Rect }> {
  await page.mouse.move(at.x, at.y)
  await expect
    .poll(async () => (await shownNow(page)).text, { timeout: Math.max(S_124_MS, S_439_MS) + SHOW_ALLOWANCE_MS, message: what })
    .not.toBe('')
  const shown = await shownNow(page)
  if (shown.rect === null) throw new Error(`${what}: a description without a box`)
  return { text: shown.text, rect: shown.rect }
}

/** @purity pure */
function firstMove(log: Log, what: string): number {
  const at = log.moves[0]
  if (at === undefined) throw new Error(`${what}: the page saw no pointer move`)
  return at
}

/** @purity pure */
function lastMoveBefore(log: Log, at: number): number {
  return log.moves.filter((one) => one <= at).reduce((latest, one) => Math.max(latest, one), Number.NEGATIVE_INFINITY)
}

test('CR-576 -- EZ-2, EZ-6, IN-3, IN-4 and the tooltip machine still say what these cases wait for, word for word', () => {
  for (const clause of CLAUSES) expect(REQUIREMENTS, clause).toContain(clause)
  expect(MACHINE_TABLES, MACHINE_ROW_TARGET).toContain(MACHINE_ROW_TARGET)
  expect(S_124_MS, 'premise: S-124 reads as a wait').toBeGreaterThan(0)
  expect(S_124_MS + ONE_FRAME_MS, `premise of claim 6: S-124 (${S_124_MS}) is shorter than S-439 (${S_439_MS})`).toBeLessThan(S_439_MS)
  expect(HINTS.size, 'premise: the dictionary gives descriptions to entrances').toBeGreaterThan(0)
})

test.describe('CR-576 claim 3 -- the icon wait counts from entering the icon (EZ-2)', () => {
  test(`${EZ_2_FROM_ENTERING} ${EZ_2_NO_RESTART}`, async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample()
    try {
      const { page } = stage
      const [one] = await twoHintedEntrances(page)
      if (one === undefined) throw new Error('premise: no entrance')
      await goNowhere(page)
      const since = await nowOf(page)
      const centre = centreOf(one.rect)
      // STEP: enter at once, then keep moving a few pixels every fifth of S-124 for twice S-124
      await page.mouse.move(centre.x, centre.y)
      await wiggleInside(page, centre, 10)
      await page.waitForTimeout(S_124_MS + SHOW_ALLOWANCE_MS)

      const log = await logSince(page, since)
      const entered = firstMove(log, one.icon)
      const shown = log.seen.find((seen) => seen.text !== '')
      expect(shown, `${EZ_2_WAIT} (${one.icon}: nothing was shown)`).toBeDefined()
      if (shown === undefined) return
      expect(isHintOf(one.icon, shown.text), `the box shows the description of ${one.icon}: ${JSON.stringify(shown.text)}`).toBe(true)
      const waited = shown.at - entered
      expect(waited, `${EZ_2_WAIT} -- shown ${waited.toFixed(0)} ms after entering, before S-124 ${S_124_MS} ms`).toBeGreaterThanOrEqual(S_124_MS - ONE_FRAME_MS)
      expect(waited, `${EZ_2_WAIT} -- shown ${waited.toFixed(0)} ms after entering`).toBeLessThanOrEqual(S_124_MS + SHOW_ALLOWANCE_MS)
      const rested = shown.at - lastMoveBefore(log, shown.at)
      expect(
        rested,
        `${EZ_2_NO_RESTART} -- the box came only after the pointer had rested ${rested.toFixed(0)} ms, so the wait restarted on each move`,
      ).toBeLessThan(S_124_MS)
    } finally {
      await stage.close()
    }
  })
})

test.describe('CR-576 claim 4 -- a shown icon description stays put while the pointer is on the icon, and goes when it leaves, onto its box too (EZ-2, IN-3)', () => {
  test(`EZ-2 -- ${EZ_2_STAYS} ${EZ_2_NO_RESTART}`, async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample()
    try {
      const { page } = stage
      const [one] = await twoHintedEntrances(page)
      if (one === undefined) throw new Error('premise: no entrance')
      await goNowhere(page)
      const centre = centreOf(one.rect)
      const first = await restUntilShown(page, centre, `premise: resting on ${one.icon} shows its description`)

      const since = await nowOf(page)
      // STEP: move a few pixels inside the icon again and again, then stay past S-124
      await wiggleInside(page, centre, 10)
      await page.waitForTimeout(S_124_MS + SHOW_ALLOWANCE_MS)

      const log = await logSince(page, since)
      expect(log.moves.length, 'premise: the page saw the moves').toBeGreaterThanOrEqual(10)
      for (const seen of log.seen) {
        expect(seen.text, `${EZ_2_STAYS} -- at ${seen.at.toFixed(0)} ms the box read ${JSON.stringify(seen.text)}`).toBe(first.text)
        expect(sameRect(seen.rect, first.rect), `${EZ_2_STAYS} -- the box moved from ${said(first.rect)} to ${said(seen.rect)}`).toBe(true)
      }
      const still = await shownNow(page)
      expect(still.text, EZ_2_STAYS).toBe(first.text)
      expect(sameRect(still.rect, first.rect), `${EZ_2_STAYS} -- ${said(first.rect)} -> ${said(still.rect)}`).toBe(true)
    } finally {
      await stage.close()
    }
  })

  test(`EZ-2 / IN-3 -- ${EZ_2_LEAVING} ${EZ_2_THE_BOX_IS_OUTSIDE}`, async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample()
    try {
      const { page } = stage
      const [one] = await twoHintedEntrances(page)
      if (one === undefined) throw new Error('premise: no entrance')
      await goNowhere(page)
      const centre = centreOf(one.rect)
      const first = await restUntilShown(page, centre, `premise: resting on ${one.icon} shows its description`)
      const inTheBox = pointOfTheBoxOutside(first.rect, one.rect, centre)
      expect(inTheBox, `premise: a point of the box ${said(first.rect)} lies outside ${one.icon} ${said(one.rect)}`).not.toBeNull()
      if (inTheBox === null) return
      expect(await frontIsTheTooltip(page, inTheBox), `${EZ_2_THE_BOX_IS_OUTSIDE} -- the box takes the pointer at ${JSON.stringify(inTheBox)}`).toBe(false)

      const since = await nowOf(page)
      await page.mouse.move(inTheBox.x, inTheBox.y)
      await expect.poll(async () => (await shownNow(page)).text, { timeout: SHOW_ALLOWANCE_MS, message: EZ_2_THE_BOX_IS_OUTSIDE }).not.toBe(first.text)
      const log = await logSince(page, since)
      const change = log.seen.find((seen) => seen.text !== first.text)
      expect(change?.text, `${EZ_2_LEAVING} -- after moving onto the box the first change read ${JSON.stringify(change?.text)}`).toBe('')
    } finally {
      await stage.close()
    }
  })

  test(`EZ-2 -- ${EZ_2_LEAVING}`, async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample()
    try {
      const { page } = stage
      const [one, two] = await twoHintedEntrances(page)
      if (one === undefined || two === undefined) throw new Error('premise: two entrances')
      const nowhere = await goNowhere(page)

      // STEP: leave to a spot that is neither the icon nor its box -- the description goes
      const first = await restUntilShown(page, centreOf(one.rect), `premise: resting on ${one.icon} shows its description`)
      await page.mouse.move(nowhere.x, nowhere.y)
      await expect.poll(async () => (await shownNow(page)).text, { timeout: SHOW_ALLOWANCE_MS, message: EZ_2_LEAVING }).not.toBe(first.text)

      // STEP: from a shown description, straight into another icon -- the old one goes and the new wait starts at entering
      const again = await restUntilShown(page, centreOf(one.rect), `premise: resting on ${one.icon} again shows its description`)
      const since = await nowOf(page)
      const target = centreOf(two.rect)
      await page.mouse.move(target.x, target.y)
      await page.waitForTimeout(S_124_MS + SHOW_ALLOWANCE_MS)

      const log = await logSince(page, since)
      const entered = firstMove(log, two.icon)
      const next = log.seen.find((seen) => seen.text !== '' && seen.text !== again.text)
      expect(next, `${EZ_2_WAIT} (${two.icon}: nothing was shown)`).toBeDefined()
      if (next === undefined) return
      expect(isHintOf(two.icon, next.text), `the box shows the description of ${two.icon}: ${JSON.stringify(next.text)}`).toBe(true)
      const gone = log.seen.find((seen) => seen.text === '' && seen.at <= next.at)
      expect(gone, `${EZ_2_LEAVING} -- the description of ${one.icon} stood until ${two.icon}'s came`).toBeDefined()
      const waited = next.at - entered
      expect(waited, `${EZ_2_LEAVING} -- ${two.icon} shown ${waited.toFixed(0)} ms after entering, before S-124 ${S_124_MS} ms`).toBeGreaterThanOrEqual(S_124_MS - ONE_FRAME_MS)
    } finally {
      await stage.close()
    }
  })
})

test.describe('CR-576 claim 5 -- a description put away with Esc stays away on the same icon and comes back on a new target (IN-3, IN-4, JDG-668)', () => {
  test(`${IN_3_CAN_BE_PUT_AWAY} ${MACHINE_ROW_TARGET}`, async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample()
    try {
      const { page } = stage
      const [one, two] = await twoHintedEntrances(page)
      if (one === undefined || two === undefined) throw new Error('premise: two entrances')
      const nowhere = await goNowhere(page)
      // WHY: IN-4 spends Esc on the rungs above the description first; spend them before the case starts.
      for (let at = 0; at < 5; at += 1) await page.keyboard.press('Escape')
      await settle(page)

      const centre = centreOf(one.rect)
      await restUntilShown(page, centre, `premise: resting on ${one.icon} shows its description`)
      await page.keyboard.press('Escape')
      await expect.poll(async () => (await shownNow(page)).text, { timeout: SHOW_ALLOWANCE_MS, message: `${IN_4_LAST_RUNG} (${one.icon})` }).toBe('')

      // STEP: move on inside the same icon for well past S-124 -- the hint target has not changed
      const since = await nowOf(page)
      await wiggleInside(page, centre, 10)
      await page.waitForTimeout(S_124_MS + SHOW_ALLOWANCE_MS)
      const log = await logSince(page, since)
      expect(log.moves.length, 'premise: the page saw the moves').toBeGreaterThanOrEqual(10)
      expect(
        log.seen.filter((seen) => seen.text !== '').map((seen) => seen.text),
        `${MACHINE_ROW_TARGET} -- the put-away description came back on the same icon`,
      ).toEqual([])

      // STEP: out to nowhere and back -- going nowhere is a change of target, so the next wait shows it again
      await page.mouse.move(nowhere.x, nowhere.y)
      await page.waitForTimeout(WIGGLE_EVERY_MS)
      const back = await restUntilShown(page, centre, `${MACHINE_ROW_TARGET} -- leaving ${one.icon} and coming back`)
      expect(isHintOf(one.icon, back.text), `the box shows the description of ${one.icon}: ${JSON.stringify(back.text)}`).toBe(true)

      // STEP: put it away again, then straight into another icon
      await page.keyboard.press('Escape')
      await expect.poll(async () => (await shownNow(page)).text, { timeout: SHOW_ALLOWANCE_MS, message: IN_4_LAST_RUNG }).toBe('')
      const other = await restUntilShown(page, centreOf(two.rect), `${MACHINE_ROW_TARGET} -- moving from ${one.icon} into ${two.icon}`)
      expect(isHintOf(two.icon, other.text), `the box shows the description of ${two.icon}: ${JSON.stringify(other.text)}`).toBe(true)
    } finally {
      await stage.close()
    }
  })
})

// see EZ-6, T-023d
/** @purity semi-pure-b */
async function barsOnScreen(page: Page): Promise<readonly Rect[]> {
  return page.evaluate((canvas: string) => {
    const svg = document.querySelector(canvas)
    if (svg === null) return []
    const host = svg.getBoundingClientRect()
    return Array.from(svg.querySelectorAll('polygon, rect'))
      .map((one) => one.getBoundingClientRect())
      .filter(
        (box) =>
          box.width >= 60 &&
          box.height >= 8 &&
          box.height < box.width &&
          box.left > host.left + 20 &&
          box.top > host.top + 20 &&
          box.right < Math.min(host.right, window.innerWidth) - 20 &&
          box.bottom < Math.min(host.bottom, window.innerHeight) - 20,
      )
      .map((box) => ({ left: box.left, top: box.top, right: box.right, bottom: box.bottom }))
  }, DRAWN_SVG)
}

/** @purity non-pure */
async function aTaskToRestOn(page: Page): Promise<Point> {
  for (const bar of await barsOnScreen(page)) {
    await goNowhere(page)
    const at = centreOf(bar)
    await page.mouse.move(at.x, at.y)
    await page.waitForTimeout(S_439_MS + SHOW_ALLOWANCE_MS)
    if (TELLING.test((await shownNow(page)).text)) return at
  }
  throw new Error(`premise: no bar on the screen raised a description with ${TELLING.source} (EZ-6)`)
}

test.describe('CR-576 claim 6 -- the task description waits S-439 from the stop, not S-124 (EZ-6, JDG-667)', () => {
  test(`${EZ_6_WAIT} ${EZ_6_TWO_VALUES} ${EZ_6_MOVE_HIDES}`, async () => {
    test.setTimeout(300_000)
    const stage = await openTheSample()
    try {
      const { page } = stage
      const at = await aTaskToRestOn(page)
      await goNowhere(page)

      // STEP: stop on the task and wait past S-439
      const since = await nowOf(page)
      await page.mouse.move(at.x, at.y)
      await page.waitForTimeout(S_439_MS + SHOW_ALLOWANCE_MS)
      const log = await logSince(page, since)
      const stopped = firstMove(log, 'the task')
      const shown = log.seen.find((seen) => seen.text !== '')
      expect(shown, `${EZ_6_WAIT} (nothing was shown)`).toBeDefined()
      if (shown === undefined) return
      expect(shown.text, EZ_6_DATES).toMatch(TELLING)
      const waited = shown.at - stopped
      expect(waited, `${EZ_6_TWO_VALUES} -- shown ${waited.toFixed(0)} ms after the stop, S-124 is ${S_124_MS} ms and S-439 ${S_439_MS} ms`).toBeGreaterThanOrEqual(S_439_MS - ONE_FRAME_MS)
      expect(waited, `${EZ_6_WAIT} -- shown ${waited.toFixed(0)} ms after the stop`).toBeLessThanOrEqual(S_439_MS + SHOW_ALLOWANCE_MS)

      // STEP: move a few pixels along the task and stop again
      const moved = await nowOf(page)
      await page.mouse.move(at.x + WIGGLE_PX, at.y)
      await page.waitForTimeout(S_439_MS + SHOW_ALLOWANCE_MS)
      const after = await logSince(page, moved)
      const stoppedAgain = firstMove(after, 'the task, moved')
      const hidden = after.seen.find((seen) => seen.text === '')
      expect(hidden, `${EZ_6_MOVE_HIDES} -- the description stood through the move`).toBeDefined()
      if (hidden === undefined) return
      expect(hidden.at - stoppedAgain, `${EZ_6_MOVE_HIDES} -- hidden ${(hidden.at - stoppedAgain).toFixed(0)} ms after the move`).toBeLessThan(S_124_MS)
      const again = after.seen.find((seen) => seen.text !== '' && seen.at >= hidden.at)
      expect(again, `${EZ_6_WAIT} -- nothing came back after stopping again`).toBeDefined()
      if (again === undefined) return
      expect(again.text, EZ_6_DATES).toMatch(TELLING)
      const waitedAgain = again.at - stoppedAgain
      expect(waitedAgain, `${EZ_6_FROM_THE_STOP} -- shown again ${waitedAgain.toFixed(0)} ms after the stop`).toBeGreaterThanOrEqual(S_439_MS - ONE_FRAME_MS)
      expect(waitedAgain, `${EZ_6_WAIT} -- shown again ${waitedAgain.toFixed(0)} ms after the stop`).toBeLessThanOrEqual(S_439_MS + SHOW_ALLOWANCE_MS)
    } finally {
      await stage.close()
    }
  })
})

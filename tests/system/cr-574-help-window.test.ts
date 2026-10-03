// CR-574 section 9 items 1-11 and 9a, with CR-575 item 5a, on the shipped build: the help as an ordinary window with its own language.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg } from './live-app'
import { ERP_SAMPLE, REQUIREMENTS, keyOf, openDocument, openStage, saveDocument, settle, type Stage } from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'

const FR_036_TITLE_ORDER =
  '⭐ ヘルプの題の行は、左から、題 … 凡例（`IC-102`）・ヘルプの言語の切替（`FR-038` の `IC-128`）・最小化（`IC-129`）・最大化（`IC-130`、最大化しているあいだは同じ場所に `IC-131`）・閉じる入口（`IC-52`）の順に並べ、閉じる入口を右端に置くこと（MUST）。'
const FR_036_NOTHING_ELSE = '⛔ 題の行に、ほかのものを置いてはならない（MUST NOT）'
const FR_036_TWO_REGIONS = '⭐ ヘルプを、題の行と本文の 2 つの領域に分け、上下に並べること（MUST）。'
const FR_036_BODY_SCROLLS = '本文の領域だけをスクロールさせること（MUST）'
const FR_036_TITLE_OUTSIDE_THE_SCROLL =
  '⛔ 題の行を本文のスクロールの中に置いてはならない（MUST NOT） —— 中に置いて上端に留めると、送った本文が題の行の縁に透け、送る前は題の行が最初の見出しを覆う。'
const FR_036_GAP = '⭐ 説明と割当のあいだは、`_assets/tbl-settings.md` の 表 T-206 の `S-436` を下限としてあけること（MUST）。'
const FR_036_RIGHT_END = '⭐ 割当は、その項目の行の右端（枠の内側の右の縁）へ寄せて置くこと（MUST）'
const FR_036_MAXIMISED = 'ヘルプを最大化したときに占める範囲は、閲覧環境の窓の全体とする（MUST）'
const FR_036_NOT_A_SURFACE =
  '⭐ ヘルプは `_assets/tbl-settings.md` の `S-99g` の面ではない —— ほかの面を立ててもヘルプを閉じず、ヘルプの状態も言語も変えないこと（MUST）。'
const FR_036_OTHERS_IN_FRONT = 'ほかの面はヘルプより手前に描く（`FR-152` の 表 T-337）。'
const FR_038_HELP_ONLY = '利用者がヘルプの言語を選んだとき、`GRS` は、ヘルプの中の文字だけをその言語で示すこと。'
const FR_038_HELP_LANGUAGE_NAMED = '⭐ ヘルプの言語が画面の言語と違うあいだは、ヘルプの領域にヘルプの言語を名乗らせること（MUST）'
const FR_038_READABLE_BEFORE_PRESSING = 'どちらの入口も、今の値の略号を添えて描く。'
const FR_038_SEEDED_ON_OPENING = '⭐ ヘルプを開くたびに、ヘルプの言語をそのときの画面の言語から始めること（MUST）'
const FR_038_NOT_THE_SCREEN = '⛔ ヘルプの言語を替えて画面の言語を替えてはならない（MUST NOT）。'
const FR_038_NOT_STORED = '⛔ ヘルプの言語を保存してはならない（MUST NOT） —— 文書にも、閲覧環境の保管庫にも置かない。'
const IN_4_SURFACE_THEN_HELP =
  '⭐ `Esc` では、通常か最大化のヘルプは面の段ではなく、表 T-028 の `IN-4` の「開いているウインドウ」の段に立つ'
const T_337_THE_FRONT_ONE_TAKES_THE_PRESS = '⭐ 押下は、その点で最も手前に描かれた UI パーツが受けること（MUST）。'

const CLAUSES: readonly string[] = [
  FR_036_TITLE_ORDER,
  FR_036_NOTHING_ELSE,
  FR_036_TWO_REGIONS,
  FR_036_BODY_SCROLLS,
  FR_036_TITLE_OUTSIDE_THE_SCROLL,
  FR_036_GAP,
  FR_036_RIGHT_END,
  FR_036_MAXIMISED,
  FR_036_NOT_A_SURFACE,
  FR_036_OTHERS_IN_FRONT,
  FR_038_HELP_ONLY,
  FR_038_HELP_LANGUAGE_NAMED,
  FR_038_READABLE_BEFORE_PRESSING,
  FR_038_SEEDED_ON_OPENING,
  FR_038_NOT_THE_SCREEN,
  FR_038_NOT_STORED,
  IN_4_SURFACE_THEN_HELP,
  T_337_THE_FRONT_ONE_TAKES_THE_PRESS,
]

const T_103 = specTable('T-103')
const T_109 = specTable('T-109')
const T_036 = specTable('T-036')
const T_206 = specTable('T-206')
const T_335 = specTable('T-335')
const T_336 = specTable('T-336')
const T_337 = specTable('T-337')

const cellOf = (table: typeof T_335, id: string, heading: string): string => unbroken(rowOf(table, id).by[heading] ?? '')

const WB_2_PLACE = '題の行を中身の幅に縮め、最小化する前の箱の下の縁に、右の端をそろえて置く（元の箱の右下の角）'
const WB_2_DRAWS = '本文は描かない'
const WB_4_SAME_PLACE = '最大化の入口は、`WB-3` のあいだだけ `IC-131` に替えて同じ場所に描く'
const WB_5_BACK_TO_NORMAL = '`WB-2` から `IC-129` で戻す先は、最小化の前が `WB-3` でも `WB-1` とする'
const WB_6_NOT_SAVED = '状態を文書にも閲覧環境の保管庫にも保存しない。'
const HN_1_WHEEL = '日程表に当てる'
const HN_2_ESC = 'ヘルプは閉じない'
const HN_4_OTHER_SURFACE = 'ヘルプを最小化のまま残し、その面をヘルプより手前に立てる'
const HN_5_BACK = '開き直しではない —— ヘルプの言語を変えない'

const partOf = (id: string): string => `[data-role="${bare(rowOf(T_103, id).by['確定名（英）'] ?? '')}"]`

const HELP = partOf('U-30')
const HEADER = partOf('U-31')
const PALETTE = partOf('U-26')
const ROSTER = partOf('U-49')
const EXPORT_CHOOSER = partOf('U-54')
const CANVAS = partOf('U-32')

const OPEN_HELP = rowOf(T_109, 'IC-22').id
const HELP_LANGUAGE = rowOf(T_109, 'IC-128').id
const MINIMISE = rowOf(T_109, 'IC-129').id
const MAXIMISE = rowOf(T_109, 'IC-130').id
const RESTORE = rowOf(T_109, 'IC-131').id
const CLOSE = rowOf(T_109, 'IC-52').id
const LEGEND = rowOf(T_109, 'IC-102').id
const EXPORT = rowOf(T_109, 'IC-2').id
const OPEN_ROSTER = rowOf(T_109, 'IC-62').id
const EXPORT_KEY = keyOf('SK-12')

const HELP_LAYER = rowOf(T_337, 'UZ-7').id
const SURFACE_LAYER = rowOf(T_337, 'UZ-13').id

const numberOf = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(cell).replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return value
}

// see S-436
const S_436_EM = numberOf(rowOf(T_206, 'S-436').by['既定'] ?? '')

type Language = 'ja' | 'en'
type Words = Readonly<Record<Language, string>>

const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  readonly icons: readonly { readonly rowId: string; readonly label: Words }[]
  readonly surfaces: readonly { readonly name: string; readonly heading: Words }[]
  readonly helpHeadings: readonly { readonly block: string; readonly text: Words }[]
}

const HELP_NAME = bare(rowOf(T_103, 'U-30').by['確定名（英）'] ?? '')

/** @purity pure */
function wordsOf(found: Words | undefined, what: string): Words {
  if (found === undefined) throw new Error(`the dictionary holds no words for ${what}`)
  return found
}

const LEGEND_WORDS = wordsOf(WORDS.icons.find((one) => one.rowId === LEGEND)?.label, LEGEND)
const TITLE_WORDS = wordsOf(WORDS.surfaces.find((one) => one.name === HELP_NAME)?.heading, HELP_NAME)
const FIRST_HEADING_WORDS = wordsOf(WORDS.helpHeadings[0]?.text, 'the first help heading')

// see FR-036, T-036
/** @purity pure */
function spelledOnScreen(cell: string): string {
  return cell
    .split('／')
    .map((one) => [...one.matchAll(/`([^`]+)`/g)].map((span) => span[1] ?? ''))
    .filter((keys) => keys.length > 0)
    .map((keys) => keys.join(' ＋ '))
    .join(' ／ ')
}

const KEY_SPELLINGS: readonly string[] = [...new Set(T_036.rows.map((row) => spelledOnScreen(row.by['割当'] ?? '')))]
  .filter((one) => one !== '')
  .sort((a, b) => b.length - a.length)

// WHY: the two window sizes CR-574 section 9 names for the shipped build.
const TALL = { width: 1600, height: 1000 }
const LOW = { width: 1600, height: 600 }

// WHY: a box laid out at a fractional position reads back a fraction off; less than that is not a move.
const SUBPIXEL = 0.5
const EDGE = 1.5

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

interface Gap {
  readonly row: string
  readonly gap: number
  readonly font: number
  readonly keyRight: number
  readonly innerRight: number
}

interface HelpReading {
  readonly box: Rect
  readonly title: Rect
  readonly body: Rect | null
  readonly itemsShown: number
  readonly entrances: readonly string[]
  readonly entranceRects: Readonly<Record<string, Rect>>
  readonly titleText: string
  readonly titleTextRight: number
  readonly language: Language | null
  readonly titleLang: string
  readonly bodyLang: string | null
  readonly scroll: { readonly top: number; readonly height: number; readonly client: number } | null
  readonly textOverTitle: readonly string[]
  readonly hitsOverTitle: number
  // WHY: T-337 puts the Command Palette (UZ-5) in front of the help (UZ-7), so a point of the heading
  // may rightly be under it; what FR-036 forbids is the help's own title row covering the heading.
  readonly firstHeading: { readonly rect: Rect; readonly onHeading: number; readonly underHelp: number; readonly underFront: number } | null
  readonly gaps: readonly Gap[]
}

const centreOf = (rect: Rect): Point => ({ x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 })

const holds = (rect: Rect, point: Point): boolean =>
  point.x >= rect.left && point.x < rect.right && point.y >= rect.top && point.y < rect.bottom

const said = (rect: Rect | null): string =>
  rect === null ? '(none)' : `[${rect.left.toFixed(1)}, ${rect.top.toFixed(1)}] - [${rect.right.toFixed(1)}, ${rect.bottom.toFixed(1)}]`

const sameRect = (one: Rect, other: Rect): boolean =>
  (['left', 'top', 'right', 'bottom'] as const).every((side) => Math.abs(one[side] - other[side]) <= EDGE)

const codeOf = (lang: string | null): string => (lang ?? '').slice(0, 2).toLowerCase()

const otherThan = (language: Language): Language => (language === 'ja' ? 'en' : 'ja')

const squeezed = (text: string): string => text.replace(/\s+/g, '')

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
async function openTheSample(size: { width: number; height: number }): Promise<Stage> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const stage = await openStage(browser)
  await stage.page.setViewportSize(size)
  await openDocument(stage.page, 'sample-large-erp-program.ja.xml', ERP_SAMPLE)
  return stage
}

// see T-337
/** @purity semi-pure-b */
async function frontPointOf(page: Page, selector: string): Promise<Point | null> {
  return page.evaluate((wanted: string) => {
    const shown = Array.from(document.querySelectorAll(wanted))
      .map((one) => ({ one, box: one.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && box.height > 0)
      .sort((a, b) => a.box.top - b.box.top || a.box.left - b.box.left)
    const shares = [0.5, 0.3, 0.7, 0.15, 0.85]
    for (const { one, box } of shown) {
      for (const fy of shares) {
        for (const fx of shares) {
          const x = box.left + box.width * fx
          const y = box.top + box.height * fy
          const hit = document.elementFromPoint(x, y)
          if (hit !== null && one.contains(hit)) return { x, y }
        }
      }
    }
    return null
  }, selector)
}

/** @purity non-pure */
async function press(page: Page, selector: string): Promise<void> {
  const at = await frontPointOf(page, selector)
  if (at === null) throw new Error(`${T_337_THE_FRONT_ONE_TAKES_THE_PRESS} -- no point of ${selector} is the front`)
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  await settle(page)
}

const inHelp = (icon: string): string => `${HELP} [data-icon="${icon}"]`

/** @purity semi-pure-b */
async function isShown(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((wanted: string) => {
    const found = document.querySelector(wanted)
    if (found === null) return false
    const box = found.getBoundingClientRect()
    return box.width > 0 && box.height > 0
  }, selector)
}

// see FR-036, IC-22
/** @purity non-pure */
async function openHelp(page: Page): Promise<HelpReading> {
  await press(page, `${HEADER} [data-icon="${OPEN_HELP}"]`)
  await expect.poll(() => isShown(page, HELP), { message: `${OPEN_HELP} opens ${HELP}` }).toBe(true)
  return readHelp(page)
}

// see FR-036, FR-038, T-335
/** @purity semi-pure-b */
async function readHelp(page: Page): Promise<HelpReading> {
  const read = await page.evaluate(
    (asked: { help: string; anchor: string; legend: Words; heading: Words; keys: readonly string[] }) => {
      type Box = { left: number; top: number; right: number; bottom: number }
      const rectOf = (one: Element | DOMRect): Box => {
        const box = one instanceof Element ? one.getBoundingClientRect() : one
        return { left: box.left, top: box.top, right: box.right, bottom: box.bottom }
      }
      const isShownNode = (one: Element): boolean => {
        const box = one.getBoundingClientRect()
        const seen = 'checkVisibility' in one ? (one as unknown as { checkVisibility(): boolean }).checkVisibility() : true
        return seen && box.width > 0 && box.height > 0
      }
      const clip = (one: Box, by: Box): Box | null => {
        const out = { left: Math.max(one.left, by.left), top: Math.max(one.top, by.top), right: Math.min(one.right, by.right), bottom: Math.min(one.bottom, by.bottom) }
        return out.right - out.left > 0.5 && out.bottom - out.top > 0.5 ? out : null
      }
      const squeeze = (text: string): string => text.replace(/\s+/g, '')
      const root = document.querySelector(asked.help)
      if (root === null) return { missing: `no ${asked.help} is on the screen` }
      const anchor = root.querySelector(`[data-icon="${asked.anchor}"]`)
      if (anchor === null) return { missing: `${asked.help} draws no ${asked.anchor}` }
      let title: Element = anchor
      while (title.parentElement !== null && title.parentElement !== root && title.parentElement.querySelector('[data-row]') === null) {
        title = title.parentElement
      }
      const items = Array.from(root.querySelectorAll('[data-row]')).filter(isShownNode)
      let body: Element | null = null
      for (let at = items[0]?.parentElement ?? null; at !== null && at !== root.parentElement; at = at.parentElement) {
        const overflowY = getComputedStyle(at).overflowY
        if (overflowY === 'auto' || overflowY === 'scroll') {
          body = at
          break
        }
      }
      let box: Element = title
      if (body !== null) {
        box = body
        while (box.parentElement !== null && !box.contains(title)) box = box.parentElement
      }

      const outermost = Array.from(title.querySelectorAll('[data-icon]')).filter((one) => {
        const outer = one.parentElement?.closest('[data-icon]') ?? null
        return isShownNode(one) && (outer === null || !title.contains(outer))
      })
      outermost.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)
      const entrances = outermost.map((one) => one.getAttribute('data-icon') ?? '')
      const entranceRects: Record<string, Box> = {}
      for (const one of outermost) entranceRects[one.getAttribute('data-icon') ?? ''] = rectOf(one)

      const pieces: { text: string; left: number; right: number }[] = []
      const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const parent = node.parentElement
        if (parent === null || parent.closest('svg') !== null || !isShownNode(parent)) continue
        const marked = parent.closest('[data-icon]')
        if (marked !== null && title.contains(marked)) continue
        const text = squeeze(node.textContent ?? '')
        if (text === '') continue
        const range = document.createRange()
        range.selectNodeContents(node)
        const rects = Array.from(range.getClientRects()).filter((one) => one.width > 0)
        if (rects.length === 0) continue
        pieces.push({ text, left: Math.min(...rects.map((one) => one.left)), right: Math.max(...rects.map((one) => one.right)) })
      }
      pieces.sort((a, b) => a.left - b.left)
      const titleText = pieces.map((one) => one.text).join('')
      const titleTextRight = pieces.length === 0 ? -Infinity : Math.max(...pieces.map((one) => one.right))
      const language = titleText.includes(squeeze(asked.legend.ja)) ? 'ja' : titleText.includes(squeeze(asked.legend.en)) ? 'en' : null

      const titleRect = rectOf(title)
      const view = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
      const textOverTitle: string[] = []
      let hitsOverTitle = 0
      let firstHeading: { rect: Box; onHeading: number; underHelp: number; underFront: number } | null = null
      const gaps: { row: string; gap: number; font: number; keyRight: number; innerRight: number }[] = []
      if (body !== null) {
        const bodyRect = rectOf(body)
        const texts = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
        for (let node = texts.nextNode(); node !== null; node = texts.nextNode()) {
          if ((node.textContent ?? '').trim() === '') continue
          const range = document.createRange()
          range.selectNodeContents(node)
          for (const one of Array.from(range.getClientRects())) {
            const seen = clip(rectOf(one), bodyRect)
            const drawn = seen === null ? null : clip(seen, view)
            if (drawn !== null && clip(drawn, titleRect) !== null) textOverTitle.push((node.textContent ?? '').trim().slice(0, 40))
          }
        }
        const step = 6
        for (let y = Math.max(titleRect.top, 0) + 1; y < Math.min(titleRect.bottom, view.bottom); y += step) {
          for (let x = Math.max(titleRect.left, 0) + 1; x < Math.min(titleRect.right, view.right); x += step) {
            const hit = document.elementFromPoint(x, y)
            if (hit !== null && body.contains(hit)) hitsOverTitle += 1
          }
        }
        const headingWords = [squeeze(asked.heading.ja), squeeze(asked.heading.en)]
        const headings = Array.from(body.querySelectorAll('*')).filter(
          (one) =>
            isShownNode(one) &&
            headingWords.includes(squeeze(one.textContent ?? '')) &&
            !Array.from(one.children).some((child) => headingWords.includes(squeeze(child.textContent ?? ''))),
        )
        const heading = headings[0]
        if (heading !== undefined) {
          const rect = rectOf(heading)
          const points = 9
          const counts = { onHeading: 0, underHelp: 0, underFront: 0 }
          for (let at = 0; at < points; at += 1) {
            const x = rect.left + ((at + 0.5) * (rect.right - rect.left)) / points
            const hit = document.elementFromPoint(x, (rect.top + rect.bottom) / 2)
            if (hit !== null && heading.contains(hit)) counts.onHeading += 1
            else if (hit !== null && root.contains(hit)) counts.underHelp += 1
            else counts.underFront += 1
          }
          firstHeading = { rect, ...counts }
        }
        for (const item of items) {
          const nodes: { node: Text; start: number }[] = []
          let full = ''
          const walk = document.createTreeWalker(item, NodeFilter.SHOW_TEXT)
          for (let node = walk.nextNode(); node !== null; node = walk.nextNode()) {
            if (node.parentElement?.closest('svg') != null) continue
            nodes.push({ node: node as Text, start: full.length })
            full += node.textContent ?? ''
          }
          const ended = full.trimEnd()
          const key = asked.keys.find((one) => ended.endsWith(one))
          if (key === undefined) continue
          const keyStart = ended.length - key.length
          const prefix = full.slice(0, keyStart)
          const descStart = prefix.length - prefix.trimStart().length
          const descEnd = prefix.trimEnd().length
          if (descEnd <= descStart || /[／＋+]/.test(prefix)) continue
          const at = (offset: number): { node: Text; offset: number } | null => {
            for (let index = nodes.length - 1; index >= 0; index -= 1) {
              const one = nodes[index]
              if (one !== undefined && offset >= one.start) return { node: one.node, offset: Math.min(offset - one.start, one.node.length) }
            }
            return null
          }
          const rectsOf = (from: number, to: number): DOMRect[] => {
            const start = at(from)
            const end = at(to)
            if (start === null || end === null) return []
            const range = document.createRange()
            range.setStart(start.node, start.offset)
            range.setEnd(end.node, end.offset)
            return Array.from(range.getClientRects()).filter((one) => one.width > 0)
          }
          const last = rectsOf(descStart, descEnd).pop()
          const keyRects = rectsOf(keyStart, keyStart + key.length)
          const first = keyRects[0]
          const keyEnd = keyRects[keyRects.length - 1]
          const describedBy = at(Math.max(descEnd - 1, descStart))?.node.parentElement ?? null
          if (last === undefined || first === undefined || keyEnd === undefined || describedBy === null) continue
          if (Math.abs(last.bottom - first.bottom) > 2) continue
          let frame = item.parentElement
          while (frame !== null && frame !== body && parseFloat(getComputedStyle(frame).borderRightWidth) === 0) frame = frame.parentElement
          const framed = frame === null || frame === body ? null : getComputedStyle(frame)
          const innerRight =
            frame === null || framed === null
              ? Number.NaN
              : frame.getBoundingClientRect().right - parseFloat(framed.borderRightWidth) - parseFloat(framed.paddingRight)
          gaps.push({
            row: item.getAttribute('data-row') ?? '',
            gap: first.left - last.right,
            font: parseFloat(getComputedStyle(describedBy).fontSize),
            keyRight: keyEnd.right,
            innerRight,
          })
        }
      }
      return {
        reading: {
          box: rectOf(box),
          title: titleRect,
          body: body === null ? null : rectOf(body),
          itemsShown: items.length,
          entrances,
          entranceRects,
          titleText,
          titleTextRight,
          language,
          titleLang: title.closest('[lang]')?.getAttribute('lang') ?? '',
          bodyLang: items[0]?.closest('[lang]')?.getAttribute('lang') ?? null,
          scroll: body === null ? null : { top: body.scrollTop, height: body.scrollHeight, client: body.clientHeight },
          textOverTitle,
          hitsOverTitle,
          firstHeading,
          gaps,
        },
      }
    },
    { help: HELP, anchor: HELP_LANGUAGE, legend: LEGEND_WORDS, heading: FIRST_HEADING_WORDS, keys: KEY_SPELLINGS },
  )
  if ('missing' in read) throw new Error(read.missing)
  return read.reading as HelpReading
}

/** @purity semi-pure-b */
async function textOf(page: Page, selector: string): Promise<string> {
  return page.evaluate((wanted: string) => document.querySelector(wanted)?.textContent ?? '', selector)
}

/** @purity semi-pure-b */
async function screenCode(page: Page): Promise<string> {
  return page.evaluate(() => document.documentElement.getAttribute('lang') ?? '')
}

/** @purity semi-pure-b */
async function storedValues(page: Page): Promise<string> {
  return page.evaluate(() => {
    const out: Record<string, string | null> = {}
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key !== null) out[key] = localStorage.getItem(key)
    }
    return JSON.stringify(out, Object.keys(out).sort())
  })
}

/** @purity semi-pure-b */
async function layerOf(page: Page, selector: string): Promise<string | null> {
  return page.evaluate((wanted: string) => document.querySelector(wanted)?.closest('[data-uz]')?.getAttribute('data-uz') ?? null, selector)
}

/** @purity non-pure */
async function pressEscape(page: Page): Promise<void> {
  await page.keyboard.press('Escape')
  await settle(page)
}

/** @purity non-pure */
async function wheelAt(page: Page, at: Point, times: number, deltaY: number): Promise<void> {
  await page.mouse.move(at.x, at.y)
  for (let turn = 0; turn < times; turn += 1) {
    await page.mouse.wheel(0, deltaY)
    await page.waitForTimeout(80)
  }
  await settle(page)
}

/** @purity pure */
function flatten(value: unknown, path: string, out: Map<string, string>): Map<string, string> {
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) out.set(path, JSON.stringify(value))
    for (const [key, inner] of entries) flatten(inner, `${path}/${key}`, out)
    return out
  }
  out.set(path, JSON.stringify(value))
  return out
}

/** @purity pure */
function differingPaths(one: string, other: string): readonly string[] {
  const a = flatten(JSON.parse(one), '', new Map())
  const b = flatten(JSON.parse(other), '', new Map())
  return [...new Set([...a.keys(), ...b.keys()])].filter((key) => a.get(key) !== b.get(key)).sort()
}

test('CR-574 -- FR-036, FR-038, IN-4, T-335, T-336 and T-337 still say what these cases press, word for word', () => {
  for (const clause of CLAUSES) expect(REQUIREMENTS, clause).toContain(clause)
  expect(cellOf(T_335, 'WB-2', '置き場と大きさ')).toContain(WB_2_PLACE)
  expect(cellOf(T_335, 'WB-2', '描くもの')).toContain(WB_2_DRAWS)
  expect(cellOf(T_335, 'WB-4', '状態') + cellOf(T_335, 'WB-4', '描くもの')).toContain(WB_4_SAME_PLACE)
  expect(cellOf(T_335, 'WB-5', '状態') + cellOf(T_335, 'WB-5', '描くもの')).toContain(WB_5_BACK_TO_NORMAL)
  expect(cellOf(T_335, 'WB-6', '状態') + cellOf(T_335, 'WB-6', '描くもの')).toContain(WB_6_NOT_SAVED)
  const whenMinimised = T_336.headings[2] ?? ''
  expect(cellOf(T_336, 'HN-1', whenMinimised)).toContain(HN_1_WHEEL)
  expect(cellOf(T_336, 'HN-2', whenMinimised)).toContain(HN_2_ESC)
  expect(cellOf(T_336, 'HN-4', whenMinimised)).toContain(HN_4_OTHER_SURFACE)
  expect(cellOf(T_336, 'HN-5', whenMinimised)).toContain(HN_5_BACK)
  expect([HELP_LAYER, SURFACE_LAYER]).toEqual(['UZ-7', 'UZ-13'])
  expect(S_436_EM, 'premise: S-436 reads as a number of em').toBeGreaterThan(0)
  expect(KEY_SPELLINGS.length, 'premise: table T-036 spells keys').toBeGreaterThan(0)
  expect(LEGEND_WORDS.ja, 'premise: the legend words tell the two languages apart').not.toBe(LEGEND_WORDS.en)
})

test.describe('CR-574 items 1-2 -- the title row and the body are two regions (FR-036, DFC-1004)', () => {
  test('item 1: at 1600 x 600, with the body sent to its end, no body text is drawn over the title row', async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample(LOW)
    try {
      const { page } = stage
      const opened = await openHelp(page)
      if (opened.body === null || opened.scroll === null) throw new Error(`${FR_036_BODY_SCROLLS} -- no region of ${HELP} scrolls`)
      expect(opened.scroll.height, `premise: at ${LOW.width} x ${LOW.height} the body has more than it shows`).toBeGreaterThan(opened.scroll.client)

      // STEP: send the body down with the wheel until it stops at its end
      for (let turn = 0; turn < 40; turn += 1) {
        const now = await readHelp(page)
        if (now.scroll === null || now.scroll.top + now.scroll.client >= now.scroll.height - 1) break
        await wheelAt(page, centreOf(now.body ?? now.box), 1, 400)
      }
      const sent = await readHelp(page)
      expect(sent.scroll === null ? -1 : sent.scroll.top + sent.scroll.client, 'premise: the body reached its end').toBeGreaterThanOrEqual((sent.scroll?.height ?? 0) - 1)
      expect(sent.body?.top ?? -Infinity, `${FR_036_TWO_REGIONS} body ${said(sent.body)}, title ${said(sent.title)}`).toBeGreaterThanOrEqual(sent.title.bottom - SUBPIXEL)
      expect(sent.textOverTitle, FR_036_TITLE_OUTSIDE_THE_SCROLL).toEqual([])
      expect(sent.hitsOverTitle, FR_036_TITLE_OUTSIDE_THE_SCROLL).toBe(0)
      expect(sent.entrances, `${FR_036_TITLE_ORDER} (after sending the body)`).toContain(CLOSE)
    } finally {
      await stage.close()
    }
  })

  test('item 2: at 1600 x 1000, right after opening, the first heading lies below the title row and is not covered', async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample(TALL)
    try {
      const opened = await openHelp(stage.page)
      if (opened.firstHeading === null) throw new Error(`the help shows no heading ${FIRST_HEADING_WORDS.ja} / ${FIRST_HEADING_WORDS.en}`)
      expect(opened.firstHeading.rect.top, `${FR_036_TITLE_OUTSIDE_THE_SCROLL} heading ${said(opened.firstHeading.rect)}, title ${said(opened.title)}`).toBeGreaterThanOrEqual(opened.title.bottom - SUBPIXEL)
      const { onHeading, underHelp, underFront } = opened.firstHeading
      expect(underHelp, `${FR_036_TITLE_OUTSIDE_THE_SCROLL} (heading points: ${onHeading} seen, ${underFront} under a part T-337 puts in front)`).toBe(0)
      expect(onHeading, `premise: some of the heading is not under a part in front of the help (${underFront} of 9 are)`).toBeGreaterThan(0)
    } finally {
      await stage.close()
    }
  })
})

test.describe('CR-574 item 3 -- what the title row holds, left to right (FR-036, T-335 WB-4)', () => {
  test('item 3: title, legend, IC-128, IC-129, IC-130, IC-52 and nothing else; IC-131 in the place of IC-130 while maximised', async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample(TALL)
    try {
      const { page } = stage
      const normal = await openHelp(page)
      const language = normal.language
      if (language === null) throw new Error(`${FR_036_TITLE_ORDER} -- the legend word is not in the title row: ${normal.titleText}`)
      expect(normal.entrances.filter((one) => one !== LEGEND), FR_036_TITLE_ORDER).toEqual([HELP_LANGUAGE, MINIMISE, MAXIMISE, CLOSE])
      expect(normal.entrances[normal.entrances.length - 1], FR_036_TITLE_ORDER).toBe(CLOSE)
      const legendAt = normal.entrances.indexOf(LEGEND)
      if (legendAt >= 0) expect(legendAt, FR_036_TITLE_ORDER).toBeLessThan(normal.entrances.indexOf(HELP_LANGUAGE))
      expect(normal.titleText, FR_036_NOTHING_ELSE).toBe(squeezed(TITLE_WORDS[language]) + squeezed(LEGEND_WORDS[language]))
      expect(normal.titleTextRight, FR_036_TITLE_ORDER).toBeLessThanOrEqual((normal.entranceRects[HELP_LANGUAGE]?.left ?? -Infinity) + SUBPIXEL)
      const rights = Object.values(normal.entranceRects).map((one) => one.right)
      expect(normal.entranceRects[CLOSE]?.right ?? -Infinity, FR_036_TITLE_ORDER).toBe(Math.max(...rights))

      await press(page, inHelp(MAXIMISE))
      const maximised = await readHelp(page)
      expect(maximised.entrances.filter((one) => one !== LEGEND), `${WB_4_SAME_PLACE} / ${FR_036_NOTHING_ELSE}`).toEqual([HELP_LANGUAGE, MINIMISE, RESTORE, CLOSE])
      const before = normal.entranceRects[MAXIMISE]
      const after = maximised.entranceRects[RESTORE]
      if (before === undefined || after === undefined) throw new Error(WB_4_SAME_PLACE)
      expect(after.right - after.left, WB_4_SAME_PLACE).toBeCloseTo(before.right - before.left, 0)
      expect(maximised.entranceRects[CLOSE]!.right - after.right, WB_4_SAME_PLACE).toBeCloseTo(normal.entranceRects[CLOSE]!.right - before.right, 0)
    } finally {
      await stage.close()
    }
  })
})

test.describe('CR-574 item 4, CR-622 -- the assignment stands at the right end, at least S-436 after its description (FR-036)', () => {
  test('item 4: on every one-line item with a key, the key ends at the frame inner right edge, S-436 em or more after the description', async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample(TALL)
    try {
      const opened = await openHelp(stage.page)
      expect(opened.gaps.length, 'premise: the help draws items whose description and key share a line').toBeGreaterThan(0)
      const narrow = opened.gaps.filter((one) => one.gap < S_436_EM * one.font - 1)
      expect(narrow.map((one) => `${one.row}: ${one.gap.toFixed(2)}px at ${one.font}px`), `${FR_036_GAP} (${S_436_EM} em)`).toEqual([])
      const astray = opened.gaps.filter((one) => !(Math.abs(one.keyRight - one.innerRight) <= 1))
      expect(astray.map((one) => `${one.row}: key ends ${one.keyRight.toFixed(2)}, frame inside ${one.innerRight.toFixed(2)}`), FR_036_RIGHT_END).toEqual([])
    } finally {
      await stage.close()
    }
  })
})

test.describe('CR-574 items 5-6 -- the help has a language of its own (FR-038, S-434)', () => {
  test('item 5: the help globe changes the help words only, and shows the code it changed to', async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample(TALL)
    try {
      const { page } = stage
      const opened = await openHelp(page)
      const screen = codeOf(await screenCode(page))
      expect(['ja', 'en'], 'premise: the document names ja or en').toContain(screen)
      const start = opened.language
      if (start === null) throw new Error(`the legend word is not in the title row: ${opened.titleText}`)
      expect(start, FR_038_SEEDED_ON_OPENING).toBe(screen)
      const header = await textOf(page, HEADER)
      const palette = await textOf(page, PALETTE)
      const stored = await storedValues(page)
      const globe = squeezed(await textOf(page, inHelp(HELP_LANGUAGE)))
      expect(globe, FR_038_READABLE_BEFORE_PRESSING).not.toBe('')

      await press(page, inHelp(HELP_LANGUAGE))
      const switched = await readHelp(page)
      const next = otherThan(start)
      expect(switched.language, FR_038_HELP_ONLY).toBe(next)
      expect(await textOf(page, HEADER), FR_038_NOT_THE_SCREEN).toBe(header)
      expect(await textOf(page, PALETTE), FR_038_NOT_THE_SCREEN).toBe(palette)
      expect(codeOf(await screenCode(page)), FR_038_NOT_THE_SCREEN).toBe(screen)
      const shownCode = squeezed(await textOf(page, inHelp(HELP_LANGUAGE)))
      expect(shownCode, FR_038_READABLE_BEFORE_PRESSING).not.toBe(globe)
      expect(shownCode.toLowerCase(), FR_038_READABLE_BEFORE_PRESSING).toContain(next)
      expect(codeOf(switched.titleLang), FR_038_HELP_LANGUAGE_NAMED).toBe(next)
      expect(codeOf(switched.bodyLang), FR_038_HELP_LANGUAGE_NAMED).toBe(next)
      expect(await storedValues(page), FR_038_NOT_STORED).toBe(stored)

      await press(page, inHelp(HELP_LANGUAGE))
      expect((await readHelp(page)).language, FR_038_HELP_ONLY).toBe(start)
      expect(squeezed(await textOf(page, inHelp(HELP_LANGUAGE))), FR_038_READABLE_BEFORE_PRESSING).toBe(globe)
    } finally {
      await stage.close()
    }
  })

  test('item 6: closed and opened again, the help starts from the screen language; after a reload nothing of it was kept', async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample(TALL)
    try {
      const { page } = stage
      const opened = await openHelp(page)
      const screen = codeOf(await screenCode(page))
      if (opened.language === null) throw new Error(`the legend word is not in the title row: ${opened.titleText}`)
      await press(page, inHelp(HELP_LANGUAGE))
      expect((await readHelp(page)).language, `premise: ${FR_038_HELP_ONLY}`).toBe(otherThan(opened.language))

      await press(page, inHelp(CLOSE))
      await expect.poll(() => isShown(page, HELP), { message: `${CLOSE} closes ${HELP}` }).toBe(false)
      expect((await openHelp(page)).language, FR_038_SEEDED_ON_OPENING).toBe(screen)

      await press(page, inHelp(HELP_LANGUAGE))
      expect((await readHelp(page)).language, `premise: ${FR_038_HELP_ONLY}`).toBe(otherThan(opened.language))
      await page.reload()
      await readSettledDrawnSvg(page)
      const reopened = await openHelp(page)
      expect(reopened.language, `${FR_038_NOT_STORED} / ${FR_038_SEEDED_ON_OPENING}`).toBe(codeOf(await screenCode(page)))
    } finally {
      await stage.close()
    }
  })
})

test.describe('CR-574 items 7-8 -- the minimised help (T-335 WB-2, T-336 HN-1, HN-2, HN-5)', () => {
  test('item 7: minimised, only the title row is left at WB-2; the wheel reaches the schedule; Esc does not close it', async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample(TALL)
    try {
      const { page } = stage
      const normal = await openHelp(page)
      const spot = { x: normal.box.left + (normal.box.right - normal.box.left) * 0.25, y: (normal.box.top + normal.box.bottom) / 2 }

      // STEP: control -- while the help stands at normal, the wheel does not reach the schedule
      const untouched = await readSettledDrawnSvg(page)
      await wheelAt(page, spot, 3, 400)
      expect(await readSettledDrawnSvg(page), 'control: T-023 -- a standing help keeps the wheel from the schedule').toBe(untouched)

      await press(page, inHelp(MINIMISE))
      const small = await readHelp(page)
      expect(small.itemsShown, `${WB_2_DRAWS} (${said(small.box)})`).toBe(0)
      expect(small.entrances, WB_2_DRAWS).toContain(MINIMISE)
      expect(Math.abs(small.title.right - normal.box.right), `${WB_2_PLACE}: ${said(small.title)} vs ${said(normal.box)}`).toBeLessThanOrEqual(EDGE)
      expect(Math.abs(small.title.bottom - normal.box.bottom), `${WB_2_PLACE}: ${said(small.title)} vs ${said(normal.box)}`).toBeLessThanOrEqual(EDGE)
      expect(small.title.right - small.title.left, WB_2_PLACE).toBeLessThan(normal.box.right - normal.box.left)

      expect(holds(small.title, spot), `premise: ${JSON.stringify(spot)} is off the minimised title row`).toBe(false)
      expect(await page.evaluate(({ at, canvas }: { at: Point; canvas: string }) => {
        const hit = document.elementFromPoint(at.x, at.y)
        return hit !== null && document.querySelector(canvas)?.contains(hit) === true
      }, { at: spot, canvas: CANVAS }), `${HELP} minimised leaves ${CANVAS} the front at ${JSON.stringify(spot)}`).toBe(true)
      const before = await readSettledDrawnSvg(page)
      await wheelAt(page, spot, 3, 400)
      expect(await readSettledDrawnSvg(page), HN_1_WHEEL).not.toBe(before)

      await pressEscape(page)
      const after = await readHelp(page)
      expect(after.itemsShown, HN_2_ESC).toBe(0)
      expect(sameRect(after.title, small.title), `${HN_2_ESC}: ${said(after.title)} vs ${said(small.title)}`).toBe(true)
    } finally {
      await stage.close()
    }
  })

  test('item 8: IC-22 on the minimised help brings it back to normal with the help language it had', async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample(TALL)
    try {
      const { page } = stage
      const normal = await openHelp(page)
      if (normal.language === null) throw new Error(`the legend word is not in the title row: ${normal.titleText}`)
      await press(page, inHelp(HELP_LANGUAGE))
      const chosen = otherThan(normal.language)
      await press(page, inHelp(MINIMISE))
      expect((await readHelp(page)).itemsShown, `premise: ${WB_2_DRAWS}`).toBe(0)

      await press(page, `${HEADER} [data-icon="${OPEN_HELP}"]`)
      const back = await readHelp(page)
      expect(back.itemsShown, HN_5_BACK).toBeGreaterThan(0)
      expect(sameRect(back.box, normal.box), `${HN_5_BACK}: ${said(back.box)} vs ${said(normal.box)}`).toBe(true)
      expect(back.language, HN_5_BACK).toBe(chosen)
    } finally {
      await stage.close()
    }
  })
})

test.describe('CR-574 items 9 and 9a, CR-575 item 5a -- another surface stands in front of the help (T-336 HN-4, T-337, IN-4)', () => {
  test('item 9: IC-62 on the minimised help opens the roster and leaves the help minimised', async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample(TALL)
    try {
      const { page } = stage
      const opened = await openHelp(page)
      await press(page, inHelp(MINIMISE))
      const small = await readHelp(page)
      expect(small.itemsShown, `premise: ${WB_2_DRAWS}`).toBe(0)

      await press(page, `${PALETTE} [data-icon="${OPEN_ROSTER}"]`)
      expect(await isShown(page, ROSTER), `${OPEN_ROSTER} opens ${ROSTER}`).toBe(true)
      const kept = await readHelp(page)
      expect(kept.itemsShown, `${HN_4_OTHER_SURFACE} / ${FR_036_NOT_A_SURFACE}`).toBe(0)
      expect(sameRect(kept.title, small.title), `${HN_4_OTHER_SURFACE}: ${said(kept.title)} vs ${said(small.title)}`).toBe(true)
      expect(kept.language, FR_036_NOT_A_SURFACE).toBe(opened.language)
    } finally {
      await stage.close()
    }
  })

  test('item 9a / CR-575 5a: with the help at normal, the Export Chooser opens in front of it (UZ-13 over UZ-7); Esc closes the chooser, then the help', async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample(TALL)
    try {
      const { page } = stage
      const opened = await openHelp(page)
      const exportAt = await frontPointOf(page, `${HEADER} [data-icon="${EXPORT}"]`)
      // STEP: IC-2 when a point of it is the front, else its key SK-12 (the help may cover the header, T-337)
      if (exportAt !== null) await press(page, `${HEADER} [data-icon="${EXPORT}"]`)
      else {
        await page.keyboard.press(EXPORT_KEY)
        await settle(page)
      }
      await expect.poll(() => isShown(page, EXPORT_CHOOSER), { message: `${EXPORT} opens ${EXPORT_CHOOSER}` }).toBe(true)

      const kept = await readHelp(page)
      expect(kept.itemsShown, FR_036_NOT_A_SURFACE).toBeGreaterThan(0)
      expect(sameRect(kept.box, opened.box), `${FR_036_NOT_A_SURFACE}: ${said(kept.box)} vs ${said(opened.box)}`).toBe(true)
      expect(kept.language, FR_036_NOT_A_SURFACE).toBe(opened.language)
      expect(await layerOf(page, EXPORT_CHOOSER), FR_036_OTHERS_IN_FRONT).toBe(SURFACE_LAYER)
      expect(await layerOf(page, HELP), FR_036_OTHERS_IN_FRONT).toBe(HELP_LAYER)
      const chooser = await page.evaluate((wanted: string) => {
        const box = document.querySelector(wanted)?.getBoundingClientRect()
        return box === undefined ? null : { left: box.left, top: box.top, right: box.right, bottom: box.bottom }
      }, EXPORT_CHOOSER)
      if (chooser === null) throw new Error(`no ${EXPORT_CHOOSER} is on the screen`)
      const middle = centreOf(chooser)
      expect(holds(kept.box, middle), `premise: ${EXPORT_CHOOSER} ${said(chooser)} lies over ${HELP} ${said(kept.box)}`).toBe(true)
      expect(await page.evaluate(({ at, wanted }: { at: Point; wanted: string }) => {
        const hit = document.elementFromPoint(at.x, at.y)
        return hit !== null && document.querySelector(wanted)?.contains(hit) === true
      }, { at: middle, wanted: EXPORT_CHOOSER }), `${FR_036_OTHERS_IN_FRONT} / ${T_337_THE_FRONT_ONE_TAKES_THE_PRESS}`).toBe(true)

      await pressEscape(page)
      expect(await isShown(page, EXPORT_CHOOSER), IN_4_SURFACE_THEN_HELP).toBe(false)
      expect((await readHelp(page)).itemsShown, IN_4_SURFACE_THEN_HELP).toBeGreaterThan(0)
      await pressEscape(page)
      expect(await isShown(page, HELP), IN_4_SURFACE_THEN_HELP).toBe(false)
    } finally {
      await stage.close()
    }
  })
})

test.describe('CR-574 item 10 -- maximise and restore (T-335 WB-3, WB-4, WB-5)', () => {
  test('item 10: maximised the help fills the browser window; IC-131 restores it; maximised then minimised, IC-129 brings it to normal', async () => {
    test.setTimeout(240_000)
    const stage = await openTheSample(TALL)
    try {
      const { page } = stage
      const normal = await openHelp(page)
      const whole = await page.evaluate(() => ({ left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }))

      await press(page, inHelp(MAXIMISE))
      const maximised = await readHelp(page)
      expect(sameRect(maximised.box, whole), `${FR_036_MAXIMISED}: ${said(maximised.box)} vs ${said(whole)}`).toBe(true)
      expect(maximised.itemsShown, 'WB-3 draws the title row and the body').toBeGreaterThan(0)

      await press(page, inHelp(RESTORE))
      const restored = await readHelp(page)
      expect(sameRect(restored.box, normal.box), `${WB_4_SAME_PLACE}: ${said(restored.box)} vs ${said(normal.box)}`).toBe(true)
      expect(restored.entrances, WB_4_SAME_PLACE).toContain(MAXIMISE)

      await press(page, inHelp(MAXIMISE))
      await press(page, inHelp(MINIMISE))
      expect((await readHelp(page)).itemsShown, `premise: ${WB_2_DRAWS}`).toBe(0)
      await press(page, inHelp(MINIMISE))
      const back = await readHelp(page)
      expect(sameRect(back.box, normal.box), `${WB_5_BACK_TO_NORMAL}: ${said(back.box)} vs ${said(normal.box)}`).toBe(true)
      expect(back.entrances, WB_5_BACK_TO_NORMAL).toContain(MAXIMISE)
      expect(back.entrances, WB_5_BACK_TO_NORMAL).not.toContain(RESTORE)
    } finally {
      await stage.close()
    }
  })
})

test.describe('CR-574 item 11 -- nothing of the help reaches the saved document (T-335 WB-6, FR-038)', () => {
  test('item 11: saved with the help maximised or minimised in its other language, the GRS JSON differs only where two plain saves differ', async () => {
    test.setTimeout(300_000)
    const stage = await openTheSample(TALL)
    try {
      const { page } = stage
      const plain = await saveDocument(page)
      await openHelp(page)
      await press(page, inHelp(HELP_LANGUAGE))
      await press(page, inHelp(MAXIMISE))
      const whileMaximised = await saveDocument(page)
      await press(page, inHelp(MINIMISE))
      const whileMinimised = await saveDocument(page)
      await press(page, inHelp(CLOSE))
      await expect.poll(() => isShown(page, HELP), { message: `${CLOSE} closes ${HELP}` }).toBe(false)
      const plainAgain = await saveDocument(page)

      // WHY: two saves with the help closed are the control -- a path that differs between them (a save time) is no finding.
      const control = new Set(differingPaths(plain, plainAgain))
      expect(differingPaths(plain, whileMaximised).filter((one) => !control.has(one)), `${WB_6_NOT_SAVED} / ${FR_038_NOT_STORED}`).toEqual([])
      expect(differingPaths(plain, whileMinimised).filter((one) => !control.has(one)), `${WB_6_NOT_SAVED} / ${FR_038_NOT_STORED}`).toEqual([])
    } finally {
      await stage.close()
    }
  })
})

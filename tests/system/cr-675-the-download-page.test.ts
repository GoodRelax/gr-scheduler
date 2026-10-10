// CR-675 spec-only tests: the download page of S-350 (docs/download/index.html), read as a black box against design-mcp-relay.md section 6.

import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { type AddressInfo } from 'node:net'
import { basename, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { expect, test, type Browser, type Page } from '@playwright/test'
import { unbroken } from '../contract/spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const DESIGN = unbroken(readFileSync(join(SPEC, '_assets', 'design-mcp-relay.md'), 'utf8'))
const SETTINGS = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-settings.md'), 'utf8'))

const DESIGN_SELF_CONTAINED = '頁は外の資源を読まない —— 頁の中の書式とスクリプトは、頁の Content Security Policy に SHA-256 を書いたものだけが動く。'
const DESIGN_TOP_BUTTON = '最上部の大きなボタン —— 押すと `GRS.html` を落とす。'
const DESIGN_NOTHING_ON_OPEN = '⛔ 頁を開いただけでは何も落とさない（理由は `S-350` の注）。'
const DESIGN_STEPS =
  'AI 連携を使い始める手順 —— 束を落とす・AI のアプリに入れる・入って有効であることを確かめる・AI に開く所を尋ねる・その所を開く・文書を開く・`IC-20` を押す・AI に頼む・保存する、の順である。'
const DESIGN_WHOLE_ADDRESS = '`#` の後ろの鍵まで丸ごと開く。'
const DESIGN_ADDRESS_CHANGES = '開く所は、取次を起動するたびに変わること（4 節の 1）。'
const DESIGN_CAN = 'AI にできること・できないこと'
const DESIGN_LOCAL = 'PC の外へ出ないもの（7 節）と、AI が読んだものは会話として AI のサービスへ渡ること。'
const DESIGN_TURN_OFF = '止め方 —— `IC-20` をもう一度押す。'
const DESIGN_TAKEN_BACK = '⚠️ 既に読まれたものは取り戻せない（`FR-065`）。'
const DESIGN_TROUBLE = 'うまくいかないときの手当て。'
const DESIGN_ADVANCED =
  '進んだ人向けに、コマンドで MCP の相手を起動する客で `grs-relay.mjs` を動かす形と、`grs-relay.mcpb.sha256` で落としたものを確かめる手。'
const DESIGN_SWITCH = '右上に `English` と `日本語` の 2 つ並びのボタンを置いて、選んでいる方を塗りつぶす。'
const DESIGN_DEFAULT = '既定は英語とする —— 頁は、閲覧者がどの言語を読むかを知る前に開かれる。'
const DESIGN_REMEMBERED = '選んだ言語は閲覧者のブラウザにだけ覚えさせる'
const DESIGN_LISTEN = '待ち受けるのは `127.0.0.1` だけであり'
const SETTINGS_NOTHING_ON_OPEN = '⛔ 頁を開いただけでは何も落とさせない'
const SETTINGS_BUNDLE_LINK = '⭐ この頁には、AI のアプリが入れる MCP の束（`grs-relay.mcpb`、`FR-150`）もリンクで置く（利用者の指示）。'

const backticked = (clause: string): string[] => [...clause.matchAll(/`([^`]+)`/g)].map((found) => found[1] ?? '')
const [GRS_HTML = ''] = backticked(DESIGN_TOP_BUTTON)
const [BUNDLE = ''] = backticked(SETTINGS_BUNDLE_LINK)
const [RELAY_JS = '', BUNDLE_SHA = ''] = backticked(DESIGN_ADVANCED)
const [SWITCH_EN = '', SWITCH_JA = ''] = backticked(DESIGN_SWITCH)
const [LOOPBACK = ''] = backticked(DESIGN_LISTEN)
const [KEY_MARK = ''] = backticked(DESIGN_WHOLE_ADDRESS)

type Lang = 'en' | 'ja'
const LANGS: readonly Lang[] = ['en', 'ja']
const SWITCH_NAME: Record<Lang, string> = { en: SWITCH_EN, ja: SWITCH_JA }

// WHY: a break test points every case at a damaged scratch copy through this variable; unset, the real page is read.
const PAGE_FILE = resolve(process.cwd(), process.env['GRS_DOWNLOAD_PAGE'] ?? join('docs', 'download', 'index.html'))
const PAGE_URL = pathToFileURL(PAGE_FILE).href
const SOURCE = readFileSync(PAGE_FILE, 'utf8')
const QUIET_MS = 2_000
const WIDE = { width: 1280, height: 800 }
const NARROW = { width: 375, height: 812 }

type Labeled = { rowId: string; label?: Record<Lang, string> }
type Glyph = { rowId: string; elements: { tag: string; attributes: { name: string; value: string }[] }[] }
const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as { icons: Labeled[] }
const GLYPHS = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'dom-screen-surface', 'icon-glyphs.json'), 'utf8'),
) as { viewBox: string; glyphs: Glyph[] }

// see IC-1, IC-2, IC-20
function labelOf(rowId: string, lang: Lang): string {
  const found = WORDS.icons.find((one) => one.rowId === rowId && one.label !== undefined)?.label?.[lang]
  if (found === undefined) throw new Error(`display-words.json holds no ${lang} label for ${rowId}`)
  return found
}

const numbersNormalized = (text: string): string => text.replace(/-?\d*\.?\d+/g, (number) => String(Number(number)))

// see F-019
function glyphOf(rowId: string): string {
  const glyph = GLYPHS.glyphs.find((one) => one.rowId === rowId)
  if (glyph === undefined) throw new Error(`icon-glyphs.json holds no glyph for ${rowId}`)
  const parts = glyph.elements.map((element) => {
    const geometry = element.attributes.filter((one) => one.name !== 'style').map((one) => `${one.name}=${one.value}`)
    return `${element.tag}(${geometry.sort().join(',')})`
  })
  return numbersNormalized(`${GLYPHS.viewBox}|${parts.sort().join(';')}`)
}

const beside = (name: string): string => new URL(name, PAGE_URL).href
const CJK = /[぀-ヿ㐀-鿿＀-￯]/g

type Link = { href: string; download: string | null; top: number; height: number }
type Shown = { text: string; headings: string[]; steps: string[]; links: Link[]; first: Link | null; firstAt: number }

// WHY: everything is read from what is visible, so a hidden language block can neither pass nor fail a case.
const readShown = (page: Page): Promise<Shown> =>
  page.evaluate((switchNames: string[]) => {
    for (const details of document.querySelectorAll('details')) details.open = true
    const all = (selector: string): Element[] => [...document.querySelectorAll(selector)].filter((one) => one.checkVisibility())
    const linkOf = (one: Element): Link => {
      const box = one.getBoundingClientRect()
      return { href: (one as HTMLAnchorElement).href ?? '', download: one.getAttribute('download'), top: box.top + scrollY, height: box.height }
    }
    const lists = all('ol').map((ol) => [...ol.children].filter((li) => li.tagName === 'LI' && li.checkVisibility()))
    const steps = lists.reduce((longest, one) => (one.length > longest.length ? one : longest), [] as Element[])
    const controls = all('a[href], button')
    const firstAt = controls.findIndex((one) => !switchNames.includes((one.textContent ?? '').trim()))
    let text = document.body.innerText
    for (const name of switchNames) text = text.replace(name, '')
    return {
      text,
      headings: all('h1, h2, h3, h4, summary').map((one) => (one as HTMLElement).innerText),
      steps: steps.map((li) => (li as HTMLElement).innerText),
      links: all('a[href]').map(linkOf),
      first: firstAt < 0 ? null : linkOf(controls[firstAt] as Element),
      firstAt,
    }
  }, LANGS.map((lang) => SWITCH_NAME[lang]))

const readGlyphs = (page: Page): Promise<string[]> =>
  page.evaluate(() =>
    [...document.querySelectorAll('svg')].filter((svg) => svg.checkVisibility()).map((svg) => {
      const used = svg.querySelector('use')?.getAttribute('href') ?? ''
      const root = used.startsWith('#') ? (document.getElementById(used.slice(1)) ?? svg) : svg
      const parts = [...root.querySelectorAll('path, rect, circle, ellipse, line, polyline, polygon')].map((shape) => {
        const geometry = [...shape.attributes].filter((one) => !/^(style|fill|stroke.*|class)$/.test(one.name))
        return `${shape.tagName.toLowerCase()}(${geometry.map((one) => `${one.name}=${one.value}`).sort().join(',')})`
      })
      return `${root.getAttribute('viewBox') ?? ''}|${parts.sort().join(';')}`
    }),
  )

const switchOf = (page: Page, lang: Lang) => page.getByRole('button', { name: SWITCH_NAME[lang], exact: true })

async function openIn(page: Page, lang: Lang): Promise<void> {
  await page.goto(PAGE_URL)
  if (lang !== 'en') await switchOf(page, lang).click()
}

async function expectShown(page: Page, lang: Lang): Promise<void> {
  const { text } = await readShown(page)
  const other: Lang = lang === 'en' ? 'ja' : 'en'
  expect(text).toContain(labelOf('IC-2', lang))
  expect(text).not.toContain(labelOf('IC-2', other))
  if (lang === 'en') expect(text.match(CJK) ?? []).toEqual([])
  for (const shown of LANGS) {
    const pressed = await switchOf(page, shown).evaluate((one) =>
      one.getAttribute('aria-pressed') ?? one.getAttribute('aria-current') ?? one.getAttribute('aria-selected'))
    expect(pressed, `the ${shown} switch marks whether it is chosen`).toBe(String(shown === lang))
  }
  const fills = await Promise.all(LANGS.map((one) => switchOf(page, one).evaluate((el) => getComputedStyle(el).backgroundColor)))
  expect(fills[0], 'the chosen switch is filled, the other is not').not.toBe(fills[1])
}

async function downloadsWithin(page: Page, act: () => Promise<unknown>): Promise<string | null> {
  const arriving = page.waitForEvent('download', { timeout: QUIET_MS }).then((one) => one.suggestedFilename(), () => null)
  await act()
  return arriving
}

// WHY: Chromium ignores the download attribute on file://, so the page and stand-ins for the files the build
// places beside it are served from a gitignored scratch folder over loopback HTTP, one origin as when published.
async function servedCopy(): Promise<{ url: string; close: () => void }> {
  const root = join(process.cwd(), 'scratch')
  mkdirSync(root, { recursive: true })
  const folder = mkdtempSync(join(root, 'cr-675-'))
  copyFileSync(PAGE_FILE, join(folder, 'index.html'))
  for (const name of [GRS_HTML, BUNDLE, RELAY_JS, BUNDLE_SHA]) writeFileSync(join(folder, name), `stand-in for ${name}
`)
  const server = createServer((asked, answer) => {
    const name = basename(decodeURIComponent(new URL(asked.url ?? '/', 'http://x').pathname)) || 'index.html'
    try {
      const body = readFileSync(join(folder, name))
      answer.writeHead(200, { 'content-type': name.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' })
      answer.end(body)
    } catch {
      answer.writeHead(404).end()
    }
  })
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  const close = (): void => {
    server.close()
    rmSync(folder, { recursive: true, force: true })
  }
  return { url: `http://127.0.0.1:${String((server.address() as AddressInfo).port)}/index.html`, close }
}

test('design 6 / S-350: the clauses these cases read still stand in the specification', () => {
  const design = [DESIGN_SELF_CONTAINED, DESIGN_TOP_BUTTON, DESIGN_NOTHING_ON_OPEN, DESIGN_STEPS, DESIGN_WHOLE_ADDRESS,
    DESIGN_ADDRESS_CHANGES, DESIGN_CAN, DESIGN_LOCAL, DESIGN_TURN_OFF, DESIGN_TAKEN_BACK, DESIGN_TROUBLE, DESIGN_ADVANCED,
    DESIGN_SWITCH, DESIGN_DEFAULT, DESIGN_REMEMBERED, DESIGN_LISTEN]
  for (const clause of design) expect(DESIGN).toContain(clause)
  for (const clause of [SETTINGS_NOTHING_ON_OPEN, SETTINGS_BUNDLE_LINK]) expect(SETTINGS).toContain(clause)
})

test('design 6 / S-350: opening the page, in either language, downloads nothing', async ({ page }) => {
  const served = await servedCopy()
  try {
    expect(await downloadsWithin(page, () => page.goto(served.url))).toBeNull()
    await switchOf(page, 'ja').click()
    expect(await downloadsWithin(page, () => page.reload())).toBeNull()
  } finally {
    served.close()
  }
})

test('design 6: the top button saves GRS.html and the bundle link saves grs-relay.mcpb', async ({ page }) => {
  const served = await servedCopy()
  try {
    await page.goto(served.url)
    const { firstAt, links } = await readShown(page)
    const controls = page.locator('a[href]:visible, button:visible')
    expect(await downloadsWithin(page, () => controls.nth(firstAt).click())).toBe(GRS_HTML)
    const bundleAt = links.findIndex((one) => one.href.endsWith(`/${BUNDLE}`))
    expect(bundleAt, 'a visible link to the bundle').toBeGreaterThanOrEqual(0)
    expect(await downloadsWithin(page, () => page.locator('a[href]:visible').nth(bundleAt).click())).toBe(BUNDLE)
  } finally {
    served.close()
  }
})

for (const lang of LANGS) {
  test(`design 6 / S-350: in ${lang}, the first control is the large GRS.html button above the fold, and every file sits beside the page`, async ({ page }) => {
    await page.setViewportSize(WIDE)
    await openIn(page, lang)
    const { first, links } = await readShown(page)
    expect(first?.href).toBe(beside(GRS_HTML))
    expect(first?.download).toBe(GRS_HTML)
    expect(first?.top ?? Infinity).toBeLessThan(WIDE.height)
    for (const name of [BUNDLE, RELAY_JS, BUNDLE_SHA]) {
      const link = links.find((one) => one.href === beside(name))
      expect(link, `a visible link to ${name}`).toBeDefined()
      expect([null, '', name]).toContain(link?.download ?? null)
    }
    const ordinary = links.find((one) => one.href === beside(RELAY_JS))
    expect(first?.height ?? 0, 'the top button is larger than an ordinary link').toBeGreaterThan(ordinary?.height ?? Infinity)
  })
}

test('design 6: English is shown first with nothing stored, even for a Japanese browser', async ({ browser }) => {
  for (const locale of ['en-US', 'ja-JP']) {
    const context = await browser.newContext({ locale })
    const page = await context.newPage()
    await page.goto(PAGE_URL)
    await expectShown(page, 'en')
    await context.close()
  }
})

test('design 6: the two switches stand side by side at the top right, English first', async ({ page }) => {
  for (const size of [WIDE, NARROW]) {
    await page.setViewportSize(size)
    await page.goto(PAGE_URL)
    const [en, ja] = await Promise.all(LANGS.map((lang) => switchOf(page, lang).boundingBox()))
    const { first } = await readShown(page)
    if (!en || !ja) throw new Error('a language switch is not drawn')
    expect(Math.abs(en.y + en.height / 2 - (ja.y + ja.height / 2))).toBeLessThan(Math.min(en.height, ja.height) / 2)
    expect(en.x + en.width).toBeLessThanOrEqual(ja.x + 1)
    expect(en.x).toBeGreaterThan(size.width / 2)
    expect(ja.x + ja.width).toBeGreaterThan(size.width * 0.9)
    expect(Math.max(en.y + en.height, ja.y + ja.height)).toBeLessThanOrEqual(first?.top ?? 0)
  }
})

async function chooseAndReload(browser: Browser, lang: Lang): Promise<void> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await openIn(page, lang)
  await expectShown(page, lang)
  await page.reload()
  await expectShown(page, lang)
  const again = await context.newPage()
  await again.goto(PAGE_URL)
  await expectShown(again, lang)
  await context.close()
}

test('design 6: a chosen language survives a reload in the same browser; a fresh browser starts in English', async ({ browser }) => {
  await chooseAndReload(browser, 'ja')
  await chooseAndReload(browser, 'en')
  const fresh = await browser.newContext()
  const page = await fresh.newPage()
  await page.goto(PAGE_URL)
  await expectShown(page, 'en')
  await fresh.close()
})

test('design 6: pressing a switch shows that language and hides the other', async ({ page }) => {
  await page.goto(PAGE_URL)
  await switchOf(page, 'ja').click()
  await expectShown(page, 'ja')
  await switchOf(page, 'en').click()
  await expectShown(page, 'en')
})

type Remark = { name: string; within: 'text' | 'headings' | 'steps'; pattern: Record<Lang, RegExp> }

const REMARKS: readonly Remark[] = [
  { name: 'the whole address, key after # included, is opened', within: 'steps', pattern: { en: /#[^\n]*\b(?:whole|entire)\b|\b(?:whole|entire)\b[^\n]*#/i, ja: /#[^\n]*(?:まるごと|丸ごと|すべて)|(?:まるごと|丸ごと|すべて)[^\n]*#/ } },
  { name: 'the address changes at each start', within: 'text', pattern: { en: /each time[^.\n]*start[^.\n]*address[^.\n]*chang|address[^.\n]*chang[^.\n]*each/i, ja: /起動[^。\n]*たびに[^。\n]*変わ/ } },
  { name: 'what the AI can do', within: 'headings', pattern: { en: /\bcan\b(?!not)/i, ja: /できること/ } },
  { name: 'what the AI cannot do', within: 'headings', pattern: { en: /\bcannot\b|\bcan't\b|\bcan not\b/i, ja: /できないこと/ } },
  { name: 'what stays on the PC', within: 'headings', pattern: { en: /\bstays?\b[^\n]*\bPC\b|\blocal\b/i, ja: /PC の外へ出ない|外へ出ない/ } },
  { name: 'what the AI reads goes to the AI service', within: 'text', pattern: { en: /\bAI service\b/i, ja: /AI のサービス/ } },
  { name: 'turning it off is pressing Agent API again', within: 'text', pattern: { en: /Agent API[^.\n]*\bagain\b/, ja: /Agent API[^。\n]*もう一度|もう一度[^。\n]*Agent API/ } },
  { name: 'what was read cannot be taken back', within: 'text', pattern: { en: /already read[^.\n]*(?:cannot|can't|can not)/i, ja: /取り戻せ(?:ない|ません)/ } },
  { name: 'troubleshooting', within: 'headings', pattern: { en: /not work|troubleshoot|problem/i, ja: /うまくいかない/ } },
]

for (const lang of LANGS) {
  test(`design 6: the ${lang} block holds every item section 6 lists`, async ({ page }) => {
    await openIn(page, lang)
    const shown = await readShown(page)
    const places = { text: [shown.text], headings: shown.headings, steps: shown.steps }
    for (const remark of REMARKS) {
      expect(places[remark.within].some((one) => remark.pattern[lang].test(one)), `${lang}: ${remark.name}`).toBe(true)
    }
    for (const rowId of ['IC-1', 'IC-2', 'IC-20']) expect(shown.text, `${lang}: the ${rowId} label`).toContain(labelOf(rowId, lang))
    if (lang === 'ja') expect((shown.text.match(CJK) ?? []).length).toBeGreaterThan(shown.text.length / 4)
  })

  test(`design 6: the ${lang} steps run in the order section 6 lists`, async ({ page }) => {
    await openIn(page, lang)
    const { steps } = await readShown(page)
    const after = (from: number, needle: string): number => steps.findIndex((one, at) => at > from && one.includes(needle))
    const bundle = after(-1, BUNDLE)
    const asking = after(bundle, LOOPBACK)
    const lastKey = steps.reduce((last, one, at) => (one.includes(KEY_MARK) ? at : last), -1)
    const opening = after(Math.max(asking, lastKey), labelOf('IC-1', lang))
    const enabling = after(opening, labelOf('IC-20', lang))
    const saving = after(enabling, labelOf('IC-2', lang))
    expect(steps.length, 'section 6 names nine steps').toBeGreaterThanOrEqual(9)
    expect([bundle, asking, opening, enabling, saving].every((one) => one >= 0), JSON.stringify(steps)).toBe(true)
  })

  test(`F-019: the ${lang} block draws IC-1, IC-2 and IC-20 with their own glyphs`, async ({ page }) => {
    await openIn(page, lang)
    const drawn = (await readGlyphs(page)).map(numbersNormalized)
    for (const rowId of ['IC-1', 'IC-2', 'IC-20']) expect(drawn, rowId).toContain(glyphOf(rowId))
  })
}

function cspOf(html: string): string {
  const meta = /<meta\b[^>]*http-equiv\s*=\s*["']?Content-Security-Policy["']?[^>]*>/i.exec(html)?.[0]
  if (meta === undefined) throw new Error('the download page has no Content-Security-Policy meta')
  const content = /\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i.exec(meta)
  return content?.[1] ?? content?.[2] ?? ''
}

function directive(csp: string, name: string): readonly string[] | undefined {
  for (const part of csp.split(';')) {
    const tokens = part.trim().split(/\s+/)
    if (tokens[0]?.toLowerCase() === name) return tokens.slice(1)
  }
  return undefined
}

// WHY: the HTML parser turns CR LF into LF before the browser hashes an inline block, so the hash is taken the same way.
const sha256 = (body: string): string => `'sha256-${createHash('sha256').update(body.replace(/\r\n?/g, '\n'), 'utf8').digest('base64')}'`

test('design 6: every inline style and script runs by its SHA-256 in the page CSP, which names no outside source', () => {
  const csp = cspOf(SOURCE)
  expect(SOURCE.search(/<meta\b[^>]*Content-Security-Policy/i)).toBeLessThan(SOURCE.search(/<(?:style|script)\b/i))
  expect(SOURCE).not.toMatch(/<script\b[^>]*\bsrc\s*=/i)
  expect(directive(csp, 'default-src')).toEqual(["'none'"])
  for (const [tag, name] of [['style', 'style-src'], ['script', 'script-src']] as const) {
    const allowed = directive(csp, name) ?? []
    const bodies = [...SOURCE.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'gi'))].map((found) => found[1] ?? '')
    for (const body of bodies) expect(allowed, `${tag} block hashed in ${name}`).toContain(sha256(body))
  }
  const sources = csp.split(';').flatMap((part) => part.trim().split(/\s+/).slice(1))
  expect(sources.filter((one) => !one.startsWith("'")), 'only quoted keywords and hashes').toEqual([])
})

test('design 6: in both languages the page loads nothing from outside, logs no error and breaks no CSP rule', async ({ page }) => {
  const requests: string[] = []
  const errors: string[] = []
  page.on('request', (asked) => requests.push(asked.url()))
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    const held = window as unknown as { violations: string[] }
    held.violations = []
    document.addEventListener('securitypolicyviolation', (event) => held.violations.push(`${event.violatedDirective} ${event.blockedURI}`))
  })
  await page.goto(PAGE_URL)
  await switchOf(page, 'ja').click()
  await readShown(page)
  await switchOf(page, 'en').click()
  await readShown(page)
  const violations = await page.evaluate(() => (window as unknown as { violations: string[] }).violations)
  expect(requests.filter((one) => one.split('#')[0] !== PAGE_URL && !one.startsWith('data:'))).toEqual([])
  expect(errors).toEqual([])
  expect(violations).toEqual([])
})

test('design 6: at 375px wide neither language scrolls sideways', async ({ page }) => {
  await page.setViewportSize(NARROW)
  for (const lang of LANGS) {
    await openIn(page, lang)
    await readShown(page)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, lang).toBeLessThanOrEqual(0)
  }
})

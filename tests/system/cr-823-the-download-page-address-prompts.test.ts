// CR-823 spec-only tests: the two address prompts and the restart advice of the S-350 download page, against design-mcp-relay.md section 6.

import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { type AddressInfo } from 'node:net'
import { join, resolve } from 'node:path'

import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { unbroken } from '../contract/spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const DESIGN = unbroken(readFileSync(join(SPEC, '_assets', 'design-mcp-relay.md'), 'utf8'))
const MEMBERS = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-agent-api-members.md'), 'utf8'))

const DESIGN_STEPS =
  'AI 連携を使い始める手順 —— 束を落とす・AI のアプリに入れる・入って有効であることを確かめる・AI に開く所を尋ねる・その所を開く・文書を開く・`IC-20` を押す・AI に頼む・保存する、の順である。'
const DESIGN_RESTART =
  '頼み文の後に、AI のアプリを終了して起動し直す道を書く —— 窓を閉じるだけでは終わらないことと、終わったことを OS の道具（Windows のタスクマネージャー）で確かめる道。'
const DESIGN_NOT_A_STEP = '起動し直すことは手順の 1 段にしない'
const DESIGN_ASK_TABS =
  'AI に開く所を尋ねる段は、デスクトップのアプリの Chat タブと Code タブのどちらでもよいと書き、開く所はタブごとに別であり、AI と作業するタブで尋ねた所を開くと書く'
const DESIGN_ASK_NAMES = '尋ねる文は、呼ぶ道具の名（`agentApiVersion`、`tbl-agent-api-members.md` の 表 T-107）と、答えの欄の名（`pageUrl`、5 節）を言う'
const DESIGN_COPY = 'AI へ送る文には、押すと文を丸ごと写すボタンを添える。'
const DESIGN_TROUBLE = 'うまくいかないときの手当て。'
const DESIGN_TROUBLE_FIRST = '先頭に、AI が所を答えないときに AI へ送る頼み文を置き、写すボタンを添える。'
const DESIGN_TROUBLE_CLUE = '所が `pageNotConnected` の `pageUrl` にあること、Code タブでは道具を名で検索すること'
const DESIGN_TROUBLE_NO_GUESS = '所を推し量って作らない'
const DESIGN_REASON = '理由の区分は `pageNotConnected` とし、開く URL を添える'
const DESIGN_LISTEN = '待ち受けるのは `127.0.0.1` だけであり'
const DESIGN_SWITCH = '右上に `English` と `日本語` の 2 つ並びのボタンを置いて、選んでいる方を塗りつぶす。'
const DESIGN_SCREEN_WORDS = '頁は 1 つの AI のアプリを名指し、その作り手のいまの画面の語（拡張を入れる設定の道筋）で手順を書く。'
const MEMBERS_VERSION = '| AM-1 | 版 | `agentApiVersion` |'

const backticked = (clause: string): string[] => [...clause.matchAll(/`([^`]+)`/g)].map((found) => found[1] ?? '')
const [AGENT_API_VERSION = '', , PAGE_URL_FIELD = ''] = backticked(DESIGN_ASK_NAMES)
const [NOT_CONNECTED = ''] = backticked(DESIGN_TROUBLE_CLUE)
const [SWITCH_EN = '', SWITCH_JA = ''] = backticked(DESIGN_SWITCH)
const [CHAT = '', CODE = ''] = /(\S+) タブと (\S+) タブ/.exec(DESIGN_ASK_TABS)?.slice(1) ?? []

type Lang = 'en' | 'ja'
const LANGS: readonly Lang[] = ['en', 'ja']
const SWITCH_NAME: Record<Lang, string> = { en: SWITCH_EN, ja: SWITCH_JA }
// WHY: the English name is the one Windows shows in English; the Japanese one is read from the clause.
const TASK_MANAGER: Record<Lang, string> = { en: 'Task Manager', ja: /（Windows の([^）]+)）/.exec(DESIGN_RESTART)?.[1] ?? '' }

const WINDOW_NOT_ENOUGH: Record<Lang, RegExp[]> = {
  en: [/\bwindows?\b/i, /\b(?:quit|exit)\b/i],
  ja: [/窓|ウィンドウ/, /終了|終わ/],
}
// WHY: the page writes the app maker's own screen words (DESIGN_SCREEN_WORDS), so Chat may read chat or its Japanese word,
// and the per-tab difference is matched by its meaning rather than by the word tab.
const TAB_NAMES: Record<Lang, RegExp[]> = {
  en: [new RegExp(`\\b${CHAT}\\b`, 'i'), new RegExp(`\\b${CODE}\\b`)],
  ja: [new RegExp(`${CHAT}|チャット`, 'i'), new RegExp(CODE)],
}
const DIFFERS = String.raw`(?:differ|differs|different|separate|its own|their own|each)`
const PER_TAB: Record<Lang, RegExp> = {
  en: new RegExp(String.raw`\baddress(?:es)?\b[^.\n]*\b${DIFFERS}\b|\b${DIFFERS}\b[^.\n]*\baddress(?:es)?\b`, 'i'),
  ja: /(?:アドレス|所)[^。\n]*(?:別|違|異|ごと)|(?:別|違|異|ごと)[^。\n]*(?:アドレス|所)/,
}
const NO_GUESS: Record<Lang, RegExp> = {
  en: /\b(?:do not|don't|never|not)\b[^.\n]*\b(?:make up|made up|invent|guess|fabricate|construct)/i,
  ja: /推し量|推測|でっち上げ|作ら(?:ない|ず)/,
}
const DESIGN_OVERWRITE =
  '`Confirm before overwrite` が何をするか —— 保存先に同じ名のファイルがあるとき、オンなら取次がいったん断って AI が人に尋ね、許されたときだけ置き換え、オフなら尋ねずに置き換えること、どちらでも置き換える前のファイルが同じフォルダに名＋`.bak` で 1 つだけ残ること'
const [CONFIRM_OVERWRITE = '', BAK = ''] = backticked(DESIGN_OVERWRITE)
const OVERWRITE_TERMS: Record<Lang, (string | RegExp)[]> = {
  en: [CONFIRM_OVERWRITE, BAK, /\bon\b/i, /\boff\b/i, /\bask/i, /\bonly one\b/i],
  ja: [CONFIRM_OVERWRITE, BAK, 'オン', 'オフ', '尋ね', /(1 つだけ)/.exec(DESIGN_OVERWRITE)?.[1] ?? '1 つだけ'],
}
// WHY: the ids of the two save-folder cards are a seam agreed with the page's author.
const SAVE_FOLDER_ID: Record<Lang, string> = { en: 'save-folder', ja: 'save-folder-ja' }
const TROUBLE_HEADING: Record<Lang, RegExp> = { en: /not work|troubleshoot|problem/i, ja: /うまくいかない/ }

// WHY: a break test points every case at a damaged scratch copy through this variable; unset, the real page is read.
const PAGE_FILE = resolve(process.cwd(), process.env['GRS_DOWNLOAD_PAGE'] ?? join('docs', 'download', 'index.html'))
const SENTINEL = 'cr-823 clipboard sentinel'

type Prompt = { id: string; text: string; buttons: number }
type Step = { text: string; prompts: Prompt[] }
type Shown = { steps: Step[]; prompts: Prompt[]; trouble: Prompt[] | null; afterTrouble: string }

// WHY: everything is read from what is visible, so a hidden language block can neither pass nor fail a case.
const readShown = (page: Page, lang: Lang): Promise<Shown> =>
  page.evaluate(({ heading }) => {
    for (const details of document.querySelectorAll('details')) details.open = true
    const visible = (one: Element): boolean => one.checkVisibility()
    const promptOf = (pre: Element): Prompt => {
      const box = pre.closest('div.prompt-box')
      const buttons = box === null ? [] : [...box.querySelectorAll('button.copy[type="button"]')]
      return { id: pre.id, text: (pre as HTMLElement).innerText, buttons: buttons.filter((one) => one.getAttribute('data-copy') === pre.id && visible(one)).length }
    }
    const promptsIn = (root: Element): Prompt[] => [...root.querySelectorAll('div.prompt-box pre.prompt')].filter(visible).map(promptOf)
    const lists = [...document.querySelectorAll('ol.steps')].filter(visible)
      .map((ol) => [...ol.children].filter((li) => li.tagName === 'LI' && visible(li)))
    const steps = lists.reduce((longest, one) => (one.length > longest.length ? one : longest), [] as Element[])
    const pattern = new RegExp(heading.source, heading.flags)
    const h2 = [...document.querySelectorAll('h2')].filter(visible).find((one) => pattern.test((one as HTMLElement).innerText))
    let list: Element | null = null
    for (let next = h2?.nextElementSibling ?? null; next !== null && next.tagName !== 'H2'; next = next.nextElementSibling) {
      if (next.tagName === 'UL') {
        list = next
        break
      }
    }
    const firstItem = list === null ? null : ([...list.children].find((li) => li.tagName === 'LI') ?? null)
    const boxes = firstItem === null ? [] : [...firstItem.querySelectorAll('div.prompt-box')].filter(visible)
    const itemText = firstItem === null ? '' : (firstItem as HTMLElement).innerText
    const lastBox = boxes.length === 0 ? '' : (boxes[boxes.length - 1] as HTMLElement).innerText
    const boxEnd = lastBox === '' ? -1 : itemText.lastIndexOf(lastBox)
    return {
      steps: steps.map((li) => ({ text: (li as HTMLElement).innerText, prompts: promptsIn(li) })),
      prompts: [...document.querySelectorAll('pre.prompt')].filter(visible).map(promptOf),
      trouble: firstItem === null ? null : promptsIn(firstItem),
      afterTrouble: boxEnd < 0 ? '' : itemText.slice(boxEnd + lastBox.length),
    }
  }, { heading: { source: TROUBLE_HEADING[lang].source, flags: TROUBLE_HEADING[lang].flags } })

const switchOf = (page: Page, lang: Lang) => page.getByRole('button', { name: SWITCH_NAME[lang], exact: true })

// WHY: the clipboard API needs a secure context, which file:// is not; loopback HTTP is one.
async function served(): Promise<{ url: string; close: () => void }> {
  const body = readFileSync(PAGE_FILE)
  const server = createServer((asked, answer) => {
    const path = new URL(asked.url ?? '/', 'http://x').pathname
    if (path === '/' || path === '/index.html') {
      answer.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      answer.end(body)
      return
    }
    answer.writeHead(404).end()
  })
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  return { url: `http://127.0.0.1:${String((server.address() as AddressInfo).port)}/index.html`, close: () => server.close() }
}

async function openIn(page: Page, url: string, lang: Lang): Promise<void> {
  await page.goto(url)
  if (lang !== 'en') await switchOf(page, lang).click()
}

let site: { url: string; close: () => void }
test.beforeAll(async () => {
  site = await served()
})
test.afterAll(() => site.close())

test('design 6: the clauses these cases read still stand in the specification', () => {
  for (const clause of [DESIGN_STEPS, DESIGN_RESTART, DESIGN_NOT_A_STEP, DESIGN_ASK_TABS, DESIGN_ASK_NAMES, DESIGN_COPY, DESIGN_TROUBLE,
    DESIGN_TROUBLE_FIRST, DESIGN_TROUBLE_CLUE, DESIGN_TROUBLE_NO_GUESS, DESIGN_REASON, DESIGN_LISTEN, DESIGN_SWITCH, DESIGN_SCREEN_WORDS, DESIGN_OVERWRITE]) {
    expect(DESIGN).toContain(clause)
  }
  expect(MEMBERS).toContain(MEMBERS_VERSION)
  expect(DESIGN).toContain(`\`${PAGE_URL_FIELD}\``)
  expect([AGENT_API_VERSION, PAGE_URL_FIELD, NOT_CONNECTED, CHAT, CODE, TASK_MANAGER.ja].every((one) => one !== '')).toBe(true)
  expect(DESIGN_STEPS).not.toContain('起動し直す')
})

for (const lang of LANGS) {
  test(`design 6: in ${lang}, the save-folder card says what ${CONFIRM_OVERWRITE} does on and off and that one ${BAK} is kept`, async ({ page }) => {
    await openIn(page, site.url, lang)
    const card = page.locator(`[data-lang="${lang}"] #${SAVE_FOLDER_ID[lang]}`)
    await expect(card).toBeVisible()
    const text = await card.evaluate((one) => {
      for (const details of one.querySelectorAll('details')) details.open = true
      return (one as HTMLElement).innerText
    })
    for (const term of OVERWRITE_TERMS[lang]) {
      if (typeof term === 'string') expect(text, term).toContain(term)
      else expect(text).toMatch(term)
    }
  })

  test(`design 6: in ${lang}, the first troubleshooting item gives the way to quit and restart, after its prompt, and no step does`, async ({ page }) => {
    await openIn(page, site.url, lang)
    const { steps, afterTrouble } = await readShown(page, lang)
    expect(afterTrouble, `the text after the troubleshooting prompt names ${TASK_MANAGER[lang]}`).toContain(TASK_MANAGER[lang])
    for (const pattern of WINDOW_NOT_ENOUGH[lang]) expect(afterTrouble, `closing the window does not quit: ${String(pattern)}`).toMatch(pattern)
    expect(steps.length, 'the steps are read').toBeGreaterThan(0)
    for (const step of steps) expect(step.text, 'restarting is not a step').not.toContain(TASK_MANAGER[lang])
  })

  test(`design 6: in ${lang}, the asking step names ${AGENT_API_VERSION} and ${PAGE_URL_FIELD} and says the address differs per tab`, async ({ page }) => {
    await openIn(page, site.url, lang)
    const { steps } = await readShown(page, lang)
    const asking = steps.find((one) => one.prompts.some((prompt) => prompt.text.includes(AGENT_API_VERSION)))
    expect(asking, JSON.stringify(steps.map((one) => one.text))).toBeDefined()
    const prompt = asking?.prompts.find((one) => one.text.includes(AGENT_API_VERSION))
    expect(prompt?.text ?? '').toContain(PAGE_URL_FIELD)
    const text = asking?.text ?? ''
    for (const name of TAB_NAMES[lang]) expect(text).toMatch(name)
    expect(text).toMatch(PER_TAB[lang])
  })

  test(`design 6: in ${lang}, the first troubleshooting item holds the prompt for an AI that gives no address`, async ({ page }) => {
    await openIn(page, site.url, lang)
    const { trouble } = await readShown(page, lang)
    expect(trouble, 'a list follows the troubleshooting heading').not.toBeNull()
    expect(trouble?.length ?? 0, 'its first item holds a prompt box').toBeGreaterThanOrEqual(1)
    const text = (trouble ?? []).map((one) => one.text).join('\n')
    for (const name of [NOT_CONNECTED, PAGE_URL_FIELD, AGENT_API_VERSION]) expect(text, name).toContain(name)
    expect(text, 'the AI is told not to make an address up').toMatch(NO_GUESS[lang])
    for (const one of trouble ?? []) expect(one.buttons, `prompt ${one.id} has its copy button`).toBe(1)
  })

  test(`design 6: in ${lang}, every prompt has a copy button that puts exactly that prompt on the clipboard`, async ({ browser }) => {
    const context: BrowserContext = await browser.newContext()
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(site.url).origin })
    const page = await context.newPage()
    try {
      await openIn(page, site.url, lang)
      const { prompts } = await readShown(page, lang)
      expect(prompts.length, 'the asking prompt and the troubleshooting prompt').toBeGreaterThanOrEqual(2)
      expect(new Set(prompts.map((one) => one.id)).size, 'each prompt has its own id').toBe(prompts.length)
      for (const prompt of prompts) {
        expect(prompt.id, 'a prompt carries an id').not.toBe('')
        expect(prompt.buttons, `prompt ${prompt.id} has one copy button in its box`).toBe(1)
        await page.evaluate((text) => navigator.clipboard.writeText(text), SENTINEL)
        await page.locator(`div.prompt-box button.copy[data-copy="${prompt.id}"]`).filter({ visible: true }).click()
        // WHY: the Windows clipboard stores line ends as CR LF and hands them back so; the page's text has LF.
        const copied = (): Promise<string> => page.evaluate(() => navigator.clipboard.readText()).then((text) => text.replace(/\r\n/g, '\n'))
        await expect.poll(copied, { message: prompt.id }).toBe(prompt.text)
      }
    } finally {
      await context.close()
    }
  })
}

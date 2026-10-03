// CR-562 on the shipped build: IC-115 copies the image-to-GRS-JSON prompt, and IC-18 turns the Agent API on.

import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { bare, specTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg } from './live-app'
import {
  BASE_SCREEN,
  REQUIREMENTS,
  SHIPPED_BUILD,
  isArmed,
  openDocument,
  openStage,
  pressEntrance,
  settle,
  toldReason,
} from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'

const ROOT = process.cwd()

const FR_068_ORDER =
  '⭐ 写すプロンプトは、(1) 表示言語の原稿、(2) 版の 1 行（`schemaVersion:` と 1 字の空白に、初期テンプレート（`FR-027`）の `schemaVersion` の値を続けたもの）、(3) `GRS JSON` のスキーマ（`05-07-design.md` の 6.2 が起こす `_source/grs-document.schema.json`）、(4) 土台の文書、の 4 つをこの順に空行で区切って連ねた 1 つの文字列とすること（MUST）。'
const FR_068_ONE_LINE = '(3) と (4) は空白を除いた 1 行の JSON とし、それぞれ `json` の囲みに入れる。'
const FR_068_LANGUAGE = '⭐ プロンプトは、写した瞬間の表示言語（`FR-038`）の原稿から作ること（MUST）。'
const FR_068_BASE =
  '⭐ 土台の文書は、初期テンプレートと同じ版と同じ `documentSettings` を持ち、タスクを 1 つも持たない `GRS JSON` とし、初期テンプレートと同じ生成器が同じ回に起こすこと（MUST）'
const FR_068_OPENED_BY_OP_2 = '返った文書は 表 T-024a の `OP-2` の「開く」1 つから入る。'
const FR_068_NO_SURFACE = '⭐ 入口は 表 T-109 の `IC-115` とし、押されたときに面を開かずにプロンプトを複写すること（MUST）。'
const FR_068_TELL = '⭐ 複写できたときは、複写したことと次に行うことを告げること（MUST） —— 運ぶ理由は 表 T-233 の `RS-65` とする。'
const FR_066_PRESS =
  '⭐ `Agent API` が無効のあいだに `IC-18` が押されたときは、欄を表示にし、`Agent API` も有効にすること（MUST）'
const FR_066_NO_REVERSE = '⚠️ 逆向きは無い —— 欄を非表示にしても `Agent API` は有効のままである。'
const FR_066_NOT_FAINT = '⚠️ そのため `IC-18` は、`Agent API` が無効のあいだも薄く描かない'
const FR_065_REMEMBERED = '有効化はブラウザ（オリジン）ごとに記憶すること（MUST）'
const RS_15_ROW = '| RS-15 | この理由にまだ行が無い |'

const CLAUSES: readonly string[] = [
  FR_068_ORDER,
  FR_068_ONE_LINE,
  FR_068_LANGUAGE,
  FR_068_BASE,
  FR_068_OPENED_BY_OP_2,
  FR_068_NO_SURFACE,
  FR_068_TELL,
  FR_066_PRESS,
  FR_066_NO_REVERSE,
  FR_066_NOT_FAINT,
  FR_065_REMEMBERED,
  RS_15_ROW,
]

const T_103 = specTable('T-103')
const T_109 = specTable('T-109')

const roleName = (id: string): string => bare(rowOf(T_103, id).by['確定名（英）'] ?? '')
const roleOf = (id: string): string => `[data-role="${roleName(id)}"]`

const APP_HEADER = roleOf('U-31')
const DIALOGUE_FIELD = roleOf('U-44')
const NOT_A_SURFACE = new Set([roleName('U-57'), roleName('U-53')])

const COPY_PROMPT = rowOf(T_109, 'IC-115').id
const DIALOGUE = rowOf(T_109, 'IC-18').id
const SCREEN_LANGUAGE = rowOf(T_109, 'IC-21').id

// see T-109
const AI_GROUP: readonly string[] = T_109.rows
  .filter((row) => (row.by['面'] ?? '').trim() === `\`${roleName('U-31')}\`` && (row.by['群'] ?? '').trim() === 'AI')
  .map((row) => row.id)

type Language = 'ja' | 'en'

interface PromptParts {
  readonly ja: string
  readonly en: string
  readonly schemaVersion: string
  readonly schema: string
  readonly emptyDocument: string
}

// WHY: the generated seam file CR-562 section 5 names; it is a spec artifact, not a body.
const PROMPT = JSON.parse(
  readFileSync(join(ROOT, 'src', 'adapter', 'screen-renderer', 'image-to-grs-json-prompt.json'), 'utf8'),
) as PromptParts

const TEMPLATE = JSON.parse(
  readFileSync(join(ROOT, 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { readonly schemaVersion: string; readonly documentSettings: unknown }

const SCHEMA_TEXT = JSON.stringify(
  JSON.parse(readFileSync(join(ROOT, 'docs', 'spec', '_source', 'grs-document.schema.json'), 'utf8')),
)

interface SettingsBlock {
  readonly id?: string
  readonly rows?: readonly { readonly id?: string; readonly value?: { readonly num?: string; readonly lit?: string } }[]
}

// see T-209
const T_209_ROWS = (
  JSON.parse(readFileSync(join(ROOT, 'docs', 'spec', '_source', 'settings.json'), 'utf8')) as {
    readonly blocks: readonly SettingsBlock[]
  }
).blocks.find((block) => block.id === 'T-209')?.rows ?? []

// WHY: the manuscript names a value of table T-209 as `{{S-128}}`, and the prompt carries the value
// that row states, so no prose holds a copy of it (CR-644). A literal row (the times of day S-482 /
// S-483, CR-646) is carried as its own text.
/** @purity pure */
function t209Value(id: string): string {
  const found = T_209_ROWS.filter((row) => row.id === id)
  const literal = found.length === 1 ? found[0]?.value?.lit : undefined
  if (typeof literal === 'string') return literal
  const value = Number(found.length === 1 ? found[0]?.value?.num : NaN)
  if (!Number.isFinite(value)) throw new Error(`table T-209 states no single plain value for ${id}`)
  return String(value)
}

// WHY: the manuscript's first line is its own role line and not part of the prompt (CR-562 section 5).
/** @purity non-pure */
function manuscriptOf(language: Language): string {
  const text = readFileSync(join(ROOT, 'docs', 'spec', '_source', `image-to-grs-json-prompt.${language}.md`), 'utf8')
  const body = text.replace(/\r\n/g, '\n').split('\n').slice(1).join('\n').replace(/\s+$/, '')
  const printed = body.replace(/\{\{(S-[0-9]+[a-z]?)\}\}/g, (_token, id: string) => t209Value(id))
  if (printed.includes('{{') || printed.includes('}}')) throw new Error(`${language}: a {{...}} token names no row of T-209`)
  return printed
}

const FENCE = '```'

/** @purity non-pure */
function expectedCopy(language: Language): string {
  return (
    `${manuscriptOf(language)}\n\nschemaVersion: ${TEMPLATE.schemaVersion}` +
    `\n\n${FENCE}json\n${SCHEMA_TEXT}\n${FENCE}\n\n${FENCE}json\n${PROMPT.emptyDocument}\n${FENCE}\n`
  )
}

// WHY: a stand-in in front of navigator.clipboard sees exactly what the page handed over, whatever the host allows.
const CLIPBOARD_SPY = (refuse: boolean): void => {
  const seen: (string | null)[] = []
  ;(window as unknown as Record<string, unknown>)['cr562Copied'] = seen
  const board = navigator.clipboard as unknown as Record<string, unknown> | undefined
  if (board === undefined) return
  const wrap = (member: string, take: (...args: unknown[]) => Promise<string | null>): void => {
    const inner = board[member]
    if (typeof inner !== 'function') return
    board[member] = async (...args: unknown[]): Promise<unknown> => {
      try {
        seen.push(await take(...args))
      } catch {
        seen.push(null)
      }
      if (refuse) throw new DOMException('refused by the test', 'NotAllowedError')
      return (inner as (...given: unknown[]) => Promise<unknown>).apply(board, args)
    }
  }
  wrap('writeText', async (text) => String(text))
  wrap('write', async (items) => {
    for (const item of items as ClipboardItem[]) {
      if (item.types.includes('text/plain')) return (await item.getType('text/plain')).text()
    }
    return null
  })
}

interface Visit {
  readonly context: BrowserContext
  readonly page: Page
}

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

// WHY: not openStage -- that one presses IC-20 first, and IC-18 is judged here from a disabled Agent API.
/** @purity non-pure */
async function visit(refuseCopy = false): Promise<Visit> {
  if (browser === null) throw new Error('no browser')
  const context = await browser.newContext({ viewport: BASE_SCREEN })
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await context.addInitScript(CLIPBOARD_SPY, refuseCopy)
  const page = await context.newPage()
  await page.goto(pathToFileURL(SHIPPED_BUILD).href)
  await readSettledDrawnSvg(page)
  return { context, page }
}

/** @purity semi-pure-b */
async function copies(page: Page): Promise<readonly (string | null)[]> {
  return page.evaluate(() => ((window as unknown as Record<string, (string | null)[]>)['cr562Copied'] ?? []).slice())
}

/** @purity non-pure */
async function pressAndWaitForCopy(page: Page): Promise<string | null> {
  const before = (await copies(page)).length
  expect(await pressEntrance(page, COPY_PROMPT), `${COPY_PROMPT} is on the screen`).toBe(true)
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline) {
    const seen = await copies(page)
    if (seen.length > before) return seen[seen.length - 1] ?? null
    await page.waitForTimeout(100)
  }
  throw new Error(`${COPY_PROMPT} was pressed and nothing was handed to the clipboard`)
}

// WHY: the host clipboard is read back as well when the browser allows it; null when it does not.
/** @purity semi-pure-b */
async function hostClipboard(page: Page): Promise<string | null> {
  return page.evaluate(async () => {
    try {
      return await navigator.clipboard.readText()
    } catch {
      return null
    }
  })
}

/** @purity semi-pure-b */
async function screenLanguage(page: Page): Promise<Language> {
  const said = await page.evaluate(() => document.documentElement.getAttribute('lang') ?? '')
  const code = said.slice(0, 2)
  if (code !== 'ja' && code !== 'en') throw new Error(`the document names the language ${JSON.stringify(said)}`)
  return code
}

/** @purity semi-pure-b */
async function roles(page: Page): Promise<readonly string[]> {
  return page.evaluate(() =>
    [...new Set(Array.from(document.querySelectorAll('[data-role]')).map((one) => one.getAttribute('data-role') ?? ''))].sort(),
  )
}

/** @purity semi-pure-b */
async function isDrawn(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((wanted: string) => {
    const box = document.querySelector(wanted)?.getBoundingClientRect()
    return box !== undefined && box.width > 0 && box.height > 0
  }, selector)
}

/** @purity semi-pure-b */
async function agentApiPublished(page: Page): Promise<boolean> {
  return page.evaluate(() => typeof (globalThis as unknown as Record<string, unknown>)['grSchedulerAgentApi'] === 'object')
}

test.describe('CR-562 -- the clauses and the generated seam these cases are driven by', () => {
  test('FR-068, FR-066, FR-065 and RS-15 still read this way', () => {
    for (const clause of CLAUSES) expect(REQUIREMENTS, clause).toContain(clause)
  })

  test(`表 T-109 puts exactly three entrances in the App Header's group AI, IC-115 and IC-18 among them, and has no IC-19`, () => {
    expect(AI_GROUP).toHaveLength(3)
    expect(AI_GROUP).toContain(COPY_PROMPT)
    expect(AI_GROUP).toContain(DIALOGUE)
    expect(T_109.rows.map((row) => row.id)).not.toContain('IC-19')
    expect(roleName('U-30'), '表 T-103 U-30 names the Help Modal only').toBe('Help Modal')
  })

  test(`${FR_068_ONE_LINE} -- the seam file holds the manuscripts, the minified schema and the version`, () => {
    expect(PROMPT.ja).toBe(manuscriptOf('ja'))
    expect(PROMPT.en).toBe(manuscriptOf('en'))
    expect(PROMPT.ja, 'premise: the two manuscripts differ').not.toBe(PROMPT.en)
    expect(PROMPT.schema).toBe(SCHEMA_TEXT)
    expect(PROMPT.schemaVersion).toBe(TEMPLATE.schemaVersion)
    expect(PROMPT.emptyDocument).toBe(JSON.stringify(JSON.parse(PROMPT.emptyDocument)))
  })

  test(FR_068_BASE, () => {
    const base = JSON.parse(PROMPT.emptyDocument) as {
      schemaVersion: string
      schedule: { tasks: unknown[] }
      documentSettings: unknown
    }
    const report = validateDocument(base)
    expect(report.errors).toEqual([])
    expect(base.schemaVersion).toBe(TEMPLATE.schemaVersion)
    expect(base.documentSettings).toEqual(TEMPLATE.documentSettings)
    expect(base.schedule.tasks).toEqual([])
  })
})

test.describe(`IC-115 -- ${FR_068_NO_SURFACE}`, () => {
  test(`${FR_068_ORDER} -- the copied string is the seam, byte for byte, in the screen language`, async () => {
    const one = await visit()
    try {
      const language = await screenLanguage(one.page)
      const copied = await pressAndWaitForCopy(one.page)
      expect(copied).toBe(expectedCopy(language))
      const host = await hostClipboard(one.page)
      test.info().annotations.push({ type: 'host clipboard', description: host === null ? 'not readable' : 'read back' })
      // WHY: the Windows clipboard hands text back with CRLF line ends (measured); the page wrote LF, as the spy shows.
      if (host !== null) expect(host.replace(/\r\n/g, '\n')).toBe(expectedCopy(language))
    } finally {
      await one.context.close()
    }
  })

  test(`${FR_068_LANGUAGE} -- after IC-21 the other manuscript is copied`, async () => {
    const one = await visit()
    try {
      const first = await screenLanguage(one.page)
      expect(await pressAndWaitForCopy(one.page)).toBe(expectedCopy(first))
      expect(await pressEntrance(one.page, SCREEN_LANGUAGE), `${SCREEN_LANGUAGE} is on the screen`).toBe(true)
      const second = await screenLanguage(one.page)
      expect(second, `premise: ${SCREEN_LANGUAGE} changed the screen language`).not.toBe(first)
      expect(await pressAndWaitForCopy(one.page)).toBe(expectedCopy(second))
    } finally {
      await one.context.close()
    }
  })

  test(`${FR_068_TELL} -- and no surface is opened`, async () => {
    const one = await visit()
    try {
      expect(await toldReason(one.page, 'RS-65'), 'premise: nothing is told before the press').toBe(false)
      const before = await roles(one.page)
      await pressAndWaitForCopy(one.page)
      await settle(one.page)
      const opened = (await roles(one.page)).filter((role) => !before.includes(role) && !NOT_A_SURFACE.has(role))
      expect(opened, FR_068_NO_SURFACE).toEqual([])
      expect(await toldReason(one.page, 'RS-65'), FR_068_TELL).toBe(true)
      expect(await toldReason(one.page, 'RS-15')).toBe(false)
    } finally {
      await one.context.close()
    }
  })

  test(`a copy the host refuses is told with ${RS_15_ROW} and never with RS-65`, async () => {
    const one = await visit(true)
    try {
      await pressAndWaitForCopy(one.page)
      await settle(one.page)
      expect(await toldReason(one.page, 'RS-65'), FR_068_TELL).toBe(false)
      expect(await toldReason(one.page, 'RS-15')).toBe(true)
    } finally {
      await one.context.close()
    }
  })

  test(`${FR_068_OPENED_BY_OP_2} -- the base document the prompt carries opens through OP-2`, async () => {
    if (browser === null) throw new Error('no browser')
    const stage = await openStage(browser)
    try {
      await openDocument(stage.page, 'base.json', PROMPT.emptyDocument)
      const held = await stage.page.evaluate(() => {
        const api = (globalThis as unknown as { grSchedulerAgentApi: { readDocument(): unknown } }).grSchedulerAgentApi
        return api.readDocument() as { schemaVersion: string; schedule: { tasks: unknown[]; taskGroups: { id: string }[] } }
      })
      const base = JSON.parse(PROMPT.emptyDocument) as { schedule: { taskGroups: { id: string }[] } }
      expect(held.schedule.tasks).toEqual([])
      expect(held.schedule.taskGroups.map((row) => row.id)).toEqual(base.schedule.taskGroups.map((row) => row.id))
      expect(held.schemaVersion).toBe(TEMPLATE.schemaVersion)
    } finally {
      await stage.close()
    }
  })
})

test.describe('the App Header -- group AI', () => {
  test('draws the three entrances of group AI and no IC-19, and no AI Export Modal is ever named', async () => {
    const one = await visit()
    try {
      const drawn = await one.page.evaluate(
        (header: string) =>
          Array.from(document.querySelectorAll(`${header} [data-icon]`)).map((entry) => entry.getAttribute('data-icon') ?? ''),
        APP_HEADER,
      )
      const known = new Set(T_109.rows.map((row) => row.id))
      expect(drawn.filter((icon) => !known.has(icon)), 'the header draws an entrance 表 T-109 does not hold').toEqual([])
      expect([...new Set(drawn.filter((icon) => AI_GROUP.includes(icon)))].sort()).toEqual([...AI_GROUP].sort())
      expect(await one.page.$('[data-icon="IC-19"]')).toBeNull()
      expect(await roles(one.page)).not.toContain('AI Export Modal')
    } finally {
      await one.context.close()
    }
  })
})

test.describe(`IC-18 -- ${FR_066_PRESS}`, () => {
  test(`${FR_066_NOT_FAINT}; pressed, the field shows and the Agent API is enabled and remembered; hidden again, it stays enabled`, async () => {
    const one = await visit()
    try {
      expect(await agentApiPublished(one.page), 'premise: the Agent API starts disabled').toBe(false)
      expect(await isDrawn(one.page, DIALOGUE_FIELD), 'premise: no field while the Agent API is disabled').toBe(false)
      expect(await isArmed(one.page, DIALOGUE), FR_066_NOT_FAINT).toBe(true)

      expect(await pressEntrance(one.page, DIALOGUE), `${DIALOGUE} is on the screen`).toBe(true)
      expect(await isDrawn(one.page, DIALOGUE_FIELD), FR_066_PRESS).toBe(true)
      expect(await agentApiPublished(one.page), FR_066_PRESS).toBe(true)

      expect(await pressEntrance(one.page, DIALOGUE), `${DIALOGUE} is on the screen`).toBe(true)
      expect(await isDrawn(one.page, DIALOGUE_FIELD), 'the second press hides the field').toBe(false)
      expect(await agentApiPublished(one.page), FR_066_NO_REVERSE).toBe(true)

      await one.page.reload()
      await readSettledDrawnSvg(one.page)
      expect(await agentApiPublished(one.page), FR_065_REMEMBERED).toBe(true)
    } finally {
      await one.context.close()
    }
  })
})

// CR-827 on the shipped build: IC-115 copies a prompt with no schema and downloads grs-document.schema.json.

import { expect, test, type Browser, type BrowserContext, type Download, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { specTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg } from './live-app'
import { BASE_SCREEN, REQUIREMENTS, SHIPPED_BUILD, pressEntrance, reasonWords, settle, toldReason } from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'

const ROOT = process.cwd()

const FR_068_NO_SCHEMA =
  '⛔ コピーするプロンプトに `GRS JSON` のスキーマを入れてはならない（MUST NOT） —— スキーマは下のファイルで渡す。'
const FR_068_DOWNLOAD =
  '⭐ 同じ押下で、`GRS JSON` のスキーマ（`05-07-design.md` の 6.2 が起こす `_source/grs-document.schema.json`）を 表 T-024 の `IO-10` のファイルとして、閲覧環境のダウンロードに渡すこと（MUST） —— 保存の選択面（`FR-096`）を開かない。'
const FR_068_NAME = '名は `grs-document.schema.json` に固定し、中身はスキーマを空白を除いた 1 行の JSON にしたものとする。'
const FR_068_TELL =
  '⭐ コピーできたときは、コピーしたことと次に行うこと（プロンプトとダウンロードしたスキーマのファイルを AI に渡す）を告げること（MUST） —— 運ぶ理由は 表 T-233 の `RS-65` とする。'

const SCHEMA_FILE_NAME = 'grs-document.schema.json'
const SCHEMA = JSON.parse(readFileSync(join(ROOT, 'docs', 'spec', '_source', SCHEMA_FILE_NAME), 'utf8')) as unknown
const SCHEMA_ONE_LINE = JSON.stringify(SCHEMA)
const METASCHEMA = 'https://json-schema.org/draft/2020-12/schema'
const JSON_FENCE = '```json\n'

const T_109 = specTable('T-109')
const COPY_PROMPT = rowOf(T_109, 'IC-115').id
const SCREEN_LANGUAGE = rowOf(T_109, 'IC-21').id

// WHY: a stand-in in front of the clipboard sees what the page wrote; a counter on the save chooser proves it stayed shut.
const SPIES = (): void => {
  const seen: string[] = []
  const held = window as unknown as Record<string, unknown>
  held['cr827Copied'] = seen
  held['cr827Choosers'] = 0
  held['showSaveFilePicker'] = async (): Promise<never> => {
    held['cr827Choosers'] = Number(held['cr827Choosers']) + 1
    throw new DOMException('the test chooses nothing', 'AbortError')
  }
  const board = navigator.clipboard as unknown as Record<string, unknown> | undefined
  if (board === undefined) return
  const inner = board['writeText']
  if (typeof inner !== 'function') return
  board['writeText'] = async (text: unknown): Promise<unknown> => {
    seen.push(String(text))
    return (inner as (given: unknown) => Promise<unknown>).call(board, text)
  }
}

interface Visit {
  readonly context: BrowserContext
  readonly page: Page
  readonly downloads: Download[]
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
async function visit(): Promise<Visit> {
  if (browser === null) throw new Error('no browser')
  const context = await browser.newContext({ viewport: BASE_SCREEN, acceptDownloads: true })
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await context.addInitScript(SPIES)
  const page = await context.newPage()
  const downloads: Download[] = []
  page.on('download', (one) => {
    downloads.push(one)
  })
  await page.goto(pathToFileURL(SHIPPED_BUILD).href)
  await readSettledDrawnSvg(page)
  return { context, page, downloads }
}

/** @purity semi-pure-b */
async function copied(page: Page): Promise<readonly string[]> {
  return page.evaluate(() => ((window as unknown as Record<string, string[]>)['cr827Copied'] ?? []).slice())
}

/** @purity non-pure */
async function press(one: Visit): Promise<{ text: string; download: Download }> {
  const before = (await copied(one.page)).length
  const downloaded = one.page.waitForEvent('download', { timeout: 8_000 })
  expect(await pressEntrance(one.page, COPY_PROMPT), `${COPY_PROMPT} is on the screen`).toBe(true)
  const download = await downloaded
  await expect.poll(async () => (await copied(one.page)).length, { timeout: 5_000 }).toBeGreaterThan(before)
  const all = await copied(one.page)
  return { text: all[all.length - 1] ?? '', download }
}

/** @purity non-pure */
async function contentOf(download: Download): Promise<string> {
  const path = await download.path()
  return readFileSync(path, 'utf8')
}

test.describe('CR-827 -- the manuscript these cases are driven by', () => {
  for (const clause of [FR_068_NO_SCHEMA, FR_068_DOWNLOAD, FR_068_NAME, FR_068_TELL]) {
    test(`01-04 still says it: ${clause}`, () => {
      expect(REQUIREMENTS).toContain(clause)
    })
  }

  test('the RS-65 words name the schema file in both languages', () => {
    for (const words of reasonWords('RS-65')) expect(words).toContain(SCHEMA_FILE_NAME)
  })
})

test.describe(`IC-115 -- ${FR_068_DOWNLOAD}`, () => {
  test(`one press, one download named by FR-068, holding the spec's schema on one line; ${FR_068_NO_SCHEMA}`, async () => {
    const one = await visit()
    try {
      const { text, download } = await press(one)
      expect(download.suggestedFilename()).toBe(SCHEMA_FILE_NAME)
      const content = await contentOf(download)
      expect(JSON.parse(content)).toEqual(SCHEMA)
      // WHY: one line of JSON may end with its line end; FR-068 fixes the one line, not whether it is terminated.
      expect(content.replace(/\n$/, '')).toBe(SCHEMA_ONE_LINE)
      await one.page.waitForTimeout(1_500)
      expect(one.downloads, 'one press hands one file').toHaveLength(1)
      expect(await one.page.evaluate(() => (window as unknown as Record<string, number>)['cr827Choosers']), 'no save chooser').toBe(0)
      expect(text).not.toContain(SCHEMA_ONE_LINE)
      expect(text).not.toContain(METASCHEMA)
      expect(text.split(JSON_FENCE), 'exactly one json fence').toHaveLength(2)
      expect(text).toContain(SCHEMA_FILE_NAME)
    } finally {
      await one.context.close()
    }
  })

  test(`${FR_068_TELL} -- the words of the screen language are shown`, async () => {
    const one = await visit()
    try {
      expect(await toldReason(one.page, 'RS-65'), 'premise: nothing is told before the press').toBe(false)
      await press(one)
      await settle(one.page)
      expect(await toldReason(one.page, 'RS-65'), FR_068_TELL).toBe(true)
    } finally {
      await one.context.close()
    }
  })

  test('after IC-21 the other language copies its own prompt and still downloads the same file', async () => {
    const one = await visit()
    try {
      const first = await press(one)
      expect(await pressEntrance(one.page, SCREEN_LANGUAGE), `${SCREEN_LANGUAGE} is on the screen`).toBe(true)
      const second = await press(one)
      expect(second.text, 'premise: the screen language changed the prompt').not.toBe(first.text)
      expect(second.text).not.toContain(METASCHEMA)
      expect(second.download.suggestedFilename()).toBe(SCHEMA_FILE_NAME)
      expect(JSON.parse(await contentOf(second.download))).toEqual(SCHEMA)
    } finally {
      await one.context.close()
    }
  })
})

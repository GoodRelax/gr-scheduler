// CR-721 on the shipped build: the exported picture of a schedule filtered to the checked tasks holds no band words and starts where the unfiltered picture starts (T-241 IX-11, T-076 EP-24).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import { BAND, ENTER, PANEL, boxOf, pressAt, pressSelector, settle, withSearch } from './cr-721-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const IX_11_NO_BAND_WORDS =
  '⛔ 絵にスケジュールフィルタの帯（`_assets/tbl-glossary.md` の `U-67`）の語を書き込んではならない（MUST NOT）'
const IX_11_CLOSE_UP =
  '⭐ 帯の高さも絵に残さず、帯が無いときと同じ位置から日程表を組むこと（MUST）'
const EP_24_CLOSE_UP = '帯が無いときと同じ位置から組む'

const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  readonly searchPanel: readonly { readonly part: string; readonly text: { readonly ja: string; readonly en: string } }[]
}
const wordsOf = (part: string): readonly string[] => {
  const held = WORDS.searchPanel.find((one) => one.part === part)?.text
  if (held === undefined) throw new Error(`the dictionary holds no ${part}`)
  return [held.ja, held.en]
}
// WHY: the band line holds {tables}, {total} and {shown} (TV-11); the fixed parts around the braces are what a picture would carry.
const BAND_WORDS = [...wordsOf('scheduleFilterBar').flatMap((text) => text.split(/\{[^}]*\}/).map((part) => part.trim())), ...wordsOf('scheduleFilterOff')].filter(
  (text) => text.length >= 4,
)

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

test.describe('CR-721 the manuscript these cases are driven by', () => {
  test('T-241 IX-11 and T-076 EP-24 still say it, word for word', () => {
    expect(REQUIREMENTS).toContain(IX_11_NO_BAND_WORDS)
    expect(REQUIREMENTS).toContain(IX_11_CLOSE_UP)
    expect(REQUIREMENTS).toContain(EP_24_CLOSE_UP)
    expect(BAND_WORDS.length, 'premise: the dictionary gives the band words').toBeGreaterThanOrEqual(3)
  })
})

/** @purity semi-pure-b */
async function exportedSvg(page: Page): Promise<string> {
  return page.evaluate(() => {
    const api = (window as unknown as { grSchedulerAgentApi: { exportSvg(): { ok: boolean; value?: string; svg?: string } } }).grSchedulerAgentApi
    const made = api.exportSvg() as unknown as Record<string, unknown>
    return String(made['value'] ?? made['svg'] ?? made['text'] ?? '')
  })
}

// WHY: the ground of the ruler is the topmost thing of the picture; its y says where the schedule starts.
/** @purity pure */
function rulerTop(svg: string): string {
  const tag = /<[^>]*data-figure="ruler-ground"[^>]*>/.exec(svg)?.[0]
  if (tag === undefined) throw new Error('the picture holds no ruler ground')
  return `${/\sy="([^"]*)"/.exec(tag)?.[1] ?? ''}|${/\sheight="([^"]*)"/.exec(tag)?.[1] ?? ''}|${/transform="([^"]*)"/.exec(tag)?.[1] ?? ''}`
}

test.describe('T-241 IX-11 / T-076 EP-24 -- the band is a screen thing', () => {
  test.setTimeout(240_000)

  test(`IX-11 「${IX_11_NO_BAND_WORDS.slice(-30)}」 and 「${IX_11_CLOSE_UP.slice(-24)}」`, async () => {
    if (browser === null) throw new Error('no browser')
    const stage = await withSearch(browser)
    try {
      const page = stage.page
      const unfiltered = await exportedSvg(page)
      expect(unfiltered.length, 'premise: the picture is made').toBeGreaterThan(0)
      // STEP: check the first row's Visibility box, then press IC-143
      const firstBox = await boxOf(page, `${PANEL} tbody tr:first-child input[type="checkbox"]`)
      if (firstBox === null) throw new Error('premise: the first row has a Visibility box')
      await pressAt(page, firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2)
      await pressSelector(page, `${PANEL} [data-icon="${ENTER}"]`)
      await settle(page)
      expect(await boxOf(page, BAND), 'premise: the band is on the screen').not.toBeNull()
      const filtered = await exportedSvg(page)
      expect(filtered, 'the filtered picture is a narrower one').not.toBe(unfiltered)
      for (const word of BAND_WORDS) expect(filtered.includes(word), `the picture holds no band word: ${word}`).toBe(false)
      expect(rulerTop(filtered), IX_11_CLOSE_UP).toBe(rulerTop(unfiltered))
    } finally {
      await stage.close()
    }
  })
})

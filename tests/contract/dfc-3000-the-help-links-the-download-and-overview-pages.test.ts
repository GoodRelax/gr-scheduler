// DFC-3000 spec-only cases: FR-036 -- the Help puts two links one per line right above the basics block (S-350, then S-583 with ?lang=), in the dictionary words, S-503 underlined, opening a new tab.

import { describe, expect, it } from 'vitest'

import type { DisplayLanguage } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  ABOUT_ADDRESS,
  DOWNLOAD_ADDRESS,
  LANGUAGES,
  LINK_INK,
  REQUIREMENTS,
  anchorsIn,
  anchorsTo,
  drawnHelp,
  headingWords,
  helpOf,
  hrefOf,
  inkOf,
  isUnderlined,
  linkWords,
  targetOf,
  textsInOrder,
} from './dfc-3000-help-stage'

const FR_036_TWO_LINKS = '⭐ ヘルプは、基本操作の塊（辞書の見出しの `basics`）の枠のすぐ上に、2 つのリンクを 1 行ずつ縦に並べて置くこと（MUST）'
const FR_036_DESTINATIONS =
  '上のリンクの宛先は `_assets/tbl-settings.md` の 表 T-206 の `S-350`（最新版を入手する頁）、下のリンクの宛先は同表の `S-583` の所にヘルプの言語を `?lang=ja` ／ `?lang=en` で付けたものとし、どちらも押したら閲覧環境の新しいタブで開くこと（MUST）'
const FR_036_WORDS = '2 つのリンクの語は `FR-038` の辞書（`helpLinks` の `download` と `about`）が持つこと（MUST）'
const FR_036_INK =
  '⭐ ヘルプのリンク —— この 2 つ、`IC-20` の項目に添えるリンク、`FR-069` の著作権表示 —— の字は、`_assets/tbl-settings.md` の 表 T-236 の `S-503` の色で下線を引いて描くこと（MUST）'
const T_256_HC_1 = '| HC-1 | 左端の段 | 入口を持たない割当 → 表 T-255 のブラウザの機能 |'

const aboutAddress = (language: DisplayLanguage): string => `${ABOUT_ADDRESS}?lang=${language}`

const downloadAnchorOf = (language: DisplayLanguage, preference: 'light' | 'dark' = 'light') => {
  const drawn = drawnHelp(language, preference)
  const found = anchorsTo(drawn.help, DOWNLOAD_ADDRESS).filter((one) => one.textContent.trim() === linkWords('download', language))
  if (found.length !== 1) throw new Error(`expected one download link with its words, found ${found.length}`)
  return { ...drawn, anchor: found[0]! }
}

const aboutAnchorOf = (language: DisplayLanguage, preference: 'light' | 'dark' = 'light') => {
  const drawn = drawnHelp(language, preference)
  const found = anchorsTo(drawn.help, aboutAddress(language))
  if (found.length !== 1) throw new Error(`expected one link to ${aboutAddress(language)}, found ${found.length}`)
  return { ...drawn, anchor: found[0]! }
}

describe('DFC-3000 -- the manuscript these cases are driven by', () => {
  it('FR-036 still places two links above the basics block, names S-350 / S-583 + ?lang=, the dictionary words and S-503', () => {
    expect(REQUIREMENTS).toContain(FR_036_TWO_LINKS)
    expect(REQUIREMENTS).toContain(FR_036_DESTINATIONS)
    expect(REQUIREMENTS).toContain(FR_036_WORDS)
    expect(REQUIREMENTS).toContain(FR_036_INK)
    expect(REQUIREMENTS).toContain(T_256_HC_1)
  })

  it('T-206 S-350 is an https address ending in a slash, S-583 is another page, and neither carries a query', () => {
    expect(DOWNLOAD_ADDRESS).toMatch(/^https:\/\/\S+\/$/)
    expect(ABOUT_ADDRESS).toMatch(/^https:\/\/\S+$/)
    expect(DOWNLOAD_ADDRESS).not.toContain('?')
    expect(ABOUT_ADDRESS).not.toContain('?')
    expect(DOWNLOAD_ADDRESS).not.toBe(ABOUT_ADDRESS)
  })

  it('FR-038 dictionary helpLinks holds download and about in ja and en, and T-236 S-503 holds two colours', () => {
    for (const link of ['download', 'about']) {
      expect(linkWords(link, 'ja').trim()).not.toBe('')
      expect(linkWords(link, 'en').trim()).not.toBe('')
    }
    expect(LINK_INK.light).toMatch(/^#[0-9a-f]{6}$/)
    expect(LINK_INK.dark).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('DFC-3000 -- FR-036 the two links the help view carries', () => {
  it.each(LANGUAGES)('%s: the upper link is S-350 with the dictionary words download', (language) => {
    expect(helpOf(language).downloadLink).toEqual({ words: linkWords('download', language), address: DOWNLOAD_ADDRESS })
  })

  it.each(LANGUAGES)('%s: the lower link is S-583 + ?lang=<help language> with the dictionary words about', (language) => {
    expect(helpOf(language).aboutLink).toEqual({ words: linkWords('about', language), address: aboutAddress(language) })
  })

  it.each(LANGUAGES)('%s: both follow the HELP language when the screen language is the other one (FR-036, FR-038)', (language) => {
    const other: DisplayLanguage = language === 'ja' ? 'en' : 'ja'
    const help = helpOf(language, other)
    expect(help.downloadLink.words).toBe(linkWords('download', language))
    expect(help.aboutLink).toEqual({ words: linkWords('about', language), address: aboutAddress(language) })
  })
})

describe('DFC-3000 -- FR-036 the two links as drawn', () => {
  it.each(LANGUAGES)('%s: one download link to S-350 and one overview link to S-583 + ?lang=, each opening a new tab', (language) => {
    const download = downloadAnchorOf(language).anchor
    const about = aboutAnchorOf(language).anchor
    expect(hrefOf(download)).toBe(DOWNLOAD_ADDRESS)
    expect(targetOf(download)).toBe('_blank')
    expect(about.textContent.trim()).toBe(linkWords('about', language))
    expect(targetOf(about)).toBe('_blank')
  })

  it.each(LANGUAGES)('%s: download, then overview, then the basics heading, with no other words between (FR-036, T-256 HC-1)', (language) => {
    const { help } = drawnHelp(language)
    const joined = textsInOrder(help).join('\u0000')
    const download = joined.indexOf(linkWords('download', language))
    const about = joined.indexOf(linkWords('about', language))
    const basics = joined.indexOf(headingWords('basics', language))
    expect(download).toBeGreaterThanOrEqual(0)
    expect(about).toBeGreaterThan(download)
    expect(basics).toBeGreaterThan(about)
    const between = (from: number, words: string, to: number): string => joined.slice(from + words.length, to).replace(/[\s\u0000]/g, '')
    expect(between(download, linkWords('download', language), about)).toBe('')
    expect(between(about, linkWords('about', language), basics)).toBe('')
  })

  it.each(LANGUAGES)('%s: the two links are the only anchors the help draws besides the IC-20 link and the copyright', (language) => {
    const { help } = drawnHelp(language)
    const addresses = anchorsIn(help).map(hrefOf)
    expect(addresses.filter((one) => one === aboutAddress(language))).toHaveLength(1)
    expect(addresses.filter((one) => one.startsWith(ABOUT_ADDRESS))).toHaveLength(1)
  })

  describe.each(LANGUAGES)('%s', (language) => {
    it.each(['light', 'dark'] as const)('%s theme: both links are drawn in S-503 of that theme, underlined (FR-036, S-503)', (preference) => {
      const download = downloadAnchorOf(language, preference)
      const about = aboutAnchorOf(language, preference)
      expect(inkOf(download.built, download.anchor, download.help)).toBe(LINK_INK[preference])
      expect(inkOf(about.built, about.anchor, about.help)).toBe(LINK_INK[preference])
      expect(isUnderlined(download.anchor, download.help)).toBe(true)
      expect(isUnderlined(about.anchor, about.help)).toBe(true)
    })
  })
})

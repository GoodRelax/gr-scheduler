// DFC-3001 spec-only cases: FR-036 -- the Help carries no note *1 row, and the IC-20 item carries after its name, unparenthesised, a link in the helpLinks agentApi words to S-350 in a new tab, S-503 underlined.

import { describe, expect, it } from 'vitest'

import type { DisplayLanguage } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  DICTIONARY,
  DOWNLOAD_ADDRESS,
  LANGUAGES,
  LINK_INK,
  REQUIREMENTS,
  anchorsTo,
  drawnHelp,
  helpOf,
  iconLabel,
  inkOf,
  isUnderlined,
  linkWords,
  nearestHolding,
  requirementText,
  targetOf,
} from './dfc-3000-help-stage'

const FR_036_IC_20_LINK =
  '⭐ `IC-20` の項目には、名の語の後ろに、最新版を入手する頁（`_assets/tbl-settings.md` の 表 T-206 の `S-350`）へのリンクを添え、押したら閲覧環境の新しいタブで開くこと（MUST）'
const FR_036_IC_20_WORDS = 'リンクの語は `FR-038` の辞書の `helpLinks` の `agentApi` が持つ'
const FR_036_IC_20_UNPARENTHESISED = '`IC-20` に添えるリンクは囲まない'
const FR_036_INK = '⭐ ヘルプのリンク —— この 2 つ、`IC-20` の項目に添えるリンク、`FR-069` の著作権表示 —— の字は'

// see JDG-2501, JDG-2512
const AGENT_API_WORDS: Readonly<Record<DisplayLanguage, string>> = { ja: '詳細→AI連携', en: 'Details → AI integration' }

const NOTE_MARK = '※'

const ic20LinkOf = (language: DisplayLanguage, preference: 'light' | 'dark' = 'light') => {
  const drawn = drawnHelp(language, preference)
  const found = anchorsTo(drawn.help, DOWNLOAD_ADDRESS).filter((one) => one.textContent.trim() === linkWords('agentApi', language))
  if (found.length !== 1) throw new Error(`expected one IC-20 link to S-350 with the agentApi words, found ${found.length}`)
  return { ...drawn, anchor: found[0]! }
}

describe('DFC-3001 -- the manuscript these cases are driven by', () => {
  it('FR-036 still gives the IC-20 item a link to S-350, in the agentApi words, unparenthesised, in S-503', () => {
    expect(REQUIREMENTS).toContain(FR_036_IC_20_LINK)
    expect(REQUIREMENTS).toContain(FR_036_IC_20_WORDS)
    expect(REQUIREMENTS).toContain(FR_036_IC_20_UNPARENTHESISED)
    expect(REQUIREMENTS).toContain(FR_036_INK)
  })

  it('FR-036 and FR-069 name no note *1 (the help holds no footnote row)', () => {
    expect(requirementText('FR-036')).not.toContain(NOTE_MARK)
    expect(requirementText('FR-069')).not.toContain(NOTE_MARK)
  })

  it('FR-038 dictionary helpLinks agentApi is tied to IC-20 and holds the words the user chose', () => {
    const entry = (DICTIONARY.helpLinks ?? []).find((one) => one.link === 'agentApi')
    expect(entry?.rowId).toBe('IC-20')
    for (const language of LANGUAGES) expect(linkWords('agentApi', language)).toBe(AGENT_API_WORDS[language])
  })
})

describe('DFC-3001 -- FR-036 the IC-20 item in the help view', () => {
  it.each(LANGUAGES)('%s: the IC-20 item carries the agentApi words and S-350', (language) => {
    const items = helpOf(language).entries.filter((one) => one.row === 'IC-20')
    expect(items).toHaveLength(1)
    expect(items[0]?.link).toEqual({ words: linkWords('agentApi', language), address: DOWNLOAD_ADDRESS })
  })

  it.each(LANGUAGES)('%s: the IC-20 item text is its name only -- no parentheses, no note mark, no link words', (language) => {
    const text = helpOf(language).entries.find((one) => one.row === 'IC-20')?.text ?? ''
    expect(text).toBe(iconLabel('IC-20', language))
    expect(/[()（）]/.test(text)).toBe(false)
    expect(text).not.toContain(NOTE_MARK)
  })

  it.each(LANGUAGES)('%s: no item text carries the note mark', (language) => {
    const marked = helpOf(language).entries.filter((one) => one.text.includes(NOTE_MARK)).map((one) => one.row)
    expect(marked).toEqual([])
  })
})

describe('DFC-3001 -- FR-036 the IC-20 link as drawn, and no note row', () => {
  it.each(LANGUAGES)('%s: the link opens S-350 in a new tab and follows the IC-20 name in its own item', (language) => {
    const { help, anchor } = ic20LinkOf(language)
    expect(targetOf(anchor)).toBe('_blank')
    const item = nearestHolding(anchor, iconLabel('IC-20', language), help)
    expect(item).not.toBeNull()
    expect(item).not.toBe(help)
    const text = item!.textContent
    expect(text.indexOf(linkWords('agentApi', language))).toBeGreaterThan(text.indexOf(iconLabel('IC-20', language)))
    expect(text).not.toContain(linkWords('download', language))
    expect(/[()（）]/.test(text.split(linkWords('agentApi', language)).join(''))).toBe(false)
  })

  it.each(LANGUAGES)('%s: nothing in the drawn help carries the note mark or names the .mcpb bundle', (language) => {
    const { help } = drawnHelp(language)
    expect(help.textContent).not.toContain(NOTE_MARK)
    expect(help.textContent).not.toContain('.mcpb')
  })

  describe.each(LANGUAGES)('%s', (language) => {
    it.each(['light', 'dark'] as const)('%s theme: the IC-20 link is drawn in S-503 of that theme, underlined', (preference) => {
      const { built, help, anchor } = ic20LinkOf(language, preference)
      expect(inkOf(built, anchor, help)).toBe(LINK_INK[preference])
      expect(isUnderlined(anchor, help)).toBe(true)
    })
  })
})

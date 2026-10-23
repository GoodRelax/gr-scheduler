// DFC-3002 spec-only cases: FR-069 with FR-036 -- the Help copyright notice is a link to S-459 opening a new tab, drawn in the S-503 colour with an underline.

import { describe, expect, it } from 'vitest'

import type { DisplayLanguage } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  LANGUAGES,
  LINK_INK,
  REPOSITORY_ADDRESS,
  REQUIREMENTS,
  anchorsTo,
  drawnHelp,
  helpOf,
  inkOf,
  isUnderlined,
  targetOf,
} from './dfc-3000-help-stage'

const FR_069_LINK = 'ヘルプは著作権表示とライセンスの名だけを常に見せ、著作権表示は本ソフトウェアのリポジトリへのリンクとし'
const FR_069_NEW_TAB =
  '⭐ 著作権表示を押したら、閲覧環境の新しいタブで、同書の 表 T-206 の `S-459`（本ソフトウェアのリポジトリの所）の頁を開くこと（MUST）'
const FR_069_SAME_SPELLING = '⭐ 著作権表示は、ヘルプの言語によらず原文の綴りのまま出すこと（MUST）'
const FR_036_INK =
  '⭐ ヘルプのリンク —— この 2 つ、`IC-20` の項目に添えるリンク、`FR-069` の著作権表示 —— の字は、`_assets/tbl-settings.md` の 表 T-236 の `S-503` の色で下線を引いて描くこと（MUST）'

const copyrightOf = (language: DisplayLanguage, preference: 'light' | 'dark' = 'light') => {
  const drawn = drawnHelp(language, preference)
  const found = anchorsTo(drawn.help, REPOSITORY_ADDRESS)
  if (found.length !== 1) throw new Error(`expected one link to S-459 ${REPOSITORY_ADDRESS}, found ${found.length}`)
  return { ...drawn, anchor: found[0]! }
}

describe('DFC-3002 -- the manuscript these cases are driven by', () => {
  it('FR-069 still makes the copyright notice a link to S-459 in a new tab, and FR-036 names it among the S-503 links', () => {
    expect(REQUIREMENTS).toContain(FR_069_LINK)
    expect(REQUIREMENTS).toContain(FR_069_NEW_TAB)
    expect(REQUIREMENTS).toContain(FR_069_SAME_SPELLING)
    expect(REQUIREMENTS).toContain(FR_036_INK)
  })

  it('T-206 S-459 is an https address', () => {
    expect(REPOSITORY_ADDRESS).toMatch(/^https:\/\/\S+$/)
  })
})

describe('DFC-3002 -- FR-069 the copyright link as drawn', () => {
  it.each(LANGUAGES)('%s: one link to S-459 whose words are the copyright notice, opening a new tab', (language) => {
    const { anchor } = copyrightOf(language)
    expect(anchor.textContent.trim()).toBe(helpOf(language).copyrightNotice.trim())
    expect(targetOf(anchor)).toBe('_blank')
  })

  it('FR-069: the notice is spelled the same in both help languages', () => {
    expect(copyrightOf('ja').anchor.textContent).toBe(copyrightOf('en').anchor.textContent)
  })

  describe.each(LANGUAGES)('%s', (language) => {
    it.each(['light', 'dark'] as const)('%s theme: the copyright link is drawn in S-503 of that theme, underlined (FR-036)', (preference) => {
      const { built, help, anchor } = copyrightOf(language, preference)
      expect(inkOf(built, anchor, help)).toBe(LINK_INK[preference])
      expect(isUnderlined(anchor, help)).toBe(true)
    })
  })
})

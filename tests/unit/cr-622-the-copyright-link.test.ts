// CR-622 / FR-069: the help's copyright line is a link to S-459 that opens a new tab and hands over no referrer.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { linkElement } from '../../src/framework/dom-screen-surface/notices-drawing'
import { stage, type FakeElement } from '../fixtures/fake-browser'
import { unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const FR_069_NEW_TAB = '⭐ 著作権表示を押したら、閲覧環境の新しいタブで、同書の 表 T-206 の `S-459`（本ソフトウェアのリポジトリの所）の頁を開くこと（MUST）'
const FR_069_NO_REFERRER = '⛔ 開いた頁へは、`GRS` の頁への参照も参照元も渡してはならない（MUST NOT）'
const FR_069_NOT_TRANSLATED = '⭐ 著作権表示は、ヘルプの言語によらず原文の綴りのまま出すこと（MUST）'

const ADDRESS = 'https://example.invalid/repository'
const NOTICE = 'Copyright 2026 Someone'

const linkOf = (words?: string): FakeElement =>
  linkElement(stage().host as unknown as Document, ADDRESS, words) as unknown as FakeElement

describe('FR-069 -- the copyright is a link of its own words', () => {
  it('the manuscript still says it', () => {
    for (const clause of [FR_069_NEW_TAB, FR_069_NO_REFERRER, FR_069_NOT_TRANSLATED]) expect(REQUIREMENTS).toContain(clause)
  })

  it('opens the address in a new tab, with no opener and no referrer, showing the notice as written', () => {
    const link = linkOf(NOTICE)
    expect(link.getAttribute('href'), FR_069_NEW_TAB).toBe(ADDRESS)
    expect(link.getAttribute('target'), FR_069_NEW_TAB).toBe('_blank')
    expect((link.getAttribute('rel') ?? '').split(' ').sort(), FR_069_NO_REFERRER).toEqual(['noopener', 'noreferrer'])
    expect(link.textContent, FR_069_NOT_TRANSLATED).toBe(NOTICE)
  })

  it('shows the address itself when no words are given, as the FR-073 links do', () => {
    expect(linkOf().textContent).toBe(ADDRESS)
  })
})

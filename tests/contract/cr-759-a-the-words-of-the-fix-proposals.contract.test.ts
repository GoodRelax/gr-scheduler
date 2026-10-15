// CR-759 spec-only cases: the words of the fix proposals -- tab words, FM-1 / FM-3 headings, the count, the footer entries, the notices -- in ja and en

import { describe, expect, it } from 'vitest'

import { ACTUAL_AGAINST_LINK, MIXED, ONE_PARENT } from './cr-731-documents'
import { PROPOSALS_ROLE } from './cr-731-shell'
import { REQUIREMENTS, proposed } from './cr-731-stage'
import { RW_12_LEFT_PACKED_ORDER } from './cr-759-clauses'
import {
  LANGUAGES,
  columnWord,
  countText,
  entryLabel,
  filled,
  fixWord,
  footerOf,
  needEntry,
  proposalsOpened,
  wordsOf,
  type Language,
} from './cr-759-stage'
import { selfAndDescendants } from '../fixtures/fake-browser'
import type { WindowStage } from './cr-731-window-stage'

const headingsOf = (stage: WindowStage): string[] =>
  selfAndDescendants(stage.need(PROPOSALS_ROLE))
    .filter((one) => one.tagName === 'TH')
    .map((one) => one.textContent.trim())

const fixedOnce = async (language: Language): Promise<WindowStage> => {
  const stage = await proposalsOpened(ONE_PARENT(), language)
  stage.browser.toSave.push(stage.file('chosen.json', new Uint8Array(0)))
  await stage.press('IC-157')
  expect(stage.written, 'premise: the file was written, so the bundle went out').toEqual(['chosen.json'])
  return stage
}

describe('CR-759 the manuscript these cases read', () => {
  it('RW-12 still names the count and the three entries of the band, in that order', () => {
    expect(REQUIREMENTS).toContain(RW_12_LEFT_PACKED_ORDER)
  })
})

describe.each(LANGUAGES)('RW-11 / RW-12 / RW-14 / RW-17 / T-374 -- the words the window draws are the words of the dictionary (%s)', (language) => {
  it('the premise: the window speaks the language of the case (IC-154 reads its own label)', async () => {
    const stage = await proposalsOpened(ONE_PARENT(), language)
    expect(wordsOf(needEntry(stage, 'IC-154'))).toContain(entryLabel('IC-154', language))
  })

  it('the tab of the proposals reads the word of IC-155 with the number of rows in brackets', async () => {
    const stage = await proposalsOpened(ONE_PARENT(), language)
    const text = wordsOf(needEntry(stage, 'IC-155'))
    expect(text).toContain(entryLabel('IC-155', language))
    expect(needEntry(stage, 'IC-155').textContent).toMatch(new RegExp(`[(（]${String(proposed(ONE_PARENT()).length)}[)）]`))
  })

  it('the tab of the log, once there is a log, reads the word of IC-156', async () => {
    const stage = await fixedOnce(language)
    expect(wordsOf(needEntry(stage, 'IC-156'))).toContain(entryLabel('IC-156', language))
  })

  it('the headings of FM-1 and FM-3 read the words of delayFixColumns', async () => {
    const stage = await proposalsOpened(ONE_PARENT(), language)
    const headings = headingsOf(stage)
    expect(headings).toContain(columnWord('FM-1', language))
    expect(headings).toContain(columnWord('FM-3', language))
  })

  it('the count reads fixCount with the number of ticked rows', async () => {
    const stage = await proposalsOpened(ONE_PARENT(), language)
    expect(footerOf(stage).textContent).toContain(countText(1, language))
  })

  it.each(['IC-166', 'IC-157', 'IC-158'])('the footer entry %s carries its label', async (icon) => {
    const stage = await proposalsOpened(ONE_PARENT(), language)
    const entry = selfAndDescendants(footerOf(stage)).find((one) => one.getAttribute('data-icon') === icon)
    expect(entry, `${icon} stands in the footer band`).toBeDefined()
    expect(wordsOf(entry!)).toContain(entryLabel(icon, language))
  })

  it('the fix type of a machine row and of a row by hand read automatic and byHand, and the hand row says to click the name', async () => {
    const machine = await proposalsOpened(ONE_PARENT(), language)
    expect(machine.need(PROPOSALS_ROLE).textContent).toContain(fixWord('automatic', language))
    const hand = await proposalsOpened(ACTUAL_AGAINST_LINK(), language)
    expect(hand.need(PROPOSALS_ROLE).textContent).toContain(fixWord('byHand', language))
    expect(hand.need(PROPOSALS_ROLE).textContent).toContain(fixWord('openFieldHint', language))
  })

  it('the counter of the rows for a person reads humanCounter', async () => {
    const document = MIXED()
    const stage = await proposalsOpened(document, language)
    const m = proposed(document).filter((one) => one.fixType !== 'automatic').length
    expect(stage.window()!.textContent).toContain(filled(fixWord('humanCounter', language), { k: 0, m }))
  })

  it('after a fix the band reads fixedNotice with the number of rows the bundle mended', async () => {
    const stage = await fixedOnce(language)
    expect(footerOf(stage).textContent).toContain(filled(fixWord('fixedNotice', language), { n: 1 }))
  })

  it.todo('a refused bundle reads refusedNotice: no document in reach has a bundle a command refuses (DFC-730 -- GP-1 is not enforced on the write path)')
})

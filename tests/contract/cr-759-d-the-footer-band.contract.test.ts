// CR-759 spec-only cases: the footer band is left-packed count, IC-166, IC-157, IC-158, and the RW-17 notice takes a line of its own under them

import { describe, expect, it } from 'vitest'

import { ONE_PARENT } from './cr-731-documents'
import { REQUIREMENTS } from './cr-731-stage'
import type { WindowStage } from './cr-731-window-stage'
import { RW_12_LEFT_PACKED_ORDER, RW_12_NOTICE_LINE, RW_17_ONE_LINE_TALLER, RW_17_UNDER_AT_THE_LEFT } from './cr-759-clauses'
import {
  commonAncestor,
  countElement,
  documentOrder,
  filled,
  fixWord,
  footerEntry,
  footerOf,
  isFlex,
  noticeOf,
  proposalsOpened,
  styleOf,
} from './cr-759-stage'
import { selfAndDescendants, type FakeElement } from '../fixtures/fake-browser'

const ENTRIES = ['IC-166', 'IC-157', 'IC-158'] as const
const SPREAD = ['space-between', 'space-around', 'space-evenly', 'center', 'flex-end', 'end', 'right']
const NOT_LEFT = ['center', 'flex-end', 'end', 'right']

function itemsOf(stage: WindowStage, n: number): FakeElement[] {
  const count = countElement(stage, n)
  expect(count, `the band shows ${fixWordCount(n)} as one piece of text`).not.toBeNull()
  const entries = ENTRIES.map((icon) => {
    const entry = footerEntry(stage, icon)
    expect(entry, `${icon} stands in the band`).not.toBeNull()
    return entry!
  })
  return [count!, ...entries]
}

const fixWordCount = (n: number): string => filled(fixWord('fixCount'), { n })

const fixedOnce = async (): Promise<WindowStage> => {
  const stage = await proposalsOpened(ONE_PARENT())
  stage.browser.toSave.push(stage.file('chosen.json', new Uint8Array(0)))
  await stage.press('IC-157')
  expect(stage.written, 'premise: the file was written, so the bundle went out').toEqual(['chosen.json'])
  return stage
}

const runsDown = (element: FakeElement): boolean => {
  if (isFlex(element)) return styleOf(element, 'flex-direction') === 'column'
  if (styleOf(element, 'display') === 'grid') return styleOf(element, 'grid-template-columns') === '' && styleOf(element, 'grid-auto-flow') !== 'column'
  return true
}

describe('CR-759 the manuscript these cases read', () => {
  it('RW-12 and RW-17 still place the count and the three entries left-packed, and the notice on a line under them', () => {
    for (const clause of [RW_12_LEFT_PACKED_ORDER, RW_12_NOTICE_LINE, RW_17_UNDER_AT_THE_LEFT, RW_17_ONE_LINE_TALLER]) {
      expect(REQUIREMENTS).toContain(clause)
    }
  })
})

describe('T-346 RW-12 -- the items of the band, from the left', () => {
  it('are the count, IC-166, IC-157 and IC-158, in that order', async () => {
    const stage = await proposalsOpened(ONE_PARENT())
    const at = itemsOf(stage, 1).map((one) => documentOrder(footerOf(stage), one))
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })

  it('are packed to the left: nothing in the band spreads them apart or pushes them right', async () => {
    const stage = await proposalsOpened(ONE_PARENT())
    itemsOf(stage, 1)
    for (const one of selfAndDescendants(footerOf(stage))) {
      expect(SPREAD, `justify-content of <${one.tagName.toLowerCase()}>`).not.toContain(styleOf(one, 'justify-content'))
      expect(styleOf(one, 'margin-left'), `margin-left of <${one.tagName.toLowerCase()}>`).not.toBe('auto')
      expect(styleOf(one, 'margin-inline-start'), `margin-inline-start of <${one.tagName.toLowerCase()}>`).not.toBe('auto')
    }
  })

  it('with no notice the band is one line: no notice, the four items laid side by side, and no other text', async () => {
    const stage = await proposalsOpened(ONE_PARENT())
    const items = itemsOf(stage, 1)
    expect(noticeOf(stage)).toBeNull()
    const line = commonAncestor(items)!
    expect(isFlex(line) && styleOf(line, 'flex-direction') !== 'column', 'the items share one row').toBe(true)
    let rest = footerOf(stage).textContent
    for (const one of items) rest = rest.replace(one.textContent, '')
    expect(rest.trim()).toBe('')
  })
})

describe('T-346 RW-17 -- the notice after a fix takes a line of its own under the entries, from the left', () => {
  it('is drawn as its own part of the band and reads fixedNotice', async () => {
    const stage = await fixedOnce()
    const notice = noticeOf(stage)
    expect(notice, 'the band holds the notice under data-role="Delay Fix Notice"').not.toBeNull()
    expect(notice!.textContent.trim()).toBe(filled(fixWord('fixedNotice'), { n: 1 }))
  })

  it('is not part of the count or of the entries, and the count reads the count alone', async () => {
    const stage = await fixedOnce()
    const items = itemsOf(stage, 0)
    const notice = noticeOf(stage)!
    for (const one of items) {
      expect(one.contains(notice), 'no item holds the notice').toBe(false)
      expect(notice.contains(one), 'the notice holds no item').toBe(false)
    }
    expect(items[0]!.textContent.trim()).toBe(fixWordCount(0))
  })

  it('comes after IC-158 and sits under the line of the entries, not beside it', async () => {
    const stage = await fixedOnce()
    const items = itemsOf(stage, 0)
    const notice = noticeOf(stage)!
    expect(documentOrder(footerOf(stage), notice)).toBeGreaterThan(documentOrder(footerOf(stage), items[3]!))
    const holder = commonAncestor([...items, notice])!
    const line = holder.children.find((one) => one.contains(items[3]!))!
    expect(line, 'the entries are on a line of their own inside the band').not.toBe(notice)
    expect(items.every((one) => line.contains(one)), 'the count and the entries share that line').toBe(true)
    const wrapsFull = styleOf(holder, 'flex-wrap') === 'wrap' && ['100%'].includes(styleOf(notice, 'flex-basis') || styleOf(notice, 'width'))
    expect(runsDown(holder) || wrapsFull, 'the band lays the notice under the entries').toBe(true)
  })

  it('starts at the left end of the band', async () => {
    const stage = await fixedOnce()
    const items = itemsOf(stage, 0)
    const notice = noticeOf(stage)!
    const holder = commonAncestor([...items, notice])!
    if (isFlex(holder)) expect(NOT_LEFT, 'align-items of the band').not.toContain(styleOf(holder, 'align-items'))
    expect(NOT_LEFT, 'align-self of the notice').not.toContain(styleOf(notice, 'align-self'))
    expect(NOT_LEFT, 'text-align of the notice').not.toContain(styleOf(notice, 'text-align'))
    expect(styleOf(notice, 'margin-left')).not.toBe('auto')
  })
})

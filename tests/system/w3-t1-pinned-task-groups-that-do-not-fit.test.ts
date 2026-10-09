// W3 spec-only case on the shipped build: FR-098 -- pinned rows that do not fit on the screen are not drawn, and none is drawn cut.

import { expect, test, type Browser } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import { openDocument, openStage } from './cr-570-tree-state-stage'
import { rowIdOf, taskGroupsDocument } from './w3-t1-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: the constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const FR_098_NOT_DRAWN =
  'それ以外の理由で描くのをやめてはならない（MUST NOT）。⭐ **入りきらないときが要るのは、無いと本行が同じ要求の「入りきらないタスクグループを描かないこと（MUST）'
const FR_098_RULE = '⭐ ピン止めしたタスクグループが画面に収まらないときは、入りきらないタスクグループを描かないこと（MUST）'

const PINNED = [0, 1, 2, 3, 4].map(rowIdOf)

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

test.describe('W3-T1 the manuscript this case is driven by', () => {
  test('FR-098 still reads this way', () => {
    for (const clause of [FR_098_NOT_DRAWN, FR_098_RULE]) expect(REQUIREMENTS, clause).toContain(clause)
  })
})

test.describe(`FR-098 (MUST): ${FR_098_NOT_DRAWN.slice(-30)}`, () => {
  test.setTimeout(120_000)

  test('five pinned rows twenty times as tall as at zoom 1: the ones that fit are drawn whole, the rest not at all', async () => {
    if (browser === null) throw new Error('no browser')
    const opened = await openStage(browser)
    try {
      await openDocument(opened.page, 'w3-t1-pins.json', taskGroupsDocument({ rows: 10, settings: { zoomY: 20, pinnedGroupIds: PINNED } }))
      const drawn = await opened.page.evaluate((ids: readonly string[]) => {
        const svg = document.querySelector('[data-role="Schedule Canvas"] svg')
        const area = svg?.getBoundingClientRect()
        return ids.map((id) => {
          const band = svg?.querySelector(`[data-figure="row-${id}-band"]`)?.getBoundingClientRect() ?? null
          return { id, band: band === null ? null : { top: band.top, bottom: band.bottom }, areaBottom: area?.bottom ?? NaN }
        })
      }, PINNED)
      const shown = drawn.filter((one) => one.band !== null)
      expect(shown.length, 'premise: at least one pinned row fits').toBeGreaterThan(0)
      expect(shown.length, 'premise: five rows this tall cannot all fit').toBeLessThan(PINNED.length)
      expect(
        shown.map((one) => one.id),
        'the rows drawn are the first ones in pin order',
      ).toEqual(PINNED.slice(0, shown.length))
      for (const one of shown) {
        expect(one.band?.bottom ?? Infinity, `${one.id} is drawn whole, inside the canvas`).toBeLessThanOrEqual(one.areaBottom + 0.5)
      }
    } finally {
      await opened.close()
    }
  })
})

// CR-570 section 9 claims 12-13 on the shipped build: which rows T-329 draws, and when an entrance is armed (14.6, RS-28..RS-32).

import { expect, test, type Browser, type Page } from '@playwright/test'
import { specTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import {
  HEAD_FOLD_EVERY_ROW,
  HEAD_OPEN_EVERY_ROW,
  DEEP_ZOOM,
  REQUIREMENTS,
  SHALLOW_ZOOM,
  documentOf,
  type Arrangement,
  ROW_FOLD_ALL_BELOW,
  ROW_OPEN_ALL_BELOW,
  ROW_OPEN_ONE_LEVEL,
  drawnRowIds,
  isArmed,
  isRowEntranceArmed,
  openDocument,
  openStage,
  pressEntrance,
  pressRowEntrance,
  readTree,
  toldReason,
  type Stage,
} from './cr-570-tree-state-stage'

const T_329_DRAWS_WHEN =
  '行を描くのは、種類が「すべて要る」の行がすべて成り立ち、「どれか 1 つ」の行が 1 つでも成り立つときだけとすること（MUST）'
const HF_10_FAINT_WHEN = '描かれていない行（`FR-018` の 表 T-329）が 1 つも無いときだけ、`FR-029` に従って薄く描くこと（MUST）'

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity non-pure */
async function openArranged(arranged: Arrangement): Promise<Stage> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const stage = await openStage(browser)
  await openDocument(stage.page, 'arranged.json', documentOf(arranged))
  const reading = await readTree(stage.page)
  expect(reading.zoomY, 'premise: the file zoom is kept (OP-10 does not fit a placed file)').toBe(arranged.zoomY)
  return stage
}

/** @purity non-pure */
async function drawnSorted(page: Page): Promise<string[]> {
  return [...(await drawnRowIds(page))].sort()
}

test('the manuscript: table T-329 and the HF-10 faint rule this file presses', () => {
  expect(REQUIREMENTS).toContain(T_329_DRAWS_WHEN)
  expect(REQUIREMENTS).toContain(HF_10_FAINT_WHEN)
  const kinds = specTable('T-329').rows.map((row) => `${row.id}`)
  expect(kinds).toEqual(['TD-1', 'TD-2', 'TD-3', 'TD-4', 'TD-5', 'TD-6', 'TD-7'])
})

const DRAWING_CASES: readonly { readonly name: string; readonly arranged: Arrangement; readonly drawn: readonly string[] }[] = [
  {
    name: 'TD-4: every depth within the zoom is drawn',
    arranged: { zoomY: DEEP_ZOOM },
    drawn: ['T1', 'T1a', 'T1a1', 'T1a1x', 'T1b', 'T2', 'T2a', 'T3'],
  },
  {
    name: 'TD-4: only depth 1 below the depth-2 threshold',
    arranged: { zoomY: SHALLOW_ZOOM },
    drawn: ['T1', 'T2', 'T3'],
  },
  {
    name: 'TD-7: an expanded deep row keeps its ancestors and itself, TD-6 its children',
    arranged: { zoomY: SHALLOW_ZOOM, states: { T1a1: 'expanded' } },
    drawn: ['T1', 'T1a', 'T1a1', 'T1a1x', 'T2', 'T3'],
  },
  {
    name: 'TD-6: a temporarilyExpanded parent draws its children',
    arranged: { zoomY: SHALLOW_ZOOM, states: { T2: 'temporarilyExpanded' } },
    drawn: ['T1', 'T2', 'T2a', 'T3'],
  },
  {
    name: 'TD-3 beats TD-7: a collapsed ancestor hides an expanded row',
    arranged: { zoomY: SHALLOW_ZOOM, states: { T1: 'collapsed', T1a1: 'expanded' } },
    drawn: ['T1', 'T2', 'T3'],
  },
  {
    name: 'TD-2 beats TD-6: a hidden child of an expanded row is not drawn',
    arranged: { zoomY: SHALLOW_ZOOM, states: { T1: 'expanded', T1a: 'hidden' } },
    drawn: ['T1', 'T1b', 'T2', 'T3'],
  },
  {
    name: 'TD-3 beats TD-4: a hidden row takes its subtree even at the deep zoom',
    arranged: { zoomY: DEEP_ZOOM, states: { T1a: 'hidden' } },
    drawn: ['T1', 'T1b', 'T2', 'T2a', 'T3'],
  },
  {
    name: 'TD-1: a collapsed level zero draws no row, expanded ones included',
    arranged: { zoomY: DEEP_ZOOM, levelZero: 'collapsed', states: { T1: 'expanded' } },
    drawn: [],
  },
  {
    name: 'TD-5: a pinned deep row is drawn',
    arranged: { zoomY: SHALLOW_ZOOM, pinned: ['T1a1'] },
    drawn: ['T1', 'T1a1', 'T2', 'T3'],
  },
]

test.describe('claim 12: table T-329, row by row', () => {
  test.describe.configure({ timeout: 180_000 })
  for (const one of DRAWING_CASES) {
    // WHY: red if the panel draws a row T-329 does not, or leaves out one it does.
    test(one.name, async () => {
      const stage = await openArranged(one.arranged)
      try {
        expect(await drawnSorted(stage.page), T_329_DRAWS_WHEN).toEqual([...one.drawn].sort())
      } finally {
        await stage.close()
      }
    })
  }
})

test.describe('claim 13: when an entrance is armed (CR-570 14.6), and the reason a faint press tells', () => {
  test.describe.configure({ timeout: 180_000 })

  // WHY: red if the head [vv] stays armed with every row drawn, or a faint press changes the file.
  test('HF-10 / RS-31: every row drawn and nothing folded -- the head [vv] is faint and tells RS-31', async () => {
    const stage = await openArranged({ zoomY: DEEP_ZOOM })
    try {
      const { page } = stage
      const before = JSON.stringify(await readTree(page))
      expect(await isArmed(page, HEAD_OPEN_EVERY_ROW), HF_10_FAINT_WHEN).toBe(false)
      await pressEntrance(page, HEAD_OPEN_EVERY_ROW)
      expect(await toldReason(page, 'RS-31'), 'FR-029: the faint press tells RS-31').toBe(true)
      expect(JSON.stringify(await readTree(page)), 'FR-029: the faint press changes nothing').toBe(before)
    } finally {
      await stage.close()
    }
  })

  // WHY: red if the head [vv] stays faint while the zoom alone hides rows -- the change JDG-591 made.
  test('HF-10: nothing folded but the zoom drops depth 2 -- the head [vv] is armed', async () => {
    const stage = await openArranged({ zoomY: SHALLOW_ZOOM })
    try {
      expect(await isArmed(stage.page, HEAD_OPEN_EVERY_ROW), HF_10_FAINT_WHEN).toBe(true)
    } finally {
      await stage.close()
    }
  })

  // WHY: red if [^^] is armed on a row whose children are all undrawn.
  test('HF-11 / RS-29: a row with no drawn child -- [^^] is faint and tells RS-29', async () => {
    const stage = await openArranged({ zoomY: SHALLOW_ZOOM })
    try {
      const { page } = stage
      expect(await isRowEntranceArmed(page, 'T1', ROW_FOLD_ALL_BELOW), 'RS-29: T1 draws no child').toBe(false)
      await pressRowEntrance(page, 'T1', ROW_FOLD_ALL_BELOW)
      expect(await toldReason(page, 'RS-29')).toBe(true)
    } finally {
      await stage.close()
    }
  })

  // WHY: red if [v] is armed when the zoom already draws every child, or [vv] on a leaf.
  test('HF-13 / RS-30 and HF-2 / RS-28: nothing to bring back -- [v] and [vv] are faint and tell their reasons', async () => {
    const stage = await openArranged({ zoomY: DEEP_ZOOM })
    try {
      const { page } = stage
      expect(await isRowEntranceArmed(page, 'T2', ROW_OPEN_ONE_LEVEL), 'RS-30: T2a is drawn by the zoom').toBe(false)
      await pressRowEntrance(page, 'T2', ROW_OPEN_ONE_LEVEL)
      expect(await toldReason(page, 'RS-30')).toBe(true)
      expect(await isRowEntranceArmed(page, 'T3', ROW_OPEN_ALL_BELOW), 'RS-28: T3 has nothing below').toBe(false)
      await pressRowEntrance(page, 'T3', ROW_OPEN_ALL_BELOW)
      expect(await toldReason(page, 'RS-28')).toBe(true)
    } finally {
      await stage.close()
    }
  })

  // WHY: red if [v] is faint over children drawn only because of temporarilyExpanded (decision 5).
  test('HF-13: children drawn only by temporarilyExpanded -- [v] is armed', async () => {
    const stage = await openArranged({ zoomY: SHALLOW_ZOOM, states: { T2: 'temporarilyExpanded' } })
    try {
      expect(await drawnSorted(stage.page), 'premise: T2a is drawn').toContain('T2a')
      expect(await isRowEntranceArmed(stage.page, 'T2', ROW_OPEN_ONE_LEVEL)).toBe(true)
    } finally {
      await stage.close()
    }
  })

  // WHY: red if the head [^^] is armed with level zero already folded.
  test('HF-12 / RS-32: level zero folded -- the head [^^] is faint and tells RS-32', async () => {
    const stage = await openArranged({ zoomY: DEEP_ZOOM, levelZero: 'collapsed' })
    try {
      const { page } = stage
      expect(await isArmed(page, HEAD_FOLD_EVERY_ROW), 'RS-32').toBe(false)
      await pressEntrance(page, HEAD_FOLD_EVERY_ROW)
      expect(await toldReason(page, 'RS-32')).toBe(true)
      expect(await isArmed(page, HEAD_OPEN_EVERY_ROW), 'HF-10: a folded level zero leaves rows undrawn').toBe(true)
    } finally {
      await stage.close()
    }
  })
})

// CR-570 on the shipped build: a pasted row subtree keeps collapsed and hidden and drops the open marks (DU-2, FR-033).

import { expect, test, type Browser } from '@playwright/test'
import { specTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import {
  DEEP_ZOOM,
  REQUIREMENTS,
  chooseRow,
  documentOf,
  openDocument,
  openStage,
  pressKey,
  readTree,
  type TreeState,
} from './cr-570-tree-state-stage'

const DU_2_TREE_STATE =
  '複製した各行の `treeState`（`FR-018` の 表 T-329、`_assets/tbl-state-machines.md` の 表 T-328）は、複製元が `collapsed` か `hidden` ならその値とし、`expanded` か `temporarilyExpanded` なら `auto` とすること（MUST）'

// WHY: S is the copied row; below it every value of AT-153 is held at least once.
const TREE: readonly { readonly id: string; readonly parentId: string | null }[] = [
  { id: 'S', parentId: null },
  { id: 'E', parentId: 'S' },
  { id: 'E1', parentId: 'E' },
  { id: 'X', parentId: 'S' },
  { id: 'X1', parentId: 'X' },
  { id: 'H', parentId: 'S' },
  { id: 'H1', parentId: 'H' },
  { id: 'T', parentId: null },
]
const SOURCE_STATES: Readonly<Record<string, TreeState>> = {
  E: 'expanded',
  X: 'temporarilyExpanded',
  X1: 'collapsed',
  H: 'hidden',
  H1: 'collapsed',
}

/** @purity pure */
function copiedValue(source: TreeState): TreeState {
  return source === 'expanded' || source === 'temporarilyExpanded' ? 'auto' : source
}

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

test('the manuscript: DU-2 of table T-223 rules the tree state of a copied row', () => {
  expect(REQUIREMENTS).toContain(DU_2_TREE_STATE)
  expect(specTable('T-223').rows.find((row) => row.id === 'DU-2')?.cells.join(' ')).toContain('treeState')
})

// WHY: red if a copy carries expanded or temporarilyExpanded, drops collapsed or hidden, or the
// paste rewrites a source row.
test('DU-2: the copy of a subtree keeps collapsed and hidden, turns expanded and temporarilyExpanded to auto', async () => {
  test.setTimeout(240_000)
  if (browser === null) throw new Error('the reference browser was not opened')
  const stage = await openStage(browser)
  try {
    const { page } = stage
    await openDocument(page, 'arranged.json', documentOf({ zoomY: DEEP_ZOOM, tree: TREE, states: SOURCE_STATES }))
    const before = await readTree(page)
    expect(before.rows.map((row) => row.treeState), 'premise: all five values are held').toEqual(
      expect.arrayContaining(['auto', 'collapsed', 'expanded', 'temporarilyExpanded', 'hidden']),
    )
    // STEP: choose S, copy, paste
    await chooseRow(page, 'S')
    await pressKey(page, 'SK-4')
    await pressKey(page, 'SK-5')
    const after = await readTree(page)
    const sources = new Set(TREE.map((row) => row.id))
    const copies = after.rows.filter((row) => !sources.has(row.id))
    expect(copies.map((row) => row.label).sort(), 'FR-033: the whole subtree of S was copied').toEqual(
      TREE.filter((row) => row.id !== 'T').map((row) => `Row ${row.id}`).sort(),
    )
    for (const copy of copies) {
      const source = before.rows.find((row) => row.label === copy.label)
      if (source === undefined) throw new Error(`no source row for the copy ${copy.label}`)
      expect(copy.treeState, `${DU_2_TREE_STATE}: the copy of ${copy.label}`).toBe(copiedValue(source.treeState))
    }
    for (const source of before.rows) {
      expect(after.rows.find((row) => row.id === source.id)?.treeState, `the source ${source.label} is unchanged`).toBe(source.treeState)
    }
  } finally {
    await stage.close()
  }
})

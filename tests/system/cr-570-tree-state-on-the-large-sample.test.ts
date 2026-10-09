// CR-570 section 9 claims 1-10 on the shipped build with sample-large-erp-program.ja.xml (T-328, T-329).

import { expect, test, type Browser, type Page } from '@playwright/test'
import { specTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import {
  DATE_ZOOM_IN,
  DATE_ZOOM_OUT,
  ERP_PROGRAM_TASK_GROUP,
  ERP_SAMPLE,
  FIT,
  HEAD_FOLD_EVERY_TASK_GROUP,
  HEAD_OPEN_EVERY_TASK_GROUP,
  HEAD_OPEN_TOP_LEVEL,
  REQUIREMENTS,
  SHALLOW_ZOOM,
  TASK_GROUP_FOLD_ALL_BELOW,
  TASK_GROUP_HIDE,
  TASK_GROUP_OPEN_ALL_BELOW,
  TASK_GROUP_OPEN_ONE_LEVEL,
  VERTICAL_ZOOM_ENLARGE,
  VERTICAL_ZOOM_SHRINK,
  UNDO,
  childrenOf,
  documentOf,
  drawnRowIds,
  isArmed,
  isTaskGroupEntranceArmed,
  isLeaf,
  openDocument,
  openStage,
  pressEntrance,
  pressKey,
  pressRowEntrance,
  readTree,
  taskGroupNamed,
  saveDocument,
  settle,
  shrinkToTheEnd,
  stateOf,
  wouldWarn,
  type Arrangement,
  type Stage,
  type TreeReading,
} from './cr-570-tree-state-stage'

const HF_2_BY_T_328 =
  '押したときにタスクグループが取る値は、`_assets/tbl-state-machines.md` の 表 T-328 の `allBelowOpenPressed` の行に従うこと（MUST）'
const HF_3_BY_T_328 = '隠すときにタスクグループが取る値は `_assets/tbl-state-machines.md` の 表 T-328 の `hidePressed` の行に従うこと（MUST）'
const HF_8_BY_T_328 =
  '人が全体表示（`FR-055`）を求めたとき、タスクグループと段 0 の値を `_assets/tbl-state-machines.md` の 表 T-328 の `fitPressed` の行と根の升に従って戻すこと（MUST）'
const HF_10_BY_T_328 = '押したときにタスクグループと段 0 が取る値は 表 T-328 の `everyTaskGroupOpenPressed` の行と根の升に従うこと（MUST）'
const HF_11_BY_T_328 = '畳むときにタスクグループが取る値は 表 T-328 の `allBelowFoldPressed` の行に従うこと（MUST）'
const HF_13_BY_T_328 = '押したタスクグループと隠した直下の子が取る値は 表 T-328 の `oneLevelOpenPressed` の行に従うこと（MUST）'
const FR_031_SHRINK_WRITES_TWICE = '縦軸を縮める 1 回の入力も、同じ形で 2 つの書き込みに分けること（MUST）'

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

// see OP-3, FR-055
// WHY: the sample holds two levels only, so the claims that need a third open the four-level
// tree of the stage instead (T1 > T1a > T1a1 > T1a1x).
/** @purity non-pure */
async function openArranged(arranged: Arrangement): Promise<Stage> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const stage = await openStage(browser)
  await openDocument(stage.page, 'arranged.json', documentOf(arranged))
  return stage
}

// WHY: the picture OP-10 draws on opening, with no fit pressed -- the zoom the fit chose is the
// current one (FR-055), which the cases below start from.
/** @purity non-pure */
async function openTheSampleAsOpened(): Promise<Stage> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const stage = await openStage(browser)
  await openDocument(stage.page, 'sample-large-erp-program.ja.xml', ERP_SAMPLE)
  return stage
}

/** @purity non-pure */
async function openTheSample(): Promise<Stage> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const stage = await openStage(browser)
  await openDocument(stage.page, 'sample-large-erp-program.ja.xml', ERP_SAMPLE)
  await pressEntrance(stage.page, FIT)
  return stage
}

/** @purity pure */
function withState(reading: TreeReading, wanted: string): string[] {
  return reading.rows.filter((row) => row.treeState === wanted).map((row) => row.id)
}

// WHY: the picture where only depth 1 is drawn, so a task group's children are drawn only if a tree value
// asks for them (TD-6 / TD-7) -- the setting the one-level entrance of decision 5 needs.
/** @purity non-pure */
async function toTheShallowestPicture(page: Page): Promise<void> {
  await shrinkToTheEnd(page)
  const reading = await readTree(page)
  const drawn = await drawnRowIds(page)
  const deep = drawn.filter((id) => reading.rows.find((row) => row.id === id)?.parentId !== null)
  expect(deep, 'premise: at the shrinking end only depth 1 is drawn (FR-018, FR-016 ZE-1)').toEqual([])
}

test('the manuscript: HF-2, HF-3, HF-8, HF-10, HF-11, HF-13 send their values to table T-328', () => {
  const said = (id: string): string => specTable('T-051').rows.find((row) => row.id === id)?.cells.join(' ') ?? ''
  expect(REQUIREMENTS).toContain(HF_2_BY_T_328)
  expect(REQUIREMENTS).toContain(HF_3_BY_T_328)
  expect(REQUIREMENTS).toContain(HF_8_BY_T_328)
  expect(REQUIREMENTS).toContain(HF_10_BY_T_328)
  expect(REQUIREMENTS).toContain(HF_11_BY_T_328)
  expect(REQUIREMENTS).toContain(HF_13_BY_T_328)
  expect(REQUIREMENTS).toContain(FR_031_SHRINK_WRITES_TWICE)
  expect(said('HF-10')).toContain('everyTaskGroupOpenPressed')
})

test.describe('CR-570 section 9 on sample-large-erp-program.ja.xml', () => {
  test.describe.configure({ timeout: 300_000 })

  // WHY: red if the head [vv] is faint while the zoom hides task groups, or it moves the zoom, or it
  // rewrites an expanded task group.
  test('claim 1: while the zoom drops the deep tiers the head [vv] is armed, draws every task group, keeps the zoom and the expanded task groups', async () => {
    const stage = await openTheSample()
    try {
      const { page } = stage
      const program = taskGroupNamed(await readTree(page), ERP_PROGRAM_TASK_GROUP)
      await toTheShallowestPicture(page)
      // STEP: one expanded task group before the press, so the press is seen to leave it alone
      await pressRowEntrance(page, program.id, TASK_GROUP_OPEN_ONE_LEVEL)
      expect(stateOf(await readTree(page), program.id), 'HF-13 / T-328: [v] gives expanded').toBe('expanded')
      const before = await readTree(page)
      expect(await isArmed(page, HEAD_OPEN_EVERY_TASK_GROUP), 'HF-10: task groups the zoom does not draw arm the head [vv]').toBe(true)
      // STEP: the head [vv]
      await pressEntrance(page, HEAD_OPEN_EVERY_TASK_GROUP)
      const after = await readTree(page)
      expect(after.zoomY, 'HF-10: the zoom does not move').toBe(before.zoomY)
      expect(await isArmed(page, HEAD_OPEN_EVERY_TASK_GROUP), 'HF-10 / RS-31: every task group is drawn now').toBe(false)
      for (const row of after.rows) {
        const was = stateOf(before, row.id)
        const wanted = was === 'expanded' || was === 'temporarilyExpanded' ? was : isLeaf(after, row.id) ? 'auto' : 'temporarilyExpanded'
        expect(row.treeState, `T-328 everyTaskGroupOpenPressed: ${row.label} from ${was}`).toBe(wanted)
      }
    } finally {
      await stage.close()
    }
  })

  // WHY: red if a task group [vv] leaves a non-leaf descendant auto, or rewrites an expanded one.
  test('claim 2: a task group [vv] draws its whole subtree; non-leaf descendants become temporarilyExpanded, expanded ones stay', async () => {
    const stage = await openArranged({ zoomY: SHALLOW_ZOOM })
    try {
      const { page } = stage
      await pressRowEntrance(page, 'T1', TASK_GROUP_OPEN_ONE_LEVEL)
      await pressRowEntrance(page, 'T1a', TASK_GROUP_OPEN_ONE_LEVEL)
      expect(stateOf(await readTree(page), 'T1a'), 'premise: T1a is expanded').toBe('expanded')
      expect(await isTaskGroupEntranceArmed(page, 'T1', TASK_GROUP_OPEN_ALL_BELOW), 'HF-2: undrawn task groups below arm the task group [vv]').toBe(true)
      // STEP: the task group [vv] on T1
      await pressRowEntrance(page, 'T1', TASK_GROUP_OPEN_ALL_BELOW)
      const after = await readTree(page)
      expect(stateOf(after, 'T1'), 'T-328: [vv] leaves an expanded pressed task group').toBe('expanded')
      expect(stateOf(after, 'T1a'), 'T-328: [vv] leaves an expanded descendant').toBe('expanded')
      expect(stateOf(after, 'T1a1'), 'T-328: a non-leaf descendant becomes temporarilyExpanded').toBe('temporarilyExpanded')
      expect(stateOf(after, 'T1a1x'), 'T-328: a leaf stays auto').toBe('auto')
      expect(stateOf(after, 'T1b'), 'T-328: a leaf stays auto').toBe('auto')
      expect([...(await drawnRowIds(page))].sort(), 'T-329: the whole subtree is drawn').toEqual(['T1', 'T1a', 'T1a1', 'T1a1x', 'T1b', 'T2', 'T3'])
      expect(await isTaskGroupEntranceArmed(page, 'T1', TASK_GROUP_OPEN_ALL_BELOW), 'HF-2 / RS-28: nothing below is undrawn now').toBe(false)
    } finally {
      await stage.close()
    }
  })

  // WHY: red if a shrink leaves a temporarilyExpanded task group or draws more than the zoom picture of the
  // fit, which already holds every task group the smaller zoom can draw (FR-018 monotonic).
  test('claim 3: one shrink after the head [vv] returns every temporarilyExpanded task group to auto', async () => {
    const stage = await openTheSample()
    try {
      const { page } = stage
      const atFit = await drawnRowIds(page)
      expect(await isArmed(page, HEAD_OPEN_EVERY_TASK_GROUP), 'premise: the fit picture leaves task groups undrawn').toBe(true)
      await pressEntrance(page, HEAD_OPEN_EVERY_TASK_GROUP)
      // STEP: one shrink
      await pressEntrance(page, VERTICAL_ZOOM_SHRINK)
      const after = await readTree(page)
      expect(withState(after, 'temporarilyExpanded'), 'T-328 verticalZoomShrinkPressed: none left').toEqual([])
      const beyond = (await drawnRowIds(page)).filter((id) => !atFit.includes(id))
      expect(beyond, 'T-329: nothing is drawn beyond the zoom picture').toEqual([])
    } finally {
      await stage.close()
    }
  })

  // WHY: red if [v] is faint over children drawn only by temporarilyExpanded (decision 5), or the
  // shrink takes the expanded task group's children away (TD-6), or draws another task group's children.
  test('claim 6: [v] after the head [vv] gives expanded, and its children stay after the shrink', async () => {
    const stage = await openTheSample()
    try {
      const { page } = stage
      await toTheShallowestPicture(page)
      const program = taskGroupNamed(await readTree(page), ERP_PROGRAM_TASK_GROUP)
      await pressEntrance(page, HEAD_OPEN_EVERY_TASK_GROUP)
      expect(await isTaskGroupEntranceArmed(page, program.id, TASK_GROUP_OPEN_ONE_LEVEL), 'HF-13: children drawn only by temporarilyExpanded arm [v]').toBe(true)
      // STEP: [v] on the program task group after the head [vv]
      await pressRowEntrance(page, program.id, TASK_GROUP_OPEN_ONE_LEVEL)
      expect(stateOf(await readTree(page), program.id), 'T-328: [v] on temporarilyExpanded gives expanded').toBe('expanded')
      // STEP: one shrink (at the ZE-2 end)
      await pressEntrance(page, VERTICAL_ZOOM_SHRINK)
      const after = await readTree(page)
      expect(withState(after, 'temporarilyExpanded'), 'T-328 verticalZoomShrinkPressed: none left').toEqual([])
      expect(stateOf(after, program.id), 'T-328: the shrink leaves expanded').toBe('expanded')
      const drawn = await drawnRowIds(page)
      for (const child of childrenOf(after, program.id)) {
        expect(drawn, `TD-6: ${child.label} is drawn under the expanded task group`).toContain(child.id)
      }
      const deep = drawn.filter((id) => {
        const parent = after.rows.find((row) => row.id === id)?.parentId ?? null
        return parent !== null && parent !== program.id
      })
      expect(deep, 'T-329: no other task group below depth 1 is drawn').toEqual([])
    } finally {
      await stage.close()
    }
  })

  // WHY: red if enlarging, zooming the dates or scrolling ends temporarilyExpanded, or the one
  // shrink after them does not.
  test('claim 4: enlarge, date zoom and scroll keep temporarilyExpanded; the next shrink ends it', async () => {
    const stage = await openTheSample()
    try {
      const { page } = stage
      await pressEntrance(page, HEAD_OPEN_EVERY_TASK_GROUP)
      const opened = withState(await readTree(page), 'temporarilyExpanded')
      expect(opened.length, 'premise: the head [vv] gave temporarilyExpanded task groups').toBeGreaterThan(0)
      await pressEntrance(page, VERTICAL_ZOOM_ENLARGE)
      await pressEntrance(page, DATE_ZOOM_IN)
      await pressEntrance(page, DATE_ZOOM_OUT)
      await page.mouse.move(1200, 600)
      await page.mouse.wheel(0, 400)
      await settle(page)
      expect(withState(await readTree(page), 'temporarilyExpanded'), 'T-328: A24 leaves the values').toEqual(opened)
      // STEP: one shrink
      await pressEntrance(page, VERTICAL_ZOOM_SHRINK)
      expect(withState(await readTree(page), 'temporarilyExpanded'), 'T-328 verticalZoomShrinkPressed').toEqual([])
    } finally {
      await stage.close()
    }
  })

  // WHY: red if a shrink at the ZE-2 end keeps temporarilyExpanded or moves the zoom, or a shrink
  // with nothing to end changes the document, marks it unsaved or stacks a step.
  test('claim 5: at the shrinking end a shrink still ends temporarilyExpanded, and with none it changes nothing', async () => {
    const stage = await openTheSample()
    try {
      const { page } = stage
      const end = await shrinkToTheEnd(page)
      await saveDocument(page)
      expect(await wouldWarn(page), 'premise: saved, so nothing is unsaved').toBe(false)
      const clean = JSON.stringify(await readTree(page))
      const undoBefore = await isArmed(page, UNDO)
      // STEP: a shrink at the end with no temporarilyExpanded task group
      await pressEntrance(page, VERTICAL_ZOOM_SHRINK)
      expect(JSON.stringify(await readTree(page)), 'ZE-2 / T-328: nothing changes').toBe(clean)
      expect(await wouldWarn(page), 'ZE-4 (MUST NOT): no unsaved edit').toBe(false)
      expect(await isArmed(page, UNDO), 'UN-8 / FR-031: no step was stacked').toBe(undoBefore)
      await pressEntrance(page, HEAD_OPEN_EVERY_TASK_GROUP)
      // STEP: a shrink at the end with temporarilyExpanded task groups
      await pressEntrance(page, VERTICAL_ZOOM_SHRINK)
      const after = await readTree(page)
      expect(after.zoomY, 'ZE-2 (MUST NOT): the zoom is not rewritten at the end').toBe(end)
      expect(withState(after, 'temporarilyExpanded'), 'T-328 verticalZoomShrinkPressed at ZE-2').toEqual([])
    } finally {
      await stage.close()
    }
  })

  // WHY: red if [^^] or [^] leaves an expanded task group open, or a later [vv] brings expanded back.
  test('claim 7: an expanded task group folded by [^^] or hidden by [^] does not come back expanded through [vv]', async () => {
    const stage = await openTheSample()
    try {
      const { page } = stage
      await toTheShallowestPicture(page)
      const program = taskGroupNamed(await readTree(page), ERP_PROGRAM_TASK_GROUP)
      await pressRowEntrance(page, program.id, TASK_GROUP_OPEN_ONE_LEVEL)
      // STEP: [^^] then [vv] on the expanded task group
      await pressRowEntrance(page, program.id, TASK_GROUP_FOLD_ALL_BELOW)
      expect(stateOf(await readTree(page), program.id), 'T-328 allBelowFoldPressed: expanded -> collapsed').toBe('collapsed')
      await pressRowEntrance(page, program.id, TASK_GROUP_OPEN_ALL_BELOW)
      expect(stateOf(await readTree(page), program.id), 'JDG-594: [vv] gives temporarilyExpanded, not expanded').toBe('temporarilyExpanded')
      await pressRowEntrance(page, program.id, TASK_GROUP_OPEN_ONE_LEVEL)
      // STEP: [^] then the head [v] then [vv]
      await pressRowEntrance(page, program.id, TASK_GROUP_HIDE)
      expect(stateOf(await readTree(page), program.id), 'T-328 hidePressed: expanded -> hidden').toBe('hidden')
      await pressEntrance(page, HEAD_OPEN_TOP_LEVEL)
      expect(stateOf(await readTree(page), program.id), 'T-328 topLevelOpenPressed: hidden top task group -> collapsed').toBe('collapsed')
      await pressRowEntrance(page, program.id, TASK_GROUP_OPEN_ALL_BELOW)
      expect(stateOf(await readTree(page), program.id), 'JDG-594: not expanded again').toBe('temporarilyExpanded')
    } finally {
      await stage.close()
    }
  })

  // WHY: red if fit keeps a folded task group or level zero folded, un-hides a task group, or its undo is not
  // one step that restores the values and keeps the new zoom.
  test('claim 8: fit returns every value but hidden to auto and opens level zero; one undo restores them', async () => {
    const stage = await openTheSample()
    try {
      const { page } = stage
      const start = await readTree(page)
      const program = taskGroupNamed(start, ERP_PROGRAM_TASK_GROUP)
      const other = start.rows.find((row) => row.parentId === null && row.id !== program.id)
      if (other === undefined) throw new Error('premise: a second top-level task group')
      await pressRowEntrance(page, other.id, TASK_GROUP_HIDE)
      await pressEntrance(page, HEAD_FOLD_EVERY_TASK_GROUP)
      const folded = await readTree(page)
      expect(folded.levelZero, 'T-328 root: head [^^] folds level zero').toBe('collapsed')
      // STEP: fit
      await pressEntrance(page, FIT)
      const fitted = await readTree(page)
      expect(fitted.levelZero, 'HF-8 / T-328 root: fit opens level zero').toBe('auto')
      expect(stateOf(fitted, other.id), 'HF-8: hidden stays hidden').toBe('hidden')
      for (const row of fitted.rows.filter((one) => one.id !== other.id)) {
        expect(row.treeState, `T-328 fitPressed: ${row.label}`).toBe('auto')
      }
      // STEP: one undo
      await pressEntrance(page, UNDO)
      const undone = await readTree(page)
      expect(undone.levelZero, 'UN-17: level zero comes back in the same step').toBe('collapsed')
      expect(undone.rows.map((row) => row.treeState), 'UN-17: the task group values come back in one step').toEqual(folded.rows.map((row) => row.treeState))
      expect(undone.zoomY, 'UN-8: the zoom stays the fitted one').toBe(fitted.zoomY)
    } finally {
      await stage.close()
    }
  })

  // WHY: red if a value change is not an unsaved edit, or the shrink's undo step brings back the zoom.
  test('claim 9: every value change is an unsaved edit and one undo step; the shrink step keeps the zoom', async () => {
    // WHY: above zoomY 1 the plan height is off its floor, so ZE-1 is false and the shrink writes a
    // zoom; the collapsed T1 leaves task groups undrawn, which arms the head [vv].
    const stage = await openArranged({ zoomY: 1.5, states: { T1: 'collapsed' } })
    try {
      const { page } = stage
      await saveDocument(page)
      const before = await readTree(page)
      // STEP: the head [vv] after a save
      await pressEntrance(page, HEAD_OPEN_EVERY_TASK_GROUP)
      const opened = await readTree(page)
      expect(await wouldWarn(page), 'FR-018 / UN-14: the change is an unsaved edit').toBe(true)
      await pressEntrance(page, VERTICAL_ZOOM_SHRINK)
      const shrunk = await readTree(page)
      expect(shrunk.zoomY, 'premise: the shrink moved the zoom').not.toBe(opened.zoomY)
      // STEP: undo twice, one step for the shrink and one for the press
      await pressKey(page, 'SK-6')
      const first = await readTree(page)
      expect(first.rows.map((row) => row.treeState), 'UN-14: the shrink step brings temporarilyExpanded back').toEqual(opened.rows.map((row) => row.treeState))
      expect(first.zoomY, 'UN-8: the zoom is not undone').toBe(shrunk.zoomY)
      await pressKey(page, 'SK-6')
      expect((await readTree(page)).rows.map((row) => row.treeState), 'UN-14: one step for the press').toEqual(before.rows.map((row) => row.treeState))
    } finally {
      await stage.close()
    }
  })

  // WHY: red if a value, temporarilyExpanded included, is lost or changed by saving and opening.
  test('claim 10: the five values are saved and a reopened file draws them the same', async () => {
    const stage = await openTheSample()
    try {
      const { page } = stage
      await toTheShallowestPicture(page)
      const start = await readTree(page)
      const tops = start.rows.filter((row) => row.parentId === null && !isLeaf(start, row.id))
      if (tops.length < 4) throw new Error('premise: four top-level task groups with children')
      const [first, second, third, fourth] = tops
      // WHY: bottom-up, so a task group opened above never pushes a task group still to press off the screen.
      await pressRowEntrance(page, fourth?.id ?? '', TASK_GROUP_HIDE)
      await pressRowEntrance(page, third?.id ?? '', TASK_GROUP_OPEN_ALL_BELOW)
      await pressRowEntrance(page, third?.id ?? '', TASK_GROUP_FOLD_ALL_BELOW)
      await pressRowEntrance(page, second?.id ?? '', TASK_GROUP_OPEN_ALL_BELOW)
      await pressRowEntrance(page, first?.id ?? '', TASK_GROUP_OPEN_ONE_LEVEL)
      const held = await readTree(page)
      const values = new Set(held.rows.map((row) => row.treeState))
      expect([...values].sort(), 'premise: all five values are held').toEqual(['auto', 'collapsed', 'expanded', 'hidden', 'temporarilyExpanded'])
      const drawn = await drawnRowIds(page)
      // STEP: save, then open the saved file in place of the document
      const body = await saveDocument(page)
      const saved = JSON.parse(body) as { schedule: { taskGroups: { id: string; treeState: string }[] } }
      expect(saved.schedule.taskGroups.map((row) => row.treeState), 'AT-153: the file holds each value').toEqual(held.rows.map((row) => row.treeState))
      await openDocument(page, 'saved.json', body)
      const reopened = await readTree(page)
      expect(reopened.rows.map((row) => row.treeState), 'T-328 A27: the file values').toEqual(held.rows.map((row) => row.treeState))
      expect(await drawnRowIds(page), 'T-329: the same picture').toEqual(drawn)
    } finally {
      await stage.close()
    }
  })

  // WHY: red if the shrink right after opening steps from any zoom but the fit's (OP-10, FR-055,
  // ZE-1), so that the picture widens instead.
  test('opening: one task group shrink right after opening adds no task group', async () => {
    const stage = await openTheSampleAsOpened()
    try {
      const { page } = stage
      const opened = await drawnRowIds(page)
      // STEP: one shrink with no fit pressed
      await pressEntrance(page, VERTICAL_ZOOM_SHRINK)
      const added = (await drawnRowIds(page)).filter((id) => !opened.includes(id))
      expect(added, 'FR-018 / ZE-1: a shrink never draws more task groups').toEqual([])
    } finally {
      await stage.close()
    }
  })

  // WHY: red if, from the opening picture, the expanded task group loses its child to the shrink (TD-6).
  test('claim 6 from the opening picture: [vv], then [v] on the program task group, then a shrink keeps its child', async () => {
    const stage = await openTheSampleAsOpened()
    try {
      const { page } = stage
      const start = await readTree(page)
      const program = taskGroupNamed(start, ERP_PROGRAM_TASK_GROUP)
      const children = childrenOf(start, program.id)
      expect(children.length, 'premise: the program task group has a child').toBeGreaterThan(0)
      await pressEntrance(page, HEAD_OPEN_EVERY_TASK_GROUP)
      // STEP: [v] on the program task group
      await pressRowEntrance(page, program.id, TASK_GROUP_OPEN_ONE_LEVEL)
      expect(stateOf(await readTree(page), program.id), 'T-328: [v] gives expanded').toBe('expanded')
      // STEP: one shrink
      await pressEntrance(page, VERTICAL_ZOOM_SHRINK)
      const drawn = await drawnRowIds(page)
      for (const child of children) {
        expect(drawn, `TD-6: ${child.label} is still drawn`).toContain(child.id)
      }
    } finally {
      await stage.close()
    }
  })
})

// DFC-1000 spec-only cases: T-051 HF-10 / CR-570 decision 15 -- the head open-all entrance (IC-74) is armed while any row the picture has not drawn exists, a row scrolled out of the window included; pressed, it opens that row and tells nothing; with every row drawn it is faint and a press tells RS-31.

import { describe, expect, it } from 'vitest'

import type { ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { taskGroupDocument, type TaskGroupSeed } from '../unit/cr-541-stage'
import { REQUIREMENTS } from './cr-610-file-flow-stage'
import { specTable } from './spec-table'
import { paletteStage } from './wp-p1-palette-stage'

const HEAD_OPEN_ALL = 'IC-74'
const TASK_GROUP_PANEL = 'Task Group Panel'
const NOTHING_TO_OPEN = 'RS-31'

const HF_10_NOT_IN_HF_18 =
  '押しが何かを変えるのは、押したタスクグループの配下に `FR-018` の 表 T-329 で描かれていないタスクグループが 1 つでもあるときである'
const FIRST = 'f0000000-0000-4000-8000-000000000000'
const FIRST_CHILD = 'f0000000-0000-4000-8000-0000000000c1'
const ROWS = 40
const SCROLLED_TO = 25

const idOf = (index: number): string => `f0000000-0000-4000-8000-${String(index).padStart(12, '0')}`

function documentWith(firstState: 'collapsed' | 'auto') {
  const rows = [
    { id: FIRST, parentId: null, treeState: firstState },
    { id: FIRST_CHILD, parentId: FIRST },
    ...Array.from({ length: ROWS - 1 }, (_, index) => ({ id: idOf(index + 1), parentId: null })),
  ]
  return taskGroupDocument(rows, { scrollGroupId: idOf(SCROLLED_TO), scrollGroupOffset: 0 })
}

const toldReasons = (view: ScreenView): readonly string[] =>
  view.notices.flatMap((one) => one.raisedNotices.map((two) => two.reason))

const treeStateOf = (document: { schedule: { taskGroups: readonly { id: string; treeState: string }[] } }, id: string): string =>
  document.schedule.taskGroups.find((one) => one.id === id)?.treeState ?? ''

describe('DFC-1000 -- the manuscript these cases are driven by', () => {
  it('HF-2 / HF-10: an open entrance is armed by rows the picture has not drawn under it, not by what is folded by hand', () => {
    expect(REQUIREMENTS).toContain(HF_10_NOT_IN_HF_18)
  })

  it('T-109 IC-74 is the entrance of HF-10 on the Task Group Panel', () => {
    const row = specTable('T-109').rows.find((one) => one.id === HEAD_OPEN_ALL)
    expect(row?.cells.join(' ')).toContain('HF-10')
  })
})

describe('DFC-1000 -- HF-10 a folded row scrolled out of the window still arms the head entrance', () => {
  it('precondition: the folded row is not among the titles the window shows', async () => {
    const built = await paletteStage({ document: documentWith('collapsed') as never })
    expect(built.last().taskGroupPanel.titles.map((one) => one.groupId)).not.toContain(FIRST)
    expect(built.last().taskGroupPanel.titles.length).toBeGreaterThan(0)
  })

  it('IC-74 is armed', async () => {
    const built = await paletteStage({ document: documentWith('collapsed') as never })
    expect(built.last().taskGroupPanel.canOpenEveryTaskGroup).toBe(true)
  })

  it('pressing IC-74 opens the folded row and tells nothing', async () => {
    const built = await paletteStage({ document: documentWith('collapsed') as never })
    await built.press(TASK_GROUP_PANEL, HEAD_OPEN_ALL)
    expect(treeStateOf(built.loop.document() as never, FIRST)).not.toBe('collapsed')
    expect(toldReasons(built.last())).not.toContain(NOTHING_TO_OPEN)
  })
})

describe('DFC-1000 -- HF-10 with every row drawn the head entrance has nothing to open', () => {
  it('IC-74 is faint', async () => {
    const built = await paletteStage({ document: documentWith('auto') as never })
    expect(built.last().taskGroupPanel.canOpenEveryTaskGroup).toBe(false)
  })

  it('pressing IC-74 carries RS-31 unseen (CR-712) and writes nothing', async () => {
    const built = await paletteStage({ document: documentWith('auto') as never })
    const before = JSON.stringify(built.loop.document().schedule.taskGroups)
    await built.press(TASK_GROUP_PANEL, HEAD_OPEN_ALL)
    expect(toldReasons(built.last())).not.toContain(NOTHING_TO_OPEN)
    expect(JSON.stringify(built.loop.document().schedule.taskGroups)).toBe(before)
  })
})

// see HF-2
async function documentWithFoldedGrandchildBelowTheWindow() {
  const flat = await paletteStage({ document: taskGroupDocument(Array.from({ length: ROWS }, (_, index) => ({ id: idOf(index), parentId: null }))) as never })
  const shown = flat.last().taskGroupPanel.titles
  const lastShown = shown[shown.length - 1]?.groupId
  if (lastShown === undefined) throw new Error('the window shows no task group title')
  const at = Number(lastShown.slice(-12))
  const rows: TaskGroupSeed[] = Array.from({ length: ROWS }, (_, index) => ({ id: idOf(index), parentId: null }))
  rows.splice(at + 1, 0, { id: FIRST_CHILD, parentId: lastShown }, { id: idOf(900), parentId: FIRST_CHILD, treeState: 'collapsed' })
  rows.splice(at + 3, 0, { id: idOf(901), parentId: idOf(900) })
  return { lastShown, document: taskGroupDocument(rows) }
}

describe('DFC-1000 -- HF-2 the row entrance counts the rows under it that lie below the window', () => {
  it('the last row the window shows has IC-58 armed when only a folded row below the window is not drawn', async () => {
    const { lastShown, document } = await documentWithFoldedGrandchildBelowTheWindow()
    const built = await paletteStage({ document: document as never })
    const title = built.last().taskGroupPanel.titles.find((one) => one.groupId === lastShown)
    expect(title, 'precondition: the row is still the last one shown').toBeDefined()
    expect(built.last().taskGroupPanel.titles.map((one) => one.groupId)).not.toContain(idOf(900))
    expect(title?.expander.canOpen).toBe(true)
  })

  it('pressing it opens the folded row below the window and tells nothing', async () => {
    const { lastShown, document } = await documentWithFoldedGrandchildBelowTheWindow()
    const built = await paletteStage({ document: document as never })
    await built.press(TASK_GROUP_PANEL, 'IC-58', { taskGroupId: lastShown })
    expect(treeStateOf(built.loop.document() as never, idOf(900))).not.toBe('collapsed')
    expect(toldReasons(built.last())).not.toContain('RS-28')
  })
})

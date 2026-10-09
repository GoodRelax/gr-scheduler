// UF-105: fillTaskGroupTitleTree draws the pinned task groups, then the other task groups, then the group grid lines (U-22, FR-098, HF-19).

import { describe, expect, it } from 'vitest'

import type { TaskGroupTitle, TaskGroupPanel } from '../../src/adapter/screen-renderer/screen-renderer'
import { fillTaskGroupTitleTree } from '../../src/framework/dom-screen-surface/task-group-panel-drawing'
import { stage, type FakeElement } from '../fixtures/fake-browser'

const taskGroupTitle = (groupId: string, y: number, isPinned: boolean): TaskGroupTitle =>
  ({
    groupId,
    depth: 0,
    box: { x: 0, y, width: 300, height: 24 },
    indentPx: 0,
    fontPx: 14,
    label: groupId,
    wholeLabel: groupId,
    isLabelTruncated: false,
    expander: { canOpen: false, canClose: false, canCloseBelow: false },
    isPinned,
    isSelected: false,
  }) as TaskGroupTitle

const GRID_LINE = { x: 0, y: 23, width: 300, height: 1 }

const drawn = (panel: TaskGroupPanel) => {
  const built = stage()
  const tree = built.host.createElement('div') as unknown as FakeElement
  tree.append(built.host.createElement('span') as unknown as FakeElement)
  const anchors = new Map<string, HTMLElement>()
  fillTaskGroupTitleTree(built.host, tree as unknown as HTMLElement, panel, anchors)
  return { tree, anchors }
}

describe('UF-105 fillTaskGroupTitleTree', () => {
  it('FR-098: the pinned task groups come first, then the other task groups, each anchored by its task group', () => {
    const panel = {
      pinnedTitles: [taskGroupTitle('pinned', 0, true)],
      titles: [taskGroupTitle('first', 24, false), taskGroupTitle('second', 48, false)],
    } as unknown as TaskGroupPanel
    const { tree, anchors } = drawn(panel)

    expect(tree.children.map((one) => one.getAttribute('data-group-id'))).toEqual(['pinned', 'first', 'second'])
    expect([...anchors.keys()].filter((key) => key.startsWith('taskGroupTitle '))).toEqual(['taskGroupTitle pinned', 'taskGroupTitle first', 'taskGroupTitle second'])
    expect(anchors.get('taskGroupTitle first')).toBe(tree.children[1])
  })

  it('HF-19: the group grid lines are drawn after the task groups and marked', () => {
    const panel = {
      pinnedTitles: [],
      titles: [taskGroupTitle('only', 0, false)],
      groupGridLines: [GRID_LINE, { ...GRID_LINE, y: 47 }],
    } as unknown as TaskGroupPanel
    const { tree } = drawn(panel)

    expect(tree.children).toHaveLength(3)
    expect(tree.children[0]?.getAttribute('data-group-id')).toBe('only')
    for (const line of tree.children.slice(1)) {
      expect(line.getAttribute('data-group-grid-line')).toBe('true')
      expect(line.getAttribute('aria-hidden')).toBe('true')
    }
  })

  it('U-22: an empty panel leaves the tree empty, replacing what it held', () => {
    const { tree, anchors } = drawn({ pinnedTitles: [], titles: [] } as unknown as TaskGroupPanel)

    expect(tree.children).toHaveLength(0)
    expect(anchors.size).toBe(0)
  })
})

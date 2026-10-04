// DFC-1720: a row control's tooltip is anchored to the control of the row the pointer is on, never to the top row's.

import { describe, expect, it } from 'vitest'

import type { RowTitle, RowTitlePanel, Tooltip } from '../../src/adapter/screen-renderer/screen-renderer'
import { fillRowTitleTree } from '../../src/framework/dom-screen-surface/row-title-panel-drawing'
import { tooltipAnchorTable, tooltipElement } from '../../src/framework/dom-screen-surface/tooltips-drawing'
import { descendants, stage, type FakeElement } from '../fixtures/fake-browser'

const ROW_CONTROLS = ['IC-58', 'IC-59', 'IC-77', 'IC-60'] as const

const rowTitle = (groupId: string, y: number): RowTitle => ({
  groupId,
  depth: 0,
  box: { x: 0, y, width: 300, height: 24 },
  indentPx: 0,
  fontPx: 14,
  label: groupId,
  wholeLabel: groupId,
  isLabelTruncated: false,
  expander: { canOpen: true, canClose: true, canCloseBelow: true },
  isPinned: false,
  isSelected: false,
})

const PANEL = {
  pinnedTitles: [],
  titles: [rowTitle('top', 0), rowTitle('lower', 400)],
} as unknown as RowTitlePanel

const drawnTree = () => {
  const built = stage()
  const root = built.host.createElement('div') as unknown as FakeElement
  const tree = built.host.createElement('div') as unknown as FakeElement
  root.append(tree)
  const table = tooltipAnchorTable(root as unknown as HTMLElement)
  fillRowTitleTree(built.host, tree as unknown as HTMLElement, PANEL, table.anchorsOf('Row Title Tree'))
  const controlOf = (groupId: string, icon: string): FakeElement => {
    const row = tree.children.find((one) => one.getAttribute('data-group-id') === groupId)
    const found = row === undefined ? undefined : descendants(row).find((one) => one.getAttribute('data-icon') === icon)
    if (found === undefined) throw new Error(`premise: row ${groupId} draws ${icon}`)
    return found
  }
  return { built, table, controlOf }
}

const placedAt = (element: FakeElement, top: number, left: number): void => {
  const rect = { x: left, y: top, width: 16, height: 16, top, left, right: left + 16, bottom: top + 16 }
  element.getBoundingClientRect = () => rect
}

const styleNumber = (element: HTMLElement, name: string): number =>
  Number(new RegExp(`(?:^|;)${name}:(-?[\\d.]+)(?:px)?;`).exec(element.getAttribute('style') ?? '')?.[1])

describe('DFC-1720 -- IN-3 / UF-112: the tip stands under the control the pointer is on', () => {
  for (const icon of ROW_CONTROLS) {
    it(`${icon} on the lower row: the tip's top is that row's control's bottom, not the top row's`, () => {
      const { built, table, controlOf } = drawnTree()
      placedAt(controlOf('top', icon), 0, 280)
      placedAt(controlOf('lower', icon), 400, 280)
      const tip: Tooltip = { anchor: { kind: 'icon', icon, groupId: 'lower' }, text: icon, assignment: null }
      const drawn = tooltipElement(built.host, tip, table.anchorFor)
      expect(styleNumber(drawn, 'top')).toBe(416)
      expect(styleNumber(drawn, 'left')).toBe(280)
    })
  }

  it('a row the tree does not hold finds no control, rather than the first one in the tree', () => {
    const { built, table, controlOf } = drawnTree()
    placedAt(controlOf('top', 'IC-58'), 50, 280)
    const tip: Tooltip = { anchor: { kind: 'icon', icon: 'IC-58', groupId: 'gone' }, text: 'IC-58', assignment: null }
    expect(styleNumber(tooltipElement(built.host, tip, table.anchorFor), 'top')).toBe(0)
  })
})

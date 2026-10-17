// CR-772 spec-only cases: while a task group is carried, the screen draws the line, the ground and the copy (HF-15, S-213, S-215, S-599).

import { describe, expect, it } from 'vitest'

import { taskGroupPanelFromSchedule } from '../../src/adapter/screen-renderer/task-group-panel'
import type { ScreenViewReadings, TaskGroupPanel } from '../../src/adapter/screen-renderer/screen-renderer'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { PAINT } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { fillTaskGroupGrabCues, fillTaskGroupTitleTree } from '../../src/framework/dom-screen-surface/task-group-panel-drawing'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { stage, type FakeElement } from '../fixtures/fake-browser'
import { numberIn, rowOf } from '../unit/cr-541-stage'
import * as clause from './cr-772-clauses'
import { REQUIREMENTS, S_213, S_599, boxesOf, documentOf, landingAt, under } from './cr-772-stage'

const S_215 = numberIn(rowOf('T-206', 'S-215').by['既定'] ?? '')
const DROP_LINE_ROLE = 'Task Group Drop Line'
const GRAB_COPY_ROLE = 'Task Group Grab Copy'
const POINTER = { x: 250, y: 180 }

describe('CR-772 -- the manuscript these cases are driven by', () => {
  it.each([
    clause.HF_15_DRAW_TARGET,
    clause.HF_15_LINE,
    clause.HF_15_LINE_COLOR,
    clause.HF_15_GROUND,
    clause.HF_15_GROUND_COLOR,
    clause.HF_15_COPY,
  ])('still says it, word for word: %s', (text) => {
    expect(REQUIREMENTS).toContain(text)
  })
})

const READINGS = {
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  pointer: POINTER,
  pointerRestedMs: 0,
  hintTargetDwellMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: 214,
  selectedTaskGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  taskGroupBoxes: boxesOf(),
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
} as unknown as ScreenViewReadings

type Landing = ReturnType<typeof landingAt>

function panelFor(heldId: string | null, landing: Landing): TaskGroupPanel {
  const document = documentOf()
  const readings = {
    ...READINGS,
    taskGroupGrabbedAt: heldId === null ? null : { taskGroupId: heldId, landing },
  } as unknown as ScreenViewReadings
  return taskGroupPanelFromSchedule(document.schedule, document.documentSettings, emptySelection(), emptyScreenSession, readings)
}

const heldIdsOf = (panel: TaskGroupPanel): readonly string[] =>
  [...panel.pinnedTitles, ...panel.titles].filter((one) => one.isHeld === true).map((one) => one.taskGroupId).sort()

const NAME_OF_A2 = 'row 5'

describe('HF-15 -- the panel describes the drop while a task group is carried', () => {
  const landing = landingAt('A2', 1, under('B1'))

  it('marks the held task group and its drawn descendants, and no other row, as held', () => {
    expect(heldIdsOf(panelFor('A2', landing))).toEqual(['A2', 'A2a'])
    expect(heldIdsOf(panelFor('B', landing))).toEqual(['B', 'B1'])
  })

  it('carries the line at the chosen gap and indent', () => {
    expect(landing).not.toBeNull()
    expect(panelFor('A2', landing).dropCue).toEqual({
      lineY: landing?.gapY,
      lineIndentPx: landing?.lineIndentPx,
    })
  })

  it('names the copy after the held task group', () => {
    expect(panelFor('A2', landing).grabCopy?.name).toContain(NAME_OF_A2)
  })

  it('has nothing held, no line and no copy when nothing is carried', () => {
    const panel = panelFor(null, null)
    expect(heldIdsOf(panel)).toEqual([])
    expect(panel.dropCue ?? null).toBeNull()
    expect(panel.grabCopy ?? null).toBeNull()
  })

  it('has no line, and still a copy, when there is no landing', () => {
    const panel = panelFor('A', null)
    expect(panel.dropCue ?? null).toBeNull()
    expect(panel.grabCopy).not.toBeNull()
  })
})

const px = (style: string, property: string): number => {
  const found = new RegExp(`(?:^|;)\\s*${property}:\\s*(-?[\\d.]+)px`).exec(style)
  if (found === null) throw new Error(`the style states no ${property}: ${style}`)
  return Number(found[1])
}

// WHY: the rows and the cue layer side by side, so a case can look for a line or a copy in either.
function treeOf(panel: TaskGroupPanel): { readonly children: FakeElement[] } {
  const built = stage()
  const tree = built.host.createElement('div') as unknown as FakeElement
  const cues = built.host.createElement('div') as unknown as FakeElement
  fillTaskGroupTitleTree(built.host, tree as unknown as HTMLElement, panel, new Map<string, HTMLElement>())
  fillTaskGroupGrabCues(built.host, cues as unknown as HTMLElement, tree as unknown as HTMLElement, panel)
  return { children: [...tree.children, ...cues.children] }
}

const roleOf = (tree: { readonly children: FakeElement[] }, role: string): FakeElement[] => tree.children.filter((one) => one.getAttribute('data-role') === role)
const rowOf2 = (tree: { readonly children: FakeElement[] }, id: string): FakeElement => {
  const found = tree.children.find((one) => one.getAttribute('data-group-id') === id)
  if (found === undefined) throw new Error(`premise: ${id} is drawn`)
  return found
}
const styleOf = (element: FakeElement): string => element.getAttribute('style') ?? ''

describe('HF-15 -- the drop is drawn: line, ground, copy', () => {
  const landing = landingAt('B', 2, under('A2a'))
  const panel = panelFor('B', landing)
  const tree = treeOf(panel)
  const panelBox = panel.titles[0]?.box

  it('draws one line at the gap, S-213 thick, from the indent of the chosen depth to the right edge of the panel', () => {
    expect(panelBox).toBeDefined()
    const lines = roleOf(tree, DROP_LINE_ROLE)
    expect(lines).toHaveLength(1)
    const style = styleOf(lines[0] as FakeElement)
    expect(px(style, 'height')).toBe(S_213)
    expect(px(style, 'top') + px(style, 'height') / 2).toBeCloseTo(landing?.gapY ?? NaN, 6)
    expect(px(style, 'left')).toBeCloseTo((panelBox?.x ?? NaN) + (landing?.lineIndentPx ?? NaN), 6)
    expect(px(style, 'left') + px(style, 'width')).toBeCloseTo((panelBox?.x ?? NaN) + (panelBox?.width ?? NaN), 6)
    expect(style).toContain(PAINT.heldTaskGroup)
  })

  it('lays the S-215 ground on the held rows only', () => {
    for (const id of ['B', 'B1']) expect(styleOf(rowOf2(tree, id))).toContain(`${S_215}%`)
    for (const id of ['A', 'A2', 'C', 'E3']) expect(styleOf(rowOf2(tree, id))).not.toContain(`${S_215}%`)
  })

  it('draws the copy of the name S-599 right of and below the pointer', () => {
    const copies = roleOf(tree, GRAB_COPY_ROLE)
    expect(copies).toHaveLength(1)
    const style = styleOf(copies[0] as FakeElement)
    expect(px(style, 'left') - POINTER.x).toBeCloseTo(S_599, 6)
    expect(px(style, 'top') - POINTER.y).toBeCloseTo(S_599, 6)
    expect(copies[0]?.textContent).toContain('row 7')
  })

  it('draws neither line nor copy when nothing is carried', () => {
    const idle = treeOf(panelFor(null, null))
    expect(roleOf(idle, DROP_LINE_ROLE)).toEqual([])
    expect(roleOf(idle, GRAB_COPY_ROLE)).toEqual([])
  })

  it('adds no label such as "into" to the frame (Q1 of CR-772, held at its provisional answer)', () => {
    const words = tree.children.map((one) => one.textContent ?? '').join(' ')
    expect(words).not.toContain('中へ')
    expect(words.toLowerCase()).not.toContain('into')
  })
})

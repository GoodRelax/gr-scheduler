// CR-789 spec-only cases: while a task group is carried, a pointer move changes only the cues, never the rows; the cue layer is in front and the controls stay away (HF-15, HF-6, UZ-11).

import { describe, expect, it } from 'vitest'

import { taskGroupPanelFromSchedule } from '../../src/adapter/screen-renderer/task-group-panel'
import type {
  AppHeaderItems,
  ScreenFrame,
  ScreenView,
  ScreenViewReadings,
  TaskGroupPanel,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { taskGroupGrabCuesOf, taskGroupRowsOf } from '../../src/framework/dom-screen-surface/task-group-panel-drawing'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { byRole, selfAndDescendants, surfaceOf, wire, styleMap, type FakeElement } from '../fixtures/fake-browser'
import { REQUIREMENTS, boxesOf, documentOf, landingAt, under } from './cr-772-stage'

const TREE_ROLE = 'Task Group Title Tree'
const LAYER_ROLE = 'Task Group Grab Cues'
const CARRIED = 'data-task-group-carried'

const readingsAt = (x: number, y: number): ScreenViewReadings =>
  ({
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    isAgentApiEnabled: false,
    pointer: { x, y },
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
  }) as unknown as ScreenViewReadings

type Landing = ReturnType<typeof landingAt>

function panelAt(heldId: string | null, landing: Landing, x: number, y: number): TaskGroupPanel {
  const document = documentOf()
  const readings = {
    ...readingsAt(x, y),
    taskGroupGrabbedAt: heldId === null ? null : { taskGroupId: heldId, landing },
  } as unknown as ScreenViewReadings
  return taskGroupPanelFromSchedule(document.schedule, document.documentSettings, emptySelection(), emptyScreenSession, readings)
}

describe('CR-789 -- the manuscript these cases are driven by', () => {
  it('HF-15 still says a pointer move redraws the line and the copy only', () => {
    expect(REQUIREMENTS).toContain('描き直すのは差し込み線と写しだけとする。')
  })

  it('UZ-11 still leaves the order inside the panel to each requirement', () => {
    expect(REQUIREMENTS).toContain('中の前後は各要求が持つ')
  })
})

describe('HF-15 -- the two keys: the rows and the cues', () => {
  const landing = landingAt('B', 2, under('A2a'))
  const here = panelAt('B', landing, 250, 180)
  const moved = panelAt('B', landing, 262, 197)

  it('reads the rows of two panels that differ only by where the copy is as equal', () => {
    expect(JSON.stringify(taskGroupRowsOf(moved))).toBe(JSON.stringify(taskGroupRowsOf(here)))
  })

  it('reads the cues of those two panels as different', () => {
    expect(JSON.stringify(taskGroupGrabCuesOf(moved))).not.toBe(JSON.stringify(taskGroupGrabCuesOf(here)))
  })

  it('gives the rows no line and no copy', () => {
    const rows = taskGroupRowsOf(here)
    expect(rows.dropCue ?? null).toBeNull()
    expect(rows.grabCopy ?? null).toBeNull()
    expect(rows.titles).toEqual(here.titles)
  })

  it('gives the cues the line, the copy and the width the line needs', () => {
    const cues = taskGroupGrabCuesOf(here)
    expect(cues.dropCue).toEqual(here.dropCue)
    expect(cues.grabCopy).toEqual(here.grabCopy)
    expect(cues.panelBox).toEqual(here.titles[0]?.box)
  })

  it('reads the cues as different when the landing moves, and still the rows as equal', () => {
    const other = panelAt('B', landingAt('B', 0, under('A')), 250, 180)
    expect(JSON.stringify(taskGroupGrabCuesOf(other))).not.toBe(JSON.stringify(taskGroupGrabCuesOf(here)))
    expect(JSON.stringify(taskGroupRowsOf(other))).toBe(JSON.stringify(taskGroupRowsOf(here)))
  })

  it('reads the rows as different once the carry ends (the ground comes off the rows)', () => {
    const idle = panelAt(null, null, 250, 180)
    expect(JSON.stringify(taskGroupRowsOf(idle))).not.toBe(JSON.stringify(taskGroupRowsOf(here)))
    expect(taskGroupGrabCuesOf(idle).dropCue).toBeNull()
    expect(taskGroupGrabCuesOf(idle).grabCopy).toBeNull()
  })
})

// WHY: the surface paints from requestAnimationFrame in a browser; the harness has none, so a frame is run by hand when the unit asks for one.
const GLOBAL = globalThis as unknown as Record<string, unknown>

function viewOf(panel: TaskGroupPanel): ScreenView {
  return {
    language: 'en',
    frame: { isFullScreen: false, dividers: [], scrollbars: [] } as unknown as ScreenFrame,
    appHeaderItems: {
      documentTitle: 'Plan',
      openedFileName: null,
      fileSavedAt: null,
      fileSavedByteLength: null,
      fileNeverSavedText: '',
      commands: [],
      language: 'en',
    } as AppHeaderItems,
    taskGroupPanel: panel,
    propertiesPanel: null,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips: [],
  }
}

function bench(): { show: (panel: TaskGroupPanel) => void; root: () => FakeElement } {
  const waiting: ((time: number) => void)[] = []
  const previous = GLOBAL['requestAnimationFrame']
  GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const built = wire({ preference: 'light', hue: 214 }, { 'App Header': 40 })
  const surface = surfaceOf(built)
  return {
    show: (panel) => {
      surface.showScreenView(viewOf(panel))
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
      if (previous === undefined) delete GLOBAL['requestAnimationFrame']
      else GLOBAL['requestAnimationFrame'] = previous
    },
    root: () => built.root(),
  }
}

const one = (root: FakeElement, role: string): FakeElement => {
  const found = byRole(root, role)
  if (found.length !== 1) throw new Error(`expected one ${role}, found ${found.length}`)
  return found[0] as FakeElement
}

describe('HF-15 / UZ-11 -- the cue layer sits in front of the rows', () => {
  const landing = landingAt('B', 2, under('A2a'))

  it('is a later sibling of the tree, with the same z-index', () => {
    const rig = bench()
    rig.show(panelAt('B', landing, 250, 180))
    const tree = one(rig.root(), TREE_ROLE)
    const layer = one(rig.root(), LAYER_ROLE)
    const siblings = (tree.parentNode as unknown as FakeElement).children
    expect(layer.parentNode).toBe(tree.parentNode)
    expect(siblings.indexOf(layer)).toBeGreaterThan(siblings.indexOf(tree))
    const treeZ = styleMap(tree).get('z-index')
    expect(treeZ).toBeDefined()
    expect(styleMap(layer).get('z-index')).toBe(treeZ)
  })

  it('draws the line and the copy in the layer and none of them in the tree', () => {
    const rig = bench()
    rig.show(panelAt('B', landing, 250, 180))
    const tree = one(rig.root(), TREE_ROLE)
    const layer = one(rig.root(), LAYER_ROLE)
    expect(byRole(layer, 'Task Group Drop Line')).toHaveLength(1)
    expect(byRole(layer, 'Task Group Grab Copy')).toHaveLength(1)
    expect(byRole(tree, 'Task Group Drop Line')).toEqual([])
    expect(byRole(tree, 'Task Group Grab Copy')).toEqual([])
    expect(tree.getAttribute(CARRIED)).toBe('true')
  })

  it('leaves the tree children as they were when only the copy moved, and moves the copy', () => {
    const rig = bench()
    rig.show(panelAt('B', landing, 250, 180))
    const tree = one(rig.root(), TREE_ROLE)
    const before = [...tree.children]
    const copyBefore = styleMap(one(one(rig.root(), LAYER_ROLE), 'Task Group Grab Copy')).get('left')
    rig.show(panelAt('B', landing, 270, 200))
    expect(tree.children.length).toBe(before.length)
    tree.children.forEach((child, at) => expect(child).toBe(before[at]))
    const copyAfter = styleMap(one(one(rig.root(), LAYER_ROLE), 'Task Group Grab Copy')).get('left')
    expect(copyAfter).not.toBe(copyBefore)
  })

  it('replaces the tree children once the carry ends, and marks the tree not carried', () => {
    const rig = bench()
    rig.show(panelAt('B', landing, 250, 180))
    const tree = one(rig.root(), TREE_ROLE)
    const before = [...tree.children]
    rig.show(panelAt(null, null, 250, 180))
    expect(tree.children.some((child, at) => child !== before[at])).toBe(true)
    expect(byRole(one(rig.root(), LAYER_ROLE), 'Task Group Grab Copy')).toEqual([])
    expect(tree.getAttribute(CARRIED)).toBe('false')
  })
})

interface Rule {
  readonly selector: string
  readonly declarations: string
}

function rulesOf(root: FakeElement): Rule[] {
  const text = selfAndDescendants(root)
    .filter((node) => node.tagName === 'STYLE')
    .map((node) => node.textContent)
    .join('\n')
  const rules: Rule[] = []
  for (const hit of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const selector of (hit[1] ?? '').split(',')) rules.push({ selector: selector.trim(), declarations: (hit[2] ?? '').replace(/\s+/g, '') })
  }
  return rules
}

describe('HF-15 / HF-6 -- the hover rules stand down while a task group is carried', () => {
  const rig = bench()
  rig.show(panelAt(null, null, 250, 180))
  const rules = rulesOf(rig.root())
  const GATE = '[data-task-group-carried="false"]'
  const onRows = rules.filter((rule) => rule.selector.includes('[data-group-id]'))

  it('has rules that show the controls on hover, and every one of them is gated by the not-carried tree', () => {
    const hovers = onRows.filter((rule) => rule.selector.includes(':hover'))
    expect(hovers.length).toBeGreaterThan(0)
    for (const rule of hovers) expect(rule.selector).toContain(GATE)
  })

  it('has the z-index:1 rule, and it is gated the same way', () => {
    const lifts = onRows.filter((rule) => /(^|;)z-index:1(;|$)/.test(rule.declarations))
    expect(lifts.length).toBeGreaterThan(0)
    for (const rule of lifts) expect(rule.selector).toContain(GATE)
  })

  it('gates the rules on the tree, not on the row', () => {
    for (const rule of onRows.filter((candidate) => candidate.selector.includes(':hover'))) {
      expect(rule.selector.indexOf(GATE)).toBeLessThan(rule.selector.indexOf('[data-group-id]'))
    }
  })
})

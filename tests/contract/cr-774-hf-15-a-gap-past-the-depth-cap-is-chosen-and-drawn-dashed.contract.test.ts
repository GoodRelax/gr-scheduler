// CR-774 spec-only cases: the depth cap bounds the grabbed task group alone; a gap that puts its descendants past the cap is chosen, and its line is drawn dashed (HF-15, FR-004, HM-3a).

import { describe, expect, it } from 'vitest'

import { taskGroupPanelFromSchedule } from '../../src/adapter/screen-renderer/task-group-panel'
import type { ScreenViewReadings, TaskGroupPanel } from '../../src/adapter/screen-renderer/screen-renderer'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { fillTaskGroupTitleTree } from '../../src/framework/dom-screen-surface/task-group-panel-drawing'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { stage, type FakeElement } from '../fixtures/fake-browser'
import { rowOf } from '../unit/cr-541-stage'
import * as clause from './cr-774-clauses'
import {
  REQUIREMENTS,
  ROWS,
  S_125,
  actionOf,
  boxesOf,
  bundlesOf,
  depthIn,
  documentOf,
  groupsOf,
  landingAt,
  releaseAt,
  under,
  type PastCapLanding,
} from './cr-774-stage'
import { WORDS } from './cr-731-stage'

const NEW_CLAUSES: readonly string[] = [
  clause.HF_15_CAP_SELF,
  clause.HF_15_SELECTABLE,
  clause.HF_15_ASK,
  clause.HF_15_ANSWERS,
  clause.HF_15_WHY_NOT_QUIET,
  clause.HF_15_LIFT,
  clause.HF_15_TASKS_STAY,
  clause.HF_15_ONE_UNDO,
  clause.UC_002_2A_ASK,
  clause.UC_002_2A_ANSWERS,
  clause.UC_002_2A_OTHER_ROADS,
  clause.HM_3A_GRAB_NOTE,
  clause.HM_3A_STILL_HOLDS,
]

const RETIRED_CLAUSES: readonly string[] = [
  clause.RETIRED_CAP_WITH_SUBTREE,
  clause.RETIRED_NO_PLACE,
  clause.RETIRED_HM_3A_NOTE,
  clause.RETIRED_UC_002_2A,
]

// WHY: the levels a held group spans, itself included; P1 is a leaf, S and H span S_125 levels.
const HEIGHT_OF: Readonly<Record<string, number>> = { P1: 1, S: 5, H: 5 }

describe('CR-774 -- the manuscript these cases are driven by', () => {
  it.each(NEW_CLAUSES.map((one) => [one.slice(0, 40), one] as const))('says it, word for word: %s', (_name, text) => {
    expect(REQUIREMENTS).toContain(text)
  })

  it.each(RETIRED_CLAUSES.map((one) => [one.slice(0, 40), one] as const))('no longer says: %s', (_name, text) => {
    expect(REQUIREMENTS).not.toContain(text)
  })

  it('T-234 holds QN-16: asked at the drop, the answer proceed lifts, cancel writes nothing, no name is given', () => {
    const cells = rowOf('T-234', 'QN-16').cells.join(' ')
    expect(cells).toContain('答えが `proceed` なら深すぎる配下を上限の段へ引き上げて移動し、`cancel` なら書き込まない')
    expect(cells).toContain('挙げない')
    expect(cells).toContain('問う')
  })

  it('the dictionary holds the question in both languages with the limit as {maxGroupDepth}', () => {
    const entry = (WORDS['questions'] as { rowId: string; text: { ja: string; en: string } }[]).find((one) => one.rowId === 'QN-16')
    expect(entry?.text.ja).toContain('{maxGroupDepth}')
    expect(entry?.text.en).toContain('{maxGroupDepth}')
  })

  it('premise: the tree is built for a limit of 5 levels, and S, H span exactly that many', () => {
    expect(S_125).toBe(5)
    expect(documentOf().schedule.taskGroups).toHaveLength(ROWS.length)
    expect(depthIn(groupsOf(), 'S4')).toBe(S_125)
    expect(depthIn(groupsOf(), 'H4a')).toBe(S_125)
    expect(depthIn(groupsOf(), 'T4')).toBe(S_125)
  })
})

describe('HF-15 -- the grabbed task group itself never goes past the limit: the line stops silently and no question is asked', () => {
  const bottom = under('T4')

  it.each([9, 20, 40])('a leaf pulled %i indents sideways stops at the limit, under the last row of the chain, not past it', (steps) => {
    const landing = landingAt('P1', steps, bottom)
    expect(landing).toMatchObject({ parentId: 'T3', depth: S_125 })
    expect(landing?.isPastDepthCap, 'a leaf has nothing below it to go past the limit').not.toBe(true)
  })

  it('releasing there writes one plain move and asks nothing', () => {
    const result = releaseAt('P1', 40, bottom)
    const action = actionOf(result)
    expect(action?.kind).toBe('changeDocument')
    expect(action?.question).toBeUndefined()
    expect(bundlesOf(result)).toHaveLength(1)
    expect(bundlesOf(result)[0]).toHaveLength(1)
    expect(bundlesOf(result)[0]?.[0]).toMatchObject({ kind: 'moveTaskGroup', taskGroupId: 'P1', parentId: 'T3' })
  })

  it('a group of S_125 levels is not held shallower any more: the limit it meets is its own', () => {
    expect(landingAt('H', 40, bottom)?.depth).toBe(S_125)
    expect(landingAt('S', 40, bottom)?.depth).toBe(S_125)
  })

  it('a gap never offers a depth deeper than the row above it plus one', () => {
    const underP1 = landingAt('H', 40, under('P1'))
    expect(underP1?.depth).toBe(depthIn(groupsOf(), 'P1') + 1)
  })
})

describe('HF-15 -- a depth that puts the descendants past the limit is chosen, and the landing says so', () => {
  it.each([
    ['H', 'P1', 0, 1],
    ['H', 'P1', 1, 2],
    ['H', 'P1', 2, 3],
    ['H', 'P1', 9, 3],
    ['S', 'P1', 1, 2],
    ['S', 'P1', 2, 3],
    ['H', 'T4', 0, 1],
    ['H', 'T4', 1, 2],
    ['H', 'T4', 9, S_125],
    ['S', 'T4', 9, S_125],
    ['P1', 'T4', 9, S_125],
  ] as const)('%s pulled to the gap under %s by %i indents lands at depth %i, past the limit exactly when depth + levels - 1 > limit', (held, above, steps, depth) => {
    const landing = landingAt(held, steps, under(above))
    expect(landing).not.toBeNull()
    expect(landing?.depth).toBe(depth)
    expect(landing?.isPastDepthCap).toBe(depth + (HEIGHT_OF[held] ?? 1) - 1 > S_125)
  })

  it('the gap the old reading had no place for (under the row above a deeper row) now has one', () => {
    const landing = landingAt('H', 9, under('P'))
    expect(landing).toMatchObject({ parentId: 'P', depth: 2, isPastDepthCap: true })
  })

  it('moving the pointer to a depth that fits again clears the flag', () => {
    expect(landingAt('H', 1, under('P1'))?.isPastDepthCap).toBe(true)
    expect(landingAt('H', 0, under('P1'))?.isPastDepthCap).toBe(false)
  })

  it('the gap, the parent and the order are the same as for a plain landing of the same depth', () => {
    const past = landingAt('S', 1, under('P1'))
    expect(past).toMatchObject({ parentId: 'P', depth: 2 })
    expect(past?.gapY).toBe(under('P1'))
    const plain = landingAt('P1', 1, under('S4'))
    expect(plain?.isPastDepthCap).toBe(false)
  })
})

const READINGS = {
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  pointer: { x: 250, y: 180 },
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

function panelFor(heldId: string, landing: PastCapLanding | null): TaskGroupPanel {
  const document = documentOf()
  const readings = { ...READINGS, taskGroupGrabbedAt: { taskGroupId: heldId, landing } } as unknown as ScreenViewReadings
  return taskGroupPanelFromSchedule(document.schedule, document.documentSettings, emptySelection(), emptyScreenSession, readings)
}

function lineOf(panel: TaskGroupPanel): FakeElement[] {
  const built = stage()
  const tree = built.host.createElement('div') as unknown as FakeElement
  fillTaskGroupTitleTree(built.host, tree as unknown as HTMLElement, panel, new Map<string, HTMLElement>())
  return tree.children.filter((one) => one.getAttribute('data-role') === 'Task Group Drop Line')
}

describe('HF-15 -- the drop line is drawn dashed where the descendants go past the limit', () => {
  const past = landingAt('S', 1, under('P1'))
  const plain = landingAt('P1', 1, under('S4'))

  it('premise: one landing is past the limit and the other is not', () => {
    expect(past?.isPastDepthCap).toBe(true)
    expect(plain?.isPastDepthCap).toBe(false)
  })

  it('the cue the panel carries says whether the landing is past the limit', () => {
    const cue = panelFor('S', past).dropCue as unknown as { isPastDepthCap?: boolean } | null
    expect(cue?.isPastDepthCap).toBe(true)
    const calm = panelFor('P1', plain).dropCue as unknown as { isPastDepthCap?: boolean } | null
    expect(calm?.isPastDepthCap ?? false).toBe(false)
  })

  it('the line past the limit carries data-past-depth-cap="true", and still sits at the chosen gap', () => {
    const lines = lineOf(panelFor('S', past))
    expect(lines).toHaveLength(1)
    expect(lines[0]?.getAttribute('data-past-depth-cap')).toBe('true')
    const top = Number(/(?:^|;)\s*top:\s*(-?[\d.]+)px/.exec(lines[0]?.getAttribute('style') ?? '')?.[1])
    const height = Number(/(?:^|;)\s*height:\s*(-?[\d.]+)px/.exec(lines[0]?.getAttribute('style') ?? '')?.[1])
    expect(top + height / 2).toBeCloseTo(past?.gapY ?? Number.NaN, 6)
  })

  it('the line within the limit is not marked', () => {
    const lines = lineOf(panelFor('P1', plain))
    expect(lines).toHaveLength(1)
    expect(lines[0]?.getAttribute('data-past-depth-cap')).not.toBe('true')
  })
})

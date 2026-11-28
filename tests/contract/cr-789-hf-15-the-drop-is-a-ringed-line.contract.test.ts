// CR-789 spec-only cases: the drop is a line with a ring at its left end, no row is framed, and the cues have their own layer (HF-15, S-620, S-213).

import { describe, expect, it } from 'vitest'

import { taskGroupPanelFromSchedule } from '../../src/adapter/screen-renderer/task-group-panel'
import type { ScreenViewReadings, TaskGroupPanel } from '../../src/adapter/screen-renderer/screen-renderer'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { NOT_STORED_TASK_GROUP_DROP_RING_SIZES, PAINT, TASK_GROUP_CARRIED_MARK } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  fillTaskGroupGrabCues,
  fillTaskGroupTitleTree,
} from '../../src/framework/dom-screen-surface/task-group-panel-drawing'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { descendants, stage, type FakeElement } from '../fixtures/fake-browser'
import { numberIn, rowOf } from '../unit/cr-541-stage'
import { REQUIREMENTS, S_213, boxesOf, documentOf, landingAt, under } from './cr-772-stage'

const S_620 = numberIn(rowOf('T-206', 'S-620').by['既定'] ?? '')
const LINE_ROLE = 'Drop Line'
const COPY_ROLE = 'Drag Copy'
const POINTER = { x: 250, y: 180 }

describe('CR-789 -- the manuscript these cases are driven by', () => {
  it.each([
    '`GRS` は、差し込み線を、選んだ隙間の境目（上下 2 つのタスクグループのあいだ）に立てること。',
    '`GRS` は、差し込み線の左端に丸を立てること。`GRS` は、丸の中心を線の左端（選んだ段の字下げの位置）に置くこと。',
    '`GRS` は、丸を中の抜けた輪とし、外径を 表 T-206 の `S-620`、輪の太さを線と同じ `S-213`、中をパネルの地（表 T-236 の `S-150`）とすること。',
    '差し込み線を破線で描く段でも、`GRS` は、輪を実線で描くこと。',
    '`GRS` は、差し込み線をポインターの高さに付いて行かせないこと。',
    'ポインターの高さに付いて行かせると、どこに落ちるかが 1 行単位で読めなくなる。',
    '折りたたまれたタスクグループの中へ落とす間、`GRS` は、折りたたまれたタスクグループの行の真下の隙間に、1 段深い字下げから線を引いて示すこと。',
    '`GRS` は、落ち先を示すために、タスクグループを枠で囲まないこと。',
    '`GRS` は、差し込み線と丸の色を 表 T-236 の `S-151`、太さを 表 T-206 の `S-213` とすること。',
    '`GRS` は、差し込み線と名前のコピーを、パネルの行とボタンより前に描くこと。',
    'タスクグループを運んでいる間、`GRS` は、ポインターが動いただけでパネルの行を描き直さないこと。タスクグループを運んでいる間、`GRS` は、差し込み線とコピーだけを描き直すこと。',
    'タスクグループを運んでいる間、`GRS` は、どの行にも `Task Group Buttons`（`HF-6`）とボタンの地を描かないこと。',
    'タスクグループを運んでいる間も、`GRS` は、ピン止めしているタスクグループの `IC-60` の常時の印（`HF-6`）を残すこと。',
    '離すか `Esc` でやめたとき、`GRS` は、`Task Group Buttons` を `HF-6` のとおりに戻すこと。',
  ])('HF-15 still says it, word for word: %s', (text) => {
    expect(REQUIREMENTS).toContain(text)
  })

  it('HF-6 ends by pointing at HF-15 for the carried case', () => {
    expect(REQUIREMENTS).toContain(
      'タスクグループを運んでいる間（`HF-15`）、`GRS` は、ポインターが乗っていてもボタンと地を描かないこと（規則と理由は `HF-15` が持つ）。',
    )
  })

  it('S-620 is 12px by default and the generated constant states the same number', () => {
    expect(S_620).toBe(12)
    expect(NOT_STORED_TASK_GROUP_DROP_RING_SIZES['S-620']).toBe(S_620)
  })

  it('names the carried mark data-task-group-carried', () => {
    expect(TASK_GROUP_CARRIED_MARK).toBe('data-task-group-carried')
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

function panelFor(heldId: string | null, landing: Landing, pinned: readonly string[] = []): TaskGroupPanel {
  const document = documentOf({ pinned })
  const readings = {
    ...READINGS,
    taskGroupBoxes: boxesOf({ pinned }),
    taskGroupGrabbedAt: heldId === null ? null : { taskGroupId: heldId, landing },
  } as unknown as ScreenViewReadings
  return taskGroupPanelFromSchedule(document.schedule, document.documentSettings, emptySelection(), emptyScreenSession, readings)
}

const px = (style: string, property: string): number => {
  const found = new RegExp(`(?:^|;)\\s*${property}:\\s*(-?[\\d.]+)px`).exec(style)
  if (found === null) throw new Error(`the style states no ${property}: ${style}`)
  return Number(found[1])
}
const styleOf = (element: FakeElement): string => element.getAttribute('style') ?? ''

interface Drawn {
  readonly tree: FakeElement
  readonly layer: FakeElement
  readonly host: Document
}

function draw(panel: TaskGroupPanel): Drawn {
  const built = stage()
  const tree = built.host.createElement('div') as unknown as FakeElement
  const layer = built.host.createElement('div') as unknown as FakeElement
  fillTaskGroupTitleTree(built.host, tree as unknown as HTMLElement, panel, new Map<string, HTMLElement>())
  fillTaskGroupGrabCues(built.host, layer as unknown as HTMLElement, tree as unknown as HTMLElement, panel)
  return { tree, layer, host: built.host }
}

const roleIn = (root: FakeElement, role: string): FakeElement[] => descendants(root).filter((one) => one.getAttribute('data-role') === role)
const ringsIn = (root: FakeElement): FakeElement[] => descendants(root).filter((one) => one.hasAttribute('data-drop-ring'))

// Why: the ring may state its border as a shorthand or as border-width; the outer size is the box the eye sees.
function ringGeometry(ring: FakeElement): { outer: number; stroke: number; centerX: number; centerY: number } {
  const style = styleOf(ring)
  const shorthand = /(?:^|;)\s*border:\s*(-?[\d.]+)px/.exec(style)
  const stroke = shorthand !== null ? Number(shorthand[1]) : px(style, 'border-width')
  const isBorderBox = /box-sizing:\s*border-box/.test(style)
  const outer = isBorderBox ? px(style, 'width') : px(style, 'width') + 2 * stroke
  const outerHeight = isBorderBox ? px(style, 'height') : px(style, 'height') + 2 * stroke
  expect(outerHeight).toBeCloseTo(outer, 6)
  return { outer, stroke, centerX: px(style, 'left') + outer / 2, centerY: px(style, 'top') + outer / 2 }
}

describe('HF-15 -- the ring at the left end of the drop line', () => {
  const landing = landingAt('B', 2, under('A2a'))
  const panel = panelFor('B', landing)
  const { layer } = draw(panel)
  const line = roleIn(layer, LINE_ROLE)[0] as FakeElement
  const ring = ringsIn(layer)[0] as FakeElement

  it('stands one ring on the line, as a child of the line', () => {
    expect(roleIn(layer, LINE_ROLE)).toHaveLength(1)
    expect(ringsIn(layer)).toHaveLength(1)
    expect(ring.parentNode).toBe(line)
  })

  it('makes the ring S-620 across the outside and S-213 thick', () => {
    const shape = ringGeometry(ring)
    expect(shape.outer).toBe(S_620)
    expect(shape.stroke).toBe(S_213)
  })

  it('paints the ring stroke with S-151 and its inside with the panel ground S-150', () => {
    const style = styleOf(ring)
    expect(style).toContain(PAINT.heldTaskGroup)
    expect(style).toContain(PAINT.panel)
    expect(/border[^;]*solid/.test(style)).toBe(true)
  })

  it('makes the ring round', () => {
    const radius = /border-radius:\s*([^;]+)/.exec(styleOf(ring))?.[1] ?? ''
    expect(radius === '50%' || parseFloat(radius) >= S_620 / 2).toBe(true)
  })

  it('centres the ring on the left end of the line', () => {
    const shape = ringGeometry(ring)
    expect(shape.centerX).toBeCloseTo(0, 6)
    expect(shape.centerY).toBeCloseTo(px(styleOf(line), 'height') / 2, 6)
  })

  it('moves the line, and with it the ring, when the depth changes', () => {
    const deepLanding = landingAt('B', 3, under('A2a'))
    const shallowLanding = landingAt('B', 0, under('A2a'))
    const deeper = draw(panelFor('B', deepLanding))
    const shallower = draw(panelFor('B', shallowLanding))
    const leftOf = (drawn: Drawn): number => px(styleOf(roleIn(drawn.layer, LINE_ROLE)[0] as FakeElement), 'left')
    expect(ringsIn(deeper.layer)).toHaveLength(1)
    expect(ringsIn(shallower.layer)).toHaveLength(1)
    expect(leftOf(deeper) - leftOf(shallower)).toBeCloseTo((deepLanding?.lineIndentPx ?? NaN) - (shallowLanding?.lineIndentPx ?? NaN), 6)
  })

  it('stands the ring on the dashed line of a depth past the cap, still a solid ring of the same size', () => {
    const capped: TaskGroupPanel = {
      ...panel,
      dropCue: { ...(panel.dropCue as NonNullable<TaskGroupPanel['dropCue']>), isPastDepthCap: true },
    }
    const drawn = draw(capped)
    const cappedLine = roleIn(drawn.layer, LINE_ROLE)[0] as FakeElement
    const cappedRing = ringsIn(drawn.layer)[0] as FakeElement
    expect(cappedRing).toBeDefined()
    expect(cappedRing.parentNode).toBe(cappedLine)
    expect(styleOf(cappedLine)).not.toBe(styleOf(line))
    expect(styleOf(cappedLine)).toContain('dashed')
    expect(styleOf(cappedRing)).not.toContain('dashed')
    expect(/border[^;]*solid/.test(styleOf(cappedRing))).toBe(true)
    const shape = ringGeometry(cappedRing)
    expect(shape.outer).toBe(S_620)
    expect(shape.stroke).toBe(S_213)
  })
})

describe('HF-15 -- no task group is framed to show the drop', () => {
  const scenes: readonly [string, Landing][] = [
    ['an open parent (B1 under B)', landingAt('A2', 1, under('B'))],
    ['an open parent at depth 3 (under A1x)', landingAt('B', 3, under('A1x'))],
    ['a folded parent (the gap under C, one deeper)', landingAt('A2', 1, under('C'))],
    ['the top depth (depth 1)', landingAt('A2', -5, under('A2a'))],
  ]

  it.each(scenes)('draws no frame for %s', (_name, landing) => {
    expect(landing).not.toBeNull()
    const drawn = draw(panelFor('A2', landing))
    for (const one of [...descendants(drawn.tree), ...descendants(drawn.layer)]) {
      expect(one.hasAttribute('data-drop-parent')).toBe(false)
      expect(styleOf(one)).not.toContain('outline')
    }
    expect(roleIn(drawn.layer, LINE_ROLE)).toHaveLength(1)
  })

  it('draws no frame around a pinned parent either', () => {
    const scene = { pinned: ['B'] }
    const drawn = draw(panelFor('A2', landingAt('A2', 1, under('B', scene), scene), ['B']))
    for (const one of [...descendants(drawn.tree), ...descendants(drawn.layer)]) {
      expect(one.hasAttribute('data-drop-parent')).toBe(false)
      expect(styleOf(one)).not.toContain('outline')
    }
  })
})

describe('HF-15 -- the line and the copy are drawn into the cue layer, not into the rows', () => {
  const landing = landingAt('B', 2, under('A2a'))

  it('keeps the line, the ring and the copy out of the rows', () => {
    const built = stage()
    const tree = built.host.createElement('div') as unknown as FakeElement
    fillTaskGroupTitleTree(built.host, tree as unknown as HTMLElement, panelFor('B', landing), new Map<string, HTMLElement>())
    expect(roleIn(tree, LINE_ROLE)).toEqual([])
    expect(roleIn(tree, COPY_ROLE)).toEqual([])
    expect(ringsIn(tree)).toEqual([])
    expect(descendants(tree).some((one) => one.hasAttribute('data-drop-parent'))).toBe(false)
  })

  it('makes the layer hold only the line (with its ring) and the copy', () => {
    const { layer } = draw(panelFor('B', landing))
    expect(layer.children.map((one) => one.getAttribute('data-role')).sort()).toEqual([LINE_ROLE, COPY_ROLE].sort())
    expect(descendants(layer)).toHaveLength(3)
  })

  it('holds only the copy in the layer when there is no landing, and marks the tree carried', () => {
    const { layer, tree } = draw(panelFor('A', null))
    expect(layer.children.map((one) => one.getAttribute('data-role'))).toEqual([COPY_ROLE])
    expect(tree.getAttribute(TASK_GROUP_CARRIED_MARK)).toBe('true')
  })

  it('marks the tree carried while a line and a copy exist', () => {
    expect(draw(panelFor('B', landing)).tree.getAttribute(TASK_GROUP_CARRIED_MARK)).toBe('true')
  })

  it('empties the layer and marks the tree not carried when nothing is carried', () => {
    const { layer, tree } = draw(panelFor(null, null))
    expect(layer.children).toEqual([])
    expect(tree.getAttribute(TASK_GROUP_CARRIED_MARK)).toBe('false')
  })

  it('replaces what the layer held when it is filled again (no stale line survives the drop)', () => {
    const drawn = draw(panelFor('B', landing))
    fillTaskGroupGrabCues(drawn.host, drawn.layer as unknown as HTMLElement, drawn.tree as unknown as HTMLElement, panelFor(null, null))
    expect(drawn.layer.children).toEqual([])
    expect(drawn.tree.getAttribute(TASK_GROUP_CARRIED_MARK)).toBe('false')
  })
})

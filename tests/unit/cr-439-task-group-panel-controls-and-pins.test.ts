// Pins what the spec asks of the Task Group Panel the DOM surface draws (CR-439).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  TaskGroupTitle,
  TaskGroupPanel,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  domScreenSurface,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  byRole,
  descendants,
  FakeElement,
  iconEntry,
  oneByRole,
  paintedColour,
  selfAndDescendants,
  stage,
  styleMap,
  wiringOf,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

function rowOf(table: string, id: string) {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const rowText = (table: string, id: string): string => unbroken(rowOf(table, id).cells.join(' '))
const englishName = (id: string): string => bare(rowOf('T-103', id).by['確定名（英）'] ?? '')

const HF_10_ORDER =
  '頭の並びは、左から すべて畳む・1 階層開く・すべて開く・足す・すべて消すの順に、1 行に並べること（MUST）'
const HF_10_NOT_TWO_TIERS =
  '2 段に積まないのは、パネルの頭の高さが 2 段に足りない倍率で、下の段の操作子が隠れて押せなくなるからである。'
const HF_20_LAST = '並びの最後、`HF-17`（最も浅い段へ足す）の右隣である。'
const HF_12_COUNT = 'そのときは、頭にいま何行を畳み込んでいるかを示すこと（MUST）'
const HF_18_COUNT = '配下に畳み込んでいる行があるとき、その行数を行に示すこと（MUST）'
const HF_2_FAINT = '押しても何も変わらないときだけ、`FR-029` に従って薄く描くこと（MUST）'
const HF_2_ARMED = '押した行の配下に `FR-018` の 表 T-329 で描かれていない行が 1 つでもあるときである'
const HF_6_KEEP_PLACE = '描かないあいだも、確保する場所を変えてはならない（MUST NOT）'
const HF_6_PIN = 'ピン止めしている行の `IC-60` だけは、ポインタが乗っていなくても描くこと（MUST）'
const HF_15_MARK = '印は縦に並べた 2 本の三点リーダ（`⋮⋮` U+22EE を 2 つ）とすること（MUST）'
const FR_098_ONCE = '同じ行を本来の縦位置にも描いてはならない（MUST NOT）'
const FR_029_NOT_DISABLED = '薄く描いた入口を、宿主の意味で無効にしてはならない（MUST NOT）'

const TASK_GROUP_PANEL = englishName('U-22')
const TASK_GROUP_EXPANDER = englishName('U-47')
const TASK_GROUP_PIN = englishName('U-48')

// see T-109, HF-20
// WHY: IC-106 shares its authority column (FR-032) with IC-82; only its entrance column names HF-20.
function iconFor(hfRow: string): string {
  const onPanel = specTable('T-109').rows.filter((one) => (one.by['面'] ?? '').includes('Task Group Panel'))
  const byAuthority = onPanel.filter((one) => (one.by['正'] ?? '').includes(`\`${hfRow}\``))
  const found =
    byAuthority.length > 0
      ? byAuthority
      : onPanel.filter((one) => (one.by['何の入口か'] ?? '').includes(`\`${hfRow}\``))
  if (found.length !== 1) {
    throw new Error(`table T-109 has ${found.length} Task Group Panel entrances for ${hfRow}, not one`)
  }
  return (found[0] as { id: string }).id
}

const HEAD_RULES = ['HF-12', 'HF-16', 'HF-10', 'HF-17', 'HF-20'] as const

const headEntrances = (built: Stage, icons: readonly string[]): FakeElement[] =>
  descendants(oneByRole(built.root(), TASK_GROUP_PANEL)).filter((one) =>
    icons.includes(one.getAttribute('data-icon') ?? ''),
  )

const THEME: ScreenTheme ={ preference: 'light', hue: 214 }
const S_149_LIGHT = bare(rowOf('T-236', 'S-149').by['明るいテーマ'] ?? '')
  .replace('H', String(THEME.hue))
  .replace(/\s+/g, '')
  .toLowerCase()

const rect = (x: number, y: number, width: number, height: number) => ({ x, y, width, height })

function title(groupId: string, top: number, over: Partial<TaskGroupTitle> = {}): TaskGroupTitle {
  return {
    groupId,
    depth: 0,
    box: rect(0, top, 170, 30),
    indentPx: 0,
    fontPx: 14,
    label: `row ${groupId}`,
    wholeLabel: `row ${groupId}`,
    isLabelTruncated: false,
    expander: { canOpen: true, canClose: true, canCloseBelow: true },
    canOpenOneLevel: true,
    canAddChildTaskGroup: true,
    isPinned: false,
    isSelected: false,
    ...over,
  }
}

function viewWith(panel: TaskGroupPanel): ScreenView {
  return {
    language: 'ja',
    frame: { isFullScreen: false, dividers: [], scrollbars: [] },
    appHeaderItems: {
      documentTitle: null,
      openedFileName: null,
      fileSavedAt: null,
      fileSavedByteLength: null,
      fileNeverSavedText: '',
      commands: [],
      language: 'ja',
    },
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

function drawn(panel: TaskGroupPanel): Stage {
  const built = stage({ 'App Header': 37 })
  const surface = domScreenSurface(wiringOf(built, THEME))
  surface.showScreenView(viewWith(panel))
  return built
}

const taskGroupNode = (built: Stage, groupId: string): FakeElement[] =>
  selfAndDescendants(built.root()).filter((one) => one.getAttribute('data-group-id') === groupId)

const PINNED = title('g-pinned', 40, { isPinned: true, foldedTaskGroupCount: 4 })
const PLAIN = title('g-plain', 70, {
  expander: { canOpen: false, canClose: true, canCloseBelow: true },
})

describe('CR-439 Task Group Panel -- the clauses still stand', () => {
  it('T-051, FR-098 and FR-029 still say what these cases test', () => {
    expect(rowText('T-051', 'HF-10')).toContain(HF_10_ORDER)
    expect(rowText('T-051', 'HF-10')).toContain(HF_10_NOT_TWO_TIERS)
    expect(rowText('T-051', 'HF-20')).toContain(HF_20_LAST)
    expect(rowText('T-051', 'HF-12')).toContain(HF_12_COUNT)
    expect(rowText('T-051', 'HF-18')).toContain(HF_18_COUNT)
    expect(rowText('T-051', 'HF-2')).toContain(HF_2_FAINT)
    expect(rowText('T-051', 'HF-2')).toContain(HF_2_ARMED)
    expect(rowText('T-051', 'HF-6')).toContain(HF_6_KEEP_PLACE)
    expect(rowText('T-051', 'HF-6')).toContain(HF_6_PIN)
    expect(rowText('T-051', 'HF-15')).toContain(HF_15_MARK)
    expect(REQUIREMENTS).toContain(FR_098_ONCE)
    expect(REQUIREMENTS).toContain(FR_029_NOT_DISABLED)
  })
})

describe('the head of the panel (HF-10, HF-12)', () => {
  it('HF-10 左から すべて畳む・1 階層開く・すべて開く・足す・すべて消すの順 -- the five head entrances stand in that order', () => {
    const built = drawn({ pinnedTitles: [], titles: [PLAIN] })
    const wanted = HEAD_RULES.map(iconFor)
    const head = headEntrances(built, wanted)
    expect(head.map((one) => one.getAttribute('data-icon')).sort(), HF_10_ORDER).toEqual([...wanted].sort())
    const leftToRight = [...head].sort((a, b) => {
      const ra = Number.parseFloat(styleMap(a).get('right') ?? 'NaN')
      const rb = Number.parseFloat(styleMap(b).get('right') ?? 'NaN')
      if (Number.isNaN(ra) || Number.isNaN(rb)) return head.indexOf(a) - head.indexOf(b)
      return rb - ra
    })
    expect(leftToRight.map((one) => one.getAttribute('data-icon')), HF_10_ORDER).toEqual(wanted)
    expect(leftToRight.at(-1)?.getAttribute('data-icon'), HF_20_LAST).toBe(iconFor('HF-20'))
  })

  it.each([
    ['with a row drawn', [PLAIN]],
    ['with no row drawn', []],
  ] as const)('HF-10 1 行に並べること -- the five head entrances share one top, %s', (_name, titles) => {
    const built = drawn({ pinnedTitles: [], titles: [...titles], foldedTaskGroupCount: 3 })
    const head = headEntrances(built, HEAD_RULES.map(iconFor))
    expect(head, `premise: ${HF_10_ORDER}`).toHaveLength(HEAD_RULES.length)
    expect(new Set(head.map((one) => one.parentNode)).size, `premise, one box holds the run: ${HF_10_ORDER}`).toBe(1)
    const tops = head.map((one) => `top:${styleMap(one).get('top') ?? '(none)'} bottom:${styleMap(one).get('bottom') ?? '(none)'}`)
    expect(new Set(tops).size, `${HF_10_ORDER} / ${HF_10_NOT_TWO_TIERS} -- ${tops.join(', ')}`).toBe(1)
  })

  it('HF-12 頭にいま何行を畳み込んでいるかを示すこと -- the head shows the folded count even with no row drawn', () => {
    const built = drawn({ pinnedTitles: [], titles: [], foldedTaskGroupCount: 7 })
    const panel = oneByRole(built.root(), TASK_GROUP_PANEL)
    expect(panel.textContent).toMatch(/(^|\D)7(\D|$)/)
  })
})

describe('each row (HF-18, HF-2, HF-6, HF-15, FR-098)', () => {
  it('HF-18 その行数を行に示すこと -- a row holding folded rows shows how many', () => {
    const built = drawn({ pinnedTitles: [PINNED], titles: [PLAIN] })
    const [row] = taskGroupNode(built, 'g-pinned')
    expect(row?.textContent ?? '').toMatch(/(^|\D)4(\D|$)/)
  })

  it('HF-2 薄く描くこと / FR-029 -- the open-all control of a row with no undrawn descendant (table T-329) is faint, yet not host-disabled', () => {
    const built = drawn({ pinnedTitles: [], titles: [PLAIN, title('g-live', 100)] })
    const openAll = iconFor('HF-2')
    const faint = iconEntry(taskGroupNode(built, 'g-plain')[0] as FakeElement, openAll)
    const live = iconEntry(taskGroupNode(built, 'g-live')[0] as FakeElement, openAll)
    expect(paintedColour(built, faint)).toBe(S_149_LIGHT)
    expect(paintedColour(built, live)).not.toBe(S_149_LIGHT)
    expect(faint.hasAttribute('disabled')).toBe(false)
  })

  it('HF-6 描かないあいだも、確保する場所を変えてはならない -- no row control is taken out of the layout', () => {
    const built = drawn({ pinnedTitles: [PINNED], titles: [PLAIN] })
    const controls = [...byRole(built.root(), TASK_GROUP_EXPANDER), ...byRole(built.root(), TASK_GROUP_PIN)]
    expect(controls.length).toBeGreaterThan(0)
    for (const one of controls) expect(styleMap(one).get('display')).not.toBe('none')
  })

  it('HF-6 ピン止めしている行の IC-60 だけは、ポインタが乗っていなくても描くこと', () => {
    const built = drawn({ pinnedTitles: [PINNED], titles: [PLAIN] })
    const pinOf = (groupId: string): FakeElement =>
      byRole(taskGroupNode(built, groupId)[0] as FakeElement, TASK_GROUP_PIN)[0] as FakeElement
    expect(pinOf('g-pinned').getAttribute('data-icon')).toBe('IC-60')
    expect(styleMap(pinOf('g-pinned')).get('visibility')).toBe('visible')
    expect(styleMap(pinOf('g-plain')).get('visibility')).not.toBe('visible')
  })

  it('HF-15 印は縦に並べた 2 本の三点リーダ -- an unpinned row carries the ⋮⋮ grab mark as text, not a button', () => {
    const built = drawn({ pinnedTitles: [], titles: [PLAIN] })
    const row = taskGroupNode(built, 'g-plain')[0] as FakeElement
    const marks = selfAndDescendants(row).filter((one) =>
      one.childNodes.some((child) => !(child instanceof FakeElement) && child.data.includes('⋮⋮')),
    )
    expect(marks.length).toBeGreaterThan(0)
    for (const mark of marks) expect(mark.tagName).not.toBe('BUTTON')
  })

  it('FR-098 同じ行を本来の縦位置にも描いてはならない -- a pinned row is drawn once', () => {
    const built = drawn({ pinnedTitles: [PINNED], titles: [PLAIN] })
    expect(taskGroupNode(built, 'g-pinned')).toHaveLength(1)
    expect(taskGroupNode(built, 'g-plain')).toHaveLength(1)
    expect(taskGroupNode(built, 'g-pinned')[0]?.textContent).toContain('row g-pinned')
  })
})

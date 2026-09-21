// CR-541: the [vv] entrances of the Row Title Panel and the gap of its row controls.

import { afterEach, describe, expect, it } from 'vitest'

import type { RowTitle, RowTitlePanel, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { domScreenSurface, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { bare, bareAll, specTable } from '../contract/spec-table'
import { selfAndDescendants, stage, styleMap, wiringOf, type FakeElement } from '../fixtures/fake-browser'
import { REQUIREMENTS, rowDocument, rowOf, shell, type RowSeed, type ShellBench } from './cr-541-stage'

const Q02 = '⭐ 押したときは、押した行に開いたままの印を立て、その配下の行はすべて人の指定の無い状態へ戻すこと（MUST）'
const Q03 = '⭐ 押しても何も変わらないときだけ、`FR-029` に従って薄く描くこと（MUST）'
const Q04 = '⭐ 並びのいちばん右の操作子の外形と、行見出しパネルの右端とのあいだを、`_assets/tbl-settings.md` の 表 T-206 の `S-313` とすること（MUST）'
const Q05 = '⭐ 押したときは、すべての行を人の指定の無い状態へ戻すこと（MUST）'
const Q06 = '⭐ 畳み・隠し・開いたままの印のどれも 1 つも無いときだけ、`FR-029` に従って薄く描くこと（MUST）'

const ROW_TITLE_PANEL = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')
const ON_THE_PANEL = specTable('T-109').rows.filter((one) =>
  bareAll(one.by['面'] ?? '').includes(ROW_TITLE_PANEL),
)
function entranceFor(rule: string): string {
  const found = ON_THE_PANEL.filter((one) =>
    new RegExp(`(^|[^0-9A-Za-z-])${rule}([^0-9-]|$)`).test(one.by['正'] ?? ''),
  )
  if (found.length !== 1) throw new Error(`table T-109 gives ${rule} ${found.length} entrances`)
  return found[0]!.id
}
const OPEN_ALL_BELOW = entranceFor('HF-2')
const HEAD_OPEN_EVERY_ROW = entranceFor('HF-10')

const A = 'aaaaaaaa-0000-4000-8000-000000000001'
const B = 'aaaaaaaa-0000-4000-8000-000000000002'
const C1 = 'aaaaaaaa-0000-4000-8000-000000000003'
const G1 = 'aaaaaaaa-0000-4000-8000-000000000004'
const C2 = 'aaaaaaaa-0000-4000-8000-000000000005'
const Z = 'aaaaaaaa-0000-4000-8000-000000000006'
const Z1 = 'aaaaaaaa-0000-4000-8000-000000000007'
const TREE: readonly RowSeed[] = [
  { id: A, parentId: null },
  { id: B, parentId: A },
  { id: C1, parentId: B },
  { id: G1, parentId: C1 },
  { id: C2, parentId: B },
  { id: Z, parentId: null },
  { id: Z1, parentId: Z },
]
const below = (id: string): string[] =>
  TREE.filter((one) => one.parentId === id).flatMap((one) => [one.id, ...below(one.id)])

const withMarks = (marks: Record<string, Partial<RowSeed>>): RowSeed[] =>
  TREE.map((one) => ({ ...one, ...(marks[one.id] ?? {}) }))

const opened: ShellBench[] = []
const bench = (rows: readonly RowSeed[], zoomY = 1.2): ShellBench => {
  const built = shell(rowDocument(rows, { zoomY }))
  opened.push(built)
  return built
}
afterEach(() => {
  for (const one of opened.splice(0)) one.restore()
})

const neutral = (row: any): boolean =>
  row.isCollapsed !== true && row.isHidden !== true && row.isKeptOpen !== true

const titleOf = (built: ShellBench, id: string): RowTitle | undefined => {
  const panel = built.last().rowTitlePanel
  return [...panel.pinnedTitles, ...panel.titles].find((one) => one.groupId === id)
}

describe('CR-541 -- the clauses still stand in the manuscript', () => {
  it.each([Q02, Q03, Q04, Q05, Q06])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe('HF-2 [vv] on one row (KO-2)', () => {
  it(Q02, () => {
    const built = bench(
      withMarks({ [C1]: { isCollapsed: true }, [G1]: { isHidden: true }, [C2]: { isKeptOpen: true } }),
    )
    built.press(ROW_TITLE_PANEL, OPEN_ALL_BELOW, B)
    const byId = new Map(built.groups().map((one: any) => [one.id, one]))
    expect(byId.get(B)?.isKeptOpen, 'KO-2: the pressed row carries the kept-open mark').toBe(true)
    for (const id of below(B)) expect(neutral(byId.get(id)), `KO-2: ${id} below the pressed row is neutral`).toBe(true)
    expect(byId.get(A)?.isKeptOpen, 'rows above the pressed row are not written').toBe(false)
  })

  it(`${Q03} -- drawn faint exactly when the press changes nothing`, () => {
    const fixtures: { readonly rows: RowSeed[]; readonly zoomY: number }[] = [
      { rows: withMarks({}), zoomY: 1.2 },
      { rows: withMarks({ [B]: { isKeptOpen: true } }), zoomY: 1.2 },
      { rows: withMarks({ [C1]: { isCollapsed: true } }), zoomY: 1.2 },
      { rows: withMarks({ [G1]: { isHidden: true } }), zoomY: 1.2 },
      { rows: withMarks({ [C2]: { isKeptOpen: true } }), zoomY: 1.2 },
      { rows: withMarks({}), zoomY: 0.25 },
    ]
    const disagree: string[] = []
    for (const fixture of fixtures) {
      const probe = bench(fixture.rows, fixture.zoomY)
      const drawn = [...probe.last().rowTitlePanel.titles, ...probe.last().rowTitlePanel.pinnedTitles]
      for (const title of drawn) {
        const armed = title.expander.canOpen
        const built = bench(fixture.rows, fixture.zoomY)
        const before = JSON.stringify(built.groups())
        built.press(ROW_TITLE_PANEL, OPEN_ALL_BELOW, title.groupId)
        const acted = JSON.stringify(built.groups()) !== before
        if (armed !== acted) disagree.push(`zoomY ${fixture.zoomY} row ${title.groupId}: drawn armed=${armed}, press changed=${acted}`)
      }
    }
    expect(disagree).toEqual([])
  })

  it(`${Q03} -- a row with no mark whose direct children are all drawn is faint`, () => {
    const built = bench(withMarks({}), 1.2)
    const title = titleOf(built, Z)
    expect(title, 'premise: Z is drawn').toBeDefined()
    expect(titleOf(built, Z1), 'premise: its child is drawn').toBeDefined()
    expect(title!.expander.canOpen).toBe(false)
  })
})

describe('HF-10 [vv] at the head of the panel (KO-3)', () => {
  it(Q05, () => {
    const built = bench(
      withMarks({ [B]: { isKeptOpen: true }, [C1]: { isCollapsed: true }, [G1]: { isHidden: true }, [Z]: { isCollapsed: true } }),
    )
    built.press(ROW_TITLE_PANEL, HEAD_OPEN_EVERY_ROW, null)
    for (const row of built.groups()) expect(neutral(row), `KO-3: ${row.id} is neutral`).toBe(true)
  })

  it.each([
    ['no fold, no hide, no mark', {}, false],
    ['one kept-open mark only', { [B]: { isKeptOpen: true } }, true],
    ['one fold', { [C1]: { isCollapsed: true } }, true],
    ['one hide', { [G1]: { isHidden: true } }, true],
  ] as const)(`${Q06} -- %s`, (_name, marks, armed) => {
    const built = bench(withMarks(marks as Record<string, Partial<RowSeed>>))
    expect(built.last().rowTitlePanel.canOpenEveryRow).toBe(armed)
  })
})

const S_313 = numberOfPx(rowOf('T-206', 'S-313').cells.join(' '))
function numberOfPx(cell: string): number {
  const found = /(\d+(?:\.\d+)?)\s*px/.exec(cell)
  if (found === null) throw new Error(`no px value in ${cell}`)
  return Number(found[1])
}

const THEME: ScreenTheme = { preference: 'light', hue: 214 }
const PANEL_TITLE: RowTitle = {
  groupId: 'g-one',
  depth: 0,
  box: { x: 0, y: 40, width: 170, height: 30 },
  indentPx: 0,
  fontPx: 14,
  label: 'row one',
  wholeLabel: 'row one',
  isLabelTruncated: false,
  expander: { canOpen: true, canClose: true, canCloseBelow: true },
  canOpenOneLevel: true,
  canAddChildRow: true,
  isPinned: true,
  isSelected: false,
}
function viewWith(panel: RowTitlePanel): ScreenView {
  return {
    language: 'ja',
    frame: { isFullScreen: false, dividers: [], scrollbars: [] },
    appHeaderItems: { documentTitle: null, openedFileName: null, fileSavedAt: null, fileNeverSavedText: '', commands: [], language: 'ja' },
    rowTitlePanel: panel,
    propertiesPanel: null,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips: [],
  }
}

describe('HF-4 -- the rightmost row control stands S-313 from the panel edge', () => {
  it(Q04, () => {
    expect(S_313).toBe(4)
    const built = stage({ 'App Header': 37 })
    domScreenSurface(wiringOf(built, THEME)).showScreenView(viewWith({ pinnedTitles: [PANEL_TITLE], titles: [] }))
    const row = selfAndDescendants(built.root()).find((one) => one.getAttribute('data-group-id') === 'g-one')
    expect(row, 'premise: the row is drawn').toBeDefined()
    const controls = selfAndDescendants(row as FakeElement).filter(
      (one) => one.getAttribute('data-icon') !== null && Number.isFinite(Number.parseFloat(styleMap(one).get('right') ?? 'NaN')),
    )
    expect(controls.length, 'premise: the row controls are placed from the right edge').toBeGreaterThan(0)
    const rightmost = Math.min(...controls.map((one) => Number.parseFloat(styleMap(one).get('right') ?? 'NaN')))
    expect(rightmost).toBe(S_313)
  })
})

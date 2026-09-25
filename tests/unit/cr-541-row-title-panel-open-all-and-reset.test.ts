// see CR-541, CR-570, HF-2, HF-10, HF-4

import { afterEach, describe, expect, it } from 'vitest'

import type { RowTitle, RowTitlePanel, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { domScreenSurface, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { bare, bareAll, specTable } from '../contract/spec-table'
import { selfAndDescendants, stage, styleMap, wiringOf, type FakeElement } from '../fixtures/fake-browser'
import { REQUIREMENTS, rowDocument, rowOf, shell, type RowSeed, type ShellBench } from './cr-541-stage'

const Q02 = '⭐ 押したときに行が取る値は、`_assets/tbl-state-machines.md` の 表 T-328 の `allBelowOpenPressed` の行に従うこと（MUST）'
const Q03 = '⭐ 押しても何も変わらないときだけ、`FR-029` に従って薄く描くこと（MUST）'
const Q04 = '⭐ 並びのいちばん右の操作子の外形と、行見出しパネルの右端とのあいだを、`_assets/tbl-settings.md` の 表 T-206 の `S-313` とすること（MUST）'
const Q05 = '⭐ 押したときに行と段 0 が取る値は 表 T-328 の `everyRowOpenPressed` の行と根の升に従うこと（MUST）'
const Q06 = '⭐ 描かれていない行（`FR-018` の 表 T-329）が 1 つも無いときだけ、`FR-029` に従って薄く描くこと（MUST）'
const FR_018_ONLY_T_328 = '⭐ 値を書き換える入口と先の値は、段 0 の畳み（`_assets/tbl-settings.md` の 表 T-203 の `S-418`）を含めて、`_assets/tbl-state-machines.md` の 表 T-328 に従うこと（MUST） —— 同表に無い操作で値を書き換えてはならない（MUST NOT）'

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

type TreeState = NonNullable<RowSeed['treeState']>
const withStates = (states: Record<string, TreeState>): RowSeed[] =>
  TREE.map((one) => ({ ...one, treeState: states[one.id] ?? 'auto' }))

const opened: ShellBench[] = []
const bench = (rows: readonly RowSeed[], zoomY = 1.2, levelZeroTreeState: 'auto' | 'collapsed' = 'auto'): ShellBench => {
  const built = shell(rowDocument(rows, { zoomY, levelZeroTreeState }))
  opened.push(built)
  return built
}
afterEach(() => {
  for (const one of opened.splice(0)) one.restore()
})

const statesOf = (built: ShellBench): Record<string, unknown> =>
  Object.fromEntries(built.groups().map((one: any) => [one.id, one.treeState]))

const titleOf = (built: ShellBench, id: string): RowTitle | undefined => {
  const panel = built.last().rowTitlePanel
  return [...panel.pinnedTitles, ...panel.titles].find((one) => one.groupId === id)
}

describe('CR-541 / CR-570 -- the clauses still stand in the manuscript', () => {
  it.each([Q02, Q03, Q04, Q05, Q06, FR_018_ONLY_T_328])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe('HF-2 [vv] on one row (T-328 allBelowOpenPressed)', () => {
  it(Q02, () => {
    const built = bench(withStates({ [C1]: 'collapsed', [G1]: 'hidden', [C2]: 'expanded' }))
    built.press(ROW_TITLE_PANEL, OPEN_ALL_BELOW, B)
    expect(statesOf(built)).toEqual({
      [A]: 'auto',
      [B]: 'temporarilyExpanded',
      [C1]: 'temporarilyExpanded',
      [G1]: 'auto',
      [C2]: 'expanded',
      [Z]: 'auto',
      [Z1]: 'auto',
    })
  })

  it(`${Q03} -- drawn faint exactly when the press changes nothing`, () => {
    const fixtures: { readonly rows: RowSeed[]; readonly zoomY: number }[] = [
      { rows: withStates({}), zoomY: 1.2 },
      { rows: withStates({ [B]: 'expanded' }), zoomY: 1.2 },
      { rows: withStates({ [C1]: 'collapsed' }), zoomY: 1.2 },
      { rows: withStates({ [G1]: 'hidden' }), zoomY: 1.2 },
      { rows: withStates({ [C2]: 'expanded' }), zoomY: 1.2 },
      { rows: withStates({}), zoomY: 0.25 },
      { rows: withStates({ [C1]: 'temporarilyExpanded' }), zoomY: 0.25 },
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

  it(`${Q03} -- a row whose descendants are all drawn is faint`, () => {
    const built = bench(withStates({}), 1.2)
    const title = titleOf(built, Z)
    expect(title, 'premise: Z is drawn').toBeDefined()
    expect(titleOf(built, Z1), 'premise: its child is drawn').toBeDefined()
    expect(title!.expander.canOpen).toBe(false)
  })
})

describe('HF-10 [vv] at the head of the panel (T-328 everyRowOpenPressed)', () => {
  it(Q05, () => {
    const built = bench(withStates({ [B]: 'expanded', [C1]: 'collapsed', [G1]: 'hidden', [Z]: 'collapsed' }))
    built.press(ROW_TITLE_PANEL, HEAD_OPEN_EVERY_ROW, null)
    expect(statesOf(built)).toEqual({
      [A]: 'temporarilyExpanded',
      [B]: 'expanded',
      [C1]: 'temporarilyExpanded',
      [G1]: 'auto',
      [C2]: 'auto',
      [Z]: 'temporarilyExpanded',
      [Z1]: 'auto',
    })
  })

  it(`${Q05} -- a folded level zero is opened by the same press`, () => {
    const built = bench(withStates({}), 1.2, 'collapsed')
    built.press(ROW_TITLE_PANEL, HEAD_OPEN_EVERY_ROW, null)
    expect((built.loop.document().documentSettings as any).levelZeroTreeState).toBe('auto')
  })

  it.each([
    ['nothing folded, hidden or dropped', {}, 1.2, 'auto', false],
    ['one expanded row only', { [B]: 'expanded' }, 1.2, 'auto', false],
    ['one fold', { [C1]: 'collapsed' }, 1.2, 'auto', true],
    ['one hide', { [G1]: 'hidden' }, 1.2, 'auto', true],
    ['rows dropped by the zoom', {}, 0.25, 'auto', true],
    ['level zero folded', {}, 1.2, 'collapsed', true],
  ] as const)(`${Q06} -- %s`, (_name, states, zoomY, levelZero, armed) => {
    const built = bench(withStates(states as Record<string, TreeState>), zoomY, levelZero)
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

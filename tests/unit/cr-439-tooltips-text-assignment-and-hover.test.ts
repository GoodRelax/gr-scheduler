// Pins what the spec asks of the tooltips the DOM surface draws (CR-439).

import { describe, expect, it } from 'vitest'

import type {
  ScreenView,
  Tooltip,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  domScreenSurface,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  FakeElement,
  oneByRole,
  selfAndDescendants,
  stage,
  styleMap,
  wiringOf,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from '../contract/spec-table'

function rowOf(table: string, id: string) {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const rowText = (table: string, id: string): string => unbroken(rowOf(table, id).cells.join(' '))

const EZ_2_ASSIGNMENT = '説明の後ろに、その行の割当も出すこと（MUST）'
const EZ_2_SIZE = '字の大きさは 表 T-206 の `S-204` が定める係数で決めること（MUST）'
const EZ_6_WHOLE_NAME = '**名前は打ち切らずに全文を出すこと（MUST）**'
const IN_3_TAKES_NO_POINTER = '⭐ ツールチップはポインタを受け取らず、下へ通すこと（MUST）（`FR-152` の 表 T-337 の `UZ-2`）'
const UZ_2_PASSES_THE_PRESS = '押下を受けず、下へ通すこと（MUST）—— 説明は短く、押すものを持たないので、覆った入口から押す手を奪ってはならない'
const IN_3_THE_OLD_CLAUSE = 'ポインタを乗せられること'

const TOOLTIP = bare(rowOf('T-103', 'U-53').by['確定名（英）'] ?? '')
const S_204 = Number.parseFloat(bare(rowOf('T-206', 'S-204').by['既定'] ?? ''))

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

const LONG_NAME = 'A task name long enough to be cut on the chart but never in its tooltip'

const ICON_TIP: Tooltip = { anchor: { kind: 'icon', icon: 'IC-5' }, text: 'Undo the last edit', assignment: 'Ctrl+Z' }
const TASK_TIP: Tooltip = {
  anchor: { kind: 'task', taskUid: 3 },
  text: `${LONG_NAME} 2026-09-01 / 2026-09-12`,
  assignment: null,
  at: { x: 200, y: 150 },
}

function viewWith(tooltips: readonly Tooltip[]): ScreenView {
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
    taskGroupPanel: { pinnedTitles: [], titles: [] },
    propertiesPanel: null,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips,
  }
}

function drawn(tooltips: readonly Tooltip[]): Stage {
  const built = stage({ 'App Header': 37 })
  domScreenSurface(wiringOf(built, THEME)).showScreenView(viewWith(tooltips))
  return built
}

const tipsOf = (built: Stage): FakeElement[] => oneByRole(built.root(), TOOLTIP).children

// WHY: pointer-events inherits, so the value a node takes is the nearest declaration up the tree.
/** @purity pure */
function pointerEventsReaching(element: FakeElement): string {
  for (let at: FakeElement | null = element; at !== null; at = at.parentNode) {
    const held = (styleMap(at).get('pointer-events') ?? '').trim().toLowerCase()
    if (held !== '' && held !== 'inherit') return held
  }
  return 'auto'
}

describe('CR-439 Tooltip -- the clauses still stand', () => {
  it('EZ-2, EZ-6 and IN-3 still say what these cases test', () => {
    expect(rowText('T-040', 'EZ-2')).toContain(EZ_2_ASSIGNMENT)
    expect(rowText('T-040', 'EZ-2')).toContain(EZ_2_SIZE)
    expect(rowText('T-040', 'EZ-6')).toContain(EZ_6_WHOLE_NAME)
    expect(rowText('T-028', 'IN-3')).toContain(IN_3_TAKES_NO_POINTER)
    expect(rowText('T-028', 'IN-3')).not.toContain(IN_3_THE_OLD_CLAUSE)
    expect(rowText('T-337', 'UZ-2')).toContain(UZ_2_PASSES_THE_PRESS)
    expect(Number.isFinite(S_204)).toBe(true)
  })
})

describe('the Tooltip (U-53)', () => {
  it('EZ-2 説明の後ろに、その行の割当も出すこと -- the description first, then the assignment', () => {
    const built = drawn([ICON_TIP])
    const tips = tipsOf(built)
    expect(tips).toHaveLength(1)
    const text = tips[0]?.textContent ?? ''
    expect(text).toContain('Undo the last edit')
    expect(text).toContain('Ctrl+Z')
    expect(text.indexOf('Undo the last edit')).toBeLessThan(text.indexOf('Ctrl+Z'))
  })

  it('EZ-2 S-204 が定める係数で決めること -- the tip is sized by the coefficient, not in px', () => {
    const built = drawn([ICON_TIP])
    const sizes = selfAndDescendants(tipsOf(built)[0] as FakeElement)
      .map((one) => styleMap(one).get('font-size'))
      .filter((one): one is string => one !== undefined)
    expect(sizes).toContain(`${S_204}em`)
    for (const one of sizes) expect(one.endsWith('px')).toBe(false)
  })

  it('EZ-6 名前は打ち切らずに全文を出すこと -- the whole text arrives, uncut', () => {
    const built = drawn([TASK_TIP])
    expect(tipsOf(built)[0]?.textContent).toContain(LONG_NAME)
    const style = styleMap(tipsOf(built)[0] as FakeElement)
    expect(style.get('text-overflow')).not.toBe('ellipsis')
  })

  it('IN-3 / UZ-2 ツールチップはポインタを受け取らず、下へ通すこと -- the tip takes no pointer, and nothing inside it takes one back', () => {
    for (const tip of [ICON_TIP, TASK_TIP]) {
      const built = drawn([tip])
      const box = tipsOf(built)[0] as FakeElement
      for (const one of selfAndDescendants(box)) {
        expect(pointerEventsReaching(one), `${tip.anchor.kind} tip: ${one.tagName}`).toBe('none')
      }
    }
  })

  it('no tooltip in the description, none on the screen', () => {
    const built = drawn([])
    expect(tipsOf(built)).toHaveLength(0)
  })
})

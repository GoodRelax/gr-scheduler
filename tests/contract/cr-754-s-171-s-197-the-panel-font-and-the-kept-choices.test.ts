// CR-754 spec-only cases: S-197 / S-171 and FR-006 -- the panel font, its default width, and a fixed-list choice that keeps its room (DFC-2519).

import { describe, expect, it } from 'vitest'

import type { PropertiesPanel } from '../../src/adapter/screen-renderer/screen-renderer'
import { selfAndDescendants, styleMap, type FakeElement } from '../fixtures/fake-browser'
import { drawnPanel, LANGUAGES, REQUIREMENTS, SETTINGS_BOOK, settingsPanel, settingValue, taskPanel } from './cr-754-stage'

// see FR-006, S-171, S-197
const FR_006_KEPT_CHOICE =
  '⭐ 候補が決まった一覧の選び（表 T-016 の `入力の型` が `選択` で、上の段に当たらないもの、と文書の設定の面の選び）は、要る幅を割らないこと（MUST）'
const FR_006_SCROLL_NOT_SHRINK = 'パネルを横に送って見せ、選びを縮めない。'
const S_171_RULE = '横にはみ出さない最も小さい幅とし、10 px 単位に切り上げる。'
const S_197_ONE_PANEL = '文書の設定を出しているときも、選択物を出しているときも同じ値である（パネルは 1 つ）。'

const PANEL_FONT = settingValue('S-197')
const NAME_FONT = settingValue('S-198')
const DEFAULT_WIDTH = settingValue('S-171')

/** @purity pure */
function emOf(element: FakeElement, property: string): number {
  const found = /^([\d.]+)em$/.exec((styleMap(element).get(property) ?? '').trim())
  return found === null ? Number.NaN : Number(found[1])
}

/** @purity pure */
const choicesOf = (panel: PropertiesPanel): readonly { readonly row: string; readonly width: number }[] =>
  panel.fields.flatMap((field) =>
    field.controls
      .filter((one) => one.kind === 'choice' && one.swatches === undefined && one.color === undefined)
      .map((one) => ({ row: field.row, width: one.widthInFontSizes })),
  )

describe('CR-754 premise -- the clauses and rows these cases read', () => {
  it.each([FR_006_KEPT_CHOICE, FR_006_SCROLL_NOT_SHRINK])('01-04 holds %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it.each([S_171_RULE, S_197_ONE_PANEL])('tbl-settings holds %s', (clause) => {
    expect(SETTINGS_BOOK).toContain(clause)
  })

  it('JDG-2096: the panel font is 0.56 of the ground, and the default width measured at it is 560 px', () => {
    expect(PANEL_FONT).toBe(0.56)
    expect(DEFAULT_WIDTH).toBe(560)
    expect(DEFAULT_WIDTH % 10).toBe(0)
  })
})

describe(`S-197 -- ${S_197_ONE_PANEL}`, () => {
  it.each([
    ['the document settings', () => settingsPanel()],
    ['a selected Task', () => taskPanel()],
  ] as const)('%s: the panel is drawn at S-197 of the ground font, item names at S-198 of that', (_name, panel) => {
    const drawn = drawnPanel(panel())
    expect(emOf(drawn, 'font-size')).toBeCloseTo(PANEL_FONT, 6)
    const names = drawn.children.filter((one) => one.getAttribute('data-field-row') !== null).map((one) => one.children[0] as FakeElement)
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) expect(emOf(name, 'font-size'), name.textContent).toBeCloseTo(NAME_FONT, 6)
  })
})

describe(`FR-006 -- ${FR_006_KEPT_CHOICE}`, () => {
  it.each(LANGUAGES)('the document settings (%s): each drawn choice holds its room as a floor, and the panel may scroll sideways', (language) => {
    const panel = settingsPanel({ language })
    const choices = choicesOf(panel)
    expect(choices.length, 'premise: the settings face offers fixed-list choices').toBeGreaterThan(0)
    const drawn = drawnPanel(panel)
    for (const { row, width } of choices) {
      const select = selfAndDescendants(drawn).find((one) => one.tagName === 'SELECT' && one.getAttribute('data-field-row') === row)
      expect(select, `premise: ${row} is drawn as a host choice`).toBeDefined()
      expect(emOf(select as FakeElement, 'min-width'), `${FR_006_SCROLL_NOT_SHRINK} -- ${row}`).toBeGreaterThanOrEqual(width)
    }
    const style = styleMap(drawn)
    for (const property of ['overflow', 'overflow-x']) expect(['hidden', 'clip']).not.toContain((style.get(property) ?? '').trim())
  })
})

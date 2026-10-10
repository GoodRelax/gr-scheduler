// CR-606 spec-only cases: the words and marks of every color field (T-017b CV-9): the transparent

import { describe, expect, it } from 'vitest'

import type { ColorField, PropertyControl } from '../../src/adapter/screen-renderer/screen-renderer'
import type { ItemRef } from '../../src/entity/document-model/selection/selection'
import {
  GROUP_ID,
  PROPERTY_ITEMS_TABLE,
  REQUIREMENTS,
  colorWordOf,
  commentBoxOf,
  controlsOf,
  documentOf,
  highlightBoxOf,
  panelOf,
  taskItem,
  taskOf,
  visualOf,
} from './cr-606-stage'
import { bare, specTable, unbroken } from './spec-table'

// see CV-9
const CV_9_TRANSPARENT_WORD =
  '透明の入口は、塗りの欄（`fillColor` と `TaskGroup.color`）では塗りの無いことを、線の欄（`strokeColor`）では線の無いことを言う語'
const CV_9_THEME_OR_DEFAULT =
  'テーマに戻す入口は、その欄の `null` が描く色の 表 T-236 の行の色相の欄が ○ ならテーマの色に従うことを言う語、— なら既定の色に従うことを言う語'
const CV_9_THEME_PAINT = 'テーマに戻す入口の見本は、その欄の `null` がいま描いている色（テーマの色か既定の色）で塗る。'
const CV_9_GLYPHS = 'テーマに戻す入口の見本には字「T」を、カスタムカラーの入口の見本には字「O」を置き'
const CV_9_CUSTOM_VALUE =
  '⭐ 欄の値がカスタムカラーのときは、カスタムカラーの入口の見本を、`CV-3` で決まった、いま描いている明暗の値で塗り、そのツールチップに値を添えること（MUST）'
const CV_9_FRAME_NO_LINE = 'ハイライトボックスの枠の欄にも透明（線なし）を並べる'
const CV_9_COMMENT_NO_TRANSPARENT = 'コメントボックスの線の欄と字の欄には透明を並べない（`FR-019`）。'
const CV_9_THEME_ENTRY_IS_NULL = '押したらその欄の色をテーマ追随（`null`）へ戻すこと（MUST）'
// see FR-019
const FR_019_NULL_ENTRIES =
  '色の欄のテーマに戻す入口（表 T-017b の `CV-9`）は、塗りを `null`（テーマの色 `S-155` で塗る）へ、枠の線を `null`（注記の色 `S-312` で描く —— ツールチップの語は既定の色）へ戻す。'
// see PR-28, PR-45, PR-46
const COMMENT_BOX_NULLS = [
  ['PR-28', '`null` ＝ `FR-019` が名指す注記の色（`_assets/tbl-settings.md` の 表 T-236 の `S-312`）'],
  ['PR-45', '`null` ＝ `FR-019` が名指す地の色（`_assets/tbl-settings.md` の 表 T-236 の `S-146`）'],
  ['PR-46', '`null` ＝ `FR-019` が名指す文字の色（`_assets/tbl-settings.md` の 表 T-236 の `S-147`）'],
] as const

const CV_9 = unbroken(
  (specTable('T-017b').rows.find((one) => one.id === 'CV-9')?.cells ?? []).join(' '),
)

describe('CR-606 premise -- the clauses these cases quote still stand', () => {
  it.each([
    ['transparent word', CV_9_TRANSPARENT_WORD],
    ['theme or default', CV_9_THEME_OR_DEFAULT],
    ['theme entrance paint', CV_9_THEME_PAINT],
    ['entrance glyphs', CV_9_GLYPHS],
    ['custom value on its entrance', CV_9_CUSTOM_VALUE],
    ['frame offers no line', CV_9_FRAME_NO_LINE],
    ['comment line and text offer no transparent', CV_9_COMMENT_NO_TRANSPARENT],
    ['theme entry is null', CV_9_THEME_ENTRY_IS_NULL],
  ])('CV-9 holds %s', (_name, clause) => {
    expect(CV_9).toContain(clause)
  })

  it('FR-019 names what the two highlight box entries draw', () => {
    expect(REQUIREMENTS).toContain(FR_019_NULL_ENTRIES)
  })

  it.each(COMMENT_BOX_NULLS)('T-016 %s names its comment box null', (_row, clause) => {
    expect(PROPERTY_ITEMS_TABLE).toContain(clause)
  })
})

const T_236 = specTable('T-236')
const HUE_COLUMN = '色相追随'
const LIGHT_COLUMN = '明るいテーマ'
const FOLLOWS = '○'

const t236Row = (id: string) => {
  const found = T_236.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table T-236 has no row ${id}`)
  return found
}
const followsHue = (id: string): boolean => (t236Row(id).by[HUE_COLUMN] ?? '').trim() === FOLLOWS

type Rgb = readonly [number, number, number]

const hslToRgb = (h: number, s: number, l: number): Rgb => {
  const sat = s / 100
  const light = l / 100
  const k = (n: number): number => (n + h / 30) % 12
  const a = sat * Math.min(light, 1 - light)
  const f = (n: number): number => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

// WHY: the panel may spell a color as hex, hsl() or rgb(); the cases compare the color, not the spelling.
const rgbOf = (text: string): Rgb | null => {
  const value = text.trim().toLowerCase()
  const hex = /^#([0-9a-f]{6})$/.exec(value)?.[1] ?? null
  if (hex !== null) return [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16)) as unknown as Rgb
  const short = /^#([0-9a-f]{3})$/.exec(value)?.[1] ?? null
  if (short !== null) return [0, 1, 2].map((at) => parseInt(short[at]! + short[at]!, 16)) as unknown as Rgb
  const hsl = /^hsla?\(\s*([-\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/.exec(value)
  if (hsl !== null) return hslToRgb(Number(hsl[1]), Number(hsl[2]), Number(hsl[3]))
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(value)
  if (rgb !== null) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  if (value === 'white') return [255, 255, 255]
  if (value === 'black') return [0, 0, 0]
  return null
}

const sameColor = (drawn: string | undefined, expected: string): boolean => {
  const a = rgbOf(drawn ?? '')
  const b = rgbOf(expected)
  if (a === null || b === null) return false
  return a.every((one, index) => Math.abs(one - (b[index] as number)) <= 2)
}

const PLAIN = 1
const FILLED = 2
const CUSTOM = 3
const CUSTOM_LIGHT = '#c0504d'
const BOX = 'h1'
const NOTE = 'c1'

const DOCUMENT = documentOf({
  tasks: [taskOf(PLAIN), taskOf(FILLED), taskOf(CUSTOM)],
  visuals: [
    visualOf(PLAIN, { shapeKind: 'rectangle' }),
    visualOf(FILLED, { shapeKind: 'rectangle', fillColor: 'red' }),
    visualOf(CUSTOM, { shapeKind: 'rectangle', fillColor: `${CUSTOM_LIGHT}/#3a5f8a` }),
  ],
  highlightBoxes: [highlightBoxOf(BOX)],
  commentBoxes: [commentBoxOf(NOTE)],
})

const THEME_HUE = DOCUMENT.schedule.project.themeHue ?? 0
const t236Color = (id: string, column: string): string => {
  const cell = bare(t236Row(id).by[column] ?? '')
  return cell.replace('H', String(THEME_HUE))
}

const SCENES: Readonly<Record<string, readonly [ItemRef | null, readonly string[]]>> = {
  taskVisual: [taskItem(PLAIN), []],
  taskGroup: [null, [GROUP_ID]],
  highlightBox: [{ kind: 'highlightBox', id: BOX }, []],
  commentBox: [{ kind: 'commentBox', id: NOTE }, []],
}

const colorControlOf = (holder: string, column: string, item?: ItemRef): PropertyControl => {
  const [sceneItem, groupIds] = SCENES[holder] ?? [null, []]
  const controls = controlsOf(panelOf(DOCUMENT, item ?? sceneItem, groupIds)).filter((one) => {
    const key = one.key as { readonly holder: string; readonly column: string }
    return one.kind === 'color' && key.holder === holder && key.column === column
  })
  if (controls.length !== 1) throw new Error(`premise: one color control of ${holder}.${column}, got ${controls.length}`)
  return controls[0] as PropertyControl
}

const colorOf = (control: PropertyControl): ColorField => {
  if (control.color === undefined) throw new Error('premise: the color control carries its ColorField')
  return control.color
}

// WHY: what each field's transparent entry says (CV-9 (4)); null where CV-9 leaves the slot empty.
const FIELDS: readonly (readonly [string, string, 'noFill' | 'noLine' | null])[] = [
  ['taskVisual', 'fillColor', 'noFill'],
  ['taskVisual', 'strokeColor', 'noLine'],
  ['taskGroup', 'color', 'noFill'],
  ['highlightBox', 'fillColor', 'noFill'],
  ['highlightBox', 'strokeColor', 'noLine'],
  ['commentBox', 'fillColor', 'noFill'],
  ['commentBox', 'strokeColor', null],
  ['commentBox', 'textColor', null],
]

// WHY: the T-236 row each box field's null draws, as FR-019 and T-016 PR-28, PR-45 and PR-46 name them.
const NULL_ROWS: readonly (readonly [string, string, string])[] = [
  ['highlightBox', 'fillColor', 'S-155'],
  ['highlightBox', 'strokeColor', 'S-312'],
  ['commentBox', 'strokeColor', 'S-312'],
  ['commentBox', 'fillColor', 'S-146'],
  ['commentBox', 'textColor', 'S-147'],
]

describe(`CV-9 (4) -- ${CV_9_TRANSPARENT_WORD}`, () => {
  it.each(FIELDS.filter(([, , word]) => word !== null))('%s.%s: the transparent entry reads colorField.%s', (holder, column, word) => {
    expect(colorOf(colorControlOf(holder, column)).transparentWord).toBe(colorWordOf(word as string))
  })

  it.each(FIELDS.filter(([, , word]) => word === null))(`${CV_9_COMMENT_NO_TRANSPARENT} -- %s.%s offers no transparent entry`, (holder, column) => {
    expect(colorOf(colorControlOf(holder, column)).transparentWord).toBeUndefined()
  })

  it(`${CV_9_FRAME_NO_LINE} -- the highlight box outline offers the transparent name`, () => {
    const transparent = bare(specTable('T-294').rows.find((one) => one.id === 'S-324')?.by['保存する綴り'] ?? '')
    expect(transparent).toBe('transparent')
    const names = colorOf(colorControlOf('highlightBox', 'strokeColor')).names ?? []
    expect(names.find((one) => one.name === transparent)?.isOffered).toBe(true)
  })

  it('control: no fill and no line are two different words', () => {
    expect(colorWordOf('noFill')).not.toBe(colorWordOf('noLine'))
  })
})

describe(`CV-9 (2) -- ${CV_9_THEME_OR_DEFAULT}`, () => {
  it.each(NULL_ROWS)('%s.%s: null draws %s, so the entrance tooltip reads by its hue column', (holder, column, row) => {
    const expected = followsHue(row) ? colorWordOf('themeHint') : colorWordOf('defaultColor')
    expect(colorOf(colorControlOf(holder, column)).theme.hint).toBe(expected)
  })

  it('premise: the five rows split both ways (S-155 and S-146 follow the hue; S-312 and S-147 do not)', () => {
    expect(followsHue('S-155')).toBe(true)
    expect(followsHue('S-146')).toBe(true)
    expect(followsHue('S-312')).toBe(false)
    expect(followsHue('S-147')).toBe(false)
  })

  it.each([
    ['taskVisual', 'fillColor'],
    ['taskVisual', 'strokeColor'],
    ['taskGroup', 'color'],
  ] as const)(`${CV_9_THEME_ENTRY_IS_NULL} -- %s.%s follows the theme, so the tooltip reads colorField.themeHint`, (holder, column) => {
    expect(colorOf(colorControlOf(holder, column)).theme.hint).toBe(colorWordOf('themeHint'))
  })

  it.each(NULL_ROWS)(`${CV_9_THEME_PAINT} -- %s.%s: the entrance is painted with %s (light)`, (holder, column, row) => {
    const paint = colorOf(colorControlOf(holder, column)).theme.paint ?? undefined
    const expected = t236Color(row, LIGHT_COLUMN)
    expect(sameColor(paint, expected), `${String(paint)} vs ${expected}`).toBe(true)
  })
})

describe(`CV-9 -- ${CV_9_GLYPHS}`, () => {
  it.each(FIELDS)('%s.%s: the theme entrance carries colorField.themeGlyph and the custom one customGlyph', (holder, column) => {
    const field = colorOf(colorControlOf(holder, column))
    expect(field.theme.glyph).toBe(colorWordOf('themeGlyph'))
    expect(field.custom.glyph).toBe(colorWordOf('customGlyph'))
  })

  it('premise: the dictionary spells the two glyphs T and O', () => {
    expect([colorWordOf('themeGlyph'), colorWordOf('customGlyph')]).toEqual(['T', 'O'])
  })
})

describe(`CV-9 -- ${CV_9_CUSTOM_VALUE}`, () => {
  it('a task filled with a custom color: the custom entrance is painted with it and its tooltip names it', () => {
    const custom = colorOf(colorControlOf('taskVisual', 'fillColor', taskItem(CUSTOM))).custom
    expect(sameColor(custom.paint ?? undefined, CUSTOM_LIGHT), `${String(custom.paint)} vs ${CUSTOM_LIGHT}`).toBe(true)
    expect(custom.hint).toBe(colorWordOf('customValue').replace('{value}', CUSTOM_LIGHT.toUpperCase()))
  })

  it.each([
    ['a palette name', FILLED],
    ['null', PLAIN],
  ] as const)('a task whose fill is %s: the custom entrance is unpainted and names only the entrance', (_what, uid) => {
    const custom = colorOf(colorControlOf('taskVisual', 'fillColor', taskItem(uid))).custom
    expect(custom.paint).toBeNull()
    expect(custom.hint).toBe(colorWordOf('custom'))
  })
})

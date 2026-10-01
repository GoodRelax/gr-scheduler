// CR-606 spec-only cases: the words and marks of every colour field (T-017b CV-9): the transparent

import { describe, expect, it } from 'vitest'

import type { ColourField, PropertyControl } from '../../src/adapter/screen-renderer/screen-renderer'
import type { ItemRef } from '../../src/entity/document-model/selection/selection'
import {
  GROUP_ID,
  PROPERTY_ITEMS_TABLE,
  REQUIREMENTS,
  colourWordOf,
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
  '⭐ 透明の入口の語は、塗りの欄（`fillColor` と `TaskGroup.color`）では塗りの無いことを、線の欄（`strokeColor`）では線の無いことを言う語とすること（MUST）'
const CV_9_THEME_OR_DEFAULT =
  '⭐ ② の入口の語は、その欄の `null` が描く色の 表 T-236 の行の色相の欄が ○ ならテーマの色を言う語、— なら既定の色を言う語とすること（MUST）'
const CV_9_NULL_MARK =
  '⭐ 欄の値が `null`（② を選んでいる）ときは、側ごとの見本を、その欄の `null` がいま描いている色（テーマの色か既定の色）で塗り、値の代わりに、テーマなら「(テーマ)」、既定なら「(既定)」の印を添えること（MUST）'
const CV_9_MARK_ONLY_ON_NULL = '印は `null` のときにだけ出す。'
const CV_9_FRAME_NO_LINE = 'ハイライトボックスの枠の欄にも透明（線なし）を並べる'
const CV_9_COMMENT_NO_TRANSPARENT = 'コメントボックスの線の欄と字の欄には透明を並べない（`FR-019`）。'
const CV_9_THEME_ENTRY_IS_NULL = '押したらその欄の色をテーマ追随（`null`）へ戻すこと（MUST）'
// see FR-019
const FR_019_NULL_ENTRIES =
  '色の欄の ② の入口は、塗りを `null`（テーマの色 `S-155` で塗る）へ、枠の線を `null`（注記の色 `S-312` で描く —— 語は既定の色）へ戻す。'
// see PR-28
const PR_28_NULLS = '`null` ＝ `FR-019` が名指す色（`S-312` ・ `S-146` ・ `S-147`）'

const CV_9 = unbroken(
  (specTable('T-017b').rows.find((one) => one.id === 'CV-9')?.cells ?? []).join(' '),
)

describe('CR-606 premise -- the clauses these cases quote still stand', () => {
  it.each([
    ['transparent word', CV_9_TRANSPARENT_WORD],
    ['theme or default', CV_9_THEME_OR_DEFAULT],
    ['null mark', CV_9_NULL_MARK],
    ['mark only on null', CV_9_MARK_ONLY_ON_NULL],
    ['frame offers no line', CV_9_FRAME_NO_LINE],
    ['comment line and text offer no transparent', CV_9_COMMENT_NO_TRANSPARENT],
    ['theme entry is null', CV_9_THEME_ENTRY_IS_NULL],
  ])('CV-9 holds %s', (_name, clause) => {
    expect(CV_9).toContain(clause)
  })

  it('FR-019 names what the two highlight box entries draw', () => {
    expect(REQUIREMENTS).toContain(FR_019_NULL_ENTRIES)
  })

  it('T-016 PR-28 names the three comment box nulls in column order', () => {
    expect(PROPERTY_ITEMS_TABLE).toContain(PR_28_NULLS)
  })
})

const T_236 = specTable('T-236')
const HUE_COLUMN = '色相追随'
const LIGHT_COLUMN = '明るいテーマ'
const DARK_COLUMN = '暗いテーマ'
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

// WHY: the panel may spell a colour as hex, hsl() or rgb(); the cases compare the colour, not the spelling.
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

const sameColour = (drawn: string | undefined, expected: string): boolean => {
  const a = rgbOf(drawn ?? '')
  const b = rgbOf(expected)
  if (a === null || b === null) return false
  return a.every((one, index) => Math.abs(one - (b[index] as number)) <= 2)
}

const PLAIN = 1
const FILLED = 2
const BOX = 'h1'
const NOTE = 'c1'

const DOCUMENT = documentOf({
  tasks: [taskOf(PLAIN), taskOf(FILLED)],
  visuals: [visualOf(PLAIN, { shapeKind: 'rectangle' }), visualOf(FILLED, { shapeKind: 'rectangle', fillColor: 'red' })],
  highlightBoxes: [highlightBoxOf(BOX)],
  commentBoxes: [commentBoxOf(NOTE)],
})

const THEME_HUE = DOCUMENT.schedule.project.themeHue ?? 0
const t236Colour = (id: string, column: string): string => {
  const cell = bare(t236Row(id).by[column] ?? '')
  return cell.replace('H', String(THEME_HUE))
}

const SCENES: Readonly<Record<string, readonly [ItemRef | null, readonly string[]]>> = {
  taskVisual: [taskItem(PLAIN), []],
  taskGroup: [null, [GROUP_ID]],
  highlightBox: [{ kind: 'highlightBox', id: BOX }, []],
  commentBox: [{ kind: 'commentBox', id: NOTE }, []],
}

const colourControlOf = (holder: string, column: string, item?: ItemRef): PropertyControl => {
  const [sceneItem, groupIds] = SCENES[holder] ?? [null, []]
  const controls = controlsOf(panelOf(DOCUMENT, item ?? sceneItem, groupIds)).filter((one) => {
    const key = one.key as { readonly holder: string; readonly column: string }
    return one.kind === 'color' && key.holder === holder && key.column === column
  })
  if (controls.length !== 1) throw new Error(`premise: one colour control of ${holder}.${column}, got ${controls.length}`)
  return controls[0] as PropertyControl
}

const colourOf = (control: PropertyControl): ColourField => {
  if (control.colour === undefined) throw new Error('premise: the colour control carries its ColourField')
  return control.colour
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

// WHY: the T-236 row each box field's null draws, as FR-019 and T-016 PR-28 name them.
const NULL_ROWS: readonly (readonly [string, string, string])[] = [
  ['highlightBox', 'fillColor', 'S-155'],
  ['highlightBox', 'strokeColor', 'S-312'],
  ['commentBox', 'strokeColor', 'S-312'],
  ['commentBox', 'fillColor', 'S-146'],
  ['commentBox', 'textColor', 'S-147'],
]

describe(`CV-9 (4) -- ${CV_9_TRANSPARENT_WORD}`, () => {
  it.each(FIELDS.filter(([, , word]) => word !== null))('%s.%s: the transparent entry reads colourField.%s', (holder, column, word) => {
    expect(colourOf(colourControlOf(holder, column)).transparentWord).toBe(colourWordOf(word as string))
  })

  it.each(FIELDS.filter(([, , word]) => word === null))(`${CV_9_COMMENT_NO_TRANSPARENT} -- %s.%s offers no transparent entry`, (holder, column) => {
    expect(colourOf(colourControlOf(holder, column)).transparentWord).toBeUndefined()
  })

  it(`${CV_9_FRAME_NO_LINE} -- the highlight box outline offers the transparent name`, () => {
    const transparent = bare(specTable('T-294').rows.find((one) => one.id === 'S-324')?.by['保存する綴り'] ?? '')
    expect(transparent).toBe('transparent')
    const names = colourOf(colourControlOf('highlightBox', 'strokeColor')).names ?? []
    expect(names.find((one) => one.name === transparent)?.isOffered).toBe(true)
  })

  it('control: no fill and no line are two different words', () => {
    expect(colourWordOf('noFill')).not.toBe(colourWordOf('noLine'))
  })
})

describe(`CV-9 (2) -- ${CV_9_THEME_OR_DEFAULT}`, () => {
  it.each(NULL_ROWS)('%s.%s: null draws %s, so the entry reads by its hue column', (holder, column, row) => {
    const expected = followsHue(row) ? colourWordOf('theme') : colourWordOf('defaultColour')
    expect(colourOf(colourControlOf(holder, column)).theme?.word).toBe(expected)
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
  ] as const)(`${CV_9_THEME_ENTRY_IS_NULL} -- %s.%s follows the theme, so the entry reads colourField.theme`, (holder, column) => {
    expect(colourOf(colourControlOf(holder, column)).theme?.word).toBe(colourWordOf('theme'))
  })

  it.each(NULL_ROWS)('%s.%s: the entry is painted with what its null draws now (%s, light)', (holder, column, row) => {
    const paint = colourOf(colourControlOf(holder, column)).theme?.paint
    const expected = t236Colour(row, LIGHT_COLUMN)
    expect(sameColour(paint, expected), `${String(paint)} vs ${expected}`).toBe(true)
  })
})

describe(`CV-9 -- ${CV_9_NULL_MARK}`, () => {
  it.each(NULL_ROWS)('%s.%s is null: each side carries the mark and is painted with %s', (holder, column, row) => {
    const field = colourOf(colourControlOf(holder, column))
    const mark = followsHue(row) ? colourWordOf('themeMark') : colourWordOf('defaultMark')
    expect(field.light.mark).toBe(mark)
    expect(field.dark.mark).toBe(mark)
    const light = t236Colour(row, LIGHT_COLUMN)
    const dark = t236Colour(row, DARK_COLUMN)
    expect(sameColour(field.light.paint, light), `light ${field.light.paint} vs ${light}`).toBe(true)
    expect(sameColour(field.dark.paint, dark), `dark ${field.dark.paint} vs ${dark}`).toBe(true)
  })

  it.each([
    ['taskVisual', 'fillColor'],
    ['taskVisual', 'strokeColor'],
    ['taskGroup', 'color'],
  ] as const)('%s.%s is null and follows the theme: each side carries colourField.themeMark', (holder, column) => {
    const field = colourOf(colourControlOf(holder, column))
    expect(field.light.mark).toBe(colourWordOf('themeMark'))
    expect(field.dark.mark).toBe(colourWordOf('themeMark'))
  })

  it(`${CV_9_MARK_ONLY_ON_NULL} -- a task filled red carries no mark on either side`, () => {
    const field = colourOf(colourControlOf('taskVisual', 'fillColor', taskItem(FILLED)))
    expect(field.light.mark).toBeUndefined()
    expect(field.dark.mark).toBeUndefined()
  })

  it('control: the two marks differ', () => {
    expect(colourWordOf('themeMark')).not.toBe(colourWordOf('defaultMark'))
  })
})

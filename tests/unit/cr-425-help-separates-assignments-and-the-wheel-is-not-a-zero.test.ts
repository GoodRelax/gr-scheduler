// CR-425: the generated help roster carries the unified key spelling with the full-width separators, and IC-102 is drawn as figure F-019.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { specTable, unbroken } from '../contract/spec-table'

const ROOT = process.cwd()
const REQUIREMENTS = unbroken(readFileSync(join(ROOT, 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_036_THE_SEPARATOR =
  '⭐ 1 つの項目に割当が 2 つ以上あるときは、割当と割当のあいだに `／`（全角の斜線）を、前後に半角の空白を 1 つずつ置いて並べること（MUST）'
const FR_036_THE_CELL_SEPARATOR =
  '⭐ 表 T-036 と 表 T-255 の `割当` の欄が 1 つの欄に 2 つ以上の割当を持つときも、同じ区切りで並べること（MUST）'
const FR_036_THE_KEY_SPELLING =
  '⭐ 表 T-036 と 表 T-255 の `割当` の欄は、キーを 1 つずつコードの印で囲み、＋ で繋ぐ形（例: `Ctrl` ＋ `Shift` ＋ `0`）にそろえること（MUST）'
const FR_036_THE_WHEEL_IS_NOT_A_LETTER = '⛔ `IC-102` の図形を、数字や英字と読み違える形にしてはならない（MUST NOT）'

describe('CR-425 -- the manuscript these cases are driven by', () => {
  it.each([FR_036_THE_SEPARATOR, FR_036_THE_CELL_SEPARATOR, FR_036_THE_KEY_SPELLING, FR_036_THE_WHEEL_IS_NOT_A_LETTER])(
    'still says it, word for word: %s',
    (clause) => {
      expect(REQUIREMENTS).toContain(clause)
    },
  )
})

const H_KEYS = String.fromCodePoint(0x5272, 0x5f53)
const H_ENTRANCE = String.fromCodePoint(0x5165, 0x53e3)
const SLASH = '／'
const PLUS = '＋'

// see FR-036, T-036, T-255
const assignmentsIn = (cell: string): readonly (readonly string[])[] =>
  cell
    .split(SLASH)
    .map((one) => [...one.matchAll(/`([^`]+)`/g)].map((span) => span[1] ?? ''))
    .filter((keys) => keys.length > 0)

// see FR-036
const spelledOnScreen = (cell: string): string =>
  assignmentsIn(cell)
    .map((keys) => keys.join(` ${PLUS} `))
    .join(` ${SLASH} `)

interface RosterEntry {
  readonly kind: string
  readonly table: string
  readonly row: string
  readonly keys: string | null
  readonly press: string | null
  readonly glyphs: readonly string[]
}

const ROSTER = JSON.parse(
  readFileSync(join(ROOT, 'src', 'adapter', 'screen-renderer', 'help-roster.json'), 'utf8'),
) as { readonly entries: readonly RosterEntry[] }

const T_036 = specTable('T-036')
const T_255 = specTable('T-255')

const keyCellsOfTable = (table: typeof T_036): readonly { readonly row: string; readonly entrance: string; readonly cell: string }[] =>
  table.rows
    .map((row) => ({ row: row.id, entrance: row.by[H_ENTRANCE] ?? '', cell: row.by[H_KEYS] ?? '' }))
    .filter((one) => assignmentsIn(one.cell).length > 0)

describe(`FR-036 (MUST) -- the roster carries each key cell as the manuscript spells it: ${FR_036_THE_KEY_SPELLING}`, () => {
  it.each(keyCellsOfTable(T_036).map((one) => [one.row, one] as const))('T-036 %s', (_row, one) => {
    const byRow = ROSTER.entries.find((entry) => entry.kind === 'item' && entry.table === 'T-036' && entry.row === one.row)
    const icon = /IC-\d+/.exec(one.entrance)?.[0]
    const byIcon =
      icon === undefined ? undefined : ROSTER.entries.find((entry) => entry.kind === 'item' && entry.row === icon && entry.keys !== null)
    const entry = byRow ?? byIcon
    if (entry === undefined) return
    expect(entry.keys, `${one.row}: ${FR_036_THE_CELL_SEPARATOR}`).toBe(spelledOnScreen(one.cell))
  })

  it.each(keyCellsOfTable(T_255).map((one) => [one.row, one] as const))('T-255 %s', (_row, one) => {
    const entry = ROSTER.entries.find((found) => found.kind === 'item' && found.table === 'T-255' && found.row === one.row)
    expect(entry, `premise: the roster lists ${one.row}`).toBeDefined()
    expect(entry!.keys, `${one.row}: ${FR_036_THE_CELL_SEPARATOR}`).toBe(spelledOnScreen(one.cell))
  })

  it(`joins the two assignments of SK-7 on IC-6 with " ${SLASH} ": ${FR_036_THE_SEPARATOR}`, () => {
    const entry = ROSTER.entries.find((found) => found.kind === 'item' && found.row === 'IC-6')
    expect(entry, 'premise: the roster lists IC-6').toBeDefined()
    expect(entry!.keys, FR_036_THE_SEPARATOR).toBe(`Ctrl ${PLUS} Y ${SLASH} Ctrl ${PLUS} Shift ${PLUS} Z`)
  })

  it('leaves no roster key string with a half-width + welding two keys', () => {
    const welded = ROSTER.entries
      .filter((entry) => typeof entry.keys === 'string' && /[A-Za-z0-9]\+[A-Za-z0-9]/.test(entry.keys))
      .map((entry) => `${entry.row}: ${entry.keys}`)
    expect(welded, FR_036_THE_KEY_SPELLING).toEqual([])
  })
})

interface GlyphElement {
  readonly tag: string
  readonly attributes: readonly { readonly name: string; readonly value: string }[]
}

const GLYPHS = JSON.parse(
  readFileSync(join(ROOT, 'src', 'framework', 'dom-screen-surface', 'icon-glyphs.json'), 'utf8'),
) as { readonly glyphs: readonly { readonly rowId: string; readonly elements: readonly GlyphElement[] }[] }

const FIGURE = readFileSync(join(ROOT, 'docs', 'spec', '_assets', 'fig-icons.svg'), 'utf8')

// see F-019, IC-102
const figureElementsOf = (rowId: string): readonly GlyphElement[] => {
  const label = FIGURE.indexOf(`>${rowId}</text>`)
  if (label < 0) throw new Error(`figure F-019 has no label ${rowId}`)
  const groupOpen = FIGURE.lastIndexOf('<g ', label)
  const groupClose = FIGURE.indexOf('</g>', groupOpen)
  if (groupOpen < 0 || groupClose > label) throw new Error(`figure F-019 has no group before ${rowId}`)
  const body = FIGURE.slice(groupOpen, groupClose)
  return [...body.matchAll(/<(rect|path|circle|line|polyline|polygon|ellipse)\b([^>]*)\/?>/g)].map((match) => ({
    tag: match[1]!,
    attributes: [...(match[2] ?? '').matchAll(/([\w-]+)="([^"]*)"/g)].map((one) => ({ name: one[1]!, value: one[2]! })),
  }))
}

const geometryOf = (element: GlyphElement): string =>
  `${element.tag}(${element.attributes
    .filter((one) => one.name !== 'class' && one.name !== 'style')
    .map((one) => `${one.name}=${one.value}`)
    .join(',')})`

describe(`FR-036 (MUST NOT) -- ${FR_036_THE_WHEEL_IS_NOT_A_LETTER}`, () => {
  const figure = figureElementsOf('IC-102')
  const generated = GLYPHS.glyphs.find((one) => one.rowId === 'IC-102')?.elements ?? []

  it('premise: figure F-019 draws IC-102 as a mouse body, a filled wheel and a two-headed arrow', () => {
    expect(figure.filter((one) => one.tag === 'rect')).toHaveLength(2)
    expect(figure.filter((one) => one.tag === 'path').length).toBeGreaterThanOrEqual(3)
  })

  it(`generates the IC-102 glyph element for element from figure F-019: ${FR_036_THE_WHEEL_IS_NOT_A_LETTER}`, () => {
    expect(generated.map(geometryOf), FR_036_THE_WHEEL_IS_NOT_A_LETTER).toEqual(figure.map(geometryOf))
  })

  it('fills the wheel, so the glyph is not one outline with a stroke in it', () => {
    const filled = generated.filter((one) => {
      const style = one.attributes.find((attribute) => attribute.name === 'style')?.value ?? ''
      return !/fill:\s*none/.test(style)
    })
    expect(filled.length, FR_036_THE_WHEEL_IS_NOT_A_LETTER).toBeGreaterThanOrEqual(1)
  })

  it('stands wider than a single tall outline: the arrow reaches right of the body', () => {
    const xs = generated.flatMap((one) => {
      const x = Number(one.attributes.find((attribute) => attribute.name === 'x')?.value ?? Number.NaN)
      const width = Number(one.attributes.find((attribute) => attribute.name === 'width')?.value ?? Number.NaN)
      const d = one.attributes.find((attribute) => attribute.name === 'd')?.value ?? ''
      const fromPath = [...d.matchAll(/[ML]\s*(-?\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]))
      return [...(Number.isFinite(x) ? [x, x + width] : []), ...fromPath]
    })
    expect(Math.max(...xs) - Math.min(...xs), FR_036_THE_WHEEL_IS_NOT_A_LETTER).toBeGreaterThan(14)
  })
})

describe('CR-425 section 9 -- what the change request leaves open', () => {
  it.skip('the new IC-102 look is compared with the real thing -- open: CR-425 question 1 (T-026 RC-13)', () => {})
})

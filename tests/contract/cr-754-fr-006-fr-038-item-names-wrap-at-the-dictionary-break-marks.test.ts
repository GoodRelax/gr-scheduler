// CR-754 spec-only cases: FR-006 / FR-038 -- a panel item name wraps only at the break marks its dictionary word carries (DFC-2520).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { DisplayLanguage, PropertyField } from '../../src/adapter/screen-renderer/screen-renderer'
import { FakeElement, type FakeNode } from '../fixtures/fake-browser'
import { BREAK_MARK, drawnPanel, LANGUAGES, MARKED_WORDS, REQUIREMENTS, settingsPanel, withoutMarks, type Loose } from './cr-754-stage'

// see FR-006, FR-038
const FR_006_BREAK_AT_MARKS =
  '⭐ 項目名が項目名の欄の 1 行に収まらないときは、`FR-038` の辞書がその語に持つ折り目でだけ折り、折った行の長さがなるべくそろう折り目を選ぶこと（MUST）'
const FR_006_UNMARKED = '折り目を持たない語は、空白で折る（英語の語）。'
const FR_038_MARK_NEVER_SHOWN = '印は語の一部ではなく、語を出すどの所（パレット・ヘルプ・ツールチップ・`Agent API`）にも出してはならない（MUST NOT）'
const FR_038_GENERATOR = '生成器が印を外した語と、印で切った区切りの並びを出す。'

const GENERATED_WORDS = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'display-words.json'), 'utf8'),
) as Loose

const NBSP = ' '
const SPACE = ' '

interface MarkedWord {
  readonly section: string
  readonly key: string
  readonly field: 'label' | 'text'
  readonly language: DisplayLanguage
  readonly marked: string
}

// WHY: every dictionary word a panel item name is taken from, wherever a mark was written into it.
const MARKED: readonly MarkedWord[] = Object.entries(MARKED_WORDS).flatMap(([section, entries]) =>
  Array.isArray(entries)
    ? (entries as readonly Loose[]).flatMap((entry) =>
        (['label', 'text'] as const).flatMap((field) =>
          LANGUAGES.filter((language) => typeof entry[field]?.[language] === 'string' && (entry[field][language] as string).includes(BREAK_MARK)).map(
            (language) => ({
              section,
              key: String(entry['rowId'] ?? entry['part'] ?? entry['name']),
              field,
              language,
              marked: entry[field][language] as string,
            }),
          ),
        ),
      )
    : [],
)

/** @purity pure */
function generatedEntry(word: MarkedWord): Loose {
  const found = (GENERATED_WORDS[word.section] as readonly Loose[] | undefined)?.find(
    (one) => String(one['rowId'] ?? one['part'] ?? one['name']) === word.key,
  )
  if (found === undefined) throw new Error(`the generated dictionary has no ${word.section} ${word.key}`)
  return found
}

/** @purity pure */
function everyString(value: unknown, path: string): readonly { readonly path: string; readonly text: string }[] {
  if (typeof value === 'string') return [{ path, text: value }]
  if (Array.isArray(value)) return value.flatMap((one, at) => everyString(one, `${path}[${at}]`))
  if (value !== null && typeof value === 'object') return Object.entries(value).flatMap(([key, one]) => everyString(one, `${path}.${key}`))
  return []
}

/** @purity pure */
const isElement = (node: FakeNode): node is FakeElement => node instanceof FakeElement

/** @purity pure */
const textOf = (node: FakeNode): string => (isElement(node) ? node.textContent : node.data)

// WHY: the name is the field row's first child; its pieces are read in order, a WBR element standing for a break.
/** @purity pure */
function drawnPieces(row: FakeElement): readonly string[] {
  const name = row.children[0]
  if (name === undefined) throw new Error(`row ${row.getAttribute('data-field-row')} draws no name`)
  const pieces: string[] = ['']
  for (const node of name.childNodes) {
    if (isElement(node) && node.tagName === 'WBR') pieces.push('')
    else pieces[pieces.length - 1] += textOf(node)
  }
  return pieces
}

/** @purity pure */
const rowsOf = (drawn: FakeElement): readonly FakeElement[] =>
  [drawn, ...drawn.children.flatMap((one) => (one.tagName === 'DETAILS' ? [one] : []))].flatMap((holder) =>
    holder.children.filter((one) => one.getAttribute('data-field-row') !== null),
  )

const SETTINGS_FIELDS = (language: DisplayLanguage): readonly PropertyField[] => settingsPanel({ language }).fields

describe('CR-754 premise -- the clauses these cases press still stand', () => {
  it.each([FR_006_BREAK_AT_MARKS, FR_006_UNMARKED, FR_038_MARK_NEVER_SHOWN, FR_038_GENERATOR])('01-04 holds %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('the dictionary marks some panel item names, and no mark leaves an empty piece', () => {
    expect(MARKED.length).toBeGreaterThan(0)
    for (const word of MARKED) expect(word.marked.split(BREAK_MARK).every((piece) => piece !== ''), word.marked).toBe(true)
  })
})

describe(`FR-038 -- ${FR_038_MARK_NEVER_SHOWN}`, () => {
  it('no word the product draws from carries a mark', () => {
    const marked = everyString(GENERATED_WORDS, '').filter((one) => one.text.includes(BREAK_MARK))
    expect(marked).toEqual([])
  })

  it.each(MARKED.map((word) => [`${word.section} ${word.key} ${word.language}`, word] as const))(
    `${FR_038_GENERATOR} -- %s`,
    (_name, word) => {
      const entry = generatedEntry(word)
      expect(entry[word.field][word.language]).toBe(withoutMarks(word.marked))
      expect(entry['labelBreakSegments']?.[word.language]).toEqual(word.marked.split(BREAK_MARK))
    },
  )

  it.each(LANGUAGES)('the settings face (%s): no item name carries a mark', (language) => {
    for (const field of SETTINGS_FIELDS(language)) expect(field.name, field.row).not.toContain(BREAK_MARK)
  })
})

describe(`FR-006 -- ${FR_006_BREAK_AT_MARKS}`, () => {
  it.each(LANGUAGES)('the settings face (%s): a field whose word is marked carries its pieces, which join back to its name', (language) => {
    const marked = SETTINGS_FIELDS(language).filter((one) => one.nameBreakSegments !== undefined)
    if (language === 'ja') expect(marked.length, 'premise: ja names are marked').toBeGreaterThan(0)
    for (const field of marked) expect((field.nameBreakSegments ?? []).join(''), field.row).toBe(field.name)
  })

  it('the settings face (ja): the pieces are the ones the dictionary marks, for every marked name', () => {
    const byName = new Map(MARKED.filter((one) => one.language === 'ja').map((one) => [withoutMarks(one.marked), one.marked.split(BREAK_MARK)]))
    const fields = SETTINGS_FIELDS('ja').filter((one) => byName.has(one.name))
    expect(fields.length).toBeGreaterThan(0)
    for (const field of fields) expect(field.nameBreakSegments, field.name).toEqual(byName.get(field.name))
  })

  it('the settings face (ja): each marked name is drawn as its pieces with a break opportunity between them and none inside', () => {
    const fields = SETTINGS_FIELDS('ja')
    const drawn = drawnPanel(settingsPanel({ language: 'ja' }))
    for (const row of rowsOf(drawn)) {
      const field = fields.find((one) => one.row === row.getAttribute('data-field-row'))
      if (field?.nameBreakSegments === undefined) continue
      const pieces = drawnPieces(row)
      expect(pieces.map((one) => one.split(NBSP).join(SPACE)), field.row).toEqual(field.nameBreakSegments)
      for (const piece of pieces) expect(piece.includes(SPACE), `${field.row}: "${piece}" can break at its space`).toBe(false)
    }
  })

  it('premise: a marked piece holds a space (K-138 "段 0 の"), so the case above can catch a break inside a piece', () => {
    const pieces = SETTINGS_FIELDS('ja').flatMap((one) => one.nameBreakSegments ?? [])
    expect(pieces.some((one) => one.includes(SPACE))).toBe(true)
  })
})

describe(`FR-006 -- ${FR_006_UNMARKED}`, () => {
  it('the settings face (en): an unmarked name is drawn whole, with no break opportunity added and its spaces kept', () => {
    const fields = SETTINGS_FIELDS('en')
    const drawn = drawnPanel(settingsPanel({ language: 'en' }))
    let spaced = 0
    for (const row of rowsOf(drawn)) {
      const field = fields.find((one) => one.row === row.getAttribute('data-field-row'))
      if (field === undefined || field.nameBreakSegments !== undefined) continue
      expect(drawnPieces(row), field.row).toEqual([field.name])
      if (field.name.includes(SPACE)) spaced += 1
    }
    expect(spaced, 'premise: some en names hold spaces').toBeGreaterThan(0)
  })
})

// CR-766 spec-only tests: table T-108 is printed from one manuscript, with a column of the values each command carries.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  PRINTED_TEXT,
  T_108_HEADINGS,
  carriedCountOf,
  isUnimplemented,
  printedCommands,
  shapeNamesOf,
  type PrintedValue,
} from './cr-766-printed-commands'
import { specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const GLOSSARY = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-glossary.md'), 'utf8'))
const ERD_DETAIL = readFileSync(join(SPEC, '_assets', 'fig-erd-detail.md'), 'utf8')
const SETTINGS = readFileSync(join(SPEC, '_assets', 'tbl-settings.md'), 'utf8')
const PRINTED = unbroken(PRINTED_TEXT)

const table = printedCommands()
const { commands } = table

// see T-108
const ALL_COMMANDS = '**本表は `applyDocumentChange` が受け取る命令の全数である**（表 T-064 の `PI-8`）。'
const VALUES_ARE_HERE =
  '⭐ **命令が運ぶ値（名・型・意味）は本表が持つ** —— 文書の列を書く値は、その列（表 T-058 の `AT-` の行、見せ方の群は 表 T-202 ・表 T-203 の `S-` の行）を指し、型と上下限はその行に従う。'
const PRINTED_NOT_WRITTEN =
  'コードの命令の型と、`Agent API` の `applyCommands`（表 T-107 の `AM-7`）が受ける形は本表の原稿から生成し、手で書かない。'
const MANUSCRIPT_IS_THE_TRUTH = '**文書を書き換える命令と、命令ごとに運ぶ値の唯一の正は `_source/document-commands.json` である。**'
// see PI-8
const PI_8_GENERATED = '**全数と、命令ごとに運ぶ値は 表 T-108 が持ち、本型はその原稿から生成する**（`_assets/tbl-document-commands.md`）'
// WHY: CR-766 leaves section 7 of the glossary its heading and one pointer.
const GLOSSARY_POINTER =
  '表 T-108（`DocumentCommand` の全数）と、命令ごとに運ぶ値は `_assets/tbl-document-commands.md` が持つ（原稿 `_source/document-commands.json`）。'
// WHY: CR-766 section 3 lists these two sentences of the old preface as removed.
const RETIRED_SENTENCES = ['引数・戻り値は `src/` の公開エントリが持ち', '本表は名前と、何を担うかだけを持つ。']

// WHY: the retired numbers live in the manuscript only (CR-766 X-k), never in the printed file.
const RETIRED_IDS = (
  JSON.parse(readFileSync(join(SPEC, '_source', 'document-commands.json'), 'utf8')) as { retired: string[] }
).retired
const SHAPES = [
  'AnnotationAnchor',
  'HighlightRange',
  'PasteLanding',
  'PlanActualPlacement',
  'ProjectProfileFields',
  'ReleasedPlace',
  'RememberedActual',
  'TableView',
  'TableVisibility',
  'TypedLag',
  'WorkingDayLag',
]

const every = (values: readonly PrintedValue[]): PrintedValue[] =>
  values.flatMap((value) => [value, ...every(value.fields), ...value.variants.flatMap((variant) => every(variant.fields))])

const everyValue: PrintedValue[] = commands.flatMap((command) => [
  ...every(command.values),
  ...(command.choice?.shapes.flatMap((shape) => every(shape.fields)) ?? []),
])

// WHY: a T-058 row reads AT-n, then the entity and the column, each in backticks.
const COLUMN_OF = new Map(
  [...ERD_DETAIL.matchAll(/^\| (AT-\d+) \| `(\w+)` \| `(\w+)` \|/gm)].map((found) => [found[1] ?? '', `${found[2]}.${found[3]}`]),
)
// WHY: a T-202 / T-203 row reads S-n, then the key in backticks.
const SETTING_OF = new Map([...SETTINGS.matchAll(/^\| (S-\d+) \| `([\w.]+)` \|/gm)].map((found) => [found[1] ?? '', found[2] ?? '']))
const PRESENTATION_ROWS = new Set([...specTable('T-202').rows, ...specTable('T-203').rows].map((row) => row.id))

describe('T-108 is printed from its manuscript into tbl-document-commands.md', () => {
  it('the printed file says it is generated and names the manuscript as the one truth', () => {
    for (const retired of RETIRED_IDS) expect(PRINTED_TEXT).not.toContain('`' + retired + '`')
    expect(PRINTED_TEXT).toContain('**UID**: DOC-TBL-DOCUMENT-COMMANDS')
    expect(PRINTED_TEXT).toContain('本書は生成物である')
    expect(PRINTED).toContain(MANUSCRIPT_IS_THE_TRUTH)
  })

  it('the preface says the table is every command, holds the values, and the code and the AI input are printed from it', () => {
    for (const sentence of [ALL_COMMANDS, VALUES_ARE_HERE, PRINTED_NOT_WRITTEN]) expect(PRINTED).toContain(sentence)
    for (const retired of RETIRED_SENTENCES) expect(PRINTED).not.toContain(retired)
  })

  it('the table has the seven columns, the carried values after the bundle mark', () => {
    expect(table.caption).toBe('**表 T-108 — `DocumentCommand` の全数**')
    expect(table.headings).toEqual([...T_108_HEADINGS])
  })

  it('it holds 93 rows, one command name each, none of the ten retired numbers the manuscript keeps', () => {
    expect(RETIRED_IDS).toHaveLength(10)
    expect(commands).toHaveLength(93)
    expect(new Set(commands.map((command) => command.id)).size).toBe(93)
    expect(new Set(commands.map((command) => command.name)).size).toBe(93)
    for (const command of commands) expect(command.id).toMatch(/^CM-\d+$/)
    for (const retired of RETIRED_IDS) expect(commands.map((command) => command.id)).not.toContain(retired)
  })

  it('the numbers in use and the retired numbers together fill CM-1 to the highest number', () => {
    const numbers = [...commands.map((command) => command.id), ...RETIRED_IDS].map((id) => Number(id.slice(3)))
    const highest = Math.max(...numbers)
    expect(highest).toBe(103)
    expect([...numbers].sort((a, b) => a - b)).toEqual(Array.from({ length: highest }, (_, at) => at + 1))
  })

  it('the 93 commands carry 173 values (a choice of two shapes counts as one value), and name 11 shapes', () => {
    expect(commands.reduce((sum, command) => sum + carriedCountOf(command), 0)).toBe(173)
    expect(shapeNamesOf(commands)).toEqual(SHAPES)
  })

  it('every value line of every row is read -- no line of the carried-values cell is left over', () => {
    for (const command of commands) {
      if (command.valuesCell === '—') {
        expect(command.values, command.id).toEqual([])
        continue
      }
      const lines = command.valuesCell.split(/<br\s*\/?>/i)
      const read = every(command.values).length + (command.choice === null ? 0 : 1 + command.choice.shapes.length)
      const choiceFields = command.choice?.shapes.reduce((sum, shape) => sum + every(shape.fields).length, 0) ?? 0
      const variants = every(command.values).reduce((sum, value) => sum + value.variants.length, 0)
      expect(read + choiceFields + variants + command.notes.length, command.id).toBe(lines.length)
    }
  })
})

describe('a value that writes a document column points at that column', () => {
  const pointing = everyValue.filter((value) => value.pointer !== null)

  it('most carried values point at a column or a key -- the table does not retype them', () => {
    expect(pointing.length).toBeGreaterThan(120)
  })

  it.each(pointing.filter((value) => value.pointer?.startsWith('AT-')).map((value) => [value.name, value.pointer, value.writes]))(
    '%s points at %s, the T-058 row of %s',
    (_name, pointer, writes) => {
      expect(COLUMN_OF.get(pointer ?? '')).toBe(writes)
    },
  )

  it.each(pointing.filter((value) => value.pointer?.startsWith('S-')).map((value) => [value.name, value.pointer, value.writes]))(
    '%s points at %s, a presentation row of T-202 / T-203 keyed %s',
    (_name, pointer, writes) => {
      expect(PRESENTATION_ROWS.has(pointer ?? '')).toBe(true)
      expect(SETTING_OF.get(pointer ?? '')).toBe(writes)
    },
  )

  it('a value that points at a column carries no type of its own', () => {
    for (const value of pointing) expect(value.head, value.name).not.toMatch(/^`(?:string|integer|number|boolean)`/)
  })

  it('a value that is no column says its type word and what it means', () => {
    const own = everyValue.filter((value) => value.role === 'own' && value.fields.length === 0 && value.variants.length === 0)
    expect(own.length).toBeGreaterThan(10)
    for (const value of own) expect(value.text, value.name).toMatch(/ —— |を書く/)
  })
})

describe('CM-76 is printed with its values, and the table says it is not implemented', () => {
  const editPermission = commands.find((command) => command.id === 'CM-76')

  it('CM-76 setTaskGroupEditPermission carries the task group key and the editPermission column (AT-144)', () => {
    expect(editPermission?.name).toBe('setTaskGroupEditPermission')
    expect(editPermission?.values.map((value) => [value.name, value.role, value.pointer])).toEqual([
      ['taskGroupId', 'key', 'AT-51'],
      ['editPermission', 'column', 'AT-144'],
    ])
  })

  it('it is the one row the table marks as not implemented and refused', () => {
    expect(commands.filter(isUnimplemented).map((command) => command.id)).toEqual(['CM-76'])
    expect(editPermission?.notes).toEqual(['⚠️ まだ実装していない —— 受けても断る'])
  })
})

describe('the rows that used to name their values in prose now leave that to the values column (X-i)', () => {
  it.each(['CM-8', 'CM-93', 'CM-98', 'CM-99'])('%s: no value it carries is named in what it does', (id) => {
    const command = commands.find((one) => one.id === id)
    expect(command?.values.length).toBeGreaterThan(0)
    for (const value of command?.values ?? []) expect(command?.carriesCell, value.name).not.toContain('`' + value.name + '`')
  })
})

describe('the glossary and PI-8 point at the printed table; no pointer is left at the glossary', () => {
  it('section 7 of the glossary keeps its heading and one sentence that points at the printed file', () => {
    expect(GLOSSARY).toContain('## 7. `DocumentCommand` の全数')
    expect(GLOSSARY).toContain(GLOSSARY_POINTER)
    expect(GLOSSARY).not.toMatch(/^\| CM-\d+ \|/m)
  })

  it('PI-8 says the type is printed from the manuscript of T-108', () => {
    const row = specTable('T-064').rows.find((one) => one.id === 'PI-8')
    expect(unbroken(row?.cells.join(' ') ?? '')).toContain(PI_8_GENERATED)
  })

  const markdownUnder = (folder: string): string[] =>
    readdirSync(folder).flatMap((name) => {
      const path = join(folder, name)
      if (statSync(path).isDirectory()) return name === 'output' ? [] : markdownUnder(path)
      return name.endsWith('.md') ? [path] : []
    })
  const files = markdownUnder(SPEC).map((path) => [path.slice(SPEC.length + 1), unbroken(readFileSync(path, 'utf8'))] as const)

  it('no file of the specification names tbl-glossary.md as the place of T-108', () => {
    const stale = /tbl-glossary\.md`? の 表 T-108/
    expect(files.filter(([, text]) => stale.test(text)).map(([name]) => name)).toEqual([])
  })

  it('the pointers that name the printed file are many, so the scan above is not empty-handed', () => {
    const fresh = /tbl-document-commands\.md`? の 表 T-108/
    expect(files.filter(([, text]) => fresh.test(text)).length).toBeGreaterThanOrEqual(1)
    const requirements = files.find(([name]) => name === '01-04-requirements.md')?.[1] ?? ''
    expect(requirements.match(new RegExp(fresh.source, 'g'))?.length ?? 0).toBeGreaterThanOrEqual(4)
  })
})

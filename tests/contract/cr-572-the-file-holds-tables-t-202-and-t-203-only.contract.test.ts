// CR-572: the saved documentSettings holds the keys of tables T-202 and T-203 and nothing else.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  documentFromJson,
  jsonFromDocument,
} from '../../src/adapter/document-codec/document-codec'
import startupTemplate from '../../src/framework/single-html-shell/startup-template.json'
import { specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const read = (...parts: string[]): string => unbroken(readFileSync(join(SPEC, ...parts), 'utf8'))

const REQUIREMENTS = read('01-04-requirements.md')
const SETTINGS_BOOK = read('_assets', 'tbl-settings.md')

const ONLY_CONTENT_IS_HELD =
  '第 1 段で絵が変わり、**かつ** 第 2 段で文書の内容であるものだけを文書が持つ（`documentSettings`）。'
const WRITE_EVERY_KEY = '設定値は既定値と一致していても省略せず、常に全項目を書き出すこと（MUST）'
const NO_CONSTANT_NO_VIEWER_VALUE =
  '画面のどの操作も書き換えない値（道具の定数）と、見る人の画面の値（`_assets/tbl-settings.md` の 表 T-206）を見せ方に入れてはならない（MUST NOT）'
const THIS_BUILDS_VERSION = '載せる形式の版は、この造りの版とすること（MUST）'
const GROUP_IS_DECIDED_BY_T_052 = 'どちらの群に属するかの判定は表 T-052 が持つ'

const STORED_TABLES = ['T-202', 'T-203'] as const
const NOT_STORED_MARK = '文書には保存しない'
const VIEWER_TABLE = 'T-206'
const KEY_COLUMNS = ['キー', '名前', '値', '色']

/** @purity pure */
function keyIn(cell: string): string | null {
  // WHY: a T-206 cell is prose that may name another table's key; a key is only the span a cell opens with.
  // WHY: CR-723 -- a row may name a path (`tableViews.searchPanel.sort`); the key is its first segment.
  const found = /^`([A-Za-z][A-Za-z0-9]*)(?:\.[A-Za-z0-9]+)*`/.exec(cell.trim())
  return found === null ? null : (found[1] as string)
}

/** @purity pure */
function keysOfTable(id: string): readonly string[] {
  const table = specTable(id)
  const column = KEY_COLUMNS.find((heading) => table.headings.includes(heading))
  if (column === undefined) throw new Error(`table ${id} has none of the key columns: ${table.headings.join(' | ')}`)
  return table.rows.map((row) => keyIn(row.by[column] ?? '')).filter((key): key is string => key !== null)
}

const SETTINGS_TABLES: readonly { id: string; caption: string }[] = [
  ...SETTINGS_BOOK.matchAll(/\*\*表 (T-\d+) — ([^\n]*)\*\*/g),
].map((found) => ({ id: found[1] as string, caption: found[2] as string }))

const NOT_STORED_TABLES: readonly string[] = SETTINGS_TABLES.filter(
  (one) => one.caption.includes(NOT_STORED_MARK) || one.id === VIEWER_TABLE,
).map((one) => one.id)

// WHY: CR-723 -- the 13 rows S-560..S-572 each name `tableViews.<table>.<key>`; documentSettings holds the one key `tableViews`, so a key counts once.
const STORED_KEYS: readonly string[] = [...new Set(STORED_TABLES.flatMap((id) => keysOfTable(id)))]

const NOT_STORED_KEYS: ReadonlySet<string> = new Set(NOT_STORED_TABLES.flatMap((id) => keysOfTable(id)))

const BUILT_VERSION: string = (startupTemplate as { schemaVersion: string }).schemaVersion

/** @purity pure */
function templateCopy(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(startupTemplate)) as Record<string, unknown>
}

/** @purity pure */
function savedFrom(text: string): Record<string, unknown> {
  const opened = documentFromJson(text, BUILT_VERSION)
  if (!opened.ok) throw new Error(`refused: ${JSON.stringify(opened.faults)}`)
  return JSON.parse(jsonFromDocument(opened.document)) as Record<string, unknown>
}

const settingsOf = (saved: Record<string, unknown>): Record<string, unknown> =>
  saved['documentSettings'] as Record<string, unknown>

describe('CR-572 -- the manuscript these cases are driven by', () => {
  it('tbl-settings.md:30, FR-024 (01-04:6221, :6227) and FR-063 (01-04:6874) still say it word for word', () => {
    expect(SETTINGS_BOOK).toContain(ONLY_CONTENT_IS_HELD)
    expect(SETTINGS_BOOK).toContain(GROUP_IS_DECIDED_BY_T_052)
    expect(REQUIREMENTS).toContain(WRITE_EVERY_KEY)
    expect(REQUIREMENTS).toContain(NO_CONSTANT_NO_VIEWER_VALUE)
    expect(REQUIREMENTS).toContain(THIS_BUILDS_VERSION)
  })

  it('T-202 and T-203 carry no 保存しない mark; the constant tables and T-206 are found by caption', () => {
    for (const id of STORED_TABLES) {
      const caption = SETTINGS_TABLES.find((one) => one.id === id)?.caption
      expect(caption, `table ${id} is not in tbl-settings.md`).toBeDefined()
      expect(caption).not.toContain('保存しない')
    }
    for (const id of ['T-201', 'T-204', 'T-205', 'T-206', 'T-207', 'T-208', 'T-210', 'T-211', 'T-212', 'T-213', 'T-214', 'T-215']) {
      expect(NOT_STORED_TABLES, id).toContain(id)
    }
    expect(STORED_KEYS.length).toBeGreaterThan(0)
    for (const key of ['iconHintDelayMs', 'basePlanHeight', 'themePreference', 'guideCursorMode', 'dualCursor', 'propertyPanelWidth']) {
      expect(NOT_STORED_KEYS.has(key), key).toBe(true)
    }
  })

  it('no key is both in T-202/T-203 and in a not-stored table', () => {
    expect(STORED_KEYS.filter((key) => NOT_STORED_KEYS.has(key))).toEqual([])
  })

  it('FR-024: the published schema, which a written document conforms to, lists exactly the T-202 + T-203 keys', () => {
    const schema = JSON.parse(readFileSync(join(SPEC, '_source', 'grs-document.schema.json'), 'utf8')) as {
      properties: { documentSettings: { required: string[]; properties: Record<string, unknown> } }
    }
    expect([...schema.properties.documentSettings.required].sort()).toEqual([...STORED_KEYS].sort())
    expect(Object.keys(schema.properties.documentSettings.properties).sort()).toEqual([...STORED_KEYS].sort())
  })
})

describe('CR-572 item 1 -- the saved documentSettings holds exactly the keys of T-202 and T-203', () => {
  it(`FR-024 「${WRITE_EVERY_KEY}」: every stored key is written, and nothing else`, () => {
    const saved = savedFrom(JSON.stringify(templateCopy()))
    expect(Object.keys(settingsOf(saved)).sort()).toEqual([...STORED_KEYS].sort())
  })
})

describe('CR-572 item 2 -- no constant and no screen value is written', () => {
  it(`FR-063 「${NO_CONSTANT_NO_VIEWER_VALUE}」: no key of a not-stored table is in documentSettings`, () => {
    const saved = savedFrom(JSON.stringify(templateCopy()))
    expect(Object.keys(settingsOf(saved)).filter((key) => NOT_STORED_KEYS.has(key))).toEqual([])
  })

  it('FR-063: nor anywhere else in the saved file, at any depth', () => {
    const saved = savedFrom(JSON.stringify(templateCopy()))
    const found: string[] = []
    const walk = (value: unknown, at: string): void => {
      if (Array.isArray(value)) {
        value.forEach((one, index) => walk(one, `${at}/${index}`))
        return
      }
      if (value === null || typeof value !== 'object') return
      for (const [key, inner] of Object.entries(value)) {
        if (NOT_STORED_KEYS.has(key)) found.push(`${at}/${key}`)
        walk(inner, `${at}/${key}`)
      }
    }
    walk(saved, '')
    expect(found).toEqual([])
  })
})

describe('CR-572 item 11 -- the format version written is this build\'s', () => {
  it(`FR-024 「${THIS_BUILDS_VERSION}」: an older document is saved with the startup template's version`, () => {
    const older = templateCopy()
    older['schemaVersion'] = `0${BUILT_VERSION.slice(1)}`
    expect((older['schemaVersion'] as string) < BUILT_VERSION, 'the fixture is older than this build').toBe(true)
    expect(savedFrom(JSON.stringify(older))['schemaVersion']).toBe(BUILT_VERSION)
  })
})

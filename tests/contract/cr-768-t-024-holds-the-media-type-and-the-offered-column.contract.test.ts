// CR-768 spec-only cases: table T-024 holds the media type handed to the save chooser, the offered-on-IC-2 column and row IO-8; FR-096 and RW-7 read them.

import { describe, expect, it } from 'vitest'

import {
  DIRECTION_HEADING,
  EXTENSION_HEADING,
  MEDIA_TYPE_HEADING,
  NOT_OFFERED_WORD,
  OFFERED_HEADING,
  OFFERED_WORD,
  REQUIREMENTS,
  extensionOf,
  fileRows,
  formatRows,
  mediaTypeOf,
  offeredRows,
  requirementText,
  rowOf,
} from './cr-768-table-t-024'
import { specTable } from './spec-table'

const FR_096_MEDIA_TYPE_FROM_TABLE =
  '⭐ 宿主に「その拡張子の形式である」ことを伝える手立てがあるなら、表 T-024 の「保存の選択面に渡す媒体の型」の欄の値で伝えること（MUST）。'
const FR_096_NO_COPY_OF_MEDIA_TYPE = '⛔ **媒体の型を本要求に書き写してはならない（MUST NOT）** —— 拡張子と同じく、正は 表 T-024 ただ 1 か所である。'
const FR_096_MEDIA_TYPE_IS_OURS =
  '⭐ **媒体の型は本製品が決める値である** —— 宿主がよく知る型を渡すと、宿主はその型に結び付いたほかの拡張子まで選択面に並べる（利用者が `.html` だけと定めた）ので、`.svg`・`.html`・`.md` には本製品の `x-` の型を渡す。'
const FR_096_CHOOSES_BY_THE_COLUMN =
  '**STATEMENT**: 作成者が書き出しを選んだとき、`GRS` は、**表 T-024 のうち「`IC-2` に出す」の欄が「出す」の形式**から選ばせ、選ばれた形式の規約に従って書き出すこと。'
const FR_096_NO_CLIPBOARD =
  '⛔ `IO-6`（クリップボード）を本要求の選択面に出してはならない（MUST NOT） —— **ファイルとして出ないので名を付ける先が無く**、その経路は `FR-025` が `IC-3` で直に運ぶ。'
const FR_096_OLD_BAN = '媒体型を、本書のどの表にも持たせてはならない'
const FR_096_OLD_PLACE = '持ち場は `05-07-design.md` の Framework 層とすること（MUST）'
const FR_096_OLD_CHOICE = '表 T-024 のうち書出の方向を持ち、ファイルとして出る形式'

const T_024_MEDIA_NOTE = '⭐ **媒体の型の欄も、ファイルとして出る行がすべて持つ** —— `FR-096` が保存の選択面に渡す値の正が本表である。'
const T_024_OFFERED_NOTE = '⭐ **「`IC-2` に出す」の欄は、`FR-096` の選択面に並ぶ行を決める**'

const RW_7_EXTENSION_FROM_IO_8 = '＋ 表 T-024 の `IO-8` の拡張子。'
const RW_7_ENDS_AND_MEDIA_TYPE =
  '書いた名前が 表 T-024 の `IO-8` の拡張子で終わることを保証し、保存の選択面には同じ行の媒体の型を渡す（`FR-096` の拡張子と媒体の型の定めと同じ）'
const SX_2_BY_THE_COLUMN = '表 T-024 のうち「`IC-2` に出す」の欄が「出す」の、`IO-2` 以外の形式（`IC-2` で選んで書いたとき）'

const MEDIA_TYPE_SHAPE = /^[a-z]+\/[a-z0-9.+-]+$/
const PRODUCT_OWN_TYPE = /^[a-z]+\/x-[-a-z0-9]+$/

describe('CR-768 -- the manuscript these cases read', () => {
  it('FR-096 chooses by the offered column, tells the host the table media type and forbids copying it', () => {
    for (const clause of [
      FR_096_CHOOSES_BY_THE_COLUMN,
      FR_096_MEDIA_TYPE_FROM_TABLE,
      FR_096_MEDIA_TYPE_IS_OURS,
      FR_096_NO_COPY_OF_MEDIA_TYPE,
      FR_096_NO_CLIPBOARD,
    ]) {
      expect(REQUIREMENTS, clause).toContain(clause)
    }
  })

  it('the old FR-096 ban on a media type in any table, its place in the Framework layer and its old choice are gone', () => {
    const text = requirementText('FR-096')
    for (const gone of [FR_096_OLD_BAN, FR_096_OLD_PLACE, FR_096_OLD_CHOICE]) {
      expect(text, gone).not.toContain(gone)
    }
  })

  it('T-024 says in a note that the media type column and the offered column are the sources', () => {
    expect(REQUIREMENTS).toContain(T_024_MEDIA_NOTE)
    expect(REQUIREMENTS).toContain(T_024_OFFERED_NOTE)
  })

  it('RW-7 and SX-2 read their extension and their set from table T-024', () => {
    const rw7 = specTable('T-346').rows.find((one) => one.id === 'RW-7')?.cells.join(' ') ?? ''
    expect(rw7).toContain(RW_7_EXTENSION_FROM_IO_8)
    expect(rw7).toContain(RW_7_ENDS_AND_MEDIA_TYPE)
    expect(rw7).not.toContain('「.md」')
    const sx2 = specTable('T-340').rows.find((one) => one.id === 'SX-2')?.cells.join(' ') ?? ''
    expect(sx2).toContain(SX_2_BY_THE_COLUMN)
  })
})

describe('CR-768 -- table T-024 carries the two new columns', () => {
  it('has nine columns, the media type and the offered column after the extension', () => {
    expect(specTable('T-024').headings).toEqual([
      '行 ID',
      '形式',
      '方向',
      EXTENSION_HEADING,
      MEDIA_TYPE_HEADING,
      OFFERED_HEADING,
      '先頭の非空白 1 文字',
      '用途',
      '備考',
    ])
  })

  it('holds IO-1 to IO-8 and no other row, and IO-8 stands right after IO-4', () => {
    const ids = formatRows().map((one) => one.id)
    expect([...ids].sort()).toEqual(['IO-1', 'IO-2', 'IO-3', 'IO-4', 'IO-5', 'IO-6', 'IO-7', 'IO-8'])
    expect(ids.indexOf('IO-8')).toBe(ids.indexOf('IO-4') + 1)
  })

  it('the offered column says 出す or 出さない in every row and nothing else', () => {
    for (const row of formatRows()) {
      expect([OFFERED_WORD, NOT_OFFERED_WORD], row.id).toContain(row.offered)
    }
  })
})

describe('CR-768 -- IO-8, the Markdown row for the Delay Diagnostics Report', () => {
  it('is a Markdown format that only goes out, with the extension .md and the media type text/x-grs-markdown', () => {
    const row = rowOf('IO-8')
    expect(specTable('T-024').rows.find((one) => one.id === 'IO-8')?.by['形式']).toBe('Markdown')
    expect(row.direction).toBe('書出のみ')
    expect(row.extension).toBe('.md')
    expect(row.mediaType).toBe('text/x-grs-markdown')
  })

  it('is not offered on IC-2, because its entrance is IC-140 and it carries a report, not a document', () => {
    expect(rowOf('IO-8').offered).toBe(NOT_OFFERED_WORD)
    const note = specTable('T-024').rows.find((one) => one.id === 'IO-8')?.by['備考'] ?? ''
    expect(note).toContain('`IC-140`')
    expect(note).toContain('`RW-7`')
  })
})

describe('CR-768 -- every row of table T-024 against the rules its notes and FR-096 give', () => {
  it('a row that comes out as a file carries a media type of the type/subtype shape; a row that does not carries none', () => {
    for (const row of formatRows()) {
      if (row.extension === null) expect(row.mediaType, `${row.id}: not a file, so no media type`).toBeNull()
      else expect(row.mediaType ?? '', `${row.id}: a file carries a media type`).toMatch(MEDIA_TYPE_SHAPE)
    }
  })

  it('exactly the rows that go out as a file are IO-1, IO-2, IO-3, IO-4, IO-7 and IO-8', () => {
    expect(fileRows().map((one) => one.id).sort()).toEqual(['IO-1', 'IO-2', 'IO-3', 'IO-4', 'IO-7', 'IO-8'])
  })

  it('two rows never share an extension or a media type, so a suggested name and a chooser key stay unambiguous', () => {
    const extensions = fileRows().map((one) => one.extension)
    const mediaTypes = fileRows().map((one) => one.mediaType)
    expect(new Set(extensions).size).toBe(extensions.length)
    expect(new Set(mediaTypes).size).toBe(mediaTypes.length)
  })

  it('.svg, .html and .md carry the product own x- type; .json, .xml and .png carry a registered one', () => {
    for (const id of ['IO-3', 'IO-7', 'IO-8']) {
      expect(extensionOf(id), id).toMatch(/^\.(svg|html|md)$/)
      expect(mediaTypeOf(id), `${id}: ${FR_096_MEDIA_TYPE_IS_OURS}`).toMatch(PRODUCT_OWN_TYPE)
    }
    for (const id of ['IO-1', 'IO-2', 'IO-4']) {
      expect(mediaTypeOf(id), id).not.toMatch(PRODUCT_OWN_TYPE)
    }
  })

  it('an offered row is a file that goes out: it has an extension and a media type, and its direction includes 書出', () => {
    for (const row of offeredRows()) {
      expect(row.extension, row.id).not.toBeNull()
      expect(row.mediaType, row.id).not.toBeNull()
      expect(row.direction, row.id).toContain('書出')
    }
  })

  it('the offered rows are IO-2, IO-1, IO-7, IO-3 and IO-4, in that order', () => {
    expect(offeredRows().map((one) => one.id)).toEqual(['IO-2', 'IO-1', 'IO-7', 'IO-3', 'IO-4'])
  })

  it('IO-5 and IO-6 are never offered, and neither is a file', () => {
    for (const id of ['IO-5', 'IO-6']) {
      const row = rowOf(id)
      expect(row.offered, id).toBe(NOT_OFFERED_WORD)
      expect(row.extension, id).toBeNull()
      expect(row.mediaType, id).toBeNull()
    }
    expect(specTable('T-024').headings).toContain(DIRECTION_HEADING)
  })
})

describe('CR-768 (MUST NOT) -- FR-096 does not copy a media type of the table into itself', () => {
  it(`"${FR_096_NO_COPY_OF_MEDIA_TYPE}" -- no media type of table T-024 stands in the text of FR-096`, () => {
    const text = requirementText('FR-096')
    for (const row of fileRows()) {
      expect(text, `${row.id}: ${row.mediaType}`).not.toContain(row.mediaType ?? '')
    }
  })
})

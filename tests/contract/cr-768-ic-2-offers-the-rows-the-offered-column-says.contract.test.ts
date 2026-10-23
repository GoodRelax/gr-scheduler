// CR-768 spec-only cases: the chooser of IC-2 offers the rows whose offered column says so, in the table order, and never IO-8; SX-2 follows the same set.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { Rasterizer } from '../../src/adapter/image-exporter/rasterizer'
import type { DisplayLanguage } from '../../src/adapter/screen-renderer/screen-renderer'
import { descendants } from '../fixtures/fake-browser'
import { shellAppSource, shellStage, stageWithTarget, surfaceOfEntrance } from './cr-610-file-flow-stage'
import { extensionOf, formatRows, offeredRows, rowOf } from './cr-768-table-t-024'
import { EXPORT_CHOOSER, SMALL_SCREEN, exportStage, restoreAnimationFrames, templateDocument } from './w3-t3-frame-stage'

afterEach(restoreAnimationFrames)

const FR_096_CHOOSES_BY_THE_COLUMN = '表 T-024 のうち「`IC-2` に出す」の欄が「出す」の形式'
const FR_096_ORDER = '選択面が形式を並べる順は、表 T-024 の行の並びとすること（MUST）'
const SX_2_KEEPS_THE_TARGET = '変えてはならない（MUST NOT） —— 書き出した先は交換や絵のためのファイルであり、この文書のファイルではない'

const PLAIN_SHELL =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<title>GRS</title></head><body><div id="app"></div>' +
  '<script type="module">boot()</script></body></html>\n'

// WHY: IC-2 on IO-4 rasterizes the picture; the bytes are not what these cases read.
const rasterizer: Rasterizer = { rasterizePng: async () => ({ ok: true, pngBytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) }) }

const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  readonly exportFormats: readonly { readonly rowId: string; readonly name: Record<DisplayLanguage, string> }[]
}

const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en']

const OFFERED = offeredRows().map((one) => one.id)

async function chooserFormats(language: DisplayLanguage): Promise<readonly { readonly row: string; readonly name: string; readonly extension: string }[]> {
  const stage = exportStage(templateDocument(), SMALL_SCREEN, language)
  await stage.take('IC-2')
  const modal = stage.lastView().openModal
  if (modal === null || modal === undefined || modal.surface !== EXPORT_CHOOSER) {
    throw new Error(`premise: IC-2 opens ${EXPORT_CHOOSER}, got ${JSON.stringify(modal?.surface)}`)
  }
  return (modal as unknown as { readonly formats: readonly { readonly row: string; readonly name: string; readonly extension: string }[] }).formats
}

describe('CR-768 -- the manuscript these cases read', () => {
  it('FR-096 offers the rows of the offered column in the order of the table; SX-2 keeps the save target', () => {
    expect(OFFERED).toEqual(['IO-2', 'IO-1', 'IO-7', 'IO-3', 'IO-4'])
    expect(OFFERED).not.toContain('IO-8')
  })
})

describe(`FR-096 "${FR_096_CHOOSES_BY_THE_COLUMN}" -- the chooser of IC-2 lists those rows`, () => {
  it.each(LANGUAGES)('(%s) the rows listed are the offered rows, in the order of the table, with the extension of the row', async (language) => {
    const formats = await chooserFormats(language)
    expect(formats.map((one) => one.row)).toEqual(OFFERED)
    expect(formats.map((one) => one.extension)).toEqual(offeredRows().map((one) => one.extension))
  })

  it.each(LANGUAGES)('(%s) every listed row shows a word of the dictionary, never its row id', async (language) => {
    for (const one of await chooserFormats(language)) {
      expect(one.name, one.row).not.toBe('')
      expect(one.name, one.row).not.toMatch(/^IO-\d+$/)
      expect(one.name, one.row).toBe(WORDS.exportFormats.find((word) => word.rowId === one.row)?.name[language])
    }
  })

  it.each(['IO-8', 'IO-5', 'IO-6'])('(%s) is not listed in either language', async (row) => {
    expect(rowOf(row).offered).toBe('出さない')
    for (const language of LANGUAGES) {
      expect((await chooserFormats(language)).map((one) => one.row)).not.toContain(row)
    }
  })

  it('the dictionary holds a word for each offered row and for no other row', () => {
    expect(WORDS.exportFormats.map((one) => one.rowId)).toEqual(OFFERED)
  })
})

describe(`FR-096 "${FR_096_ORDER}" -- the drawn buttons follow the table too`, () => {
  it('the DOM chooser draws one button per offered row, in the order of the table, and none for IO-8', async () => {
    const built = await shellStage({ dom: true })
    await built.press(surfaceOfEntrance('IC-2'), 'IC-2')
    expect(built.last().openModal, 'premise: IC-2 opens the chooser').not.toBeNull()
    const buttons = descendants(built.domRoot())
      .map((one) => one.getAttribute('data-format'))
      .filter((one): one is string => one !== null)
    expect(buttons).toEqual(OFFERED)
  })
})

describe('FR-096 -- a row the offered column does not offer cannot be written through IC-2', () => {
  it.each(['IO-8', 'IO-5', 'IO-6'])('pressing %s on the chooser opens no save chooser and writes nothing', async (row) => {
    const built = await shellStage()
    await built.exportAs(row, built.file('x.bin', new Uint8Array(0)))
    expect(built.browser.saveQuestions(), `${row}: a save chooser was opened`).toBe(0)
    expect(built.written, `${row}: a file was written`).toEqual([])
  })
})

describe(`SX-2 "${SX_2_KEEPS_THE_TARGET}" -- every offered row but IO-2 is an export`, () => {
  const exported = OFFERED.filter((row) => row !== 'IO-2')

  it('the offered rows other than IO-2 are IO-1, IO-7, IO-3 and IO-4', () => {
    expect(exported).toEqual(['IO-1', 'IO-7', 'IO-3', 'IO-4'])
  })

  it.each(exported)('%s: the header, the unsaved edits and the save target stay; the next SK-11 writes over the earlier target', async (row) => {
    const { built } = await stageWithTarget({ appShell: shellAppSource(PLAIN_SHELL), rasterizer })
    await built.repaint()
    const before = built.last().appHeaderItems
    const questionsBefore = built.browser.saveQuestions()
    const extension = extensionOf(row)
    await built.exportAs(row, built.file(`out${extension}`, new Uint8Array(0)))
    expect(built.written, `${row}: the export wrote nothing`).toEqual([`out${extension}`])
    await built.repaint()
    expect(built.last().appHeaderItems.openedFileName, `${row}: the file name`).toBe(before.openedFileName)
    expect(built.last().appHeaderItems.fileSavedAt, `${row}: the saved time`).toBe(before.fileSavedAt)
    await built.save()
    expect(built.written, `${row}: SK-11 left the earlier target`).toEqual([`out${extension}`, 'mine.json'])
    expect(built.browser.saveQuestions(), `${row}: SK-11 asked again`).toBe(questionsBefore + 1)
  })

  // WHY: CR-827 added IO-10 (the schema, written through IC-115), which T-024 marks as not offered.
  it('every row of the table is either offered or one of IO-8, IO-9, IO-10, IO-5 and IO-6, so no row falls between SX-1/SX-2 and the rest', () => {
    const others = formatRows().filter((one) => one.offered !== '出す').map((one) => one.id)
    expect([...others].sort()).toEqual(['IO-10', 'IO-5', 'IO-6', 'IO-8', 'IO-9'])
  })
})

// CR-768 spec-only cases: the save chooser is handed, for every file row of table T-024, that row media type and extension, from IC-2 and from IC-140.

import { describe, expect, it } from 'vitest'

import type { ChosenFileWrite } from '../../src/adapter/file-gateway/file-store'
import type { Rasterizer } from '../../src/adapter/image-exporter/rasterizer'
import { fileSystemAccessFileStore } from '../../src/framework/file-system-access-file-store/file-system-access-file-store'
import { UTF8, shellAppSource, shellStage, standInBrowser, standInFile } from './cr-610-file-flow-stage'
import { ONE_PARENT } from './cr-731-documents'
import { windowStage } from './cr-731-window-stage'
import { extensionOf, fileRows, mediaTypeOf, offeredRows, requirementText } from './cr-768-table-t-024'
import { specTable } from './spec-table'

const FR_096_NAME_ENDS_WITH = '書き出した先の名前が、選んだ行の拡張子で終わることを保証すること（MUST）'
const FR_096_MEDIA_TYPE_FROM_TABLE =
  '表 T-024 の「保存の選択面に渡す媒体の型」の欄の値で伝えること（MUST）'
const RW_7_HANDS_THE_MEDIA_TYPE = '保存の選択面には同じ行の媒体の型を渡す'

const PLAIN_SHELL =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<title>GRS</title></head><body><div id="app"></div>' +
  '<script type="module">boot()</script></body></html>\n'

// WHY: IC-2 on IO-4 rasterizes the picture; the bytes are not what these cases read.
const rasterizer: Rasterizer = { rasterizePng: async () => ({ ok: true, pngBytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) }) }

const typesHandedFor = (row: string): unknown => [{ accept: { [mediaTypeOf(row)]: [extensionOf(row)] } }]

describe('CR-768 -- the manuscript these cases read', () => {
  it('FR-096 and RW-7 still hand the chooser the media type of the table row', () => {
    expect(requirementText('FR-096')).toContain(FR_096_MEDIA_TYPE_FROM_TABLE)
    expect(requirementText('FR-096')).toContain(FR_096_NAME_ENDS_WITH)
    const rw7 = specTable('T-346').rows.find((one) => one.id === 'RW-7')?.cells.join(' ') ?? ''
    expect(rw7).toContain(RW_7_HANDS_THE_MEDIA_TYPE)
  })
})

describe(`FR-096 "${FR_096_MEDIA_TYPE_FROM_TABLE}" -- the store hands the chooser what the row says`, () => {
  it.each(fileRows().map((one) => [one.id, one.extension ?? ''] as const))(
    '%s (%s): one type, keyed by the media type of the row, naming the extension of the row',
    async (row, extension) => {
      const browser = standInBrowser()
      const store = fileSystemAccessFileStore(browser.environment)
      browser.toSave.push(standInFile(`plan${extension}`, UTF8.encode('x'), []))
      const write: ChosenFileWrite = {
        bytes: UTF8.encode('x'),
        suggestedFileName: `plan${extension}`,
        extension,
        shouldBecomeOpenedFile: false,
        askToWriteOver: () => Promise.resolve(true),
      }
      await store.writeChosenFile(write)
      const options = browser.saveOptions[0]
      expect(options, `${row}: no save chooser was opened`).toBeDefined()
      expect(options?.['types'], row).toEqual(typesHandedFor(row))
      expect(options?.['suggestedName'], row).toBe(`plan${extension}`)
    },
  )

  it('an extension no row of the table carries is handed no type at all', async () => {
    const browser = standInBrowser()
    const store = fileSystemAccessFileStore(browser.environment)
    browser.toSave.push(standInFile('plan.zzz', UTF8.encode('x'), []))
    await store.writeChosenFile({
      bytes: UTF8.encode('x'),
      suggestedFileName: 'plan.zzz',
      extension: '.zzz',
      shouldBecomeOpenedFile: false,
      askToWriteOver: () => Promise.resolve(true),
    })
    expect(fileRows().map((one) => one.extension)).not.toContain('.zzz')
    expect(browser.saveOptions[0]?.['types']).toBeUndefined()
  })
})

describe(`FR-096 "${FR_096_NAME_ENDS_WITH}" -- IC-2 hands the chooser the media type of the row chosen`, () => {
  it.each(offeredRows().map((one) => [one.id] as const))('IC-2 then %s: the chooser opens once, with the type and name of that row', async (row) => {
    const built = await shellStage({ appShell: shellAppSource(PLAIN_SHELL), rasterizer })
    const extension = extensionOf(row)
    await built.exportAs(row, built.file(`out${extension}`, new Uint8Array(0)))
    expect(built.browser.saveOptions, `${row}: one chooser`).toHaveLength(1)
    const options = built.browser.saveOptions[0]
    expect(options?.['types'], row).toEqual(typesHandedFor(row))
    expect(String(options?.['suggestedName']).endsWith(extension), `${row}: ${String(options?.['suggestedName'])}`).toBe(true)
    expect(built.written, `${row}: the file was written`).toEqual([`out${extension}`])
  })
})

describe('RW-7 -- IC-140 hands the chooser the media type and the extension of IO-8', () => {
  it('the chooser is opened with text/x-grs-markdown for .md, and the proposed name ends with the extension of IO-8', async () => {
    const stage = await windowStage(ONE_PARENT())
    await stage.press('IC-107')
    const exported = stage.file(`report${extensionOf('IO-8')}`, new Uint8Array(0))
    stage.browser.toSave.push(exported)
    await stage.press('IC-140')
    const options = stage.browser.saveOptions[0]
    expect(stage.browser.saveOptions, 'IC-140 opens one chooser').toHaveLength(1)
    expect(options?.['types']).toEqual(typesHandedFor('IO-8'))
    const name = String(options?.['suggestedName'])
    expect(name.endsWith(extensionOf('IO-8')), name).toBe(true)
    expect(name, 'RW-7: the name is ASCII, the fixed word, then the base date').toMatch(/^([ -~]+_)?delay-diagnostics_\d{4}-\d{2}-\d{2}/)
    expect(stage.written).toEqual([exported.name])
  })
})

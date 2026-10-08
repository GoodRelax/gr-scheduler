// CR-612 spec-only tests: IO-7 / FR-067 / FR-096 -- an exported single .html opens through the open route of another GRS.

import { describe, expect, it } from 'vitest'

import { exportEmbeddedHtml } from '../../src/adapter/document-codec/document-codec'
import { EMBEDDED_DOCUMENT_ELEMENT_ID } from '../../src/framework/single-html-shell/document-file-flow'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  OPEN_CHOOSER,
  REQUIREMENTS,
  closeImportReport,
  UTF8,
  reasonWords,
  replaceWith,
  shellAppSource,
  shellStage,
  stageWithTarget,
  there,
  type ShellStage,
} from './cr-610-file-flow-stage'
import { specTable } from './spec-table'

const RS_67 = reasonWords('RS-67')

const OPENS_ELSEWHERE = '書き出した `.html` は、開く道（`FR-087`）でも読めること（MUST）'
const HTML_HAS_NO_TARGET = '単一 `.html`（表 T-024 の `IO-7`）から置き換えで開いた文書も同じである'

const PLAIN_SHELL =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<title>GRS</title></head><body><div id="app"></div>' +
  '<script type="module">boot()</script></body></html>\n'

async function exported(document: Document): Promise<string> {
  const made = await exportEmbeddedHtml(shellAppSource(PLAIN_SHELL), document)
  if (!made.ok) throw new Error(`precondition: IO-7 refused to write: ${JSON.stringify(made.fault)}`)
  return made.html
}

const titleOf = (built: ShellStage): unknown =>
  (built.loop.document() as unknown as { schedule: { project: { title: unknown } } }).schedule.project.title

const told = (built: ShellStage): readonly string[] => built.last().notices.map((one) => one.text)

describe('IO-7 / FR-067 / FR-096 / RS-67 -- the manuscript still says it', () => {
  it('FR-067 opens an exported .html through the open route; FR-096 gives it no save target; T-233 holds RS-67', () => {
    expect(REQUIREMENTS).toContain(OPENS_ELSEWHERE)
    expect(REQUIREMENTS).toContain(HTML_HAS_NO_TARGET)
    const row = specTable('T-233').rows.find((one) => one.id === 'RS-67')
    expect(row?.cells.join(' ')).toContain('NT-1')
  })
})

describe('FR-067 (MUST) / OP-3 -- an exported .html is opened like any file', () => {
  it('FR-067 / OP-3: SK-10 on an exported .html raises U-56 first', async () => {
    const built = await shellStage()
    await built.open(built.file('handed.html', UTF8.encode(await exported(there()))))
    expect(built.last().openModal, 'FR-067: the exported .html was refused before OP-3').not.toBeNull()
    expect(told(built)).not.toContain(RS_67.text.ja)
  })

  it('FR-067 / IC-71: a replace takes the embedded document', async () => {
    const built = await shellStage()
    await replaceWith(built, built.file('handed.html', UTF8.encode(await exported(there()))))
    expect(titleOf(built)).toBe('There')
  })

  it('FR-096 / FR-060: after a replace from .html, SK-11 asks for a file and never writes the .html', async () => {
    const { built } = await stageWithTarget()
    await replaceWith(built, built.file('handed.html', UTF8.encode(await exported(there()))))
    const questionsBefore = built.browser.saveQuestions()
    built.browser.toSave.push(built.file('fresh.json', new Uint8Array(0)))
    await built.save()
    expect(built.written, 'FR-096: SK-11 wrote GRS JSON over the .html').toEqual(['fresh.json'])
    expect(built.browser.saveQuestions()).toBe(questionsBefore + 1)
  })

  it('FR-067 / FR-022 / FR-060: a merge (IC-72) from .html lands and keeps the earlier save target', async () => {
    const { built } = await stageWithTarget()
    await built.open(built.file('handed.html', UTF8.encode(await exported(there()))))
    expect(built.last().openModal, 'precondition: no U-56 for the .html').not.toBeNull()
    await built.press(OPEN_CHOOSER(), 'IC-72')
    await closeImportReport(built)
    expect(built.last().openModal).toBeNull()
    expect(built.loop.hasUnsavedEdits()).toBe(true)
    await built.save()
    expect(built.written).toEqual(['mine.json'])
  })
})

describe('FR-067 (MUST NOT) / RS-67 -- an .html GRS cannot open', () => {
  it('RS-67: an .html with neither container is not opened and RS-67 is told (NT-1)', async () => {
    const built = await shellStage()
    const before = titleOf(built)
    await built.open(built.file('other.html', UTF8.encode(PLAIN_SHELL)))
    expect(built.last().openModal, 'FR-067: U-56 stood for an .html GRS cannot open').toBeNull()
    expect(told(built), 'RS-67 was not told').toContain(RS_67.text.ja)
    expect(titleOf(built)).toBe(before)
  })

  it('RS-67: an .html with two embedded documents is not opened and RS-67 is told', async () => {
    const built = await shellStage()
    const one = await exported(there())
    const marker = `id="${EMBEDDED_DOCUMENT_ELEMENT_ID}"`
    const containerAt = one.indexOf(marker)
    const begin = one.lastIndexOf('<script', containerAt)
    const end = one.indexOf('</script>', containerAt) + '</script>'.length
    const twice = one.replace('</body>', `${one.slice(begin, end)}</body>`)
    expect(twice.split(marker).length - 1, 'precondition: the page holds two containers').toBe(2)
    await built.open(built.file('twice.html', UTF8.encode(twice)))
    expect(built.last().openModal).toBeNull()
    expect(told(built)).toContain(RS_67.text.ja)
  })
})

// CR-429: Project.sourceFormat says whether a document came from GRS, a pj12 file or a pj15 file.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Project } from '../../src/entity/document-model/schedule/schedule'
import { importDocument, type ImportRequest } from '../../src/use-case/import-document/import-document'
import { specTable } from '../contract/spec-table'
import {
  accepted,
  currentDocument,
  pj12Fixture,
  pj15Fixture,
  TEMPLATE_TEXT,
  templateDocument,
  writtenText,
} from './cr-429-mspdi-fixtures'
import {
  leaf,
  mspdiText,
  parseXml,
  pathsIn,
  pj15OnlyPaths,
  sampleValue,
  withLeafAt,
} from './cr-429-mspdi-schema'

const AT_143_THREE = '文書の元の形式。`grs` ／ `pj12` ／ `pj15`。'

const AT_143_ON_OPEN =
  'MSPDI を開いたときに決め（pj15 だけの要素が 1 つでもあれば `pj15`、無ければ `pj12`）、合流では今の文書の値を保つ。'

const AT_143_NOT_WRITTEN = 'MSPDI へは書き出さない。'

const AT_143_OLD_JSON =
  'この列を持たない `GRS JSON` は、`carry` に `SaveVersion` があれば同じ見分け方で `pj12` ／ `pj15`、無ければ `grs` として読む'

const THREE_VALUES: readonly Project['sourceFormat'][] = ['grs', 'pj12', 'pj15']

type Json = Record<string, unknown> & {
  schedule: { project: Record<string, unknown> & { carry: Record<string, string> }; tasks: { carry: Record<string, string> }[] }
}

function at143(): string {
  const row = specTable('T-058').rows.find((each) => each.id === 'AT-143')
  if (row === undefined) throw new Error('table T-058 has no row AT-143')
  return row.cells.join(' | ')
}

function sourceOf(document: Document): string {
  return document.schedule.project.sourceFormat
}

function withoutTheColumn(change: (json: Json) => void = () => undefined): string {
  const json = JSON.parse(TEMPLATE_TEXT) as Json
  delete json.schedule.project['sourceFormat']
  change(json)
  return JSON.stringify(json)
}

function readJson(text: string): Document {
  const read = documentFromJson(text)
  if (!read.ok) throw new Error(`the JSON was refused: ${JSON.stringify(read).slice(0, 400)}`)
  return read.document
}

function merged(current: Document, incoming: Document, choice: ImportRequest['choice']): Document {
  const outcome = importDocument({
    current,
    incoming,
    format: 'mspdi',
    choice,
    validationPassed: true,
    anotherOpenInProgress: false,
    unsavedEditsDiscardConfirmed: true,
    merge:
      choice === 'merge'
        ? { mapping: { kind: 'allDifferent' }, profileConflict: 'overwrite', settingsConflict: 'overwrite' }
        : null,
    defaultSettings: current.documentSettings,
    importSessionId: 'session-1',
  })
  if (!outcome.ok) throw new Error(`the import was refused: ${JSON.stringify(outcome.refusal).slice(0, 400)}`)
  return outcome.document
}

const PJ12 = (): Document => accepted(mspdiText(pj12Fixture({ outlineCodes: true }))).document

const PJ15 = (): Document => accepted(mspdiText(pj15Fixture())).document

describe('the row these cases answer to', () => {
  it('AT-143: the column still says what the cases read it to say', () => {
    const row = at143()
    expect(row).toContain(AT_143_THREE)
    expect(row).toContain(AT_143_ON_OPEN)
    expect(row).toContain(AT_143_NOT_WRITTEN)
    expect(row).toContain(AT_143_OLD_JSON)
  })

  it('AT-143: the document schema admits exactly the three values and requires the column', () => {
    const schema = JSON.parse(
      readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'grs-document.schema.json'), 'utf8'),
    ) as { $defs: { Project: { required: string[]; properties: Record<string, { enum?: string[] }> } } }
    expect(schema.$defs.Project.properties['sourceFormat']?.enum).toEqual([...THREE_VALUES])
    expect(schema.$defs.Project.required).toContain('sourceFormat')
  })
})

describe('AT-143 -- decided when an MSPDI file is opened', () => {
  it('AT-143: a file with no pj15-only element is pj12', () => {
    expect(sourceOf(PJ12())).toBe('pj12')
  })

  it('AT-143: SaveVersion 14 alone does not make a file pj15 -- the elements decide', () => {
    expect(sourceOf(accepted(mspdiText(pj12Fixture({ saveVersion: '14' }))).document)).toBe('pj12')
  })

  it('AT-143: a file holding every pj15-only element is pj15', () => {
    expect(sourceOf(PJ15())).toBe('pj15')
  })

  it.each(pj15OnlyPaths())('AT-143: one pj15-only element, %s, is enough to make the file pj15', (path) => {
    const cut = path.lastIndexOf('/')
    const one = withLeafAt(pj12Fixture({ outlineCodes: true }), path.slice(0, cut), leaf(path.slice(cut + 1), sampleValue(path)))
    const text = mspdiText(one)
    expect(pathsIn(parseXml(text))).toContain(path)
    expect(sourceOf(accepted(text).document)).toBe('pj15')
  })

  it('AT-143: the document GRS starts from is grs', () => {
    expect(sourceOf(templateDocument())).toBe('grs')
  })
})

describe('AT-143 -- a GRS JSON file without the column', () => {
  it('AT-143: with no SaveVersion carried, it is read as grs', () => {
    expect(sourceOf(readJson(withoutTheColumn()))).toBe('grs')
  })

  it('AT-143: with SaveVersion carried and no pj15-only element, it is read as pj12', () => {
    const text = withoutTheColumn((json) => {
      json.schedule.project.carry['SaveVersion'] = '12'
    })
    expect(sourceOf(readJson(text))).toBe('pj12')
  })

  it('AT-143: SaveVersion 14 carried without a pj15-only element is still pj12', () => {
    const text = withoutTheColumn((json) => {
      json.schedule.project.carry['SaveVersion'] = '14'
    })
    expect(sourceOf(readJson(text))).toBe('pj12')
  })

  it('AT-143: with SaveVersion and a pj15-only Project leaf carried, it is read as pj15', () => {
    const text = withoutTheColumn((json) => {
      json.schedule.project.carry['SaveVersion'] = '12'
      json.schedule.project.carry['NewTasksAreManual'] = '1'
    })
    expect(sourceOf(readJson(text))).toBe('pj15')
  })

  it('AT-143: with SaveVersion and a pj15-only Task leaf carried, it is read as pj15', () => {
    const text = withoutTheColumn((json) => {
      json.schedule.project.carry['SaveVersion'] = '12'
      const task = json.schedule.tasks[0]
      if (task === undefined) throw new Error('the template has no task')
      task.carry['Manual'] = '1'
    })
    expect(sourceOf(readJson(text))).toBe('pj15')
  })

  it('AT-143: a pj15-only leaf with no SaveVersion is still grs', () => {
    const text = withoutTheColumn((json) => {
      json.schedule.project.carry['NewTasksAreManual'] = '1'
    })
    expect(sourceOf(readJson(text))).toBe('grs')
  })

  it('AT-143: a file that holds the column is read as it says', () => {
    const says = (value: string, carried: Record<string, string>): string =>
      withoutTheColumn((json) => {
        json.schedule.project['sourceFormat'] = value
        Object.assign(json.schedule.project.carry, carried)
      })
    expect(sourceOf(readJson(says('pj15', {})))).toBe('pj15')
    expect(sourceOf(readJson(says('grs', { SaveVersion: '12' })))).toBe('grs')
  })

  it('AT-143, FR-024: the column goes out in GRS JSON and comes back', () => {
    const text = jsonFromDocument(PJ15())
    const json = JSON.parse(text) as Json
    expect(json.schedule.project['sourceFormat']).toBe('pj15')
    expect(sourceOf(readJson(text))).toBe('pj15')
  })
})

describe('AT-143 -- a merge keeps the value of the document merged into', () => {
  it('AT-143: a pj15 file merged into a GRS document leaves it grs', () => {
    expect(sourceOf(merged(currentDocument(), PJ15(), 'merge'))).toBe('grs')
  })

  it('AT-143: a pj15 file merged into a pj12 document leaves it pj12', () => {
    expect(sourceOf(merged(PJ12(), PJ15(), 'merge'))).toBe('pj12')
  })

  it('AT-143: a pj12 file merged into a pj15 document leaves it pj15', () => {
    expect(sourceOf(merged(PJ15(), PJ12(), 'merge'))).toBe('pj15')
  })

  it('AT-143: opening a pj15 file in place of a GRS document takes the file`s value', () => {
    expect(sourceOf(merged(currentDocument(), PJ15(), 'replace'))).toBe('pj15')
  })
})

describe('AT-143 -- never written to MSPDI', () => {
  it('AT-143: a pj12 document written as if it were pj15 is written to the same text', () => {
    const pj12 = PJ12()
    const relabelled: Document = {
      ...pj12,
      schedule: { ...pj12.schedule, project: { ...pj12.schedule.project, sourceFormat: 'pj15' } },
    }
    expect(writtenText(relabelled)).toBe(writtenText(pj12))
  })

  it('AT-143: no element of the written file names the column', () => {
    const names = pathsIn(parseXml(writtenText(PJ15()))).map((path) => path.slice(path.lastIndexOf('/') + 1))
    expect(names.filter((name) => name.toLowerCase() === 'sourceformat')).toEqual([])
  })
})

// CR-611 spec-only tests: SK-25 / FR-095 / table T-342 -- N asks, then replaces the document with the empty document.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { settingDefaultOf } from '../fixtures/setting-default'
import {
  REQUIREMENTS,
  SPEC_WORDS,
  TEMPLATE_TEXT,
  jsonBytes,
  keyOfRow,
  replaceWith,
  settingNumber,
  settingRow,
  shellStage,
  surfaceOfEntrance,
  here,
  templateDocument,
  there,
  type ShellStage,
} from './cr-610-file-flow-stage'
import { bare, specTable } from './spec-table'

const SK_25 = keyOfRow('SK-25')
const WITH_TEMPLATE = { startupTemplate: templateDocument() }
const T_342 = specTable('T-342')
const ERD = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'erd.json'), 'utf8')) as {
  entities: { name: string; columns: { name: string; json: { null: boolean } }[] }[]
}
const BASE_DOCUMENT = JSON.parse(
  (
    JSON.parse(
      readFileSync(join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'image-to-grs-json-prompt.json'), 'utf8'),
    ) as { emptyDocument: string }
  ).emptyDocument,
) as Record<string, any>
const HELP_ROSTER = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'help-roster.json'), 'utf8'),
) as unknown
const GENERATED_WORDS = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'display-words.json'), 'utf8'),
) as Record<string, any>

const ASKS_ALWAYS = '捨てる前に、未保存の編集の有無によらず、表 T-024a の `OP-4` と同じ確認を求めること（MUST）'
const NO_TARGET_AFTER = '新しく始めた後は、上書きする先を持たないこと（MUST）'

type Loose = Record<string, any>

const documentOf = (built: ShellStage): Loose => JSON.parse(JSON.stringify(built.loop.document())) as Loose

async function startAnew(built: ShellStage): Promise<void> {
  await built.press(surfaceOfEntrance('IC-98'), 'IC-98')
  expect(built.last().confirmation?.question, 'precondition: IC-98 raised no QN-5').toBe('QN-5')
  await built.answer('proceed')
  expect(built.last().confirmation, 'precondition: the answer did not take QN-5 down').toBeNull()
}

function livedIn(): Document {
  const draft = JSON.parse(JSON.stringify(here())) as Loose
  draft['documentSettings']['zoomX'] = 3
  draft['documentSettings']['themeMonochrome'] = true
  draft['documentStamp']['fileSavedUtc'] = '2026-05-04T03:02:01Z'
  draft['schedule']['project']['themeHue'] = 30
  const read = documentFromJson(JSON.stringify(draft))
  if (!read.ok) throw new Error(`the lived-in document is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

async function emptyDocument(): Promise<{ before: Loose; after: Loose }> {
  const built = await shellStage({ ...WITH_TEMPLATE, document: livedIn() })
  const before = documentOf(built)
  await startAnew(built)
  return { before, after: documentOf(built) }
}

function nullableColumns(entity: string): readonly string[] {
  const found = ERD.entities.find((one) => one.name === entity)
  if (found === undefined) throw new Error(`erd.json has no entity ${entity}`)
  return found.columns.filter((one) => one.json.null).map((one) => one.name)
}

function rosterEntry(row: string): Loose {
  let found: Loose | undefined
  const walk = (node: unknown): void => {
    if (found !== undefined) return
    if (Array.isArray(node)) for (const one of node) walk(one)
    else if (node !== null && typeof node === 'object') {
      const record = node as Loose
      if (record['row'] === row && record['table'] === 'T-109') found = record
      else for (const value of Object.values(record)) walk(value)
    }
  }
  walk(HELP_ROSTER)
  if (found === undefined) throw new Error(`help-roster.json has no T-109 row ${row}`)
  return found
}

describe('SK-25 / FR-095 / T-342 / QN-5 -- the manuscript still says it', () => {
  it('SK-25: table T-036 assigns a bare N to IC-98', () => {
    expect(SK_25.key.toUpperCase()).toBe('N')
    expect(Object.values(SK_25.modifiers).some(Boolean)).toBe(false)
    expect(bare(specTable('T-036').rows.find((one) => one.id === 'SK-25')?.cells[2] ?? '')).toBe('IC-98')
  })

  it('FR-095 asks whatever is unsaved and leaves no save target; T-342 holds BK-1 to BK-6', () => {
    expect(REQUIREMENTS).toContain(ASKS_ALWAYS)
    expect(REQUIREMENTS).toContain(NO_TARGET_AFTER)
    expect(T_342.rows.map((one) => one.id)).toEqual(['BK-1', 'BK-2', 'BK-3', 'BK-4', 'BK-5', 'BK-6'])
  })

  it('QN-5: the generated words are the manuscript words, true whether or not edits are unsaved', () => {
    const spec = (SPEC_WORDS['questions'] as Loose[]).find((one) => one['rowId'] === 'QN-5')
    const built = (GENERATED_WORDS['questions'] as Loose[]).find((one) => one['rowId'] === 'QN-5')
    expect(built?.['text']).toEqual(spec?.['text'])
  })

  it('FR-036: the help lists N at the IC-98 item', () => {
    expect(rosterEntry('IC-98')['keys']).toBe('N')
  })
})

describe('FR-095 (MUST) / SK-25 -- N asks first, always', () => {
  it('SK-25 / FR-095: N with nothing unsaved raises QN-5', async () => {
    const built = await shellStage(WITH_TEMPLATE)
    expect(built.loop.hasUnsavedEdits(), 'precondition: the bench starts with unsaved edits').toBe(false)
    await built.key(SK_25)
    expect(built.last().confirmation?.question, 'FR-095: N did not ask before discarding').toBe('QN-5')
  })

  it('SK-25 / NT-7: N pressed again while QN-5 stands closes it and discards nothing', async () => {
    const built = await shellStage(WITH_TEMPLATE)
    const before = documentOf(built)
    await built.key(SK_25)
    expect(built.last().confirmation?.question, 'precondition: N raised no QN-5').toBe('QN-5')
    await built.key(SK_25)
    expect(built.last().confirmation, 'NT-7: the second N did not close the question').toBeNull()
    expect(documentOf(built)).toEqual(before)
  })

  it('FR-095 / IC-98: the header entrance asks the same question', async () => {
    const built = await shellStage(WITH_TEMPLATE)
    await built.press(surfaceOfEntrance('IC-98'), 'IC-98')
    expect(built.last().confirmation?.question).toBe('QN-5')
  })

  it('FR-095 / IC-98: proceeding from the header entrance lands the same empty document as N', async () => {
    const built = await shellStage(WITH_TEMPLATE)
    await built.press(surfaceOfEntrance('IC-98'), 'IC-98')
    await built.answer('proceed')
    const after = documentOf(built)
    expect(after['schedule']['tasks'], 'BK-1: IC-98 did not start an empty document').toEqual([])
    expect(after['schedule']['taskGroups']).toHaveLength(1)
  })
})

describe('T-342 -- the empty document, after N and proceed', () => {
  it('BK-1: every schedule array but taskGroups and calendars is empty', async () => {
    const { after } = await emptyDocument()
    for (const [key, value] of Object.entries(after['schedule'] as Loose)) {
      if (!Array.isArray(value) || key === 'taskGroups' || key === 'calendars') continue
      expect(value, `BK-1: schedule.${key} is not empty`).toEqual([])
    }
  })

  it('BK-2: exactly one row, at the root, named by defaultNames row', async () => {
    const { after } = await emptyDocument()
    const rows = after['schedule']['taskGroups'] as Loose[]
    expect(rows).toHaveLength(1)
    expect(rows[0]?.['parentId']).toBeNull()
    const word = (SPEC_WORDS['defaultNames'] as Loose[]).find((one) => one['use'] === 'row')?.['text']['ja']
    expect(rows[0]?.['label']).toBe(word)
  })

  it('BK-2: the row id is taken anew each time a document is started', async () => {
    const built = await shellStage(WITH_TEMPLATE)
    await startAnew(built)
    const first = documentOf(built)['schedule']['taskGroups'][0]['id']
    await startAnew(built)
    const second = documentOf(built)['schedule']['taskGroups'][0]['id']
    expect(second).not.toBe(first)
  })

  it('BK-3: one calendar, Monday to Friday per S-106, no exception per S-107, uid/name/ordinal of the FR-068 base', async () => {
    const { after } = await emptyDocument()
    const calendars = after['schedule']['calendars'] as Loose[]
    expect(calendars).toHaveLength(1)
    const calendar = calendars[0] as Loose
    const base = BASE_DOCUMENT['schedule']['calendars'][0] as Loose
    expect([calendar['uid'], calendar['name'], calendar['ordinal']]).toEqual([base['uid'], base['name'], base['ordinal']])
    const working = (calendar['weekDays'] as Loose[])
      .filter((one) => one['dayWorking'] === true)
      .map((one) => one['dayType'])
      .sort()
    expect(working).toEqual(settingRow('S-106')['value']['days'])
    expect((calendar['exceptions'] as Loose[]).map((one) => one['fromDate'])).toEqual(settingRow('S-107')['value']['days'])
  })

  it('BK-4: project columns that take null are null, calendarUid names the BK-3 calendar', async () => {
    const { after } = await emptyDocument()
    const project = after['schedule']['project'] as Loose
    for (const column of nullableColumns('Project')) {
      if (column === 'calendarUid' || column === 'weekStartDay') continue
      expect(project[column], `BK-4: project.${column}`).toBeNull()
    }
    expect(project['calendarUid']).toBe(after['schedule']['calendars'][0]['uid'])
  })

  it.todo(
    'BK-4 vs S-108: project.weekStartDay -- reading A: null, as BK-4 nulls every column that takes null; ' +
      'reading B: 1, since S-108 names Project.weekStartDay as its place and the FR-068 base document (BK-3 points at it) holds 1',
  )

  it('BK-4: the columns that do not take null hold S-73, S-71, 0, 1, grs and empty carries', async () => {
    const { after } = await emptyDocument()
    const project = after['schedule']['project'] as Loose
    expect(project['themeHue']).toBe(settingNumber('S-73'))
    expect(project['importSeq']).toBe(settingNumber('S-71'))
    expect(project['uidHighWaterMark']).toBe(0)
    expect(project['outlineBase']).toBe(1)
    expect(project['sourceFormat']).toBe('grs')
    expect(project['carry']).toEqual({})
    expect(project['carryElements']).toEqual([])
    expect(project['title'], 'BK-4: the title is null (FR-035 shows Untitled)').toBeNull()
  })

  it('BK-5: every view setting holds the T-202 / T-203 default', async () => {
    const { after } = await emptyDocument()
    for (const [key, value] of Object.entries(after['documentSettings'] as Loose)) {
      const fallback = settingDefaultOf(key)
      expect(fallback, `BK-5: documentSettings.${key} has no default in tables T-202 / T-203`).not.toBeUndefined()
      expect(value, `BK-5: documentSettings.${key}`).toEqual(fallback)
    }
  })

  it('BK-6: the template version, an empty changeLog, no fileSavedUtc', async () => {
    const { after } = await emptyDocument()
    expect(after['schemaVersion']).toBe((JSON.parse(TEMPLATE_TEXT) as Loose)['schemaVersion'])
    expect(after['changeLog']).toEqual([])
    expect(after['documentStamp']['fileSavedUtc']).toBeNull()
  })

  it('BK-6 / RD-7: the stamp is advanced -- written by ED-1 at a new moment', async () => {
    const { before, after } = await emptyDocument()
    const user = bare(specTable('T-229').rows.find((one) => one.id === 'ED-1')?.cells[1] ?? '')
    expect(after['documentStamp']['lastEditedBy']).toBe(user)
    expect(after['documentStamp']['scheduleUpdatedUtc']).not.toBe(before['documentStamp']['scheduleUpdatedUtc'])
  })
})

describe('FR-095 (MUST) -- no save target after starting anew', () => {
  it('FR-095: after a replace-open then N, SK-11 asks for a file and never writes the file opened', async () => {
    const built = await shellStage(WITH_TEMPLATE)
    await replaceWith(built, built.file('theirs.json', jsonBytes(there())))
    await startAnew(built)
    const questionsBefore = built.browser.saveQuestions()
    built.browser.toSave.push(built.file('fresh.json', new Uint8Array(0)))
    await built.save()
    expect(built.written, 'FR-095: SK-11 overwrote the file opened before starting anew').toEqual(['fresh.json'])
    expect(built.browser.saveQuestions()).toBe(questionsBefore + 1)
  })
})

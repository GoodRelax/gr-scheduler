// CR-646 X-8..X-13: the GRS JSON shape -- the time pattern, one TaskVisual per Task, no stackOrder / lastSaved, created, the schema words.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import { scheduleViolations } from '../../src/entity/document-model/schedule/schedule'
import { importDocument, type MergeMapping } from '../../src/use-case/import-document/import-document'
import { validateImportedDocument } from '../../src/use-case/validate-imported-document/validate-imported-document'
import { specTable } from '../contract/spec-table'
import {
  ERD_TEXT,
  KNOWN_VERSION,
  MANIFEST,
  REQUIREMENTS,
  S_482,
  S_483,
  SCHEMA,
  asDocument,
  documentObject,
  restoreAnimationFrames,
  stage,
  taskRow,
  visualOf,
} from './cr-646-stage'

afterEach(() => {
  vi.useRealTimers()
  restoreAnimationFrames()
})

const CREATED = '2025-12-01T09:15:00'

/** @purity pure */
function textOf(document: Record<string, any>): string {
  return jsonFromDocument(document as never)
}

/** @purity pure */
function readOk(text: string): Document {
  const read = documentFromJson(text, KNOWN_VERSION)
  if (!read.ok) throw new Error(`premise: the GRS JSON was refused: ${JSON.stringify(read.faults).slice(0, 400)}`)
  return read.document
}

/** @purity pure */
function twoTasks(project: Record<string, unknown> = {}): Record<string, any> {
  return documentObject({ tasks: [taskRow(1), taskRow(2, { start: '2026-04-13T08:00:00', finish: '2026-04-17T17:00:00' })], project })
}

describe('CR-646 the manuscript as these cases read it', () => {
  // WHY: CR-699 (JDG-1677) raises the version to the instant a change lands, not the day.
  it('FR-073: a shape change raises the version once, to the instant it is applied, and is not read across', () => {
    expect(REQUIREMENTS).toContain('形式の版を、その変更を当てる時刻へ上げること（MUST）')
    expect(REQUIREMENTS).toContain('1 つの変更要求の中で版を上げるのは 1 度だけとする')
    expect(REQUIREMENTS).toContain('は、版を上げても古い形の文書を読み替えない')
  })

  // WHY: CR-699 (JDG-1677) made the version an RFC 3339 UTC instant; check 76 holds the same shape.
  it('FR-073 / JDG-1677: the schema const is the manifest version, and it is an instant in YYYY-MM-DDTHH:MM:SSZ', () => {
    expect(SCHEMA['properties'].schemaVersion.const).toBe(MANIFEST['schemaVersion'])
    expect(SCHEMA['properties'].schemaVersion.const).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
  })

  it('$defs/Time: the two default-time columns point at one time definition with the xsd:time pattern', () => {
    const project = SCHEMA['$defs'].Project.properties
    expect(project.defaultStartTime.$ref).toBe('#/$defs/Time')
    expect(project.defaultFinishTime.$ref).toBe('#/$defs/Time')
    expect(typeof SCHEMA['$defs'].Time.pattern).toBe('string')
  })
})

describe('X-8 Chapter 6.1 / AT-154: a malformed default time refuses the whole GRS JSON (RS-25)', () => {
  it('RS-25: defaultStartTime 8:00 refuses the document', () => {
    const read = documentFromJson(textOf(twoTasks({ defaultStartTime: '8:00' })), KNOWN_VERSION)
    expect(read.ok).toBe(false)
    if (!read.ok) expect(read.reason).toBe('RS-25')
  })

  it('RS-25: defaultFinishTime 17:00 refuses the document', () => {
    const read = documentFromJson(textOf(twoTasks({ defaultFinishTime: '17:00' })), KNOWN_VERSION)
    expect(read.ok).toBe(false)
    if (!read.ok) expect(read.reason).toBe('RS-25')
  })

  it('AT-154: defaultStartTime 08:00:00 is read into the column', () => {
    expect(readOk(textOf(twoTasks({ defaultStartTime: '08:00:00' }))).schedule.project).toMatchObject({ defaultStartTime: '08:00:00' })
  })

  it('AT-155: defaultFinishTime 18:30:00 is read into the column', () => {
    expect(readOk(textOf(twoTasks({ defaultFinishTime: '18:30:00' }))).schedule.project).toMatchObject({ defaultFinishTime: '18:30:00' })
  })

  it('AT-154 / AT-155: both columns null are read as null', () => {
    expect(readOk(textOf(twoTasks())).schedule.project).toMatchObject({ defaultStartTime: null, defaultFinishTime: null })
  })
})

describe('X-9 IV-23: exactly one TaskVisual per Task', () => {
  /** @purity pure */
  function missingOne(): Record<string, any> {
    const document = twoTasks()
    document['schedule'].taskVisuals = [visualOf(1)]
    return document
  }

  it('IV-23: scheduleViolations names IV-23 for a Task no TaskVisual points at', () => {
    const document = missingOne() as unknown as Document
    const rows = scheduleViolations(document.schedule, document.documentSettings as DocumentSettings).map((one) => one.row)
    expect(rows).toContain('IV-23')
  })

  // WHY: Chapter 6.1 has scheduleViolations driven by table T-220, row by row, and nothing there lets one
  // row stand in for another; IV-1 (duplicate key taskUid) and IV-23 ("exactly one") are both broken.
  it('IV-23 / IV-1: a Task two TaskVisuals point at is told under both rows it breaks', () => {
    const document = twoTasks()
    document['schedule'].taskVisuals = [visualOf(1), visualOf(2), visualOf(2, { fillColor: 'red' })]
    const typed = document as unknown as Document
    const rows = scheduleViolations(typed.schedule, typed.documentSettings as DocumentSettings).map((one) => one.row)
    expect(rows).toContain('IV-1')
    expect(rows).toContain('IV-23')
  })

  it('IV-23: a sound document answers no IV-23', () => {
    const typed = twoTasks() as unknown as Document
    expect(scheduleViolations(typed.schedule, typed.documentSettings as DocumentSettings).map((one) => one.row)).not.toContain('IV-23')
  })

  // WHY: IV-23 spans two arrays, so the schema shape (RS-25) cannot hold it; CP-13 makes ValidateImportedDocument
  // (PI-13) the check the three import routes share, so the T-220 row is refused there, not in the codec.
  it('IV-23 / CP-13: the codec opens a GRS JSON whose Task lacks a TaskVisual (no RS-25 shape fault)', () => {
    expect(documentFromJson(textOf(missingOne()), KNOWN_VERSION).ok).toBe(true)
  })

  it('IV-23 / OP-5: opening a GRS JSON whose Task lacks a TaskVisual is refused by PI-13 with reason IV-23 (NT-1)', () => {
    const told = validateImportedDocument({ document: readOk(textOf(missingOne())), byteLength: textOf(missingOne()).length, emptyRowTaskUids: [] })
    expect(told.ok).toBe(false)
    if (!told.ok) {
      const named = told.refusals.filter((one) => one.rule === 'IV-23')
      expect(named.length).toBeGreaterThan(0)
      expect(named.every((one) => one.notice === 'NT-1')).toBe(true)
    }
  })

  const MAPPINGS: readonly MergeMapping[] = [{ kind: 'allSame' }, { kind: 'allDifferent' }]

  it.each(MAPPINGS)('IV-23 / FR-022: after a merge ($kind) every Task still has exactly one TaskVisual', (mapping) => {
    const current = asDocument({ tasks: [taskRow(1), taskRow(2)] })
    const incoming = asDocument({ tasks: [taskRow(1, { name: 'T1 again' }), taskRow(3)] })
    const outcome = importDocument({
      current,
      incoming,
      format: 'grsJson',
      choice: 'merge',
      validationPassed: true,
      anotherOpenInProgress: false,
      unsavedEditsDiscardConfirmed: true,
      merge: { mapping, profileConflict: 'keepExisting', settingsConflict: 'keepExisting' },
      defaultSettings: current.documentSettings,
      importSessionId: '64600000-0000-4000-8000-00000000a001',
    })
    if (!outcome.ok) throw new Error(`premise: the merge was refused: ${JSON.stringify(outcome.refusal)}`)
    const tasks = outcome.document.schedule.tasks.map((one) => one.uid).sort((a, b) => a - b)
    const visuals = outcome.document.schedule.taskVisuals.map((one) => one.taskUid).sort((a, b) => a - b)
    expect(visuals).toEqual(tasks)
  })
})

describe('X-10 FR-073 / T-297 / JDG-1206: the old shape is refused, not read across', () => {
  it('JDG-1206: a TaskGroupMember carrying stackOrder refuses the document', () => {
    const document = twoTasks()
    document['schedule'].taskGroupMembers = document['schedule'].taskGroupMembers.map((one: object) => ({ ...one, stackOrder: null }))
    expect(documentFromJson(textOf(document), KNOWN_VERSION).ok).toBe(false)
  })

  it('JDG-1206: a Project carrying lastSaved refuses the document', () => {
    // WHY: documentObject drops a lastSaved handed in through the project part, so it is put back after.
    const document = twoTasks()
    document['schedule'].project.lastSaved = '2026-01-01T00:00:00'
    expect(Object.keys(document['schedule'].project), 'premise: the Project carries lastSaved').toContain('lastSaved')
    expect(documentFromJson(textOf(document), KNOWN_VERSION).ok).toBe(false)
  })

  it('AT-62 / AT-11 retired: the written GRS JSON holds no stackOrder and no lastSaved', () => {
    const text = jsonFromDocument(readOk(textOf(twoTasks())))
    expect(text).not.toContain('"stackOrder"')
    expect(text).not.toContain('"lastSaved"')
  })

  it('FR-073: the written GRS JSON names the version the schema holds', () => {
    expect(JSON.parse(jsonFromDocument(readOk(textOf(twoTasks()))))['schemaVersion']).toBe(SCHEMA['properties'].schemaVersion.const)
  })
})

describe('X-11 BK-4 / WT-9: a document started new', () => {
  const EMPTY = JSON.parse(
    readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'empty-document.json'), 'utf8'),
  ) as Document
  const NOW = new Date(2026, 9, 3, 14, 5, 6)

  /** @purity non-pure */
  function startedNew(): Document {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    const built = stage(asDocument({ tasks: [taskRow(1)] }), EMPTY)
    built.pressEntry('App Header', 'IC-98')
    built.answer('proceed')
    const document = built.loop.document()
    expect(document.schedule.tasks.length, 'premise: IC-98 replaced the document with the empty one').toBe(0)
    return document
  }

  it('WT-9 / BK-4: created is the local instant it was started, without a zone, to the second', () => {
    expect(startedNew().schedule.project.created).toBe('2026-10-03T14:05:06')
  })

  it('BK-4: defaultStartTime and defaultFinishTime stay null', () => {
    expect(startedNew().schedule.project).toMatchObject({ defaultStartTime: null, defaultFinishTime: null })
  })
})

describe('WT-10: a GRS JSON read keeps the created it holds', () => {
  it('WT-10: created is kept as it came', () => {
    expect(readOk(textOf(twoTasks({ created: CREATED }))).schedule.project.created).toBe(CREATED)
  })

  it('WT-10: created is written back as it came', () => {
    const text = jsonFromDocument(readOk(textOf(twoTasks({ created: CREATED }))))
    expect(JSON.parse(text)['schedule'].project.created).toBe(CREATED)
  })
})

describe('X-12 T-224 / ST-6: what the profile and the member hold', () => {
  it('T-224: the profile surface writes PF-1..PF-9 and nothing else', () => {
    expect(specTable('T-224').rows.map((one) => one.id)).toEqual(['PF-1', 'PF-2', 'PF-3', 'PF-4', 'PF-5', 'PF-6', 'PF-7', 'PF-8', 'PF-9'])
  })

  it('MG-4 / T-224: a merge whose profiles differ asks only about PF rows the table holds', () => {
    const current = asDocument({ tasks: [taskRow(1)], project: { created: CREATED } })
    const incoming = asDocument({ tasks: [taskRow(1)], project: { created: '2026-02-02T10:00:00', name: 'Other' } })
    const outcome = importDocument({
      current,
      incoming,
      format: 'grsJson',
      choice: 'merge',
      validationPassed: true,
      anotherOpenInProgress: false,
      unsavedEditsDiscardConfirmed: true,
      merge: { mapping: { kind: 'allSame' }, profileConflict: null, settingsConflict: 'keepExisting' },
      defaultSettings: current.documentSettings,
      importSessionId: '64600000-0000-4000-8000-00000000a002',
    })
    expect(outcome.ok, 'premise: the merge stops to ask about the profile').toBe(false)
    if (!outcome.ok && outcome.refusal.reason === 'profileConflictNotChosen') {
      const held = specTable('T-224').rows.map((one) => one.id)
      expect(outcome.refusal.rows.every((one) => held.includes(one))).toBe(true)
    }
  })

  it('ST-6 / AT-62 retired: a TaskGroupMember holds taskUid and groupId only', () => {
    const member = SCHEMA['$defs'].TaskGroupMember
    expect(Object.keys(member.properties).sort()).toEqual(['groupId', 'taskUid'])
    expect(member.additionalProperties).toBe(false)
  })

  it('AT-11 retired: the Project of the schema has no lastSaved', () => {
    expect(Object.keys(SCHEMA['$defs'].Project.properties)).not.toContain('lastSaved')
  })
})

describe('X-13 Chapter 6.2: the schema says why each kind of time is what it is', () => {
  const root = String(SCHEMA['description'])

  it('JDG-1211: the root description names the start side and the finish side', () => {
    expect(root).toMatch(/start-side/)
    expect(root).toMatch(/finish-side/)
  })

  it('JDG-1211: the root description names the whole-day range 00:00:00..23:59:00', () => {
    expect(root).toContain('00:00:00')
    expect(root).toContain('23:59:00')
  })

  it('JDG-1211: the root description gives the reason the record instants are UTC', () => {
    expect(root).toMatch(/UTC, so that/)
  })

  it('ST-5 / S-58: documentSettings.stackDirection carries a description', () => {
    expect(String(SCHEMA['properties'].documentSettings.properties.stackDirection.description ?? '').length).toBeGreaterThan(0)
  })

  it('S-482: the defaultStartTime description holds the S-482 value', () => {
    expect(SCHEMA['$defs'].Project.properties.defaultStartTime.description).toContain(S_482)
  })

  it('S-483: the defaultFinishTime description holds the S-483 value', () => {
    expect(SCHEMA['$defs'].Project.properties.defaultFinishTime.description).toContain(S_483)
  })

  it('Chapter 6.2: the manuscript prints the S-482 / S-483 values rather than copying them by hand', () => {
    expect(ERD_TEXT).toContain('{{S-482}}')
    expect(ERD_TEXT).toContain('{{S-483}}')
    expect(ERD_TEXT).not.toContain(`writes on start-side dates; ${S_482}`)
  })
})

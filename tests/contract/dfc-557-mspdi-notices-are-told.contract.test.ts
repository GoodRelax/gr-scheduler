// DFC-557 (spec-only): what the MSPDI codec reports is told as a notice (RS-15 of table T-233), never dropped.

import { describe, expect, it } from 'vitest'

import { documentFromJson, documentFromMspdi, jsonFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  OPEN_CHOOSER,
  UTF8,
  closeImportReport,
  here,
  reasonWords,
  shellStage,
  type ShellStage,
} from './cr-610-file-flow-stage'

const NAMESPACE = 'http://schemas.microsoft.com/project/2007'
const BENCH_PROJECT = here().schedule.project

function mspdi(tasks: string, extra = ''): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    `<Project xmlns="${NAMESPACE}">`,
    '<SaveVersion>12</SaveVersion>',
    `<Name>${BENCH_PROJECT.name ?? ''}</Name>`,
    `<StartDate>${BENCH_PROJECT.startDate ?? ''}</StartDate>`,
    '<MinutesPerDay>480</MinutesPerDay>',
    extra,
    `<Tasks>${tasks}</Tasks>`,
    '</Project>',
  ].join('\n')
}

const GOOD_TASK =
  '<Task><UID>51</UID><ID>1</ID><Name>From the file</Name><OutlineNumber>1</OutlineNumber><OutlineLevel>1</OutlineLevel>' +
  '<Start>2026-04-06T08:00:00</Start><Finish>2026-04-10T17:00:00</Finish><Duration>PT40H0M0S</Duration><DurationFormat>7</DurationFormat>' +
  '<Milestone>0</Milestone><Summary>0</Summary></Task>'
const NO_UID_TASK = GOOD_TASK.replace('<UID>51</UID>', '').replace('From the file', 'No uid')

function frameDefinition(fieldId: number, name: string, alias: string): string {
  return (
    `<ExtendedAttribute><FieldID>${fieldId}</FieldID><FieldName>${name}</FieldName>` +
    `<ElemType>20</ElemType><CFType>5</CFType><Alias>${alias}</Alias></ExtendedAttribute>`
  )
}

async function openBy(built: ShellStage, name: string, text: string, entry: string): Promise<void> {
  await built.open(built.file(name, UTF8.encode(text)))
  if (built.last().openModal === null) return
  await built.press(OPEN_CHOOSER(), entry)
  if (built.last().confirmation !== null) await built.answer('proceed')
}

function raised(view: ScreenView): readonly { reason: string; affectedCount: number | null }[] {
  return view.notices.flatMap((one) => one.raisedNotices.map((two) => ({ reason: two.reason, affectedCount: two.affectedCount })))
}


function withFade(source: Document, fadeInDays: number): Document {
  const draft = JSON.parse(jsonFromDocument(source)) as { schedule: { tasks: Record<string, unknown>[] } }
  const first = draft.schedule.tasks[0]
  if (first === undefined) throw new Error('premise: no task')
  first['fadeInDays'] = fadeInDays
  const read = documentFromJson(JSON.stringify(draft))
  if (!read.ok) throw new Error(`premise: ${JSON.stringify(read.faults)}`)
  return read.document
}

function importedWith(definitions: string): Document {
  const read = documentFromMspdi(mspdi(GOOD_TASK, `<ExtendedAttributes>${definitions}</ExtendedAttributes>`), here())
  if (!read.ok) throw new Error(`premise: ${JSON.stringify(read.faults)}`)
  return read.document
}

const FRAME_ONE = frameDefinition(188743767, 'Number1', 'theirOne')
const FRAME_TWO = frameDefinition(188743768, 'Number2', 'theirTwo')
const RS_15 = 'RS-15'

// see FR-102, T-233
function toldRs15(view: ScreenView): readonly { reason: string; affectedCount: number | null }[] {
  return raised(view).filter((one) => one.reason === RS_15)
}

// see T-233, FR-038
function spokenRs15(view: ScreenView): boolean {
  return view.notices.some((one) => one.text === reasonWords(RS_15).text.ja)
}

async function exportMspdi(document: Document): Promise<{ built: ShellStage; text: string }> {
  const built = await shellStage({ document })
  const target = built.file('out.xml', new Uint8Array(0))
  await built.exportAs('IO-1', target)
  expect(built.written, 'precondition: IC-2 wrote no MSPDI').toEqual(['out.xml'])
  return { built, text: new TextDecoder().decode(target.bytes()) }
}

describe('T-233 RS-15 / FR-102 -- opening an MSPDI that cannot be read tells it', () => {
  it('a file that is not well-formed XML raises RS-15, and the document stays as it was', async () => {
    const built = await shellStage()
    await openBy(built, 'broken.xml', '<Project><Tasks><Task></Project>', 'IC-71')
    expect(toldRs15(built.last()), 'T-233: RS-15 was not raised').toHaveLength(1)
    expect(spokenRs15(built.last()), 'FR-038: the notice does not say the words of RS-15').toBe(true)
    expect(built.loop.document().schedule.tasks.map((one) => one.uid), 'the unreadable file changed the document').toEqual([1])
  })

  it('a file whose root element is not <Project> raises RS-15', async () => {
    const built = await shellStage()
    await openBy(built, 'other.xml', '<?xml version="1.0"?><Other/>', 'IC-71')
    expect(toldRs15(built.last()), 'T-233: RS-15 was not raised').toHaveLength(1)
    expect(built.loop.document().schedule.tasks.map((one) => one.uid)).toEqual([1])
  })

  it('an unreadable file read to merge (IC-72) raises RS-15 too', async () => {
    const built = await shellStage()
    await openBy(built, 'other.xml', '<?xml version="1.0"?><Other/>', 'IC-72')
    expect(toldRs15(built.last()), 'T-233: RS-15 was not raised').toHaveLength(1)
  })
})

describe('T-233 RS-15 / FR-102 -- opening a readable MSPDI whose reading carried notices tells them', () => {
  it('one <Task> with no <UID> raises RS-15 once, and the other task is still taken', async () => {
    const built = await shellStage()
    await openBy(built, 'nouid.xml', mspdi(GOOD_TASK + NO_UID_TASK), 'IC-71')
    await closeImportReport(built)
    const told = toldRs15(built.last())
    expect(told, 'T-233: RS-15 was not raised for the task without a UID').toHaveLength(1)
    expect([null, 1], 'T-233: the count of one notice is 1 or none').toContain(told[0]?.affectedCount)
    expect(built.loop.document().schedule.tasks.some((one) => one.uid === 51), 'premise: the readable task was taken').toBe(true)
  })

  it('three <Task> without <UID> raise ONE RS-15 notice that carries the count 3', async () => {
    const built = await shellStage()
    await openBy(built, 'nouid3.xml', mspdi(GOOD_TASK + NO_UID_TASK + NO_UID_TASK + NO_UID_TASK), 'IC-71')
    await closeImportReport(built)
    const told = toldRs15(built.last())
    expect(told, 'T-233: the notices were not collapsed into one notice').toHaveLength(1)
    expect(told[0]?.affectedCount, 'T-233: RS-15 does not carry the number of notices').toBe(3)
  })

  it('a clean MSPDI opens and raises no RS-15', async () => {
    const built = await shellStage()
    await openBy(built, 'clean.xml', mspdi(GOOD_TASK), 'IC-71')
    await closeImportReport(built)
    expect(built.loop.document().schedule.tasks.some((one) => one.uid === 51), 'premise: the file was taken').toBe(true)
    expect(toldRs15(built.last()), 'a clean open told RS-15').toEqual([])
  })
})

describe('T-233 RS-15 / EX-6 -- exporting MSPDI tells fade-day frames that could not be written as asked', () => {
  it('both frames held by the import source: the file is written and RS-15 is raised after it', async () => {
    const { built, text } = await exportMspdi(withFade(importedWith(FRAME_ONE + FRAME_TWO), 2))
    expect(toldRs15(built.last()), 'EX-6: no free frame, yet RS-15 was not raised').toHaveLength(1)
    expect(text, 'EX-6: the import source frame was overwritten').toContain('theirOne')
    expect(text, 'EX-6: the import source frame was overwritten').toContain('theirTwo')
    expect(text, 'EX-6: no free frame, yet the fade was written under its own name').not.toContain('fadeInDays')
  })

  it('the preferred frame held by the import source: the fade moves to the free frame and RS-15 is raised', async () => {
    const { built, text } = await exportMspdi(withFade(importedWith(FRAME_ONE), 2))
    expect(toldRs15(built.last()), 'EX-6: a moved frame was not told').toHaveLength(1)
    expect(text, 'EX-6: the import source frame was overwritten').toContain('theirOne')
    expect(text, 'EX-6: the fade did not move to the free frame').toContain('fadeInDays')
  })

  it('no frame is taken: the fade is written where it is preferred and RS-15 is not raised', async () => {
    const { built, text } = await exportMspdi(withFade(importedWith(''), 2))
    expect(text, 'premise: the fade was written').toContain('fadeInDays')
    expect(toldRs15(built.last()), 'EX-6: a clean export told RS-15').toEqual([])
  })

  it('a clean document with no fade exports without RS-15', async () => {
    const { built } = await exportMspdi(here())
    expect(toldRs15(built.last()), 'a clean export told RS-15').toEqual([])
  })

  it('a document with no free frame and no fade value exports without RS-15 (nothing was asked of the frames)', async () => {
    const { built } = await exportMspdi(importedWith(FRAME_ONE + FRAME_TWO))
    expect(toldRs15(built.last()), 'no fade to write, yet RS-15 was raised').toEqual([])
  })
})

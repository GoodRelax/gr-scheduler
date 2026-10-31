// CR-858 spec-only contract: a dropped GRS JSON or single .html opens as a replace without the Open Chooser (U-56); OP-4 still asks QN-5 (T-024a OP-19, OP-2, OP-3, OP-4).

import { describe, expect, it } from 'vitest'

import { installAgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { exportEmbeddedHtml } from '../../src/adapter/document-codec/document-codec'
import { mspdiFromDocument } from '../../src/adapter/document-codec/mspdi-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { TEMPLATE } from '../unit/cr-541-stage'
import {
  CONFIRMATION,
  HERE_TASK_GROUP,
  OPEN_CHOOSER,
  REQUIREMENTS,
  UTF8,
  jsonBytes,
  settle,
  shellAppSource,
  shellStage,
  there,
  type ShellStage,
} from './cr-610-file-flow-stage'
import { unbroken } from './spec-table'

const LAST_SAVED_AT = '2026-10-03T09:00:00'

const OP_19_MUST =
  '人がファイルを 1 つウィンドウへドロップしたとき、`GRS` は、`Open Chooser`（`_assets/tbl-glossary.md` の `U-56`）を出さずに、`OP-3` の 3 択を置き換えに定めて開くこと（MUST）'
const OP_19_OP_4 = '`OP-4` の確認は掛かること（MUST）'
const OP_11_MUST =
  '人が 2 つ以上のファイルを同時にウィンドウへドロップしたとき、`GRS` は、どのファイルも開かずに断り、現在の文書を変えないこと（MUST）'

const PLAIN_SHELL =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<title>GRS</title></head><body><div id="app"></div>' +
  '<script type="module">boot()</script></body></html>\n'

const titleOf = (built: ShellStage): unknown =>
  (built.loop.document() as unknown as { schedule: { project: { title: unknown } } }).schedule.project.title

async function htmlOf(document: Document): Promise<string> {
  const made = await exportEmbeddedHtml(shellAppSource(PLAIN_SHELL), document)
  if (!made.ok) throw new Error(`precondition: IO-7 refused to write: ${JSON.stringify(made.fault)}`)
  return made.html
}

async function makeUnsaved(built: ShellStage): Promise<void> {
  const api = installAgentApi({
    ...built.loop.agentApiSeams(),
    writerName: 'cr-858-tester',
    schemaVersion: TEMPLATE.schemaVersion as string,
  } as never)
  const outcome = api.applyCommands({
    expectedStamp: api.readStamp(),
    commands: [
      {
        kind: 'createTaskGroup',
        id: 'a8580000-0000-4000-8000-000000000001',
        parentId: HERE_TASK_GROUP,
        name: 'From the tester',
        derivedFromTaskUid: null,
        order: 99,
      },
    ] as never,
  })
  await settle()
  expect(outcome.ok, 'premise: the edit landed').toBe(true)
  expect(built.loop.hasUnsavedEdits(), 'premise: the edit is unsaved').toBe(true)
}

describe('CR-858 the manuscript these cases are driven by', () => {
  it('Given the requirements When OP-19 is read Then its MUST sentence and its OP-4 MUST sentence stand word for word', () => {
    expect(REQUIREMENTS).toContain(unbroken(OP_19_MUST))
    expect(REQUIREMENTS).toContain(unbroken(OP_19_OP_4))
    expect(REQUIREMENTS).toContain(unbroken(OP_11_MUST))
  })
})

describe('OP-19 -- a dropped GRS JSON or single .html opens as a replace without U-56', () => {
  it('Given nothing unsaved When a GRS JSON is dropped Then no U-56, no QN-5, and the document is the dropped one', async () => {
    const built = await shellStage()
    await built.drop(built.file('theirs.json', jsonBytes(there())))
    expect(built.last().openModal, 'OP-19: a dropped GRS JSON raised U-56').toBeNull()
    expect(built.last().confirmation, 'OP-19: nothing is unsaved, so no QN-5').toBeNull()
    expect(titleOf(built)).toBe('There')
  })

  it('Given unsaved edits When a GRS JSON is dropped Then QN-5 stands without U-56, and proceed opens the dropped document', async () => {
    const built = await shellStage()
    await makeUnsaved(built)
    await built.drop(built.file('theirs.json', jsonBytes(there())))
    expect(built.last().openModal, 'OP-19: U-56 was raised').toBeNull()
    expect(built.last().confirmation?.question, 'OP-4: QN-5 did not stand').toBe('QN-5')
    expect(titleOf(built), 'premise: nothing opened before the answer').toBe('Here')
    await built.answer('proceed')
    expect(built.last().confirmation).toBeNull()
    expect(titleOf(built)).toBe('There')
  })

  it('Given unsaved edits When a GRS JSON is dropped and the question is cancelled Then the document is unchanged', async () => {
    const built = await shellStage()
    await makeUnsaved(built)
    await built.drop(built.file('theirs.json', jsonBytes(there())))
    expect(built.last().confirmation?.question, 'premise: QN-5 stands').toBe('QN-5')
    await built.answer('cancel')
    expect(built.last().confirmation).toBeNull()
    expect(built.last().openModal).toBeNull()
    expect(titleOf(built), 'OP-4: cancel changed the document').toBe('Here')
    expect(built.loop.hasUnsavedEdits(), 'OP-4: cancel lost the unsaved edit').toBe(true)
  })

  it('Given a single .html carrying a GRS document When it is dropped Then no U-56 and the embedded document opens', async () => {
    const built = await shellStage()
    await built.drop(built.file('handed.html', UTF8.encode(await htmlOf(there()))))
    expect(built.last().openModal, 'OP-19: a dropped .html raised U-56').toBeNull()
    expect(built.last().confirmation).toBeNull()
    expect(titleOf(built)).toBe('There')
  })
})

describe('OP-19 -- every dropped format replaces; the file dialog still asks the 3 choices', () => {
  it('Given an MSPDI XML When it is dropped Then no U-56 and the document is the dropped one', async () => {
    const built = await shellStage()
    await built.drop(built.file('theirs.xml', UTF8.encode(mspdiFromDocument(there(), LAST_SAVED_AT).text)))
    expect(built.last().openModal, 'OP-19: a dropped MSPDI raised U-56').toBeNull()
    expect(titleOf(built)).toBe('There')
  })

  it('Given a GRS JSON When it is opened through the file dialog Then U-56 stands', async () => {
    const built = await shellStage()
    await built.open(built.file('theirs.json', jsonBytes(there())))
    expect(built.last().openModal?.surface, 'OP-19: the file dialog skipped U-56').toBe(OPEN_CHOOSER())
    expect(titleOf(built)).toBe('Here')
    expect(CONFIRMATION()).toBeTruthy()
  })
})

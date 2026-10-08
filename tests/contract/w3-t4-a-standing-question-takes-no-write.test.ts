// W3 tester 4: FR-076 table T-037 NT-7 -- while a question stands, no write reaches the document, from the screen or the Agent API.

import { describe, expect, it } from 'vitest'

import { installAgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  CONFIRMATION,
  OPEN_CHOOSER,
  REQUIREMENTS,
  TEMPLATE_TEXT,
  jsonBytes,
  keyOfRow,
  reasonWords,
  shellStage,
  there,
  type ShellStage,
} from './cr-610-file-flow-stage'
import { bare, specTable } from './spec-table'

const NT_7_NO_WRITE =
  ' の `IN-4` と 表 T-036 の `SK-19` の階層より先とする（MUST）。⛔ **問いが立っているあいだは、文書への書き込みを受けてはならない（MUST NOT）'
const NT_7_HOW =
  '画面からの書き込み（取り消し・やり直しを含む）は 表 T-233 の `RS-27` として捨て（同行は出さない —— 問いが画面に立っているので、受けなかったことは見える）、`Agent API` の書き込みは 表 T-035 の `AG-9` のとおり拒むこと（MUST）。'
const AG_9_QUESTION = '確認の問い（表 T-037 の `NT-7`）が立っている間も同じく拒否する'

const BUILT_VERSION = (JSON.parse(TEMPLATE_TEXT) as { schemaVersion: string }).schemaVersion

// see T-108
const kindOf = (id: string): string => {
  const row = specTable('T-108').rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-108 has no row ${id}`)
  const kind = row.cells.map(bare).find((cell) => /^[a-z][A-Za-z]+$/.test(cell))
  if (kind === undefined) throw new Error(`table T-108 row ${id} names no command`)
  return kind
}

// see CM-1
const titleCommand = (title: string): Record<string, unknown> => ({ kind: kindOf('CM-1'), title })

type Api = ReturnType<typeof installAgentApi>

const agentOf = (built: ShellStage): Api =>
  installAgentApi({ ...built.loop.agentApiSeams(), writerName: 'w3-t4-tester', schemaVersion: BUILT_VERSION } as never)

const apply = (api: Api, commands: readonly Record<string, unknown>[]) =>
  api.applyCommands({ readStamp: api.readStamp(), commands: commands as never })

const titleOf = (document: Document): string => String((document.schedule.project as { title?: unknown }).title ?? '')

/** @purity non-pure */
async function questionStanding(): Promise<{ built: ShellStage; api: Api }> {
  const built = await shellStage()
  const api = agentOf(built)
  const first = apply(api, [titleCommand('W3 edited before the question')])
  expect(first.accepted, 'premise: the Agent API takes a title with no question standing').toBe(true)
  await built.repaint()
  expect(built.loop.hasUnsavedEdits(), 'premise: the title left an unsaved edit').toBe(true)
  await built.open(built.file('theirs.json', jsonBytes(there())))
  expect(built.last().openModal, 'premise: SK-10 raised the open chooser').not.toBeNull()
  await built.press(OPEN_CHOOSER(), 'IC-71')
  expect(built.last().confirmation, 'premise: replacing an unsaved document asks first (NT-7)').not.toBeNull()
  return { built, api }
}

describe('NT-7 -- the manuscript these cases are driven by', () => {
  it.each([NT_7_NO_WRITE, NT_7_HOW, AG_9_QUESTION])('01-04 still says: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe(`NT-7 -- ${NT_7_NO_WRITE}`, () => {
  it('an Agent API write is refused while the question stands, and the document is left as it was', async () => {
    const { built, api } = await questionStanding()
    const before = JSON.stringify(built.loop.document())
    const outcome = apply(api, [titleCommand('W3 written under the question')])
    await built.repaint()
    expect(outcome.accepted, `${AG_9_QUESTION} -- ${NT_7_HOW}`).toBe(false)
    expect(JSON.stringify(built.loop.document()), NT_7_NO_WRITE).toBe(before)
    expect(built.last().confirmation, 'the question still stands after the refused write').not.toBeNull()
  })

  it('an undo pressed on the screen is dropped as RS-27, unseen (CR-712), while the question stands', async () => {
    const { built } = await questionStanding()
    const before = JSON.stringify(built.loop.document())
    const titleBefore = titleOf(built.loop.document())
    await built.key(keyOfRow('SK-6'))
    expect(titleOf(built.loop.document()), `${NT_7_NO_WRITE}: the undo did not take the title back`).toBe(titleBefore)
    expect(JSON.stringify(built.loop.document()), NT_7_HOW).toBe(before)
    const told = built.last().notices.map((one) => (one as { text?: string }).text)
    expect(told, `${NT_7_HOW}: RS-27 is not shown`).not.toContain(reasonWords('RS-27').text.ja)
  })

  it('the control: once the question is answered with cancel, the same Agent API write is taken', async () => {
    const { built, api } = await questionStanding()
    await built.press(CONFIRMATION(), null, { confirmationAnswer: 'cancel' })
    expect(built.last().confirmation, 'premise: cancel took the question down').toBeNull()
    const outcome = apply(api, [titleCommand('W3 written after the answer')])
    await built.repaint()
    expect(outcome.accepted, 'with no question standing the write is taken').toBe(true)
    expect(titleOf(built.loop.document())).toBe('W3 written after the answer')
  })
})

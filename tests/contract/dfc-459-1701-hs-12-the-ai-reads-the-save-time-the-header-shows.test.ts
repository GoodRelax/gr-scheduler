// DFC-459 / DFC-1701 spec-only tests: FR-101 table T-341 HS-11 + HS-12 -- the AT-140 the Agent API hands out is the time the header's lower line shows; the open document's AT-140 is not rewritten.

import { describe, expect, it } from 'vitest'

import { installAgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import {
  REQUIREMENTS,
  TEMPLATE_TEXT,
  jsonBytes,
  replaceWith,
  shellStage,
  there,
  type ShellStage,
} from './cr-610-file-flow-stage'

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const HS_12_MUST =
  '`Agent API`（表 T-035）が手渡す文書と刻印の `AT-140` には、手渡すときに下段が示している時刻を入れること（MUST）'
const HS_12_EVERY_ROAD =
  '読み出し（`_assets/tbl-glossary.md` の `AM-3` / `AM-4`）、`AM-11` の文字列、書き込みの戻り値と拒否の値（表 T-035 の `AG-9a`）が運ぶ刻印と文書、監視の通知（同表の `AG-6`）が運ぶ文書のすべてである。'
const HS_12_NEVER_SAVED = '下段が `HS-5` のときは空とすること（MUST）。'
const HS_12_EVERY_SAVE = '⇒ 保存するたびに、AI が読む時刻はファイルとヘッダーと同じ値へ進む'
const HS_12_NO_REWRITE = '⛔ そのために開いている文書の `AT-140` を書き換えてはならない（MUST NOT）'
const HS_11_KEPT = '⇒ 開いている文書の `AT-140` は開いたときに読んだ値のまま動かず、'

const OPENED_STAMP = '2026-01-02T03:04:05Z'
const SCHEMA_VERSION = (JSON.parse(TEMPLATE_TEXT) as { schemaVersion: string }).schemaVersion

const agentOf = (built: ShellStage) =>
  installAgentApi({ ...built.loop.agentApiSeams(), writerName: 'dfc-459-tester', schemaVersion: SCHEMA_VERSION } as never)

const shownTime = (built: ShellStage): string | null => built.last().appHeaderItems.fileSavedAt

const stampOfJson = (text: string): string | null => {
  const read = documentFromJson(text)
  if (!read.ok) throw new Error(`the text the Agent API handed out is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document.documentStamp.fileSavedUtc ?? null
}

async function openedThenSaved(): Promise<{ built: ShellStage; shown: string }> {
  const built = await shellStage({ dom: true })
  const stamped = JSON.parse(JSON.stringify(there())) as Record<string, any>
  stamped['documentStamp']['fileSavedUtc'] = OPENED_STAMP
  const opened = built.file('stamped.json', jsonBytes(stamped))
  await replaceWith(built, opened)
  built.browser.toSave.push(opened)
  await built.save()
  expect(built.written, 'premise: SK-11 wrote the opened file').toContain('stamped.json')
  await built.repaint()
  const shown = shownTime(built)
  expect(shown, 'premise: the lower line shows a save time').not.toBeNull()
  expect(shown, 'premise: the shown time is the new save, not the opened one').not.toBe(OPENED_STAMP)
  return { built, shown: shown as string }
}

describe('HS-12 -- the manuscript these cases are driven by', () => {
  it.each([HS_12_MUST, HS_12_EVERY_ROAD, HS_12_NEVER_SAVED, HS_12_EVERY_SAVE, HS_12_NO_REWRITE, HS_11_KEPT])(
    '01-04 still says: %s',
    (clause) => {
      expect(REQUIREMENTS).toContain(clause)
    },
  )
})

describe(`HS-12 -- ${HS_12_MUST}`, () => {
  it('AM-4 readStamp and AM-3 readDocument carry the time the lower line shows after a save', async () => {
    const { built, shown } = await openedThenSaved()
    const api = agentOf(built)
    expect(api.readStamp().fileSavedUtc, 'AM-4').toBe(shown)
    expect(api.readDocument().documentStamp.fileSavedUtc, 'AM-3').toBe(shown)
  })

  it('AM-11 exportJson carries the time the lower line shows after a save', async () => {
    const { built, shown } = await openedThenSaved()
    const exported = agentOf(built).exportJson()
    expect(exported.ok, 'premise: AM-11 answered').toBe(true)
    expect(stampOfJson((exported as { value: string }).value), 'AM-11').toBe(shown)
  })

  it(`AG-9a: ${HS_12_EVERY_ROAD.slice(0, 40)}... a refusal hands out the stamp and the document with that time`, async () => {
    const { built, shown } = await openedThenSaved()
    const api = agentOf(built)
    const stale = { ...api.readStamp(), scheduleUpdatedUtc: '2000-01-01T00:00:00Z' }
    const outcome = api.applyCommands({ readStamp: stale, commands: [] } as never) as unknown as {
      accepted: boolean
      refusal?: { reason: string; stamp: { fileSavedUtc: string | null }; document: { documentStamp: { fileSavedUtc: string | null } } | null }
    }
    expect(outcome.accepted, 'premise: a stale stamp is refused (AG-2)').toBe(false)
    expect(outcome.refusal?.reason, 'premise: the refusal names the stamp (AG-9a)').toBe('staleStamp')
    expect(outcome.refusal?.stamp.fileSavedUtc, 'AG-9a stamp').toBe(shown)
    expect(outcome.refusal?.document?.documentStamp.fileSavedUtc, 'AG-9a document').toBe(shown)
  })
})

describe(`HS-12 -- ${HS_12_NEVER_SAVED}`, () => {
  it('with nothing written yet (HS-5) the Agent API hands out an empty AT-140 in every road it reads', async () => {
    const built = await shellStage({ dom: true })
    await built.repaint()
    expect(built.last().appHeaderItems.fileSavedAt, 'premise: HS-5, nothing written yet').toBeNull()
    const api = agentOf(built)
    expect(api.readStamp().fileSavedUtc, 'AM-4').toBeNull()
    expect(api.readDocument().documentStamp.fileSavedUtc, 'AM-3').toBeNull()
    expect(stampOfJson((api.exportJson() as { value: string }).value), 'AM-11').toBeNull()
  })

  it('an opened file whose AT-140 is empty (HS-6 -> HS-5) is handed out empty too', async () => {
    const built = await shellStage({ dom: true })
    const empty = JSON.parse(JSON.stringify(there())) as Record<string, any>
    empty['documentStamp']['fileSavedUtc'] = null
    await replaceWith(built, built.file('theirs.json', jsonBytes(empty)))
    await built.repaint()
    expect(built.last().appHeaderItems.fileSavedAt, 'premise: HS-5 after the open').toBeNull()
    expect(agentOf(built).readStamp().fileSavedUtc).toBeNull()
  })
})

describe(`HS-12 -- ${HS_12_EVERY_SAVE}`, () => {
  it('a second save moves what the AI reads to the second time, the same value the lower line shows', async () => {
    const { built, shown } = await openedThenSaved()
    const api = agentOf(built)
    expect(api.readStamp().fileSavedUtc, 'premise: the first save').toBe(shown)
    // WHY: AT-140 is kept to the second, so the next save has to land in a later second.
    await new Promise((resolve) => setTimeout(resolve, 1_100))
    await built.save()
    await built.repaint()
    const second = shownTime(built)
    expect(second, 'premise: the second save moved the lower line').not.toBe(shown)
    expect(api.readStamp().fileSavedUtc, 'HS-12: saving moves the AI read').toBe(second)
  })
})

describe(`HS-12 -- ${HS_12_NO_REWRITE}`, () => {
  it(`after a save the Agent API reads the new time while the open document keeps the AT-140 it was opened with (${HS_11_KEPT.slice(0, 20)}...)`, async () => {
    const { built, shown } = await openedThenSaved()
    expect(agentOf(built).readStamp().fileSavedUtc, 'premise: the AI reads the new time').toBe(shown)
    expect(built.loop.document().documentStamp.fileSavedUtc, `${HS_12_NO_REWRITE} -- ${HS_11_KEPT}`).toBe(OPENED_STAMP)
  })

  it('reading through the Agent API does not rewrite the open document either', async () => {
    const { built } = await openedThenSaved()
    const api = agentOf(built)
    api.readDocument()
    api.readStamp()
    api.exportJson()
    expect(built.loop.document().documentStamp.fileSavedUtc).toBe(OPENED_STAMP)
  })
})

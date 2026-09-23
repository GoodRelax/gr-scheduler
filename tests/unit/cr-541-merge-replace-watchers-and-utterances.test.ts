// CR-541: merge and MSPDI replace, a second subscription, and an utterance during a delivery.

import { afterEach, describe, expect, it } from 'vitest'

import { installAgentApi, type AgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { documentFromMspdi, mspdiFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { importDocument, type ImportRequest } from '../../src/use-case/import-document/import-document'
import {
  emptyChangeWatchers,
  notifyChangeWatchers,
  unwatchChanges,
  watchChanges,
  type ChangeNotice,
} from '../../src/use-case/notify-change-watchers/notify-change-watchers'
import { emptyDialogueLog } from '../../src/entity/document-model/dialogue-log/dialogue-log'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import { DESIGN, REQUIREMENTS, rowDocument, shell, TEMPLATE, type ShellBench } from './cr-541-stage'

const Q29 = '⭐ 同じ id の行（`TaskGroup`）または注記が両側にあり、中身が違うときは、現在の文書の中身を保ち、取込元の違いを捨てること（MUST）'
const Q30 = '⭐ 置き換えを選んで MSPDI を読んだときは、`documentSettings` のすべての項目を既定値とすること（MUST）'
const Q31 = '⭐ 同じ名前（表 T-229 の `ED-2`）で 2 度購読したときは、新しい購読が古い購読を置き換えること（MUST）'
const Q32 = '置き換えたことを、新しい購読の戻り値で答えること（MUST）'
const Q33 = '⛔ 監視が通知を配っているあいだの発話は、書き込みと同じく受け付けてはならない（MUST NOT）'
const Q41 = '⭐ 通知を配っているあいだの発話（表 T-035 の `AG-11`）も、書き込みと同じく拒否すること（MUST）'

describe('CR-541 -- the clauses still stand in the manuscript', () => {
  it.each([Q29, Q30, Q31, Q32, Q33])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
  it(`05-07 Chapter 5.5: ${Q41}`, () => {
    expect(DESIGN).toContain(Q41)
  })
})

const DEFAULTS: Record<string, unknown> = (() => {
  const out: Record<string, any> = {}
  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const parts = key.split('.')
    let at = out
    for (const part of parts.slice(0, -1)) at = at[part] ??= {}
    at[parts[parts.length - 1]!] = structuredClone(value)
  }
  return out
})()

const documentWith = (label: string, note: string, settings: Record<string, unknown> = {}): Document =>
  rowDocument([{ id: 'shared-row', parentId: null }], { ...settings }, {
    taskGroups: [
      {
        id: 'shared-row',
        parentId: null,
        label,
        derivedFromTaskUid: null,
        order: 0,
        isCollapsed: false,
        isHidden: false,
        isKeptOpen: false,
        editGroup: null,
        color: null,
        height: null,
      },
    ],
    commentBoxes: [
      { id: 'shared-note', leaderShapeKind: null, text: note, anchorDate: '2026-04-08', anchorGroupId: 'shared-row', bodyOffsetPx: null },
    ],
  }) as unknown as Document

const requestOf = (part: Partial<ImportRequest>): ImportRequest => ({
  current: documentWith('current label', 'current note'),
  incoming: documentWith('incoming label', 'incoming note'),
  format: 'grsJson',
  choice: 'merge',
  validationPassed: true,
  anotherOpenInProgress: false,
  unsavedEditsDiscardConfirmed: true,
  merge: { mapping: { kind: 'allSame' }, profileConflict: 'keepExisting', settingsConflict: 'keepExisting' },
  defaultSettings: structuredClone(DEFAULTS) as never,
  importSessionId: 'cr-541-session',
  ...part,
})

describe('MG-12 -- a merge keeps the current content of a shared id', () => {
  it(Q29, () => {
    const outcome = importDocument(requestOf({}))
    if (!outcome.ok) throw new Error(`premise: the merge is accepted, was ${JSON.stringify(outcome.refusal)}`)
    const rows = outcome.document.schedule.taskGroups.filter((one) => one.id === 'shared-row')
    expect(rows.map((one) => one.label), 'the row of the shared id keeps the current label').toEqual(['current label'])
    const notes = outcome.document.schedule.commentBoxes.filter((one) => one.id === 'shared-note')
    expect(notes.map((one) => one.text), 'the note of the shared id keeps the current text').toEqual(['current note'])
  })
})

describe('OP-6 -- an MSPDI read by replace puts every setting to its default', () => {
  it(Q30, () => {
    const moved = { zoomX: 7, zoomY: 0.5, scrollDate: '2026-06-01', displayScale: 125, dependencyVisible: false }
    const current = documentWith('current label', 'current note', moved)
    const decoded = documentFromMspdi(mspdiFromDocument(current).text, current)
    if (!decoded.ok) throw new Error(`premise: the MSPDI text decodes, was ${JSON.stringify(decoded).slice(0, 300)}`)
    const outcome = importDocument(
      requestOf({ current, incoming: decoded.document, format: 'mspdi', choice: 'replace', merge: null }),
    )
    if (!outcome.ok) throw new Error(`premise: the replace is accepted, was ${JSON.stringify(outcome.refusal)}`)
    const settings = outcome.document.documentSettings as unknown as Record<string, unknown>
    const differing = Object.keys(DEFAULTS).filter(
      (key) => JSON.stringify(settings[key]) !== JSON.stringify((DEFAULTS as Record<string, unknown>)[key]),
    )
    expect(differing, 'every documentSettings item is its default').toEqual([])
  })
})

const WATCHER = 'cr-541 watcher'
const WATCHERS = emptyChangeWatchers()
afterEach(() => {
  unwatchChanges(WATCHERS, WATCHER)
})

describe('AG-6 -- the same name subscribed twice', () => {
  it(`${Q31} / ${Q32}`, () => {
    const document = rowDocument([{ id: 'row-1', parentId: null }]) as unknown as Document
    const since = { seenScheduleUpdatedUtc: '2000-01-01T00:00:00Z', seenSequence: 0 }
    const first: ChangeNotice[] = []
    const second: ChangeNotice[] = []
    const firstAnswer = watchChanges(WATCHERS, { watcher: WATCHER, since, deliver: (notice) => first.push(notice) })
    const secondAnswer = watchChanges(WATCHERS, { watcher: WATCHER, since, deliver: (notice) => second.push(notice) })
    expect(firstAnswer, 'nothing was replaced by the first subscription').toBe(false)
    expect(secondAnswer, 'the second subscription answers that it replaced one').toBe(true)
    const changed = {
      ...document,
      documentStamp: { ...document.documentStamp, scheduleUpdatedUtc: '2026-09-22T00:00:00Z', lastEditedBy: 'someone else' },
    } as Document
    notifyChangeWatchers(WATCHERS, { document: changed, hasMovedSchedule: true, dialogue: emptyDialogueLog() })
    expect(first, 'the replaced subscription is no longer told').toHaveLength(0)
    expect(second, 'the new subscription is told').toHaveLength(1)
  })
})

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

describe('AG-11 -- no utterance while notices are being delivered', () => {
  it(`${Q33} / ${Q41}`, () => {
    const built = shell(rowDocument([{ id: 'row-1', parentId: null }]))
    benches.push(built)
    const apiFor = (writerName: string): AgentApi =>
      installAgentApi({ ...built.loop.agentApiSeams(), writerName, schemaVersion: TEMPLATE.schemaVersion } as never)
    const a = apiFor('cr-541 agent a')
    const b = apiFor('cr-541 agent b')
    let replies = 0
    const answerBack = (api: AgentApi, text: string) => (): void => {
      if (replies >= 4) return
      replies += 1
      try {
        api.postDialogueMessage(text)
      } catch {
        // WHY: a refusal may be thrown or returned; either way the log below is what is asked.
      }
    }
    a.watchChanges(answerBack(a, 'a answers from inside a delivery'))
    b.watchChanges(answerBack(b, 'b answers from inside a delivery'))
    a.postDialogueMessage('a speaks first')
    const texts = a.readDialogueMessages().map((one) => one.text)
    expect(replies, 'premise: the utterance was delivered to the other subscriber').toBeGreaterThan(0)
    expect(texts, 'no utterance posted during the delivery reaches the log').toEqual(['a speaks first'])
  })
})
